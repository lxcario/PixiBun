// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { openBlankWorkspace, openStarterWorkspace } from '@/lib/project/starterWorkspace';
import { useStudioStore } from '@/stores/studioStore';
import * as registry from '@/lib/engine/bufferRegistry';
import { STARTER_TEMPLATES, TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';
import { makeCanvas } from './helpers/mockCanvas';

beforeEach(() => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function(this: HTMLCanvasElement) {
    let context = contexts.get(this); if (!context) { context = makeCanvas(this.width, this.height).getContext('2d')!; contexts.set(this, context); } return context;
  });
  registry.clearAllBuffers(); useStudioStore.getState().resetToNewProject('original-starter-test');
  const state = useStudioStore.getState(), source = registry.getOrCreateBuffer(state.activeLayerId, 32, 32);
  source.ctx.fillStyle = '#ff0000'; source.ctx.fillRect(0, 0, 2, 2);
  useStudioStore.getState().setDirty(true);
});
afterEach(() => { registry.clearAllBuffers(); vi.restoreAllMocks(); });

it.each(STARTER_TEMPLATES.map(t => t.id))('opens %s as independent exact starter artwork after a successful checkpoint', async id => {
  const original = useStudioStore.getState().currentProjectId;
  const checkpoint = vi.fn(async () => { useStudioStore.getState().markClean(); return { ok: true, status: 'saved' } as const; });
  expect(await openStarterWorkspace(id, checkpoint)).toBe(true); expect(checkpoint).toHaveBeenCalledOnce();
  const state = useStudioStore.getState(), template = STARTER_TEMPLATES.find(t => t.id === id)!;
  expect(state.currentProjectId).not.toBe(original); expect(state.projectName).toBe(template.name);
  expect([state.canvasWidth, state.canvasHeight, state.frames.length, state.isDirty]).toEqual([16, 16, 1, true]);
  const actual = registry.getOrCreateBuffer(state.activeLayerId, 16, 16).ctx.getImageData(0, 0, 16, 16).data;
  const expected = new Uint8ClampedArray(16 * 16 * 4);
  template.rows.forEach((row, y) => [...row].forEach((char, x) => {
    const hex = TEMPLATE_PALETTE[char]; if (!hex) return;
    expected.set([parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255], (y * 16 + x) * 4);
  }));
  expect(actual).toEqual(expected);
});
it('preserves the original registry and document when saving fails', async () => {
  const before = useStudioStore.getState(), source = registry.getOrCreateBuffer(before.activeLayerId, 32, 32);
  const pixels = source.ctx.getImageData(0, 0, 32, 32).data.slice();
  await expect(openStarterWorkspace('hearth-ghost', async () => ({ ok: false, reason: 'quota' }))).rejects.toThrow('could not be saved');
  expect(useStudioStore.getState()).toBe(before); expect(registry.getOrCreateBuffer(before.activeLayerId, 32, 32)).toBe(source);
  expect(source.ctx.getImageData(0, 0, 32, 32).data).toEqual(pixels);
});
it('refuses a late starter after a raw source edit during checkpointing', async () => {
  const before = useStudioStore.getState(), source = registry.getOrCreateBuffer(before.activeLayerId, 32, 32);
  await expect(openStarterWorkspace('hearth-ghost', async () => {
    source.ctx.fillStyle = '#00ff00'; source.ctx.fillRect(3, 3, 1, 1); registry.touchBuffer(before.activeLayerId);
    useStudioStore.getState().markClean(); return { ok: true, status: 'saved' };
  })).rejects.toMatchObject({ name: 'AbortError' });
  expect(useStudioStore.getState().currentProjectId).toBe(before.currentProjectId);
  expect(Array.from(source.ctx.getImageData(3, 3, 1, 1).data)).toEqual([0, 255, 0, 255]);
});
it('refuses navigation cancellation and leaves the original document', async () => {
  const controller = new AbortController(), before = useStudioStore.getState();
  await expect(openStarterWorkspace('hearth-ghost', async () => {
    controller.abort(); return { ok: true, status: 'saved' };
  }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  expect(useStudioStore.getState()).toBe(before);
});
it('does not checkpoint or replace artwork for an unknown template', async () => {
  const before = useStudioStore.getState(), checkpoint = vi.fn();
  expect(await openStarterWorkspace('unknown', checkpoint)).toBe(false);
  expect(checkpoint).not.toHaveBeenCalled(); expect(useStudioStore.getState()).toBe(before);
});
it.each([16, 24, 32, 48])('opens a separate blank %s canvas only after checkpointing', async size => {
  const original = useStudioStore.getState().currentProjectId;
  expect(await openBlankWorkspace(size, async () => { useStudioStore.getState().markClean(); return { ok: true, status: 'saved' }; })).toBe(true);
  const state = useStudioStore.getState(); expect(state.currentProjectId).not.toBe(original);
  expect([state.canvasWidth, state.canvasHeight]).toEqual([size, size]);
  expect(registry.getOrCreateBuffer(state.activeLayerId, size, size).ctx.getImageData(0, 0, size, size).data.some(v => v !== 0)).toBe(false);
});
it('refuses unsupported welcome sizes before saving or allocating', async () => {
  const before = useStudioStore.getState(), checkpoint = vi.fn();
  await expect(openBlankWorkspace(8192, checkpoint)).rejects.toThrow('offered on the welcome');
  expect(checkpoint).not.toHaveBeenCalled(); expect(useStudioStore.getState()).toBe(before);
});
it('allows checkpointing to allocate untouched blank source buffers', async () => {
  registry.clearAllBuffers(); useStudioStore.getState().markClean();
  const before = useStudioStore.getState();
  expect(await openBlankWorkspace(16, async () => {
    registry.getOrCreateBuffer(before.activeLayerId, 32, 32);
    return { ok: true, status: 'saved' };
  })).toBe(true);
  expect(useStudioStore.getState().canvasWidth).toBe(16);
});
it('refuses painting into a newly allocated source while checkpointing', async () => {
  registry.clearAllBuffers(); useStudioStore.getState().markClean();
  const before = useStudioStore.getState();
  await expect(openBlankWorkspace(16, async () => {
    const source = registry.getOrCreateBuffer(before.activeLayerId, 32, 32);
    source.ctx.fillStyle = '#00ff00'; source.ctx.fillRect(3, 3, 1, 1); registry.touchBuffer(before.activeLayerId);
    return { ok: true, status: 'saved' };
  })).rejects.toMatchObject({ name: 'AbortError' });
  expect(useStudioStore.getState().currentProjectId).toBe(before.currentProjectId);
  expect(Array.from(registry.getOrCreateBuffer(before.activeLayerId, 32, 32).ctx.getImageData(3, 3, 1, 1).data)).toEqual([0, 255, 0, 255]);
});
