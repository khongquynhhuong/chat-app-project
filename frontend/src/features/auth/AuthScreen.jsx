import { useState } from 'react';
import { MessageSquare } from 'lucide-react';

const STORAGE = {
  token: 'chat_access_token',
  userId: 'chat_user_id',
  username: 'chat_username',
};

export { STORAGE };

export function AuthScreen({ onLoggedIn, onNotify }) {
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [busy, setBusy] = useState(false);

  const persistAuth = (data) => {
    const { accessToken, userId, username } = data;
    sessionStorage.setItem(STORAGE.token, accessToken);
    sessionStorage.setItem(STORAGE.userId, String(userId));
    sessionStorage.setItem(STORAGE.username, username);
    onLoggedIn({ token: accessToken, userId: String(userId), username });
  };

  const register = async () => {
    const username = loginUser.trim();
    const password = loginPass;
    if (!username || !password) {
      onNotify?.('err', 'Đăng ký', 'Nhập username và mật khẩu');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        onNotify?.('err', 'Đăng ký thất bại', formatPayload(data));
        return;
      }
      onNotify?.('ok', 'Đăng ký OK', `userId=${data.id} — hãy đăng nhập`);
    } finally {
      setBusy(false);
    }
  };

  const login = async () => {
    const username = loginUser.trim();
    const password = loginPass;
    if (!username || !password) {
      onNotify?.('err', 'Đăng nhập', 'Nhập username và mật khẩu');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        onNotify?.('err', 'Đăng nhập thất bại', formatPayload(data));
        return;
      }
      persistAuth(data);
      onNotify?.('ok', 'Đăng nhập', `Xin chào ${data.username}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-tg-bg px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-tg-border bg-tg-panel p-8 shadow-lg shadow-black/5 dark:shadow-black/20">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-tg-accent/15 text-tg-accent">
            <MessageSquare className="h-8 w-8" strokeWidth={1.75} />
          </div>
          <h1 className="text-xl font-semibold text-tg-text">Chat</h1>
          <p className="text-sm text-tg-muted">
            Đăng nhập để tiếp tục — giao diện kiểu Telegram Web
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="auth-username"
              className="mb-1 block text-xs font-medium text-tg-muted"
            >
              Username
            </label>
            <input
              id="auth-username"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              autoComplete="username"
              placeholder="alice"
              disabled={busy}
              className="w-full rounded-xl border border-tg-border bg-tg-sidebar px-4 py-3 text-sm text-tg-text placeholder:text-tg-muted/70 focus:border-tg-accent focus:outline-none focus:ring-2 focus:ring-tg-accent/25"
            />
          </div>
          <div>
            <label
              htmlFor="auth-password"
              className="mb-1 block text-xs font-medium text-tg-muted"
            >
              Mật khẩu
            </label>
            <input
              id="auth-password"
              type="password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              autoComplete="current-password"
              disabled={busy}
              className="w-full rounded-xl border border-tg-border bg-tg-sidebar px-4 py-3 text-sm text-tg-text focus:border-tg-accent focus:outline-none focus:ring-2 focus:ring-tg-accent/25"
            />
          </div>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={login}
              disabled={busy}
              className="flex-1 cursor-pointer rounded-xl bg-tg-accent py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-tg-accent-hover focus:outline-none focus:ring-2 focus:ring-tg-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={register}
              disabled={busy}
              className="flex-1 cursor-pointer rounded-xl border border-tg-border bg-transparent py-3 text-sm font-semibold text-tg-text transition-colors duration-200 hover:bg-tg-sidebar focus:outline-none focus:ring-2 focus:ring-tg-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Đăng ký
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatPayload(p) {
  if (!p || typeof p !== 'object') return String(p);
  try {
    return JSON.stringify(p, null, 0);
  } catch {
    return String(p);
  }
}
