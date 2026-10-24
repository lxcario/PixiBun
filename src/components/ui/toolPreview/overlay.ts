/**
 * Screen-space marks drawn over a clip's pixels, in art-pixel units. They copy
 * the studio's own on-canvas UI: marching ants from SelectionTransformGizmo,
 * the brush ghost square, curve handles and the light bulb gizmo.
 */

import { extractSelectionBoundarySegments } from '@/lib/canvas/selectionUtils';
import type { Pt, Raster } from './raster';

export interface Overlay {
  ctx: CanvasRenderingContext2D;
  /** One CSS pixel, in art pixels. */
  px: number;
  /** Milliseconds since the clip started, for marching and pulsing. */
  time: number;
}

const INK = '#140d1f';
const GOLD = '#f0be7c';

function dashed(o: Overlay, draw: () => void) {
  const { ctx, px } = o;
  // The studio's ants: 1.5px black and white dashes, 4 on 4 off, marching 8px every 0.4s.
  const offset = ((o.time / 400) % 1) * 8 * px;
  ctx.save();
  ctx.lineWidth = 1.5 * px;
  ctx.setLineDash([4 * px, 4 * px]);
  ctx.strokeStyle = INK;
  ctx.lineDashOffset = -offset;
  draw();
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineDashOffset = -offset + 4 * px;
  draw();
  ctx.stroke();
  ctx.restore();
}

export function antsMask(o: Overlay, mask: Uint8Array, width: number, height: number): void {
  const segments = extractSelectionBoundarySegments(mask, width, height);
  if (!segments.length) return;
  dashed(o, () => {
    o.ctx.beginPath();
    for (const s of segments) { o.ctx.moveTo(s.x1, s.y1); o.ctx.lineTo(s.x2, s.y2); }
  });
}

export function antsPath(o: Overlay, points: readonly Pt[], closed = false): void {
  if (points.length < 2) return;
  dashed(o, () => {
    o.ctx.beginPath();
    o.ctx.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) o.ctx.lineTo(p.x, p.y);
    if (closed) o.ctx.closePath();
  });
}

export function antsRect(o: Overlay, x0: number, y0: number, x1: number, y1: number): void {
  const left = Math.min(x0, x1);
  const top = Math.min(y0, y1);
  dashed(o, () => {
    o.ctx.beginPath();
    o.ctx.rect(left, top, Math.abs(x1 - x0), Math.abs(y1 - y0));
  });
}

/** A thin guide between two pixel centers (curve arms, gradient drag). */
export function guide(o: Overlay, a: Pt, b: Pt, color = 'rgba(255,255,255,0.9)'): void {
  const { ctx, px } = o;
  ctx.save();
  ctx.lineWidth = 2.5 * px;
  ctx.strokeStyle = 'rgba(20,13,31,0.55)';
  ctx.beginPath(); ctx.moveTo(a.x + 0.5, a.y + 0.5); ctx.lineTo(b.x + 0.5, b.y + 0.5); ctx.stroke();
  ctx.lineWidth = 1 * px;
  ctx.setLineDash([3 * px, 2 * px]);
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

/** Square endpoint handle centered on a pixel. */
export function endHandle(o: Overlay, p: Pt): void {
  const { ctx, px } = o;
  const s = 6 * px;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5 * px;
  ctx.fillRect(p.x + 0.5 - s / 2, p.y + 0.5 - s / 2, s, s);
  ctx.strokeRect(p.x + 0.5 - s / 2, p.y + 0.5 - s / 2, s, s);
  ctx.restore();
}

/** Round gold control handle, the one you drag to bend a curve. */
export function controlHandle(o: Overlay, p: Pt, active: boolean): void {
  const { ctx, px } = o;
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x + 0.5, p.y + 0.5, (active ? 4.5 : 3.5) * px, 0, Math.PI * 2);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.lineWidth = 1.5 * px;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

/** The brush ghost: the studio outlines the stamp footprint in gold over a dark hairline. */
export function brushGhost(o: Overlay, p: Pt, size: number, pressed: boolean): void {
  const { ctx, px } = o;
  const offset = Math.floor(size / 2);
  const x = Math.round(p.x) - offset;
  const y = Math.round(p.y) - offset;
  ctx.save();
  ctx.lineWidth = 2 * px;
  ctx.strokeStyle = 'rgba(20,12,30,0.6)';
  ctx.strokeRect(x - px, y - px, size + 2 * px, size + 2 * px);
  ctx.lineWidth = 1.25 * px;
  ctx.strokeStyle = pressed ? GOLD : 'rgba(240,190,124,0.85)';
  ctx.strokeRect(x, y, size, size);
  ctx.restore();
}

/** The canvas crosshair, offset to sit beside the ghost rather than on the pixels. */
export function crosshair(o: Overlay, p: Pt): void {
  const { ctx, px } = o;
  const cx = Math.round(p.x) + 0.5;
  const cy = Math.round(p.y) + 0.5;
  const arm = 5 * px;
  const gap = 2.5 * px;
  ctx.save();
  for (const [color, width] of [[INK, 3], ['#ffffff', 1.25]] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width * px;
    ctx.beginPath();
    ctx.moveTo(cx - gap - arm, cy); ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + gap + arm, cy);
    ctx.moveTo(cx, cy - gap - arm); ctx.lineTo(cx, cy - gap);
    ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + gap + arm);
    ctx.stroke();
  }
  ctx.restore();
}

