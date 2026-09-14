/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { computeContentAwareHeightmap } from '@/lib/ai/math/edtNormalMap';
import {
  executePhotometricPipeline,
  computePhotometricAnalysis,
} from '@/lib/ai/math/photometricLighting';

class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

if (typeof (globalThis as unknown as { document?: unknown }).document === 'undefined') {
  (globalThis as unknown as { document: unknown }).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        let _img = new MockImageData(48, 64);
        return {
          width: 48,
          height: 64,
          getContext: () => ({
            createImageData: (w: number, h: number) => {
              _img = new MockImageData(w, h);
              return _img;
            },
            putImageData: (img: MockImageData) => {
              _img = img;
            },
            getImageData: () => _img,
          }),
        };
      }
      return {};
    },
  };
}

function makeData(
  width: number,
  height: number,
  filler: (x: number, y: number) => [number, number, number, number] | null
): Uint8ClampedArray {
  const arr = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const col = filler(x, y);
      if (col) {
        const p = (y * width + x) * 4;
        arr[p] = col[0];
        arr[p + 1] = col[1];
        arr[p + 2] = col[2];
        arr[p + 3] = col[3];
      }
    }
  }
  return arr;
}

/**
 * Builds a 48x64 character sprite matching the user's blue furry character with:
 * - Top drooping ears
 * - Head with facial features (eyes, snout)
 * - Chin / jawline outline stroke separating head from body
 * - Recessed throat / neck constriction
 * - Torso chest
 * - Left and right arms separated from the torso by longitudinal arm seam strokes
 */
function createFullBodyCharacterArt(): Uint8ClampedArray {
  const width = 48;
  const height = 64;

  const BLUE_BODY: [number, number, number, number] = [85, 150, 235, 255];
  const BLACK_INK: [number, number, number, number] = [0, 0, 0, 255];
  const WHITE_FEATURE: [number, number, number, number] = [245, 248, 255, 255];
  const DARK_SNOUT: [number, number, number, number] = [20, 25, 35, 255];

  return makeData(width, height, (x, y) => {
    // 1. Drooping Ears (x: 6..14 and 33..41, y: 8..22)
    if ((x >= 6 && x <= 14 && y >= 8 && y <= 22) || (x >= 33 && x <= 41 && y >= 8 && y <= 22)) {
      const isLeftEarOutline = x === 6 || x === 14 || y === 8 || y === 22;
      const isRightEarOutline = x === 33 || x === 41 || y === 8 || y === 22;
      if (isLeftEarOutline || isRightEarOutline) return BLACK_INK;
      return BLUE_BODY;
    }

    // 2. Head (x: 12..35, y: 10..28)
    if (x >= 12 && x <= 35 && y >= 10 && y <= 28) {
      // Head outer outline (top and cheeks)
      if (y === 10 || x === 12 || x === 35) return BLACK_INK;

      // Chin / jawline stroke at y = 28
      if (y === 28) return BLACK_INK;

      // Left Eye at (18, 18)
      if (x === 18 && y === 18) return WHITE_FEATURE;

      // Right Eye at (29, 18)
      if (x === 29 && y === 18) return WHITE_FEATURE;

      // Snout / nose at (23..24, 22..23)
      if ((x === 23 || x === 24) && (y === 22 || y === 23)) return DARK_SNOUT;

      return BLUE_BODY;
    }

    // 3. Neck & Torso & Arms (x: 10..37, y: 29..56)
    if (x >= 10 && x <= 37 && y >= 29 && y <= 56) {
      // Outer body silhouette outline (left flank, right flank, bottom waist)
      if (x === 10 || x === 37 || y === 56) return BLACK_INK;

      // Longitudinal Arm Seam Strokes:
      // Left arm seam at x = 16 running from y = 33..54
      if (x === 16 && y >= 33 && y <= 54) return BLACK_INK;

      // Right arm seam at x = 31 running from y = 33..54
      if (x === 31 && y >= 33 && y <= 54) return BLACK_INK;

      // White chest marking at (23..24, 38..44)
      if ((x === 23 || x === 24) && y >= 38 && y <= 44) return WHITE_FEATURE;

      return BLUE_BODY;
    }

    return null;
  });
}

