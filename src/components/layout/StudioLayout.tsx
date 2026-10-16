'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { isSceneTheme } from '@/lib/theme/registry';
import { WelcomeJourney, type WelcomeChoice } from '@/components/onboarding/WelcomeJourney';
import { CoachTips } from '@/components/onboarding/CoachTips';

import { useWorkspaceStore } from '@/stores/workspaceStore';
import type { AnchorPosition } from '@/components/modals/CanvasResizeModal';
import type { ImportPayload, ImageImportConfirmPayload } from '@/types/import';
import { NewDrawingModal } from '@/components/modals/NewDrawingModal';
import { SurfaceToast } from '@/components/ui/surfaces/SurfaceToast';
import { SpringSurface } from '@/components/ui/surfaces/SpringSurface';
import { AnimatePresence } from 'motion/react';
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
import { openBlankWorkspace, openPostcardWorkspace, openStarterWorkspace } from '@/lib/project/starterWorkspace';
import { PostcardPicker } from '@/components/cart/PostcardPicker';
import { POSTCARDS } from '@/lib/postcards/scenes';
import { findStarterTemplate } from '@/lib/art/starterTemplates';

import { useStudioAutosave } from '@/hooks/studio/useStudioAutosave';
import { useStudioClipboard } from '@/hooks/studio/useStudioClipboard';
import { useStudioFileSystem } from '@/hooks/studio/useStudioFileSystem';
import { useStudioKeyboard } from '@/hooks/studio/useStudioKeyboard';
import { applyOpenedCart } from '@/lib/cart/applyCart';
import { PENDING_CART_QUERY, takePendingCart } from '@/lib/cart/pendingCart';
import { startReceiptRecorder } from '@/lib/cart/receiptRecorder';
import { reportImportError } from '@/lib/project/importFile';
import { LiquidSliders } from '@/experimental/liquidControls/LiquidSliders';

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
  const [isPostcardsOpen, setIsPostcardsOpen] = useState(false);
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
    const postcardId = url.searchParams.get('postcard');
    const blankSize = [16, 24, 32, 48].find(size => url.searchParams.get('width') === String(size) && url.searchParams.get('height') === String(size));
    const knownPostcard = !!postcardId && POSTCARDS.some(card => card.id === postcardId);
    if (!knownPostcard && (templateId ? !findStarterTemplate(templateId) : !blankSize)) return;
    if (lifecycleState.pendingRecovery || lifecycleState.startupIssue) {
      studioEvents.emit('pixibun:toast', { type: 'error', message: 'Resolve the current drawing recovery or storage problem before opening a new drawing.' });
      return;
    }
    const controller = new AbortController();
    const opening = knownPostcard ? openPostcardWorkspace(postcardId, runAutosave, controller.signal)
      : templateId ? openStarterWorkspace(templateId, runAutosave, controller.signal) : openBlankWorkspace(blankSize!, runAutosave, controller.signal);
    void opening.then(opened => {
      if (!opened || controller.signal.aborted) return;
      // Reload must restore the edited/saved starter, rather than create another copy.
      if (knownPostcard) url.searchParams.delete('postcard');
      else if (templateId) url.searchParams.delete('template');
      else { url.searchParams.delete('width'); url.searchParams.delete('height'); }
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      studioEvents.emit('pixibun:toast', { type: 'error', message: error instanceof Error ? error.message : 'The new drawing could not be opened. Your current drawing is unchanged.' });
    });
    return () => controller.abort();
  }, [lifecycleState, runAutosave]);

  // The welcome journey's last step opens a drawing through the same guarded
  // openers as landing links, so the current canvas is saved first.
  const handleWelcomeStart = useCallback((choice: WelcomeChoice) => {
    if (choice.kind === 'lessons') {
      window.location.assign('/playground');
      return;
    }
    if (choice.kind === 'keep') return;
    const opening = choice.kind === 'blank' ? openBlankWorkspace(choice.size, runAutosave) : openStarterWorkspace(choice.templateId, runAutosave);
    void opening.catch((error: unknown) => {
      studioEvents.emit('pixibun:toast', { type: 'error', message: error instanceof Error ? error.message : 'The new drawing could not be opened. Your current drawing is unchanged.' });
    });
  }, [runAutosave]);

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

  const setCanvasSize = useStudioStore((s) => s.setCanvasSize);
  const currentProjectId = useStudioStore((s) => s.currentProjectId);
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

  // Every drawing keeps its receipt (stroke count, drawing time, making-of) in this browser.
  useEffect(() => startReceiptRecorder(), []);

  // A cart handed over from the player (/open → Open in Studio) is offered once Studio is ready.
  const restorationActive = lifecycleState.phase === 'active';
  useEffect(() => {
    if (!restorationActive) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(PENDING_CART_QUERY)) return;
    url.searchParams.delete(PENDING_CART_QUERY);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    void takePendingCart().then(cart => {
      if (!cart) return;
      const { project, ...details } = cart;
      handleOpenImport({ type: 'project', filename: `${cart.title}.cart.png`, projectJson: project, cart: details });
    }, error => reportImportError(error));
  }, [handleOpenImport, restorationActive]);

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
      if (importPayload.cart) {
        applyOpenedCart(importPayload.cart);
        studioEvents.emit('pixibun:toast', { type: 'success', message: `Opened “${importPayload.cart.title}”. Remix away; your cart will credit it.` });
      }
      setImportError(null);
      setIsImportOpen(false);
      void runAutosave();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'The project could not be opened.');
    }
  }, [importPayload, runAutosave]);

  const scene = isSceneTheme(useThemeStore((s) => s.studioTheme));

  // Every theme gets the shared surface skin (selects, disclosures) for portalled menus and dialogs too.
  useEffect(() => {
    document.body.classList.add('studio-ui');
    return () => document.body.classList.remove('studio-ui');
  }, []);

  // Scene themes skin every control in the studio, including menus and dialogs that portal to <body>.
  useEffect(() => {
    if (!scene) return;
    document.body.classList.add('moon-ui');
    return () => document.body.classList.remove('moon-ui');
  }, [scene]);

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

  // The rail is memoized; hand it stable callbacks that always reach the latest handlers.
  const latestRailActions = useRef({ openExport, handleOpenImport, runAutosave, triggerSaveToast });
  latestRailActions.current = { openExport, handleOpenImport, runAutosave, triggerSaveToast };
  const railActions = useMemo(() => ({
    onOpenExport: () => latestRailActions.current.openExport(),
    onOpenImport: (payload?: ImportPayload) => latestRailActions.current.handleOpenImport(payload),
    onOpenShortcuts: () => setIsShortcutsOpen(true),
    onOpenResize: () => setIsResizeOpen(true),
    onNewDrawing: () => setIsNewConfirmOpen(true),
    onOpenPostcards: () => setIsPostcardsOpen(true),
    onOpenGallery: () => setIsGalleryOpen(true),
    onOpenCoDraw: () => setIsCoDrawOpen(true),
    onUndo: handleUndo,
    onRedo: handleRedo,
    onSaveNow: () => {
      const { runAutosave: save, triggerSaveToast: toast } = latestRailActions.current;
      void save().then((res) => { if (res.ok) toast(); });
    },
  }), [handleRedo, handleUndo]);

  return (
    <div
      data-restoration-phase={lifecycleState.phase}
      data-layout={scene ? 'scene' : undefined}
      className="relative isolate flex flex-col h-screen w-screen bg-[var(--desk-bg)] text-[var(--text-heading)] transition-colors duration-300 overflow-hidden select-none"
    >
      {/* Scene themes: their animated scene fills the whole studio, behind every floating panel */}
      {scene && <StudioSkyBackdrop />}
      {/* Labs: liquid slider handles (renders nothing; off restores the classic handle) */}
      {scene && <LiquidSliders />}

      {/* Unified Atelier Rail (~40px instrument panel) */}
      <div hidden={focusMode} className="moon-slot moon-slot-rail">
      <AtelierRail {...railActions} />

      </div>
      {focusMode && <button type="button" onClick={() => { useWorkspaceStore.getState().toggleFocus(); document.getElementById('center-canvas-area')?.focus({ preventScroll: true }); }} className="fixed top-3 right-3 z-30 text-xs px-3 py-2 bg-[var(--desk-surface)] border border-[var(--desk-border)] shadow-sm">Restore panels <kbd className="ml-2 text-[var(--text-muted)]">⇧ Tab</kbd></button>}

      {/* Title dot and screen-reader save status (WCAG 4.1.3) */}
      <StudioDocumentStatus />

      {/* Autosave Disk Write Error / Save Conflict Notice (Non-Layout-Shifting Toast) */}
      <AnimatePresence>
      {autosaveError && (
        <SpringSurface
          key="autosave-error"
          origin="bottom left"
          role="alert"
          data-tone={saveConflict ? 'warn' : 'error'}
          className="pb-panel fixed bottom-10 left-16 max-w-md !p-3.5 flex flex-col gap-2 z-40 text-xs"
        >
          <div
            className={`flex items-center justify-between gap-2 border-b pb-1.5 ${
              saveConflict ? 'border-[#5a3a28]' : 'border-[var(--danger-border)]'
            }`}
          >
            <div
              className={`flex items-center gap-1.5 font-bold ${
                saveConflict ? 'text-[var(--accent-gold)]' : 'text-[var(--danger-fg)]'
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
              className="px-1.5 py-0.5 text-xs text-[var(--text-body)] hover:text-[var(--text-heading)] transition-colors cursor-pointer leading-none"
              title="Dismiss warning"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
          <div className="text-[11px] leading-relaxed space-y-1">
            <p className={`font-semibold ${saveConflict ? 'text-[var(--accent-sage)]' : 'text-[var(--accent-gold)]'}`}>
              {saveConflict
                ? 'Your current artwork is safe in this tab.'
                : 'Your current drawing is preserved in memory.'}
            </p>
            <p className={saveConflict ? 'text-[var(--text-body)]' : 'text-[var(--danger-fg)]'}>
              {autosaveError}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setAutosaveError(null)}
              className="text-[11px] px-2 py-0.5 text-[var(--text-muted)] hover:text-[var(--text-heading)] transition-colors cursor-pointer"
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
              className={saveConflict ? 'text-xs px-2.5 py-1 font-bold' : 'text-xs px-2.5 py-1 bg-[var(--danger-bg)] hover:bg-[color-mix(in_srgb,var(--state-danger)_28%,var(--desk-surface))] text-[var(--danger-fg)] font-bold border-2 border-[var(--danger-border)]'}
            >
              Export Drawing
            </TactileButton>
          </div>
        </SpringSurface>
      )}
      </AnimatePresence>

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

      <PostcardPicker
        isOpen={isPostcardsOpen}
        onClose={() => setIsPostcardsOpen(false)}
        onChoose={id => {
          setIsPostcardsOpen(false);
          void openPostcardWorkspace(id, runAutosave).catch((error: unknown) => {
            studioEvents.emit('pixibun:toast', { type: 'error', message: error instanceof Error ? error.message : 'The postcard could not be opened. Your current drawing is unchanged.' });
          });
        }}
      />

      {/* New Drawing Confirmation Modal */}
      <NewDrawingModal
        isOpen={isNewConfirmOpen}
        size={newDrawingSize}
        onSizeChange={setNewDrawingSize}
        onClose={() => setIsNewConfirmOpen(false)}
        onConfirm={size => void handleConfirmNewDrawing(size)}
      />

      {/* First visit: skill, look and a first drawing; afterwards, one-time tips */}
      <WelcomeJourney
        ready={lifecycleState.phase === 'active' && !pendingRecovery && !(lifecycleState.phase === 'active' && lifecycleState.startupIssue)}
        onStart={handleWelcomeStart}
      />
      <CoachTips exportOpen={isExportOpen} />

      {/* Load on first open, then retain cancellation ownership through cleanup. */}
      {hasOpenedExport && (
        <ExportModal
          isOpen={isExportOpen}
          initialType={exportInitialType}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      {/* Shortcuts Cheat Sheet Modal (lazy-loaded) */}
      <AnimatePresence>
      {isShortcutsOpen && (
        <ShortcutsModal key="ShortcutsModal"
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        />
      )}
      </AnimatePresence>

      {/* Privacy, Diagnostics & Offline Health Modal (lazy-loaded) */}
      <AnimatePresence>
      {isDiagnosticsOpen && (
        <DiagnosticsModal key="DiagnosticsModal"
          isOpen={isDiagnosticsOpen}
          onClose={() => setIsDiagnosticsOpen(false)}
        />
      )}
      </AnimatePresence>

      {/* Canvas Resize Modal (lazy-loaded) */}
      <AnimatePresence>
      {isResizeOpen && (
        <CanvasResizeModal key="CanvasResizeModal"
          isOpen={isResizeOpen}
          onClose={() => setIsResizeOpen(false)}
          onResize={handleResize}
        />
      )}
      </AnimatePresence>

      {/* Drag & Drop Import Modal (lazy-loaded) */}
      <AnimatePresence>
      {isImportOpen && (
        <ImportModal key="ImportModal"
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
      </AnimatePresence>

      {/* Projects & Artworks Gallery Modal (lazy-loaded) */}
      <AnimatePresence>
      {isGalleryOpen && (
        <ProjectsGalleryModal key="ProjectsGalleryModal"
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
      </AnimatePresence>

      {/* Peer-to-Peer Co-Draw Modal (lazy-loaded) */}
      <AnimatePresence>
      {isCoDrawOpen && (
        <CoDrawModal key="CoDrawModal"
          onJoinGuest={joinCoDrawGuest}
          isOpen={isCoDrawOpen}
          onClose={() => setIsCoDrawOpen(false)}
        />
      )}
      </AnimatePresence>

      {/* Command Palette (Ctrl+K) */}
      <AnimatePresence>
      {isCommandPaletteOpen && (
        <CommandPaletteModal key="CommandPaletteModal"
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
      </AnimatePresence>

      {/* Recovery & Safe Mode Repair Wizard Modal (lazy-loaded) */}
      <AnimatePresence>
      {isRecoveryOpen && recoveryTarget && (
        <RecoveryModal key="RecoveryModal"
          isOpen={isRecoveryOpen}
          sourceProjectId={recoveryTarget.sourceProjectId}
          initialAssessment={recoveryTarget.assessment}
          onClose={() => {
            setIsRecoveryOpen(false);
          }}
          onRecoveryComplete={handleRecoveryComplete}
        />
      )}
      </AnimatePresence>

      {/* Pending Recovery Safe Mode Banner */}
      <AnimatePresence>
      {pendingRecovery && !isRecoveryOpen && (
        <SpringSurface
          key="recovery-banner"
          origin="top center"
          role="region"
          aria-label="Pending Project Recovery"
          data-testid="pending-recovery-banner"
          className="pb-panel fixed top-12 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[90%] !py-2.5 flex items-center justify-between gap-3 text-xs"
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
        </SpringSurface>
      )}
      </AnimatePresence>

      {/* Unified Toast & Affirmative Explicit Save Confirmation Toast (UX-14, Phase A) */}
      <SurfaceToast
        toast={activeToast ? {
          key: `${activeToast.type}:${activeToast.message}`,
          message: activeToast.message,
          tone: activeToast.type,
          icon: activeToast.type === 'error' ? 'warning' : activeToast.type === 'success' ? 'sparkles' : 'save',
          testId: 'studio-toast',
          action: activeToast.action,
        } : saveToast ? { key: `save:${saveToast}`, message: saveToast, tone: 'default', icon: 'save', testId: 'save-affirmation-toast' } : null}
        onAction={() => setActiveToast(null)}
      />
    </div>
  );
};

/**
 * Title dot and screen-reader save status. Kept out of StudioLayout so the
 * dirty flag flipping at the first stroke after each save re-renders only this.
 */
function StudioDocumentStatus() {
  const isDirty = useStudioStore((s) => s.isDirty);
  const saveStatus = useStudioStore((s) => s.saveStatus);
  const projectName = useStudioStore((s) => s.projectName);

  useEffect(() => {
    document.title = `${isDirty ? '● ' : ''}${projectName} — PixiBun`;
  }, [isDirty, projectName]);
  useEffect(() => () => { document.title = 'PixiBun — Pixels with a pulse'; }, []);

  return (
    <div className="sr-only" role="status" aria-live="polite">
      {getLocalSaveLabel(saveStatus, isDirty)}
    </div>
  );
}
