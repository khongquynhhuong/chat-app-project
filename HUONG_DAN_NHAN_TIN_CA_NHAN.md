# Hướng dẫn triển khai Nhắn tin cá nhân (One-on-One Chat)

Tài liệu bám **mục 2.2** trong `src/YEU_CAU_NGHIEP_VU.md`: tin thời gian thực, trạng thái Sent / Delivered / Read, lịch sử cuộn vô hạn. **REST + Cassandra** và **WebSocket + STOMP (đẩy tin tới peer)** đã có trong code; **Redis presence** vẫn là bước mở rộng.

---

## 1. Kiến trúc dữ liệu

### 1.1. PostgreSQL (người dùng, quan hệ)

- Bảng `users`: định danh `id`, `username`, mật khẩu (đã có).
- **Không bắt buộc** thêm bảng “cuộc hội thoại” cho DM: trong code, `conversation_id` cho cặp user A–B được **sinh cố định** từ hai `id` (luôn sắp `min`/`max` để A→B và B→A cùng một UUID). Class: `DirectConversationIds`.

### 1.2. Cassandra (tin nhắn, khối lượng lớn)

- Bảng `messages` (keyspace cấu hình trong `spring.cassandra.keyspace-name`):
  - **Partition key** `conversation_id` (UUID): mọi tin của một cuộc 1-1 nằm cùng partition.
  - **Clustering key** `message_id` (TIMEUUID, **DESC**): sắp theo thời gian mới → cũ.
  - Cột nội dung: `sender_id`, `content`, `message_type`, `created_at`, `delivery_status`.

Entity: `ChatMessage`. Trạng thái: `MessageDeliveryStatus` — `SENT` (0), `DELIVERED` (1), `READ` (2).

### 1.3. Nếu bảng `messages` đã tạo trước khi có cột `delivery_status`

Chạy CQL trong `src/main/resources/cassandra/manual/alter-messages-delivery-status.cql` (sửa `USE` đúng keyspace), hoặc để Spring tạo bảng mới khi `schema-action` phù hợp môi trường dev.

---

## 2. Luồng nghiệp vụ (từng bước)

### Bước 1 — Xác định cuộc hội thoại

1. Người dùng đã đăng nhập (JWT).
2. Client biết `peerUserId` (id người đối phương trong `users`).
3. Gọi `GET /api/dm/conversation?peerUserId=...` để nhận `conversationId` (UUID) và `peerUsername` — dùng hiển thị header chat / cache local.

### Bước 2 — Gửi tin (WebSocket STOMP)

1. Client gửi frame tới destination `SEND /app/dm/send` với payload JSON: `peerUserId`, `content`, `messageType` (0 = text).
2. Server (`DirectMessageWsController`) gọi service xử lý:
   - Tải user hiện tại và peer; cấm gửi cho chính mình.
   - Tính `conversationId = DirectConversationIds.forPair(me, peer)`.
   - Sinh `message_id` = TIMEUUID (`Uuids.timeBased()`), `delivery_status = SENT`.
   - `INSERT` vào Cassandra qua `MessageRepository.save`.
3. Sau khi lưu thành công:
   - push cho người nhận vào `/user/queue/dm` (incoming),
   - push ACK cho người gửi vào `/user/queue/dm.sent`.

### Bước 3 — Đọc lịch sử (infinite scroll)

1. **Trang đầu**: `GET /api/dm/messages?peerUserId=&limit=20` (không có `beforeMessageId`).
2. Cassandra trả các tin **mới nhất** trong partition (giới hạn `limit`), code sắp xếp lại **cũ → mới** để UI hiển thị.
3. **Trang sau**: client truyền `beforeMessageId` = `message_id` của tin **cũ nhất** đang hiển thị; server gọi `findMessagesBefore(conversationId, beforeMessageId, limit)` để lấy batch **cũ hơn**.

### Bước 4 — Đánh dấu đã đọc (Read)

