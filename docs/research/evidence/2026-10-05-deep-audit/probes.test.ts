// Diagnostic probes assert the CURRENT problematic behavior, not desired behavior.
// These are audit evidence and are outside the normal application test inventory.
import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudioStore } from '@/stores/studioStore';
import { clearAllBuffers } from '@/lib/engine/bufferRegistry';
import { setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { makeCanvas } from '../../../../tests/helpers/mockCanvas';
import { useBrushPointerHandler } from '@/hooks/viewport/useBrushPointerHandler';
import { filterPixelPerfect } from '@/lib/canvas/rasterMath';
import { db, autoSaveWorkspaceDetailed, renameProject, createBlankProjectFile } from '@/lib/storage/db';
import { indexSemanticPixels } from '@/lib/color/paletteSemantics';

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) { return makeCanvas(this.width || 32, this.height || 32).getContext('2d'); });
  clearAllBuffers(); setGlobalHistoryEngine(null); useStudioStore.getState().resetToNewProject();
});
afterEach(() => { vi.restoreAllMocks(); clearAllBuffers(); setGlobalHistoryEngine(null); });

it('duplicate before a later clip leaves its numeric range pointing at different frames', () => {
  useStudioStore.getState().addFrame(); useStudioStore.getState().addFrame();
  useStudioStore.getState().addClip('Attack', 1, 2);
  const before = useStudioStore.getState(); const clip = before.clips.find(c => c.name === 'Attack')!;
  const intended = before.frames.slice(1, 3).map(f => f.id);
  useStudioStore.getState().duplicateFrame(0);
  const after = useStudioStore.getState(); const actual = after.frames.slice(clip.startFrame, clip.endFrame + 1).map(f => f.id);
  expect(actual).not.toEqual(intended); expect(after.clips.find(c => c.name === 'Attack')!.startFrame).toBe(1);
  console.log('CLIP_DUPLICATION', JSON.stringify({ intended, actual }));
});

it('reordering an unrelated frame into a clip silently changes its member identities', () => {
  useStudioStore.getState().addFrame(); useStudioStore.getState().addFrame();
  useStudioStore.getState().addClip('Attack', 1, 2);
  const intended = useStudioStore.getState().frames.slice(1, 3).map(f => f.id);
  useStudioStore.getState().reorderFrames(0, 2);
  const actual = useStudioStore.getState().frames.slice(1, 3).map(f => f.id);
  expect(actual).not.toEqual(intended); console.log('CLIP_REORDER', JSON.stringify({ intended, actual }));
});

it('cross-frame targets follow stack index even when layer names disagree', () => {
  const frames = [ { layers: [{ id: 'body0', name: 'Body' }, { id: 'bg0', name: 'Background' }] }, { layers: [{ id: 'fx1', name: 'Lighting' }, { id: 'body1', name: 'Body' }] } ];
  const layerIndex = 0; const currentLayer = frames[0].layers[0];
  const targets = frames.map(frame => frame.layers[layerIndex] || frame.layers.find(layer => layer.name === currentLayer.name));
  expect(targets[1]!.name).toBe('Lighting'); console.log('STACK_TARGET', JSON.stringify(targets));
});

it('pixel-perfect filtering across pointer-event boundaries retains the corner', () => {
  const draw = vi.fn(); let last = { x: 0, y: 0 };
  const { result, rerender } = renderHook(() => useBrushPointerHandler({ drawPointsOnActiveLayer: draw, lastPoint: last, setLastPoint: point => { last = point!; } }));
  const event = { shiftKey: false } as React.PointerEvent;
  act(() => { result.current.onPointerDown(event, { x: 0, y: 0 }); result.current.onPointerMove(event, { x: 1, y: 0 }); });
  rerender(); act(() => { result.current.onPointerMove(event, { x: 1, y: 1 }); });
  const painted = draw.mock.calls.flatMap(call => call[0]);
  expect(painted).toContainEqual({ x: 1, y: 0 });
  expect(filterPixelPerfect([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }])).not.toContainEqual({ x: 1, y: 0 });
  console.log('PIXEL_PERFECT_EVENT_BOUNDARY', JSON.stringify(painted));
});

it('dither pointer movement draws only the endpoint instead of intervening pattern pixels', () => {
  useStudioStore.getState().setActiveTool('dither');
  const draw = vi.fn(); const { result } = renderHook(() => useBrushPointerHandler({ drawPointsOnActiveLayer: draw, lastPoint: { x: 0, y: 0 }, setLastPoint: vi.fn() }));
  act(() => { result.current.onPointerMove({ shiftKey: false } as React.PointerEvent, { x: 20, y: 0 }); });
  const painted = draw.mock.calls.flatMap(call => call[0]);
  expect(painted.every((p: {x:number}) => p.x === 20)).toBe(true);
  console.log('DITHER_EVENT_GAP', JSON.stringify(painted));
});

it('renaming storage causes a later save using the same tab original version to conflict', async () => {
  await db.delete(); await db.open(); const project = createBlankProjectFile('Original');
  const saved = await autoSaveWorkspaceDetailed('audit-project', project, undefined, [], undefined, null);
  expect(saved.ok).toBe(true); if (!saved.ok) return;
  expect(await renameProject('audit-project', 'Renamed')).toBe(true);
  project.name = 'Renamed';
  const result = await autoSaveWorkspaceDetailed('audit-project', project, undefined, [], undefined, saved.storageVersion);
  expect(result.ok).toBe(false); if (!result.ok) expect(result.reason).toBe('conflict');
  console.log('SELF_RENAME_CONFLICT', JSON.stringify(result)); await db.delete();
});

it('duplicating a frame does not carry duplicate-register palette bindings into its new identity', () => {
  const s = useStudioStore.getState(), frameId = s.frames[0].id;
  const palette = { id: 'audit-palette', name: 'Duplicate red', colors: ['#ff0000', '#ff0000'], semantics: { entries: [{id:'red-cloth',role:'cloth'},{id:'red-fire',role:'fire'}], bindings: [{id:'bind-red',frameId,entryId:'red-fire',x:0,y:0,w:32,h:32}] } };
  useStudioStore.setState({ palettes: [palette], currentPaletteId: palette.id });
  const pixel = new Uint8ClampedArray([255,0,0,255]);
  expect(indexSemanticPixels(pixel, 1, 1, palette, frameId).indices[0]).toBe(1);
  useStudioStore.getState().duplicateFrame(0);
  const duplicated = useStudioStore.getState(), newFrameId = duplicated.frames[1].id;
  expect(() => indexSemanticPixels(pixel, 1, 1, duplicated.palettes[0], newFrameId)).toThrow('duplicate palette registers');
  console.log('DUPLICATE_REGISTER_BINDING', JSON.stringify({ frameId, newFrameId, bindings: duplicated.palettes[0].semantics!.bindings }));
});
