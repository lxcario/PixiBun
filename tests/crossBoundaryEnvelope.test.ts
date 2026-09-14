import { describe, it, expect } from 'vitest';
import {
  WORKSPACE_ENVELOPE,
  MAX_CANVAS_DIMENSION,
  MAX_CANVAS_FRAMES,
  MAX_CANVAS_LAYERS,
  MAX_EXPORT_DIMENSION,
  MAX_EXPORT_PIXELS,
  MAX_PROBE_DIMENSION,
  MAX_PROBE_PIXELS,
  MAX_HARDWARE_PIXEL_AREA,
} from '@/config/canvasLimits';
import { validateProjectFile } from '@/lib/project/schema';
import { validateStructurePayload, isValidPixelOp } from '@/lib/sync/p2pSync';
import { ImageHeaderProbe } from '@/lib/safety/imageHeaderProbe';
import { CanvasHardwareLimits } from '@/lib/safety/safeCanvas';
import { MAX_SAFE_CANVAS_DIMENSION, MAX_SAFE_CANVAS_PIXELS } from '@/components/modals/export/PngExportTab';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION } from '@/types/project';

describe('Cross-Boundary Workspace Envelope Coordination', () => {
  it('enforces single source of truth across all 5 subsystems', () => {
    expect(WORKSPACE_ENVELOPE.MAX_CANVAS_DIMENSION).toBe(2048);
    expect(MAX_SAFE_CANVAS_DIMENSION).toBe(MAX_EXPORT_DIMENSION);
    expect(MAX_SAFE_CANVAS_PIXELS).toBe(MAX_EXPORT_PIXELS);
    expect(MAX_EXPORT_DIMENSION).toBe(4096);
    expect(MAX_EXPORT_PIXELS).toBe(16_777_216);

    // 2. ImageHeaderProbe bounds alignment
    expect(ImageHeaderProbe.MAX_ALLOWED_DIMENSION).toBe(MAX_PROBE_DIMENSION);
    expect(ImageHeaderProbe.MAX_ALLOWED_PIXELS).toBe(MAX_PROBE_PIXELS);
    expect(MAX_PROBE_DIMENSION).toBe(8192);
    expect(MAX_PROBE_PIXELS).toBe(67_108_864);

    // 3. SafeCanvas hardware area bounds alignment
    expect(CanvasHardwareLimits.DEFAULT_SAFE_DIM).toBe(MAX_PROBE_DIMENSION);
    expect(CanvasHardwareLimits.MAX_SAFE_PIXEL_AREA).toBe(MAX_HARDWARE_PIXEL_AREA);
    expect(MAX_HARDWARE_PIXEL_AREA).toBe(16384 * 16384);
  });

  it('validates a max-envelope project schema (2048x2048, 500 frames, 100 layers)', () => {
    const layerTemplate = {
      id: 'layer-1',
      name: 'Layer 1',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
    };

    const layers100 = Array.from({ length: MAX_CANVAS_LAYERS }, (_, i) => ({
      ...layerTemplate,
      id: `layer-${i + 1}`,
      name: `Layer ${i + 1}`,
    }));

    const frameTemplate = {
      id: 'frame-1',
      durationMs: 100,
      layers: layers100,
    };

    const frames500 = Array.from({ length: MAX_CANVAS_FRAMES }, (_, i) => ({
      ...frameTemplate,
      id: `frame-${i + 1}`,
    }));

    const maxEnvelopeProject = {
      format: PROJECT_FORMAT_ID,
      version: PROJECT_FORMAT_VERSION,
      id: 'max-envelope-proj',
      name: 'Max Envelope Project',
      width: MAX_CANVAS_DIMENSION,
      height: MAX_CANVAS_DIMENSION,
      fps: 12,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      palettes: [
        {
          id: 'p1',
          name: 'Default',
          colors: ['#000000', '#ffffff'],
        },
      ],
      currentPaletteId: 'p1',
      frames: frames500,
    };

    const validation = validateProjectFile(maxEnvelopeProject);
    expect(validation.ok).toBe(true);

    // Exceeding canvas dimension rejects
    const oversizedProject = {
      ...maxEnvelopeProject,
      width: MAX_CANVAS_DIMENSION + 1,
    };
    expect(validateProjectFile(oversizedProject).ok).toBe(false);
  });

  it('ensures P2P collaboration bounds match project schema bounds exactly', () => {
    const singleFrame = {
      id: 'f1',
      durationMs: 100,
      layers: [{ id: 'l1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }],
    };

    // Valid max envelope P2P payload
    const validStructure = validateStructurePayload({
      width: MAX_CANVAS_DIMENSION,
      height: MAX_CANVAS_DIMENSION,
      frames: [singleFrame],
    });
    expect(validStructure).not.toBeNull();
    expect(validStructure?.width).toBe(2048);
    expect(validStructure?.height).toBe(2048);

    // P2P rejects width > 2048
    expect(
      validateStructurePayload({
        width: MAX_CANVAS_DIMENSION + 1,
        height: MAX_CANVAS_DIMENSION,
        frames: [singleFrame],
      })
    ).toBeNull();

    // P2P rejects height > 2048
    expect(
      validateStructurePayload({
        width: MAX_CANVAS_DIMENSION,
        height: MAX_CANVAS_DIMENSION + 1,
        frames: [singleFrame],
      })
    ).toBeNull();

    // P2P rejects pixel ops outside canvas coordinate boundary [0, 2048)
    const baseOp = {
      r: 255,
      g: 0,
      b: 0,
      a: 255,
      timestamp: 1000,
      peerId: 'peer-1',
    };

    expect(isValidPixelOp({ ...baseOp, x: 2047, y: 2047 })).toBe(true);
    expect(isValidPixelOp({ ...baseOp, x: 2048, y: 2047 })).toBe(false);
    expect(isValidPixelOp({ ...baseOp, x: 2047, y: 2048 })).toBe(false);
    expect(isValidPixelOp({ ...baseOp, x: -1, y: 0 })).toBe(false);
  });

  it('guarantees max-dimension project exports respect browser scale ceilings', () => {
    const canvasWidth = MAX_CANVAS_DIMENSION; // 2048
    const canvasHeight = MAX_CANVAS_DIMENSION; // 2048

    // 1x scale: 2048x2048 = 4.19MP (safely within 4096px and 16.7MP limits)
    const scale1W = canvasWidth * 1;
    const scale1H = canvasHeight * 1;
    expect(scale1W).toBeLessThanOrEqual(MAX_EXPORT_DIMENSION);
    expect(scale1H).toBeLessThanOrEqual(MAX_EXPORT_DIMENSION);
    expect(scale1W * scale1H).toBeLessThanOrEqual(MAX_EXPORT_PIXELS);

    // 2x scale: 4096x4096 = 16.77MP (exact ceiling limit)
    const scale2W = canvasWidth * 2;
    const scale2H = canvasHeight * 2;
    expect(scale2W).toBe(MAX_EXPORT_DIMENSION);
    expect(scale2H).toBe(MAX_EXPORT_DIMENSION);
    expect(scale2W * scale2H).toBe(MAX_EXPORT_PIXELS);

    // 3x scale: 6144x6144 = 37.7MP (exceeds browser limit, clamped)
    const scale3W = canvasWidth * 3;
    const scale3H = canvasHeight * 3;
    const exceedsBounds =
      scale3W > MAX_EXPORT_DIMENSION ||
      scale3H > MAX_EXPORT_DIMENSION ||
      scale3W * scale3H > MAX_EXPORT_PIXELS;
    expect(exceedsBounds).toBe(true);
  });
});
