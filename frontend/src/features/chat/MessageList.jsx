import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble.jsx';
import { useChat } from '../../context/ChatContext.jsx';

export function MessageList({ messages, peerLabel }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const sentinelRef = useRef(null); // Ref cho phần tử quan sát ở trên cùng

  const isFetchingOlder = useRef(false);
  const prevScrollHeightRef = useRef(null);

  const { activePeerUsername, historyByPeer, loadHistory } = useChat();

  // Xử lý cuộn xuống cuối khi có tin nhắn mới / đổi hội thoại
  useEffect(() => {
    if (isFetchingOlder.current && containerRef.current && prevScrollHeightRef.current) {
      const newScrollHeight = containerRef.current.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
      containerRef.current.scrollTop += scrollDiff;

      prevScrollHeightRef.current = null;
      isFetchingOlder.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, peerLabel]);

  // --- CƠ CHẾ INFINITE SCROLL (Cuộn lên tự động load) ---
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          // Nếu phần tử quan sát hiển thị trên màn hình VÀ có dữ liệu cũ hơn để tải
          if (entry.isIntersecting && historyState?.hasMore && !historyState?.loadingMore) {

            if (containerRef.current) {
              prevScrollHeightRef.current = containerRef.current.scrollHeight;
            }

            isFetchingOlder.current = true;
            loadHistory(activePeerUsername, { more: true });
          }
        },
        {
          root: containerRef.current, // Dựa vào khung nhìn của danh sách chat
          rootMargin: '100px',        // Kích hoạt sớm hơn 100px trước khi chạm đỉnh
          threshold: 0.1,
        }
    );

    observer.observe(sentinel);
    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [activePeerUsername, historyByPeer, loadHistory]);
  // -----------------------------------------------------

  const historyState = historyByPeer && activePeerUsername
      ? historyByPeer[activePeerUsername]
      : { loadingMore: false, hasMore: false, error: null, loading: false };

  if (!messages || messages.length === 0) {
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
        {/* Phần tử quan sát (Sentinel) nằm ở trên cùng */}
        <div ref={sentinelRef} className="flex justify-center h-4 my-2">
          {historyState?.loadingMore && (
              <span className="text-xs text-tg-muted">Đang tải tin nhắn cũ...</span>
          )}
        </div>

        {historyState?.error && (
            <div className="text-red-500 text-center py-1 text-xs">
              {historyState.error}
            </div>
        )}

        {historyState.loading && messages.length === 0 && (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner text-primary"></span>
            </div>
        )}

        {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
        ))}

        <div ref={bottomRef} />
      </div>
  );
}