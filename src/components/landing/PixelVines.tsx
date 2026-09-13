'use client';

import React from 'react';
import { useThemeStore } from '@/stores/themeStore';

/**
 * Handcrafted 16-Bit Theme-Adaptive Botanical Corner Vines
 * Fully GPU-optimized with dual composited layers for instant 60FPS theme switching.
 */

// 1. Blooming Flower with soft luminescence glow
const BloomingFlower: React.FC<{
  cx: number;
  cy: number;
  isLeft?: boolean;
  isGold?: boolean;
  isLight?: boolean;
}> = ({ cx, cy, isLeft = false, isGold = false, isLight = false }) => {
  const dir = isLeft ? -1 : 1;

  const pBase = isLight
    ? isGold ? '#f5ab35' : '#8e3ba8'
    : isGold ? '#f0be7c' : '#dcabdf';

  const pMid = isLight
    ? isGold ? '#c97718' : '#682480'
    : isGold ? '#c9842a' : '#a862c4';

  const pHigh = isLight
    ? isGold ? '#fff4d1' : '#fcebfd'
    : isGold ? '#fff8db' : '#ffffff';

  const pCore = isLight
    ? isGold ? '#ffffff' : '#ffd778'
    : isGold ? '#ffffff' : '#ffd778';

  const pShadow = isLight
    ? isGold ? '#8c4805' : '#3c104c'
    : isGold ? '#7a4b14' : '#421a5c';

  const outline = isLight ? '#2a153d' : '#140c1e';

  const glowColor = isLight
    ? isGold ? 'rgba(245, 171, 53, 0.75)' : 'rgba(142, 59, 168, 0.75)'
    : isGold ? 'rgba(240, 190, 124, 0.9)' : 'rgba(220, 171, 223, 0.9)';

  return (
    <g
      transform={`translate(${cx}, ${cy})`}
      style={{
        filter: `drop-shadow(0 0 3px ${glowColor})`,
      }}
    >
      {/* Stem Connector */}
      <rect x={dir * -2} y="-1" width="3" height="2" fill={isLight ? '#3c2254' : '#2a1640'} />
      <rect x={dir > 0 ? 0 : -2} y="-2" width="2" height="1" fill={isLight ? '#7e2b96' : '#653888'} />

      {/* Flower Petals Base */}
      <rect x={dir > 0 ? 1 : -9} y="-4" width="8" height="8" rx="1.5" fill={outline} />
      {/* 4 Outer Petals */}
      <rect x={dir > 0 ? 3 : -7} y="-5" width="4" height="2" fill={pBase} />
      <rect x={dir > 0 ? 3 : -7} y="3" width="4" height="2" fill={pBase} />
      <rect x={dir > 0 ? 0 : -10} y="-2" width="2" height="4" fill={pBase} />
      <rect x={dir > 0 ? 8 : -2} y="-2" width="2" height="4" fill={pBase} />

      {/* Petal Inner Highlights */}
      <rect x={dir > 0 ? 2 : -8} y="-3" width="6" height="6" fill={pMid} />
      <rect x={dir > 0 ? 3 : -7} y="-2" width="4" height="4" fill={pBase} />
      <rect x={dir > 0 ? 3 : -7} y="-3" width="2" height="1" fill={pHigh} />
      <rect x={dir > 0 ? 2 : -8} y="-2" width="1" height="2" fill={pHigh} />

      {/* Flower Center Stamen Core */}
      <rect x={dir > 0 ? 4 : -6} y="-1" width="2" height="2" fill={pShadow} />
      <rect x={dir > 0 ? 4 : -6} y="-1" width="1" height="1" fill={pCore} />
    </g>
  );
};

// 2. Single Pointed Leaflet
const VineLeaflet: React.FC<{
  x: number;
  y: number;
  angle?: number;
  isGold?: boolean;
  isLight?: boolean;
}> = ({ x, y, angle = 0, isGold = false, isLight = false }) => {
  const leafBody = isLight
    ? isGold ? '#d97818' : '#4a783e'
    : isGold ? '#d89a55' : '#603386';

  const leafHigh = isLight
    ? isGold ? '#f5b045' : '#70aa60'
    : isGold ? '#ffd778' : '#ab6fd6';

  const leafShad = isLight
    ? isGold ? '#8c4805' : '#2b4d22'
    : isGold ? '#7a4b14' : '#28133a';

  const outline = isLight ? '#2a153d' : '#12081c';

  return (
    <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
      <rect x="-2.5" y="-4" width="5" height="8" rx="1" fill={outline} />
      <rect x="-1.5" y="-3" width="3" height="6" fill={leafBody} />
      <rect x="-1.5" y="-3" width="3" height="2" fill={leafHigh} />
      <rect x="-1.5" y="1" width="3" height="2" fill={leafShad} />
    </g>
  );
};

