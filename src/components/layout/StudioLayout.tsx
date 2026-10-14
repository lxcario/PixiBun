'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { lazyPanel } from '@/components/system/lazyPanel';
import { useStudioStore } from '@/stores/studioStore';
import { AtelierRail } from './AtelierRail';
import { LeftToolbar } from './LeftToolbar';
import { CenterViewport } from './CenterViewport';
import { RightInspector } from './RightInspector';
import { BottomTimeline } from './BottomTimeline';
import { StatusBar } from './StatusBar';
import { StudioSkyBackdrop } from './StudioSkyBackdrop';
import { useThemeStore } from '@/stores/themeStore';

import { useWorkspaceStore } from '@/stores/workspaceStore';
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
import { getLocalSaveLabel } from '@/lib/project/localSaveLabel';
import type { ExportType } from '@/components/modals/export/ExportTabsNav';
import { openBlankWorkspace, openStarterWorkspace } from '@/lib/project/starterWorkspace';
import { STARTER_TEMPLATES } from '@/lib/art/starterTemplates';

import { useStudioAutosave } from '@/hooks/studio/useStudioAutosave';
import { useStudioClipboard } from '@/hooks/studio/useStudioClipboard';
import { useStudioFileSystem } from '@/hooks/studio/useStudioFileSystem';
import { useStudioKeyboard } from '@/hooks/studio/useStudioKeyboard';

// Heavy dialogs are code-split client-side (Phase 33): none of these bundles
// are part of the /studio first-load JS. They render only while open, so the
// chunks are fetched on first open rather than on page load. A chunk that fails
// to load (offline) shows a retry inside the dialog instead of crashing Studio.
const ExportModal = lazyPanel(
  () => import('@/components/modals/ExportModal').then((m) => m.ExportModal),
  'Export'
);
const ShortcutsModal = lazyPanel(
  () => import('@/components/modals/ShortcutsModal').then((m) => m.ShortcutsModal),
  'Shortcuts'
);
const CanvasResizeModal = lazyPanel(
  () => import('@/components/modals/CanvasResizeModal').then((m) => m.CanvasResizeModal),
  'Canvas Size'
);
const ImportModal = lazyPanel(
  () => import('@/components/modals/ImportModal').then((m) => m.ImportModal),
  'Import'
);
const ProjectsGalleryModal = lazyPanel(
  () => import('@/components/modals/ProjectsGalleryModal').then((m) => m.ProjectsGalleryModal),
  'Projects'
);
const CoDrawModal = lazyPanel(
  () => import('@/components/modals/CoDrawModal').then((m) => m.CoDrawModal),
  'Co-draw'
);
const DiagnosticsModal = lazyPanel(
  () => import('@/components/modals/DiagnosticsModal').then((m) => m.DiagnosticsModal),
  'Diagnostics'
);
const CommandPaletteModal = lazyPanel(
  () => import('@/components/modals/CommandPaletteModal').then((m) => m.CommandPaletteModal),
  'Command palette'
);
const RecoveryModal = lazyPanel(
  () => import('@/components/modals/RecoveryModal').then((m) => m.RecoveryModal),
  'Recovery'
);

