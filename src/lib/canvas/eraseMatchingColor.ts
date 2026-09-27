export type SampledColor = readonly [number, number, number];

/** Erase visible pixels matching a sampled RGB color. Returns the pixel count. */
export function eraseMatchingColor(
  image: ImageData | { data: Uint8ClampedArray; width: number; height: number },
  color: SampledColor,
  tolerance: number,
  options: { contiguous?: boolean; family?: boolean; x?: number; y?: number; mask?: Uint8Array | null } = {}
): number {
  const { data, width, height } = image;
  const pixels = width * height;
  if (data.length !== pixels * 4 || options.mask && options.mask.length !== pixels) return 0;
  const limit = Math.max(0, Math.min(255, tolerance)) ** 2;
  const hue = (r: number, g: number, b: number, max: number, chroma: number) => {
    if (max === r) return ((g - b) / chroma + 6) % 6 * 60;
    if (max === g) return ((b - r) / chroma + 2) * 60;
    return ((r - g) / chroma + 4) * 60;
  };
  const sampleMax = Math.max(...color);
  const sampleMin = Math.min(...color);
  const sampleChroma = sampleMax - sampleMin;
  const familyHue = options.family && sampleChroma >= 18
    ? hue(color[0], color[1], color[2], sampleMax, sampleChroma)
    : null;
  const hueLimit = 30 + Math.max(0, Math.min(255, tolerance)) * 60 / 255;
  const matches = (pixel: number) => {
    if (options.mask && !options.mask[pixel]) return false;
    const offset = pixel * 4;
    if (data[offset + 3] === 0) return false;
    if (familyHue !== null) {
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const chroma = max - min;
      // Pale spill has low saturation; dark outlines still need enough chroma.
      if (chroma < 14 || chroma / max < (max >= 160 ? 0.08 : 0.2)) return false;
      const pixelHue = hue(r, g, b, max, chroma);
      const hueDistance = Math.abs(pixelHue - familyHue);
      return Math.min(hueDistance, 360 - hueDistance) <= hueLimit;
    }
    const dr = data[offset] - color[0];
    const dg = data[offset + 1] - color[1];
    const db = data[offset + 2] - color[2];
    return dr * dr + dg * dg + db * db <= limit;
  };
  const erase = (pixel: number) => {
    data.fill(0, pixel * 4, pixel * 4 + 4);
  };

  if (!options.contiguous) {
    // Classify before editing so neighboring colors cannot change the result.
    const familyMask = familyHue === null ? null : new Uint8Array(pixels);
    if (familyMask) {
      for (let pixel = 0; pixel < pixels; pixel++) familyMask[pixel] = matches(pixel) ? 1 : 0;
    }
    const outlineColor = (pixel: number): SampledColor | null => {
      if (!familyMask) return null;
      const offset = pixel * 4;
      // Only replace dark green spill that sits within a dark outline.
      if (Math.max(data[offset], data[offset + 1], data[offset + 2]) > 72) return null;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      let candidates = 0;
      let bestDistance = Infinity;
      let best: SampledColor | null = null;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const neighbor = ny * width + nx;
        if (familyMask[neighbor]) continue;
        const n = neighbor * 4;
        if (data[n + 3] === 0) continue;
        const r = data[n];
        const g = data[n + 1];
        const b = data[n + 2];
        if (Math.max(r, g, b) > 80 || Math.max(r, g, b) - Math.min(r, g, b) > 35) continue;
        candidates++;
        const distance = (r - data[offset]) ** 2 + (g - data[offset + 1]) ** 2 + (b - data[offset + 2]) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = [r, g, b];
        }
      }
      return candidates >= 2 ? best : null;
    };
    let changed = 0;
    for (let pixel = 0; pixel < pixels; pixel++) {
      if (familyMask ? !familyMask[pixel] : !matches(pixel)) continue;
      const replacement = outlineColor(pixel);
      if (replacement) data.set(replacement, pixel * 4);
      else erase(pixel);
      changed++;
    }
    return changed;
  }

  const x = options.x;
  const y = options.y;
  if (x === undefined || y === undefined || !Number.isInteger(x) || !Number.isInteger(y) ||
      x < 0 || y < 0 || x >= width || y >= height) return 0;
  const seed = y * width + x;
  if (!matches(seed)) return 0;
  const visited = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  let head = 0;
  let tail = 0;
  queue[tail++] = seed;
  visited[seed] = 1;
  let changed = 0;
  const enqueue = (neighbor: number) => {
    if (visited[neighbor]) return;
    visited[neighbor] = 1;
    if (matches(neighbor)) queue[tail++] = neighbor;
  };
  while (head < tail) {
    const pixel = queue[head++];
    if (!matches(pixel)) continue;
    erase(pixel);
    changed++;
    const column = pixel % width;
    if (column > 0) enqueue(pixel - 1);
    if (column + 1 < width) enqueue(pixel + 1);
    if (pixel >= width) enqueue(pixel - width);
    if (pixel + width < pixels) enqueue(pixel + width);
  }
  return changed;
}
