/**
 * Minecraft Player Skin UV Texture Detection, Normal Fields & Photometric Shading Engine.
 *
 * Citation: Mojang Minecraft Player Skin UV Texture Layout specification (64x64 and 64x32 cuboids).
 * Implements 3D cuboid normal projection, anatomical contact ambient occlusion,
 * sky hemisphere gradients, and OKLCH non-destructive warm/cool hue modulation.
 */

import { PhotometricLightingParams } from '@/types/tools';
import { rgbToOKLab, okLabToRGB } from './colorSpace';
import { NormalVectorField } from './edtNormalMap';

export interface MinecraftNormalField extends NormalVectorField {
  sky?: Float32Array;
  material?: Uint8Array;
}

/**
 * Detects if the current canvas image corresponds to a standard Minecraft skin (64x64 or 64x32).
 */
export function detectMinecraftSkin(
  isOpaque: (x: number, y: number) => boolean,
  width: number,
  height: number
): boolean {
  if (width !== 64 || (height !== 64 && height !== 32)) return false;

  const voidZones = [
    { x: 0, y: 0, w: 8, h: 8 },
    { x: 24, y: 0, w: 8, h: 8 },
    { x: 32, y: 0, w: 8, h: 8 },
    { x: 56, y: 0, w: 8, h: 8 },
    { x: 0, y: 16, w: 4, h: 4 },
    { x: 12, y: 16, w: 4, h: 4 },
    { x: 36, y: 16, w: 4, h: 4 },
    { x: 56, y: 16, w: 8, h: 4 },
  ];

  let voidPixels = 0;
  let voidOpaque = 0;
  for (const z of voidZones) {
    if (z.y + z.h <= height) {
      for (let py = z.y; py < z.y + z.h; py++) {
        for (let px = z.x; px < z.x + z.w; px++) {
          voidPixels++;
          if (isOpaque(px, py)) voidOpaque++;
        }
      }
    }
  }

  let headPixels = 0;
  for (let py = 8; py < 16; py++) {
    for (let px = 8; px < 16; px++) {
      if (isOpaque(px, py)) headPixels++;
    }
  }

  return (voidOpaque / (voidPixels || 1) < 0.25) && (headPixels >= 16);
}

/**
 * Computes physically accurate 3D cuboid face normals for Minecraft skins.
 */
