/**
 * canvasLimits.ts
 *
 * Canonical Workspace & Canvas Boundaries for PixiBun Atelier.
 *
 * Provides a single source of truth across all 5 subsystems:
 * 1. Project Schema (.pixibun file import/validation)
 * 2. P2P Collaboration (STRUCTURE_SYNC and pixel operation validation)
 * 3. Export Modal & PngExportTab (canvas rendering and dimension/pixel scale clamping)
 * 4. ImageHeaderProbe (external asset probing and decompression bomb defense)
 * 5. SafeCanvas (hardware limits, WebGL probe contexts, and clamped rect extraction)
 */

export const WORKSPACE_ENVELOPE = {
  /** Maximum single-axis dimension for creative workstation canvas (2048px). */
  MAX_CANVAS_DIMENSION: 2048,
  /** Maximum animation frames allowed in a project or synced structure (500 frames). */
  MAX_CANVAS_FRAMES: 500,
  /** Maximum layers per frame allowed in a project or synced structure (100 layers). */
  MAX_CANVAS_LAYERS: 100,
  /** Initial conservative project-complexity validation ceiling (67,108,864 px = 64 MP = 256 MiB base/raw RGBA). */
  MAX_PROJECT_AGGREGATE_PIXELS: 67_108_864,
  /** Maximum total layers across all frames in a project structure (2,000 layers). */
  MAX_PROJECT_TOTAL_LAYERS: 2000,

  /** Maximum export dimension when upscaling or downscaling (4096px). */
  MAX_EXPORT_DIMENSION: 4096,
  /** Maximum export pixel count ceiling (16,777,216 px = 16.7 MP, WebKit/iOS Safari limit). */
  MAX_EXPORT_PIXELS: 16_777_216,

  /** Maximum probe dimension for external reference images (8192px). */
  MAX_PROBE_DIMENSION: 8192,
  /** Maximum probe pixel area for decompression bomb defense (67,108,864 px = 67.1 MP). */
  MAX_PROBE_PIXELS: 67_108_864,

  /** Maximum hardware texture dimension (16384px). */
  MAX_HARDWARE_DIMENSION: 16384,
  /** Hardware / WebGL context max texture area ceiling (16384 x 16384 = 268,435,456 px). */
  MAX_HARDWARE_PIXEL_AREA: 16384 * 16384,
} as const;

export const EXPORT_ENVELOPE = {
  MAX_EXPORT_DIMENSION: WORKSPACE_ENVELOPE.MAX_EXPORT_DIMENSION,
  MAX_EXPORT_PIXELS: WORKSPACE_ENVELOPE.MAX_EXPORT_PIXELS,
} as const;

export const PROBE_ENVELOPE = {
  MAX_PROBE_DIMENSION: WORKSPACE_ENVELOPE.MAX_PROBE_DIMENSION,
  MAX_PROBE_PIXELS: WORKSPACE_ENVELOPE.MAX_PROBE_PIXELS,
} as const;

export const HARDWARE_LIMITS = {
  MAX_HARDWARE_DIMENSION: WORKSPACE_ENVELOPE.MAX_HARDWARE_DIMENSION,
  MAX_HARDWARE_PIXEL_AREA: WORKSPACE_ENVELOPE.MAX_HARDWARE_PIXEL_AREA,
} as const;

export const MAX_CANVAS_DIMENSION = WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION;
export function assertWorkspaceDimensions(width: number, height: number): void {
  if (![width, height].every(v => Number.isInteger(v) && v >= 1 && v <= MAX_CANVAS_DIMENSION)) {
    throw new RangeError(`Canvas dimensions must be whole numbers between 1 and ${MAX_CANVAS_DIMENSION}.`);
  }
}
export const MAX_CANVAS_FRAMES = WORKSPACE_ENVELOPE.MAX_CANVAS_FRAMES;
export const MAX_CANVAS_LAYERS = WORKSPACE_ENVELOPE.MAX_CANVAS_LAYERS;
export const MAX_PROJECT_AGGREGATE_PIXELS = WORKSPACE_ENVELOPE.MAX_PROJECT_AGGREGATE_PIXELS;
export const MAX_PROJECT_TOTAL_LAYERS = WORKSPACE_ENVELOPE.MAX_PROJECT_TOTAL_LAYERS;
export const MAX_EXPORT_DIMENSION = WORKSPACE_ENVELOPE.MAX_EXPORT_DIMENSION;
export const MAX_EXPORT_PIXELS = WORKSPACE_ENVELOPE.MAX_EXPORT_PIXELS;
export const MAX_PROBE_DIMENSION = WORKSPACE_ENVELOPE.MAX_PROBE_DIMENSION;
export const MAX_PROBE_PIXELS = WORKSPACE_ENVELOPE.MAX_PROBE_PIXELS;
export const MAX_HARDWARE_DIMENSION = WORKSPACE_ENVELOPE.MAX_HARDWARE_DIMENSION;
export const MAX_HARDWARE_PIXEL_AREA = WORKSPACE_ENVELOPE.MAX_HARDWARE_PIXEL_AREA;

// Compatibility aliases for existing export modules and tests
export const MAX_SAFE_CANVAS_DIMENSION = MAX_EXPORT_DIMENSION;
export const MAX_SAFE_CANVAS_PIXELS = MAX_EXPORT_PIXELS;
