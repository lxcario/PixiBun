import { describe, it, expect } from 'vitest';
import {
  coordsToLightAngles,
  lightAnglesToCoords,
} from '@/lib/canvas/lightGizmoMath';

describe('Phase 35.1: Direct-Manipulation Light Gizmo Engine (Shneiderman 1983)', () => {
  const cx = 50;
  const cy = 50;
  const maxRadius = 40;

  it('maps center point to overhead zenith (90° elevation)', () => {
    const angles = coordsToLightAngles(cx, cy, cx, cy, maxRadius);
    expect(angles.elevation).toBe(90);
  });

  it('accurately resolves cardinal azimuth directions at the horizon boundary', () => {
    // North (0° / Top)
    const north = coordsToLightAngles(cx, cy - maxRadius, cx, cy, maxRadius);
    expect(north.azimuth).toBe(0);
    expect(north.elevation).toBe(0);

    // East (90° / Right)
    const east = coordsToLightAngles(cx + maxRadius, cy, cx, cy, maxRadius);
    expect(east.azimuth).toBe(90);
    expect(east.elevation).toBe(0);

    // South (180° / Bottom)
    const south = coordsToLightAngles(cx, cy + maxRadius, cx, cy, maxRadius);
    expect(south.azimuth).toBe(180);
    expect(south.elevation).toBe(0);

    // West (270° / Left)
    const west = coordsToLightAngles(cx - maxRadius, cy, cx, cy, maxRadius);
    expect(west.azimuth).toBe(270);
    expect(west.elevation).toBe(0);
  });

  it('accurately maps PixiBun default 315° azimuth and 45° elevation', () => {
    const coords = lightAnglesToCoords(315, 45, cx, cy, maxRadius);

    // At 45° elevation, radius should be half maxRadius = 20
    const dx = coords.x - cx;
    const dy = coords.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    expect(dist).toBeCloseTo(20, 1);

    // Roundtrip back to angles
    const roundtrip = coordsToLightAngles(coords.x, coords.y, cx, cy, maxRadius);
    expect(roundtrip.azimuth).toBe(315);
    expect(roundtrip.elevation).toBe(45);
  });

  it('clamps drag coordinates beyond maximum radius to horizon (0° elevation)', () => {
    // Drag far beyond perimeter to the right
    const clamped = coordsToLightAngles(cx + 100, cy, cx, cy, maxRadius);
    expect(clamped.azimuth).toBe(90);
    expect(clamped.elevation).toBe(0);
  });

  it('preserves roundtrip consistency across multiple spherical test angles', () => {
    const testCases = [
      { az: 0, el: 90 },
      { az: 45, el: 60 },
      { az: 120, el: 30 },
      { az: 210, el: 45 },
      { az: 300, el: 75 },
    ];

    for (const tc of testCases) {
      const coords = lightAnglesToCoords(tc.az, tc.el, cx, cy, maxRadius);
      const res = coordsToLightAngles(coords.x, coords.y, cx, cy, maxRadius);
      expect(res.azimuth).toBe(tc.az);
      expect(res.elevation).toBe(tc.el);
    }
  });
});
