/**
 * The cart's face: a small trading card, the kind you keep in a tin.
 *
 * Title strip with a postmark number, the drawing on a paper mat at a crisp
 * integer scale, a row of its most-used colors, who made it and how, and a
 * stitched footer where Bun says "open me". Two card stocks: warm cream paper
 * and a starry night card. Everything is drawn on whole pixels.
 */
import type { CartAncestor, CartLicense, CartReceipt } from './cartFormat';
import { formatReceipt } from './receiptText';

export type CardStock = 'cream' | 'night';

export interface CardInput {
  art: HTMLCanvasElement;
  title: string;
  id: string;
  maker?: string;
  note?: string;
  license: CartLicense;
  receipt?: CartReceipt;
  parents?: CartAncestor[];
  lit?: boolean;
  stock: CardStock;
  /** CSS font families; the card falls back to system fonts. */
  fonts?: { display?: string; body?: string };
}

export const STOCKS: Record<CardStock, { paper: string; ink: string; soft: string; accent: string; mat: string; edge: string; shade: string }> = {
  cream: { paper: '#f6ead2', ink: '#3b2a3f', soft: '#8a7363', accent: '#d9824b', mat: '#fffaf0', edge: '#c9a97e', shade: '#e6d4b4' },
  // The night card's mat is lamp-lit paper, like a warm window, so dark outlines still read.
  night: { paper: '#241a3b', ink: '#f6e9cc', soft: '#a99bc4', accent: '#ffc46b', mat: '#f8ecd2', edge: '#5d4a86', shade: '#140e26' },
};

const SHORT_LICENSE: Record<CartLicense, string> = {
  'all-rights-reserved': '© all rights',
  'cc-by': 'CC BY',
  'cc-by-sa': 'CC BY-SA',
  cc0: 'CC0',
};

/** Bun, 9×9: ears, face, two eyes, little feet. */
const BUN = [
  '..#...#..',
  '..#...#..',
  '..#...#..',
  '.#######.',
  '#########',
  '##.###.##',
  '#########',
  '.#######.',
  '..##.##..',
];

/** A tiny light bulb, 5×7, like the Studio's light gizmo, for carts that carry their light. */
const LAMP = [
  '.###.',
  '#...#',
  '#...#',
  '.#.#.',
  '.###.',
  '.###.',
  '..#..',
];

const ART_TARGET = 320;
const PAD = 22;
const MIN_WIDTH = 360;
const SWATCH = 12;

/** The integer scale that shows the drawing near 320 px without blurring it. */
export function cardArtScale(width: number, height: number): number {
  return Math.max(1, Math.min(32, Math.floor(ART_TARGET / Math.max(width, height, 1))));
}

/** Up to `limit` colors in the drawing, most used first (opaque pixels only). */
export function dominantColors(data: Uint8ClampedArray, limit = 16): string[] {
  const counts = new Map<number, number>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
    .map(([key]) => `#${key.toString(16).padStart(6, '0')}`);
}

/** Lines under the art, in order: maker, making-of, remix credit. */
export function cardCaptionLines(input: Pick<CardInput, 'maker' | 'receipt' | 'parents'>): string[] {
  const lines: string[] = [];
  if (input.maker) lines.push(`by ${input.maker}`);
  if (input.receipt) lines.push(formatReceipt(input.receipt));
  const parent = input.parents?.[0];
  if (parent) {
    const more = (input.parents?.length ?? 1) - 1;
    lines.push(`remixed from ${parent.title ?? `#${parent.id.slice(0, 8)}`}${parent.maker ? ` · ${parent.maker}` : ''}${more > 0 ? ` +${more}` : ''}`);
  }
  return lines;
}

function sprite(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, unit: number, color: string) {
  ctx.fillStyle = color;
  rows.forEach((row, ry) => [...row].forEach((cell, rx) => { if (cell === '#') ctx.fillRect(x + rx * unit, y + ry * unit, unit, unit); }));
}

/** A rectangle with stepped pixel corners, like a cut card. */
function steppedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, step: number) {
  ctx.fillRect(x + step * 2, y, w - step * 4, h);
  ctx.fillRect(x + step, y + step, w - step * 2, h - step * 2);
  ctx.fillRect(x, y + step * 2, w, h - step * 4);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) { line = next; continue; }
    lines.push(line); line = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

