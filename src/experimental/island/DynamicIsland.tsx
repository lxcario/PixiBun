'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, type Transition } from 'motion/react';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { useLab } from '@/experimental/labsStore';
import './island.css';

/* The island's feel: a quick, slightly overshooting spring, like iOS's Dynamic Island. */
const MORPH: Transition = { type: 'spring', stiffness: 380, damping: 22, mass: 1 };
const SPLIT: Transition = { type: 'spring', bounce: 0.42, visualDuration: 0.55 };
const MERGE: Transition = { type: 'spring', bounce: 0, visualDuration: 0.26 };
const ISLAND_H = 38;
const PAD = 6;
const GAP = 8;

type Activity = { id: number; icon: string; label: string; tone: 'good' | 'info' | 'warm' };

/** Watches the studio for small moments worth a bubble: saved, undo/redo, frames, layers, mirror. */
function useIslandActivity() {
  const [activity, setActivity] = useState<Activity | null>(null);
  const seq = useRef(0);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((icon: string, label: string, tone: Activity['tone']) => {
    seq.current += 1;
    setActivity({ id: seq.current, icon, label, tone });
    if (hide.current) clearTimeout(hide.current);
    hide.current = setTimeout(() => setActivity(null), 1900);
  }, []);

  useEffect(() => {
    const offUndo = studioEvents.on('pixibun:undo', () => show('↶', 'Undone', 'info'));
    const offRedo = studioEvents.on('pixibun:redo', () => show('↷', 'Redone', 'info'));
    const unsub = useStudioStore.subscribe((s, prev) => {
      if (prev.saveStatus === 'saving' && s.saveStatus !== 'saving' && s.saveStatus !== 'error') show('✓', 'Saved', 'good');
      if (s.saveStatus === 'error' && prev.saveStatus !== 'error') show('!', 'Save paused', 'warm');
      if (s.frames.length > prev.frames.length) show('+', `Frame ${s.frames.length}`, 'warm');
      else if (s.frames.length < prev.frames.length) show('−', 'Frame removed', 'info');
      else if (s.activeFrameIndex === prev.activeFrameIndex) {
        const now = s.frames[s.activeFrameIndex]?.layers.length ?? 0;
        const before = prev.frames[prev.activeFrameIndex]?.layers.length ?? 0;
        if (now > before) show('▤', 'Layer added', 'warm');
      }
      if (s.tools.symmetryHorizontal !== prev.tools.symmetryHorizontal || s.tools.symmetryVertical !== prev.tools.symmetryVertical) {
        const on = s.tools.symmetryHorizontal || s.tools.symmetryVertical;
        show('⇋', on ? 'Mirror on' : 'Mirror off', 'info');
      }
    });
    return () => { offUndo(); offRedo(); unsub(); if (hide.current) clearTimeout(hide.current); };
  }, [show]);

  return activity;
}

