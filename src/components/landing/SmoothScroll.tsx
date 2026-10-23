'use client';

import { useEffect } from 'react';

/** Matches `scroll-padding-top` in globals.css, so anchors land below the fixed nav. */
const ANCHOR_OFFSET = 72;

const easeInOutQuart = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);

/**
 * In-page links (#tour, #engine...) glide to their section instead of jumping.
 * Every other kind of scrolling (wheel, touch, keys, scrollbar) stays native:
 * the browser scrolls on its compositor thread and already eases wheel steps,
 * so canvas work on the page never holds a scroll frame back. An earlier
 * version replaced wheel scrolling with a main-thread glide (`scrollTo` each
 * frame), which stuttered whenever a scene was painting. Any press stops a link
 * glide so a control never moves under the pointer. Off for reduced motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    let tween: { from: number; to: number; start: number; ms: number } | null = null;

    const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

    const step = (now: number) => {
      if (!tween) return;
      const t = Math.min(1, (now - tween.start) / tween.ms);
      window.scrollTo(0, tween.from + (tween.to - tween.from) * easeInOutQuart(t));
      if (t >= 1) {
        tween = null;
        return;
      }
      raf = requestAnimationFrame(step);
    };

    const stop = () => {
      if (!tween) return;
      cancelAnimationFrame(raf);
      tween = null;
    };

    const onClick = (e: MouseEvent) => {
      if (media.matches || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      const id = link?.getAttribute('href')?.slice(1);
      const section = id ? document.getElementById(id) : null;
      if (!link || !section) return;
      e.preventDefault();
      const from = window.scrollY;
      const to = Math.max(0, Math.min(maxScroll(), section.getBoundingClientRect().top + from - (id === 'top' ? 0 : ANCHOR_OFFSET)));
      const distance = Math.abs(to - from);
      cancelAnimationFrame(raf);
      tween = { from, to, start: performance.now(), ms: Math.min(1600, 520 + distance * 0.16) };
      raf = requestAnimationFrame(step);
      history.replaceState(null, '', `#${id}`);
      // Move focus for keyboard and screen reader users without a second jump.
      if (!section.hasAttribute('tabindex')) section.setAttribute('tabindex', '-1');
      section.focus({ preventScroll: true });
    };

    document.addEventListener('click', onClick);
    // A wheel, press, key or touch takes over from a link glide at once.
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('pointerdown', stop, true);
    window.addEventListener('keydown', stop, true);
    window.addEventListener('touchstart', stop, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('click', onClick);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('pointerdown', stop, true);
      window.removeEventListener('keydown', stop, true);
      window.removeEventListener('touchstart', stop, true);
    };
  }, []);

  return null;
}
