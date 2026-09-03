'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Layer, AnimationFrame, BlendMode, FrameTag, TagLoopMode } from '@/types/canvas';
import { ToolType, ToolSettings, DitherMatrixType, MaterialType, OpticalPresetType, AnisoFlowPreset, CelToneCount } from '@/types/tools';
import { ColorPalette, ColorRamp } from '@/types/palette';
import { LoopMode, OnionSkinSettings, AnimationClip } from '@/types/animation';
import { AiMessage } from '@/types/ai';
import { generateOklchRamp } from '@/lib/color/rampGenerator';
import type { CvdLensMode } from '@/lib/color/cvdLens';
import { createId } from '@/lib/engine/id';
import { getOrCreateBuffer, cloneBuffers, deleteBuffers, resizeAllBuffers, clearAllBuffers } from '@/lib/engine/bufferRegistry';
import type { AnchorPosition } from '@/components/modals/CanvasResizeModal';
import type { ProjectFile } from '@/types/project';

// Built-in Curated Palettes
export const PRESET_PALETTES: ColorPalette[] = [
  {
    id: 'alabaster-wisteria-8',
    name: 'Alabaster & Wisteria (Active Theme)',
    colors: [
      '#DDDFDF', '#DDDDDF', '#D0C4DF', '#DCABDF',
      '#C792DF', '#A86EC6', '#6A5880', '#3A2E4C'
    ]
  },
  {
    id: 'cozy-hearth-16',
    name: 'Cozy Hearth 16',
    colors: [
      '#161210', '#2c241e', '#3e332a', '#57473a',
      '#782216', '#ab3324', '#de4b39', '#f27463',
      '#9c6307', '#c98314', '#f5a623', '#f8be66',
      '#3b672c', '#6eb257', '#8cd075', '#f7efe6'
    ]
  },
  {
    id: 'pico-8',
    name: 'Pico-8',
    colors: [
      '#000000', '#1D2B53', '#7E2553', '#008751',
      '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
      '#FF004D', '#FFA300', '#FFEC27', '#00E436',
      '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
    ]
  },
  {
    id: 'endesga-32',
    name: 'Endesga 32 (EDG32)',
    colors: [
      '#be4a2f', '#d77643', '#ead4aa', '#e4a672', '#b86f56', '#733e39', '#3e2731', '#261726',
      '#a22633', '#e43b44', '#f77622', '#feae34', '#fee761', '#63c74d', '#3e8948', '#265c42',
      '#193c3e', '#124e89', '#0099db', '#2ce8f5', '#ffffff', '#c0cbdc', '#8b9bb4', '#5a6988',
      '#3a4466', '#262b44', '#181425', '#ff0044', '#68386c', '#b55088', '#f6757a', '#e8b796'
    ]
  }
];

interface StudioState {
  // Project Canvas Dimensions & Identification
  currentProjectId: string;
  canvasWidth: number;
  canvasHeight: number;
  projectName: string;
  setCurrentProjectId: (id: string) => void;

  // Viewport State
  zoom: number; // e.g. 1600 (meaning 1600% / 16x)
  panX: number;
  panY: number;
  showGrid: boolean;
  showTilePreview: boolean;
  showIsoGuides: boolean;
  showFloatingPreview: boolean;
  previewScale: 1 | 2 | 4;
  previewBackdrop: 'alabaster' | 'obsidian' | 'checker' | 'amber';
  // Display-only perceptual lenses (DESIGN.md §12/§13) — never touch project data or exports
  cvdLens: CvdLensMode;
  squintMode: boolean;
  setCvdLens: (mode: CvdLensMode) => void;
  toggleSquintMode: () => void;

  // Tool & Brush Settings
  tools: ToolSettings;
  primaryColor: string;
  secondaryColor: string;
  palettes: ColorPalette[];
  currentPaletteId: string;
  customRamps: ColorRamp[];

  // Frames & Layers
  frames: AnimationFrame[];
  activeFrameIndex: number;
  activeLayerId: string;

