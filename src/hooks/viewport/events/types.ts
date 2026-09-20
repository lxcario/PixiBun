import type { LayerEffectDescriptor } from '@/types/canvas';

export interface ViewportEventContext {
  canvasWidth: number;
  canvasHeight: number;
  activeLayerId: string;
  getOrCreateLayerCanvas: (layerId: string) => HTMLCanvasElement;
  renderComposite: () => void;
  captureSnapshot: (
    description: string,
    overrideLayerId?: string,
    createdLayerId?: string,
    createdLayerTag?: string,
    preserveLayerEffect?: boolean,
    createdLayerIndex?: number
  ) => void;
  commitSnapshot: () => void;
  bumpBufferVersion: () => void;
  compositeSourceSnapshot: (excludeTag?: string) => CanvasRenderingContext2D | null;
  updateTaggedLayer: (
    displayName: string,
    tag: string,
    drawFn: (ctx: CanvasRenderingContext2D) => void,
    effect?: LayerEffectDescriptor
  ) => void;
}

export interface ViewportPhotometricContext extends ViewportEventContext {
  compositeNormalMapSnapshot: () => ImageData | null;
  discardSnapshot: () => void;
}
