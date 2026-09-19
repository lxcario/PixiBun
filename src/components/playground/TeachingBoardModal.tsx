'use client';

import React, { useEffect } from 'react';
import { TeachingAnimationBoard } from './TeachingAnimationBoard';

interface TeachingBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeachingBoardModal: React.FC<TeachingBoardModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Lock body scroll and dismiss on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#140c1e]/80 backdrop-blur-sm animate-fade-in select-none"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="PixiBun Teaching Animation Board" className="relative w-full max-w-6xl h-[92vh] max-h-[860px] bg-[var(--desk-bg)] border-2 border-[var(--desk-border)] rounded-[4px] shadow-2xl overflow-hidden flex flex-col">
        <TeachingAnimationBoard onClose={onClose} isModal={true} />
      </div>
    </div>
  );
};