  // Animation Playback
  isPlaying: boolean;
  fps: number;
  loopMode: LoopMode;
  onionSkin: OnionSkinSettings;
  clips: AnimationClip[];

  // PixiBud Smart Studio Companion
  aiMessages: AiMessage[];
  isAiThinking: boolean;
  activeInspectorTab: 'layers' | 'palette' | 'ai';

  // Undo / Redo availability
  canUndo: boolean;
  canRedo: boolean;
  setCanUndo: (can: boolean) => void;
  setCanRedo: (can: boolean) => void;

  // Buffer mutation signal (increments on every pixel-level change to any layer)
  bufferVersion: number;
  bumpBufferVersion: () => void;
  
  // Autosave status
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;

  // Selection
  selection: { x: number; y: number; w: number; h: number } | null;
  selectionMask: Uint8Array | null;
  setSelection: (sel: { x: number; y: number; w: number; h: number } | null, mask?: Uint8Array | null) => void;

  // Actions
  setCanvasSize: (width: number, height: number, anchor?: AnchorPosition, resample?: boolean) => void;
  setProjectName: (name: string) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  toggleGrid: () => void;
  toggleTilePreview: () => void;
  toggleIsoGuides: () => void;
  toggleFloatingPreview: () => void;
  showNormalMapPreview: boolean;
  toggleNormalMapPreview: () => void;
  setPreviewScale: (scale: 1 | 2 | 4) => void;
  setPreviewBackdrop: (bg: 'alabaster' | 'obsidian' | 'checker' | 'amber') => void;
  setActiveTool: (tool: ToolType) => void;
  setBrushSize: (size: number) => void;
  setPixelPerfect: (enabled: boolean) => void;
  setDitherMatrix: (matrix: DitherMatrixType) => void;
  setDitherDensity: (density: number) => void;
  setBucketContiguous: (enabled: boolean) => void;
  setBucketTolerance: (tolerance: number) => void;
  setShapeFilled: (filled: boolean) => void;
  toggleSymmetryH: () => void;
  toggleSymmetryV: () => void;
  setLightAzimuth: (azimuth: number) => void;
  setLightElevation: (elevation: number) => void;
  setLightRadius: (radius: number) => void;
  setLightBrightness: (brightness: number) => void;
  setMaterialPreset: (preset: MaterialType) => void;
  setCavityStrength: (strength: number) => void;
  setDitherModulation: (mod: number) => void;
  setCurveTightness: (tightness: number) => void;
  setIsoAngleSnap: (snap: boolean) => void;
  setOpticalPreset: (preset: OpticalPresetType) => void;
  setTranslucencyDepth: (depth: number) => void;
  setFresnelPower: (power: number) => void;
  setAnisoAngle: (angle: number) => void;
  setAnisoFlow: (flow: AnisoFlowPreset) => void;
  setOpticalCelTones: (tones: CelToneCount) => void;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  swapColors: () => void;
  selectPalette: (id: string) => void;
  addCustomColorToPalette: (paletteId: string, color: string) => void;
  setCustomRamps: (ramps: ColorRamp[]) => void;

  // Recent Colors (Global, decoupled from project)
  recentColors: string[];
  addRecentColor: (color: string) => void;

