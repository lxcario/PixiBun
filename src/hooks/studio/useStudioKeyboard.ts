'use client';

import { useEffect } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { getNextZoomStep, getPrevZoomStep, calculateFitZoom } from '@/config/zoom';
import { cycleCvdLens } from '@/lib/color/cvdLens';

export interface UseStudioKeyboardOptions {
  autosaveTimerRef: React.MutableRefObject<number | null>;
  runAutosave: () => Promise<boolean>;
  triggerSaveToast: () => void;
  handleSaveDesktopProject: (forceSaveAs?: boolean) => Promise<void>;
  setIsShortcutsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCommandPaletteOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  handleUndo: () => void;
  handleRedo: () => void;
}

export function useStudioKeyboard({
  autosaveTimerRef,
  runAutosave,
  triggerSaveToast,
  handleSaveDesktopProject,
  setIsShortcutsOpen,
  setIsCommandPaletteOpen,
  handleUndo,
  handleRedo,
}: UseStudioKeyboardOptions): void {
  const {
    setActiveFrame,
    isPlaying,
    setIsPlaying,
    setActiveTool,
    swapColors,
    setBrushSize,
    tools,
    frames,
    activeFrameIndex,
    zoom,
    setZoom,
    setPan,
    canvasWidth,
    canvasHeight,
    toggleSymmetryH,
    toggleSymmetryV,
  } = useStudioStore();

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

      // Desktop / Local Project Save: Ctrl/Cmd + S (Save) / Ctrl/Cmd + Shift + S (Save As)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (autosaveTimerRef.current !== null) {
          window.clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = null;
        }
        // Flush the debounced IndexedDB autosave first, then hand off to the
        // desktop File System Access save — sequenced so the project is never
        // serialized twice concurrently (and the OS dialog can't interleave
        // with the local write).
        void (async () => {
          if (await runAutosave()) triggerSaveToast();
          await handleSaveDesktopProject(e.shiftKey);
        })();
        return;
      }

      // Help / Shortcuts
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // Command Palette: Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen?.((prev) => !prev);
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

      // Redo Alternate (Ctrl/Cmd + Y)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Zoom Shortcuts: Ctrl/Cmd + (+, -, 0, 1)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoom(getNextZoomStep(zoom));
          return;
        }

        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          setZoom(getPrevZoomStep(zoom));
          return;
        }

        if (e.key === '0') {
          e.preventDefault();
          const fitZoom = calculateFitZoom(canvasWidth, canvasHeight);
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

      // Single Key & Shift Key Shortcuts
      const key = e.key.toLowerCase();
      switch (key) {
        case 'h': {
          if (!e.ctrlKey && !e.metaKey) {
            const hasSelection = !!useStudioStore.getState().selection;
            if (e.shiftKey || !hasSelection) {
              e.preventDefault();
              toggleSymmetryH();
            }
          }
          break;
        }
        case 'v': {
          if (!e.ctrlKey && !e.metaKey) {
            const hasSelection = !!useStudioStore.getState().selection;
            if (e.shiftKey || !hasSelection) {
              e.preventDefault();
              toggleSymmetryV();
            }
          }
          break;
        }
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
          if (e.shiftKey) {
            const { setPrimaryColor, setSecondaryColor } = useStudioStore.getState();
            setPrimaryColor('#000000');
            setSecondaryColor('#ffffff');
          } else {
            setActiveTool('dither');
          }
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
          if (!e.ctrlKey && !e.metaKey) {
            useStudioStore.getState().toggleSquintMode();
          }
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
    handleSaveDesktopProject,
    runAutosave,
    setIsCommandPaletteOpen,
    triggerSaveToast,
    zoom,
    setZoom,
    setPan,
    canvasWidth,
    canvasHeight,
    toggleSymmetryH,
    toggleSymmetryV,
    autosaveTimerRef,
    setIsShortcutsOpen,
  ]);
}
