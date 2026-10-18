import { describe, it, expect, beforeEach } from 'vitest';
import {
  phaseHG2D,
  evaluateDielectricFresnel,
  computeAnisotropicTangentField,
  executeVolumetricOpticalPipeline,
  computeTangentNormalField,
  snapToGemstoneFacets,
  cleanOrphanPixelConfetti,
} from '@/lib/graphics/smartMathEngine';
import { VolumetricOpticsParams } from '@/types/tools';

interface ImageDataShim {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

class FakeImageData implements ImageDataShim {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

function parseHex(hex: string): [number, number, number, number] {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 255];
}

function makeMockCanvas(width: number, height: number) {
  const _imageData = new FakeImageData(width, height);
  const ctx = {
    imageSmoothingEnabled: false,
    fillStyle: '#000000',
    fillRect: (x: number, y: number, w: number, h: number) => {
      const rgba = parseHex(String(ctx.fillStyle));
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          const i = (py * width + px) * 4;
          _imageData.data[i] = rgba[0];
          _imageData.data[i + 1] = rgba[1];
          _imageData.data[i + 2] = rgba[2];
          _imageData.data[i + 3] = rgba[3];
        }
      }
    },
    getImageData: () => _imageData,
    createImageData: (w: number, h: number) => new FakeImageData(w, h),
    putImageData: (data: FakeImageData) => {
      for (let i = 0; i < _imageData.data.length; i++) {
        _imageData.data[i] = data.data[i];
      }
    },
  };

  const canvas = {
    width,
    height,
    getContext: () => ctx,
  };

  return { canvas, ctx, _imageData };
}

