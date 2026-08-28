'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { lofiRadio, RadioState } from '@/lib/audio/lofiRadio';
import { IconHintLamp, IconHintRadio, IconHintPen } from './AtelierIcons';
import { PixelCorners } from './CozyScrollReveal';
import { BorderGlow } from '@/components/reactbits/BorderGlow';
import { useThemeStore } from '@/stores/themeStore';

// Backing logical pixel canvas dimensions
const W = 520;
const H = 360;
const SCALE = 2; // High-DPI crisp integer rendering

// Tablet internal canvas dimensions
const TAB_COLS = 26;
const TAB_ROWS = 18;

// PixiBun Signature Palette for Studio
const TAB_PALETTE = [
  { name: 'Plum Ink', hex: '#3a2e4c' },
  { name: 'Plum', hex: '#dcabdf' },
  { name: 'Wisteria', hex: '#c792df' },
  { name: 'Thistle', hex: '#d0c4df' },
  { name: 'Alabaster', hex: '#dddfdf' },
  { name: 'Amber', hex: '#f0be7c' },
];

// Cozy Starter Pixel Cottage on the tablet
const COTTAGE_ART: string[] = [
  '..........................',
  '..........................',
  '...........11.............',
  '..........1331............',
  '.........133331...........',
  '........13333331..........',
  '.......1333333331.........',
  '.......1111111111.........',
  '.......1444444441.........',
  '.......1466446641.........',
  '.......1466446641.........',
  '.......1444224441.........',
  '.......1444224441.........',
  '......111111111111........',
  '.....16666666666661.......',
  '....1666666666666661......',
  '..........................',
  '..........................',
];

interface CatHeartParticle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
}

