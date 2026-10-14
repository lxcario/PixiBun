/** Two neutral grays, so neither white nor black artwork disappears into the checkerboard. */
export const CHECKER_LIGHT = '#ffffff';
export const CHECKER_DARK = '#d9d9d9';

/** Smallest checker square on screen, in CSS pixels. */
const MIN_SCREEN_PX = 8;

/**
 * Checker squares follow the artwork's pixel grid: one art pixel per square when
 * zoomed in, and power-of-two blocks of art pixels when zoomed out, so a square
 * never splits an art pixel and never shrinks below a readable size.
 * Returns the square's size in screen pixels for a zoom given in percent.
 */
export function checkerSquarePx(zoomPercent: number): number {
  const screenPerArtPixel = Math.max(0.01, zoomPercent / 100);
  let artPixels = 1;
  while (artPixels * screenPerArtPixel < MIN_SCREEN_PX && artPixels < 4096) artPixels *= 2;
  return artPixels * screenPerArtPixel;
}

/** CSS for an underlay showing transparency as a checkerboard aligned to the canvas origin. */
export function checkerStyle(zoomPercent: number): { backgroundColor: string; backgroundImage: string; backgroundSize: string } {
  const square = checkerSquarePx(zoomPercent);
  return {
    backgroundColor: CHECKER_LIGHT,
    backgroundImage: `repeating-conic-gradient(${CHECKER_DARK} 0% 25%, ${CHECKER_LIGHT} 0% 50%)`,
    backgroundSize: `${square * 2}px ${square * 2}px`,
  };
}
