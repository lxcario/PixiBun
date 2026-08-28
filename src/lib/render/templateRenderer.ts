import { StarterTemplate } from '@/types/landing';
import { TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';

/**
 * Paint a starter template onto a canvas with crisp integer-aligned rect fills.
 * The caller owns sizing: pass a backing store already multiplied by DPR.
 */
export function paintTemplate(
  canvas: HTMLCanvasElement,
  template: StarterTemplate
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cellW = canvas.width / template.width;
  const cellH = canvas.height / template.height;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  template.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const key = row[x];
      if (key === '.') continue;
      const fill = TEMPLATE_PALETTE[key];
      if (!fill) continue;
      ctx.fillStyle = fill;
      ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
    }
  });
}