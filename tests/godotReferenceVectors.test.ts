import { expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { updateLivePaletteLUT32 } from '@/lib/color/paletteCycling';
import { godotPaletteShader } from '@/lib/export/godotPaletteShader';
import type { PaletteCycleTrack } from '@/types/palette';

it('prepares CPU palette reference vectors for actual Godot GPU comparison, including phase boundaries and overlap', () => {
  const colors = Array.from({ length: 256 }, (_, i) => `#${((i % 52) * 5).toString(16).padStart(2, '0')}${(Math.floor(i / 52) * 5).toString(16).padStart(2, '0')}00`);
  const tracks: PaletteCycleTrack[] = [
    { id: 'f', low: 0, high: 63, rate: 2, direction: 'forward', blendShift: false, enabled: true },
    { id: 'r', low: 48, high: 127, rate: 1.5, direction: 'reverse', blendShift: true, enabled: true },
    { id: 'b', low: 128, high: 255, rate: 3, direction: 'ping-pong', blendShift: true, enabled: true },
  ];
  const cases = [tracks, ...(['forward', 'reverse', 'ping-pong'] as const).flatMap(direction => [false, true].map(blendShift => [
    { id: 'all', low: 0, high: 255, rate: 2, direction, blendShift, enabled: true },
  ]))];
  const vectors = cases.map((cycleTracks, i) => ({ shader: `oracle-${i}.gdshader`, blendedRegisters: Array.from({ length: 256 }, (_, index) =>
    [...cycleTracks].reverse().find(t => t.low <= index && t.high >= index)?.blendShift ?? false), samples: [0, 0.125, 0.499, 0.5, 0.55, 1.375, 42.125].map(time => {
    const lut = new Uint32Array(256); updateLivePaletteLUT32(colors, cycleTracks, time, lut);
    return { time, rgb: Array.from(lut, c => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255]) };
  }) }));
  expect(vectors[1].samples[2].rgb[0]).toEqual([0, 0, 0]); // No premature discrete forward step.
  expect(vectors[1].samples[3].rgb[0]).toEqual([235, 20, 0]);
  mkdirSync('artifacts/phase5/oracle', { recursive: true });
  cases.forEach((cycleTracks, i) => writeFileSync(`artifacts/phase5/oracle/oracle-${i}.gdshader`, godotPaletteShader(cycleTracks, 256)));
  writeFileSync('artifacts/phase5/oracle/vectors.json', JSON.stringify(vectors));
});
