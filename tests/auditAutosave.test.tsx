// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, renderHook, cleanup } from '@testing-library/react';
import { useStudioAutosave } from '@/hooks/studio/useStudioAutosave';
import { useStudioStore } from '@/stores/studioStore';
import { autoSaveWorkspace } from '@/lib/storage/db';
import { buildAutosavePayloadAsync, type AutosavePayload } from '@/lib/project/serialize';

vi.mock('@/lib/storage/db', () => ({
  autoSaveWorkspace: vi.fn().mockResolvedValue(true),
  loadLatestSavedWorkspace: vi.fn().mockResolvedValue(null),
  getLayerBlobsForProject: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/project/serialize', () => ({
  buildAutosavePayloadAsync: vi.fn(), generateCompositeThumbnail: vi.fn(), hydrateProject: vi.fn(),
}));
const payload = (name: string) => ({ project: { name, width: 32, height: 32, fps: 8 }, layerBlobs: [] }) as unknown as AutosavePayload;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}
beforeEach(() => { vi.clearAllMocks(); useStudioStore.getState().resetToNewProject('A'); });
afterEach(cleanup);

it('saves A pixels under A identity when a new project opens during encoding', async () => {
  const first = deferred<AutosavePayload>();
  vi.mocked(buildAutosavePayloadAsync).mockReturnValueOnce(first.promise).mockResolvedValue(payload('B'));
  const { result } = renderHook(useStudioAutosave);
  let save!: Promise<boolean>;
  await act(async () => { save = result.current.runAutosave(); });
  act(() => useStudioStore.getState().resetToNewProject('B'));
  await act(async () => { first.resolve(payload('A')); await save; });
  expect(vi.mocked(autoSaveWorkspace).mock.calls.map(call => [call[0], call[1]])).toEqual([['A', 'A'], ['B', 'B']]);
});

it('keeps newer edits dirty until their own save finishes', async () => {
  const oldWrite = deferred<boolean>();
  const newWrite = deferred<boolean>();
  vi.mocked(buildAutosavePayloadAsync).mockResolvedValue(payload('A'));
  vi.mocked(autoSaveWorkspace).mockReturnValueOnce(oldWrite.promise).mockReturnValueOnce(newWrite.promise);
  useStudioStore.getState().setDirty(true);
  const { result } = renderHook(useStudioAutosave);
  let save!: Promise<boolean>;
  await act(async () => { save = result.current.runAutosave(); });
  act(() => useStudioStore.getState().setDirty(true));
  await act(async () => { oldWrite.resolve(true); });
  expect(useStudioStore.getState().isDirty).toBe(true);
  await act(async () => { newWrite.resolve(true); expect(await save).toBe(true); });
  expect(useStudioStore.getState().isDirty).toBe(false);
});

it('returns false for a failed save so callers cannot show success', async () => {
  vi.mocked(buildAutosavePayloadAsync).mockResolvedValue(payload('A'));
  vi.mocked(autoSaveWorkspace).mockResolvedValue(false);
  const { result } = renderHook(useStudioAutosave);
  await act(async () => { expect(await result.current.runAutosave()).toBe(false); });
  expect(useStudioStore.getState().saveStatus).toBe('error');
});
