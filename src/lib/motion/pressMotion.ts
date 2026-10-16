import { RELEASE, cssSpring } from './springs';
import { readReducedMotion } from './useReducedMotion';

/**
 * Press feel for every control: while held it eases down to a slightly smaller
 * size, and on release it springs back with one soft overshoot (RELEASE). Uses the
 * CSS `scale` property, which composes with any transform or translate a control
 * already has, so it never fights Motion's inline transforms or layout offsets.
 */

const PRESSABLE = [
  'button',
  'summary',
  '[role="button"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[role="radio"]',
  '[role="option"]',
  '[role="switch"]',
  'label.pb-row',
].join(', ');

/** The drawing surface and anything that opts out keep still. */
const STILL = '#center-canvas-area, [data-no-press], input, textarea, select, [contenteditable="true"]';

/** A press takes about this many pixels off the control's longer side, whatever its size. */
const PRESS_PX = 3.5;
const MIN_SCALE = 0.95;
const MAX_SCALE = 0.988;

const PRESS_IN: KeyframeAnimationOptions = { duration: 170, easing: 'cubic-bezier(0.25, 0.8, 0.35, 1)', fill: 'forwards' };

let release: { easing: string; duration: number } | null = null;
const live = new WeakMap<Element, Animation>();

/** How far a control of this size shrinks: small buttons to 0.95, wide rows barely. */
export function pressScale(width: number, height: number): number {
  const side = Math.max(width, height, 1);
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, 1 - PRESS_PX / side));
}

export function pressTarget(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof Element)) return null;
  const el = node.closest<HTMLElement>(PRESSABLE);
  if (!el || el.closest(STILL)) return null;
  if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return null;
  return el;
}

function currentScale(el: HTMLElement): number {
  const value = parseFloat(getComputedStyle(el).scale);
  return Number.isFinite(value) ? value : 1;
}

function press(el: HTMLElement) {
  if (typeof el.animate !== 'function' || readReducedMotion()) return;
  const from = currentScale(el);
  const rect = el.getBoundingClientRect();
  live.get(el)?.cancel();
  live.set(el, el.animate([{ scale: String(from) }, { scale: String(pressScale(rect.width, rect.height)) }], PRESS_IN));
}

function letGo(el: HTMLElement) {
  const held = live.get(el);
  if (!held || typeof el.animate !== 'function') return;
  const from = currentScale(el);
  held.cancel();
  release ??= cssSpring(RELEASE);
  const back = el.animate([{ scale: String(from) }, { scale: '1' }], { duration: release.duration, easing: release.easing });
  live.set(el, back);
  back.onfinish = () => { if (live.get(el) === back) live.delete(el); };
}

/** Listen once at the document; returns the cleanup. */
export function installPressMotion(doc: Document = document): () => void {
  let held: HTMLElement | null = null;
  const end = () => {
    if (held) letGo(held);
    held = null;
  };
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const el = pressTarget(e.target);
    if (!el) return;
    end();
    held = el;
    press(el);
  };
  const onPointerLeave = (e: PointerEvent) => {
    if (held && e.target === held) end();
  };
  // Space and Enter press a focused control the same way.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat || (e.key !== ' ' && e.key !== 'Enter')) return;
    const el = pressTarget(e.target);
    if (!el || el !== doc.activeElement) return;
    end();
    held = el;
    press(el);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') end();
  };

  doc.addEventListener('pointerdown', onPointerDown, true);
  doc.addEventListener('pointerup', end, true);
  doc.addEventListener('pointercancel', end, true);
  doc.addEventListener('pointerleave', onPointerLeave, true);
  doc.addEventListener('dragstart', end, true);
  doc.addEventListener('keydown', onKeyDown, true);
  doc.addEventListener('keyup', onKeyUp, true);
  doc.defaultView?.addEventListener('blur', end);
  return () => {
    end();
    doc.removeEventListener('pointerdown', onPointerDown, true);
    doc.removeEventListener('pointerup', end, true);
    doc.removeEventListener('pointercancel', end, true);
    doc.removeEventListener('pointerleave', onPointerLeave, true);
    doc.removeEventListener('dragstart', end, true);
    doc.removeEventListener('keydown', onKeyDown, true);
    doc.removeEventListener('keyup', onKeyUp, true);
    doc.defaultView?.removeEventListener('blur', end);
  };
}
