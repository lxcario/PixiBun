'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity, type Transition } from 'motion/react';
import { useLab } from '@/experimental/labsStore';
import './liquidControls.css';

/* The liquid tab lens (src/experimental/liquid/LiquidTabs.tsx), turned on its side for the
   tool rail. Same springs and timings, so the two read as one material. */
const SNAP: Transition = { type: 'spring', stiffness: 300, damping: 25, mass: 0.9 };
const FOLLOW: Transition = { type: 'spring', stiffness: 700, damping: 50, mass: 0.6 };
const HOLD_MS = 170;
const DRAG_SLOP = 5;
const TOOL_BUTTON = 'button[data-testid$="-tool"]';

type Rect = { left: number; top: number; width: number; height: number };

/** A button's box inside `host`, from the offset chain so press/hover transforms are ignored. */
function rectIn(host: HTMLElement, button: HTMLElement): Rect | null {
  if (!button.offsetParent) return null;
  let left = 0, top = 0;
  let node: HTMLElement | null = button;
  while (node && node !== host) {
    left += node.offsetLeft; top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return node === host ? { left, top, width: button.offsetWidth, height: button.offsetHeight } : null;
}

const toolButtons = (host: HTMLElement) => Array.from(host.querySelectorAll<HTMLElement>(TOOL_BUTTON));

/**
 * Labs: liquid glass tool rail. The lens is the active tool's highlight: choose a tool and it
 * springs over, stretching along the rail with its speed. Press and hold (or press and slide)
 * and it lifts into a magnifying glass drop that follows your pointer; let go to choose the
 * tool under it. Grouped slots keep press-and-hold for their flyout, so there a slide lifts it.
 * Keyboard use is unchanged. Render inside the rail's positioned tool column.
 */
export function ToolRailLens({ activeTool }: { activeTool: string }) {
  const on = useLab('liquidControls');
  return on ? <Lens activeTool={activeTool} /> : null;
}

function Lens({ activeTool }: { activeTool: string }) {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLSpanElement>(null);
  const [glass, setGlass] = useState(false);
  const [placedOnce, setPlacedOnce] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const w = useMotionValue(40);
  const h = useMotionValue(40);
  // Elastic: the faster the lens travels, the more it stretches along the rail and thins across it.
  const vy = useVelocity(y);
  const speed = useSpring(useTransform(vy, v => Math.min(Math.abs(v) / 3400, 0.2)), { stiffness: 420, damping: 40 });
  const lift = useMotionValue(1);
  const scaleY = useTransform([speed, lift], ([s, l]: number[]) => l * (1 + s));
  const scaleX = useTransform([speed, lift], ([s, l]: number[]) => l * (1 - s * 0.45));

  const host = useCallback(() => ref.current?.parentElement ?? null, []);
  const rectOfActive = useCallback(() => {
    const column = host();
    const button = column?.querySelector<HTMLElement>(`[data-testid="${CSS.escape(activeTool)}-tool"][aria-pressed="true"]`);
    return column && button ? rectIn(column, button) : null;
  }, [activeTool, host]);

  // While the lens is still on its way, the newly chosen button keeps a readable icon color.
  const travel = useRef(0);
  const settle = useCallback((instant = false) => {
    const r = rectOfActive();
    if (!r) return;
    const column = host();
    const run = ++travel.current;
    if (instant || reduce) {
      x.set(r.left); y.set(r.top); w.set(r.width); h.set(r.height);
      column?.classList.remove('lq-rail-moving');
      return;
    }
    if (Math.abs(y.get() - r.top) > 2 || Math.abs(x.get() - r.left) > 2) column?.classList.add('lq-rail-moving');
    const runs = [animate(x, r.left, SNAP), animate(y, r.top, SNAP), animate(w, r.width, SNAP), animate(h, r.height, SNAP)];
    const stopWatch = y.on('change', value => {
      if (Math.abs(value - r.top) < 4) { column?.classList.remove('lq-rail-moving'); stopWatch(); }
    });
    void Promise.all(runs).then(() => { stopWatch(); if (travel.current === run) column?.classList.remove('lq-rail-moving'); });
  }, [rectOfActive, reduce, host, x, y, w, h]);

  // The column hides each active button's own paint while the lens stands in for it.
  useLayoutEffect(() => {
    const column = host();
    column?.classList.add('lq-rail-on');
    return () => column?.classList.remove('lq-rail-on', 'lq-rail-moving');
  }, [host]);

  // Follow the active tool; snap without animation on first layout and on resize.
  const placed = useRef(false);
  const live = useRef(false);
  useLayoutEffect(() => {
    settle(!placed.current);
    if (!placed.current) { placed.current = true; setPlacedOnce(true); }
  }, [activeTool, settle]);
  // Subscribe once: re-observing on each tool change would deliver an initial notification
  // that snaps the lens and cuts its sweep short.
  const settleRef = useRef(settle);
  settleRef.current = settle;
  useEffect(() => {
    const column = host();
    if (!column) return;
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) { first = false; return; }
      if (!live.current) settleRef.current(true);
    });
    ro.observe(column);
    return () => ro.disconnect();
  }, [host]);

  // Press, hold and slide, exactly as the tabs do it, along y.
  useEffect(() => {
    const column = host();
    if (!column) return;
    type Drag = { id: number; startX: number; startY: number; offset: number; pressed: HTMLElement; timer: ReturnType<typeof setTimeout> | null; live: boolean };
    let drag: Drag | null = null;
    let under: HTMLElement | null = null;
    let suppressClick = false;

    const markUnder = (button: HTMLElement | null) => {
      if (under === button) return;
      if (under) delete under.dataset.lqUnder;
      under = button;
      if (under) under.dataset.lqUnder = '';
    };

    const nearest = (centerY: number) => {
      let best: { button: HTMLElement; rect: Rect } | null = null;
      let dist = Infinity;
      for (const button of toolButtons(column)) {
        const rect = rectIn(column, button);
        if (!rect) continue;
        const d = Math.abs(rect.top + rect.height / 2 - centerY);
        if (d < dist) { dist = d; best = { button, rect }; }
      }
      return best;
    };

    const beginGlass = () => {
      const d = drag;
      if (!d || d.live) return;
      // A grouped slot held still has opened its flyout; that gesture belongs to the flyout.
      if (d.pressed.getAttribute('aria-expanded') === 'true') { drag = null; return; }
      d.live = true;
      live.current = true;
      setGlass(true);
      if (!reduce) animate(lift, 1.1, { type: 'spring', stiffness: 300, damping: 22 });
      // Capturing on the column also sends the pressed button a pointerleave, which
      // cancels a grouped slot's pending flyout hold.
      try { column.setPointerCapture(d.id); } catch { /* The pointer was already released. */ }
    };

    const follow = (clientY: number) => {
      const d = drag;
      if (!d) return;
      const buttons = toolButtons(column).map(button => rectIn(column, button)).filter((r): r is Rect => r !== null);
      if (!buttons.length) return;
      const height = h.get();
      const min = buttons[0].top;
      const max = buttons[buttons.length - 1].top;
      let top = clientY - column.getBoundingClientRect().top - d.offset;
      // Rubber band past the ends, like pulling an elastic.
      if (top < min) top = min - Math.pow(min - top, 0.7);
      else if (top > max) top = max + Math.pow(top - max, 0.7);
      if (reduce) y.set(top); else animate(y, top, FOLLOW);
      const target = nearest(top + height / 2);
      if (target) {
        if (reduce) x.set(target.rect.left); else animate(x, target.rect.left, FOLLOW);
        markUnder(target.button);
      }
    };

    const endDrag = (commit: boolean) => {
      const d = drag;
      drag = null;
      if (!d) return;
      if (d.timer) clearTimeout(d.timer);
      if (!d.live) return;
      live.current = false;
      setGlass(false);
      // Commit the pointer's target, even while the visual spring trails it.
      const target = commit ? under : null;
      markUnder(null);
      if (!reduce) animate(lift, 1, { type: 'spring', stiffness: 280, damping: 21 });
      if (target && target.getAttribute('aria-pressed') !== 'true') target.click();
      else settle();
      // The release is not a click on whatever sits under it.
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || drag) return;
      const pressed = (e.target as Element | null)?.closest<HTMLElement>(TOOL_BUTTON);
      if (!pressed || !column.contains(pressed)) return;
      // Grab the lens where you touched it, so it does not jump under your finger.
      const touch = e.clientY - column.getBoundingClientRect().top;
      const lensTop = y.get();
      const onLens = touch >= lensTop && touch <= lensTop + h.get();
      const offset = onLens ? touch - lensTop : h.get() / 2;
      const grouped = pressed.getAttribute('aria-haspopup') === 'menu';
      drag = {
        id: e.pointerId, startX: e.clientX, startY: e.clientY, offset, pressed, live: false,
        timer: grouped ? null : setTimeout(() => { beginGlass(); follow(e.clientY); }, HOLD_MS),
      };
    };
    const onMove = (e: PointerEvent) => {
      const d = drag;
      if (!d || d.id !== e.pointerId) return;
      if (!d.live && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > DRAG_SLOP) beginGlass();
      if (d.live) follow(e.clientY);
    };
    const onUp = (e: PointerEvent) => { if (drag?.id === e.pointerId) endDrag(true); };
    const onCancel = () => endDrag(false);
    const onLost = () => { if (drag?.live) endDrag(true); };
    const onClick = (e: MouseEvent) => {
      if (suppressClick) { suppressClick = false; e.stopPropagation(); e.preventDefault(); }
    };

    column.addEventListener('pointerdown', onDown);
    column.addEventListener('pointermove', onMove);
    column.addEventListener('pointerup', onUp);
    column.addEventListener('pointercancel', onCancel);
    column.addEventListener('lostpointercapture', onLost);
    column.addEventListener('click', onClick, true);
    return () => {
      if (drag?.timer) clearTimeout(drag.timer);
      drag = null;
      live.current = false;
      markUnder(null);
      column.removeEventListener('pointerdown', onDown);
      column.removeEventListener('pointermove', onMove);
      column.removeEventListener('pointerup', onUp);
      column.removeEventListener('pointercancel', onCancel);
      column.removeEventListener('lostpointercapture', onLost);
      column.removeEventListener('click', onClick, true);
    };
  }, [host, reduce, settle, x, y, h, lift]);

  return (
    <motion.span
      ref={ref}
      aria-hidden="true"
      data-testid="tool-rail-lens"
      className={`lq-rail-lens ${glass ? 'is-glass' : ''} ${placedOnce ? '' : 'is-unplaced'}`}
      style={{ x, y, width: w, height: h, scaleX, scaleY }}
    >
      <span className="lq-rail-sheen" />
    </motion.span>
  );
}
