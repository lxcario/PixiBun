import { describe, expect, it } from 'vitest';
import { activeTime, applyStep, decodeTrack, IDLE_MS, ReceiptWriter } from '@/lib/cart/receiptTrack';

const canvas = (width: number, height: number) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) });
const paint = (c: ReturnType<typeof canvas>, x: number, y: number, rgba: number[]) => c.data.set(rgba, (y * c.width + x) * 4);
const replay = (bytes: Uint8Array) => {
  let state: { width: number; height: number; data: Uint8ClampedArray } | null = null;
  const stages: number[][] = [];
  for (const step of decodeTrack(bytes)) { state = applyStep(step, state); stages.push(Array.from(state.data)); }
  return stages;
};

describe('receipt track', () => {
  it('replays every stage exactly, including a resize', () => {
    const writer = new ReceiptWriter();
    const stages: number[][] = [];
    let art = canvas(4, 4);
    const snap = (time: number) => { if (writer.add(art, time)) stages.push(Array.from(art.data)); };
    snap(0);
    paint(art, 1, 1, [255, 120, 40, 255]); snap(1000);
    paint(art, 2, 1, [255, 120, 40, 255]); paint(art, 3, 3, [10, 20, 30, 255]); snap(1500);
    snap(1600); // nothing changed: no step
    paint(art, 1, 1, [0, 0, 0, 0]); snap(4000); // erased
    art = canvas(6, 2); paint(art, 5, 1, [9, 9, 9, 255]); snap(5000); // new canvas size
    expect(writer.steps).toBe(5);
    expect(replay(writer.bytes())).toEqual(stages);
  });

  it('stays small for small strokes', () => {
    const writer = new ReceiptWriter();
    const art = canvas(64, 64);
    writer.add(art, 0);
    for (let i = 0; i < 200; i++) { paint(art, i % 64, Math.floor(i / 64), [200, 80, 40, 255]); writer.add(art, i * 500); }
    // Each one-pixel step costs a few bytes; the 16 KiB blank start is not stored pixel by pixel.
    expect(writer.bytes().length).toBeLessThan(2000);
  });

  it('counts drawing time without long breaks', () => {
    expect(activeTime([{ dt: 0 }, { dt: 1000 }, { dt: 10 * 60_000 }, { dt: 2000 }])).toBe(3000 + IDLE_MS);
  });

  it('refuses damaged or impossible tracks', () => {
    expect(() => decodeTrack(Uint8Array.of(9))).toThrow(/newer/);
    expect(() => decodeTrack(Uint8Array.of(1, 0, 1, 0, 0, 0))).toThrow(/impossible/);
    expect(() => decodeTrack(Uint8Array.of(1, 0, 0, 1))).toThrow(/no canvas/);
    const writer = new ReceiptWriter();
    const art = canvas(2, 2); paint(art, 0, 0, [1, 2, 3, 255]); writer.add(art, 0);
    const bytes = writer.bytes();
    expect(() => decodeTrack(bytes.slice(0, bytes.length - 2))).toThrow();
  });
});

describe('resuming a receipt', () => {
  it('continues a saved track as if it never stopped', () => {
    const art = canvas(4, 4);
    const whole = new ReceiptWriter();
    const first = new ReceiptWriter();
    whole.add(art, 0); first.add(art, 0);
    paint(art, 0, 0, [255, 0, 0, 255]); whole.add(art, 100); first.add(art, 100);
    const resumed = ReceiptWriter.resume(first.bytes());
    expect(resumed.steps).toBe(2);
    paint(art, 1, 0, [255, 0, 0, 255]); paint(art, 2, 2, [0, 255, 0, 255]);
    whole.add(art, 200); resumed.add(art, 200);
    // The resumed track starts its clock fresh, so only the timing of that step differs.
    const a = decodeTrack(whole.bytes()), b = decodeTrack(resumed.bytes());
    expect(b.length).toBe(3);
    expect(b.map(step => Array.from(step.indices))).toEqual(a.map(step => Array.from(step.indices)));
    expect(b.map(step => Array.from(step.colors))).toEqual(a.map(step => Array.from(step.colors)));
  });
});
