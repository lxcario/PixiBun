// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent, waitFor, cleanup, renderHook } from '@testing-library/react';
import { RecoveryModal } from '@/components/modals/RecoveryModal';
import { useStudioAutosave, type OpenProjectResult } from '@/hooks/studio/useStudioAutosave';
import { useStudioStore } from '@/stores/studioStore';
import {
  prepareRecoveryPlan,
  commitRecoveredProject,
} from '@/lib/recovery/recoveryOrchestrator';
import {
  prepareUntouchedRecoveryArchive,
} from '@/lib/recovery/recoveryBackup';
import {
  createRecoveryArchiveBlob,
} from '@/lib/recovery/recoveryBackupTransport';
import {
  inspectAndAdmitStoredProject,
} from '@/lib/recovery/projectAdmission';
import {
  autoSaveWorkspaceDetailed,
  getLatestStoredProjectId,
} from '@/lib/storage/db';
import {
  buildAutosavePayloadAsync,
  hydrateProject,
  type AutosavePayload,
} from '@/lib/project/serialize';
import { recordRecoveryAssessment } from '@/lib/recovery/recoveryLedger';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION, type ProjectFile } from '@/types/project';
import type {
  CandidateRecoveryPlan,
  TrustedRecoveryPlanToken,
  RecoverableStoredAssessment,
} from '@/lib/recovery/recoveryTypes';

const motionComponentCache: Record<string, React.ComponentType<Record<string, unknown>>> = {};
// The real module supplies everything not stubbed here (presence hooks, animate, motion values).
vi.mock('motion/react', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('motion/react')>()),
    useReducedMotion: () => true,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          if (!motionComponentCache[prop]) {
            motionComponentCache[prop] = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
              const {
                initial: _initial,
                animate: _animate,
                exit: _exit,
                transition: _transition,
                variants: _variants,
                whileHover: _whileHover,
                whileTap: _whileTap,
                onAnimationComplete: _onAnimationComplete,
                viewport: _viewport,
                whileInView: _whileInView,
                layoutId: _layoutId,
                ...rest
              } = props;
              return React.createElement(prop, { ...rest, ref });
            });
            motionComponentCache[prop].displayName = `motion.${prop}`;
          }
          return motionComponentCache[prop];
        },
      }
    ),
  };
});

vi.mock('@/lib/recovery/recoveryOrchestrator', () => ({
  prepareRecoveryPlan: vi.fn(),
  commitRecoveredProject: vi.fn(),
  formatRecoveredTitle: vi.fn((name: string) => `${name} (Recovered)`),
}));

vi.mock('@/lib/recovery/recoveryBackup', () => ({
  prepareUntouchedRecoveryArchive: vi.fn(),
  generateRecoveryBackupFilename: vi.fn(() => 'pixibun-backup-test.zip'),
}));

vi.mock('@/lib/recovery/recoveryBackupTransport', () => ({
  createRecoveryArchiveBlob: vi.fn(),
  writeRecoveryArchiveToFileHandle: vi.fn(),
}));

vi.mock('@/lib/recovery/recoveryLedger', () => ({
  recordRecoveryAssessment: vi.fn().mockResolvedValue({ id: 1, sequence: 1 }),
}));

vi.mock('@/lib/recovery/projectAdmission', () => ({
  inspectAndAdmitStoredProject: vi.fn(),
  isAutosavePermitted: vi.fn((phase: string) => phase === 'active'),
}));

