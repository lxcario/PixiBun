/**
 * Canonical integer zoom ladder and step navigation helpers.
 * Used uniformly across mouse wheel, toolbar buttons, and keyboard shortcuts.
 */

export const ZOOM_LADDER = [
  10, 20, 25, 50, 75, 100, 200, 300, 400, 500, 600, 800, 1000, 1200, 1600, 2400, 3200, 4800, 6400,
] as const;

export const MIN_ZOOM = 10;
export const MAX_ZOOM = 6400;
export const DEFAULT_ZOOM = 1600;

/**
 * Returns the next higher zoom step from the ladder.
 * If current zoom is greater than or equal to MAX_ZOOM, returns MAX_ZOOM.
 */
export function getNextZoomStep(current: number): number {
  const next = ZOOM_LADDER.find((step) => step > current);
  return next !== undefined ? next : MAX_ZOOM;
}

/**
 * Returns the next lower zoom step from the ladder.
 * If current zoom is less than or equal to MIN_ZOOM, returns MIN_ZOOM.
 */
export function getPrevZoomStep(current: number): number {
  const reversed = [...ZOOM_LADDER].reverse();
  const prev = reversed.find((step) => step < current);
  return prev !== undefined ? prev : MIN_ZOOM;
}

/**
 * Calculates a sensible best-fit zoom level from ZOOM_LADDER based on canvas
 * dimensions and the available center-stage viewport bounds.
 *
 * It guarantees:
 * - The canvas fits comfortably within available center-stage width/height with safe margins
 * - Never collapses small canvases (16x16, 32x32) into an unusable microscopic speck
 * - Allows a reduced-scale overview for canvases larger than the viewport
 * - Uses the available space closely for canvases that require a scale below 100%
 */
export function calculateFitZoom(
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth?: number,
  viewportHeight?: number
): number {
  if (canvasWidth <= 0 || canvasHeight <= 0) return DEFAULT_ZOOM;

  const viewport = typeof document !== 'undefined' ? document.getElementById('main-content') : null;
  const availW = Math.max(1, (viewportWidth ?? viewport?.clientWidth ?? 860) - 48);
  const availH = Math.max(1, (viewportHeight ?? viewport?.clientHeight ?? 520) - 48);

  const maxFitW = Math.floor((availW / canvasWidth) * 100);
  const maxFitH = Math.floor((availH / canvasHeight) * 100);
  const rawFit = Math.min(maxFitW, maxFitH);

  // Reduced views benefit from using the available stage, even between toolbar steps.
  if (rawFit < 100) return Math.max(MIN_ZOOM, Math.min(99, rawFit));

  // Find the highest step from ZOOM_LADDER that fits within rawFit
  const step = [...ZOOM_LADDER].reverse().find((s) => s <= rawFit);
  if (step !== undefined) {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, step));
  }

  // Very large canvases use the smallest overview step.
  return MIN_ZOOM;
}
