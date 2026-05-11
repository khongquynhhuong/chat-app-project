/**
 * REST adapters for future full API (conversations, history, user search).
 * Replace implementations when Spring endpoints are ready.
 */

/** @returns {Promise<import('../domain/chat.js').ConversationPreview[]>} */
export async function fetchConversations(token) {
  const response = await fetch('/api/dm/recent-conversations', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi khi tải danh sách trò chuyện: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  return data.map((conv) => ({
    peerUsername: conv.peerUsername,
    title: conv.title || conv.peerUsername,
    lastPreview: conv.lastMessage || '',
    lastAt: conv.lastAt || '',
    unread: conv.unread || 0,
  }));
}

/**
 * Hàm phụ trợ chuyển đổi status
 */
function mapServerStatusToUi(serverStatus) {
  switch (serverStatus) {
    case 'READ':
      return 'read';
    case 'DELIVERED':
      return 'delivered';
    case 'SENT':
    default:
      return 'sent';
  }
}

/**
 * @param {string} token - JWT Token
 * @param {string} peerUsername - Tên người nhận
 * @param {string|null} beforeMessageId - ID của tin nhắn cũ nhất (nếu có)
 * @param {string} currentUsername - Username của chính mình
 * @return {Promise<Array>} - Danh sách tin nhắn đã được chuẩn hóa
 */
export async function fetchMessageHistory(token, peerUsername, beforeMessageId = null, currentUsername = '') {
  // Đã sửa URL: bỏ khoảng trắng và dấu ngoặc nhọn thừa, thêm dấu / ở đầu nếu cần thiết (ví dụ: /api/dm/messages)
  let url = `/api/dm/messages?peerUsername=${encodeURIComponent(peerUsername)}&limit=20`;

  if (beforeMessageId) {
    url += `&beforeMessageId=${encodeURIComponent(beforeMessageId)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi khi tải lịch sử tin nhắn: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  const mappedMessages = data.map((msg) => {
    const sender = String(msg.senderUsername || '').trim();
    const current = String(currentUsername || '').trim();

    return {
      id: msg.messageId || msg.id,
      peerUsername: msg.peerUsername || peerUsername,
      content: msg.content,
      sentAt: msg.createdAt || msg.sentAt || new Date().toISOString(),
      direction: sender === current ? 'out' : 'in',
      status: mapServerStatusToUi(msg.deliveryStatus),
      clientMessageId: msg.clientMessageId,
    };
  });

  mappedMessages.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));

  return mappedMessages;
}

/**
 * @param {string} _token
 * @param {string} _query
 * @returns {Promise<{ userId: number, username: string }[]>}
 */
export async function searchUsers(token, query) {
  if (!query || !query.trim()) {
    return [];
  }
  
  const url = `/api/users/search?q=${encodeURIComponent(query.trim())}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi khi tìm kiếm người dùng: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data;
}