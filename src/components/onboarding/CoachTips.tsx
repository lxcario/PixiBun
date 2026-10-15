'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BunMascot } from '@/components/ui/BunMascot';
import { useStudioStore } from '@/stores/studioStore';
import { usePreferencesStore, type Experience } from '@/stores/preferencesStore';

type Trigger = 'first-edit' | 'fx-tab' | 'second-frame' | 'second-layer' | 'busy';

export interface CoachTip {
  id: string;
  /** Who sees it. Pros see none; "some" only sees PixiBun's own features. */
  levels: Experience[];
  trigger: Trigger;
  target: string;
  title: string;
  body: string;
  classicBody?: string;
}

export const COACH_TIPS: CoachTip[] = [
  {
    id: 'first-edit', levels: ['new'], trigger: 'first-edit', target: '[data-testid="main-composite-canvas"]',
    title: 'Your first edit',
    body: 'Ctrl/Cmd+Z takes an edit back. Scroll to zoom, and hold Space and drag to move around the canvas.',
    classicBody: 'Ctrl/Cmd+Z takes an edit back. Scroll to zoom, and hold Alt and drag to move around the canvas.',
  },
  {
    id: 'lamp', levels: ['new', 'some'], trigger: 'fx-tab', target: '[data-testid="right-inspector"]',
    title: 'Meet the Lamp',
    body: 'Open Effects → Add light and depth → Light your sprite. Choose Preview lighting and move the bulb. Apply keeps the result; Cancel returns to your artwork.',
  },
  {
    id: 'second-frame', levels: ['new', 'some'], trigger: 'second-frame', target: '[data-testid="bottom-timeline"]',
    title: 'Now it can move',
    body: 'Turn on Onion Skin to see the frame before as a ghost, and press Play to watch the loop.',
  },
  {
    id: 'second-layer', levels: ['new'], trigger: 'second-layer', target: '[data-testid="right-inspector"]',
    title: 'Layers keep things tidy',
    body: 'Try outlines on one layer and colors on another. The eye hides a layer; the lock keeps it safe.',
  },
  {
    id: 'share', levels: ['new', 'some'], trigger: 'busy', target: '[aria-label="Export drawing"]',
    title: 'Ready to share?',
    body: 'Export has PNG and GIF for posting, sprite sheets with a Godot kit for games, and a project backup that stays editable.',
  },
];

/** Edits before the share tip suggests exporting. */
const BUSY_EDITS = 24;

export function tipsFor(experience: Experience | null): CoachTip[] {
  // Skipping the question reads as "don't fuss": the PixiBun-specific tips only.
  const level = experience ?? 'some';
  return COACH_TIPS.filter(tip => tip.levels.includes(level));
}

/**
 * One-time tips that appear the first time someone reaches a feature. They
 * never take focus from the canvas, never show over an open dialog, and can
 * be turned off from the tip itself or the Studio menu.
 */
export const CoachTips: React.FC<{ exportOpen: boolean }> = ({ exportOpen }) => {
  const reduce = useReducedMotion() ?? false;
  const onboardedAt = usePreferencesStore(s => s.onboardedAt);
  const experience = usePreferencesStore(s => s.experience);
  const tipsEnabled = usePreferencesStore(s => s.tipsEnabled);
  const seenTips = usePreferencesStore(s => s.seenTips);
  const markTipSeen = usePreferencesStore(s => s.markTipSeen);
  const setTipsEnabled = usePreferencesStore(s => s.setTipsEnabled);
  const [fired, setFired] = useState<Trigger[]>([]);
  const [active, setActive] = useState<CoachTip | null>(null);
  const edits = useRef(0);

  const fire = useCallback((trigger: Trigger) => {
    setFired(list => (list.includes(trigger) ? list : [...list, trigger]));
  }, []);

  // Watch the studio for the moments each tip belongs to.
  useEffect(() => useStudioStore.subscribe((state, previous) => {
    if (state.currentProjectId !== previous.currentProjectId) {
      edits.current = 0;
      setFired([]);
      setActive(null);
      return;
    }
    if (state.canUndo && !previous.canUndo) fire('first-edit');
    if (state.activeInspectorTab === 'ai' && previous.activeInspectorTab !== 'ai') fire('fx-tab');
    if (state.frames.length >= 2 && previous.frames.length < 2) fire('second-frame');
    const frame = state.frames[state.activeFrameIndex];
    const beforeFrame = previous.frames[previous.activeFrameIndex];
    if (frame && beforeFrame && frame.id === beforeFrame.id && frame.layers !== beforeFrame.layers && state.frames.length === previous.frames.length) {
      // Generated layers carry a tag before their recipe is attached. Count
      // ordinary drawing layers, including a later manual layer above an effect.
      const layers = frame.layers.filter(layer => !layer.tag && !layer.effect && !layer.research);
      const before = beforeFrame.layers.filter(layer => !layer.tag && !layer.effect && !layer.research);
      const previousIds = new Set(beforeFrame.layers.map(layer => layer.id));
      if (layers.length >= 2 && before.length < 2 && layers.some(layer => !previousIds.has(layer.id))) fire('second-layer');
    }
    if (state.editRevision !== previous.editRevision && ++edits.current >= BUSY_EDITS) fire('busy');
  }), [fire]);

  // Pick the next unseen tip whose moment has come.
  useEffect(() => {
    if (active || !tipsEnabled || onboardedAt === null || exportOpen) return;
    const candidate = tipsFor(experience).find(tip => fired.includes(tip.trigger) && !seenTips.includes(tip.id));
    if (!candidate) return;
    const id = window.setTimeout(() => {
      if (document.querySelector('dialog[open], [data-testid="welcome-journey"], [data-testid="welcome-step-tour"]')) return;
      if (!document.querySelector(candidate.target)) return;
      setActive(candidate);
    }, 700);
    return () => window.clearTimeout(id);
  }, [active, experience, exportOpen, fired, onboardedAt, seenTips, tipsEnabled]);

  const dismiss = useCallback(() => {
    if (active) markTipSeen(active.id);
    setActive(null);
  }, [active, markTipSeen]);

  return (
    <AnimatePresence>
      {active && (
        <TipCard
          key={active.id}
          tip={active}
          reduce={reduce}
          onDismiss={dismiss}
          onTurnOff={() => {
            setTipsEnabled(false);
            dismiss();
          }}
        />
      )}
    </AnimatePresence>
  );
};

