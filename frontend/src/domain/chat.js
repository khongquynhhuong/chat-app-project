/** @typedef {'in' | 'out'} MessageDirection */
/** @typedef {'sending' | 'sent' | 'failed'} MessageStatus */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {number} peerUserId
 * @property {string} content
 * @property {string} sentAt ISO string
 * @property {MessageDirection} direction
 * @property {MessageStatus} status
 */

/**
 * @typedef {Object} ConversationPreview
 * @property {number} peerUserId
 * @property {string} title
 * @property {string} [lastPreview]
 * @property {string} [lastAt]
 * @property {number} unread
 */

export function newClientMessageId() {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Normalize incoming DM payload from backend (adjust field names to match your Java DTO).
 * @param {Record<string, unknown>} payload
 * @param {string} currentUserId
 * @returns {{ peerUserId: number, content: string, sentAt: string, serverId: string | null }}
 */
export function normalizeIncomingDm(payload, currentUserId) {
  if (!payload || typeof payload !== 'object') {
    return {
      peerUserId: 0,
      content: String(payload),
      sentAt: new Date().toISOString(),
      serverId: null,
    };
  }

  const selfId = Number(currentUserId);
  const sender =
    num(payload.senderId) ??
    num(payload.fromUserId) ??
    num(payload.senderUserId);
  const receiver =
    num(payload.receiverId) ??
    num(payload.toUserId) ??
    num(payload.peerUserId);

  let peerUserId = 0;
  if (sender && sender !== selfId) peerUserId = sender;
  else if (receiver && receiver !== selfId) peerUserId = receiver;
  else peerUserId = num(payload.peerUserId) ?? num(payload.chatWith) ?? 0;

  const content =
    str(payload.content) ??
    str(payload.body) ??
    str(payload.text) ??
    str(payload.message) ??
    '';

  const sentAt =
    str(payload.createdAt) ??
    str(payload.sentAt) ??
    str(payload.timestamp) ??
    new Date().toISOString();

  const serverId =
    payload.id != null
      ? String(payload.id)
      : payload.messageId != null
        ? String(payload.messageId)
        : null;

  return { peerUserId, content, sentAt, serverId };
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {{ peerUserId: number, clientMessageId: string | null, serverId: string | null, sentAt: string | null }}
 */
export function normalizeSentAck(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      peerUserId: 0,
      clientMessageId: null,
      serverId: null,
      sentAt: null,
    };
  }

  const peerUserId =
    num(payload.peerUserId) ??
    num(payload.receiverId) ??
    num(payload.toUserId) ??
    0;

  const clientMessageId =
    str(payload.clientMessageId) ?? str(payload.clientId) ?? null;

  const serverId =
    payload.id != null
      ? String(payload.id)
      : payload.messageId != null
        ? String(payload.messageId)
        : null;

  const sentAt =
    str(payload.createdAt) ?? str(payload.sentAt) ?? null;

  return { peerUserId, clientMessageId, serverId, sentAt };
}

function num(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v) {
  if (v == null) return null;
  return typeof v === 'string' ? v : String(v);
}
