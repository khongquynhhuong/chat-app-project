import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { newClientMessageId, normalizeGroupSentAck, normalizeIncomingDm, normalizeIncomingGroup, normalizeSentAck } from '../domain/chat.js';
import { useStompChat } from '../hooks/useStompChat.js';
import {
  addGroupMembers,
  createGroup,
  fetchConversations,
  fetchGroupConversations,
  fetchGroupMessageHistory,
  fetchMessageHistory,
  leaveGroup,
  deleteGroup,
  renameGroup,
} from '../services/chatRepository.js';

const ChatContext = createContext(null);
const dmKey = (username) => `dm:${String(username || '').trim()}`;
const groupKey = (groupId) => `group:${groupId}`;

function initialHistory() {
  return { loading: false, loadingMore: false, hasMore: true, oldestMessageId: null, loaded: false, error: null };
}

function reducer(state, action) {
  switch (action.type) {
    case 'UPSERT_CONV':
      return { ...state, peers: { ...state.peers, [action.payload.peerUsername]: { ...(state.peers[action.payload.peerUsername] || {}), ...action.payload } } };
    case 'SELECT': {
      const peerUsername = action.payload;
      if (peerUsername == null || peerUsername === '') {
        return { ...state, activePeerUsername: null };
      }
      const peers = { ...state.peers };
      if (peers[peerUsername]) peers[peerUsername] = { ...peers[peerUsername], unread: 0 };
      return { ...state, activePeerUsername: peerUsername, peers };
    }
    case 'REMOVE_PEER': {
      const key = action.payload.key;
      const { [key]: _r, ...peers } = state.peers;
      const { [key]: _m, ...messages } = state.messages;
      const { [key]: _h, ...historyByPeer } = state.historyByPeer;
      const nextActive =
        state.activePeerUsername === key ? null : state.activePeerUsername;
      return { ...state, peers, messages, historyByPeer, activePeerUsername: nextActive };
    }
    case 'APPEND':
      return { ...state, messages: { ...state.messages, [action.payload.key]: [...(state.messages[action.payload.key] || []), action.payload.message] } };
    case 'ACK': {
      const { key, clientMessageId, serverId, sentAt } = action.payload;
      const list = state.messages[key] || [];
      const idx = list.findIndex((m) => m.id === clientMessageId);
      if (idx < 0) return state;
      const next = [...list];
      next[idx] = { ...next[idx], id: serverId || next[idx].id, sentAt: sentAt || next[idx].sentAt, status: 'sent' };
      return { ...state, messages: { ...state.messages, [key]: next } };
    }
    case 'FAIL':
      return { ...state, messages: { ...state.messages, [action.payload.key]: (state.messages[action.payload.key] || []).map((m) => (m.id === action.payload.id ? { ...m, status: 'failed' } : m)) } };
    case 'HISTORY_LOADING': {
      const history = state.historyByPeer[action.payload.key] || initialHistory();
      return { ...state, historyByPeer: { ...state.historyByPeer, [action.payload.key]: { ...history, loading: !action.payload.more, loadingMore: action.payload.more, error: null } } };
    }
    case 'HISTORY_LOADED': {
      const prev = state.messages[action.payload.key] || [];
      const incoming = action.payload.more ? [...action.payload.messages.filter((m) => !prev.some((x) => x.id === m.id)), ...prev] : action.payload.messages;
      return {
        ...state,
        messages: { ...state.messages, [action.payload.key]: incoming },
        historyByPeer: { ...state.historyByPeer, [action.payload.key]: { ...(state.historyByPeer[action.payload.key] || initialHistory()), loading: false, loadingMore: false, loaded: true, hasMore: action.payload.hasMore, oldestMessageId: incoming.length ? incoming[0].id : null, error: null } },
      };
    }
    case 'HISTORY_ERROR':
      return { ...state, historyByPeer: { ...state.historyByPeer, [action.payload.key]: { ...(state.historyByPeer[action.payload.key] || initialHistory()), loading: false, loadingMore: false, error: action.payload.error } } };
    case 'WS_BANNER':
      return { ...state, wsBanner: action.payload };
    default:
      return state;
  }
}

