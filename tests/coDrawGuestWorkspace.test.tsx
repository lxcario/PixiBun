// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudioAutosave } from '@/hooks/studio/useStudioAutosave';
import { useStudioStore } from '@/stores/studioStore';
import { autoSaveWorkspaceDetailed } from '@/lib/storage/db';
import { buildAutosavePayloadAsync, type AutosavePayload } from '@/lib/project/serialize';
import { coDrawBridge, CoDrawBridge } from '@/lib/sync/coDrawBridge';
import { P2PSyncSession, type P2PSyncSessionOptions, type StructurePayload } from '@/lib/sync/p2pSync';
import { DesktopFileSystem } from '@/lib/storage/desktopFileSystem';
import { getOrCreateBuffer, hasBuffer } from '@/lib/engine/bufferRegistry';
import { studioEvents } from '@/lib/events/studioEvents';
import { makeCanvas, FakeImageData } from './helpers/mockCanvas';
import type { ProjectFile, SaveResult } from '@/types/project';

vi.mock('@/lib/storage/db', () => ({
  autoSaveWorkspaceDetailed: vi.fn(), getLatestStoredProjectId: vi.fn().mockResolvedValue(null),
  loadLatestSavedWorkspace: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/lib/project/serialize', () => ({
  buildAutosavePayloadAsync: vi.fn(), generateCompositeThumbnail: vi.fn(), hydrateProject: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}
function callbacks(session: P2PSyncSession): P2PSyncSessionOptions {
  return (session as unknown as { options: P2PSyncSessionOptions }).options;
}
const structure: StructurePayload = {
  width: 2, height: 2,
  frames: [{ id: 'shared-frame', durationMs: 125, layers: [
    { id: 'shared-layer', name: 'Host art', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
  ] }],
};
async function studio() {
  const hook = renderHook(useStudioAutosave);
  await waitFor(() => expect(hook.result.current.lifecycleState.phase).toBe('active'));
  return hook;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  const createElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag, options) =>
    tag === 'canvas' ? makeCanvas(1, 1) : createElement(tag, options));
  vi.stubGlobal('ImageData', FakeImageData);
  coDrawBridge.disconnect();
  useStudioStore.getState().resetToNewProject('original');
  useStudioStore.getState().setProjectName('Original artwork');
  const state = useStudioStore.getState();
  const entry = getOrCreateBuffer(state.activeLayerId, 32, 32);
  entry.ctx.fillStyle = '#ff0000';
  entry.ctx.fillRect(0, 0, 1, 1);
  useStudioStore.getState().setDirty(true);
  vi.mocked(buildAutosavePayloadAsync).mockImplementation(async () => ({
    project: { name: useStudioStore.getState().projectName, width: 32, height: 32, fps: 8 } as ProjectFile,
    layerBlobs: [],
  } as unknown as AutosavePayload));
  vi.mocked(autoSaveWorkspaceDetailed).mockResolvedValue({ ok: true, status: 'saved', storageVersion: 'version' });
  vi.spyOn(P2PSyncSession.prototype, 'acceptHostInvite').mockResolvedValue('answer');
});
afterEach(() => { coDrawBridge.disconnect(); cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Co-draw guest workspace ownership', () => {
  it('checkpoints the original, resets native Save ownership and autosaves host structure separately', async () => {
    const originalLayer = useStudioStore.getState().activeLayerId;
    const association = { handle: {} as FileSystemFileHandle, projectId: 'original', filename: 'original.pixibun' };
    DesktopFileSystem.restoreAssociation(association);
    const { result } = await studio();
    const clearHistory = vi.fn();
    const unsubscribe = studioEvents.on('pixibun:history-clear', clearHistory);
    await act(async () => {
      expect(await result.current.joinCoDrawGuest('invite', { lanOnly: true }, new AbortController().signal)).toBe('answer');
    });
    const sharedId = useStudioStore.getState().currentProjectId;
    expect(sharedId).not.toBe('original');
    expect(vi.mocked(autoSaveWorkspaceDetailed).mock.calls[0][0]).toBe('original');
    expect(vi.mocked(autoSaveWorkspaceDetailed).mock.calls[0][1].name).toBe('Original artwork');
    expect(DesktopFileSystem.captureAssociation().handle).toBeNull();
    expect(hasBuffer(originalLayer)).toBe(false);
    expect(clearHistory).toHaveBeenCalledTimes(1);
    act(() => callbacks(coDrawBridge.getSession()!).onStructureSync?.(structure));
    await act(async () => { expect((await result.current.runAutosave()).ok).toBe(true); });
    expect(vi.mocked(autoSaveWorkspaceDetailed).mock.calls.at(-1)?.[0]).toBe(sharedId);
    act(() => coDrawBridge.disconnect());
    expect(useStudioStore.getState().currentProjectId).toBe(sharedId);
    expect(useStudioStore.getState().frames[0].layers[0].id).toBe('shared-layer');
    unsubscribe();
  });

  it('does not start signaling or replace artwork when the checkpoint fails', async () => {
    const original = useStudioStore.getState();
    vi.mocked(autoSaveWorkspaceDetailed).mockResolvedValue({ ok: false, reason: 'error', error: 'Storage unavailable' });
    const { result } = await studio();
    await act(async () => {
      await expect(result.current.joinCoDrawGuest('invite', {}, new AbortController().signal)).rejects.toThrow('Storage unavailable');
    });
    expect(P2PSyncSession.prototype.acceptHostInvite).not.toHaveBeenCalled();
    expect(useStudioStore.getState().currentProjectId).toBe('original');
    expect(hasBuffer(original.activeLayerId)).toBe(true);
    expect(useStudioStore.getState().isDirty).toBe(true);
  });

  it('preserves original pixels, file association and history when signaling fails', async () => {
    const original = useStudioStore.getState();
    const association = { handle: {} as FileSystemFileHandle, projectId: 'original', filename: 'original.pixibun' };
    DesktopFileSystem.restoreAssociation(association);
    vi.mocked(P2PSyncSession.prototype.acceptHostInvite).mockRejectedValue(new Error('Invalid invite'));
    const { result } = await studio();
    const clearHistory = vi.fn();
    const unsubscribe = studioEvents.on('pixibun:history-clear', clearHistory);
    await act(async () => {
      await expect(result.current.joinCoDrawGuest('bad invite', {}, new AbortController().signal)).rejects.toThrow('Invalid invite');
    });
    expect(useStudioStore.getState().currentProjectId).toBe('original');
    expect(useStudioStore.getState().frames).toBe(original.frames);
    expect([...getOrCreateBuffer(original.activeLayerId, 32, 32).ctx.getImageData(0, 0, 1, 1).data]).toEqual([255, 0, 0, 255]);
    expect(DesktopFileSystem.captureAssociation()).toEqual(association);
    expect(clearHistory).not.toHaveBeenCalled();
    expect(coDrawBridge.getSession()).toBeNull();
    unsubscribe();
  });

  it('waits for an in-flight save before isolating the guest workspace', async () => {
    const write = deferred<Awaited<ReturnType<typeof autoSaveWorkspaceDetailed>>>();
    vi.mocked(autoSaveWorkspaceDetailed).mockReturnValueOnce(write.promise);
    const { result } = await studio();
    let save!: Promise<SaveResult>;
    let join!: Promise<string>;
    await act(async () => { save = result.current.runAutosave(); });
    await act(async () => { join = result.current.joinCoDrawGuest('invite', {}, new AbortController().signal); });
    expect(P2PSyncSession.prototype.acceptHostInvite).not.toHaveBeenCalled();
    expect(useStudioStore.getState().currentProjectId).toBe('original');
    await act(async () => { write.resolve({ ok: true, status: 'saved', storageVersion: 'v1' }); await save; await join; });
    expect(useStudioStore.getState().currentProjectId).not.toBe('original');
    expect(vi.mocked(autoSaveWorkspaceDetailed).mock.calls.every(call => call[0] === 'original')).toBe(true);
  });

  it.each(['edit', 'project switch', 'cancel', 'unmount'] as const)('keeps newer work safe on %s during signaling', async (change) => {
    const answer = deferred<string>();
    vi.mocked(P2PSyncSession.prototype.acceptHostInvite).mockReturnValueOnce(answer.promise);
    const { result, unmount } = await studio();
    const controller = new AbortController();
    let join!: Promise<string>;
    await act(async () => { join = result.current.joinCoDrawGuest('invite', {}, controller.signal); });
    const rejected = expect(join).rejects.toThrow();
    act(() => {
      if (change === 'edit') useStudioStore.getState().setProjectName('New edit');
      if (change === 'project switch') useStudioStore.getState().resetToNewProject('another');
      if (change === 'cancel') controller.abort();
      if (change === 'unmount') unmount();
    });
    await act(async () => { answer.resolve('answer'); await rejected; });
    expect(useStudioStore.getState().currentProjectId).toBe(change === 'project switch' ? 'another' : 'original');
    if (change === 'edit') expect(useStudioStore.getState().projectName).toBe('New edit');
    expect(coDrawBridge.getSession()).toBeNull();
  });

  it('ignores early artwork and disconnects before late traffic can alter another project', async () => {
    const answer = deferred<string>();
    vi.mocked(P2PSyncSession.prototype.acceptHostInvite).mockReturnValueOnce(answer.promise);
    const { result } = await studio();
    let join!: Promise<string>;
    await act(async () => { join = result.current.joinCoDrawGuest('invite', {}, new AbortController().signal); });
    const oldCallbacks = callbacks(coDrawBridge.getSession()!);
    const originalFrames = useStudioStore.getState().frames;
    act(() => oldCallbacks.onStructureSync?.(structure));
    expect(useStudioStore.getState().frames).toBe(originalFrames);
    await act(async () => { answer.resolve('answer'); await join; });
    act(() => useStudioStore.getState().resetToNewProject('another'));
    const otherFrames = useStudioStore.getState().frames;
    act(() => {
      oldCallbacks.onStructureSync?.(structure);
      oldCallbacks.onInitialSync?.([{ x: 0, y: 0, r: 1, g: 2, b: 3, a: 255, timestamp: Date.now(), peerId: 'host' }], 'shared-layer');
      oldCallbacks.onConnectionStateChange?.('connected');
    });
    expect(coDrawBridge.getSession()).toBeNull();
    expect(useStudioStore.getState().frames).toBe(otherFrames);
    expect(hasBuffer('shared-layer')).toBe(false);
  });

  it('does not let an old failed join disconnect a newer session', async () => {
    const first = deferred<string>();
    vi.mocked(P2PSyncSession.prototype.acceptHostInvite).mockReturnValueOnce(first.promise).mockResolvedValueOnce('second answer');
    const bridge = new CoDrawBridge();
    const firstJoin = bridge.startGuest('first', () => { throw new Error('Must never activate'); });
    const rejected = expect(firstJoin).rejects.toThrow('session changed');
    await bridge.startGuest('second', () => {
      useStudioStore.getState().resetToNewProject('shared-second');
      return 'shared-second';
    });
    const secondSession = bridge.getSession();
    first.resolve('old answer');
    await rejected;
    expect(bridge.getSession()).toBe(secondSession);
    bridge.disconnect();
  });
});
