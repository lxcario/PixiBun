// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, cleanup } from '@testing-library/react';
import { useStudioAutosave, type OpenProjectResult } from '@/hooks/studio/useStudioAutosave';
import { useStudioStore } from '@/stores/studioStore';
import {
  autoSaveWorkspaceDetailed,
  getLatestStoredProjectId,
} from '@/lib/storage/db';
import {
  buildAutosavePayloadAsync,
  hydrateProject,
  type AutosavePayload,
} from '@/lib/project/serialize';
import {
  inspectAndAdmitStoredProject,
  isAutosavePermitted,
  type StoredProjectAdmissionResult,
} from '@/lib/recovery/projectAdmission';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION, type ProjectFile, type SaveResult } from '@/types/project';
import type { RecoverableStoredAssessment } from '@/lib/recovery/recoveryTypes';

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
  buildAutosavePayloadAsync: vi.fn(),
  generateCompositeThumbnail: vi.fn(),
  hydrateProject: vi.fn(),
}));

function baseProjectFixture(_id = 'proj-test', name = 'Test Project'): ProjectFile {
  return {
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name,
    width: 32,
    height: 32,
    fps: 12,
    createdAt: 1000,
    updatedAt: 1000,
    loopMode: 'repeat',
    onionSkin: {
      enabled: false,
      prevFrames: 1,
      nextFrames: 1,
      opacity: 0.35,
      prevColor: '#7fae6b',
      nextColor: '#c792df',
    },
    customRamps: [],
    palettes: [
      {
        id: 'palette-default',
        name: 'Default Palette',
        colors: ['#000000', '#ffffff', '#ff0000'],
      },
    ],
    currentPaletteId: 'palette-default',
    clips: [],
    frames: [
      {
        id: 'frame-1',
        durationMs: 83,
        layers: [
          {
            id: 'layer-1',
            name: 'Layer 1',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
          },
        ],
      },
    ],
  };
}

