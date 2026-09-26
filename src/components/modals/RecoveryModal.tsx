'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import {
  prepareRecoveryPlan,
  commitRecoveredProject,
  formatRecoveredTitle,
} from '@/lib/recovery/recoveryOrchestrator';
import {
  prepareUntouchedRecoveryArchive,
  generateRecoveryBackupFilename,
} from '@/lib/recovery/recoveryBackup';
import {
  createRecoveryArchiveBlob,
  writeRecoveryArchiveToFileHandle,
} from '@/lib/recovery/recoveryBackupTransport';
import type {
  StoredRecoveryAssessment,
  TrustedRecoveryPlanToken,
  CandidateRecoveryPlan,
  AffectedClipDescriptor,
  AdditionalDeletionItem,
  RecoveryPlanBuilderDecisions,
} from '@/lib/recovery/recoveryTypes';
import { studioEvents } from '@/lib/events/studioEvents';

export interface RecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceProjectId: string;
  initialAssessment?: StoredRecoveryAssessment;
  onRecoveryComplete: (recoveredProjectId: string) => Promise<boolean>;
}

type ModalLifecyclePhase =
  | 'diagnosing'
  | 'ready'
  | 'clip-consent-required'
  | 'additional-deletion-required'
  | 'unrecoverable-blocked'
  | 'committing'
  | 'success'
  | 'error';