describe('2D volumetric optics engine', () => {
  beforeEach(() => {
    // Install global document mock for canvas creation
    (globalThis as unknown as { document: unknown }).document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return makeMockCanvas(16, 16).canvas;
        }
        return {};
      },
    };
  });

  describe('phaseHG2D (Henyey-Greenstein 2D Phase Function)', () => {
    it('returns isotropic constant radiance when g = 0', () => {
      const pForward = phaseHG2D(1.0, 0);
      const pPerp = phaseHG2D(0.0, 0);
      const pBack = phaseHG2D(-1.0, 0);

      expect(pForward).toBeCloseTo(1.0 / (2 * Math.PI), 4);
      expect(pPerp).toBeCloseTo(1.0 / (2 * Math.PI), 4);
      expect(pBack).toBeCloseTo(1.0 / (2 * Math.PI), 4);
    });

    it('peaks in forward direction when g > 0 (forward scattering)', () => {
      const g = 0.75;
      const forward = phaseHG2D(1.0, g);
      const perp = phaseHG2D(0.0, g);
      const back = phaseHG2D(-1.0, g);

      expect(forward).toBeGreaterThan(perp);
      expect(perp).toBeGreaterThan(back);
    });

    it('peaks in backward direction when g < 0 (backscattering)', () => {
      const g = -0.6;
      const forward = phaseHG2D(1.0, g);
      const back = phaseHG2D(-1.0, g);

      expect(back).toBeGreaterThan(forward);
    });

    it('maintains numerical stability and finite numbers near singularity (g -> 0.95, cosTheta -> 1.0)', () => {
      const val = phaseHG2D(1.0, 0.95);
      expect(Number.isFinite(val)).toBe(true);
      expect(val).toBeGreaterThan(0);
    });
  });

  describe('evaluateDielectricFresnel (Dielectric Schlick Fresnel & Cauchy Dispersion)', () => {
    it('calculates higher reflectance at grazing angles than normal incidence', () => {
      const normalIncidence = evaluateDielectricFresnel(1.0, 1.5, 0.0, 0.0, 5.0);
      const grazingIncidence = evaluateDielectricFresnel(0.05, 1.5, 0.0, 0.0, 5.0);

      expect(grazingIncidence[0]).toBeGreaterThan(normalIncidence[0]);
      expect(grazingIncidence[1]).toBeGreaterThan(normalIncidence[1]);
      expect(grazingIncidence[2]).toBeGreaterThan(normalIncidence[2]);
    });

    it('splits RGB channels with Cauchy chromatic dispersion (Blue > Green > Red IOR)', () => {
      const dispersion = 0.04;
      const [fR, fG, fB] = evaluateDielectricFresnel(1.0, 1.7, dispersion, 0.0, 5.0);

      // Higher IOR means higher F0 reflectance
      expect(fB).toBeGreaterThan(fG);
      expect(fG).toBeGreaterThan(fR);
    });

    it('modulates grazing angle power falloff with tunable exponent', () => {
      const softFresnel = evaluateDielectricFresnel(0.5, 1.5, 0.0, 0.0, 2.0);
      const sharpFresnel = evaluateDielectricFresnel(0.5, 1.5, 0.0, 0.0, 6.0);

      // Lower exponent keeps more intensity at 45 degrees
      expect(softFresnel[0]).toBeGreaterThan(sharpFresnel[0]);
    });
  });

  describe('computeAnisotropicTangentField (Directional & Curvature Tangents)', () => {
    it('generates normalized unit tangent vectors', () => {
      const w = 8;
      const h = 8;
      const heightmap = new Float32Array(w * h).fill(0.5);
      const normalField = computeTangentNormalField(heightmap, w, h, 1.0);

      const tangents = computeAnisotropicTangentField(normalField, w, h, 'vertical', 0);

      for (let i = 0; i < w * h; i++) {
        const len = Math.sqrt(tangents.tx[i] * tangents.tx[i] + tangents.ty[i] * tangents.ty[i]);
        expect(len).toBeCloseTo(1.0, 3);
      }
    });

    it('rotates tangent vectors when an angle offset is applied', () => {
      const w = 4;
      const h = 4;
      const heightmap = new Float32Array(w * h).fill(0.5);
      const normalField = computeTangentNormalField(heightmap, w, h, 1.0);

      const baseTangents = computeAnisotropicTangentField(normalField, w, h, 'vertical', 0);
      const rotatedTangents = computeAnisotropicTangentField(normalField, w, h, 'vertical', 90);

      // Vertical is (0, 1). Rotated 90 degrees becomes (-1, 0)
      expect(baseTangents.tx[0]).toBeCloseTo(0, 3);
      expect(baseTangents.ty[0]).toBeCloseTo(1, 3);

      expect(rotatedTangents.tx[0]).toBeCloseTo(-1, 3);
      expect(rotatedTangents.ty[0]).toBeCloseTo(0, 3);
    });
  });

  describe('executeVolumetricOpticalPipeline', () => {
    it('renders non-empty shaded output for gemstone preset', () => {
      const width = 16;
      const height = 16;
      const { ctx } = makeMockCanvas(width, height);

      // Draw a 8x8 circle / gem in center
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(4, 4, 8, 8);

      const params: VolumetricOpticsParams = {
        preset: 'gemstone',
        translucencyDepth: 8,
        fresnelPower: 4.5,
        anisoAngle: 45,
        anisoFlow: 'radial',
        lightAzimuth: 315,
        lightElevation: 45,
        lightColor: '#FFFFFF',
        paletteColors: ['#14532D', '#16A34A', '#4ADE80', '#DCFCE7'],
        ditherModulation: 0.35,
      };

      const resultCanvas = executeVolumetricOpticalPipeline(
        ctx as unknown as CanvasRenderingContext2D,
        width,
        height,
        params
      );
      expect(resultCanvas.width).toBe(width);
      expect(resultCanvas.height).toBe(height);

      const resCtx = resultCanvas.getContext('2d')!;
      const resData = resCtx.getImageData(0, 0, width, height).data;

      // Transparent outside (0, 0)
      expect(resData[3]).toBe(0);

      // Opaque inside (8, 8)
      const centerIdx = (8 * width + 8) * 4;
      expect(resData[centerIdx + 3]).toBe(255);
      expect(resData[centerIdx] + resData[centerIdx + 1] + resData[centerIdx + 2]).toBeGreaterThan(0);
    });

    it('renders hair anisotropic highlights with vertical flow', () => {
      const width = 16;
      const height = 16;
      const { ctx } = makeMockCanvas(width, height);

      ctx.fillStyle = '#9333EA';
      ctx.fillRect(4, 4, 8, 8);

      const params: VolumetricOpticsParams = {
        preset: 'hair',
        translucencyDepth: 6,
        fresnelPower: 3.5,
        anisoAngle: 0,
        anisoFlow: 'vertical',
        lightAzimuth: 270,
        lightElevation: 50,
        lightColor: '#FDE047',
        paletteColors: [],
        ditherModulation: 0.0,
      };

      const resultCanvas = executeVolumetricOpticalPipeline(
        ctx as unknown as CanvasRenderingContext2D,
        width,
        height,
        params
      );
      const resData = resultCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;

      const centerIdx = (8 * width + 8) * 4;
      expect(resData[centerIdx + 3]).toBe(255);
    });

    it('quantizes lighting into stepped cel-tones (2, 3, and 4 tones)', () => {
      const width = 16;
      const height = 16;
      const { ctx } = makeMockCanvas(width, height);

      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(2, 2, 12, 12);

      const baseParams: VolumetricOpticsParams = {
        preset: 'slime',
        translucencyDepth: 12,
        fresnelPower: 3.0,
        anisoAngle: 90,
        anisoFlow: 'curvature',
        lightAzimuth: 315,
        lightElevation: 45,
        lightColor: '#FFFFFF',
        paletteColors: ['#1E3A8A', '#2563EB', '#60A5FA', '#DBEAFE'],
        ditherModulation: 0.0,
      };

      const res2 = executeVolumetricOpticalPipeline(
        ctx as unknown as CanvasRenderingContext2D,
        width,
        height,
        { ...baseParams, celTones: 2 }
      );
      const res3 = executeVolumetricOpticalPipeline(
        ctx as unknown as CanvasRenderingContext2D,
        width,
        height,
        { ...baseParams, celTones: 3 }
      );
      const res4 = executeVolumetricOpticalPipeline(
        ctx as unknown as CanvasRenderingContext2D,
        width,
        height,
        { ...baseParams, celTones: 4 }
      );

      expect(res2.width).toBe(width);
      expect(res3.width).toBe(width);
      expect(res4.width).toBe(width);

      const data2 = res2.getContext('2d')!.getImageData(0, 0, width, height).data;
      const data3 = res3.getContext('2d')!.getImageData(0, 0, width, height).data;
      const data4 = res4.getContext('2d')!.getImageData(0, 0, width, height).data;

      // Count unique colors inside the 12x12 sprite
      const colors2 = new Set<string>();
      const colors3 = new Set<string>();
      const colors4 = new Set<string>();

      for (let y = 2; y < 14; y++) {
        for (let x = 2; x < 14; x++) {
          const idx = (y * width + x) * 4;
          colors2.add(`${data2[idx]},${data2[idx+1]},${data2[idx+2]}`);
          colors3.add(`${data3[idx]},${data3[idx+1]},${data3[idx+2]}`);
          colors4.add(`${data4[idx]},${data4[idx+1]},${data4[idx+2]}`);
        }
      }

      expect(colors2.size).toBeLessThanOrEqual(2);
      expect(colors3.size).toBeLessThanOrEqual(3);
      expect(colors4.size).toBeLessThanOrEqual(4);
    });

    it('preserves green crystal artwork colors without gray/purple corruption', () => {
      const width = 16;
      const height = 16;
      const { ctx } = makeMockCanvas(width, height);

      // Emerald green crystal (#10B981, RGB: 16, 185, 129)
      ctx.fillStyle = '#10B981';
      ctx.fillRect(2, 2, 12, 12);

      const params: VolumetricOpticsParams = {
        preset: 'gemstone',
        translucencyDepth: 8,
        fresnelPower: 4.5,
        anisoAngle: 45,
        anisoFlow: 'curvature',
        lightAzimuth: 315,
        lightElevation: 45,
        lightColor: '#FFFFFF',
        paletteColors: [], // Default when not forcing active palette
        ditherModulation: 0.0,
        celTones: 3,
      };

      const resultCanvas = executeVolumetricOpticalPipeline(
        ctx as unknown as CanvasRenderingContext2D,
        width,
        height,
        params
      );

      const resData = resultCanvas.getContext('2d')!.getImageData(0, 0, width, height).data;

      // Check all opaque crystal pixels
      let greenPixels = 0;
      let alabasterGrayPixels = 0;
      let wisteriaPurplePixels = 0;

      for (let y = 2; y < 14; y++) {
        for (let x = 2; x < 14; x++) {
          const idx = (y * width + x) * 4;
          const r = resData[idx];
          const g = resData[idx + 1];
          const b = resData[idx + 2];
          const a = resData[idx + 3];

          if (a > 0) {
            // Must be emerald/green hue: green channel strictly dominates red and blue
            if (g > r && g > b) {
              greenPixels++;
            }
            // Check that theme gray (#DDDFDF: ~221, 223, 223) is NEVER present
            if (Math.abs(r - 221) < 5 && Math.abs(g - 223) < 5 && Math.abs(b - 223) < 5) {
              alabasterGrayPixels++;
            }
            // Check that theme purple (#C792DF / #A86EC6) is NEVER present
            if (r > 150 && b > 180 && g < 160) {
              wisteriaPurplePixels++;
            }
          }
        }
      }

      expect(greenPixels).toBe(12 * 12);
      expect(alabasterGrayPixels).toBe(0);
      expect(wisteriaPurplePixels).toBe(0);
    });

    it('adapts gemstone SSS extinction to base hue (emerald transmits green, sapphire transmits blue)', () => {
      const width = 16;
      const height = 16;

      // 1. Emerald green gem (#059669: R:5, G:150, B:105)
      const { ctx: emeraldCtx } = makeMockCanvas(width, height);
      emeraldCtx.fillStyle = '#059669';
      emeraldCtx.fillRect(4, 4, 8, 8);

      const resEmerald = executeVolumetricOpticalPipeline(
        emeraldCtx as unknown as CanvasRenderingContext2D,
        width,
        height,
        {
          preset: 'gemstone',
          translucencyDepth: 10,
          fresnelPower: 4.5,
          anisoAngle: 0,
          anisoFlow: 'curvature',
          lightAzimuth: 180,
          lightElevation: 30,
          lightColor: '#FFFFFF',
          paletteColors: [],
          ditherModulation: 0.0,
          celTones: 'smooth',
        }
      );
      const emData = resEmerald.getContext('2d')!.getImageData(0, 0, width, height).data;
      const emCenter = (8 * width + 8) * 4;
      // console.log('Emerald (8, 8):', emData[emCenter], emData[emCenter + 1], emData[emCenter + 2]);
      // At (8, 8), check that green is strictly greater than red (no ruby red contamination)
      expect(emData[emCenter + 1]).toBeGreaterThan(emData[emCenter]); // G > R

      // 2. Sapphire blue gem (#2563EB: R:37, G:99, B:235)
      const { ctx: sapphireCtx } = makeMockCanvas(width, height);
      sapphireCtx.fillStyle = '#2563EB';
      sapphireCtx.fillRect(4, 4, 8, 8);

      const resSapphire = executeVolumetricOpticalPipeline(
        sapphireCtx as unknown as CanvasRenderingContext2D,
        width,
        height,
        {
          preset: 'gemstone',
          translucencyDepth: 10,
          fresnelPower: 4.5,
          anisoAngle: 0,
          anisoFlow: 'curvature',
          lightAzimuth: 180,
          lightElevation: 30,
          lightColor: '#FFFFFF',
          paletteColors: [],
          ditherModulation: 0.0,
          celTones: 'smooth',
        }
      );
      const sapData = resSapphire.getContext('2d')!.getImageData(0, 0, width, height).data;
      const sapCenter = (8 * width + 8) * 4;
      // In center where SSS shines, blue should dominate
      expect(sapData[sapCenter + 2]).toBeGreaterThan(sapData[sapCenter]); // B > R
    });
  });

  describe('snapToGemstoneFacets', () => {
    it('snaps normal angles to 8 discrete sector angles', () => {
      const nx = new Float32Array([0.9, -0.9, 0.0]);
      const ny = new Float32Array([0.1, -0.1, 0.0]);
      const nz = new Float32Array([0.4, 0.4, 1.0]);

      const snapped = snapToGemstoneFacets(nx, ny, nz, 3, 1, 8);
      expect(snapped.nx.length).toBe(3);
      expect(snapped.nz[2]).toBe(1.0); // center top facet
    });
  });

  describe('cleanOrphanPixelConfetti', () => {
    it('merges an isolated single pixel into neighboring dominant color', () => {
      const width = 4;
      const height = 4;
      const data = new Uint8ClampedArray(width * height * 4);

      // Fill with blue
      for (let i = 0; i < width * height; i++) {
        data[i * 4] = 0;
        data[i * 4 + 1] = 0;
        data[i * 4 + 2] = 255;
        data[i * 4 + 3] = 255;
      }

      // Add a single isolated red pixel at (1, 1)
      const orphanIdx = (1 * width + 1) * 4;
      data[orphanIdx] = 255;
      data[orphanIdx + 1] = 0;
      data[orphanIdx + 2] = 0;
      data[orphanIdx + 3] = 255;

      cleanOrphanPixelConfetti(data, width, height);

      // Orphan pixel should be cleaned to blue
      expect(data[orphanIdx]).toBe(0);
      expect(data[orphanIdx + 2]).toBe(255);
    });
  });
});
