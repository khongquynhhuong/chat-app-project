import { useEffect, useState } from 'react';
import { useChat } from '../../context/ChatContext.jsx';
import { ChatSidebar } from './ChatSidebar.jsx';
import { ChatHeader } from './ChatHeader.jsx';
import { MessageList } from './MessageList.jsx';
import { Composer } from './Composer.jsx';
import { GroupInfoDrawer } from './GroupInfoDrawer.jsx';

export function AppShell({ user, onLogout }) {
  const {
    peerList,
    activePeerUsername,
    activeMessages,
    selectPeer,
    loadHistory,
    openChatWithPeer,
    createGroupChat,
    renameGroupChat,
    addGroupMembersToGroup,
    leaveGroupChat,
    deleteGroupChat,
    sendMessage,
    connected,
    lastError,
    wsBanner,
    clearWsBanner,
  } = useChat();

  const [mobilePanel, setMobilePanel] = useState('list');
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);

  const activePeer = peerList.find((p) => p.peerUsername === activePeerUsername);
  const activeGroupId =
    activePeer?.kind === 'group' && activePeer?.rawId != null
      ? Number(activePeer.rawId)
      : null;

  useEffect(() => {
    if (activeGroupId == null) setGroupDrawerOpen(false);
  }, [activeGroupId]);
  const title = activePeer ? activePeer.title : 'Chọn cuộc trò chuyện';
  const subtitle = activePeer
    ? activePeer.kind === 'group'
      ? `${activePeer.memberCount || 0} thành viên`
      : `@${activePeer.rawId}`
    : 'Danh sách bên trái hoặc thêm chat mới';

  const onSelectPeerMobile = (id) => {
    selectPeer(id);
    loadHistory(id);
    setMobilePanel('chat');
  };

  const onOpenNewChatMobile = (id) => {
    openChatWithPeer(id);
    setMobilePanel('chat');
  };

  const onCreateGroupMobile = async ({ name, members }) => {
    const key = await createGroupChat(name, members);
    await loadHistory(key);
    setMobilePanel('chat');
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-tg-bg md:flex-row">
      <div
        className={`h-full min-h-0 w-full shrink-0 md:flex md:w-80 ${mobilePanel === 'list' ? 'flex' : 'hidden md:flex'
          }`}
      >
        <ChatSidebar
          user={user}
          peerList={peerList}
          activePeerUsername={activePeerUsername}
          onSelectPeer={onSelectPeerMobile}
          onOpenNewChat={onOpenNewChatMobile}
          onCreateGroup={onCreateGroupMobile}
          onLogout={onLogout}
          wsBanner={wsBanner}
          onDismissBanner={clearWsBanner}
        />
      </div>

      <section
        className={`flex min-h-0 min-w-0 flex-1 flex-col bg-tg-panel ${mobilePanel === 'chat' ? 'flex' : 'hidden md:flex'
          }`}
        aria-label="Khung trò chuyện"
      >
        <ChatHeader
          title={title}
          subtitle={subtitle}
          connected={connected}
          lastError={lastError}
          showBack={mobilePanel === 'chat'}
          onBack={() => setMobilePanel('list')}
          showGroupInfo={activeGroupId != null}
          onOpenGroupInfo={() => setGroupDrawerOpen(true)}
        />
        <MessageList messages={activeMessages} peerLabel={title} />
        <Composer
          peerUsername={activePeerUsername}
          disabled={!connected}
          onSend={sendMessage}
        />
      </section>

      <GroupInfoDrawer
        open={groupDrawerOpen}
        onClose={() => setGroupDrawerOpen(false)}
        groupId={activeGroupId}
        token={user.token}
        currentUsername={user.username}
        fallbackTitle={activePeer?.title}
        peerList={peerList}
        onLeaveGroup={async (id) => {
          await leaveGroupChat(id);
          setGroupDrawerOpen(false);
          setMobilePanel('list');
        }}
        onDeleteGroup={async (id) => {
          await deleteGroupChat(id);
          setGroupDrawerOpen(false);
          setMobilePanel('list');
        }}
        onRenameGroup={(id, name) => renameGroupChat(id, name)}
        onAddMembers={(id, members) => addGroupMembersToGroup(id, members)}
      />
    </div>
  );
}