// Pre-parsed RGB color table for high-performance zero-garbage frame lerping
function parseHex(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

const THEME_COLORS = {
  wallBase: [parseHex('#4a3d68'), parseHex('#ede4d8')],
  mortar: [parseHex('#1e1730'), parseHex('#d4c5b2')],
  brickFace: [parseHex('#6a5880'), parseHex('#faf4ec')],
  brickShadow: [parseHex('#3a2e4c'), parseHex('#dfd0bf')],
  winTrimOuter: [parseHex('#1e1730'), parseHex('#442a5c')],
  winTrimInner: [parseHex('#3a2e4c'), parseHex('#664482')],
  winTrimHighlight: [parseHex('#6a5880'), parseHex('#d8cce4')],
  skyTop: [parseHex('#140f22'), parseHex('#7ec4ea')],
  skyMid: [parseHex('#1e1730'), parseHex('#a8dcf4')],
  skyBot: [parseHex('#2e2547'), parseHex('#fee5c8')],
  skyLineBack: [parseHex('#100c1c'), parseHex('#9886a8')],
  skyLineFront: [parseHex('#191228'), parseHex('#b0a0be')],
  skyLineRoof: [parseHex('#261c36'), parseHex('#d8cbe2')],
  winGlint: [parseHex('#f0be7c'), parseHex('#ffffff')],
  muntinOuter: [parseHex('#2e2547'), parseHex('#442a5c')],
  muntinInner: [parseHex('#3a2e4c'), parseHex('#785894')],
  catOutline: [parseHex('#1e1730'), parseHex('#381c47')],
  catBodyFur: [parseHex('#ede8f4'), parseHex('#faf7fc')],
  catMarkings: [parseHex('#d0c4df'), parseHex('#d8cee0')],
  catEarPink: [parseHex('#dcabdf'), parseHex('#e4b6e8')],
  wire: [parseHex('#1e1730'), parseHex('#442a5c')],
  posterBg: [parseHex('#2a2130'), parseHex('#c2e3f8')],
  deskBase: [parseHex('#1e1730'), parseHex('#442a5c')],
  deskPlank: [parseHex('#2a2130'), parseHex('#c29976')],
  deskGrain: [parseHex('#3a2c42'), parseHex('#ddba9c')],
  shelfBase: [parseHex('#1e1730'), parseHex('#442a5c')],
  shelfMid: [parseHex('#3a2e4c'), parseHex('#664482')],
  shelfHigh: [parseHex('#6a5880'), parseHex('#d8cce4')],
  radioBase: [parseHex('#1e1730'), parseHex('#442a5c')],
  radioMid: [parseHex('#3a2e4c'), parseHex('#664482')],
  radioHigh: [parseHex('#4a3d68'), parseHex('#8a66a3')],
  lampBase: [parseHex('#1e1730'), parseHex('#442a5c')],
  lampMid: [parseHex('#3a2e4c'), parseHex('#664482')],
  lampHigh: [parseHex('#6a5880'), parseHex('#d8cce4')],
  lampHood: [parseHex('#1e1730'), parseHex('#442a5c')],
} as const;

const COLOR_CACHE = new WeakMap<readonly [number[], number[]], [string, string]>();

function getStaticString(pair: readonly [number[], number[]], idx: 0 | 1): string {
  let cached = COLOR_CACHE.get(pair);
  if (!cached) {
    cached = [
      `rgb(${pair[0][0]},${pair[0][1]},${pair[0][2]})`,
      `rgb(${pair[1][0]},${pair[1][1]},${pair[1][2]})`,
    ];
    COLOR_CACHE.set(pair, cached);
  }
  return cached[idx];
}

function lerpRGB(pair: readonly [number[], number[]], t: number): string {
  if (t <= 0.001) return getStaticString(pair, 0);
  if (t >= 0.999) return getStaticString(pair, 1);
  const [r1, g1, b1] = pair[0];
  const [r2, g2, b2] = pair[1];
  const r = (r1 + (r2 - r1) * t) | 0;
  const g = (g1 + (g2 - g1) * t) | 0;
  const b = (b1 + (b2 - b1) * t) | 0;
  return `rgb(${r},${g},${b})`;
}

export const AtelierDeskScene: React.FC = () => {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useThemeStore();
  const [lampLit, setLampLit] = useState(true);
  const [radioState, setRadioState] = useState<RadioState>({
    isPlaying: false,
    trackTitle: 'lo-fi beats',
    volume: 0.6,
  });

  // Time-based 450ms smooth cubic-ease transition
  const themeProgressRef = useRef<number>(theme === 'light' ? 1.0 : 0.0);
  const transitionStartRef = useRef<number>(0);
  const transitionFromRef = useRef<number>(theme === 'light' ? 1.0 : 0.0);
  const transitionToRef = useRef<number>(theme === 'light' ? 1.0 : 0.0);

  useEffect(() => {
    const target = theme === 'light' ? 1.0 : 0.0;
    if (target !== transitionToRef.current) {
      transitionFromRef.current = themeProgressRef.current;
      transitionToRef.current = target;
      transitionStartRef.current = performance.now();
    }
  }, [theme]);

  // Tablet drawing state
  const tabletCells = useRef<Uint8Array>(new Uint8Array(TAB_COLS * TAB_ROWS));
  const activeColorIndex = useRef<number>(2); // default Plum
  const isDrawing = useRef(false);
  const [selectedColor, setSelectedColor] = useState<number>(2);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  const catHeartsRef = useRef<CatHeartParticle[]>([]);

  // Initialize tablet with starter cottage
  useEffect(() => {
    COTTAGE_ART.forEach((row, r) => {
      for (let c = 0; c < row.length && c < TAB_COLS; c++) {
        const char = row[c];
        if (char !== '.') {
          const val = parseInt(char, 10);
          tabletCells.current[r * TAB_COLS + c] = val;
        }
      }
    });
  }, []);

  // Subscribe to audio engine
  useEffect(() => {
    const unsub = lofiRadio.subscribe((state) => {
      setRadioState(state);
    });
    return () => unsub();
  }, []);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    ctx.imageSmoothingEnabled = false;

    let rafId = 0;
    const startTime = performance.now();
    let isVisible = true;
    let isTabVisible = !document.hidden;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && isVisible) {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisible = entry.isIntersecting;
          if (isVisible && isTabVisible) {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(render);
          }
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    // Raindrops for nighttime weather
    const raindrops = Array.from({ length: 32 }, () => ({
      x: 145 + Math.floor(Math.random() * 225),
      y: 18 + Math.floor(Math.random() * 160),
      speed: 1.2 + Math.random() * 1.5,
      len: 3 + Math.floor(Math.random() * 3),
      alpha: 0.35 + Math.random() * 0.4,
    }));

    // Floating pixel dust motes / sunbeams
    const dustMotes = Array.from({ length: 22 }, () => ({
      x: 90 + Math.floor(Math.random() * 260),
      y: 150 + Math.floor(Math.random() * 150),
      vx: (Math.random() - 0.5) * 0.18,
      vy: -0.08 - Math.random() * 0.16,
      alpha: 0.3 + Math.random() * 0.4,
      size: Math.random() > 0.6 ? 2 : 1,
    }));

    // Drifting daytime morning clouds
    const clouds = [
      { x: 150, y: 24, w: 40, speed: 0.12 },
      { x: 230, y: 42, w: 54, speed: 0.16 },
      { x: 310, y: 18, w: 36, speed: 0.10 },
    ];

    const render = (currentTime: number) => {
      if (!isVisible || !isTabVisible) return;
      const t = currentTime - startTime;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // 450ms Cubic Ease-Out Transition
      if (reducedMotion) {
        themeProgressRef.current = transitionToRef.current;
      } else {
        const elapsed = (currentTime - transitionStartRef.current) / 450;
        if (elapsed >= 1) {
          themeProgressRef.current = transitionToRef.current;
        } else if (elapsed > 0) {
          const ease = 1 - Math.pow(1 - elapsed, 3);
          themeProgressRef.current = transitionFromRef.current + (transitionToRef.current - transitionFromRef.current) * ease;
        }
      }
      const p = themeProgressRef.current; // 0.0 (dark) to 1.0 (light)

      // ==========================================
      // 1. EXPANDED ROOM WALL PERSPECTIVE (y = 0 to 225)
      // ==========================================
      const deskY = 225 * SCALE;

      // Wall base color smoothly interpolates
      ctx.fillStyle = lerpRGB(THEME_COLORS.wallBase, p);
      ctx.fillRect(0, 0, W * SCALE, H * SCALE);

      // Batched Brick Texture Rendering for maximum 60FPS performance
      const mortarColor = lerpRGB(THEME_COLORS.mortar, p);
      const brickFaceColor = lerpRGB(THEME_COLORS.brickFace, p);
      const brickShadowColor = lerpRGB(THEME_COLORS.brickShadow, p);

      // Pass 1: Horizontal mortar lines
      ctx.fillStyle = mortarColor;
      for (let y = 0; y < 220; y += 14) {
        ctx.fillRect(0, y * SCALE, W * SCALE, 1 * SCALE);
      }

      // Pass 2: Brick faces
      ctx.fillStyle = brickFaceColor;
      for (let y = 0; y < 220; y += 14) {
        const offset = (y / 14) % 2 === 0 ? 0 : 20;
        for (let x = offset; x < W; x += 40) {
          ctx.fillRect((x + 1) * SCALE, (y + 1) * SCALE, 38 * SCALE, 12 * SCALE);
        }
      }

      // Pass 3: Vertical mortar shadows
      ctx.fillStyle = brickShadowColor;
      for (let y = 0; y < 220; y += 14) {
        const offset = (y / 14) % 2 === 0 ? 0 : 20;
        for (let x = offset; x < W; x += 40) {
          ctx.fillRect(x * SCALE, y * SCALE, 1 * SCALE, 14 * SCALE);
        }
      }

      // ==========================================
      // 2. LARGE EXPANDED WINDOW (y = 16 to 195)
      // ==========================================
      const winX = 145 * SCALE;
      const winY = 16 * SCALE;
      const winW = 230 * SCALE;
      const winH = 175 * SCALE;

      // Window Wood Trim Frame
      ctx.fillStyle = lerpRGB(THEME_COLORS.winTrimOuter, p);
      ctx.fillRect(winX - 8 * SCALE, winY - 8 * SCALE, winW + 16 * SCALE, winH + 16 * SCALE);
      ctx.fillStyle = lerpRGB(THEME_COLORS.winTrimInner, p);
      ctx.fillRect(winX - 6 * SCALE, winY - 6 * SCALE, winW + 12 * SCALE, winH + 12 * SCALE);
      ctx.fillStyle = lerpRGB(THEME_COLORS.winTrimHighlight, p);
      ctx.fillRect(winX - 6 * SCALE, winY - 6 * SCALE, winW + 12 * SCALE, 2 * SCALE);
      ctx.fillRect(winX - 6 * SCALE, winY - 6 * SCALE, 2 * SCALE, winH + 12 * SCALE);

      // =========================================================
      // STRICT WINDOW CLIPPING REGION: Everything outside stays inside!
      // =========================================================
      ctx.save();
      ctx.beginPath();
      ctx.rect(winX, winY, winW, winH);
      ctx.clip();

      // Outside Window Sky (Transition: Midnight Rainy Violet <-> Crisp Morning Azure & Peach)
      ctx.fillStyle = lerpRGB(THEME_COLORS.skyTop, p);
      ctx.fillRect(winX, winY, winW, winH);
      ctx.fillStyle = lerpRGB(THEME_COLORS.skyMid, p);
      ctx.fillRect(winX, winY + 45 * SCALE, winW, winH - 45 * SCALE);
      ctx.fillStyle = lerpRGB(THEME_COLORS.skyBot, p);
      ctx.fillRect(winX, winY + 95 * SCALE, winW, winH - 95 * SCALE);

      // A. GLOWING CRESCENT MOON (Prominent at night p=0, sets down & fades as p->1)
      if (p < 0.98) {
        const moonBloomAlpha = (1 - p);
        const moonX = winX + winW - (58 - p * 20) * SCALE;
        const moonY = winY + (36 + p * 60) * SCALE;
        const moonRadius = 12 * SCALE;

        // Soft Warm Radial Bloom Halo around the moon
        const moonBloom = ctx.createRadialGradient(
          moonX,
          moonY,
          2 * SCALE,
          moonX,
          moonY,
          34 * SCALE
        );
        moonBloom.addColorStop(0, `rgba(255, 238, 170, ${(0.48 * moonBloomAlpha).toFixed(3)})`);
        moonBloom.addColorStop(0.35, `rgba(240, 190, 124, ${(0.22 * moonBloomAlpha).toFixed(3)})`);
        moonBloom.addColorStop(0.7, `rgba(240, 190, 124, ${(0.05 * moonBloomAlpha).toFixed(3)})`);
        moonBloom.addColorStop(1, 'rgba(240, 190, 124, 0)');

        ctx.fillStyle = moonBloom;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 34 * SCALE, 0, Math.PI * 2);
        ctx.fill();

        // Yellowish Half-Moon
        ctx.save();
        ctx.globalAlpha = moonBloomAlpha;
        ctx.fillStyle = '#f0be7c';
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonRadius, -Math.PI / 2, Math.PI / 2, false);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fff4d0';
        ctx.beginPath();
        ctx.arc(moonX - 1 * SCALE, moonY, moonRadius - 2.5 * SCALE, -Math.PI / 2, Math.PI / 2, false);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(moonX + 1.5 * SCALE, moonY - 5 * SCALE, 2.5 * SCALE, 3 * SCALE);
        ctx.fillRect(moonX + 3.5 * SCALE, moonY - 1 * SCALE, 2.5 * SCALE, 2.5 * SCALE);
        ctx.restore();
      }

      // B. RADIANT MORNING SUN (Rises from horizon as p->1 with warm rays)
      if (p > 0.02) {
        const sunAlpha = p;
        const sunX = winX + 54 * SCALE;
        const sunY = winY + (36 + (1 - p) * 75) * SCALE;
        const sunRadius = 10 * SCALE;

        // Soft Warm Radial Sunbeam Bloom
        const sunBloom = ctx.createRadialGradient(
          sunX,
          sunY,
          3 * SCALE,
          sunX,
          sunY,
          46 * SCALE
        );
        sunBloom.addColorStop(0, `rgba(255, 245, 175, ${(0.6 * sunAlpha).toFixed(3)})`);
        sunBloom.addColorStop(0.3, `rgba(240, 190, 124, ${(0.3 * sunAlpha).toFixed(3)})`);
        sunBloom.addColorStop(0.65, `rgba(240, 190, 124, ${(0.08 * sunAlpha).toFixed(3)})`);
        sunBloom.addColorStop(1, 'rgba(240, 190, 124, 0)');

        ctx.fillStyle = sunBloom;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 46 * SCALE, 0, Math.PI * 2);
        ctx.fill();

        // 16-bit Golden Morning Sun Disk
        ctx.save();
        ctx.globalAlpha = sunAlpha;

        ctx.fillStyle = '#e89f30';
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius + 2 * SCALE, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f0be7c';
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff9db';
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius - 3 * SCALE, 0, Math.PI * 2);
        ctx.fill();

        // Stepped Pixel Sun Rays
        ctx.fillStyle = '#f0be7c';
        ctx.fillRect(sunX - 1.5 * SCALE, sunY - 17 * SCALE, 3 * SCALE, 4 * SCALE); // N
        ctx.fillRect(sunX - 1.5 * SCALE, sunY + 13 * SCALE, 3 * SCALE, 4 * SCALE); // S
        ctx.fillRect(sunX - 17 * SCALE, sunY - 1.5 * SCALE, 4 * SCALE, 3 * SCALE); // W
        ctx.fillRect(sunX + 13 * SCALE, sunY - 1.5 * SCALE, 4 * SCALE, 3 * SCALE); // E
        ctx.fillRect(sunX + 9 * SCALE, sunY - 12 * SCALE, 3 * SCALE, 3 * SCALE); // NE
        ctx.fillRect(sunX - 12 * SCALE, sunY - 12 * SCALE, 3 * SCALE, 3 * SCALE); // NW
        ctx.fillRect(sunX + 9 * SCALE, sunY + 9 * SCALE, 3 * SCALE, 3 * SCALE); // SE
        ctx.fillRect(sunX - 12 * SCALE, sunY + 9 * SCALE, 3 * SCALE, 3 * SCALE); // SW

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sunX - 3 * SCALE, sunY - 3 * SCALE, 3 * SCALE, 3 * SCALE);
        ctx.fillRect(sunX - 1 * SCALE, sunY - 4 * SCALE, 2 * SCALE, 2 * SCALE);
        ctx.restore();
      }

      // C. DRIFTING DAYTIME MORNING CLOUDS (Strictly wrapped and clipped within window)
      if (p > 0.05 && !reducedMotion) {
        const winMinX = 145;
        const winMaxX = 375;
        clouds.forEach((cloud) => {
          cloud.x += cloud.speed;
          if (cloud.x > winMaxX + 20) {
            cloud.x = winMinX - cloud.w - 10;
          }
          const cx = cloud.x * SCALE;
          const cy = (winY / SCALE + cloud.y) * SCALE;
          const cw = cloud.w * SCALE;

          ctx.save();
          ctx.globalAlpha = p * 0.9;
          // Cloud Top (White)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx + 6 * SCALE, cy, cw - 12 * SCALE, 7 * SCALE);
          ctx.fillRect(cx + 2 * SCALE, cy + 2 * SCALE, cw - 4 * SCALE, 7 * SCALE);
          ctx.fillRect(cx, cy + 4 * SCALE, cw, 6 * SCALE);

          // Cloud Base Shadow (Soft Lavender)
          ctx.fillStyle = '#d6cbdf';
          ctx.fillRect(cx + 2 * SCALE, cy + 8 * SCALE, cw - 4 * SCALE, 2 * SCALE);
          ctx.fillRect(cx + 5 * SCALE, cy + 9 * SCALE, cw - 10 * SCALE, 2 * SCALE);
          ctx.restore();
        });
      }

      // Distant City Skyline Silhouette
      ctx.fillStyle = lerpRGB(THEME_COLORS.skyLineBack, p);
      ctx.fillRect(winX + 20 * SCALE, winY + winH - 85 * SCALE, 18 * SCALE, 85 * SCALE);
      ctx.fillRect(winX + 75 * SCALE, winY + winH - 95 * SCALE, 16 * SCALE, 95 * SCALE);
      ctx.fillRect(winX + 130 * SCALE, winY + winH - 80 * SCALE, 24 * SCALE, 80 * SCALE);
      ctx.fillRect(winX + 180 * SCALE, winY + winH - 90 * SCALE, 20 * SCALE, 90 * SCALE);

      ctx.fillStyle = lerpRGB(THEME_COLORS.skyLineFront, p);
      ctx.fillRect(winX, winY + winH - 55 * SCALE, winW, 55 * SCALE);
      ctx.fillRect(winX + 10 * SCALE, winY + winH - 70 * SCALE, 30 * SCALE, 70 * SCALE);
      ctx.fillRect(winX + 50 * SCALE, winY + winH - 64 * SCALE, 36 * SCALE, 64 * SCALE);
      ctx.fillRect(winX + 100 * SCALE, winY + winH - 74 * SCALE, 28 * SCALE, 74 * SCALE);
      ctx.fillRect(winX + 145 * SCALE, winY + winH - 60 * SCALE, 42 * SCALE, 60 * SCALE);
      ctx.fillRect(winX + 195 * SCALE, winY + winH - 68 * SCALE, 26 * SCALE, 68 * SCALE);

      // Sun-kissed Rooftops in daytime
      if (p > 0.1) {
        ctx.save();
        ctx.globalAlpha = p;
        ctx.fillStyle = lerpRGB(THEME_COLORS.skyLineRoof, p);
        ctx.fillRect(winX + 10 * SCALE, winY + winH - 70 * SCALE, 30 * SCALE, 2 * SCALE);
        ctx.fillRect(winX + 50 * SCALE, winY + winH - 64 * SCALE, 36 * SCALE, 2 * SCALE);
        ctx.fillRect(winX + 100 * SCALE, winY + winH - 74 * SCALE, 28 * SCALE, 2 * SCALE);
        ctx.fillRect(winX + 145 * SCALE, winY + winH - 60 * SCALE, 42 * SCALE, 2 * SCALE);
        ctx.fillRect(winX + 195 * SCALE, winY + winH - 68 * SCALE, 26 * SCALE, 2 * SCALE);
        ctx.restore();
      }

      // Windows in Skyline
      ctx.fillStyle = lerpRGB(THEME_COLORS.winGlint, p);
      ctx.fillRect(winX + 18 * SCALE, winY + winH - 58 * SCALE, 2 * SCALE, 3 * SCALE);
      ctx.fillRect(winX + 26 * SCALE, winY + 28 * SCALE, 2 * SCALE, 2 * SCALE);
      ctx.fillRect(winX + 62 * SCALE, winY + winH - 54 * SCALE, 3 * SCALE, 3 * SCALE);
      ctx.fillRect(winX + 70 * SCALE, winY + winH - 44 * SCALE, 2 * SCALE, 2 * SCALE);
      ctx.fillRect(winX + 108 * SCALE, winY + winH - 64 * SCALE, 3 * SCALE, 4 * SCALE);
      ctx.fillRect(winX + 116 * SCALE, winY + winH - 50 * SCALE, 2 * SCALE, 3 * SCALE);
      ctx.fillRect(winX + 155 * SCALE, winY + winH - 48 * SCALE, 3 * SCALE, 3 * SCALE);
      ctx.fillRect(winX + 165 * SCALE, winY + winH - 54 * SCALE, 2 * SCALE, 2 * SCALE);

      // Twinkling Night Stars
      if (p < 0.7) {
        const starAlpha = (1 - p * 1.4) * (0.5 + 0.5 * Math.abs(Math.sin(t * 0.003)));
        ctx.fillStyle = `rgba(240, 190, 124, ${Math.max(0, starAlpha).toFixed(3)})`;
        ctx.fillRect(winX + 35 * SCALE, winY + 20 * SCALE, 2 * SCALE, 2 * SCALE);
        ctx.fillRect(winX + 85 * SCALE, winY + 14 * SCALE, 2 * SCALE, 2 * SCALE);
        ctx.fillRect(winX + 145 * SCALE, winY + 26 * SCALE, 2 * SCALE, 2 * SCALE);
        ctx.fillRect(winX + 205 * SCALE, winY + 18 * SCALE, 2 * SCALE, 2 * SCALE);
      }

      // Raindrops (Strictly clipped inside window)
      if (!reducedMotion && p < 0.8) {
        const rainMultiplier = 1 - p * 1.25;
        raindrops.forEach((drop) => {
          drop.y += drop.speed;
          if (drop.y > 185) {
            drop.y = 18;
            drop.x = 148 + Math.floor(Math.random() * 224);
          }
          ctx.fillStyle = `rgba(208, 196, 223, ${(drop.alpha * rainMultiplier).toFixed(3)})`;
          ctx.fillRect(drop.x * SCALE, Math.floor(drop.y) * SCALE, 1 * SCALE, drop.len * SCALE);
        });
      }

      ctx.restore(); // END WINDOW CLIPPING

      // Window Muntins / Crossbars
      ctx.fillStyle = lerpRGB(THEME_COLORS.muntinOuter, p);
      ctx.fillRect(winX + winW / 2 - 2 * SCALE, winY, 4 * SCALE, winH);
      ctx.fillRect(winX, winY + winH / 2 - 2 * SCALE, winW, 4 * SCALE);
      ctx.fillStyle = lerpRGB(THEME_COLORS.muntinInner, p);
      ctx.fillRect(winX + winW / 2 - 1 * SCALE, winY, 2 * SCALE, winH);
      ctx.fillRect(winX, winY + winH / 2 - 1 * SCALE, winW, 2 * SCALE);

      // ==========================================
      // COZY PURE PIXEL ART SLEEPING CAT ON WINDOWSILL
      // ==========================================
      const catX = winX + winW - 74 * SCALE;
      const catY = winY + winH - 24 * SCALE;

      const breathY = reducedMotion ? 0 : Math.sin(t * 0.0022) * 1.8 * SCALE;
      const tailAngle = reducedMotion ? 0 : Math.sin(t * 0.0018) * 0.16;
      const isEarTwitch = !reducedMotion && Math.sin(t * 0.0008) > 0.93;

      const catOutline = lerpRGB(THEME_COLORS.catOutline, p);
      const catBodyFur = lerpRGB(THEME_COLORS.catBodyFur, p);
      const catMarkings = lerpRGB(THEME_COLORS.catMarkings, p);
      const catEarPink = lerpRGB(THEME_COLORS.catEarPink, p);

      // Tail
      const tailRootX = catX + 46 * SCALE;
      const tailRootY = catY + 8 * SCALE;

      ctx.save();
      ctx.translate(tailRootX, tailRootY);
      ctx.rotate(tailAngle);
      ctx.fillStyle = catOutline;
      ctx.fillRect(0, 0, 8 * SCALE, 6 * SCALE);
      ctx.fillRect(3 * SCALE, 5 * SCALE, 6 * SCALE, 15 * SCALE);
      ctx.fillRect(-3 * SCALE, 17 * SCALE, 8 * SCALE, 5 * SCALE);

      ctx.fillStyle = '#c792df';
      ctx.fillRect(1.5 * SCALE, 1.5 * SCALE, 5 * SCALE, 4 * SCALE);
      ctx.fillRect(4.5 * SCALE, 5 * SCALE, 4 * SCALE, 13 * SCALE);
      ctx.fillRect(-1.5 * SCALE, 18.5 * SCALE, 5 * SCALE, 3 * SCALE);
      ctx.restore();

      // Body Loaf
      ctx.fillStyle = catOutline;
      ctx.fillRect(catX + 13 * SCALE, catY + 1 * SCALE - breathY, 35 * SCALE, 18 * SCALE + breathY);
      ctx.fillRect(catX + 46 * SCALE, catY + 4 * SCALE - breathY, 4 * SCALE, 12 * SCALE + breathY);

      ctx.fillStyle = catBodyFur;
      ctx.fillRect(catX + 14 * SCALE, catY + 2 * SCALE - breathY, 33 * SCALE, 16 * SCALE + breathY);
      ctx.fillRect(catX + 46 * SCALE, catY + 5 * SCALE - breathY, 3 * SCALE, 10 * SCALE + breathY);

      ctx.fillStyle = catMarkings;
      ctx.fillRect(catX + 22 * SCALE, catY + 2 * SCALE - breathY, 20 * SCALE, 9 * SCALE + breathY);

      if (p > 0.1) {
        ctx.fillStyle = '#fff4d0';
        ctx.fillRect(catX + 14 * SCALE, catY + 2 * SCALE - breathY, 33 * SCALE, 2 * SCALE);
      }

      // Head
      ctx.fillStyle = catOutline;
      ctx.fillRect(catX - 2 * SCALE, catY - 2 * SCALE - breathY, 20 * SCALE, 19 * SCALE + breathY);

      ctx.fillStyle = catBodyFur;
      ctx.fillRect(catX, catY - breathY, 17 * SCALE, 16 * SCALE + breathY);

      const earTwitchY = isEarTwitch ? -2 * SCALE : 0;
      ctx.fillStyle = catOutline;
      ctx.fillRect(catX + 1 * SCALE, catY - 7 * SCALE - breathY + earTwitchY, 6 * SCALE, 7 * SCALE);
      ctx.fillStyle = catEarPink;
      ctx.fillRect(catX + 2 * SCALE, catY - 5 * SCALE - breathY + earTwitchY, 3.5 * SCALE, 5 * SCALE);

      ctx.fillStyle = catOutline;
      ctx.fillRect(catX + 11 * SCALE, catY - 7 * SCALE - breathY, 6 * SCALE, 7 * SCALE);
      ctx.fillStyle = catEarPink;
      ctx.fillRect(catX + 12 * SCALE, catY - 5 * SCALE - breathY, 3.5 * SCALE, 5 * SCALE);

      // Eyelids (^ ^)
      ctx.fillStyle = '#3a2e4c';
      ctx.fillRect(catX + 3 * SCALE, catY + 5 * SCALE - breathY, 4 * SCALE, 2 * SCALE);
      ctx.fillRect(catX + 11 * SCALE, catY + 5 * SCALE - breathY, 4 * SCALE, 2 * SCALE);

      // Button Nose
      ctx.fillStyle = '#dcabdf';
      ctx.fillRect(catX + 7.5 * SCALE, catY + 8.5 * SCALE - breathY, 3 * SCALE, 2 * SCALE);

      // Rosy Cheeks
      ctx.fillStyle = 'rgba(220, 171, 223, 0.65)';
      ctx.fillRect(catX + 2 * SCALE, catY + 8 * SCALE - breathY, 3 * SCALE, 2.5 * SCALE);
      ctx.fillRect(catX + 13 * SCALE, catY + 8 * SCALE - breathY, 3 * SCALE, 2.5 * SCALE);

      // Front Paws
      ctx.fillStyle = catOutline;
      ctx.fillRect(catX + 1.5 * SCALE, catY + 14 * SCALE, 6.5 * SCALE, 5.5 * SCALE);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(catX + 2.5 * SCALE, catY + 15 * SCALE, 4.5 * SCALE, 3.5 * SCALE);

      ctx.fillStyle = catOutline;
      ctx.fillRect(catX + 9 * SCALE, catY + 14 * SCALE, 6.5 * SCALE, 5.5 * SCALE);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(catX + 10 * SCALE, catY + 15 * SCALE, 4.5 * SCALE, 3.5 * SCALE);

      // Cat Heart / Purr Particles
      if (!reducedMotion) {
        catHeartsRef.current = catHeartsRef.current.filter((particle) => {
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.life += 1;
          particle.alpha = Math.max(0, 1 - particle.life / 100);

          ctx.fillStyle = particle.color;
          ctx.globalAlpha = particle.alpha;
          ctx.font = `bold ${10 * SCALE}px monospace`;
          ctx.fillText(particle.text, particle.x * SCALE, particle.y * SCALE);
          ctx.globalAlpha = 1;

          return particle.alpha > 0.02;
        });
      }

      // ==========================================
      // 3. HANGING FAIRY STRING LIGHTS
      // ==========================================
      const wireColor = lerpRGB(THEME_COLORS.wire, p);
      ctx.fillStyle = wireColor;
      ctx.fillRect(0, 10 * SCALE, W * SCALE, 2 * SCALE);
      const bulbGlow = 0.6 + 0.35 * Math.sin(t * 0.0035);
      for (let bx = 36; bx < W; bx += 56) {
        ctx.fillStyle = wireColor;
        ctx.fillRect(bx * SCALE, 12 * SCALE, 4 * SCALE, 3 * SCALE);
        ctx.fillStyle = '#f0be7c';
        ctx.fillRect((bx - 2) * SCALE, 15 * SCALE, 8 * SCALE, 8 * SCALE);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect((bx - 1) * SCALE, 16 * SCALE, 3 * SCALE, 3 * SCALE);
        ctx.fillStyle = `rgba(240, 190, 124, ${(0.15 * bulbGlow * (1 - p * 0.5)).toFixed(3)})`;
        ctx.fillRect((bx - 8) * SCALE, 9 * SCALE, 20 * SCALE, 20 * SCALE);
      }

      // ==========================================
      // 4. RIGHT WALL POSTER & BOOKSHELF
      // ==========================================
      const postX = 416 * SCALE;
      const postY = 22 * SCALE;

      ctx.fillStyle = `rgba(240, 190, 124, ${(0.2 * (1 - p * 0.5)).toFixed(3)})`;
      ctx.fillRect(postX - 4 * SCALE, postY - 4 * SCALE, 54 * SCALE, 64 * SCALE);
      ctx.fillStyle = lerpRGB(THEME_COLORS.shelfBase, p);
      ctx.fillRect(postX - 2 * SCALE, postY - 2 * SCALE, 50 * SCALE, 60 * SCALE);
      ctx.fillStyle = '#f4f1fa';
      ctx.fillRect(postX, postY, 46 * SCALE, 56 * SCALE);
      
      ctx.fillStyle = lerpRGB(THEME_COLORS.posterBg, p);
      ctx.fillRect(postX + 4 * SCALE, postY + 4 * SCALE, 38 * SCALE, 48 * SCALE);

      ctx.fillStyle = '#f0be7c';
      ctx.fillRect(postX + 26 * SCALE, postY + 10 * SCALE, 8 * SCALE, 8 * SCALE);
      ctx.fillStyle = '#c792df';
      ctx.beginPath();
      ctx.moveTo(postX + 6 * SCALE, postY + 50 * SCALE);
      ctx.lineTo(postX + 22 * SCALE, postY + 26 * SCALE);
      ctx.lineTo(postX + 40 * SCALE, postY + 50 * SCALE);
      ctx.closePath();
      ctx.fill();

      // Bookshelf
      const shX = 414 * SCALE;
      const shY = 120 * SCALE;
      const shW = 98 * SCALE;

      ctx.fillStyle = lerpRGB(THEME_COLORS.shelfBase, p);
      ctx.fillRect(shX - 2 * SCALE, shY, shW + 4 * SCALE, 8 * SCALE);
      ctx.fillStyle = lerpRGB(THEME_COLORS.shelfMid, p);
      ctx.fillRect(shX, shY + 1 * SCALE, shW, 6 * SCALE);
      ctx.fillStyle = lerpRGB(THEME_COLORS.shelfHigh, p);
      ctx.fillRect(shX, shY + 1 * SCALE, shW, 2 * SCALE);

      // Books
      ctx.fillStyle = lerpRGB(THEME_COLORS.shelfBase, p);
      ctx.fillRect(shX + 6 * SCALE, shY - 32 * SCALE, 10 * SCALE, 32 * SCALE);
      ctx.fillStyle = '#c792df';
      ctx.fillRect(shX + 8 * SCALE, shY - 30 * SCALE, 6 * SCALE, 30 * SCALE);

      ctx.fillStyle = lerpRGB(THEME_COLORS.shelfBase, p);
      ctx.fillRect(shX + 18 * SCALE, shY - 38 * SCALE, 12 * SCALE, 38 * SCALE);
      ctx.fillStyle = '#dcabdf';
      ctx.fillRect(shX + 20 * SCALE, shY - 36 * SCALE, 8 * SCALE, 36 * SCALE);

      ctx.fillStyle = lerpRGB(THEME_COLORS.shelfBase, p);
      ctx.fillRect(shX + 32 * SCALE, shY - 28 * SCALE, 10 * SCALE, 28 * SCALE);
      ctx.fillStyle = '#d0c4df';
      ctx.fillRect(shX + 34 * SCALE, shY - 26 * SCALE, 6 * SCALE, 26 * SCALE);

      // Succulent
      const succX = shX + 64 * SCALE;
      const succY = shY - 20 * SCALE;
      ctx.fillStyle = lerpRGB(THEME_COLORS.shelfBase, p);
      ctx.fillRect(succX, succY + 8 * SCALE, 18 * SCALE, 12 * SCALE);
      ctx.fillStyle = '#d97757';
      ctx.fillRect(succX + 1 * SCALE, succY + 9 * SCALE, 16 * SCALE, 10 * SCALE);
      ctx.fillStyle = '#4a6741';
      ctx.fillRect(succX, succY + 2 * SCALE, 18 * SCALE, 8 * SCALE);
      ctx.fillStyle = '#7fae6b';
      ctx.fillRect(succX + 3 * SCALE, succY, 12 * SCALE, 8 * SCALE);

      // ==========================================
      // 5. PHYSICAL LAYERED DESK SURFACE (y = 225 to 360)
      // ==========================================
      const deskBase = lerpRGB(THEME_COLORS.deskBase, p);
      const deskPlank = lerpRGB(THEME_COLORS.deskPlank, p);
      const deskGrain = lerpRGB(THEME_COLORS.deskGrain, p);

      ctx.fillStyle = deskBase;
      ctx.fillRect(0, deskY, W * SCALE, (H - 225) * SCALE);

      ctx.fillStyle = deskPlank;
      ctx.fillRect(0, deskY + 3 * SCALE, W * SCALE, (H - 228) * SCALE);
      ctx.fillStyle = deskGrain;
      ctx.fillRect(0, deskY + 3 * SCALE, W * SCALE, 3 * SCALE);

      ctx.fillStyle = deskBase;
      ctx.fillRect(0, deskY + 40 * SCALE, W * SCALE, 2 * SCALE);
      ctx.fillRect(0, deskY + 90 * SCALE, W * SCALE, 2 * SCALE);

      // Desk Plant
      const plX = 88 * SCALE;
      const plY = deskY - 14 * SCALE;

      ctx.fillStyle = deskBase;
      ctx.fillRect(plX - 2 * SCALE, plY + 22 * SCALE, 26 * SCALE, 4 * SCALE);

      ctx.fillStyle = deskBase;
      ctx.fillRect(plX - 1 * SCALE, plY + 8 * SCALE, 24 * SCALE, 16 * SCALE);
      ctx.fillStyle = '#eb977b';
      ctx.fillRect(plX, plY + 9 * SCALE, 22 * SCALE, 4 * SCALE);
      ctx.fillStyle = '#d97757';
      ctx.fillRect(plX + 1 * SCALE, plY + 13 * SCALE, 20 * SCALE, 10 * SCALE);
      ctx.fillStyle = '#b85b40';
      ctx.fillRect(plX + 2 * SCALE, plY + 21 * SCALE, 18 * SCALE, 2 * SCALE);

      ctx.fillStyle = deskBase;
      ctx.fillRect(plX - 3 * SCALE, plY + 2 * SCALE, 28 * SCALE, 8 * SCALE);
      ctx.fillRect(plX + 1 * SCALE, plY - 4 * SCALE, 20 * SCALE, 14 * SCALE);
      ctx.fillRect(plX + 4 * SCALE, plY - 8 * SCALE, 14 * SCALE, 8 * SCALE);

      ctx.fillStyle = '#2b3f27';
      ctx.fillRect(plX - 2 * SCALE, plY + 3 * SCALE, 26 * SCALE, 6 * SCALE);
      ctx.fillRect(plX + 2 * SCALE, plY - 3 * SCALE, 18 * SCALE, 12 * SCALE);

      ctx.fillStyle = '#4e7a43';
      ctx.fillRect(plX, plY + 1 * SCALE, 22 * SCALE, 6 * SCALE);
      ctx.fillRect(plX + 4 * SCALE, plY - 6 * SCALE, 14 * SCALE, 8 * SCALE);

      ctx.fillStyle = '#6ba15c';
      ctx.fillRect(plX + 3 * SCALE, plY - 2 * SCALE, 16 * SCALE, 6 * SCALE);
      ctx.fillRect(plX + 6 * SCALE, plY - 7 * SCALE, 10 * SCALE, 6 * SCALE);

      ctx.fillStyle = '#a8e092';
      ctx.fillRect(plX + 5 * SCALE, plY - 1 * SCALE, 4 * SCALE, 3 * SCALE);
      ctx.fillRect(plX + 13 * SCALE, plY - 1 * SCALE, 4 * SCALE, 3 * SCALE);
      ctx.fillRect(plX + 8 * SCALE, plY - 6 * SCALE, 5 * SCALE, 3 * SCALE);

      // Mug & Steam
      const mugX = 122 * SCALE;
      const mugY = deskY + 12 * SCALE;
      ctx.fillStyle = deskBase;
      ctx.fillRect(mugX - 2 * SCALE, mugY - 2 * SCALE, 24 * SCALE, 26 * SCALE);
      ctx.fillStyle = '#dddfdf';
      ctx.fillRect(mugX, mugY, 20 * SCALE, 22 * SCALE);
      ctx.fillStyle = '#2a2130';
      ctx.fillRect(mugX + 2 * SCALE, mugY + 2 * SCALE, 16 * SCALE, 3 * SCALE);

      if (!reducedMotion) {
        for (let i = 0; i < 3; i++) {
          const prog = ((t / 1900) + i * 0.33) % 1;
          const sx = Math.floor(mugX + 8 * SCALE + Math.sin(prog * 5 + i * 2) * 5 * SCALE);
          const sy = Math.floor(mugY - 4 * SCALE - prog * 30 * SCALE);
          const sAlpha = (1 - prog) * 0.45;
          ctx.fillStyle = `rgba(221, 223, 223, ${sAlpha.toFixed(3)})`;
          ctx.fillRect(sx, sy, 3 * SCALE, 4 * SCALE);
        }
      }

      // ==========================================
      // 6. COMPACT RETRO BOOMBOX RADIO
      // ==========================================
      const radX = 402 * SCALE;
      const radY = 240 * SCALE;
      const radW = 90 * SCALE;
      const radH = 68 * SCALE;

      ctx.fillStyle = lerpRGB(THEME_COLORS.radioBase, p);
      ctx.fillRect(radX - 2 * SCALE, radY - 2 * SCALE, radW + 4 * SCALE, radH + 4 * SCALE);
      ctx.fillStyle = lerpRGB(THEME_COLORS.radioMid, p);
      ctx.fillRect(radX, radY, radW, radH);
      ctx.fillStyle = lerpRGB(THEME_COLORS.radioHigh, p);
      ctx.fillRect(radX, radY, radW, 3 * SCALE);

      ctx.fillStyle = lerpRGB(THEME_COLORS.radioBase, p);
      ctx.fillRect(radX + 16 * SCALE, radY - 10 * SCALE, radW - 32 * SCALE, 6 * SCALE);
      ctx.fillRect(radX + 16 * SCALE, radY - 10 * SCALE, 6 * SCALE, 10 * SCALE);
      ctx.fillRect(radX + radW - 22 * SCALE, radY - 10 * SCALE, 6 * SCALE, 10 * SCALE);
      ctx.fillStyle = '#c792df';
      ctx.fillRect(radX + 18 * SCALE, radY - 8 * SCALE, radW - 36 * SCALE, 3 * SCALE);

      ctx.fillStyle = '#dddfdf';
      ctx.fillRect(radX + radW - 12 * SCALE, radY - 38 * SCALE, 2 * SCALE, 38 * SCALE);
      ctx.fillRect(radX + radW - 14 * SCALE, radY - 41 * SCALE, 6 * SCALE, 3 * SCALE);

      ctx.fillStyle = '#1e1730';
      ctx.fillRect(radX + 8 * SCALE, radY + 8 * SCALE, radW - 16 * SCALE, 18 * SCALE);
      ctx.fillStyle = radioState.isPlaying ? '#f0be7c' : '#a89bb8';
      ctx.font = `bold ${6.5 * SCALE}px monospace`;
      ctx.fillText(radioState.isPlaying ? '♫ PLAYING' : 'RADIO [CLICK]', radX + 12 * SCALE, radY + 16 * SCALE);
      ctx.fillStyle = '#dcabdf';
      ctx.font = `${6 * SCALE}px monospace`;
      ctx.fillText(radioState.trackTitle, radX + 12 * SCALE, radY + 23 * SCALE);

      const deckX = radX + 8 * SCALE;
      const deckY = radY + 28 * SCALE;
      const deckW = radW - 16 * SCALE;
      const deckH = 22 * SCALE;

      ctx.fillStyle = '#1e1730';
      ctx.fillRect(deckX, deckY, deckW, deckH);
      ctx.fillStyle = '#261c36';
      ctx.fillRect(deckX + 1.5 * SCALE, deckY + 1.5 * SCALE, deckW - 3 * SCALE, deckH - 3 * SCALE);

      ctx.fillStyle = '#3a2e4c';
      ctx.fillRect(deckX + 4 * SCALE, deckY + 3 * SCALE, deckW - 8 * SCALE, deckH - 6 * SCALE);
      ctx.fillStyle = '#c792df';
      ctx.fillRect(deckX + 8 * SCALE, deckY + 5 * SCALE, deckW - 16 * SCALE, 10 * SCALE);

      const reelAngle = radioState.isPlaying && !reducedMotion ? (t * 0.005) : 0;
      const drawMiniReel = (cx: number, cy: number) => {
        const r = 4 * SCALE;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e1730';
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5 * SCALE, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#3a2e4c';
        ctx.lineWidth = 1 * SCALE;
        for (let a = 0; a < 3; a++) {
          const ang = reelAngle + (a * Math.PI * 2) / 3;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
          ctx.stroke();
        }
      };

      drawMiniReel(deckX + 18 * SCALE, deckY + 10 * SCALE);
      drawMiniReel(deckX + deckW - 18 * SCALE, deckY + 10 * SCALE);

      ctx.fillStyle = lerpRGB(THEME_COLORS.radioBase, p);
      ctx.fillRect(radX + 10 * SCALE, radY + 53 * SCALE, 8 * SCALE, 8 * SCALE);
      ctx.fillRect(radX + 22 * SCALE, radY + 53 * SCALE, 8 * SCALE, 8 * SCALE);
      ctx.fillStyle = '#c792df';
      ctx.fillRect(radX + 11 * SCALE, radY + 54 * SCALE, 6 * SCALE, 6 * SCALE);
      ctx.fillRect(radX + 23 * SCALE, radY + 54 * SCALE, 6 * SCALE, 6 * SCALE);

      ctx.fillStyle = lerpRGB(THEME_COLORS.radioBase, p);
      ctx.fillRect(radX + 36 * SCALE, radY + 53 * SCALE, 46 * SCALE, 10 * SCALE);
      ctx.fillStyle = lerpRGB(THEME_COLORS.radioHigh, p);
      for (let sx = 0; sx < 5; sx++) {
        ctx.fillRect((radX + 40 + sx * 7) * SCALE, (radY + 55) * SCALE, 3.5 * SCALE, 6 * SCALE);
      }

      // ==========================================
      // 7. IPAD PRO WITH FOLIO KICKSTAND ON THE TABLE
      // ==========================================
      const tabX = 146 * SCALE;
      const tabY = 202 * SCALE;
      const tabW = 216 * SCALE;
      const tabH = 146 * SCALE;

      ctx.fillStyle = 'rgba(18, 12, 28, 0.35)';
      ctx.beginPath();
      ctx.ellipse(tabX + tabW / 2, tabY + tabH + 3 * SCALE, (tabW / 2 + 10) * SCALE, 8 * SCALE, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = lerpRGB(THEME_COLORS.deskBase, p);
      ctx.beginPath();
      ctx.moveTo(tabX + 16 * SCALE, tabY + 4 * SCALE);
      ctx.lineTo(tabX + tabW - 16 * SCALE, tabY + 4 * SCALE);
      ctx.lineTo(tabX + tabW - 6 * SCALE, tabY + tabH + 5 * SCALE);
      ctx.lineTo(tabX + 6 * SCALE, tabY + tabH + 5 * SCALE);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = lerpRGB(THEME_COLORS.deskBase, p);
      ctx.beginPath();
      ctx.roundRect(tabX - 3 * SCALE, tabY - 3 * SCALE, tabW + 6 * SCALE, tabH + 6 * SCALE, 8 * SCALE);
      ctx.fill();

      ctx.fillStyle = lerpRGB(THEME_COLORS.deskPlank, p);
      ctx.beginPath();
      ctx.roundRect(tabX - 1.5 * SCALE, tabY - 1.5 * SCALE, tabW + 3 * SCALE, tabH + 3 * SCALE, 6 * SCALE);
      ctx.fill();

      ctx.fillStyle = lerpRGB(THEME_COLORS.deskBase, p);
      ctx.beginPath();
      ctx.roundRect(tabX, tabY, tabW, tabH, 5 * SCALE);
      ctx.fill();

      ctx.fillStyle = '#4a385c';
      ctx.beginPath();
      ctx.arc(tabX + tabW / 2, tabY + 3.5 * SCALE, 1.5 * SCALE, 0, Math.PI * 2);
      ctx.fill();

      const dispX = tabX + 6 * SCALE;
      const dispY = tabY + 7 * SCALE;
      const dispW = tabW - 12 * SCALE;
      const dispH = tabH - 14 * SCALE;

      ctx.fillStyle = '#ece8f4';
      ctx.fillRect(dispX, dispY, dispW, dispH);

      // Apple Pencil
      const penX = tabX + tabW + 8 * SCALE;
      const penY = tabY + 16 * SCALE;
      const penH = tabH - 28 * SCALE;

      ctx.fillStyle = 'rgba(18, 12, 28, 0.3)';
      ctx.fillRect(penX, penY + 2 * SCALE, 7 * SCALE, penH);

      ctx.fillStyle = lerpRGB(THEME_COLORS.deskBase, p);
      ctx.fillRect(penX - 1 * SCALE, penY - 1 * SCALE, 7 * SCALE, penH + 2 * SCALE);
      ctx.fillStyle = '#fbfafd';
      ctx.fillRect(penX, penY, 5 * SCALE, penH);
      ctx.fillStyle = '#d0c4df';
      ctx.fillRect(penX, penY + 6 * SCALE, 5 * SCALE, 2 * SCALE);
      ctx.fillStyle = '#6a5880';
      ctx.fillRect(penX + 1 * SCALE, penY + penH - 5 * SCALE, 3 * SCALE, 5 * SCALE);
      ctx.fillStyle = '#3a2e4c';
      ctx.fillRect(penX + 1.5 * SCALE, penY + penH - 1 * SCALE, 2 * SCALE, 2 * SCALE);

      // Grid
      const drawAreaW = dispW - 30 * SCALE;
      const drawAreaH = dispH - 20 * SCALE;
      const cellW = drawAreaW / TAB_COLS;
      const cellH = drawAreaH / TAB_ROWS;

      for (let r = 0; r < TAB_ROWS; r++) {
        for (let c = 0; c < TAB_COLS; c++) {
          const val = tabletCells.current[r * TAB_COLS + c];
          if (val > 0 && val <= TAB_PALETTE.length) {
            ctx.fillStyle = TAB_PALETTE[val - 1].hex;
            ctx.fillRect(
              Math.floor(dispX + c * cellW),
              Math.floor(dispY + r * cellH),
              Math.ceil(cellW),
              Math.ceil(cellH)
            );
          }
        }
      }

      // Palette
      ctx.fillStyle = '#d8d0e4';
      ctx.fillRect(dispX + dispW - 30 * SCALE, dispY, 30 * SCALE, dispH);
      ctx.fillStyle = '#3a2e4c';
      ctx.fillRect(dispX + dispW - 30 * SCALE, dispY, 1 * SCALE, dispH);

      TAB_PALETTE.forEach((swatch, idx) => {
        const swX = dispX + dispW - 22 * SCALE;
        const swY = dispY + (6 + idx * 16.5) * SCALE;
        ctx.fillStyle = '#1e1730';
        ctx.beginPath();
        ctx.arc(swX + 7 * SCALE, swY + 7 * SCALE, 6.5 * SCALE, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = swatch.hex;
        ctx.beginPath();
        ctx.arc(swX + 7 * SCALE, swY + 7 * SCALE, 5.5 * SCALE, 0, Math.PI * 2);
        ctx.fill();

        if (selectedColor === idx + 1) {
          ctx.strokeStyle = '#f0be7c';
          ctx.lineWidth = 2 * SCALE;
          ctx.beginPath();
          ctx.arc(swX + 7 * SCALE, swY + 7 * SCALE, 7.5 * SCALE, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Actions
      ctx.fillStyle = '#d8d0e4';
      ctx.fillRect(dispX, dispY + dispH - 18 * SCALE, drawAreaW, 18 * SCALE);
      ctx.fillStyle = '#3a2e4c';
      ctx.fillRect(dispX, dispY + dispH - 18 * SCALE, drawAreaW, 1 * SCALE);

      ctx.fillStyle = '#3a2e4c';
      ctx.fillRect(dispX + 4 * SCALE, dispY + dispH - 15 * SCALE, 74 * SCALE, 12 * SCALE);
      ctx.fillStyle = '#c792df';
      ctx.fillRect(dispX + 5 * SCALE, dispY + dispH - 14 * SCALE, 72 * SCALE, 10 * SCALE);
      ctx.fillStyle = '#1e1730';
      ctx.font = `bold ${6 * SCALE}px monospace`;
      ctx.fillText('OPEN STUDIO ✦', dispX + 8 * SCALE, dispY + dispH - 7 * SCALE);

      ctx.fillStyle = '#3a2e4c';
      ctx.fillRect(dispX + 82 * SCALE, dispY + dispH - 15 * SCALE, 40 * SCALE, 12 * SCALE);
      ctx.fillStyle = '#dddfdf';
      ctx.fillRect(dispX + 83 * SCALE, dispY + dispH - 14 * SCALE, 38 * SCALE, 10 * SCALE);
      ctx.fillStyle = '#3a2e4c';
      ctx.font = `bold ${6 * SCALE}px monospace`;
      ctx.fillText('CLEAR', dispX + 90 * SCALE, dispY + dispH - 7 * SCALE);

      ctx.fillStyle = '#3a2e4c';
      ctx.beginPath();
      ctx.roundRect(dispX + dispW / 2 - 20 * SCALE, dispY + dispH - 2.5 * SCALE, 40 * SCALE, 2 * SCALE, 1 * SCALE);
      ctx.fill();

      // ==========================================
      // 8. TALL SLEEK DESK LAMP
      // ==========================================
      const lampX = 40 * SCALE;
      const lampBaseY = deskY + 6 * SCALE;

      ctx.fillStyle = lerpRGB(THEME_COLORS.lampBase, p);
      ctx.fillRect(lampX + 6 * SCALE, lampBaseY + 12 * SCALE, 38 * SCALE, 14 * SCALE);
      ctx.fillStyle = lerpRGB(THEME_COLORS.lampMid, p);
      ctx.fillRect(lampX + 8 * SCALE, lampBaseY + 14 * SCALE, 34 * SCALE, 10 * SCALE);
      ctx.fillStyle = lerpRGB(THEME_COLORS.lampHigh, p);
      ctx.fillRect(lampX + 8 * SCALE, lampBaseY + 14 * SCALE, 34 * SCALE, 2.5 * SCALE);

      ctx.fillStyle = lerpRGB(THEME_COLORS.lampBase, p);
      ctx.fillRect(lampX + 21 * SCALE, lampBaseY + 8 * SCALE, 10 * SCALE, 5 * SCALE);
      ctx.fillStyle = lampLit ? '#f0be7c' : lerpRGB(THEME_COLORS.lampMid, p);
      ctx.fillRect(lampX + 22 * SCALE, lampBaseY + 9 * SCALE, 8 * SCALE, 4 * SCALE);

      const joint1X = lampX + 25 * SCALE;
      const joint1Y = 105 * SCALE;

      ctx.fillStyle = lerpRGB(THEME_COLORS.lampBase, p);
      ctx.fillRect(lampX + 21 * SCALE, joint1Y, 8 * SCALE, (lampBaseY + 12 * SCALE) - joint1Y);
      ctx.fillStyle = '#c792df';
      ctx.fillRect(lampX + 23 * SCALE, joint1Y + 2 * SCALE, 4 * SCALE, (lampBaseY + 12 * SCALE) - joint1Y - 4 * SCALE);

      ctx.fillStyle = lerpRGB(THEME_COLORS.lampBase, p);
      ctx.beginPath();
      ctx.arc(joint1X, joint1Y, 7.5 * SCALE, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f0be7c';
      ctx.beginPath();
      ctx.arc(joint1X, joint1Y, 5 * SCALE, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(joint1X - 2 * SCALE, joint1Y - 2 * SCALE, 2 * SCALE, 2 * SCALE);

      const hoodJointX = lampX + 76 * SCALE;
      const hoodJointY = 118 * SCALE;

      ctx.fillStyle = lerpRGB(THEME_COLORS.lampBase, p);
      ctx.beginPath();
      ctx.moveTo(joint1X, joint1Y - 2.5 * SCALE);
      ctx.lineTo(hoodJointX, hoodJointY - 2.5 * SCALE);
      ctx.lineTo(hoodJointX, hoodJointY + 2.5 * SCALE);
      ctx.lineTo(joint1X, joint1Y + 2.5 * SCALE);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#dcabdf';
      ctx.beginPath();
      ctx.moveTo(joint1X + 2 * SCALE, joint1Y - 1 * SCALE);
      ctx.lineTo(hoodJointX - 2 * SCALE, hoodJointY - 1 * SCALE);
      ctx.lineTo(hoodJointX - 2 * SCALE, hoodJointY + 1 * SCALE);
      ctx.lineTo(joint1X + 2 * SCALE, joint1Y + 1 * SCALE);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = lerpRGB(THEME_COLORS.lampBase, p);
      ctx.fillRect(hoodJointX - 2 * SCALE, hoodJointY - 4 * SCALE, 9 * SCALE, 9 * SCALE);
      ctx.fillStyle = '#f0be7c';
      ctx.fillRect(hoodJointX, hoodJointY - 2 * SCALE, 5 * SCALE, 5 * SCALE);

      const hoodX = hoodJointX + 4 * SCALE;
      const hoodY = hoodJointY - 2 * SCALE;
      const bulbOriginX = hoodX + 28 * SCALE;
      const bulbOriginY = hoodY + 24 * SCALE;
      const bulbAngle = Math.atan2(17, -14);

      ctx.save();
      ctx.translate(bulbOriginX, bulbOriginY);
      ctx.rotate(bulbAngle);

      ctx.fillStyle = lerpRGB(THEME_COLORS.lampBase, p);
      ctx.fillRect(-6 * SCALE, -6 * SCALE, 12 * SCALE, 12 * SCALE);

      ctx.fillStyle = lampLit ? '#f0be7c' : lerpRGB(THEME_COLORS.lampMid, p);
      ctx.fillRect(-4.5 * SCALE, -4.5 * SCALE, 9 * SCALE, 9 * SCALE);

      if (lampLit) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2.5 * SCALE, -2.5 * SCALE, 5 * SCALE, 5 * SCALE);
      }
      ctx.restore();

      if (lampLit || p > 0.3) {
        ctx.save();
        const deskCenterPoolX = tabX + 80 * SCALE;
        const deskCenterPoolY = deskY + 40 * SCALE;

        const deskBloom = ctx.createRadialGradient(
          bulbOriginX,
          bulbOriginY,
          6 * SCALE,
          deskCenterPoolX,
          deskCenterPoolY,
          190 * SCALE
        );

        if (lampLit) {
          deskBloom.addColorStop(0, 'rgba(255, 238, 185, 0.35)');
          deskBloom.addColorStop(0.25, 'rgba(240, 190, 124, 0.16)');
          deskBloom.addColorStop(0.55, 'rgba(240, 190, 124, 0.05)');
          deskBloom.addColorStop(1, 'rgba(240, 190, 124, 0)');
        } else {
          deskBloom.addColorStop(0, `rgba(255, 248, 220, ${(0.15 * p).toFixed(3)})`);
          deskBloom.addColorStop(1, 'rgba(255, 248, 220, 0)');
        }

        ctx.fillStyle = deskBloom;
        ctx.fillRect(0, 0, W * SCALE, H * SCALE);

        if (lampLit) {
          const bulbHalo = ctx.createRadialGradient(
            bulbOriginX,
            bulbOriginY,
            2 * SCALE,
            bulbOriginX,
            bulbOriginY,
            28 * SCALE
          );
          bulbHalo.addColorStop(0, 'rgba(255, 255, 240, 0.75)');
          bulbHalo.addColorStop(0.35, 'rgba(240, 190, 124, 0.28)');
          bulbHalo.addColorStop(1, 'rgba(240, 190, 124, 0)');

          ctx.fillStyle = bulbHalo;
          ctx.beginPath();
          ctx.arc(bulbOriginX, bulbOriginY, 28 * SCALE, 0, Math.PI * 2);
          ctx.fill();
        }

        if (!reducedMotion) {
          dustMotes.forEach((mote) => {
            mote.x += mote.vx;
            mote.y += mote.vy;
            if (mote.y < 130) mote.y = 290;
            if (mote.x < 80 || mote.x > 380) mote.vx *= -1;
            ctx.fillStyle = `rgba(255, 220, 140, ${mote.alpha.toFixed(2)})`;
            ctx.fillRect(
              Math.floor(mote.x) * SCALE,
              Math.floor(mote.y) * SCALE,
              mote.size * SCALE,
              mote.size * SCALE
            );
          });
        }
        ctx.restore();
      }

      ctx.fillStyle = lerpRGB(THEME_COLORS.lampHood, p);
      ctx.beginPath();
      ctx.moveTo(hoodX, hoodY);
      ctx.lineTo(hoodX + 38 * SCALE, hoodY + 17 * SCALE);
      ctx.lineTo(hoodX + 22 * SCALE, hoodY + 36 * SCALE);
      ctx.lineTo(hoodX - 6 * SCALE, hoodY + 12 * SCALE);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#c792df';
      ctx.beginPath();
      ctx.moveTo(hoodX + 2 * SCALE, hoodY + 2 * SCALE);
      ctx.lineTo(hoodX + 35 * SCALE, hoodY + 16 * SCALE);
      ctx.lineTo(hoodX + 21 * SCALE, hoodY + 32 * SCALE);
      ctx.lineTo(hoodX - 4 * SCALE, hoodY + 12 * SCALE);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f4f1fa';
      ctx.beginPath();
      ctx.moveTo(hoodX + 2 * SCALE, hoodY + 2 * SCALE);
      ctx.lineTo(hoodX + 34 * SCALE, hoodY + 15 * SCALE);
      ctx.lineTo(hoodX + 32 * SCALE, hoodY + 18 * SCALE);
      ctx.lineTo(hoodX, hoodY + 5 * SCALE);
      ctx.closePath();
      ctx.fill();

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lampLit, selectedColor, radioState.isPlaying, radioState.trackTitle]);

  // Pointer interactions
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (clickX >= 290 && clickX <= 385 && clickY >= 135 && clickY <= 195) {
      const messages = ['♥ purr...', '♥ zZz', '♥ meow', '♥ ^..^', '♥ warm sun'];
      const text = messages[Math.floor(Math.random() * messages.length)];
      catHeartsRef.current.push({
        x: clickX + (Math.random() * 10 - 5),
        y: clickY - 10,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.8 - Math.random() * 0.4,
        text,
        color: '#dcabdf',
        alpha: 1,
        life: 0,
      });
      return;
    }

    if (clickX >= 30 && clickX <= 145 && clickY >= 95 && clickY <= 265) {
      setLampLit((prev) => !prev);
      return;
    }

    if (clickX >= 395 && clickX <= 500 && clickY >= 230 && clickY <= 315) {
      lofiRadio.toggle();
      return;
    }

    const tabX = 146;
    const tabY = 202;
    const tabW = 216;
    const tabH = 146;
    const dispX = tabX + 6;
    const dispY = tabY + 7;
    const dispW = tabW - 12;
    const dispH = tabH - 14;
    const drawAreaW = dispW - 30;

    if (clickX >= dispX + dispW - 30 && clickX <= dispX + dispW && clickY >= dispY && clickY <= dispY + dispH) {
      const swatchIdx = Math.floor((clickY - (dispY + 6)) / 16.5);
      if (swatchIdx >= 0 && swatchIdx < TAB_PALETTE.length) {
        activeColorIndex.current = swatchIdx + 1;
        setSelectedColor(swatchIdx + 1);
      }
      return;
    }

    if (clickX >= dispX + 4 && clickX <= dispX + 78 && clickY >= dispY + dispH - 18 && clickY <= dispY + dispH - 4) {
      router.push('/studio');
      return;
    }

    if (clickX >= dispX + 82 && clickX <= dispX + 122 && clickY >= dispY + dispH - 18 && clickY <= dispY + dispH - 4) {
      tabletCells.current.fill(0);
      return;
    }

    if (clickX >= dispX && clickX < dispX + drawAreaW && clickY >= dispY && clickY < dispY + dispH - 18) {
      isDrawing.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      paintAt(clickX, clickY);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (clickX >= 290 && clickX <= 385 && clickY >= 135 && clickY <= 195) {
      setHoverTarget('cat');
    } else if (clickX >= 30 && clickX <= 145 && clickY >= 95 && clickY <= 265) {
      setHoverTarget('lamp');
    } else if (clickX >= 395 && clickX <= 500 && clickY >= 230 && clickY <= 315) {
      setHoverTarget('radio');
    } else if (clickX >= 146 && clickX <= 362 && clickY >= 202 && clickY <= 348) {
      setHoverTarget('tablet');
    } else {
      setHoverTarget(null);
    }

    if (isDrawing.current) {
      paintAt(clickX, clickY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing.current) {
      isDrawing.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // pointer released
      }
    }
  };

  const paintAt = useCallback((x: number, y: number) => {
    const tabX = 146;
    const tabY = 202;
    const tabW = 216;
    const tabH = 146;
    const dispX = tabX + 6;
    const dispY = tabY + 7;
    const dispW = tabW - 12;
    const dispH = tabH - 14;
    const drawAreaW = dispW - 30;
    const drawAreaH = dispH - 20;

    const col = Math.floor(((x - dispX) / drawAreaW) * TAB_COLS);
    const row = Math.floor(((y - dispY) / drawAreaH) * TAB_ROWS);
    if (col >= 0 && col < TAB_COLS && row >= 0 && row < TAB_ROWS) {
      tabletCells.current[row * TAB_COLS + col] = activeColorIndex.current;
    }
  }, []);

  return (
    <div className="relative flex flex-col items-center select-none w-full max-w-[680px]">
      <BorderGlow
        glowColor="rgba(240, 190, 124, 0.95)"
        glowRadius={220}
        edgeSensitivity={45}
        className="w-full p-2 sm:p-2.5"
      >
        <PixelCorners />

        <div className="relative rounded-[1px] border-2 border-[var(--desk-border)] overflow-hidden w-full bg-[var(--desk-bg)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
          <canvas
            ref={canvasRef}
            className={`block w-full h-auto pixelated touch-none ${
              hoverTarget === 'cat' || hoverTarget === 'lamp' || hoverTarget === 'radio'
                ? 'cursor-pointer'
                : hoverTarget === 'tablet'
                ? 'cursor-crosshair'
                : 'cursor-default'
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role="img"
            aria-label="Interactive cozy pixel art desk with animated light and dark atmosphere: toggle the lamp, listen to lo-fi radio, pet the cat, and draw on the tablet"
          />
        </div>
      </BorderGlow>

      <div className="mt-3.5 flex items-center justify-between w-full px-2 text-xs font-mono text-[var(--text-body)]">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-none bg-[var(--accent-plum)] inline-block" />
          <span>The lamp is on. The radio is playing.</span>
        </span>
        <span className="hidden sm:flex items-center gap-3 text-[11px] text-[var(--accent-gold)]">
          <span className="flex items-center gap-1">
            <IconHintLamp size={11} />
            <span>Lamp</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <IconHintRadio size={11} />
            <span>Radio</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <IconHintPen size={11} />
            <span>Draw</span>
          </span>
        </span>
      </div>
    </div>
  );
};
