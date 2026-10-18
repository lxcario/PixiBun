import type { ReviewRegion } from '@/types/animation';
import { restoreProtectedPixels } from '@/lib/animation/reviewMetadata';

/** Conservative, deterministic cleanup for imported raster sprites. */
export interface SpriteCleanupOptions {
  alphaCutoff: number;
  maxSpeckPixels: number;
  paletteSize: number;
  simplifyColors: boolean;
  thinDarkLines: boolean;
}

export interface SpriteCleanupStats {
  removedFaint: number;
  hardenedAlpha: number;
  removedSpecks: number;
  simplifiedColors: number;
  thinnedLinePixels: number;
  changedPixels: number;
  protectedPixels?: number;
  sourceColors: number;
  resultColors: number;
}

export interface SpriteCleanupPlan {
  data: Uint8ClampedArray;
  stats: SpriteCleanupStats;
}

type Raster = { width: number; height: number; data: Uint8ClampedArray };

const luminance = (r: number, g: number, b: number) => (r * 54 + g * 183 + b * 19) / 256;

function colorCount(data: Uint8ClampedArray): number {
  const colors = new Set<number>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    colors.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
  }
  return colors.size;
}

export function planSpriteCleanup(image: Raster, options: SpriteCleanupOptions, protectedRegions: ReviewRegion[] = []): SpriteCleanupPlan {
  const { width, height } = image;
  const pixels = width * height;
  if (width < 1 || height < 1 || image.data.length !== pixels * 4) {
    throw new Error('Invalid sprite cleanup image dimensions');
  }
  const source = image.data;
  const data = new Uint8ClampedArray(source);
  const stats: SpriteCleanupStats = {
    removedFaint: 0, hardenedAlpha: 0, removedSpecks: 0, simplifiedColors: 0,
    thinnedLinePixels: 0, changedPixels: 0,
    sourceColors: colorCount(source), resultColors: 0,
  };
  const cutoff = Math.max(0, Math.min(254, Math.floor(options.alphaCutoff)));
  const maxSpeck = Math.max(0, Math.min(8, Math.floor(options.maxSpeckPixels)));

  // Remove faint alpha and make surviving pixels fully opaque for crisp edges.
  for (let pixel = 0; pixel < pixels; pixel++) {
    const offset = pixel * 4;
    const alpha = data[offset + 3];
    if (alpha === 0) continue;
    if (alpha <= cutoff) {
      data.fill(0, offset, offset + 4);
      stats.removedFaint++;
    } else if (alpha < 255) {
      data[offset + 3] = 255;
      stats.hardenedAlpha++;
    }
  }

  // Classify 8-connected components before deleting tiny detached islands.
  if (maxSpeck > 0) {
    const visited = new Uint8Array(pixels);
    const queue = new Int32Array(pixels);
    let largest = { start: -1, count: 0 };
    for (let pixel = 0; pixel < pixels; pixel++) {
      if (visited[pixel] || data[pixel * 4 + 3] === 0) continue;
      let head = 0;
      let tail = 1;
      queue[0] = pixel;
      visited[pixel] = 1;
      while (head < tail) {
        const current = queue[head++];
        const x = current % width;
        const y = Math.floor(current / width);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const neighbor = ny * width + nx;
          if (visited[neighbor] || data[neighbor * 4 + 3] === 0) continue;
          visited[neighbor] = 1;
          queue[tail++] = neighbor;
        }
      }
      if (tail > largest.count) largest = { start: pixel, count: tail };
    }
    // A second bounded traversal avoids keeping every large component in memory.
    visited.fill(0);
    for (let pixel = 0; pixel < pixels; pixel++) {
      if (visited[pixel] || data[pixel * 4 + 3] === 0) continue;
      let head = 0;
      let tail = 1;
      queue[0] = pixel;
      visited[pixel] = 1;
      while (head < tail) {
        const current = queue[head++];
        const x = current % width;
        const y = Math.floor(current / width);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const neighbor = ny * width + nx;
          if (visited[neighbor] || data[neighbor * 4 + 3] === 0) continue;
          visited[neighbor] = 1;
          queue[tail++] = neighbor;
        }
      }
      let neutralSpeck = true;
      for (let i = 0; i < tail; i++) {
        const offset = queue[i] * 4;
        if (Math.max(data[offset], data[offset + 1], data[offset + 2]) -
            Math.min(data[offset], data[offset + 1], data[offset + 2]) > 28) neutralSpeck = false;
      }
      if (tail <= maxSpeck && pixel !== largest.start && neutralSpeck) {
        for (let i = 0; i < tail; i++) data.fill(0, queue[i] * 4, queue[i] * 4 + 4);
        stats.removedSpecks += tail;
      }
    }
  }

  // Imported screenshots can have fully opaque white paper, so gray noise is
  // connected in alpha even when it is visually detached from the drawing.
  if (maxSpeck > 0) {
    let borderSamples = 0;
    let lightBorder = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (x !== 0 && y !== 0 && x !== width - 1 && y !== height - 1) continue;
      borderSamples++;
      const offset = (y * width + x) * 4;
      if (data[offset + 3] > 240 && luminance(data[offset], data[offset + 1], data[offset + 2]) >= 235) {
        lightBorder++;
      }
    }
    if (lightBorder > borderSamples * 0.65) {
      const ink = new Uint8Array(pixels);
      for (let pixel = 0; pixel < pixels; pixel++) {
        const offset = pixel * 4;
        if (data[offset + 3] === 0) continue;
        const r = data[offset], g = data[offset + 1], b = data[offset + 2];
        if (luminance(r, g, b) < 245 || Math.max(r, g, b) - Math.min(r, g, b) > 28) ink[pixel] = 1;
      }
      const visited = new Uint8Array(pixels);
      const queue = new Int32Array(pixels);
      let largestStart = -1;
      let largestCount = 0;
      const traverse = (start: number) => {
        let head = 0, tail = 1;
        queue[0] = start;
        visited[start] = 1;
        while (head < tail) {
          const current = queue[head++];
          const x = current % width;
          const y = Math.floor(current / width);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const neighbor = ny * width + nx;
            if (!ink[neighbor] || visited[neighbor]) continue;
            visited[neighbor] = 1;
            queue[tail++] = neighbor;
          }
        }
        return tail;
      };
      for (let pixel = 0; pixel < pixels; pixel++) {
        if (!ink[pixel] || visited[pixel]) continue;
        const count = traverse(pixel);
        if (count > largestCount) { largestStart = pixel; largestCount = count; }
      }
      visited.fill(0);
      for (let pixel = 0; pixel < pixels; pixel++) {
        if (!ink[pixel] || visited[pixel]) continue;
        const count = traverse(pixel);
        if (count > maxSpeck || pixel === largestStart) continue;
        let neutralSpeck = true;
        for (let i = 0; i < count; i++) {
          const offset = queue[i] * 4;
          if (Math.max(data[offset], data[offset + 1], data[offset + 2]) -
              Math.min(data[offset], data[offset + 1], data[offset + 2]) > 28) neutralSpeck = false;
        }
        if (!neutralSpeck) continue;
        for (let i = 0; i < count; i++) {
          const offset = queue[i] * 4;
          data.set([255, 255, 255, 255], offset);
        }
        stats.removedSpecks += count;
      }
    }
  }

  if (options.simplifyColors) {
    const isNeutral = (r: number, g: number, b: number) =>
      Math.max(r, g, b) - Math.min(r, g, b) <= 28;
    const neutralBands = Array.from({ length: 3 }, () => ({ count: 0, whiteCount: 0, r: 0, g: 0, b: 0 }));
    const bandFor = (r: number, g: number, b: number) => {
      const lightness = luminance(r, g, b);
      return lightness <= 85 ? 0 : lightness <= 185 ? 1 : 2;
    };
    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset + 3] === 0 || !isNeutral(data[offset], data[offset + 1], data[offset + 2])) continue;
      const band = neutralBands[bandFor(data[offset], data[offset + 1], data[offset + 2])];
      band.count++;
      band.r += data[offset]; band.g += data[offset + 1]; band.b += data[offset + 2];
      if (data[offset] >= 250 && data[offset + 1] >= 250 && data[offset + 2] >= 250) band.whiteCount++;
    }
    const neutralColors = neutralBands.map((band, index) => {
      if (band.count === 0) return null;
      if (index === 2 && band.whiteCount > band.count / 2) return [255, 255, 255] as const;
      return [Math.round(band.r / band.count), Math.round(band.g / band.count),
        Math.round(band.b / band.count)] as const;
    });
    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset + 3] === 0 || !isNeutral(data[offset], data[offset + 1], data[offset + 2])) continue;
      const color = neutralColors[bandFor(data[offset], data[offset + 1], data[offset + 2])];
      if (!color) continue;
      if (data[offset] !== color[0] || data[offset + 1] !== color[1] || data[offset + 2] !== color[2]) {
        data[offset] = color[0]; data[offset + 1] = color[1]; data[offset + 2] = color[2];
        stats.simplifiedColors++;
      }
    }
    const bins = new Map<number, { count: number; r: number; g: number; b: number }>();
    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset + 3] === 0 || isNeutral(data[offset], data[offset + 1], data[offset + 2])) continue;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const bin = bins.get(key);
      if (bin) { bin.count++; bin.r += r; bin.g += g; bin.b += b; }
      else bins.set(key, { count: 1, r, g, b });
    }
    const palette = [...bins.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, Math.max(2, Math.min(64, Math.floor(options.paletteSize))))
      .map((bin) => [Math.round(bin.r / bin.count), Math.round(bin.g / bin.count), Math.round(bin.b / bin.count)] as const);
    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset + 3] === 0 || isNeutral(data[offset], data[offset + 1], data[offset + 2])) continue;
      let bestDistance = Infinity;
      let best = palette[0];
      for (const color of palette) {
        const distance = (data[offset] - color[0]) ** 2 +
          (data[offset + 1] - color[1]) ** 2 + (data[offset + 2] - color[2]) ** 2;
        if (distance < bestDistance) { bestDistance = distance; best = color; }
      }
      // Preserve unique accent colors if no plausible palette representative exists.
      if (best && bestDistance <= 48 ** 2 &&
          (data[offset] !== best[0] || data[offset + 1] !== best[1] || data[offset + 2] !== best[2])) {
        data[offset] = best[0]; data[offset + 1] = best[1]; data[offset + 2] = best[2];
        stats.simplifiedColors++;
      }
    }
  }

  if (options.thinDarkLines) {
    const snapshot = new Uint8ClampedArray(data);
    const isDark = (pixel: number) => {
      const offset = pixel * 4;
      return snapshot[offset + 3] > 0 &&
        luminance(snapshot[offset], snapshot[offset + 1], snapshot[offset + 2]) < 90;
    };
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
      const pixel = y * width + x;
      if (!isDark(pixel)) continue;
      const cardinal = [pixel - width, pixel + 1, pixel + width, pixel - 1];
      if (cardinal.some((neighbor) => snapshot[neighbor * 4 + 3] === 0)) continue;
      let darkNeighbors = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((dx !== 0 || dy !== 0) && isDark((y + dy) * width + x + dx)) darkNeighbors++;
      }
      if (darkNeighbors < 3) continue;
      const fill = cardinal.find((neighbor) => {
        const offset = neighbor * 4;
        return snapshot[offset + 3] > 0 &&
          luminance(snapshot[offset], snapshot[offset + 1], snapshot[offset + 2]) >= 140;
      });
      if (fill === undefined) continue;
      const offset = pixel * 4;
      const fillOffset = fill * 4;
      data.set(snapshot.subarray(fillOffset, fillOffset + 3), offset);
      stats.thinnedLinePixels++;
    }
  }

  stats.protectedPixels = restoreProtectedPixels(source, data, width, height, protectedRegions);
  stats.changedPixels = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset] !== source[offset] || data[offset + 1] !== source[offset + 1] ||
        data[offset + 2] !== source[offset + 2] || data[offset + 3] !== source[offset + 3]) stats.changedPixels++;
  }
  stats.resultColors = colorCount(data);
  return { data, stats };
}
