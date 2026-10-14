'use client';

import { useEffect } from 'react';

/** How quickly the page catches up with the wheel (per second; higher is snappier). */
const CATCH_UP = 9;
const LINE_HEIGHT = 16;
/** Matches `scroll-padding-top` in globals.css, so anchors land below the fixed nav. */
const ANCHOR_OFFSET = 72;

function scrollsInside(target: EventTarget | null, deltaY: number): boolean {
  // Let inner scroll areas (menus, code blocks, galleries) keep their own native wheel.
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    const style = getComputedStyle(el);
    if (!/(auto|scroll)/.test(style.overflowY) || el.scrollHeight <= el.clientHeight) continue;
    if (deltaY < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight) return true;
  }
  return false;
}

const easeInOutQuart = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);

/**
 * Inertial scrolling for the landing page: each wheel step eases the page
 * toward its target instead of jumping, so the scroll-driven story glides, and
 * in-page links (#tour, #engine...) glide to their section instead of jumping.
 * Keyboard, scrollbar and touch scrolling stay native; any press stops the
 * glide so a control never moves under the pointer between press and release.
 * Off for reduced motion and for zoom gestures (Ctrl/Cmd + wheel).
 */
export function SmoothScroll() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let target = window.scrollY;
    let raf = 0;
    let last = 0;
    let gliding = false;
    let tween: { from: number; to: number; start: number; ms: number } | null = null;

    const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

    const step = (now: number) => {
      if (tween) {
        const t = Math.min(1, (now - tween.start) / tween.ms);
        window.scrollTo(0, tween.from + (tween.to - tween.from) * easeInOutQuart(t));
        if (t >= 1) {
          target = tween.to;
          tween = null;
          gliding = false;
          return;
        }
        raf = requestAnimationFrame(step);
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000 || 1 / 60);
      last = now;
      const current = window.scrollY;
      const next = current + (target - current) * (1 - Math.exp(-CATCH_UP * dt));
      if (Math.abs(target - next) < 0.5) {
        window.scrollTo(0, target);
        gliding = false;
        return;
      }
      window.scrollTo(0, next);
      raf = requestAnimationFrame(step);
    };

    const stop = () => {
      if (!gliding) return;
      cancelAnimationFrame(raf);
      gliding = false;
      tween = null;
      target = window.scrollY;
    };

    const onWheel = (e: WheelEvent) => {
      if (media.matches || e.defaultPrevented || e.ctrlKey || e.metaKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const delta = e.deltaMode === 1 ? e.deltaY * LINE_HEIGHT : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      if (scrollsInside(e.target, delta)) return;
      e.preventDefault();
      if (tween) {
        // The wheel takes over a link glide from wherever it has reached.
        tween = null;
        target = window.scrollY;
      }
      if (!gliding) {
        target = window.scrollY;
        last = performance.now();
        gliding = true;
        raf = requestAnimationFrame(step);
      }
      target = Math.max(0, Math.min(maxScroll(), target + delta));
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
      gliding = true;
      raf = requestAnimationFrame(step);
      history.replaceState(null, '', `#${id}`);
      // Move focus for keyboard and screen reader users without a second jump.
      if (!section.hasAttribute('tabindex')) section.setAttribute('tabindex', '-1');
      section.focus({ preventScroll: true });
    };

    // Native scrolling (keys, scrollbar) moves the page without us; follow it.
    const onScroll = () => {
      if (!gliding) target = window.scrollY;
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onClick);
    window.addEventListener('pointerdown', stop, true);
    window.addEventListener('keydown', stop, true);
    window.addEventListener('touchstart', stop, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick);
      window.removeEventListener('pointerdown', stop, true);
      window.removeEventListener('keydown', stop, true);
      window.removeEventListener('touchstart', stop, true);
    };
  }, []);

  return null;
}