function mockRecoverableAssessment(projectId: string): RecoverableStoredAssessment {
  return {
    status: 'recoverable-envelope-exceeded',
    projectId,
    project: baseProjectFixture(projectId),
    metadata: {
      name: 'Corrupt Project',
      width: 32,
      height: 32,
      frameCount: 1,
      totalLayerCount: 1,
      maxLayersInAFrame: 1,
      materializableRasterPixels: 1024,
      baseRawRgbaBytes: 4096,
      fps: 12,
      version: PROJECT_FORMAT_VERSION,
      createdAt: 1000,
      updatedAt: 1000,
    },
    violations: [],
    reasonCodes: ['SAFE_JSON_PAYLOAD_LIMIT'],
    orphanSummary: { totalCount: 0, duplicateCount: 0, detailsTruncated: false, details: [] },
    scannedBlobsCount: 0,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const mockAutosavePayload = (id: string, name: string): AutosavePayload =>
  ({
    project: { ...baseProjectFixture(id, name) },
    layerBlobs: [],
  }) as unknown as AutosavePayload;

describe('Phase 1B.7: Startup Recovery Routing & Controlled Hydration Hook Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStudioStore.getState().resetToNewProject('initial-project-id');
    vi.mocked(buildAutosavePayloadAsync).mockImplementation(async () =>
      mockAutosavePayload(useStudioStore.getState().currentProjectId, useStudioStore.getState().projectName)
    );
    vi.mocked(autoSaveWorkspaceDetailed).mockResolvedValue({ ok: true, status: 'saved' });
    vi.mocked(hydrateProject).mockImplementation(async (file: ProjectFile, projectId?: string) => {
      useStudioStore.getState().loadProjectState(file, projectId);
    });
  });

  afterEach(cleanup);

  // --------------------------------------------------------------------------
  // 1. Startup Flow Tests
  // --------------------------------------------------------------------------

  it('admits and hydrates a valid stored project on startup, reaching active phase', async () => {
    const validProject = baseProjectFixture('proj-valid-startup', 'Valid Startup Project');
    vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce('proj-valid-startup');
    vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
      status: 'admitted',
      projectId: 'proj-valid-startup',
      project: validProject,
      sourceBlobs: [],
    });

    const { result } = renderHook(useStudioAutosave);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    expect(result.current.lifecycleState.phase).toBe('active');
    if (result.current.lifecycleState.phase === 'active') {
      expect(result.current.lifecycleState.projectId).toBe('proj-valid-startup');
      expect(result.current.lifecycleState.pendingRecovery).toBeUndefined();
    }
    expect(hydrateProject).toHaveBeenCalledWith(validProject, 'proj-valid-startup', [], expect.any(Function));
    expect(useStudioStore.getState().currentProjectId).toBe('proj-valid-startup');
  });

  it('routes a recovery-required startup project to a fresh workspace with new ID, protecting source', async () => {
    const corruptId = 'proj-damaged-startup';
    vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce(corruptId);
    vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
      status: 'recovery-required',
      projectId: corruptId,
      assessment: mockRecoverableAssessment(corruptId),
    });

    const { result } = renderHook(useStudioAutosave);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    expect(result.current.lifecycleState.phase).toBe('active');
    if (result.current.lifecycleState.phase === 'active') {
      expect(result.current.lifecycleState.pendingRecovery).toBeDefined();
      expect(result.current.lifecycleState.pendingRecovery?.sourceProjectId).toBe(corruptId);
      expect(result.current.lifecycleState.pendingRecovery?.assessment.status).toBe('recoverable-envelope-exceeded');
      expect(result.current.lifecycleState.projectId).not.toBe(corruptId);
    }

    // New active project ID must NOT be the damaged source ID
    const activeId = useStudioStore.getState().currentProjectId;
    expect(activeId).not.toBe(corruptId);
    expect(typeof activeId).toBe('string');
    expect(activeId.length).toBeGreaterThan(0);

    // Hydrate must NOT have been called on damaged project
    expect(hydrateProject).not.toHaveBeenCalled();

    // Autosave should succeed for the fresh workspace under its new ID
    let saveRes!: SaveResult;
    await act(async () => {
      saveRes = await result.current.runAutosave();
    });
    expect(saveRes.ok).toBe(true);
    expect(vi.mocked(autoSaveWorkspaceDetailed)).toHaveBeenCalled();
    const lastCall = vi.mocked(autoSaveWorkspaceDetailed).mock.calls.slice(-1)[0];
    expect(lastCall[0]).toBe(activeId);
    expect(lastCall[0]).not.toBe(corruptId);
  });

  it('routes transient read failure on startup to fresh workspace with startupIssue', async () => {
    vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce('proj-transient');
    vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
      status: 'transient-failure',
      projectId: 'proj-transient',
      message: 'IndexedDB transaction failed',
    });

    const { result } = renderHook(useStudioAutosave);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    expect(result.current.lifecycleState.phase).toBe('active');
    if (result.current.lifecycleState.phase === 'active') {
      expect(result.current.lifecycleState.startupIssue).toBeDefined();
      expect(result.current.lifecycleState.startupIssue?.kind).toBe('transient-failure');
      expect(result.current.lifecycleState.startupIssue?.message).toContain('IndexedDB transaction failed');
    }

    expect(useStudioStore.getState().currentProjectId).not.toBe('proj-transient');
  });

  it('routes unparseable or unsupported-version startup project to fresh workspace with startupIssue', async () => {
    vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce('proj-future');
    vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
      status: 'unsupported-version',
      projectId: 'proj-future',
      foundVersion: 99,
      supportedVersion: 3,
      message: 'Unsupported schema version: 99.0',
    });

    const { result } = renderHook(useStudioAutosave);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    expect(result.current.lifecycleState.phase).toBe('active');
    if (result.current.lifecycleState.phase === 'active') {
      expect(result.current.lifecycleState.startupIssue).toBeDefined();
      expect(result.current.lifecycleState.startupIssue?.kind).toBe('unsupported-version');
      expect(result.current.lifecycleState.startupIssue?.message).toContain('Unsupported schema version: 99.0');
    }
  });

  it('falls back to fresh workspace if hydrateProject throws during startup restore', async () => {
    const validProj = baseProjectFixture('proj-decoder-fail', 'Decoder Fail');
    vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce('proj-decoder-fail');
    vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
      status: 'admitted',
      projectId: 'proj-decoder-fail',
      project: validProj,
      sourceBlobs: [],
    });
    vi.mocked(hydrateProject).mockRejectedValueOnce(new Error('Out of memory decoding texture'));

    const { result } = renderHook(useStudioAutosave);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    expect(result.current.lifecycleState.phase).toBe('active');
    if (result.current.lifecycleState.phase === 'active') {
      expect(result.current.lifecycleState.startupIssue).toBeDefined();
      expect(result.current.lifecycleState.startupIssue?.kind).toBe('hydration-failure');
      expect(result.current.lifecycleState.startupIssue?.message).toContain('Out of memory decoding texture');
    }

    expect(useStudioStore.getState().currentProjectId).not.toBe('proj-decoder-fail');
  });

  // --------------------------------------------------------------------------
  // 2. Gallery Open & Admission Boundary Tests
  // --------------------------------------------------------------------------

  it('opens a stored project from Gallery via openStoredProject', async () => {
    vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce(null);

    const { result } = renderHook(useStudioAutosave);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });
    expect(result.current.lifecycleState.phase).toBe('active');

    const galleryProj = baseProjectFixture('proj-gallery-ok', 'Gallery Project');
    vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
      status: 'admitted',
      projectId: 'proj-gallery-ok',
      project: galleryProj,
      sourceBlobs: [],
    });

    let openResult!: OpenProjectResult;
    await act(async () => {
      openResult = await result.current.openStoredProject('proj-gallery-ok');
    });

    expect(openResult.success).toBe(true);
    expect(inspectAndAdmitStoredProject).toHaveBeenCalledWith('proj-gallery-ok', expect.any(Object));
    expect(hydrateProject).toHaveBeenCalledWith(galleryProj, 'proj-gallery-ok', [], expect.any(Function));
    expect(useStudioStore.getState().currentProjectId).toBe('proj-gallery-ok');
    expect(result.current.lifecycleState.phase).toBe('active');
    if (result.current.lifecycleState.phase === 'active') {
      expect(result.current.lifecycleState.projectId).toBe('proj-gallery-ok');
    }
  });

  it('rejects Gallery open for damaged project and preserves current active workspace', async () => {
    vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce(null);

    const { result } = renderHook(useStudioAutosave);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    const initialProjectId = useStudioStore.getState().currentProjectId;

    // Attempt to open a damaged project from Gallery
    vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
      status: 'recovery-required',
      projectId: 'proj-damaged-gallery',
      assessment: mockRecoverableAssessment('proj-damaged-gallery'),
    });

    let openResult!: OpenProjectResult;
    await act(async () => {
      openResult = await result.current.openStoredProject('proj-damaged-gallery');
    });

    expect(openResult).toBeDefined();
    expect(openResult.success).toBe(false);
    if (!openResult.success) {
      expect(openResult.reason).toBe('recovery-required');
      if (openResult.reason === 'recovery-required') {
        expect(openResult.assessment).toBeDefined();
      }
    }

    // Current workspace remains completely intact
    expect(useStudioStore.getState().currentProjectId).toBe(initialProjectId);
    expect(result.current.lifecycleState.phase).toBe('active');
    if (result.current.lifecycleState.phase === 'active') {
      expect(result.current.lifecycleState.projectId).toBe(initialProjectId);
    }

    // Autosave remains functional for the current workspace
    expect(isAutosavePermitted(result.current.lifecycleState.phase)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 3. Stale-Open Prevention & Cancellation Tests
  // --------------------------------------------------------------------------

  it('supersedes earlier open request when a newer open request is issued rapidly', async () => {
    vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce(null);

    const { result } = renderHook(useStudioAutosave);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    const slowDeferred = deferred<StoredProjectAdmissionResult>();
    const fastProj = baseProjectFixture('proj-fast', 'Fast Project');

    vi.mocked(inspectAndAdmitStoredProject).mockImplementation(async (id: string) => {
      if (id === 'proj-slow') {
        return slowDeferred.promise;
      }
      return {
        status: 'admitted',
        projectId: id,
        project: fastProj,
        sourceBlobs: [],
      };
    });

    let promiseSlow!: Promise<OpenProjectResult>;
    let promiseFast!: Promise<OpenProjectResult>;

    act(() => {
      promiseSlow = result.current.openStoredProject('proj-slow');
      promiseFast = result.current.openStoredProject('proj-fast');
    });

    await act(async () => {
      // Resolve slow promise after fast is dispatched
      slowDeferred.resolve({
        status: 'admitted',
        projectId: 'proj-slow',
        project: baseProjectFixture('proj-slow', 'Slow Project'),
        sourceBlobs: [],
      });
    });

    let resSlow!: OpenProjectResult;
    let resFast!: OpenProjectResult;
    await act(async () => {
      resSlow = await promiseSlow;
      resFast = await promiseFast;
    });

    expect(resSlow.success).toBe(false);
    if (!resSlow.success) {
      expect(resSlow.reason).toBe('superseded');
    }

    expect(resFast.success).toBe(true);
    expect(useStudioStore.getState().currentProjectId).toBe('proj-fast');
    expect(result.current.lifecycleState.phase).toBe('active');
    if (result.current.lifecycleState.phase === 'active') {
      expect(result.current.lifecycleState.projectId).toBe('proj-fast');
    }
  });

  it('aborts in-flight open when hook unmounts', async () => {
    vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce(null);

    const { result, unmount } = renderHook(useStudioAutosave);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    const openDeferred = deferred<StoredProjectAdmissionResult>();
    vi.mocked(inspectAndAdmitStoredProject).mockReturnValueOnce(openDeferred.promise);

    let openPromise!: Promise<OpenProjectResult>;
    act(() => {
      openPromise = result.current.openStoredProject('proj-unmounting');
    });

    // Wait for openStoredProject to enter admission inspection
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Unmount before admission finishes
    act(() => {
      unmount();
    });

    openDeferred.resolve({
      status: 'admitted',
      projectId: 'proj-unmounting',
      project: baseProjectFixture('proj-unmounting'),
      sourceBlobs: [],
    });

    let outcome!: OpenProjectResult;
    await act(async () => {
      outcome = await openPromise;
    });

    expect(outcome.success).toBe(false);
    if (!outcome.success) {
      expect(outcome.reason).toMatch(/cancelled|superseded/);
    }
  });

  // --------------------------------------------------------------------------
  // 4. Recovered-Copy Opening & Protected Source Invariants
  // --------------------------------------------------------------------------

  it('opens recovered copy with isRecoveredCopy=true and clears pendingRecovery', async () => {
    const damagedId = 'proj-damaged-startup';
    vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce(damagedId);
    vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
      status: 'recovery-required',
      projectId: damagedId,
      assessment: mockRecoverableAssessment(damagedId),
    });

    const { result } = renderHook(useStudioAutosave);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    // Verify pendingRecovery exists
    expect(result.current.lifecycleState.phase).toBe('active');
    if (result.current.lifecycleState.phase === 'active') {
      expect(result.current.lifecycleState.pendingRecovery?.sourceProjectId).toBe(damagedId);
    }

    // Now open the newly created recovered copy from storage
    const recoveredCopyId = 'proj-recovered-copy';
    const recoveredProj = baseProjectFixture(recoveredCopyId, 'Recovered Copy');
    vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
      status: 'admitted',
      projectId: recoveredCopyId,
      project: recoveredProj,
      sourceBlobs: [],
    });

    let openRes!: OpenProjectResult;
    await act(async () => {
      openRes = await result.current.openStoredProject(recoveredCopyId, true);
    });

    expect(openRes.success).toBe(true);
    expect(useStudioStore.getState().currentProjectId).toBe(recoveredCopyId);
    expect(result.current.lifecycleState.phase).toBe('active');
    if (result.current.lifecycleState.phase === 'active') {
      expect(result.current.lifecycleState.projectId).toBe(recoveredCopyId);
      // pendingRecovery must be cleared
      expect(result.current.lifecycleState.pendingRecovery).toBeUndefined();
    }
  });

  it('strictly protects damaged source project from autosave overwrite if active ID matches sourceProjectId', async () => {
    const damagedId = 'proj-source-corrupt';
    vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce(damagedId);
    vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
      status: 'recovery-required',
      projectId: damagedId,
      assessment: mockRecoverableAssessment(damagedId),
    });

    const { result } = renderHook(useStudioAutosave);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    // Manually force studioStore.currentProjectId to match damagedId to simulate a malicious or buggy state transition
    useStudioStore.setState({ currentProjectId: damagedId });

    let saveOutcome!: SaveResult;
    await act(async () => {
      saveOutcome = await result.current.runAutosave();
    });

    expect(saveOutcome.ok).toBe(false);
    if (!saveOutcome.ok) {
      expect(saveOutcome.reason).toBe('restore-invalid');
    }
    // Ensure autoSaveWorkspaceDetailed was NOT called with damagedId
    expect(vi.mocked(autoSaveWorkspaceDetailed)).not.toHaveBeenCalledWith(damagedId, expect.anything(), expect.anything());
  });

  it('suspends autosave when lifecycle phase is non-active and waits for startup restore', async () => {
    vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce('proj-startup');
    const slowRestore = deferred<StoredProjectAdmissionResult>();
    vi.mocked(inspectAndAdmitStoredProject).mockReturnValueOnce(slowRestore.promise);

    const { result } = renderHook(useStudioAutosave);

    // Initial state during startup before resolution is idle, which is not permitted for autosave
    expect(result.current.lifecycleState.phase).toBe('idle');
    expect(isAutosavePermitted(result.current.lifecycleState.phase)).toBe(false);

    // runAutosave during initial restore waits for restore to finish
    let savePromise!: Promise<SaveResult>;
    act(() => {
      savePromise = result.current.runAutosave();
    });

    // Settle startup with recovery-required
    await act(async () => {
      slowRestore.resolve({
        status: 'recovery-required',
        projectId: 'proj-startup',
        assessment: mockRecoverableAssessment('proj-startup'),
      });
    });

    const saveRes = await savePromise;
    expect(saveRes.ok).toBe(true);
    expect(result.current.lifecycleState.phase).toBe('active');
  });
});
