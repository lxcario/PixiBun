'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { surfaceVariants, revealVariants, useUnfolding } from '@/components/ui/surfaces/SpringSurface';
import { useMorphHeight } from '@/components/ui/surfaces/useMorphHeight';
import { registerModalHost, unregisterModalHost } from '@/components/ui/surfaces/modalHost';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';
import { EXIT, FADE_IN, REDUCED_FADE } from '@/lib/motion/springs';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
  bodyClassName?: string;
}

const FOCUSABLE = 'button:not([disabled]):not([tabindex="-1"]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Every studio dialog, with one shared motion: it blooms from its centre on the island's spring,
 * springs its height when its content changes after opening (tabs, steps), and melts away on close.
 * Kept mounted by AnimatePresence while leaving; `propagate` lets a parent AnimatePresence
 * that unmounts the whole modal still play the exit.
 */
export const ModalWrapper: React.FC<ModalWrapperProps> = (props) => (
  <AnimatePresence propagate>
    {props.isOpen && <ModalDialog key="modal" {...props} />}
  </AnimatePresence>
);

function ModalDialog({
  onClose,
  title,
  children,
  className = '',
  maxWidth = 'w-[460px]',
  bodyClassName,
}: ModalWrapperProps) {
  const reduce = useReducedMotion();
  const isPresent = useIsPresent();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  // Set while this dialog closes itself, so its own native close event is not reported again.
  const leavingRef = useRef(false);
  const rawId = React.useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const titleId = `modal-title-${safeId}`;
  const bodyId = `modal-body-${safeId}`;

  // Keep event listeners current without re-running opening focus on parent edits.
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  const restoreFocus = () => {
    const dialog = dialogRef.current;
    const opener = openerRef.current;
    if (!opener) return;
    setTimeout(() => {
      if (!opener.isConnected) return;
      const openDialogs = document.querySelectorAll('dialog[open]');
      const currentDialog = openDialogs[openDialogs.length - 1];
      // A command can open another dialog in the same render. Keep its focus.
      if (currentDialog && !currentDialog.contains(opener)) return;
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body && active !== opener &&
          active.isConnected && !dialog?.contains(active)) return;
      opener.focus();
    }, 0);
  };

  // Open (and reopen while still melting away, when AnimatePresence revives this instance):
  // remember the opener, enter the top layer, place focus.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isPresent) return;
    leavingRef.current = false;
    if (document.activeElement instanceof HTMLElement && !dialog.contains(document.activeElement)) {
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
    registerModalHost(dialog);
    // Auto-focus priority: [data-autofocus] -> first interactive in modal body -> modal title (WCAG 2.4.3)
    const explicitFocus = dialog.querySelector<HTMLElement>('[data-autofocus]');
    if (explicitFocus) {
      explicitFocus.focus();
    } else {
      const bodyFocusable = dialog.querySelector<HTMLElement>(
        `#${bodyId} input:not([disabled]), #${bodyId} textarea:not([disabled]), #${bodyId} select:not([disabled]), #${bodyId} button:not([disabled]):not([tabindex="-1"]), #${bodyId} [href], #${bodyId} [tabindex]:not([tabindex="-1"])`
      );
      if (bodyFocusable) {
        bodyFocusable.focus();
      } else {
        const titleHeading = dialog.querySelector<HTMLElement>(`#${titleId}`);
        if (titleHeading) {
          titleHeading.focus();
        } else {
          dialog.querySelector<HTMLElement>(FOCUSABLE)?.focus();
        }
      }
    }

  }, [isPresent, bodyId, titleId]);

  // Unmount (after the exit, or at once when nothing animates it out).
  useLayoutEffect(() => () => {
    const dialog = dialogRef.current;
    if (dialog) unregisterModalHost(dialog);
    if (dialog?.open) {
      leavingRef.current = true;
      try { dialog.close(); } catch { dialog.removeAttribute('open'); }
    }
    restoreFocus();
  }, []);

  // Close: leave the top layer at once, so the page is interactive and focus can return while the panel melts away.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (isPresent || !dialog) return;
    unregisterModalHost(dialog);
    leavingRef.current = true;
    if (dialog.open) {
      try { dialog.close(); } catch { dialog.removeAttribute('open'); }
    }
    restoreFocus();
  }, [isPresent]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleDialogKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
        return;
      }

      // Focus trap cycle (Tab / Shift+Tab)
      if (e.key === 'Tab') {
        const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
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
        closeRef.current();
      }
    };

    dialog.addEventListener('keydown', handleDialogKeyDown);
    dialog.addEventListener('click', handleDialogClick);
    return () => {
      dialog.removeEventListener('keydown', handleDialogKeyDown);
      dialog.removeEventListener('click', handleDialogClick);
    };
  }, []);

  // Every dialog opens the same way: it blooms from its own centre, and content that arrives
  // during that entrance (a loaded list, a lazy tab) simply joins the bloom. Only changes after
  // the dialog has fully opened (steps, tabs) spring the height.
  const [entered, setEntered] = useState(false);
  useMorphHeight(panelRef, contentRef, { enabled: isPresent && entered, children: true });
  // Body content arrives one block at a time while the panel unfolds.
  const unfolding = useUnfolding();

  const scrim = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1, transition: REDUCED_FADE }, exit: { opacity: 0, transition: REDUCED_FADE } }
    : { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.24, ease: FADE_IN.ease } }, exit: { opacity: 0, transition: { ...EXIT, duration: 0.18 } } };

  return (
    <dialog
      ref={dialogRef}
      data-surface="modal"
      inert={!isPresent || undefined}
      aria-hidden={isPresent ? undefined : true}
      className="pb-modal-host bg-transparent p-0 m-0 w-full h-full max-w-full max-h-full fixed inset-0 flex items-center justify-center z-50"
      onClose={event => {
        // Ignore a queued close from a removed or already reopened dialog, or one this dialog made itself.
        if (event.currentTarget !== dialogRef.current || event.currentTarget.open || leavingRef.current) return;
        closeRef.current();
      }}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
    >
      {/* The scrim is drawn inside the dialog so it can fade; clicks pass through to the dialog (outside-click closes). */}
      <motion.div aria-hidden="true" className="pb-scrim" {...scrim} />
      <motion.div
        ref={panelRef}
        data-surface-panel=""
        variants={surfaceVariants(reduce, 'center')}
        initial="closed"
        animate="open"
        exit="exit"
        onAnimationComplete={definition => { if (definition === 'open') setEntered(true); }}
        className={`pb-modal relative flex flex-col gap-3 select-none text-[var(--text-heading)] max-h-[88vh] max-w-[calc(100vw-2rem)] ${maxWidth} ${className}`}
      >
        {/* Header */}
        <motion.div variants={revealVariants(reduce)} className="pb-modal-header flex items-center justify-between gap-3 shrink-0">
          <h2 id={titleId} tabIndex={-1} className="pb-modal-title m-0 outline-none">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => {
              onClose();
            }}
            className="pb-close"
            aria-label="Close dialog"
          >
            <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" shapeRendering="crispEdges">
              <path d="M0 0h2v2h2v2h2V2h2V0h2v2H8v2H6v2h2v2h2v2H8V8H6V6H4v2H2v2H0V8h2V6h2V4H2V2H0z" fill="currentColor" />
            </svg>
          </button>
        </motion.div>

        <motion.div ref={contentRef} variants={revealVariants(reduce)} id={bodyId} data-modal-body data-unfold={unfolding || undefined} className={bodyClassName ?? 'flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto'}>
          {children}
        </motion.div>
      </motion.div>
    </dialog>
  );
}