1. Người **nhận** (không phải người gửi) gọi `POST /api/dm/messages/read` với `peerUserId` và `messageId`.
2. Server kiểm tra tin thuộc đúng cuộc hội thoại và người gọi không phải sender, rồi cập nhật `delivery_status = READ`.

### Bước 5 — Delivered (gợi ý mở rộng)

- Yêu cầu: “đã tải xuống thiết bị người nhận”. Có thể:
  - Thêm API batch `POST /api/dm/messages/delivered`, hoặc
  - Đẩy sự kiện qua **WebSocket** khi app mở màn hình chat (không mô tả chi tiết trong bản MVP REST này).

---

## 3. Bảo mật

- Mọi endpoint `/api/dm/**` yêu cầu **JWT** (cấu hình chung: `anyRequest().authenticated()`).
- `conversationId` **không** tin tưởng từ client cho thao tác ghi: server luôn tính lại từ `(user hiện tại, peerUserId)` để tránh giả mạo partition.

---

## 4. Real-time & hiệu năng (đã có WebSocket; mở rộng sau)

- **WebSocket + STOMP**: xem **mục 8** — kết nối sau login, đẩy tin mới tới peer (mục tiêu độ trễ thấp, thường &lt; 200ms trong LAN / cùng region).
- **Redis**: presence, session đa thiết bị (theo YEU_CAU 2.1) — chưa triển khai trong repo này.
- **Message queue**: đảm bảo không mất tin (YEU_CAU 3.3) — mở rộng sau.

---

## 5. Tham chiếu mã nguồn

| Thành phần | Vai trò |
|------------|---------|
| `DirectConversationIds` | UUID ổn định cho cặp user |
| `MessageDeliveryStatus` | Sent / Delivered / Read |
| `ChatMessage` | Entity Cassandra |
| `MessageRepository` | `findRecentMessages`, `findMessagesBefore`, `findByConversationIdAndMessageId` |
| `DirectMessageService` / `DirectMessageServiceImpl` | Nghiệp vụ lưu/đọc Cassandra cho DM |
| `DirectMessageController` | REST `/api/dm/...` |
| `DirectMessageWsController` | STOMP `/app/dm/send` |
| `WebSocketBrokerConfig` | Endpoint SockJS `/ws`, broker `/topic`, `/queue`, prefix `/app`, `/user` |
| `StompJwtChannelInterceptor` | Xác thực JWT trên STOMP `CONNECT` |
| `WsJwtHandshakeInterceptor` | Lưu `?token=` vào session (hỗ trợ SockJS) |
| `DirectMessageNotifier` | `convertAndSendToUser` → `/user/.../queue/dm` |

---

## 6. Ví dụ gọi API (sau khi login)

```http
GET /api/dm/conversation?peerUserId=2
Authorization: Bearer <access_token>
```

```text
STOMP SEND destination: /app/dm/send
headers:
  Authorization: Bearer <access_token>
body:
{"peerUserId":2,"content":"Xin chào","messageType":0}
```

```http
GET /api/dm/messages?peerUserId=2&limit=20
Authorization: Bearer <access_token>
```

```http
POST /api/dm/messages/read
Authorization: Bearer <access_token>
Content-Type: application/json

{"peerUserId":2,"messageId":"<uuid-của-tin>"}
```

---

## 7. Kiểm thử nhanh

1. Tạo hai tài khoản (`/api/auth/register`) và lấy JWT (`/api/auth/login`).
2. Ghi nhớ `id` của user (từ response hoặc DB) làm `peerUserId`.
3. User A gửi tin qua STOMP `/app/dm/send`; User B nhận push `/user/queue/dm`; sau đó B có thể gọi GET history và read.

Kết hợp kiểm tra Cassandra: `SELECT * FROM messages LIMIT 10;` trong `cqlsh` (đúng keyspace).

---

## 8. WebSocket + STOMP — gửi và nhận tin sau khi có JWT

### 8.1. Luồng tổng quát

