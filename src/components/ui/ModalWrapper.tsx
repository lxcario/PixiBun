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
  bodyClassName?: string;
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  maxWidth = 'w-[460px]',
  bodyClassName,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      // Save trigger element for focus restoration
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        openerRef.current = document.activeElement;
      }

      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          // fallback if showModal is not supported in environment
          dialog.setAttribute('open', '');
        }
      }

      // Auto-focus priority: [data-autofocus] -> first interactive in #modal-body -> #modal-title (WCAG 2.4.3)
      const explicitFocus = dialog.querySelector<HTMLElement>('[data-autofocus]');
      if (explicitFocus) {
        explicitFocus.focus();
      } else {
        const bodyFocusable = dialog.querySelector<HTMLElement>(
          '#modal-body input:not([disabled]), #modal-body textarea:not([disabled]), #modal-body select:not([disabled]), #modal-body button:not([disabled]), #modal-body [href], #modal-body [tabindex]:not([tabindex="-1"])'
        );
        if (bodyFocusable) {
          bodyFocusable.focus();
        } else {
          const titleHeading = dialog.querySelector<HTMLElement>('#modal-title');
          if (titleHeading) {
            titleHeading.focus();
          } else {
            const fallback = dialog.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (fallback.length > 0) {
              fallback[0].focus();
            }
          }
        }
      }
    } else {
      if (dialog.open) {
        try {
          dialog.close();
        } catch {
          dialog.removeAttribute('open');
        }
      }
      // Return focus to previous opener
      if (openerRef.current && typeof openerRef.current.focus === 'function') {
        openerRef.current.focus();
      }
    }

    const handleDialogKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap cycle (Tab / Shift+Tab)
      if (e.key === 'Tab') {
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const handleDialogClick = (e: MouseEvent) => {
      if (e.target === dialog) {
        onClose();
      }
    };

    dialog.addEventListener('keydown', handleDialogKeyDown);
    dialog.addEventListener('click', handleDialogClick);

    return () => {
      dialog.removeEventListener('keydown', handleDialogKeyDown);
      dialog.removeEventListener('click', handleDialogClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="bg-transparent p-0 m-0 w-full h-full max-w-full max-h-full backdrop:bg-black/75 backdrop:backdrop-blur-sm fixed inset-0 flex items-center justify-center z-50"
      onClose={onClose}
      aria-labelledby="modal-title"
      aria-describedby="modal-body"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className={`bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-4 rounded-[2px] flex flex-col gap-3 select-none text-[var(--text-heading)] transition-colors duration-150 max-h-[88vh] max-w-[calc(100vw-2rem)] ${maxWidth} ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--desk-border)] pb-2 shrink-0">
          <h2 id="modal-title" tabIndex={-1} className="font-sans font-semibold text-sm text-[var(--accent-gold)] tracking-normal m-0 outline-none">
            ✦ {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--accent-gold)] text-sm font-mono font-bold cursor-pointer transition-colors p-1"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div id="modal-body" data-modal-body className={bodyClassName ?? 'flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto'}>
          {children}
        </div>
      </motion.div>
    </dialog>
  );
};
