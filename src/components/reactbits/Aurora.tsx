'use client';

import React from 'react';

interface AuroraProps {
  colorStops?: string[];
  speed?: number;
  className?: string;
}

/**
 * Cozy Velvet Aurora (React Bits customized for PixiBun)
 * Creates a unique, dreamy, breathing twilight background with deep midnight violet,
 * wisteria heather, and warm golden hearth glow that organically shifts behind the atelier.
 */
export const Aurora: React.FC<AuroraProps> = ({
  colorStops = ['#432657', '#6c3b7a', '#c792df', '#f0be7c'],
  speed = 12,
  className = '',
}) => {
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none select-none z-0 overflow-hidden bg-[#160f24] ${className}`}
    >
      {/* 1. Deep Midnight Base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#140c20] via-[#1a1226] to-[#120a1c]" />

      {/* 2. Organic Animated Aurora Mesh Blobs */}
      <div className="absolute inset-0 opacity-40 filter blur-[80px] overflow-hidden">
        {/* Blob 1: Warm Golden Hearth (Left to Center) */}
        <div
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full animate-aurora-1 mix-blend-screen"
          style={{
            background: `radial-gradient(circle, ${colorStops[3]} 0%, ${colorStops[0]} 55%, transparent 75%)`,
            animationDuration: `${speed * 1.2}s`,
          }}
        />

        {/* Blob 2: Velvet Wisteria & Plum (Right to Center) */}
        <div
          className="absolute top-[15%] -right-[15%] w-[65vw] h-[65vw] rounded-full animate-aurora-2 mix-blend-screen"
          style={{
            background: `radial-gradient(circle, ${colorStops[2]} 0%, ${colorStops[1]} 50%, transparent 75%)`,
            animationDuration: `${speed}s`,
          }}
        />

        {/* Blob 3: Deep Atmospheric Heather (Center Bottom) */}
        <div
          className="absolute -bottom-[20%] left-[20%] w-[80vw] h-[60vw] rounded-full animate-aurora-3 mix-blend-screen"
          style={{
            background: `radial-gradient(circle, ${colorStops[1]} 0%, ${colorStops[0]} 60%, transparent 80%)`,
            animationDuration: `${speed * 1.5}s`,
          }}
        />
      </div>

      {/* 3. Handcrafted 16-Bit Pixel Stars & Constellations Overlay */}
      <div
        className="absolute inset-0 opacity-25 pixelated"
        style={{
          backgroundImage: `
            radial-gradient(1.5px 1.5px at 15% 25%, #fff8db 100%, transparent 0),
            radial-gradient(2px 2px at 35% 15%, #f0be7c 100%, transparent 0),
            radial-gradient(1.5px 1.5px at 72% 30%, #dcabdf 100%, transparent 0),
            radial-gradient(2px 2px at 85% 18%, #fff8db 100%, transparent 0),
            radial-gradient(1px 1px at 50% 45%, #ffffff 100%, transparent 0),
            radial-gradient(1.5px 1.5px at 28% 70%, #dcabdf 100%, transparent 0),
            radial-gradient(2px 2px at 62% 75%, #f0be7c 100%, transparent 0),
            radial-gradient(1px 1px at 90% 65%, #fff8db 100%, transparent 0),
            radial-gradient(1.5px 1.5px at 8% 85%, #ffffff 100%, transparent 0),
            radial-gradient(2px 2px at 45% 90%, #dcabdf 100%, transparent 0)
          `,
          backgroundSize: '320px 320px',
          imageRendering: 'pixelated',
        }}
      />

      {/* 4. Atmospheric Vignette & Soft Center Focus */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 70% at 50% 40%, transparent 40%, rgba(14, 9, 22, 0.75) 100%),
            linear-gradient(90deg, rgba(14, 9, 22, 0.6) 0%, transparent 15%, transparent 85%, rgba(14, 9, 22, 0.6) 100%),
            linear-gradient(180deg, rgba(14, 9, 22, 0.4) 0%, transparent 12%, transparent 88%, rgba(14, 9, 22, 0.7) 100%)
          `,
        }}
      />
    </div>
  );
};
