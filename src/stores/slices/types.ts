import { StateCreator } from 'zustand';
import { AnimationFrame, BlendMode, FrameTag, TagLoopMode } from '@/types/canvas';
import {
  ToolType,
  ToolSettings,
  DitherMatrixType,
  MaterialType,
  OpticalPresetType,
  AnisoFlowPreset,
  CelToneCount,
  WallpaperGroup,
} from '@/types/tools';
import { ColorPalette, ColorRamp } from '@/types/palette';
import { LoopMode, OnionSkinSettings, AnimationClip } from '@/types/animation';
import { AiMessage } from '@/types/ai';
import type { CvdLensMode } from '@/lib/color/cvdLens';
import type { AnchorPosition } from '@/components/modals/CanvasResizeModal';
import type { ProjectFile } from '@/types/project';

export interface ViewportSlice {
  currentProjectId: string;
  canvasWidth: number;
  canvasHeight: number;
  projectName: string;
  setCurrentProjectId: (id: string) => void;
  setCanvasSize: (width: number, height: number, anchor?: AnchorPosition, resample?: boolean) => void;
  setProjectName: (name: string) => void;

  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showTilePreview: boolean;
  showIsoGuides: boolean;
  showFloatingPreview: boolean;
  showNormalMapPreview: boolean;
  previewScale: 1 | 2 | 4;
  previewBackdrop: 'alabaster' | 'obsidian' | 'checker' | 'amber';
  cvdLens: CvdLensMode;
  squintMode: boolean;

  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setZoomAndPan: (zoom: number, panX: number, panY: number) => void;
  toggleGrid: () => void;
  toggleTilePreview: () => void;
  toggleIsoGuides: () => void;
  toggleFloatingPreview: () => void;
  toggleNormalMapPreview: () => void;
  setPreviewScale: (scale: 1 | 2 | 4) => void;
  setPreviewBackdrop: (bg: 'alabaster' | 'obsidian' | 'checker' | 'amber') => void;
  setCvdLens: (mode: CvdLensMode) => void;
  toggleSquintMode: () => void;
}

export interface ToolSlice {
  tools: ToolSettings;
  primaryColor: string;
  secondaryColor: string;
  palettes: ColorPalette[];
  currentPaletteId: string;
  customRamps: ColorRamp[];
  recentColors: string[];

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
  setSymmetryGroup: (group: WallpaperGroup) => void;
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
  addRecentColor: (color: string) => void;
  swapColors: () => void;
  selectPalette: (id: string) => void;
  addCustomColorToPalette: (paletteId: string, color: string) => void;
  setCustomRamps: (ramps: ColorRamp[]) => void;
  addExtractedPalette: (name: string, colors: string[]) => void;
  generateAndAddRamp: (baseColor: string) => void;
}

export interface LayerSlice {
  activeLayerId: string;
  setActiveLayer: (layerId: string) => void;
  addLayer: (name?: string, tag?: string, idOverride?: string) => void;
  deleteLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
  reorderLayers: (startIndex: number, endIndex: number) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setLayerBlendMode: (layerId: string, blendMode: BlendMode) => void;
  renameLayer: (layerId: string, name: string) => void;
  setLayerTag: (layerId: string, tag: string) => void;
  mergeLayerDown: (layerId: string) => void;
}

export interface AnimationSlice {
  frames: AnimationFrame[];
  activeFrameIndex: number;
  isPlaying: boolean;
  fps: number;
  loopMode: LoopMode;
  onionSkin: OnionSkinSettings;
  clips: AnimationClip[];
  activeClipId: string | null;

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
  addClip: (name: string, startFrame: number, endFrame: number, color?: string, loopMode?: TagLoopMode) => void;
  updateClip: (id: string, updates: Partial<AnimationClip>) => void;
  deleteClip: (id: string) => void;
  reorderClips: (sourceIndex: number, targetIndex: number) => void;
  setActiveClipId: (id: string | null) => void;

  addTag: (name: string, fromFrame: number, toFrame: number, color?: string, loopMode?: TagLoopMode) => void;
  updateTag: (id: string, updates: Partial<FrameTag>) => void;
  deleteTag: (id: string) => void;
  reorderTags: (sourceIndex: number, targetIndex: number) => void;
  setActiveTagId: (id: string | null) => void;
}

export interface HistorySlice {
  canUndo: boolean;
  canRedo: boolean;
  setCanUndo: (can: boolean) => void;
  setCanRedo: (can: boolean) => void;

  bufferVersion: number;
  bumpBufferVersion: () => void;

  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;

  selection: { x: number; y: number; w: number; h: number } | null;
  selectionMask: Uint8Array | null;
  setSelection: (sel: { x: number; y: number; w: number; h: number } | null, mask?: Uint8Array | null) => void;

  aiMessages: AiMessage[];
  isAiThinking: boolean;
  activeInspectorTab: 'layers' | 'palette' | 'ai';
  setActiveInspectorTab: (tab: 'layers' | 'palette' | 'ai') => void;
  addAiMessage: (message: Omit<AiMessage, 'id' | 'timestamp'>) => void;
  setIsAiThinking: (thinking: boolean) => void;

  loadProjectState: (projectData: Partial<ProjectFile>, projectId?: string) => void;
  resetToNewProject: (newId?: string) => void;
}

export type StudioState = ViewportSlice & ToolSlice & LayerSlice & AnimationSlice & HistorySlice;

export type StudioSliceCreator<T> = StateCreator<
  StudioState,
  [['zustand/immer', never]],
  [],
  T
>;
