'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useStudioStore } from '@/stores/studioStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { TopHeader } from './TopHeader';
import { ContextOptionsBar } from './ContextOptionsBar';
import { LeftToolbar } from './LeftToolbar';
import { CenterViewport } from './CenterViewport';
import { RightInspector } from './RightInspector';
import { BottomTimeline } from './BottomTimeline';
import type { AnchorPosition } from '@/components/modals/CanvasResizeModal';
import type { ImportPayload, ImageImportConfirmPayload } from '@/components/modals/ImportModal';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { autoSaveWorkspace, loadLatestSavedWorkspace, getProjectById, getLayerBlobsForProject } from '@/lib/storage/db';
import { buildAutosavePayloadAsync, hydrateProject, generateCompositeThumbnail } from '@/lib/project/serialize';
import { validateProjectFile } from '@/lib/project/schema';
import { getOrCreateBuffer, clearAllBuffers } from '@/lib/engine/bufferRegistry';
import { cycleCvdLens } from '@/lib/color/cvdLens';
import { studioEvents } from '@/lib/events/studioEvents';

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

const AUTOSAVE_DEBOUNCE_MS = 800;

export const StudioLayout: React.FC = () => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isResizeOpen, setIsResizeOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNewConfirmOpen, setIsNewConfirmOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isCoDrawOpen, setIsCoDrawOpen] = useState(false);
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [importPayload, setImportPayload] = useState<ImportPayload | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveInFlightRef = useRef(false);
  const autosavePendingRef = useRef(false);
  const inFlightPromiseRef = useRef<Promise<void> | null>(null);
  const autosaveFailCountRef = useRef(0);

  const {
    setActiveFrame,
    isPlaying,
    setIsPlaying,
    setActiveTool,
    swapColors,
    setBrushSize,
    tools,
    canUndo,
    canRedo,
    setCanvasSize,
    frames,
    activeFrameIndex,
    currentProjectId,
    resetToNewProject,
    zoom,
    setZoom,
    setPan,
    canvasWidth,
    canvasHeight,
  } = useStudioStore();

  // Serialize the full studio - pixels included - into IndexedDB. Debounced so
  // a fast stroke burst writes once at the end instead of per commit.
  // Uses a coalescing pending-save loop to ensure in-flight saves never drop updates.
  const runAutosave = useCallback(async () => {
    if (autosaveInFlightRef.current) {
      autosavePendingRef.current = true;
      if (inFlightPromiseRef.current) {
        await inFlightPromiseRef.current;
      }
      return;
    }

    autosaveInFlightRef.current = true;
    const savePromise = (async () => {
      try {
        do {
          autosavePendingRef.current = false;
          const { setSaveStatus } = useStudioStore.getState();
          setSaveStatus('saving');
          try {
            const { project, layerBlobs } = await buildAutosavePayloadAsync();
            const thumbnailDataUrl = generateCompositeThumbnail(128, 128);
            const state = useStudioStore.getState();
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
              autosaveFailCountRef.current = 0;
              setAutosaveError(null);
              setSaveStatus('saved');
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
            }
          } catch (err) {
            console.error('Autosave failed:', err);
            autosaveFailCountRef.current += 1;
            setSaveStatus('error');
            if (autosaveFailCountRef.current >= 2) {
              setAutosaveError(
                'Autosave warning: Browser local storage write failed (disk quota or privacy restriction). Please export your drawing as PNG or .pixibun to avoid data loss.'
              );
            }
          }
        } while (autosavePendingRef.current);
      } finally {
        autosaveInFlightRef.current = false;
        inFlightPromiseRef.current = null;
      }
    })();

    inFlightPromiseRef.current = savePromise;
    await savePromise;
  }, []);

  const handleConfirmNewDrawing = useCallback(() => {
    clearAllBuffers();
    resetToNewProject();
    setIsNewConfirmOpen(false);
    studioEvents.emit('pixibun:history-clear');
    void runAutosave();
  }, [resetToNewProject, runAutosave]);

  const handleOpenProject = useCallback(async (projectId: string) => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    await runAutosave();

    const target = await getProjectById(projectId);
    if (!target) return;

    try {
      const parsed: unknown = JSON.parse(target.dataJson);
      const result = validateProjectFile(parsed);
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      const layerBlobs = await getLayerBlobsForProject(target.id);
      await hydrateProject(result.value, target.id, layerBlobs);
    } catch (err) {
      console.error('Failed to open project:', err);
    }
  }, [runAutosave]);

  const handleCommitHistory = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void runAutosave();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [runAutosave]);

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
    loadLatestSavedWorkspace().then(async (saved) => {
      if (!saved || cancelled) return;
      try {
        const parsed: unknown = JSON.parse(saved.dataJson);
        const result = validateProjectFile(parsed);
        if (!result.ok) return;
        const layerBlobs = await getLayerBlobsForProject(saved.id);
        await hydrateProject(result.value, saved.id, layerBlobs);
      } catch (err) {
        console.error('Project restore failed:', err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [runAutosave]);

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
      setCanvasSize(newWidth, newHeight, anchor, resample);
      studioEvents.emit('pixibun:history-clear');
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
    const { canvas, target, extractedPalette, addToPalette, filename, resizeCanvasToMatch, slicedFrames } = confirmData;
    const store = useStudioStore.getState();

    // 1. If user chose to match image dimensions, resize canvas first!
    //    History is invalidated because undo snapshots hold old-dimension ImageData.
    if (resizeCanvasToMatch) {
      store.setCanvasSize(resizeCanvasToMatch.width, resizeCanvasToMatch.height, 'top-left', false);
      studioEvents.emit('pixibun:history-clear');
    }

    const currentStore = useStudioStore.getState();
    const width = currentStore.canvasWidth;
    const height = currentStore.canvasHeight;

    if (slicedFrames && slicedFrames.length > 0) {
      if (target === 'sprite-sheet-replace') {
        const existingCount = currentStore.frames.length;
        const newCount = slicedFrames.length;

        // 1. Draw frame 0 onto the first frame's active layer
        const targetLayerId = currentStore.activeLayerId;
        if (targetLayerId) {
          const layerBuf = getOrCreateBuffer(targetLayerId, width, height);
          const ctx = layerBuf.canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.clearRect(0, 0, width, height);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(slicedFrames[0], 0, 0, width, height);
          }
        }

        // 2. Overwrite existing frames 1..min(existingCount, newCount) - 1
        const overwriteCount = Math.min(existingCount, newCount);
        for (let i = 1; i < overwriteCount; i++) {
          const frame = currentStore.frames[i];
          const lId = frame?.layers[0]?.id;
          if (lId) {
            const buf = getOrCreateBuffer(lId, width, height);
            const fCtx = buf.canvas.getContext('2d', { willReadFrequently: true });
            if (fCtx) {
              fCtx.clearRect(0, 0, width, height);
              fCtx.imageSmoothingEnabled = false;
              fCtx.drawImage(slicedFrames[i], 0, 0, width, height);
            }
          }
        }

        // 3. If new frames > existing frames, add new frames for the remainder
        for (let i = existingCount; i < newCount; i++) {
          currentStore.addFrame();
          const st = useStudioStore.getState();
          const frame = st.frames[st.activeFrameIndex];
          const lId = frame?.layers[0]?.id || st.activeLayerId;
          const buf = getOrCreateBuffer(lId, width, height);
          const fCtx = buf.canvas.getContext('2d', { willReadFrequently: true });
          if (fCtx) {
            fCtx.clearRect(0, 0, width, height);
            fCtx.imageSmoothingEnabled = false;
            fCtx.drawImage(slicedFrames[i], 0, 0, width, height);
          }
        }

        // 4. If existing frames > new frames, delete excess frames from the end
        for (let i = existingCount - 1; i >= newCount; i--) {
          currentStore.deleteFrame(i);
        }

        currentStore.setActiveFrame(0);
      } else {
        // sprite-sheet-append (or default)
        for (let i = 0; i < slicedFrames.length; i++) {
          currentStore.addFrame();
          const st = useStudioStore.getState();
          const frame = st.frames[st.activeFrameIndex];
          const lId = frame?.layers[0]?.id || st.activeLayerId;
          const buf = getOrCreateBuffer(lId, width, height);
          const fCtx = buf.canvas.getContext('2d', { willReadFrequently: true });
          if (fCtx) {
            fCtx.clearRect(0, 0, width, height);
            fCtx.imageSmoothingEnabled = false;
            fCtx.drawImage(slicedFrames[i], 0, 0, width, height);
          }
        }
      }
    } else {
      let targetLayerId = currentStore.activeLayerId;

      if (target === 'new-frame') {
        currentStore.addFrame();
        const updatedState = useStudioStore.getState();
        const newFrame = updatedState.frames[updatedState.activeFrameIndex];
        targetLayerId = newFrame?.layers[0]?.id || updatedState.activeLayerId;
      } else if (target === 'new-layer') {
        const layerName = filename ? `Import: ${filename.replace(/\.[^/.]+$/, '')}` : 'Imported Layer';
        currentStore.addLayer(layerName);
        const updatedState = useStudioStore.getState();
        targetLayerId = updatedState.activeLayerId;
      }

      if (targetLayerId) {
        const layerBuf = getOrCreateBuffer(targetLayerId, width, height);
        const ctx = layerBuf.canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          if (target === 'replace-layer') {
            ctx.clearRect(0, 0, width, height);
          }
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(canvas, 0, 0);
        }
      }
    }

    if (addToPalette && extractedPalette.length > 0) {
      const paletteName = filename ? `Palette: ${filename.replace(/\.[^/.]+$/, '')}` : 'Imported Palette';
      currentStore.addExtractedPalette(paletteName, extractedPalette);
    }

    currentStore.bumpBufferVersion();
    setIsImportOpen(false);
  }, []);

  // Global Clipboard Paste (Ctrl+V) for Image Files
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              const img = new Image();
              img.onload = () => {
                handleOpenImport({
                  type: 'image',
                  filename: 'Pasted Image',
                  dataUrl,
                  imgWidth: img.width,
                  imgHeight: img.height,
                });
              };
              img.src = dataUrl;
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleOpenImport]);

  // Confirm Project Import - validate before touching live state so a
  // malformed file explains itself instead of corrupting the session.
  const handleConfirmImportProject = useCallback(() => {
    if (!importPayload?.projectJson) return;

    const result = validateProjectFile(importPayload.projectJson);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }

    setImportError(null);
    setIsImportOpen(false);
    void hydrateProject(result.value);
  }, [importPayload]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut if typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      // Help / Shortcuts
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Zoom Shortcuts: Ctrl/Cmd + (+, -, 0, 1)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          const ZOOM_STEPS = [100, 200, 400, 800, 1600, 3200, 6400];
          const nextStep = ZOOM_STEPS.find((step) => step > zoom) || 6400;
          setZoom(nextStep);
          return;
        }

        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          const ZOOM_STEPS = [100, 200, 400, 800, 1600, 3200, 6400];
          const prevStep = [...ZOOM_STEPS].reverse().find((step) => step < zoom) || 100;
          setZoom(prevStep);
          return;
        }

        if (e.key === '0') {
          e.preventDefault();
          const fitZoom = Math.max(
            100,
            Math.min(
              6400,
              Math.min(
                Math.floor(52000 / Math.max(1, canvasWidth)),
                Math.floor(52000 / Math.max(1, canvasHeight))
              )
            )
          );
          setZoom(fitZoom);
          setPan(0, 0);
          return;
        }

        if (e.key === '1') {
          e.preventDefault();
          setZoom(100);
          setPan(0, 0);
          return;
        }
      }

      // Single Key Shortcuts
      const key = e.key.toLowerCase();
      switch (key) {
        case 'b':
          setActiveTool('pen');
          break;
        case 'c':
          setActiveTool('curve');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case 'g':
          setActiveTool('bucket');
          break;
        case 'd':
          setActiveTool('dither');
          break;
        case 'i':
          setActiveTool('eyedropper');
          break;
        case 'm':
          setActiveTool('select-box');
          break;
        case 'q':
          setActiveTool('select-lasso');
          break;
        case 'w':
          setActiveTool('select-wand');
          break;
        case 'l':
          setActiveTool('line');
          break;
        case 'j':
          setActiveTool('isometric-line');
          break;
        case 'u':
          setActiveTool('rectangle');
          break;
        case 'o':
          setActiveTool('ellipse');
          break;
        case 'r':
          setActiveTool('color-replace');
          break;
        case 'k':
          if (e.shiftKey) {
            setActiveTool('rivet-stamp');
          } else {
            setActiveTool('normal-chisel');
          }
          break;
        case 'n':
          setActiveTool('rivet-stamp');
          break;
        case 's': {
          // Silhouette / Squint Mode (DESIGN.md §13) — display-only viewport lens
          useStudioStore.getState().toggleSquintMode();
          break;
        }
        case 'p': {
          // CVD Colorblindness Lens (DESIGN.md §12) — cycle display-only lens
          const { cvdLens: current, setCvdLens } = useStudioStore.getState();
          setCvdLens(cycleCvdLens(current));
          break;
        }
        case 'x':
          swapColors();
          break;
        case '[':
          setBrushSize(Math.max(1, tools.brushSize - 1));
          break;
        case ']':
          setBrushSize(Math.min(32, tools.brushSize + 1));
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case ',':
          setActiveFrame((activeFrameIndex - 1 + frames.length) % frames.length);
          break;
        case '.':
          setActiveFrame((activeFrameIndex + 1) % frames.length);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    setActiveTool,
    swapColors,
    setBrushSize,
    tools.brushSize,
    frames.length,
    activeFrameIndex,
    setActiveFrame,
    isPlaying,
    setIsPlaying,
    handleUndo,
    handleRedo,
    zoom,
    setZoom,
    setPan,
    canvasWidth,
    canvasHeight,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--desk-bg)] text-[var(--text-heading)] transition-colors duration-300 overflow-hidden select-none">
      {/* Top Header */}
      <TopHeader
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
      />

      {/* Persistent Storage Eviction Warning Banner */}
      {storageWarning && !autosaveError && (
        <div className="bg-[#f0be7c]/20 border-b-2 border-[#f0be7c] px-4 py-2 flex items-center justify-between text-xs font-mono text-[#f0be7c] z-30 shadow-md transition-all">
          <div className="flex items-center gap-2">
            <PixelIcon name="warning" size={14} />
            <span>{storageWarning}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <TactileButton
              size="sm"
              variant="default"
              onClick={() => setIsExportOpen(true)}
              title="Open Export Dialog"
              className="text-xs px-2.5 py-1 bg-[#f0be7c] hover:bg-[#ffd699] text-[#140d1f] font-bold border border-[#8c5120]"
            >
              Export Backup
            </TactileButton>
            <button
              onClick={() => {
                setStorageWarning(null);
                try {
                  sessionStorage.setItem('pixibun:storage-dismissed', '1');
                } catch {
                  // sessionStorage may be blocked in strict privacy modes
                }
              }}
              className="px-2 py-1 text-xs text-[#f0be7c] hover:text-[#fff] transition-colors cursor-pointer"
              title="Dismiss warning"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Autosave Disk Write Error Banner */}
      {autosaveError && (
        <div className="bg-[#eb5a66]/20 border-b-2 border-[#eb5a66] px-4 py-2 flex items-center justify-between text-xs font-mono text-[#ffb4b9] z-30 shadow-md transition-all">
          <div className="flex items-center gap-2">
            <PixelIcon name="warning" size={14} />
            <span>{autosaveError}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <TactileButton
              size="sm"
              variant="danger"
              onClick={() => setIsExportOpen(true)}
              title="Open Export Dialog"
              className="text-xs px-2.5 py-1 bg-[#eb5a66] hover:bg-[#ff8c94] text-[#140d1f] font-bold border border-[#8c202a]"
            >
              Export Drawing
            </TactileButton>
            <button
              onClick={() => setAutosaveError(null)}
              className="px-2 py-1 text-xs text-[#ffb4b9] hover:text-[#fff] transition-colors cursor-pointer"
              title="Dismiss warning"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Contextual Dynamic Tool Options Strip */}
      <ContextOptionsBar />

      {/* Main Workspace Area (Left Toolbar + Center Stage + Right Inspector) */}
      <div id="main-workspace" tabIndex={-1} className="flex flex-1 overflow-hidden outline-none">
        <LeftToolbar />
        <CenterViewport 
          onCommitHistory={handleCommitHistory}
          onOpenImport={handleOpenImport}
        />
        <RightInspector />
      </div>

      {/* Bottom Timeline */}
      <BottomTimeline />

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
    </div>
  );
};
