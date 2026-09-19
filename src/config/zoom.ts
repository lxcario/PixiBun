/**
 * Canonical integer zoom ladder and step navigation helpers.
 * Used uniformly across mouse wheel, toolbar buttons, and keyboard shortcuts.
 */

export const ZOOM_LADDER = [
  100, 200, 300, 400, 500, 600, 800, 1000, 1200, 1600, 2400, 3200, 4800, 6400,
] as const;

export const MIN_ZOOM = 100;
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
 * - Clamps accurately between MIN_ZOOM (100) and MAX_ZOOM (6400)
 * - Selects an integer step from ZOOM_LADDER
 */
export function calculateFitZoom(
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth?: number,
  viewportHeight?: number
): number {
  if (canvasWidth <= 0 || canvasHeight <= 0) return DEFAULT_ZOOM;

  // Available stage width and height accounting for LeftToolbar (56px), RightInspector (320px),
  // AtelierRail (40px), Timeline (~104px), StatusBar (24px), and comfortable perimeter margins
  const availW = (viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth - 420 : 860)) * 0.88;
  const availH = (viewportHeight ?? (typeof window !== 'undefined' ? window.innerHeight - 200 : 520)) * 0.88;

  const maxFitW = Math.floor((Math.max(100, availW) / canvasWidth) * 100);
  const maxFitH = Math.floor((Math.max(100, availH) / canvasHeight) * 100);
  const rawFit = Math.min(maxFitW, maxFitH);

  // Find the highest step from ZOOM_LADDER that fits within rawFit
  const step = [...ZOOM_LADDER].reverse().find((s) => s <= rawFit);
  if (step !== undefined) {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, step));
  }

  // If rawFit is smaller than the lowest ladder step (e.g. huge canvas), clamp to MIN_ZOOM
  return MIN_ZOOM;
}

