/**
 * Normal Map Vector Counter-Rotation Engine.
 *
 * In 2D normal maps, surface vectors are encoded in OpenGL tangent space:
 *   R = (Nx + 1) * 127.5  (Right +X)
 *   G = (Ny + 1) * 127.5  (Up +Y)
 *   B = (Nz + 1) * 127.5  (Out towards viewer +Z)
 *
 * When a sprite or layer quad rotates in screen space by angle θ, the spatial
 * texture coordinates rotate, but the stored normal vectors would point in the
 * unrotated direction, causing scene lights to illuminate surfaces from inverted angles.
 *
 * This module rotates the internal tangent-space normal vectors around the Z-axis by θ:
 *   [Nx']   [ cos θ   sin θ] [Nx]
 *   [Ny'] = [-sin θ   cos θ] [Ny],   Nz' = Nz
 */

import { rotSprite, type PixelBuffer } from './rotSprite';
import { paethRotate } from './paethRotation';

/**
 * Counter-rotates tangent space surface normals within an RGBA normal map buffer.
 */
export function rotateNormalVectors(buffer: PixelBuffer, angleRad: number): PixelBuffer {
  const { width, height, data } = buffer;
  const outData = new Uint8ClampedArray(data);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  for (let i = 0; i < outData.length; i += 4) {
    const a = outData[i + 3];
    if (a === 0) continue;

    const r = outData[i];
    const g = outData[i + 1];
    const b = outData[i + 2];

    // Decode [0, 255] to [-1, 1]
    const vx = (r - 127.5) / 127.5;
    const vy = (g - 127.5) / 127.5;
    const vz = (b - 127.5) / 127.5;

    // Rotate (vx, vy) by angle around Z-axis
    const rx = cos * vx + sin * vy;
    const ry = -sin * vx + cos * vy;

    // Renormalize if non-zero
    const lenSq = rx * rx + ry * ry + vz * vz;
    let nx = rx, ny = ry, nz = vz;
    if (lenSq > 1e-4) {
      const invLen = 1 / Math.sqrt(lenSq);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;
    }

    outData[i] = Math.max(0, Math.min(255, Math.round((nx + 1) * 127.5)));
    outData[i + 1] = Math.max(0, Math.min(255, Math.round((ny + 1) * 127.5)));
    outData[i + 2] = Math.max(0, Math.min(255, Math.round((nz + 1) * 127.5)));
  }

  return { width, height, data: outData };
}

/**
 * Complete normal map layer rotation:
 * 1. Spatially rotates the raster coordinates using RotSprite or Paeth.
 * 2. Counter-rotates tangent vectors to preserve lighting angle parity.
 */
export function rotateNormalMapBuffer(
  src: PixelBuffer,
  angleRad: number,
  pivotX?: number,
  pivotY?: number,
  targetW?: number,
  targetH?: number,
  outPivotX?: number,
  outPivotY?: number,
  algorithm: 'rotsprite' | 'paeth' = 'rotsprite'
): PixelBuffer {
  const spatiallyRotated = algorithm === 'paeth'
    ? paethRotate(src, angleRad, pivotX, pivotY, targetW, targetH, outPivotX, outPivotY)
    : rotSprite(src, angleRad, pivotX, pivotY, targetW, targetH, outPivotX, outPivotY, true);

  return rotateNormalVectors(spatiallyRotated, angleRad);
}
