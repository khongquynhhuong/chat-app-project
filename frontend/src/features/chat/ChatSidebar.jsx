import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { searchUsers } from '../../services/chatRepository.js';
import {
  Bookmark,
  BookUser,
  ChevronDown,
  Cog,
  LogOut,
  Menu,
  Moon,
  Monitor,
  Phone,
  Search,
  Settings,
  Sun,
  User,
  Users,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { CreateGroupModal } from './CreateGroupModal.jsx';

function userInitials(username) {
  const s = String(username || '').trim();
  if (!s) return '??';
  return s.slice(0, 2).toUpperCase();
}

export function ChatSidebar({
  user,
  peerList,
  activePeerUsername,
  onSelectPeer,
  onOpenNewChat,
  onCreateGroup,
  onLogout,
  wsBanner,
  onDismissBanner,
}) {
  const { theme, resolved, setTheme } = useTheme();
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [globalUsers, setGlobalUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    const q = searchText.trim();
    if (!q) {
      setGlobalUsers([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      const token = sessionStorage.getItem('chat_access_token');
      searchUsers(token, q)
        .then((data) => {
          setGlobalUsers(data);
          setIsSearching(false);
        })
        .catch((err) => {
          console.error(err);
          setIsSearching(false);
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (!navDrawerOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setNavDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navDrawerOpen]);

  useEffect(() => {
    if (!navDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navDrawerOpen]);

  const closeNavDrawer = useCallback(() => setNavDrawerOpen(false), []);

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



  const filteredPeers = peerList.filter((p) => {
    const q = searchText.trim().toLowerCase();
    if (!q) return true;
    return (
      String(p.title || '').toLowerCase().includes(q) ||
      String(p.rawId || '').toLowerCase().includes(q)
    );
  });

  const initials = userInitials(user.username);
  const nightModeOn = resolved === 'dark';

  const navDrawer =
    typeof document !== 'undefined'
      ? createPortal(
          <>
            <div
              className={`fixed inset-0 z-[100] bg-black/30 transition-opacity duration-300 ease-out ${
                navDrawerOpen
                  ? 'pointer-events-auto opacity-100'
                  : 'pointer-events-none opacity-0'
              }`}
              onClick={closeNavDrawer}
              aria-hidden={!navDrawerOpen}
            />
            <aside
              id="app-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-hidden={!navDrawerOpen}
              className={`fixed left-0 top-0 z-[101] flex h-[100dvh] max-h-screen w-[min(90vw,max(14rem,min(28vw,30vw)))] flex-col bg-white shadow-[4px_0_24px_rgba(15,23,42,0.08)] transition-transform duration-300 ease-out ${
                navDrawerOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <div className="shrink-0 border-b border-gray-100 px-4 pb-4 pt-5">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-white text-sm font-semibold text-blue-600"
                    aria-hidden
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-gray-900">
                          {user.username}
                        </p>
                        <p className="mt-0.5 text-sm text-gray-400">
                          Set Emoji Status
                        </p>
                      </div>
                      <ChevronDown
                        className="mt-1 h-4 w-4 shrink-0 text-gray-300"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </div>
                  </div>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto py-2" aria-label="Menu chính">
                <button
                  type="button"
                  onClick={() => {
                    closeNavDrawer();
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50"
                >
                  <User className="h-5 w-5 shrink-0 text-gray-500" strokeWidth={1.75} />
                  My Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeNavDrawer();
                    setShowCreateGroup(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50"
                >
                  <Users className="h-5 w-5 shrink-0 text-gray-500" strokeWidth={1.75} />
                  New Group
                </button>
                <button
                  type="button"
                  onClick={closeNavDrawer}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50"
                >
                  <Cog className="h-5 w-5 shrink-0 text-gray-500" strokeWidth={1.75} />
                  New Channel
                </button>
                <button
                  type="button"
                  onClick={closeNavDrawer}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50"
                >
                  <BookUser className="h-5 w-5 shrink-0 text-gray-500" strokeWidth={1.75} />
                  Contacts
                </button>
                <button
                  type="button"
                  onClick={closeNavDrawer}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50"
                >
                  <Phone className="h-5 w-5 shrink-0 text-gray-500" strokeWidth={1.75} />
                  Calls
                </button>
                <button
                  type="button"
                  onClick={closeNavDrawer}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50"
                >
                  <Bookmark className="h-5 w-5 shrink-0 text-gray-500" strokeWidth={1.75} />
                  Saved Messages
                </button>
                <button
                  type="button"
                  onClick={closeNavDrawer}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50"
                >
                  <Settings className="h-5 w-5 shrink-0 text-gray-500" strokeWidth={1.75} />
                  Settings
                </button>
                <div className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-800">
                  <Moon className="h-5 w-5 shrink-0 text-gray-500" strokeWidth={1.75} />
                  <span className="flex-1">Night Mode</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={nightModeOn}
                    onClick={() =>
                      setTheme(nightModeOn ? 'light' : 'dark')
                    }
                    className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${
                      nightModeOn ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 ${
                        nightModeOn ? 'left-[calc(100%-1.375rem)]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </nav>
            </aside>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      {navDrawer}
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
        <button
          type="button"
          onClick={() => setNavDrawerOpen(true)}
          className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-transparent text-gray-400 transition-colors hover:bg-tg-border/40 hover:text-gray-500"
          title="Menu"
          aria-label="Mở menu điều hướng"
          aria-expanded={navDrawerOpen}
          aria-controls="app-nav-drawer"
        >
          <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>
        <div className="relative flex-1">
          <label htmlFor="peer-search" className="sr-only">
            Tìm hoặc mở chat theo username
          </label>
          <input
            id="peer-search"
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Tìm kiếm"
            className="w-full rounded-lg border border-tg-border bg-tg-panel py-2 px-3 pr-3 text-sm text-tg-text placeholder:text-tg-muted focus:border-tg-accent focus:outline-none focus:ring-2 focus:ring-tg-accent/25"
            aria-label="Tìm kiếm người dùng"
          />
        </div>
      </div>

      <CreateGroupModal
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        token={user.token}
        currentUsername={user.username}
        peerList={peerList}
        onCreate={async ({ name, members }) => {
          await onCreateGroup?.({ name, members });
        }}
      />

      <nav
        className="flex-1 overflow-y-auto"
        aria-label="Danh sách trò chuyện"
      >
        {/* Local peers */}
        {filteredPeers.length > 0 && (
          <div className="mb-2">
            {searchText.trim() && (
              <h3 className="px-3 py-1 text-xs font-semibold text-tg-muted uppercase tracking-wider">
                Trò chuyện
              </h3>
            )}
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
                        {p.kind === 'group' ? 'GR' : String(p.title || p.rawId).slice(0, 2).toUpperCase()}
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
          </div>
        )}

        {/* Global users */}
        {searchText.trim() && (
          <div className="mb-2">
            <h3 className="px-3 py-1 text-xs font-semibold text-tg-muted uppercase tracking-wider border-t border-tg-border pt-2 mt-1">
              Tìm kiếm toàn cầu
            </h3>
            {isSearching ? (
              <p className="p-3 text-sm text-tg-muted text-center">Đang tìm kiếm...</p>
            ) : globalUsers.length > 0 ? (
              <ul className="divide-y divide-tg-border/50">
                {globalUsers.map((u) => {
                  // Hide if already in filteredPeers
                  if (filteredPeers.some((p) => p.kind === 'dm' && p.rawId === u.username)) return null;
                  return (
                    <li key={u.userId}>
                      <button
                        type="button"
                        onClick={() => {
                          onOpenNewChat(u.username);
                          setSearchText('');
                        }}
                        className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left transition-colors duration-200 hover:bg-tg-border/30"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-semibold text-indigo-500">
                          {String(u.username).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="truncate font-medium text-tg-text">
                            {u.username}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="p-3 text-sm text-tg-muted text-center">Không tìm thấy ai</p>
            )}
          </div>
        )}

        {!searchText.trim() && filteredPeers.length === 0 && (
           <p className="p-4 text-center text-sm text-tg-muted">
             Chưa có cuộc trò chuyện. Tìm kiếm username để bắt đầu.
           </p>
        )}
      </nav>
    </aside>
    </>
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
