'use client';

import React, { useEffect, useRef } from 'react';
import { drawBun } from '@/lib/art/bunSprite';
import { useThemeStore } from '@/stores/themeStore';

// Logical pixel space; the backing store is this times SCALE.
const W = 192;
const H = 108;
const SCALE = 4;

// [x, y, phase, speed, big] - kept out of the moon box and off the crossbars.
const STARS: Array<readonly [number, number, number, number, boolean]> = [
  [14, 14, 0.0, 1.0, false],
  [20, 26, 1.7, 0.8, true],
  [26, 15, 3.1, 1.2, false],
  [33, 21, 4.4, 0.9, false],
  [30, 40, 0.9, 1.1, false],
  [16, 46, 2.6, 0.7, true],
  [24, 54, 5.2, 1.0, false],
  [34, 30, 3.8, 0.8, false],
  [44, 16, 1.2, 1.3, false],
  [47, 46, 4.9, 0.9, true],
  [41, 54, 2.2, 1.1, false],
  [52, 38, 0.4, 1.0, false],
  [56, 44, 3.5, 0.8, false],
  [63, 42, 5.8, 1.2, true],
  [66, 30, 1.9, 0.9, false],
  [60, 56, 4.1, 1.0, false],
  [28, 58, 2.9, 0.7, false],
  [49, 58, 0.7, 1.2, false],
];

