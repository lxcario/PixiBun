// A text account of what the active frame looks like, for people using a
// screen reader and for black-box browser tests that cannot see inside the
// <canvas>. It reads the same overlay-free composite the exporters write, so
// onion skins, grid and selection never change the numbers.

import type { AnimationFrame } from '@/types/canvas';
import { compositeFrame } from '@/lib/render/compositor';

export interface ReadoutColor {
  /** `#rrggbb` for opaque pixels, `#rrggbbaa` otherwise. */
  hex: string;
  count: number;
}

export interface PixelSummary {
  width: number;
  height: number;
  /** Pixels with any alpha above zero. */
  paintedPixels: number;
  /** Distinct painted colors, alpha included. */
  colorCount: number;
  /** Most used painted colors, by count then hex. */
  topColors: ReadoutColor[];
  /** FNV-1a 32-bit hash of the size and RGBA bytes, as 8 hex digits. */
  digest: string;
}

export interface CanvasReadout extends PixelSummary {
  frameNumber: number;
  frameCount: number;
  layerName: string;
  layerCount: number;
}

export const READOUT_TOP_COLORS = 4;

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

const hex2 = (value: number) => value.toString(16).padStart(2, '0');

function fnvByte(hash: number, byte: number): number {
  return Math.imul(hash ^ byte, FNV_PRIME);
}

function fnvUint32(hash: number, value: number): number {
  hash = fnvByte(hash, value & 0xff);
  hash = fnvByte(hash, (value >>> 8) & 0xff);
  hash = fnvByte(hash, (value >>> 16) & 0xff);
  return fnvByte(hash, (value >>> 24) & 0xff);
}

/**
 * Summarizes RGBA pixels. Fully transparent pixels hash as zero whatever their
 * color channels hold, so an erased pixel and a never-painted one agree.
 */
export function summarizeCanvasPixels(
  data: ArrayLike<number>,
  width: number,
  height: number,
  topColorLimit = READOUT_TOP_COLORS
): PixelSummary {
  const pixelCount = width * height;
  if (data.length < pixelCount * 4) {
    throw new RangeError(`Expected ${pixelCount * 4} RGBA bytes for ${width}×${height}, got ${data.length}.`);
  }
  const counts = new Map<number, number>();
  let painted = 0;
  let hash = fnvUint32(fnvUint32(FNV_OFFSET, width), height);
  for (let i = 0; i < pixelCount * 4; i += 4) {
    const a = data[i + 3];
    if (a === 0) {
      hash = fnvUint32(hash, 0);
      continue;
    }
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    hash = fnvByte(fnvByte(fnvByte(fnvByte(hash, r), g), b), a);
    painted++;
    const key = ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const colors = Array.from(counts, ([key, count]) => {
    const a = key & 0xff;
    const hex = `#${hex2(key >>> 24)}${hex2((key >>> 16) & 0xff)}${hex2((key >>> 8) & 0xff)}${a === 255 ? '' : hex2(a)}`;
    return { hex, count };
  });
  colors.sort((x, y) => y.count - x.count || (x.hex < y.hex ? -1 : x.hex > y.hex ? 1 : 0));
  return {
    width,
    height,
    paintedPixels: painted,
    colorCount: colors.length,
    topColors: colors.slice(0, Math.max(0, topColorLimit)),
    digest: (hash >>> 0).toString(16).padStart(8, '0'),
  };
}

/** Top colors as one line, e.g. `#ff3030 8, #000000 2`. */
export function formatReadoutColors(colors: ReadoutColor[]): string {
  return colors.length === 0 ? 'none' : colors.map((color) => `${color.hex} ${color.count}`).join(', ');
}

/** One sentence for the live region, announced after committed edits. */
export function describeCanvasReadout(readout: CanvasReadout): string {
  const pixels = `${readout.paintedPixels} painted ${readout.paintedPixels === 1 ? 'pixel' : 'pixels'}`;
  const colors = `${readout.colorCount} ${readout.colorCount === 1 ? 'color' : 'colors'}`;
  const layers = `${readout.layerCount} ${readout.layerCount === 1 ? 'layer' : 'layers'}`;
  return `${readout.width}×${readout.height} canvas, frame ${readout.frameNumber} of ${readout.frameCount}, layer ${readout.layerName} of ${layers}: ${pixels} in ${colors}.`;
}

interface ReadoutSource {
  frames: AnimationFrame[];
  activeFrameIndex: number;
  activeLayerId: string;
  canvasWidth: number;
  canvasHeight: number;
}

/** Reads the active frame's composite. Null outside a browser. */
export function readActiveFrameReadout(state: ReadoutSource): CanvasReadout | null {
  const { frames, activeFrameIndex, canvasWidth, canvasHeight } = state;
  const frame = frames[activeFrameIndex];
  if (!frame) return null;
  const composite = compositeFrame(frames, activeFrameIndex, canvasWidth, canvasHeight);
  const ctx = composite?.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const summary = summarizeCanvasPixels(ctx.getImageData(0, 0, canvasWidth, canvasHeight).data, canvasWidth, canvasHeight);
  return {
    ...summary,
    frameNumber: activeFrameIndex + 1,
    frameCount: frames.length,
    layerName: frame.layers.find((layer) => layer.id === state.activeLayerId)?.name ?? 'none',
    layerCount: frame.layers.length,
  };
}
