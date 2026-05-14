import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  BellOff,
  LogOut,
  SlidersHorizontal,
  UserPlus,
  Trash2,
  X,
} from 'lucide-react';
import { fetchGroupInfo } from '../../services/chatRepository.js';
import { MemberPicker } from './MemberPicker.jsx';
import { MAX_GROUP_MEMBERS } from './groupConstants.js';

const MUTE_STORAGE_KEY = 'chat_muted_group_ids';

function readMutedIds() {
  try {
    const raw = localStorage.getItem(MUTE_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(Number) : []);
  } catch {
    return new Set();
  }
}

function writeMutedIds(set) {
  localStorage.setItem(MUTE_STORAGE_KEY, JSON.stringify([...set]));
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {number | null} props.groupId
 * @param {string} props.token
 * @param {string} props.currentUsername
 * @param {string} props.fallbackTitle
 * @param {import('../../domain/chat.js').ConversationPreview[]} props.peerList
 * @param {(id: number) => Promise<void>} props.onLeaveGroup
 * @param {(id: number, name: string) => Promise<void>} props.onRenameGroup
 * @param {(id: number, members: string[]) => Promise<void>} props.onAddMembers
 */
export function GroupInfoDrawer({
  open,
  onClose,
  groupId,
  token,
  currentUsername,
  fallbackTitle,
  peerList,
  onLeaveGroup,
  onDeleteGroup,
  onRenameGroup,
  onAddMembers,
}) {
  const [info, setInfo] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [muted, setMuted] = useState(() => readMutedIds());
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageName, setManageName] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addSelected, setAddSelected] = useState([]);
  const [addSearch, setAddSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (groupId == null) return;
    setLoadError(null);
    try {
      const g = await fetchGroupInfo(token, groupId);
      setInfo(g);
    } catch (e) {
      setLoadError(e.message || 'Lỗi tải nhóm');
      setInfo(null);
    }
  }, [token, groupId]);

  useEffect(() => {
    if (!open || groupId == null) return;
    load();
  }, [open, groupId, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const toggleMute = () => {
    if (groupId == null) return;
    const next = readMutedIds();
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    writeMutedIds(next);
    setMuted(new Set(next));
  };

  const isOwner = info?.ownerUsername === currentUsername;
  const isMuted = groupId != null && muted.has(groupId);
  const displayTitle = info?.name || fallbackTitle || 'Nhóm';
  const initials = String(displayTitle).slice(0, 2).toUpperCase();

  const openManage = () => {
    setManageName(info?.name || '');
    setManageOpen(true);
  };

  const submitManage = async () => {
    if (!groupId || !manageName.trim()) return;
    setSaving(true);
    try {
      await onRenameGroup(groupId, manageName.trim());
      setManageOpen(false);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleAddMember = (username) => {
    if (info?.members?.includes(username)) return;
    setAddSelected((prev) => {
      if (prev.includes(username)) return prev.filter((x) => x !== username);
      const cap = MAX_GROUP_MEMBERS - (info?.members?.length || 0);
      if (prev.length >= Math.max(0, cap)) return prev;
      return [...prev, username];
    });
  };

  const submitAddMembers = async () => {
    if (!groupId || addSelected.length === 0) return;
    setSaving(true);
    try {
      await onAddMembers(groupId, addSelected);
      setAddOpen(false);
      setAddSelected([]);
      setAddSearch('');
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const confirmLeave = async () => {
    if (!groupId) return;
    setSaving(true);
    try {
      await onLeaveGroup(groupId);
      setLeaveConfirm(false);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!groupId) return;
    setSaving(true);
    try {
      await onDeleteGroup(groupId);
      setDeleteConfirm(false);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!open || typeof document === 'undefined' || groupId == null) return null;

  const drawer = (
    <>
      <div
        className="fixed inset-0 z-[105] bg-black/35 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 z-[106] flex h-[100dvh] max-h-screen w-[min(90vw,max(16rem,min(30vw,28vw)))] flex-col bg-white shadow-[-4px_0_24px_rgba(15,23,42,0.08)] transition-transform duration-300 ease-out"
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết nhóm"
      >
        <div className="flex shrink-0 justify-end border-b border-gray-100 px-2 py-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="shrink-0 px-4 pb-4 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-violet-500 text-2xl font-semibold text-white">
            {initials}
          </div>
          <h2 className="mt-3 text-lg font-bold text-gray-900">{displayTitle}</h2>
          <p className="text-sm text-gray-500">
            {info ? `${info.memberCount} members` : '…'}
          </p>
          {loadError ? <p className="mt-2 text-xs text-red-500">{loadError}</p> : null}
        </div>

        <div className="flex shrink-0 justify-center gap-2 px-3 pb-4">
          <button
            type="button"
            onClick={toggleMute}
            className="flex min-w-[4.5rem] flex-col items-center gap-1 rounded-xl bg-gray-100 px-2 py-2 text-[11px] font-medium text-gray-700 hover:bg-gray-200"
          >
            {isMuted ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
            Mute
          </button>
          <button
            type="button"
            disabled={!isOwner}
            onClick={openManage}
            title={!isOwner ? 'Chỉ chủ nhóm' : ''}
            className="flex min-w-[4.5rem] flex-col items-center gap-1 rounded-xl bg-gray-100 px-2 py-2 text-[11px] font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SlidersHorizontal className="h-5 w-5" />
            Manage
          </button>
          <button
            type="button"
            disabled={isOwner}
            title={isOwner ? 'Chủ nhóm không thể rời nhóm' : ''}
            onClick={() => setLeaveConfirm(true)}
            className="flex min-w-[4.5rem] flex-col items-center gap-1 rounded-xl bg-gray-100 px-2 py-2 text-[11px] font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LogOut className="h-5 w-5" />
            Leave
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="flex min-w-[4.5rem] flex-col items-center gap-1 rounded-xl bg-red-50 px-2 py-2 text-[11px] font-medium text-red-600 hover:bg-red-100"
            >
              <Trash2 className="h-5 w-5" />
              Delete
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 border-t border-gray-100">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <span>{info?.memberCount ?? '—'} members</span>
            </div>
            {isOwner ? (
              <button
                type="button"
                onClick={() => {
                  setAddSelected([]);
                  setAddSearch('');
                  setAddOpen(true);
                }}
                className="rounded-full p-1.5 text-gray-600 hover:bg-gray-100"
                aria-label="Thêm thành viên"
              >
                <UserPlus className="h-5 w-5" />
              </button>
            ) : null}
          </div>
          <ul className="max-h-[40vh] overflow-y-auto border-t border-gray-50">
            {(info?.members || []).map((uname) => (
              <li
                key={uname}
                className="flex items-center gap-3 border-b border-gray-50 px-3 py-2.5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-semibold text-blue-600">
                  {uname.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{uname}</p>
                  {uname === info?.ownerUsername ? (
                    <span className="mt-0.5 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                      owner
                    </span>
                  ) : (
                    <p className="text-xs text-gray-400">member</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );

  const manageModal =
    manageOpen && info
      ? createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setManageOpen(false)} />
            <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900">Quản lý nhóm</h3>
              <p className="mt-1 text-xs text-gray-500">Đổi tên nhóm (ảnh đại diện sẽ bổ sung sau)</p>
              <label className="mt-4 block text-xs font-medium text-gray-500" htmlFor="manage-name">
                Tên nhóm
              </label>
              <input
                id="manage-name"
                type="text"
                value={manageName}
                onChange={(e) => setManageName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <div className="mt-6 flex justify-end gap-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setManageOpen(false)}
                  className="text-sm font-medium text-blue-500"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={saving || !manageName.trim()}
                  onClick={submitManage}
                  className="text-sm font-medium text-blue-500 disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const addModal =
    addOpen
      ? createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setAddOpen(false)} />
            <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className="flex items-baseline justify-between border-b border-gray-100 px-4 py-3">
                <h3 className="text-lg font-semibold text-gray-900">Thêm thành viên</h3>
                <span className="text-sm text-gray-400">
                  {addSelected.length} / {Math.max(0, MAX_GROUP_MEMBERS - (info?.members?.length || 0))}
                </span>
              </div>
              <MemberPicker
                token={token}
                peerList={peerList}
                currentUsername={currentUsername}
                selectedUsernames={addSelected}
                onToggleUsername={toggleAddMember}
                searchQuery={addSearch}
                onSearchChange={setAddSearch}
                excludeUsernames={info?.members || []}
                maxSelectable={Math.max(0, MAX_GROUP_MEMBERS - (info?.members?.length || 0))}
              />
              <div className="flex justify-end gap-4 border-t border-gray-100 px-4 py-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setAddOpen(false)}
                  className="text-sm font-medium text-blue-500"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={saving || addSelected.length === 0}
                  onClick={submitAddMembers}
                  className="text-sm font-medium text-blue-500 disabled:opacity-50"
                >
                  {saving ? 'Đang thêm...' : 'Thêm'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const leaveModal =
    leaveConfirm
      ? createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setLeaveConfirm(false)} />
            <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900">Rời nhóm?</h3>
              <p className="mt-2 text-sm text-gray-600">Bạn sẽ không nhận tin nhắn từ nhóm này nữa.</p>
              <div className="mt-6 flex justify-end gap-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setLeaveConfirm(false)}
                  className="text-sm font-medium text-gray-600"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={confirmLeave}
                  className="text-sm font-medium text-red-600"
                >
                  {saving ? 'Đang xử lý...' : 'Rời nhóm'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {createPortal(drawer, document.body)}
      {manageModal}
      {addModal}
      {leaveModal}
      {deleteConfirm && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setDeleteConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Xóa nhóm?</h3>
            <p className="mt-2 text-sm text-gray-600">Hành động này không thể hoàn tác. Tất cả tin nhắn và thành viên sẽ bị xóa vĩnh viễn.</p>
            <div className="mt-6 flex justify-end gap-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setDeleteConfirm(false)}
                className="text-sm font-medium text-gray-600"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={confirmDelete}
                className="text-sm font-medium text-red-600"
              >
                {saving ? 'Đang xóa...' : 'Xóa nhóm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
