/**
 * REST adapters for future full API (conversations, history, user search).
 * Replace implementations when Spring endpoints are ready.
 */

/** @returns {Promise<import('../domain/chat.js').ConversationPreview[]>} */
export async function fetchConversations(_token) {
  // TODO: GET /api/conversations (or /api/chats) — return list with peerUserId, title, lastMessage, unread
  throw new Error('REST chưa triển khai: fetchConversations — dùng state cục bộ + STOMP');
}

/**
 * @param {string} _token
 * @param {number} _peerUserId
 * @param {{ before?: string, limit?: number }} _page
 * @returns {Promise<import('../domain/chat.js').ChatMessage[]>}
 */
export async function fetchMessageHistory(_token, _peerUserId, _page) {
  // TODO: GET /api/dm/{peerUserId}/messages?before=&limit=
  throw new Error('REST chưa triển khai: fetchMessageHistory');
}

/**
 * @param {string} _token
 * @param {string} _query
 * @returns {Promise<{ userId: number, username: string }[]>}
 */
export async function searchUsers(_token, _query) {
  // TODO: GET /api/users/search?q=
  throw new Error('REST chưa triển khai: searchUsers');
}
