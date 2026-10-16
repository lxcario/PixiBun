import type { Transition } from 'motion/react';

/**
 * Shared surface motion: the Dynamic island's physical style, for every modal,
 * popover, menu, collapsible and toast in the studio.
 *
 * Damping ratio ζ = damping / (2·√(stiffness·mass)). Below 1 overshoots; lower = bouncier.
 *   MORPH_W  420/31   ζ≈0.76  lands softly, used where width or position settles
 *   MORPH_H  460/25   ζ≈0.58  carries the bounce for height changes (collapse/expand)
 *   BLOOM    600/26/0.9       one small bounce as a surface scales in
 *   SNAP     300/25/0.9       sliding selection thumbs (the liquid tabs' SNAP)
 *   RELEASE  320/17/0.8       a pressed control springing back to size, one soft overshoot
 */
export interface SpringSpec { stiffness: number; damping: number; mass: number }

export const MORPH_W: SpringSpec = { stiffness: 420, damping: 31, mass: 1 };
export const MORPH_H: SpringSpec = { stiffness: 460, damping: 25, mass: 1 };
export const BLOOM: SpringSpec = { stiffness: 600, damping: 26, mass: 0.9 };
export const SNAP: SpringSpec = { stiffness: 300, damping: 25, mass: 0.9 };
export const RELEASE: SpringSpec = { stiffness: 320, damping: 17, mass: 0.8 };

/** A motion/react spring transition from a spec, with tight rest thresholds for pixel and scale values. */
export function spring(spec: SpringSpec, extra: Partial<Transition> = {}): Transition {
  return { type: 'spring', ...spec, restDelta: 0.001, restSpeed: 0.01, ...extra };
}

/* Content choreography, matching the island's tool-change bloom:
   enter from scale 0.95 and 12 px blur; leave quickly to 0.97 and 8 px blur. */
export const ENTER_SCALE = 0.95;
export const ENTER_BLUR = 12;
export const EXIT_SCALE = 0.97;
export const EXIT_BLUR = 8;
/** Opacity reaches 1 quickly so text is legible (and contrast-checkable) while the blur and spring finish. */
export const FADE_IN: Transition = { duration: 0.16, ease: [0.22, 1, 0.36, 1] };
export const UNBLUR: Transition = { duration: 0.34, ease: [0.22, 1, 0.36, 1] };
export const EXIT: Transition = { duration: 0.12, ease: [0.4, 0, 1, 1] };
/** Reduced motion: a short cross-fade and nothing that moves. */
export const REDUCED_FADE: Transition = { duration: 0.12, ease: 'linear' };
export const STAGGER = 0.028;

export function dampingRatio({ stiffness, damping, mass }: SpringSpec): number {
  return damping / (2 * Math.sqrt(stiffness * mass));
}

/**
 * Step a unit spring (0 → 1 from rest) until it settles. Semi-implicit Euler at 1 ms is
 * accurate to well under a pixel for these stiffnesses.
 */
export function sampleSpring(spec: SpringSpec, settle = 0.001, step = 1 / 1000): { t: number; x: number }[] {
  const { stiffness, damping, mass } = spec;
  let x = 0;
  let v = 0;
  let t = 0;
  const points = [{ t: 0, x: 0 }];
  let quiet = 0;
  while (t < 3) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * step;
    x += v * step;
    t += step;
    points.push({ t, x });
    // Settled once it has stayed inside the band, not merely crossed it at a peak.
    quiet = Math.abs(x - 1) < settle && Math.abs(v) < settle * 20 ? quiet + 1 : 0;
    if (quiet >= 16) break;
  }
  return points;
}

/**
 * The same spring as a CSS `linear()` easing and duration, for surfaces that animate
 * natively (details disclosure, select pickers, switches). Values may overshoot 1, which
 * is what gives a CSS transition the island's bounce.
 */
export function cssSpring(spec: SpringSpec, samples = 40): { easing: string; duration: number } {
  const points = sampleSpring(spec);
  const total = points[points.length - 1].t;
  const stops: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const target = (i / samples) * total;
    const point = points[Math.min(points.length - 1, Math.round(target / (total / (points.length - 1))))];
    const value = i === 0 ? 0 : i === samples ? 1 : point.x;
    stops.push(String(Math.round(value * 1000) / 1000));
  }
  return { easing: `linear(${stops.join(', ')})`, duration: Math.round(total * 1000) };
}
