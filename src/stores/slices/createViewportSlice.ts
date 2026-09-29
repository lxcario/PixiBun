import { ViewportSlice, StudioSliceCreator } from './types';
import { createId } from '@/lib/engine/id';
import { resizeAllBuffers } from '@/lib/engine/bufferRegistry';
import { assertWorkspaceDimensions } from '@/config/canvasLimits';
import { validateWorkspaceStructure } from '@/lib/project/workspaceEnvelopeGuard';
import { projectNameError } from '@/lib/project/metadataAdmission';
import { studioEvents } from '@/lib/events/studioEvents';

export const createViewportSlice: StudioSliceCreator<ViewportSlice> = (set, get) => ({
  currentProjectId: createId('proj'),
  canvasWidth: 32,
  canvasHeight: 32,
  projectName: 'Untitled Sprite',

  zoom: 1600,
  panX: 0,
  panY: 0,
  showGrid: true,
  showTilePreview: false,
  showIsoGuides: false,
  showFloatingPreview: false,
  showNormalMapPreview: false,
  previewScale: 2,
  previewBackdrop: 'checker',
  cvdLens: 'none',
  squintMode: false,
  photometricGizmoActive: false,
  referenceOverlay: 'none',

  setReferenceOverlay: mode => {
    set(state => {
      state.referenceOverlay = mode;
    });
  },

  cycleReferenceOverlay: () => {
    set(state => {
      const modes: ('none' | 'thirds' | 'golden' | 'center')[] = ['none', 'thirds', 'golden', 'center'];
      const nextIdx = (modes.indexOf(state.referenceOverlay) + 1) % modes.length;
      state.referenceOverlay = modes[nextIdx];
    });
  },

  setPhotometricGizmoActive: (active: boolean) => {
    set(state => {
      state.photometricGizmoActive = active;
    });
  },

  setCurrentProjectId: (id: string) => {
    set(state => {
      state.currentProjectId = id;
    });
  },

  setCanvasSize: (width, height, anchor = 'center', resample = true) => {
    assertWorkspaceDimensions(width, height);
    const previousWidth = get().canvasWidth;
    const previousHeight = get().canvasHeight;
    if (previousWidth === width && previousHeight === height) return;

    const validity = validateWorkspaceStructure(width, height, get().frames);
    if (!validity.ok) {
      throw new RangeError(validity.reason);
    }

    resizeAllBuffers(width, height, anchor, resample);
    set(state => {
      state.canvasWidth = width;
      state.canvasHeight = height;
      state.isDirty = true;
      state.editRevision += 1;
    });
  },

  setProjectName: name => {
    const error = projectNameError(name);
    if (error) {
      studioEvents.emit('pixibun:toast', { type: 'error', message: error });
      return;
    }
    if (name === get().projectName) return;
    set(state => {
      state.projectName = name;
      state.isDirty = true;
      state.editRevision += 1;
    });
  },

  setZoom: zoom => {
    set(state => {
      state.zoom = Math.max(10, Math.min(6400, Math.round(zoom)));
    });
  },

  setPan: (x, y) => {
    set(state => {
      state.panX = Math.round(x);
      state.panY = Math.round(y);
    });
  },

  setZoomAndPan: (zoom, x, y) => {
    set(state => {
      state.zoom = Math.max(10, Math.min(6400, Math.round(zoom)));
      state.panX = Math.round(x);
      state.panY = Math.round(y);
    });
  },

  toggleGrid: () => {
    set(state => {
      state.showGrid = !state.showGrid;
    });
  },

  toggleTilePreview: () => {
    set(state => {
      state.showTilePreview = !state.showTilePreview;
    });
  },

  toggleIsoGuides: () => {
    set(state => {
      state.showIsoGuides = !state.showIsoGuides;
    });
  },

  toggleFloatingPreview: () => {
    set(state => {
      state.showFloatingPreview = !state.showFloatingPreview;
    });
  },

  toggleNormalMapPreview: () => {
    set(state => {
      state.showNormalMapPreview = !state.showNormalMapPreview;
    });
  },

  setPreviewScale: scale => {
    set(state => {
      state.previewScale = scale;
    });
  },

  setPreviewBackdrop: bg => {
    set(state => {
      state.previewBackdrop = bg;
    });
  },

  setCvdLens: mode => {
    set(state => {
      state.cvdLens = mode;
    });
  },

  toggleSquintMode: () => {
    set(state => {
      state.squintMode = !state.squintMode;
    });
  },
});
