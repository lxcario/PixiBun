export type BlendMode = 'source-over' | 'multiply' | 'screen' | 'overlay' | 'color-dodge';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 1
  blendMode: BlendMode;
  // Stable machine identifier for auto-generated layers (photometric, normal-map, etc.)
  tag?: string;
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
  // Optional dirty bounding box origin for bounded delta snapshotting
  x?: number;
  y?: number;
  // If this step created a new layer, its ID is stored here so undo can remove it cleanly
  createdLayerId?: string;
  // Tag of the created layer (photometric, cast-shadow, ...), preserved so
  // redo can re-create the layer with its machine identity intact
  createdLayerTag?: string;
}

export interface StructuralHistoryStep {
  type: 'structural';
  description: string;
  frameIndex: number;
  frames: AnimationFrame[];
  activeFrameIndex: number;
  activeLayerId: string;
  layerBuffers?: LayerBufferBackup[];
}

export type HistoryStep = PixelHistoryStep | StructuralHistoryStep;

