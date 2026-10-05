// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers, getOrCreateBuffer, touchBuffer } from '@/lib/engine/bufferRegistry';
import { setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import { useSpriteCleanupEvents } from '@/hooks/viewport/events/useSpriteCleanupEvents';
import { clipsAfterFrameReorder } from '@/lib/animation/clipFrameMutations';
import { resolveFrameLayerTargets } from '@/lib/project/frameLayerTargets';
import { indexSemanticPixels, MAX_PALETTE_BINDINGS } from '@/lib/color/paletteSemantics';
import { buildProjectFile } from '@/lib/project/serialize';
import { validateProjectFile } from '@/lib/project/schema';
import { studioEvents } from '@/lib/events/studioEvents';
import { getMemoryBudgetUsage } from '@/lib/safety/memoryBudget';
import type { AnimationFrame, Layer } from '@/types/canvas';
import type { ColorPalette } from '@/types/palette';
import { makeCanvas } from './helpers/mockCanvas';

beforeEach(() => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    let ctx = contexts.get(this);
    if (!ctx) {
      const backing = makeCanvas(this.width || 32, this.height || 32);
      ctx = backing.getContext('2d')!; contexts.set(this, ctx);
      Object.defineProperty(this, '_imageData', { configurable: true, get: () => backing._imageData });
    }
    return ctx;
  });
  clearAllBuffers(); setGlobalHistoryEngine(null);
  useStudioStore.getState().resetToNewProject('identity-project');
});
afterEach(() => {
  cleanup(); setGlobalHistoryEngine(null); clearAllBuffers(); vi.restoreAllMocks();
  expect(getMemoryBudgetUsage().reservedBytes).toBe(0);
});
const canvas = (id: string) => getOrCreateBuffer(id, 32, 32).canvas;
const members = (name: string) => {
  const state = useStudioStore.getState(), clip = state.clips.find(c => c.name === name)!;
  return state.frames.slice(clip.startFrame, clip.endFrame + 1).map(frame => frame.id);
};
const threeFrames = () => { useStudioStore.getState().addFrame(); useStudioStore.getState().addFrame(); };
const duplicatePalette = (): ColorPalette => ({ id: 'roles', name: 'Roles', colors: ['#ff0000', '#ff0000'], semantics: {
  entries: [{ id: 'cloth', role: 'cloth' }, { id: 'fire', role: 'fire' }],
  bindings: [{ id: 'fire-region', frameId: useStudioStore.getState().frames[0].id, entryId: 'fire', x: 0, y: 0, w: 32, h: 32 }],
} });

it('preserves later clip members and extends clips containing a duplicated endpoint', () => {
  threeFrames(); useStudioStore.getState().addClip('Attack', 1, 2);
  const intended = members('Attack');
  useStudioStore.getState().duplicateFrame(0);
  expect(members('Attack')).toEqual(intended);
  const duplicate = useStudioStore.getState().duplicateFrame(3)!;
  expect(members('Attack')).toEqual([...intended, duplicate.frameId]);
  const clip = useStudioStore.getState().clips.find(c => c.name === 'Attack')!;
  expect([clip.fromFrame, clip.toFrame]).toEqual([clip.startFrame, clip.endFrame]);
});

it('moves an unrelated frame past a clip without changing its member identities', () => {
  threeFrames(); useStudioStore.getState().addClip('Attack', 1, 2);
  const intended = members('Attack');
  useStudioStore.getState().reorderFrames(0, 2);
  expect(members('Attack')).toEqual(intended);
  expect(useStudioStore.getState().clips.find(c => c.name === 'Attack')!.startFrame).toBe(0);
});

it('refuses splitting a clip before changing frames, dirty revisions or history', () => {
  threeFrames(); useStudioStore.getState().addClip('Attack', 0, 1);
  const drawing = renderHook(() => useViewportDrawing({ canvasWidth: 32, canvasHeight: 32, getOrCreateLayerCanvas: canvas, renderComposite: vi.fn() }));
  const before = useStudioStore.getState(), toast = vi.fn();
  const unsubscribe = studioEvents.on('pixibun:toast', toast);
  try {
    act(() => before.reorderFrames(0, 2));
    expect(useStudioStore.getState().frames).toBe(before.frames);
    expect(useStudioStore.getState().editRevision).toBe(before.editRevision);
    expect(useStudioStore.getState().canUndo).toBe(false);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('split') }));
    act(() => drawing.result.current.performUndo());
    expect(useStudioStore.getState().frames).toBe(before.frames);
  } finally { unsubscribe(); }
});

