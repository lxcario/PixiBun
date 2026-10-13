/**
 * Process Replay Export Engine ("Speedpaint" Timelapse Generator).
 *
 * Reuses the local-first history engine's per-stroke ring buffer snapshots
 * to compile a shareable timelapse animation of the creation process.
 * Fully DOM-independent and Web Worker / Node test friendly.
 */

import {
  HistoryStep,
  ReplayBaselineCheckpoint,
} from '@/lib/engine/historyEngine';
import { RawFrameData, encodeGifRawFrames } from './gifEncoderCore';
import { toBlobPart } from './blobBytes';

export interface ProcessReplayOptions {
  fps?: number; // Frames per second (default: 12)
  scale?: number; // Output scaling factor (default: 1)
  holdLastFrameMs?: number; // Milliseconds to pause on the finished artwork (default: 1000)
  onProgress?: (current: number, total: number) => void;
  signal?: AbortSignal;
  baseline?: ReplayBaselineCheckpoint | null;
  finalFrame?: RawFrameData;
}

/**
 * Nearest-neighbor integer scale for RGBA pixel buffers.
 */
function scaleRgba(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  scale: number
): Uint8ClampedArray {
  if (scale <= 1) return new Uint8ClampedArray(srcData);
  const s = Math.floor(scale);
  const dstW = srcW * s;
  const dstH = srcH * s;
  const dstData = new Uint8ClampedArray(dstW * dstH * 4);
  for (let dy = 0; dy < dstH; dy++) {
    const sy = Math.floor(dy / s);
    for (let dx = 0; dx < dstW; dx++) {
      const sx = Math.floor(dx / s);
      const srcIdx = (sy * srcW + sx) * 4;
      const dstIdx = (dy * dstW + dx) * 4;
      dstData[dstIdx] = srcData[srcIdx];
      dstData[dstIdx + 1] = srcData[srcIdx + 1];
      dstData[dstIdx + 2] = srcData[srcIdx + 2];
      dstData[dstIdx + 3] = srcData[srcIdx + 3];
    }
  }
  return dstData;
}

/**
 * Composites a stack of layers onto a destination RGBA buffer using Porter-Duff source-over.
 */
export function compositeLayers(
  width: number,
  height: number,
  layers: Array<{
    imageData: ImageData;
    opacity?: number;
    blendMode?: string;
    visible?: boolean;
  }>
): Uint8ClampedArray {
  const composite = new Uint8ClampedArray(width * height * 4);

  for (const layer of layers) {
    if (layer.visible === false) continue;
    const opacity = layer.opacity ?? 1;
    if (opacity <= 0) continue;
    const srcData = layer.imageData.data;

    for (let i = 0; i < composite.length; i += 4) {
      const sa = (srcData[i + 3] / 255) * opacity;
      if (sa <= 0) continue;

      const sr = srcData[i];
      const sg = srcData[i + 1];
      const sb = srcData[i + 2];

      const da = composite[i + 3] / 255;
      const dr = composite[i];
      const dg = composite[i + 1];
      const db = composite[i + 2];

      const outA = sa + da * (1 - sa);
      if (outA > 0) {
        composite[i] = Math.round((sr * sa + dr * da * (1 - sa)) / outA);
        composite[i + 1] = Math.round((sg * sa + dg * da * (1 - sa)) / outA);
        composite[i + 2] = Math.round((sb * sa + db * da * (1 - sa)) / outA);
        composite[i + 3] = Math.round(outA * 255);
      }
    }
  }

  return composite;
}

interface ReplayLayerState {
  layerId: string;
  name?: string;
  imageData: ImageData;
  opacity: number;
  blendMode: string;
  visible: boolean;
  order: number;
}

function createBlankImageData(width: number, height: number): ImageData {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: 'srgb',
  };
}

/**
 * Reconstructs the full composite progression of a project starting from an optional
 * baseline checkpoint (e.g. state prior to history eviction) and layering subsequent retained steps.
 */
