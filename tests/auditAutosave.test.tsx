// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, renderHook, cleanup } from '@testing-library/react';
import { useStudioAutosave } from '@/hooks/studio/useStudioAutosave';
import { useStudioStore } from '@/stores/studioStore';
import { autoSaveWorkspaceDetailed, getLatestStoredProjectId, type AutoSaveOutcome } from '@/lib/storage/db';
import { buildAutosavePayloadAsync, type AutosavePayload } from '@/lib/project/serialize';
import type { SaveResult, ProjectFile } from '@/types/project';
import { inspectAndAdmitStoredProject } from '@/lib/recovery/projectAdmission';
import type { SafeProjectMetadata } from '@/lib/recovery/recoveryTypes';

vi.mock('@/lib/storage/db', () => ({
  autoSaveWorkspaceDetailed: vi.fn().mockResolvedValue({ ok: true, status: 'saved' }),
  getLatestStoredProjectId: vi.fn().mockResolvedValue(null),
  loadLatestSavedWorkspace: vi.fn().mockResolvedValue(null),
  getLayerBlobsForProject: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/recovery/projectAdmission', () => ({
  inspectAndAdmitStoredProject: vi.fn().mockResolvedValue({ status: 'not-found' }),
  isAutosavePermitted: vi.fn((phase: string) => phase === 'active'),
}));
vi.mock('@/lib/project/serialize', () => ({
  buildAutosavePayloadAsync: vi.fn(), generateCompositeThumbnail: vi.fn(), hydrateProject: vi.fn(),
}));
const payload = (name: string) => ({ project: { name, width: 32, height: 32, fps: 8 } as unknown as ProjectFile, layerBlobs: [] }) as unknown as AutosavePayload;
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
  let save!: Promise<SaveResult>;
  await act(async () => { save = result.current.runAutosave(); });
  act(() => useStudioStore.getState().resetToNewProject('B'));
  await act(async () => { first.resolve(payload('A')); await save; });
  expect(vi.mocked(autoSaveWorkspaceDetailed).mock.calls.map(call => [call[0], call[1].name])).toEqual([['A', 'A'], ['B', 'B']]);
});

it('keeps newer edits dirty until their own save finishes', async () => {
  const oldWrite = deferred<AutoSaveOutcome>();
  const newWrite = deferred<AutoSaveOutcome>();
  vi.mocked(buildAutosavePayloadAsync).mockResolvedValue(payload('A'));
  vi.mocked(autoSaveWorkspaceDetailed).mockReturnValueOnce(oldWrite.promise).mockReturnValueOnce(newWrite.promise);
  useStudioStore.getState().setDirty(true);
  const { result } = renderHook(useStudioAutosave);
  let save!: Promise<SaveResult>;
  await act(async () => { save = result.current.runAutosave(); });
  act(() => useStudioStore.getState().setDirty(true));
  await act(async () => { oldWrite.resolve({ ok: true, status: 'saved' }); });
  expect(useStudioStore.getState().isDirty).toBe(true);
  await act(async () => { newWrite.resolve({ ok: true, status: 'saved' }); expect((await save).ok).toBe(true); });
  expect(useStudioStore.getState().isDirty).toBe(false);
});

it('returns false for a failed save so callers cannot show success', async () => {
  vi.mocked(buildAutosavePayloadAsync).mockResolvedValue(payload('A'));
  vi.mocked(autoSaveWorkspaceDetailed).mockResolvedValue({ ok: false, reason: 'error', error: 'Storage failure' });
  const { result } = renderHook(useStudioAutosave);
  await act(async () => { expect((await result.current.runAutosave()).ok).toBe(false); });
  expect(useStudioStore.getState().saveStatus).toBe('error');
});

it('preserves corrupt stored project on restore failure and recovers under fresh project identity', async () => {
  const corruptProjectId = 'corrupt-project-123';
  vi.mocked(autoSaveWorkspaceDetailed).mockResolvedValue({ ok: true, status: 'saved' });
  vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce(corruptProjectId);
  vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
    status: 'recovery-required',
    projectId: corruptProjectId,
    assessment: {
      status: 'recoverable-envelope-exceeded',
      projectId: corruptProjectId,
      project: {} as unknown as ProjectFile,
      metadata: {} as unknown as SafeProjectMetadata,
      violations: [],
      reasonCodes: [],
      orphanSummary: { totalCount: 0, duplicateCount: 0, detailsTruncated: false, details: [] },
      scannedBlobsCount: 0,
    },
  });
  vi.mocked(buildAutosavePayloadAsync).mockResolvedValue(payload('Recovered'));

  const { result } = renderHook(useStudioAutosave);

  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });

  const activeProjectId = useStudioStore.getState().currentProjectId;
  expect(activeProjectId).not.toBe(corruptProjectId);
  expect(result.current.autosaveError).toMatch(/could not be validated or restored/i);

  await act(async () => {
    const saveRes = await result.current.runAutosave();
    expect(saveRes.ok).toBe(true);
  });

  const lastCall = vi.mocked(autoSaveWorkspaceDetailed).mock.calls.at(-1);
  expect(lastCall?.[0]).toBe(activeProjectId);
  expect(lastCall?.[0]).not.toBe(corruptProjectId);
});

