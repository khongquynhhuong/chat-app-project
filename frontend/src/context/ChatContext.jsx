import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';
import {
  newClientMessageId,
  normalizeIncomingDm,
  normalizeSentAck,
} from '../domain/chat.js';
import { useStompChat } from '../hooks/useStompChat.js';
import { fetchMessageHistory } from '../services/chatRepository.js';

const ChatContext = createContext(null);

function normalizePeerUsername(value) {
  if (value == null) return '';
  return String(value).trim();
}

function peerKey(peerUsername) {
  return normalizePeerUsername(peerUsername);
}

function initialPeer(peerUsername) {
  const normalized = normalizePeerUsername(peerUsername);
  return {
    peerUsername: normalized,
    title: normalized,
    lastPreview: '',
    lastAt: '',
    unread: 0,
  };
}

function initialHistory() {
  return {
    loading: false,
    loadingMore: false,
    hasMore: true,
    oldestMessageId: null,
    loaded: false,
    error: null,
  };
}

/**
 * Tìm kiếm vị trí của một tin nhắn dựa trên Client ID trong cấu trúc dữ liệu Chat.
 * @param {Object} messagesByPeer - Đối tượng chứa tin nhắn, key là username, value là mảng tin nhắn.
 * @param {string} clientMessageId - ID tạm thời do phía client tạo ra khi gửi tin nhắn.
 * @returns {Object|null} Trả về { key, index } nếu tìm thấy, ngược lại trả về null.
 */
function findMessageByClientId(messagesByPeer, clientMessageId) {
  if (!clientMessageId) return null;
  for (const [key, list] of Object.entries(messagesByPeer)) {
    const index = list.findIndex((m) => m.id === clientMessageId);
    if (index >= 0) {
      return { key, index };
    }
  }
  return null;
}