describe('Phase 61: Anatomical Part Decomposition & Volumetric Character Shading', () => {
  it('identifies character anatomy: head dome, chin depth step, chest barrel, and arm cylinders', () => {
    const data = createFullBodyCharacterArt();
    const width = 48;
    const height = 64;

    const analysis = computeContentAwareHeightmap(data, width, height);

    // 1. Chin depth step: chin flesh at y=26..27 is elevated above recessed neck/throat at y=30
    const chinFleshIdx = 26 * width + 24;
    const throatCenterIdx = 30 * width + 24;
    const chestCenterIdx = 42 * width + 24;

    expect(analysis.smoothHeightmap[chinFleshIdx]).toBeGreaterThan(analysis.smoothHeightmap[throatCenterIdx]);

    // 2. Downward chin normals: Ny points downwards at the chin boundary (Ny > 0 in screen space where y increases down)
    const chinBoundaryIdx = 28 * width + 24;
    expect(analysis.normalField.ny[chinBoundaryIdx]).toBeGreaterThan(0.0);

    // 3. Throat crevice AO: the neck under the chin is shadowed/occluded
    expect(analysis.cavityAO[throatCenterIdx]).toBeLessThan(0.48);

    // 4. Chest Horizontal Barrel Curvature:
    // Left chest flank (x=19, y=42) faces leftward (Nx < 0)
    // Right chest flank (x=28, y=42) faces rightward (Nx > 0)
    const leftChestIdx = 42 * width + 19;
    const rightChestIdx = 42 * width + 28;
    expect(analysis.normalField.nx[leftChestIdx]).toBeLessThan(-0.10);
    expect(analysis.normalField.nx[rightChestIdx]).toBeGreaterThan(0.10);

    // Chest center has horizontal peak height
    expect(analysis.smoothHeightmap[chestCenterIdx]).toBeGreaterThan(analysis.smoothHeightmap[leftChestIdx]);
    expect(analysis.smoothHeightmap[chestCenterIdx]).toBeGreaterThan(analysis.smoothHeightmap[rightChestIdx]);

    // 5. Arm Cylinders:
    // Left arm interior (x=13, y=42) has independent cylindrical curvature
    // Right arm interior (x=34, y=42) has independent cylindrical curvature
    const leftArmIdx = 42 * width + 13;
    const rightArmIdx = 42 * width + 34;
    const leftArmSeamIdx = 42 * width + 16;
    const rightArmSeamIdx = 42 * width + 31;

    // Arm seams are carved down lower than arm cylinders and chest barrel
    expect(analysis.smoothHeightmap[leftArmSeamIdx]).toBeLessThan(analysis.smoothHeightmap[leftArmIdx]);
    expect(analysis.smoothHeightmap[leftArmSeamIdx]).toBeLessThan(analysis.smoothHeightmap[chestCenterIdx]);
    expect(analysis.smoothHeightmap[rightArmSeamIdx]).toBeLessThan(analysis.smoothHeightmap[rightArmIdx]);
    expect(analysis.smoothHeightmap[rightArmSeamIdx]).toBeLessThan(analysis.smoothHeightmap[chestCenterIdx]);

    // Arm seams produce deep crevice ambient occlusion
    expect(analysis.cavityAO[leftArmSeamIdx]).toBeLessThan(0.45);
    expect(analysis.cavityAO[rightArmSeamIdx]).toBeLessThan(0.45);
  });

  it('sculpts 3D volumetric shading under studio light (317° azimuth, 81° elevation)', () => {
    const data = createFullBodyCharacterArt();
    const width = 48;
    const height = 64;

    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(data) }),
    } as unknown as CanvasRenderingContext2D;

    // Execute Photometric Pipeline with exact parameters from user screenshot (317° az, 81° el)
    const shadedCanvas = executePhotometricPipeline(
      mockCtx,
      width,
      height,
      {
        lightAzimuth: 317,
        lightElevation: 48,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.35,
        material: 'matte',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'character',
      },
      []
    );

    const outData = shadedCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;

    // 1. Throat under chin receives deep crevice tone
    const throatP = (30 * width + 24) * 4;
    const chestCenterP = (42 * width + 24) * 4;

    // The throat pixel is darker than the chest center (occlusion shadow under chin)
    expect(outData[throatP]).toBeLessThan(outData[chestCenterP]);

    // 2. Chest horizontal curvature creates directional contrast:
    // Left chest flank (x=18, y=42) faces top-left light (317°) -> lit base tone
    // Right chest flank (x=29, y=42) faces away -> stepped shadow tone
    const leftChestP = (42 * width + 18) * 4;
    const rightChestP = (42 * width + 29) * 4;
    expect(outData[leftChestP]).toBeGreaterThan(outData[rightChestP]);

    // 3. Facial features (snout) remain crisp and uncorrupted
    const snoutP = (22 * width + 23) * 4;
    expect(outData[snoutP]).toBe(20);
    expect(outData[snoutP + 1]).toBe(25);
    expect(outData[snoutP + 2]).toBe(35);
  });

  it('dynamically shifts chest terminator across horizontal barrel curvature when light rotates', () => {
    const data = createFullBodyCharacterArt();
    const width = 48;
    const height = 64;

    const mockCtx = {
      getImageData: () => ({ data: new Uint8ClampedArray(data) }),
    } as unknown as CanvasRenderingContext2D;

    const defaultParams = {
      lightRadius: 64,
      lightColor: '#FFFFFF',
      ambientIntensity: 0.35,
      material: 'matte' as const,
      cavityStrength: 1.0,
      ditherModulation: 0,
      bayerSize: '4x4' as const,
      formType: 'character' as const,
    };

    // Precompute analysis once to simulate interactive drag
    const analysis = computePhotometricAnalysis(mockCtx, width, height, {
      ...defaultParams,
      lightAzimuth: 315,
      lightElevation: 50,
    });

    // Top-Left Light (315°): Left flank is lit, right flank is in shadow
    const canvasLeft = executePhotometricPipeline(
      mockCtx,
      width,
      height,
      {
        ...defaultParams,
        lightAzimuth: 315,
        lightElevation: 50,
        precomputedAnalysis: analysis,
      },
      []
    );
    const outLeft = canvasLeft.getContext('2d')!.getImageData(0, 0, width, height).data;

    // Top-Right Light (45°): Right flank is lit, left flank is in shadow
    const canvasRight = executePhotometricPipeline(
      mockCtx,
      width,
      height,
      {
        ...defaultParams,
        lightAzimuth: 45,
        lightElevation: 50,
        precomputedAnalysis: analysis,
      },
      []
    );
    const outRight = canvasRight.getContext('2d')!.getImageData(0, 0, width, height).data;

    const leftChestP = (42 * width + 18) * 4;
    const rightChestP = (42 * width + 29) * 4;

    // When light is on left (315°), left chest is brighter than right chest
    expect(outLeft[leftChestP]).toBeGreaterThan(outLeft[rightChestP]);

    // When light is rotated to right (45°), right chest is brighter than left chest
    expect(outRight[rightChestP]).toBeGreaterThan(outRight[leftChestP]);
  });
});
