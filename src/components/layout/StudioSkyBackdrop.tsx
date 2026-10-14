'use client';

import React, { useEffect, useRef } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { isSceneTheme } from '@/lib/theme/registry';
import { buildScene, paintScene, type BuiltScene } from '@/lib/theme/scenes';

/**
 * A scene theme's animated pixel scene behind the drawing canvas (Moonlit's
 * town under the stars, Sakura's lanterns and petals, Tidepool's reef...).
 * Purely decorative and pointer-transparent.
 *
 * It ticks at ~8fps on a timer instead of every animation frame so it never
 * competes with drawing, and stops entirely when the tab is hidden or motion is reduced.
 */

const TICK_MS = 125;

interface SceneCanvasProps {
  themeId: string;
  day: boolean;
  /** Screen pixels per scene pixel. */
  pixelSize?: number;
  /** Freeze on one frame (reduced motion, thumbnails that should stay calm). */
  still?: boolean;
  className?: string;
  testId?: string;
}

/** Fills its positioned parent with a theme's scene. */
export const SceneCanvas: React.FC<SceneCanvasProps> = ({ themeId, day, pixelSize = 4, still = false, className, testId }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    const g = el?.getContext('2d');
    const host = el?.parentElement;
    if (!el || !g || !host) return;
    const reduce = still || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let scene: BuiltScene | null = null;
    const start = performance.now();
    const build = () => {
      const rect = host.getBoundingClientRect();
      const w = Math.ceil(rect.width / pixelSize);
      const h = Math.ceil(rect.height / pixelSize);
      // A hidden or collapsed host has no pixels to paint; wait for ResizeObserver.
      if (w < 1 || h < 1) { scene = null; return; }
      el.width = w;
      el.height = h;
      el.style.width = `${w * pixelSize}px`;
      el.style.height = `${h * pixelSize}px`;
      scene = buildScene(themeId, day, w, h);
    };
    const draw = () => {
      if (scene && document.visibilityState !== 'hidden') paintScene(g, scene, reduce ? 2400 : performance.now() - start);
    };
    build();
    draw();
    const timer = reduce ? 0 : window.setInterval(draw, TICK_MS);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      build();
      draw();
    });
    ro?.observe(host);
    return () => {
      window.clearInterval(timer);
      ro?.disconnect();
    };
  }, [themeId, day, pixelSize, still]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-testid={testId}
      className={className ?? 'absolute top-0 left-0 pointer-events-none'}
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

export const StudioSkyBackdrop: React.FC = () => {
  const studioTheme = useThemeStore((s) => s.studioTheme);
  const colorScheme = useThemeStore((s) => s.colorScheme);
  if (!isSceneTheme(studioTheme)) return null;
  return (
    <SceneCanvas
      themeId={studioTheme}
      day={colorScheme === 'light'}
      testId="studio-sky-backdrop"
      className="absolute top-0 left-0 -z-10 pointer-events-none"
    />
  );
};
