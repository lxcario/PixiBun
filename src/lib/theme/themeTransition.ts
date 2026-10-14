'use client';

import { flushSync } from 'react-dom';
import { useThemeStore, type ColorScheme } from '@/stores/themeStore';

/**
 * Day/Night with motion: the new scheme spreads out from the switch as a
 * widening circle (a View Transition), while a pixel sun or moon arcs across
 * the sky on its own layer above both pictures. Browsers without View
 * Transitions, and anyone who prefers reduced motion, switch instantly.
 */

const REVEAL_MS = 900;
const SKY_MS = 1500;

type ViewTransitionLike = { ready: Promise<void>; finished: Promise<void> };
type StartViewTransition = (update: () => void) => ViewTransitionLike;

let running = false;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Sun by day, moon by night, drawn as crisp pixels so it matches the scenes. */
function celestialSvg(toDay: boolean): string {
  const sun = `
    <rect x="6" y="2" width="4" height="12"/><rect x="4" y="4" width="8" height="8"/><rect x="2" y="6" width="12" height="4"/>
    <g class="theme-sky__rays"><rect x="7" y="-3" width="2" height="3"/><rect x="7" y="16" width="2" height="3"/><rect x="-3" y="7" width="3" height="2"/><rect x="16" y="7" width="3" height="2"/>
    <rect x="1" y="1" width="2" height="2"/><rect x="13" y="1" width="2" height="2"/><rect x="1" y="13" width="2" height="2"/><rect x="13" y="13" width="2" height="2"/></g>`;
  const moon = `
    <path d="M6 1h5v1h2v1h1v2h1v6h-1v2h-1v1h-2v1H6v-1H4v-1H3v-1H2V9h3v1h2v1h3v-1h2V9h1V6h-1V4h-1V3H9V2H6z"/>
    <rect x="9" y="5" width="1" height="1" opacity=".35"/><rect x="11" y="9" width="1" height="1" opacity=".35"/>`;
  return `<svg viewBox="-4 -4 24 24" width="100%" height="100%" shape-rendering="crispEdges" aria-hidden="true">${toDay ? sun : moon}</svg>`;
}

/** The sky layer: the travelling sun or moon, a burst of sparkles at the switch, a soft ring riding the reveal edge. */
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
  sky.innerHTML = `<span class="theme-sky__ring"></span><span class="theme-sky__burst">${sparkles}</span><span class="theme-sky__body">${celestialSvg(toDay)}</span>`;
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