1. Client gọi REST `POST /api/auth/login` (hoặc đã có sẵn) để lấy **access token (JWT)**.
2. Client mở **SockJS** tới endpoint `http(s)://<host>:<port>/ws` (Spring tự phục vụ các đường con `/ws/**` cho SockJS).
3. Trên frame **STOMP CONNECT**, client phải xác thực:
   - **Cách khuyên dùng:** gửi header `Authorization: Bearer <access_token>`, hoặc
   - **Cách thay thế:** mở URL có query `?token=<access_token>` (tiện cho một số client SockJS khó gắn header lúc handshake).
4. Server (`StompJwtChannelInterceptor`) kiểm tra JWT, load `UserDetails`, gán `Principal` — tên dùng cho **user destination** là **username** trong JWT.
5. Client **subscribe** tới đích riêng: `/user/queue/dm` (Spring ánh xạ thành `/user/{username}/queue/dm` trên server).
6. Khi client `SEND /app/dm/send`, server lưu Cassandra rồi **`DirectMessageNotifier`** push:
   - `/user/queue/dm` cho peer nhận tin mới,
   - `/user/queue/dm.sent` cho sender ACK đã lưu.
7. Nếu peer offline, tin vẫn nằm trong Cassandra; khi online lại thì client dùng REST (`GET /api/dm/messages`) để đồng bộ lịch sử.

### 8.2. Mục tiêu độ trễ &lt; 200ms

- Độ trễ phụ thuộc mạng, GC, tải server; trong cùng datacenter / máy local, một bước `convertAndSendToUser` sau `save` thường **rất nhỏ** (ms).
- Để gần SLA 200ms hơn:
  - Giữ server stateless phía HTTP, broker in-memory đủ cho MVP; scale ngang sau này dùng **broker ngoài** (Rabbit/STOMP relay, Redis Pub/Sub) cùng **sticky session** hoặc shared subscription map.
  - Tránh chặn thread: không thực hiện I/O nặng trong interceptor CONNECT.
  - Bật **heartbeat** broker/client (STOMP) để phát hiện đứt cầu sớm — có thể cấu hình thêm `setHeartbeatValue` trên `enableSimpleBroker` khi cần.

### 8.3. Bảo mật

- Handshake HTTP `/ws/**` được **permitAll** (xem `SecurityConfig`) vì xác thực thực sự nằm ở **STOMP CONNECT + JWT**.
- Không dùng JWT trong URL trên production nếu trình duyệt/logs lưu full URL — ưu tiên header `Authorization` trên frame CONNECT.

### 8.4. Ví dụ client (trình duyệt + SockJS + STOMP)

Cần thư viện: `@stomp/stompjs` và `sockjs-client` (hoặc tương đương).

```javascript
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const token = '<access_token_sau_login>';

const stomp = new Client({
  webSocketFactory: () => new SockJS('/ws?token=' + encodeURIComponent(token)),
  connectHeaders: {
    Authorization: 'Bearer ' + token
  },
  reconnectDelay: 5000,
  debug: (s) => console.debug(s)
});

stomp.onConnect = (frame) => {
  stomp.subscribe('/user/queue/dm', (message) => {
    const dto = JSON.parse(message.body);
    console.log('Tin mới từ WS:', dto);
  });
  stomp.subscribe('/user/queue/dm.sent', (message) => {
    console.log('ACK gửi thành công:', JSON.parse(message.body));
  });
  stomp.subscribe('/user/queue/errors', (message) => {
    console.error('Lỗi WS:', JSON.parse(message.body));
  });
};

stomp.activate();

// Khi đã connect: gửi qua WebSocket thay vì REST
stomp.send('/app/dm/send', {}, JSON.stringify({
  peerUserId: 2,
  content: 'Xin chào',
  messageType: 0
}));
```

Gửi tin dùng STOMP `SEND /app/dm/send` (không dùng REST cho thao tác send trong luồng mới).

### 8.5. So sánh với WebSocket “native” (không STOMP)