const CARD_W = 290;

const TipCard: React.FC<{ tip: CoachTip; reduce: boolean; onDismiss: () => void; onTurnOff: () => void }> = ({ tip, reduce, onDismiss, onTurnOff }) => {
  const keymap = usePreferencesStore(s => s.keymap);
  const [pos, setPos] = useState<{ left: number; top: number; side: 'left' | 'right' | 'above' | 'below' } | null>(null);
  const body = keymap === 'classic' ? tip.classicBody ?? tip.body : tip.body;

  useLayoutEffect(() => {
    const place = () => {
      const target = document.querySelector<HTMLElement>(tip.target);
      if (!target) return;
      const r = target.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const CARD_H = 170;
      const gap = 16;
      const clampTop = (t: number) => Math.max(12, Math.min(vh - CARD_H - 12, t));
      const clampLeft = (l: number) => Math.max(12, Math.min(vw - CARD_W - 12, l));
      // Never cover what the tip is about (especially the canvas mid-stroke):
      // sit beside it, then above or below it.
      if (r.right + gap + CARD_W <= vw - 12) setPos({ left: r.right + gap, top: clampTop(r.top + 8), side: 'right' });
      else if (r.left - gap - CARD_W >= 12) setPos({ left: r.left - gap - CARD_W, top: clampTop(r.top + 8), side: 'left' });
      else if (r.bottom + gap + CARD_H <= vh - 12) setPos({ left: clampLeft(r.right - CARD_W), top: r.bottom + gap, side: 'below' });
      else setPos({ left: clampLeft(r.left + 24), top: clampTop(r.top - gap - CARD_H), side: 'above' });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [tip.target]);

  if (!pos) return null;
  const from = pos.side === 'left' ? { x: 16 } : pos.side === 'right' ? { x: -16 } : pos.side === 'above' ? { y: 16 } : { y: -12 };
  return (
    <motion.aside
      role="status"
      aria-live="polite"
      aria-label={`Tip: ${tip.title}`}
      data-testid={`coach-tip-${tip.id}`}
      className="fixed z-[9000] rounded-[12px] border-2 border-[var(--ink)] bg-[var(--desk-surface)] p-3.5 text-[var(--text-heading)] shadow-[0_4px_0_var(--ink),0_18px_40px_var(--shadow-far)]"
      style={{ left: pos.left, top: pos.top, width: CARD_W }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, ...from }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      <div className="flex gap-3">
        <motion.span
          className="shrink-0"
          animate={reduce ? undefined : { y: [0, -5, 0] }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <BunMascot size={36} pose="happy" />
        </motion.span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[13px] font-bold">{tip.title}</span>
          <span className="text-xs leading-relaxed text-[var(--text-body)]">{body}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={onTurnOff} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-heading)] underline-offset-2 hover:underline cursor-pointer">
          Turn off tips
        </button>
        <button type="button" data-testid="coach-tip-dismiss" onClick={onDismiss} className="pixel-primary-btn px-3 py-1 rounded-[6px] text-xs font-bold cursor-pointer">
          Got it
        </button>
      </div>
    </motion.aside>
  );
};
