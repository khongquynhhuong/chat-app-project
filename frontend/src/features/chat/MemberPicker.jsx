import { useEffect, useState } from 'react';
import { Search, Check } from 'lucide-react';
import { searchUsers } from '../../services/chatRepository.js';
import { MAX_GROUP_MEMBERS } from './groupConstants.js';

/**
 * @param {object} props
 * @param {string} props.token
 * @param {import('../../domain/chat.js').ConversationPreview[]} props.peerList
 * @param {string} props.currentUsername
 * @param {string[]} props.selectedUsernames
 * @param {string[]} [props.excludeUsernames]
 * @param {number} [props.maxSelectable]
 * @param {(username: string) => void} props.onToggleUsername
 * @param {string} props.searchQuery
 * @param {(q: string) => void} props.onSearchChange
 */
export function MemberPicker({
  token,
  peerList,
  currentUsername,
  selectedUsernames,
  onToggleUsername,
  searchQuery,
  onSearchChange,
  excludeUsernames = [],
  maxSelectable = MAX_GROUP_MEMBERS - 1,
}) {
  const [globalUsers, setGlobalUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const excludeSet = new Set(
    [currentUsername, ...excludeUsernames].map((u) => String(u || '').trim()).filter(Boolean),
  );

  const selectedSet = new Set(selectedUsernames);
  const q = searchQuery.trim().toLowerCase();

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setGlobalUsers([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const t = setTimeout(() => {
      searchUsers(token, query)
        .then((data) => {
          setGlobalUsers(data);
          setIsSearching(false);
        })
        .catch(() => setIsSearching(false));
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, token]);

  const dmPeers = peerList.filter(
    (p) => p.kind === 'dm' && !excludeSet.has(String(p.rawId || '').trim()),
  );
  const localFiltered = !q
    ? dmPeers
    : dmPeers.filter(
        (p) =>
          String(p.title || '')
            .toLowerCase()
            .includes(q) ||
          String(p.rawId || '')
            .toLowerCase()
            .includes(q),
      );

  const globalFiltered = globalUsers.filter(
    (u) =>
      !excludeSet.has(u.username) &&
      !dmPeers.some((p) => p.rawId === u.username),
  );

  const atCapacity = selectedUsernames.length >= maxSelectable;

  function row(username, label, sub) {
    const selected = selectedSet.has(username);
    return (
      <button
        key={username}
        type="button"
        disabled={atCapacity && !selected}
        onClick={() => onToggleUsername(username)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-semibold text-blue-600">
          {String(label || username).slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{label || username}</p>
          {sub ? <p className="truncate text-xs text-gray-400">{sub}</p> : null}
        </div>
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200'
          }`}
        >
          {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
        </span>
      </button>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative shrink-0 border-b border-gray-100 px-4 py-2">
        <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          aria-label="Tìm thành viên"
        />
      </div>
      <div className="min-h-[12rem] flex-1 overflow-y-auto">
        {localFiltered.length > 0 && (
          <div>
            <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Trò chuyện
            </p>
            <ul>{localFiltered.map((p) => row(p.rawId, p.title, `@${p.rawId}`))}</ul>
          </div>
        )}
        {searchQuery.trim() && (
          <div className={localFiltered.length > 0 ? 'border-t border-gray-100' : ''}>
            <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Tìm trên hệ thống
            </p>
            {isSearching ? (
              <p className="py-8 text-center text-sm text-gray-400">Đang tìm...</p>
            ) : globalFiltered.length > 0 ? (
              <ul>{globalFiltered.map((u) => row(u.username, u.username, null))}</ul>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">No users found.</p>
            )}
          </div>
        )}
        {!searchQuery.trim() && localFiltered.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">Chưa có cuộc trò chuyện để thêm.</p>
        )}
      </div>
    </div>
  );
}
