/**
 * Alan Paeth (1986) Three-Shear Discrete Raster Rotation Engine.
 *
 * Decomposes 2D affine rotation into three successive 1D shear operations:
 *   [cos θ  -sin θ]   [1  -tan(θ/2)] [1      0] [1  -tan(θ/2)]
 *   [sin θ   cos θ] = [0          1] [sin θ  1] [0          1]
 *
 * Mathematical Invariants:
 * 1. Area Preservation: det(S1) = det(S2) = det(S3) = 1.
 * 2. Rounded scanline shears are invertible on their integer lattice. Finite
 *    output bounds can clip pixels; arbitrary fractional pivots are sampled.
 * 3. Scanline displacement avoids color blending. Pattern quality still needs
 *    sprite/angle evaluation; the decomposition is not a universal quality proof.
 * 4. Palette Preservation: Operates directly on source palette indices without color blending.
 */

import type { PixelBuffer } from './rotSprite';

const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI / 2;
const EPSILON = 1e-5;

/**
 * Executes Alan Paeth's three-shear rotation on a pixel buffer with quarter-turn decomposition.
 */
export function paethRotate(
  src: PixelBuffer,
  angleRad: number,
  pivotX?: number,
  pivotY?: number,
  targetW?: number,
  targetH?: number,
  outPivotX?: number,
  outPivotY?: number
): PixelBuffer {
  const { width: sw, height: sh, data: sData } = src;
  const normAngle = ((angleRad % TWO_PI) + TWO_PI) % TWO_PI;
  const turns = Math.round(normAngle / HALF_PI);
  const quarter = turns % 4;
  const phi = normAngle - turns * HALF_PI;
  const isQuarterTurn = Math.abs(phi) < EPSILON;

  const ow = targetW ?? (quarter % 2 === 1 ? sh : sw);
  const oh = targetH ?? (quarter % 2 === 1 ? sw : sh);

  if (sw <= 0 || sh <= 0 || sData.length === 0) {
    const safeW = Math.max(1, ow);
    const safeH = Math.max(1, oh);
    return { width: safeW, height: safeH, data: new Uint8ClampedArray(safeW * safeH * 4) };
  }

  const cx = pivotX ?? sw / 2;
  const cy = pivotY ?? sh / 2;
  const ocx = outPivotX ?? (pivotX === undefined ? ow / 2 : cx);
  const ocy = outPivotY ?? (pivotY === undefined ? oh / 2 : cy);

  const outData = new Uint8ClampedArray(ow * oh * 4);
  const out32 = new Uint32Array(outData.buffer, outData.byteOffset, ow * oh);
  const src32 = new Uint32Array(sData.buffer, sData.byteOffset, sw * sh);

  // Exact orthogonal quarter-turn fast path
  if (isQuarterTurn) {
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const col = src32[y * sw + x];
        if ((col >>> 24) === 0) continue;

        const rx = x + 0.5 - cx;
        const ry = y + 0.5 - cy;
        let qx = 0, qy = 0;
        if (quarter === 0) { qx = rx; qy = ry; }
        else if (quarter === 1) { qx = -ry; qy = rx; }
        else if (quarter === 2) { qx = -rx; qy = -ry; }
        else { qx = ry; qy = -rx; }

        const destX = Math.floor(qx + ocx);
        const destY = Math.floor(qy + ocy);
        if (destX >= 0 && destX < ow && destY >= 0 && destY < oh) {
          out32[destY * ow + destX] = col;
        }
      }
    }
    return { width: ow, height: oh, data: outData };
  }

  // Decompose into orthogonal turn + residual angle phi in [-pi/4, pi/4]
  const tanHalf = Math.tan(phi / 2);
  const sinPhi = Math.sin(phi);

  // Discrete Paeth inverse mapping: For each destination pixel, project backward
  // through the inverse shears to ensure zero gaps in the destination raster.
  for (let dy = 0; dy < oh; dy++) {
    for (let dx = 0; dx < ow; dx++) {
      const x3 = dx + 0.5 - ocx;
      const y3 = dy + 0.5 - ocy;

      // Inverse Shear 3: x2 = x3 - (-round(y3 * tan(phi/2)))
      const x2 = x3 + Math.round(y3 * tanHalf);
      const y2 = y3;

      // Inverse Shear 2: y1 = y2 - round(x2 * sin(phi))
      const x1 = x2;
      const y1 = y2 - Math.round(x2 * sinPhi);

      // Inverse Shear 1: x0 = x1 - (-round(y1 * tan(phi/2)))
      const x0 = x1 + Math.round(y1 * tanHalf);
      const y0 = y1;

      // Inverse Quarter Turn
      let rx = 0, ry = 0;
      if (quarter === 0) { rx = x0; ry = y0; }
      else if (quarter === 1) { rx = y0; ry = -x0; }
      else if (quarter === 2) { rx = -x0; ry = -y0; }
      else { rx = -y0; ry = x0; }

      const sx = Math.floor(rx + cx);
      const sy = Math.floor(ry + cy);

      if (sx >= 0 && sx < sw && sy >= 0 && sy < sh) {
        out32[dy * ow + dx] = src32[sy * sw + sx];
      }
    }
  }

  return { width: ow, height: oh, data: outData };
}
