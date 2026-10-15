'use client';

import { useEffect } from 'react';
import { useLab } from '@/experimental/labsStore';
import './liquidControls.css';

/* The visual thumb is a damped spring chasing the native one. The native thumb jumps
   (track click, arrow keys, drag); the spring's lag is drawn as a translate on the
   thumb, so it glides there instead, stretching with its speed like the liquid tab lens.
   Damping ratio ζ = C / (2·√K) ≈ 0.63: one small overshoot, then still. */
const K = 420;
const C = 26;
const LIFT_K = 300;
const LIFT_C = 22;
const THUMB = 24; // matches the thumb width in liquidControls.css
const HOVER_LIFT = 0.35;
const GLASS_LAG = 3; // px behind the native thumb before a glide turns to glass

type Thumb = {
  el: HTMLInputElement;
  pos: number;
  vel: number;
  lift: number;
  liftVel: number;
  held: boolean;
  hover: boolean;
};

/** Where the native thumb sits, in px from the track's start. */
export function thumbOffset(value: number, min: number, max: number, width: number, thumb = THUMB) {
  const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  return ratio * Math.max(0, width - thumb);
}

function nativeOffset(el: HTMLInputElement) {
  const min = el.min === '' ? 0 : Number(el.min);
  const max = el.max === '' ? 100 : Number(el.max);
  return thumbOffset(Number(el.value), min, max, el.clientWidth);
}

const isRange = (target: EventTarget | null): target is HTMLInputElement =>
  target instanceof HTMLInputElement && target.type === 'range' && !target.disabled;

function setGlass(el: HTMLInputElement, glass: boolean) {
  if (glass) el.dataset.lqGlass = '';
  else delete el.dataset.lqGlass;
}

function clear(el: HTMLInputElement) {
  for (const name of ['--lq-x', '--lq-s', '--lq-sx', '--lq-sy']) el.style.removeProperty(name);
}

/**
 * Labs: every slider handle in the scene studio becomes a small liquid lens.
 * Mounted once by StudioLayout; renders nothing. Off, the classic chunky handle stays.
 */
export function LiquidSliders() {
  const on = useLab('liquidControls');

  useEffect(() => {
    if (!on) return;
    document.body.classList.add('lq-sliders');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const thumbs = new WeakMap<HTMLInputElement, Thumb>();
    const awake = new Set<Thumb>();
    let frame = 0;
    let last = 0;

    const step = (now: number) => {
      const dt = Math.min(1 / 30, Math.max(0.001, (now - last) / 1000));
      last = now;
      for (const t of awake) {
        if (!t.el.isConnected) { awake.delete(t); continue; }
        const target = nativeOffset(t.el);
        t.vel += (K * (target - t.pos) - C * t.vel) * dt;
        t.pos += t.vel * dt;
        const liftTarget = t.held ? 1 : t.hover ? HOVER_LIFT : 0;
        t.liftVel += (LIFT_K * (liftTarget - t.lift) - LIFT_C * t.liftVel) * dt;
        t.lift += t.liftVel * dt;
        const settled = Math.abs(target - t.pos) < 0.05 && Math.abs(t.vel) < 2
          && Math.abs(liftTarget - t.lift) < 0.002 && Math.abs(t.liftVel) < 0.02;
        if (settled) {
          t.pos = target; t.vel = 0; t.lift = liftTarget; t.liftVel = 0;
          // At rest the lens keeps only its hover/held size, so the loop can sleep.
          clear(t.el);
          setGlass(t.el, t.held);
          if (liftTarget) t.el.style.setProperty('--lq-s', (1 + liftTarget * 0.28).toFixed(4));
          awake.delete(t);
          continue;
        }
        // Glass while held, and while it glides after a track click or key press.
        setGlass(t.el, t.held || Math.abs(t.pos - target) > GLASS_LAG);
        const stretch = Math.min(Math.abs(t.vel) / 1600, 0.3);
        t.el.style.setProperty('--lq-x', `${(t.pos - target).toFixed(2)}px`);
        t.el.style.setProperty('--lq-s', (1 + t.lift * 0.28).toFixed(4));
        t.el.style.setProperty('--lq-sx', (1 + stretch).toFixed(4));
        t.el.style.setProperty('--lq-sy', (1 - stretch * 0.45).toFixed(4));
      }
      frame = awake.size ? requestAnimationFrame(step) : 0;
    };

    // Waking reads the native position BEFORE the browser applies the press or key,
    // so the change that follows is drawn as travel.
    const wake = (el: HTMLInputElement) => {
      let t = thumbs.get(el);
      if (!t) { t = { el, pos: 0, vel: 0, lift: 0, liftVel: 0, held: false, hover: false }; thumbs.set(el, t); }
      if (reduce.matches) return t;
      if (!awake.has(t)) { t.pos = nativeOffset(el); t.vel = 0; awake.add(t); }
      if (!frame) { last = performance.now(); frame = requestAnimationFrame(step); }
      return t;
    };

    let pressed: Thumb | null = null;
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || !isRange(event.target)) return;
      pressed = wake(event.target);
      pressed.held = true;
      setGlass(event.target, true);
    };
    const onUp = () => {
      if (!pressed) return;
      pressed.held = false;
      wake(pressed.el);
      if (!awake.has(pressed)) setGlass(pressed.el, false);
      pressed = null;
    };
    const onOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !isRange(event.target)) return;
      wake(event.target).hover = true;
    };
    const onOut = (event: PointerEvent) => {
      if (!isRange(event.target)) return;
      const t = thumbs.get(event.target);
      if (t) { t.hover = false; wake(event.target); }
    };
    const onKey = (event: KeyboardEvent) => { if (isRange(event.target)) wake(event.target); };
    const onInput = (event: Event) => { if (isRange(event.target)) wake(event.target); };

    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
    window.addEventListener('blur', onUp);
    document.addEventListener('pointerover', onOver, true);
    document.addEventListener('pointerout', onOut, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('input', onInput, true);
    return () => {
      document.body.classList.remove('lq-sliders');
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      window.removeEventListener('blur', onUp);
      document.removeEventListener('pointerover', onOver, true);
      document.removeEventListener('pointerout', onOut, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('input', onInput, true);
      cancelAnimationFrame(frame);
      for (const t of awake) { clear(t.el); setGlass(t.el, false); }
      if (pressed) setGlass(pressed.el, false);
    };
  }, [on]);

  return null;
}
