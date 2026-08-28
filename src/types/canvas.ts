export type BlendMode = 'source-over' | 'multiply' | 'screen' | 'overlay' | 'color-dodge';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 1
  blendMode: BlendMode;
  // Canvas pixel buffer stored as an OffscreenCanvas or base64 / ImageData
  dataUrl?: string; 
}

export interface AnimationFrame {
  id: string;
  durationMs: number;
  layers: Layer[];
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
}
