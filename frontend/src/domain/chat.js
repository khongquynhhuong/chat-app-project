/** @typedef {'in' | 'out'} MessageDirection */
/** @typedef {'sending' | 'sent' | 'failed'} MessageStatus */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {string} peerUsername
 * @property {string} content
 * @property {string} sentAt ISO string
 * @property {MessageDirection} direction
 * @property {MessageStatus} status
 */

/**
 * @typedef {Object} ConversationPreview
 * @property {string} peerUsername
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
 * @param {string} currentUsername
 * @returns {{ peerUsername: string, content: string, sentAt: string, serverId: string | null }}
 */
export function normalizeIncomingDm(payload, currentUsername) {
  if (!payload || typeof payload !== 'object') {
    return {
      peerUsername: '',
      content: String(payload),
      sentAt: new Date().toISOString(),
      serverId: null,
    };
  }

  const senderUsername =
    str(payload.senderUsername) ??
    str(payload.fromUsername) ??
    str(payload.sender) ??
    '';
  const trimmedSender = normalizeUsername(senderUsername);
  const me = normalizeUsername(currentUsername);
  const fallbackPeer =
    normalizeUsername(str(payload.peerUsername)) ||
    normalizeUsername(str(payload.chatWith)) ||
    '';
  const peerUsername =
    trimmedSender && trimmedSender !== me ? trimmedSender : fallbackPeer;

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

  return { peerUsername, content, sentAt, serverId };
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {{ peerUsername: string, clientMessageId: string | null, serverId: string | null, sentAt: string | null }}
 */
export function normalizeSentAck(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      peerUsername: '',
      clientMessageId: null,
      serverId: null,
      sentAt: null,
    };
  }

  const peerUsername =
    normalizeUsername(str(payload.peerUsername)) ||
    normalizeUsername(str(payload.toUsername)) ||
    normalizeUsername(str(payload.receiverUsername)) ||
    '';

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

  return { peerUsername, clientMessageId, serverId, sentAt };
}

export function normalizeIncomingGroup(payload, currentUsername) {
  if (!payload || typeof payload !== 'object') {
    return {
      groupId: null,
      senderUsername: '',
      content: String(payload),
      sentAt: new Date().toISOString(),
      serverId: null,
    };
  }
  return {
    groupId: payload.groupId != null ? Number(payload.groupId) : null,
    senderUsername: normalizeUsername(str(payload.senderUsername) || ''),
    content: str(payload.content) ?? '',
    sentAt: str(payload.createdAt) ?? str(payload.sentAt) ?? new Date().toISOString(),
    serverId: payload.messageId != null ? String(payload.messageId) : (payload.id != null ? String(payload.id) : null),
    direction:
      normalizeUsername(str(payload.senderUsername) || '') === normalizeUsername(currentUsername) ? 'out' : 'in',
  };
}

export function normalizeGroupSentAck(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      groupId: null,
      clientMessageId: null,
      serverId: null,
      sentAt: null,
    };
  }
  return {
    groupId: payload.groupId != null ? Number(payload.groupId) : null,
    clientMessageId: str(payload.clientMessageId) ?? null,
    serverId: payload.messageId != null ? String(payload.messageId) : (payload.id != null ? String(payload.id) : null),
    sentAt: str(payload.createdAt) ?? str(payload.sentAt) ?? null,
  };
}

function str(v) {
  if (v == null) return null;
  return typeof v === 'string' ? v : String(v);
}

function normalizeUsername(value) {
  if (!value) return '';
  return value.trim();
}
