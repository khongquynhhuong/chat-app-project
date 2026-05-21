import { useEffect, useRef, useState, useCallback } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

/**
 * STOMP client for the logged-in session. Returns ref for publish + connection flags for UI.
 */
export function useStompChat(token, {
  onConnected,
  onIncoming,
  onSentAck,
  onGroupIncoming,
  onGroupSentAck,
  onGroupDeleted,
  onWsError,
  onSystem,
}) {
  const clientRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState(null);
  const handlersRef = useRef({
    onConnected,
    onIncoming,
    onSentAck,
    onGroupIncoming,
    onGroupSentAck,
    onGroupDeleted,
    onWsError,
    onSystem,
  });
  handlersRef.current = {
    onConnected,
    onIncoming,
    onSentAck,
    onGroupIncoming,
    onGroupSentAck,
    onGroupDeleted,
    onWsError,
    onSystem,
  };

  const clearError = useCallback(() => setLastError(null), []);

  useEffect(() => {
    if (!token) {
      clientRef.current = null;
      setConnected(false);
      return undefined;
    }

    const client = new Client({
      webSocketFactory: () =>
        new SockJS(`${window.location.origin}/ws?token=${encodeURIComponent(token)}`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 0,
      heartbeatOutgoing: 20000,
      onConnect: () => {
        setConnected(true);
        setLastError(null);
        handlersRef.current.onConnected?.();
        client.subscribe('/user/queue/dm', (message) => {
          try {
            const parsed = JSON.parse(message.body);
            if (parsed.groupId) {
              handlersRef.current.onGroupIncoming?.(parsed);
            } else {
              handlersRef.current.onIncoming?.(parsed);
            }
          } catch {
            handlersRef.current.onIncoming?.({ raw: message.body });
          }
        });
        client.subscribe('/user/queue/dm.sent', (message) => {
          try {
            const parsed = JSON.parse(message.body);
            if (parsed.groupId) {
              handlersRef.current.onGroupSentAck?.(parsed);
            } else {
              handlersRef.current.onSentAck?.(parsed);
            }
          } catch {
            handlersRef.current.onSentAck?.({ raw: message.body });
          }
        });
        client.subscribe('/user/queue/group.deleted', (message) => {
          try {
            handlersRef.current.onGroupDeleted?.(JSON.parse(message.body));
          } catch {
            handlersRef.current.onGroupDeleted?.({ raw: message.body });
          }
        });
        client.subscribe('/user/queue/errors', (message) => {
          try {
            handlersRef.current.onWsError?.(JSON.parse(message.body));
          } catch {
            handlersRef.current.onWsError?.({ raw: message.body });
          }
        });
      },
      onStompError: (frame) => {
        const err = frame.headers.message || frame.body;
        setLastError(typeof err === 'string' ? err : 'STOMP error');
        handlersRef.current.onWsError?.({
          error: err,
        });
      },
      onWebSocketClose: () => {
        setConnected(false);
        handlersRef.current.onSystem?.('WebSocket đã đóng');
      },
      debug: () => {},
    });

    clientRef.current = client;
    client.activate();

    return () => {
      clientRef.current = null;
      setConnected(false);
      client.deactivate();
    };
  }, [token]);

  return { clientRef, connected, lastError, clearError };
}