export const StudioLayout: React.FC = () => {
  const workspace = useWorkspaceStore(s => s.layout);
  const focusMode = useWorkspaceStore(s => s.focusMode);
  const hydrateWorkspace = useWorkspaceStore(s => s.hydrate);
  useEffect(() => { hydrateWorkspace(); }, [hydrateWorkspace]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [hasOpenedExport, setHasOpenedExport] = useState(false);
  const [exportInitialType, setExportInitialType] = useState<ExportType>('png');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isResizeOpen, setIsResizeOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNewConfirmOpen, setIsNewConfirmOpen] = useState(false);
  const [newDrawingSize, setNewDrawingSize] = useState<number>(32);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isCoDrawOpen, setIsCoDrawOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [importPayload, setImportPayload] = useState<ImportPayload | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const openExport = (type: ExportType = 'png') => {
    setHasOpenedExport(true);
    setExportInitialType(type);
    setIsExportOpen(true);
  };

  const [recoveryTarget, setRecoveryTarget] = useState<PendingRecoveryContext | null>(null);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const startupRecoveryPromptedRef = useRef<string | null>(null);

  const [activeToast, setActiveToast] = useState<{
    message: string;
    type: 'default' | 'error' | 'success';
    action?: { label: string; onClick: () => void };
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = studioEvents.on('pixibun:toast', (payload) => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      setActiveToast({
        message: payload.message,
        type: payload.type || 'default',
        action: payload.action,
      });
      toastTimerRef.current = window.setTimeout(() => {
        setActiveToast(null);
        toastTimerRef.current = null;
      }, payload.action ? 5000 : 3500);
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
    renameStoredProject,
    joinCoDrawGuest,
    handleCommitHistory,
    autosaveError,
    saveConflict,
    saveConflictCopy,
    setAutosaveError,
    openStoredProject,
    lifecycleState,
    clearPendingRecovery,
  } = useStudioAutosave();

  const pendingRecovery =
    lifecycleState.phase === 'active' ? lifecycleState.pendingRecovery : undefined;

  useEffect(() => {
    if (lifecycleState.phase !== 'active') return;
    const url = new URL(window.location.href), templateId = url.searchParams.get('template');
    const blankSize = [16, 24, 32, 48].find(size => url.searchParams.get('width') === String(size) && url.searchParams.get('height') === String(size));
    if (templateId ? !STARTER_TEMPLATES.some(template => template.id === templateId) : !blankSize) return;
    if (lifecycleState.pendingRecovery || lifecycleState.startupIssue) {
      studioEvents.emit('pixibun:toast', { type: 'error', message: 'Resolve the current drawing recovery or storage problem before opening a new drawing.' });
      return;
    }
    const controller = new AbortController();
    const opening = templateId ? openStarterWorkspace(templateId, runAutosave, controller.signal) : openBlankWorkspace(blankSize!, runAutosave, controller.signal);
    void opening.then(opened => {
      if (!opened || controller.signal.aborted) return;
      // Reload must restore the edited/saved starter, rather than create another copy.
      if (templateId) url.searchParams.delete('template');
      else { url.searchParams.delete('width'); url.searchParams.delete('height'); }
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      studioEvents.emit('pixibun:toast', { type: 'error', message: error instanceof Error ? error.message : 'The new drawing could not be opened. Your current drawing is unchanged.' });
    });
    return () => controller.abort();
  }, [lifecycleState, runAutosave]);

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

  const canUndo = useStudioStore((s) => s.motionPart ? !!s.motionHistory?.past.length || !!s.motionHistory?.pending : s.canUndo);
  const canRedo = useStudioStore((s) => s.motionPart ? !!s.motionHistory?.future.length : s.canRedo);
  const setCanvasSize = useStudioStore((s) => s.setCanvasSize);
  const currentProjectId = useStudioStore((s) => s.currentProjectId);
  const projectName = useStudioStore((s) => s.projectName);
  const resetToNewProject = useStudioStore((s) => s.resetToNewProject);

  const saveBeforeReplacingWorkspace = useCallback(async (): Promise<boolean> => {
    if (!useStudioStore.getState().isDirty) return true;
    const result = await runAutosave();
    if (result.ok && !useStudioStore.getState().isDirty) return true;
    studioEvents.emit('pixibun:toast', {
      type: 'error',
      message: 'The current drawing could not be saved. Export a backup before replacing it.',
    });
    return false;
  }, [runAutosave]);

  const startNewWorkspace = useCallback(() => {
    clearAllBuffers();
    resetToNewProject();
    studioEvents.emit('pixibun:history-clear');
    void runAutosave();
  }, [resetToNewProject, runAutosave]);

  const handleConfirmNewDrawing = useCallback(async (targetSize?: number) => {
    if (!await saveBeforeReplacingWorkspace()) return;
    startNewWorkspace();
    if (targetSize && targetSize > 0) {
      setCanvasSize(targetSize, targetSize, 'center', false);
    }
    setIsNewConfirmOpen(false);
  }, [saveBeforeReplacingWorkspace, startNewWorkspace, setCanvasSize]);

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
      document.title = 'PixiBun — Pixels with a pulse';
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
  const handleOpenImport = useCallback((payload?: ImportPayload) => {
    setImportPayload(payload || null);
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

  const moonlit = useThemeStore((s) => s.studioTheme) === 'moonlit';

  // Moonlit skins every control in the studio, including menus and dialogs that portal to <body>.
  useEffect(() => {
    if (!moonlit) return;
    document.body.classList.add('moon-ui');
    return () => document.body.classList.remove('moon-ui');
  }, [moonlit]);

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
    <div
      data-restoration-phase={lifecycleState.phase}
      data-layout={moonlit ? 'moonlit' : undefined}
      className="relative isolate flex flex-col h-screen w-screen bg-[var(--desk-bg)] text-[var(--text-heading)] transition-colors duration-300 overflow-hidden select-none"
    >
      {/* Moonlit: the night sky fills the whole studio, behind every floating panel */}
      {moonlit && <StudioSkyBackdrop />}

      {/* Unified Atelier Rail (~40px instrument panel) */}
      <div hidden={focusMode} className="moon-slot moon-slot-rail">
      <AtelierRail
        onOpenExport={() => openExport()}
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

      </div>
      {focusMode && <button type="button" onClick={() => { useWorkspaceStore.getState().toggleFocus(); document.getElementById('center-canvas-area')?.focus({ preventScroll: true }); }} className="fixed top-3 right-3 z-30 text-xs px-3 py-2 bg-[var(--desk-surface)] border border-[var(--desk-border)] shadow-sm">Restore panels <kbd className="ml-2 text-[var(--text-muted)]">⇧ Tab</kbd></button>}

      {/* Accessible Status Announcements for Screen Readers (WCAG 4.1.3) */}
      <div className="sr-only" role="status" aria-live="polite">
        {getLocalSaveLabel(saveStatus, isDirty)}
      </div>

      {/* Autosave Disk Write Error / Save Conflict Notice (Non-Layout-Shifting Toast) */}
      {autosaveError && (
        <div
          role="alert"
          className={`fixed bottom-10 left-16 max-w-md shadow-2xl p-3.5 rounded-[3px] flex flex-col gap-2 z-40 text-xs font-mono backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-150 ${
            saveConflict
              ? 'bg-[#251829]/95 border-2 border-[#f0be7c] text-[#ede8f4]'
              : 'bg-[#2e111a]/95 border-2 border-[#eb5a66] text-[#ffb4b9]'
          }`}
        >
          <div
            className={`flex items-center justify-between gap-2 border-b pb-1.5 ${
              saveConflict ? 'border-[#5a3a28]' : 'border-[#6b283d]'
            }`}
          >
            <div
              className={`flex items-center gap-1.5 font-bold ${
                saveConflict ? 'text-[#f0be7c]' : 'text-[#eb5a66]'
              }`}
            >
              <PixelIcon name="warning" size={13} className="shrink-0" />
              <span>
                {saveConflict
                  ? 'This project was changed in another PixiBun tab.'
                  : 'Storage issue · Artwork safe in tab'}
              </span>
            </div>
            <button
              onClick={() => setAutosaveError(null)}
              className="px-1.5 py-0.5 text-xs text-[#d0c4df] hover:text-white transition-colors cursor-pointer leading-none"
              title="Dismiss warning"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
          <div className="text-[11px] leading-relaxed space-y-1">
            <p className={`font-semibold ${saveConflict ? 'text-[#5cdaac]' : 'text-[#f0be7c]'}`}>
              {saveConflict
                ? 'Your current artwork is safe in this tab.'
                : 'Your current drawing is preserved in memory.'}
            </p>
            <p className={saveConflict ? 'text-[#d0c4df]' : 'text-[#ffb4b9]'}>
              {autosaveError}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setAutosaveError(null)}
              className="text-[11px] px-2 py-0.5 text-[#a599b5] hover:text-white transition-colors cursor-pointer"
            >
              Keep editing
            </button>
            {saveConflict && (
              <TactileButton size="sm" onClick={() => void saveConflictCopy()}>
                Save a copy
              </TactileButton>
            )}
            <TactileButton
              size="sm"
              variant={saveConflict ? 'default' : 'danger'}
              onClick={() => openExport()}
              title="Open Export Dialog"
              className={saveConflict ? 'text-xs px-2.5 py-1 font-bold' : 'text-xs px-2.5 py-1 bg-[#eb5a66] hover:bg-[#ff8c94] text-[#140d1f] font-bold border border-[#8c202a]'}
            >
              Export Drawing
            </TactileButton>
          </div>
        </div>
      )}

      {/* Main Workspace Area (Left Toolbar + Center Stage + Right Inspector) */}
      <div id="main-workspace" tabIndex={-1} className="flex flex-1 overflow-hidden outline-none relative">
        <div hidden={focusMode} className="moon-slot moon-slot-tools h-full shrink-0"><LeftToolbar /></div>
        <div hidden={focusMode || workspace.inspectorSide !== 'left'} className="moon-slot moon-slot-inspector h-full shrink-0">{workspace.inspectorSide === 'left' && <RightInspector />}</div>
        <CenterViewport
          retainHistory
          onCommitHistory={handleCommitHistory}
          onOpenImport={handleOpenImport}
        />
        <div hidden={focusMode || workspace.inspectorSide !== 'right'} className="moon-slot moon-slot-inspector h-full shrink-0">{workspace.inspectorSide === 'right' && <RightInspector />}</div>
      </div>

      {/* Bottom Timeline */}
      <div hidden={focusMode || !workspace.timeline} className="moon-slot moon-slot-timeline shrink-0"><BottomTimeline /></div>

      {/* Status Bar */}
      <div hidden={focusMode} className="moon-slot moon-slot-status"><StatusBar /></div>

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
          <div className="flex flex-col gap-2 p-3 bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px]">
            <span className="text-xs font-semibold text-[var(--text-heading)]">Canvas Size Preset:</span>
            <div className="flex gap-1.5 flex-wrap">
              {[16, 24, 32, 48, 64, 128].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setNewDrawingSize(size)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-[2px] border cursor-pointer transition-colors ${newDrawingSize === size ? 'bg-[var(--accent-gold)] text-[var(--surface-0)] font-bold border-[var(--accent-gold)]' : 'border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)] hover:border-[var(--text-muted)]'}`}
                >
                  {size}×{size}
                </button>
              ))}
            </div>
          </div>
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
              onClick={() => handleConfirmNewDrawing(newDrawingSize)}
            >
              Start New Drawing
            </TactileButton>
          </div>
        </div>
      </ModalWrapper>

      {/* Load on first open, then retain cancellation ownership through cleanup. */}
      {hasOpenedExport && (
        <ExportModal
          isOpen={isExportOpen}
          initialType={exportInitialType}
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
            setImportPayload(null);
            setIsImportOpen(false);
          }}
          onConfirmImage={handleConfirmImportImage}
          onConfirmProject={handleConfirmImportProject}
          onFileSelected={handleOpenImport}
        />
      )}

      {/* Projects & Artworks Gallery Modal (lazy-loaded) */}
      {isGalleryOpen && (
        <ProjectsGalleryModal
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          currentProjectId={currentProjectId}
          onRenameProject={renameStoredProject}
          onOpenProject={handleOpenProject}
          onNewProject={async (skipCurrentSave = false) => {
            if (!skipCurrentSave && !await saveBeforeReplacingWorkspace()) return false;
            startNewWorkspace();
            return true;
          }}
          onOpenImport={() => handleOpenImport()}
        />
      )}

      {/* Peer-to-Peer Co-Draw Modal (lazy-loaded) */}
      {isCoDrawOpen && (
        <CoDrawModal
          onJoinGuest={joinCoDrawGuest}
          isOpen={isCoDrawOpen}
          onClose={() => setIsCoDrawOpen(false)}
        />
      )}

      {/* Command Palette (Ctrl+K) */}
      {isCommandPaletteOpen && (
        <CommandPaletteModal
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onOpenExport={() => openExport()}
          onOpenImport={() => handleOpenImport()}
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
          className={`fixed bottom-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 font-mono text-xs rounded-lg shadow-xl backdrop-blur-sm transition-all ${
            activeToast?.action ? 'pointer-events-auto' : 'pointer-events-none'
          } ${
            activeToast?.type === 'error'
              ? 'bg-[#2e111a]/95 border border-[#eb5a66] text-[#ffb4b9]'
              : activeToast?.type === 'success'
              ? 'bg-[#15241b]/95 border border-[#5cdaac] text-[#8ceec5]'
              : 'bg-[var(--surface-sunken,#191326)]/95 border border-[var(--accent-gold,#f0be7c)] text-[var(--accent-gold,#f0be7c)]'
          }`}
        >
          <PixelIcon
            name={activeToast?.type === 'error' ? 'warning' : activeToast?.type === 'success' ? 'sparkles' : 'save'}
            size={14}
            className={
              activeToast?.type === 'error'
                ? 'text-[#eb5a66] shrink-0'
                : activeToast?.type === 'success'
                ? 'text-[#5cdaac] shrink-0'
                : 'text-[var(--accent-gold,#f0be7c)] shrink-0'
            }
          />
          <span>{activeToast?.message || saveToast}</span>
          {activeToast?.action && (
            <button
              type="button"
              onClick={() => {
                activeToast.action?.onClick();
                setActiveToast(null);
              }}
              data-testid="toast-action-button"
              className="ml-2 px-2 py-0.5 rounded-[2px] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-heading)] border border-[var(--desk-border)] hover:border-[var(--accent-gold)] cursor-pointer text-[11px] font-sans font-semibold underline transition-colors"
            >
              {activeToast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