/** An expanding ring: a click landing, or a pixel popping away. */
export function ring(o: Overlay, p: Pt, life: number, color = GOLD, reach = 14): void {
  if (life <= 0 || life >= 1) return;
  const { ctx, px } = o;
  const ease = 1 - Math.pow(1 - life, 3);
  ctx.save();
  ctx.globalAlpha = 1 - life;
  ctx.lineWidth = 2 * px;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(p.x + 0.5, p.y + 0.5, (2 + ease * reach) * px, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** A four-point pixel twinkle. */
export function sparkle(o: Overlay, p: Pt, life: number, color = '#fff8db'): void {
  if (life <= 0 || life >= 1) return;
  const { ctx, px } = o;
  const size = Math.sin(life * Math.PI) * 4 * px;
  const cx = p.x + 0.5;
  const cy = p.y + 0.5;
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6 * px;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 1.6); ctx.lineTo(cx + size * 0.35, cy - size * 0.35);
  ctx.lineTo(cx + size * 1.6, cy); ctx.lineTo(cx + size * 0.35, cy + size * 0.35);
  ctx.lineTo(cx, cy + size * 1.6); ctx.lineTo(cx - size * 0.35, cy + size * 0.35);
  ctx.lineTo(cx - size * 1.6, cy); ctx.lineTo(cx - size * 0.35, cy - size * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A sweeping scan line with a soft glow trailing behind it. */
export function scanLine(o: Overlay, x: number, height: number, color = '#7ad7f0'): void {
  const { ctx, px } = o;
  ctx.save();
  const trail = ctx.createLinearGradient(x - 4, 0, x, 0);
  trail.addColorStop(0, 'rgba(122,215,240,0)');
  trail.addColorStop(1, 'rgba(122,215,240,0.28)');
  ctx.fillStyle = trail;
  ctx.fillRect(x - 4, 0, 4, height);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8 * px;
  ctx.fillRect(x - px, 0, 2 * px, height);
  ctx.restore();
}

/** The light bulb gizmo, glowing, with a beam toward what it lights. */
export function bulb(o: Overlay, p: Pt, target: Pt): void {
  const { ctx, px } = o;
  const cx = p.x + 0.5;
  const cy = p.y + 0.5;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,225,150,0.55)';
  ctx.lineWidth = 1 * px;
  ctx.setLineDash([2 * px, 2 * px]);
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(target.x, target.y); ctx.stroke();
  ctx.setLineDash([]);
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 5);
  glow.addColorStop(0, 'rgba(255,226,150,0.75)');
  glow.addColorStop(1, 'rgba(255,226,150,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 5, cy - 5, 10, 10);
  // Glass
  ctx.beginPath();
  ctx.arc(cx, cy - 0.3, 1.35, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe9a8';
  ctx.fill();
  ctx.lineWidth = 1.5 * px;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // Screw base
  ctx.fillStyle = '#9a8aa8';
  ctx.fillRect(cx - 0.6, cy + 0.9, 1.2, 0.8);
  ctx.strokeRect(cx - 0.6, cy + 0.9, 1.2, 0.8);
  ctx.restore();
}

/** A magnifier ring over the pointer showing the sampled pixel's neighborhood. */
export function loupe(o: Overlay, p: Pt, source: Raster, picked: string): void {
  const { ctx, px } = o;
  // Up and to the right of the tip, clear of the pointer.
  const cx = p.x + 0.5 + 3.6;
  const cy = p.y + 0.5 - 3.6;
  const r = 3.1;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.clip();
  const zoom = 0.85;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const sx = Math.round(p.x) + dx;
      const sy = Math.round(p.y) + dy;
      if (sx < 0 || sy < 0 || sx >= source.width || sy >= source.height) continue;
      const i = (sy * source.width + sx) * 4;
      if (source.data[i + 3] === 0) continue;
      ctx.fillStyle = `rgb(${source.data[i]},${source.data[i + 1]},${source.data[i + 2]})`;
      ctx.fillRect(cx + (dx - 0.5) * zoom, cy + (dy - 0.5) * zoom, zoom + 0.02, zoom + 0.02);
    }
  }
  ctx.lineWidth = 1 * px;
  ctx.strokeStyle = INK;
  ctx.strokeRect(cx - zoom / 2, cy - zoom / 2, zoom, zoom);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 3 * px;
  ctx.strokeStyle = picked;
  ctx.stroke();
  ctx.lineWidth = 1.25 * px;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

/** A row or grid of palette chips; `count` of them visible, the newest popping in. */
export function swatches(
  o: Overlay,
  colors: readonly string[],
  shown: number,
  at: Pt,
  options: { size?: number; columns?: number; gap?: number; highlight?: number } = {},
): void {
  const { ctx, px } = o;
  const size = options.size ?? 2.4;
  const columns = options.columns ?? colors.length;
  const gap = options.gap ?? 0.5;
  colors.forEach((color, index) => {
    const pop = Math.max(0, Math.min(1, shown - index));
    if (pop <= 0) return;
    const scale = pop < 1 ? 0.4 + 0.6 * (1 - Math.pow(1 - pop, 3)) * 1.08 : 1;
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = at.x + col * (size + gap) + size / 2;
    const y = at.y + row * (size + gap) + size / 2;
    const s = size * Math.min(1.06, scale);
    ctx.save();
    ctx.fillStyle = 'rgba(20,13,31,0.35)';
    ctx.fillRect(x - s / 2 + 1.5 * px, y - s / 2 + 2 * px, s, s);
    ctx.fillStyle = color;
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
    ctx.lineWidth = 1.5 * px;
    ctx.strokeStyle = options.highlight === index ? GOLD : INK;
    ctx.strokeRect(x - s / 2, y - s / 2, s, s);
    ctx.restore();
  });
}

/** A small pill label painted on the stage (angles, badges). */
export function chip(o: Overlay, text: string, at: Pt, tone: 'ink' | 'gold' | 'mint' = 'ink'): void {
  const { ctx, px } = o;
  ctx.save();
  ctx.font = `700 ${9 * px}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const w = ctx.measureText(text).width + 8 * px;
  const h = 13 * px;
  const x = at.x - w / 2;
  const y = at.y - h / 2;
  ctx.fillStyle = tone === 'gold' ? GOLD : tone === 'mint' ? '#a8e092' : 'rgba(20,13,31,0.88)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.lineWidth = 1.25 * px;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = tone === 'ink' ? '#fff3e0' : INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, at.x, at.y + 0.5 * px);
  ctx.restore();
}

/** Dim a rectangle (duplicate tiles, unselected areas). */
export function veil(o: Overlay, x: number, y: number, w: number, h: number, alpha = 0.55): void {
  o.ctx.save();
  o.ctx.fillStyle = `rgba(20,13,31,${alpha})`;
  o.ctx.fillRect(x, y, w, h);
  o.ctx.restore();
}

/** A gold frame around a rectangle of pixels. */
export function frame(o: Overlay, x: number, y: number, w: number, h: number, color = GOLD): void {
  const { ctx, px } = o;
  ctx.save();
  ctx.lineWidth = 3 * px;
  ctx.strokeStyle = INK;
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = 1.5 * px;
  ctx.strokeStyle = color;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}