vi.mock('@/lib/storage/db', () => ({
  autoSaveWorkspaceDetailed: vi.fn().mockResolvedValue({ ok: true, status: 'saved' }),
  getLatestStoredProjectId: vi.fn().mockResolvedValue(null),
  loadLatestSavedWorkspace: vi.fn().mockResolvedValue(null),
  getLayerBlobsForProject: vi.fn().mockResolvedValue([]),
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

function mockCandidatePlan(sourceId = 'proj-source'): CandidateRecoveryPlan {
  const proj = baseProjectFixture('proj-candidate', 'Damaged Artwork');
  return {
    sourceProjectId: sourceId,
    candidateProject: proj,
    blobRemapEntries: [
      {
        sourceRecordId: 101,
        sourceProjectId: sourceId,
        sourceFrameIndex: 0,
        sourceLayerId: 'layer-1',
        sourceUpdatedAt: 1000,
        expectedSizeBytes: 100,
        expectedMimeType: 'image/png',
        targetFrameIndex: 0,
        targetLayerId: 'layer-1',
      },
    ],
    deletedFrameIndices: [],
    deletedLayerIds: [],
    excludedRecordIds: [],
    removedClipIds: [],
    resourceUsage: {
      frameCount: 1,
      layerCount: 1,
      rasterLayerCount: 1,
      materializableRasterPixels: 1024,
      baseRawRgbaBytes: 4096,
    },
  };
}

function mockPlanToken(plan: CandidateRecoveryPlan): TrustedRecoveryPlanToken {
  return {
    tokenVersion: 1,
    signature: 'hmac-mock-signature',
    candidatePlan: plan,
  } as unknown as TrustedRecoveryPlanToken;
}

function mockRecoverableAssessment(projectId: string): RecoverableStoredAssessment {
  return {
    status: 'recoverable-envelope-exceeded',
    projectId,
    project: baseProjectFixture(projectId, 'Damaged Artwork'),
    metadata: {
      name: 'Damaged Artwork',
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
    scannedBlobsCount: 1,
  };
}

describe('Phase 1B.8: Recovery UI, Safe Modes & Repair Wizard Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    useStudioStore.getState().resetToNewProject('initial-active-project');
    vi.mocked(buildAutosavePayloadAsync).mockImplementation(async () =>
      ({
        project: baseProjectFixture('initial-active-project'),
        layerBlobs: [],
      }) as unknown as AutosavePayload
    );
    vi.mocked(autoSaveWorkspaceDetailed).mockResolvedValue({ ok: true, status: 'saved' });
    vi.mocked(hydrateProject).mockImplementation(async (file: ProjectFile, projectId?: string) => {
      useStudioStore.getState().loadProjectState(file, projectId);
    });
  });

  afterEach(cleanup);

  // ==========================================================================
  // RecoveryModal Unit & User Flow Tests
  // ==========================================================================

  describe('RecoveryModal Component Tests', () => {
    it('diagnoses and renders deterministic candidate plan presentation (preserved layers, dimensions, frames)', async () => {
      const plan = mockCandidatePlan('proj-damaged');
      const token = mockPlanToken(plan);
      vi.mocked(prepareRecoveryPlan).mockResolvedValueOnce({
        status: 'ready',
        planToken: token,
        candidatePlan: plan,
      });

      render(
        <RecoveryModal
          isOpen={true}
          onClose={vi.fn()}
          sourceProjectId="proj-damaged"
          initialAssessment={mockRecoverableAssessment('proj-damaged')}
          onRecoveryComplete={vi.fn()}
        />
      );

      // Transitions to ready phase with deterministic plan details
      await waitFor(() => {
        expect(screen.getByText(/Deterministic Recovery Plan/i)).toBeTruthy();
        expect(screen.getByText(/Damaged Artwork \(Recovered\)/i)).toBeTruthy();
        expect(screen.getByText(/valid layer bitmap\(s\) preserved and remapped/i)).toBeTruthy();
        expect(screen.getByText(/32 × 32 px/i)).toBeTruthy();
        expect(screen.getByText(/animation frame\(s\)/i)).toBeTruthy();
      });

      // Original custody lock badge is visible
      expect(screen.getByText(/Original Project Preserved Untouched/i)).toBeTruthy();
    });

    it('requires explicit user consent checkbox before enabling "Create Recovered Copy"', async () => {
      const plan = mockCandidatePlan('proj-damaged');
      const token = mockPlanToken(plan);
      vi.mocked(prepareRecoveryPlan).mockResolvedValueOnce({
        status: 'ready',
        planToken: token,
        candidatePlan: plan,
      });

      render(
        <RecoveryModal
          isOpen={true}
          onClose={vi.fn()}
          sourceProjectId="proj-damaged"
          onRecoveryComplete={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('create-recovered-copy-button')).toBeTruthy();
      });

      const commitButton = screen.getByTestId('create-recovered-copy-button') as HTMLButtonElement;
      const consentCheckbox = screen.getByTestId('recovery-consent-checkbox') as HTMLInputElement;

      // Button is initially disabled
      expect(commitButton.disabled).toBe(true);

      // Checking checkbox enables button
      fireEvent.click(consentCheckbox);
      expect(commitButton.disabled).toBe(false);

      // Unchecking disables it again
      fireEvent.click(consentCheckbox);
      expect(commitButton.disabled).toBe(true);
    });

    it('commits recovered project atomically on consent and invokes onRecoveryComplete', async () => {
      const plan = mockCandidatePlan('proj-damaged');
      const token = mockPlanToken(plan);
      vi.mocked(prepareRecoveryPlan).mockResolvedValueOnce({
        status: 'ready',
        planToken: token,
        candidatePlan: plan,
      });
      vi.mocked(commitRecoveredProject).mockResolvedValueOnce({
        status: 'persisted-success',
        recoveredProjectId: 'proj-recovered-123',
        recoveredTitle: 'Damaged Artwork (Recovered)',
      });

      const onClose = vi.fn();
      const onRecoveryComplete = vi.fn().mockResolvedValue(true);

      render(
        <RecoveryModal
          isOpen={true}
          onClose={onClose}
          sourceProjectId="proj-damaged"
          onRecoveryComplete={onRecoveryComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('recovery-consent-checkbox')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('recovery-consent-checkbox'));
      fireEvent.click(screen.getByTestId('create-recovered-copy-button'));

      // Transitions to committing phase
      expect(screen.getByText(/Persisting Recovered Copy Atomically/i)).toBeTruthy();

      // Calls commitRecoveredProject with the plan token
      expect(commitRecoveredProject).toHaveBeenCalledWith(token, expect.objectContaining({ signal: expect.any(AbortSignal) }));

      await waitFor(() => {
        expect(onRecoveryComplete).toHaveBeenCalledWith('proj-recovered-123');
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('stays open in error phase and preserves workspace if onRecoveryComplete returns false', async () => {
      const plan = mockCandidatePlan('proj-damaged');
      const token = mockPlanToken(plan);
      vi.mocked(prepareRecoveryPlan).mockResolvedValueOnce({
        status: 'ready',
        planToken: token,
        candidatePlan: plan,
      });
      vi.mocked(commitRecoveredProject).mockResolvedValueOnce({
        status: 'persisted-success',
        recoveredProjectId: 'proj-recovered-123',
        recoveredTitle: 'Damaged Artwork (Recovered)',
      });

      const onClose = vi.fn();
      const onRecoveryComplete = vi.fn().mockResolvedValue(false);

      render(
        <RecoveryModal
          isOpen={true}
          onClose={onClose}
          sourceProjectId="proj-damaged"
          onRecoveryComplete={onRecoveryComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('recovery-consent-checkbox')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('recovery-consent-checkbox'));
      fireEvent.click(screen.getByTestId('create-recovered-copy-button'));

      await waitFor(() => {
        expect(onRecoveryComplete).toHaveBeenCalledWith('proj-recovered-123');
      });

      // Does NOT close modal
      expect(onClose).not.toHaveBeenCalled();

      // Displays error phase explaining admission failed
      await waitFor(() => {
        expect(screen.getByText(/admitting it to the workspace failed/i)).toBeTruthy();
      });
    });

    it('prevents duplicate submission if commit is already in flight', async () => {
      const plan = mockCandidatePlan('proj-damaged');
      const token = mockPlanToken(plan);
      vi.mocked(prepareRecoveryPlan).mockResolvedValueOnce({
        status: 'ready',
        planToken: token,
        candidatePlan: plan,
      });

      let resolveCommit!: (val: unknown) => void;
      const commitPromise = new Promise((resolve) => {
        resolveCommit = resolve;
      });
      vi.mocked(commitRecoveredProject).mockReturnValueOnce(commitPromise as unknown as ReturnType<typeof commitRecoveredProject>);

      render(
        <RecoveryModal
          isOpen={true}
          onClose={vi.fn()}
          sourceProjectId="proj-damaged"
          onRecoveryComplete={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('recovery-consent-checkbox')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('recovery-consent-checkbox'));
      const commitButton = screen.getByTestId('create-recovered-copy-button');

      // Fire click twice rapidly
      fireEvent.click(commitButton);
      fireEvent.click(commitButton);

      expect(commitRecoveredProject).toHaveBeenCalledTimes(1);

      // Resolve in-flight promise to finish cleanly
      await act(async () => {
        resolveCommit({
          status: 'persisted-success',
          recoveredProjectId: 'proj-recovered-123',
          recoveredTitle: 'Damaged Artwork (Recovered)',
        });
      });
    });

    it('exports untouched backup via prepareUntouchedRecoveryArchive and Blob transport', async () => {
      const plan = mockCandidatePlan('proj-damaged');
      const token = mockPlanToken(plan);
      vi.mocked(prepareRecoveryPlan).mockResolvedValueOnce({
        status: 'ready',
        planToken: token,
        candidatePlan: plan,
      });

      const mockArchive = { projectId: 'proj-damaged', projectJson: '{}', blobs: [] };
      vi.mocked(prepareUntouchedRecoveryArchive).mockResolvedValueOnce(mockArchive as unknown as ReturnType<typeof prepareUntouchedRecoveryArchive> extends Promise<infer U> ? U : never);
      vi.mocked(createRecoveryArchiveBlob).mockResolvedValueOnce(new Blob(['mock-zip'], { type: 'application/zip' }));

      // Mock URL object
      const originalCreateObjectURL = window.URL.createObjectURL;
      const originalRevokeObjectURL = window.URL.revokeObjectURL;
      window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      window.URL.revokeObjectURL = vi.fn();

      render(
        <RecoveryModal
          isOpen={true}
          onClose={vi.fn()}
          sourceProjectId="proj-damaged"
          onRecoveryComplete={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Export Untouched Backup')).toBeTruthy();
      });

      fireEvent.click(screen.getByText('Export Untouched Backup'));

      await waitFor(() => {
        expect(prepareUntouchedRecoveryArchive).toHaveBeenCalledWith('proj-damaged');
        expect(createRecoveryArchiveBlob).toHaveBeenCalledWith(mockArchive);
      });

      window.URL.createObjectURL = originalCreateObjectURL;
      window.URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('handles clip-consent-required phase and re-evaluates plan on user consent', async () => {
      vi.mocked(prepareRecoveryPlan)
        .mockResolvedValueOnce({
          status: 'clip-consent-required',
          summary: 'Animation clip adjustment required',
          affectedClips: [
            {
              clipId: 'clip-walk',
              clipName: 'Walk Cycle',
              startFrame: 0,
              endFrame: 4,
              deletedFrameIndices: [2],
            },
          ],
        })
        .mockResolvedValueOnce({
          status: 'ready',
          planToken: mockPlanToken(mockCandidatePlan('proj-damaged')),
          candidatePlan: mockCandidatePlan('proj-damaged'),
        });

      render(
        <RecoveryModal
          isOpen={true}
          onClose={vi.fn()}
          sourceProjectId="proj-damaged"
          onRecoveryComplete={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Animation Clip Adjustment Consent Required/i)).toBeTruthy();
        expect(screen.getByText(/Walk Cycle:/i)).toBeTruthy();
      });

      fireEvent.click(screen.getByText('Adjust Clips & Continue'));

      await waitFor(() => {
        expect(prepareRecoveryPlan).toHaveBeenLastCalledWith(
          'proj-damaged',
          expect.objectContaining({ clipConsentGranted: true }),
          expect.anything()
        );
      });
    });

    it('handles additional-deletion-required phase and applies omissions on user acceptance', async () => {
      vi.mocked(prepareRecoveryPlan)
        .mockResolvedValueOnce({
          status: 'additional-deletion-required',
          summary: 'Damaged elements require omission',
          requiredDeletions: [
            {
              layerId: 'layer-bad',
              frameIndex: 0,
              reason: 'CORRUPTED_PNG_HEADER',
              message: 'Layer "Corrupted Layer" contains invalid PNG header',
            },
          ],
        })
        .mockResolvedValueOnce({
          status: 'ready',
          planToken: mockPlanToken(mockCandidatePlan('proj-damaged')),
          candidatePlan: mockCandidatePlan('proj-damaged'),
        });

      render(
        <RecoveryModal
          isOpen={true}
          onClose={vi.fn()}
          sourceProjectId="proj-damaged"
          onRecoveryComplete={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Damaged Element Deletion Required/i)).toBeTruthy();
        expect(screen.getByText(/Layer "Corrupted Layer" contains invalid PNG header/i)).toBeTruthy();
      });

      fireEvent.click(screen.getByText('Accept Deletions & Continue'));

      await waitFor(() => {
        expect(prepareRecoveryPlan).toHaveBeenLastCalledWith(
          'proj-damaged',
          expect.objectContaining({ deleteLayerIds: ['layer-bad'] }),
          expect.anything()
        );
      });
    });

    it('handles unrecoverable-blocked status by presenting explanation and backup export', async () => {
      vi.mocked(prepareRecoveryPlan).mockResolvedValueOnce({
        status: 'unrecoverable-blocked',
        reasonCode: 'SAFE_JSON_SYNTAX_ERROR',
        message: 'JSON structure cannot be parsed.',
        details: 'Unexpected token at position 0',
      });

      render(
        <RecoveryModal
          isOpen={true}
          onClose={vi.fn()}
          sourceProjectId="proj-damaged"
          onRecoveryComplete={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Automatic Reconstruction Unavailable/i)).toBeTruthy();
        expect(screen.getByText(/JSON structure cannot be parsed/i)).toBeTruthy();
        expect(screen.getByText(/Unexpected token at position 0/i)).toBeTruthy();
        expect(screen.getByText('Export Untouched Backup')).toBeTruthy();
      });
    });

    it('aborts previous diagnosis or commit when unmounted or cancelled', async () => {
      let abortedSignal: AbortSignal | undefined;
      vi.mocked(prepareRecoveryPlan).mockImplementation(async (_id, _dec, options) => {
        abortedSignal = options?.signal;
        return new Promise(() => {}); // never resolves
      });

      const { unmount } = render(
        <RecoveryModal
          isOpen={true}
          onClose={vi.fn()}
          sourceProjectId="proj-damaged"
          onRecoveryComplete={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(abortedSignal).toBeDefined();
      });
      expect(abortedSignal?.aborted).toBe(false);

      unmount();

      expect(abortedSignal?.aborted).toBe(true);
    });
  });

  // ==========================================================================
  // Hook & Routing Integration Tests
  // ==========================================================================

  describe('useStudioAutosave Recovery Routing & Reload Durability Integration', () => {
    it('sets pendingRecovery and records ledger assessment on startup recovery-required', async () => {
      const assessment = mockRecoverableAssessment('proj-startup-damaged');
      vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce('proj-startup-damaged');
      vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
        status: 'recovery-required',
        projectId: 'proj-startup-damaged',
        assessment,
      });

      const { result } = renderHook(useStudioAutosave);

      await waitFor(() => {
        expect(result.current.lifecycleState.phase).toBe('active');
      });

      const activeState = result.current.lifecycleState as Extract<
        typeof result.current.lifecycleState,
        { phase: 'active' }
      >;
      expect(activeState.pendingRecovery).toEqual({
        sourceProjectId: 'proj-startup-damaged',
        assessment,
      });

      // Bounded source ID tracked in sessionStorage
      expect(sessionStorage.getItem('pixibun:pending-recovery-source')).toBe('proj-startup-damaged');

      // Recorded in ledger
      expect(recordRecoveryAssessment).toHaveBeenCalledWith(assessment);
    });

    it('reconstructs pendingRecovery from sessionStorage on reload while on a fresh active workspace', async () => {
      // Simulate user reloaded: sessionStorage has pending source
      sessionStorage.setItem('pixibun:pending-recovery-source', 'proj-startup-damaged');
      const assessment = mockRecoverableAssessment('proj-startup-damaged');

      // DB has a fresh workspace 'proj-fresh'
      const freshProject = baseProjectFixture('proj-fresh', 'Fresh Blank Project');
      vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce('proj-fresh');
      vi.mocked(inspectAndAdmitStoredProject).mockImplementation(async (id) => {
        if (id === 'proj-fresh') {
          return {
            status: 'admitted',
            projectId: 'proj-fresh',
            project: freshProject,
            sourceBlobs: [],
          };
        }
        if (id === 'proj-startup-damaged') {
          return {
            status: 'recovery-required',
            projectId: 'proj-startup-damaged',
            assessment,
          };
        }
        return { status: 'not-found', projectId: id };
      });

      const { result } = renderHook(useStudioAutosave);

      await waitFor(() => {
        expect(result.current.lifecycleState.phase).toBe('active');
      });

      const activeState = result.current.lifecycleState as Extract<
        typeof result.current.lifecycleState,
        { phase: 'active' }
      >;
      expect(activeState.projectId).toBe('proj-fresh');

      // Deterministically reconstructed pendingRecovery
      expect(activeState.pendingRecovery).toEqual({
        sourceProjectId: 'proj-startup-damaged',
        assessment,
      });
    });

    it('clears pendingRecovery and removes sessionStorage item when clearPendingRecovery is called', async () => {
      sessionStorage.setItem('pixibun:pending-recovery-source', 'proj-startup-damaged');
      const assessment = mockRecoverableAssessment('proj-startup-damaged');
      vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce('proj-startup-damaged');
      vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
        status: 'recovery-required',
        projectId: 'proj-startup-damaged',
        assessment,
      });

      const { result } = renderHook(useStudioAutosave);

      await waitFor(() => {
        const state = result.current.lifecycleState as Extract<
          typeof result.current.lifecycleState,
          { phase: 'active' }
        >;
        expect(state.pendingRecovery).toBeDefined();
      });

      act(() => {
        result.current.clearPendingRecovery();
      });

      const finalState = result.current.lifecycleState as Extract<
        typeof result.current.lifecycleState,
        { phase: 'active' }
      >;
      expect(finalState.pendingRecovery).toBeUndefined();
      expect(sessionStorage.getItem('pixibun:pending-recovery-source')).toBeNull();
    });

    it('preserves active workspace and returns recovery-required when gallery attempts to open damaged project', async () => {
      const activeProject = baseProjectFixture('proj-healthy-active', 'Healthy Canvas');
      useStudioStore.getState().loadProjectState(activeProject, 'proj-healthy-active');

      const damagedAssessment = mockRecoverableAssessment('proj-gallery-damaged');
      vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
        status: 'recovery-required',
        projectId: 'proj-gallery-damaged',
        assessment: damagedAssessment,
      });

      const { result } = renderHook(useStudioAutosave);

      let openResult: OpenProjectResult | undefined;
      await act(async () => {
        openResult = await result.current.openStoredProject('proj-gallery-damaged');
      });

      expect(openResult).toBeDefined();
      if (!openResult || openResult.success || openResult.reason !== 'recovery-required') {
        expect.fail('Expected recovery-required result');
      }
      expect(openResult.success).toBe(false);
      expect(openResult.reason).toBe('recovery-required');
      expect(openResult.projectId).toBe('proj-gallery-damaged');

      // Active workspace remained untouched
      expect(useStudioStore.getState().currentProjectId).toBe('proj-healthy-active');
      expect(useStudioStore.getState().projectName).toBe('Healthy Canvas');

      // Session storage records pending source
      expect(sessionStorage.getItem('pixibun:pending-recovery-source')).toBe('proj-gallery-damaged');
    });

    it('clears sessionStorage and admits destination when openStoredProject is called with isRecoveredCopy=true', async () => {
      sessionStorage.setItem('pixibun:pending-recovery-source', 'proj-original-damaged');
      const recoveredProject = baseProjectFixture('proj-recovered-copy', 'Artwork (Recovered)');

      vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
        status: 'admitted',
        projectId: 'proj-recovered-copy',
        project: recoveredProject,
        sourceBlobs: [],
      });

      const { result } = renderHook(useStudioAutosave);

      let openResult: OpenProjectResult | undefined;
      await act(async () => {
        openResult = await result.current.openStoredProject('proj-recovered-copy', true);
      });

      expect(openResult).toBeDefined();
      if (!openResult || !openResult.success) {
        expect.fail('Expected successful admission');
      }
      expect(openResult.success).toBe(true);
      expect(openResult.projectId).toBe('proj-recovered-copy');

      // Recovered project hydrated into workspace
      expect(useStudioStore.getState().currentProjectId).toBe('proj-recovered-copy');
      expect(useStudioStore.getState().projectName).toBe('Artwork (Recovered)');

      // Pending recovery sessionStorage key cleaned up
      expect(sessionStorage.getItem('pixibun:pending-recovery-source')).toBeNull();
    });

    it('cleans up sessionStorage if pending recovery project is not found on reload', async () => {
      sessionStorage.setItem('pixibun:pending-recovery-source', 'proj-deleted-or-purged');
      vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce(null);
      vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
        status: 'not-found',
        projectId: 'proj-deleted-or-purged',
      });

      const { result } = renderHook(useStudioAutosave);

      await waitFor(() => {
        expect(result.current.lifecycleState.phase).toBe('active');
      });

      const activeState = result.current.lifecycleState as Extract<
        typeof result.current.lifecycleState,
        { phase: 'active' }
      >;
      expect(activeState.pendingRecovery).toBeUndefined();
      expect(sessionStorage.getItem('pixibun:pending-recovery-source')).toBeNull();
    });

    it('cleans up sessionStorage and ignores malformed pending recovery ID on reload', async () => {
      sessionStorage.setItem('pixibun:pending-recovery-source', '   ');
      vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce(null);

      const { result } = renderHook(useStudioAutosave);

      await waitFor(() => {
        expect(result.current.lifecycleState.phase).toBe('active');
      });

      const activeState = result.current.lifecycleState as Extract<
        typeof result.current.lifecycleState,
        { phase: 'active' }
      >;
      expect(activeState.pendingRecovery).toBeUndefined();
      expect(sessionStorage.getItem('pixibun:pending-recovery-source')).toBeNull();
    });

    it('preserves safe workspace, pendingRecovery, and sessionStorage token if admission of recovered copy fails', async () => {
      // 1. Establish existing safe workspace with active pendingRecovery context for original source
      sessionStorage.setItem('pixibun:pending-recovery-source', 'proj-original-damaged');
      const assessment = mockRecoverableAssessment('proj-original-damaged');
      vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce('proj-original-damaged');
      vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
        status: 'recovery-required',
        projectId: 'proj-original-damaged',
        assessment,
      });

      const { result } = renderHook(useStudioAutosave);

      await waitFor(() => {
        expect(result.current.lifecycleState.phase).toBe('active');
      });

      const initialActiveState = result.current.lifecycleState as Extract<
        typeof result.current.lifecycleState,
        { phase: 'active' }
      >;
      const safeWorkspaceId = initialActiveState.projectId;
      expect(initialActiveState.pendingRecovery?.sourceProjectId).toBe('proj-original-damaged');
      expect(sessionStorage.getItem('pixibun:pending-recovery-source')).toBe('proj-original-damaged');

      // 2. Attempt to admit recovered project copy, but admission fails
      vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
        status: 'blocked',
        projectId: 'proj-recovered-copy',
        reasonCode: 'CORRUPTED_METADATA',
        message: 'Recovered copy failed post-commit admission check.',
      });

      let openResult: OpenProjectResult | undefined;
      await act(async () => {
        openResult = await result.current.openStoredProject('proj-recovered-copy', true);
      });

      expect(openResult).toBeDefined();
      expect(openResult?.success).toBe(false);

      // 3. Verify failure semantics:
      // - Active workspace remained completely untouched (destination not published)
      expect(useStudioStore.getState().currentProjectId).toBe(safeWorkspaceId);

      // - pendingRecovery is preserved for the original source
      const finalActiveState = result.current.lifecycleState as Extract<
        typeof result.current.lifecycleState,
        { phase: 'active' }
      >;
      expect(finalActiveState.pendingRecovery?.sourceProjectId).toBe('proj-original-damaged');

      // - sessionStorage recovery source ID token is preserved
      expect(sessionStorage.getItem('pixibun:pending-recovery-source')).toBe('proj-original-damaged');
    });

    it('preserves safe workspace, pendingRecovery, and sessionStorage token if hydration of recovered copy fails', async () => {
      // 1. Establish existing safe workspace with active pendingRecovery context for original source
      sessionStorage.setItem('pixibun:pending-recovery-source', 'proj-original-damaged');
      const assessment = mockRecoverableAssessment('proj-original-damaged');
      vi.mocked(getLatestStoredProjectId).mockResolvedValueOnce('proj-original-damaged');
      vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
        status: 'recovery-required',
        projectId: 'proj-original-damaged',
        assessment,
      });

      const { result } = renderHook(useStudioAutosave);

      await waitFor(() => {
        expect(result.current.lifecycleState.phase).toBe('active');
      });

      const initialActiveState = result.current.lifecycleState as Extract<
        typeof result.current.lifecycleState,
        { phase: 'active' }
      >;
      const safeWorkspaceId = initialActiveState.projectId;
      expect(initialActiveState.pendingRecovery?.sourceProjectId).toBe('proj-original-damaged');

      // 2. Admission passes, but hydration throws an error
      const recoveredProject = baseProjectFixture('proj-recovered-copy', 'Artwork (Recovered)');
      vi.mocked(inspectAndAdmitStoredProject).mockResolvedValueOnce({
        status: 'admitted',
        projectId: 'proj-recovered-copy',
        project: recoveredProject,
        sourceBlobs: [],
      });
      vi.mocked(hydrateProject).mockRejectedValueOnce(new Error('Simulated Canvas Hydration Crash'));

      let openResult: OpenProjectResult | undefined;
      await act(async () => {
        openResult = await result.current.openStoredProject('proj-recovered-copy', true);
      });

      expect(openResult).toBeDefined();
      expect(openResult?.success).toBe(false);
      if (openResult && !openResult.success) {
        expect(openResult.reason).toBe('hydration-failure');
      }

      // 3. Verify failure semantics:
      // - Active workspace remained untouched (destination not published)
      expect(useStudioStore.getState().currentProjectId).toBe(safeWorkspaceId);

      // - pendingRecovery is preserved for the original source
      const finalActiveState = result.current.lifecycleState as Extract<
        typeof result.current.lifecycleState,
        { phase: 'active' }
      >;
      expect(finalActiveState.pendingRecovery?.sourceProjectId).toBe('proj-original-damaged');

      // - sessionStorage recovery source ID token is preserved
      expect(sessionStorage.getItem('pixibun:pending-recovery-source')).toBe('proj-original-damaged');
    });
  });
});
