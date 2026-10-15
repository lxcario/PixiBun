/**
 * Light Sweep: a tall 9:16 clip of a lamp drifting over the drawing at night,
 * relighting it as it goes, for phones and short-video feeds.
 *
 * Frames are drawn at 270×480 on whole pixels and doubled by the encoder, so
 * the text, stars and lamp are as chunky as the art. The lamp swings from the
 * left across the top to the right and back; the drawing's own frames keep
 * playing underneath. The footer is the cart's: Bun and "open me".
 */
import { relight } from './relight';

export const SWEEP_WIDTH = 270;
export const SWEEP_HEIGHT = 480;
export const SWEEP_SCALE = 2;
export const SWEEP_FPS = 12;
export const SWEEP_SECONDS = 5;

const NIGHT = { top: '#241a3b', bottom: '#120c22', ink: '#f6e9cc', soft: '#a99bc4', accent: '#ffc46b', mat: '#f8ecd2', edge: '#5d4a86' };

const BUN = ['..#...#..', '..#...#..', '..#...#..', '.#######.', '#########', '##.###.##', '#########', '.#######.', '..##.##..'];
const BULB = ['.###.', '#####', '#####', '.#.#.', '.###.', '.###.', '..#..'];

export interface SweepInput {
  /** The drawing's frames and their holds, as shown. */
  frames: HTMLCanvasElement[];
  durations: number[];
  title: string;
  maker?: string;
  fonts?: { display?: string; body?: string };
}

function sprite(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, unit: number, color: string) {
  ctx.fillStyle = color;
  rows.forEach((row, ry) => [...row].forEach((cell, rx) => { if (cell === '#') ctx.fillRect(x + rx * unit, y + ry * unit, unit, unit); }));
}

/** Deterministic stars: the same clip every time. */
function stars(count: number): { x: number; y: number; phase: number }[] {
  let seed = 7;
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  return Array.from({ length: count }, () => ({ x: Math.floor(next() * SWEEP_WIDTH), y: Math.floor(next() * SWEEP_HEIGHT * 0.9), phase: Math.floor(next() * 8) }));
}

/** The lamp's path: from the left, over the top, to the right and back (0..1 → angle). */
export function sweepAzimuth(progress: number): number {
  const there = progress < 0.5 ? progress * 2 : 2 - progress * 2;
  // Ease at the ends so the lamp lingers where the light is most dramatic.
  const eased = 0.5 - Math.cos(there * Math.PI) / 2;
  return (270 + eased * 180) % 360;
}

/** Which of the drawing's frames shows at a moment, honoring its holds. */
export function frameAt(durations: number[], ms: number): number {
  const total = durations.reduce((sum, d) => sum + d, 0) || 1;
  let t = ms % total;
  for (let i = 0; i < durations.length; i++) { if (t < durations[i]) return i; t -= durations[i]; }
  return 0;
}

