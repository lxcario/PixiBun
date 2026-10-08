import { StateCreator } from 'zustand';
import { AnimationFrame, BlendMode, FrameTag, LayerEffectRecipe, TagLoopMode } from '@/types/canvas';
import {
  ToolType,
  ToolSettings,
  DitherMatrixType,
  MaterialType,
  WallpaperGroup,
  ShadingBandMode,
  GlintStyle,
  RotationAlgorithm,
} from '@/types/tools';
import { ColorPalette, ColorRamp, PaletteCycleTrack } from '@/types/palette';
import { LoopMode, OnionSkinSettings, AnimationClip } from '@/types/animation';
import { AiMessage } from '@/types/ai';
import type { CvdLensMode } from '@/lib/color/cvdLens';
import type { AnchorPosition } from '@/components/modals/CanvasResizeModal';
import type { ProjectFile } from '@/types/project';
import type { MotionPart, MotionPose, MotionPartSettings } from '@/lib/animation/pixiMotion';

export interface ViewportSlice {
  currentProjectId: string;
  projectCreatedAt: number;
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
  photometricGizmoActive: boolean;
  photometricGlintOnly?: boolean;
  referenceOverlay: 'none' | 'thirds' | 'golden' | 'center' | 'diagonals' | 'safe';

  setReferenceOverlay: (mode: ViewportSlice['referenceOverlay']) => void;
  cycleReferenceOverlay: () => void;
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
  setPhotometricGizmoActive: (active: boolean) => void;
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
  setFillTolerance: (tolerance: number) => void;
  setFillEnclosedSpecks: (enabled: boolean) => void;
  setEraseColorTolerance: (tolerance: number) => void;
  setEraseColorContiguous: (enabled: boolean) => void;
  setEraseColorFamily: (enabled: boolean) => void;
  setEraseColorAllFrames: (enabled: boolean) => void;
  setShapeFilled: (filled: boolean) => void;
  toggleSymmetryH: () => void;
  toggleSymmetryV: () => void;
  setSymmetryGroup: (group: WallpaperGroup) => void;
  setLightAzimuth: (azimuth: number) => void;
  setLightElevation: (elevation: number) => void;
  setLightRadius: (radius: number) => void;
  setLightBrightness: (brightness: number) => void;
  setSourceShadingRemoval: (amount: number) => void;
  setMaterialPreset: (preset: MaterialType) => void;
  setFormType: (formType: 'auto' | 'character' | 'orb' | 'prop') => void;
  setMinecraftSkinMode: (mode: 'auto' | 'enabled' | 'disabled') => void;
  setGlintStyle: (style: GlintStyle) => void;
  setShadingBands: (bands: ShadingBandMode) => void;
  setCavityStrength: (strength: number) => void;
  setDitherModulation: (mod: number) => void;
  setCurveTightness: (tightness: number) => void;
  setIsoAngleSnap: (snap: boolean) => void;
  setChiselAzimuth: (azimuth: number) => void;
  setChiselIncline: (incline: number) => void;
  setChiselWidth: (width: number) => void;
  setChiselRidgeMode: (ridge: boolean) => void;
  setNormalBlendMode: (mode: 'rnm' | 'udn' | 'overwrite') => void;
  setRotationAlgorithm: (algorithm: RotationAlgorithm) => void;

  isPaletteCycling: boolean;
  paletteCycleSpeedMultiplier: number;
  togglePaletteCycling: () => void;
  setPaletteCycling: (cycling: boolean) => void;
  setPaletteCycleSpeedMultiplier: (mult: number) => void;
  addPaletteCycleTrack: (paletteId: string, track: PaletteCycleTrack) => void;
  updatePaletteCycleTrack: (paletteId: string, trackId: string, updates: Partial<PaletteCycleTrack>) => void;
  setPaletteSemantics: (paletteId: string, semantics: import('@/lib/color/paletteSemantics').PaletteSemantics) => void;
  deletePaletteCycleTrack: (paletteId: string, trackId: string) => void;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  addRecentColor: (color: string) => void;
  loadRecentColors: () => void;
  swapColors: () => void;
  selectPalette: (id: string) => void;
  addCustomColorToPalette: (paletteId: string, color: string) => void;
  removePaletteColor: (paletteId: string, index: number) => boolean;
  setCustomRamps: (ramps: ColorRamp[]) => void;
  addExtractedPalette: (name: string, colors: string[]) => boolean;
  generateAndAddRamp: (baseColor: string) => void;
}

export interface LayerSlice {
  activeLayerId: string;
  setActiveLayer: (layerId: string) => void;
  addLayer: (name?: string, tag?: string, idOverride?: string, skipHistory?: boolean) => void;
  deleteLayer: (layerId: string, skipHistory?: boolean) => void;
  duplicateLayer: (layerId: string) => void;
  reorderLayers: (startIndex: number, endIndex: number) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number, skipHistory?: boolean) => boolean;
  setLayerBlendMode: (layerId: string, blendMode: BlendMode) => void;
  renameLayer: (layerId: string, name: string) => void;
  setLayerTag: (layerId: string, tag: string) => void;
  setLayerEffect: (layerId: string, effect: LayerEffectRecipe | undefined) => void;
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
  duplicateFrame: (frameIndex: number, rasterizedContent?: {
    width: number; height: number; data: Uint8ClampedArray;
  }) => { frameId: string; layerIds: string[] } | null;
  deleteFrame: (frameIndex: number) => void;
  setFrameDuration: (frameIndex: number, durationMs: number, skipHistory?: boolean) => boolean;
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

  // PixiMotion Slice 1: Temporary Session State
  motionRigs: import('@/lib/animation/motionRigDocument').MotionRig[];
  motionPart: MotionPart | null;
  motionActivePose: 'start' | 'end';
  motionPreviewIndex: number | null;
  motionHistory: import('@/lib/animation/motionEditing').MotionEditHistory | null;
  beginMotionEdit: () => void;
  finishMotionEdit: (cancel?: boolean) => void;
  undoMotionEdit: () => boolean;
  redoMotionEdit: () => boolean;
  setMotionPart: (part: MotionPart | null) => void;
  setMotionActivePose: (pose: 'start' | 'end') => void;
  setMotionPreviewIndex: (index: number | null) => void;
  updateMotionPose: (target: 'start' | 'end', updates: Partial<MotionPose>) => void;
  updateMotionPart: (updates: Partial<MotionPartSettings>) => void;
  clearMotionPart: () => void;
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
  isDirty: boolean;
  editRevision: number;
  setDirty: (dirty: boolean) => void;
  markClean: () => void;

  selection: { x: number; y: number; w: number; h: number } | null;
  selectionMask: Uint8Array | null;
  /** Transient viewport ownership; never serialized as project data. */
  hasFloatingSelection: boolean;
  setSelection: (sel: { x: number; y: number; w: number; h: number } | null, mask?: Uint8Array | null) => void;

  aiMessages: AiMessage[];
  isAiThinking: boolean;
  activeInspectorTab: 'layers' | 'palette' | 'ai' | 'tools';
  setActiveInspectorTab: (tab: 'layers' | 'palette' | 'ai' | 'tools') => void;
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