/** Render the card. The caller owns the returned canvas. */
export function renderCartCard(input: CardInput): HTMLCanvasElement {
  const s = STOCKS[input.stock];
  const display = input.fonts?.display ? `${input.fonts.display}, monospace` : 'monospace';
  const body = input.fonts?.body ? `${input.fonts.body}, system-ui, sans-serif` : 'system-ui, sans-serif';
  const scale = cardArtScale(input.art.width, input.art.height);
  const artW = input.art.width * scale, artH = input.art.height * scale;
  const width = Math.max(MIN_WIDTH, artW + PAD * 2 + 16);

  // Measure the caption before sizing the card.
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.font = `12px ${body}`;
  const captions = cardCaptionLines(input);
  probe.font = `italic 12px ${body}`;
  const noteLines = input.note ? wrap(probe, `“${input.note}”`, width - PAD * 2, 2) : [];
  const header = 46;
  const matPad = 12;
  const artTop = header + 10;
  const matH = artH + matPad * 2;
  const swatchTop = artTop + matH + 14;
  const textTop = swatchTop + SWATCH + 16;
  const lineH = 17;
  const footerTop = textTop + (captions.length + noteLines.length) * lineH + 10;
  const height = footerTop + 42;

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Card body with a thick edge and stepped corners.
  ctx.fillStyle = s.edge; steppedRect(ctx, 0, 0, width, height, 3);
  ctx.fillStyle = s.paper; steppedRect(ctx, 4, 4, width - 8, height - 8, 3);
  // Ticket notches: stepped half circles bitten out of each side.
  const notchY = Math.round(artTop + matH / 2);
  for (const [half, dy] of [[3, 0], [6, 2], [8, 4], [9, 6]] as const) {
    ctx.fillStyle = s.edge;
    ctx.fillRect(0, notchY - 10 + dy, half + 2, 20 - dy * 2);
    ctx.fillRect(width - half - 2, notchY - 10 + dy, half + 2, 20 - dy * 2);
  }
  ctx.clearRect(0, notchY - 8, 4, 16);
  ctx.clearRect(width - 4, notchY - 8, 4, 16);
  for (const [half, dy] of [[2, 0], [5, 2], [7, 4], [8, 6]] as const) {
    ctx.clearRect(0, notchY - 8 + dy, half, 16 - dy * 2);
    ctx.clearRect(width - half, notchY - 8 + dy, half, 16 - dy * 2);
  }

  // Header: title, postmark number, a lamp when the cart carries its light.
  ctx.fillStyle = s.ink;
  ctx.textBaseline = 'middle';
  ctx.font = `16px ${display}`;
  const postmark = `No. ${input.id.slice(0, 8)}`;
  probe.font = `10px ${display}`;
  const postW = Math.ceil(probe.measureText(postmark).width) + 14;
  ctx.font = `16px ${display}`;
  let title = input.title;
  const titleRoom = width - PAD * 2 - postW - (input.lit ? 18 : 0) - 8;
  while (title.length > 1 && ctx.measureText(title).width > titleRoom) title = title.slice(0, -1);
  if (title !== input.title) title = `${title.slice(0, -1)}…`;
  ctx.fillText(title, PAD, header / 2 + 3);
  // Postmark: a dashed stamp outline.
  const px = width - PAD - postW, py = header / 2 - 8;
  ctx.fillStyle = s.accent;
  for (let x = px; x < px + postW; x += 4) { ctx.fillRect(x, py, 2, 1); ctx.fillRect(x, py + 17, 2, 1); }
  for (let y = py; y < py + 18; y += 4) { ctx.fillRect(px, y, 1, 2); ctx.fillRect(px + postW - 1, y, 1, 2); }
  ctx.font = `10px ${display}`;
  ctx.fillText(postmark, px + 7, header / 2 + 2);
  if (input.lit) sprite(ctx, LAMP, px - 16, header / 2 - 7, 2, s.accent);
  if (input.stock === 'night') {
    // A few stars over the title strip.
    ctx.fillStyle = s.accent;
    for (const [sx, sy] of [[0.42, 0.2], [0.55, 0.62], [0.63, 0.28], [0.5, 0.36]]) ctx.fillRect(Math.round(width * sx), Math.round(header * sy), 2, 2);
  }

  // The drawing on its mat, with a soft drop shadow.
  const matX = Math.round((width - (artW + matPad * 2)) / 2);
  ctx.fillStyle = s.shade; ctx.fillRect(matX + 3, artTop + 3, artW + matPad * 2, matH);
  ctx.fillStyle = s.mat; ctx.fillRect(matX, artTop, artW + matPad * 2, matH);
  ctx.fillStyle = s.edge;
  ctx.fillRect(matX, artTop, artW + matPad * 2, 1); ctx.fillRect(matX, artTop + matH - 1, artW + matPad * 2, 1);
  ctx.fillRect(matX, artTop, 1, matH); ctx.fillRect(matX + artW + matPad * 2 - 1, artTop, 1, matH);
  ctx.drawImage(input.art, matX + matPad, artTop + matPad, artW, artH);

  // Swatch row.
  const artCtx = input.art.getContext('2d', { willReadFrequently: true });
  const colors = artCtx ? dominantColors(artCtx.getImageData(0, 0, input.art.width, input.art.height).data, Math.min(16, Math.floor((width - PAD * 2) / (SWATCH + 4)))) : [];
  const rowW = colors.length * (SWATCH + 4) - 4;
  colors.forEach((color, index) => {
    const x = Math.round((width - rowW) / 2) + index * (SWATCH + 4);
    ctx.fillStyle = s.edge; ctx.fillRect(x - 1, swatchTop - 1, SWATCH + 2, SWATCH + 2);
    ctx.fillStyle = color; ctx.fillRect(x, swatchTop, SWATCH, SWATCH);
  });

  // Who made it and how.
  ctx.textAlign = 'center';
  ctx.fillStyle = s.ink;
  ctx.font = `12px ${body}`;
  captions.forEach((line, index) => {
    ctx.fillStyle = index === 0 && input.maker ? s.ink : s.soft;
    ctx.fillText(line, width / 2, textTop + index * lineH);
  });
  ctx.fillStyle = s.soft;
  ctx.font = `italic 12px ${body}`;
  noteLines.forEach((line, index) => ctx.fillText(line, width / 2, textTop + (captions.length + index) * lineH));

  // Stitched footer with Bun.
  ctx.fillStyle = s.edge;
  for (let x = PAD; x < width - PAD; x += 6) ctx.fillRect(x, footerTop, 3, 1);
  ctx.textAlign = 'left';
  sprite(ctx, BUN, PAD, footerTop + 11, 2, s.ink);
  ctx.fillStyle = s.ink;
  ctx.font = `10px ${display}`;
  ctx.fillText('Made in PixiBun · open me', PAD + 24, footerTop + 21);
  ctx.textAlign = 'right';
  ctx.fillStyle = s.soft;
  ctx.font = `11px ${body}`;
  ctx.fillText(SHORT_LICENSE[input.license], width - PAD, footerTop + 21);
  ctx.textAlign = 'left';
  return canvas;
}