  // Layer Operations
  addLayer: (name?: string, tag?: string, idOverride?: string) => void;
  deleteLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
  reorderLayers: (startIndex: number, endIndex: number) => void;
  setActiveLayer: (layerId: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setLayerBlendMode: (layerId: string, blendMode: BlendMode) => void;
  renameLayer: (layerId: string, name: string) => void;
  mergeLayerDown: (layerId: string) => void;

  // Frame Operations
  addFrame: () => void;
  duplicateFrame: (frameIndex: number) => void;
  deleteFrame: (frameIndex: number) => void;
  setFrameDuration: (frameIndex: number, durationMs: number) => void;
  reorderFrames: (startIndex: number, endIndex: number) => void;
  setActiveFrame: (index: number) => void;
  setFps: (fps: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setLoopMode: (mode: LoopMode) => void;
  setOnionSkin: (settings: Partial<OnionSkinSettings>) => void;

  // Animation Clips & Tags
  activeClipId: string | null;
  addClip: (name: string, startFrame: number, endFrame: number, color?: string, loopMode?: TagLoopMode) => void;
  updateClip: (id: string, updates: Partial<AnimationClip>) => void;
  deleteClip: (id: string) => void;
  reorderClips: (sourceIndex: number, targetIndex: number) => void;
  setActiveClipId: (id: string | null) => void;

  // Tag System first-class aliases
  addTag: (name: string, fromFrame: number, toFrame: number, color?: string, loopMode?: TagLoopMode) => void;
  updateTag: (id: string, updates: Partial<FrameTag>) => void;
  deleteTag: (id: string) => void;
  reorderTags: (sourceIndex: number, targetIndex: number) => void;
  setActiveTagId: (id: string | null) => void;

  // Palette & Color Extractor
  addExtractedPalette: (name: string, colors: string[]) => void;
  generateAndAddRamp: (baseColor: string) => void;

  // Full Project Rehydration & Reset
  loadProjectState: (projectData: Partial<ProjectFile>, projectId?: string) => void;
  resetToNewProject: (newId?: string) => void;

  // Inspector & AI Dock
  setActiveInspectorTab: (tab: 'layers' | 'palette' | 'ai') => void;
  addAiMessage: (message: Omit<AiMessage, 'id' | 'timestamp'>) => void;
  setIsAiThinking: (thinking: boolean) => void;
}

export const useStudioStore = create<StudioState>()(
  immer((set, get) => {
    const initialLayerId = 'layer-1';
    const initialFrameId = 'frame-1';

    const defaultInitialFrame: AnimationFrame = {
      id: initialFrameId,
      durationMs: 100,
      layers: [
        {
          id: initialLayerId,
          name: 'Base Layer',
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'source-over'
        }
      ]
    };

    return {
      currentProjectId: createId('proj'),
      canvasWidth: 32,
      canvasHeight: 32,
      projectName: 'Untitled Sprite',

      zoom: 1600, // 16x zoom default for 32x32
      panX: 0,
      panY: 0,
      showGrid: true,
      showTilePreview: false,
      showIsoGuides: false,
      showFloatingPreview: true,
      showNormalMapPreview: false,
      previewScale: 2,
      previewBackdrop: 'checker',
      cvdLens: 'none',
      squintMode: false,

      tools: {
        activeTool: 'pen',
        brushSize: 1,
        pixelPerfect: true,
        ditherMatrix: '2x2',
        ditherDensity: 0.5,
        bucketContiguous: true,
        bucketTolerance: 0,
        shapeFilled: false,
        symmetryHorizontal: false,
        symmetryVertical: false,
        lightAzimuth: 315,
        lightElevation: 45,
        lightRadius: 64,
        lightBrightness: 1.15,
        materialPreset: 'matte',
        cavityStrength: 1.0,
        ditherModulation: 0.0,
        curveTightness: 0.5,
        isoAngleSnap: true,
        opticalPreset: 'gemstone',
        translucencyDepth: 8,
        fresnelPower: 3.5,
        anisoAngle: 90,
        anisoFlow: 'vertical',
        opticalCelTones: 3,
      },

      primaryColor: '#3A2E4C',
      secondaryColor: '#C792DF',
      palettes: PRESET_PALETTES,
      currentPaletteId: 'alabaster-wisteria-8',
      customRamps: [],
      recentColors: typeof window !== 'undefined' && window.localStorage ? JSON.parse(window.localStorage.getItem('pixibun_recent_colors') || '[]') : [],

      frames: [defaultInitialFrame],
      activeFrameIndex: 0,
      activeLayerId: initialLayerId,

      isPlaying: false,
      fps: 8,
      loopMode: 'repeat',
      onionSkin: {
        enabled: false,
        prevFrames: 1,
        nextFrames: 1,
        prevColor: '#C792DF', // Wisteria
        nextColor: '#DCABDF', // Plum
        opacity: 0.45
      },
      clips: [
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
      ],
      activeClipId: null,

      aiMessages: [
        {
          id: 'welcome-msg',
          sender: 'assistant',
          text: "Hey there! I'm PixiBud, your pixel art math studio assistant. Tap any of the panels below to execute deterministic 2.5D photometric lighting, volumetric SSS, or normal baking directly on your artwork layers!",
          timestamp: Date.now(),
          suggestions: ['2.5D Photometric', 'Volumetric SSS', 'Harmonize palette', 'Clean jaggies']
        }
      ],
      isAiThinking: false,
      activeInspectorTab: 'layers',

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
      setSaveStatus: (status) => {
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

      setCanvasSize: (width, height, anchor = 'center', resample = true) => {
        const previousWidth = get().canvasWidth;
        const previousHeight = get().canvasHeight;
        if (previousWidth === width && previousHeight === height) return;

        // Dynamic art scaling (resample=true) scales artwork to fit new canvas size.
        // Anchor-aware resize (resample=false) shifts content per anchor.
        resizeAllBuffers(width, height, anchor, resample);
        set(state => {
          state.canvasWidth = width;
          state.canvasHeight = height;
        });
      },

      setProjectName: name => {
        set(state => {
          state.projectName = name;
        });
      },

      setZoom: zoom => {
        set(state => {
          state.zoom = Math.max(100, Math.min(6400, Math.round(zoom)));
        });
      },

      setPan: (x, y) => {
        set(state => {
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

      setCvdLens: (mode) => {
        set(state => {
          state.cvdLens = mode;
        });
      },

      toggleSquintMode: () => {
        set(state => {
          state.squintMode = !state.squintMode;
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

      setActiveTool: tool => {
        set(state => {
          state.tools.activeTool = tool;
        });
      },

      setBrushSize: size => {
        set(state => {
          state.tools.brushSize = Math.max(1, Math.min(32, size));
        });
      },

      setPixelPerfect: enabled => {
        set(state => {
          state.tools.pixelPerfect = enabled;
        });
      },

      setDitherMatrix: matrix => {
        set(state => {
          state.tools.ditherMatrix = matrix;
        });
      },

      setDitherDensity: density => {
        set(state => {
          state.tools.ditherDensity = Math.max(0.05, Math.min(0.95, density));
        });
      },

      setBucketContiguous: enabled => {
        set(state => {
          state.tools.bucketContiguous = enabled;
        });
      },

      setBucketTolerance: tolerance => {
        set(state => {
          state.tools.bucketTolerance = Math.max(0, Math.min(255, tolerance));
        });
      },

      setShapeFilled: filled => {
        set(state => {
          state.tools.shapeFilled = filled;
        });
      },

      toggleSymmetryH: () => {
        set(state => {
          state.tools.symmetryHorizontal = !state.tools.symmetryHorizontal;
        });
      },

      toggleSymmetryV: () => {
        set(state => {
          state.tools.symmetryVertical = !state.tools.symmetryVertical;
        });
      },

      setLightAzimuth: azimuth => {
        set(state => {
          state.tools.lightAzimuth = (azimuth % 360 + 360) % 360;
        });
      },

      setLightElevation: elevation => {
        set(state => {
          state.tools.lightElevation = Math.max(0, Math.min(90, elevation));
        });
      },

      setLightRadius: radius => {
        set(state => {
          state.tools.lightRadius = Math.max(16, Math.min(256, radius));
        });
      },

      setLightBrightness: brightness => {
        set(state => {
          state.tools.lightBrightness = Math.max(0.4, Math.min(2.5, brightness));
        });
      },

      setMaterialPreset: preset => {
        set(state => {
          state.tools.materialPreset = preset;
        });
      },

      setCavityStrength: strength => {
        set(state => {
          state.tools.cavityStrength = Math.max(0, Math.min(2, strength));
        });
      },

      setDitherModulation: mod => {
        set(state => {
          state.tools.ditherModulation = Math.max(0, Math.min(1, mod));
        });
      },

      setCurveTightness: tightness => {
        set(state => {
          state.tools.curveTightness = Math.max(0, Math.min(1, tightness));
        });
      },

      setIsoAngleSnap: snap => {
        set(state => {
          state.tools.isoAngleSnap = snap;
        });
      },

      setOpticalPreset: preset => {
        set(state => {
          state.tools.opticalPreset = preset;
        });
      },

      setTranslucencyDepth: depth => {
        set(state => {
          state.tools.translucencyDepth = Math.max(1, Math.min(32, depth));
        });
      },

      setFresnelPower: power => {
        set(state => {
          state.tools.fresnelPower = Math.max(1, Math.min(8, power));
        });
      },

      setAnisoAngle: angle => {
        set(state => {
          state.tools.anisoAngle = ((angle % 180) + 180) % 180;
        });
      },

      setAnisoFlow: flow => {
        set(state => {
          state.tools.anisoFlow = flow;
        });
      },

      setOpticalCelTones: tones => {
        set(state => {
          state.tools.opticalCelTones = tones;
        });
      },

      setPrimaryColor: color => {
        set(state => {
          state.primaryColor = color;
        });
        get().addRecentColor(color);
      },

      setSecondaryColor: color => {
        set(state => {
          state.secondaryColor = color;
        });
        get().addRecentColor(color);
      },

      addRecentColor: color => {
        set(state => {
          const hex = color.toUpperCase();
          state.recentColors = state.recentColors.filter((c: string) => c !== hex);
          state.recentColors.unshift(hex);
          if (state.recentColors.length > 8) {
            state.recentColors.pop();
          }
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('pixibun_recent_colors', JSON.stringify(state.recentColors));
          }
        });
      },

      swapColors: () => {
        set(state => {
          const temp = state.primaryColor;
          state.primaryColor = state.secondaryColor;
          state.secondaryColor = temp;
        });
      },

      selectPalette: id => {
        set(state => {
          state.currentPaletteId = id;
        });
      },

      addCustomColorToPalette: (paletteId, color) => {
        set(state => {
          const pal = state.palettes.find(p => p.id === paletteId);
          if (pal && !pal.colors.includes(color)) {
            pal.colors.push(color);
          }
        });
      },

      setCustomRamps: ramps => {
        set(state => {
          state.customRamps = ramps;
        });
      },

      addLayer: (name, tag, idOverride) => {
        set(state => {
          const currentFrame = state.frames[state.activeFrameIndex];
          if (!currentFrame) return;

          const layerCount = currentFrame.layers.length + 1;
          const newLayerId = idOverride || createId('layer');
          const newLayer: Layer = {
            id: newLayerId,
            name: name || `Layer ${layerCount}`,
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
            ...(tag ? { tag } : {}),
          };

          currentFrame.layers.unshift(newLayer);
          state.activeLayerId = newLayerId;
        });
      },

      deleteLayer: (layerId) => {
        set(state => {
          const currentFrame = state.frames[state.activeFrameIndex];
          if (!currentFrame || currentFrame.layers.length <= 1) return;

          currentFrame.layers = currentFrame.layers.filter(l => l.id !== layerId);
          deleteBuffers([layerId]);
          if (state.activeLayerId === layerId) {
            state.activeLayerId = currentFrame.layers[0].id;
          }
        });
      },

      duplicateLayer: (layerId) => {
        set(state => {
          const currentFrame = state.frames[state.activeFrameIndex];
          if (!currentFrame) return;

          const idx = currentFrame.layers.findIndex(l => l.id === layerId);
          if (idx === -1) return;

          const src = currentFrame.layers[idx];
          const newLayerId = createId('layer');
          const duplicate: Layer = {
            ...src,
            id: newLayerId,
            name: `${src.name} (Copy)`
          };

          currentFrame.layers.splice(idx, 0, duplicate);
          cloneBuffers([layerId], [newLayerId], state.canvasWidth, state.canvasHeight);
          state.activeLayerId = newLayerId;
        });
      },

      reorderLayers: (startIndex, endIndex) => {
        set(state => {
          const currentFrame = state.frames[state.activeFrameIndex];
          if (!currentFrame) return;

          const [removed] = currentFrame.layers.splice(startIndex, 1);
          currentFrame.layers.splice(endIndex, 0, removed);
        });
      },

      setActiveLayer: (layerId) => {
        set(state => {
          state.activeLayerId = layerId;
        });
      },

      toggleLayerVisibility: (layerId) => {
        set(state => {
          const currentFrame = state.frames[state.activeFrameIndex];
          if (!currentFrame) return;
          const layer = currentFrame.layers.find(l => l.id === layerId);
          if (layer) {
            layer.visible = !layer.visible;
          }
        });
      },

      toggleLayerLock: (layerId) => {
        set(state => {
          const currentFrame = state.frames[state.activeFrameIndex];
          if (!currentFrame) return;
          const layer = currentFrame.layers.find(l => l.id === layerId);
          if (layer) {
            layer.locked = !layer.locked;
          }
        });
      },

      setLayerOpacity: (layerId, opacity) => {
        set(state => {
          const currentFrame = state.frames[state.activeFrameIndex];
          if (!currentFrame) return;
          const layer = currentFrame.layers.find(l => l.id === layerId);
          if (layer) {
            layer.opacity = Math.max(0, Math.min(1, opacity));
          }
        });
      },

      setLayerBlendMode: (layerId, blendMode) => {
        set(state => {
          const currentFrame = state.frames[state.activeFrameIndex];
          if (!currentFrame) return;
          const layer = currentFrame.layers.find(l => l.id === layerId);
          if (layer) {
            layer.blendMode = blendMode;
          }
        });
      },

      renameLayer: (layerId, name) => {
        set(state => {
          const currentFrame = state.frames[state.activeFrameIndex];
          if (!currentFrame) return;
          const layer = currentFrame.layers.find(l => l.id === layerId);
          if (layer) {
            layer.name = name;
          }
        });
      },

      mergeLayerDown: (layerId) => {
        set(state => {
          const currentFrame = state.frames[state.activeFrameIndex];
          if (!currentFrame || currentFrame.layers.length <= 1) return;

          const upperIndex = currentFrame.layers.findIndex(l => l.id === layerId);
          if (upperIndex === -1 || upperIndex >= currentFrame.layers.length - 1) {
            return;
          }

          const upper = currentFrame.layers[upperIndex];
          const lower = currentFrame.layers[upperIndex + 1];

          const upperBuffer = getOrCreateBuffer(upper.id, state.canvasWidth, state.canvasHeight);
          const lowerBuffer = getOrCreateBuffer(lower.id, state.canvasWidth, state.canvasHeight);

          if (upper.visible) {
            lowerBuffer.ctx.save();
            lowerBuffer.ctx.imageSmoothingEnabled = false;
            lowerBuffer.ctx.globalAlpha = upper.opacity;
            lowerBuffer.ctx.globalCompositeOperation = upper.blendMode;
            lowerBuffer.ctx.drawImage(upperBuffer.canvas, 0, 0);
            lowerBuffer.ctx.restore();
          }

          currentFrame.layers.splice(upperIndex, 1);
          deleteBuffers([upper.id]);

          state.activeLayerId = lower.id;
          state.bufferVersion += 1;
        });
      },

      addFrame: () => {
        set(state => {
          const newFrameId = createId('frame');
          const currentFrame = state.frames[state.activeFrameIndex];

          // New frames share the layer layout but start with blank pixels.
          // Exclude AI-generated layers (which have tags) from bleeding into new frames.
          const clonedLayers: Layer[] = currentFrame.layers
            .filter(l => !l.tag)
            .map(l => ({
              ...l,
              id: createId('layer')
            }));
            
          if (clonedLayers.length === 0) {
            clonedLayers.push({
              id: createId('layer'),
              name: 'Base Layer',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over'
            });
          }

          const newFrame: AnimationFrame = {
            id: newFrameId,
            durationMs: 100,
            layers: clonedLayers
          };

          state.frames.push(newFrame);
          state.activeFrameIndex = state.frames.length - 1;
          state.activeLayerId = clonedLayers[0].id;
        });
      },

      duplicateFrame: (frameIndex) => {
        set(state => {
          const srcFrame = state.frames[frameIndex];
          if (!srcFrame) return;

          const newFrameId = createId('frame');
          const duplicatedLayers = srcFrame.layers.map(l => ({
            ...l,
            id: createId('layer')
          }));

          const duplicate: AnimationFrame = {
            ...srcFrame,
            id: newFrameId,
            layers: duplicatedLayers
          };

          // A duplicated frame must carry its artwork, not an empty promise.
          cloneBuffers(
            srcFrame.layers.map(l => l.id),
            duplicatedLayers.map(l => l.id),
            state.canvasWidth,
            state.canvasHeight
          );

          state.frames.splice(frameIndex + 1, 0, duplicate);
          state.activeFrameIndex = frameIndex + 1;
          state.activeLayerId = duplicatedLayers[0].id;
        });
      },

      deleteFrame: (frameIndex) => {
        set(state => {
          if (state.frames.length <= 1) return;
          const removedFrame = state.frames[frameIndex];
          deleteBuffers(removedFrame.layers.map(l => l.id));
          state.frames.splice(frameIndex, 1);
          state.activeFrameIndex = Math.min(state.activeFrameIndex, state.frames.length - 1);
          state.activeLayerId = state.frames[state.activeFrameIndex].layers[0].id;
        });
      },

      setFrameDuration: (frameIndex, durationMs) => {
        set(state => {
          const frame = state.frames[frameIndex];
          if (frame) {
            frame.durationMs = Math.max(10, Math.min(10000, Math.round(durationMs)));
          }
        });
      },

      reorderFrames: (startIndex, endIndex) => {
        set(state => {
          const [removed] = state.frames.splice(startIndex, 1);
          state.frames.splice(endIndex, 0, removed);
          state.activeFrameIndex = endIndex;
        });
      },

      setActiveFrame: (index) => {
        set(state => {
          if (index >= 0 && index < state.frames.length) {
            state.activeFrameIndex = index;
            const currentFrame = state.frames[index];
            if (currentFrame && currentFrame.layers.length > 0) {
              const existingLayer = currentFrame.layers.find(l => l.id === state.activeLayerId);
              if (!existingLayer) {
                state.activeLayerId = currentFrame.layers[0].id;
              }
            }
          }
        });
      },

      setFps: (fps) => {
        set(state => {
          state.fps = Math.max(1, Math.min(60, fps));
        });
      },

      setIsPlaying: (playing) => {
        set(state => {
          state.isPlaying = playing;
        });
      },

      setLoopMode: (mode) => {
        set(state => {
          state.loopMode = mode;
        });
      },

      setOnionSkin: (settings) => {
        set(state => {
          state.onionSkin = { ...state.onionSkin, ...settings };
        });
      },

      addClip: (name, startFrame, endFrame, color, loopMode = 'forward') => {
        set(state => {
          const minF = Math.max(0, Math.min(state.frames.length - 1, Math.min(startFrame, endFrame)));
          const maxF = Math.max(0, Math.min(state.frames.length - 1, Math.max(startFrame, endFrame)));
          const newClip: AnimationClip = {
            id: createId('tag'),
            name,
            fromFrame: minF,
            toFrame: maxF,
            startFrame: minF,
            endFrame: maxF,
            color: color || '#F0BE7C',
            loopMode: loopMode || 'forward',
          };
          state.clips.push(newClip);
          state.activeClipId = newClip.id;
        });
      },

      updateClip: (id, updates) => {
        set(state => {
          const clip = state.clips.find(c => c.id === id);
          if (clip) {
            const nextUpdates = { ...updates };
            if (nextUpdates.fromFrame !== undefined && nextUpdates.startFrame === undefined) {
              nextUpdates.startFrame = nextUpdates.fromFrame;
            } else if (nextUpdates.startFrame !== undefined && nextUpdates.fromFrame === undefined) {
              nextUpdates.fromFrame = nextUpdates.startFrame;
            }
            if (nextUpdates.toFrame !== undefined && nextUpdates.endFrame === undefined) {
              nextUpdates.endFrame = nextUpdates.toFrame;
            } else if (nextUpdates.endFrame !== undefined && nextUpdates.toFrame === undefined) {
              nextUpdates.toFrame = nextUpdates.endFrame;
            }
            if (nextUpdates.fromFrame !== undefined) {
              nextUpdates.fromFrame = Math.max(0, Math.min(state.frames.length - 1, nextUpdates.fromFrame));
              nextUpdates.startFrame = nextUpdates.fromFrame;
            }
            if (nextUpdates.toFrame !== undefined) {
              nextUpdates.toFrame = Math.max(0, Math.min(state.frames.length - 1, nextUpdates.toFrame));
              nextUpdates.endFrame = nextUpdates.toFrame;
            }
            Object.assign(clip, nextUpdates);
          }
        });
      },

      deleteClip: (id) => {
        set(state => {
          state.clips = state.clips.filter(c => c.id !== id);
          if (state.activeClipId === id) {
            state.activeClipId = null;
          }
        });
      },

      reorderClips: (sourceIndex, targetIndex) => {
        set(state => {
          if (
            sourceIndex < 0 ||
            sourceIndex >= state.clips.length ||
            targetIndex < 0 ||
            targetIndex >= state.clips.length
          ) {
            return;
          }
          const [moved] = state.clips.splice(sourceIndex, 1);
          state.clips.splice(targetIndex, 0, moved);
        });
      },

      setActiveClipId: (id) => {
        set(state => {
          state.activeClipId = id;
          if (id) {
            const clip = state.clips.find(c => c.id === id);
            if (clip) {
              state.activeFrameIndex = clip.fromFrame ?? clip.startFrame;
            }
          }
        });
      },

      addTag: (name, fromFrame, toFrame, color, loopMode = 'forward') => {
        get().addClip(name, fromFrame, toFrame, color, loopMode);
      },

      updateTag: (id, updates) => {
        get().updateClip(id, updates);
      },

      deleteTag: (id) => {
        get().deleteClip(id);
      },

      reorderTags: (sourceIndex, targetIndex) => {
        get().reorderClips(sourceIndex, targetIndex);
      },

      setActiveTagId: (id) => {
        get().setActiveClipId(id);
      },

      addExtractedPalette: (name, colors) => {
        set(state => {
          const newPalette: ColorPalette = {
            id: createId('palette'),
            name,
            colors: colors.length > 0 ? colors : ['#3A2E4C', '#C792DF', '#DCABDF', '#DDDFDF']
          };
          state.palettes.push(newPalette);
          state.currentPaletteId = newPalette.id;
        });
      },

      generateAndAddRamp: (baseColor) => {
        set(state => {
          const rampColors = generateOklchRamp(baseColor);
          const activePal = state.palettes.find(p => p.id === state.currentPaletteId);
          if (activePal) {
            for (const color of rampColors) {
              if (!activePal.colors.includes(color)) {
                activePal.colors.push(color);
              }
            }
          }
        });
      },

      setCurrentProjectId: (id: string) => {
        set(state => {
          state.currentProjectId = id;
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
            state.customRamps = projectData.customRamps.map((r) => ({ ...r, shades: [...r.shades] }));
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

      setActiveInspectorTab: (tab) => {
        set(state => {
          state.activeInspectorTab = tab;
        });
      },

      addAiMessage: (message) => {
        set(state => {
          state.aiMessages.push({
            ...message,
            id: createId('msg'),
            timestamp: Date.now()
          });
        });
      },

      setIsAiThinking: (thinking) => {
        set(state => {
          state.isAiThinking = thinking;
        });
      }
    };
  })
);
