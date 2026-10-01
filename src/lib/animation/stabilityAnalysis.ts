import type { ReviewRegion } from '@/types/animation';

export interface ReviewFrame { id: string; index: number; durationMs: number; data: Uint8ClampedArray }
export interface StabilityInput { width: number; height: number; frames: ReviewFrame[]; regions: ReviewRegion[]; alignMotion: boolean; loop: boolean }
export interface StabilityTransition {
  from: number; to: number; shiftX: number; shiftY: number;
  silhouetteChanged: number; outlineChanged: number; colorChanged: number;
  clustersBefore: number; clustersAfter: number; addedColors: number; removedColors: number;
  protectedChanged: number; contacts: { name: string; dx: number | null; dy: number | null }[];
  transientPixels: number;
  difference: Uint8ClampedArray;
}

export const MAX_STABILITY_FRAMES = 64;
export const MAX_STABILITY_PIXELS = 1_000_000;
export function validateStabilitySize(width: number, height: number, count: number): void {
  if (![width, height, count].every(Number.isInteger) || width < 1 || height < 1 || width > 256 || height > 256 ||
      count < 2 || count > MAX_STABILITY_FRAMES || width * height * count > MAX_STABILITY_PIXELS) {
    throw new RangeError('Choose a clip with 2–64 frames, at most 256 × 256 pixels, and no more than one million total frame pixels.');
  }
}

const contains = (r: ReviewRegion, x: number, y: number) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
function visibleEqual(a: Uint8ClampedArray, ai: number, b: Uint8ClampedArray, bi: number): boolean {
  return a[ai + 3] === b[bi + 3] && (a[ai + 3] === 0 || (a[ai] === b[bi] && a[ai + 1] === b[bi + 1] && a[ai + 2] === b[bi + 2]));
}

function features(data: Uint8ClampedArray, width: number, height: number, ignored: Uint8Array) {
  const mask = new Uint8Array(width * height), outline = new Uint8Array(mask.length);
  const colors = new Set<number>();
  for (let i = 0; i < mask.length; i++) if (!ignored[i] && data[i * 4 + 3] > 0) {
    mask[i] = 1;
    colors.add((data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2]);
  }
  const visited = new Uint8Array(mask.length), queue = new Int32Array(mask.length);
  let clusters = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const x = i % width, y = Math.floor(i / width);
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height || !mask[(y + dy) * width + x + dx]) outline[i] = 1;
    }
    if (visited[i]) continue;
    clusters++; let head = 0, tail = 1; queue[0] = i; visited[i] = 1;
    while (head < tail) {
      const at = queue[head++], ax = at % width, ay = Math.floor(at / width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = ax + dx, ny = ay + dy, next = ny * width + nx;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[next] && !visited[next]) {
          visited[next] = 1; queue[tail++] = next;
        }
      }
    }
  }
  return { mask, outline, colors, clusters };
}

function center(data: Uint8ClampedArray, width: number, height: number, region: ReviewRegion) {
  let sumX = 0, sumY = 0, weight = 0;
  for (let y = region.y; y < Math.min(height, region.y + region.h); y++) for (let x = region.x; x < Math.min(width, region.x + region.w); x++) {
    const alpha = data[(y * width + x) * 4 + 3];
    weight += alpha; sumX += x * alpha; sumY += y * alpha;
  }
  return weight ? { x: sumX / weight, y: sumY / weight } : null;
}

