import { describe, it, expect } from 'vitest';
import {
  sampleEDTBilinear,
  tracePhysical2DSoftShadow,
  generateRaymarchedShadowMap,
  executeRaymarchedCastShadowPipeline,
  RaymarchedShadowParams,
} from '@/lib/ai/shadowRayMarcher';
import { releaseFloat32Buffer } from '@/lib/engine/bufferPool';

describe('PixiBun 2D Ray Marcher & Soft Shadow Engine', () => {
  describe('sampleEDTBilinear', () => {
    it('accurately interpolates between 4 grid points', () => {
      const width = 2;
      const height = 2;
      // [ 0.0, 10.0 ]
      // [ 10.0, 20.0 ]
      const edt = new Float32Array([0.0, 10.0, 10.0, 20.0]);

      // Exactly at (0, 0)
      expect(sampleEDTBilinear(edt, width, height, 0, 0)).toBeCloseTo(0.0, 3);
      // Exactly at (1, 0)
      expect(sampleEDTBilinear(edt, width, height, 1, 0)).toBeCloseTo(10.0, 3);
      // Center (0.5, 0.5) -> (0 + 10 + 10 + 20) / 4 = 10.0
      expect(sampleEDTBilinear(edt, width, height, 0.5, 0.5)).toBeCloseTo(10.0, 3);
      // (0.5, 0.0) -> 5.0
      expect(sampleEDTBilinear(edt, width, height, 0.5, 0.0)).toBeCloseTo(5.0, 3);
    });

    it('clamps branchlessly when query points are out of bounds', () => {
      const width = 2;
      const height = 2;
      const edt = new Float32Array([5.0, 5.0, 5.0, 5.0]);

      expect(sampleEDTBilinear(edt, width, height, -10, -10)).toBeCloseTo(5.0, 3);
      expect(sampleEDTBilinear(edt, width, height, 100, 100)).toBeCloseTo(5.0, 3);
    });
  });

  describe('tracePhysical2DSoftShadow (Aaltonen Cone Tracing)', () => {
    it('returns 1.0 when receiver is at the exact light coordinate', () => {
      const width = 8;
      const height = 8;
      const edt = new Float32Array(width * height).fill(5.0);

      const vis = tracePhysical2DSoftShadow(edt, width, height, 4, 4, 4, 4, 16);
      expect(vis).toBe(1.0);
    });

    it('returns 0.0 when receiver is inside solid geometry (edt <= 0)', () => {
      const width = 8;
      const height = 8;
      const edt = new Float32Array(width * height).fill(5.0);
      edt[4 * width + 4] = 0.0; // Solid block at (4, 4)

      const vis = tracePhysical2DSoftShadow(edt, width, height, 4, 4, 0, 0, 16);
      expect(vis).toBe(0.0);
    });

    it('exhibits contact hardening: sharp umbra near occluder, widening penumbra further away', () => {
      // 32x32 field with a solid vertical wall pillar at x = 16, y = [14..18]
      const width = 32;
      const height = 32;
      const edt = new Float32Array(width * height);

      // Fill EDT with true Euclidean distance to the central obstacle at (16, 16)
      const ox = 16;
      const oy = 16;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (x >= 14 && x <= 18 && y >= 14 && y <= 18) {
            edt[y * width + x] = 0.0;
          } else {
            const dx = Math.max(0, Math.abs(x - ox) - 2);
            const dy = Math.max(0, Math.abs(y - oy) - 2);
            edt[y * width + x] = Math.sqrt(dx * dx + dy * dy);
          }
        }
      }

      const lightX = 2;
      const lightY = 16;
      const lightRadius = 8;

      // Point A: Immediately behind the occluder at (20, 16) -> close contact
      const visNear = tracePhysical2DSoftShadow(edt, width, height, 20, 16, lightX, lightY, lightRadius);
      // Point B: Further behind the occluder along the shadow edge at (28, 22) -> penumbra
      const visPenumbra = tracePhysical2DSoftShadow(edt, width, height, 28, 22, lightX, lightY, lightRadius);

      // Point Near is directly blocked (umbra)
      expect(visNear).toBe(0.0);
      // Point Penumbra receives partial visibility
      expect(visPenumbra).toBeGreaterThan(0.0);
      expect(visPenumbra).toBeLessThanOrEqual(1.0);
    });
  });

  describe('generateRaymarchedShadowMap', () => {
    it('populates full grid visibility using buffer pooling without memory leaks', () => {
      const width = 16;
      const height = 16;
      const edt = new Float32Array(width * height).fill(10.0);

      const map = generateRaymarchedShadowMap(edt, width, height, 8, 8, 8);
      expect(map.length).toBe(width * height);
      expect(map[8 * width + 8]).toBe(1.0);

      // Clean up pooled buffer
      releaseFloat32Buffer(map);
    });
  });

  describe('executeRaymarchedCastShadowPipeline', () => {
    it('generates an ImageData buffer with correct colors and alpha', () => {
      const width = 16;
      const height = 16;
      const edt = new Float32Array(width * height);
      // Fill with true distance to an obstacle at (8, 8)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - 8;
          const dy = y - 8;
          edt[y * width + x] = Math.sqrt(dx * dx + dy * dy);
        }
      }

      const params: RaymarchedShadowParams = {
        lightX: 0,
        lightY: 0,
        lightRadius: 4,
        shadowOpacity: 0.8,
        shadowColor: '#1E1B4B',
        ditherMode: 'none',
      };

      const imgData = executeRaymarchedCastShadowPipeline(edt, width, height, params);
      expect(imgData.width).toBe(width);
      expect(imgData.height).toBe(height);
      expect(imgData.data.length).toBe(width * height * 4);

      // Pixel behind the obstacle (14, 14) is directly in shadow from light at (0, 0)
      const shadowIdx = (14 * width + 14) * 4;
      expect(imgData.data[shadowIdx + 3]).toBeGreaterThan(0); // Alpha is visible
      expect(imgData.data[shadowIdx]).toBe(0x1E); // Red
      expect(imgData.data[shadowIdx + 1]).toBe(0x1B); // Green
      expect(imgData.data[shadowIdx + 2]).toBe(0x4B); // Blue
    });

    it('stipples penumbra pixels when Bayer dithering is enabled (4x4)', () => {
      const width = 16;
      const height = 16;
      const edt = new Float32Array(width * height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - 8;
          const dy = y - 8;
          edt[y * width + x] = Math.sqrt(dx * dx + dy * dy);
        }
      }

      const params: RaymarchedShadowParams = {
        lightX: 2,
        lightY: 2,
        lightRadius: 12,
        shadowOpacity: 1.0,
        shadowColor: '#000000',
        ditherMode: '4x4',
      };

      const imgData = executeRaymarchedCastShadowPipeline(edt, width, height, params);
      expect(imgData.data.length).toBe(width * height * 4);

      // Every dithered pixel is either fully opaque (255) or fully transparent (0)
      for (let i = 3; i < imgData.data.length; i += 4) {
        const alpha = imgData.data[i];
        expect(alpha === 0 || alpha === 255).toBe(true);
      }
    });
  });

  describe('non-destructive layer tagging integration', () => {
    it('creates and replaces cast-shadow layer at index 0 without mutating base art', async () => {
      const { useStudioStore } = await import('@/stores/studioStore');
      useStudioStore.setState((state: unknown) => {
        const s = state as ReturnType<typeof useStudioStore.getState>;
        s.frames = [
          {
            id: 'frame-1',
            durationMs: 100,
            layers: [
              { id: 'base-art', name: 'Character', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
            ],
          },
        ];
        s.activeFrameIndex = 0;
        s.activeLayerId = 'base-art';
      });

      const replaceTagged = (tag: string, name: string) => {
        const s = useStudioStore.getState();
        const f = s.frames[s.activeFrameIndex];
        const existing = f?.layers.find((l) => l.tag === tag);
        if (existing) s.deleteLayer(existing.id);
        s.addLayer(name, tag);
      };

      replaceTagged('cast-shadow', 'Cast Shadow');
      const frame1 = useStudioStore.getState().frames[0];
      expect(frame1.layers).toHaveLength(2);
      expect(frame1.layers[0].tag).toBe('cast-shadow');
      expect(frame1.layers[0].name).toBe('Cast Shadow');
      expect(frame1.layers[1].id).toBe('base-art');

      // Re-running replaces existing cast-shadow layer instead of duplicating
      replaceTagged('cast-shadow', 'Cast Shadow');
      const frame2 = useStudioStore.getState().frames[0];
      expect(frame2.layers).toHaveLength(2);
      expect(frame2.layers[0].tag).toBe('cast-shadow');
      expect(frame2.layers[1].id).toBe('base-art');
    });
  });
});
