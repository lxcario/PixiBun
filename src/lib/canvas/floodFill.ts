// High-performance Iterative 4-connected stack-based Flood Fill & Color Swap algorithms for pixel buffers

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function hexToRgba(hex: string): RGBA {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('') + 'ff';
  } else if (cleanHex.length === 4) {
    // #RGBA — double each nibble to its RRGGBBAA form (CSS Color 4 shorthand)
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  } else if (cleanHex.length === 6) {
    cleanHex += 'ff';
  } else if (cleanHex.length === 8) {
    // Already has alpha
  } else {
    cleanHex = 'ffffffff';
  }

  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 24) & 255,
    g: (num >> 16) & 255,
    b: (num >> 8) & 255,
    a: num & 255,
  };
}

/**
 * Converts color channels to a standard 6-character hex string (#RRGGBB).
 *
 * Design Contract:
 * - Output format is strictly 6-digit `#RRGGBB` (clamped to 0..255).
 * - Alpha channel `_a` is accepted for call-site symmetry with RGBA tuples, but is
 *   intentionally excluded from hex output because studio color inputs
 *   (such as setPrimaryColor in useViewportPointerEvents) require 6-digit hex format.
 */
export function rgbaToHex(r: number, g: number, b: number, _a: number = 255): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Direct alias for rgbaToHex reflecting opaque 6-digit RGB conversion contract */
export const rgbToHex = rgbaToHex;

export function colorsMatch(
  c1: RGBA,
  c2: RGBA,
  tolerance: number = 0
): boolean {
  // If both are transparent, they match regardless of RGB channel noise
  if (c1.a <= 10 && c2.a <= 10) return true;
  // If one is transparent and one is opaque, they do not match
  if ((c1.a <= 10 && c2.a > 10) || (c1.a > 10 && c2.a <= 10)) return false;

  if (tolerance === 0) {
    return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a;
  }

  const diff = Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2) +
    Math.pow(c1.a - c2.a, 2)
  );

  return diff <= tolerance;
}

/** Recolor matching visible pixels in one layer, leaving their transparency intact. */
export function replaceLayerColor(
  imageData: ImageData,
  x: number,
  y: number,
  replacementHex: string,
  tolerance: number = 0,
  /** Optional selection: only selected pixels change, and the sample must be selected. */
  mask: Uint8Array | null = null
): number {
  const { width, height, data } = imageData;
  if (x < 0 || x >= width || y < 0 || y >= height) return 0;
  if (mask && !mask[y * width + x]) return 0;
  const source = (y * width + x) * 4;
  if (data[source + 3] <= 30) return 0;

  const r = data[source];
  const g = data[source + 1];
  const b = data[source + 2];
  const replacement = hexToRgba(replacementHex);
  const limit = Math.max(0, Math.min(255, tolerance)) ** 2;
  let changed = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 30) continue;
    if (mask && !mask[i >> 2]) continue;
    const dr = data[i] - r;
    const dg = data[i + 1] - g;
    const db = data[i + 2] - b;
    if (dr * dr + dg * dg + db * db > limit) continue;
    if (data[i] === replacement.r && data[i + 1] === replacement.g && data[i + 2] === replacement.b) continue;
    data[i] = replacement.r;
    data[i + 1] = replacement.g;
    data[i + 2] = replacement.b;
    changed++;
  }
  return changed;
}

