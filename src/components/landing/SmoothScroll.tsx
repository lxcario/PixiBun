'use client';

import { useEffect } from 'react';

/** How quickly the page catches up with the wheel (per second; higher is snappier). */
const CATCH_UP = 9;
const LINE_HEIGHT = 16;

function scrollsInside(target: EventTarget | null, deltaY: number): boolean {
  // Let inner scroll areas (menus, code blocks, galleries) keep their own native wheel.
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    const style = getComputedStyle(el);
    if (!/(auto|scroll)/.test(style.overflowY) || el.scrollHeight <= el.clientHeight) continue;
    if (deltaY < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight) return true;
  }
  return false;
}

/**
 * Inertial wheel scrolling for the landing page: each wheel step eases the page
 * toward its target instead of jumping, so the scroll-driven story glides.
 * Keyboard, scrollbar, touch and anchor scrolling stay native; any press stops
 * the glide so a control never moves under the pointer between press and
 * release. Off for reduced motion and for zoom gestures (Ctrl/Cmd + wheel).
 */
export function SmoothScroll() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let target = window.scrollY;
    let raf = 0;
    let last = 0;
    let gliding = false;

    const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

    const step = (now: number) => {
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
      target = window.scrollY;
    };

    const onWheel = (e: WheelEvent) => {
      if (media.matches || e.defaultPrevented || e.ctrlKey || e.metaKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const delta = e.deltaMode === 1 ? e.deltaY * LINE_HEIGHT : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      if (scrollsInside(e.target, delta)) return;
      e.preventDefault();
      if (!gliding) {
        target = window.scrollY;
        last = performance.now();
        gliding = true;
        raf = requestAnimationFrame(step);
      }
      target = Math.max(0, Math.min(maxScroll(), target + delta));
    };

    // Native scrolling (keys, scrollbar, anchors) moves the page without us; follow it.
    const onScroll = () => {
      if (!gliding) target = window.scrollY;
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointerdown', stop, true);
    window.addEventListener('keydown', stop, true);
    window.addEventListener('touchstart', stop, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointerdown', stop, true);
      window.removeEventListener('keydown', stop, true);
      window.removeEventListener('touchstart', stop, true);
    };
  }, []);

  return null;
}
