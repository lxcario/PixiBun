'use client';

import React, { useEffect, useRef } from 'react';
import type { Scene } from './ToolMotionPreview';

const W = 96;
const H = 54;
const DURATION = 2600; // 2.6s seamless loop with 4-beat rhythm

/** Helper: Calculate normalized 4-beat animation rhythm */
function getBeatPhases(t: number) {
  // Beat 1: Setup & Anticipation (0.00 - 0.15) -> 0ms to 390ms
  // Beat 2: Tactile Gesture (0.15 - 0.68) -> 390ms to 1768ms
  // Beat 3: Polish & Sparkle (0.68 - 0.82) -> 1768ms to 2132ms
  // Beat 4: Hold & Savor (0.82 - 1.00) -> 2132ms to 2600ms
  const actionProgress = Math.min(1, Math.max(0, (t - 0.15) / 0.53));
  const isActionActive = t >= 0.15 && t < 0.68;
  const isSparkleActive = t >= 0.68 && t < 0.82;
  const isHold = t >= 0.82;
  const sparkleProgress = isSparkleActive ? (t - 0.68) / 0.14 : 0;
  return { actionProgress, isActionActive, isSparkleActive, isHold, sparkleProgress };
}

/** Helper: Draw cozy dark studio canvas backdrop with fine 8x8 dot grid */
function drawBackdrop(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#120d1c';
  ctx.fillRect(0, 0, W, H);

  // Subtle pixel dot grid
  ctx.fillStyle = '#201830';
  for (let y = 5; y < H; y += 8) {
    for (let x = 5; x < W; x += 8) {
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Soft bottom desk horizon line
  ctx.fillStyle = '#2a1f3d';
  ctx.fillRect(0, H - 1, W, 1);
}

/** Helper: Draw subtle transparency checkerboard pattern */
function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  size = 4
) {
  for (let py = y; py < y + h; py += size) {
    for (let px = x; px < x + w; px += size) {
      ctx.fillStyle = ((px / size + py / size) % 2 === 0) ? '#1c1527' : '#261e34';
      ctx.fillRect(px, py, Math.min(size, x + w - px), Math.min(size, y + h - py));
    }
  }
}

/** Helper: Draw pixel line via Bresenham's algorithm */
function drawBresenhamLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  progress = 1
) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  const totalSteps = Math.max(dx, dy);
  const maxSteps = Math.floor(totalSteps * Math.min(1, Math.max(0, progress)));
  let steps = 0;

  ctx.fillStyle = color;
  let curX = x0;
  let curY = y0;

  while (steps <= maxSteps) {
    ctx.fillRect(curX, curY, 1, 1);
    if (curX === x1 && curY === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      curX += sx;
    }
    if (e2 < dx) {
      err += dx;
      curY += sy;
    }
    steps++;
  }
}

/** Helper: Draw continuous pixel-perfect ellipse via Midpoint Ellipse Algorithm */
function drawMidpointEllipse(
  ctx: CanvasRenderingContext2D,
  xc: number,
  yc: number,
  rx: number,
  ry: number,
  color: string,
  fillColor?: string
) {
  rx = Math.round(rx);
  ry = Math.round(ry);
  xc = Math.round(xc);
  yc = Math.round(yc);
  if (rx < 1 || ry < 1) return;

  // Optional interior fill
  if (fillColor) {
    ctx.fillStyle = fillColor;
    for (let y = -ry + 1; y < ry; y++) {
      const xBound = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      if (xBound > 0) {
        ctx.fillRect(xc - xBound + 1, yc + y, (xBound - 1) * 2 + 1, 1);
      }
    }
  }

  ctx.fillStyle = color;
  let x = 0;
  let y = ry;

  let p1 = (ry * ry) - (rx * rx * ry) + (0.25 * rx * rx);
  let dx = 2 * ry * ry * x;
  let dy = 2 * rx * rx * y;

  while (dx < dy) {
    ctx.fillRect(xc + x, yc + y, 1, 1);
    ctx.fillRect(xc - x, yc + y, 1, 1);
    ctx.fillRect(xc + x, yc - y, 1, 1);
    ctx.fillRect(xc - x, yc - y, 1, 1);

    if (p1 < 0) {
      x++;
      dx += 2 * ry * ry;
      p1 += dx + (ry * ry);
    } else {
      x++;
      y--;
      dx += 2 * ry * ry;
      dy -= 2 * rx * rx;
      p1 += dx - dy + (ry * ry);
    }
  }

  let p2 = ((ry * ry) * ((x + 0.5) * (x + 0.5))) +
           ((rx * rx) * ((y - 1) * (y - 1))) -
           (rx * rx * ry * ry);

  while (y >= 0) {
    ctx.fillRect(xc + x, yc + y, 1, 1);
    ctx.fillRect(xc - x, yc + y, 1, 1);
    ctx.fillRect(xc + x, yc - y, 1, 1);
    ctx.fillRect(xc - x, yc - y, 1, 1);

    if (p2 > 0) {
      y--;
      dy -= 2 * rx * rx;
      p2 += (rx * rx) - dy;
    } else {
      y--;
      x++;
      dx += 2 * ry * ry;
      dy -= 2 * rx * rx;
      p2 += dx - dy + (rx * rx);
    }
  }
}

/** Helper: Draw 4-point artisan diamond sparkle glint */
function drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, progress: number) {
  if (progress <= 0 || progress >= 1) return;
  const size = Math.round(Math.sin(progress * Math.PI) * 3);
  if (size <= 0) return;

  // Center bright pixel
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx, cy, 1, 1);

  // Cross arms
  ctx.fillStyle = '#fef08a';
  for (let d = 1; d <= size; d++) {
    ctx.fillRect(cx - d, cy, 1, 1);
    ctx.fillRect(cx + d, cy, 1, 1);
    ctx.fillRect(cx, cy - d, 1, 1);
    ctx.fillRect(cx, cy + d, 1, 1);
  }
}

/** Helper: Draw razor-sharp pure white diamond specular glint flare */
function drawDiamondGlint(ctx: CanvasRenderingContext2D, cx: number, cy: number, size = 2) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx, cy, 1, 1);
  if (size >= 1) {
    ctx.fillStyle = '#ffffffdd';
    ctx.fillRect(cx - 1, cy, 1, 1);
    ctx.fillRect(cx + 1, cy, 1, 1);
    ctx.fillRect(cx, cy - 1, 1, 1);
    ctx.fillRect(cx, cy + 1, 1, 1);
  }
  if (size >= 2) {
    ctx.fillStyle = '#ffffff88';
    ctx.fillRect(cx - 2, cy, 1, 1);
    ctx.fillRect(cx + 2, cy, 1, 1);
    ctx.fillRect(cx, cy - 2, 1, 1);
    ctx.fillRect(cx, cy + 2, 1, 1);
  }
}

/** Helper: Draw marching ants animated rectangle */
function drawMarchingAntsRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number
) {
  const dashOffset = Math.floor(t * 20) % 4;
  for (let px = x; px <= x + w; px++) {
    const isWhite = ((px + dashOffset) % 4) < 2;
    ctx.fillStyle = isWhite ? '#ffffff' : '#0f172a';
    ctx.fillRect(px, y, 1, 1);
    ctx.fillRect(px, y + h, 1, 1);
  }
  for (let py = y + 1; py < y + h; py++) {
    const isWhite = ((py + dashOffset) % 4) < 2;
    ctx.fillStyle = isWhite ? '#ffffff' : '#0f172a';
    ctx.fillRect(x, py, 1, 1);
    ctx.fillRect(x + w, py, 1, 1);
  }
}

/** Helper: Draw subtle artisan precision reticle (NO OS white arrow!) */
function drawReticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: 'cross' | 'pen' | 'eraser' | 'chisel' | 'bucket' | 'eyedropper' = 'cross',
  isPressed = false
) {
  x = Math.round(x);
  y = Math.round(y);

  if (kind === 'pen') {
    // Stylized golden stylus nib
    ctx.fillStyle = isPressed ? '#fef08a' : '#f59e0b';
    ctx.fillRect(x, y, 2, 2);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(x - 2, y - 2, 2, 2);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x - 4, y - 4, 2, 2);
    if (isPressed) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, 1, 1);
    }
  } else if (kind === 'eraser') {
    // Translucent rounded eraser block
    ctx.fillStyle = '#ffffff44';
    ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = isPressed ? '#f43f5e' : '#cbd5e1';
    ctx.fillRect(x - 2, y - 2, 4, 4);
  } else if (kind === 'chisel') {
    // 45° beveled metallic chisel wedge
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x - 3, y - 1, 4, 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x - 1, y, 2, 2);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(x - 5, y - 3, 2, 2);
  } else if (kind === 'bucket') {
    // Angled paint canister
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x - 4, y - 5, 5, 4);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x, y - 1, 2, 2);
  } else if (kind === 'eyedropper') {
    // Glass pipette tip
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(x - 4, y - 4, 3, 3);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x - 1, y - 1, 2, 2);
  } else {
    // Precision crosshair
    const c = isPressed ? '#facc15' : '#ffffffbb';
    ctx.fillStyle = c;
    ctx.fillRect(x - 2, y, 1, 1);
    ctx.fillRect(x + 2, y, 1, 1);
    ctx.fillRect(x, y - 2, 1, 1);
    ctx.fillRect(x, y + 2, 1, 1);
    ctx.fillStyle = isPressed ? '#ffffff' : '#f0be7c';
    ctx.fillRect(x, y, 1, 1);
  }
}

/**
 * Master 29x24 Handcrafted 16-bit RPG Heart Sprite Matrix
 * Legend:
 *  . = Transparent
 *  # = Dark Obsidian Outline (#240715)
 *  W = Specular Glint Highlight (#ffffff)
 *  L = Soft Rose Highlight (#fecdd3)
 *  P = Warm Pink Transition (#fda4af)
 *  B = Radiant Ruby Body (#e11d48)
 *  S = Deep Garnet Shadow (#881337)
 *  D = Dark Wine Rim Shadow (#4c0519)
 */
