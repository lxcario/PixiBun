import { getTemplateGridSize, type LessonFrameTemplate } from '@/lib/art/playgroundLessons';
import { LESSON_PALETTE } from '@/lib/art/lessonPalette';
import { traceOrder } from '@/lib/art/playgroundCoach';

/** The theme's accent, for the ghost pen's nib. */
export function accentColor(): string {
  if (typeof document === 'undefined') return '#f0be7c';
  return getComputedStyle(document.documentElement).getPropertyValue('--accent-gold').trim() || '#f0be7c';
}

/**
 * Ghost-draw a pose on `ctx` cell by cell, outline first, like a pen would,
 * then hold and fade. Returns a cancel function; `onDone` runs when it ends.
 */
export function runTraceDemo(
  ctx: CanvasRenderingContext2D, template: LessonFrameTemplate, width: number, height: number,
  options: { reduceMotion: boolean; onDone: () => void },
): () => void {
  const grid = getTemplateGridSize(template);
  const cellW = width / grid;
  const cellH = height / grid;
  const gold = accentColor();
  const cells = traceOrder(template, LESSON_PALETTE);
  const edgeCount = cells.filter(cell => cell.edge).length;
  const drawMs = options.reduceMotion ? 0 : Math.min(2200, 900 + cells.length * 6);
  const holdMs = options.reduceMotion ? 1800 : 700;
  const fadeMs = options.reduceMotion ? 0 : 500;
  const fill = (x: number, y: number, color: string, alpha: number) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x * cellW), Math.floor(y * cellH), Math.max(1, Math.ceil(cellW)), Math.max(1, Math.ceil(cellH)));
  };
  const start = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, width, height);
    // The outline takes most of the time, the inside fills in quickly after.
    const p = drawMs ? Math.min(1, t / drawMs) : 1;
    const shown = p < 0.7 ? Math.round((p / 0.7) * edgeCount) : edgeCount + Math.round(((p - 0.7) / 0.3) * (cells.length - edgeCount));
    const fade = t > drawMs + holdMs ? Math.max(0, 1 - (t - drawMs - holdMs) / Math.max(1, fadeMs)) : 1;
    for (let i = 0; i < shown; i++) fill(cells[i].x, cells[i].y, cells[i].color, 0.8 * fade);
    const head = cells[Math.max(0, Math.min(cells.length - 1, shown - 1))];
    if (head && p < 1) fill(head.x, head.y, gold, 1);
    ctx.globalAlpha = 1;
    if (t >= drawMs + holdMs + fadeMs) { ctx.clearRect(0, 0, width, height); options.onDone(); return; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); ctx.globalAlpha = 1; };
}
