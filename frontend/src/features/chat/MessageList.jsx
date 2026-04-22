import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble.jsx';

export function MessageList({ messages, peerLabel }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, peerLabel]);

  if (!messages.length) {
    return (
      <div
        ref={containerRef}
        className="flex flex-1 flex-col items-center justify-center gap-2 bg-tg-bg px-4 py-8 text-center"
        role="log"
        aria-label={`Tin nhắn với ${peerLabel}`}
      >
        <p className="text-sm text-tg-muted">
          Chưa có tin nhắn. Gửi tin đầu tiên bên dưới.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-1 flex-col gap-2 overflow-y-auto bg-tg-bg px-3 py-3 md:px-6"
      role="log"
      aria-live="polite"
      aria-label={`Tin nhắn với ${peerLabel}`}
    >
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
