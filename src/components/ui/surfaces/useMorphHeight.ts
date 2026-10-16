'use client';

import { useLayoutEffect, type RefObject } from 'react';
import { animate, motionValue, type AnimationPlaybackControls } from 'motion/react';
import { MORPH_H, spring, type SpringSpec } from '@/lib/motion/springs';
import { readReducedMotion } from '@/lib/motion/useReducedMotion';

/**
 * Springs `outer`'s height whenever `inner`'s content changes size, like the island's shell.
 * At rest the outer element keeps `height: auto`, so it stays responsive and honours its own
 * max-height; only while morphing does it carry an explicit pixel height.
 *
 * ResizeObserver callbacks run after layout and before paint, so pinning the previous height
 * there means the jump to the new size is never painted.
 */
export function useMorphHeight(
  outer: RefObject<HTMLElement | null>,
  inner: RefObject<HTMLElement | null>,
  { enabled = true, spec = MORPH_H, children = false }: {
    enabled?: boolean;
    spec?: SpringSpec;
    /** Watch `inner`'s child elements instead of `inner` itself (when `inner` is sized by the shell, e.g. a flex scroll body). */
    children?: boolean;
  } = {},
) {
  useLayoutEffect(() => {
    const shell = outer.current;
    const content = inner.current;
    if (!enabled || !shell || !content || typeof ResizeObserver === 'undefined') return;
    const height = motionValue(shell.offsetHeight);
    let rest = shell.offsetHeight;
    let running: AnimationPlaybackControls | null = null;
    let target = rest;
    let clipped = false;
    const offChange = height.on('change', value => { shell.style.height = `${Math.max(0, value)}px`; });

    const natural = () => {
      const pinned = shell.style.height;
      shell.style.height = '';
      const value = shell.offsetHeight;
      shell.style.height = pinned;
      return value;
    };
    const settle = (value: number) => {
      running = null;
      rest = value;
      shell.style.height = '';
      shell.removeAttribute('data-morphing');
      if (clipped) { shell.style.overflow = ''; clipped = false; }
    };
    const check = () => {
      const next = natural();
      if (Math.abs(next - target) < 0.5) return;
      target = next;
      if (readReducedMotion() || !shell.isConnected) {
        running?.stop();
        settle(next);
        return;
      }
      if (!running) {
        // Start from the height that was on screen, before this layout changed it.
        height.jump(rest);
        shell.style.height = `${rest}px`;
        shell.setAttribute('data-morphing', '');
        if (getComputedStyle(shell).overflowY === 'visible') { shell.style.overflow = 'clip'; clipped = true; }
      }
      // Retargeting keeps the current velocity, so rapid changes flow into each other.
      const run = animate(height, next, spring(spec));
      running = run;
      void run.then(() => { if (running === run) settle(next); });
    };
    const observer = new ResizeObserver(entries => {
      if (entries.every(entry => entry.target === shell)) {
        // The shell alone moved (window or layout change): that is the new resting height.
        if (!running) target = rest = shell.offsetHeight;
        return;
      }
      check();
    });
    const watched = new Set<Element>();
    const watch = () => {
      for (const node of children ? Array.from(content.children) : [content]) {
        if (!watched.has(node)) { watched.add(node); observer.observe(node); }
      }
    };
    watch();
    observer.observe(shell);
    // New children (a step or tab swapping its content) join the observation; their first
    // notification is what starts the morph.
    // A removed child resizes nothing that is observed, so check directly.
    const mutations = children ? new MutationObserver(() => { watch(); check(); }) : null;
    mutations?.observe(content, { childList: true });
    return () => {
      observer.disconnect();
      mutations?.disconnect();
      running?.stop();
      offChange();
      shell.style.height = '';
      shell.removeAttribute('data-morphing');
      if (clipped) shell.style.overflow = '';
    };
  }, [outer, inner, enabled, spec, children]);
}
