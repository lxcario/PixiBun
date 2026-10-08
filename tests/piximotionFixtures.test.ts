import { afterAll, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { performance } from 'node:perf_hooks';
import { rotSprite } from '@/lib/canvas/rotSprite';
import { motionFixtures } from './fixtures/piximotion';

const measurements: unknown[] = [];
const hash = (data: Uint8ClampedArray) => createHash('sha256').update(data).digest('hex');
function visibleColors(data: Uint8ClampedArray) {
  const colors = new Set<string>();
  for (let i = 0; i < data.length; i += 4) if (data[i + 3]) colors.add(Array.from(data.subarray(i, i + 4)).join(','));
  return colors;
}
function area(data: Uint8ClampedArray) {
  let count = 0; for (let i = 3; i < data.length; i += 4) count += Number(data[i] > 0); return count;
}
for (const { name, source } of motionFixtures()) {
  it(`${name}: preserves exact authored pixels through zero and quarter turns`, () => {
    const before = source.data.slice();
    expect(rotSprite(source, 0).data).toEqual(before);
    const expected = new Uint8ClampedArray(before.length);
    // Positive angles rotate clockwise in screen coordinates (screen Y increases downward).
    for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++)
      expected.set(before.subarray((y * 17 + x) * 4, (y * 17 + x) * 4 + 4), (x * 17 + 16 - y) * 4);
    expect(rotSprite(source, Math.PI / 2).data).toEqual(expected);
    expect(source.data).toEqual(before);
  });
  it(`${name}: records arbitrary-angle quality and timing without inventing an artist acceptance score`, () => {
    const before = source.data.slice(), palette = visibleColors(before);
    const times: number[] = [], samples: unknown[] = [];
    // Warmup is excluded. These timings measure this Node process, not UI responsiveness.
    rotSprite(source, 0.3, 8.5, 8.5, 25, 25, 12.5, 12.5);
    for (const angle of [15, 30, 45, 60, 120, 210, 300, 345]) {
      const start = performance.now(), output = rotSprite(source, angle * Math.PI / 180, 8.5, 8.5, 25, 25, 12.5, 12.5);
      times.push(performance.now() - start);
      const colors = visibleColors(output.data);
      expect([...colors].filter(color => !palette.has(color))).toEqual([]);
      expect(output.data).toHaveLength(25 * 25 * 4); expect(source.data).toEqual(before);
      samples.push({ angle, outputSha256: hash(output.data), sourceVisiblePixels: area(before), outputVisiblePixels: area(output.data),
        lostSourceColors: [...palette].filter(color => !colors.has(color)), retainedOutputBytes: output.data.byteLength });
    }
    const sorted = times.toSorted((a, b) => a - b);
    measurements.push({ name, inputSha256: hash(before), sampleCount: times.length,
      p50Ms: sorted[Math.ceil(sorted.length * 0.5) - 1], p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1], samples });
  });
}
afterAll(() => {
  const destination = process.env.PIXIMOTION_BASELINE_OUTPUT;
  if (!destination) return;
  const absolute = resolve(destination), within = relative(resolve('artifacts'), absolute);
  if (within.startsWith('..') || within.includes(':')) throw new Error('Baseline output must be within workspace artifacts.');
  writeFileSync(absolute, JSON.stringify({ recordedAt: new Date().toISOString(), runtime: process.version, platform: process.platform,
    rendererSha256: createHash('sha256').update(readFileSync('src/lib/canvas/rotSprite.ts')).digest('hex'),
    fixtureSha256: createHash('sha256').update(readFileSync('tests/fixtures/piximotion.ts')).digest('hex'),
    scope: 'Synthetic 17x17 sprites, independent padded 25x25 outputs, synchronous Node rotations. No rig, UI, browser heap or artist qualification.', measurements }, null, 2) + '\n');
});
