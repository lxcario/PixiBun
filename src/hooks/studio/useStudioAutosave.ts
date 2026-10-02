'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import {
  autoSaveWorkspaceDetailed,
  getLatestStoredProjectId,
  loadLatestSavedWorkspace,
  type AutoSaveOutcome,
} from '@/lib/storage/db';
import { buildAutosavePayloadAsync, hydrateProject, generateCompositeThumbnail } from '@/lib/project/serialize';
import { commitPersistedRevisions } from '@/lib/project/persistenceRevisions';
import { isCurrentSaveRevision } from '@/lib/project/saveRevision';
import { studioEvents } from '@/lib/events/studioEvents';
import { isPracticeActive } from '@/lib/project/practiceSession';
import { registerStudioRouteSession, setStudioResume, getStudioResume, getPracticeReturnProject, clearPracticeReturnProject, type StudioResume } from '@/lib/project/studioRouteSession';

import type { SaveResult } from '@/types/project';
import { StorageResilience } from '@/lib/safety/storageResilience';
import { createId } from '@/lib/engine/id';
import {
  inspectAndAdmitStoredProject,
  isAutosavePermitted,
  type RestoreLifecycleState,
  type PendingRecoveryContext,
  type StartupIssueContext,
} from '@/lib/recovery/projectAdmission';
import { recordRecoveryAssessment } from '@/lib/recovery/recoveryLedger';
import type { StoredRecoveryAssessment } from '@/lib/recovery/recoveryTypes';

export type {
  RestoreLifecycleState,
  PendingRecoveryContext,
  StartupIssueContext,
};

export type OpenProjectResult =
  | { success: true; projectId: string }
  | {
      success: false;
      reason: 'recovery-required';
      projectId: string;
      assessment: StoredRecoveryAssessment;
      message: string;
    }
  | {
      success: false;
      reason: 'unsupported-version';
      projectId: string;
      foundVersion: number;
      supportedVersion: number;
      message: string;
    }
  | {
      success: false;
      reason: 'blocked';
      projectId: string;
      reasonCode: string;
      message: string;
    }
  | {
      success: false;
      reason: 'transient-failure';
      projectId: string;
      message: string;
    }
  | {
      success: false;
      reason: 'hydration-failure';
      projectId: string;
      message: string;
    }
  | {
      success: false;
      reason: 'not-found';
      projectId: string;
      message: string;
    }
  | {
      success: false;
      reason: 'superseded';
    }
  | {
      success: false;
      reason: 'cancelled';
    };

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        return await navigator.storage.persist();
      }
      return isPersisted;
    } catch {
      return false;
    }
  }
  return false;
}

export const AUTOSAVE_DEBOUNCE_MS = 800;