it('preserves membership or refuses every reorder across all small contiguous ranges', () => {
  for (let count = 2; count <= 7; count++) for (let start = 0; start < count; start++) for (let end = start; end < count; end++) {
    const original = Array.from({ length: count }, (_, i) => i), intended = original.slice(start, end + 1);
    for (let from = 0; from < count; from++) for (let to = 0; to < count; to++) {
      const reordered = [...original]; const [moved] = reordered.splice(from, 1); reordered.splice(to, 0, moved);
      const result = clipsAfterFrameReorder([{ id: 'clip', name: 'Clip', startFrame: start, endFrame: end }], from, to);
      const positions = intended.map(id => reordered.indexOf(id));
      const contiguous = Math.max(...positions) - Math.min(...positions) + 1 === intended.length;
      expect(result.ok).toBe(contiguous);
      if (result.ok) expect(reordered.slice(result.clips[0].startFrame, result.clips[0].endFrame + 1).sort()).toEqual([...intended].sort());
    }
  }
});

it('restores duplicated palette intent, clip metadata and exact pixels through undo/redo and portable admission', () => {
  const palette = duplicatePalette(); useStudioStore.setState({ palettes: [palette], currentPaletteId: palette.id });
  const original = useStudioStore.getState().frames[0], entry = getOrCreateBuffer(original.layers[0].id, 32, 32);
  entry.ctx.fillStyle = '#ff0000'; entry.ctx.fillRect(0, 0, 1, 1); touchBuffer(original.layers[0].id);
  const drawing = renderHook(() => useViewportDrawing({ canvasWidth: 32, canvasHeight: 32, getOrCreateLayerCanvas: canvas, renderComposite: vi.fn() }));
  const before = structuredClone({ frames: useStudioStore.getState().frames, clips: useStudioStore.getState().clips, palettes: useStudioStore.getState().palettes });
  act(() => useStudioStore.getState().duplicateFrame(0));
  const duplicated = useStudioStore.getState().frames[1];
  const pixel = getOrCreateBuffer(duplicated.layers[0].id, 32, 32).ctx.getImageData(0, 0, 1, 1).data;
  expect(Array.from(pixel)).toEqual([255, 0, 0, 255]);
  expect(indexSemanticPixels(pixel, 1, 1, useStudioStore.getState().palettes[0], duplicated.id).indices[0]).toBe(1);
  act(() => drawing.result.current.performUndo());
  expect({ frames: useStudioStore.getState().frames, clips: useStudioStore.getState().clips, palettes: useStudioStore.getState().palettes }).toEqual(before);
  act(() => drawing.result.current.performRedo());
  expect(indexSemanticPixels(pixel, 1, 1, useStudioStore.getState().palettes[0], duplicated.id).indices[0]).toBe(1);
  const file = buildProjectFile(); for (const frame of file.frames) for (const layer of frame.layers) delete layer.pngBase64;
  const admitted = validateProjectFile(file); expect(admitted.ok).toBe(true);
  if (!admitted.ok) throw new Error(admitted.error);
  useStudioStore.getState().loadProjectState(admitted.value, 'reopened');
  expect(indexSemanticPixels(pixel, 1, 1, useStudioStore.getState().palettes[0], duplicated.id).indices[0]).toBe(1);
});

it('refuses duplicate-binding overflow without creating a frame and prunes deleted bindings undoably', () => {
  const palette = duplicatePalette(), binding = palette.semantics!.bindings[0];
  palette.semantics!.bindings = Array.from({ length: MAX_PALETTE_BINDINGS }, (_, i) => ({ ...binding, id: `region-${i}` }));
  useStudioStore.setState({ palettes: [palette], currentPaletteId: palette.id });
  const before = useStudioStore.getState(); expect(before.duplicateFrame(0)).toBeNull();
  expect(useStudioStore.getState().frames).toBe(before.frames);
  useStudioStore.getState().addFrame();
  const drawing = renderHook(() => useViewportDrawing({ canvasWidth: 32, canvasHeight: 32, getOrCreateLayerCanvas: canvas, renderComposite: vi.fn() }));
  act(() => useStudioStore.getState().deleteFrame(0));
  expect(useStudioStore.getState().palettes[0].semantics!.bindings).toHaveLength(0);
  act(() => drawing.result.current.performUndo());
  expect(useStudioStore.getState().palettes[0].semantics!.bindings).toHaveLength(MAX_PALETTE_BINDINGS);
});

it('forks copied research sources onto the new frame and raster identities', () => {
  const original = useStudioStore.getState().frames[0];
  useStudioStore.setState(state => {
    state.frames[0].layers[0].research = { version: 1, name: 'Source study', width: 32, height: 32,
      settings: { kind: 'pixelize', block: 1, candidate: 'nearest', colors: [], protected: [] },
      source: { frameId: original.id, layerId: original.layers[0].id, sha256: 'a'.repeat(64),
        normalLayerId: original.layers[0].id, normalSha256: 'b'.repeat(64) } };
  });
  useStudioStore.getState().duplicateFrame(0);
  const duplicate = useStudioStore.getState().frames[1];
  expect(duplicate.layers[0].research!.source).toEqual({ frameId: duplicate.id, layerId: duplicate.layers[0].id,
    sha256: 'a'.repeat(64), normalLayerId: duplicate.layers[0].id, normalSha256: 'b'.repeat(64) });
  expect(useStudioStore.getState().frames[0].layers[0].research!.source.frameId).toBe(original.id);
});

