'use client';

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform, type Transition } from 'motion/react';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { useLab } from '@/experimental/labsStore';
import { CANONICAL_TOOLS } from '@/config/shortcuts';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useIslandQuickAction } from './useIslandQuickAction';
import './island.css';

/* Physical springs inherit motion-value velocity when retargeted mid-flight.
   Keep the bounce in the shell; readable controls never stretch with it.
   Damping ratio ζ = damping / (2·√(stiffness·mass)). Below 1 overshoots; lower = bouncier.
     width  ζ≈0.76  lands softly (≈2.6% overshoot) so content is never clipped at the edges
     height ζ≈0.58  carries the bounce
   The old single MORPH (620/38/0.85, ζ≈0.83) settled in ~150ms, which reads as snappy, not smooth. */
const MORPH_W: Transition = { type: 'spring', stiffness: 420, damping: 31, mass: 1, restDelta: 0.25, restSpeed: 0.5 };
const MORPH_H: Transition = { type: 'spring', stiffness: 460, damping: 25, mass: 1, restDelta: 0.25, restSpeed: 0.5 };
const MORPH = MORPH_W; // recentering while the bubble splits out
const SPLIT: Transition = { type: 'spring', stiffness: 680, damping: 32, mass: 0.8 };
const MERGE: Transition = { type: 'spring', stiffness: 780, damping: 42, mass: 0.8 };

/* Content choreography on a tool change: old controls melt out (blur + shrink + fade),
   the shell morphs around the new size, then the new controls bloom in a beat later.
   Tune the feel here. */
const OUT: Transition = { duration: 0.11, ease: [0.4, 0, 1, 1] };
const OUT_BLUR = 8;
const OUT_SCALE = 0.97;
const IN_BLUR = 12;
const IN_SCALE = 0.95;
const BLOOM_DELAY = 0.06; // lets the shell get moving before content appears
const bloomTween = (delay: number): Transition => ({ duration: 0.42, ease: [0.22, 1, 0.36, 1], delay });
const bloomSpring = (delay: number): Transition => ({ type: 'spring', stiffness: 600, damping: 26, mass: 0.9, restDelta: 0.0005, restSpeed: 0.01, delay });

const ISLAND_H = 38;
const PAD = 6;
/* Expanded (tool settings open inside the island): a rounded panel instead of a pill. */
const EXPAND_PAD_X = 12;
const ROW_H = 28; // one row of controls
const ROW_TOP = (ISLAND_H - ROW_H) / 2; // the first row sits here open or closed, so the island grows and shrinks around it
const EXPAND_PAD_BOTTOM = 10;
const EXPANDED_RADIUS = 22;
const GAP = 12;

type Activity = { id: number; icon: string; label: string; tone: 'good' | 'info' | 'warm' };

