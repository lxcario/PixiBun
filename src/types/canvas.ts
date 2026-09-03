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

export interface HistoryStep {
  description: string;
  frameIndex: number;
  layerId: string;
  imageData: ImageData;
  // If this step created a new layer, its ID is stored here so undo can remove it cleanly
  createdLayerId?: string;
}
