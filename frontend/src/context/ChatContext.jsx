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

const ChatContext = createContext(null);

function peerKey(peerUserId) {
  return String(peerUserId);
}

function initialPeer(peerUserId) {
  return {
    peerUserId: Number(peerUserId),
    title: `User ${peerUserId}`,
    lastPreview: '',
    lastAt: '',
    unread: 0,
  };
}

function chatReducer(state, action) {
  switch (action.type) {
    case 'SELECT_PEER': {
      const pid = action.payload;
      if (pid == null) {
        return { ...state, activePeerId: null };
      }
      const key = peerKey(pid);
      const peers = { ...state.peers };
      if (peers[key]) {
        peers[key] = { ...peers[key], unread: 0 };
      }
      return { ...state, activePeerId: Number(pid), peers };
    }

    case 'ENSURE_PEER': {
      const pid = Number(action.payload);
      if (!Number.isFinite(pid) || pid < 1) return state;
      const key = peerKey(pid);
      if (state.peers[key]) return state;
      return {
        ...state,
        peers: { ...state.peers, [key]: initialPeer(pid) },
      };
    }

    case 'INCOMING_DM': {
      const { peerUserId, content, sentAt, serverId } = action.payload;
      if (!peerUserId) return state;
      const key = peerKey(peerUserId);
      const peers = { ...state.peers };
      const prevP = peers[key] || initialPeer(peerUserId);
      const unreadInc =
        state.activePeerId === peerUserId ? 0 : 1;
      peers[key] = {
        ...prevP,
        lastPreview: content.slice(0, 80),
        lastAt: sentAt,
        unread: prevP.unread + unreadInc,
      };

      const msg = {
        id: serverId || newClientMessageId(),
        peerUserId,
        content,
        sentAt,
        direction: 'in',
        status: 'sent',
      };
      const list = [...(state.messages[key] || []), msg];
      return { ...state, peers, messages: { ...state.messages, [key]: list } };
    }

    case 'APPEND_OUT': {
      const { peerUserId, content, id } = action.payload;
      const key = peerKey(peerUserId);
      const peers = { ...state.peers };
      const prevP = peers[key] || initialPeer(peerUserId);
      peers[key] = {
        ...prevP,
        lastPreview: content.slice(0, 80),
        lastAt: new Date().toISOString(),
      };
      const msg = {
        id,
        peerUserId,
        content,
        sentAt: new Date().toISOString(),
        direction: 'out',
        status: 'sending',
      };
      const list = [...(state.messages[key] || []), msg];
      return { ...state, peers, messages: { ...state.messages, [key]: list } };
    }

    case 'SENT_ACK': {
      const { peerUserId, clientMessageId, serverId, sentAt } = action.payload;
      if (!peerUserId) return state;
      const key = peerKey(peerUserId);
      const list = state.messages[key];
      if (!list?.length) return state;

      let idx = -1;
      if (clientMessageId) {
        idx = list.findIndex((m) => m.id === clientMessageId);
      }
      if (idx < 0) {
        for (let i = list.length - 1; i >= 0; i -= 1) {
          if (list[i].direction === 'out' && list[i].status === 'sending') {
            idx = i;
            break;
          }
        }
      }
      if (idx < 0) return state;

      const next = [...list];
      const m = next[idx];
      next[idx] = {
        ...m,
        id: serverId || m.id,
        status: 'sent',
        sentAt: sentAt || m.sentAt,
      };
      return { ...state, messages: { ...state.messages, [key]: next } };
    }

    case 'FAIL_MESSAGE': {
      const { peerUserId, id } = action.payload;
      const key = peerKey(peerUserId);
      const list = state.messages[key];
      if (!list) return state;
      const next = list.map((m) =>
        m.id === id && m.direction === 'out'
          ? { ...m, status: 'failed' }
          : m,
      );
      return { ...state, messages: { ...state.messages, [key]: next } };
    }

    case 'WS_BANNER':
      return { ...state, wsBanner: action.payload };

    default:
      return state;
  }
}

const initialChatState = {
  activePeerId: null,
  peers: {},
  messages: {},
  wsBanner: null,
};

function formatWsErr(payload) {
  if (!payload) return 'Lỗi không xác định';
  if (typeof payload === 'string') return payload;
  if (payload.error) return String(payload.error);
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

export function ChatProvider({ authUser, children }) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);

  const userId = authUser.userId;

  const { clientRef, connected, lastError } = useStompChat(authUser.token, {
    onConnected: () => dispatch({ type: 'WS_BANNER', payload: null }),
    onIncoming: (payload) => {
      const n = normalizeIncomingDm(payload, userId);
      if (!n.peerUserId) return;
      dispatch({ type: 'ENSURE_PEER', payload: n.peerUserId });
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

  const selectPeer = useCallback((peerUserId) => {
    dispatch({ type: 'SELECT_PEER', payload: peerUserId });
  }, []);

  const ensurePeer = useCallback((peerUserId) => {
    dispatch({ type: 'ENSURE_PEER', payload: peerUserId });
  }, []);

  const openChatWithPeer = useCallback((peerUserId) => {
    dispatch({ type: 'ENSURE_PEER', payload: peerUserId });
    dispatch({ type: 'SELECT_PEER', payload: peerUserId });
  }, []);

  const sendMessage = useCallback(
    (peerUserId, content) => {
      const id = newClientMessageId();
      dispatch({
        type: 'APPEND_OUT',
        payload: { peerUserId: Number(peerUserId), content, id },
      });
      const client = clientRef.current;
      if (!client?.connected) {
        dispatch({
          type: 'FAIL_MESSAGE',
          payload: { peerUserId: Number(peerUserId), id },
        });
        dispatch({
          type: 'WS_BANNER',
          payload: 'WebSocket chưa kết nối — không gửi được',
        });
        return;
      }
      client.publish({
        destination: '/app/dm/send',
        headers: { 'content-type': 'application/json;charset=UTF-8' },
        body: JSON.stringify({
          peerUserId: Number(peerUserId),
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
    if (state.activePeerId == null) return [];
    return state.messages[peerKey(state.activePeerId)] || [];
  }, [state.activePeerId, state.messages]);

  const value = useMemo(
    () => ({
      ...state,
      peerList,
      activeMessages,
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

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