function parseHex(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function lerpColor(c1: string, c2: string, t: number): string {
  if (t <= 0) return c1;
  if (t >= 1) return c2;
  const [r1, g1, b1] = parseHex(c1);
  const [r2, g2, b2] = parseHex(c2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

function fillCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fill: string
): void {
  ctx.fillStyle = fill;
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
  }
}

function drawWindow(ctx: CanvasRenderingContext2D, t: number, p: number): void {
  // Window frame
  const frameColor = lerpColor('#7a5644', '#8a6854', p);
  ctx.fillStyle = frameColor;
  ctx.fillRect(10, 10, 60, 54);

  // Clip window interior
  ctx.save();
  ctx.beginPath();
  ctx.rect(13, 13, 54, 48);
  ctx.clip();

  // Outside sky
  const skyColor = lerpColor('#191233', '#88c9ea', p);
  ctx.fillStyle = skyColor;
  ctx.fillRect(13, 13, 54, 48);

  // Moon (sets as p -> 1)
  if (p < 0.95) {
    const moonAlpha = Math.max(0, 1 - p * 1.4);
    ctx.save();
    ctx.globalAlpha = moonAlpha;
    fillCircle(ctx, 56, 24 + p * 15, 6, '#f4e9c8');
    ctx.fillStyle = '#e3d5a8';
    ctx.fillRect(54, 22 + p * 15, 2, 1);
    ctx.fillRect(58, 26 + p * 15, 1, 1);
    ctx.restore();

    // Stars (Night only)
    for (const [x, y, phase, speed, big] of STARS) {
      const alpha = (0.35 + 0.65 * Math.abs(Math.sin((t / 900) * speed + phase))) * moonAlpha;
      ctx.fillStyle = `rgba(244, 233, 200, ${alpha.toFixed(3)})`;
      ctx.fillRect(x, y, 1, 1);
      if (big && alpha > 0.85) {
        ctx.fillRect(x - 1, y, 1, 1);
        ctx.fillRect(x + 1, y, 1, 1);
        ctx.fillRect(x, y - 1, 1, 1);
        ctx.fillRect(x, y + 1, 1, 1);
      }
    }
  }

  // Sun (rises as p -> 1)
  if (p > 0.05) {
    const sunAlpha = p;
    ctx.save();
    ctx.globalAlpha = sunAlpha;
    const sunY = 24 + (1 - p) * 15;
    fillCircle(ctx, 26, sunY, 5, '#f0be7c');
    fillCircle(ctx, 26, sunY, 3, '#fff4d0');
    ctx.fillStyle = '#f0be7c';
    ctx.fillRect(25, sunY - 7, 2, 2);
    ctx.fillRect(25, sunY + 5, 2, 2);
    ctx.fillRect(19, sunY - 1, 2, 2);
    ctx.fillRect(31, sunY - 1, 2, 2);
    ctx.restore();
  }

  ctx.restore();

  // Muntins
  const muntinColor = lerpColor('#6a4a3a', '#745442', p);
  ctx.fillStyle = muntinColor;
  ctx.fillRect(38, 13, 3, 48);
  ctx.fillRect(13, 35, 54, 3);
}

function drawDesk(ctx: CanvasRenderingContext2D, p: number): void {
  const deskWood = lerpColor('#6e4f3e', '#9b765e', p);
  const deskPlank = lerpColor('#8f6a52', '#ba9379', p);
  const deskGrain = lerpColor('#5d4234', '#805d47', p);

  ctx.fillStyle = deskWood;
  ctx.fillRect(0, 78, W, 30);
  ctx.fillStyle = deskPlank;
  ctx.fillRect(0, 78, W, 1);
  ctx.fillStyle = deskGrain;
  ctx.fillRect(0, 86, 60, 1);
  ctx.fillRect(70, 86, 50, 1);
  ctx.fillRect(130, 86, 40, 1);
  ctx.fillRect(0, 95, 40, 1);
  ctx.fillRect(50, 95, 80, 1);
  ctx.fillRect(140, 95, 52, 1);
  ctx.fillRect(0, 103, 90, 1);
  ctx.fillRect(100, 103, 92, 1);
  ctx.fillStyle = `rgba(12, 8, 18, ${(0.3 * (1 - p * 0.4)).toFixed(3)})`;
  ctx.fillRect(0, 106, W, 2);
}

function drawLamp(ctx: CanvasRenderingContext2D, t: number, p: number): void {
  const flicker = 0.04 * Math.sin(t / 140) + 0.03 * Math.sin(t / 47);
  const glow = ctx.createRadialGradient(156, 52, 4, 156, 52, 34);
  glow.addColorStop(0, `rgba(240, 190, 124, ${((0.38 + flicker) * (1 - p * 0.4)).toFixed(3)})`);
  glow.addColorStop(1, 'rgba(240, 190, 124, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(118, 14, 76, 78);

  ctx.fillStyle = lerpColor('#4a3542', '#6b5463', p);
  ctx.fillRect(155, 50, 2, 24);
  ctx.fillRect(150, 74, 12, 3);
  ctx.fillStyle = lerpColor('#5d4234', '#805e4c', p);
  ctx.fillRect(150, 74, 12, 1);
  ctx.fillStyle = '#f0be7c';
  ctx.fillRect(152, 44, 8, 1);
  ctx.fillRect(151, 45, 10, 1);
  ctx.fillRect(150, 46, 12, 1);
  ctx.fillRect(149, 47, 14, 1);
  ctx.fillStyle = '#d89a55';
  ctx.fillRect(148, 48, 16, 1);
}

function drawMug(ctx: CanvasRenderingContext2D, t: number, p: number): void {
  ctx.fillStyle = `rgba(12, 8, 18, ${(0.25 * (1 - p * 0.4)).toFixed(3)})`;
  ctx.fillRect(103, 78, 14, 1);
  ctx.fillStyle = '#fbf3e4';
  ctx.fillRect(104, 66, 12, 12);
  ctx.fillRect(117, 69, 2, 1);
  ctx.fillRect(118, 70, 1, 3);
  ctx.fillRect(117, 73, 2, 1);
  ctx.fillStyle = '#c792df';
  ctx.fillRect(104, 70, 12, 2);
  ctx.fillStyle = '#e6dff0';
  ctx.fillRect(104, 66, 12, 1);

  for (let i = 0; i < 3; i++) {
    const prog = (t / 1400 + i * 0.33) % 1;
    const alpha = (1 - prog) * 0.5;
    const xoff = Math.round(Math.sin(prog * 6 + i * 2.1) * 1.5);
    ctx.fillStyle = `rgba(207, 196, 222, ${alpha.toFixed(3)})`;
    ctx.fillRect(106 + i * 4 + xoff, Math.round(64 - prog * 16), 1, 2);
  }
}

function drawPlant(ctx: CanvasRenderingContext2D, p: number): void {
  ctx.fillStyle = `rgba(12, 8, 18, ${(0.25 * (1 - p * 0.4)).toFixed(3)})`;
  ctx.fillRect(23, 78, 12, 1);
  ctx.fillStyle = '#9bb08a';
  ctx.fillRect(26, 60, 2, 10);
  ctx.fillRect(30, 62, 2, 8);
  ctx.fillRect(22, 64, 2, 6);
  ctx.fillRect(27, 58, 1, 2);
  ctx.fillRect(31, 60, 1, 2);
  ctx.fillStyle = '#b06a4e';
  ctx.fillRect(24, 70, 10, 8);
  ctx.fillStyle = '#c07a5a';
  ctx.fillRect(23, 70, 12, 2);
}

export const DeskScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useThemeStore();
  const themeProgressRef = useRef<number>(theme === 'light' ? 1.0 : 0.0);
  const targetProgressRef = useRef<number>(theme === 'light' ? 1.0 : 0.0);

  useEffect(() => {
    targetProgressRef.current = theme === 'light' ? 1.0 : 0.0;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    ctx.imageSmoothingEnabled = false;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = (t: number) => {
      if (reduced) {
        themeProgressRef.current = targetProgressRef.current;
      } else {
        const diff = targetProgressRef.current - themeProgressRef.current;
        if (Math.abs(diff) > 0.001) {
          themeProgressRef.current += diff * 0.095;
        } else {
          themeProgressRef.current = targetProgressRef.current;
        }
      }
      const p = themeProgressRef.current;

      // Wall with a whisper of dither
      const wallColor = lerpColor('#251b30', '#ded4e5', p);
      ctx.fillStyle = wallColor;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = `rgba(244, 240, 248, ${(0.03 * (1 - p * 0.5)).toFixed(3)})`;
      for (let y = 0; y < 78; y += 4) {
        for (let x = (y / 4) % 2 ? 2 : 0; x < W; x += 8) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      drawWindow(ctx, t, p);
      drawDesk(ctx, p);

      // Lamp glow pools over everything on the right side of the desk
      const flicker = 0.04 * Math.sin(t / 140) + 0.03 * Math.sin(t / 47);
      const glow = ctx.createRadialGradient(156, 52, 4, 156, 52, 40);
      glow.addColorStop(0, `rgba(240, 190, 124, ${((0.22 + flicker) * (1 - p * 0.3)).toFixed(3)})`);
      glow.addColorStop(1, 'rgba(240, 190, 124, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(110, 10, 82, 96);

      drawPlant(ctx, p);
      drawMug(ctx, t, p);

      // Bun sits on the desk edge, feet on the top plank
      const blinking = reduced ? false : t % 3400 < 160;
      drawBun(ctx, 58, 62, blinking ? 'blink' : 'idle');

      drawLamp(ctx, t, p);

      const vig = ctx.createRadialGradient(96, 46, 40, 96, 50, 125);
      vig.addColorStop(0, 'rgba(12, 8, 18, 0)');
      vig.addColorStop(1, `rgba(12, 8, 18, ${(0.4 * (1 - p * 0.7)).toFixed(3)})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);
    };

    if (reduced) {
      draw(2500);
      return;
    }

    let raf = 0;
    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-auto pixelated"
      role="img"
      aria-label="A pixel desk with day and night transitions: window with sun or stars, glowing lamp, steaming mug, plant, and Bun the rabbit"
    />
  );
};