export function computeMinecraftSkinNormalField(
  width: number,
  height: number
): MinecraftNormalField {
  const nx = new Float32Array(width * height);
  const ny = new Float32Array(width * height);
  const nz = new Float32Array(width * height);
  const sky = new Float32Array(width * height);
  const material = new Uint8Array(width * height); // 0 = skin (base), 1 = fabric (overlay), 2 = eye protection

  for (let i = 0; i < width * height; i++) {
    nz[i] = 1.0;
    sky[i] = 1.0;
    material[i] = 0;
  }

  const paintFace = (
    fx: number,
    fy: number,
    fw: number,
    fh: number,
    baseNorm: [number, number, number],
    leftNeighborNorm: [number, number, number] = baseNorm,
    rightNeighborNorm: [number, number, number] = baseNorm,
    faceType: 'UP' | 'DOWN' | 'SIDE' = 'SIDE',
    bodyPart: 'head' | 'torso' | 'arm' | 'leg' = 'torso',
    layer: 'base' | 'overlay' = 'base'
  ) => {
    if (fx + fw > width || fy + fh > height) return;

    for (let py = fy; py < fy + fh; py++) {
      for (let px = fx; px < fx + fw; px++) {
        const idx = py * width + px;
        let [bx, by, bz] = baseNorm;

        // 1px narrow boundary linear interpolation to remove harsh barcode/step transitions
        if (fw > 1) {
          if (px === fx) {
            // Left border column: blend 75% base + 25% left neighbor
            bx = bx * 0.75 + leftNeighborNorm[0] * 0.25;
            by = by * 0.75 + leftNeighborNorm[1] * 0.25;
            bz = bz * 0.75 + leftNeighborNorm[2] * 0.25;
          } else if (px === fx + fw - 1) {
            // Right border column: blend 75% base + 25% right neighbor
            bx = bx * 0.75 + rightNeighborNorm[0] * 0.25;
            by = by * 0.75 + rightNeighborNorm[1] * 0.25;
            bz = bz * 0.75 + rightNeighborNorm[2] * 0.25;
          }
        }

        const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
        nx[idx] = bx / len;
        ny[idx] = by / len;
        nz[idx] = bz / len;

        // Material assignment
        if (layer === 'overlay') {
          material[idx] = 1; // Fabric / Clothing overlay
        } else {
          // Base layer: check if this is the Head Front Eye region (x: 8..15, y: 12..14)
          if (bodyPart === 'head' && fx === 8 && fy === 8 && py >= 12 && py <= 14) {
            material[idx] = 2; // Eye row
          } else {
            material[idx] = 0; // Skin / Organic base
          }
        }

        // Sky factor
        if (faceType === 'UP') {
          sky[idx] = 1.08;
        } else if (faceType === 'DOWN') {
          sky[idx] = 0.80;
        } else {
          sky[idx] = 1.0; // Flat neutral sky (no vertical 1D gradient lines)
        }
      }
    }
  };

  const UP: [number, number, number] = [0, -0.60, 0.80];
  const DOWN: [number, number, number] = [0, 0.60, 0.80];
  const LEFT: [number, number, number] = [0.60, 0, 0.80];
  const RIGHT: [number, number, number] = [-0.60, 0, 0.80];
  const FRONT: [number, number, number] = [0, 0, 1.0];
  const BACK: [number, number, number] = [0, 0, 0.65];

  // Head (0, 0, 32, 16) - Base Layer
  paintFace(8, 0, 8, 8, UP, UP, UP, 'UP', 'head', 'base');
  paintFace(16, 0, 8, 8, DOWN, DOWN, DOWN, 'DOWN', 'head', 'base');
  paintFace(0, 8, 8, 8, RIGHT, BACK, FRONT, 'SIDE', 'head', 'base');
  paintFace(8, 8, 8, 8, FRONT, RIGHT, LEFT, 'SIDE', 'head', 'base');
  paintFace(16, 8, 8, 8, LEFT, FRONT, BACK, 'SIDE', 'head', 'base');
  paintFace(24, 8, 8, 8, BACK, LEFT, RIGHT, 'SIDE', 'head', 'base');

  // Hat Layer 2 (32, 0, 32, 16) - Overlay Layer (Clothing/Hair)
  paintFace(40, 0, 8, 8, UP, UP, UP, 'UP', 'head', 'overlay');
  paintFace(48, 0, 8, 8, DOWN, DOWN, DOWN, 'DOWN', 'head', 'overlay');
  paintFace(32, 8, 8, 8, RIGHT, BACK, FRONT, 'SIDE', 'head', 'overlay');
  paintFace(40, 8, 8, 8, FRONT, RIGHT, LEFT, 'SIDE', 'head', 'overlay');
  paintFace(48, 8, 8, 8, LEFT, FRONT, BACK, 'SIDE', 'head', 'overlay');
  paintFace(56, 8, 8, 8, BACK, LEFT, RIGHT, 'SIDE', 'head', 'overlay');

  // Body / Torso (16, 16, 24, 16) - Base Layer
  paintFace(20, 16, 8, 4, UP, UP, UP, 'UP', 'torso', 'base');
  paintFace(28, 16, 8, 4, DOWN, DOWN, DOWN, 'DOWN', 'torso', 'base');
  paintFace(16, 20, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'torso', 'base');
  paintFace(20, 20, 8, 12, FRONT, RIGHT, LEFT, 'SIDE', 'torso', 'base');
  paintFace(28, 20, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'torso', 'base');
  paintFace(32, 20, 8, 12, BACK, LEFT, RIGHT, 'SIDE', 'torso', 'base');

  // Right Arm (40, 16, 16, 16) - Base Layer
  paintFace(44, 16, 4, 4, UP, UP, UP, 'UP', 'arm', 'base');
  paintFace(48, 16, 4, 4, DOWN, DOWN, DOWN, 'DOWN', 'arm', 'base');
  paintFace(40, 20, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'arm', 'base');
  paintFace(44, 20, 4, 12, FRONT, RIGHT, LEFT, 'SIDE', 'arm', 'base');
  paintFace(48, 20, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'arm', 'base');
  paintFace(52, 20, 4, 12, BACK, LEFT, RIGHT, 'SIDE', 'arm', 'base');

  // Right Leg (0, 16, 16, 16) - Base Layer
  paintFace(4, 16, 4, 4, UP, UP, UP, 'UP', 'leg', 'base');
  paintFace(8, 16, 4, 4, DOWN, DOWN, DOWN, 'DOWN', 'leg', 'base');
  paintFace(0, 20, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'leg', 'base');
  paintFace(4, 20, 4, 12, FRONT, RIGHT, LEFT, 'SIDE', 'leg', 'base');
  paintFace(8, 20, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'leg', 'base');
  paintFace(12, 20, 4, 12, BACK, LEFT, RIGHT, 'SIDE', 'leg', 'base');

  if (height >= 64) {
    // Left Leg Base (16, 48, 16, 16) - Base Layer
    paintFace(20, 48, 4, 4, UP, UP, UP, 'UP', 'leg', 'base');
    paintFace(24, 48, 4, 4, DOWN, DOWN, DOWN, 'DOWN', 'leg', 'base');
    paintFace(16, 52, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'leg', 'base');
    paintFace(20, 52, 4, 12, FRONT, RIGHT, LEFT, 'SIDE', 'leg', 'base');
    paintFace(24, 52, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'leg', 'base');
    paintFace(28, 52, 4, 12, BACK, LEFT, RIGHT, 'SIDE', 'leg', 'base');

    // Left Arm Base (32, 48, 16, 16) - Base Layer
    paintFace(36, 48, 4, 4, UP, UP, UP, 'UP', 'arm', 'base');
    paintFace(40, 48, 4, 4, DOWN, DOWN, DOWN, 'DOWN', 'arm', 'base');
    paintFace(32, 52, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'arm', 'base');
    paintFace(36, 52, 4, 12, FRONT, RIGHT, LEFT, 'SIDE', 'arm', 'base');
    paintFace(40, 52, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'arm', 'base');
    paintFace(44, 52, 4, 12, BACK, LEFT, RIGHT, 'SIDE', 'arm', 'base');

    // Jacket Layer 2 (16, 32, 24, 16) - Overlay Layer (Clothing)
    paintFace(20, 32, 8, 4, UP, UP, UP, 'UP', 'torso', 'overlay');
    paintFace(28, 32, 8, 4, DOWN, DOWN, DOWN, 'DOWN', 'torso', 'overlay');
    paintFace(16, 36, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'torso', 'overlay');
    paintFace(20, 36, 8, 12, FRONT, RIGHT, LEFT, 'SIDE', 'torso', 'overlay');
    paintFace(28, 36, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'torso', 'overlay');
    paintFace(32, 36, 8, 12, BACK, LEFT, RIGHT, 'SIDE', 'torso', 'overlay');

    // Right Sleeve Layer 2 (40, 32, 16, 16) - Overlay Layer (Clothing)
    paintFace(44, 32, 4, 4, UP, UP, UP, 'UP', 'arm', 'overlay');
    paintFace(48, 32, 4, 4, DOWN, DOWN, DOWN, 'DOWN', 'arm', 'overlay');
    paintFace(40, 36, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'arm', 'overlay');
    paintFace(44, 36, 4, 12, FRONT, RIGHT, LEFT, 'SIDE', 'arm', 'overlay');
    paintFace(48, 36, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'arm', 'overlay');
    paintFace(52, 36, 4, 12, BACK, LEFT, RIGHT, 'SIDE', 'arm', 'overlay');

    // Right Pants Layer 2 (0, 32, 16, 16) - Overlay Layer (Clothing)
    paintFace(4, 32, 4, 4, UP, UP, UP, 'UP', 'leg', 'overlay');
    paintFace(8, 32, 4, 4, DOWN, DOWN, DOWN, 'DOWN', 'leg', 'overlay');
    paintFace(0, 36, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'leg', 'overlay');
    paintFace(4, 36, 4, 12, FRONT, RIGHT, LEFT, 'SIDE', 'leg', 'overlay');
    paintFace(8, 36, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'leg', 'overlay');
    paintFace(12, 36, 4, 12, BACK, LEFT, RIGHT, 'SIDE', 'leg', 'overlay');

    // Left Pants Layer 2 (0, 48, 16, 16) - Overlay Layer (Clothing)
    paintFace(4, 48, 4, 4, UP, UP, UP, 'UP', 'leg', 'overlay');
    paintFace(8, 48, 4, 4, DOWN, DOWN, DOWN, 'DOWN', 'leg', 'overlay');
    paintFace(0, 52, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'leg', 'overlay');
    paintFace(4, 52, 4, 12, FRONT, RIGHT, LEFT, 'SIDE', 'leg', 'overlay');
    paintFace(8, 52, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'leg', 'overlay');
    paintFace(12, 52, 4, 12, BACK, LEFT, RIGHT, 'SIDE', 'leg', 'overlay');

    // Left Sleeve Layer 2 (48, 48, 16, 16) - Overlay Layer (Clothing)
    paintFace(52, 48, 4, 4, UP, UP, UP, 'UP', 'arm', 'overlay');
    paintFace(56, 48, 4, 4, DOWN, DOWN, DOWN, 'DOWN', 'arm', 'overlay');
    paintFace(48, 52, 4, 12, RIGHT, BACK, FRONT, 'SIDE', 'arm', 'overlay');
    paintFace(52, 52, 4, 12, FRONT, RIGHT, LEFT, 'SIDE', 'arm', 'overlay');
    paintFace(56, 52, 4, 12, LEFT, FRONT, BACK, 'SIDE', 'arm', 'overlay');
    paintFace(60, 52, 4, 12, BACK, LEFT, RIGHT, 'SIDE', 'arm', 'overlay');
  }

  return { nx, ny, nz, sky, material, width, height };
}