// Motion 12's hook captures the preference only on mount. Subscribe directly
// so switching the OS preference also stops an animation already in progress.
const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
function subscribeReducedMotion(notify: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}
const readReducedMotion = () => window.matchMedia(reducedMotionQuery).matches;
const serverReducedMotion = () => false;

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
  const reduce = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, serverReducedMotion);
  const filterId = `isl-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const width = useMotionValue<number | 'auto'>('auto');
  const height = useMotionValue(ISLAND_H);
  const contentOpacity = useMotionValue(1);
  const contentBlur = useMotionValue(0);
  const contentScale = useMotionValue(1);
  const contentFilter = useTransform(contentBlur, blur => blur < 0.01 ? 'none' : `blur(${blur}px)`);
  // A pill while compact; as it grows taller the corners settle to a rounded panel, like an expanded island.
  // The spring may dip past the pill on the way down; never draw the island shorter than the pill.
  const shownHeight = useTransform(height, h => Math.max(ISLAND_H, h));
  const radius = useTransform(shownHeight, h => `${Math.min(h / 2, Math.max(EXPANDED_RADIUS, ISLAND_H / 2 - (h - ISLAND_H) / 3))}px`);
  const [morphing, setMorphing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // The goo filter is costly, so it only runs while a bubble is out (or melting back in).
  const [goo, setGoo] = useState(false);
  const observer = useRef<ResizeObserver | null>(null);
  const targetSize = useRef<{ width: number; height: number } | null>(null);
  const sizeRun = useRef(0);
  const sizeAnimations = useRef<Array<{ stop: () => void }>>([]);
  const slotNode = useRef<HTMLDivElement | null>(null);
  const islandNode = useRef<HTMLDivElement | null>(null);
  const activity = useIslandActivity();
  const quickAction = useIslandQuickAction();
  const toolIcon = CANONICAL_TOOLS.find(tool => tool.id === contentKey)?.icon ?? 'pen';
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const quickVisible = (hovered || focused) && !dismissed;
  const satellite = quickVisible || !!activity;
  useEffect(() => {
    const leaveWindow = () => { setHovered(false); setFocused(false); };
    // Repaint-generated leave events may not be followed by a second leave.
    // An actual pointer move outside must still close the hover-only shortcut.
    const leaveOnMove = (event: PointerEvent) => {
      if (event.target instanceof Node && !islandNode.current?.contains(event.target)) setHovered(false);
    };
    window.addEventListener('blur', leaveWindow);
    if (hovered) document.addEventListener('pointermove', leaveOnMove, { passive: true });
    return () => {
      window.removeEventListener('blur', leaveWindow);
      document.removeEventListener('pointermove', leaveOnMove);
    };
  }, [hovered]);
  // One physical driver couples the neck, the droplet and the pill's squeeze.
  // Retargeting preserves velocity, so reversing hover rejoins the current shape.
  const separation = useMotionValue(0);
  const shellX = useTransform(separation, [0, 0.28, 0.65, 1], [1, 0.97, 0.90, 0.94]);
  const shellY = useTransform(separation, [0, 0.28, 0.65, 1], [1, 1.025, 1.08, 1.01]);
  const dropX = useTransform(separation, p => -32 + p * (32 + GAP));
  const faceX = useTransform(dropX, x => x - GAP);
  const dropScaleX = useTransform(separation, [0, 0.4, 0.75, 1], [0.15, 0.85, 1.16, 1]);
  const dropScaleY = useTransform(separation, [0, 0.4, 0.75, 1], [0.15, 0.65, 0.87, 1]);
  const dropOpacity = useTransform(separation, [0, 0.12, 1], [0, 1, 1]);
  const faceOpacity = useTransform(separation, [0, 0.48, 0.9, 1], [0, 0, 1, 1]);
  const faceFilter = useTransform(separation, p => p > 0.995 || reduce ? 'none' : 'blur(' + Math.max(0, (1 - p) * 6) + 'px)');
  useEffect(() => {
    if (reduce) {
      separation.jump(satellite ? 1 : 0);
      setGoo(false);
      return;
    }
    let cancelled = false;
    if (satellite) setGoo(true);
    const movement = animate(separation, satellite ? 1 : 0, {
      type: 'spring', stiffness: satellite ? 420 : 520, damping: satellite ? 26 : 34,
      mass: 0.9, restDelta: 0.001, restSpeed: 0.01,
    });
    void movement.then(() => { if (!cancelled && !satellite) setGoo(false); });
    return () => { cancelled = true; movement.stop(); };
  }, [satellite, reduce, separation]);

  // Content has its own intrinsic layout, independent of the animated shell.
  // Deduplicate TARGETS, not the in-flight value: observer deliveries must not
  // restart a spring that is already travelling to this exact destination.
  // offsetWidth/offsetHeight ignore transforms, so the content's blur/scale never feeds back into the measurement.
  const measure = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!node) return;
    const update = () => {
      const slotWidth = slotNode.current?.clientWidth ?? window.innerWidth;
      // Reserve room for the right-hand circle even while hidden, so hovering never moves text.
      const available = Math.max(ISLAND_H * 2.4, slotWidth - (ISLAND_H + GAP) * 2);
      node.style.setProperty('--isl-max-content', `${Math.max(ROW_H, available - EXPAND_PAD_X * 2)}px`);
      const open = node.offsetHeight > ISLAND_H - 4;
      setExpanded(open);
      const targetW = Math.min(available, Math.max(ISLAND_H * 2.4, node.offsetWidth + (open ? EXPAND_PAD_X : PAD) * 2));
      const targetH = open ? node.offsetHeight + ROW_TOP + EXPAND_PAD_BOTTOM : ISLAND_H;
      const currentW = width.get();
      const previous = targetSize.current;
      targetSize.current = { width: targetW, height: targetH };
      if (currentW === 'auto' || reduce || readReducedMotion()) {
        sizeRun.current += 1;
        sizeAnimations.current.forEach(animation => animation.stop());
        width.set(targetW);
        height.set(targetH);
        setMorphing(false);
        return;
      }
      if (previous && Math.abs(previous.width - targetW) < 0.5 && Math.abs(previous.height - targetH) < 0.5) return;
      const run = ++sizeRun.current;
      setMorphing(true);
      const animations = [animate(width, targetW, MORPH_W), animate(height, targetH, MORPH_H)];
      sizeAnimations.current = animations;
      void Promise.all(animations).then(() => {
        if (sizeRun.current === run) setMorphing(false);
      });
    };
    observer.current = new ResizeObserver(update);
    observer.current.observe(node);
    if (slotNode.current) observer.current.observe(slotNode.current);
    update();
  }, [width, height, reduce]);
  useEffect(() => () => {
    observer.current?.disconnect();
    sizeRun.current += 1;
    sizeAnimations.current.forEach(animation => animation.stop());
  }, []);

  // ── Tool-change choreography ──
  // The same content node stays mounted (remounting the bar caused a visible hitch). On a tool change we
  //   1. keep showing the OLD controls (frozen) while they blur/shrink/fade out,
  //   2. swap to the new controls; the ResizeObserver above retargets the shell springs,
  //   3. bloom the new controls in: blur 12 → 0, scale .95 → 1 (one small, quickly damped bounce), opacity 0 → 1.
  // Rapid tool switching just retargets: each change cancels the running phase and continues from the current values.
  const liveContent = idleLabel
    ? <span className="isl-idle"><span className="isl-idle-dot" />{idleLabel}</span>
    : children;
  const [shownKey, setShownKey] = useState(contentKey);
  const settled = reduce || shownKey === contentKey;
  const frozen = useRef<React.ReactNode>(liveContent);
  const bloomPending = useRef(false);
  // Remember the last committed live content so it can stay on screen while it exits.
  useLayoutEffect(() => { if (settled) frozen.current = liveContent; });
  const shownContent = settled ? liveContent : frozen.current;

  useLayoutEffect(() => {
    if (reduce) {
      contentOpacity.set(1);
      contentBlur.set(0);
      contentScale.set(1);
      if (shownKey !== contentKey) setShownKey(contentKey);
      return;
    }
    if (shownKey !== contentKey) {
      let cancelled = false;
      const out = [
        animate(contentOpacity, 0, OUT),
        animate(contentBlur, OUT_BLUR, OUT),
        animate(contentScale, OUT_SCALE, OUT),
      ];
      void Promise.all(out).then(() => {
        if (cancelled) return;
        // Invisible now (opacity 0): reset to the bloom's starting pose, then swap in the new controls.
        contentBlur.set(IN_BLUR);
        // This is a new label, so it must not inherit the exiting label's
        // negative scale velocity and dip far below the intended bloom size.
        contentScale.jump(IN_SCALE);
        bloomPending.current = true;
        setShownKey(contentKey);
      });
      return () => { cancelled = true; out.forEach(a => a.stop()); };
    }
    const delay = bloomPending.current ? BLOOM_DELAY : 0;
    bloomPending.current = false;
    const bloom = [
      animate(contentOpacity, 1, bloomTween(delay)),
      animate(contentBlur, 0, bloomTween(delay)),
      animate(contentScale, 1, bloomSpring(delay)),
    ];
    return () => bloom.forEach(a => a.stop());
  }, [contentKey, shownKey, reduce, contentOpacity, contentBlur, contentScale]);

  const contentNode = useRef<HTMLDivElement | null>(null);
  const setContentNode = useCallback((node: HTMLDivElement | null) => {
    contentNode.current = node;
    measure(node);
  }, [measure]);

  const split = reduce ? { duration: 0 } : SPLIT;
  const bubbleOut = { x: GAP, scale: 1, opacity: 1 };
  const bubbleIn = { x: -ISLAND_H * 0.9, scale: 0.55, opacity: 1 };
  const bubbleMerge = { ...bubbleIn, transition: reduce ? { duration: 0 } : MERGE };

  return (
    // The slot keeps the header's layout; the island hangs from its top and grows downward over the canvas.
    <div ref={slotNode} className="isl-slot" style={{ height: ISLAND_H }}>
    <motion.div
      ref={islandNode}
      className={`isl ${activity ? 'is-active' : ''} ${activity ? `tone-${activity.tone}` : ''} ${morphing ? 'is-morphing' : ''} ${expanded ? 'is-expanded' : ''}`}
      data-testid="dynamic-island"
      onPointerEnter={event => { if (event.pointerType !== 'touch') { setHovered(true); setDismissed(false); } }}
      onPointerLeave={event => {
        // A filtered repaint can emit a leave with an unchanged hit target in Firefox.
        // Close on a real exit, rather than cancelling the pull under a stationary pointer.
        if (!(event.relatedTarget instanceof Node) && event.currentTarget.contains(document.elementFromPoint(event.clientX, event.clientY))) return;
        setHovered(false);
      }}
      onFocusCapture={() => { setFocused(true); setDismissed(false); }}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onKeyDownCapture={event => { if (event.key === 'Escape') setDismissed(true); }}
      style={{ height: shownHeight, width, ['--isl-r' as string]: radius, ['--isl-row-top' as string]: `${ROW_TOP}px` }}
      // Satellite space is reserved; feedback and hover never move the readable row.
      animate={{ x: 0 }}
      transition={reduce ? { duration: 0 } : MORPH}
    >
      <div className="isl-satellite-bridge" aria-hidden="true" />
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

      {/* Bounded halo: its gradient moves with transforms; blur still has a rendering cost. */}
      <div className="isl-aurora" aria-hidden="true"><span /></div>

      {/* Liquid layer: the island and its bubble are one gooey shape, so they stretch apart and melt back together */}
      <div
        className={`isl-goo ${goo && !reduce ? 'is-liquid' : ''}`}
        style={goo && !reduce ? { filter: `url(#${filterId}) drop-shadow(0 4px 0 var(--moon-ink, var(--ink)))` } : undefined}
        aria-hidden="true"
      >
        <motion.div className="isl-blob" style={{ scaleX: reduce ? 1 : shellX, scaleY: reduce ? 1 : shellY }} />
        <motion.div className="isl-bubble-blob" style={{ width: ISLAND_H, height: ISLAND_H,
          x: dropX, scaleX: dropScaleX, scaleY: dropScaleY, opacity: dropOpacity }} />
      </div>

      {/* Expanded: a soft aurora wash of the theme's colors inside the island, like a charging glow */}
      <div className="isl-wash" aria-hidden="true"><span /></div>

      <motion.div className="isl-rim" aria-hidden="true" style={{ scaleX: reduce ? 1 : shellX, scaleY: reduce ? 1 : shellY }} />
      <motion.div className="isl-glass" aria-hidden="true" style={{ scaleX: reduce ? 1 : shellX, scaleY: reduce ? 1 : shellY }} />
      <motion.div className="isl-drop-glass" aria-hidden="true" style={{ width: ISLAND_H, height: ISLAND_H,
        x: dropX, scaleX: dropScaleX, scaleY: dropScaleY, opacity: dropOpacity }} />

      {/* What the island is showing: the active tool's controls, blooming in and melting out when the tool changes.
          While the old controls are exiting they are inert so a stale click can't fire. */}
      <div className="isl-stage">
        <motion.div
          ref={setContentNode}
          className="isl-content"
          inert={!settled || undefined}
          style={{ opacity: contentOpacity, scale: contentScale, filter: contentFilter }}
        >
          {shownContent}
        </motion.div>
      </div>

      {/* A direct shortcut shares the liquid satellite with activity feedback. The hit bridge
          spans the gap so the circle stays reachable when the pointer leaves the pill. */}
      <button
        type="button"
        className="isl-quick-tool"
        data-testid="island-quick-tool"
        aria-label={quickAction.label}
        aria-pressed={quickAction.pressed}
        title={quickAction.label}
        inert={!quickVisible || !settled || undefined}
        onClick={() => { if (settled) quickAction.run(); }}
        style={{ width: ISLAND_H, height: ISLAND_H, pointerEvents: quickVisible ? 'auto' : 'none' }}
      >
        <motion.span className="isl-quick-face" style={{ x: faceX, scaleX: dropScaleX, scaleY: dropScaleY,
          opacity: quickVisible ? faceOpacity : 0, filter: faceFilter }}>
          <PixelIcon name={toolIcon} size={13} />
          <span>{quickAction.badge}</span>
        </motion.span>
      </button>

      {/* The bubble's face rides on top of its liquid twin; its glyph blurs in and out with the content */}
      <AnimatePresence>
        {activity && !quickVisible && (
          <motion.div
            key="activity"
            className="isl-bubble"
            style={{ width: ISLAND_H, height: ISLAND_H }}
            initial={{ ...bubbleIn, opacity: 0, filter: 'blur(8px)' }}
            animate={{ ...bubbleOut, filter: 'blur(0px)' }}
            exit={{ ...bubbleMerge, opacity: 0, filter: 'blur(8px)' }}
            transition={split}
            title={activity.label}
          >
            <span aria-hidden="true">{activity.icon}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only" role="status" aria-live="polite">{activity?.label ?? ''}</span>
    </motion.div>
    </div>
  );
}

/**
 * Labs gate for the top-center tool bar. With the island lab off this renders its
 * children untouched, so the classic bar is byte-for-byte what it was.
 */
export function IslandSlot({ contentKey, idleLabel, children }: { contentKey: string; panelKey?: string; idleLabel?: string; children: React.ReactNode }) {
  const on = useLab('island');
  if (!on) return <>{children}</>;
  return <DynamicIsland contentKey={contentKey} idleLabel={idleLabel}>{children}</DynamicIsland>;
}
