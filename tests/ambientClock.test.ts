// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ambientSubscriberCount, ambientTicker } from '@/components/landing/ambientClock';

// One shared frame loop for the homepage's decorative animations.

describe('ambient clock', () => {
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  const run = (now: number) => { const [key, callback] = [...frames][0]; frames.delete(key); callback(now); };
  afterEach(() => { vi.restoreAllMocks(); frames.clear(); });

  it('drives every subscriber from one frame loop, each at its own pace, and stops when idle', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++id, callback); return id; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(key => { frames.delete(key); });
    const slow: number[] = [], fast: number[] = [];
    const a = ambientTicker(now => slow.push(now), 10);
    const b = ambientTicker(now => fast.push(now), 50);
    a.setActive(true); b.setActive(true);
    expect(frames.size).toBe(1);
    for (let t = 1000; t <= 1200; t += 16) run(t);
    // About 2 ticks at 10 fps and about 9 at 50 fps over 200 ms, from one loop.
    expect(slow.length).toBeGreaterThanOrEqual(2);
    expect(slow.length).toBeLessThanOrEqual(3);
    expect(fast.length).toBeGreaterThan(slow.length * 2);
    a.setActive(false); b.setActive(false);
    expect(frames.size).toBe(0);
    a.dispose(); b.dispose();
    expect(ambientSubscriberCount()).toBe(0);
  });

  it('runs at full rate while boosted', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++id, callback); return id; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(key => { frames.delete(key); });
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const ticks: number[] = [];
    const ticker = ambientTicker(now => ticks.push(now), 4);
    ticker.setActive(true);
    ticker.boost(100);
    for (let t = 16; t <= 96; t += 16) run(t);
    expect(ticks.length).toBe(6);
    ticker.dispose();
    expect(frames.size).toBe(0);
  });
});
