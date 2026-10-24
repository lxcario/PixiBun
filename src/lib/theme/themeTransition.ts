'use client';

import { flushSync } from 'react-dom';
import { useThemeStore, type ColorScheme } from '@/stores/themeStore';

/**
 * Day/Night with motion: the page crossfades to its new colors (a View
 * Transition) while the homepage hero changes time inside its own painting,
 * the moon sinking behind the hills as the sun rises, or the reverse
 * (NightHero.tsx). The switch's knob carries its own little sun and moon.
 * Nothing covers the page. Browsers without View Transitions, and anyone who
 * prefers reduced motion, switch instantly.
 *
 * Earlier versions widened the new scheme out of the switch as a circle with a
 * burst of sparkles (until 23 October), and before that flew a large sun into
 * the page past a spinning glowing ring (until 18 October).
 */

/** How long the page's colors take to crossfade; the hero's sunrise runs a little longer. */
export const CROSSFADE_MS = 900;
/** How long the hero takes to change time when Day/Night switches. */
export const TIME_CHANGE_MS = 1500;

/** The theme colors the homepage hero blends between, instead of switching them at once. */
const BLENDED_COLORS = [
  '--desk-bg', '--desk-surface', '--desk-border', '--text-heading', '--text-body', '--text-muted',
  '--primary-bg', '--primary-fg', '--primary-shade', '--primary-shine',
  '--accent-gold', '--accent-plum', '--accent-wisteria', '--accent-sage', '--ink',
];

/** The same smoothstep the hero's painting fades on (NightHero.tsx). */
export const smoothstep = (p: number) => {
  const x = p < 0 ? 0 : p > 1 ? 1 : p;
  return x * x * (3 - 2 * x);
};

type Rgba = [number, number, number, number];

function parseColor(css: string): Rgba | null {
  const v = css.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) {
    const n = parseInt(v.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    return [1, 2, 3].map((i) => parseInt(v[i] + v[i], 16)).concat(1) as Rgba;
  }
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(v);
  if (!m) return null;
  const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return [+m[1], +m[2], +m[3], a];
}

function readColors(): Map<string, Rgba> {
  const style = getComputedStyle(document.documentElement);
  const out = new Map<string, Rgba>();
  for (const name of BLENDED_COLORS) {
    const c = parseColor(style.getPropertyValue(name));
    if (c) out.set(name, c);
  }
  return out;
}

/**
 * Blends the hero's theme colors from the old scheme to the new over `ms`, by
 * writing the in-between colors onto the hero itself; then hands it back to the
 * theme. CSS transitions do not start for changes made inside a View Transition.
 */
function blendHero(from: Map<string, Rgba>, ms: number) {
  const hero = document.querySelector<HTMLElement>('.landing-hero');
  if (!hero) return;
  const to = readColors();
  const names = [...from.keys()].filter((name) => to.has(name));
  const paint = (k: number) => {
    for (const name of names) {
      const a = from.get(name)!;
      const b = to.get(name)!;
      const mix = (i: number) => a[i] + (b[i] - a[i]) * k;
      hero.style.setProperty(name, `rgba(${Math.round(mix(0))}, ${Math.round(mix(1))}, ${Math.round(mix(2))}, ${mix(3).toFixed(3)})`);
    }
  };
  paint(0);
  const start = performance.now();
  const step = (now: number) => {
    const p = (now - start) / ms;
    if (p >= 1) {
      for (const name of names) hero.style.removeProperty(name);
      return;
    }
    paint(smoothstep(p));
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

type ViewTransitionLike = { ready: Promise<void>; finished: Promise<void> };
type StartViewTransition = (update: () => void) => ViewTransitionLike;

let running = false;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Switches Day/Night with a gentle crossfade. */
export function switchColorScheme(next: ColorScheme) {
  const store = useThemeStore.getState();
  if (store.colorScheme === next) return;
  const start = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition;
  if (running || !start || prefersReducedMotion()) {
    store.setColorScheme(next);
    return;
  }

  const root = document.documentElement;
  root.style.setProperty('--theme-ms', `${CROSSFADE_MS}ms`);
  root.dataset.themeSwitch = next === 'light' ? 'to-day' : 'to-night';
  running = true;

  const before = readColors();
  const transition = start.call(document, () => {
    flushSync(() => useThemeStore.getState().setColorScheme(next));
    blendHero(before, CROSSFADE_MS);
  });
  const done = () => {
    running = false;
    delete root.dataset.themeSwitch;
  };
  // A transition the browser skips (hidden tab, another transition) still applies the update.
  transition.ready.catch(() => {});
  transition.finished.then(done, done);
}

/** Flips Day/Night. */
export function toggleColorScheme() {
  switchColorScheme(useThemeStore.getState().colorScheme === 'dark' ? 'light' : 'dark');
}
