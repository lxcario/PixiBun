/**
 * One place for "a selection limits drawing": every raster tool asks for the
 * active mask here and writes only inside it.
 */

export interface SelectionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

let cachedRect: { selection: SelectionRect; width: number; height: number; mask: Uint8Array } | null = null;

/** The active selection as a per-pixel mask (1 = editable), or null when nothing is selected. */
export function resolveSelectionMask(
  selection: SelectionRect | null | undefined,
  selectionMask: Uint8Array | null | undefined,
  width: number,
  height: number,
): Uint8Array | null {
  if (selectionMask && selectionMask.length === width * height) return selectionMask;
  if (!selection) return null;
  if (cachedRect && cachedRect.selection === selection && cachedRect.width === width && cachedRect.height === height) return cachedRect.mask;
  const mask = new Uint8Array(width * height);
  const x0 = Math.max(0, Math.floor(selection.x));
  const y0 = Math.max(0, Math.floor(selection.y));
  const x1 = Math.min(width, Math.floor(selection.x + selection.w));
  const y1 = Math.min(height, Math.floor(selection.y + selection.h));
  for (let y = y0; y < y1; y++) mask.fill(1, y * width + x0, y * width + Math.max(x0, x1));
  cachedRect = { selection, width, height, mask };
  return mask;
}

/** fillRect limited to the mask: fills each selected run of the rectangle, row by row. */
export function fillRectMasked(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  mask: Uint8Array | null,
  width: number,
  height: number,
): void {
  if (!mask) {
    ctx.fillRect(x, y, w, h);
    return;
  }
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(width, x + w);
  const y1 = Math.min(height, y + h);
  for (let row = y0; row < y1; row++) {
    const offset = row * width;
    let col = x0;
    while (col < x1) {
      while (col < x1 && !mask[offset + col]) col++;
      const start = col;
      while (col < x1 && mask[offset + col]) col++;
      if (col > start) ctx.fillRect(start, row, col - start, 1);
    }
  }
}

/** Puts back the original pixels outside the mask after a whole-image edit. */
export function keepOutsideMask(original: Uint8ClampedArray, edited: Uint8ClampedArray, mask: Uint8Array | null): void {
  if (!mask) return;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) continue;
    const o = i * 4;
    edited[o] = original[o];
    edited[o + 1] = original[o + 1];
    edited[o + 2] = original[o + 2];
    edited[o + 3] = original[o + 3];
  }
}
