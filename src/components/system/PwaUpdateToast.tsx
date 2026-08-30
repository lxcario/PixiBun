'use client';

import React from 'react';

interface PwaUpdateToastProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export const PwaUpdateToast: React.FC<PwaUpdateToastProps> = ({
  onUpdate,
  onDismiss,
}) => {
  return (
    <aside
      aria-label="Application update notification"
      className="fixed bottom-4 right-4 z-50 bg-[#201431] border-2 border-[#f0be7c] p-3 rounded-[3px] shadow-[0_8px_20px_rgba(0,0,0,0.6)] flex items-center gap-3 font-mono text-xs text-[#ede8f4] animate-bounce-subtle"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">✨</span>
        <span>A fresh atelier build is ready.</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onUpdate}
          className="px-2.5 py-1 bg-[#f0be7c] hover:bg-[#fff8db] text-[#140d1f] font-bold rounded-[2px] border border-[#8c5120] cursor-pointer"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-1.5 py-1 text-[#d0c4df] hover:text-[#f0be7c] cursor-pointer"
          aria-label="Dismiss update banner"
        >
          ✕
        </button>
      </div>
    </aside>
  );
};
