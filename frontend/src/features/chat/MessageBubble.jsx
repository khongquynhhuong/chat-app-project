import { AlertCircle, Check, Loader2 } from 'lucide-react';

export function MessageBubble({ message }) {
  const isOut = message.direction === 'out';
  const failed = message.status === 'failed';
  const sending = message.status === 'sending';

  return (
    <div
      className={`flex w-full ${isOut ? 'justify-end' : 'justify-start'} mb-1`}
    >
      {!isOut && message.senderUsername && (
        <div
          className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white shadow-sm mt-auto"
          title={message.senderUsername}
        >
          {message.senderUsername.charAt(0).toUpperCase()}
        </div>
      )}
      <div className={`flex max-w-[min(100%,28rem)] flex-col`}>
        {!isOut && message.senderUsername && (
          <span className="mb-0.5 ml-1 text-xs font-medium text-gray-500">
            {message.senderUsername}
          </span>
        )}
        <div
          className={`rounded-2xl px-3 py-2 shadow-bubble transition-colors duration-200 ${
          isOut
            ? 'rounded-br-md bg-tg-bubble-out text-tg-text'
            : 'rounded-bl-md bg-tg-bubble-in text-tg-text ring-1 ring-tg-border/60'
        } ${failed ? 'opacity-80 ring-1 ring-red-400/50' : ''}`}
      >
        <p className="whitespace-pre-wrap break-words text-[0.9375rem] leading-snug">
          {message.content}
        </p>
        <div className="mt-1 flex items-center justify-end gap-2 text-[0.6875rem] text-tg-muted">
          <time dateTime={message.sentAt}>
            {formatTime(message.sentAt)}
          </time>
          {isOut && (
            <span className="inline-flex items-center" title={message.status}>
              {failed ? (
                <AlertCircle className="h-3.5 w-3.5 text-red-500" aria-label="Lỗi gửi" />
              ) : sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-tg-muted" aria-label="Đang gửi" />
              ) : (
                <Check className="h-3.5 w-3.5 text-tg-accent" aria-label="Đã gửi" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
);
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
