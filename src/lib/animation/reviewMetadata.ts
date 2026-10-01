import type { AnimationClip, AnimationReview, ReviewRegion } from '@/types/animation';

export const MAX_REVIEW_REGIONS = 32;
export const MAX_REVIEW_EXCEPTIONS = 512;
const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

/** Bounded optional metadata; coordinates stay on the canvas grid after resizing. */
export function parseAnimationReview(value: unknown): AnimationReview | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as AnimationReview;
  if (!Array.isArray(input.regions) || input.regions.length > MAX_REVIEW_REGIONS ||
      !Array.isArray(input.exceptions) || input.exceptions.length > MAX_REVIEW_EXCEPTIONS) return null;
  const ids = new Set<string>();
  const regions: ReviewRegion[] = [];
  for (const region of input.regions) {
    if (!region || typeof region.id !== 'string' || !region.id.length || region.id.length > 128 || ids.has(region.id) ||
        typeof region.name !== 'string' || !region.name.trim() || region.name.length > 64 ||
        !['protect', 'ignore', 'contact'].includes(region.kind) ||
        !integer(region.x, 0, 16383) || !integer(region.y, 0, 16383) ||
        !integer(region.w, 1, 16384 - region.x) || !integer(region.h, 1, 16384 - region.y)) return null;
    ids.add(region.id);
    regions.push({ id: region.id, name: region.name, kind: region.kind, x: region.x, y: region.y, w: region.w, h: region.h });
  }
  const exceptions: AnimationReview['exceptions'] = [];
  const keys = new Set<string>();
  for (const mark of input.exceptions) {
    if (!mark || typeof mark.fromFrameId !== 'string' || !mark.fromFrameId.length || mark.fromFrameId.length > 128 ||
        typeof mark.toFrameId !== 'string' || !mark.toFrameId.length || mark.toFrameId.length > 128 ||
        typeof mark.signature !== 'string' || !/^[a-f0-9]{64}$/.test(mark.signature)) return null;
    const key = `${mark.fromFrameId}:${mark.toFrameId}`;
    if (keys.has(key)) return null;
    keys.add(key);
    exceptions.push({ fromFrameId: mark.fromFrameId, toFrameId: mark.toFrameId, signature: mark.signature });
  }
  return { regions, exceptions };
}

export function estimateClipBytes(clip: AnimationClip): number {
  return 256 + clip.name.length * 2 + (clip.review?.regions.reduce((n, r) => n + 256 + 2 * (r.id.length + r.name.length), 0) ?? 0) +
    (clip.review?.exceptions.reduce((n, mark) => n + 256 + 2 * (mark.fromFrameId.length + mark.toFrameId.length + mark.signature.length), 0) ?? 0);
}

/** Union rectangles row by row, so overlapping protection never multiplies pixel work. */
export function restoreProtectedPixels(before: Uint8ClampedArray, after: Uint8ClampedArray, width: number, height: number, regions: ReviewRegion[]): number {
  let restored = 0;
  for (let y = 0; y < height; y++) {
    const spans = regions.filter(r => r.kind === 'protect' && y >= r.y && y < r.y + r.h && r.x < width)
      .map(r => [r.x, Math.min(width, r.x + r.w)]).sort((a, b) => a[0] - b[0]);
    let start = -1, end = -1;
    const copy = () => {
      if (start < 0) return;
      for (let x = start; x < end; x++) {
        const i = (y * width + x) * 4;
        if (before[i] !== after[i] || before[i + 1] !== after[i + 1] || before[i + 2] !== after[i + 2] || before[i + 3] !== after[i + 3]) restored++;
      }
      after.set(before.subarray((y * width + start) * 4, (y * width + end) * 4), (y * width + start) * 4);
    };
    for (const span of spans) {
      if (span[0] > end) { copy(); start = span[0]; end = span[1]; }
      else end = Math.max(end, span[1]);
    }
    copy();
  }
  return restored;
}