// 3. Compact Ceiling Canopy Moss
const CeilingMoss: React.FC<{ x: number; w: number; h: number; isLight?: boolean }> = ({
  x,
  w,
  h,
  isLight = false,
}) => {
  const baseFill = isLight ? '#3c2254' : '#140c1e';
  const midFill = isLight ? '#4a783e' : '#3a1e58';
  const highFill = isLight ? '#6ea85e' : '#5e308c';
  const tipFill = isLight ? '#f5ab35' : '#dcabdf';

  return (
    <g transform={`translate(${x}, 0)`}>
      <polygon
        points={`0,0 ${w},0 ${w * 0.8},${h * 0.55} ${w * 0.65},${h * 0.85} ${w * 0.5},${h} ${w * 0.35},${h * 0.8} ${w * 0.18},${h * 0.45} 0,0`}
        fill={baseFill}
      />
      <polygon
        points={`2,0 ${w - 2},0 ${w * 0.78},${h * 0.45} ${w * 0.62},${h * 0.75} ${w * 0.5},${h - 2} ${w * 0.38},${h * 0.7} ${w * 0.2},${h * 0.35} 2,0`}
        fill={midFill}
      />
      <polygon
        points={`3,0 ${w - 3},0 ${w * 0.7},${h * 0.35} ${w * 0.5},${h * 0.55} ${w * 0.3},${h * 0.3} 3,0`}
        fill={highFill}
      />
      <circle cx={w * 0.5} cy={h * 0.4} r="1.5" fill={tipFill} />
    </g>
  );
};

