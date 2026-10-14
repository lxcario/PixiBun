'use client';

import { useEffect, useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { getNextZoomStep, getPrevZoomStep } from '@/config/zoom';
import { studioCommandForKey } from '@/config/studioCommands';
import { cycleCvdLens } from '@/lib/color/cvdLens';
import { isWorkspaceControlTarget, shouldIgnoreWorkspaceKey, workspaceShortcutKey } from '@/lib/input/workspaceKeyboard';

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
      if (shouldIgnoreWorkspaceKey(e) || e.altKey) return;
      const key = workspaceShortcutKey(e);

      const state = useStudioStore.getState();
      if (e.key === 'Tab' && e.shiftKey && !e.ctrlKey && !e.metaKey && !isWorkspaceControlTarget(e)) {
        e.preventDefault();
        useWorkspaceStore.getState().toggleFocus();
        return;
      }
      const command = studioCommandForKey(e);
      if (command) { e.preventDefault(); command.action(); return; }

      // Save now flushes browser storage. Save As explicitly creates a project file.
      if ((e.ctrlKey || e.metaKey) && key === 's') {
        e.preventDefault();
        if (optionsRef.current.autosaveTimerRef.current !== null) {
          window.clearTimeout(optionsRef.current.autosaveTimerRef.current);
          optionsRef.current.autosaveTimerRef.current = null;
        }
        // Flush browser storage first. Only Save As opens the OS file picker.
        void (async () => {
          const res = await optionsRef.current.runAutosave();
          if (typeof res === 'boolean' ? res : res.ok) optionsRef.current.triggerSaveToast();
          if (e.shiftKey) await optionsRef.current.handleSaveDesktopProject(true);
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
      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault();
        optionsRef.current.setIsCommandPaletteOpen?.((prev) => !prev);
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          optionsRef.current.handleRedo();
        } else {
          optionsRef.current.handleUndo();
        }
        return;
      }

      // Redo Alternate (Ctrl/Cmd + Y)
      if ((e.ctrlKey || e.metaKey) && key === 'y') {
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




      }

      // Single Key & Shift Key Shortcuts
      if (e.ctrlKey || e.metaKey) return;
      switch (key) {
        case 'h': {
          if (!e.ctrlKey && !e.metaKey) {
            if (e.shiftKey) {
              e.preventDefault();
              state.toggleSymmetryH();
            }
          }
          break;
        }
        case 'v': {
          if (!e.ctrlKey && !e.metaKey) {
            if (e.shiftKey) {
              e.preventDefault();
              state.toggleSymmetryV();
            }
          }
          break;
        }
        case 'd':
          if (e.shiftKey) { state.setPrimaryColor('#000000'); state.setSecondaryColor('#ffffff'); }
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
          // Space activates a focused menu button; it must not start playback.
          if (isWorkspaceControlTarget(e)) return;
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
