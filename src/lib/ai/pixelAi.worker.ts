import { morphInBetweenFramesSync, generateSelOutDataSync } from './pixelAiEngine';
import { downsampleImageSync, quantizeAndDitherSync } from './pixelizeEngine';

export interface MorphRequest {
  type: 'morph';
  jobId: string;
  frameA: { width: number; height: number; data: Uint8ClampedArray };
  frameB: { width: number; height: number; data: Uint8ClampedArray };
  steps: number;
}

export interface SelOutRequest {
  type: 'sel-out';
  jobId: string;
  image: { width: number; height: number; data: Uint8ClampedArray };
  lightAzimuth: number;
  lightElevation: number;
}

export interface PixelizeComputeRequest {
  type: 'pixelize-compute';
  jobId: string;
  srcData: { width: number; height: number; data: Uint8ClampedArray };
  targetWidth: number;
  targetHeight: number;
  colorMode: string;
  activePalette?: string[];
  ditherMode: string;
  ditherStrength: number;
}

export type PixelAiWorkerRequest = MorphRequest | SelOutRequest | PixelizeComputeRequest;

export type PixelAiWorkerResponse =
  | { type: 'morph-done'; jobId: string; results: { width: number; height: number; data: ArrayBuffer }[] }
  | { type: 'sel-out-done'; jobId: string; selOutPixels: { x: number; y: number; r: number; g: number; b: number; a: number }[] }
  | { type: 'pixelize-done'; jobId: string; resultData: ArrayBuffer; extractedPalette: string[] }
  | { type: 'error'; jobId: string; message: string };

self.onmessage = (e: MessageEvent<PixelAiWorkerRequest>) => {
  const req = e.data;
  if (!req || !req.type) return;

  try {
    if (req.type === 'morph') {
      const morphResults = morphInBetweenFramesSync(
        req.frameA,
        req.frameB,
        req.steps
      );
      const transferables: ArrayBuffer[] = [];
      const serialized = morphResults.map((f: { width: number; height: number; data: Uint8ClampedArray }) => {
        transferables.push(f.data.buffer as ArrayBuffer);
        return { width: f.width, height: f.height, data: f.data.buffer as ArrayBuffer };
      });
      (self as unknown as Worker).postMessage(
        { type: 'morph-done', jobId: req.jobId, results: serialized },
        transferables
      );
    } else if (req.type === 'sel-out') {
      const res = generateSelOutDataSync(req.image, req.lightAzimuth, req.lightElevation);
      (self as unknown as Worker).postMessage({
        type: 'sel-out-done',
        jobId: req.jobId,
        selOutPixels: res.selOutPixels,
      });
    } else if (req.type === 'pixelize-compute') {
      // Execute downsampling & quantization in worker
      const downsampled = downsampleImageSync(req.srcData, req.targetWidth, req.targetHeight);
      const { palette, outputData } = quantizeAndDitherSync(
        downsampled,
        req.targetWidth,
        req.targetHeight,
        req.colorMode,
        req.activePalette,
        req.ditherMode,
        req.ditherStrength
      );
      (self as unknown as Worker).postMessage(
        {
          type: 'pixelize-done',
          jobId: req.jobId,
          resultData: outputData.buffer as ArrayBuffer,
          extractedPalette: palette,
        },
        [outputData.buffer as ArrayBuffer]
      );
    }
  } catch (err) {
    (self as unknown as Worker).postMessage({
      type: 'error',
      jobId: req.jobId,
      message: err instanceof Error ? err.message : 'Worker execution error',
    });
  }
};
