// @vitest-environment node
import { expect, it } from 'vitest';
import { buildCycleRegisterMask, type PaletteCycleTrack } from '@/lib/color/paletteCycling';
import { generateLoopAnimationCanvases } from '@/lib/export/shaderExporter';
import { installDocumentCanvasMock, makeCanvas } from './helpers/mockCanvas';

const track: PaletteCycleTrack = { id: 'fire', low: 2, high: 4, rate: 3, direction: 'forward', enabled: true, blendShift: false };

it('only marks moving enabled ranges, including their overlapping endpoints', () => {
  const tracks = [track, { ...track, id: 'overlap', low: 3, high: 5 },
    { ...track, id: 'disabled', low: 0, high: 1, enabled: false },
    { ...track, id: 'stopped', low: 0, high: 1, rate: 0 },
    { ...track, id: 'single', low: 0, high: 0 }];
  expect(Array.from(buildCycleRegisterMask(tracks, 6))).toEqual([0, 0, 1, 1, 1, 1]);
  expect(Array.from(buildCycleRegisterMask([], 6))).toEqual([0, 0, 0, 0, 0, 0]);
});

it('exports animated fire without quantizing wood shades, outlines, or their alpha', () => {
  installDocumentCanvasMock();
  const source = makeCanvas(7, 1), ctx = source.getContext('2d')!;
  const image = ctx.createImageData(7, 1);
  image.data.set([9, 8, 7, 255, 104, 70, 40, 255, 101, 65, 38, 128,
    196, 60, 24, 255, 255, 140, 0, 255, 255, 184, 51, 255, 7, 8, 9, 0]);
  ctx.putImageData(image, 0, 0);
  const frames = generateLoopAnimationCanvases(source, ['#080808', '#664422', '#C43C18', '#FF8C00', '#FFB833'], [track], 1, 6);
  expect(frames).toHaveLength(6);
  for (const frame of frames) {
    const data = frame.getContext('2d')!.getImageData(0, 0, 7, 1).data;
    expect(Array.from(data.slice(0, 12))).toEqual(Array.from(image.data.slice(0, 12)));
    expect(Array.from(data.slice(24))).toEqual(Array.from(image.data.slice(24)));
  }
  expect(Array.from(frames[2].getContext('2d')!.getImageData(0, 0, 7, 1).data.slice(12, 24)))
    .not.toEqual(Array.from(image.data.slice(12, 24)));
});
