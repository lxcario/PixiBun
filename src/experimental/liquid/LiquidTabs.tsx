'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity, type Transition } from 'motion/react';
import './liquid.css';

type TabLike<T extends string> = { id: T; ariaLabel: string; title: string };

/* Springs tuned to feel like iOS tab bars: a lively snap, and a soft lift into glass. */
const SNAP: Transition = { type: 'spring', stiffness: 300, damping: 25, mass: 0.9 };
const FOLLOW: Transition = { type: 'spring', stiffness: 700, damping: 50, mass: 0.6 };
const HOLD_MS = 170;
const DRAG_SLOP = 5;

/**
 * Labs: liquid glass tabs. Tap a tab and the lens springs over. Press and hold (or
 * press and slide) and the lens lifts into a magnifying glass bubble that follows
 * your finger, stretching with speed like an elastic drop; let go to choose the tab
 * under it. Keyboard use is unchanged: each tab is still a pressed/unpressed button.
 */
export function LiquidTabs<T extends string, Item extends TabLike<T>>({ tabs, active, onSelect, renderTab }: {
  tabs: ReadonlyArray<Item>;
  active: T;
  onSelect: (id: T) => void;
  renderTab: (tab: Item) => React.ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;
  const barRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<T, HTMLButtonElement>());
  const [glass, setGlass] = useState(false);
  const [under, setUnder] = useState<T | null>(null);
  const drag = useRef<{ id: number; startX: number; offset: number; timer: ReturnType<typeof setTimeout> | null; live: boolean } | null>(null);
  const suppressClick = useRef(false);

  const x = useMotionValue(0);
  const w = useMotionValue(0);
  // Elastic: the faster the lens travels, the more it stretches along the bar and thins across it.
  const vx = useVelocity(x);
  const speed = useSpring(useTransform(vx, v => Math.min(Math.abs(v) / 3400, 0.2)), { stiffness: 420, damping: 40 });
  const lift = useMotionValue(1);
  const scaleX = useTransform([speed, lift], ([s, l]: number[]) => l * (1 + s));
  const scaleY = useTransform([speed, lift], ([s, l]: number[]) => l * (1 - s * 0.45));

  const rectOf = useCallback((id: T) => {
    const el = tabRefs.current.get(id);
    return el ? { left: el.offsetLeft, width: el.offsetWidth } : null;
  }, []);

  const settleOn = useCallback((id: T, instant = false) => {
    const r = rectOf(id);
    if (!r) return;
    if (instant || reduce) { x.set(r.left); w.set(r.width); return; }
    animate(x, r.left, SNAP);
    animate(w, r.width, SNAP);
  }, [rectOf, reduce, x, w]);

  // Follow the active tab; snap without animation on first layout and on resize.
  const placed = useRef(false);
  useLayoutEffect(() => {
    settleOn(active, !placed.current);
    placed.current = true;
  }, [active, settleOn]);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const ro = new ResizeObserver(() => { if (!drag.current?.live) settleOn(active, true); });
    ro.observe(bar);
    return () => ro.disconnect();
  }, [active, settleOn]);

  const nearest = (centerX: number): T => {
    let best = tabs[0].id, dist = Infinity;
    for (const tab of tabs) {
      const r = rectOf(tab.id);
      if (!r) continue;
      const d = Math.abs(r.left + r.width / 2 - centerX);
      if (d < dist) { dist = d; best = tab.id; }
    }
    return best;
  };

  const beginGlass = () => {
    const d = drag.current;
    if (!d || d.live) return;
    d.live = true;
    setGlass(true);
    if (!reduce) animate(lift, 1.1, { type: 'spring', stiffness: 300, damping: 22 });
    try { barRef.current?.setPointerCapture(d.id); } catch { /* The pointer was already released. */ }
  };

  const follow = (clientX: number) => {
    const bar = barRef.current;
    const d = drag.current;
    if (!bar || !d) return;
    const width = w.get();
    const max = bar.clientWidth - width;
    let left = clientX - bar.getBoundingClientRect().left - d.offset;
    // Rubber band past the ends, like pulling an elastic.
    if (left < 0) left = -Math.pow(-left, 0.7);
    else if (left > max) left = max + Math.pow(left - max, 0.7);
    if (reduce) x.set(left); else animate(x, left, FOLLOW);
    setUnder(nearest(left + width / 2));
  };

  const endDrag = (commit: boolean) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.timer) clearTimeout(d.timer);
    if (!d.live) return;
    suppressClick.current = true;
    setGlass(false);
    setUnder(null);
    if (!reduce) animate(lift, 1, { type: 'spring', stiffness: 280, damping: 21 });
    const target = commit ? nearest(x.get() + w.get() / 2) : active;
    if (target !== active) onSelect(target);
    else settleOn(active);
  };

  return (
    <div
      ref={barRef}
      role="group"
      aria-label="Inspector sections"
      data-testid="liquid-tabs"
      className={`lq-bar ${glass ? 'is-glass' : ''}`}
      onPointerDown={e => {
        if (e.button !== 0 || !barRef.current) return;
        // Grab the lens where you touched it, so it does not jump under your finger.
        const barLeft = barRef.current.getBoundingClientRect().left;
        const lensLeft = x.get();
        const touch = e.clientX - barLeft;
        const onLens = touch >= lensLeft && touch <= lensLeft + w.get();
        const offset = onLens ? touch - lensLeft : w.get() / 2;
        drag.current = { id: e.pointerId, startX: e.clientX, offset, live: false, timer: setTimeout(() => { beginGlass(); follow(e.clientX); }, HOLD_MS) };
      }}
      onPointerMove={e => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        if (!d.live && Math.abs(e.clientX - d.startX) > DRAG_SLOP) beginGlass();
        if (d.live) follow(e.clientX);
      }}
      onPointerUp={e => { if (drag.current?.id === e.pointerId) endDrag(true); }}
      onPointerCancel={() => endDrag(false)}
      onLostPointerCapture={() => { if (drag.current?.live) endDrag(true); }}
      onClickCapture={e => {
        if (suppressClick.current) { suppressClick.current = false; e.stopPropagation(); e.preventDefault(); }
      }}
    >
      <motion.span aria-hidden="true" className="lq-lens" style={{ x, width: w, scaleX, scaleY }}>
        <span className="lq-lens-sheen" />
      </motion.span>
      {tabs.map(tab => {
        const on = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={el => { if (el) tabRefs.current.set(tab.id, el); else tabRefs.current.delete(tab.id); }}
            type="button"
            onClick={() => onSelect(tab.id)}
            aria-label={tab.ariaLabel}
            data-testid={`tab-${tab.id}`}
            aria-pressed={on}
            title={tab.title}
            className={`lq-tab ${on ? 'is-active' : ''} ${under === tab.id ? 'is-under' : ''}`}
          >
            {renderTab(tab)}
          </button>
        );
      })}
    </div>
  );
}
