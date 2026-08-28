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
      <rect x="1" y="0" width="6" height="4" fill="#241708" />
      <rect x="2" y="1" width="4" height="2" fill="#f0be7c" />
      <rect x="2" y="1" width="2" height="1" fill="#fff8db" />
    </svg>

    {/* Seamless Repeating 16-Bit Golden Chain Body */}
    <div
      className="w-[8px] flex-1 my-0.5"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='10' viewBox='0 0 8 10'%3E%3Crect x='1' y='0' width='6' height='10' fill='%23241708'/%3E%3Crect x='2' y='1' width='4' height='8' fill='%23d89a55'/%3E%3Crect x='2' y='1' width='2' height='6' fill='%23f0be7c'/%3E%3Crect x='2' y='1' width='1' height='2' fill='%23fff8db'/%3E%3Crect x='4' y='5' width='2' height='3' fill='%238c5a28'/%3E%3Crect x='3' y='3' width='2' height='4' fill='%23241a32'/%3E%3Crect x='2.5' y='8' width='3' height='2' fill='%23f0be7c'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat-y',
        backgroundPosition: 'center top',
        imageRendering: 'pixelated',
        filter: 'drop-shadow(0 0 3px rgba(240, 190, 124, 0.45))',
      }}
    />

    {/* Bottom Brass Anchor Clasp */}
    <svg width="8" height="4" className="pixelated shrink-0" style={{ shapeRendering: 'crispEdges' }}>
      <rect x="1" y="0" width="6" height="4" fill="#241708" />
      <rect x="2" y="1" width="4" height="2" fill="#f0be7c" />
      <rect x="2" y="1" width="2" height="1" fill="#fff8db" />
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
