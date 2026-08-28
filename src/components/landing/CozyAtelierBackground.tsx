'use client';

import React, { useRef, useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { CozyAtelierShelvesBackground } from '@/components/landing/CozyAtelierShelvesBackground';

/**
 * CozyAtelierBackground - Authentic Warm Lamplit Desk Atmosphere (DESIGN.md)
 * Features soft ambient amber & wisteria radiance, responsive cursor candlelight tracking,
 * and compact handcrafted 16-bit side shelves.
 */
export const CozyAtelierBackground: React.FC = () => {
  const { theme } = useThemeStore();
  const isLight = theme === 'light';
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

    // Initial position placement
    if (glowRef.current) {
      glowRef.current.style.transform = `translate3d(${Math.round(currX - 320)}px, ${Math.round(currY - 320)}px, 0)`;
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* 1. Dark Mode Base Layer (Hardware Composited) */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 transition-opacity duration-300 will-change-opacity ${
          isLight ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          backgroundColor: '#140c1e',
          backgroundImage: `
            radial-gradient(ellipse 70% 55% at 75% 20%, rgba(240, 190, 124, 0.10) 0%, rgba(60, 28, 72, 0.25) 45%, transparent 75%),
            radial-gradient(ellipse 65% 50% at 20% 50%, rgba(199, 146, 223, 0.12) 0%, transparent 65%),
            radial-gradient(ellipse 75% 55% at 65% 80%, rgba(220, 171, 223, 0.08) 0%, transparent 75%)
          `,
        }}
      />

      {/* 2. Light Mode Base Layer (Hardware Composited) */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 transition-opacity duration-300 will-change-opacity ${
          isLight ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundColor: '#fbf8f3',
          backgroundImage: `
            radial-gradient(ellipse 70% 55% at 75% 20%, rgba(240, 190, 124, 0.12) 0%, rgba(255, 240, 220, 0.4) 35%, transparent 70%),
            radial-gradient(ellipse 65% 50% at 20% 55%, rgba(220, 171, 223, 0.12) 0%, transparent 65%),
            radial-gradient(ellipse 75% 55% at 65% 85%, rgba(240, 190, 124, 0.10) 0%, transparent 70%)
          `,
        }}
      />

      {/* 3. Warm Interactive Cursor Lamplight Glow */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="absolute top-0 left-0 w-[640px] h-[640px] pointer-events-none rounded-full select-none will-change-transform"
        style={{
          background: isLight
            ? 'radial-gradient(circle, rgba(240, 190, 124, 0.15) 0%, rgba(220, 171, 223, 0.08) 35%, transparent 70%)'
            : 'radial-gradient(circle, rgba(240, 190, 124, 0.16) 0%, rgba(199, 146, 223, 0.10) 35%, transparent 70%)',
        }}
      />

      {/* 4. Compact Handcrafted 16-Bit Side Shelves */}
      <CozyAtelierShelvesBackground />
    </div>
  );
};