function chatReducer(state, action) {
  switch (action.type) {
    case 'SELECT_PEER': {
      const username = normalizePeerUsername(action.payload);
      if (!username) {
        return { ...state, activePeerUsername: null };
      }
      const key = peerKey(username);
      const peers = { ...state.peers };
      if (peers[key]) {
        peers[key] = { ...peers[key], unread: 0 };
      }
      return { ...state, activePeerUsername: username, peers };
    }

    case 'ENSURE_PEER': {
      const username = normalizePeerUsername(action.payload);
      if (!username) return state;
      const key = peerKey(username);
      if (state.peers[key]) return state;
      return {
        ...state,
        peers: { ...state.peers, [key]: initialPeer(username) },
      };
    }

    case 'INCOMING_DM': {
      const { peerUsername, content, sentAt, serverId } = action.payload;
      const normalizedPeer = normalizePeerUsername(peerUsername);
      if (!normalizedPeer) return state;
      const key = peerKey(normalizedPeer);
      const peers = { ...state.peers };
      const prevP = peers[key] || initialPeer(normalizedPeer);
      const unreadInc = state.activePeerUsername === normalizedPeer ? 0 : 1;
      peers[key] = {
        ...prevP,
        title: normalizedPeer,
        lastPreview: content.slice(0, 80),
        lastAt: sentAt,
        unread: prevP.unread + unreadInc,
      };

      const msg = {
        id: serverId || newClientMessageId(),
        peerUsername: normalizedPeer,
        content,
        sentAt,
        direction: 'in',
        status: 'sent',
      };
      const list = [...(state.messages[key] || []), msg];
      return { ...state, peers, messages: { ...state.messages, [key]: list } };
    }

    case 'APPEND_OUT': {
      const { peerUsername, content, id } = action.payload;
      const normalizedPeer = normalizePeerUsername(peerUsername);
      if (!normalizedPeer) return state;
      const key = peerKey(normalizedPeer);
      const peers = { ...state.peers };
      const prevP = peers[key] || initialPeer(normalizedPeer);
      peers[key] = {
        ...prevP,
        title: normalizedPeer,
        lastPreview: content.slice(0, 80),
        lastAt: new Date().toISOString(),
      };
      const msg = {
        id,
        peerUsername: normalizedPeer,
        content,
        sentAt: new Date().toISOString(),
        direction: 'out',
        status: 'sending',
      };
      const list = [...(state.messages[key] || []), msg];
      return { ...state, peers, messages: { ...state.messages, [key]: list } };
    }

    case 'SENT_ACK': {
      const { peerUsername, clientMessageId, serverId, sentAt } = action.payload;
      const normalizedPeer = normalizePeerUsername(peerUsername);

      let targetKey = normalizedPeer ? peerKey(normalizedPeer) : null;
      let targetIndex = -1;

      if (targetKey && clientMessageId) {
        const list = state.messages[targetKey] || [];
        targetIndex = list.findIndex((m) => m.id === clientMessageId);
      }

      if (targetIndex < 0 && clientMessageId) {
        const found = findMessageByClientId(state.messages, clientMessageId);
        if (found) {
          targetKey = found.key;
          targetIndex = found.index;
        }
      }

      if (targetIndex < 0 && targetKey) {
        const list = state.messages[targetKey] || [];
        for (let i = list.length - 1; i >= 0; i -= 1) {
          if (list[i].direction === 'out' && list[i].status === 'sending') {
            targetIndex = i;
            break;
          }
        }
      }

      if (targetIndex < 0 && state.activePeerUsername) {
        const k = peerKey(state.activePeerUsername);
        const list = state.messages[k] || [];
        for (let i = list.length - 1; i >= 0; i -= 1) {
          if (list[i].direction === 'out' && list[i].status === 'sending') {
            targetKey = k;
            targetIndex = i;
            break;
          }
        }
      }

      if (!targetKey || targetIndex < 0) return state;
      const list = state.messages[targetKey];
      if (!list?.length) return state;

      const next = [...list];
      const m = next[targetIndex];
      next[targetIndex] = {
        ...m,
        id: serverId || m.id,
        status: 'sent',
        sentAt: sentAt || m.sentAt,
      };
      return { ...state, messages: { ...state.messages, [targetKey]: next } };
    }

    case 'FAIL_MESSAGE': {
      const { peerUsername, id } = action.payload;
      const normalizedPeer = normalizePeerUsername(peerUsername);
      if (!normalizedPeer) return state;
      const key = peerKey(normalizedPeer);
      const list = state.messages[key];
      if (!list) return state;
      const next = list.map((m) =>
          m.id === id && m.direction === 'out' ? { ...m, status: 'failed' } : m,
      );
      return { ...state, messages: { ...state.messages, [key]: next } };
    }

    case 'WS_BANNER':
      return { ...state, wsBanner: action.payload };

    case 'HISTORY_LOAD_START': {
      const key = peerKey(action.payload.peerUsername);
      const history = state.historyByPeer[key] || initialHistory();
      return {
        ...state,
        historyByPeer: {
          ...state.historyByPeer,
          [key]: { ...history, loading: true, error: null },
        },
      };
    }

    case 'HISTORY_LOAD_SUCCESS': {
      const { peerUsername, messages, hasMore } = action.payload;
      const key = peerKey(peerUsername);
      const history = state.historyByPeer[key] || initialHistory();

      let oldestId = null;
      if (messages.length > 0) {
        oldestId = messages[0].id;
      }
      return {
        ...state,
        messages: {
          ...state.messages,
          [key]: messages,
        },
        historyByPeer: {
          ...state.historyByPeer,
          [key]: {
            ...history,
            loading: false,
            loaded: true,
            hasMore: hasMore,
            oldestMessageId: oldestId,
            error: null,
          },
        },
      };
    }

    case 'HISTORY_LOAD_ERROR': {
      const { peerUsername, error } = action.payload;
      const key = peerKey(peerUsername);
      const history = state.historyByPeer[key] || initialHistory();
      return {
        ...state,
        historyByPeer: {
          ...state.historyByPeer,
          [key]: {
            ...history,
            loading: false,
            error,
          },
        },
      };
    }

    case 'HISTORY_LOAD_MORE_START': {
      const key = peerKey(action.payload.peerUsername);
      const history = state.historyByPeer[key] || initialHistory();
      return {
        ...state,
        historyByPeer: {
          ...state.historyByPeer,
          [key]: { ...history, loadingMore: true, error: null },
        },
      };
    }

    case 'HISTORY_LOAD_MORE_SUCCESS': {
      const { peerUsername, messages, hasMore } = action.payload;
      const key = peerKey(peerUsername);
      const history = state.historyByPeer[key] || initialHistory();
      const currentMessages = state.messages[key] || [];
      const existingIds = new Set(currentMessages.map((m) => m.id));
      const filteredNew = messages.filter((m) => !existingIds.has(m.id));
      const newMessages = [...filteredNew, ...currentMessages];

      let oldestId = history.oldestMessageId;
      if (filteredNew.length > 0) {
        oldestId = filteredNew[0].id;
      }
      return {
        ...state,
        messages: {
          ...state.messages,
          [key]: newMessages,
        },
        historyByPeer: {
          ...state.historyByPeer,
          [key]: {
            ...history,
            loadingMore: false,
            hasMore: hasMore,
            oldestMessageId: oldestId,
            error: null,
          },
        },
      };
    }

    case 'HISTORY_LOAD_MORE_ERROR': {
      const { peerUsername, error } = action.payload;
      const key = peerKey(peerUsername);
      const history = state.historyByPeer[key] || initialHistory();
      return {
        ...state,
        historyByPeer: {
          ...state.historyByPeer,
          [key]: { ...history, loadingMore: false, error },
        },
      };
    }

    default:
      return state;
  }
}

const initialChatState = {
  activePeerUsername: null,
  peers: {},
  messages: {},
  historyByPeer: {},
  wsBanner: null,
};

