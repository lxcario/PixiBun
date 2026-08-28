'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  maxWidth = 'w-[460px]',
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="bg-transparent p-0 m-0 w-full h-full max-w-full max-h-full backdrop:bg-black/75 backdrop:backdrop-blur-sm open:flex hidden items-center justify-center z-50"
      onClick={handleBackdropClick}
      onClose={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={`bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] shadow-[0_20px_60px_rgba(10,6,18,0.4)] p-4 rounded-[2px] flex flex-col gap-3 select-none text-[var(--text-heading)] transition-colors duration-300 ${maxWidth} ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--desk-border)] pb-2">
          <span id="modal-title" className="font-mono font-bold text-sm text-[var(--accent-gold)] uppercase tracking-wider">
            ✦ {title}
          </span>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--accent-gold)] text-sm font-mono font-bold cursor-pointer transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        
        {children}
      </motion.div>
    </dialog>
  );
};