const HEART_MAP = [
  '.....#####.........#####.....', // 0
  '...##LLLLP##.....##BBBBB##...', // 1
  '..#BLWWWLLPB#...#BBBBBBBBB#..', // 2
  '.#BLWWWWWLPBB#.#BBBBBBBBBBB#.', // 3
  '.#BLWWWWWLLPB#.#BBBBBBBBBBB#.', // 4
  '#BBLLWWWLLPBBB#BBBBBBBBBBBSD#', // 5
  '#BBBLLLLPPBBBBBBBBBBBBBBBSSD#', // 6
  '#BBBBPPPPBBBBBBBBBBBBBBBSSSD#', // 7
  '#BBBBBBBBBBBBBBBBBBBBBBSSSSD#', // 8
  '.#BBBBBBBBBBBBBBBBBBBBSSSSD#.', // 9
  '.#BBBBBBBBBBBBBBBBBBBSSSSSD#.', // 10
  '..#BBBBBBBBBBBBBBBBBSSSSSD#..', // 11
  '...#BBBBBBBBBBBBBBBSSSSSD#...', // 12
  '....#BBBBBBBBBBBBBSSSSSD#....', // 13
  '.....#BBBBBBBBBBBSSSSSD#.....', // 14
  '......#BBBBBBBBBSSSSSD#......', // 15
  '.......#BBBBBBBSSSSSD#.......', // 16
  '........#BBBBBSSSSSD#........', // 17
  '.........#BBBSSSSSD#.........', // 18
  '..........#BBSSSSD#..........', // 19
  '...........#BSSSD#...........', // 20
  '............#SSD#............', // 21
  '.............#D#.............', // 22
  '..............#..............', // 23
];

/** Ordered 69-pixel perimeter loop for continuous stroke animations */
const PERIMETER_PATH: Array<[number, number]> = [
  [14, 5], [13, 4], [13, 3], [12, 2], [11, 1], [10, 1],
  [9, 0], [8, 0], [7, 0], [6, 0], [5, 0],
  [4, 1], [3, 1], [2, 2], [1, 3], [1, 4], [0, 5], [0, 6], [0, 7], [0, 8],
  [1, 9], [1, 10], [2, 11], [3, 12], [4, 13], [5, 14], [6, 15], [7, 16], [8, 17], [9, 18], [10, 19], [11, 20], [12, 21], [13, 22],
  [14, 23],
  [15, 22], [16, 21], [17, 20], [18, 19], [19, 18], [20, 17], [21, 16], [22, 15], [23, 14], [24, 13], [25, 12], [26, 11], [27, 10], [27, 9],
  [28, 8], [28, 7], [28, 6], [28, 5], [27, 4], [27, 3], [26, 2], [25, 1], [24, 1],
  [23, 0], [22, 0], [21, 0], [20, 0], [19, 0],
  [18, 1], [17, 1], [16, 2], [15, 3], [15, 4], [14, 5],
];

interface ProperHeartStyle {
  dx?: number;
  dy?: number;
  palette?: {
    outline?: string;
    whiteGlint?: string;
    highlight?: string;
    pink?: string;
    body?: string;
    shadow?: string;
    rimShadow?: string;
  };
  hasShading?: boolean;
  hasGlint?: boolean;
  outlineOnly?: boolean;
  selOut?: boolean;
  normalMap?: boolean;
  chiseled?: boolean;
  eraseX?: number;
}

