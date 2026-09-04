import { HistorySlice, StudioSliceCreator } from './types';
import { createId } from '@/lib/engine/id';
import { clearAllBuffers } from '@/lib/engine/bufferRegistry';
import { ProjectFile } from '@/types/project';

export const createHistorySlice: StudioSliceCreator<HistorySlice> = set => ({
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

  selection: null,
  selectionMask: null,
  setSelection: (sel, mask = null) => {
    set(state => {
      state.selection = sel;
      state.selectionMask = mask;
    });
  },

  aiMessages: [
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: "Hey there! I'm PixiBud, your pixel art math studio assistant. Tap any of the panels below to execute deterministic 2.5D photometric lighting, volumetric SSS, or normal baking directly on your artwork layers!",
      timestamp: Date.now(),
      suggestions: ['2.5D Photometric', 'Volumetric SSS', 'Harmonize palette', 'Clean jaggies'],
    },
  ],
  isAiThinking: false,
  activeInspectorTab: 'layers',

  setActiveInspectorTab: tab => {
    set(state => {
      state.activeInspectorTab = tab;
    });
  },

  addAiMessage: message => {
    set(state => {
      state.aiMessages.push({
        ...message,
        id: createId('msg'),
        timestamp: Date.now(),
      });
    });
  },

  setIsAiThinking: thinking => {
    set(state => {
      state.isAiThinking = thinking;
    });
  },

  loadProjectState: (projectData: Partial<ProjectFile>, projectId?: string) => {
    set(state => {
      if (projectId) state.currentProjectId = projectId;
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
          return {
            id: c.id || `tag-${idx + 1}`,
            name: c.name || `Tag ${idx + 1}`,
            fromFrame: from,
            toFrame: to,
            startFrame: from,
            endFrame: to,
            color: c.color || '#F0BE7C',
            loopMode: c.loopMode || 'forward',
          };
        });
      }
    });
  },

  resetToNewProject: (newId?: string) => {
    clearAllBuffers();
    const initialLayerId = createId('layer');
    const initialFrameId = createId('frame');
    set(state => {
      state.currentProjectId = newId || createId('proj');
      state.projectName = 'Untitled Sprite';
      state.canvasWidth = 32;
      state.canvasHeight = 32;
      state.zoom = 1600;
      state.panX = 0;
      state.panY = 0;
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
      state.bufferVersion += 1;
    });
  },
});
