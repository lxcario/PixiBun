'use client';

import React from 'react';

/**
 * Cozy Ambient Atelier Background
 * Features:
 * - Deep velvet midnight violet base (#1a1326)
 * - Soft radial ambient warmth glowing around the center desk
 * - Subtle, delicate 4px micro-dot texture (barely perceptible texture, no checkerboard)
 * - Atmospheric room vignette on the flanks
 */
export const CozyAutoShadedBackdrop: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden"
    >
      {/* 1. Base Ambient Desk Canvas */}
      <div className="absolute inset-0 bg-[var(--desk-bg)] transition-colors duration-300" />

      {/* 2. Delicate Micro-Dot Grain (Ultra-Subtle Retro Texture) */}
      <div
        className="absolute inset-0 opacity-[0.035] pixelated"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '8px 8px',
          imageRendering: 'pixelated',
        }}
      />

      {/* 3. Warm Ambient Hearth & Desk Lamp Radial Lighting */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 45% at 50% 18%, rgba(240, 190, 124, 0.11) 0%, rgba(199, 146, 223, 0.04) 45%, transparent 70%),
            radial-gradient(ellipse 65% 55% at 50% 60%, rgba(220, 171, 223, 0.05) 0%, transparent 65%),
            linear-gradient(90deg, rgba(14, 9, 22, 0.75) 0%, rgba(14, 9, 22, 0.25) 10%, transparent 20%, transparent 80%, rgba(14, 9, 22, 0.25) 90%, rgba(14, 9, 22, 0.75) 100%),
            linear-gradient(180deg, rgba(14, 9, 22, 0.4) 0%, transparent 12%, transparent 88%, rgba(14, 9, 22, 0.8) 100%)
          `,
        }}
      />
    </div>
  );
};
