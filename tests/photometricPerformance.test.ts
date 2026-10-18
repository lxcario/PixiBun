// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeCanvas } from './helpers/mockCanvas';
import {
  executePhotometricPipeline,
  computePhotometricAnalysis,
} from '@/lib/graphics/math/photometricLighting';
import { inferPhotometricSettings } from '@/lib/graphics/math/photometricAuto';

describe('Photometric large-canvas execution timing benchmark (B18)', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return makeCanvas(this.width || 32, this.height || 32).getContext('2d');
    });
  });

  const benchmarkSize = (size: number) => {
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext('2d')!;

    // Draw a test sprite circle in the center
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.35, 0, Math.PI * 2);
    ctx.fill();

    const imgData = ctx.getImageData(0, 0, size, size);
    const inferred = inferPhotometricSettings(imgData.data, size, size);

    const params = {
      lightAzimuth: 45,
      lightElevation: 45,
      lightRadius: 64,
      lightColor: '#FFFFFF',
      ambientIntensity: 0.45,
      lightBrightness: 1.15,
      sourceShadingRemoval: 0,
      material: 'matte' as const,
      cavityStrength: 0.5,
      ditherModulation: 0.2,
      bayerSize: '4x4' as const,
      formType: inferred.formType,
      minecraftSkinMode: 'auto' as const,
      shadingBands: 2 as const,
    };

    // Precompute analysis (as done when gizmo drag starts)
    const analysis = computePhotometricAnalysis(ctx, size, size, params, inferred);

    // Warm up
    executePhotometricPipeline(ctx, size, size, { ...params, precomputedAnalysis: analysis }, []);

    // Measure 10 live gizmo drag iterations
    const iterations = 10;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      executePhotometricPipeline(
        ctx,
        size,
        size,
        {
          ...params,
          lightAzimuth: (45 + i * 5) % 360,
          lightElevation: 45,
          precomputedAnalysis: analysis,
        },
        []
      );
    }
    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;
    return avgMs;
  };

  it('measures execution timing across 128x128, 256x256, and 512x512', () => {
    const timing128 = benchmarkSize(128);
    const timing256 = benchmarkSize(256);
    const timing512 = benchmarkSize(512);

    console.warn(`[B18 Photometric Benchmark] 128x128: ${timing128.toFixed(2)}ms per frame`);
    console.warn(`[B18 Photometric Benchmark] 256x256: ${timing256.toFixed(2)}ms per frame`);
    console.warn(`[B18 Photometric Benchmark] 512x512: ${timing512.toFixed(2)}ms per frame`);

    expect(timing128).toBeGreaterThan(0);
    expect(timing256).toBeGreaterThan(0);
    expect(timing512).toBeGreaterThan(0);
  });
});