// Iterative 4-connected stack-based Flood Fill
export function performFloodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorHex: string,
  contiguous: boolean = true,
  tolerance: number = 0,
  fillEnclosedSpecks: boolean = false,
  /** Optional selection: the fill never leaves it, and a click outside it fills nothing. */
  mask: Uint8Array | null = null
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;
  if (mask && !mask[startY * width + startX]) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const pixels32 = new Uint32Array(data.buffer, data.byteOffset, data.byteLength >> 2);

  const targetOffset = (startY * width + startX) * 4;
  const targetColor: RGBA = {
    r: data[targetOffset],
    g: data[targetOffset + 1],
    b: data[targetOffset + 2],
    a: data[targetOffset + 3],
  };

  const replacementColor = hexToRgba(fillColorHex);

  // If target color already matches replacement color, abort to avoid infinite loop
  if (colorsMatch(targetColor, replacementColor, 0) && tolerance === 0 && !fillEnclosedSpecks) return;

  const targetColor32 = ((targetColor.a << 24) | (targetColor.b << 16) | (targetColor.g << 8) | targetColor.r) >>> 0;
  const replacementColor32 = ((replacementColor.a << 24) | (replacementColor.b << 16) | (replacementColor.g << 8) | replacementColor.r) >>> 0;

  if (!contiguous) {
    // Global Color Replacement: Replace all matching pixels across the entire layer
    for (let i = 0; i < pixels32.length; i++) {
      if (mask && !mask[i]) continue;
      const idx = i * 4;
      const currentPixel: RGBA = {
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: data[idx + 3],
      };

      if (tolerance === 0) {
          if (pixels32[i] === targetColor32 || (data[idx+3] <= 10 && targetColor.a <= 10)) {
              pixels32[i] = replacementColor32;
          }
      } else if (colorsMatch(currentPixel, targetColor, tolerance)) {
        pixels32[i] = replacementColor32;
      }
    }
  } else {
    // Contiguous Flood Fill with Queue (stack)
    const queue: number[] = [startX, startY];
    const visited = new Uint8Array(width * height);
    visited[startY * width + startX] = 1;
    let minX = startX;
    let maxX = startX;
    let minY = startY;
    let maxY = startY;

    while (queue.length > 0) {
      const y = queue.pop()!;
      const x = queue.pop()!;

      const index = y * width + x;
      pixels32[index] = replacementColor32;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      // 4-connected neighbors without allocating a new array for each pixel.
      for (let direction = 0; direction < 4; direction++) {
        const nx = x + (direction === 0 ? 1 : direction === 1 ? -1 : 0);
        const ny = y + (direction === 2 ? 1 : direction === 3 ? -1 : 0);
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIndex = ny * width + nx;
          if (!visited[nIndex] && (!mask || mask[nIndex])) {
            const nOffset = nIndex * 4;
            const nColor: RGBA = {
              r: data[nOffset],
              g: data[nOffset + 1],
              b: data[nOffset + 2],
              a: data[nOffset + 3],
            };

            let matches: boolean;
            if (tolerance === 0) {
                matches = pixels32[nIndex] === targetColor32 || (data[nOffset+3] <= 10 && targetColor.a <= 10);
            } else {
                matches = colorsMatch(nColor, targetColor, tolerance);
            }

            if (matches) {
              visited[nIndex] = 1;
              queue.push(nx, ny);
            }
          }
        }
      }
    }

    if (fillEnclosedSpecks) {
      // Keep this optional: a small enclosed detail can be intentional artwork.
      // Only islands surrounded by the filled region, never outside the region,
      // are eligible. The 8-pixel limit avoids swallowing larger features.
      const checked = new Uint8Array(width * height);
      const islandQueue = new Uint32Array((maxX - minX + 1) * (maxY - minY + 1));
      let tail = 0;
      const visitIslandNeighbor = (neighbor: number) => {
        if (visited[neighbor] || checked[neighbor]) return;
        checked[neighbor] = 1;
        islandQueue[tail++] = neighbor;
      };
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const start = y * width + x;
          if (visited[start] || checked[start]) continue;
          let head = 0;
          tail = 1;
          let enclosed = true;
          checked[start] = 1;
          islandQueue[0] = start;
          while (head < tail) {
            const index = islandQueue[head++];
            const px = index % width;
            const py = Math.floor(index / width);
            if (px === minX || px === maxX || py === minY || py === maxY) enclosed = false;
            if (data[index * 4 + 3] <= 10) enclosed = false;
            if (px > minX) visitIslandNeighbor(index - 1);
            if (px < maxX) visitIslandNeighbor(index + 1);
            if (py > minY) visitIslandNeighbor(index - width);
            if (py < maxY) visitIslandNeighbor(index + width);
          }
          if (enclosed && tail <= 8) {
            for (let i = 0; i < tail; i++) if (!mask || mask[islandQueue[i]]) pixels32[islandQueue[i]] = replacementColor32;
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
