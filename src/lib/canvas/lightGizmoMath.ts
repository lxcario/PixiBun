/**
 * Direct-Manipulation Light Gizmo Spherical Coordinate Converter.
 *
 * Academic Citation:
 * Ben Shneiderman, "Direct Manipulation: A Step Beyond Programming Languages,"
 * Computer, Vol. 16, No. 8, pp. 57-69, 1983.
 *
 * Principles:
 * 1. Continuous visual representation of the directional light source.
 * 2. Physical pointer dragging instead of abstract angle syntax.
 * 3. Immediately visible, incremental, and reversible illumination state updates.
 */

export interface LightAngles {
  azimuth: number; // 0° to 360° (0° = North/Top, 90° = East/Right, 180° = South, 270° = West)
  elevation: number; // 0° (horizon grazing) to 90° (overhead zenith)
}

export interface GizmoPoint {
  x: number;
  y: number;
}

/**
 * Converts 2D planar gizmo pointer coordinates to 3D photometric spherical angles (Azimuth & Elevation).
 *
 * @param hx Pointer X position
 * @param hy Pointer Y position
 * @param cx Center X of the gizmo sphere
 * @param cy Center Y of the gizmo sphere
 * @param maxRadius Maximum radius of the gizmo boundary (0° horizon)
 * @returns { azimuth: number; elevation: number }
 */
export function coordsToLightAngles(
  hx: number,
  hy: number,
  cx: number,
  cy: number,
  maxRadius: number
): LightAngles {
  if (maxRadius <= 0) {
    return { azimuth: 0, elevation: 90 };
  }

  const dx = hx - cx;
  const dy = hy - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const distClamped = Math.min(dist, maxRadius);

  // At center origin, light shines from zenith (90° elevation)
  if (dist < 1e-6) {
    return { azimuth: 0, elevation: 90 };
  }

  // Azimuth: Angle in degrees clockwise from North (dx = r*sin(az), -dy = r*cos(az))
  const azRad = Math.atan2(dx, -dy);
  const azDeg = Math.round(((azRad * 180) / Math.PI + 360) % 360);

  // Elevation: Linear radial projection (0 at center -> 90° overhead; maxRadius at edge -> 0° grazing)
  const elDeg = Math.round((1 - distClamped / maxRadius) * 90);

  return {
    azimuth: azDeg % 360,
    elevation: Math.max(0, Math.min(90, elDeg)),
  };
}

/**
 * Converts 3D photometric spherical angles to 2D planar gizmo handle coordinates.
 *
 * @param azimuth Light azimuth in degrees (0° to 360°)
 * @param elevation Light elevation in degrees (0° to 90°)
 * @param cx Center X of the gizmo sphere
 * @param cy Center Y of the gizmo sphere
 * @param maxRadius Maximum radius of the gizmo boundary
 * @returns { x: number; y: number }
 */
export function lightAnglesToCoords(
  azimuth: number,
  elevation: number,
  cx: number,
  cy: number,
  maxRadius: number
): GizmoPoint {
  const safeElev = Math.max(0, Math.min(90, elevation));
  const r = maxRadius * (1 - safeElev / 90);
  const azRad = (azimuth * Math.PI) / 180;

  const x = cx + r * Math.sin(azRad);
  const y = cy - r * Math.cos(azRad);

  return { x, y };
}