/**
 * Professional Minecraft Skin Photometric Shading Engine.
 */
export function executeMinecraftSkinShadingPipeline(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: PhotometricLightingParams
): HTMLCanvasElement {
  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outCtx = outputCanvas.getContext('2d')!;
  const outImgData = outCtx.createImageData(width, height);
  const outData = outImgData.data;

  const isOpaque = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };

  const normalField = computeMinecraftSkinNormalField(width, height);

  const azRad = (params.lightAzimuth * Math.PI) / 180;
  const elRad = (Math.max(15, params.lightElevation) * Math.PI) / 180;

  const Lx = Math.sin(azRad) * Math.cos(elRad);
  const Ly = -Math.cos(azRad) * Math.cos(elRad);
  const Lz = Math.sin(elRad);

  const brightness = params.lightBrightness ?? 1.15;
  const cavityStr = params.cavityStrength ?? 1.0;

  // Pre-calculate anatomical contact ambient occlusion map
  const aoMap = new Float32Array(width * height).fill(1.0);

  const applyContactAO = (x: number, y: number, w: number, h: number, aoFactor: number) => {
    for (let py = y; py < y + h && py < height; py++) {
      for (let px = x; px < x + w && px < width; px++) {
        if (px >= 0 && py >= 0) {
          aoMap[py * width + px] = Math.min(aoMap[py * width + px], aoFactor);
        }
      }
    }
  };

  // 1. Head Under-Neck Occlusion (Bottom face of head)
  applyContactAO(16, 0, 8, 8, 0.85);

  // 2. Overlap Layer (Hat, Jacket, Sleeve, Pants) subtle shadow on base layer
  const applyOverlapShadow = (ox: number, oy: number, w: number, h: number, bx: number, by: number) => {
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        if (isOpaque(ox + px, oy + py) && isOpaque(bx + px, by + py)) {
          aoMap[(by + py) * width + (bx + px)] *= 0.90;
        }
      }
    }
  };

  // Hat shadow on head
  applyOverlapShadow(32, 0, 32, 16, 0, 0);
  // Jacket shadow on torso
  if (height >= 64) {
    applyOverlapShadow(16, 32, 24, 16, 16, 16);
    applyOverlapShadow(40, 32, 16, 16, 40, 16); // Right sleeve
    applyOverlapShadow(0, 32, 16, 16, 0, 16);   // Right pants
    applyOverlapShadow(0, 48, 16, 16, 16, 48);  // Left pants
    applyOverlapShadow(48, 48, 16, 16, 32, 48); // Left sleeve
  }

  // Shift hue helper in degrees
  const shiftHue = (currentH: number, targetH: number, maxShiftDeg: number): number => {
    let diff = (targetH - currentH + 360) % 360;
    if (diff > 180) diff -= 360;
    const shift = Math.sign(diff) * Math.min(Math.abs(diff), maxShiftDeg);
    return (currentH + shift + 360) % 360;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pIdx = idx * 4;

      if (!isOpaque(x, y)) {
        outData[pIdx + 3] = 0;
        continue;
      }

      const origR = data[pIdx];
      const origG = data[pIdx + 1];
      const origB = data[pIdx + 2];

      const lab = rgbToOKLab(origR, origG, origB);
      const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
      let H = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
      if (H < 0) H += 360;
      const L = lab.L;

      // Normal vector of cuboid face
      const Nx = normalField.nx[idx];
      const Ny = normalField.ny[idx];
      const Nz = normalField.nz[idx];

      // 1. Half-Lambert Directional Shading
      const NdotL = Nx * Lx + Ny * Ly + Nz * Lz;
      const directionalFactor = Math.pow(Math.max(0, (NdotL + 0.5) / 1.5), 1.15);

      // 2. Anatomical Ambient Occlusion
      const ao = 1.0 - (1.0 - aoMap[idx]) * cavityStr;

      // 3. Anatomical Sky Lighting (Calculated per UV island based on 3D face orientation)
      const skyFactor = normalField.sky ? normalField.sky[idx] : 1.0;

      // Total continuous lighting multiplier
      const totalFactor = directionalFactor * ao * skyFactor * (brightness * 0.95);

      let newL: number;
      let newC: number;
      let newH: number;

      const matType = normalField.material ? normalField.material[idx] : 0;

      if (matType === 2) {
        // --- 1. EYE PROTECTION (Head Front Eye Row) ---
        const eyeFactor = 1.0 + (totalFactor - 1.0) * 0.10;
        newH = H;
        newL = Math.max(0.05, Math.min(0.99, L + (eyeFactor - 1.0) * 0.08));
        newC = C;
      } else if (matType === 1) {
        // --- 2. FABRIC / CLOTHING OVERLAY ---
        if (totalFactor >= 1.0) {
          const intensity = Math.min(1.0, (totalFactor - 1.0) * 0.70);
          newH = shiftHue(H, 65, intensity * 8);
          newL = Math.min(0.99, L + intensity * (0.99 - L) * 0.20);
          newC = Math.min(0.35, C * (1.0 + intensity * 0.04));
        } else {
          const intensity = Math.min(1.0, (1.0 - totalFactor) * 0.75);
          newH = shiftHue(H, 260, intensity * 10);
          newL = Math.max(0.20, L - intensity * L * 0.22);
          newC = Math.min(0.35, C * (1.0 + intensity * 0.06));
        }
      } else {
        // --- 3. SKIN / ORGANIC BASE LAYER ---
        if (totalFactor >= 1.0) {
          const intensity = Math.min(1.0, (totalFactor - 1.0) * 1.4);
          newH = shiftHue(H, 65, intensity * 26);
          newL = Math.min(0.98, L + intensity * (0.98 - L) * 0.48);
          newC = Math.min(0.35, C * (1.0 + intensity * 0.15));
        } else {
          const intensity = Math.min(1.0, (1.0 - totalFactor) * 1.5);
          newH = shiftHue(H, 260, intensity * 24);
          newL = Math.max(0.12, L - intensity * L * 0.42);
          newC = Math.min(0.35, C * (1.0 + intensity * 0.20));
        }
      }

      const hRad = (newH * Math.PI) / 180;
      const targetA = newC * Math.cos(hRad);
      const targetB = newC * Math.sin(hRad);
      const rgb = okLabToRGB(newL, targetA, targetB);

      outData[pIdx] = rgb.r;
      outData[pIdx + 1] = rgb.g;
      outData[pIdx + 2] = rgb.b;
      outData[pIdx + 3] = data[pIdx + 3];
    }
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outputCanvas;
}
