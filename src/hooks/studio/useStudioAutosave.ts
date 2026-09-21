'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { autoSaveWorkspace, loadLatestSavedWorkspace } from '@/lib/storage/db';
import { buildAutosavePayloadAsync, hydrateProject, generateCompositeThumbnail } from '@/lib/project/serialize';
import { commitPersistedRevisions } from '@/lib/project/persistenceRevisions';
import { isCurrentSaveRevision } from '@/lib/project/saveRevision';
import { studioEvents } from '@/lib/events/studioEvents';

import type { SaveResult } from '@/types/project';
import { StorageResilience } from '@/lib/safety/storageResilience';
import { decodeAndValidateProject } from '@/lib/project/decodeProject';

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
  
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveInFlightRef = useRef(false);
  const autosavePendingRef = useRef(false);
  const inFlightPromiseRef = useRef<Promise<SaveResult> | null>(null);
  const autosaveFailCountRef = useRef(0);
  const restorePromiseRef = useRef<Promise<void> | null>(null);
  const restoreFailedRef = useRef<string | null>(null);

  const runAutosave = useCallback(async (): Promise<SaveResult> => {
    if (restorePromiseRef.current) await restorePromiseRef.current;
    const currentProjId = useStudioStore.getState().currentProjectId;
    if (restoreFailedRef.current === currentProjId) {
      return { ok: false, reason: 'restore-invalid', error: 'Active project restore failed and is preserved read-only.' };
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
          const state = useStudioStore.getState();

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
            const success = await autoSaveWorkspace(
              state.currentProjectId,
              project.name,
              project.width,
              project.height,
              project.fps,
              project,
              thumbnailDataUrl,
              layerBlobs
            );
            if (success) {
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
              // Reset to idle after a short delay so it doesn't stay 'saved' forever
              setTimeout(() => {
                if (useStudioStore.getState().saveStatus === 'saved') {
                  useStudioStore.getState().setSaveStatus('idle');
                }
              }, 2000);
            } else {
              autosaveFailCountRef.current += 1;
              setSaveStatus('error');
              if (autosaveFailCountRef.current >= 2) {
                setAutosaveError(
                  'Autosave warning: Browser local storage write failed (disk quota or privacy restriction). Please export your drawing as PNG or .pixibun to avoid data loss.'
                );
              }
              finalResult = { ok: false, reason: 'storage-unavailable', error: 'Storage write returned false' };
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

    const isFromPlayground =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('fromPlayground') === 'true';

    if (isFromPlayground) {
      // Abort workspace rehydration so live buffers from playground are not cleared by clearAllBuffers()!
      // Trigger an immediate autosave of the active session so it gets stored in IndexedDB.
      const state = useStudioStore.getState();
      if (state.projectName === 'Untitled Sprite') {
        state.setProjectName('Playground Animation');
      }
      void runAutosave();
      return;
    }

    let cancelled = false;
    const initialState = useStudioStore.getState();
    restorePromiseRef.current = loadLatestSavedWorkspace().then(async (saved) => {
      if (!saved || cancelled) return;
      try {
        const decoded = decodeAndValidateProject(saved.dataJson);
        if (!decoded.ok) throw new Error(decoded.error);
        await hydrateProject(decoded.value, saved.id, saved.layerBlobs, () => !cancelled && isCurrentSaveRevision(initialState));
        restoreFailedRef.current = null;
      } catch (err) {
        if (cancelled || !isCurrentSaveRevision(initialState)) return;
        console.error('Project restore failed:', err);
        // Track the corrupt stored project ID so we NEVER overwrite it
        restoreFailedRef.current = saved.id;
        // Recover active workspace into a fresh, valid project state with a fresh project ID
        useStudioStore.getState().resetToNewProject();
        setAutosaveError('Saved workspace could not be restored and has been preserved in storage. A fresh workspace has been prepared.');
      }
    }).catch(() => {
      restoreFailedRef.current = null;
      setAutosaveError('Browser storage is unavailable; your workspace could not be restored.');
    });
    return () => {
      cancelled = true;
    };
  }, [runAutosave]);

  return {
    autosaveTimerRef,
    runAutosave,
    handleCommitHistory,
    autosaveError,
    setAutosaveError,
    storageWarning,
    setStorageWarning,
  };
}