export function ChatProvider({ authUser, children }) {
  const [state, dispatch] = useReducer(reducer, { activePeerUsername: null, peers: {}, messages: {}, historyByPeer: {}, wsBanner: null });
  const token = authUser.token;
  const username = authUser.username;

  const { clientRef, connected, lastError } = useStompChat(token, {
    onConnected: () => dispatch({ type: 'WS_BANNER', payload: null }),
    onIncoming: (payload) => {
      const n = normalizeIncomingDm(payload, username);
      const key = dmKey(n.peerUsername);
      dispatch({ type: 'UPSERT_CONV', payload: { peerUsername: key, kind: 'dm', rawId: n.peerUsername, title: n.peerUsername, lastPreview: n.content.slice(0, 80), lastAt: n.sentAt, unread: state.activePeerUsername === key ? 0 : (state.peers[key]?.unread || 0) + 1 } });
      dispatch({ type: 'APPEND', payload: { key, message: { id: n.serverId || newClientMessageId(), content: n.content, sentAt: n.sentAt, direction: 'in', status: 'sent' } } });
    },
    onSentAck: (payload) => {
      const a = normalizeSentAck(payload);
      dispatch({ type: 'ACK', payload: { key: dmKey(a.peerUsername), ...a } });
    },
    onGroupIncoming: (payload) => {
      const n = normalizeIncomingGroup(payload, username);
      if (!n.groupId) return;
      const key = groupKey(n.groupId);
      dispatch({ type: 'UPSERT_CONV', payload: { peerUsername: key, kind: 'group', rawId: n.groupId, title: state.peers[key]?.title || `Nhóm ${n.groupId}`, lastPreview: n.content.slice(0, 80), lastAt: n.sentAt, unread: state.activePeerUsername === key ? 0 : (state.peers[key]?.unread || 0) + 1 } });
      dispatch({ type: 'APPEND', payload: { key, message: { id: n.serverId || newClientMessageId(), content: n.content, sentAt: n.sentAt, senderUsername: n.senderUsername, direction: n.direction || 'in', status: 'sent', readBy: [] } } });
    },
    onGroupSentAck: (payload) => {
      const a = normalizeGroupSentAck(payload);
      if (a.groupId) dispatch({ type: 'ACK', payload: { key: groupKey(a.groupId), ...a } });
    },
    onGroupDeleted: (groupId) => {
      if (groupId) {
        const key = groupKey(groupId);
        dispatch({ type: 'REMOVE_PEER', payload: { key } });
      }
    },
    onWsError: (payload) => dispatch({ type: 'WS_BANNER', payload: payload?.error || 'Unknown error' }),
    onSystem: (msg) => dispatch({ type: 'WS_BANNER', payload: msg }),
  });

  const loadConversations = useCallback(async () => {
    const [dms, groups] = await Promise.all([fetchConversations(token), fetchGroupConversations(token)]);
    dms.forEach((c) => dispatch({ type: 'UPSERT_CONV', payload: { peerUsername: dmKey(c.peerUsername), kind: 'dm', rawId: c.peerUsername, title: c.title, lastPreview: c.lastPreview, lastAt: c.lastAt, unread: c.unread } }));
    groups.forEach((c) => dispatch({ type: 'UPSERT_CONV', payload: { peerUsername: groupKey(c.groupId), kind: 'group', rawId: c.groupId, title: c.title, lastPreview: c.lastPreview, lastAt: c.lastAt, unread: c.unread, memberCount: c.memberCount } }));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadConversations().catch(() =>
      dispatch({ type: 'WS_BANNER', payload: 'Không thể tải danh sách cuộc trò chuyện' }),
    );
  }, [token, loadConversations]);

  const loadHistory = useCallback(async (key, { more = false } = {}) => {
    if (!key) return;
    const history = state.historyByPeer[key] || initialHistory();
    dispatch({ type: 'HISTORY_LOADING', payload: { key, more } });
    try {
      let messages = [];
      if (String(key).startsWith('group:')) {
        const groupId = Number(String(key).slice(6));
        messages = await fetchGroupMessageHistory(token, groupId, more ? history.oldestMessageId : null, username);
      } else {
        messages = await fetchMessageHistory(token, String(key).slice(3), more ? history.oldestMessageId : null, username);
      }
      dispatch({ type: 'HISTORY_LOADED', payload: { key, messages, hasMore: messages.length === 20, more } });
    } catch (error) {
      dispatch({
        type: 'HISTORY_ERROR',
        payload: { key, error: error.message || 'Lỗi tải lịch sử' },
      });
    }
  }, [state.historyByPeer, token, username]);

  const selectPeer = useCallback((key) => dispatch({ type: 'SELECT', payload: key }), []);
  const ensurePeer = useCallback((peerUsername) => dispatch({ type: 'UPSERT_CONV', payload: { peerUsername: dmKey(peerUsername), kind: 'dm', rawId: peerUsername, title: peerUsername, unread: 0, lastPreview: '', lastAt: '' } }), []);
  const openChatWithPeer = useCallback((peerUsername) => {
    const key = dmKey(peerUsername);
    ensurePeer(peerUsername);
    selectPeer(key);
    loadHistory(key);
  }, [ensurePeer, selectPeer, loadHistory]);

  const createGroupChat = useCallback(async (name, memberUsernames = []) => {
    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      throw new Error('Tên nhóm không được để trống');
    }
    const uniqueMembers = Array.from(
      new Set(
        memberUsernames
          .map((u) => String(u || '').trim())
          .filter((u) => u.length > 0 && u !== username)
      )
    );
    const group = await createGroup(token, trimmedName, uniqueMembers);
    const key = groupKey(group.groupId);
    dispatch({
      type: 'UPSERT_CONV',
      payload: {
        peerUsername: key,
        kind: 'group',
        rawId: group.groupId,
        title: group.name || trimmedName,
        lastPreview: '',
        lastAt: new Date().toISOString(),
        unread: 0,
        memberCount: group.memberCount || (uniqueMembers.length + 1),
      },
    });
    dispatch({ type: 'SELECT', payload: key });
    return key;
  }, [token, username]);

  const renameGroupChat = useCallback(
    async (groupId, name) => {
      const g = await renameGroup(token, groupId, name);
      const key = groupKey(groupId);
      dispatch({
        type: 'UPSERT_CONV',
        payload: {
          peerUsername: key,
          kind: 'group',
          rawId: groupId,
          title: g.name,
          memberCount: g.memberCount,
        },
      });
      return g;
    },
    [token],
  );

  const addGroupMembersToGroup = useCallback(
    async (groupId, memberUsernames) => {
      const g = await addGroupMembers(token, groupId, memberUsernames);
      const key = groupKey(groupId);
      dispatch({
        type: 'UPSERT_CONV',
        payload: {
          peerUsername: key,
          kind: 'group',
          rawId: groupId,
          title: g.name,
          memberCount: g.memberCount,
        },
      });
      return g;
    },
    [token],
  );

  const leaveGroupChat = useCallback(
    async (groupId) => {
      await leaveGroup(token, groupId);
      const key = groupKey(groupId);
      dispatch({ type: 'REMOVE_PEER', payload: { key } });
      await loadConversations();
    },
    [token, loadConversations],
  );

  const deleteGroupChat = useCallback(
    async (groupId) => {
      await deleteGroup(token, groupId);
      const key = groupKey(groupId);
      dispatch({ type: 'REMOVE_PEER', payload: { key } });
      await loadConversations();
    },
    [token, loadConversations],
  );

  const sendMessage = useCallback((key, content) => {
    if (!key || !content?.trim()) return;
    const id = newClientMessageId();
    const sentAt = new Date().toISOString();
    dispatch({ type: 'APPEND', payload: { key, message: { id, content, sentAt, direction: 'out', status: 'sending', readBy: [] } } });
    dispatch({ type: 'UPSERT_CONV', payload: { ...(state.peers[key] || {}), peerUsername: key, lastPreview: content.slice(0, 80), lastAt: sentAt } });
    const client = clientRef.current;
    if (!client?.connected) {
      dispatch({ type: 'FAIL', payload: { key, id } });
      dispatch({ type: 'WS_BANNER', payload: 'WebSocket is not connected' });
      return;
    }
    if (String(key).startsWith('group:')) {
      client.publish({ destination: '/app/dm/send', headers: { 'content-type': 'application/json;charset=UTF-8' }, body: JSON.stringify({ groupId: Number(String(key).slice(6)), content, messageType: 0, clientMessageId: id }) });
    } else {
      client.publish({ destination: '/app/dm/send', headers: { 'content-type': 'application/json;charset=UTF-8' }, body: JSON.stringify({ peerUsername: String(key).slice(3), content, messageType: 0, clientMessageId: id }) });
    }
  }, [clientRef, state.peers]);

  const value = useMemo(() => ({
    ...state,
    peerList: Object.values(state.peers).sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || ''))),
    activeMessages: state.activePeerUsername ? (state.messages[state.activePeerUsername] || []) : [],
    loadHistory,
    loadConversations,
    selectPeer,
    ensurePeer,
    openChatWithPeer,
    createGroupChat,
    renameGroupChat,
    addGroupMembersToGroup,
    leaveGroupChat,
    deleteGroupChat,
    sendMessage,
    connected,
    lastError,
    clearWsBanner: () => dispatch({ type: 'WS_BANNER', payload: null }),
  }), [
    state,
    loadHistory,
    loadConversations,
    selectPeer,
    ensurePeer,
    openChatWithPeer,
    createGroupChat,
    renameGroupChat,
    addGroupMembersToGroup,
    leaveGroupChat,
    deleteGroupChat,
    sendMessage,
    connected,
    lastError,
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
