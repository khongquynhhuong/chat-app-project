import { useCallback, useState } from 'react';
import { Send } from 'lucide-react';

export function Composer({ peerUserId, disabled, onSend }) {
  const [text, setText] = useState('');

  const submit = useCallback(() => {
    const t = text.trim();
    if (!t || !peerUserId || disabled) return;
    onSend(peerUserId, t);
    setText('');
  }, [text, peerUserId, disabled, onSend]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-tg-border bg-tg-panel px-3 py-2 md:px-4">
      <div className="mx-auto flex max-w-5xl items-end gap-2">
        <label htmlFor="composer-input" className="sr-only">
          Nội dung tin nhắn
        </label>
        <textarea
          id="composer-input"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled || !peerUserId}
          placeholder={
            peerUserId ? 'Nhập tin nhắn…' : 'Chọn cuộc trò chuyện hoặc thêm chat'
          }
          className="max-h-32 min-h-[2.75rem] flex-1 resize-y rounded-2xl border border-tg-border bg-tg-sidebar px-4 py-2.5 text-sm text-tg-text placeholder:text-tg-muted/80 focus:border-tg-accent focus:outline-none focus:ring-2 focus:ring-tg-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !peerUserId || !text.trim()}
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-tg-accent text-white transition-colors duration-200 hover:bg-tg-accent-hover focus:outline-none focus:ring-2 focus:ring-tg-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Gửi tin nhắn"
        >
          <Send className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
