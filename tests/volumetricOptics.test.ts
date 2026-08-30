import { describe, it, expect, beforeEach } from 'vitest';
import {
  phaseHG2D,
  evaluateDielectricFresnel,
  computeAnisotropicTangentField,
  executeVolumetricOpticalPipeline,
  computeTangentNormalField,
} from '@/lib/ai/smartMathEngine';
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

describe('PixiBud AI 2D Volumetric Optics Engine', () => {
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
  });
});
