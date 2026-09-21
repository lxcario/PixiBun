import { describe, it, expect } from 'vitest';
import {
  calculateProjectResourceUsage,
  validateProjectResourceBudget,
} from '@/lib/project/resourceBudget';
import { validateProjectFile } from '@/lib/project/schema';
import { validateStructurePayload } from '@/lib/sync/p2pSync';
import { WORKSPACE_ENVELOPE } from '@/config/canvasLimits';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION } from '@/types/project';

describe('Resource Budget & Project Complexity Ceiling (Phase A)', () => {
  const dummyLayer = {
    id: 'l1',
    name: 'Layer 1',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'source-over',
  };

  const createDummyProject = (width: number, height: number, frames: Array<{ id: string; durationMs: number; layers: Array<unknown> }>) => ({
    format: PROJECT_FORMAT_ID,
    version: PROJECT_FORMAT_VERSION,
    name: 'Budget Test Project',
    width,
    height,
    fps: 8,
    loopMode: 'repeat',
    onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, prevColor: '#000', nextColor: '#fff', opacity: 0.5 },
    palettes: [{ id: 'p1', name: 'Default', colors: ['#000000'] }],
    currentPaletteId: 'p1',
    customRamps: [],
    clips: [],
    frames,
    createdAt: 1000,
    updatedAt: 1000,
  });

  describe('Mathematical Resource Usage Calculation', () => {
    it('accurately computes materializableRasterPixels and baseRawRgbaBytes', () => {
      const frames = [
        { layers: [dummyLayer, dummyLayer] },
        { layers: [dummyLayer] },
      ];
      // 3 layers total * 100w * 50h = 15,000 pixels
      const usage = calculateProjectResourceUsage(100, 50, frames);

      expect(usage.frameCount).toBe(2);
      expect(usage.layerCount).toBe(3);
      expect(usage.materializableRasterPixels).toBe(15_000);
      expect(usage.baseRawRgbaBytes).toBe(15_000 * 4); // 60,000 bytes
    });
  });

  describe('Acceptance Test Cases', () => {
    it('accepts 32x32 (10 frames, 1 layer each) -> 10,240 px (~40 KiB)', () => {
      const frames = Array.from({ length: 10 }, () => ({ layers: [dummyLayer] }));
      const result = validateProjectResourceBudget(32, 32, frames);

      expect(result.ok).toBe(true);
      expect(result.usage.materializableRasterPixels).toBe(10_240);
      expect(result.usage.baseRawRgbaBytes).toBe(40_960);
    });

    it('accepts 256x256 (60 frames, 4 layers) -> 15,728,640 px (~60 MiB)', () => {
      const frames = Array.from({ length: 60 }, () => ({
        layers: [dummyLayer, dummyLayer, dummyLayer, dummyLayer],
      }));
      const result = validateProjectResourceBudget(256, 256, frames);

      expect(result.ok).toBe(true);
      expect(result.usage.layerCount).toBe(240);
      expect(result.usage.materializableRasterPixels).toBe(15_728_640);
      expect(Math.round(result.usage.baseRawRgbaBytes / (1024 * 1024))).toBe(60);
    });

    it('accepts 512x512 (20 frames, 5 layers) -> 26,214,400 px (~100 MiB)', () => {
      const frames = Array.from({ length: 20 }, () => ({
        layers: Array.from({ length: 5 }, () => dummyLayer),
      }));
      const result = validateProjectResourceBudget(512, 512, frames);

      expect(result.ok).toBe(true);
      expect(result.usage.layerCount).toBe(100);
      expect(result.usage.materializableRasterPixels).toBe(26_214_400);
      expect(Math.round(result.usage.baseRawRgbaBytes / (1024 * 1024))).toBe(100);
    });

    it('accepts 2048x2048 (1 frame, 16 layers) -> exact 67,108,864 px (256 MiB boundary)', () => {
      const frames = [{ layers: Array.from({ length: 16 }, () => dummyLayer) }];
      const result = validateProjectResourceBudget(2048, 2048, frames);

      expect(result.ok).toBe(true);
      expect(result.usage.materializableRasterPixels).toBe(WORKSPACE_ENVELOPE.MAX_PROJECT_AGGREGATE_PIXELS);
      expect(result.usage.baseRawRgbaBytes).toBe(256 * 1024 * 1024);
    });
  });

  describe('Rejection Test Cases', () => {
    it('rejects 2048x2048 (500 frames, 100 layers) -> 50,000 layers, ~209 Gpx', () => {
      const frames = Array.from({ length: 500 }, () => ({
        layers: Array.from({ length: 100 }, () => dummyLayer),
      }));
      const result = validateProjectResourceBudget(2048, 2048, frames);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/total layer limit|conservative resource complexity ceiling/i);
      }
    });

    it('rejects pathological layer counts (>2,000 layers, e.g. 2,001 layers at 1x1)', () => {
      // 2001 frames with 1 layer each at 1x1
      const frames = Array.from({ length: 2001 }, () => ({ layers: [dummyLayer] }));
      const result = validateProjectResourceBudget(1, 1, frames);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Project exceeds total layer limit');
      }
      expect(result.usage.layerCount).toBe(2001);
    });

    it('rejects pathological aggregate pixels (>67,108,864 px, e.g. 2048x2048 with 17 layers)', () => {
      const frames = [{ layers: Array.from({ length: 17 }, () => dummyLayer) }];
      const result = validateProjectResourceBudget(2048, 2048, frames);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Project exceeds conservative resource complexity ceiling');
      }
      expect(result.usage.materializableRasterPixels).toBe(71_303_168);
    });

    it('rejects metadata-only huge structure at schema level before any decoding/allocation', () => {
      // Schema validation without pngBase64 payloads
      const hugeFrames = Array.from({ length: 50 }, (_, i) => ({
        id: `f-${i}`,
        durationMs: 100,
        layers: Array.from({ length: 10 }, (_, j) => ({
          id: `l-${i}-${j}`,
          name: `Layer ${j}`,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'source-over',
          // No pngBase64 - pure metadata
        })),
      }));
      // 500 layers * 1024 * 1024 = 524,288,000 px > 67,108,864 px
      const hugeProject = createDummyProject(1024, 1024, hugeFrames);
      const validation = validateProjectFile(hugeProject);

      expect(validation.ok).toBe(false);
      if (!validation.ok) {
        expect(validation.error).toMatch(/conservative resource complexity ceiling/i);
      }
    });

    it('rejects oversized P2P structure payload before application', () => {
      // P2P structure payload with 2048x2048 and 20 layers
      const p2pFrames = [
        {
          id: 'f1',
          durationMs: 100,
          layers: Array.from({ length: 20 }, (_, j) => ({
            id: `l-${j}`,
            name: `Layer ${j}`,
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
          })),
        },
      ];
      // 20 * 2048 * 2048 = 83,886,080 px > 67,108,864 px
      const result = validateStructurePayload({
        width: 2048,
        height: 2048,
        frames: p2pFrames,
      });

      expect(result).toBeNull();
    });
  });
});
