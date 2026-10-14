import type { AnimationClip } from './animation';

export type BlendMode = 'source-over' | 'multiply' | 'screen' | 'overlay' | 'color-dodge' | 'source-atop';

export type SmartEffectKind =
  | 'photometric'
  | 'auto-shade'
  | 'cast-shadow'
  | 'ground-shadow'
  | 'volumetric-optics'
  | 'normal-map'
  | 'specular'
  | 'sel-out'
  | 'outline'
  | 'autotile'
  | 'wfc';

export type SmartEffectParameter = string | number | boolean | null | string[];

/**
 * Portable provenance for a generated layer. The raster cache remains
 * available for instant display, while the recipe records how it was made.
 * Individual tools may expose re-editing separately.
 */
export interface LayerEffectRecipe {
  id: string;
  kind: SmartEffectKind;
  version: 1;
  sourceMode: 'composite-excluding-self' | 'active-layer' | 'selection';
  params: Record<string, SmartEffectParameter>;
  analysis?: {
    formType?: 'character' | 'orb' | 'prop';
    sourceLightAzimuth?: number;
    sourceLightElevation?: number;
    cueStrength?: number;
    /** Legacy v1 field retained when opening older files. */
    confidence?: number;
    rationale?: string;
  };
  updatedAt: number;
}

export type LayerEffectDescriptor = Omit<LayerEffectRecipe, 'id' | 'updatedAt'> & {
  id?: string;
  updatedAt?: number;
};

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 1
  blendMode: BlendMode;
  // Stable machine identifier for auto-generated layers (photometric, normal-map, etc.)
  tag?: string;
  // Provenance for generated output layers.
  effect?: LayerEffectRecipe;
  research?: import('@/lib/research/recipes').ResearchRecipe;
  // Canvas pixel buffer stored as an OffscreenCanvas or base64 / ImageData
  dataUrl?: string; 
}

export interface AnimationFrame {
  id: string;
  durationMs: number;
  layers: Layer[];
}

export type TagLoopMode = 'forward' | 'reverse' | 'ping-pong';

export interface FrameTag {
  id: string;
  name: string;
  fromFrame: number;
  toFrame: number;
  color: string;
  loopMode: TagLoopMode;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  createdAt: number;
  updatedAt: number;
}

export interface LayerBufferBackup {
  layerId: string;
  imageData: ImageData;
}

export interface PixelHistoryStep {
  type?: 'pixel';
  description: string;
  frameIndex: number;
  layerId: string;
  imageData: ImageData;
  /**
   * The same pixels as `imageData` (the whole layer, or the patch at x/y) right
   * after this change. Co-draw Undo and Redo take back only pixels that still
   * show it, so a partner's later strokes survive; timelapse replay uses it to
   * move a layer forward past the step.
   */
  expectedImageData?: ImageData;
  // Dirty-rectangle origin: when set, imageData covers only this patch of the layer
  x?: number;
  y?: number;
  // If this step created a new layer, its ID is stored here so undo can remove it cleanly
  createdLayerId?: string;
  // Tag of the created layer (photometric, cast-shadow, ...), preserved so
  // redo can re-create the layer with its machine identity intact
  createdLayerTag?: string;
  createdLayerIndex?: number;
  layerName?: string;
  layerTag?: string;
  layerBlendMode?: BlendMode;
  preserveLayerEffect?: boolean;
  // Generated-layer recipe at the moment this pixel snapshot was captured.
  // Keeping it beside the raster state makes effect edits undo/redo atomically.
  layerEffect?: LayerEffectRecipe;
}

export type StructuralOpKind =
  | 'reorder-layers'
  | 'reorder-frames'
  | 'add-layer'
  | 'delete-layer'
  | 'duplicate-layer'
  | 'merge-layer'
  | 'add-frame'
  | 'delete-frame'
  | 'duplicate-frame'
  | 'rotsprite'
  | 'generic-structural';

export interface StructuralHistoryStep {
  type: 'structural';
  opKind?: StructuralOpKind;
  description: string;
  frameIndex: number;
  frames: AnimationFrame[];
  activeFrameIndex: number;
  activeLayerId: string;
  clips?: AnimationClip[];
  motionRigs?: import('@/lib/animation/motionRigDocument').MotionRig[];
  activeClipId?: string | null;
  palettes?: import('./palette').ColorPalette[];
  currentPaletteId?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  layerBuffers?: LayerBufferBackup[];
  affectedLayerIds?: string[];
}

export type HistoryStep = PixelHistoryStep | StructuralHistoryStep;