function formatWsErr(payload) {
  if (!payload) return 'Unknown error';
  if (typeof payload === 'string') return payload;
  if (payload.error) return String(payload.error);
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

export function ChatProvider({ authUser, children }) {
  // Sửa initialState thành initialChatState
  const [state, dispatch] = useReducer(chatReducer, initialChatState);

  const username = authUser.username;

  const { clientRef, connected, lastError } = useStompChat(authUser.token, {
    onConnected: () => dispatch({ type: 'WS_BANNER', payload: null }),
    onIncoming: (payload) => {
      const n = normalizeIncomingDm(payload, username);
      if (!n.peerUsername) return;
      dispatch({ type: 'ENSURE_PEER', payload: n.peerUsername });
      dispatch({ type: 'INCOMING_DM', payload: n });
    },
    onSentAck: (payload) => {
      const a = normalizeSentAck(payload);
      dispatch({ type: 'SENT_ACK', payload: a });
    },
    onWsError: (payload) => {
      dispatch({ type: 'WS_BANNER', payload: formatWsErr(payload) });
    },
    onSystem: (msg) => dispatch({ type: 'WS_BANNER', payload: msg }),
  });

  const selectPeer = useCallback((peerUsername) => {
    dispatch({ type: 'SELECT_PEER', payload: peerUsername });
  }, []);

  const ensurePeer = useCallback((peerUsername) => {
    dispatch({ type: 'ENSURE_PEER', payload: peerUsername });
  }, []);

  const loadHistory = useCallback(async (peerUsername, { more = false } = {}) => {
    const key = peerKey(peerUsername);
    const historyState = state.historyByPeer[key] || initialHistory();

    if (!more) {
      dispatch({ type: 'HISTORY_LOAD_START', payload: { peerUsername } });
    } else {
      dispatch({ type: 'HISTORY_LOAD_MORE_START', payload: { peerUsername } });
    }
    try {
      const messages = await fetchMessageHistory(
          authUser.token,
          peerUsername,
          more ? historyState.oldestMessageId : null,
          authUser.username
      );
      const hasMore = messages.length === 20;
      if (!more) {
        dispatch({
          type: 'HISTORY_LOAD_SUCCESS',
          payload: { peerUsername, messages, hasMore }
        });
      } else {
        dispatch({
          type: 'HISTORY_LOAD_MORE_SUCCESS',
          payload: { peerUsername, messages, hasMore }
        });
      }
    } catch (error) {
      // Sửa err thành error
      const errorMsg = error.message || 'Lỗi khi tải lịch sử';
      if (!more) {
        dispatch({ type: 'HISTORY_LOAD_ERROR', payload: { peerUsername, error: errorMsg } });
      } else {
        dispatch({ type: 'HISTORY_LOAD_MORE_ERROR', payload: { peerUsername, error: errorMsg } });
      }
    }
  }, [authUser.token, authUser.username, state.historyByPeer]);

  const openChatWithPeer = useCallback((peerUsername) => {
    dispatch({ type: 'ENSURE_PEER', payload: peerUsername });
    dispatch({ type: 'SELECT_PEER', payload: peerUsername });
    loadHistory(peerUsername);
  }, [loadHistory]);

  const sendMessage = useCallback(
      (peerUsername, content) => {
        const normalizedPeer = normalizePeerUsername(peerUsername);
        if (!normalizedPeer) return;

        const id = newClientMessageId();
        dispatch({
          type: 'APPEND_OUT',
          payload: { peerUsername: normalizedPeer, content, id },
        });
        const client = clientRef.current;
        if (!client?.connected) {
          dispatch({
            type: 'FAIL_MESSAGE',
            payload: { peerUsername: normalizedPeer, id },
          });
          dispatch({
            type: 'WS_BANNER',
            payload: 'WebSocket is not connected',
          });
          return;
        }
        client.publish({
          destination: '/app/dm/send',
          headers: { 'content-type': 'application/json;charset=UTF-8' },
          body: JSON.stringify({
            peerUsername: normalizedPeer,
            content,
            messageType: 0,
            clientMessageId: id,
          }),
        });
      },
      [clientRef],
  );

  const clearWsBanner = useCallback(() => {
    dispatch({ type: 'WS_BANNER', payload: null });
  }, []);

  const peerList = useMemo(() => {
    return Object.values(state.peers).sort((a, b) => {
      const ta = a.lastAt || '';
      const tb = b.lastAt || '';
      return tb.localeCompare(ta);
    });
  }, [state.peers]);

  const activeMessages = useMemo(() => {
    if (!state.activePeerUsername) return [];
    return state.messages[peerKey(state.activePeerUsername)] || [];
  }, [state.activePeerUsername, state.messages]);

  const value = useMemo(
      () => ({
        ...state,
        peerList,
        activeMessages,
        loadHistory,
        selectPeer,
        ensurePeer,
        openChatWithPeer,
        sendMessage,
        connected,
        lastError,
        clearWsBanner,
      }),
      [
        state,
        peerList,
        activeMessages,
        selectPeer,
        ensurePeer,
        openChatWithPeer,
        sendMessage,
        connected,
        lastError,
        clearWsBanner,
      ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}