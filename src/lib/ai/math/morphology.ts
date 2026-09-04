/**
 * Binary Raster Morphology & Parallel Skeleton Line Thinning.
 *
 * Citation:
 * T. Y. Zhang & C. Y. Suen, "A fast parallel algorithm for thinning digital patterns",
 * Communications of the ACM, Vol. 27, No. 3, pp. 236–239, March 1984.
 *
 * Reduces thick raster strokes to 1-pixel-wide medial axis skeletons while preserving
 * 8-connected topology and line endpoints across two alternating sub-iterations.
 */

export function applyZhangSuenThinning(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number
): { thinnedCount: number } {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const binary = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    binary[i] = data[i * 4 + 3] > 30 ? 1 : 0;
  }

  let count = 0;
  let hasChanged = true;

  while (hasChanged) {
    hasChanged = false;

    // Sub-iteration 1
    const toDelete1: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (!binary[idx]) continue;

        const p2 = binary[(y - 1) * width + x];
        const p3 = binary[(y - 1) * width + (x + 1)];
        const p4 = binary[y * width + (x + 1)];
        const p5 = binary[(y + 1) * width + (x + 1)];
        const p6 = binary[(y + 1) * width + x];
        const p7 = binary[(y + 1) * width + (x - 1)];
        const p8 = binary[y * width + (x - 1)];
        const p9 = binary[(y - 1) * width + (x - 1)];

        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (B < 2 || B > 6) continue;

        const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        let A = 0;
        for (let k = 0; k < 8; k++) {
          if (neighbors[k] === 0 && neighbors[k + 1] === 1) A++;
        }
        if (A !== 1) continue;

        if (p2 * p4 * p6 !== 0) continue;
        if (p4 * p6 * p8 !== 0) continue;

        toDelete1.push(idx);
      }
    }

    for (const idx of toDelete1) {
      binary[idx] = 0;
      data[idx * 4 + 3] = 0;
      count++;
      hasChanged = true;
    }

    // Sub-iteration 2
    const toDelete2: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (!binary[idx]) continue;

        const p2 = binary[(y - 1) * width + x];
        const p3 = binary[(y - 1) * width + (x + 1)];
        const p4 = binary[y * width + (x + 1)];
        const p5 = binary[(y + 1) * width + (x + 1)];
        const p6 = binary[(y + 1) * width + x];
        const p7 = binary[(y + 1) * width + (x - 1)];
        const p8 = binary[y * width + (x - 1)];
        const p9 = binary[(y - 1) * width + (x - 1)];

        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (B < 2 || B > 6) continue;

        const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        let A = 0;
        for (let k = 0; k < 8; k++) {
          if (neighbors[k] === 0 && neighbors[k + 1] === 1) A++;
        }
        if (A !== 1) continue;

        if (p2 * p4 * p8 !== 0) continue;
        if (p2 * p6 * p8 !== 0) continue;

        toDelete2.push(idx);
      }
    }

    for (const idx of toDelete2) {
      binary[idx] = 0;
      data[idx * 4 + 3] = 0;
      count++;
      hasChanged = true;
    }
  }

  srcCtx.putImageData(imgData, 0, 0);
  return { thinnedCount: count };
}