const layer = (id: string, name: string, tag?: string): Layer => ({ id, name, visible: true, locked: false, opacity: 1, blendMode: 'source-over', ...(tag ? { tag } : {}) });
const reorderedStacks = (): AnimationFrame[] => [
  { id: 'frame-a', durationMs: 100, layers: [layer('body-a', 'Body'), layer('bg-a', 'Background')] },
  { id: 'frame-b', durationMs: 100, layers: [layer('light-b', 'Lighting'), layer('body-b', 'Body')] },
];

it('resolves names across different stacks and refuses missing, ambiguous and generated counterparts', () => {
  const frames = reorderedStacks();
  expect(resolveFrameLayerTargets(frames, 0, 'body-a')).toEqual({ ok: true, layers: [frames[0].layers[0], frames[1].layers[1]] });
  for (const replacement of [[], [layer('x', 'Body'), layer('y', 'Body')], [layer('generated', 'Body', 'normal-map')]]) {
    expect(resolveFrameLayerTargets([frames[0], { ...frames[1], layers: replacement }], 0, 'body-a').ok).toBe(false);
  }
});

it.each([false, true])('actual all-frame cleanup preserves unrelated artwork and locked counterparts (locked=%s)', locked => {
  const frames = reorderedStacks(); useStudioStore.setState({ frames, activeFrameIndex: 0, activeLayerId: 'body-a', clips: [], activeClipId: null });
  if (locked) useStudioStore.setState(state => { state.frames[1].layers[1].locked = true; });
  for (const frame of frames) for (const item of frame.layers) {
    const entry = getOrCreateBuffer(item.id, 32, 32); entry.ctx.fillStyle = 'rgba(255,0,0,0.1)'; entry.ctx.fillRect(0, 0, 1, 1); touchBuffer(item.id);
  }
  renderHook(() => useSpriteCleanupEvents({ canvasWidth: 32, canvasHeight: 32, activeLayerId: 'body-a', getOrCreateLayerCanvas: canvas,
    renderComposite: vi.fn(), captureSnapshot: vi.fn(), commitSnapshot: vi.fn(), bumpBufferVersion: vi.fn(), compositeSourceSnapshot: () => null, updateTaggedLayer: vi.fn() }));
  const request = { allFrames: true, options: { alphaCutoff: 32, maxSpeckPixels: 0, paletteSize: 16, simplifyColors: false, thinDarkLines: false } };
  act(() => { studioEvents.emit('pixibun:sprite-cleanup-scan', request); studioEvents.emit('pixibun:sprite-cleanup-apply', request); });
  const alpha = (id: string) => getOrCreateBuffer(id, 32, 32).ctx.getImageData(0, 0, 1, 1).data[3];
  expect(alpha('body-a')).toBe(0);
  if (locked) expect(alpha('body-b')).toBeGreaterThan(0); else expect(alpha('body-b')).toBe(0);
  expect(alpha('light-b')).toBeGreaterThan(0); expect(alpha('bg-a')).toBeGreaterThan(0);
});

it('actual cleanup refuses ambiguous stacks without changing either frame', () => {
  const frames = reorderedStacks(); frames[1].layers.push(layer('extra-body', 'Body'));
  useStudioStore.setState({ frames, activeFrameIndex: 0, activeLayerId: 'body-a', clips: [], activeClipId: null });
  const capture = vi.fn(), toast = vi.fn(); const unsubscribe = studioEvents.on('pixibun:toast', toast);
  const entry = getOrCreateBuffer('body-a', 32, 32); entry.ctx.fillStyle = 'rgba(255,0,0,0.1)'; entry.ctx.fillRect(0, 0, 1, 1);
  const before = entry.ctx.getImageData(0, 0, 32, 32).data.slice();
  renderHook(() => useSpriteCleanupEvents({ canvasWidth: 32, canvasHeight: 32, activeLayerId: 'body-a', getOrCreateLayerCanvas: canvas,
    renderComposite: vi.fn(), captureSnapshot: capture, commitSnapshot: vi.fn(), bumpBufferVersion: vi.fn(), compositeSourceSnapshot: () => null, updateTaggedLayer: vi.fn() }));
  try {
    const request = { allFrames: true, options: { alphaCutoff: 32, maxSpeckPixels: 0, paletteSize: 16, simplifyColors: false, thinDarkLines: false } };
    act(() => { studioEvents.emit('pixibun:sprite-cleanup-scan', request); studioEvents.emit('pixibun:sprite-cleanup-apply', request); });
    expect(entry.ctx.getImageData(0, 0, 32, 32).data).toEqual(before); expect(capture).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Frame 2') }));
  } finally { unsubscribe(); }
});
