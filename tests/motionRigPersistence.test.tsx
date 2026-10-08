// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, act } from '@testing-library/react';
import { makeCanvas } from './helpers/mockCanvas';
import { useStudioStore } from '@/stores/studioStore';
import { useViewportDrawing } from '@/hooks/viewport/useViewportDrawing';
import * as registry from '@/lib/engine/bufferRegistry';
import { setGlobalHistoryEngine, getGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { captureMotionPart, resolveMotionSource } from '@/lib/animation/pixiMotion';
import { saveMotionRig, openMotionRig, deleteMotionRig } from '@/lib/animation/motionRigWorkspace';
import { parseMotionRigs, type MotionRig } from '@/lib/animation/motionRigDocument';
import { validateProjectFile } from '@/lib/project/schema';
import { createBlankProjectFile, db, autoSaveWorkspaceDetailed, getProjectById, duplicateProject, renameProject } from '@/lib/storage/db';
import { buildProjectFile, buildProjectFileAsync, buildAutosavePayloadAsync } from '@/lib/project/serialize';
import { PROJECT_FORMAT_VERSION } from '@/types/project';
import { getMemoryBudgetUsage } from '@/lib/safety/memoryBudget';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';

function definition(): MotionRig {
  return { version: 1, id: 'rig-one', name: 'Wave', part: { id: 'part-one', sourceFrameId: 'frame-one', sourceLayerId: 'layer-one', width: 32, height: 32,
    sourceSha256: 'a'.repeat(64), bounds: { x: 4, y: 4, w: 3, h: 3 }, pivot: { x: 5, y: 5 },
    startPose: { translationX: 0, translationY: 0, rotation: 0 }, endPose: { translationX: 4, translationY: 0, rotation: 0 }, frameCount: 3, easing: 'linear', maskRuns: [[0, 2], [4, 2]] } };
}

describe('motion document admission and migrations', () => {
  it('loads legacy versions without inventing a rig and retains supported definitions independently', () => {
    for (const version of [1, 2, 3, 4]) {
      const result = validateProjectFile({ ...createBlankProjectFile('Legacy', 32, 32), version });
      expect(result.ok).toBe(true); if (result.ok) { expect(result.value.version).toBe(PROJECT_FORMAT_VERSION); expect(result.value.motionRigs).toEqual([]); }
    }
    const rig = definition(), result = validateProjectFile({ ...createBlankProjectFile('Motion', 32, 32), motionRigs: [rig] });
    expect(result.ok).toBe(true); if (result.ok) { expect(result.value.motionRigs).toEqual([rig]); expect(result.value.motionRigs![0]).not.toBe(rig); }
  });
  it.each([
    ['unknown rig version', (r: MotionRig) => Object.assign(r, { version: 2 })],
    ['unknown field', (r: MotionRig) => Object.assign(r.part, { parents: ['future'] })],
    ['nonfinite pose', (r: MotionRig) => { r.part.endPose.rotation = Infinity; }],
    ['outside bounds', (r: MotionRig) => { r.part.bounds.w = 999; }],
    ['overlapping mask', (r: MotionRig) => { r.part.maskRuns = [[0, 4], [2, 2]]; }],
    ['oversized mask', (r: MotionRig) => { r.part.maskRuns = [[0, 10]]; }],
    ['fractional mask', (r: MotionRig) => { r.part.maskRuns = [[0.1, 1]]; }],
    ['empty mask', (r: MotionRig) => { r.part.maskRuns = []; }],
    ['bad digest', (r: MotionRig) => { r.part.sourceSha256 = 'invalid'; }],
    ['empty name', (r: MotionRig) => { r.name = ' '; }],
    ['too many frames', (r: MotionRig) => { r.part.frameCount = 31; }],
  ])('refuses %s before hydration', (_name, mutate) => {
    const rig = definition(); mutate(rig);
    expect(validateProjectFile({ ...createBlankProjectFile('Invalid', 32, 32), motionRigs: [rig] }).ok).toBe(false);
  });
  it('refuses duplicate rig/part IDs, future project formats and oversized libraries', () => {
    const rig = definition(); expect(parseMotionRigs([rig, rig])).toBeNull();
    expect(parseMotionRigs([rig, { ...rig, id: 'different' }])).toBeNull();
    expect(parseMotionRigs(Array.from({ length: 17 }, (_, i) => ({ ...rig, id: `r${i}`, part: { ...rig.part, id: `p${i}` } })))).toBeNull();
    expect(validateProjectFile({ ...createBlankProjectFile('Future', 32, 32), version: PROJECT_FORMAT_VERSION + 1 }).ok).toBe(false);
  });
});

describe('saved motion source restoration and persistence', () => {
  let drawing: ReturnType<typeof useViewportDrawing>;
  beforeEach(() => {
    const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      let ctx = contexts.get(this);
      if (!ctx) { ctx = makeCanvas(this.width || 32, this.height || 32).getContext('2d')!; contexts.set(this, ctx); }
      return ctx;
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,iVBORw0KGgo=');
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['png'], { type: 'image/png' })));
    registry.clearAllBuffers(); setGlobalHistoryEngine(null); useStudioStore.getState().resetToNewProject('rig-project');
    drawing = renderHook(() => useViewportDrawing({ canvasWidth: 32, canvasHeight: 32, getOrCreateLayerCanvas: id => registry.getOrCreateBuffer(id, 32, 32).canvas, renderComposite: vi.fn() })).result.current;
  });
  afterEach(() => { cleanup(); registry.clearAllBuffers(); setGlobalHistoryEngine(null); vi.restoreAllMocks(); });
  async function save(masked = false) {
    const state = useStudioStore.getState(), entry = registry.getOrCreateBuffer(state.activeLayerId, 32, 32);
    entry.ctx.fillStyle = '#ff0000'; entry.ctx.fillRect(4, 4, 3, 3); registry.touchBuffer(state.activeLayerId);
    const mask = masked ? new Uint8Array(1024) : null;
    if (mask) { mask[4 * 32 + 4] = 1; mask[5 * 32 + 5] = 1; }
    const part = captureMotionPart({ canvasWidth: 32, canvasHeight: 32, activeFrameIndex: 0, activeLayerId: state.activeLayerId, frames: state.frames, selection: { x: 4, y: 4, w: 3, h: 3 }, selectionMask: mask, layerCanvas: entry.canvas })!;
    useStudioStore.getState().setMotionPart({ ...part, endPose: { translationX: 4, translationY: 0, rotation: 0 }, frameCount: 3, easing: 'linear' });
    expect(await saveMotionRig('Wave')).toEqual({ ok: true });
    const rig = useStudioStore.getState().motionRigs[0]; useStudioStore.getState().clearMotionPart(); return rig;
  }
  it('opens the source cel and end pose atomically even when a store observer fails', async () => {
    const rig = await save(); useStudioStore.getState().addFrame();
    useStudioStore.setState({ motionActivePose: 'start', isPlaying: true });
    const report = vi.spyOn(console, 'error').mockImplementation(() => {});
    const stop = useStudioStore.subscribe(() => { throw new Error('Injected opening observer'); });
    try {
      expect(await openMotionRig(rig.id)).toEqual({ ok: true });
      const state = useStudioStore.getState();
      expect(state.activeFrameIndex).toBe(0); expect(state.activeLayerId).toBe(rig.part.sourceLayerId);
      expect(state.motionActivePose).toBe('end'); expect(state.isPlaying).toBe(false);
      expect(state.motionPart!.id).toBe(rig.part.id); expect(report).toHaveBeenCalled();
    } finally { stop(); }
  });
  it('refuses saved-rig opening while the viewport owns a floating selection', async () => {
    const rig = await save(); useStudioStore.setState({ hasFloatingSelection: true });
    const before = useStudioStore.getState(), buffers = registry.snapshotBuffers();
    expect(await openMotionRig(rig.id)).toMatchObject({ ok: false, reason: expect.stringMatching(/floating selection/) });
    expect(useStudioStore.getState()).toBe(before); expect(registry.snapshotBuffers()).toEqual(buffers);
  });
  it('reconstructs an exact masked part with stable IDs and fresh registered source versions', async () => {
    const rig = await save(true), state = useStudioStore.getState(), original = registry.snapshotBuffers().get(state.activeLayerId)!;
    const replacement = registry.createEntry(32, 32); replacement.ctx.putImageData(original.ctx.getImageData(0, 0, 32, 32), 0, 0); registry.replaceAllBuffers(new Map([[state.activeLayerId, replacement]]));
    useStudioStore.getState().loadProjectState({ ...createBlankProjectFile('Reopen', 32, 32), frames: state.frames, motionRigs: [rig] }, 'new-project-copy');
    expect(await openMotionRig(rig.id)).toEqual({ ok: true });
    const part = useStudioStore.getState().motionPart!;
    expect(part.id).toBe(rig.part.id); expect(part.sourceVersion.projectId).toBe('new-project-copy'); expect(part.sourceVersion.generation).toBe(replacement.generation);
    expect(part.endPose).toEqual(rig.part.endPose); expect(part.mask![4 * 32 + 4]).toBe(1); expect(part.mask![4 * 32 + 5]).toBe(0);
    expect(Array.from(part.raster.data).filter((v, i) => i % 4 === 3 && v > 0)).toHaveLength(2); expect(resolveMotionSource(part).ok).toBe(true);
  });
  it.each(['pixels', 'missing-layer', 'missing-frame', 'missing-buffer', 'locked', 'dimensions'] as const)('refuses %s without creating buffers or activating a part', async kind => {
    const rig = await save(), state = useStudioStore.getState();
    if (kind === 'pixels') { registry.snapshotBuffers().get(state.activeLayerId)!.ctx.clearRect(0, 0, 32, 32); registry.touchBuffer(state.activeLayerId); }
    if (kind === 'missing-layer') useStudioStore.setState({ frames: state.frames.map(f => ({ ...f, layers: [] })) });
    if (kind === 'missing-frame') useStudioStore.setState({ frames: [] });
    if (kind === 'missing-buffer') registry.clearAllBuffers();
    if (kind === 'locked') useStudioStore.getState().toggleLayerLock(state.activeLayerId);
    if (kind === 'dimensions') useStudioStore.setState({ canvasWidth: 64 });
    const buffers = registry.snapshotBuffers(), before = useStudioStore.getState();
    expect((await openMotionRig(rig.id)).ok).toBe(false); expect(useStudioStore.getState()).toBe(before); expect(registry.snapshotBuffers()).toEqual(buffers);
  });
  it('does not infer source correspondence from names or an active copied cel', async () => {
    const rig = await save(), state = useStudioStore.getState(); useStudioStore.getState().duplicateFrame(0);
    expect(await openMotionRig(rig.id)).toEqual({ ok: true }); expect(useStudioStore.getState().motionPart!.sourceLayerId).toBe(state.activeLayerId);
    useStudioStore.getState().clearMotionPart(); useStudioStore.getState().deleteFrame(0);
    expect((await openMotionRig(rig.id)).ok).toBe(false);
  });
  it('updates a saved part in place and library edits undo/redo without touching pixels', async () => {
    const rig = await save(); expect(await openMotionRig(rig.id)).toEqual({ ok: true });
    useStudioStore.getState().updateMotionPose('end', { translationX: 7 }); expect(await saveMotionRig('Revised')).toEqual({ ok: true });
    expect(useStudioStore.getState().motionRigs).toHaveLength(1); expect(useStudioStore.getState().motionRigs[0].id).toBe(rig.id);
    act(() => { deleteMotionRig(rig.id); }); expect(useStudioStore.getState().motionRigs).toHaveLength(0);
    // Parameter Undo owns the active session; leave it to use document/library history.
    act(() => { useStudioStore.getState().clearMotionPart(); });
    act(() => { drawing.performUndo(); });
    expect(useStudioStore.getState().motionRigs[0].name).toBe('Revised');
    act(() => { drawing.performRedo(); });
    expect(useStudioStore.getState().motionRigs).toHaveLength(0); expect(getGlobalHistoryEngine()!.depth).toBe(3);
  });
  it('refuses a late fingerprint after project switch and releases memory ownership', async () => {
    await save(); const rig = useStudioStore.getState().motionRigs[0], reserved = getMemoryBudgetUsage().reservedBytes;
    const pending = openMotionRig(rig.id); useStudioStore.getState().resetToNewProject('other');
    expect((await pending).ok).toBe(false); expect(useStudioStore.getState().motionPart).toBeNull(); expect(useStudioStore.getState().motionRigs).toEqual([]);
    expect(getMemoryBudgetUsage().reservedBytes).toBe(reserved);
  });
  it('refuses a source edit during fingerprint computation even without store notification', async () => {
    const rig = await save(), state = useStudioStore.getState();
    const pending = openMotionRig(rig.id); registry.touchBuffer(state.activeLayerId);
    expect((await pending).ok).toBe(false); expect(useStudioStore.getState().motionPart).toBeNull();
  });
  it('does not save an old session after settings change or project switch during hashing', async () => {
    const rig = await save(); await openMotionRig(rig.id);
    const pending = saveMotionRig('Late update'); useStudioStore.getState().updateMotionPose('end', { translationX: 9 });
    expect((await pending).ok).toBe(false); expect(useStudioStore.getState().motionRigs[0].name).toBe('Wave');
    const next = saveMotionRig('Cross-project'); useStudioStore.getState().resetToNewProject('other');
    expect((await next).ok).toBe(false); expect(useStudioStore.getState().motionRigs).toEqual([]);
  });
  it('refuses a removed rig while opening and preserves the current active session', async () => {
    const rig = await save(), pending = openMotionRig(rig.id); deleteMotionRig(rig.id);
    expect((await pending).ok).toBe(false); expect(useStudioStore.getState().motionPart).toBeNull();
    const second = await save(); await openMotionRig(second.id);
    const active = useStudioStore.getState().motionPart;
    expect((await openMotionRig(second.id)).ok).toBe(false); expect(useStudioStore.getState().motionPart).toBe(active);
  });
  it('refuses malformed direct hydration before changing any session metadata', () => {
    const before = useStudioStore.getState(), rig = definition(); Object.assign(rig, { version: 2 });
    expect(() => before.loadProjectState({ motionRigs: [rig] })).toThrow(/unsupported/); expect(useStudioStore.getState()).toBe(before);
  });
  it('rolls back library and history together after an injected publication failure', async () => {
    const rig = await save(), before = useStudioStore.getState(), depth = getGlobalHistoryEngine()!.depth;
    const original = useStudioStore.setState;
    vi.spyOn(useStudioStore, 'setState').mockImplementationOnce((...args: Parameters<typeof original>) => { original(...args); throw new Error('Injected publication failure'); });
    expect(deleteMotionRig(rig.id).ok).toBe(false); expect(useStudioStore.getState()).toBe(before); expect(getGlobalHistoryEngine()!.depth).toBe(depth);
  });
  it('refuses motion library edits in co-draw without changing the workspace', async () => {
    const rig = await save(), before = useStudioStore.getState();
    vi.spyOn(coDrawBridge, 'getRole').mockReturnValue('host');
    expect((await openMotionRig(rig.id)).ok).toBe(false); expect((await saveMotionRig('Shared')).ok).toBe(false); expect(deleteMotionRig(rig.id).ok).toBe(false);
    expect(useStudioStore.getState()).toBe(before);
  });
  it('includes independent definitions in synchronous, asynchronous and autosave snapshots', async () => {
    const rig = await save(); const snapshots = [buildProjectFile(), await buildProjectFileAsync(), (await buildAutosavePayloadAsync()).project];
    for (const file of snapshots) { expect(file.version).toBe(4); expect(file.motionRigs).toEqual([rig]); expect(file.motionRigs![0]).not.toBe(rig); }
    useStudioStore.getState().resetToNewProject(); expect(useStudioStore.getState().motionRigs).toEqual([]);
    useStudioStore.getState().loadProjectState(snapshots[0]); expect(useStudioStore.getState().motionRigs).toEqual([rig]); expect(useStudioStore.getState().motionPart).toBeNull();
  });
  it('retains definitions through database validation, rename and gallery duplication', async () => {
    const rig = await save(); await db.projects.clear(); await db.layerBlobs.clear();
    const file = buildProjectFile(); expect((await autoSaveWorkspaceDetailed('rig-db', file)).ok).toBe(true);
    await renameProject('rig-db', 'Renamed motion');
    expect(JSON.parse((await getProjectById('rig-db'))!.dataJson).motionRigs).toEqual([rig]);
    const copy = await duplicateProject('rig-db', 'Copied motion'); expect(copy).not.toBeNull();
    const data = JSON.parse((await getProjectById(copy!.id))!.dataJson); expect(data.motionRigs).toEqual([rig]); expect(data.name).toBe('Copied motion');
    await db.projects.clear(); await db.layerBlobs.clear();
  });
});