- **Native**: một handler `@MessageMapping` nhận binary/text — nhẹ, tự định nghĩa protocol.
- **STOMP**: frame chuẩn, subscribe destination, tích hợp `SimpMessagingTemplate` và **user destinations** nhanh — phù hợp chat và mở rộng topic sau này (`/topic/...`).

Repo hiện dùng **SockJS + STOMP** để tương thích trình duyệt và reverse proxy dễ hơn.

### 8.6. Kiểm thử chi tiết (hai user, WebSocket hai chiều)

Mục tiêu: user **B** mở STOMP trước; user **A** gửi tin qua `SEND /app/dm/send`; **B** thấy JSON incoming và **A** thấy ACK gần như tức thì.

#### Chuẩn bị

1. Chạy backend (ví dụ `mvn spring-boot:run` hoặc JAR), mặc định `http://localhost:8080`.
2. **PostgreSQL** phải chạy (user đăng ký/đăng nhập). **Cassandra** phải chạy vì `SEND /app/dm/send` sẽ ghi bảng `messages` (theo `application.properties`).
3. Cài sẵn trên máy (hoặc dùng CDN trong HTML tạm): `sockjs-client`, `@stomp/stompjs` — hoặc chỉ dùng **curl** cho bước gửi tin + **DevTools** với script tối giản (bên dưới).

#### Bước 1 — Tạo hai tài khoản và lấy `userId`

Đăng ký A và B (username khác nhau), ví dụ:

```http
POST http://localhost:8080/api/auth/register
Content-Type: application/json

{"username":"alice","password":"password1"}
```

```http
POST http://localhost:8080/api/auth/register
Content-Type: application/json

{"username":"bob","password":"password2"}
```

Ghi lại **`userId`** của từng người. Cách nhanh: sau bước đăng nhập (bước 2), response JSON có trường `userId` (kiểu `AuthResponse`).

#### Bước 2 — Đăng nhập và lưu JWT + userId

**Alice:**

```http
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{"username":"alice","password":"password1"}
```

Lưu `accessToken` → `TOKEN_A`, `userId` → `ID_A`.

**Bob:**

```http
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{"username":"bob","password":"password2"}
```

Lưu `accessToken` → `TOKEN_B`, `userId` → `ID_B`.

#### Bước 3 — Mở hai “phiên” trình duyệt tách biệt

- Cách 1: hai cửa sổ **ẩn danh** (hoặc hai trình duyệt khác nhau).
- Cách 2: Chrome **Profile** khác nhau.
- Mỗi cửa sổ chỉ dùng token của **một** user khi chạy script WebSocket (tránh nhầm `TOKEN_A` / `TOKEN_B`).

#### Bước 4 — Kết nối STOMP + subscribe (cả hai user đều chạy)

Trên **mỗi** cửa sổ, mở **DevTools → Console** (F12). Lưu ý: lệnh `import` ES module **không** chạy trực tiếp trong console thường — cần trang web (Vite/React/Vue) đã cấu hình `sockjs-client` và `@stomp/stompjs`, hoặc file HTML dùng `<script type="module">` trỏ tới CDN (ví dụ `unpkg.com`) **và** phục vụ trang qua HTTP cùng cách xử lý CORS như dưới.

Nếu project của bạn đã bundle `sockjs` + `@stomp/stompjs` qua Vite/Webpack, dùng import như tài liệu mục 8.4.

**Cách không có sẵn SPA:** tạo file HTML tạm mở bằng `file://` thường **không** chạy được SockJS tới `localhost:8080` do CORS/restriction — nên dùng một trong các cách:

- Phục vụ một trang tĩnh từ cùng origin `http://localhost:8080` (tùy cấu hình), hoặc
- Chạy dev server frontend tại `http://localhost:5173` và **cấu hình CORS** cho phép origin đó (xem mục xử lý sự cố), hoặc
- Dùng extension / trang test trên **cùng host:port** với API.

Giả sử bạn đã có bundle ESM trong trang, với **Bob** (chỉ ví dụ — thay `TOKEN_B` và base URL đúng):