// 4. Complete Flank Vine Cluster
const FlankVineCluster: React.FC<{ isRight?: boolean; isLight?: boolean }> = ({
  isRight = false,
  isLight = false,
}) => {
  const darkStem = isLight ? '#2a153d' : '#160a22';
  const stem1 = isLight ? '#3c2254' : '#603386';
  const stem2 = isLight ? '#4a783e' : '#552c78';
  const stem3 = isLight ? '#5c2e73' : '#8548a8';

  return (
    <svg
      className={`absolute top-0 ${isRight ? 'right-0' : 'left-0'} w-[240px] h-[185px] pointer-events-none pixelated overflow-visible`}
      style={{
        shapeRendering: 'crispEdges',
        transform: isRight ? 'scaleX(-1)' : 'none',
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 1. Ceiling Canopy Moss Base */}
      <CeilingMoss x={0} w={65} h={34} isLight={isLight} />
      <CeilingMoss x={48} w={75} h={42} isLight={isLight} />
      <CeilingMoss x={110} w={68} h={28} isLight={isLight} />
      <CeilingMoss x={165} w={55} h={20} isLight={isLight} />

      {/* Canopy Glowing Flowers */}
      <BloomingFlower cx={32} cy={12} isLight={isLight} />
      <BloomingFlower cx={82} cy={16} isLeft isGold isLight={isLight} />
      <BloomingFlower cx={135} cy={10} isLight={isLight} />

      {/* 2. Top Droop Arch Garland */}
      <g className="animate-sway-subtle" style={{ transformOrigin: '10px 0px' }}>
        <path
          d="M 5,0 Q 80,42 180,8"
          fill="none"
          stroke={darkStem}
          strokeWidth="3"
        />
        <path
          d="M 5,0 Q 80,42 180,8"
          fill="none"
          stroke={stem1}
          strokeWidth="1.5"
        />
        <BloomingFlower cx={50} cy={24} isLeft isLight={isLight} />
        <BloomingFlower cx={100} cy={30} isGold isLight={isLight} />
        <BloomingFlower cx={140} cy={22} isLeft isLight={isLight} />
        <VineLeaflet x={35} y={16} angle={30} isLight={isLight} />
        <VineLeaflet x={75} y={28} angle={15} isGold isLight={isLight} />
        <VineLeaflet x={120} y={26} angle={-20} isLight={isLight} />
        <VineLeaflet x={160} y={15} angle={-40} isGold isLight={isLight} />
      </g>

      {/* 3. VINE STRAND #1 */}
      <g className="animate-sway-slow" style={{ transformOrigin: '14px 0px' }}>
        <path
          d="M 14,0 Q 8,35 18,70 T 10,125 Q 16,145 12,160"
          fill="none"
          stroke={darkStem}
          strokeWidth="3"
        />
        <path
          d="M 14,0 Q 8,35 18,70 T 10,125 Q 16,145 12,160"
          fill="none"
          stroke={stem2}
          strokeWidth="1.5"
        />
        <path
          d="M 12,160 C 8,168 2,164 3,158 C 4,154 9,156 9,160"
          fill="none"
          stroke={stem2}
          strokeWidth="1"
        />
        <BloomingFlower cx={8} cy={35} isLeft isLight={isLight} />
        <BloomingFlower cx={16} cy={80} isGold isLight={isLight} />
        <BloomingFlower cx={10} cy={125} isLeft isLight={isLight} />
        <BloomingFlower cx={14} cy={152} isLight={isLight} />

        <VineLeaflet x={8} y={22} angle={-30} isLight={isLight} />
        <VineLeaflet x={16} y={55} angle={35} isGold isLight={isLight} />
        <VineLeaflet x={10} y={100} angle={-25} isLight={isLight} />
        <VineLeaflet x={14} y={140} angle={30} isGold isLight={isLight} />
      </g>

      {/* 4. VINE STRAND #2 */}
      <g className="animate-sway-medium" style={{ transformOrigin: '58px 0px' }}>
        <path
          d="M 58,0 Q 48,40 62,80 T 52,140 Q 60,162 56,175"
          fill="none"
          stroke={darkStem}
          strokeWidth="3"
        />
        <path
          d="M 58,0 Q 48,40 62,80 T 52,140 Q 60,162 56,175"
          fill="none"
          stroke={stem3}
          strokeWidth="1.5"
        />
        <path
          d="M 56,175 C 60,184 66,180 64,174 C 62,168 56,170 56,174"
          fill="none"
          stroke={stem3}
          strokeWidth="1"
        />
        <BloomingFlower cx={50} cy={26} isLeft isLight={isLight} />
        <BloomingFlower cx={60} cy={50} isGold isLight={isLight} />
        <BloomingFlower cx={50} cy={76} isLeft isLight={isLight} />
        <BloomingFlower cx={62} cy={102} isGold isLight={isLight} />
        <BloomingFlower cx={52} cy={128} isLeft isLight={isLight} />
        <BloomingFlower cx={60} cy={152} isGold isLight={isLight} />
        <BloomingFlower cx={55} cy={170} isLeft isLight={isLight} />

        <VineLeaflet x={60} y={38} angle={30} isGold isLight={isLight} />
        <VineLeaflet x={50} y={64} angle={-30} isLight={isLight} />
        <VineLeaflet x={60} y={90} angle={35} isLight={isLight} />
        <VineLeaflet x={50} y={116} angle={-25} isGold isLight={isLight} />
        <VineLeaflet x={60} y={140} angle={30} isLight={isLight} />
      </g>

      {/* 5. VINE STRAND #3 */}
      <g className="animate-sway-fast" style={{ transformOrigin: '105px 0px' }}>
        <path
          d="M 105,0 Q 112,28 100,58 T 106,115"
          fill="none"
          stroke={darkStem}
          strokeWidth="2.5"
        />
        <path
          d="M 105,0 Q 112,28 100,58 T 106,115"
          fill="none"
          stroke={stem1}
          strokeWidth="1.5"
        />
        <BloomingFlower cx={100} cy={35} isLeft isGold isLight={isLight} />
        <BloomingFlower cx={108} cy={80} isLight={isLight} />
        <BloomingFlower cx={102} cy={110} isLeft isGold isLight={isLight} />

        <VineLeaflet x={108} y={20} angle={30} isLight={isLight} />
        <VineLeaflet x={98} y={55} angle={-30} isGold isLight={isLight} />
        <VineLeaflet x={106} y={95} angle={25} isLight={isLight} />
      </g>

      {/* 6. VINE STRAND #4 */}
      <g className="animate-sway-subtle" style={{ transformOrigin: '145px 0px' }}>
        <path
          d="M 145,0 Q 150,22 142,45 T 146,75"
          fill="none"
          stroke={darkStem}
          strokeWidth="2"
        />
        <path
          d="M 145,0 Q 150,22 142,45 T 146,75"
          fill="none"
          stroke={stem2}
          strokeWidth="1"
        />
        <BloomingFlower cx={142} cy={35} isLeft isLight={isLight} />
        <BloomingFlower cx={146} cy={68} isGold isLight={isLight} />

        <VineLeaflet x={148} y={20} angle={30} isGold isLight={isLight} />
        <VineLeaflet x={140} y={52} angle={-25} isLight={isLight} />
      </g>
    </svg>
  );
};

export const PixelVines: React.FC = () => {
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  return (
    <div
      aria-hidden="true"
      className="absolute top-full left-0 right-0 w-full h-[185px] pointer-events-none z-0 select-none overflow-hidden"
    >
      {/* Dark Mode Layer */}
      <div
        className="atelier-vines-dark absolute inset-0 transition-opacity duration-300 will-change-opacity"
      >
        <FlankVineCluster isLight={false} />
        <FlankVineCluster isRight isLight={false} />
      </div>

      {/* Light Mode Layer */}
      <div
        className="atelier-vines-light absolute inset-0 transition-opacity duration-300 will-change-opacity"
      >
        <FlankVineCluster isLight={true} />
        <FlankVineCluster isRight isLight={true} />
      </div>
    </div>
  );
};
