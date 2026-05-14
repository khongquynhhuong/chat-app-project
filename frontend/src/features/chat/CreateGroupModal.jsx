import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, MoreVertical } from 'lucide-react';
import { MemberPicker } from './MemberPicker.jsx';
import { MAX_GROUP_MEMBERS } from './groupConstants.js';

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.token
 * @param {string} props.currentUsername
 * @param {import('../../domain/chat.js').ConversationPreview[]} props.peerList
 * @param {(args: { name: string, members: string[] }) => Promise<void>} props.onCreate
 */
export function CreateGroupModal({
  open,
  onClose,
  token,
  currentUsername,
  peerList,
  onCreate,
}) {
  const [step, setStep] = useState(1);
  const [groupName, setGroupName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const fileRef = useRef(null);
  const previewUrlRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setGroupName('');
    setSelectedMembers([]);
    setMemberSearch('');
    setCreating(false);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setAvatarPreview(null);
  }, [open]);

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

  const onPickAvatar = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(f);
    previewUrlRef.current = url;
    setAvatarPreview(url);
  };

  const toggleMember = (username) => {
    setSelectedMembers((prev) => {
      if (prev.includes(username)) return prev.filter((x) => x !== username);
      if (prev.length >= MAX_GROUP_MEMBERS - 1) return prev;
      return [...prev, username];
    });
  };

  const handleCreate = async () => {
    if (!groupName.trim() || creating) return;
    setCreating(true);
    try {
      await onCreate({ name: groupName.trim(), members: selectedMembers });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  const canNext = groupName.trim().length > 0;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-group-title"
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 1 ? (
          <>
            <div className="px-6 pt-8 pb-4">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white shadow-md transition-opacity hover:opacity-90"
                  aria-label="Tải ảnh đại diện nhóm"
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt=""
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <Camera className="h-8 w-8" strokeWidth={1.5} />
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickAvatar}
                />
                <div className="min-w-0 flex-1 pt-2">
                  <label className="block text-xs font-medium text-gray-500" htmlFor="modal-group-name">
                    Group name
                  </label>
                  <div className="flex items-end gap-1 border-b border-gray-300 pb-1 focus-within:border-blue-500">
                    <input
                      id="modal-group-name"
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      autoFocus
                      className="min-w-0 flex-1 border-0 bg-transparent py-1 text-base text-gray-900 outline-none ring-0"
                      placeholder=""
                    />
                    <MoreVertical className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-auto flex justify-end gap-6 px-6 py-5">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-medium text-blue-500 hover:text-blue-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setStep(2)}
                className="text-sm font-medium text-blue-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:text-gray-300"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex shrink-0 items-baseline justify-between border-b border-gray-100 px-4 py-3">
              <h2 id="create-group-title" className="text-lg font-semibold text-gray-900">
                Add Members
              </h2>
              <span className="text-sm text-gray-400">
                {selectedMembers.length} / {MAX_GROUP_MEMBERS - 1}
              </span>
            </div>
            <MemberPicker
              token={token}
              peerList={peerList}
              currentUsername={currentUsername}
              selectedUsernames={selectedMembers}
              onToggleUsername={toggleMember}
              searchQuery={memberSearch}
              onSearchChange={setMemberSearch}
            />
            <div className="flex shrink-0 justify-end gap-6 border-t border-gray-100 px-4 py-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm font-medium text-blue-500 hover:text-blue-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={handleCreate}
                className="text-sm font-medium text-blue-500 hover:text-blue-600 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
