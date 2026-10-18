'use client';

import { flushSync } from 'react-dom';
import { useThemeStore, type ColorScheme } from '@/stores/themeStore';

/**
 * Day/Night with motion: the new scheme spreads out from the switch as a
 * widening circle (a View Transition), with a small burst of sparkles at the
 * switch. The switch's own knob carries the sun or moon. Browsers without View
 * Transitions, and anyone who prefers reduced motion, switch instantly.
 *
 * An earlier version also flew a large sun or moon from the switch into the
 * middle of the page and spun a viewport-sized glowing ring over a dimmed page;
 * the sun seemed to come from nowhere, and the ring and full-page filter were
 * costly to paint on every frame of the switch.
 */

const REVEAL_MS = 900;
const SKY_MS = 800;

type ViewTransitionLike = { ready: Promise<void>; finished: Promise<void> };
type StartViewTransition = (update: () => void) => ViewTransitionLike;

let running = false;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The sky layer: a burst of sparkles at the switch, above both pictures. */
function mountSky(x: number, y: number, toDay: boolean): HTMLElement {
  // A quick second switch replaces the sky still fading from the first; transition names must be unique.
  document.querySelectorAll('.theme-sky').forEach((old) => old.remove());
  const sky = document.createElement('div');
  sky.className = `theme-sky ${toDay ? 'theme-sky--day' : 'theme-sky--night'}`;
  sky.setAttribute('aria-hidden', 'true');
  sky.style.setProperty('--sky-x', `${x}px`);
  sky.style.setProperty('--sky-y', `${y}px`);
  const sparkles = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI * 2 + 0.3;
    const reach = 46 + (i % 3) * 18;
    return `<i style="--dx:${Math.round(Math.cos(angle) * reach)}px;--dy:${Math.round(Math.sin(angle) * reach)}px;--d:${(i % 4) * 40}ms"></i>`;
  }).join('');
  sky.innerHTML = `<span class="theme-sky__burst">${sparkles}</span>`;
  document.body.appendChild(sky);
  window.setTimeout(() => sky.remove(), SKY_MS + 100);
  return sky;
}

/** Switches Day/Night with the reveal starting at (x, y) in viewport pixels. */
export function switchColorScheme(next: ColorScheme, origin?: { x: number; y: number }) {
  const store = useThemeStore.getState();
  if (store.colorScheme === next) return;
  const start = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition;
  if (running || !start || prefersReducedMotion()) {
    store.setColorScheme(next);
    return;
  }

  const root = document.documentElement;
  const x = origin?.x ?? window.innerWidth - 40;
  const y = origin?.y ?? 32;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const toDay = next === 'light';
  root.style.setProperty('--theme-x', `${x}px`);
  root.style.setProperty('--theme-y', `${y}px`);
  root.style.setProperty('--theme-r', `${Math.ceil(radius)}px`);
  root.style.setProperty('--theme-ms', `${REVEAL_MS}ms`);
  root.dataset.themeSwitch = toDay ? 'to-day' : 'to-night';
  running = true;

  const transition = start.call(document, () => {
    // The sky joins the new picture, on its own transition layer above both pictures.
    mountSky(x, y, toDay);
    flushSync(() => useThemeStore.getState().setColorScheme(next));
  });
  const done = () => {
    running = false;
    delete root.dataset.themeSwitch;
  };
  // A transition the browser skips (hidden tab, another transition) still applies the update.
  transition.ready.catch(() => {});
  transition.finished.then(done, done);
}

/** Flips Day/Night from a control, revealing from its center. */
export function toggleColorSchemeFrom(el: Element | null) {
  const rect = el?.getBoundingClientRect();
  const origin = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined;
  switchColorScheme(useThemeStore.getState().colorScheme === 'dark' ? 'light' : 'dark', origin);
}