export function useStudioAutosave() {
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [saveConflict, setSaveConflict] = useState<string | null>(null);
  const storageVersionsRef = useRef(new Map<string, string>());
  const conflictRef = useRef<string | null>(null);
  
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveInFlightRef = useRef(false);
  const autosavePendingRef = useRef(false);
  const inFlightPromiseRef = useRef<Promise<SaveResult> | null>(null);
  const autosaveFailCountRef = useRef(0);

  // Single authoritative reactive lifecycle state & synchronous ref mirror
  const lifecycleRef = useRef<RestoreLifecycleState>({ phase: 'idle' });
  const [lifecycleState, setLifecycleState] = useState<RestoreLifecycleState>({ phase: 'idle' });
  const restorePromiseRef = useRef<Promise<void> | null>(null);

  const updateLifecycle = useCallback((next: RestoreLifecycleState) => {
    lifecycleRef.current = next;
    setLifecycleState(next);
  }, []);

  // Hook-local request epoch and AbortController coordinator
  const isMountedRef = useRef(true);
  const openEpochRef = useRef(0);
  const openAbortRef = useRef<AbortController | null>(null);

  const beginOpen = useCallback(() => {
    openEpochRef.current += 1;
    if (openAbortRef.current) {
      openAbortRef.current.abort();
    }
    openAbortRef.current = new AbortController();
    if (!isMountedRef.current) {
      openAbortRef.current.abort();
    }
    return {
      epoch: openEpochRef.current,
      signal: openAbortRef.current.signal,
    };
  }, []);

  const isOpenStale = useCallback((epoch: number) => {
    return epoch !== openEpochRef.current;
  }, []);

  const runAutosave = useCallback(async (): Promise<SaveResult> => {
    if (restorePromiseRef.current) {
      try {
        await restorePromiseRef.current;
      } catch {
        // Handled in restore promise
      }
    }

    if (isPracticeActive()) {
      return { ok: false, reason: 'lifecycle-suspended', error: 'Studio autosave is suspended during practice.' };
    }
    const currentPhase = lifecycleRef.current.phase;
    if (!isAutosavePermitted(currentPhase)) {
      return {
        ok: false,
        reason: 'lifecycle-suspended',
        error: `Autosave suspended: workspace is in '${currentPhase}' phase.`,
      };
    }

    const currentProjId = useStudioStore.getState().currentProjectId;
    if (conflictRef.current === currentProjId) {
      return { ok: false, reason: 'conflict', error: 'Save a copy to preserve your work.' };
    }
    if (
      lifecycleRef.current.phase === 'active' &&
      lifecycleRef.current.pendingRecovery?.sourceProjectId &&
      currentProjId === lifecycleRef.current.pendingRecovery.sourceProjectId
    ) {
      return {
        ok: false,
        reason: 'restore-invalid',
        error: 'Active project restore failed and is preserved read-only.',
      };
    }
    if (autosaveInFlightRef.current) {
      autosavePendingRef.current = true;
      if (inFlightPromiseRef.current) {
        return await inFlightPromiseRef.current;
      }
      return { ok: false, reason: 'unknown', error: 'Save already in-flight' };
    }

    autosaveInFlightRef.current = true;
    const savePromise = (async (): Promise<SaveResult> => {
      let finalResult: SaveResult = { ok: false, reason: 'unknown' };
      try {
        do {
          autosavePendingRef.current = false;
          if (isPracticeActive()) {
            return { ok: false, reason: 'lifecycle-suspended', error: 'Studio autosave is suspended during practice.' };
          }
          const state = useStudioStore.getState();
          const expectedVersion = storageVersionsRef.current.get(state.currentProjectId) ?? null;

          const { setSaveStatus } = useStudioStore.getState();
          setSaveStatus('saving');
          try {
            const thumbnailDataUrl = generateCompositeThumbnail(128, 128);
            let payload;
            try {
              payload = await buildAutosavePayloadAsync();
            } catch (serErr) {
              setSaveStatus('error');
              finalResult = {
                ok: false,
                reason: 'serialization',
                error: serErr instanceof Error ? serErr.message : 'Serialization failed',
              };
              continue;
            }

            const { project, layerBlobs, capturedRevisions } = payload;
            const saveOutcome: AutoSaveOutcome = await autoSaveWorkspaceDetailed(
              state.currentProjectId,
              project,
              thumbnailDataUrl,
              layerBlobs,
              undefined,
              expectedVersion
            );

            if (saveOutcome.ok) {
              if (saveOutcome.storageVersion) storageVersionsRef.current.set(state.currentProjectId, saveOutcome.storageVersion);
              if (typeof commitPersistedRevisions === 'function') {
                commitPersistedRevisions(state.currentProjectId, capturedRevisions);
              }
              autosaveFailCountRef.current = 0;
              setAutosaveError(null);
              const savedCurrent = isCurrentSaveRevision(state);
              if (savedCurrent) {
                setSaveStatus('saved');
                useStudioStore.getState().markClean();
                finalResult = { ok: true, status: 'saved' };
              } else {
                autosavePendingRef.current = true;
              }
              // Keep the last confirmed write visible until a new edit or save attempt.
            } else {
              setSaveStatus('error');
              if (saveOutcome.reason === 'conflict') {
                conflictRef.current = state.currentProjectId;
                setSaveConflict(state.currentProjectId);
                setAutosaveError(saveOutcome.error);
                autosavePendingRef.current = false;
                finalResult = { ok: false, reason: 'conflict', error: saveOutcome.error };
              } else if (saveOutcome.reason === 'memory-limit') {
                setAutosaveError(saveOutcome.error);
                finalResult = { ok: false, reason: 'memory-limit', error: saveOutcome.error };
              } else if (saveOutcome.reason === 'invariant-invalid') {
                const errorMsg =
                  saveOutcome.error ||
                  'Autosave halted: workspace exceeds safety limits. Last valid save preserved.';
                setAutosaveError(errorMsg);
                studioEvents.emit('pixibun:toast', {
                  type: 'error',
                  message: errorMsg,
                });
                finalResult = {
                  ok: false,
                  reason: 'invariant-invalid',
                  error: errorMsg,
                };
              } else {
                autosaveFailCountRef.current += 1;
                if (autosaveFailCountRef.current >= 2) {
                  setAutosaveError(
                    'Autosave warning: Browser local storage write failed (disk quota or privacy restriction). Please export your drawing as PNG or .pixibun to avoid data loss.'
                  );
                }
                finalResult = {
                  ok: false,
                  reason: saveOutcome.reason === 'quota-exceeded' ? 'quota' : 'storage-unavailable',
                  error: saveOutcome.error || 'Storage write returned false',
                };
              }
            }
          } catch (err: unknown) {
            console.error('Autosave failed:', err);
            autosaveFailCountRef.current += 1;
            setSaveStatus('error');
            if (autosaveFailCountRef.current >= 2) {
              setAutosaveError(
                'Autosave warning: Browser local storage write failed (disk quota or privacy restriction). Please export your drawing as PNG or .pixibun to avoid data loss.'
              );
            }
            const isQuota = StorageResilience.isQuotaExceeded(err);
            finalResult = {
              ok: false,
              reason: isQuota ? 'quota' : 'transaction',
              error: err instanceof Error ? err.message : String(err),
            };
          }
        } while (autosavePendingRef.current);
        return finalResult;
      } finally {
        autosaveInFlightRef.current = false;
        inFlightPromiseRef.current = null;
      }
    })();

    inFlightPromiseRef.current = savePromise;
    return await savePromise;
  }, []);

  const saveConflictCopy = useCallback(async () => {
    const state = useStudioStore.getState();
    if (autosaveInFlightRef.current || conflictRef.current !== state.currentProjectId) return;
    const newId = createId('proj');
    // A new identity makes every raster dirty without clearing the live artwork/history.
    useStudioStore.setState({ currentProjectId: newId, projectName: `${state.projectName.slice(0, 100)} (conflict copy)` });
    useStudioStore.getState().setDirty(true);
    conflictRef.current = null;
    setSaveConflict(null);
    updateLifecycle({ phase: 'active', projectId: newId });
    await runAutosave();
  }, [runAutosave, updateLifecycle]);

  // Keep only the latest Studio's save coordinator for the practice route handoff.
  useEffect(() => {
    if (lifecycleState.phase !== 'active') return;
    const projectId = lifecycleState.projectId;
    const resume = (): StudioResume => ({
      projectId, storageVersions: new Map(storageVersionsRef.current),
      lifecycle: lifecycleRef.current, conflictProjectId: conflictRef.current,
    });
    registerStudioRouteSession({
      projectId, resume,
      checkpoint: async () => {
        if (useStudioStore.getState().currentProjectId !== projectId) throw new Error('Studio no longer owns this drawing.');
        const result = await runAutosave();
        if (!result.ok || useStudioStore.getState().isDirty || useStudioStore.getState().currentProjectId !== projectId) {
          throw new Error(result.ok ? 'Your drawing changed while saving. Try again from Studio.' : result.error || 'Your drawing could not be saved. Return to Studio and export a backup.');
        }
        return resume();
      },
    });
  }, [lifecycleState, runAutosave]);

  const scheduleAutosave = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void runAutosave();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [runAutosave]);

  const handleCommitHistory = useCallback(() => {
    useStudioStore.getState().setDirty(true);
  }, []);

  // Persist every document mutation, including layer metadata and animation
  // changes that do not create a pixel-history entry.
  useEffect(() => useStudioStore.subscribe((state, previousState) => {
    if (
      state.editRevision !== previousState.editRevision &&
      state.isDirty
    ) {
      scheduleAutosave();
    }
  }), [scheduleAutosave]);

  // An edit made while startup restore is still finishing can miss the
  // subscription or have its first timer expire before autosave is permitted.
  // Retry the dirty revision once the workspace becomes active.
  useEffect(() => {
    if (lifecycleState.phase === 'active' && useStudioStore.getState().isDirty) {
      scheduleAutosave();
    }
  }, [lifecycleState, scheduleAutosave]);

  // Native exit guard when changes are unsaved (UX-2)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useStudioStore.getState().isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Remote co-draw strokes mutate pixel buffers without a local history
  // commit, so schedule the same debounced autosave when a peer changes the
  // canvas — otherwise peer artwork would only persist on the next local edit.
  useEffect(() => {
    const unsub = studioEvents.on('pixibun:remote-change', () => handleCommitHistory());
    return unsub;
  }, [handleCommitHistory]);

  // Best-effort flush when the tab is hidden or closed mid-debounce.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void runAutosave();
      }
    };
    const onPageHide = () => void runAutosave();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [runAutosave]);

  // Abort any in-flight open operation when the hook unmounts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      if (openAbortRef.current) {
        openAbortRef.current.abort();
      }
    };
  }, []);

  const clearPendingRecovery = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pixibun:pending-recovery-source');
      }
    } catch {
      // ignore sessionStorage restrictions
    }
    if (lifecycleRef.current.phase === 'active' && lifecycleRef.current.pendingRecovery) {
      updateLifecycle({
        phase: 'active',
        projectId: lifecycleRef.current.projectId,
        pendingRecovery: undefined,
      });
    }
  }, [updateLifecycle]);

  // Coordinated project opener for Gallery, startup, and recovery opening
  const openStoredProject = useCallback(
    async (targetProjectId: string, isRecoveredCopy = false): Promise<OpenProjectResult> => {
      if (!isMountedRef.current) return { success: false, reason: 'cancelled' };
      const previousActiveState = lifecycleRef.current;

      // Suspend debounced autosave timer
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }

      // Preserve unsaved edits before replacing the live workspace.
      if (previousActiveState.phase === 'active' && useStudioStore.getState().isDirty) {
        try {
          const result = await runAutosave();
          if (!result.ok || useStudioStore.getState().isDirty) {
            return {
              success: false,
              reason: 'blocked',
              projectId: targetProjectId,
              reasonCode: 'unsaved-workspace',
              message: 'The current drawing could not be saved. Export a backup before opening another project.',
            };
          }
        } catch {
          return {
            success: false,
            reason: 'blocked',
            projectId: targetProjectId,
            reasonCode: 'unsaved-workspace',
            message: 'The current drawing could not be saved. Export a backup before opening another project.',
          };
        }
      }

      if (!isMountedRef.current) return { success: false, reason: 'cancelled' };
      const { epoch, signal } = beginOpen();
      updateLifecycle({ phase: 'loading', projectId: targetProjectId });
      if (isOpenStale(epoch)) return { success: false, reason: 'superseded' };

      updateLifecycle({ phase: 'assessing', projectId: targetProjectId });
      if (isOpenStale(epoch)) return { success: false, reason: 'superseded' };

      const admission = await inspectAndAdmitStoredProject(targetProjectId, { signal });
      if (isOpenStale(epoch)) return { success: false, reason: 'superseded' };
      if (signal.aborted) return { success: false, reason: 'cancelled' };

      if (admission.status === 'admitted') {
        updateLifecycle({ phase: 'hydrating', projectId: targetProjectId });
        try {
          await hydrateProject(
            admission.project,
            admission.projectId,
            admission.sourceBlobs,
            () => !isOpenStale(epoch) && !signal.aborted
          );
        } catch (err: unknown) {
          if (isOpenStale(epoch)) return { success: false, reason: 'superseded' };
          if (signal.aborted) return { success: false, reason: 'cancelled' };

          console.error('Hydration failed after admission:', err);
          const message = err instanceof Error ? err.message : 'Hydration failed';

          if (previousActiveState.phase === 'active') {
            // Restore previous active workspace (Correction #6)
            updateLifecycle(previousActiveState);
            return {
              success: false,
              reason: 'hydration-failure',
              projectId: targetProjectId,
              message: `Project could not be loaded into the workspace: ${message}`,
            };
          }

          const newId = createId('proj');
          useStudioStore.getState().resetToNewProject(newId);
          setAutosaveError(`Project could not be loaded into the workspace: ${message}`);
          updateLifecycle({
            phase: 'active',
            projectId: newId,
            startupIssue: {
              kind: 'hydration-failure',
              sourceProjectId: targetProjectId,
              message,
            },
          });
          return {
            success: false,
            reason: 'hydration-failure',
            projectId: targetProjectId,
            message,
          };
        }

        if (isOpenStale(epoch)) return { success: false, reason: 'superseded' };
        if (signal.aborted) return { success: false, reason: 'cancelled' };
        if (admission.storageVersion) storageVersionsRef.current.set(targetProjectId, admission.storageVersion);
        clearPracticeReturnProject();
        if (isRecoveredCopy) {
          try {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('pixibun:pending-recovery-source');
            }
          } catch {
            // ignore
          }
        }
        updateLifecycle({
          phase: 'active',
          projectId: targetProjectId,
          pendingRecovery: isRecoveredCopy
            ? undefined
            : (previousActiveState.phase === 'active' ? previousActiveState.pendingRecovery : undefined),
        });
        return { success: true, projectId: targetProjectId };
      }

      // Not admitted: restore previous workspace if active (Gallery flow)
      if (previousActiveState.phase === 'active') {
        updateLifecycle(previousActiveState);
      }

      switch (admission.status) {
        case 'recovery-required':
          if (
            Array.isArray(admission.assessment.reasonCodes) &&
            admission.assessment.reasonCodes.length > 0
          ) {
            void recordRecoveryAssessment(admission.assessment).catch((e) => {
              console.warn('Failed to record recovery assessment in ledger:', e);
            });
          }
          try {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('pixibun:pending-recovery-source', targetProjectId);
            }
          } catch {
            // ignore
          }
          if (previousActiveState.phase === 'active') {
            updateLifecycle({
              ...previousActiveState,
              pendingRecovery: {
                sourceProjectId: targetProjectId,
                assessment: admission.assessment,
              },
            });
          }
          return {
            success: false,
            reason: 'recovery-required',
            projectId: targetProjectId,
            assessment: admission.assessment,
            message: 'This project requires recovery and cannot be opened directly.',
          };
        case 'unsupported-version':
          return {
            success: false,
            reason: 'unsupported-version',
            projectId: targetProjectId,
            foundVersion: admission.foundVersion,
            supportedVersion: admission.supportedVersion,
            message: admission.message,
          };
        case 'blocked':
          return {
            success: false,
            reason: 'blocked',
            projectId: targetProjectId,
            reasonCode: admission.reasonCode,
            message: admission.message,
          };
        case 'transient-failure':
          return {
            success: false,
            reason: 'transient-failure',
            projectId: targetProjectId,
            message: admission.message,
          };
        case 'not-found':
          return {
            success: false,
            reason: 'not-found',
            projectId: targetProjectId,
            message: 'Project not found in storage.',
          };
        case 'cancelled':
          return { success: false, reason: 'cancelled' };
      }
    },
    [beginOpen, isOpenStale, runAutosave, updateLifecycle]
  );

  // Restore the last session on mount and request persistent storage.
  useEffect(() => {
    void requestPersistentStorage().then((persisted) => {
      if (!persisted) {
        if (typeof navigator !== 'undefined' && navigator.storage) {
          console.warn(
            'Persistent storage request was denied or not granted. Artwork remains saved locally in IndexedDB but may be subject to browser storage eviction under disk pressure.'
          );
        }
        let dismissed = false;
        try {
          dismissed = typeof window !== 'undefined' && sessionStorage.getItem('pixibun:storage-dismissed') === '1';
        } catch {
          // sessionStorage may be blocked in strict privacy modes
        }
        if (!dismissed) {
          setStorageWarning(
            'Persistent storage not granted: artwork is saved in IndexedDB but may be evicted by the browser under disk pressure (common on iOS / Safari). Please export backups regularly.'
          );
        }
      }
    });

    // Studio mode must never display playground tracing stencils
    useOnboardingStore.setState({ isPlaygroundActive: false, showStencilGuide: false });

    const resume = getStudioResume(useStudioStore.getState().currentProjectId);
    if (resume) {
      let cancelled = false;
      const applyResume = (ticket: StudioResume) => {
        if (cancelled || useStudioStore.getState().currentProjectId !== ticket.projectId) return;
        storageVersionsRef.current = new Map(ticket.storageVersions);
        conflictRef.current = ticket.conflictProjectId;
        setSaveConflict(ticket.conflictProjectId);
        setAutosaveError(ticket.error ?? null);
        setStudioResume(ticket);
        updateLifecycle(ticket.lifecycle);
        clearPracticeReturnProject();
      };
      if (resume.checkpoint) {
        updateLifecycle({ phase: 'loading', projectId: resume.projectId });
        restorePromiseRef.current = resume.checkpoint.then(applyResume);
      } else {
        applyResume(resume);
      }
      return () => { cancelled = true; };
    }

    let unmounted = false;

    restorePromiseRef.current = (async () => {
      // 1. Identify latest project ID via bounded metadata query (Correction #1)
      let targetId: string | null = null;
      try {
        targetId = getPracticeReturnProject() ?? (typeof getLatestStoredProjectId === 'function'
          ? await getLatestStoredProjectId()
          : (await loadLatestSavedWorkspace?.())?.id ?? null);
      } catch (err: unknown) {
        if (unmounted) return;
        console.error('Storage read error on startup:', err);
        const newId = createId('proj');
        useStudioStore.getState().resetToNewProject(newId);
        setAutosaveError('Browser storage is unavailable; your workspace could not be restored.');
        updateLifecycle({
          phase: 'active',
          projectId: newId,
          startupIssue: {
            kind: 'transient-failure',
            message: err instanceof Error ? err.message : 'Database error',
          },
        });
        return;
      }

      if (unmounted) return;

      if (!targetId) {
        // No saved project in database
        let pendingRecovery: PendingRecoveryContext | undefined;
        try {
          const pendingSourceId =
            typeof window !== 'undefined'
              ? sessionStorage.getItem('pixibun:pending-recovery-source')
              : null;
          if (pendingSourceId !== null) {
            if (pendingSourceId.trim().length > 0) {
              const pendingAdmission = await inspectAndAdmitStoredProject(pendingSourceId);
              if (pendingAdmission.status === 'recovery-required') {
                pendingRecovery = {
                  sourceProjectId: pendingSourceId,
                  assessment: pendingAdmission.assessment,
                };
              } else {
                sessionStorage.removeItem('pixibun:pending-recovery-source');
              }
            } else {
              sessionStorage.removeItem('pixibun:pending-recovery-source');
            }
          }
        } catch {
          // ignore
        }
        updateLifecycle({
          phase: 'active',
          projectId: useStudioStore.getState().currentProjectId,
          pendingRecovery,
        });
        return;
      }

      // 2. Begin open request with epoch & abort controller
      const { epoch, signal } = beginOpen();
      updateLifecycle({ phase: 'loading', projectId: targetId });
      if (unmounted || isOpenStale(epoch)) return;

      updateLifecycle({ phase: 'assessing', projectId: targetId });
      if (unmounted || isOpenStale(epoch)) return;

      const admission = await inspectAndAdmitStoredProject(targetId, { signal });
      if (unmounted || isOpenStale(epoch) || signal.aborted) return;

      if (admission.status === 'admitted') {
        updateLifecycle({ phase: 'hydrating', projectId: targetId });
        try {
          await hydrateProject(
            admission.project,
            admission.projectId,
            admission.sourceBlobs,
            () => !unmounted && !isOpenStale(epoch) && !signal.aborted
          );
          if (!unmounted && !isOpenStale(epoch)) {
            if (admission.storageVersion) storageVersionsRef.current.set(targetId, admission.storageVersion);
            clearPracticeReturnProject();
            let pendingRecovery: PendingRecoveryContext | undefined;
            try {
              const pendingSourceId =
                typeof window !== 'undefined'
                  ? sessionStorage.getItem('pixibun:pending-recovery-source')
                  : null;
              if (pendingSourceId !== null && pendingSourceId !== targetId) {
                if (pendingSourceId.trim().length > 0) {
                  const pendingAdmission = await inspectAndAdmitStoredProject(pendingSourceId, { signal });
                  if (pendingAdmission.status === 'recovery-required') {
                    pendingRecovery = {
                      sourceProjectId: pendingSourceId,
                      assessment: pendingAdmission.assessment,
                    };
                  } else {
                    sessionStorage.removeItem('pixibun:pending-recovery-source');
                  }
                } else {
                  sessionStorage.removeItem('pixibun:pending-recovery-source');
                }
              }
            } catch {
              // ignore
            }
            if (unmounted || isOpenStale(epoch)) return;
            updateLifecycle({ phase: 'active', projectId: targetId, pendingRecovery });
          }
        } catch (hydErr: unknown) {
          if (unmounted || isOpenStale(epoch) || signal.aborted) return;
          console.error('Startup project restore failed during hydration:', hydErr);
          const newId = createId('proj');
          useStudioStore.getState().resetToNewProject(newId);
          setAutosaveError(
            'Saved workspace could not be validated or restored. The original stored project has been preserved for recovery. A fresh workspace has been prepared.'
          );
          updateLifecycle({
            phase: 'active',
            projectId: newId,
            startupIssue: {
              kind: 'hydration-failure',
              sourceProjectId: targetId,
              message: hydErr instanceof Error ? hydErr.message : 'Hydration failed',
            },
          });
        }
      } else if (admission.status === 'recovery-required') {
        if (unmounted || isOpenStale(epoch)) return;
        if (
          Array.isArray(admission.assessment.reasonCodes) &&
          admission.assessment.reasonCodes.length > 0
        ) {
          void recordRecoveryAssessment(admission.assessment).catch((e) => {
            console.warn('Failed to record recovery assessment in ledger:', e);
          });
        }
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('pixibun:pending-recovery-source', targetId);
          }
        } catch {
          // ignore
        }
        const newId = createId('proj');
        useStudioStore.getState().resetToNewProject(newId);
        setAutosaveError(
          'Saved workspace could not be validated or restored. The original stored project has been preserved for recovery. A fresh workspace has been prepared.'
        );
        updateLifecycle({
          phase: 'active',
          projectId: newId,
          pendingRecovery: {
            sourceProjectId: targetId,
            assessment: admission.assessment,
          },
        });
      } else if (admission.status === 'unsupported-version') {
        if (unmounted || isOpenStale(epoch)) return;
        const newId = createId('proj');
        useStudioStore.getState().resetToNewProject(newId);
        setAutosaveError(admission.message);
        updateLifecycle({
          phase: 'active',
          projectId: newId,
          startupIssue: {
            kind: 'unsupported-version',
            sourceProjectId: targetId,
            reasonCode: 'UNSUPPORTED_FUTURE_VERSION',
            message: admission.message,
          },
        });
      } else if (admission.status === 'blocked') {
        if (unmounted || isOpenStale(epoch)) return;
        const newId = createId('proj');
        useStudioStore.getState().resetToNewProject(newId);
        setAutosaveError(
          'Saved workspace could not be validated or restored. The original stored project has been preserved for recovery. A fresh workspace has been prepared.'
        );
        updateLifecycle({
          phase: 'active',
          projectId: newId,
          startupIssue: {
            kind: 'blocked',
            sourceProjectId: targetId,
            reasonCode: admission.reasonCode,
            message: admission.message,
          },
        });
      } else if (admission.status === 'transient-failure') {
        if (unmounted || isOpenStale(epoch)) return;
        const newId = createId('proj');
        useStudioStore.getState().resetToNewProject(newId);
        setAutosaveError('Browser storage is unavailable; your workspace could not be restored.');
        updateLifecycle({
          phase: 'active',
          projectId: newId,
          startupIssue: {
            kind: 'transient-failure',
            sourceProjectId: targetId,
            message: admission.message,
          },
        });
      } else if (admission.status === 'not-found') {
        if (unmounted || isOpenStale(epoch)) return;
        if (getPracticeReturnProject() === targetId) {
          // A missing original cannot be recovered through a permanent pointer.
          // Release it so new drawings can restore normally after a later save.
          clearPracticeReturnProject();
          setAutosaveError('The saved drawing you were returning to is no longer available in this browser. A fresh drawing is open. If you have a Project Backup, import it to restore your artwork.');
        }
        updateLifecycle({ phase: 'active', projectId: useStudioStore.getState().currentProjectId });
      }
    })();

    return () => {
      unmounted = true;
      if (openAbortRef.current) {
        openAbortRef.current.abort();
      }
    };
  }, [beginOpen, isOpenStale, runAutosave, updateLifecycle]);

  return {
    autosaveTimerRef,
    runAutosave,
    handleCommitHistory,
    autosaveError,
    saveConflict: lifecycleState.phase === 'active' && saveConflict === lifecycleState.projectId,
    saveConflictCopy,
    setAutosaveError,
    storageWarning,
    setStorageWarning,
    lifecycleState,
    openStoredProject,
    clearPendingRecovery,
  };
}
