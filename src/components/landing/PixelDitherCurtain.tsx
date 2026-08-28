'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// 8x8 Bayer Ordered Dithering Matrix (Normalized 0 to 63)
const BAYER_8X8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

export const PixelDitherCurtain: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const isDoneRef = useRef(false);

  const dismiss = useCallback(() => {
    if (isDoneRef.current) return;
    isDoneRef.current = true;
    setDismissed(true);
  }, []);

  useEffect(() => {
    // Respect reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      dismiss();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      dismiss();
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      dismiss();
      return;
    }

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const resize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    const BLOCK_SIZE = 8; // 8px chunky retro pixel blocks
    const DURATION = 1100; // 1.1s smooth 16-bit dither dissolve

    // Draw initial 100% solid curtain on canvas, then remove solid CSS backdrop
    ctx.fillStyle = '#1e1730';
    ctx.fillRect(0, 0, width, height);
    setHasStarted(true);

    let rafId = 0;
    let startTime: number | null = null;

    // Hard fallback timer: always unmount after 1.5s
    const safetyTimer = setTimeout(() => {
      dismiss();
    }, 1500);

    const render = (now: number) => {
      if (isDoneRef.current) return;
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / DURATION);

      ctx.clearRect(0, 0, width, height);

      if (progress >= 1) {
        dismiss();
        return;
      }

      const cols = Math.ceil(width / BLOCK_SIZE);
      const rows = Math.ceil(height / BLOCK_SIZE);
      const centerX = cols / 2;
      const centerY = rows / 2;
      const maxDist = Math.hypot(centerX, centerY);

      ctx.fillStyle = '#1e1730'; // Midnight plum atelier curtain

      // Punchy ease-in ease-out
      const curvedProgress = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const bayerValue = BAYER_8X8[r % 8][c % 8] / 64;

          // Radial circular dissolve from center outwards
          const dist = Math.hypot(c - centerX, r - centerY) / maxDist;
          const threshold = curvedProgress * 1.6 - dist * 0.6;

          if (threshold < bayerValue) {
            ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
          }
        }
      }

      // Warm amber phosphor beam flare
      if (progress > 0.06 && progress < 0.52) {
        const flareAlpha = Math.sin(((progress - 0.06) / 0.46) * Math.PI) * 0.4;
        ctx.fillStyle = `rgba(240, 190, 124, ${flareAlpha})`;
        ctx.fillRect(0, height * 0.48, width, 3);
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        dismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(safetyTimer);
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dismiss]);

  if (dismissed) return null;

  return (
    <div
      className={`fixed inset-0 z-50 pointer-events-auto cursor-pointer select-none transition-colors duration-100 ${
        hasStarted ? 'bg-transparent' : 'bg-[#1e1730]'
      }`}
      onClick={dismiss}
      title="Click or press ESC to skip"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block pixelated pointer-events-none"
      />
      {/* 16-Bit Skip Hint Badge */}
      <div className="absolute top-4 right-4 px-3 py-1.5 bg-[#1e1730] border-2 border-[#3a2e4c] rounded-[1px] text-[#f0be7c] font-mono text-[10px] tracking-wider shadow-[0_3px_0_#130e20] pointer-events-auto">
        CLICK OR ESC TO SKIP ✦
      </div>
    </div>
  );
};
