'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TopHeader } from './TopHeader';
import { ContextOptionsBar } from './ContextOptionsBar';
import { LeftToolbar } from './LeftToolbar';
import { CenterViewport } from './CenterViewport';
import { RightInspector } from './RightInspector';
import { BottomTimeline } from './BottomTimeline';
import { ExportModal } from '@/components/modals/ExportModal';
import { ShortcutsModal } from '@/components/modals/ShortcutsModal';
import { CanvasResizeModal, AnchorPosition } from '@/components/modals/CanvasResizeModal';
import { ImportModal, ImportPayload, ImageImportConfirmPayload } from '@/components/modals/ImportModal';
import { autoSaveWorkspace, loadLatestSavedWorkspace } from '@/lib/storage/db';
import { buildProjectFile, hydrateProject } from '@/lib/project/serialize';
import { validateProjectFile } from '@/lib/project/schema';
import { getOrCreateBuffer } from '@/lib/engine/bufferRegistry';

const AUTOSAVE_DEBOUNCE_MS = 800;

export const StudioLayout: React.FC = () => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isResizeOpen, setIsResizeOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPayload, setImportPayload] = useState<ImportPayload | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveInFlightRef = useRef(false);

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
  } = useStudioStore();

  // Serialize the full studio - pixels included - into IndexedDB. Debounced so
  // a fast stroke burst writes once at the end instead of per commit.
  const runAutosave = useCallback(async () => {
    if (autosaveInFlightRef.current) return;
    autosaveInFlightRef.current = true;
    try {
      const project = buildProjectFile();
      await autoSaveWorkspace(
        'current-project',
        project.name,
        project.width,
        project.height,
        project.fps,
        project
      );
    } catch (err) {
      console.error('Autosave failed:', err);
    } finally {
      autosaveInFlightRef.current = false;
    }
  }, []);

  const handleCommitHistory = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void runAutosave();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [runAutosave]);

  // Best-effort flush when the tab is hidden or closed mid-debounce.
  useEffect(() => {
    const flush = () => void runAutosave();
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [runAutosave]);

  // Restore the last session on mount. Legacy saves (pre-ProjectFile) fail
  // validation on purpose - starting fresh beats restoring empty promises.
  useEffect(() => {
    let cancelled = false;
    loadLatestSavedWorkspace().then(async (saved) => {
      if (!saved || cancelled) return;
      try {
        const parsed: unknown = JSON.parse(saved.dataJson);
        const result = validateProjectFile(parsed);
        if (!result.ok) return;
        await hydrateProject(result.value);
      } catch (err) {
        console.error('Project restore failed:', err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Undo / Redo handlers dispatching to canvas engine
  const handleUndo = useCallback(() => {
    window.dispatchEvent(new CustomEvent('pixibun:undo'));
  }, []);

  const handleRedo = useCallback(() => {
    window.dispatchEvent(new CustomEvent('pixibun:redo'));
  }, []);

  // Handle Canvas Resize - anchor and resample choices flow through so
  // content lands where the user asked instead of hugging the top-left.
  const handleResize = useCallback(
    (newWidth: number, newHeight: number, anchor: AnchorPosition, resample: boolean) => {
      setCanvasSize(newWidth, newHeight, anchor, resample);
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
    const { canvas, target, extractedPalette, addToPalette, filename } = confirmData;
    const store = useStudioStore.getState();
    const width = store.canvasWidth;
    const height = store.canvasHeight;

    let targetLayerId = store.activeLayerId;

    if (target === 'new-frame') {
      store.addFrame();
      const updatedState = useStudioStore.getState();
      const newFrame = updatedState.frames[updatedState.activeFrameIndex];
      targetLayerId = newFrame?.layers[0]?.id || updatedState.activeLayerId;
    } else if (target === 'new-layer') {
      const layerName = filename ? `Import: ${filename.replace(/\.[^/.]+$/, '')}` : 'Imported Layer';
      store.addLayer(layerName);
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

    if (addToPalette && extractedPalette.length > 0) {
      const paletteName = filename ? `Palette: ${filename.replace(/\.[^/.]+$/, '')}` : 'Imported Palette';
      store.addExtractedPalette(paletteName, extractedPalette);
    }

    store.bumpBufferVersion();
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
  ]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--desk-bg)] text-[var(--text-heading)] transition-colors duration-300 overflow-hidden select-none">
      {/* Top Header */}
      <TopHeader
        onOpenExport={() => setIsExportOpen(true)}
        onOpenImport={handleOpenImport}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenResize={() => setIsResizeOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Contextual Dynamic Tool Options Strip */}
      <ContextOptionsBar />

      {/* Main Workspace Area (Left Toolbar + Center Stage + Right Inspector) */}
      <div className="flex flex-1 overflow-hidden">
        <LeftToolbar />
        <CenterViewport 
          onCommitHistory={handleCommitHistory}
          onOpenImport={handleOpenImport}
        />
        <RightInspector />
      </div>

      {/* Bottom Timeline */}
      <BottomTimeline />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {/* Shortcuts Cheat Sheet Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Canvas Resize Modal */}
      <CanvasResizeModal
        isOpen={isResizeOpen}
        onClose={() => setIsResizeOpen(false)}
        onResize={handleResize}
      />

      {/* Drag & Drop Import Modal */}
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
    </div>
  );
};