/** Master Helper: Draw the 16-bit RPG HUD Heart Container with genuine pixel art quality */
function drawProperHeart(ctx: CanvasRenderingContext2D, style: ProperHeartStyle = {}) {
  const dx = Math.round(style.dx ?? 0);
  const dy = Math.round(style.dy ?? 0);
  const startX = 34 + dx;
  const startY = 15 + dy;

  const pal = {
    outline: style.palette?.outline ?? '#240715',
    whiteGlint: style.palette?.whiteGlint ?? '#ffffff',
    highlight: style.palette?.highlight ?? '#fecdd3',
    pink: style.palette?.pink ?? '#fda4af',
    body: style.palette?.body ?? '#e11d48',
    shadow: style.palette?.shadow ?? '#881337',
    rimShadow: style.palette?.rimShadow ?? '#4c0519',
  };

  const hasShading = style.hasShading ?? true;
  const hasGlint = style.hasGlint ?? true;
  const outlineOnly = style.outlineOnly ?? false;
  const selOut = style.selOut ?? false;
  const normalMap = style.normalMap ?? false;
  const chiseled = style.chiseled ?? false;
  const eraseX = style.eraseX ?? 999;

  for (let py = 0; py < 24; py++) {
    const row = HEART_MAP[py];
    const y = startY + py;

    for (let px = 0; px < 29; px++) {
      const x = startX + px;
      if (x >= eraseX) continue;

      const c = row[px];
      if (c === '.') continue;

      if (c === '#') {
        if (selOut) {
          if (px <= 14 && py <= 12) {
            ctx.fillStyle = '#fecdd3';
          } else if (py <= 8) {
            ctx.fillStyle = '#fda4af';
          } else {
            ctx.fillStyle = '#4c0519';
          }
        } else if (normalMap) {
          if (py <= 4) ctx.fillStyle = '#22c55e';
          else if (px >= 20) ctx.fillStyle = '#ef4444';
          else if (py >= 16) ctx.fillStyle = '#4338ca';
          else ctx.fillStyle = '#06b6d4';
        } else if (chiseled) {
          if (px <= 14 && py <= 12) ctx.fillStyle = '#fef08a';
          else ctx.fillStyle = '#1e1b4b';
        } else {
          ctx.fillStyle = pal.outline;
        }
        ctx.fillRect(x, y, 1, 1);
        continue;
      }

      if (outlineOnly) continue;

      if (!hasShading) {
        ctx.fillStyle = pal.body;
      } else {
        switch (c) {
          case 'W':
            ctx.fillStyle = hasGlint ? pal.whiteGlint : pal.highlight;
            break;
          case 'L':
            ctx.fillStyle = pal.highlight;
            break;
          case 'P':
            ctx.fillStyle = pal.pink;
            break;
          case 'B':
            ctx.fillStyle = pal.body;
            break;
          case 'S':
            ctx.fillStyle = pal.shadow;
            break;
          case 'D':
            ctx.fillStyle = pal.rimShadow;
            break;
        }
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

/** Master Scene Drawer — Pure Pixel Art Demonstrations for all 26 Studio Tools */
function drawScene(ctx: CanvasRenderingContext2D, scene: Scene, t: number) {
  drawBackdrop(ctx);
  const { actionProgress, isActionActive, isSparkleActive, isHold, sparkleProgress } = getBeatPhases(t);

  switch (scene) {
    case 'stroke': {
      // PEN TOOL: Golden Stylus draws the crisp pixel outline of the HUD Heart
      drawCheckerboard(ctx, 20, 8, 56, 38);

      const visibleCount = Math.floor(actionProgress * PERIMETER_PATH.length);

      // Render deposited outline pixels
      ctx.fillStyle = '#240715';
      for (let i = 0; i < visibleCount; i++) {
        const [px, py] = PERIMETER_PATH[i];
        ctx.fillRect(34 + px, 15 + py, 1, 1);
      }

      // If loop completed, show filled proper heart!
      if (isSparkleActive || isHold) {
        drawProperHeart(ctx);
      }

      // Leading pen reticle
      if (isActionActive && visibleCount < PERIMETER_PATH.length) {
        const [curX, curY] = PERIMETER_PATH[visibleCount];
        drawReticle(ctx, 34 + curX, 15 + curY, 'pen', true);
      } else if (!isActionActive && !isHold && actionProgress === 0) {
        drawReticle(ctx, 34 + PERIMETER_PATH[0][0], 15 + PERIMETER_PATH[0][1], 'pen', false);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 48, 38, sparkleProgress);
        drawSparkle(ctx, 41, 18, sparkleProgress);
      }
      break;
    }

    case 'curve': {
      // BEZIER CURVE: Pulling curved top lobe of the HUD Heart Container
      drawCheckerboard(ctx, 20, 8, 56, 38);

      // Ghost outline of heart base for context
      ctx.fillStyle = '#33415544';
      for (let py = 6; py < 24; py++) {
        const row = HEART_MAP[py];
        for (let px = 0; px < 29; px++) {
          if (row[px] === '#') ctx.fillRect(34 + px, 15 + py, 1, 1);
        }
      }

      const p0 = { x: 48, y: 20 }; // cleft
      const p2 = { x: 34, y: 22 }; // outer flank
      const currentControlY = 20 - actionProgress * 8;
      const currentControlX = 40 - actionProgress * 2;
      const p1 = { x: currentControlX, y: currentControlY };

      // Construction line & handle
      if (isActionActive || isHold) {
        ctx.strokeStyle = '#f59e0b66';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(p1.x - 2, p1.y - 2, 4, 4);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(p1.x - 1, p1.y - 1, 2, 2);
      }

      // Quadratic curve rasterization
      const steps = 24;
      ctx.fillStyle = '#fde047';
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const cx = Math.round((1 - u) * (1 - u) * p0.x + 2 * (1 - u) * u * p1.x + u * u * p2.x);
        const cy = Math.round((1 - u) * (1 - u) * p0.y + 2 * (1 - u) * u * p1.y + u * u * p2.y);
        ctx.fillRect(cx, cy, 1, 1);
      }

      // Anchors
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(p0.x - 1, p0.y - 1, 3, 3);
      ctx.fillRect(p2.x - 1, p2.y - 1, 3, 3);

      if (isActionActive) {
        drawReticle(ctx, p1.x, p1.y, 'cross', true);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, p1.x, p1.y, sparkleProgress);
      }
      break;
    }

    case 'erase': {
      // ERASER: Tactile scrubbing removing accidental graphite scribble from HUD Heart
      drawCheckerboard(ctx, 20, 8, 56, 38);

      // Scrubbing erase edge
      const scrubOffset = Math.sin(t * Math.PI * 16) * 1.5;
      const eraseEdgeX = isHold ? 70 : 66 - actionProgress * 22;

      // Draw pristine heart up to erase edge
      drawProperHeart(ctx, { eraseX: isActionActive ? Math.round(eraseEdgeX) : 999 });

      // Graphite scribble on right flank being erased
      if (isActionActive && eraseEdgeX < 64) {
        ctx.fillStyle = '#334155aa';
        for (let y = 22; y <= 30; y++) {
          for (let x = Math.round(eraseEdgeX); x <= 62; x++) {
            if ((x + y * 2) % 3 === 0) {
              ctx.fillRect(x, y, 1, 1);
            }
          }
        }
      }

      // Eraser reticle & falling crumbs
      if (isActionActive) {
        drawReticle(ctx, eraseEdgeX + scrubOffset, 26, 'eraser', true);
        ctx.fillStyle = '#ffffffcc';
        ctx.fillRect(Math.round(eraseEdgeX) + 2, 32 + (Math.round(actionProgress * 12) % 5), 1, 1);
        ctx.fillRect(Math.round(eraseEdgeX) + 4, 35 + (Math.round(actionProgress * 16) % 5), 1, 1);
      }

      if (isHold) {
        drawProperHeart(ctx);
      }

      if (isSparkleActive) {
        drawProperHeart(ctx);
        drawSparkle(ctx, 58, 26, sparkleProgress);
      }
      break;
    }

    case 'fill': {
      // FLOOD FILL BUCKET: True pixel-perfect flood fill filling 16-bit RPG Heart Container
      drawCheckerboard(ctx, 20, 8, 56, 38);

      // 1. Draw outer boundary in crisp dark iron
      drawProperHeart(ctx, { outlineOnly: true });

      // 2. Falling paint droplet in early phase
      if (actionProgress < 0.22) {
        const dropY = 16 + actionProgress * 38;
        ctx.fillStyle = '#e11d48';
        ctx.fillRect(47, Math.round(dropY), 2, 3);
        drawReticle(ctx, 48, 14, 'bucket', true);
      }

      // 3. True Flood fill ripple expanding from seed point (48, 25)
      if (actionProgress >= 0.22 && !isHold && !isSparkleActive) {
        const fillP = Math.min(1, (actionProgress - 0.22) / 0.58);
        const maxDist = fillP * 18;

        for (let py = 0; py < 24; py++) {
          const row = HEART_MAP[py];
          const y = 15 + py;
          for (let px = 0; px < 29; px++) {
            const x = 34 + px;
            const c = row[px];
            if (c === '.' || c === '#') continue;

            const d = Math.hypot(x - 48, (y - 25) * 1.05);
            if (d <= maxDist) {
              if (fillP < 0.95 && d > maxDist - 2.5) {
                ctx.fillStyle = '#facc15'; // Wave crest
              } else {
                ctx.fillStyle = '#e11d48';
              }
              ctx.fillRect(x, y, 1, 1);
            }
          }
        }
      }

      // 4. Specular highlight & sparkle when filled
      if (isSparkleActive || isHold) {
        drawProperHeart(ctx);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 40, 18, sparkleProgress);
      }
      break;
    }

    case 'dither': {
      // DITHER BRUSH: Eliminates harsh banding on HUD Heart with 2x2 Bayer stipple
      drawCheckerboard(ctx, 20, 8, 56, 38);

      // Base heart with flat split: left is ruby (#e11d48), right is deep shadow (#881337)
      drawProperHeart(ctx, { hasShading: false, hasGlint: false, palette: { body: '#e11d48' } });

      for (let py = 0; py < 24; py++) {
        const row = HEART_MAP[py];
        const y = 15 + py;
        for (let px = 14; px < 29; px++) {
          if (row[px] !== '.' && row[px] !== '#') {
            ctx.fillStyle = '#881337';
            ctx.fillRect(34 + px, y, 1, 1);
          }
        }
      }

      // Dither brush sweeps down the center seam
      const ditherProgressY = 16 + Math.floor(actionProgress * 20);

      for (let y = 16; y <= Math.min(36, ditherProgressY); y++) {
        for (let x = 44; x <= 52; x++) {
          const py = y - 15;
          const px = x - 34;
          if (py < 0 || py >= 24 || px < 0 || px >= 29) continue;
          if (HEART_MAP[py][px] === '.' || HEART_MAP[py][px] === '#') continue;

          const isDither = (x + y) % 2 === 0;
          if (x < 48 && isDither) {
            ctx.fillStyle = '#881337';
            ctx.fillRect(x, y, 1, 1);
          } else if (x >= 48 && isDither) {
            ctx.fillStyle = '#e11d48';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }

      if (isActionActive) {
        drawReticle(ctx, 48, ditherProgressY, 'cross', true);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 48, 26, sparkleProgress);
      }
      break;
    }

    case 'recolor': {
      // COLOR REPLACE: Red Health Heart swaps to Sapphire Mana Heart instantly
      drawCheckerboard(ctx, 20, 8, 56, 38);

      const isSwapped = actionProgress > 0.42;

      if (!isSwapped) {
        drawProperHeart(ctx);
      } else {
        drawProperHeart(ctx, {
          palette: {
            outline: '#0f172a',
            whiteGlint: '#ffffff',
            highlight: '#bfdbfe',
            pink: '#60a5fa',
            body: '#2563eb',
            shadow: '#1e3a8a',
            rimShadow: '#172554',
          },
        });
      }

      // Swapping ripple wave
      if (isActionActive && actionProgress > 0.35 && actionProgress < 0.75) {
        ctx.strokeStyle = '#38bdf8aa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(48, 26, (actionProgress - 0.35) * 55, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 48, 26, sparkleProgress);
      }
      break;
    }

    case 'erase-color': {
      // ERASE SAMPLED COLOR: Erases cyan sketch pencil marks, leaves HUD Heart intact!
      drawCheckerboard(ctx, 20, 8, 56, 38);

      drawProperHeart(ctx);

      const eraseSweepX = 30 + actionProgress * 38;
      ctx.fillStyle = '#38bdf8';
      for (let i = 0; i < 28; i++) {
        const sx = 34 + i;
        const sy = 16 + ((i * 7) % 20);
        if (sx > eraseSweepX) {
          ctx.fillRect(sx, sy, 2, 2);
        }
      }

      if (isActionActive) {
        drawReticle(ctx, eraseSweepX, 26, 'cross', true);
        ctx.fillStyle = '#38bdf8aa';
        ctx.fillRect(Math.round(eraseSweepX), 14, 1, 26);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 48, 26, sparkleProgress);
      }
      break;
    }

    case 'select-box': {
      // MARQUEE BOX: Drag rectangle selection, then float/move HUD Heart with drop shadow
      drawCheckerboard(ctx, 20, 8, 56, 38);

      const offsetX = isHold ? 6 : (actionProgress > 0.6 ? Math.round((actionProgress - 0.6) * 15) : 0);
      const offsetY = isHold ? -4 : (actionProgress > 0.6 ? -Math.round((actionProgress - 0.6) * 10) : 0);

      // Drop shadow when floating
      if (offsetX > 0) {
        ctx.fillStyle = '#0f172a66';
        drawProperHeart(ctx, {
          dx: 0,
          dy: 0,
          palette: {
            outline: '#0f172a66',
            body: '#0f172a66',
            highlight: '#0f172a66',
            pink: '#0f172a66',
            shadow: '#0f172a66',
            rimShadow: '#0f172a66',
            whiteGlint: '#0f172a66',
          },
          hasShading: false,
          hasGlint: false,
        });
      }

      // Floating HUD Heart
      drawProperHeart(ctx, { dx: offsetX, dy: offsetY });

      const dragW = Math.round(34 * Math.min(1, actionProgress * 1.8));
      const dragH = Math.round(28 * Math.min(1, actionProgress * 1.8));

      drawMarchingAntsRect(ctx, 31 + offsetX, 13 + offsetY, dragW, dragH, t);

      if (isActionActive && actionProgress < 0.6) {
        drawReticle(ctx, 31 + dragW, 13 + dragH, 'cross', true);
      }
      break;
    }

    case 'select-lasso': {
      // LASSO SELECT: Freehand boundary traces around HUD Heart, snaps to marching ants
      drawCheckerboard(ctx, 20, 8, 56, 38);

      drawProperHeart(ctx);

      const lassoLoop: Array<[number, number]> = [
        [48, 13], [40, 12], [32, 16], [30, 24], [35, 33], [44, 39], [48, 41],
        [52, 39], [61, 33], [66, 24], [64, 16], [56, 12], [48, 13],
      ];

      const count = Math.min(lassoLoop.length, Math.floor(actionProgress * lassoLoop.length * 1.3));

      for (let i = 0; i < count - 1; i++) {
        drawBresenhamLine(ctx, lassoLoop[i][0], lassoLoop[i][1], lassoLoop[i + 1][0], lassoLoop[i + 1][1], '#ffffff', 1);
      }

      if (count >= lassoLoop.length || isHold || isSparkleActive) {
        drawMarchingAntsRect(ctx, 29, 12, 38, 30, t);
      }

      if (isActionActive && count < lassoLoop.length) {
        drawReticle(ctx, lassoLoop[count][0], lassoLoop[count][1], 'cross', true);
      }
      break;
    }

    case 'select-wand': {
      // MAGIC WAND: Clicks inside HUD Heart, marching ants envelope matching ruby region
      drawCheckerboard(ctx, 20, 8, 56, 38);

      drawProperHeart(ctx);

      if (actionProgress > 0.3 || isSparkleActive || isHold) {
        drawMarchingAntsRect(ctx, 33, 14, 30, 24, t);
      }

      if (isActionActive && actionProgress <= 0.4) {
        drawReticle(ctx, 44, 25, 'cross', true);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 44, 25, sparkleProgress);
      }
      break;
    }

    case 'line': {
      // LINE TOOL: Golden hero arrow with Bresenham raster stepping pointing to HUD Heart
      drawCheckerboard(ctx, 20, 8, 56, 38);
      drawProperHeart(ctx);

      const x0 = 18;
      const y0 = 42;
      const x1 = 18 + Math.round(actionProgress * 26);
      const y1 = 42 - Math.round(actionProgress * 18);

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x0 - 1, y0 - 1, 3, 3);
      drawBresenhamLine(ctx, x0, y0, x1, y1, '#fde047', 1);

      // Arrowhead
      if (actionProgress >= 0.8 || isHold || isSparkleActive) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(44, 24, 3, 3);
        ctx.fillRect(42, 23, 1, 2);
        ctx.fillRect(43, 26, 2, 1);
      }

      if (isActionActive) {
        drawReticle(ctx, x1, y1, 'cross', true);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 44, 24, sparkleProgress);
      }
      break;
    }

    case 'iso': {
      // 2:1 ISOMETRIC LINE: Strict 2:1 stepping demonstrated with proper HUD Heart
      drawCheckerboard(ctx, 20, 8, 56, 38);
      drawProperHeart(ctx);

      const x0 = 24;
      const y0 = 16;
      const totalSteps = 24;
      const steps = Math.min(totalSteps, Math.floor(actionProgress * (totalSteps + 2)));

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x0 - 1, y0 - 1, 3, 3);

      // Strict 2:1 isometric stepping (2 pixels horizontal, 1 pixel vertical)
      ctx.fillStyle = '#fde047';
      for (let s = 0; s < steps; s++) {
        ctx.fillRect(x0 + s * 2, y0 + s, 2, 1);
      }

      if (isActionActive && steps < totalSteps) {
        drawReticle(ctx, x0 + steps * 2, y0 + steps, 'cross', true);
      } else if (isHold || isSparkleActive) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x0 + totalSteps * 2 - 1, y0 + totalSteps - 1, 3, 3);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, x0 + totalSteps * 2, y0 + totalSteps, sparkleProgress);
      }
      break;
    }

    case 'rectangle': {
      // RECTANGLE TOOL: Drag out golden UI HUD bracket framing the HUD Heart Container
      drawCheckerboard(ctx, 20, 8, 56, 38);
      drawProperHeart(ctx);

      const rx = 24;
      const ry = 10;
      const rw = Math.round(actionProgress * 48);
      const rh = Math.round(actionProgress * 32);

      ctx.fillStyle = '#f59e0b';
      for (let px = rx; px <= rx + rw; px++) {
        ctx.fillRect(px, ry, 1, 1);
        ctx.fillRect(px, ry + rh, 1, 1);
      }
      for (let py = ry; py <= ry + rh; py++) {
        ctx.fillRect(rx, py, 1, 1);
        ctx.fillRect(rx + rw, py, 1, 1);
      }

      if (isActionActive) {
        drawReticle(ctx, rx + rw, ry + rh, 'cross', true);
      } else if (isHold || isSparkleActive) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(rx, ry, 2, 2);
        ctx.fillRect(rx + 46, ry, 2, 2);
        ctx.fillRect(rx, ry + 30, 2, 2);
        ctx.fillRect(rx + 46, ry + 30, 2, 2);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, rx + 48, ry + 32, sparkleProgress);
      }
      break;
    }

    case 'ellipse': {
      // ELLIPSE TOOL: Continuous Midpoint Ellipse Algorithm drawing mana shield bubble around HUD Heart
      drawCheckerboard(ctx, 20, 8, 56, 38);
      drawProperHeart(ctx);

      const cx = 48;
      const cy = 26;
      const maxRx = 26;
      const maxRy = 16;
      const currentRx = isHold ? maxRx : Math.max(3, Math.round(actionProgress * maxRx));
      const currentRy = isHold ? maxRy : Math.max(2, Math.round(actionProgress * maxRy));

      // Drag corner brackets
      if (isActionActive && actionProgress < 0.95) {
        ctx.fillStyle = '#38bdf888';
        const bx0 = cx - currentRx;
        const by0 = cy - currentRy;
        const bx1 = cx + currentRx;
        const by1 = cy + currentRy;
        ctx.fillRect(bx0, by0, 3, 1);
        ctx.fillRect(bx0, by0, 1, 3);
        ctx.fillRect(bx1 - 2, by0, 3, 1);
        ctx.fillRect(bx1, by0, 1, 3);
        ctx.fillRect(bx0, by1, 3, 1);
        ctx.fillRect(bx0, by1 - 2, 1, 3);
        ctx.fillRect(bx1 - 2, by1, 3, 1);
        ctx.fillRect(bx1, by1 - 2, 1, 3);
      }

      // Draw continuous pixel-perfect ellipse shield ring
      drawMidpointEllipse(ctx, cx, cy, currentRx, currentRy, '#38bdf8');

      if (isHold || isSparkleActive || actionProgress >= 0.85) {
        drawMidpointEllipse(ctx, cx, cy, currentRx - 2, currentRy - 2, '#38bdf822');
      }

      if (isActionActive) {
        drawReticle(ctx, cx + currentRx, cy + currentRy, 'cross', true);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, cx + currentRx, cy, sparkleProgress);
      }
      break;
    }

    case 'depth': {
      // NORMAL CHISEL & 3D DEPTH:
      // Flat 2D HUD Heart -> Chisel carves 3D normal bevel -> Light turns on creating embossed 3D relief!
      drawCheckerboard(ctx, 20, 8, 56, 38);

      const isCarving = actionProgress > 0.25 && actionProgress <= 0.70;
      const isLit = actionProgress > 0.70 || isSparkleActive || isHold;

      if (!isCarving && !isLit) {
        // Flat 2D heart
        drawProperHeart(ctx, { hasShading: false, hasGlint: false });
      } else if (isCarving) {
        // Chisel carving along edge: normal map colors on carved bevel
        drawProperHeart(ctx, { normalMap: true, hasGlint: false });
        const sweepX = 34 + Math.round(((actionProgress - 0.25) / 0.45) * 28);
        drawReticle(ctx, sweepX, 18, 'chisel', true);
      } else {
        // Directional light hits carved bevels: embossed 3D relief!
        drawProperHeart(ctx, { chiseled: true, hasGlint: true });

        // Overhead light gizmo
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(18, 12, 3, 3);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(17, 13, 5, 1);
        ctx.fillRect(19, 11, 1, 5);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 40, 18, sparkleProgress);
      }
      break;
    }

    case 'sel-out': {
      // SELECTIVE OUTLINING (SEL-OUT):
      // HUD Heart transforms harsh solid black outline into light-aware colored edges!
      drawCheckerboard(ctx, 20, 8, 56, 38);

      const isSelOut = actionProgress > 0.35 || isSparkleActive || isHold;

      drawProperHeart(ctx, {
        selOut: isSelOut,
        palette: isSelOut ? undefined : { outline: '#000000' },
      });

      // Sel-Out brush sweep
      if (isActionActive && actionProgress <= 0.6) {
        const sweepX = 33 + (actionProgress / 0.6) * 30;
        drawReticle(ctx, sweepX, 15, 'pen', true);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 41, 17, sparkleProgress);
      }
      break;
    }

    case 'rivet': {
      // RIVET STAMP: Stamps 3D embossed rivets onto armored bracket holding HUD Heart
      drawCheckerboard(ctx, 20, 8, 56, 38);

      // Armored iron bracket
      ctx.fillStyle = '#334155';
      ctx.fillRect(22, 10, 52, 34);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(24, 12, 48, 30);

      // Inset HUD Heart
      drawProperHeart(ctx);

      const rivets = [[27, 14], [68, 14], [27, 38], [68, 38]];
      const count = Math.min(4, Math.floor(actionProgress * 4.8));

      for (let i = 0; i < count; i++) {
        const [rx, ry] = rivets[i];
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(rx - 2, ry - 2, 5, 5);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(rx - 1, ry - 1, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(rx - 1, ry - 1, 1, 1);
      }

      if (isActionActive && count < 4) {
        const target = rivets[count];
        drawReticle(ctx, target[0], target[1], 'cross', true);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 27, 14, sparkleProgress);
        drawSparkle(ctx, 68, 14, sparkleProgress);
      }
      break;
    }

    case 'eyedropper': {
      // EYEDROPPER: Loupe magnifier inspects HUD Heart pixels, captures exact hex swatch
      drawCheckerboard(ctx, 20, 8, 56, 38);
      drawProperHeart(ctx);

      const sampleProgress = Math.min(1, actionProgress * 1.3);
      const sampleX = 36 + Math.round(sampleProgress * 24);
      const sampleY = 22;

      const activeColor = sampleX < 42 ? '#ffffff' : (sampleX < 50 ? '#e11d48' : '#881337');

      // Magnifier Loupe
      const loupeX = Math.min(74, Math.max(22, sampleX));
      const loupeY = 8;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(loupeX - 7, loupeY, 14, 14);
      ctx.fillStyle = activeColor;
      ctx.fillRect(loupeX - 5, loupeY + 2, 10, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(loupeX - 1, loupeY + 5, 2, 4);
      ctx.fillRect(loupeX - 3, loupeY + 6, 6, 2);

      drawReticle(ctx, sampleX, sampleY, 'eyedropper', true);

      if (isSparkleActive || isHold) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(42, 44, 12, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(43, 45, 10, 4);
        ctx.fillStyle = activeColor;
        ctx.fillRect(44, 45, 8, 4);
      }
      break;
    }

    case 'light': {
      // 3D LIGHT BULB: Point light orbits 2.5D embossed HUD Heart, casting dynamic cel-shading
      const angle = actionProgress * Math.PI * 2;
      const lightX = isHold ? 34 : 48 + Math.cos(angle) * 26;
      const lightY = isHold ? 16 : 26 + Math.sin(angle) * 14;

      // Draw heart with light-responsive shading
      const isLightRight = lightX > 48;
      drawProperHeart(ctx, {
        palette: isLightRight
          ? {
              highlight: '#fb7185',
              pink: '#f43f5e',
              body: '#be123c',
              shadow: '#9f1239',
              rimShadow: '#881337',
            }
          : undefined,
      });

      // Glowing light bulb gizmo
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(Math.round(lightX) - 2, Math.round(lightY) - 2, 5, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(lightX) - 1, Math.round(lightY) - 1, 3, 3);

      if (isSparkleActive) {
        drawSparkle(ctx, 42, 20, sparkleProgress);
      }
      break;
    }

    case 'shadow': {
      // RAYMARCHED GROUND SHADOW: HUD Heart floats above floor, casting dynamic skewed contact shadow
      // Floor horizon & atelier tiles
      ctx.fillStyle = '#221933';
      ctx.fillRect(0, 42, W, 12);
      ctx.fillStyle = '#312347';
      ctx.fillRect(0, 42, W, 1);
      // Floor perspective tiles
      for (let tx = 10; tx < W; tx += 16) {
        ctx.fillRect(tx, 43, 1, 11);
      }

      // Floating HUD Heart bobbing gently
      const hoverBob = Math.sin(t * Math.PI * 2) * 2.5;
      const heartY = -4 + hoverBob;

      // Contact shadow on floor plane (y = 44..48)
      const lightSkew = (actionProgress - 0.5) * 24;
      const shadowW = 24 + Math.abs(lightSkew) * 0.3;
      const shadowH = Math.max(3, 5 - Math.abs(hoverBob));

      // Penumbra (soft outer shadow)
      ctx.fillStyle = '#0a051488';
      ctx.fillRect(Math.round(48 + lightSkew - shadowW / 2 - 2), 44, Math.round(shadowW + 4), shadowH + 2);

      // Umbra (dark contact core)
      ctx.fillStyle = '#080310ee';
      ctx.fillRect(Math.round(48 + lightSkew - shadowW / 2), 44, Math.round(shadowW), shadowH);

      // Floating HUD Heart
      drawProperHeart(ctx, { dy: heartY });

      // Directional light indicator ray in top-left
      ctx.fillStyle = '#fef08a44';
      ctx.fillRect(16, 10, 2, 2);
      ctx.fillRect(20, 14, 2, 2);
      ctx.fillRect(24, 18, 2, 2);
      break;
    }

    case 'glow': {
      // SPECULAR GLINT (PHOTOMETRIC LIGHTING):
      // Directional scene light strikes convex glossy heart facets, calculating 3D Blinn-Phong specular glints!
      drawCheckerboard(ctx, 20, 8, 56, 38);

      // Light angle sweeps smoothly across the upper-left sky dome
      const lightSweep = isHold
        ? 0
        : Math.sin(actionProgress * Math.PI) * 0.35;
      const lightX = 22 + lightSweep * 20;
      const lightY = 11 - Math.abs(lightSweep) * 3;

      // 1. Directional Light Source Gizmo (Top-Left Key Light)
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(Math.round(lightX) - 1, Math.round(lightY) - 1, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(lightX), Math.round(lightY), 1, 1);

      // 2. Focused directional illumination rays casting down onto the heart
      ctx.strokeStyle = '#fef08a44';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(lightX + 2, lightY + 2);
      ctx.lineTo(39, 18);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Heart with matte diffuse shading before specular calculation triggers:
      const hasSpecular = actionProgress > 0.22 || isSparkleActive || isHold;

      drawProperHeart(ctx, { hasGlint: hasSpecular });

      // 4. When light strikes, 3D Blinn-Phong specular reflection pill tracks the surface normal:
      if (hasSpecular) {
        const specX = Math.round(40 + lightSweep * 10);
        const specY = 18;

        // Brilliant specular pill core (pure #ffffff highlight pill)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(specX - 1, specY, 3, 2);
        ctx.fillRect(specX, specY - 1, 1, 4);

        // Specular gleam flare line across facet
        if (isActionActive && actionProgress > 0.35) {
          ctx.fillStyle = '#ffffffaa';
          ctx.fillRect(specX - 3, specY, 1, 1);
          ctx.fillRect(specX + 3, specY, 1, 1);
        }

        // Secondary subtle glint on right lobe when light is high
        if (lightSweep > 0.12) {
          ctx.fillStyle = '#ffffffdd';
          ctx.fillRect(55, 18, 2, 2);
        }
      }

      // 5. Razor-sharp pure white diamond reflection flare at peak specular alignment
      if (isSparkleActive || (isActionActive && actionProgress > 0.52 && actionProgress < 0.72)) {
        drawDiamondGlint(ctx, 40, 18, 2);
      }
      break;
    }

    case 'clean': {
      // SCAN ARTWORK (DIAGNOSTIC ANALYSIS):
      // Scans layer for faint alpha, detached specks, and thick dark edges WITHOUT modifying pixels!
      drawCheckerboard(ctx, 20, 8, 56, 38);

      const scanX = 20 + Math.round(actionProgress * 56);

      // Faint alpha smudges and detached specks on canvas
      ctx.fillStyle = '#e11d4844'; // Faint alpha smudge
      ctx.fillRect(26, 16, 2, 2);
      ctx.fillRect(66, 34, 2, 2);

      ctx.fillStyle = '#e11d48'; // Detached stray specks
      ctx.fillRect(24, 32, 1, 1);
      ctx.fillRect(70, 16, 1, 1);

      // Semi-transparent blurry border pixels
      ctx.fillStyle = '#24071566';
      ctx.fillRect(33, 20, 1, 2);
      ctx.fillRect(63, 20, 1, 2);

      drawProperHeart(ctx);

      // Real-time diagnostic inspection brackets lock onto issues as scanner passes
      let issuesFound = 0;
      if (scanX > 25) {
        issuesFound++;
        ctx.strokeStyle = '#ef4444'; // Red bracket for stray speck
        ctx.strokeRect(23, 31, 3, 3);
      }
      if (scanX > 27) {
        issuesFound++;
        ctx.strokeStyle = '#f59e0b'; // Amber bracket for faint alpha
        ctx.strokeRect(25, 15, 4, 4);
      }
      if (scanX > 34) {
        issuesFound++;
        ctx.strokeStyle = '#38bdf8'; // Cyan bracket for blurry edge
        ctx.strokeRect(32, 19, 3, 4);
      }
      if (scanX > 64) {
        issuesFound++;
        ctx.strokeStyle = '#38bdf8';
        ctx.strokeRect(62, 19, 3, 4);
      }
      if (scanX > 67) {
        issuesFound++;
        ctx.strokeStyle = '#f59e0b';
        ctx.strokeRect(65, 33, 4, 4);
      }
      if (scanX > 71) {
        issuesFound++;
        ctx.strokeStyle = '#ef4444';
        ctx.strokeRect(69, 15, 3, 3);
      }

      // Laser scanner beam
      if (isActionActive) {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(scanX, 10, 1, 34);
        ctx.fillStyle = '#34d39933';
        ctx.fillRect(scanX - 2, 10, 5, 34);
      }

      // Scanner HUD status badge in top-left
      ctx.fillStyle = '#0f172aee';
      ctx.fillRect(4, 4, 60, 9);
      ctx.fillStyle = isHold || isSparkleActive ? '#10b981' : '#f59e0b';
      ctx.font = '7px monospace';
      ctx.fillText(
        isHold || isSparkleActive ? 'SCAN: 6 DETECTED' : `SCAN: ${issuesFound}/6 FOUND`,
        6,
        11
      );

      // Readout note in bottom-right confirming non-destructive behavior
      ctx.fillStyle = '#0f172acc';
      ctx.fillRect(44, 45, 48, 7);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '6px monospace';
      ctx.fillText('READ-ONLY SCAN', 46, 51);

      if (isSparkleActive) {
        drawSparkle(ctx, 48, 26, sparkleProgress);
      }
      break;
    }

    case 'rotate': {
      // ROTSPRITE CLEAN ROTATION: 8x Scale2x nearest-neighbor rotation preserves 100% crisp pixel edges
      drawCheckerboard(ctx, 20, 8, 56, 38);

      const targetAngle = isHold || isSparkleActive ? 45 : Math.round(actionProgress * 45);
      const rad = (targetAngle * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);

      const cx = 48;
      const cy = 26;

      // Nearest-neighbor integer grid sampling for crisp pixel art rotation (RotSprite)
      if (targetAngle === 0) {
        drawProperHeart(ctx);
      } else {
        // Draw 100% crisp integer-grid rotated heart
        for (let dy = -16; dy <= 16; dy++) {
          for (let dx = -18; dx <= 18; dx++) {
            const x = cx + dx;
            const y = cy + dy;

            // Inverse affine transformation to sample source heart map
            const srcX = Math.round(cosA * dx + sinA * dy + 14);
            const srcY = Math.round(-sinA * dx + cosA * dy + 12);

            if (srcY >= 0 && srcY < 24 && srcX >= 0 && srcX < 29) {
              const c = HEART_MAP[srcY][srcX];
              if (c === '.') continue;

              if (c === '#') ctx.fillStyle = '#240715';
              else if (c === 'W') ctx.fillStyle = '#ffffff';
              else if (c === 'L') ctx.fillStyle = '#fecdd3';
              else if (c === 'P') ctx.fillStyle = '#fda4af';
              else if (c === 'B') ctx.fillStyle = '#e11d48';
              else if (c === 'S') ctx.fillStyle = '#881337';
              else if (c === 'D') ctx.fillStyle = '#4c0519';

              ctx.fillRect(x, y, 1, 1);
            }
          }
        }
      }

      // Top-left RotSprite 0% blur badge
      ctx.fillStyle = '#0f172aee';
      ctx.fillRect(4, 4, 52, 9);
      ctx.fillStyle = '#10b981';
      ctx.font = '7px monospace';
      ctx.fillText('ROTSPRITE: CRISP', 6, 11);

      // Angle indicator readout in top-right
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(72, 4, 20, 9);
      ctx.fillStyle = '#140d1f';
      ctx.font = '7px monospace';
      ctx.fillText(`${targetAngle}°`, 75, 11);

      if (isSparkleActive) {
        drawSparkle(ctx, 48, 26, sparkleProgress);
      }
      break;
    }

    case 'tiles': {
      // TILESET DECOMPOSER: 3x3 autotile dungeon room with HUD Heart stone relief emblem
      const count = Math.min(9, Math.floor(actionProgress * 11));
      for (let i = 0; i < count; i++) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const tx = 27 + col * 14;
        const ty = 7 + row * 14;

        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(tx + 1, ty + 1, 12, 12);
        ctx.fillStyle = '#475569';
        ctx.fillRect(tx, ty, 14, 1);
        ctx.fillRect(tx, ty, 1, 14);
        ctx.fillRect(tx + 13, ty, 1, 14);
        ctx.fillRect(tx, ty + 13, 14, 1);

        // Center tile features miniature HUD Heart
        if (col === 1 && row === 1) {
          ctx.fillStyle = '#e11d48';
          ctx.fillRect(tx + 3, ty + 4, 3, 2);
          ctx.fillRect(tx + 7, ty + 4, 3, 2);
          ctx.fillRect(tx + 2, ty + 6, 9, 3);
          ctx.fillRect(tx + 4, ty + 9, 5, 2);
          ctx.fillRect(tx + 6, ty + 11, 1, 1);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(tx + 3, ty + 4, 1, 1);
        }
      }
      break;
    }

    case 'animate': {
      // IN-BETWEEN TWEENING: 16-bit RPG Heartbeat pulse with squash, stretch & onion-skin trails
      const pulseT = Math.sin(actionProgress * Math.PI * 4);
      const squash = pulseT * 2.5;

      // Cyan onion-skin ghost breakdown
      ctx.fillStyle = '#06b6d433';
      ctx.fillRect(36, 17, 24, 18);

      // Orange onion-skin ghost breakdown
      ctx.fillStyle = '#f9731633';
      ctx.fillRect(34, 16, 28, 20);

      // Beating HUD Heart
      ctx.save();
      ctx.translate(48, 26);
      ctx.scale(1 + squash * 0.08, 1 - squash * 0.08);
      ctx.translate(-48, -26);

      drawProperHeart(ctx);

      ctx.restore();

      if (isSparkleActive) {
        drawSparkle(ctx, 40, 18, sparkleProgress);
        drawSparkle(ctx, 55, 18, sparkleProgress);
      }
      break;
    }

    case 'palette': {
      // PALETTE HARMONIZER: Snaps unharmonized muddy colors into cohesive Ruby Health Heart palette
      const swatches = ['#240715', '#4c0519', '#881337', '#e11d48', '#fb7185', '#fecdd3', '#ffffff'];
      swatches.forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.fillRect(20 + i * 8, 44, 7, 4);
      });

      const isHarmonized = actionProgress > 0.45 || isSparkleActive || isHold;

      drawProperHeart(ctx, {
        palette: isHarmonized
          ? undefined
          : {
              outline: '#3f3f46',
              whiteGlint: '#d4d4d8',
              highlight: '#a1a1aa',
              pink: '#71717a',
              body: '#857850', // muddy unharmonized tone
              shadow: '#52525b',
              rimShadow: '#27272a',
            },
      });

      if (isSparkleActive) {
        drawSparkle(ctx, 48, 26, sparkleProgress);
      }
      break;
    }

    case 'jaggies': {
      // SMOOTH JAGGIES (DE-JAGGY):
      // Scans 2x2 staircase steps along diagonal contours and inserts smooth intermediate OKLab blend pixels
      drawCheckerboard(ctx, 20, 8, 56, 38);

      const isClean = isHold || isSparkleActive;
      const descendProgress = isClean ? 1 : actionProgress;
      const currentY = 25 + descendProgress * 13;

      // Draw base HUD Heart
      drawProperHeart(ctx);

      // Diagonal stair-step crook coordinates along the lower heart taper:
      // Left outer crooks: (36, 27), (37, 28), (38, 29), (39, 30), (40, 31), (41, 32), (42, 33), (43, 34), (44, 35), (45, 36), (46, 37)
      // Right outer crooks: (60, 27), (59, 28), (58, 29), (57, 30), (56, 31), (55, 32), (54, 33), (53, 34), (52, 35), (51, 36), (50, 37)
      const leftCrooks: Array<[number, number]> = [
        [36, 27], [37, 28], [38, 29], [39, 30], [40, 31],
        [41, 32], [42, 33], [43, 34], [44, 35], [45, 36], [46, 37],
      ];
      const rightCrooks: Array<[number, number]> = [
        [60, 27], [59, 28], [58, 29], [57, 30], [56, 31],
        [55, 32], [54, 33], [53, 34], [52, 35], [51, 36], [50, 37],
      ];

      // Insert smooth intermediate OKLab blend pixels behind the descending de-jaggy sweep
      for (const [cx, cy] of leftCrooks) {
        if (cy <= currentY) {
          // Outer AA blend pixel (soft obsidian blend with background)
          ctx.fillStyle = '#24071588';
          ctx.fillRect(cx, cy, 1, 1);
          // Inner AA blend pixel (OKLab transition between dark outline and ruby)
          ctx.fillStyle = '#9f1239aa';
          ctx.fillRect(cx + 2, cy - 1, 1, 1);
        }
      }

      for (const [cx, cy] of rightCrooks) {
        if (cy <= currentY) {
          // Outer AA blend pixel
          ctx.fillStyle = '#24071588';
          ctx.fillRect(cx, cy, 1, 1);
          // Inner AA blend pixel
          ctx.fillStyle = '#4c0519aa';
          ctx.fillRect(cx - 2, cy - 1, 1, 1);
        }
      }

      // De-Jaggy scanner stylus & 2x2 detection reticle at current sweep height
      if (isActionActive && !isClean) {
        const activeIdx = Math.min(leftCrooks.length - 1, Math.floor(descendProgress * leftCrooks.length));
        const [lx, ly] = leftCrooks[activeIdx];
        const [rx, ry] = rightCrooks[activeIdx];

        // 2x2 L-crook detection boxes
        ctx.strokeStyle = '#38bdf8';
        ctx.strokeRect(lx - 1, ly - 1, 3, 3);
        ctx.strokeRect(rx - 1, ry - 1, 3, 3);

        // Stylus crosshairs
        drawReticle(ctx, lx, ly, 'pen', true);
        drawReticle(ctx, rx, ry, 'pen', true);

        // OKLab blend sparks
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(lx, ly, 1, 1);
        ctx.fillRect(rx, ry, 1, 1);
      }

      // Top HUD status badge
      ctx.fillStyle = '#0f172aee';
      ctx.fillRect(4, 4, 64, 9);
      ctx.fillStyle = isClean ? '#10b981' : '#38bdf8';
      ctx.font = '7px monospace';
      ctx.fillText(
        isClean ? 'CURVES: OKLab AA' : 'DE-JAGGY: INSERT AA',
        6,
        11
      );

      // Bottom algorithm note
      ctx.fillStyle = '#0f172acc';
      ctx.fillRect(42, 45, 50, 7);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '6px monospace';
      ctx.fillText('2x2 L-CROOK BLEND', 44, 51);

      if (isSparkleActive) {
        drawSparkle(ctx, 48, 37, sparkleProgress);
        drawSparkle(ctx, 36, 26, sparkleProgress);
        drawSparkle(ctx, 60, 26, sparkleProgress);
      }
      break;
    }

    case 'thin': {
      // THIN TO 1PX (ZHANG-SUEN MORPHOLOGY):
      // Parallel skeleton thinning peels thick strokes layer by layer to 1px medial axis
      drawCheckerboard(ctx, 20, 8, 56, 38);

      const phase = isHold || isSparkleActive ? 3 : (
        actionProgress < 0.32 ? 1 : (actionProgress < 0.68 ? 2 : 3)
      );

      if (phase === 1) {
        // Phase 1: Thick 3px chubby hand-drawn heart stroke
        ctx.fillStyle = '#240715';
        for (const [px, py] of PERIMETER_PATH) {
          const cx = 34 + px;
          const cy = 15 + py;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              ctx.fillRect(cx + dx, cy + dy, 1, 1);
            }
          }
        }
        // Base ruby interior fill
        drawProperHeart(ctx, { hasShading: false, hasGlint: false });
      } else if (phase === 2) {
        // Phase 2: Zhang-Suen Sub-iteration 1 (outermost layer peeled away, stroke is 2px)
        ctx.fillStyle = '#240715';
        for (const [px, py] of PERIMETER_PATH) {
          const cx = 34 + px;
          const cy = 15 + py;
          ctx.fillRect(cx, cy, 1, 1);
          if (py < 12) ctx.fillRect(cx, cy - 1, 1, 1);
          else if (px < 14) ctx.fillRect(cx - 1, cy, 1, 1);
          else ctx.fillRect(cx + 1, cy, 1, 1);
        }
        drawProperHeart(ctx, { hasShading: false, hasGlint: false });

        // Falling trimmed pixel flakes / dust
        ctx.fillStyle = '#38bdf8';
        const flakeY = 20 + Math.round((actionProgress - 0.32) * 50) % 22;
        ctx.fillRect(30, flakeY, 1, 1);
        ctx.fillRect(66, flakeY + 2, 1, 1);
      } else {
        // Phase 3: Zhang-Suen Sub-iteration 2 (converged to exact 1px medial axis skeleton!)
        drawProperHeart(ctx);
      }

      // Morphology laser probe line
      if (isActionActive && phase < 3) {
        const sweepY = 12 + Math.round(actionProgress * 30);
        ctx.fillStyle = '#38bdf888';
        ctx.fillRect(24, sweepY, 48, 1);
      }

      // Top HUD status badge
      ctx.fillStyle = '#0f172aee';
      ctx.fillRect(4, 4, 68, 9);
      ctx.fillStyle = phase === 3 ? '#10b981' : (phase === 2 ? '#38bdf8' : '#f59e0b');
      ctx.font = '7px monospace';
      ctx.fillText(
        phase === 3
          ? 'SKELETON: 1PX MEDIAL'
          : (phase === 2 ? 'ZHANG-SUEN: PASS 1' : 'STROKE: 3PX THICK'),
        6,
        11
      );

      // Bottom algorithm note
      ctx.fillStyle = '#0f172acc';
      ctx.fillRect(40, 45, 52, 7);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '6px monospace';
      ctx.fillText('ZHANG-SUEN (1984)', 42, 51);

      if (isSparkleActive) {
        drawSparkle(ctx, 48, 20, sparkleProgress);
        drawSparkle(ctx, 36, 17, sparkleProgress);
        drawSparkle(ctx, 60, 17, sparkleProgress);
      }
      break;
    }

    case 'strays': {
      // ERASE STRAY PIXELS (4-CONNECTIVITY FILTER):
      // Finds and erases single disconnected pixels with 0 orthogonal neighbors surrounded by air
      drawCheckerboard(ctx, 20, 8, 56, 38);

      // Centered HUD Heart is 100% connected & protected!
      drawProperHeart(ctx);

      // 5 isolated orphan specks (0 orthogonal neighbors):
      const orphanStrays: Array<[number, number]> = [
        [24, 16],
        [26, 36],
        [48, 10],
        [70, 15],
        [72, 34],
      ];

      // 1 legitimate 2-pixel connected cluster (has 1 neighbor, must NOT be erased!):
      const connectedCluster: Array<[number, number]> = [
        [22, 25],
        [23, 25],
      ];

      // Draw the connected cluster (always kept!)
      ctx.fillStyle = '#38bdf8';
      for (const [cx, cy] of connectedCluster) {
        ctx.fillRect(cx, cy, 1, 1);
      }

      // Sequential inspection:
      const totalSteps = orphanStrays.length + 1; // 5 orphans + 1 connected check
      const currentStep = isHold || isSparkleActive
        ? totalSteps
        : Math.floor(actionProgress * (totalSteps + 1));

      // Draw remaining un-erased orphan strays
      for (let i = 0; i < orphanStrays.length; i++) {
        // Orphans are erased when their step has passed
        if (i >= currentStep) {
          const [sx, sy] = orphanStrays[i];
          ctx.fillStyle = '#e11d48';
          ctx.fillRect(sx, sy, 1, 1);
        }
      }

      // Active reticle targeting & neighbor checking:
      if (isActionActive && currentStep < totalSteps) {
        if (currentStep < orphanStrays.length) {
          // Checking an orphan speck:
          const [tx, ty] = orphanStrays[currentStep];

          // 4-cardinal neighbor inspection brackets (N, S, E, W)
          ctx.fillStyle = '#ef444466';
          ctx.fillRect(tx, ty - 2, 1, 1); // North
          ctx.fillRect(tx, ty + 2, 1, 1); // South
          ctx.fillRect(tx - 2, ty, 1, 1); // West
          ctx.fillRect(tx + 2, ty, 1, 1); // East

          drawReticle(ctx, tx, ty, 'eraser', true);

          // Poof dust particle
          ctx.fillStyle = '#ffffffcc';
          ctx.fillRect(tx - 1, ty - 1, 1, 1);
          ctx.fillRect(tx + 1, ty + 1, 1, 1);
        } else {
          // Checking the connected 2-pixel cluster:
          const [cx, cy] = connectedCluster[0];
          ctx.fillStyle = '#10b981';
          ctx.fillRect(cx, cy - 2, 1, 1);
          // Green check indicator: KEPT!
          ctx.fillRect(cx - 2, cy - 4, 1, 3);
          ctx.fillRect(cx - 1, cy - 2, 3, 1);
        }
      }

      // Top HUD status badge
      ctx.fillStyle = '#0f172aee';
      ctx.fillRect(4, 4, 68, 9);
      ctx.fillStyle = isHold || isSparkleActive ? '#10b981' : '#f59e0b';
      ctx.font = '7px monospace';
      ctx.fillText(
        isHold || isSparkleActive
          ? '5 STRAYS: ERASED'
          : `CHECKING NEIGHBORS: ${Math.min(5, currentStep)}/5`,
        6,
        11
      );

      // Bottom algorithm note
      ctx.fillStyle = '#0f172acc';
      ctx.fillRect(40, 45, 52, 7);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '6px monospace';
      ctx.fillText('4-NEIGHBORS === 0', 42, 51);

      if (isSparkleActive) {
        drawSparkle(ctx, 24, 16, sparkleProgress);
        drawSparkle(ctx, 72, 34, sparkleProgress);
      }
      break;
    }

    case 'normal-map': {
      // NORMAL MAP VIEW: Tangent-space RGB normals (+Y Green, +X Red, -X Cyan, -Y Indigo, +Z Periwinkle)
      drawCheckerboard(ctx, 20, 8, 56, 38);

      const startX = 34;
      const startY = 15;

      for (let py = 0; py < 24; py++) {
        const row = HEART_MAP[py];
        const y = startY + py;

        for (let px = 0; px < 29; px++) {
          const x = startX + px;
          const c = row[px];
          if (c === '.') continue;

          if (c === '#') {
            // Outline normals
            if (py <= 3) ctx.fillStyle = '#22c55e'; // Top = Green (+Y)
            else if (px >= 22) ctx.fillStyle = '#ef4444'; // Right = Red (+X)
            else if (px <= 6) ctx.fillStyle = '#06b6d4'; // Left = Cyan (-X)
            else if (py >= 18) ctx.fillStyle = '#4338ca'; // Bottom = Indigo (-Y)
            else ctx.fillStyle = '#312e81';
          } else {
            // Interior dome normals
            const dx = (px - 14) / 14;
            const dy = (py - 12) / 12;
            const distSq = dx * dx + dy * dy;
            const dz = Math.sqrt(Math.max(0, 1 - distSq));

            // OpenGL tangent normal encoding
            const r = Math.round((dx + 1) * 127.5);
            const g = Math.round((-dy + 1) * 127.5);
            const b = Math.round((dz + 1) * 127.5);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
          }
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // Compass coordinate axes widget in top-right
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(72, 8, 18, 18);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(72, 8, 18, 18);

      // Axes: +Y Green (Up), +X Red (Right), +Z Blue (Center)
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(80, 10, 2, 6); // Up (Y)
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(81, 16, 6, 2); // Right (X)
      ctx.fillStyle = '#818cf8';
      ctx.fillRect(80, 16, 2, 2); // Center (Z)

      if (isSparkleActive) {
        drawSparkle(ctx, 48, 26, sparkleProgress);
      }
      break;
    }

    case 'bake-normal': {
      // BAKE NORMAL MAP: Saves computed normals into dedicated layer card with checkmark stamp
      drawCheckerboard(ctx, 20, 8, 56, 38);

      // Layer card animation
      const cardY = isHold ? 10 : 8 + Math.round(actionProgress * 4);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(24, cardY, 48, 34);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(24, cardY, 48, 34);

      // Mini normal map heart inside layer card
      for (let py = 0; py < 24; py += 2) {
        const row = HEART_MAP[py];
        for (let px = 0; px < 29; px += 2) {
          if (row[px] !== '.') {
            const dx = (px - 14) / 14;
            const dy = (py - 12) / 12;
            const r = Math.round((dx + 1) * 127.5);
            const g = Math.round((-dy + 1) * 127.5);
            ctx.fillStyle = `rgb(${r},${g},220)`;
            ctx.fillRect(36 + px / 2, cardY + 7 + py / 2, 1, 1);
          }
        }
      }

      // Baked stamp confirmation badge
      if (actionProgress > 0.6 || isHold || isSparkleActive) {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(40, cardY + 22, 16, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(43, cardY + 24, 2, 2);
        ctx.fillRect(46, cardY + 23, 7, 2);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 48, 25, sparkleProgress);
      }
      break;
    }

    case 'bake-light': {
      // BAKE LIGHTING: Dynamic light bulb burns directional shadows & highlights permanently into canvas
      drawCheckerboard(ctx, 20, 8, 56, 38);

      const isBaked = actionProgress > 0.65 || isSparkleActive || isHold;

      drawProperHeart(ctx);

      // Light bulb descending & flashing
      if (!isBaked) {
        const bulbX = 32 + actionProgress * 12;
        const bulbY = 10 + actionProgress * 8;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(Math.round(bulbX), Math.round(bulbY), 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(bulbX) + 1, Math.round(bulbY) + 1, 2, 2);

        // Flash of light as it bakes
        if (actionProgress > 0.5) {
          ctx.fillStyle = '#ffffff44';
          ctx.fillRect(20, 8, 56, 38);
        }
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 42, 18, sparkleProgress);
      }
      break;
    }

    case 'apply-cleanup': {
      // APPLY CLEANUP (SPRITE CLEANUP ENGINE):
      // Executes cleanup: removes faint alpha, hardens semi-transparent edges to 100% solid, erases specks
      drawCheckerboard(ctx, 20, 8, 56, 38);

      const sweepX = isHold || isSparkleActive
        ? 76
        : (isActionActive ? 20 + Math.round(actionProgress * 56) : 20);

      // Dirty/uncleaned elements ahead of the sweep (x >= sweepX)
      // 1. Faint alpha smudges (alpha <= cutoff)
      ctx.fillStyle = '#e11d4844';
      if (26 >= sweepX) ctx.fillRect(26, 16, 2, 2);
      if (66 >= sweepX) ctx.fillRect(66, 34, 2, 2);

      // 2. Detached stray specks
      ctx.fillStyle = '#e11d48';
      if (24 >= sweepX) ctx.fillRect(24, 32, 1, 1);
      if (70 >= sweepX) ctx.fillRect(70, 16, 1, 1);

      // 3. Semi-transparent blurry edge pixels ahead of sweep
      ctx.fillStyle = '#24071566';
      if (33 >= sweepX) ctx.fillRect(33, 20, 1, 2);
      if (63 >= sweepX) ctx.fillRect(63, 20, 1, 2);

      // Draw the proper heart
      drawProperHeart(ctx);

      // 4. Muddy compression noise pixels on heart body ahead of sweep
      if (52 >= sweepX) {
        ctx.fillStyle = '#78716c'; // Muddy gray noise
        ctx.fillRect(52, 24, 2, 2);
        ctx.fillRect(56, 26, 1, 2);
      }

      // Emerald purification laser & particles
      if (isActionActive && !isHold && !isSparkleActive) {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(sweepX, 10, 2, 34);
        ctx.fillStyle = '#34d39955';
        ctx.fillRect(sweepX - 3, 10, 8, 34);

        // Cleansing spark particles popping behind beam
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sweepX - 2, 18 + ((Math.round(actionProgress * 15)) % 16), 1, 1);
        ctx.fillRect(sweepX - 4, 14 + ((Math.round(actionProgress * 23)) % 18), 1, 1);
      }

      // Top HUD status badge
      ctx.fillStyle = '#0f172aee';
      ctx.fillRect(4, 4, 66, 9);
      ctx.fillStyle = isHold || isSparkleActive ? '#10b981' : '#34d399';
      ctx.font = '7px monospace';
      ctx.fillText(
        isHold || isSparkleActive ? 'CLEANED: 100% SOLID' : 'APPLYING CLEANUP...',
        6,
        11
      );

      // Bottom algorithm note
      ctx.fillStyle = '#0f172acc';
      ctx.fillRect(38, 45, 54, 7);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '6px monospace';
      ctx.fillText('ALPHA HARDENED + CRISP', 40, 51);

      if (isSparkleActive) {
        drawSparkle(ctx, 48, 26, sparkleProgress);
        drawSparkle(ctx, 40, 18, sparkleProgress);
      }
      break;
    }

    case 'material': {
      // MATERIAL SHADING (SSS & VOLUMETRIC OPTICS):
      // Internal subsurface light scattering + dielectric Fresnel rim glow
      const breathe = Math.sin(t * Math.PI * 2) * 1.5;

      // Internal light core radiating warm crimson glow
      const glowR = 12 + breathe;
      const grad = ctx.createRadialGradient(44, 25, 2, 44, 25, glowR);
      grad.addColorStop(0, '#ff6b81');
      grad.addColorStop(0.5, '#e11d48');
      grad.addColorStop(1, '#881337');

      drawProperHeart(ctx, {
        palette: {
          body: '#e11d48',
          highlight: '#ff8fa3',
          pink: '#ff4d6d',
        },
      });

      // Overlay internal translucent subsurface glow
      ctx.save();
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(44, 25, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Outer Dielectric Fresnel Rim Highlight (icy cyan-white glass edge)
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(35, 17, 1, 6);
      ctx.fillRect(36, 15, 1, 2);
      ctx.fillRect(61, 17, 1, 6);
      ctx.fillRect(60, 15, 1, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(35, 18, 1, 3);

      if (isSparkleActive || isHold) {
        drawSparkle(ctx, 40, 18, sparkleProgress || 0.6);
      }
      break;
    }

    case 'seamless': {
      // SEAMLESS PATTERN: Continuous 2D infinitely scrolling wallpaper of mini HUD hearts
      const scrollX = Math.round((t * 56) % 28);
      const scrollY = Math.round((t * 48) % 24);

      // Draw repeating mini hearts
      for (let oy = -24; oy <= H + 24; oy += 24) {
        for (let ox = -28; ox <= W + 28; ox += 28) {
          const x = ox + scrollX;
          const y = oy + scrollY;

          // Mini 11x9 HUD heart
          ctx.fillStyle = '#240715';
          ctx.fillRect(x + 2, y, 3, 1);
          ctx.fillRect(x + 7, y, 3, 1);
          ctx.fillRect(x + 1, y + 1, 5, 1);
          ctx.fillRect(x + 6, y + 1, 5, 1);
          ctx.fillRect(x, y + 2, 12, 3);
          ctx.fillRect(x + 1, y + 5, 10, 1);
          ctx.fillRect(x + 2, y + 6, 8, 1);
          ctx.fillRect(x + 3, y + 7, 6, 1);
          ctx.fillRect(x + 4, y + 8, 4, 1);
          ctx.fillRect(x + 5, y + 9, 2, 1);

          // Ruby fill
          ctx.fillStyle = '#e11d48';
          ctx.fillRect(x + 2, y + 1, 2, 1);
          ctx.fillRect(x + 8, y + 1, 2, 1);
          ctx.fillRect(x + 1, y + 2, 10, 2);
          ctx.fillRect(x + 2, y + 4, 8, 1);
          ctx.fillRect(x + 3, y + 5, 6, 1);
          ctx.fillRect(x + 4, y + 6, 4, 1);
          ctx.fillRect(x + 5, y + 7, 2, 1);

          // Specular glint
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + 2, y + 2, 2, 1);
        }
      }

      // Subtle cyan seam alignment grid
      ctx.strokeStyle = '#38bdf833';
      ctx.lineWidth = 1;
      ctx.strokeRect(scrollX, scrollY, 28, 24);
      break;
    }

    case 'autotile': {
      // 47-BLOB AUTOTILER: Dynamic Wang blob bitmask edge transitions
      const count = Math.min(9, Math.floor(actionProgress * 11));
      for (let i = 0; i < count; i++) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const tx = 27 + col * 14;
        const ty = 7 + row * 14;

        // Terrain base
        ctx.fillStyle = '#166534';
        ctx.fillRect(tx, ty, 14, 14);

        // Stone edge border
        ctx.fillStyle = '#854d0e';
        if (row === 0) ctx.fillRect(tx, ty, 14, 2);
        if (row === 2) ctx.fillRect(tx, ty + 12, 14, 2);
        if (col === 0) ctx.fillRect(tx, ty, 2, 14);
        if (col === 2) ctx.fillRect(tx + 12, ty, 2, 14);

        // Center tile houses ruby heart emblem
        if (col === 1 && row === 1) {
          ctx.fillStyle = '#e11d48';
          ctx.fillRect(tx + 3, ty + 4, 3, 2);
          ctx.fillRect(tx + 7, ty + 4, 3, 2);
          ctx.fillRect(tx + 2, ty + 6, 9, 3);
          ctx.fillRect(tx + 4, ty + 9, 5, 2);
          ctx.fillRect(tx + 6, ty + 11, 1, 1);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(tx + 3, ty + 4, 1, 1);
        }
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 48, 26, sparkleProgress);
      }
      break;
    }

    case 'dither-atkinson': {
      // ATKINSON DITHER: Classic 1-bit Macintosh 3/8 error diffusion stippling
      drawCheckerboard(ctx, 20, 8, 56, 38);

      // Base heart with flat split
      drawProperHeart(ctx, { hasShading: false, hasGlint: false, palette: { body: '#e11d48' } });

      // Atkinson error-diffusion pattern on right side
      for (let py = 0; py < 24; py++) {
        const row = HEART_MAP[py];
        const y = 15 + py;
        for (let px = 14; px < 29; px++) {
          if (row[px] === '.' || row[px] === '#') continue;

          // Distinctive 1-bit Atkinson diamond cluster matrix
          const atkinson = (px * 3 + py * 2) % 4 === 0 || (px % 2 === 0 && py % 2 === 0 && px > 20);
          if (atkinson) {
            ctx.fillStyle = '#881337';
            ctx.fillRect(34 + px, y, 1, 1);
          }
        }
      }

      // Mac paint cursor sweeping
      if (isActionActive) {
        const sweepX = 48 + actionProgress * 14;
        drawReticle(ctx, sweepX, 26, 'pen', true);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 52, 24, sparkleProgress);
      }
      break;
    }

    case 'dither-smooth': {
      // SMOOTH DITHER: Hilbert-curve Riemersma blue-noise continuous gradation
      drawCheckerboard(ctx, 20, 8, 56, 38);

      drawProperHeart(ctx, { hasShading: false, hasGlint: false, palette: { body: '#e11d48' } });

      for (let py = 0; py < 24; py++) {
        const row = HEART_MAP[py];
        const y = 15 + py;
        for (let px = 14; px < 29; px++) {
          if (row[px] === '.' || row[px] === '#') continue;

          // Hilbert / blue-noise pseudo-random continuous distribution
          const noise = ((px * 13 + py * 23 + (px ^ py)) % 7) / 7;
          const threshold = (px - 14) / 14;
          if (noise < threshold) {
            ctx.fillStyle = '#881337';
            ctx.fillRect(34 + px, y, 1, 1);
          }
        }
      }

      if (isActionActive) {
        const sweepX = 48 + actionProgress * 14;
        drawReticle(ctx, sweepX, 26, 'pen', true);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 52, 24, sparkleProgress);
      }
      break;
    }

    case 'palette-snap': {
      // SNAP TO ACTIVE PALETTE: Off-palette muddy pixels snap to nearest ruby swatches
      const swatches = ['#240715', '#4c0519', '#881337', '#e11d48', '#fda4af', '#ffffff'];
      swatches.forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.fillRect(24 + i * 8, 44, 7, 4);
      });

      const isSnapped = actionProgress > 0.45 || isSparkleActive || isHold;

      drawProperHeart(ctx, {
        palette: isSnapped
          ? undefined
          : {
              outline: '#3f3f46',
              whiteGlint: '#d4d4d8',
              highlight: '#a1a1aa',
              pink: '#71717a',
              body: '#786c4a', // muddy olive
              shadow: '#524b37',
              rimShadow: '#2f2b20',
            },
      });

      // Magnetic snap lines pulling to swatches
      if (isActionActive && actionProgress < 0.45) {
        ctx.strokeStyle = '#38bdf888';
        ctx.setLineDash([1, 1]);
        ctx.beginPath();
        ctx.moveTo(48, 26);
        ctx.lineTo(48, 44);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 48, 26, sparkleProgress);
        drawSparkle(ctx, 48, 44, sparkleProgress);
      }
      break;
    }

    case 'palette-harmonize': {
      // HARMONIZE ACCENTS: Generates harmonic color chords (Gold, Emerald, Violet)
      const baseSwatches = ['#240715', '#4c0519', '#881337', '#e11d48'];
      baseSwatches.forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.fillRect(18 + i * 8, 44, 7, 4);
      });

      // Newly generated harmonic accents docking in
      const harmonics = ['#f59e0b', '#10b981', '#8b5cf6'];
      const hasHarmonics = actionProgress > 0.4 || isSparkleActive || isHold;

      if (hasHarmonics) {
        harmonics.forEach((col, i) => {
          ctx.fillStyle = col;
          ctx.fillRect(50 + i * 8, 44, 7, 4);
        });
      }

      drawProperHeart(ctx);

      // Harmonic light arcs sprouting outward
      if (isActionActive && actionProgress < 0.5) {
        const arcProgress = actionProgress / 0.5;
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(44, Math.round(30 + arcProgress * 14), 2, 2);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(52, Math.round(30 + arcProgress * 14), 2, 2);
        ctx.fillStyle = '#8b5cf6';
        ctx.fillRect(60, Math.round(30 + arcProgress * 14), 2, 2);
      }

      if (isSparkleActive) {
        drawSparkle(ctx, 50, 44, sparkleProgress);
        drawSparkle(ctx, 58, 44, sparkleProgress);
        drawSparkle(ctx, 66, 44, sparkleProgress);
      }
      break;
    }

    case 'palette-ramp': {
      // OKLCH COLOR RAMP: Generates 5-step highlight & shadow ramp
      const ramp = ['#240715', '#881337', '#e11d48', '#fda4af', '#ffffff'];
      const count = isHold ? 5 : Math.min(5, Math.floor(actionProgress * 6));

      for (let i = 0; i < count; i++) {
        ctx.fillStyle = ramp[i];
        ctx.fillRect(26 + i * 9, 44, 8, 5);
      }

      drawProperHeart(ctx);

      if (isSparkleActive) {
        drawSparkle(ctx, 48, 44, sparkleProgress);
      }
      break;
    }

    case 'mood-sunset': {
      // SUNSET MOOD: Warm golden hour twilight atmosphere
      // Dusk horizon
      ctx.fillStyle = '#1e1338';
      ctx.fillRect(0, 0, W, 40);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(0, 40, W, 2);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, 42, W, 12);

      // Setting sun behind heart
      ctx.fillStyle = '#fde047';
      ctx.fillRect(44, 38, 8, 4);

      drawProperHeart(ctx, {
        palette: {
          outline: '#3b110a',
          whiteGlint: '#fef9c3',
          highlight: '#fde047',
          pink: '#f59e0b',
          body: '#ea580c',
          shadow: '#701a75',
          rimShadow: '#4a044e',
        },
      });

      if (isSparkleActive) {
        drawSparkle(ctx, 40, 18, sparkleProgress);
      }
      break;
    }

    case 'mood-moonlight': {
      // MOONLIGHT MOOD: Mystical nocturnal silver & sapphire atmosphere
      // Starry night sky
      ctx.fillStyle = '#0b0d1a';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#38bdf888';
      ctx.fillRect(16, 12, 1, 1);
      ctx.fillRect(78, 14, 1, 1);
      ctx.fillRect(84, 32, 1, 1);
      ctx.fillRect(12, 38, 1, 1);

      // Crescent moon
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(76, 8, 4, 4);
      ctx.fillStyle = '#0b0d1a';
      ctx.fillRect(75, 7, 3, 3);

      drawProperHeart(ctx, {
        palette: {
          outline: '#090d16',
          whiteGlint: '#ffffff',
          highlight: '#e2e8f0',
          pink: '#7dd3fc',
          body: '#2563eb',
          shadow: '#1e1b4b',
          rimShadow: '#0f172a',
        },
      });

      if (isSparkleActive) {
        drawSparkle(ctx, 40, 18, sparkleProgress);
      }
      break;
    }

    case 'mood-neon': {
      // CYBERPUNK NEON: Synthwave hot magenta, electric cyan, and neon violet
      // Cyber dark room
      ctx.fillStyle = '#0c0714';
      ctx.fillRect(0, 0, W, H);

      // Perspective grid floor
      ctx.fillStyle = '#06b6d433';
      ctx.fillRect(0, 44, W, 1);
      for (let gx = 8; gx < W; gx += 16) {
        ctx.fillRect(gx, 44, 1, 10);
      }

      // Heart with electric neon palette
      drawProperHeart(ctx, {
        palette: {
          outline: '#06b6d4',
          whiteGlint: '#ffffff',
          highlight: '#f472b6',
          pink: '#c084fc',
          body: '#ec4899',
          shadow: '#7e22ce',
          rimShadow: '#3b0764',
        },
      });

      // Neon glow halo
      ctx.strokeStyle = '#06b6d444';
      ctx.strokeRect(33, 14, 31, 26);

      if (isSparkleActive || isHold) {
        drawSparkle(ctx, 40, 18, sparkleProgress || 0.7);
      }
      break;
    }
  }
}

export function ToolPreviewCanvas({ scene }: { scene: Scene }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      drawScene(ctx, scene, 0.85);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = (now - start) % DURATION;
      const t = elapsed / DURATION;
      drawScene(ctx, scene, t);
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [scene]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      aria-label={`${scene} pixel art demonstration`}
      role="img"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
