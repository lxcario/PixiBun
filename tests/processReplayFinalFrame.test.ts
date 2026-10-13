import { expect, it } from 'vitest';
import type { HistoryStep } from '@/types/canvas';
import type { ReplayBaselineCheckpoint } from '@/lib/engine/historyEngine';
import { convertHistoryToRawFrames, exportProcessReplayGifAsync } from '@/lib/export/processReplay';
import { readAnimatedGif } from './helpers/readAnimatedGif';

const image = (data: number[]) => ({ width: 2, height: 1, colorSpace: 'srgb', data: new Uint8ClampedArray(data) }) as ImageData;
const red = [255, 0, 0, 255, 0, 0, 0, 0], blue = [0, 0, 0, 0, 0, 0, 255, 255], finished = [255, 0, 0, 255, 0, 0, 255, 255];
const steps = (): readonly HistoryStep[] => Object.freeze([
  { type: 'pixel', description: 'Before first stroke', frameIndex: 0, layerId: 'art', imageData: image(new Array(8).fill(0)) },
  { type: 'pixel', description: 'Before second stroke', frameIndex: 0, layerId: 'art', imageData: image(red) },
]);
it('finishes the actual GIF on captured current artwork while preserving the Undo input and its buffers', async () => {
  const history = steps(), terminal = { width: 2, height: 1, data: new Uint8ClampedArray(finished) };
  const options = { fps: 10, holdLastFrameMs: 2000, finalFrame: terminal };
  const blob = await exportProcessReplayGifAsync(history, options), decoded = readAnimatedGif(Buffer.from(await blob.arrayBuffer()));
  expect(decoded.frames.at(-1)).toEqual({ data: finished, delayMs: 2000 });
  expect(history).toHaveLength(2); expect(Array.from((history[1] as { imageData: ImageData }).imageData.data)).toEqual(red);
  expect(Array.from(terminal.data)).toEqual(finished);
});
it('includes retained background pixels from the eviction baseline in the encoded history frames', async () => {
  const history: HistoryStep[] = [{ type: 'pixel', description: 'Eye layer', frameIndex: 0, layerId: 'eyes', imageData: image(blue) }];
  const baseline: ReplayBaselineCheckpoint = { width: 2, height: 1, activeFrameIndex: 0, totalBytes: 8,
    frames: [{ frameIndex: 0, layers: [{ layerId: 'body', frameIndex: 0, imageData: image(red), opacity: 1, blendMode: 'source-over', visible: true, order: 0 }] }] };
  const blob = await exportProcessReplayGifAsync(history, { baseline }), decoded = readAnimatedGif(Buffer.from(await blob.arrayBuffer()));
  expect(decoded.frames[0].data).toEqual(red); expect(decoded.frames.at(-1)!.data).toEqual(finished);
});
it('scales captured final artwork without mutating the source pixels', () => {
  const terminal = { width: 2, height: 1, data: new Uint8ClampedArray(finished) };
  const frames = convertHistoryToRawFrames(steps(), 2, { finalFrame: terminal });
  expect([frames.at(-1)!.width, frames.at(-1)!.height]).toEqual([4, 2]);
  expect(Array.from(frames.at(-1)!.data)).toEqual([...finished.slice(0, 4), ...finished, ...finished.slice(4), ...finished.slice(0, 4), ...finished, ...finished.slice(4)]);
  expect(Array.from(terminal.data)).toEqual(finished);
});
it('refuses mixed canvas dimensions or truncated final pixels without changing Undo input', () => {
  const history = steps();
  expect(() => convertHistoryToRawFrames(history, 1, { finalFrame: { width: 1, height: 2, data: new Uint8ClampedArray(finished) } })).toThrow('different canvas sizes');
  expect(() => convertHistoryToRawFrames(history, 1, { finalFrame: { width: 2, height: 1, data: new Uint8ClampedArray(4) } })).toThrow('Invalid final timelapse pixels');
  expect(history).toHaveLength(2);
});