function DynamicIsland({ contentKey, idleLabel, children }: { contentKey: string; idleLabel?: string; children: React.ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  const filterId = `isl-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const width = useMotionValue<number | 'auto'>('auto');
  const [morphing, setMorphing] = useState(false);
  const observer = useRef<ResizeObserver | null>(null);
  const activity = useIslandActivity();

  // Measure whichever content is current (exiting content keeps its old node and is ignored).
  // The first size snaps; every later size springs, with the stage clipped while it morphs.
  const measure = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    observer.current?.disconnect();
    const update = () => {
      // offsetWidth ignores the entrance scale transform, so the island targets the settled size.
      const target = Math.max(ISLAND_H * 2.4, node.offsetWidth + PAD * 2);
      const current = width.get();
      if (current === 'auto' || reduce) { width.set(target); return; }
      if (Math.abs(current - target) < 0.5) return;
      setMorphing(true);
      animate(width, target, { ...MORPH, onComplete: () => setMorphing(false) });
    };
    observer.current = new ResizeObserver(update);
    observer.current.observe(node);
    update();
  }, [width, reduce]);
  useEffect(() => () => observer.current?.disconnect(), []);

  const split = reduce ? { duration: 0.15 } : SPLIT;
  const bubbleOut = { x: GAP, scale: 1, opacity: 1 };
  const bubbleIn = { x: -ISLAND_H * 0.9, scale: 0.55, opacity: 1 };
  const bubbleMerge = { ...bubbleIn, transition: reduce ? { duration: 0.1 } : MERGE };

  return (
    <motion.div
      className={`isl ${activity ? 'is-active' : ''} ${activity ? `tone-${activity.tone}` : ''} ${morphing ? 'is-morphing' : ''}`}
      data-testid="dynamic-island"
      style={{ height: ISLAND_H, width }}
      // Like iOS, the pill and its bubble recenter together while the bubble is out
      animate={{ x: activity ? -(ISLAND_H + GAP) / 2 : 0 }}
      transition={reduce ? { duration: 0 } : MORPH}
    >
      <svg width="0" height="0" className="isl-defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id={filterId} x="-30%" y="-120%" width="200%" height="340%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5.5" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11" result="goo" />
            <feMorphology in="goo" operator="dilate" radius="2" result="fat" />
            <feFlood className="isl-edge-flood" result="edgeColor" />
            <feComposite in="edgeColor" in2="fat" operator="in" result="edge" />
            <feMerge>
              <feMergeNode in="edge" />
              <feMergeNode in="goo" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Aurora: theme-colored light drifting behind and around the island */}
      <div className="isl-aurora" aria-hidden="true" />

      {/* Liquid layer: the island and its bubble are one gooey shape, so they stretch apart and melt back together */}
      <div className="isl-goo" style={{ filter: `url(#${filterId}) drop-shadow(0 4px 0 var(--moon-ink, var(--ink)))` }} aria-hidden="true">
        <motion.div
          key={activity?.id ?? 'rest'}
          className="isl-blob"
          initial={false}
          animate={activity && !reduce ? { scaleY: [1, 1.14, 1], scaleX: [1, 1.025, 1] } : { scaleY: 1, scaleX: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        />
        <AnimatePresence mode="wait">
          {activity && (
            <motion.div
              key={activity.id}
              className="isl-bubble-blob"
              style={{ width: ISLAND_H, height: ISLAND_H }}
              initial={bubbleIn}
              animate={bubbleOut}
              exit={bubbleMerge}
              transition={split}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="isl-rim" aria-hidden="true" />

      {/* What the island is showing: the active tool's controls, cross-fading when the tool changes */}
      <div className="isl-stage">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={contentKey}
            ref={measure}
            className="isl-content"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.86, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, filter: 'blur(6px)', pointerEvents: 'none' }}
            transition={reduce ? { duration: 0.1 } : { type: 'spring', bounce: 0.25, visualDuration: 0.38 }}
          >
            {idleLabel ? <span className="isl-idle"><span className="isl-idle-dot" />{idleLabel}</span> : children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* The bubble's face rides on top of its liquid twin */}
      <AnimatePresence mode="wait">
        {activity && (
          <motion.div
            key={activity.id}
            className="isl-bubble"
            style={{ width: ISLAND_H, height: ISLAND_H }}
            initial={{ ...bubbleIn, opacity: 0 }}
            animate={bubbleOut}
            exit={{ ...bubbleMerge, opacity: 0 }}
            transition={split}
            title={activity.label}
          >
            <span aria-hidden="true">{activity.icon}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only" role="status" aria-live="polite">{activity?.label ?? ''}</span>
    </motion.div>
  );
}

/**
 * Labs gate for the top-center tool bar. With the island lab off this renders its
 * children untouched, so the classic bar is byte-for-byte what it was.
 */
export function IslandSlot({ contentKey, idleLabel, children }: { contentKey: string; idleLabel?: string; children: React.ReactNode }) {
  const on = useLab('island');
  if (!on) return <>{children}</>;
  return <DynamicIsland contentKey={contentKey} idleLabel={idleLabel}>{children}</DynamicIsland>;
}