export function reconstructProcessReplayFrames(
  steps: readonly HistoryStep[],
  baseline?: ReplayBaselineCheckpoint | null,
  scale: number = 1
): RawFrameData[] {
  const s = Math.max(1, Math.floor(scale));
  const rawFrames: RawFrameData[] = [];

  let width = baseline?.width ?? 0;
  let height = baseline?.height ?? 0;
  if (!width || !height) {
    for (const step of steps) {
      if (step.type !== 'structural' && step.imageData) {
        width = step.imageData.width;
        height = step.imageData.height;
        break;
      }
    }
  }
  if (!width || !height) return [];

  // Map: frameIndex -> Map: layerId -> ReplayLayerState
  const frameLayerMap = new Map<number, Map<string, ReplayLayerState>>();

  if (baseline) {
    for (const bf of baseline.frames) {
      let lMap = frameLayerMap.get(bf.frameIndex);
      if (!lMap) {
        lMap = new Map();
        frameLayerMap.set(bf.frameIndex, lMap);
      }
      for (let i = 0; i < bf.layers.length; i++) {
        const bl = bf.layers[i];
        lMap.set(bl.layerId, {
          layerId: bl.layerId,
          name: bl.name,
          imageData: bl.imageData,
          opacity: bl.opacity ?? 1,
          blendMode: bl.blendMode ?? 'source-over',
          visible: bl.visible ?? true,
          order: bl.order !== undefined ? bl.order : i,
        });
      }
    }
  }

  const activeFrame = baseline?.activeFrameIndex ?? 0;

  const emitComposite = (fIdx: number) => {
    const lMap = frameLayerMap.get(fIdx);
    const layers = lMap
      ? Array.from(lMap.values()).sort((a, b) => a.order - b.order)
      : [];
    const compData = compositeLayers(width, height, layers);
    const scaledData = scaleRgba(compData, width, height, s);
    rawFrames.push({
      width: width * s,
      height: height * s,
      data: scaledData,
    });
  };

  // 1. Emit the initial baseline frame at the truncation boundary
  if (baseline && baseline.frames.length > 0) {
    emitComposite(activeFrame);
  }

  // 2. Composite subsequent retained steps
  for (const step of steps) {
    if (step.type === 'pixel' && step.imageData) {
      const fIdx = step.frameIndex ?? 0;
      let lMap = frameLayerMap.get(fIdx);
      if (!lMap) {
        lMap = new Map();
        frameLayerMap.set(fIdx, lMap);
      }
      const existing = lMap.get(step.layerId);
      lMap.set(step.layerId, {
        layerId: step.layerId,
        name: step.layerName ?? existing?.name,
        imageData: step.imageData,
        opacity: existing?.opacity ?? 1,
        blendMode: existing?.blendMode ?? 'source-over',
        visible: existing?.visible ?? true,
        order: existing?.order ?? lMap.size,
      });
      emitComposite(fIdx);
    } else if (step.type === 'structural') {
      const fIdx = step.frameIndex ?? 0;
      if (step.frames && step.frames.length > 0) {
        for (let frameIdx = 0; frameIdx < step.frames.length; frameIdx++) {
          const af = step.frames[frameIdx];
          let lMap = frameLayerMap.get(frameIdx);
          if (!lMap) {
            lMap = new Map();
            frameLayerMap.set(frameIdx, lMap);
          }

          const bufMap = new Map<string, ImageData>();
          if (step.layerBuffers) {
            for (const b of step.layerBuffers) {
              if (b.imageData) bufMap.set(b.layerId, b.imageData);
            }
          }

          const currentIds = new Set(af.layers.map((l) => l.id));
          for (const key of Array.from(lMap.keys())) {
            if (!currentIds.has(key)) {
              lMap.delete(key);
            }
          }

          for (let lIdx = 0; lIdx < af.layers.length; lIdx++) {
            const al = af.layers[lIdx];
            const existing = lMap.get(al.id);
            const imgData =
              bufMap.get(al.id) ??
              existing?.imageData ??
              createBlankImageData(width, height);

            lMap.set(al.id, {
              layerId: al.id,
              name: al.name,
              imageData: imgData,
              opacity: al.opacity ?? 1,
              blendMode: al.blendMode ?? 'source-over',
              visible: al.visible ?? true,
              order: af.layers.length - 1 - lIdx,
            });
          }
        }
      } else if (step.layerBuffers) {
        let lMap = frameLayerMap.get(fIdx);
        if (!lMap) {
          lMap = new Map();
          frameLayerMap.set(fIdx, lMap);
        }
        for (const buf of step.layerBuffers) {
          const existing = lMap.get(buf.layerId);
          lMap.set(buf.layerId, {
            layerId: buf.layerId,
            name: existing?.name,
            imageData: buf.imageData,
            opacity: existing?.opacity ?? 1,
            blendMode: existing?.blendMode ?? 'source-over',
            visible: existing?.visible ?? true,
            order: existing?.order ?? 0,
          });
        }
      }
      emitComposite(fIdx);
    }
  }

  return rawFrames;
}

/**
 * Extracts scaled RawFrameData array directly from HistoryStep snapshots
 * with high-performance nearest-neighbor pixel expansion (zero DOM dependency).
 */
