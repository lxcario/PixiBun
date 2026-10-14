'use client';

import React, { useRef, useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { isSceneTheme } from '@/lib/theme/registry';
import { SceneCanvas } from '@/components/layout/StudioSkyBackdrop';

/**
 * The landing page's fixed background follows the studio theme. Scene themes
 * show the same animated pixel scene as their studio (behind a soft veil so
 * text stays readable); flat themes get a quiet wash of their own colors.
 * A soft glow follows the cursor in the theme's accent colors.
 */
export const CozyAtelierBackground: React.FC = () => {
  const studioTheme = useThemeStore((s) => s.studioTheme);
  const day = useThemeStore((s) => s.colorScheme) === 'light';
  const scene = isSceneTheme(studioTheme);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currX = mouseX;
    let currY = mouseY;
    let animId: number = 0;
    let isTracking = false;

    const updateGlow = () => {
      const dx = mouseX - currX;
      const dy = mouseY - currY;
      currX += dx * 0.09;
      currY += dy * 0.09;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${Math.round(currX - 320)}px, ${Math.round(currY - 320)}px, 0)`;
      }

      if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) {
        animId = requestAnimationFrame(updateGlow);
      } else {
        isTracking = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isTracking) {
        isTracking = true;
        animId = requestAnimationFrame(updateGlow);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    if (glowRef.current) {
      glowRef.current.style.transform = `translate3d(${Math.round(currX - 320)}px, ${Math.round(currY - 320)}px, 0)`;
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-colors duration-300"
      style={{ backgroundColor: 'var(--desk-bg)' }}
    >
      {scene ? (
        <>
          <SceneCanvas themeId={studioTheme} day={day} className="absolute top-0 left-0 pointer-events-none" />
          {/* A veil in the theme's own background color keeps section text readable over the scene */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: `linear-gradient(to bottom, color-mix(in srgb, var(--desk-bg) ${day ? 58 : 52}%, transparent), color-mix(in srgb, var(--desk-bg) ${day ? 40 : 30}%, transparent) 70%, color-mix(in srgb, var(--desk-bg) 15%, transparent))` }}
          />
        </>
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 70% 55% at 75% 20%, color-mix(in srgb, var(--accent-gold) 10%, transparent) 0%, transparent 70%),
              radial-gradient(ellipse 65% 50% at 20% 50%, color-mix(in srgb, var(--accent-wisteria) 10%, transparent) 0%, transparent 65%),
              radial-gradient(ellipse 75% 55% at 65% 80%, color-mix(in srgb, var(--accent-plum) 8%, transparent) 0%, transparent 75%)
            `,
          }}
        />
      )}

      {/* Cursor glow in the theme's accents */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="absolute top-0 left-0 w-[640px] h-[640px] pointer-events-none rounded-full select-none will-change-transform"
        style={{
          background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-gold) 14%, transparent) 0%, color-mix(in srgb, var(--accent-wisteria) 8%, transparent) 35%, transparent 70%)',
        }}
      />
    </div>
  );
};
