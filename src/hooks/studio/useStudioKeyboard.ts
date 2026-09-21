'use client';

import { useEffect, useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { getNextZoomStep, getPrevZoomStep, calculateFitZoom } from '@/config/zoom';
import { cycleCvdLens } from '@/lib/color/cvdLens';

import type { SaveResult } from '@/types/project';

export interface UseStudioKeyboardOptions {
  autosaveTimerRef: React.MutableRefObject<number | null>;
  runAutosave: () => Promise<SaveResult | boolean>;
  triggerSaveToast: () => void;
  handleSaveDesktopProject: (forceSaveAs?: boolean) => Promise<void>;
  setIsShortcutsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCommandPaletteOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  handleUndo: () => void;
  handleRedo: () => void;
}

export function useStudioKeyboard(options: UseStudioKeyboardOptions): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

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

      const state = useStudioStore.getState();

      // Desktop / Local Project Save: Ctrl/Cmd + S (Save) / Ctrl/Cmd + Shift + S (Save As)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (optionsRef.current.autosaveTimerRef.current !== null) {
          window.clearTimeout(optionsRef.current.autosaveTimerRef.current);
          optionsRef.current.autosaveTimerRef.current = null;
        }
        // Flush the debounced IndexedDB autosave first, then hand off to the
        // desktop File System Access save — sequenced so the project is never
        // serialized twice concurrently (and the OS dialog can't interleave
        // with the local write).
        void (async () => {
          const res = await optionsRef.current.runAutosave();
          if (typeof res === 'boolean' ? res : res.ok) optionsRef.current.triggerSaveToast();
          await optionsRef.current.handleSaveDesktopProject(e.shiftKey);
        })();
        return;
      }

      // Help / Shortcuts
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        optionsRef.current.setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // Command Palette: Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        optionsRef.current.setIsCommandPaletteOpen?.((prev) => !prev);
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          optionsRef.current.handleRedo();
        } else {
          optionsRef.current.handleUndo();
        }
        return;
      }

      // Redo Alternate (Ctrl/Cmd + Y)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        optionsRef.current.handleRedo();
        return;
      }

      // Zoom Shortcuts: Ctrl/Cmd + (+, -, 0, 1)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          state.setZoom(getNextZoomStep(state.zoom));
          return;
        }

        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          state.setZoom(getPrevZoomStep(state.zoom));
          return;
        }

        if (e.key === '0') {
          e.preventDefault();
          const fitZoom = calculateFitZoom(state.canvasWidth, state.canvasHeight);
          state.setZoom(fitZoom);
          state.setPan(0, 0);
          return;
        }

        if (e.key === '1') {
          e.preventDefault();
          state.setZoom(100);
          state.setPan(0, 0);
          return;
        }
      }

      // Single Key & Shift Key Shortcuts
      const key = e.key.toLowerCase();
      switch (key) {
        case 'h': {
          if (!e.ctrlKey && !e.metaKey) {
            const hasSelection = !!state.selection;
            if (e.shiftKey || !hasSelection) {
              e.preventDefault();
              state.toggleSymmetryH();
            }
          }
          break;
        }
        case 'v': {
          if (!e.ctrlKey && !e.metaKey) {
            const hasSelection = !!state.selection;
            if (e.shiftKey || !hasSelection) {
              e.preventDefault();
              state.toggleSymmetryV();
            }
          }
          break;
        }
        case 'b':
          state.setActiveTool('pen');
          break;
        case 'c':
          state.setActiveTool('curve');
          break;
        case 'e':
          state.setActiveTool('eraser');
          break;
        case 'g':
          state.setActiveTool('bucket');
          break;
        case 'd':
          if (e.shiftKey) {
            state.setPrimaryColor('#000000');
            state.setSecondaryColor('#ffffff');
          } else {
            state.setActiveTool('dither');
          }
          break;
        case 'i':
          state.setActiveTool('eyedropper');
          break;
        case 'm':
          state.setActiveTool('select-box');
          break;
        case 'q':
          state.setActiveTool('select-lasso');
          break;
        case 'w':
          state.setActiveTool('select-wand');
          break;
        case 'l':
          state.setActiveTool('line');
          break;
        case 'j':
          state.setActiveTool('isometric-line');
          break;
        case 'u':
          state.setActiveTool('rectangle');
          break;
        case 'o':
          state.setActiveTool('ellipse');
          break;
        case 'r':
          state.setActiveTool('color-replace');
          break;
        case 'k':
          if (e.shiftKey) {
            state.setActiveTool('rivet-stamp');
          } else {
            state.setActiveTool('normal-chisel');
          }
          break;
        case 'n':
          state.setActiveTool('rivet-stamp');
          break;
        case 's': {
          // Silhouette / Squint Mode (DESIGN.md §13) — display-only viewport lens
          if (!e.ctrlKey && !e.metaKey) {
            state.toggleSquintMode();
          }
          break;
        }
        case 'p': {
          // CVD Colorblindness Lens (DESIGN.md §12) — cycle display-only lens
          state.setCvdLens(cycleCvdLens(state.cvdLens));
          break;
        }
        case 'x':
          state.swapColors();
          break;
        case '[':
          state.setBrushSize(Math.max(1, state.tools.brushSize - 1));
          break;
        case ']':
          state.setBrushSize(Math.min(32, state.tools.brushSize + 1));
          break;
        case ' ':
          e.preventDefault();
          state.setIsPlaying(!state.isPlaying);
          break;
        case ',':
          state.setActiveFrame((state.activeFrameIndex - 1 + state.frames.length) % state.frames.length);
          break;
        case '.':
          state.setActiveFrame((state.activeFrameIndex + 1) % state.frames.length);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
