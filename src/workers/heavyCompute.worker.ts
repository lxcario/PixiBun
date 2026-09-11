/**
 * heavyCompute.worker.ts
 * Offloads compute-heavy algorithms (RotSprite 8x, WaveFunctionCollapse, In-Between Morphing)
 * off the main UI thread with zero-copy Transferable ArrayBuffers.
 */

import { rotSprite } from '@/lib/canvas/rotSprite';
import { synthesizeWfc, WfcInput, WfcOptions, WfcResult } from '@/lib/procedural/waveFunctionCollapse';
import { morphInBetweenFramesSync, morphInBetweenFrameAtFraction } from '@/lib/ai/pixelAiEngine';

export type HeavyWorkerRequest =
  | {
      id: string;
      type: 'rotSprite';
      data: Uint8ClampedArray;
      width: number;
      height: number;
      angleRad: number;
      pivotX?: number;
      pivotY?: number;
      targetW?: number;
      targetH?: number;
      outPivotX?: number;
      outPivotY?: number;
    }
  | {
      id: string;
      type: 'wfc';
      input: WfcInput;
      options?: WfcOptions;
    }
  | {
      id: string;
      type: 'morph';
      frameA: { width: number; height: number; data: Uint8ClampedArray };
      frameB: { width: number; height: number; data: Uint8ClampedArray };
      steps?: number;
      fraction?: number;
    };

export type HeavyWorkerResponse =
  | {
      id: string;
      type: 'rotSprite:done';
      result: { width: number; height: number; data: Uint8ClampedArray };
    }
  | {
      id: string;
      type: 'wfc:done';
      result: WfcResult;
    }
  | {
      id: string;
      type: 'morph:done';
      result: { width: number; height: number; data: Uint8ClampedArray }[];
    }
  | {
      id: string;
      type: 'error';
      message: string;
    };

self.onmessage = (e: MessageEvent<HeavyWorkerRequest>) => {
  const req = e.data;
  if (!req || !req.type) return;

  try {
    switch (req.type) {
      case 'rotSprite': {
        const { id, data, width, height, angleRad, pivotX, pivotY, targetW, targetH, outPivotX, outPivotY } = req;
        const res = rotSprite(
          { data, width, height },
          angleRad,
          pivotX,
          pivotY,
          targetW,
          targetH,
          outPivotX,
          outPivotY
        );
        const transfer = [res.data.buffer];
        (self as unknown as Worker).postMessage(
          { id, type: 'rotSprite:done', result: res },
          transfer
        );
        break;
      }

      case 'wfc': {
        const { id, input, options } = req;
        const res = synthesizeWfc(input, options);
        const transfer = res.data?.buffer ? [res.data.buffer] : [];
        (self as unknown as Worker).postMessage(
          { id, type: 'wfc:done', result: res },
          transfer
        );
        break;
      }

      case 'morph': {
        const { id, frameA, frameB, steps, fraction } = req;
        const res =
          fraction !== undefined
            ? [morphInBetweenFrameAtFraction(frameA, frameB, fraction)]
            : morphInBetweenFramesSync(frameA, frameB, steps);
        const transfer = res.map((r) => r.data.buffer);
        (self as unknown as Worker).postMessage(
          { id, type: 'morph:done', result: res },
          transfer
        );
        break;
      }
    }
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id: req.id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
