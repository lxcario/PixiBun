// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { makeCanvas } from './helpers/mockCanvas';
import { useStudioStore } from '@/stores/studioStore';
import { captureMotionPart, bakeMotionToTimeline, resolveMotionSource, type MotionPartSettings } from '@/lib/animation/pixiMotion';
import * as registry from '@/lib/engine/bufferRegistry';
import * as rotation from '@/lib/canvas/rotSprite';
import { getGlobalHistoryEngine, setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { COMBINED_MEMORY_LIMIT_BYTES, getMemoryBudgetUsage, reserveMemory } from '@/lib/safety/memoryBudget';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import { PixiMotionPanel } from '@/components/layout/inspector/PixiMotionPanel';
import { PixiMotionGizmo } from '@/components/studio/PixiMotionGizmo';
import { useViewportSelectionTransform } from '@/hooks/viewport/useViewportSelectionTransform';
import { useViewportSelection } from '@/hooks/viewport/useViewportSelection';
import { defaultPaletteSemantics, MAX_PALETTE_BINDINGS } from '@/lib/color/paletteSemantics';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';

function capture() {
  const state = useStudioStore.getState();
  const entry = registry.getOrCreateBuffer(state.activeLayerId, 32, 32);
  entry.ctx.fillStyle = '#ff0000'; entry.ctx.fillRect(4, 4, 3, 3);
  registry.touchBuffer(state.activeLayerId);
  const part = captureMotionPart({ canvasWidth: 32, canvasHeight: 32,
    activeFrameIndex: state.activeFrameIndex, activeLayerId: state.activeLayerId,
    frames: state.frames, selection: { x: 4, y: 4, w: 3, h: 3 }, selectionMask: null, layerCanvas: entry.canvas });
  expect(part).not.toBeNull();
  return part!;
}
function checkpoint() {
  return { state: useStudioStore.getState(), buffers: registry.snapshotBuffers(),
    pixels: [...registry.snapshotBuffers()].map(([id, entry]) => [id, Array.from(entry.ctx.getImageData(0, 0, 32, 32).data)]),
    depth: getGlobalHistoryEngine()!.depth, reserved: getMemoryBudgetUsage().reservedBytes };
}
function expectUnchanged(before: ReturnType<typeof checkpoint>) {
  expect(useStudioStore.getState()).toBe(before.state);
  expect(registry.snapshotBuffers()).toEqual(before.buffers);
  expect(checkpoint().pixels).toEqual(before.pixels);
  expect(getGlobalHistoryEngine()!.depth).toBe(before.depth);
  expect(getMemoryBudgetUsage().reservedBytes).toBe(before.reserved);
}

describe('PixiMotion source identity and stale artwork protection', () => {
  let drawing: ReturnType<typeof useViewportDrawing>;
  it('refuses movement with dependent derived layers before rendering or publishing history', () => {
    const part = capture(); part.endPose.translationX = 2;
    useStudioStore.getState().addLayer('Derived output');
    useStudioStore.setState(state => { state.frames[0].layers[0].research = {
      version: 1, name: 'Derived output', width: 32, height: 32,
      source: { frameId: part.sourceFrameId, layerId: part.sourceLayerId, sha256: '0'.repeat(64) },
      settings: { kind: 'pixelize', block: 4, candidate: 'average', colors: ['#000000', '#ffffff'], protected: [] },
    }; });
    const before = checkpoint(), render = vi.spyOn(rotation, 'rotSprite');
    expect(bakeMotionToTimeline(part)).toMatchObject({ ok: false, reason: expect.stringMatching(/dependent derived layers/) });
    expect(render).not.toHaveBeenCalled(); expectUnchanged(before);
  });
  it('bakes a legitimately unallocated empty sibling without inventing or losing its pixels', () => {
    const part = capture(); part.frameCount = 3; part.endPose.translationX = 2;
    useStudioStore.getState().addLayer('Empty sibling');
    const emptyId = useStudioStore.getState().activeLayerId;
    registry.deleteBuffers([emptyId]);
    expect(bakeMotionToTimeline(part).ok).toBe(true);
    for (const frame of useStudioStore.getState().frames.slice(1)) {
      const id = frame.layers.find(layer => layer.name === 'Empty sibling')!.id;
      expect(registry.snapshotBuffers().get(id)!.ctx.getImageData(0, 0, 32, 32).data.every(byte => byte === 0)).toBe(true);
    }
  });
  it.each(['normal', 'normal-map'] as const)('refuses movement with a %s sibling and keeps original artwork visible', tag => {
    const part = capture(); part.endPose.rotation = .2;
    useStudioStore.getState().addLayer('Normals', tag);
    const before = checkpoint();
    expect(resolveMotionSource(part)).toMatchObject({ ok: false, reason: expect.stringMatching(/normal artwork/) });
    expect(bakeMotionToTimeline(part).ok).toBe(false); expectUnchanged(before);
  });
  it('copies source-frame palette bindings to generated frame IDs and restores them with Undo/Redo', () => {
    const part = capture(); part.frameCount = 3;
    const palette = useStudioStore.getState().palettes[0];
    const semantics = defaultPaletteSemantics(palette);
    semantics.bindings = [{ id: 'region', frameId: part.sourceFrameId, entryId: semantics.entries[0].id, x: 20, y: 20, w: 2, h: 2 }];
    useStudioStore.setState({ palettes: [{ ...palette, semantics }] });
    const before = structuredClone(useStudioStore.getState().palettes);
    expect(bakeMotionToTimeline(part).ok).toBe(true);
    const baked = useStudioStore.getState();
    expect(baked.palettes[0].semantics!.bindings.map(b => b.frameId)).toEqual(baked.frames.map(f => f.id));
    expect(new Set(baked.palettes[0].semantics!.bindings.map(b => b.id)).size).toBe(3);
    const after = structuredClone(baked.palettes);
    act(() => { drawing.performUndo(); });
    expect(useStudioStore.getState().palettes).toEqual(before);
    act(() => { drawing.performRedo(); });
    expect(useStudioStore.getState().palettes).toEqual(after);
  });

  it('refuses binding overflow before rendering or changing the workspace', () => {
    const part = capture(); part.frameCount = 3;
    const palette = useStudioStore.getState().palettes[0], semantics = defaultPaletteSemantics(palette);
    semantics.bindings = Array.from({ length: MAX_PALETTE_BINDINGS - 1 }, (_, i) => ({ id: `b${i}`, frameId: part.sourceFrameId, entryId: semantics.entries[0].id, x: 20, y: 20, w: 1, h: 1 }));
    useStudioStore.setState({ palettes: [{ ...palette, semantics }] });
    const before = checkpoint(), renderer = vi.spyOn(rotation, 'rotSprite');
    expect(bakeMotionToTimeline(part)).toMatchObject({ ok: false, reason: expect.stringMatching(/palette binding limit/) });
    expect(renderer).not.toHaveBeenCalled(); expectUnchanged(before);
  });
  it('accounts retained part pixels and refuses capture before reading pixels when memory is exhausted', () => {
    const part = capture(); useStudioStore.getState().setMotionPart(part);
    expect(getMemoryBudgetUsage().retained.motion).toBe(part.raster.data.byteLength);
    useStudioStore.getState().clearMotionPart(); expect(getMemoryBudgetUsage().retained.motion).toBe(0);
    const state = useStudioStore.getState(), entry = registry.snapshotBuffers().get(state.activeLayerId)!;
    const release = reserveMemory(COMBINED_MEMORY_LIMIT_BYTES - getMemoryBudgetUsage().totalBytes - 1, 'Admission probe');
    const read = vi.spyOn(entry.ctx, 'getImageData');
    try {
      expect(() => captureMotionPart({ canvasWidth: 32, canvasHeight: 32, activeFrameIndex: 0, activeLayerId: state.activeLayerId,
        frames: state.frames, selection: part.bounds, selectionMask: null, layerCanvas: entry.canvas })).toThrow(/Motion capture/);
      expect(read).not.toHaveBeenCalled();
    } finally { release(); }
  });
  it.each(['normal', 'normal-map'] as const)('refuses %s source data instead of rotating its vectors as color pixels', tag => {
    const part = capture(); useStudioStore.setState(state => { state.frames[0].layers[0].tag = tag; });
    const before = checkpoint(); expect(bakeMotionToTimeline(part).reason).toMatch(/color artwork/); expectUnchanged(before);
  });
  it('refuses a color-only bake during co-draw without touching pixels or history', () => {
    const part = capture(), before = checkpoint(); vi.spyOn(coDrawBridge, 'getRole').mockReturnValue('host');
    expect(bakeMotionToTimeline(part)).toMatchObject({ ok: false, reason: expect.stringMatching(/Close co-draw/) }); expectUnchanged(before);
  });

  beforeEach(() => {
    const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      let ctx = contexts.get(this);
      if (!ctx) { ctx = makeCanvas(this.width || 32, this.height || 32).getContext('2d')!; contexts.set(this, ctx); }
      return ctx;
    });
    registry.clearAllBuffers(); setGlobalHistoryEngine(null);
    useStudioStore.getState().resetToNewProject('motion-bindings-project');
    drawing = renderHook(() => useViewportDrawing({ canvasWidth: 32, canvasHeight: 32,
      getOrCreateLayerCanvas: id => registry.getOrCreateBuffer(id, 32, 32).canvas, renderComposite: vi.fn() })).result.current;
  });
  afterEach(() => { cleanup(); registry.clearAllBuffers(); setGlobalHistoryEngine(null); vi.restoreAllMocks(); });

  it('keeps identity through pose/settings changes and ignores attempts to retarget the source', () => {
    const part = capture(); useStudioStore.getState().setMotionPart(part);
    useStudioStore.getState().updateMotionPose('end', { translationX: 4 });
    useStudioStore.getState().updateMotionPart({ pivot: { x: 5, y: 5 }, frameCount: 3,
      id: 'replacement', sourceLayerId: 'other' } as Partial<MotionPartSettings>);
    const updated = useStudioStore.getState().motionPart!;
    expect(updated.id).toBe(part.id); expect(updated.sourceLayerId).toBe(part.sourceLayerId);
    expect(updated.sourceVersion).toEqual(part.sourceVersion); expect(resolveMotionSource(updated).ok).toBe(true);
  });

  it('survives rename, layer reorder and frame reorder without rebinding to an array index', () => {
    const part = capture();
    useStudioStore.getState().addLayer('Accessory');
    useStudioStore.getState().renameLayer(part.sourceLayerId, 'Renamed arm');
    useStudioStore.getState().reorderLayers(1, 0);
    useStudioStore.getState().addFrame();
    useStudioStore.getState().reorderFrames(0, 1);
    const source = resolveMotionSource(part); expect(source.ok).toBe(true);
    if (source.ok) { expect(source.frameIndex).toBe(1); expect(source.layer.name).toBe('Renamed arm'); }
    expect(bakeMotionToTimeline(part).ok).toBe(true);
    expect(useStudioStore.getState().frames[1].id).toBe(part.sourceFrameId);
  });

  it('frame duplication leaves the original binding intact and recapturing the copy gets a fresh identity', () => {
    const original = capture(); const copy = useStudioStore.getState().duplicateFrame(0)!;
    const copied = capture();
    expect(copied.id).not.toBe(original.id); expect(copied.sourceFrameId).toBe(copy.frameId);
    expect(copied.sourceLayerId).not.toBe(original.sourceLayerId);
    expect(resolveMotionSource(original).ok).toBe(true);
  });

  it('layer duplication leaves the original binding intact and never uses matching names as identity', () => {
    const original = capture(); useStudioStore.getState().duplicateLayer(original.sourceLayerId);
    const copied = capture(); expect(copied.id).not.toBe(original.id);
    expect(copied.sourceLayerId).not.toBe(original.sourceLayerId); expect(resolveMotionSource(original).ok).toBe(true);
  });

  it('refuses changed source pixels before rendering, allocation or history publication', () => {
    const part = capture(); const source = registry.getOrCreateBuffer(part.sourceLayerId, 32, 32);
    source.ctx.fillStyle = '#00ff00'; source.ctx.fillRect(4, 4, 1, 1); registry.touchBuffer(part.sourceLayerId);
    const before = checkpoint(); const renderer = vi.spyOn(rotation, 'rotSprite');
    expect(bakeMotionToTimeline(part)).toMatchObject({ ok: false, reason: expect.stringMatching(/artwork changed/) });
    expect(renderer).not.toHaveBeenCalled(); expectUnchanged(before);
  });

  it('does not revive a stale capture after identical pixels are restored', () => {
    const part = capture(); registry.touchBuffer(part.sourceLayerId); registry.touchBuffer(part.sourceLayerId);
    expect(resolveMotionSource(part).ok).toBe(false);
    expect(resolveMotionSource(capture()).ok).toBe(true);
  });

  it('detects replacement ownership even if content revision and pixels match', () => {
    const part = capture(); const entries = registry.snapshotBuffers(); const old = entries.get(part.sourceLayerId)!;
    const replacement = registry.createEntry(32, 32, old.contentRevision);
    replacement.ctx.drawImage(old.canvas, 0, 0); entries.set(part.sourceLayerId, replacement); registry.replaceAllBuffers(entries);
    const before = checkpoint(); expect(bakeMotionToTimeline(part).ok).toBe(false); expectUnchanged(before);
  });

  it('refuses a missing buffer without allocating an empty source', () => {
    const part = capture(); registry.deleteBuffers([part.sourceLayerId]); const before = checkpoint();
    expect(bakeMotionToTimeline(part).ok).toBe(false); expectUnchanged(before);
    expect(registry.hasBuffer(part.sourceLayerId)).toBe(false);
  });

  it('refuses changed canvas dimensions without resizing the original buffer', () => {
    const part = capture(); useStudioStore.setState({ canvasWidth: 64 }); const before = checkpoint();
    expect(bakeMotionToTimeline(part).reason).toMatch(/canvas size changed/); expectUnchanged(before);
    expect(registry.snapshotBuffers().get(part.sourceLayerId)!.canvas.width).toBe(32);
  });

  it('refuses a different project even if frame and layer IDs are reused', () => {
    const part = capture(); useStudioStore.setState({ currentProjectId: 'another-project' }); const before = checkpoint();
    expect(bakeMotionToTimeline(part).reason).toMatch(/different project/); expectUnchanged(before);
  });

  it('source deletion clears the session; an external old reference cannot bake', () => {
    const part = capture(); useStudioStore.getState().addLayer('Keep'); useStudioStore.getState().setMotionPart(part);
    useStudioStore.getState().deleteLayer(part.sourceLayerId);
    expect(useStudioStore.getState().motionPart).toBeNull(); const before = checkpoint();
    expect(bakeMotionToTimeline(part).reason).toMatch(/source layer no longer exists/); expectUnchanged(before);
  });

  it('source locking refuses bake; unlocking unchanged artwork restores validity', () => {
    const part = capture(); useStudioStore.getState().toggleLayerLock(part.sourceLayerId);
    const before = checkpoint(); expect(bakeMotionToTimeline(part).reason).toMatch(/locked/); expectUnchanged(before);
    useStudioStore.getState().toggleLayerLock(part.sourceLayerId); expect(resolveMotionSource(part).ok).toBe(true);
  });

  it.each([NaN, Infinity, -Infinity])('refuses non-finite pose values (%s) without mutation', value => {
    const part = capture(); part.endPose.rotation = value; const before = checkpoint();
    expect(bakeMotionToTimeline(part).reason).toMatch(/Invalid motion settings/); expectUnchanged(before);
  });

  it('rechecks source ownership after generation, preserving a concurrent source edit', () => {
    const part = capture(); const original = rotation.rotSprite;
    vi.spyOn(rotation, 'rotSprite').mockImplementationOnce((...args) => {
      registry.touchBuffer(part.sourceLayerId); return original(...args);
    });
    const state = useStudioStore.getState(); const depth = getGlobalHistoryEngine()!.depth;
    expect(bakeMotionToTimeline(part).reason).toMatch(/artwork changed/);
    expect(useStudioStore.getState()).toBe(state); expect(getGlobalHistoryEngine()!.depth).toBe(depth);
    expect(registry.snapshotBuffers().size).toBe(1); expect(getMemoryBudgetUsage().reservedBytes).toBe(0);
  });

  it('staging failure preserves original pixels and releases memory reservations', () => {
    const part = capture(); part.startPose.translationX = 3;
    const create = registry.createEntry; let count = 0;
    vi.spyOn(registry, 'createEntry').mockImplementation((...args) => {
      if (++count === 3) throw new Error('Injected third canvas failure'); return create(...args);
    });
    const before = checkpoint(); expect(bakeMotionToTimeline(part).reason).toBe('Injected third canvas failure'); expectUnchanged(before);
  });

  it('bake consumes the part, preserves later clip members, selects a real layer, and Undo restores the previous active cel', () => {
    const part = capture(); part.frameCount = 3; part.startPose.translationX = 1; part.endPose.translationX = 4;
    useStudioStore.getState().addFrame(); useStudioStore.getState().addFrame();
    const beforeFrames = structuredClone(useStudioStore.getState().frames);
    useStudioStore.setState({ clips: [{ id: 'later', name: 'Later', startFrame: 1, endFrame: 2, loopMode: 'forward' }] });
    useStudioStore.getState().setMotionPart(part); const before = checkpoint();
    expect(bakeMotionToTimeline(part).ok).toBe(true); const baked = useStudioStore.getState();
    expect(baked.motionPart).toBeNull(); expect(baked.frames[2].layers.some(l => l.id === baked.activeLayerId)).toBe(true);
    expect(baked.frames.slice(baked.clips[0].startFrame, baked.clips[0].endFrame + 1).map(f => f.id))
      .toEqual(beforeFrames.slice(1).map(f => f.id));
    expect(bakeMotionToTimeline(part).ok).toBe(false);
    const undo = getGlobalHistoryEngine()!.peekUndo()!;
    expect(undo.type).toBe('structural');
    if (undo.type !== 'structural') throw new Error('Expected one structural bake step');
    expect(undo.activeFrameIndex).toBe(before.state.activeFrameIndex);
    expect(undo.activeLayerId).toBe(before.state.activeLayerId);
  });

  it('shows source-change feedback and disables the inspector bake action', () => {
    const part = capture(); useStudioStore.getState().setMotionPart(part); registry.touchBuffer(part.sourceLayerId);
    render(React.createElement(PixiMotionPanel));
    expect(screen.getByRole('status').textContent).toMatch(/source artwork changed/);
    expect((screen.getByRole('button', { name: 'BAKE TO TIMELINE' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('detaches baked target provenance for an identity arc while copied research references follow their own new cel IDs', () => {
    const part = capture(); part.frameCount = 2;
    const recipe = { version: 1 as const, name: 'Original source', width: 32, height: 32,
      settings: { kind: 'pixelize' as const, block: 1, candidate: 'nearest' as const, colors: [], protected: [] },
      source: { frameId: part.sourceFrameId, layerId: part.sourceLayerId, sha256: 'a'.repeat(64) } };
    useStudioStore.setState(state => { state.frames[0].layers[0].research = recipe; });
    useStudioStore.getState().addLayer('Derived');
    const sidecarId = useStudioStore.getState().activeLayerId;
    useStudioStore.setState(state => { state.frames[0].layers.find(l => l.id === sidecarId)!.research = structuredClone(recipe); });
    expect(bakeMotionToTimeline(part).ok).toBe(true);
    const frames = useStudioStore.getState().frames;
    expect(frames[0].layers.find(l => l.id === part.sourceLayerId)!.research).toBeUndefined();
    const copiedSource = frames[1].layers.find(l => l.name === frames[0].layers.find(l => l.id === part.sourceLayerId)!.name)!;
    expect(copiedSource.research).toBeUndefined();
    const copiedSidecar = frames[1].layers.find(l => l.name === 'Derived')!;
    expect(copiedSidecar.research!.source).toEqual({ ...recipe.source, frameId: frames[1].id, layerId: copiedSource.id });
    expect(frames[0].layers.find(l => l.id === sidecarId)!.research!.source).toEqual(recipe.source);
  });

  it('clips partial selections at canvas edges and refuses wholly outside or malformed masks', () => {
    capture(); const state = useStudioStore.getState(); const entry = registry.snapshotBuffers().get(state.activeLayerId)!;
    entry.ctx.fillStyle = '#00ff00'; entry.ctx.fillRect(0, 0, 1, 1); registry.touchBuffer(state.activeLayerId);
    const params = { canvasWidth: 32, canvasHeight: 32, activeFrameIndex: 0, activeLayerId: state.activeLayerId,
      frames: state.frames, selectionMask: null, layerCanvas: entry.canvas };
    const part = captureMotionPart({ ...params, selection: { x: -2, y: -2, w: 3, h: 3 } });
    expect(part!.bounds).toEqual({ x: 0, y: 0, w: 1, h: 1 }); expect(Array.from(part!.raster.data)).toEqual([0, 255, 0, 255]);
    expect(captureMotionPart({ ...params, selection: { x: 33, y: 0, w: 2, h: 2 } })).toBeNull();
    expect(captureMotionPart({ ...params, selection: null, selectionMask: new Uint8Array(5) })).toBeNull();
  });

  it('motion owns canvas arrow keys without lifting the source into the older floating selection', () => {
    const part = capture(); useStudioStore.getState().setMotionPart(part);
    const lift = vi.fn(); const setFloating = vi.fn();
    renderHook(() => useViewportSelectionTransform({ canvasWidth: 32, canvasHeight: 32,
      activeLayerId: part.sourceLayerId, selection: part.bounds, selectionMask: null,
      floatingSelection: null, setFloatingSelection: setFloating, setSelection: vi.fn(),
      getOrCreateLayerCanvas: id => registry.getOrCreateBuffer(id, 32, 32).canvas,
      renderComposite: vi.fn(), captureSnapshot: vi.fn(), commitSnapshot: vi.fn(), bumpBufferVersion: vi.fn(),
      liftSelectionToFloating: lift, commitFloatingSelection: vi.fn() }));
    render(React.createElement(PixiMotionGizmo, { canvasWidth: 32, canvasHeight: 32, zoom: 100,
      motionPart: part, motionActivePose: 'end', motionPreviewIndex: null,
      onUpdatePose: useStudioStore.getState().updateMotionPose, onUpdatePivot: vi.fn(),
      onTogglePose: vi.fn(), onBake: vi.fn(), onCancel: vi.fn() }));
    const before = checkpoint(); act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true })); });
    expect(useStudioStore.getState().motionPart!.endPose.translationX).toBe(1);
    expect(lift).not.toHaveBeenCalled(); expect(setFloating).not.toHaveBeenCalled();
    expect(resolveMotionSource(part).ok).toBe(true); expect(checkpoint().pixels).toEqual(before.pixels);
    expect(getGlobalHistoryEngine()!.depth).toBe(before.depth);
  });

  it('motion shortcuts yield to native buttons, dialogs, composition, modifiers and Tab focus navigation', () => {
    const part = capture(); const bake = vi.fn(); const update = vi.fn(); const cancel = vi.fn(); const toggle = vi.fn();
    render(React.createElement(PixiMotionGizmo, { canvasWidth: 32, canvasHeight: 32, zoom: 100,
      motionPart: part, motionActivePose: 'end', motionPreviewIndex: null,
      onUpdatePose: update, onUpdatePivot: vi.fn(), onTogglePose: toggle, onBake: bake, onCancel: cancel }));
    const button = screen.getByTestId('piximotion-hud-cancel-btn'); button.focus();
    fireEvent.keyDown(button, { key: 'Enter' }); fireEvent.keyDown(button, { key: 'ArrowRight' });
    expect(bake).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled(); button.blur();
    const dialog = document.createElement('dialog'); dialog.setAttribute('open', ''); document.body.append(dialog);
    fireEvent.keyDown(window, { key: 'Escape' }); expect(cancel).not.toHaveBeenCalled(); dialog.remove();
    for (const event of [{ key: 'ArrowRight', ctrlKey: true }, { key: 'ArrowRight', isComposing: true }, { key: 'Tab' }]) {
      expect(fireEvent.keyDown(window, event)).toBe(true);
    }
    expect(update).not.toHaveBeenCalled(); expect(toggle).not.toHaveBeenCalled();
  });

  it('the older selection owner leaves Delete and Cut untouched during a motion session', () => {
    const part = capture(); useStudioStore.getState().setSelection(part.bounds); useStudioStore.getState().setMotionPart(part);
    const commit = vi.fn(); const snapshot = vi.fn();
    renderHook(() => useViewportSelection({ canvasWidth: 32, canvasHeight: 32, activeLayerId: part.sourceLayerId,
      previewCanvasRef: { current: registry.createEntry(32, 32).canvas },
      getOrCreateLayerCanvas: id => registry.getOrCreateBuffer(id, 32, 32).canvas,
      renderComposite: vi.fn(), captureSnapshot: snapshot, commitSnapshot: commit, ownsTransformShortcuts: false }));
    const before = checkpoint(); fireEvent.keyDown(window, { key: 'Delete' }); fireEvent.keyDown(window, { key: 'x', ctrlKey: true });
    expect(snapshot).not.toHaveBeenCalled(); expect(commit).not.toHaveBeenCalled(); expectUnchanged(before);
  });
});