export function convertHistoryToRawFrames(
  steps: readonly HistoryStep[],
  scale: number = 1,
  options?: ProcessReplayOptions
): RawFrameData[] {
  if (!steps || steps.length === 0) return [];

  if (options?.baseline) {
    return appendFinalFrame(reconstructProcessReplayFrames(steps, options.baseline, scale), scale, options.finalFrame);
  }

  const s = Math.max(1, Math.floor(scale));
  const rawFrames: RawFrameData[] = [];

  for (const step of steps) {
    if (step.type === 'structural' || !step.imageData) continue;
    const srcW = step.imageData.width;
    const srcH = step.imageData.height;
    const srcData = step.imageData.data;

    if (s === 1) {
      rawFrames.push({
        width: srcW,
        height: srcH,
        data: new Uint8ClampedArray(srcData),
      });
      continue;
    }

    const dstData = scaleRgba(new Uint8ClampedArray(srcData), srcW, srcH, s);

    rawFrames.push({
      width: srcW * s,
      height: srcH * s,
      data: dstData,
    });
  }

  return appendFinalFrame(rawFrames, s, options?.finalFrame);
}

function appendFinalFrame(frames: RawFrameData[], scale: number, finalFrame?: RawFrameData): RawFrameData[] {
  if (!finalFrame) return frames;
  const { width, height, data } = finalFrame;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1
    || data.length !== width * height * 4) throw new Error('Invalid final timelapse pixels.');
  const s = Math.max(1, Math.floor(scale)), outputWidth = width * s, outputHeight = height * s;
  if (frames.some(frame => frame.width !== outputWidth || frame.height !== outputHeight)) {
    throw new Error('Retained timelapse contains different canvas sizes. Save a project backup and use animation export for this drawing.');
  }
  return [...frames, { width: outputWidth, height: outputHeight, data: scaleRgba(data, width, height, s) }];
}

/**
 * Converts a sequence of historical undo snapshots into an array of HTMLCanvasElement
 * when a DOM environment is available.
 */
export function convertHistoryToCanvases(
  steps: readonly HistoryStep[],
  options?: ProcessReplayOptions
): HTMLCanvasElement[] {
  if (typeof document === 'undefined' || !steps || steps.length === 0) return [];

  if (options?.baseline || options?.finalFrame) {
    const rawFrames = convertHistoryToRawFrames(steps, options.scale ?? 1, options);
    const canvases: HTMLCanvasElement[] = [];
    for (const frame of rawFrames) {
      const canvas = document.createElement('canvas');
      canvas.width = frame.width;
      canvas.height = frame.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        const imgData = new ImageData(new Uint8ClampedArray(frame.data), frame.width, frame.height);
        ctx.putImageData(imgData, 0, 0);
        canvases.push(canvas);
      }
    }
    return canvases;
  }

  const canvases: HTMLCanvasElement[] = [];

  for (const step of steps) {
    if (step.type === 'structural' || !step.imageData) continue;
    const canvas = document.createElement('canvas');
    canvas.width = step.imageData.width;
    canvas.height = step.imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.putImageData(step.imageData, 0, 0);
      canvases.push(canvas);
    }
  }

  return canvases;
}

/**
 * Generates an animated GIF Blob representing the drawing progression (speedpaint)
 * from captured undo history snapshots.
 *
 * @param steps Array of HistoryStep snapshots from historyEngine.getHistory()
 * @param options Configuration options (fps, scale, holdLastFrameMs, onProgress, signal)
 * @returns Promise resolving to an animated GIF Blob
 */
export async function exportProcessReplayGifAsync(
  steps: readonly HistoryStep[],
  options: ProcessReplayOptions = {}
): Promise<Blob> {
  const scale = Math.max(1, Math.min(16, options.scale ?? 1));
  const rawFrames = convertHistoryToRawFrames(steps, scale, options);

  if (rawFrames.length === 0) {
    throw new Error('Cannot export process replay: history contains no drawable steps.');
  }

  if (options.signal?.aborted) {
    throw new DOMException('Process replay export aborted', 'AbortError');
  }

  const fps = Math.max(1, Math.min(60, options.fps ?? 12));
  const holdLastFrameMs = options.holdLastFrameMs ?? 1000;

  // Calculate per-frame delays in hundredths of a second (10ms units per GIF89a spec)
  const defaultDelayUnits = Math.max(1, Math.round(100 / fps));
  const delays = rawFrames.map((_, idx) => {
    if (idx === rawFrames.length - 1 && holdLastFrameMs > 0) {
      return Math.max(1, Math.round(holdLastFrameMs / 10));
    }
    return defaultDelayUnits;
  });

  const gifBytes = encodeGifRawFrames(rawFrames, fps, options.onProgress, delays);
  return new Blob([toBlobPart(gifBytes)], { type: 'image/gif' });
}
