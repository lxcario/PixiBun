'use client';

import { useEffect, useState } from 'react';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#281b3d] border border-[#f0be7c] text-[#f0be7c] text-[11px] font-mono font-bold rounded-[2px] shadow-sm animate-pulse select-none"
      title="You are currently offline. All drawings and changes are saved locally to IndexedDB."
    >
      <span className="w-2 h-2 rounded-full bg-[#f0be7c]" />
      <span>Offline Mode (IndexedDB Active)</span>
    </div>
  );
}
