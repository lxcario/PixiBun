/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import {
  parseCRNG,
  serializeCRNG,
  parseCCRT,
  serializeCCRT,
  wrapIFFChunk,
  calculatePingPongOffset,
  packRgb32,
  unpackRgb32,
  blendColorsRgb,
  updateLivePaletteLUT32,
  retuneTracksForSeamlessLoop,
  PaletteCycleTrack,
} from '@/lib/color/paletteCycling';
import {
  generateGodot4Shader,
  generateUnityUrpShader,
  buildCanvasPaletteIndexMap,
} from '@/lib/export/shaderExporter';

describe('Mark Ferrari 8-Bit Dynamic Palette Cycling Engine', () => {
  describe('Deluxe Paint IFF ILBM CRNG Serialization & Parsing', () => {
    it('roundtrips active CRNG chunk payload accurately', () => {
      const originalTrack: PaletteCycleTrack = {
        id: 'water-flow',
        name: 'River Cascade',
        low: 16,
        high: 23,
        rate: 15.0, // 15 Hz
        direction: 'forward',
        blendShift: false,
        enabled: true,
      };

      const bytes = serializeCRNG(originalTrack);
      expect(bytes.length).toBe(8);

      const parsed = parseCRNG(bytes, 'water-flow');
      expect(parsed.low).toBe(16);
      expect(parsed.high).toBe(23);
      expect(parsed.enabled).toBe(true);
      expect(parsed.direction).toBe('forward');
      expect(parsed.rate).toBeCloseTo(15.0, 1);
    });

    it('correctly handles reverse cycle flag in CRNG', () => {
      const reverseTrack: PaletteCycleTrack = {
        id: 'fire-sparks',
        low: 32,
        high: 47,
        rate: 30.0,
        direction: 'reverse',
        blendShift: false,
        enabled: true,
      };

      const bytes = serializeCRNG(reverseTrack);
      const parsed = parseCRNG(bytes);
      expect(parsed.direction).toBe('reverse');
      expect(parsed.low).toBe(32);
      expect(parsed.high).toBe(47);
    });

    it('correctly parses slow cycle tracks with rateRaw = 36 (~0.13 Hz) without erroneous deactivation', () => {
      // Create an 8-byte CRNG buffer manually with rateRaw = 36 and RNG_ACTIVE flag (1)
      const bytes = new Uint8Array(8);
      const view = new DataView(bytes.buffer);
      view.setInt16(0, 0, false); // pad1
      view.setInt16(2, 36, false); // rateRaw = 36
      view.setUint16(4, 1, false); // flags = RNG_ACTIVE (1)
      view.setUint8(6, 10); // low
      view.setUint8(7, 20); // high

      const parsed = parseCRNG(bytes, 'slow-track');
      expect(parsed.enabled).toBe(true);
      expect(parsed.low).toBe(10);
      expect(parsed.high).toBe(20);
      expect(parsed.rate).toBeCloseTo(0.13, 2);
    });

    it('wraps chunk into standard 8-byte IFF header', () => {
      const payload = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const chunk = wrapIFFChunk('CRNG', payload);

      expect(chunk.length).toBe(16); // 4 (ID) + 4 (Size) + 8 (Payload)
      // Verify ID 'CRNG'
      const idStr = String.fromCharCode(chunk[0], chunk[1], chunk[2], chunk[3]);
      expect(idStr).toBe('CRNG');

      // Verify big-endian size = 8
      const view = new DataView(chunk.buffer);
      expect(view.getUint32(4, false)).toBe(8);
    });
  });

  describe('Commodore Graphicraft CCRT Serialization & Parsing', () => {
    it('roundtrips 14-byte CCRT chunk with microsecond timing', () => {
      const originalTrack: PaletteCycleTrack = {
        id: 'clouds',
        name: 'Cumulus Drift',
        low: 48,
        high: 63,
        rate: 10.0, // delta = 0.1s -> sec=0, microsec=100000
        direction: 'ping-pong',
        blendShift: false,
        enabled: true,
      };

      const bytes = serializeCCRT(originalTrack);
      expect(bytes.length).toBe(14);

      const parsed = parseCCRT(bytes, 'clouds');
      expect(parsed.low).toBe(48);
      expect(parsed.high).toBe(63);
      expect(parsed.direction).toBe('ping-pong');
      expect(parsed.enabled).toBe(true);
      expect(parsed.rate).toBeCloseTo(10.0, 1);
    });
  });

  describe('Ping-Pong Triangle-Wave Mathematics & Fencepost Bounds', () => {
    it('oscillates strictly within [0, S - 1] across phase periods', () => {
      const rangeSize = 5; // S = 5, registers 0, 1, 2, 3, 4. M = 2*(5-1) = 8
      const expectedSequence = [0, 1, 2, 3, 4, 3, 2, 1]; // Period 8

      for (let phase = 0; phase < 24; phase++) {
        const offset = calculatePingPongOffset(phase, rangeSize);
        const expected = expectedSequence[phase % 8];
        expect(offset).toBe(expected);
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThan(rangeSize);
      }
    });

    it('handles degenerate rangeSize <= 1 safely', () => {
      expect(calculatePingPongOffset(5, 1)).toBe(0);
      expect(calculatePingPongOffset(5, 0)).toBe(0);
    });
  });

  describe('Pixel Packing & Sub-Step BlendShift Color Interpolation', () => {
    it('packs and unpacks 32-bit RGB with perfect fidelity', () => {
      const r = 180, g = 92, b = 240;
      const packed = packRgb32(r, g, b, 255);
      const [ur, ug, ub] = unpackRgb32(packed);

      expect(ur).toBe(r);
      expect(ug).toBe(g);
      expect(ub).toBe(b);
    });

    it('interpolates sub-step colors smoothly at t = 0.5', () => {
      const c1: [number, number, number] = [100, 50, 200];
      const c2: [number, number, number] = [200, 150, 100];
      const mid = blendColorsRgb(c1, c2, 0.5);

      expect(mid[0]).toBe(150);
      expect(mid[1]).toBe(100);
      expect(mid[2]).toBe(150);
    });
  });

  describe('updateLivePaletteLUT32 (Zero-Allocation 60 FPS Execution)', () => {
    it('updates output LUT with cyclic color shifting', () => {
      const palette = [
        '#000000', // index 0 (static)
        '#ff0000', // index 1 (cycle 1-3)
        '#00ff00', // index 2
        '#0000ff', // index 3
        '#ffffff', // index 4 (static)
      ];

      const tracks: PaletteCycleTrack[] = [
        {
          id: 'test-track',
          low: 1,
          high: 3,
          rate: 1.0, // 1 step per second
          direction: 'forward',
          blendShift: false,
          enabled: true,
        },
      ];

      const lut32 = new Uint32Array(palette.length);

      // t = 0: initial state
      updateLivePaletteLUT32(palette, tracks, 0.0, lut32);
      expect(unpackRgb32(lut32[1])).toEqual([255, 0, 0]);
      expect(unpackRgb32(lut32[2])).toEqual([0, 255, 0]);
      expect(unpackRgb32(lut32[3])).toEqual([0, 0, 255]);

      // t = 1: forward shifted by 1
      updateLivePaletteLUT32(palette, tracks, 1.0, lut32);
      // Index 1 receives shifted color from index 3
      expect(unpackRgb32(lut32[1])).toEqual([0, 0, 255]);
      expect(unpackRgb32(lut32[2])).toEqual([255, 0, 0]);
      expect(unpackRgb32(lut32[3])).toEqual([0, 255, 0]);

      // Static colors at 0 and 4 remain untouched
      expect(unpackRgb32(lut32[0])).toEqual([0, 0, 0]);
      expect(unpackRgb32(lut32[4])).toEqual([255, 255, 255]);
    });
  });

  describe('retuneTracksForSeamlessLoop (Farey Rational Retuning)', () => {
    it('retunes coprime cycle rates to exact harmonic periods over loop duration T', () => {
      const targetDurationSec = 3.0;
      const tracks: PaletteCycleTrack[] = [
        {
          id: 't1',
          low: 0,
          high: 6, // S = 7, forward M = 7
          rate: 10.0, // nominal period = 7 / 10 = 0.7s -> in 3s = 4.285 cycles
          direction: 'forward',
          blendShift: false,
          enabled: true,
        },
        {
          id: 't2',
          low: 7,
          high: 11, // S = 5, ping-pong M = 8
          rate: 12.0, // nominal period = 8 / 12 = 0.666s -> in 3s = 4.5 cycles
          direction: 'ping-pong',
          blendShift: false,
          enabled: true,
        },
      ];

      const retuned = retuneTracksForSeamlessLoop(tracks, targetDurationSec);

      for (const track of retuned) {
        const S = track.high - track.low + 1;
        const M = track.direction === 'ping-pong' ? 2 * (S - 1) : S;
        // Total periods in duration T must be an exact integer!
        const totalPeriods = (targetDurationSec * track.rate) / M;
        expect(Math.abs(totalPeriods - Math.round(totalPeriods))).toBeLessThan(1e-4);
      }
    });
  });

  describe('Shader Exporters (Godot 4 & Unity URP)', () => {
    it('generates valid Godot 4 CanvasItem shader code with cycle track logic', () => {
      const tracks: PaletteCycleTrack[] = [
        {
          id: 'water',
          low: 10,
          high: 15,
          rate: 8.0,
          direction: 'ping-pong',
          blendShift: false,
          enabled: true,
        },
      ];

      const shader = generateGodot4Shader(tracks, 256);
      expect(shader).toContain('shader_type canvas_item;');
      expect(shader).toContain('uniform sampler2D palette_texture');
      expect(shader).toContain('color_idx >= 10 && color_idx <= 15');
      expect(shader).toContain('TIME * 8.000');
    });

    it('generates valid Unity URP 2D HLSL shader code with cycle track logic', () => {
      const tracks: PaletteCycleTrack[] = [
        {
          id: 'conveyor',
          low: 20,
          high: 25,
          rate: 14.0,
          direction: 'forward',
          blendShift: true,
          enabled: true,
        },
      ];

      const shader = generateUnityUrpShader(tracks, 256);
      expect(shader).toContain('Shader "PixiBun/PaletteCycling2D"');
      expect(shader).toContain('color_idx >= 20 && color_idx <= 25');
      expect(shader).toContain('_Time.y * 14.000');
    });

    it('buildCanvasPaletteIndexMap maps pixel RGBA buffer to palette registers', () => {
      class MockContext {
        imageData: { data: Uint8ClampedArray };
        constructor(w: number, h: number) {
          this.imageData = { data: new Uint8ClampedArray(w * h * 4) };
        }
        getImageData(_x: number, _y: number, _w: number, _h: number) {
          return this.imageData;
        }
      }

      const ctx = new MockContext(2, 2);
      // Pixel 0: red (#ff0000)
      ctx.imageData.data[0] = 255;
      ctx.imageData.data[1] = 0;
      ctx.imageData.data[2] = 0;
      ctx.imageData.data[3] = 255;

      // Pixel 1: blue (#0000ff)
      ctx.imageData.data[4] = 0;
      ctx.imageData.data[5] = 0;
      ctx.imageData.data[6] = 255;
      ctx.imageData.data[7] = 255;

      // Pixel 2: transparent (a < 30)
      ctx.imageData.data[8] = 0;
      ctx.imageData.data[9] = 0;
      ctx.imageData.data[10] = 0;
      ctx.imageData.data[11] = 0;

      // Pixel 3: green (#00ff00)
      ctx.imageData.data[12] = 0;
      ctx.imageData.data[13] = 255;
      ctx.imageData.data[14] = 0;
      ctx.imageData.data[15] = 255;

      const palette = ['#ff0000', '#00ff00', '#0000ff'];
      const indexMap = buildCanvasPaletteIndexMap(
        ctx as unknown as CanvasRenderingContext2D,
        2,
        2,
        palette
      );

      expect(indexMap[0]).toBe(0); // red -> palette 0
      expect(indexMap[1]).toBe(2); // blue -> palette 2
      expect(indexMap[2]).toBe(255); // transparent -> 255
      expect(indexMap[3]).toBe(1); // green -> palette 1
    });
  });
});
