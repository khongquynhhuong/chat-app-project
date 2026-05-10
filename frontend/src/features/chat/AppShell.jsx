import { useState } from 'react';
import { useChat } from '../../context/ChatContext.jsx';
import { ChatSidebar } from './ChatSidebar.jsx';
import { ChatHeader } from './ChatHeader.jsx';
import { MessageList } from './MessageList.jsx';
import { Composer } from './Composer.jsx';

export function AppShell({ user, onLogout }) {
  const {
    peerList,
    activePeerUsername,
    activeMessages,
    selectPeer,
    openChatWithPeer,
    sendMessage,
    connected,
    lastError,
    wsBanner,
    clearWsBanner,
  } = useChat();

  const [mobilePanel, setMobilePanel] = useState('list');

  const activePeer = peerList.find((p) => p.peerUsername === activePeerUsername);
  const title = activePeer ? activePeer.title : 'Chọn cuộc trò chuyện';
  const subtitle = activePeerUsername
    ? `@${activePeerUsername}`
    : 'Danh sách bên trái hoặc thêm chat mới';

  const onSelectPeerMobile = (id) => {
    openChatWithPeer(id);
    setMobilePanel('chat');
  };

  const onOpenNewChatMobile = (id) => {
    openChatWithPeer(id);
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
        />
        <MessageList messages={activeMessages} peerLabel={title} />
        <Composer
          peerUsername={activePeerUsername}
          disabled={!connected}
          onSend={sendMessage}
        />
      </section>
    </div>
  );
}
