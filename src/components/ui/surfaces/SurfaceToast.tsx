'use client';

import { AnimatePresence, motion, type Variants } from 'motion/react';
import { PixelIcon, type PixelIconName } from '@/components/ui/PixelIcon';
import { BLOOM, EXIT, REDUCED_FADE, UNBLUR, spring } from '@/lib/motion/springs';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';

export interface SurfaceToastContent {
  /** A new key replaces the capsule: the old one melts, the new one rises. */
  key: string;
  message: string;
  tone: 'default' | 'error' | 'success';
  icon: PixelIconName;
  testId: string;
  action?: { label: string; onClick: () => void };
}

function toastVariants(reduce: boolean): Variants {
  if (reduce) return { closed: { opacity: 0 }, open: { opacity: 1, transition: REDUCED_FADE }, exit: { opacity: 0, transition: REDUCED_FADE } };
  return {
    closed: { opacity: 0, y: 18, scale: 0.92, filter: 'blur(10px)' },
    open: {
      opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' },
      transition: { opacity: { duration: 0.12 }, y: spring(BLOOM), scale: spring(BLOOM), filter: UNBLUR },
    },
    exit: { opacity: 0, y: 8, scale: 0.96, filter: 'blur(6px)', transition: EXIT },
  };
}

/** The studio's single toast: a glass capsule that springs up from the bottom edge. */
export function SurfaceToast({ toast, onAction }: { toast: SurfaceToastContent | null; onAction?: () => void }) {
  const reduce = useReducedMotion();
  return (
    <div className="fixed bottom-14 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.key}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
            data-testid={toast.testId}
            data-tone={toast.tone}
            variants={toastVariants(reduce)}
            initial="closed"
            animate="open"
            exit="exit"
            className={`pb-toast ${toast.action ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            <span className="pb-toast-icon" aria-hidden="true"><PixelIcon name={toast.icon} size={13} /></span>
            <span className="min-w-0">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => { toast.action?.onClick(); onAction?.(); }}
                data-testid="toast-action-button"
                className="pb-toast-action"
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
