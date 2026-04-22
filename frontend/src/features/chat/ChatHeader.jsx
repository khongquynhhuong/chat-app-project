import { ArrowLeft, User } from 'lucide-react';
import { ConnectionBadge } from './ConnectionBadge.jsx';

export function ChatHeader({
  title,
  subtitle,
  connected,
  lastError,
  showBack,
  onBack,
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-tg-border bg-tg-panel px-3 md:px-4">
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-tg-muted transition-colors hover:bg-tg-sidebar hover:text-tg-text md:hidden"
          aria-label="Quay lại danh sách"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tg-accent/20 text-tg-accent"
        aria-hidden
      >
        <User className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold text-tg-text">{title}</h2>
        {subtitle && (
          <p className="truncate text-xs text-tg-muted">{subtitle}</p>
        )}
      </div>
      <ConnectionBadge connected={connected} lastError={lastError} />
    </header>
  );
}
