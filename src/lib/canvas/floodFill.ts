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

export function rgbaToHex(r: number, g: number, b: number, _a: number = 255): string {
  // Alpha is accepted for call-site symmetry but hex output stays opaque RGB.
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

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

// Iterative 4-connected stack-based Flood Fill
export function performFloodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorHex: string,
  contiguous: boolean = true,
  tolerance: number = 0
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const pixels32 = new Uint32Array(data.buffer);

  const targetOffset = (startY * width + startX) * 4;
  const targetColor: RGBA = {
    r: data[targetOffset],
    g: data[targetOffset + 1],
    b: data[targetOffset + 2],
    a: data[targetOffset + 3],
  };

  const replacementColor = hexToRgba(fillColorHex);

  // If target color already matches replacement color, abort to avoid infinite loop
  if (colorsMatch(targetColor, replacementColor, 0)) return;

  const targetColor32 = (targetColor.a << 24) | (targetColor.b << 16) | (targetColor.g << 8) | targetColor.r;
  const replacementColor32 = (replacementColor.a << 24) | (replacementColor.b << 16) | (replacementColor.g << 8) | replacementColor.r;

  if (!contiguous) {
    // Global Color Replacement: Replace all matching pixels across the entire layer
    for (let i = 0; i < pixels32.length; i++) {
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

    while (queue.length > 0) {
      const y = queue.pop()!;
      const x = queue.pop()!;

      const index = y * width + x;
      pixels32[index] = replacementColor32;

      // 4-connected neighbors
      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIndex = ny * width + nx;
          if (!visited[nIndex]) {
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
  }

  ctx.putImageData(imgData, 0, 0);
}
