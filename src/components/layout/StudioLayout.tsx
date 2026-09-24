'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useStudioStore } from '@/stores/studioStore';
import { AtelierRail } from './AtelierRail';
import { LeftToolbar } from './LeftToolbar';
import { CenterViewport } from './CenterViewport';
import { RightInspector } from './RightInspector';
import { BottomTimeline } from './BottomTimeline';
import { StatusBar } from './StatusBar';
import type { AnchorPosition } from '@/components/modals/CanvasResizeModal';
import type { ImportPayload, ImageImportConfirmPayload } from '@/types/import';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { hydrateProject } from '@/lib/project/serialize';
import { decodeAndValidateProject } from '@/lib/project/decodeProject';
import { clearAllBuffers } from '@/lib/engine/bufferRegistry';
import { studioEvents } from '@/lib/events/studioEvents';
import { executeImageImport } from '@/lib/project/imageImportExecution';
import type { PendingRecoveryContext } from '@/lib/recovery/projectAdmission';

import { useStudioAutosave } from '@/hooks/studio/useStudioAutosave';
import { useStudioClipboard } from '@/hooks/studio/useStudioClipboard';
import { useStudioFileSystem } from '@/hooks/studio/useStudioFileSystem';
import { useStudioKeyboard } from '@/hooks/studio/useStudioKeyboard';

// Heavy dialogs are code-split client-side (Phase 33): none of these bundles
// are part of the /studio first-load JS. They render only while open, so the
// chunks are fetched on first open rather than on page load.
const ExportModal = dynamic(
  () => import('@/components/modals/ExportModal').then((m) => m.ExportModal),
  { ssr: false }
);
const ShortcutsModal = dynamic(
  () => import('@/components/modals/ShortcutsModal').then((m) => m.ShortcutsModal),
  { ssr: false }
);
const CanvasResizeModal = dynamic(
  () => import('@/components/modals/CanvasResizeModal').then((m) => m.CanvasResizeModal),
  { ssr: false }
);
const ImportModal = dynamic(
  () => import('@/components/modals/ImportModal').then((m) => m.ImportModal),
  { ssr: false }
);
const ProjectsGalleryModal = dynamic(
  () => import('@/components/modals/ProjectsGalleryModal').then((m) => m.ProjectsGalleryModal),
  { ssr: false }
);
const CoDrawModal = dynamic(
  () => import('@/components/modals/CoDrawModal').then((m) => m.CoDrawModal),
  { ssr: false }
);
const DiagnosticsModal = dynamic(
  () => import('@/components/modals/DiagnosticsModal').then((m) => m.DiagnosticsModal),
  { ssr: false }
);
const CommandPaletteModal = dynamic(
  () => import('@/components/modals/CommandPaletteModal').then((m) => m.CommandPaletteModal),
  { ssr: false }
);
const RecoveryModal = dynamic(
  () => import('@/components/modals/RecoveryModal').then((m) => m.RecoveryModal),
  { ssr: false }
);

