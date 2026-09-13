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
