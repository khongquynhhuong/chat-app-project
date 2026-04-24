import { useState } from 'react';
import {
  LogOut,
  Moon,
  Monitor,
  Search,
  Sun,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

export function ChatSidebar({
  user,
  peerList,
  activePeerUsername,
  onSelectPeer,
  onOpenNewChat,
  onLogout,
  wsBanner,
  onDismissBanner,
}) {
  const { theme, setTheme } = useTheme();
  const [searchText, setSearchText] = useState('');

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

  const openFromSearch = () => {
    const username = searchText.trim();
    if (!username) return;
    onOpenNewChat(username);
    setSearchText('');
  };

  const filteredPeers = peerList.filter((p) => {
    const q = searchText.trim().toLowerCase();
    if (!q) return true;
    return p.peerUsername.toLowerCase().includes(q);
  });

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
        <label htmlFor="peer-search" className="sr-only">
          Tìm hoặc mở chat theo username
        </label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tg-muted"
            aria-hidden
          />
          <input
            id="peer-search"
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                openFromSearch();
              }
            }}
            placeholder="Tìm kiếm"
            className="w-full rounded-lg border border-tg-border bg-tg-panel py-2 pl-9 pr-3 text-sm text-tg-text placeholder:text-tg-muted focus:border-tg-accent focus:outline-none focus:ring-2 focus:ring-tg-accent/25"
            aria-label="Tìm kiếm người dùng"
          />
        </div>
      </div>

      <nav
        className="flex-1 overflow-y-auto"
        aria-label="Danh sách trò chuyện"
      >
        {filteredPeers.length === 0 ? (
          <p className="p-4 text-center text-sm text-tg-muted">
            {searchText.trim()
              ? ''
              : 'Chưa có cuộc trò chuyện. Nhập username để bắt đầu.'}
          </p>
        ) : (
          <ul className="divide-y divide-tg-border/50">
            {filteredPeers.map((p) => {
              const active = activePeerUsername === p.peerUsername;
              return (
                <li key={p.peerUsername}>
                  <button
                    type="button"
                    onClick={() => onSelectPeer(p.peerUsername)}
                    className={`flex w-full cursor-pointer items-start gap-3 px-3 py-3 text-left transition-colors duration-200 hover:bg-tg-border/30 ${
                      active ? 'bg-tg-accent/10' : ''
                    }`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tg-accent/15 text-sm font-semibold text-tg-accent">
                      {String(p.peerUsername).slice(0, 2).toUpperCase()}
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
