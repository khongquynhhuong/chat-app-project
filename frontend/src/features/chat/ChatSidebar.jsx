import { useState } from 'react';
import {
  LogOut,
  MessageCirclePlus,
  Moon,
  Monitor,
  Search,
  Sun,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

export function ChatSidebar({
  user,
  peerList,
  activePeerId,
  onSelectPeer,
  onOpenNewChat,
  onLogout,
  wsBanner,
  onDismissBanner,
}) {
  const { theme, setTheme } = useTheme();
  const [newPeerId, setNewPeerId] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const cycleTheme = () => {
    const order = ['system', 'light', 'dark'];
    const i = order.indexOf(theme);
    setTheme(order[(i + 1) % order.length]);
  };

  const themeIcon =
    theme === 'dark' ? (
      <Moon className="h-5 w-5" />
    ) : theme === 'light' ? (
      <Sun className="h-5 w-5" />
    ) : (
      <Monitor className="h-5 w-5" />
    );

  const openNew = () => {
    const id = Number(newPeerId);
    if (!Number.isFinite(id) || id < 1) return;
    onOpenNewChat(id);
    setNewPeerId('');
    setShowAdd(false);
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-tg-border bg-tg-sidebar md:w-80 md:min-w-[18rem]">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-tg-border px-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-tg-text">
            {user.username}
          </p>
          <p className="truncate text-xs text-tg-muted">ID {user.userId}</p>
        </div>
        <button
          type="button"
          onClick={cycleTheme}
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-tg-muted transition-colors hover:bg-tg-border/40 hover:text-tg-text"
          title={`Giao diện: ${theme}`}
          aria-label="Đổi chế độ sáng tối"
        >
          {themeIcon}
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-tg-muted transition-colors hover:bg-tg-border/40 hover:text-tg-text"
          aria-label="Đăng xuất"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {wsBanner && (
        <div className="flex items-start gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          <span className="flex-1">{wsBanner}</span>
          <button
            type="button"
            onClick={onDismissBanner}
            className="cursor-pointer shrink-0 rounded px-1 text-tg-muted hover:text-tg-text"
          >
            Đóng
          </button>
        </div>
      )}

      <div className="flex shrink-0 items-center gap-2 border-b border-tg-border p-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tg-muted"
            aria-hidden
          />
          <input
            type="search"
            readOnly
            placeholder="Tìm kiếm"
            className="w-full cursor-not-allowed rounded-lg border border-tg-border bg-tg-panel py-2 pl-9 pr-3 text-sm text-tg-muted"
            aria-label="Tìm kiếm"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-tg-accent text-white transition-colors hover:bg-tg-accent-hover"
          aria-label="Thêm cuộc trò chuyện"
          title="Chat mới theo userId"
        >
          <MessageCirclePlus className="h-5 w-5" />
        </button>
      </div>

      {showAdd && (
        <div className="flex shrink-0 gap-2 border-b border-tg-border p-2">
          <label htmlFor="new-peer-id" className="sr-only">
            ID người nhận
          </label>
          <input
            id="new-peer-id"
            type="number"
            min={1}
            value={newPeerId}
            onChange={(e) => setNewPeerId(e.target.value)}
            placeholder="Peer userId"
            className="min-w-0 flex-1 rounded-lg border border-tg-border bg-tg-panel px-3 py-2 text-sm text-tg-text focus:border-tg-accent focus:outline-none focus:ring-2 focus:ring-tg-accent/25"
          />
          <button
            type="button"
            onClick={openNew}
            className="cursor-pointer rounded-lg bg-tg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-tg-accent-hover"
          >
            Mở
          </button>
        </div>
      )}

      <nav
        className="flex-1 overflow-y-auto"
        aria-label="Danh sách trò chuyện"
      >
        {peerList.length === 0 ? (
          <p className="p-4 text-center text-sm text-tg-muted">
            Chưa có cuộc trò chuyện. Nhấn + và nhập userId để bắt đầu.
          </p>
        ) : (
          <ul className="divide-y divide-tg-border/50">
            {peerList.map((p) => {
              const active = activePeerId === p.peerUserId;
              return (
                <li key={p.peerUserId}>
                  <button
                    type="button"
                    onClick={() => onSelectPeer(p.peerUserId)}
                    className={`flex w-full cursor-pointer items-start gap-3 px-3 py-3 text-left transition-colors duration-200 hover:bg-tg-border/30 ${
                      active ? 'bg-tg-accent/10' : ''
                    }`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tg-accent/15 text-sm font-semibold text-tg-accent">
                      {String(p.peerUserId).slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-medium text-tg-text">
                          {p.title}
                        </span>
                        {p.lastAt && (
                          <span className="shrink-0 text-[0.65rem] text-tg-muted">
                            {formatShortTime(p.lastAt)}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-sm text-tg-muted">
                        {p.lastPreview || '—'}
                      </p>
                    </div>
                    {p.unread > 0 && (
                      <span className="mt-1 flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-tg-accent px-1 text-[0.65rem] font-bold text-white">
                        {p.unread > 99 ? '99+' : p.unread}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}

function formatShortTime(iso) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
