# Hướng dẫn triển khai tải danh sách hội thoại (fetchConversations)

Tài liệu này hướng dẫn cách tải toàn bộ danh sách các cuộc trò chuyện (inbox) của một người dùng ngay khi họ đăng nhập. 
Tính năng này bao gồm việc thiết kế cơ sở dữ liệu ở Backend và kết nối lấy dữ liệu ở Frontend.

## Kiến trúc lưu trữ: PostgreSQL vs Cassandra

Trong các ứng dụng chat phổ biến (Discord, Telegram, Messenger), kiến trúc lưu trữ thường được chia làm hai phần:
- **Tin nhắn (Messages)**: Lưu ở Cassandra (hoặc NoSQL tương đương) vì số lượng khổng lồ, tính chất chỉ ghi thêm (append-only) và rất ít cập nhật.
- **Danh sách hội thoại (Inbox/Conversations)**: **Bắt buộc nên lưu ở PostgreSQL** (hoặc Relational DB).

### Tại sao không dùng Cassandra cho bảng Conversations?
1. **Cập nhật liên tục `last_updated`**: Để hiển thị danh sách hội thoại mới nhất lên đầu, bảng conversations cần sắp xếp theo thời gian (`ORDER BY last_updated DESC`). Trong Cassandra, thời gian này phải là *Clustering Key*. Tuy nhiên, Cassandra **không cho phép UPDATE** Clustering Key. Mỗi lần có tin nhắn mới, bạn phải DELETE dòng cũ và INSERT dòng mới. Điều này tạo ra vô số "Tombstones" (rác), làm chậm database trầm trọng.
2. **JOIN với thông tin User**: Trên màn hình Inbox, bạn cần hiển thị Tên và Avatar của người chat cùng. Bảng `users` đang ở PostgreSQL, nếu để `conversations` ở PostgreSQL bạn có thể dễ dàng JOIN để lấy thông tin. Nếu dùng Cassandra, bạn sẽ phải query 2 nơi rất phức tạp.
3. **Đếm tin nhắn chưa đọc (Unread Count)**: PostgreSQL hỗ trợ transaction ACID rất tốt cho việc `UPDATE unread_count = unread_count + 1`. Cassandra hỗ trợ Counter nhưng hạn chế và khó dùng chung với các field khác trong cùng lúc cập nhật.

---

## Bước 1: Mở rộng Backend (Spring Boot & PostgreSQL)

### 1.1. Tạo bảng `user_conversations` trong PostgreSQL

Tạo một bảng để lưu trữ trạng thái inbox của từng người dùng:

```sql
CREATE TABLE user_conversations (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,           -- ID người sở hữu Inbox
    peer_id BIGINT NOT NULL,           -- ID người đang chat cùng (hoặc peer_username)
    conversation_id UUID NOT NULL,     -- Tham chiếu tới UUID partition trong Cassandra
    last_message_preview VARCHAR(255), -- Đoạn trích dẫn tin nhắn cuối cùng
    last_updated TIMESTAMP NOT NULL,   -- Cập nhật mỗi khi có tin mới
    unread_count INT DEFAULT 0,        -- Số tin nhắn chưa đọc
    
    UNIQUE(user_id, peer_id)
);

-- Index bắt buộc phải có để truy vấn danh sách Inbox cực nhanh
CREATE INDEX idx_user_last_updated ON user_conversations(user_id, last_updated DESC);
```

**Luồng ghi:** Mỗi khi A gửi tin cho B, backend lưu tin vào Cassandra, đồng thời chạy 2 lệnh UPDATE vào bảng `user_conversations` (một cho A, một cho B) để thay đổi `last_updated`, `last_message_preview` và tăng `unread_count` cho B.

### 1.2. Thêm Endpoint trong Controller

Sử dụng endpoint `/api/dm/recent-conversations` để không bị trùng với `/api/dm/conversation` (đã dùng để open conversation).

```java
// Trong DirectMessageController.java
@GetMapping("/recent-conversations")
public ResponseEntity<List<ConversationPreviewResponse>> getRecentConversations(
        @AuthenticationPrincipal UserDetails principal
) {
    // Service sẽ truy vấn bảng user_conversations trong PostgreSQL
    // kết hợp JOIN với bảng users để trả về thông tin danh sách chat
    List<ConversationPreviewResponse> conversations = directMessageService.getRecentConversations(principal.getUsername());
    return ResponseEntity.ok(conversations);
}
```

