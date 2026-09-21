/**
 * resourceBudget.ts
 *
 * Central aggregate project resource calculation and validation envelope for PixiBun.
 *
 * Initial conservative project-complexity ceiling. This is a validation bound based
 * on base/raw RGBA footprint, not a guarantee of total browser memory consumption.
 *
 * Ensures individually valid dimensions (e.g. 2048x2048 canvas, 500 frames, 100 layers)
 * cannot combine into an unmaterializable project (e.g. 50,000 layers = 781 GiB).
 *
 * Evaluates worst-case materializable raster footprint before allocation, import,
 * hydration, or P2P structure application.
 */

import { WORKSPACE_ENVELOPE } from '@/config/canvasLimits';
import type { ProjectResourceUsage } from '@/types/project';

export interface FrameWithLayers {
  layers?: Array<unknown>;
}

/**
 * Calculates aggregate worst-case materializable resource usage across all layers and frames.
 */
export function calculateProjectResourceUsage(
  width: number,
  height: number,
  frames: FrameWithLayers[]
): ProjectResourceUsage {
  const frameCount = frames.length;
  let layerCount = 0;
  let rasterLayerCount = 0;

  for (const frame of frames) {
    if (Array.isArray(frame.layers)) {
      layerCount += frame.layers.length;
      for (const layer of frame.layers) {
        if (typeof layer === 'object' && layer !== null) {
          // In PixiBun every layer in a frame is raster-backed upon edit or render
          rasterLayerCount += 1;
        }
      }
    }
  }

  const materializableRasterPixels = layerCount * width * height;
  const baseRawRgbaBytes = materializableRasterPixels * 4;

  return {
    frameCount,
    layerCount,
    rasterLayerCount,
    materializableRasterPixels,
    baseRawRgbaBytes,
  };
}

export type ResourceBudgetValidationResult =
  | { ok: true; usage: ProjectResourceUsage }
  | { ok: false; error: string; usage: ProjectResourceUsage };

/**
 * Validates aggregate materializable resources against the initial conservative
 * project-complexity ceiling. Rejects pathological allocations before any buffer creation.
 */
export function validateProjectResourceBudget(
  width: number,
  height: number,
  frames: FrameWithLayers[]
): ResourceBudgetValidationResult {
  const usage = calculateProjectResourceUsage(width, height, frames);

  if (usage.layerCount > WORKSPACE_ENVELOPE.MAX_PROJECT_TOTAL_LAYERS) {
    return {
      ok: false,
      error: `Project exceeds total layer limit (${usage.layerCount.toLocaleString()} layers across all frames; maximum allowed is ${WORKSPACE_ENVELOPE.MAX_PROJECT_TOTAL_LAYERS.toLocaleString()}).`,
      usage,
    };
  }

  if (usage.materializableRasterPixels > WORKSPACE_ENVELOPE.MAX_PROJECT_AGGREGATE_PIXELS) {
    const mpx = (usage.materializableRasterPixels / 1_000_000).toFixed(1);
    const maxMpx = (WORKSPACE_ENVELOPE.MAX_PROJECT_AGGREGATE_PIXELS / 1_000_000).toFixed(1);
    const mib = Math.round(usage.baseRawRgbaBytes / (1024 * 1024));
    return {
      ok: false,
      error: `Project exceeds conservative resource complexity ceiling (${mpx} MP worst-case footprint, ~${mib} MiB base RGBA; maximum allowed is ${maxMpx} MP).`,
      usage,
    };
  }

  return { ok: true, usage };
}