export const StudioLayout: React.FC = () => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isResizeOpen, setIsResizeOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNewConfirmOpen, setIsNewConfirmOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isCoDrawOpen, setIsCoDrawOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [importPayload, setImportPayload] = useState<ImportPayload | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [recoveryTarget, setRecoveryTarget] = useState<PendingRecoveryContext | null>(null);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const startupRecoveryPromptedRef = useRef<string | null>(null);

  const [activeToast, setActiveToast] = useState<{ message: string; type: 'default' | 'error' | 'success' } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = studioEvents.on('pixibun:toast', (payload) => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      setActiveToast({ message: payload.message, type: payload.type || 'default' });
      toastTimerRef.current = window.setTimeout(() => {
        setActiveToast(null);
        toastTimerRef.current = null;
      }, 3500);
    });
    return () => {
      unsub();
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const {
    autosaveTimerRef,
    runAutosave,
    handleCommitHistory,
    autosaveError,
    setAutosaveError,
    openStoredProject,
    lifecycleState,
    clearPendingRecovery,
  } = useStudioAutosave();

  const pendingRecovery =
    lifecycleState.phase === 'active' ? lifecycleState.pendingRecovery : undefined;

  // Auto-prompt Recovery Modal on startup when pending recovery is detected
  useEffect(() => {
    if (pendingRecovery) {
      if (startupRecoveryPromptedRef.current !== pendingRecovery.sourceProjectId) {
        startupRecoveryPromptedRef.current = pendingRecovery.sourceProjectId;
        setRecoveryTarget(pendingRecovery);
        setIsRecoveryOpen(true);
      }
    }
  }, [pendingRecovery]);

  const { saveToast, triggerSaveToast, handleSaveDesktopProject } = useStudioFileSystem();

  const canUndo = useStudioStore((s) => s.canUndo);
  const canRedo = useStudioStore((s) => s.canRedo);
  const setCanvasSize = useStudioStore((s) => s.setCanvasSize);
  const currentProjectId = useStudioStore((s) => s.currentProjectId);
  const projectName = useStudioStore((s) => s.projectName);
  const resetToNewProject = useStudioStore((s) => s.resetToNewProject);

  const handleConfirmNewDrawing = useCallback(async () => {
    // Attempt best-effort autosave, but never block user from starting new drawing if autosave failed
    await runAutosave();
    clearAllBuffers();
    resetToNewProject();
    setIsNewConfirmOpen(false);
    studioEvents.emit('pixibun:history-clear');
    void runAutosave();
  }, [resetToNewProject, runAutosave]);

  const handleOpenProject = useCallback(async (projectId: string) => {
    const result = await openStoredProject(projectId);
    if (!result.success) {
      if (result.reason === 'recovery-required') {
        throw new Error('This project requires recovery and cannot be opened directly.');
      }
      if (result.reason === 'unsupported-version') {
        throw new Error(result.message);
      }
      if (result.reason === 'blocked') {
        throw new Error(result.message);
      }
      if (result.reason === 'transient-failure') {
        throw new Error(result.message);
      }
      if (result.reason === 'hydration-failure') {
        throw new Error(`Project could not be loaded into the workspace: ${result.message}`);
      }
      if (result.reason === 'not-found') {
        throw new Error('Project not found in storage.');
      }
    }
  }, [openStoredProject]);

  const handleRecoveryComplete = useCallback(
    async (recoveredProjectId: string): Promise<boolean> => {
      const openRes = await openStoredProject(recoveredProjectId, true);
      if (openRes.success) {
        clearPendingRecovery();
        setRecoveryTarget(null);
        setIsRecoveryOpen(false);
        return true;
      }
      studioEvents.emit('pixibun:toast', {
        type: 'error',
        message: 'Failed to admit recovered project workspace. Previous workspace preserved.',
      });
      return false;
    },
    [clearPendingRecovery, openStoredProject]
  );

  const isDirty = useStudioStore((s) => s.isDirty);
  const saveStatus = useStudioStore((s) => s.saveStatus);

  // Synchronize document title with unsaved dirty indicator
  useEffect(() => {
    document.title = `${isDirty ? '● ' : ''}${projectName} — PixiBun`;
    return () => {
      document.title = 'PixiBun Atelier — 2.5D Photometric Pixel Art Studio & Animation Engine';
    };
  }, [isDirty, projectName]);

  // Undo / Redo handlers dispatching to canvas engine
  const handleUndo = useCallback(() => {
    studioEvents.emit('pixibun:undo');
  }, []);

  const handleRedo = useCallback(() => {
    studioEvents.emit('pixibun:redo');
  }, []);

  // Handle Canvas Resize - anchor and resample choices flow through so
  // content lands where the user asked instead of hugging the top-left.
  // History MUST be invalidated here: undo snapshots store full-canvas
  // ImageData at the old dimensions, so Ctrl+Z after a resize would
  // putImageData stale-size pixels onto the resized buffers and corrupt
  // the artwork.
  const handleResize = useCallback(
    (newWidth: number, newHeight: number, anchor: AnchorPosition, resample: boolean) => {
      try {
        setCanvasSize(newWidth, newHeight, anchor, resample);
        studioEvents.emit('pixibun:history-clear');
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to resize canvas';
        studioEvents.emit('pixibun:toast', { message, type: 'error' });
      }
    },
    [setCanvasSize]
  );

  // Handle File Import Trigger
  const handleOpenImport = useCallback((payload: ImportPayload) => {
    setImportPayload(payload);
    setIsImportOpen(true);
  }, []);

  // Confirm Image Import & Inject Pixel Art to Target Buffer
  const handleConfirmImportImage = useCallback((confirmData: ImageImportConfirmPayload) => {
    const result = executeImageImport(confirmData);
    if (result.ok) {
      setIsImportOpen(false);
    }
  }, []);

  useStudioClipboard(handleOpenImport);

  // Confirm Project Import - validate before touching live state so a
  // malformed file explains itself instead of corrupting the session.
  const handleConfirmImportProject = useCallback(async () => {
    if (!importPayload?.projectJson) return;

    const result = decodeAndValidateProject(importPayload.projectJson);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }

    try {
      const saveRes = await runAutosave();
      if (!saveRes.ok && saveRes.reason !== 'restore-invalid') {
        setImportError('The current project could not be saved. Export a backup before replacing it.');
        return;
      }
      await hydrateProject(result.value);
      setImportError(null);
      setIsImportOpen(false);
      void runAutosave();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'The project could not be opened.');
    }
  }, [importPayload, runAutosave]);

  // Global Keyboard Shortcuts
  useStudioKeyboard({
    autosaveTimerRef,
    runAutosave,
    triggerSaveToast,
    handleSaveDesktopProject,
    setIsShortcutsOpen,
    setIsCommandPaletteOpen,
    handleUndo,
    handleRedo,
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--desk-bg)] text-[var(--text-heading)] transition-colors duration-300 overflow-hidden select-none">
      {/* Unified Atelier Rail (~40px instrument panel) */}
      <AtelierRail
        onOpenExport={() => setIsExportOpen(true)}
        onOpenImport={handleOpenImport}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenResize={() => setIsResizeOpen(true)}
        onNewDrawing={() => setIsNewConfirmOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenCoDraw={() => setIsCoDrawOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onSaveNow={() => {
          void runAutosave().then((res) => { if (res.ok) triggerSaveToast(); });
        }}
      />

      {/* Accessible Status Announcements for Screen Readers (WCAG 4.1.3) */}
      <div className="sr-only" role="status" aria-live="polite">
        {saveStatus === 'saving'
          ? 'Saving project...'
          : saveStatus === 'error'
          ? 'Error saving project'
          : isDirty
          ? 'Unsaved changes'
          : 'All changes saved'}
      </div>

      {/* Autosave Disk Write Error (Non-Layout-Shifting Toast) */}
      {autosaveError && (
        <div
          role="alert"
          className="fixed bottom-10 left-16 max-w-sm bg-[#2e111a]/95 border-2 border-[#eb5a66] shadow-2xl p-3 rounded-[3px] flex flex-col gap-1.5 z-40 text-xs font-mono text-[#ffb4b9] backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#6b283d] pb-1">
            <div className="flex items-center gap-1.5 font-bold text-[#eb5a66]">
              <PixelIcon name="warning" size={13} className="shrink-0" />
              <span>Autosave Error</span>
            </div>
            <button
              onClick={() => setAutosaveError(null)}
              className="px-1.5 py-0.5 text-xs text-[#ffb4b9] hover:text-white transition-colors cursor-pointer leading-none"
              title="Dismiss warning"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-[#ffb4b9]">
            {autosaveError}
          </p>
          <div className="flex justify-end pt-1">
            <TactileButton
              size="sm"
              variant="danger"
              onClick={() => setIsExportOpen(true)}
              title="Open Export Dialog"
              className="text-xs px-2.5 py-1 bg-[#eb5a66] hover:bg-[#ff8c94] text-[#140d1f] font-bold border border-[#8c202a]"
            >
              Export Drawing
            </TactileButton>
          </div>
        </div>
      )}

      {/* Main Workspace Area (Left Toolbar + Center Stage + Right Inspector) */}
      <div id="main-workspace" tabIndex={-1} className="flex flex-1 overflow-hidden outline-none relative">
        <LeftToolbar />
        <CenterViewport 
          onCommitHistory={handleCommitHistory}
          onOpenImport={handleOpenImport}
        />
        <RightInspector />
      </div>

      {/* Bottom Timeline */}
      <BottomTimeline />

      {/* Status Bar */}
      <StatusBar />

      {/* New Drawing Confirmation Modal */}
      <ModalWrapper
        isOpen={isNewConfirmOpen}
        onClose={() => setIsNewConfirmOpen(false)}
        title="Start a New Drawing?"
      >
        <div className="p-5 flex flex-col gap-4 text-sm text-[var(--text-body)]">
          <p className="leading-relaxed">
            Starting a new drawing will clear the current canvas and reset the studio to a fresh blank project.
          </p>
          <p className="text-xs text-[var(--accent-gold)] font-mono">
            <PixelIcon name="export" size={12} className="inline align-[-2px] mr-1" /> If you want to keep your current artwork, remember to export it as PNG or a .pixibun project file first.
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--desk-border)]">
            <TactileButton
              size="sm"
              variant="default"
              onClick={() => setIsNewConfirmOpen(false)}
            >
              Keep Drawing
            </TactileButton>
            <TactileButton
              size="sm"
              variant="danger"
              onClick={handleConfirmNewDrawing}
            >
              Start New Drawing
            </TactileButton>
          </div>
        </div>
      </ModalWrapper>

      {/* Export Modal (lazy-loaded: mounted only while open) */}
      {isExportOpen && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      {/* Shortcuts Cheat Sheet Modal (lazy-loaded) */}
      {isShortcutsOpen && (
        <ShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        />
      )}

      {/* Privacy, Diagnostics & Offline Health Modal (lazy-loaded) */}
      {isDiagnosticsOpen && (
        <DiagnosticsModal
          isOpen={isDiagnosticsOpen}
          onClose={() => setIsDiagnosticsOpen(false)}
        />
      )}

      {/* Canvas Resize Modal (lazy-loaded) */}
      {isResizeOpen && (
        <CanvasResizeModal
          isOpen={isResizeOpen}
          onClose={() => setIsResizeOpen(false)}
          onResize={handleResize}
        />
      )}

      {/* Drag & Drop Import Modal (lazy-loaded) */}
      {isImportOpen && (
        <ImportModal
          isOpen={isImportOpen}
          payload={importPayload}
          error={importError}
          onClose={() => {
            setImportError(null);
            setIsImportOpen(false);
          }}
          onConfirmImage={handleConfirmImportImage}
          onConfirmProject={handleConfirmImportProject}
        />
      )}

      {/* Projects & Artworks Gallery Modal (lazy-loaded) */}
      {isGalleryOpen && (
        <ProjectsGalleryModal
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          currentProjectId={currentProjectId}
          onOpenProject={handleOpenProject}
          onNewProject={() => {
            clearAllBuffers();
            resetToNewProject();
            studioEvents.emit('pixibun:history-clear');
            void runAutosave();
          }}
          onOpenImport={() => {
            setIsImportOpen(true);
          }}
        />
      )}

      {/* Peer-to-Peer Co-Draw Modal (lazy-loaded) */}
      {isCoDrawOpen && (
        <CoDrawModal
          isOpen={isCoDrawOpen}
          onClose={() => setIsCoDrawOpen(false)}
        />
      )}

      {/* Command Palette (Ctrl+K) */}
      {isCommandPaletteOpen && (
        <CommandPaletteModal
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenImport={() => setIsImportOpen(true)}
          onOpenResize={() => setIsResizeOpen(true)}
          onOpenGallery={() => setIsGalleryOpen(true)}
          onOpenCoDraw={() => setIsCoDrawOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          onNewDrawing={() => setIsNewConfirmOpen(true)}
          onSaveNow={() => {
            void runAutosave().then((res) => { if (res.ok) triggerSaveToast(); });
          }}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
      )}

      {/* Recovery & Safe Mode Repair Wizard Modal (lazy-loaded) */}
      {isRecoveryOpen && recoveryTarget && (
        <RecoveryModal
          isOpen={isRecoveryOpen}
          sourceProjectId={recoveryTarget.sourceProjectId}
          initialAssessment={recoveryTarget.assessment}
          onClose={() => {
            setIsRecoveryOpen(false);
          }}
          onRecoveryComplete={handleRecoveryComplete}
        />
      )}

      {/* Pending Recovery Safe Mode Banner */}
      {pendingRecovery && !isRecoveryOpen && (
        <div
          role="region"
          aria-label="Pending Project Recovery"
          data-testid="pending-recovery-banner"
          className="fixed top-12 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[90%] bg-[var(--surface-1)] border border-[var(--accent-gold)] shadow-2xl p-2.5 rounded-[4px] flex items-center justify-between gap-3 text-xs font-mono text-[var(--text-heading)] backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-2 truncate">
            <PixelIcon name="lock" size={14} className="text-[var(--accent-gold)] shrink-0" />
            <span className="truncate">
              A previous project requires safe recovery. Original data is preserved untouched.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <TactileButton
              size="sm"
              variant="primary"
              onClick={() => {
                setRecoveryTarget(pendingRecovery);
                setIsRecoveryOpen(true);
              }}
              className="text-xs font-bold"
              data-testid="review-recovery-button"
            >
              Review Recovery Plan
            </TactileButton>
            <button
              onClick={() => clearPendingRecovery()}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors cursor-pointer text-xs leading-none"
              title="Dismiss banner"
              aria-label="Dismiss recovery banner"
              data-testid="dismiss-recovery-button"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Unified Toast & Affirmative Explicit Save Confirmation Toast (UX-14, Phase A) */}
      {(activeToast || saveToast) && (
        <div
          role={activeToast?.type === 'error' ? 'alert' : 'status'}
          aria-live={activeToast?.type === 'error' ? 'assertive' : 'polite'}
          data-testid={activeToast ? 'studio-toast' : 'save-affirmation-toast'}
          className={`fixed bottom-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center gap-2 px-4 py-2 font-mono text-xs rounded-lg shadow-xl backdrop-blur-sm transition-all ${
            activeToast?.type === 'error'
              ? 'bg-[#2e111a]/95 border border-[#eb5a66] text-[#ffb4b9]'
              : 'bg-[var(--surface-sunken,#191326)]/95 border border-[var(--accent-gold,#f0be7c)] text-[var(--accent-gold,#f0be7c)]'
          }`}
        >
          <PixelIcon
            name={activeToast?.type === 'error' ? 'warning' : 'save'}
            size={14}
            className={activeToast?.type === 'error' ? 'text-[#eb5a66] shrink-0' : 'text-[var(--accent-gold,#f0be7c)] shrink-0'}
          />
          <span>{activeToast?.message || saveToast}</span>
        </div>
      )}
    </div>
  );
};
