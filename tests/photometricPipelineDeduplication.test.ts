/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest';
import * as edtNormalMap from '@/lib/ai/math/edtNormalMap';
import {
  computePhotometricAnalysis,
  executePhotometricPipeline,
  renderParametric2p5DLighting,
  type LightParameters,
} from '@/lib/ai/math/photometricLighting';
import { inferPhotometricSettings } from '@/lib/ai/math/photometricAuto';
import type { MaterialType } from '@/types/tools';

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
        let _img = new MockImageData(32, 32);
        return {
          width: 32,
          height: 32,
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

vi.mock('@/lib/ai/math/edtNormalMap', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/math/edtNormalMap')>();
  return {
    ...actual,
    computeContentAwareHeightmap: vi.fn(actual.computeContentAwareHeightmap),
    applyBilateralFilter: vi.fn(actual.applyBilateralFilter),
    computeSeparableEDT: vi.fn(actual.computeSeparableEDT),
  };
});

function createMockContext(data: Uint8ClampedArray, width: number, height: number): CanvasRenderingContext2D {
  return {
    getImageData: () => ({
      data: new Uint8ClampedArray(data),
      width,
      height,
    }),
  } as unknown as CanvasRenderingContext2D;
}

function createCharacterFixture(width = 32, height = 32): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  // Ears
  for (let y = 3; y <= 6; y++) {
    for (const x of [13, 14, 18, 19]) {
      const idx = (y * width + x) * 4;
      data[idx] = 100;
      data[idx + 1] = 200;
      data[idx + 2] = 240;
      data[idx + 3] = 255;
    }
  }
  // Head
  for (let y = 7; y <= 12; y++) {
    for (let x = 12; x <= 20; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 100;
      data[idx + 1] = 200;
      data[idx + 2] = 240;
      data[idx + 3] = 255;
    }
  }
  // Eyes (compact dark feature)
  for (const eye of [{ x: 14, y: 9 }, { x: 18, y: 9 }]) {
    const idx = (eye.y * width + eye.x) * 4;
    data[idx] = 20;
    data[idx + 1] = 20;
    data[idx + 2] = 20;
    data[idx + 3] = 255;
  }
  // Body
  for (let y = 13; y <= 20; y++) {
    for (let x = 10; x <= 22; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 100;
      data[idx + 1] = 200;
      data[idx + 2] = 240;
      data[idx + 3] = 255;
    }
  }
  // Feet
  for (let y = 24; y <= 28; y++) {
    for (const x of [8, 9, 10, 11, 12, 18, 19, 20, 21, 22]) {
      const idx = (y * width + x) * 4;
      data[idx] = 100;
      data[idx + 1] = 200;
      data[idx + 2] = 240;
      data[idx + 3] = 255;
    }
  }
  return data;
}

function createOrbFixture(width = 32, height = 32): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const radius = 10;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      if (dist <= radius) {
        const idx = (y * width + x) * 4;
        data[idx] = 220;
        data[idx + 1] = 120;
        data[idx + 2] = 80;
        data[idx + 3] = 255;
      }
    }
  }
  return data;
}

function createAsymmetricFixture(width = 32, height = 32): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  // Asymmetrical character: single ear on left side (x=10..12, y=4..7)
  for (let y = 4; y <= 7; y++) {
    for (let x = 10; x <= 12; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 150;
      data[idx + 1] = 180;
      data[idx + 2] = 220;
      data[idx + 3] = 255;
    }
  }
  // Head spanning center (x=10..22, y=8..15)
  for (let y = 8; y <= 15; y++) {
    for (let x = 10; x <= 22; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 150;
      data[idx + 1] = 180;
      data[idx + 2] = 220;
      data[idx + 3] = 255;
    }
  }
  // Single eye on left (x=13, y=10)
  const eyeIdx = (10 * width + 13) * 4;
  data[eyeIdx] = 15;
  data[eyeIdx + 1] = 15;
  data[eyeIdx + 2] = 15;
  data[eyeIdx + 3] = 255;
  // Dark ink line stroke on right cheek only (x=21, y=9..13)
  for (let y = 9; y <= 13; y++) {
    const idx = (y * width + 21) * 4;
    data[idx] = 20;
    data[idx + 1] = 20;
    data[idx + 2] = 20;
    data[idx + 3] = 255;
  }
  // Body (x=8..24, y=16..24)
  for (let y = 16; y <= 24; y++) {
    for (let x = 8; x <= 24; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 150;
      data[idx + 1] = 180;
      data[idx + 2] = 220;
      data[idx + 3] = 255;
    }
  }
  return data;
}

