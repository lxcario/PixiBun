// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { packUniqueTiles, prepareTilesetBundle, tilesetSourceKey, assertTilesetCurrent, validateTilesetSource } from '@/lib/export/tilesetBundle';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer, touchBuffer, deleteBuffers } from '@/lib/engine/bufferRegistry';
import { getMemoryBudgetUsage } from '@/lib/safety/memoryBudget';
import { makeCanvas } from './helpers/mockCanvas';

const original = useStudioStore.getState();
beforeEach(() => {
  clearAllBuffers();
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    if (!contexts.has(this)) contexts.set(this, makeCanvas(this.width, this.height).getContext('2d')!);
    return contexts.get(this)!;
  });
  useStudioStore.setState({ canvasWidth: 16, canvasHeight: 16, activeFrameIndex: 0, activeLayerId: 'tiles', frames: [{ id: 'f', durationMs: 100, layers: [{ id: 'tiles', name: 'Tiles', opacity: 1, blendMode: 'source-over', visible: true, locked: false }] }] });
  getOrCreateBuffer('tiles', 16, 16);
});
afterEach(() => { clearAllBuffers(); useStudioStore.setState(original, true); vi.restoreAllMocks(); vi.useRealTimers(); });

it('reconstructs every RGBA byte from first-appearance tile IDs and both map conventions', () => {
  const width = 24, height = 16, tileSize = 8, data = new Uint8ClampedArray(width * height * 4);
  const pattern = [0, 1, 0, 2, 1, 2];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const id = pattern[Math.floor(y / 8) * 3 + Math.floor(x / 8)];
    data.set([id * 50, x % 8 * 5, y % 8 * 5, id === 1 ? 51 : id === 2 ? 0 : 255], (y * width + x) * 4);
  }
  const before = data.slice(), packed = packUniqueTiles({ width, height, data }, tileSize), { metadata: m } = packed;
  expect(m.tilemap).toEqual([[0, 1, 0], [2, 1, 2]]); expect(m.uniqueTiles).toBe(3);
  expect(packed.tiled.layers[0].data).toEqual([1, 2, 1, 3, 2, 3]);
  expect(packed.tiled.tilesets[0]).toMatchObject({ firstgid: 1, image: m.atlas.image, tilecount: 3, columns: 2, margin: 0, spacing: 0 });
  for (const map of [m.tilemap.flat(), packed.tiled.layers[0].data.map(gid => gid - packed.tiled.tilesets[0].firstgid)]) {
    const restored = new Uint8ClampedArray(data.length);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const id = map[Math.floor(y / 8) * 3 + Math.floor(x / 8)], ax = id % m.atlas.columns * 8 + x % 8, ay = Math.floor(id / m.atlas.columns) * 8 + y % 8;
      restored.set(packed.pixels.subarray((ay * m.atlas.width + ax) * 4, (ay * m.atlas.width + ax) * 4 + 4), (y * width + x) * 4);
    }
    expect(restored).toEqual(before);
  }
  expect(data).toEqual(before);
  expect(packed.pixels.slice(8 * m.atlas.width * 4 + 8 * 4, 8 * m.atlas.width * 4 + 9 * 4)).toEqual(new Uint8ClampedArray(4));
});
it.each([[17, 16, 8], [8, 8, 16], [0, 16, 8], [16, 16, 7], [4096, 4096, 8], [1024, 1024, 8]])('refuses cropping or oversized work before allocation (%j)', (w, h, size) => {
  expect(() => validateTilesetSource(w, h, size)).toThrow();
});
it('treats an all-transparent tile as a real reusable tile rather than an empty GID', () => {
  const packed = packUniqueTiles({ width: 16, height: 16, data: new Uint8ClampedArray(1024) }, 8);
  expect(packed.metadata.uniqueTiles).toBe(1); expect(packed.tiled.layers[0].data).toEqual([1, 1, 1, 1]);
});
it('invalidates on buffer replacement even when identity and dimensions are reused', () => {
  const key = tilesetSourceKey(8); deleteBuffers(['tiles']); getOrCreateBuffer('tiles', 16, 16);
  expect(() => assertTilesetCurrent(key, 8)).toThrow(/changed/);
});
it.each(['editRevision', 'bufferVersion', 'canvasWidth', 'activeLayerId', 'currentProjectId'] as const)('invalidates after %s changes', field => {
  const key = tilesetSourceKey(8), value = useStudioStore.getState()[field];
  useStudioStore.setState({ [field]: typeof value === 'number' ? value + 1 : 'changed' });
  expect(() => assertTilesetCurrent(key, 8)).toThrow(/changed/);
});
it('does not create a blank buffer to rescue a missing source', async () => {
  deleteBuffers(['tiles']);
  await expect(prepareTilesetBundle(8)).rejects.toThrow(/stored pixels/);
  expect(getMemoryBudgetUsage().reservedBytes).toBe(0);
});
it('refuses a changed source while PNG encoding is pending and releases reservations', async () => {
  let finish!: BlobCallback;
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => { finish = callback; });
  const job = prepareTilesetBundle(8); touchBuffer('tiles'); finish(new Blob([new Uint8Array([1])]));
  await expect(job).rejects.toThrow(/changed/); expect(getMemoryBudgetUsage().reservedBytes).toBe(0);
});
it('cancels pending encoding without waiting for the codec callback', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(() => {});
  const controller = new AbortController(), job = prepareTilesetBundle(8, controller.signal); controller.abort();
  await expect(job).rejects.toMatchObject({ name: 'AbortError' }); expect(getMemoryBudgetUsage().reservedBytes).toBe(0);
});
it('times out a silent codec and refuses a null PNG without leaking memory', async () => {
  vi.useFakeTimers();
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(() => {});
  const pending = expect(prepareTilesetBundle(8)).rejects.toThrow(/timed out/);
  await vi.advanceTimersByTimeAsync(30_000); await pending;
  vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation(callback => callback(null));
  await expect(prepareTilesetBundle(8)).rejects.toThrow(/encode/); expect(getMemoryBudgetUsage().reservedBytes).toBe(0);
});
it('retains one archive reservation until the result is disposed, including repeated disposal', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob([new Uint8Array([1])])));
  const result = await prepareTilesetBundle(8);
  expect(result.blob.type).toBe('application/zip'); expect(getMemoryBudgetUsage().reservedBytes).toBeGreaterThan(0);
  result.dispose(); result.dispose(); expect(getMemoryBudgetUsage().reservedBytes).toBe(0);
});
