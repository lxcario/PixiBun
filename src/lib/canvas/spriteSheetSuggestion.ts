/** Suggest a regular grid for review; image dimensions alone cannot prove a sheet. */
export function suggestSpriteSheetGrid(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  filename: string
): { width: number; height: number; frames: number } | null {
  const candidate = (width: number, height: number) => {
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) return null;
    if (imageWidth % width !== 0 || imageHeight % height !== 0) return null;
    const frames = (imageWidth / width) * (imageHeight / height);
    return frames >= 2 && frames <= 500 ? { width, height, frames } : null;
  };

  const workspaceGrid = candidate(canvasWidth, canvasHeight);
  if (workspaceGrid) return workspaceGrid;

  if (!/(?:sprite.?sheet|sheet|strip|animation|anim)(?:[^a-z]|$)/i.test(filename)) return null;
  for (const size of [64, 48, 32, 24, 16]) {
    const grid = candidate(size, size);
    if (grid) return grid;
  }
  return null;
}
