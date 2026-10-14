import { HistorySlice, StudioSliceCreator } from './types';
import { createId } from '@/lib/engine/id';
import { clearAllBuffers } from '@/lib/engine/bufferRegistry';
import { ProjectFile } from '@/types/project';
import { DesktopFileSystem } from '@/lib/storage/desktopFileSystem';
import { assertWorkspaceDimensions } from '@/config/canvasLimits';
import { parseMotionRigs } from '@/lib/animation/motionRigDocument';
import { parseAnimationReview } from '@/lib/animation/reviewMetadata';

/**
 * Studio Session & History Metadata Slice
 *
 * NOTE: Actual raster undo/redo snapshot buffers reside in `src/lib/engine/historyEngine.ts`
 * and are operated imperatively via `useViewportDrawing.ts` (using off-screen canvas ImageData).
 *
 * This slice manages reactive session-level metadata:
 * - `canUndo` / `canRedo` flags (reflected by UI undo/redo buttons)
 * - `bufferVersion` (reactive revision counter for rendering buffers)
 * - `saveStatus` (autosave status)
 * - `selection` / `selectionMask` (viewport selection)
 * - `loadProjectState` / `resetCanvas` (document lifecycle)
 */
export const createHistorySlice: StudioSliceCreator<HistorySlice> = (set, get) => ({
  canUndo: false,
  canRedo: false,
  setCanUndo: can => {
    set(state => {
      state.canUndo = can;
    });
  },
  setCanRedo: can => {
    set(state => {
      state.canRedo = can;
    });
  },

  bufferVersion: 0,
  bumpBufferVersion: () => {
    set(state => {
      state.bufferVersion += 1;
    });
  },

  saveStatus: 'idle',
  setSaveStatus: status => {
    set(state => {
      state.saveStatus = status;
    });
  },

  isDirty: false,
  editRevision: 0,
  setDirty: dirty => {
    set(state => {
      state.isDirty = dirty;
      if (dirty) state.editRevision += 1;
    });
  },
  markClean: () => {
    set(state => {
      state.isDirty = false;
    });
  },

  selection: null,
  selectionMask: null,
  hasFloatingSelection: false,
  setSelection: (sel, mask = null) => {
    set(state => {
      state.selection = sel;
      state.selectionMask = mask;
    });
  },

  activeInspectorTab: 'layers',

  setActiveInspectorTab: tab => {
    set(state => {
      state.activeInspectorTab = tab;
    });
  },

  loadProjectState: (projectData: Partial<ProjectFile>, projectId?: string) => {
    assertWorkspaceDimensions(projectData.width ?? get().canvasWidth, projectData.height ?? get().canvasHeight);
    const motionRigs = parseMotionRigs(projectData.motionRigs);
    if (motionRigs === null) throw new Error('Invalid or unsupported motion rig data.');
    DesktopFileSystem.reset();
    set(state => {
      state.motionRigs = motionRigs;
      // Cross-project boundary: viewport-local state that cannot be carried
      // meaningfully into the restored document must be reset, or a stale
      // selection / clip reference survives into an unrelated project.
      state.selection = null;
      state.selectionMask = null;
      state.motionPart = null;
      state.motionHistory = null;
      state.hasFloatingSelection = false;
      state.motionActivePose = 'end';
      state.motionPreviewIndex = null;
      state.activeClipId = null;
      state.isPlaying = false;
      state.currentProjectId = projectId || createId('proj');
      state.projectCreatedAt = projectData.createdAt ?? Date.now();
      state.editRevision += 1;
      if (projectData.name) state.projectName = projectData.name;
      if (projectData.width) state.canvasWidth = projectData.width;
      if (projectData.height) state.canvasHeight = projectData.height;
      if (projectData.fps) state.fps = projectData.fps;
      if (projectData.loopMode) state.loopMode = projectData.loopMode;
      if (projectData.onionSkin) {
        state.onionSkin = { ...state.onionSkin, ...projectData.onionSkin };
      }
      if (projectData.customRamps) {
        state.customRamps = projectData.customRamps.map(r => ({ ...r, shades: [...r.shades] }));
      }
      if (projectData.frames && projectData.frames.length > 0) {
        state.frames = projectData.frames;
        state.activeFrameIndex = 0;
        if (projectData.frames[0].layers.length > 0) {
          state.activeLayerId = projectData.frames[0].layers[0].id;
        }
      }
      if (projectData.palettes && projectData.palettes.length > 0) {
        state.palettes = projectData.palettes;
        state.currentPaletteId = projectData.currentPaletteId || projectData.palettes[0].id;
      }
      if (projectData.clips) {
        state.clips = projectData.clips.map((c, idx) => {
          const from = c.fromFrame !== undefined ? c.fromFrame : (c.startFrame ?? 0);
          const to = c.toFrame !== undefined ? c.toFrame : (c.endFrame ?? from);
          const review = c.review === undefined ? null : parseAnimationReview(c.review);
          return {
            id: c.id || `tag-${idx + 1}`,
            name: c.name || `Tag ${idx + 1}`,
            fromFrame: from,
            toFrame: to,
            startFrame: from,
            endFrame: to,
            color: c.color || '#F0BE7C',
            loopMode: c.loopMode || 'forward',
            ...(review ? { review } : {}),
          };
        });
      }
      state.isDirty = false;
    });
  },

  resetToNewProject: (newId?: string) => {
    DesktopFileSystem.reset();
    clearAllBuffers();
    const initialLayerId = createId('layer');
    const initialFrameId = createId('frame');
    set(state => {
      state.currentProjectId = newId || createId('proj');
      state.projectCreatedAt = Date.now();
      state.projectName = 'Untitled Sprite';
      state.canvasWidth = 32;
      state.canvasHeight = 32;
      state.zoom = 1600;
      state.panX = 0;
      state.panY = 0;
      state.isDirty = false;
      state.saveStatus = 'idle';
      state.canUndo = false;
      state.canRedo = false;
      state.frames = [
        {
          id: initialFrameId,
          durationMs: 125,
          layers: [
            {
              id: initialLayerId,
              name: 'Base Layer',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
            },
          ],
        },
      ];
      state.activeFrameIndex = 0;
      state.activeLayerId = initialLayerId;
      state.clips = [
        {
          id: 'tag-1',
          name: 'Default',
          fromFrame: 0,
          toFrame: 0,
          startFrame: 0,
          endFrame: 0,
          color: '#F0BE7C',
          loopMode: 'forward',
        },
      ];
      state.activeClipId = null;
      state.motionRigs = [];
      state.hasFloatingSelection = false;
      state.motionPart = null;
      state.motionHistory = null;
      state.motionActivePose = 'end';
      state.motionPreviewIndex = null;
      state.bufferVersion += 1;
    });
  },
});
