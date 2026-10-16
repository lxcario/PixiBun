import { afterEach, describe, expect, it, vi } from 'vitest';
import { commitLivePan, endLivePan, getLivePan, previewPan, subscribeLivePan } from '@/lib/viewport/livePan';

afterEach(() => endLivePan());

describe('live pan', () => {
  it('previews without writing the store and commits the rounded pan once', () => {
    const setPan = vi.fn();
    for (let k = 1; k <= 120; k++) previewPan(k + 0.4, k / 2);
    expect(setPan).not.toHaveBeenCalled();
    expect(getLivePan()).toEqual({ x: 120, y: 60 });

    expect(commitLivePan(setPan)).toEqual({ x: 120, y: 60 });
    expect(setPan).toHaveBeenCalledTimes(1);
    expect(setPan).toHaveBeenCalledWith(120, 60);
    expect(getLivePan()).toBeNull();
    expect(commitLivePan(setPan)).toBeNull();
    expect(setPan).toHaveBeenCalledTimes(1);
  });

  it('tells listeners each new pan, then the settled pan', () => {
    const seen: unknown[] = [];
    const unsubscribe = subscribeLivePan((pan, settled) => seen.push([pan, settled]));
    previewPan(10, 5);
    previewPan(10.2, 5.1); // rounds to the same pan: no update
    previewPan(12, 6);
    commitLivePan(() => {});
    unsubscribe();
    previewPan(99, 99);
    expect(seen).toEqual([
      [{ x: 10, y: 5 }, undefined],
      [{ x: 12, y: 6 }, undefined],
      [null, { x: 12, y: 6 }],
    ]);
  });

  it('ending without a preview or a settled pan tells nobody', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLivePan(listener);
    endLivePan();
    expect(listener).not.toHaveBeenCalled();
    endLivePan({ x: 3, y: 4 });
    expect(listener).toHaveBeenCalledWith(null, { x: 3, y: 4 });
    unsubscribe();
  });
});
