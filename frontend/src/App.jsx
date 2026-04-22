import { useCallback, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ChatProvider } from './context/ChatContext.jsx';
import { AuthScreen, STORAGE } from './features/auth/AuthScreen.jsx';
import { AppShell } from './features/chat/AppShell.jsx';

function AppContent() {
  const [authUser, setAuthUser] = useState(() => ({
    token: sessionStorage.getItem(STORAGE.token) || '',
    userId: sessionStorage.getItem(STORAGE.userId) || '',
    username: sessionStorage.getItem(STORAGE.username) || '',
  }));

  const [toast, setToast] = useState(null);

  const onNotify = useCallback((kind, title, detail) => {
    setToast({ kind, title, detail, id: Date.now() });
    window.setTimeout(() => setToast(null), 4500);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE.token);
    sessionStorage.removeItem(STORAGE.userId);
    sessionStorage.removeItem(STORAGE.username);
    setAuthUser({ token: '', userId: '', username: '' });
  }, []);

  const loggedIn = Boolean(authUser.token);

  if (!loggedIn) {
    return (
      <>
        <AuthScreen onLoggedIn={setAuthUser} onNotify={onNotify} />
        {toast && (
          <Toast kind={toast.kind} title={toast.title} detail={toast.detail} />
        )}
      </>
    );
  }

  return (
    <ChatProvider authUser={authUser}>
      <div className="flex h-full min-h-0 flex-col">
        <AppShell user={authUser} onLogout={logout} />
      </div>
      {toast && (
        <Toast kind={toast.kind} title={toast.title} detail={toast.detail} />
      )}
    </ChatProvider>
  );
}

function Toast({ kind, title, detail }) {
  const border =
    kind === 'err'
      ? 'border-red-500/40 bg-red-500/10'
      : 'border-emerald-500/40 bg-emerald-500/10';
  return (
    <div
      role="status"
      className={`fixed bottom-4 left-1/2 z-50 w-[min(100%,24rem)] -translate-x-1/2 rounded-xl border px-4 py-3 text-sm shadow-lg ${border}`}
    >
      <p className="font-semibold text-tg-text">{title}</p>
      {detail && (
        <p className="mt-1 text-xs text-tg-muted break-words">{detail}</p>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
