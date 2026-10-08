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
      className="inline-flex shrink-0 h-7 items-center gap-1.5 px-1.5 bg-[#281b3d] border border-[#f0be7c] text-[#f0be7c] text-[11px] font-mono font-bold rounded-[2px] shadow-sm select-none"
      title="You are offline. Drawing works locally; check the save status and keep a project backup."
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 xl:hidden">
        <path d="m3 3 18 18M3 9a15 15 0 0 1 4-2M10 6a15 15 0 0 1 11 3M6 13a10 10 0 0 1 5-2M16 12l2 1M9 17a5 5 0 0 1 6 0" />
        <circle cx="12" cy="21" r="1" />
      </svg>
      <span className="hidden xl:block w-2 h-2 rounded-full bg-[#f0be7c]" />
      <span className="sr-only xl:not-sr-only">Offline</span>
    </div>
  );
}