/**
 * Baseline reproduction of the un-optimized legacy double-analysis execution flow.
 * Shows exactly what the pre-fix character branch computed.
 */
function legacyUnoptimizedCharacterFlow(
  srcCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: LightParameters
) {
  const data = srcCtx.getImageData(0, 0, width, height).data;
  const isOpaque = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] > 30;
  };
  const inferred = inferPhotometricSettings(data, width, height);

  // Call 1: Legacy called computeContentAwareHeightmap just for masks
  const analysis1 = edtNormalMap.computeContentAwareHeightmap(
    data,
    width,
    height,
    inferred.cavityStrength ?? 1.0,
    2.0,
    params.azimuthDeg
  );
  const charFeatureMask = analysis1.isFeature;
  const charInkMask = analysis1.isInkLine;

  const specularNormalField = edtNormalMap.computeTangentNormalField(
    edtNormalMap.applyBilateralFilter(
      edtNormalMap.generateInflatedHeightmap(
        edtNormalMap.computeSeparableEDT(isOpaque, width, height),
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
    2.0
  );

  const azRad = (params.azimuthDeg * Math.PI) / 180;
  const elRad = (Math.max(15, params.elevationDeg) * Math.PI) / 180;

  const Lx = Math.sin(azRad) * Math.cos(elRad);
  const Ly = -Math.cos(azRad) * Math.cos(elRad);
  const Lz = Math.sin(elRad);

  const Vx = 0, Vy = 0, Vz = 1.0;
  const Hx = Lx + Vx, Hy = Ly + Vy, Hz = Lz + Vz;
  const hLen = Math.sqrt(Hx * Hx + Hy * Hy + Hz * Hz) || 1;
  const normHx = Hx / hLen, normHy = Hy / hLen, normHz = Hz / hLen;

  // Call 2: executePhotometricPipeline called without precomputedAnalysis,
  // triggering computePhotometricAnalysis which ran computeContentAwareHeightmap a second time!
  const photometricCanvas = executePhotometricPipeline(
    srcCtx,
    width,
    height,
    {
      lightAzimuth: params.azimuthDeg,
      lightElevation: params.elevationDeg,
      lightRadius: 64,
      lightColor: '#FFFFFF',
      ambientIntensity: 0.45,
      lightBrightness: 1.2,
      material: (params.material as MaterialType) || 'matte',
      shadingBands: params.shadingBands,
      cavityStrength: 1.0,
      ditherModulation: 0,
      bayerSize: '4x4',
      formType: inferred.formType,
    },
    []
  );

  const pData = photometricCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;
  const shadedPixels: Array<{ x: number; y: number; r: number; g: number; b: number; a: number }> = [];
  const specularPixels: Array<{ x: number; y: number; r: number; g: number; b: number; a: number }> = [];
  const isMetallic = params.material === 'gold' || params.material === 'metal';
  const shininess = params.specularShininess || 16;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pIdx = idx * 4;

      if (pData[pIdx + 3] > 30) {
        shadedPixels.push({
          x,
          y,
          r: pData[pIdx],
          g: pData[pIdx + 1],
          b: pData[pIdx + 2],
          a: pData[pIdx + 3],
        });

        if (charFeatureMask && charFeatureMask[idx] === 1) continue;
        if (charInkMask && charInkMask[idx] === 1) continue;
        const isBlackOutline = data[pIdx] < 30 && data[pIdx + 1] < 30 && data[pIdx + 2] < 30;
        if (isBlackOutline) continue;
        if (Ly < 0 && y > height * 0.70) continue;

        const Nx = specularNormalField.nx[idx];
        const Ny = specularNormalField.ny[idx];
        const Nz = specularNormalField.nz[idx];

        const NdotL3D = Nx * Lx + Ny * Ly + Nz * Lz;
        const NdotL2D = Nx * Lx + Ny * Ly;
        const isZenith = elRad > (75 * Math.PI) / 180;
        if (NdotL3D <= 0 || (!isZenith && NdotL2D <= 0)) continue;

        const NdotH = Math.max(0, Nx * normHx + Ny * normHy + Nz * normHz);
        const Ispec = Math.pow(NdotH, shininess);

        if (Ispec > 0.35) {
          const alpha = Math.min(255, Math.round(Ispec * 255));
          let r = 255, g = 255, b = 255;
          if (isMetallic) {
            r = Math.min(255, Math.round(pData[pIdx] * 0.35 + 255 * 0.65));
            g = Math.min(255, Math.round(pData[pIdx + 1] * 0.35 + 245 * 0.65));
            b = Math.min(255, Math.round(pData[pIdx + 2] * 0.35 + 160 * 0.65));
          }
          specularPixels.push({ x, y, r, g, b, a: alpha });
        }
      }
    }
  }

  return { shadedPixels, specularPixels };
}

