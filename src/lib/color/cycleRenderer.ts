/**
 * Color cycling outside the viewport (postcard previews, the cart player):
 * the same register map and LUT as the Studio's cycling loop, so a scene
 * moves the same way everywhere.
 */
import type { PaletteCycleTrack } from '@/types/palette';
import { buildCycleRegisterMask, updateLivePaletteLUT32 } from './paletteCycling';
import { buildCanvasPaletteIndexMap } from '@/lib/export/shaderExporter';

export interface CycleRenderer {
  /** Draw the art as it looks `elapsedSec` into the cycle. */
  render(elapsedSec: number, target: CanvasRenderingContext2D): void;
}

/** Null when the palette has no active tracks (nothing would move). */
export function createCycleRenderer(art: HTMLCanvasElement, palette: string[], tracks: PaletteCycleTrack[] | undefined): CycleRenderer | null {
  const active = (tracks ?? []).filter(track => track.enabled && track.rate > 0 && track.high > track.low);
  if (active.length === 0 || palette.length < 1 || palette.length > 256) return null;
  const ctx = art.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const { width, height } = art;
  const base = ctx.getImageData(0, 0, width, height);
  const indexMap = buildCanvasPaletteIndexMap(ctx, width, height, palette);
  const cycling = buildCycleRegisterMask(active, palette.length);
  const lut = new Uint32Array(palette.length);
  const frame = new ImageData(width, height);
  const out32 = new Uint32Array(frame.data.buffer);
  const base32 = new Uint32Array(base.data.buffer);
  const scratch = document.createElement('canvas');
  scratch.width = width; scratch.height = height;
  const scratchCtx = scratch.getContext('2d')!;
  return {
    render(elapsedSec, target) {
      updateLivePaletteLUT32(palette, active, elapsedSec, lut);
      for (let i = 0; i < out32.length; i++) {
        const register = indexMap.indices[i];
        out32[i] = indexMap.alpha[i] === 0 || !cycling[register] ? base32[i] : ((lut[register] ?? base32[i]) & 0x00ffffff) | (indexMap.alpha[i] << 24);
      }
      scratchCtx.putImageData(frame, 0, 0);
      target.imageSmoothingEnabled = false;
      target.clearRect(0, 0, target.canvas.width, target.canvas.height);
      target.drawImage(scratch, 0, 0, target.canvas.width, target.canvas.height);
    },
  };
}
