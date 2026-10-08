import { afterAll, describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { rotSprite, type PixelBuffer } from '@/lib/canvas/rotSprite';

const color = { outline: [24, 20, 36, 255], fill: [233, 160, 102, 255], leftEye: [40, 110, 230, 255],
  rightEye: [60, 220, 170, 255], foot: [230, 50, 90, 255] };
function fixture(): PixelBuffer {
  const data = new Uint8ClampedArray(24 * 24 * 4), set = (x: number, y: number, rgba: number[]) => data.set(rgba, (y * 24 + x) * 4);
  for (let y = 5; y <= 16; y++) for (let x = 5; x <= 18; x++) set(x, y, x === 5 || x === 18 || y === 5 || y === 16 ? color.outline : color.fill);
  set(8, 9, color.leftEye); set(15, 9, color.rightEye);
  for (const x of [7, 8, 15, 16]) set(x, 19, color.foot);
  // Original isolated dither and alpha patches, away from the face and contact points.
  for (let y = 1; y <= 3; y++) for (let x = 1; x <= 8; x++) set(x, y, (x + y) % 2 ? [110, 80, 140, 128] : [210, 170, 225, 64]);
  return { width: 24, height: 24, data };
}
const points = (buffer: PixelBuffer, rgba: number[]) => {
  const result: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < buffer.height; y++) for (let x = 0; x < buffer.width; x++) {
    const offset = (y * buffer.width + x) * 4;
    if (rgba.every((v, c) => buffer.data[offset + c] === v)) result.push({ x: x + 0.5, y: y + 0.5 });
  } return result;
};
const hash = (data: Uint8ClampedArray) => createHash('sha256').update(data).digest('hex');
const observations: unknown[] = [];
describe('independent motion feature and temporal observations', () => {
  it('preserves exact eye, outline, dither, alpha and foot pixels at translated quarter turns', () => {
    const source = fixture(), before = source.data.slice();
    for (const quarter of [0, 1, 2, 3]) {
      const output = rotSprite(source, quarter * Math.PI / 2, 12, 12, 48, 48, 26, 23, true);
      const expected = new Uint8ClampedArray(48 * 48 * 4);
      // Independent clockwise coordinate permutation around pixel centers.
      for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
        const dx = x + .5 - 12, dy = y + .5 - 12;
        const tx = Math.floor(26 + (quarter === 0 ? dx : quarter === 1 ? -dy : quarter === 2 ? -dx : dy));
        const ty = Math.floor(23 + (quarter === 0 ? dy : quarter === 1 ? dx : quarter === 2 ? -dy : -dx));
        expected.set(source.data.subarray((y * 24 + x) * 4, (y * 24 + x + 1) * 4), (ty * 48 + tx) * 4);
      }
      expect(output.data).toEqual(expected);
    }
    expect(source.data).toEqual(before);
  });
  it('records landmark drift, feature loss, alpha occupancy and contact motion across a reversible arc', () => {
    const source = fixture(), before = source.data.slice(), samples = [];
    const angles = [-30, -20, -10, 0, 10, 20, 30, 20, 10, 0, -10, -20, -30];
    const outputs = angles.map(angle => rotSprite(source, angle * Math.PI / 180, 12, 19.5, 48, 48, 24, 28, true));
    for (let i = 0; i < angles.length; i++) {
      const angle = angles[i] * Math.PI / 180, output = outputs[i];
      const landmarks = [ ['leftEye', 8.5, 9.5], ['rightEye', 15.5, 9.5] ] as const;
      const features = landmarks.map(([name, x, y]) => {
        const expected = { x: 24 + (x - 12) * Math.cos(angle) - (y - 19.5) * Math.sin(angle),
          y: 28 + (x - 12) * Math.sin(angle) + (y - 19.5) * Math.cos(angle) };
        const pixels = points(output, color[name]);
        const centroid = pixels.length ? { x: pixels.reduce((n, p) => n + p.x, 0) / pixels.length,
          y: pixels.reduce((n, p) => n + p.y, 0) / pixels.length } : null;
        return { name, pixelCount: pixels.length, expected, centroid, driftPixels: centroid ? Math.hypot(centroid.x - expected.x, centroid.y - expected.y) : null };
      });
      const contacts = points(output, color.foot);
      for (const feature of features) expect(feature.pixelCount).toBeGreaterThan(0);
      const alphaHistogram: Record<string, number> = {};
      for (let j = 3; j < output.data.length; j += 4) alphaHistogram[output.data[j]] = (alphaHistogram[output.data[j]] || 0) + 1;
      let changedPixels = 0;
      if (i) for (let j = 0; j < output.data.length; j += 4) if (output.data.subarray(j, j + 4).some((v, c) => v !== outputs[i - 1].data[j + c])) changedPixels++;
      samples.push({ degrees: angles[i], features, footPixels: contacts.length,
        footGroundDeviationPixels: contacts.length ? Math.max(...contacts.map(p => Math.abs(p.y - 28))) : null,
        alphaHistogram, changedPixels, sha256: hash(output.data) });
      // Same pose after the direction reversal must reproduce exactly; this does not promise smoothness/contact locking.
      const previous = angles.indexOf(angles[i]); expect(output.data).toEqual(outputs[previous].data);
    }
    expect(source.data).toEqual(before);
    observations.push({ fixtureSha256: hash(source.data), sourceSize: '24x24', outputSize: '48x48', samples });
  });
});
afterAll(() => {
  const destination = process.env.PIXIBUN_MOTION_QUALITY_OUTPUT;
  if (!destination) return;
  const absolute = resolve(destination), within = relative(resolve('artifacts'), absolute);
  if (within.startsWith('..') || within.includes(':')) throw new Error('Quality output must be within artifacts.');
  writeFileSync(absolute, JSON.stringify({ recordedAt: new Date().toISOString(), scope: 'Original synthetic fixture. Landmark/contact/temporal observations are measurements, not artist acceptance thresholds.', observations }, null, 2));
});
