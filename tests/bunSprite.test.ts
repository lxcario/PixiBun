import { describe, it, expect } from 'vitest';
import { bunOutline, bunPixels, drawBun, BUN_INK, BunPose } from '@/lib/art/bunSprite';

const POSES: BunPose[] = ['idle', 'blink', 'happy'];

describe('bunSprite', () => {
  it('keeps every pixel inside the 16x16 grid for all poses', () => {
    for (const pose of POSES) {
      for (const [x, y, w, h] of bunPixels(pose)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(16);
        expect(y + h).toBeLessThanOrEqual(16);
      }
    }
  });

  it('draws an ink outline ring before the body pixels', () => {
    const calls: Array<{ x: number; y: number; fill: string }> = [];
    let fill = '';
    const ctx = {
      set fillStyle(v: string) {
        fill = v;
      },
      get fillStyle() {
        return fill;
      },
      fillRect: (x: number, y: number) => calls.push({ x, y, fill }),
    } as unknown as CanvasRenderingContext2D;

    drawBun(ctx, 0, 0, 'idle');
    const firstInk = calls.findIndex((c) => c.fill === BUN_INK);
    const firstColor = calls.findIndex((c) => c.fill !== BUN_INK);
    expect(firstInk).toBe(0);
    expect(firstColor).toBeGreaterThan(0);
  });

  it('emits an outline ring tight around the silhouette', () => {
    const ring = bunOutline('idle');
    const key = (x: number, y: number) => `${x},${y}`;
    const ringSet = new Set(ring.map(([x, y]) => key(x, y)));
    // Above the left ear tip, below the feet, and flanking the head
    expect(ringSet.has(key(3, -1))).toBe(true);
    expect(ringSet.has(key(5, 16))).toBe(true);
    expect(ringSet.has(key(1, 8))).toBe(true);
    expect(ringSet.has(key(14, 8))).toBe(true);
    // Interior stays hollow: the ring never covers the belly
    expect(ringSet.has(key(7, 13))).toBe(false);
  });
});