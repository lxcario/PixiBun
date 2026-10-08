// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudioStore } from '@/stores/studioStore';
import {
  preparePractice, beginPractice, discardPractice, keepPractice, getPracticeSession,
} from '@/lib/project/practiceSession';
import { registerStudioRouteSession, getStudioResume, PRACTICE_RETURN_KEY, type StudioResume } from '@/lib/project/studioRouteSession';
import { createHistoryEngine, rememberViewportHistory, readViewportHistory, forgetViewportHistory, setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { replaceAllBuffers, snapshotBuffers, clearAllBuffers, type BufferEntry } from '@/lib/engine/bufferRegistry';
import { DesktopFileSystem } from '@/lib/storage/desktopFileSystem';
import { getMemoryBudgetUsage } from '@/lib/safety/memoryBudget';
import type { ProjectFile } from '@/types/project';

const mocks = vi.hoisted(() => ({ save: vi.fn(), payload: vi.fn(), role: vi.fn(), start: vi.fn() }));
vi.mock('@/lib/storage/db', () => ({ autoSaveWorkspaceDetailed: mocks.save, getLatestStoredProjectId: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/project/serialize', () => ({ buildAutosavePayloadAsync: mocks.payload, generateCompositeThumbnail: () => 'thumbnail' }));
vi.mock('@/lib/sync/coDrawBridge', () => ({ coDrawBridge: { getRole: mocks.role } }));
vi.mock('@/stores/onboardingStore', () => ({ useOnboardingStore: {
  getState: () => ({ startPlayground: mocks.start }), setState: vi.fn(),
} }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function entry(marker: number): BufferEntry {
  return { canvas: { width: 2, height: 2 } as HTMLCanvasElement,
    ctx: { marker } as unknown as CanvasRenderingContext2D, contentRevision: marker, generation: marker };
}
describe('isolated practice sessions', () => {
  let originalId: string;
  let originalBuffer: BufferEntry;
  let checkpoint: ReturnType<typeof vi.fn<() => Promise<StudioResume>>>;
  let sequence = 0;
  const originalHistory = createHistoryEngine();
  const image = { width: 1, height: 1, data: new Uint8ClampedArray([20, 30, 40, 80]), colorSpace: 'srgb' } as ImageData;
  const payload = () => ({
    project: { name: 'Practice Drawing', width: 32, height: 32, fps: 8 } as ProjectFile,
    layerBlobs: [], capturedRevisions: new Map(), dirtyLayerCount: 0, totalLayerCount: 1,
  });
  beforeEach(() => {
    vi.clearAllMocks();
    originalId = 'original-' + ++sequence;
    useStudioStore.setState({ ...useStudioStore.getInitialState(), currentProjectId: originalId,
      projectName: 'My warm drawing', canvasWidth: 2, canvasHeight: 2, fps: 17,
      motionRigs: [{ version: 1, id: 'original-rig', name: 'Original motion', part: {
        id: 'original-part', sourceFrameId: 'original-frame', sourceLayerId: 'original-layer', width: 2, height: 2, sourceSha256: 'a'.repeat(64),
        bounds: { x: 0, y: 0, w: 1, h: 1 }, pivot: { x: 0, y: 0 }, startPose: { translationX: 0, translationY: 0, rotation: 0 },
        endPose: { translationX: 1, translationY: 0, rotation: 0 }, frameCount: 3, easing: 'linear', maskRuns: null,
      } }],
      frames: [{ id: 'original-frame', durationMs: 213, layers: [{
        id: 'original-layer', name: 'Eye details', visible: true, locked: true, opacity: 0.75, blendMode: 'multiply',
      }] }], activeLayerId: 'original-layer', activeFrameIndex: 0, canUndo: true, canRedo: true, isDirty: true,
    }, true);
    originalBuffer = entry(7);
    replaceAllBuffers(new Map([['original-layer', originalBuffer]]));
    originalHistory.clear();
    originalHistory.push({ type: 'pixel', description: 'First', frameIndex: 0, layerId: 'original-layer', imageData: image });
    originalHistory.push({ type: 'pixel', description: 'Second', frameIndex: 0, layerId: 'original-layer', imageData: image });
    originalHistory.undo({ type: 'pixel', description: 'Redo pixels', frameIndex: 0, layerId: 'original-layer', imageData: image });
    rememberViewportHistory(originalId, originalHistory);
    setGlobalHistoryEngine(null);
    DesktopFileSystem.restoreAssociation({ handle: { name: 'my-art.pixibun' } as FileSystemFileHandle, projectId: originalId, filename: 'my-art.pixibun' });
    const resume = () => ({
      projectId: originalId, storageVersions: new Map([[originalId, 'original-version']]),
      lifecycle: { phase: 'active' as const, projectId: originalId }, conflictProjectId: null,
    });
    checkpoint = vi.fn(async () => { useStudioStore.getState().markClean(); return resume(); });
    registerStudioRouteSession({ projectId: originalId, checkpoint, resume });
    mocks.role.mockReturnValue(null);
    mocks.save.mockResolvedValue({ ok: true, status: 'saved', storageVersion: 'practice-version' });
    mocks.payload.mockImplementation(async () => payload());
    sessionStorage.clear();
  });
  afterEach(() => {
    const session = getPracticeSession();
    if (session) discardPractice(session.token);
    clearAllBuffers(); setGlobalHistoryEngine(null); forgetViewportHistory(); DesktopFileSystem.reset();
    vi.restoreAllMocks(); vi.unstubAllGlobals();
  });

  it('preserves exact original metadata, raster identity, undo/redo and native association on exit', async () => {
    const prepared = await preparePractice();
    const original = useStudioStore.getState();
    const file = DesktopFileSystem.captureAssociation();
    const session = beginPractice(prepared);
    expect(useStudioStore.getState().currentProjectId).not.toBe(originalId);
    expect(useStudioStore.getState().motionRigs).toEqual([]);
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(snapshotBuffers().has('original-layer')).toBe(false);
    expect(DesktopFileSystem.getActiveHandle()).toBeNull();
    expect(getMemoryBudgetUsage().retained.suspendedRasters).toBe(16);
    const practiceHistory = createHistoryEngine();
    practiceHistory.push({ type: 'pixel', description: 'Practice', frameIndex: 0, layerId: 'practice-layer', imageData: image });
    setGlobalHistoryEngine(practiceHistory);
    expect(getMemoryBudgetUsage().retained.history).toBe(originalHistory.totalBytes + practiceHistory.totalBytes);
    replaceAllBuffers(new Map([['practice-layer', entry(50)]]));
    useStudioStore.setState({ canvasWidth: 16, canvasHeight: 16, fps: 10, projectName: 'Changed lesson' });
    discardPractice(session.token);
    expect(useStudioStore.getState()).toEqual(original);
    expect(snapshotBuffers().get('original-layer')).toBe(originalBuffer);
    expect(originalBuffer.contentRevision).toBe(7);
    expect(readViewportHistory(originalId)).toBe(originalHistory);
    expect(originalHistory.depth).toBe(1);
    expect(originalHistory.redoDepth).toBe(1);
    expect(DesktopFileSystem.captureAssociation()).toEqual(file);
    expect(getMemoryBudgetUsage().retained.suspendedRasters).toBe(0);
    expect(getStudioResume(originalId)?.storageVersions.get(originalId)).toBe('original-version');
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('leaves unsaved pixels and history in place when the checkpoint fails', async () => {
    checkpoint.mockRejectedValueOnce(new Error('Disk quota refused the save'));
    const original = useStudioStore.getState();
    await expect(preparePractice()).rejects.toThrow('Disk quota');
    expect(getPracticeSession()).toBeNull();
    expect(useStudioStore.getState()).toBe(original);
    expect(snapshotBuffers().get('original-layer')).toBe(originalBuffer);
    expect(originalHistory.redoDepth).toBe(1);
    expect(getStudioResume(originalId)?.error).toContain('Disk quota');
  });

  it('blocks co-draw without changing the original workspace', async () => {
    mocks.role.mockReturnValue('host');
    await expect(preparePractice()).rejects.toThrow('co-draw');
    expect(checkpoint).not.toHaveBeenCalled();
    expect(snapshotBuffers().get('original-layer')).toBe(originalBuffer);
    expect(getStudioResume(originalId)?.projectId).toBe(originalId);
  });

  it('refuses changed metadata between checkpoint and entry', async () => {
    const prepared = await preparePractice();
    useStudioStore.getState().setDirty(true);
    expect(() => beginPractice(prepared)).toThrow('changed');
    expect(snapshotBuffers().get('original-layer')).toBe(originalBuffer);
    expect(getPracticeSession()).toBeNull();
  });

  it('fails before detaching artwork when the refresh checkpoint cannot be stored', async () => {
    const prepared = await preparePractice();
    vi.stubGlobal('sessionStorage', { setItem: () => { throw new Error('Session storage blocked'); } });
    expect(() => beginPractice(prepared)).toThrow('blocked');
    expect(snapshotBuffers().get('original-layer')).toBe(originalBuffer);
    expect(useStudioStore.getState().currentProjectId).toBe(originalId);
  });

  it('keeps a failed adoption in practice and can still restore the original', async () => {
    const session = beginPractice(await preparePractice());
    mocks.save.mockResolvedValueOnce({ ok: false, reason: 'quota-exceeded', error: 'Quota' });
    await expect(keepPractice(session.token)).rejects.toThrow('Quota');
    expect(getPracticeSession()?.token).toBe(session.token);
    expect(sessionStorage.getItem(PRACTICE_RETURN_KEY)).toBe(originalId);
    discardPractice(session.token);
    expect(snapshotBuffers().get('original-layer')).toBe(originalBuffer);
  });

  it('rejects edits during encoding before writing or marking them clean', async () => {
    const session = beginPractice(await preparePractice());
    const held = deferred<ReturnType<typeof payload>>();
    mocks.payload.mockReturnValueOnce(held.promise);
    const keeping = keepPractice(session.token);
    useStudioStore.getState().setDirty(true);
    held.resolve(payload());
    await expect(keeping).rejects.toThrow('changed while encoding');
    expect(mocks.save).not.toHaveBeenCalled();
    expect(useStudioStore.getState().isDirty).toBe(true);
  });

  it('does not publish a pending adoption after exit', async () => {
    const session = beginPractice(await preparePractice());
    const held = deferred<{ ok: true; storageVersion: string }>();
    mocks.save.mockReturnValueOnce(held.promise);
    const keeping = keepPractice(session.token);
    await vi.waitFor(() => expect(mocks.save).toHaveBeenCalled());
    discardPractice(session.token);
    held.resolve({ ok: true, storageVersion: 'cancelled-copy' });
    await expect(keeping).rejects.toThrow('closed');
    expect(useStudioStore.getState().currentProjectId).toBe(originalId);
    expect(snapshotBuffers().get('original-layer')).toBe(originalBuffer);
    expect(sessionStorage.getItem(PRACTICE_RETURN_KEY)).toBe(originalId);
  });

  it('restores the original after lesson initialization throws', async () => {
    const prepared = await preparePractice();
    const original = useStudioStore.getState();
    mocks.start.mockImplementationOnce(() => { throw new Error('Lesson initialization failed'); });
    expect(() => beginPractice(prepared)).toThrow('initialization');
    expect(useStudioStore.getState()).toEqual(original);
    expect(snapshotBuffers().get('original-layer')).toBe(originalBuffer);
    expect(DesktopFileSystem.getActiveHandle()?.name).toBe('my-art.pixibun');
    expect(readViewportHistory(originalId)).toBe(originalHistory);
    expect(getPracticeSession()).toBeNull();
  });

  it('waits for the original checkpoint before detaching any artwork', async () => {
    const held = deferred<StudioResume>();
    checkpoint.mockImplementationOnce(() => held.promise);
    const preparing = preparePractice();
    await Promise.resolve();
    expect(useStudioStore.getState().currentProjectId).toBe(originalId);
    expect(snapshotBuffers().get('original-layer')).toBe(originalBuffer);
    expect(getPracticeSession()).toBeNull();
    expect(getStudioResume(originalId)?.checkpoint).toBeDefined();
    held.resolve({ projectId: originalId, storageVersions: new Map([[originalId, 'original-version']]),
      lifecycle: { phase: 'active', projectId: originalId }, conflictProjectId: null });
    await preparing;
  });

  it('preserves edits during a completed write and retries against its confirmed version', async () => {
    const session = beginPractice(await preparePractice());
    const held = deferred<{ ok: true; storageVersion: string }>();
    mocks.save.mockReturnValueOnce(held.promise);
    const keeping = keepPractice(session.token);
    await vi.waitFor(() => expect(mocks.save).toHaveBeenCalled());
    useStudioStore.getState().setDirty(true);
    held.resolve({ ok: true, storageVersion: 'first-copy-version' });
    await expect(keeping).rejects.toThrow('changed while saving');
    expect(useStudioStore.getState().isDirty).toBe(true);
    expect(getPracticeSession()?.token).toBe(session.token);
    await keepPractice(session.token);
    expect(mocks.save.mock.calls[1][5]).toBe('first-copy-version');
  });

  it('saves only an explicitly kept new identity and retains practice undo for Studio', async () => {
    const session = beginPractice(await preparePractice());
    const practiceHistory = createHistoryEngine();
    setGlobalHistoryEngine(practiceHistory);
    const practiceBuffer = entry(11);
    replaceAllBuffers(new Map([['practice-layer', practiceBuffer]]));
    await keepPractice(session.token);
    expect(mocks.save.mock.calls[0][0]).toBe(session.projectId);
    expect(mocks.save.mock.calls[0][5]).toBeNull();
    expect(session.projectId).not.toBe(originalId);
    expect(getPracticeSession()).toBeNull();
    expect(useStudioStore.getState().currentProjectId).toBe(session.projectId);
    expect(useStudioStore.getState().isDirty).toBe(false);
    expect(snapshotBuffers().get('practice-layer')).toBe(practiceBuffer);
    expect(readViewportHistory(session.projectId)).toBe(practiceHistory);
    expect(getStudioResume(session.projectId)?.storageVersions.get(session.projectId)).toBe('practice-version');
    expect(sessionStorage.getItem(PRACTICE_RETURN_KEY)).toBeNull();
    expect(DesktopFileSystem.getActiveHandle()).toBeNull();
  });
});