export const RecoveryModal: React.FC<RecoveryModalProps> = ({
  isOpen,
  onClose,
  sourceProjectId,
  initialAssessment,
  onRecoveryComplete,
}) => {
  const [phase, setPhase] = useState<ModalLifecyclePhase>('diagnosing');
  const [planToken, setPlanToken] = useState<TrustedRecoveryPlanToken | null>(null);
  const [candidatePlan, setCandidatePlan] = useState<CandidateRecoveryPlan | null>(null);
  const [affectedClips, setAffectedClips] = useState<readonly AffectedClipDescriptor[]>([]);
  const [requiredDeletions, setRequiredDeletions] = useState<readonly AdditionalDeletionItem[]>([]);
  const [clipConsentGranted, setClipConsentGranted] = useState(false);
  const [_additionalDeletionsAccepted, setAdditionalDeletionsAccepted] = useState(false);
  const [userConsent, setUserConsent] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [_recoveredProjectId, setRecoveredProjectId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const committingRef = useRef(false);

  const initialProjectName =
    initialAssessment && 'project' in initialAssessment && initialAssessment.project
      ? initialAssessment.project.name
      : undefined;

  const projectName =
    candidatePlan?.candidateProject?.name ||
    initialProjectName ||
    'Untitled Sprite';

  const recoveredTitle = formatRecoveredTitle(projectName);

  // Analyze and prepare the recovery plan
  const loadPlan = useCallback(
    async (decisions?: RecoveryPlanBuilderDecisions) => {
      if (!sourceProjectId) return;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setPhase('diagnosing');
      setErrorMessage(null);
      setErrorDetails(null);

      try {
        const result = await prepareRecoveryPlan(sourceProjectId, decisions, { signal });
        if (signal.aborted) return;

        switch (result.status) {
          case 'ready':
            setPlanToken(result.planToken);
            setCandidatePlan(result.candidatePlan);
            setPhase('ready');
            break;

          case 'clip-consent-required':
            setAffectedClips(result.affectedClips);
            setPhase('clip-consent-required');
            break;

          case 'additional-deletion-required':
            setRequiredDeletions(result.requiredDeletions);
            setPhase('additional-deletion-required');
            break;

          case 'unrecoverable-blocked':
            setErrorMessage(result.message);
            setErrorDetails(result.details || `Reason Code: ${result.reasonCode}`);
            setPhase('unrecoverable-blocked');
            break;

          case 'cancelled':
            setPhase('diagnosing');
            break;
        }
      } catch (err: unknown) {
        if (signal.aborted) return;
        console.error('Plan preparation error:', err);
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to inspect stored project data.'
        );
        setPhase('error');
      }
    },
    [sourceProjectId]
  );

  useEffect(() => {
    if (isOpen && sourceProjectId) {
      setUserConsent(false);
      setClipConsentGranted(false);
      setAdditionalDeletionsAccepted(false);
      setRecoveredProjectId(null);
      void loadPlan();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, sourceProjectId, loadPlan]);

  // Execute atomic recovery commit
  const handleCommitRecovery = async () => {
    if (!planToken || phase === 'committing' || committingRef.current) return;
    committingRef.current = true;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setPhase('committing');
    setErrorMessage(null);

    try {
      const result = await commitRecoveredProject(planToken, { signal });
      if (signal.aborted) return;

      if (result.status === 'persisted-success') {
        setRecoveredProjectId(result.recoveredProjectId);
        setPhase('success');
        studioEvents.emit('pixibun:toast', {
          type: 'success',
          message: `Created recovered project copy: "${result.recoveredTitle}".`,
        });
        // Transition and admit destination project
        const admitted = await onRecoveryComplete(result.recoveredProjectId);
        if (admitted) {
          onClose();
        } else {
          setErrorMessage(
            'Created recovered copy, but admitting it to the workspace failed. Your active workspace and original data remain safe.'
          );
          setPhase('error');
        }
      } else if (result.status === 'stale-source-snapshot') {
        setErrorMessage('The project data was modified in another window. Refreshing recovery plan...');
        setPhase('error');
        // Re-read fresh snapshot
        void loadPlan();
      } else if (result.status === 'destination-collision') {
        setErrorMessage('An unexpected identifier collision occurred. Please retry.');
        setPhase('error');
      } else if (result.status === 'storage-failure') {
        setErrorMessage(`Storage write failed: ${result.message}`);
        setPhase('error');
      } else if (result.status === 'unrecoverable-blocked') {
        setErrorMessage(result.message);
        setPhase('unrecoverable-blocked');
      } else if (result.status === 'cancelled') {
        setPhase('ready');
      }
    } catch (err: unknown) {
      if (signal.aborted) return;
      console.error('Recovery commit error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred during recovery persistence.'
      );
      setPhase('error');
    } finally {
      committingRef.current = false;
    }
  };

  // Export untouched backup archive
  const handleExportBackup = async () => {
    if (!sourceProjectId || isExporting) return;
    setIsExporting(true);

    try {
      const prepared = await prepareUntouchedRecoveryArchive(sourceProjectId);
      const filename = generateRecoveryBackupFilename();

      // Modern File System Access API streaming if supported
      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        try {
          const pickerFn = (window as Window & {
            showSaveFilePicker?: (options: {
              suggestedName: string;
              types: Array<{ description: string; accept: Record<string, string[]> }>;
            }) => Promise<FileSystemFileHandle>;
          }).showSaveFilePicker;
          if (!pickerFn) throw new Error('Save picker is unavailable');

          const handle = await pickerFn({
            suggestedName: filename,
            types: [
              {
                description: 'ZIP Archive',
                accept: { 'application/zip': ['.zip'] },
              },
            ],
          });

          await writeRecoveryArchiveToFileHandle(prepared, handle);
          studioEvents.emit('pixibun:toast', {
            type: 'success',
            message: `Exported backup archive "${filename}" successfully.`,
          });
          return;
        } catch (pickerErr: unknown) {
          if (pickerErr instanceof Error && pickerErr.name === 'AbortError') {
            return; // User cancelled the save dialog
          }
          // Fall back to Blob download below
        }
      }

      // Fallback: in-memory checked Blob download
      const blob = await createRecoveryArchiveBlob(prepared);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      studioEvents.emit('pixibun:toast', {
        type: 'success',
        message: `Exported backup archive "${filename}".`,
      });
    } catch (err: unknown) {
      console.error('Backup export failed:', err);
      studioEvents.emit('pixibun:toast', {
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to export recovery archive.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleApplyClipConsent = () => {
    setClipConsentGranted(true);
    void loadPlan({
      clipConsentGranted: true,
      deleteFrameIndices: candidatePlan?.deletedFrameIndices,
      deleteLayerIds: candidatePlan?.deletedLayerIds,
    });
  };

  const handleApplyAdditionalDeletions = () => {
    setAdditionalDeletionsAccepted(true);
    const deleteFrameIndices = requiredDeletions
      .filter((d) => !d.layerId && typeof d.frameIndex === 'number')
      .map((d) => d.frameIndex as number);
    const deleteLayerIds = requiredDeletions
      .map((d) => d.layerId)
      .filter((id): id is string => typeof id === 'string');

    const combinedFrameIndices = Array.from(
      new Set([
        ...(candidatePlan?.deletedFrameIndices || []),
        ...deleteFrameIndices,
      ])
    );
    const combinedLayerIds = Array.from(
      new Set([
        ...(candidatePlan?.deletedLayerIds || []),
        ...deleteLayerIds,
      ])
    );

    void loadPlan({
      deleteFrameIndices: combinedFrameIndices,
      deleteLayerIds: combinedLayerIds,
      clipConsentGranted,
    });
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={() => {
        if (phase === 'committing') return;
        onClose();
      }}
      title="Project Recovery & Safe Mode"
      maxWidth="w-[560px]"
    >
      <div className="flex flex-col gap-4 font-mono text-xs">
        {/* Custody Guarantee Badge */}
        <div className="flex items-start gap-2.5 p-3 rounded-[3px] bg-[var(--surface-1)] border border-[var(--desk-border)]">
          <PixelIcon name="lock" size={16} className="text-[var(--accent-gold)] mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1 text-[var(--text-body)]">
            <span className="font-bold text-[var(--text-heading)]">
              Original Project Preserved Untouched
            </span>
            <p className="leading-relaxed">
              PixiBun encountered an issue safely opening this project. To safeguard your artwork against data loss, the original stored records remain read-only and will not be overwritten.
            </p>
          </div>
        </div>

        {/* 1. Diagnosing Phase */}
        {phase === 'diagnosing' && (
          <div className="flex flex-col items-center justify-center p-8 gap-3 text-center">
            <div className="animate-spin text-[var(--accent-gold)] text-lg">⏳</div>
            <span className="font-bold text-[var(--text-heading)]">
              Diagnosing Stored Project Structure...
            </span>
            <p className="text-[var(--text-muted)] text-[11px] max-w-sm">
              Analyzing frame hierarchies, bitmap headers, and complexity limits to formulate a deterministic recovery plan.
            </p>
          </div>
        )}

        {/* 2. Ready Plan Presentation */}
        {phase === 'ready' && candidatePlan && (
          <div className="flex flex-col gap-3">
            {/* Diagnosis Summary */}
            <div className="p-3 bg-[var(--surface-2)] rounded-[3px] border border-[var(--desk-border)] flex flex-col gap-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[var(--text-muted)]">Source Project:</span>
                <span className="font-bold text-[var(--text-heading)] truncate max-w-[280px]">
                  {projectName}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[var(--text-muted)]">Target Destination:</span>
                <span className="font-bold text-[var(--accent-gold)] truncate max-w-[280px]">
                  {recoveredTitle}
                </span>
              </div>
            </div>

            {/* Deterministic Recovery Plan Details */}
            <div className="flex flex-col gap-2 p-3 bg-[var(--surface-0)] rounded-[3px] border border-[var(--desk-border)]">
              <span className="font-bold text-[var(--text-heading)] text-[11px] uppercase tracking-wider">
                Deterministic Recovery Plan
              </span>
              <ul className="flex flex-col gap-1.5 text-[11px] leading-relaxed text-[var(--text-body)]">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>
                    <strong>{candidatePlan.blobRemapEntries.length}</strong> valid layer bitmap(s) preserved and remapped
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>
                    Canvas dimensions: <strong>{candidatePlan.candidateProject.width} × {candidatePlan.candidateProject.height} px</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>
                    Frames: <strong>{candidatePlan.candidateProject.frames.length}</strong> animation frame(s)
                  </span>
                </li>
                {candidatePlan.deletedLayerIds.length > 0 && (
                  <li className="flex items-center gap-2 text-amber-300">
                    <span>⚠</span>
                    <span>
                      <strong>{candidatePlan.deletedLayerIds.length}</strong> damaged or empty layer(s) omitted
                    </span>
                  </li>
                )}
                {candidatePlan.deletedFrameIndices.length > 0 && (
                  <li className="flex items-center gap-2 text-amber-300">
                    <span>⚠</span>
                    <span>
                      <strong>{candidatePlan.deletedFrameIndices.length}</strong> unrecoverable frame(s) omitted
                    </span>
                  </li>
                )}
                {candidatePlan.excludedRecordIds.length > 0 && (
                  <li className="flex items-center gap-2 text-[var(--text-muted)]">
                    <span>ℹ</span>
                    <span>
                      <strong>{candidatePlan.excludedRecordIds.length}</strong> orphan bitmap record(s) excluded
                    </span>
                  </li>
                )}
              </ul>
            </div>

            {/* Explicit User Consent Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-[3px] bg-[var(--surface-1)] border border-[var(--desk-border)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={userConsent}
                onChange={(e) => setUserConsent(e.target.checked)}
                className="mt-0.5 rounded cursor-pointer accent-[var(--accent-gold)]"
                data-testid="recovery-consent-checkbox"
              />
              <span className="text-[11px] leading-relaxed text-[var(--text-heading)]">
                I understand that a <strong>new separate project copy</strong> will be created, omitting damaged elements according to the plan above, while my original project remains safe and untouched.
              </span>
            </label>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--desk-border)]">
              <TactileButton
                variant="ghost"
                size="sm"
                onClick={handleExportBackup}
                disabled={isExporting}
                title="Download complete untouched source backup"
                className="text-xs"
              >
                {isExporting ? 'Exporting...' : 'Export Untouched Backup'}
              </TactileButton>

              <div className="flex items-center gap-2">
                <TactileButton
                  variant="default"
                  size="sm"
                  onClick={onClose}
                  className="text-xs"
                >
                  Cancel / Keep Editing
                </TactileButton>
                <TactileButton
                  variant="primary"
                  size="sm"
                  disabled={!userConsent}
                  onClick={handleCommitRecovery}
                  className="text-xs font-bold"
                  data-testid="create-recovered-copy-button"
                >
                  Create Recovered Copy
                </TactileButton>
              </div>
            </div>
          </div>
        )}

        {/* 3. Clip Consent Required View */}
        {phase === 'clip-consent-required' && (
          <div className="flex flex-col gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-[3px] text-amber-200 text-[11px] leading-relaxed">
              <p className="font-bold mb-1">Animation Clip Adjustment Consent Required</p>
              <p>
                One or more animation clips intersect deleted or corrupted frames. To maintain animation integrity, the surviving clip intervals must be adjusted to match surviving frame offsets.
              </p>
            </div>

            <div className="p-3 bg-[var(--surface-0)] rounded-[3px] border border-[var(--desk-border)]">
              <span className="font-bold text-[var(--text-heading)] text-[11px] uppercase tracking-wider block mb-1.5">
                Affected Animation Clips ({affectedClips.length})
              </span>
              <ul className="flex flex-col gap-1 text-[11px] text-[var(--text-body)]">
                {affectedClips.map((clip) => (
                  <li key={clip.clipId} className="flex justify-between">
                    <span className="font-bold">{clip.clipName}:</span>
                    <span className="text-[var(--text-muted)]">
                      Frames {clip.startFrame}–{clip.endFrame} (omits {clip.deletedFrameIndices.length} damaged frame(s))
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--desk-border)]">
              <TactileButton
                variant="ghost"
                size="sm"
                onClick={handleExportBackup}
                disabled={isExporting}
                className="text-xs"
              >
                Export Untouched Backup
              </TactileButton>
              <div className="flex items-center gap-2">
                <TactileButton variant="default" size="sm" onClick={onClose} className="text-xs">
                  Cancel
                </TactileButton>
                <TactileButton
                  variant="primary"
                  size="sm"
                  onClick={handleApplyClipConsent}
                  className="text-xs font-bold"
                >
                  Adjust Clips & Continue
                </TactileButton>
              </div>
            </div>
          </div>
        )}

        {/* 4. Additional Deletion Required View */}
        {phase === 'additional-deletion-required' && (
          <div className="flex flex-col gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-[3px] text-amber-200 text-[11px] leading-relaxed">
              <p className="font-bold mb-1">Damaged Element Deletion Required</p>
              <p>
                The stored project contains corrupted or duplicate layer records that violate safety bounds and cannot be safely rendered.
              </p>
            </div>

            <div className="p-3 bg-[var(--surface-0)] rounded-[3px] border border-[var(--desk-border)] max-h-48 overflow-y-auto">
              <span className="font-bold text-[var(--text-heading)] text-[11px] uppercase tracking-wider block mb-1.5">
                Items to be Omitted ({requiredDeletions.length})
              </span>
              <ul className="flex flex-col gap-1.5 text-[11px] text-[var(--text-body)]">
                {requiredDeletions.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-400">•</span>
                    <span>{item.message}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--desk-border)]">
              <TactileButton
                variant="ghost"
                size="sm"
                onClick={handleExportBackup}
                disabled={isExporting}
                className="text-xs"
              >
                Export Untouched Backup
              </TactileButton>
              <div className="flex items-center gap-2">
                <TactileButton variant="default" size="sm" onClick={onClose} className="text-xs">
                  Cancel
                </TactileButton>
                <TactileButton
                  variant="primary"
                  size="sm"
                  onClick={handleApplyAdditionalDeletions}
                  className="text-xs font-bold"
                >
                  Accept Deletions & Continue
                </TactileButton>
              </div>
            </div>
          </div>
        )}

        {/* 5. Committing Phase */}
        {phase === 'committing' && (
          <div className="flex flex-col items-center justify-center p-8 gap-3 text-center">
            <div className="animate-spin text-[var(--accent-gold)] text-lg">⚙</div>
            <span className="font-bold text-[var(--text-heading)]">
              Persisting Recovered Copy Atomically...
            </span>
            <p className="text-[var(--text-muted)] text-[11px] max-w-sm">
              Creating a new project entry and remapping verified layer bitmaps. The original project is completely preserved.
            </p>
            <TactileButton
              variant="default"
              size="sm"
              onClick={() => {
                if (abortControllerRef.current) {
                  abortControllerRef.current.abort();
                }
                setPhase('ready');
              }}
              className="mt-2 text-xs"
            >
              Cancel Operation
            </TactileButton>
          </div>
        )}

        {/* 6. Success Phase */}
        {phase === 'success' && (
          <div className="flex flex-col items-center justify-center p-6 gap-3 text-center">
            <span className="text-emerald-400 text-2xl">✓</span>
            <span className="font-bold text-[var(--text-heading)] text-sm">
              Recovery Succeeded!
            </span>
            <p className="text-[var(--text-body)] text-[11px] max-w-sm">
              New project <strong>{recoveredTitle}</strong> was successfully created and verified. Admitting into workspace...
            </p>
          </div>
        )}

        {/* 7. Unrecoverable Blocked View */}
        {phase === 'unrecoverable-blocked' && (
          <div className="flex flex-col gap-3">
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-[3px] text-red-200 text-[11px] leading-relaxed">
              <p className="font-bold mb-1">Automatic Reconstruction Unavailable</p>
              <p>
                {errorMessage ||
                  'The project has sustained severe structural corruption that prevents automated candidate reconstruction.'}
              </p>
            </div>

            {errorDetails && (
              <div className="p-2 bg-[var(--surface-0)] rounded-[3px] border border-[var(--desk-border)] text-[10px] text-[var(--text-muted)] font-mono">
                {errorDetails}
              </div>
            )}

            <p className="text-[11px] text-[var(--text-body)] leading-relaxed">
              Your original stored project records remain untouched in IndexedDB. You can export an untouched ZIP backup archive containing the raw project data and bitmap blobs to preserve them for inspection.
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--desk-border)]">
              <TactileButton
                variant="primary"
                size="sm"
                onClick={handleExportBackup}
                disabled={isExporting}
                className="text-xs font-bold"
              >
                {isExporting ? 'Exporting...' : 'Export Untouched Backup'}
              </TactileButton>
              <TactileButton variant="default" size="sm" onClick={onClose} className="text-xs">
                Close
              </TactileButton>
            </div>
          </div>
        )}

        {/* 8. Error View */}
        {phase === 'error' && (
          <div className="flex flex-col gap-3">
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-[3px] text-red-200 text-[11px] leading-relaxed">
              <p className="font-bold mb-1">Recovery Operation Could Not Complete</p>
              <p>{errorMessage || 'An unexpected error occurred during recovery.'}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--desk-border)]">
              <TactileButton
                variant="ghost"
                size="sm"
                onClick={handleExportBackup}
                disabled={isExporting}
                className="text-xs"
              >
                Export Untouched Backup
              </TactileButton>
              <div className="flex items-center gap-2">
                <TactileButton variant="default" size="sm" onClick={onClose} className="text-xs">
                  Close
                </TactileButton>
                <TactileButton
                  variant="primary"
                  size="sm"
                  onClick={() => void loadPlan()}
                  className="text-xs font-bold"
                >
                  Try Again
                </TactileButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
};
