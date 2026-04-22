import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

export function ConnectionBadge({ connected, lastError }) {
  if (lastError && !connected) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400"
        title={lastError}
      >
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Lỗi
      </span>
    );
  }
  if (!connected) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-tg-border/80 px-2 py-0.5 text-xs font-medium text-tg-muted">
        <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Đang kết nối…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
      <Wifi className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Trực tuyến
    </span>
  );
}