---

## Bước 2: Triển khai hàm `fetchConversations` (Frontend)

Mở tệp `frontend/src/services/chatRepository.js` và thay thế logic hiện tại bằng hàm fetch thực tế gọi tới API mới tạo.

```javascript
/** 
 * @returns {Promise<import('../domain/chat.js').ConversationPreview[]>} 
 */
export async function fetchConversations(token) {
  const response = await fetch('/api/dm/recent-conversations', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Lỗi khi tải danh sách cuộc trò chuyện');
  }

  const data = await response.json();
  
  // Ánh xạ dữ liệu backend trả về cho khớp với cấu trúc UI
  return data.map((conv) => ({
    peerUsername: conv.peerUsername,
    title: conv.peerUsername, // Hoặc tên đầy đủ
    lastPreview: conv.lastMessagePreview || '',
    lastAt: conv.lastUpdated || '',
    unread: conv.unreadCount || 0,
  }));
}
```

---

## Bước 3: Cập nhật `ChatContext.jsx` để quản lý State

Trong `frontend/src/context/ChatContext.jsx`, bổ sung Action và Hàm tải dữ liệu.

### 3.1. Thêm logic vào `chatReducer`

```javascript
// Thêm case này vào trong switch của chatReducer
case 'LOAD_CONVERSATIONS_SUCCESS': {
  const conversations = action.payload; 
  const newPeers = { ...state.peers };

  conversations.forEach((conv) => {
    const key = peerKey(conv.peerUsername);
    // Lưu hoặc cập nhật cuộc trò chuyện vào state peers
    newPeers[key] = {
      ...newPeers[key],
      peerUsername: conv.peerUsername,
      title: conv.title,
      lastPreview: conv.lastPreview,
      lastAt: conv.lastAt,
      unread: conv.unread,
    };
  });

  return { ...state, peers: newPeers };
}
```

### 3.2. Thêm hàm `loadConversations` vào `ChatProvider`

Đặt hàm này gần các hàm như `loadHistory`. Đừng quên import `fetchConversations`.

```javascript
import { fetchConversations } from '../services/chatRepository.js';

// ...
const loadConversations = useCallback(async () => {
  try {
    const data = await fetchConversations(authUser.token);
    dispatch({ type: 'LOAD_CONVERSATIONS_SUCCESS', payload: data });
  } catch (error) {
    console.error("Lỗi tải conversations:", error);
    dispatch({ type: 'WS_BANNER', payload: "Không thể tải danh sách cuộc trò chuyện" });
  }
}, [authUser.token]);
```

*(Lưu ý: Bổ sung `loadConversations` vào mảng `value` của `useMemo` ở cuối ChatProvider để các component khác có thể gọi nếu cần)*.

---

## Bước 4: Tự động tải danh sách ngay khi đăng nhập

Để tự động tải danh sách trò chuyện ngay khi vào ứng dụng (sau khi đăng nhập thành công), bạn sử dụng `useEffect` trong `ChatProvider`. Vì Provider này (xem `App.jsx`) chỉ render khi `authUser.token` đã có, bạn chỉ cần gọi `loadConversations()` ngay khi Provider mount.

```javascript
// Đặt bên trong ChatProvider
import { useEffect } from 'react';

useEffect(() => {
  if (authUser?.token) {
    loadConversations();
  }
}, [authUser?.token, loadConversations]);
```

### Tóm tắt luồng hoạt động:
1. Người dùng **đăng nhập** thành công, App lưu JWT token và chuyển hướng tới màn hình Chat (`AppShell`).
2. `ChatProvider` được kích hoạt (mount). Do có token, `useEffect` tự động chạy hàm `loadConversations()`.
3. Hàm này gọi API `GET /api/dm/recent-conversations`.
4. Backend (Spring Boot) query vào bảng `user_conversations` trên **PostgreSQL** để trả về danh sách xếp theo thời gian mới nhất.
5. Frontend nhận dữ liệu, Action `LOAD_CONVERSATIONS_SUCCESS` đẩy danh sách vào `peers`.
6. UI Sidebar bên trái sẽ tự động render danh sách các cuộc trò chuyện.