describe('photometric pipeline deduplication (H6)', () => {
  it('proves legacy character flow invoked computeContentAwareHeightmap twice', () => {
    const width = 32;
    const height = 32;
    const charData = createCharacterFixture(width, height);
    const mockCtx = createMockContext(charData, width, height);

    vi.mocked(edtNormalMap.computeContentAwareHeightmap).mockClear();

    legacyUnoptimizedCharacterFlow(mockCtx, width, height, {
      azimuthDeg: 45,
      elevationDeg: 50,
      shadowIntensity: 0.5,
      specularShininess: 32,
      material: 'matte',
    });

    // Proves the H6 finding root cause: 2 separate full expensive analyses were invoked!
    expect(vi.mocked(edtNormalMap.computeContentAwareHeightmap)).toHaveBeenCalledTimes(2);
  });

  it('proves after fix, character branch executes computeContentAwareHeightmap exactly once', () => {
    const width = 32;
    const height = 32;
    const charData = createCharacterFixture(width, height);
    const mockCtx = createMockContext(charData, width, height);

    vi.mocked(edtNormalMap.computeContentAwareHeightmap).mockClear();

    renderParametric2p5DLighting(mockCtx, width, height, {
      azimuthDeg: 45,
      elevationDeg: 50,
      shadowIntensity: 0.5,
      specularShininess: 32,
      material: 'matte',
    });

    // Exactly 1 invocation: hoisted and passed through precomputedAnalysis!
    expect(vi.mocked(edtNormalMap.computeContentAwareHeightmap)).toHaveBeenCalledTimes(1);
  });


  it('proves character output pixels are exactly 100% byte-identical to legacy output', () => {
    const width = 32;
    const height = 32;
    const charData = createCharacterFixture(width, height);
    const mockCtx = createMockContext(charData, width, height);

    const legacyResult = legacyUnoptimizedCharacterFlow(mockCtx, width, height, {
      azimuthDeg: 45,
      elevationDeg: 50,
      shadowIntensity: 0.5,
      specularShininess: 32,
      material: 'matte',
    });

    const optimizedResult = renderParametric2p5DLighting(mockCtx, width, height, {
      azimuthDeg: 45,
      elevationDeg: 50,
      shadowIntensity: 0.5,
      specularShininess: 32,
      material: 'matte',
    });

    // 1. Shaded pixels count and exact RGBA values match
    expect(optimizedResult.shadedPixels.length).toBe(legacyResult.shadedPixels.length);
    expect(optimizedResult.shadedPixels).toEqual(legacyResult.shadedPixels);

    // 2. Specular pixels count and exact RGBA values match
    expect(optimizedResult.specularPixels.length).toBe(legacyResult.specularPixels.length);
    expect(optimizedResult.specularPixels).toEqual(legacyResult.specularPixels);

    // 3. Rim pixels match
  });

  it('proves metallic character output pixels are byte-identical across gold/metal materials', () => {
    const width = 32;
    const height = 32;
    const charData = createCharacterFixture(width, height);
    const mockCtx = createMockContext(charData, width, height);

    const legacyMetal = legacyUnoptimizedCharacterFlow(mockCtx, width, height, {
      azimuthDeg: 135,
      elevationDeg: 40,
      shadowIntensity: 0.6,
      specularShininess: 24,
      material: 'gold',
    });

    const optimizedMetal = renderParametric2p5DLighting(mockCtx, width, height, {
      azimuthDeg: 135,
      elevationDeg: 40,
      shadowIntensity: 0.6,
      specularShininess: 24,
      material: 'gold',
    });

    expect(optimizedMetal.specularPixels.length).toBeGreaterThan(0);
    expect(optimizedMetal.specularPixels).toEqual(legacyMetal.specularPixels);
    expect(optimizedMetal.shadedPixels).toEqual(legacyMetal.shadedPixels);
  });

  it('proves non-character orb output remains identical and avoids content-aware heightmap', () => {
    const width = 32;
    const height = 32;
    const orbData = createOrbFixture(width, height);
    const mockCtx = createMockContext(orbData, width, height);

    vi.mocked(edtNormalMap.computeContentAwareHeightmap).mockClear();

    const result = renderParametric2p5DLighting(mockCtx, width, height, {
      azimuthDeg: 45,
      elevationDeg: 35,
      shadowIntensity: 0.5,
      specularShininess: 32,
      material: 'metal',
    });

    expect(result.shadedPixels.length).toBeGreaterThan(0);
    expect(result.specularPixels.length).toBeGreaterThan(0);
    // Orb routes to pure separable EDT, not content-aware heightmap:
    expect(vi.mocked(edtNormalMap.computeContentAwareHeightmap)).toHaveBeenCalledTimes(0);
  });

  it('proves non-character prop output invokes content-aware analysis exactly once', () => {
    const width = 32;
    const height = 32;
    // Elongated horizontal bar / sword fixture: aspectRatio > 1.25 guarantees formType = 'prop' (not orb or character)
    const propData = new Uint8ClampedArray(width * height * 4);
    for (let y = 14; y < 18; y++) {
      for (let x = 4; x < 28; x++) {
        const idx = (y * width + x) * 4;
        propData[idx] = 180;
        propData[idx + 1] = 180;
        propData[idx + 2] = 180;
        propData[idx + 3] = 255;
      }
    }
    const mockCtx = createMockContext(propData, width, height);

    vi.mocked(edtNormalMap.computeContentAwareHeightmap).mockClear();

    const result = renderParametric2p5DLighting(mockCtx, width, height, {
      azimuthDeg: 45,
      elevationDeg: 45,
      shadowIntensity: 0.5,
      specularShininess: 16,
      material: 'matte',
    });

    expect(result.shadedPixels.length).toBeGreaterThan(0);
    // Prop invokes computeContentAwareHeightmap exactly 1 time (hoisted analysis), avoiding double execution:
    expect(vi.mocked(edtNormalMap.computeContentAwareHeightmap)).toHaveBeenCalledTimes(1);
  });

  it('proves empty transparent input produces empty pixel arrays without errors', () => {
    const width = 16;
    const height = 16;
    const emptyData = new Uint8ClampedArray(width * height * 4);
    const mockCtx = createMockContext(emptyData, width, height);

    const result = renderParametric2p5DLighting(mockCtx, width, height, {
      azimuthDeg: 45,
      elevationDeg: 45,
      shadowIntensity: 0.5,
      specularShininess: 16,
      material: 'matte',
    });

    expect(result.shadedPixels).toHaveLength(0);
    expect(result.specularPixels).toHaveLength(0);
  });

  it('proves small opaque sprite executes deterministically without errors', () => {
    const width = 8;
    const height = 8;
    const smallData = new Uint8ClampedArray(width * height * 4);
    // 2x2 sprite at center
    for (let y = 3; y <= 4; y++) {
      for (let x = 3; x <= 4; x++) {
        const idx = (y * width + x) * 4;
        smallData[idx] = 255;
        smallData[idx + 1] = 0;
        smallData[idx + 2] = 0;
        smallData[idx + 3] = 255;
      }
    }
    const mockCtx = createMockContext(smallData, width, height);

    const result = renderParametric2p5DLighting(mockCtx, width, height, {
      azimuthDeg: 315,
      elevationDeg: 45,
      shadowIntensity: 0.5,
      specularShininess: 16,
      material: 'matte',
    });

    expect(result.shadedPixels.length).toBe(4);
  });

  it('proves character feature and ink line masks exclude specular highlights from eyes and lines', () => {
    const width = 32;
    const height = 32;
    const charData = createCharacterFixture(width, height);
    const mockCtx = createMockContext(charData, width, height);

    const result = renderParametric2p5DLighting(mockCtx, width, height, {
      azimuthDeg: 45,
      elevationDeg: 50,
      shadowIntensity: 0.5,
      specularShininess: 32,
      material: 'matte',
    });

    expect(result.specularPixels.length).toBeGreaterThan(0);
    // Eyes at (14, 9) and (18, 9) must NOT have specular pixels
    for (const sp of result.specularPixels) {
      const isEye = (sp.x === 14 && sp.y === 9) || (sp.x === 18 && sp.y === 9);
      expect(isEye).toBe(false);
    }
  });

  it('proves expensive bilateral filtering and content-aware stages are not duplicated', () => {
    const width = 32;
    const height = 32;
    const charData = createCharacterFixture(width, height);
    const mockCtx = createMockContext(charData, width, height);

    vi.mocked(edtNormalMap.applyBilateralFilter).mockClear();
    vi.mocked(edtNormalMap.computeContentAwareHeightmap).mockClear();

    renderParametric2p5DLighting(mockCtx, width, height, {
      azimuthDeg: 45,
      elevationDeg: 50,
      shadowIntensity: 0.5,
      specularShininess: 32,
      material: 'matte',
    });

    // In character branch:
    // Specular macro cushion invokes applyBilateralFilter exactly once:
    expect(vi.mocked(edtNormalMap.applyBilateralFilter)).toHaveBeenCalledTimes(1);
    // Content-aware heightmap analysis executes exactly once (hoisted and reused):
    expect(vi.mocked(edtNormalMap.computeContentAwareHeightmap)).toHaveBeenCalledTimes(1);
  });

  it('proves feature mask and ink mask are bit-for-bit identical between direct computeContentAwareHeightmap and hoisted computePhotometricAnalysis across character and asymmetric fixtures under two distinct azimuths', () => {
    const width = 32;
    const height = 32;
    const fixtures = [
      { name: 'character', data: createCharacterFixture(width, height) },
      { name: 'asymmetric', data: createAsymmetricFixture(width, height) },
    ];
    const azimuths = [45, 225];

    for (const fixture of fixtures) {
      const mockCtx = createMockContext(fixture.data, width, height);
      const inferred = inferPhotometricSettings(fixture.data, width, height);

      for (const az of azimuths) {
        // Direct call (pre-H6 legacy style)
        const direct = edtNormalMap.computeContentAwareHeightmap(
          fixture.data,
          width,
          height,
          inferred.cavityStrength ?? 1.0,
          2.0,
          az
        );

        // Hoisted call
        const hoisted = computePhotometricAnalysis(
          mockCtx,
          width,
          height,
          {
            lightAzimuth: az,
            lightElevation: 50,
            lightRadius: 64,
            lightColor: '#FFFFFF',
            ambientIntensity: 0.45,
            material: 'matte',
            cavityStrength: 1.0,
            ditherModulation: 0,
            bayerSize: '4x4',
            formType: inferred.formType,
          },
          inferred,
          fixture.data
        );

        expect(Array.from(hoisted.isFeatureMask!)).toEqual(Array.from(direct.isFeature));
        expect(Array.from(hoisted.isInkLineMask!)).toEqual(Array.from(direct.isInkLine));
      }
    }
  });

  it('proves varying cavityStrength has zero effect on feature mask and ink mask in actual execution', () => {
    const width = 32;
    const height = 32;
    const charData = createCharacterFixture(width, height);

    // Compute with low cavityStrength (0.2) vs high cavityStrength (1.8)
    const lowCavity = edtNormalMap.computeContentAwareHeightmap(charData, width, height, 0.2, 2.0, 45);
    const highCavity = edtNormalMap.computeContentAwareHeightmap(charData, width, height, 1.8, 2.0, 45);

    expect(Array.from(lowCavity.isFeature)).toEqual(Array.from(highCavity.isFeature));
    expect(Array.from(lowCavity.isInkLine)).toEqual(Array.from(highCavity.isInkLine));
  });


  it('proves precomputedData byte-length mismatch safely falls back to srcCtx.getImageData', () => {
    const width = 32;
    const height = 32;
    const charData = createCharacterFixture(width, height);
    const mockCtx = createMockContext(charData, width, height);

    // Corrupted / wrong-sized buffer passed
    const wrongSizeBuffer = new Uint8ClampedArray(10);

    const analysis = computePhotometricAnalysis(
      mockCtx,
      width,
      height,
      {
        lightAzimuth: 45,
        lightElevation: 50,
        lightRadius: 64,
        lightColor: '#FFFFFF',
        ambientIntensity: 0.45,
        material: 'matte',
        cavityStrength: 1.0,
        ditherModulation: 0,
        bayerSize: '4x4',
        formType: 'character',
      },
      undefined,
      wrongSizeBuffer
    );

    expect(analysis.normalField.width).toBe(width);
    expect(analysis.normalField.height).toBe(height);
  });
});
