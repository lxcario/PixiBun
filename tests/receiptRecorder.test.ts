// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useStudioStore } from '@/stores/studioStore';
import { receiptSummary, startReceiptRecorder } from '@/lib/cart/receiptRecorder';

// The picture the recorder takes: a 4 × 1 strip whose painted pixels are set by each test.
const painted = { count: 0 };
vi.mock('@/lib/render/compositor', () => ({
  compositeFrame: () => ({
    width: 4, height: 1,
    getContext: () => ({
      getImageData: () => {
        const data = new Uint8ClampedArray(16);
        for (let p = 0; p < painted.count; p++) data.set([255, 0, 0, 255], p * 4);
        return { data };
      },
    }),
  }),
}));

const quietPeriod = () => new Promise((resolve) => setTimeout(resolve, 420));
const publish = () => useStudioStore.setState((state) => ({ bufferVersion: state.bufferVersion + 1 }));
const pointer = (type: string) => window.dispatchEvent(new PointerEvent(type, { pointerId: 1, bubbles: true }));

let stop: () => void;
let before = 0;
// Strokes since the test began: the drawing and its receipt carry over between tests.
const strokes = () => (receiptSummary()?.strokes ?? 0) - before;
beforeEach(async () => {
  painted.count = 0;
  stop = startReceiptRecorder();
  await vi.waitFor(() => expect(receiptSummary()).not.toBeNull());
  publish();
  await quietPeriod();
  before = receiptSummary()!.strokes;
});
afterEach(() => stop());

it('counts a slow stroke once, when it is released, not where it paused', async () => {
  pointer('pointerdown');
  painted.count = 2; publish();
  // The stroke is still held after the quiet period: no picture of half a line.
  await quietPeriod();
  expect(strokes()).toBe(0);
  painted.count = 4; publish();
  pointer('pointerup');
  await quietPeriod();
  expect(strokes()).toBe(1);
});

it('still pictures edits made without a pointer, and a stroke whose release was lost', async () => {
  painted.count = 1; publish();
  await quietPeriod();
  expect(strokes()).toBe(1);

  pointer('pointerdown');
  painted.count = 3; publish();
  await quietPeriod();
  // The window lost focus before the release arrived.
  window.dispatchEvent(new Event('blur'));
  await quietPeriod();
  expect(strokes()).toBe(2);
});