/** Read-only heuristics. Integer translation is deliberately bounded to ±3 pixels. */
export function analyzeAnimationStability(input: StabilityInput): StabilityTransition[] {
  const { width, height, frames, regions, alignMotion, loop } = input;
  validateStabilitySize(width, height, frames.length);
  const size = width * height;
  if (regions.length > 32 || frames.some(frame => frame.data.length !== size * 4)) throw new Error('Invalid animation review snapshot.');
  const ignored = new Uint8Array(size);
  for (let i = 0; i < size; i++) ignored[i] = Number(regions.some(r => r.kind === 'ignore' && contains(r, i % width, Math.floor(i / width))));
  const allFeatures = frames.map(frame => features(frame.data, width, height, ignored));
  const result: StabilityTransition[] = [];
  for (let from = 0; from < frames.length - (loop ? 0 : 1); from++) {
    const to = (from + 1) % frames.length, a = frames[from].data, b = frames[to].data;
    const af = allFeatures[from], bf = allFeatures[to];
    let shiftX = 0, shiftY = 0, best = Infinity;
    const radius = alignMotion ? 3 : 0;
    // Prefer zero/small motion when multiple translations have equal overlap.
    const candidates: [number, number][] = [];
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) candidates.push([dx, dy]);
    candidates.sort((a, b) => Math.abs(a[0]) + Math.abs(a[1]) - Math.abs(b[0]) - Math.abs(b[1]));
    for (const [dx, dy] of candidates) {
      let mismatch = 0, union = 0;
      for (let y = -radius; y < height + radius; y++) for (let x = -radius; x < width + radius; x++) {
        if ((x >= 0 && x < width && y >= 0 && y < height && ignored[y * width + x]) ||
            (x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height && ignored[(y + dy) * width + x + dx])) continue;
        const ax = x >= 0 && x < width && y >= 0 && y < height ? af.mask[y * width + x] : 0;
        const bx = x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height ? bf.mask[(y + dy) * width + x + dx] : 0;
        if (ax || bx) union++;
        if (ax !== bx) mismatch++;
      }
      const score = union ? mismatch / union : 0;
      if (score < best) { best = score; shiftX = dx; shiftY = dy; }
    }
    const difference = new Uint8ClampedArray(size * 4);
    let silhouetteChanged = 0, outlineChanged = 0, colorChanged = 0, protectedChanged = 0;
    // Count changes outside the displayed canvas too, so edge clipping is never hidden.
    for (let y = -radius; y < height + radius; y++) for (let x = -radius; x < width + radius; x++) {
      const ai = x >= 0 && x < width && y >= 0 && y < height ? y * width + x : -1;
      const bx = x + shiftX, by = y + shiftY;
      const bi = bx >= 0 && bx < width && by >= 0 && by < height ? by * width + bx : -1;
      if ((ai >= 0 && ignored[ai]) || (bi >= 0 && ignored[bi])) continue;
      const am = ai >= 0 ? af.mask[ai] : 0, bm = bi >= 0 ? bf.mask[bi] : 0;
      const ao = ai >= 0 ? af.outline[ai] : 0, bo = bi >= 0 ? bf.outline[bi] : 0;
      if (am !== bm) silhouetteChanged++;
      if (ao !== bo) outlineChanged++;
      const color = am && bm && !visibleEqual(a, ai * 4, b, bi * 4);
      if (color) colorChanged++;
      if (ai >= 0 && (am !== bm || color)) difference.set(am !== bm ? (am ? [255, 95, 95, 255] : [75, 210, 255, 255]) : [230, 130, 255, 255], ai * 4);
    }
    for (let i = 0; i < size; i++) if (regions.some(r => r.kind === 'protect' && contains(r, i % width, Math.floor(i / width))) && !visibleEqual(a, i * 4, b, i * 4)) protectedChanged++;
    const contacts = regions.filter(r => r.kind === 'contact').map(r => {
      const ca = center(a, width, height, r), cb = center(b, width, height, r);
      return { name: r.name, dx: ca && cb ? cb.x - ca.x : null, dy: ca && cb ? cb.y - ca.y : null };
    });
    result.push({ from, to, shiftX, shiftY, silhouetteChanged, outlineChanged, colorChanged,
      clustersBefore: af.clusters, clustersAfter: bf.clusters,
      addedColors: [...bf.colors].filter(c => !af.colors.has(c)).length,
      removedColors: [...af.colors].filter(c => !bf.colors.has(c)).length,
      protectedChanged, contacts, difference, transientPixels: 0 });
  }
  const empty = new Uint8ClampedArray(4);
  // A→B→A pixel reversals are cues for brief flicker, rather than every moving edge.
  for (const transition of result) {
    const next = result.find(t => t.from === transition.to);
    if (!next) continue;
    const a = frames[transition.from].data, b = frames[transition.to].data, c = frames[next.to].data;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const ai = y * width + x;
      const bx = x + transition.shiftX, by = y + transition.shiftY;
      const cx = bx + next.shiftX, cy = by + next.shiftY;
      const bi = bx >= 0 && bx < width && by >= 0 && by < height ? by * width + bx : -1;
      const ci = cx >= 0 && cx < width && cy >= 0 && cy < height ? cy * width + cx : -1;
      if (ignored[ai] || (bi >= 0 && ignored[bi]) || (ci >= 0 && ignored[ci])) continue;
      const bd = bi >= 0 ? b : empty, cd = ci >= 0 ? c : empty;
      if (visibleEqual(a, ai * 4, cd, ci >= 0 ? ci * 4 : 0) && !visibleEqual(a, ai * 4, bd, bi >= 0 ? bi * 4 : 0)) transition.transientPixels++;
    }
  }
  return result;
}
