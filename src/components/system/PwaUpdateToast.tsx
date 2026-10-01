'use client';

import React from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface PwaUpdateToastProps {
  onUpdate: () => void;
  onDismiss: () => void;
  deferred?: boolean;
}

export const PwaUpdateToast: React.FC<PwaUpdateToastProps> = ({
  onUpdate,
  onDismiss,
  deferred = false,
}) => {
  return (
    <aside
      aria-label="Application update notification"
      className="fixed bottom-4 right-4 z-50 w-[26rem] max-w-[calc(100vw-2rem)] bg-[#201431] border-2 border-[#f0be7c] p-3 rounded-[3px] shadow-[0_8px_20px_rgba(0,0,0,0.6)] flex items-center gap-3 font-mono text-xs text-[#ede8f4]"
    >
      <div className="flex min-w-0 items-center gap-2">
        <PixelIcon name="sun" size={14} />
        <span>{deferred ? 'Update ready · Close all PixiBun tabs when done to apply.' : 'Update ready · A fresh atelier build is ready. Close all PixiBun tabs when done to apply.'}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onUpdate}
          className="px-2.5 py-1 bg-[#f0be7c] hover:bg-[#fcd699] hover:shadow-[0_2px_0_#8c5120] text-[#140d1f] font-bold rounded-[2px] border border-[#8c5120] cursor-pointer"
        >
          Update instructions
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