```javascript
// Thay TOKEN_B và đảm bảo URL SockJS trùng origin backend
const token = 'TOKEN_B';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const stomp = new Client({
  webSocketFactory: () => new SockJS('http://localhost:8080/ws?token=' + encodeURIComponent(token)),
  connectHeaders: { Authorization: 'Bearer ' + token },
  debug: (s) => console.log('[STOMP]', s)
});

stomp.onConnect = () => {
  stomp.subscribe('/user/queue/dm', (msg) => {
    console.log('NHẬN DM:', JSON.parse(msg.body));
  });
  console.log('Bob đã subscribe /user/queue/dm');
};

stomp.onStompError = (f) => console.error('STOMP error', f);
stomp.activate();
```

Lặp tương tự cho **Alice** với `TOKEN_A` (cũng subscribe `/user/queue/dm`) — để cả hai phía đều sẵn sàng nhận tin khi cần.

#### Bước 5 — Alice gửi tin qua STOMP

Trong tab Alice (đã CONNECT), gửi frame:

```text
SEND /app/dm/send
body: {"peerUserId": ID_B, "content":"Xin chào Bob", "messageType":0}
```

Trong trang test tích hợp sẵn (`/index.html`), bấm nút **SEND /app/dm/send**.

#### Bước 6 — Kiểm tra kết quả

- Trên cửa sổ **Bob**, console phải in một dòng kiểu `NHẬN DM: { ... }` (kênh `/user/queue/dm`).
- Trên cửa sổ **Alice**, phải có dòng ACK ở `/user/queue/dm.sent`.
- Nếu cần xác nhận DB, gọi thêm `GET /api/dm/messages?peerUserId=ID_B`.

#### Xử lý sự cố (checklist)

| Hiện tượng | Việc cần làm |
|------------|----------------|
| Console Bob: lỗi ngay khi `activate` / `CONNECT` | Xem log `[STOMP]`; JWT hết hạn hoặc sai → login lại; thử thêm `Authorization` trên CONNECT (đã có trong ví dụ). |
| `401` khi gọi API REST phụ trợ | `Authorization: Bearer` đúng token user đang gọi; không dùng nhầm token của Bob khi Alice gọi API. |
| `peerUserId` sai | `peerUserId` phải là **id số trong bảng users** của đối phương (dùng `userId` từ login). |
| Bob không nhận gì, không lỗi STOMP | Server đẩy tới **username** của Bob (`peer.getUsername()`). Username trong JWT phải trùng user Bob trong DB (ví dụ `bob`). |
| Frontend chạy port khác (vd. 5173) | Trình duyệt chặn SockJS do CORS: cần `@CrossOrigin` hoặc `WebMvcConfigurer` cho origin dev, hoặc proxy Vite trỏ `/ws` về `8080`. |
| Cassandra tắt | `SEND /app/dm/send` sẽ lỗi và nhận message tại `/user/queue/errors`; bật Cassandra để ghi DB. |

#### Ghi chú

- Kiểm thử “gần như tức thì” phù hợp **cùng máy / LAN**; qua Internet có thêm độ trễ mạng.
- Nếu chỉ muốn xác nhận DB: sau khi SEND thành công, gọi `GET /api/dm/messages?peerUserId=...`.

### 8.7. Trang test tích hợp sẵn (giao diện đơn giản)

Project có file **`src/main/resources/static/index.html`**: sau khi chạy backend, mở **`http://localhost:8080/`** (hoặc `/index.html`).

- **Đăng ký / Đăng nhập** → lưu JWT trong `sessionStorage`.
- Nhập **Peer user ID** (số `userId` của tab/đối phương).
- **Kết nối WS** → SockJS + STOMP, subscribe `/user/queue/dm`, `/user/queue/dm.sent`, `/user/queue/errors`.
- **SEND tin qua STOMP** (`/app/dm/send`); tab đối phương thấy incoming và tab gửi thấy ACK.

Cùng origin với API nên **không cần cấu hình CORS** cho trang này. Hai tab ẩn danh với hai user là đủ để test nhanh.
