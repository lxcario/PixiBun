/**
 * exportGeometryValidation.ts
 *
 * Canonical output geometry and safety envelope validator for PixiBun exports.
 * Enforces configured PixiBun safety ceilings across all raster and video export pipelines:
 * - PNG Single Frame (ExportModal / PngExportTab)
 * - Sprite-Sheet Packer (spriteSheetPacker)
 * - Animated GIF (gifEncoder)
 * - Animated PNG (apngEncoder)
 * - MP4 Video (mp4Encoder)
 * - WebM Video (webmEncoder)
 */

import {
  MAX_SAFE_CANVAS_DIMENSION,
  MAX_SAFE_CANVAS_PIXELS,
} from '@/config/canvasLimits';

export interface ExportGeometryValidation {
  valid: boolean;
  width: number;
  height: number;
  totalPixels: number;
  aggregatePixels?: number;
  error?: string;
  reason?: 'exceeds-dimension' | 'exceeds-pixels' | 'exceeds-aggregate' | 'invalid-dimensions';
}

export interface ExportGeometryLimits {
  maxDimension?: number;
  maxPixels?: number;
  maxAggregatePixels?: number;
  frameCount?: number;
}

/**
 * Validates requested export dimensions and optional aggregate pixel area against
 * authoritative PixiBun safety envelopes:
 * - MAX_SAFE_CANVAS_DIMENSION = 4096 px (PixiBun configured safety boundary)
 * - MAX_SAFE_CANVAS_PIXELS = 16,777,216 px (~16.7 MP, PixiBun configured safety boundary)
 * - Optional aggregate raster limit (e.g. MAX_EXPORT_AGGREGATE_PIXELS = 67,108,864 px,
 *   configured animated-image export budget bounding raw source pixels)
 */
export function validateExportGeometry(
  width: number,
  height: number,
  limits: ExportGeometryLimits = {}
): ExportGeometryValidation {
  const maxDim = limits.maxDimension ?? MAX_SAFE_CANVAS_DIMENSION;
  const maxPix = limits.maxPixels ?? MAX_SAFE_CANVAS_PIXELS;

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return {
      valid: false,
      width,
      height,
      totalPixels: 0,
      reason: 'invalid-dimensions',
      error: `Export dimensions must be positive finite numbers (${width}x${height}).`,
    };
  }

  const totalPixels = width * height;
  if (width > maxDim || height > maxDim) {
    return {
      valid: false,
      width,
      height,
      totalPixels,
      reason: 'exceeds-dimension',
      error: `Export dimensions ${width}x${height} exceed maximum dimension limit of ${maxDim}px.`,
    };
  }

  if (totalPixels > maxPix) {
    return {
      valid: false,
      width,
      height,
      totalPixels,
      reason: 'exceeds-pixels',
      error: `Export area of ${totalPixels} pixels exceeds maximum safety limit of ${maxPix} pixels (${(maxPix / 1_000_000).toFixed(1)} MP).`,
    };
  }

  if (
    limits.maxAggregatePixels !== undefined &&
    limits.frameCount !== undefined &&
    limits.frameCount > 0
  ) {
    const aggregatePixels = totalPixels * limits.frameCount;
    if (aggregatePixels > limits.maxAggregatePixels) {
      return {
        valid: false,
        width,
        height,
        totalPixels,
        aggregatePixels,
        reason: 'exceeds-aggregate',
        error: `Aggregate frame pixels (${aggregatePixels} pixels for ${limits.frameCount} frames of ${width}x${height}) exceeds maximum aggregate safety limit of ${limits.maxAggregatePixels} pixels (${(limits.maxAggregatePixels / 1_000_000).toFixed(1)} MP).`,
      };
    }
  }

  return {
    valid: true,
    width,
    height,
    totalPixels,
    ...(limits.frameCount !== undefined ? { aggregatePixels: totalPixels * limits.frameCount } : {}),
  };
}