export async function renderLightSweep(input: SweepInput, onProgress?: (done: number, total: number) => void, signal?: AbortSignal): Promise<HTMLCanvasElement[]> {
  const total = SWEEP_FPS * SWEEP_SECONDS;
  const art = input.frames[0];
  // Leave room on each side for the lamp's arc.
  const room = { w: 168, h: 210 };
  const scale = Math.max(1, Math.floor(Math.min(room.w / art.width, room.h / art.height)));
  const artW = art.width * scale, artH = art.height * scale;
  const matPad = 8;
  const artX = Math.round((SWEEP_WIDTH - artW) / 2), artY = Math.round(250 - artH / 2);
  const display = input.fonts?.display ? `${input.fonts.display}, monospace` : 'monospace';
  const body = input.fonts?.body ? `${input.fonts.body}, system-ui, sans-serif` : 'system-ui, sans-serif';
  const sky = stars(46);
  const out: HTMLCanvasElement[] = [];

  for (let f = 0; f < total; f++) {
    if (signal?.aborted) throw new DOMException('Light Sweep cancelled', 'AbortError');
    const progress = f / total;
    const azimuth = sweepAzimuth(progress);
    const source = input.frames[frameAt(input.durations, (f * 1000) / SWEEP_FPS)];
    const lit = await relight(source, { azimuth, elevation: 40 });

    const canvas = document.createElement('canvas');
    canvas.width = SWEEP_WIDTH; canvas.height = SWEEP_HEIGHT;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Night sky in stepped bands, with twinkling stars.
    const bands = 12;
    for (let b = 0; b < bands; b++) {
      const t = b / (bands - 1);
      const mix = (a: string, c: string) => Math.round(parseInt(a, 16) * (1 - t) + parseInt(c, 16) * t).toString(16).padStart(2, '0');
      ctx.fillStyle = `#${mix(NIGHT.top.slice(1, 3), NIGHT.bottom.slice(1, 3))}${mix(NIGHT.top.slice(3, 5), NIGHT.bottom.slice(3, 5))}${mix(NIGHT.top.slice(5, 7), NIGHT.bottom.slice(5, 7))}`;
      ctx.fillRect(0, Math.floor((b * SWEEP_HEIGHT) / bands), SWEEP_WIDTH, Math.ceil(SWEEP_HEIGHT / bands) + 1);
    }
    for (const star of sky) {
      const on = (f + star.phase) % 8 < 6;
      ctx.fillStyle = on ? NIGHT.accent : NIGHT.soft;
      ctx.fillRect(star.x, star.y, 1, 1);
      if (on && star.phase === 0) { ctx.fillRect(star.x - 1, star.y, 3, 1); ctx.fillRect(star.x, star.y - 1, 1, 3); }
    }

    // The lamp on its arc above the drawing, with a warm glow.
    const rad = (azimuth * Math.PI) / 180;
    const cx = SWEEP_WIDTH / 2, cy = artY + artH / 2;
    const reach = Math.max(artW, artH) / 2 + 28;
    const lampX = Math.max(14, Math.min(SWEEP_WIDTH - 14, Math.round(cx + Math.sin(rad) * reach)));
    const lampY = Math.max(110, Math.round(cy - Math.cos(rad) * reach));
    const glow = ctx.createRadialGradient(lampX, lampY, 2, lampX, lampY, 150);
    glow.addColorStop(0, 'rgba(255, 214, 140, 0.55)');
    glow.addColorStop(0.35, 'rgba(255, 196, 107, 0.18)');
    glow.addColorStop(1, 'rgba(255, 196, 107, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, SWEEP_WIDTH, SWEEP_HEIGHT);

    // Lamp-lit paper behind the drawing, as on the card.
    ctx.fillStyle = NIGHT.edge; ctx.fillRect(artX - matPad - 2, artY - matPad - 2, artW + matPad * 2 + 4, artH + matPad * 2 + 4);
    ctx.fillStyle = NIGHT.mat; ctx.fillRect(artX - matPad, artY - matPad, artW + matPad * 2, artH + matPad * 2);
    ctx.drawImage(lit, artX, artY, artW, artH);
    sprite(ctx, BULB, lampX - 5, lampY - 7, 2, NIGHT.accent);

    // Title and maker.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = NIGHT.ink;
    ctx.font = `14px ${display}`;
    let title = input.title;
    while (title.length > 1 && ctx.measureText(title).width > SWEEP_WIDTH - 24) title = title.slice(0, -1);
    ctx.fillText(title === input.title ? title : `${title.slice(0, -1)}…`, SWEEP_WIDTH / 2, 64);
    if (input.maker) { ctx.fillStyle = NIGHT.soft; ctx.font = `10px ${body}`; ctx.fillText(`by ${input.maker}`, SWEEP_WIDTH / 2, 86); }

    // Footer: Bun and the invitation.
    ctx.fillStyle = NIGHT.edge;
    for (let x = 24; x < SWEEP_WIDTH - 24; x += 4) ctx.fillRect(x, SWEEP_HEIGHT - 66, 2, 1);
    sprite(ctx, BUN, Math.round(SWEEP_WIDTH / 2) - 9, SWEEP_HEIGHT - 56, 2, NIGHT.ink);
    ctx.fillStyle = NIGHT.ink;
    ctx.font = `8px ${display}`;
    ctx.fillText('Made in PixiBun · open me', SWEEP_WIDTH / 2, SWEEP_HEIGHT - 22);
    ctx.textAlign = 'left';

    out.push(canvas);
    onProgress?.(f + 1, total);
    // Let the page breathe between frames.
    if (f % 6 === 5) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return out;
}
