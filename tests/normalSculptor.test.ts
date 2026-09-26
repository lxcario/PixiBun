/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import {
  encodeNormalRGB,
  decodeNormalRGB,
  computeDirectionalBevelNormal,
  computeRivetNormal,
  blendNormalsRNM,
  blendNormalsUDN,
  blendNormals,
  ChiselStrokeSession,
} from '@/lib/art/normalSculptor';

describe('2.5D Normal Chisel & Bas-Relief Sculptor', () => {
  it('keeps RNM output unit length after a negative Z result is clamped', () => {
    const result = blendNormalsRNM([0.8, 0, 0.6], [0.8, 0, 0.6]);
    expect(result[2]).toBe(0);
    expect(Math.hypot(...result)).toBeCloseTo(1, 6);
  });

  describe('encodeNormalRGB & decodeNormalRGB', () => {
    it('encodes flat perpendicular normal (0, 0, 1) to standard normal map (128, 128, 255)', () => {
      const [r, g, b] = encodeNormalRGB(0, 0, 1, true);
      expect(r).toBe(128);
      expect(g).toBe(128);
      expect(b).toBe(255);
    });

    it('roundtrips unit tangent vectors accurately through 8-bit RGB', () => {
      const testNormals: [number, number, number][] = [
        [0, 0, 1],
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0.57735, 0.57735, 0.57735],
        [-0.57735, 0.57735, 0.57735],
      ];

      for (const [nx, ny, nz] of testNormals) {
        const [r, g, b] = encodeNormalRGB(nx, ny, nz, true);
        const [dx, dy, dz] = decodeNormalRGB(r, g, b, true);

        expect(dx).toBeCloseTo(nx, 1);
        expect(dy).toBeCloseTo(ny, 1);
        expect(dz).toBeCloseTo(nz, 1);
      }
    });

    it('respects OpenGL +Y up versus Screen space +Y down convention', () => {
      const normalOpenGL = encodeNormalRGB(0, 1, 0, true);
      const normalScreen = encodeNormalRGB(0, 1, 0, false);

      expect(normalOpenGL[1]).toBe(255); // OpenGL +Y up -> Green 255
      expect(normalScreen[1]).toBe(0);   // Screen +Y up -> Green 0
    });
  });

  describe('computeDirectionalBevelNormal', () => {
    it('computes North (0° azimuth) pointing in +Y OpenGL direction', () => {
      const [nx, ny, nz] = computeDirectionalBevelNormal(0, 45, true);
      expect(nx).toBeCloseTo(0, 2);
      expect(ny).toBeGreaterThan(0.5); // pointing up in OpenGL
      expect(nz).toBeCloseTo(Math.cos((45 * Math.PI) / 180), 2);
    });

    it('computes East (90° azimuth) pointing in +X direction', () => {
      const [nx, ny, nz] = computeDirectionalBevelNormal(90, 45, true);
      expect(nx).toBeGreaterThan(0.5); // pointing right
      expect(ny).toBeCloseTo(0, 2);
      expect(nz).toBeCloseTo(Math.cos((45 * Math.PI) / 180), 2);
    });

    it('computes South (180° azimuth) pointing in -Y OpenGL direction', () => {
      const [nx, ny, nz] = computeDirectionalBevelNormal(180, 45, true);
      expect(nx).toBeCloseTo(0, 2);
      expect(ny).toBeLessThan(-0.5);
      expect(nz).toBeCloseTo(Math.cos((45 * Math.PI) / 180), 2);
    });

    it('computes West (270° azimuth) pointing in -X direction', () => {
      const [nx, ny, nz] = computeDirectionalBevelNormal(270, 45, true);
      expect(nx).toBeLessThan(-0.5);
      expect(ny).toBeCloseTo(0, 2);
      expect(nz).toBeCloseTo(Math.cos((45 * Math.PI) / 180), 2);
    });

    it('preserves unit vector normalization across all azimuths and inclines', () => {
      for (let az = 0; az < 360; az += 45) {
        for (let inc = 15; inc <= 75; inc += 15) {
          const [nx, ny, nz] = computeDirectionalBevelNormal(az, inc, true);
          const len = Math.hypot(nx, ny, nz);
          expect(len).toBeCloseTo(1.0, 4);
        }
      }
    });
  });

  describe('computeRivetNormal', () => {
    it('returns flat normal at center of rivet dome (dx = 0, dy = 0)', () => {
      const normal = computeRivetNormal(0, 0, 8, 1.0, false, true);
      expect(normal).not.toBeNull();
      if (normal) {
        expect(normal[0]).toBeCloseTo(0, 2);
        expect(normal[1]).toBeCloseTo(0, 2);
        expect(normal[2]).toBeCloseTo(1, 2);
      }
    });

    it('returns null outside the circular radius', () => {
      const normal = computeRivetNormal(10, 10, 8, 1.0, false, true);
      expect(normal).toBeNull();
    });

    it('flattens slope when flattening factor h is small', () => {
      const hemisphere = computeRivetNormal(4, 0, 8, 1.0, false, true);
      const shallowStud = computeRivetNormal(4, 0, 8, 0.2, false, true);

      expect(hemisphere).not.toBeNull();
      expect(shallowStud).not.toBeNull();
      if (hemisphere && shallowStud) {
        // Shallow stud has much flatter Z than full hemisphere
        expect(shallowStud[2]).toBeGreaterThan(hemisphere[2]);
        expect(shallowStud[0]).toBeLessThan(hemisphere[0]);
      }
    });

    it('inverts normal slope when invert flag is true (screwhole dimple)', () => {
      const dome = computeRivetNormal(4, 0, 8, 0.8, false, true);
      const dimple = computeRivetNormal(4, 0, 8, 0.8, true, true);

      expect(dome).not.toBeNull();
      expect(dimple).not.toBeNull();
      if (dome && dimple) {
        expect(dimple[0]).toBeCloseTo(-dome[0], 2);
        expect(dimple[1]).toBeCloseTo(-dome[1], 2);
        expect(dimple[2]).toBeCloseTo(dome[2], 2);
      }
    });
  });

  describe('Reoriented Normal Mapping (RNM) Blending', () => {
    it('identity base normal (0, 0, 1) leaves detail normal unchanged', () => {
      const base: [number, number, number] = [0, 0, 1];
      const detail: [number, number, number] = [0.5, 0, 0.866];
      const blended = blendNormalsRNM(base, detail);

      expect(blended[0]).toBeCloseTo(detail[0], 2);
      expect(blended[1]).toBeCloseTo(detail[1], 2);
      expect(blended[2]).toBeCloseTo(detail[2], 2);
    });

    it('identity detail normal (0, 0, 1) leaves base normal unchanged', () => {
      const base: [number, number, number] = [0, 0.6, 0.8];
      const detail: [number, number, number] = [0, 0, 1];
      const blended = blendNormalsRNM(base, detail);

      expect(blended[0]).toBeCloseTo(base[0], 2);
      expect(blended[1]).toBeCloseTo(base[1], 2);
      expect(blended[2]).toBeCloseTo(base[2], 2);
    });

    it('blends non-trivial base and detail normals with normalized output', () => {
      const base: [number, number, number] = [0.3, 0.2, 0.9327];
      const detail: [number, number, number] = [-0.1, 0.4, 0.911];
      const blended = blendNormalsRNM(base, detail);

      const len = Math.hypot(blended[0], blended[1], blended[2]);
      expect(len).toBeCloseTo(1.0, 3);
      expect(blended[2]).toBeGreaterThan(0);
    });

    it('blendNormals correctly dispatches to RNM, UDN, and overwrite modes', () => {
      const base: [number, number, number] = [0.2, 0, 0.9798];
      const detail: [number, number, number] = [0, 0.3, 0.9539];

      const rnm = blendNormals(base, detail, 'rnm');
      const udn = blendNormals(base, detail, 'udn');
      const overwrite = blendNormals(base, detail, 'overwrite');

      expect(overwrite).toEqual(detail);
      expect(blendNormalsUDN(base, detail)).toEqual(udn);
      expect(Math.hypot(rnm[0], rnm[1], rnm[2])).toBeCloseTo(1.0, 3);
      expect(Math.hypot(udn[0], udn[1], udn[2])).toBeCloseTo(1.0, 3);
    });
  });

  describe('ChiselStrokeSession (Intra-Stroke Envelope)', () => {
    it('stamps chisel facets into envelope buffer without corrupting out-of-bounds', () => {
      const session = new ChiselStrokeSession(16, 16);
      session.stampChisel(8, 8, {
        azimuth: 45,
        incline: 45,
        width: 3,
        ridgeMode: false,
        blendMode: 'rnm',
      });

      expect(session.modifiedIndices.size).toBeGreaterThan(0);
      for (const idx of session.modifiedIndices) {
        expect(session.strokeAlpha[idx]).toBeGreaterThan(0);
        expect(session.strokeNz[idx]).toBeGreaterThan(0);
      }
    });

    it('composites envelope cleanly onto an existing ImageData canvas buffer', () => {
      class TestImageData {
        data: Uint8ClampedArray;
        width: number;
        height: number;
        constructor(width: number, height: number) {
          this.width = width;
          this.height = height;
          this.data = new Uint8ClampedArray(width * height * 4);
        }
      }

      const img = new TestImageData(8, 8) as unknown as ImageData;
      // Pre-fill with flat perpendicular normal (128, 128, 255, 255)
      for (let i = 0; i < 8 * 8 * 4; i += 4) {
        img.data[i] = 128;
        img.data[i + 1] = 128;
        img.data[i + 2] = 255;
        img.data[i + 3] = 255;
      }

      const session = new ChiselStrokeSession(8, 8);
      session.stampRivet(4, 4, {
        radius: 3,
        flatten: 0.5,
        invert: false,
        blendMode: 'rnm',
      });

      session.compositeOnto(img, 'rnm');

      // Center pixel (4, 4) should remain perpendicular normal
      const centerIdx = (4 * 8 + 4) * 4;
      expect(img.data[centerIdx + 2]).toBe(255);

      // Edge of rivet should have shifted normal X/Y
      const edgeIdx = (4 * 8 + 6) * 4;
      expect(img.data[edgeIdx]).not.toBe(128);
    });
  });
});
