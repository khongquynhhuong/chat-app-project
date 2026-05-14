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

/** @returns {Promise<Array>} */
export async function fetchGroupConversations(token) {
  const response = await fetch('/api/groups/recent-conversations', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi khi tải danh sách nhóm: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  return data.map((conv) => ({
    groupId: conv.groupId,
    title: conv.title || `Group ${conv.groupId}`,
    lastPreview: conv.lastMessage || '',
    lastAt: conv.lastAt || '',
    unread: conv.unread || 0,
    memberCount: conv.memberCount || 0,
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

export async function fetchGroupMessageHistory(token, groupId, beforeMessageId = null, currentUsername = '') {
  let url = `/api/groups/${encodeURIComponent(groupId)}/messages?limit=20`;
  if (beforeMessageId) {
    url += `&beforeMessageId=${encodeURIComponent(beforeMessageId)}`;
  }
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi khi tải lịch sử nhóm: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  return data.map((msg) => {
    const sender = String(msg.senderUsername || '').trim();
    const current = String(currentUsername || '').trim();
    return {
      id: msg.messageId || msg.id,
      groupId: msg.groupId || groupId,
      senderUsername: sender,
      content: msg.content,
      sentAt: msg.createdAt || msg.sentAt || new Date().toISOString(),
      direction: sender === current ? 'out' : 'in',
      status: mapServerStatusToUi(msg.deliveryStatus),
      readBy: [],
    };
  });
}

export async function deleteGroup(token, groupId) {
  const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Không xóa được nhóm: ${response.status} - ${errorText}`);
  }
}

export async function createGroup(token, name, memberUsernames = []) {
  const response = await fetch('/api/groups', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, memberUsernames }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Không tạo được nhóm: ${response.status} - ${errorText}`);
  }
  return response.json();
}

/** @returns {Promise<{ groupId: number, name: string, ownerUsername: string, memberCount: number, members: string[] }>} */
export async function fetchGroupInfo(token, groupId) {
  const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Không tải được thông tin nhóm: ${response.status} - ${errorText}`);
  }
  return response.json();
}

/** @returns {Promise<{ groupId: number, name: string, ownerUsername: string, memberCount: number, members: string[] }>} */
export async function renameGroup(token, groupId, name) {
  const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: String(name || '').trim() }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Không đổi tên được nhóm: ${response.status} - ${errorText}`);
  }
  return response.json();
}

/** @returns {Promise<{ groupId: number, name: string, ownerUsername: string, memberCount: number, members: string[] }>} */
export async function addGroupMembers(token, groupId, memberUsernames) {
  const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}/members`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ memberUsernames }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Không thêm thành viên: ${response.status} - ${errorText}`);
  }
  return response.json();
}

export async function leaveGroup(token, groupId) {
  const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}/leave`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Không rời được nhóm: ${response.status} - ${errorText}`);
  }
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