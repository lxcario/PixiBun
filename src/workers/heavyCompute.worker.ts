/**
 * heavyCompute.worker.ts
 * Offloads compute-heavy algorithms (RotSprite 8x, WaveFunctionCollapse, In-Between Morphing)
 * off the main UI thread with zero-copy Transferable ArrayBuffers.
 */

import { rotSprite } from '@/lib/canvas/rotSprite';
import { paethRotate } from '@/lib/canvas/paethRotation';
import { rotateNormalVectors } from '@/lib/canvas/normalMapRotation';
import { synthesizeWfc, WfcInput, WfcOptions, WfcResult } from '@/lib/procedural/waveFunctionCollapse';
import { morphInBetweenFramesSync, morphInBetweenFrameAtFraction } from '@/lib/ai/pixelAiEngine';
import {
  computeSeparableEDT,
  generateInflatedHeightmap,
  applyBilateralFilter,
  computeTangentNormalField,
  bakeNormalMapToRgba,
} from '@/lib/ai/math/edtNormalMap';
import { computeMinecraftSkinNormalField } from '@/lib/ai/math/minecraftSkin';

// This entrypoint runs in a worker; DOM typings expose the Window overload for self.
const postWorkerMessage = self.postMessage.bind(self) as (message: unknown, transfer?: ArrayBufferLike[]) => void;

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
      pixelPerfect?: boolean;
      algorithm?: 'rotsprite' | 'paeth';
      isNormalMap?: boolean;
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
    }
  | {
      id: string;
      type: 'edtNormalMap';
      buffer: ArrayBuffer;
      width: number;
      height: number;
      isMinecraftSkin?: boolean;
      depthScale?: number;
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
      type: 'edtNormalMap:done';
      result: { width: number; height: number; data: Uint8ClampedArray };
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
        const { id, data, width, height, angleRad, pivotX, pivotY, targetW, targetH, outPivotX, outPivotY, pixelPerfect, algorithm, isNormalMap } = req;
        let res = algorithm === 'paeth'
          ? paethRotate(
              { data, width, height },
              angleRad,
              pivotX,
              pivotY,
              targetW,
              targetH,
              outPivotX,
              outPivotY
            )
          : rotSprite(
              { data, width, height },
              angleRad,
              pivotX,
              pivotY,
              targetW,
              targetH,
              outPivotX,
              outPivotY,
              pixelPerfect
            );
        if (isNormalMap) {
          res = rotateNormalVectors(res, angleRad);
        }
        const transfer = [res.data.buffer];
        postWorkerMessage(
          { id, type: 'rotSprite:done', result: res },
          transfer
        );
        break;
      }

      case 'wfc': {
        const { id, input, options } = req;
        const res = synthesizeWfc(input, options);
        const transfer = res.data?.buffer ? [res.data.buffer] : [];
        postWorkerMessage(
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
        postWorkerMessage(
          { id, type: 'morph:done', result: res },
          transfer
        );
        break;
      }

      case 'edtNormalMap': {
        const { id, buffer, width, height, isMinecraftSkin, depthScale } = req;
        const rgba = new Uint8ClampedArray(buffer);
        const isOpaque = (x: number, y: number) => {
          if (x < 0 || x >= width || y < 0 || y >= height) return false;
          return rgba[(y * width + x) * 4 + 3] > 10;
        };

        const normalField = isMinecraftSkin
          ? computeMinecraftSkinNormalField(width, height)
          : computeTangentNormalField(
              applyBilateralFilter(
                generateInflatedHeightmap(
                  computeSeparableEDT(isOpaque, width, height),
                  width,
                  height,
                  0.5
                ),
                width,
                height,
                1.5,
                2.0
              ),
              width,
              height,
              depthScale ?? 2.0
            );

        const outRgba = bakeNormalMapToRgba(normalField, width, height, isOpaque);
        const transfer = [outRgba.buffer];
        postWorkerMessage(
          { id, type: 'edtNormalMap:done', result: { width, height, data: outRgba } },
          transfer
        );
        break;
      }
    }
  } catch (err) {
    postWorkerMessage({
      id: req.id,
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
