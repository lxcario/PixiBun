'use client';

import React from 'react';

interface CardGoldenChainsProps {
  className?: string;
}

// Vertical Golden Chain Flank Strand (Spans top-to-bottom between corner brackets without touching them)
const GoldenFlankStrand: React.FC<{ isRight?: boolean }> = ({ isRight = false }) => (
  <div
    className={`absolute top-[18px] bottom-[18px] ${
      isRight ? 'right-[4px]' : 'left-[4px]'
    } w-[8px] flex flex-col justify-between items-center pointer-events-none select-none z-20 overflow-hidden`}
  >
    {/* Top Brass Anchor Clasp */}
    <svg width="8" height="4" className="pixelated shrink-0" style={{ shapeRendering: 'crispEdges' }}>
      <rect x="1" y="0" width="6" height="4" fill="var(--ink)" />
      <rect x="2" y="1" width="4" height="2" fill="var(--accent-gold)" />
      <rect x="2" y="1" width="2" height="1" fill="var(--primary-shine)" />
    </svg>

    {/* Seamless Repeating 16-Bit Golden Chain Body */}
    <div
      className="w-[8px] flex-1 my-0.5"
      style={{
        backgroundImage: 'repeating-linear-gradient(to bottom, var(--primary-bg) 0 2px, transparent 2px 8px, var(--primary-shade) 8px 10px), linear-gradient(to right, var(--ink) 0 1px, var(--primary-bg) 1px 3px, var(--ink) 3px 5px, var(--primary-shade) 5px 7px, var(--ink) 7px 8px)',
        backgroundRepeat: 'repeat-y',
        backgroundPosition: 'center top',
        imageRendering: 'pixelated',
        filter: 'drop-shadow(0 0 3px color-mix(in srgb, var(--primary-bg) 45%, transparent))',
      }}
    />

    {/* Bottom Brass Anchor Clasp */}
    <svg width="8" height="4" className="pixelated shrink-0" style={{ shapeRendering: 'crispEdges' }}>
      <rect x="1" y="0" width="6" height="4" fill="var(--ink)" />
      <rect x="2" y="1" width="4" height="2" fill="var(--accent-gold)" />
      <rect x="2" y="1" width="2" height="1" fill="var(--primary-shine)" />
    </svg>
  </div>
);

/**
 * 16-Bit Handcrafted Golden Pixel Chain Borders
 * Flanks card edges seamlessly between top and bottom corner brackets without overlapping them.
 */
export const CardGoldenChains: React.FC<CardGoldenChainsProps> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none select-none z-20 ${className}`}
    >
      {/* Left Golden Chain Border */}
      <GoldenFlankStrand isRight={false} />

      {/* Right Golden Chain Border */}
      <GoldenFlankStrand isRight={true} />
    </div>
  );
};
