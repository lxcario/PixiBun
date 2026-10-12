import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pixelToClient } from '../scripts/nibbli/geometry';
import { NibbliMemory } from '../scripts/nibbli/memory';
import { rasterDifference } from '../scripts/nibbli/vision';

describe('Nibbli command and evidence boundaries', () => {
  it('maps pixel centres through fractional zoom and pan, including the last pixel', () => {
    const canvas = { width: 32, height: 16, bounds: { x: 90.25, y: 18.5, width: 240, height: 160 } };
    expect(pixelToClient({ x: 0, y: 0 }, canvas)).toEqual({ x: 94, y: 23.5 });
    expect(pixelToClient({ x: 31, y: 15 }, canvas)).toEqual({ x: 326.5, y: 173.5 });
    for (const point of [{ x: 32, y: 0 }, { x: -1, y: 0 }, { x: 0.5, y: 1 }, { x: NaN, y: 1 }]) {
      expect(() => pixelToClient(point, canvas)).toThrow('outside');
    }
  });
  it('reports an exact transparent-byte mismatch and geometry mismatch', () => {
    expect(rasterDifference({ width: 1, height: 1, data: [1, 0, 0, 0] }, { width: 1, height: 1, data: [0, 0, 0, 0] })).toMatchObject({ equal: false, changedPixels: 1, firstDifference: { x: 0, y: 0 } });
    expect(rasterDifference({ width: 2, height: 1, data: [] }, { width: 1, height: 2, data: [] })).toMatchObject({ equal: false, geometry: true });
  });
  it('preserves failures, links corrections and refuses capture replacement or invented evidence', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'nibbli-'));
    try {
      const memory = await NibbliMemory.create(root, { candidate: 'test' });
      const failure = await memory.event('action-failed', { verdict: 'failed' });
      await memory.artifact('before.png', new Uint8Array([1, 2, 3]));
      await expect(memory.artifact('before.png', new Uint8Array([9]))).rejects.toThrow();
      await expect(memory.artifact('../escape.json', 'x')).rejects.toThrow();
      await expect(memory.observation('Unproven', ['missing'])).rejects.toThrow('evidence');
      await memory.observation('Correction proposal', [failure], failure);
      await memory.finish('inconclusive');
      expect((await NibbliMemory.readEvents(memory.directory)).find(event => event.id === failure)?.kind).toBe('action-failed');
      expect(await readFile(path.join(memory.directory, 'before.png'))).toEqual(Buffer.from([1, 2, 3]));
      await expect(memory.event('rewrite', {})).rejects.toThrow('completed');
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
