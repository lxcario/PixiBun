/**
 * normalSculptor.ts
 * 2.5D Normal Chisel & Bas-Relief Sculptor
 * 
 * Tangent-space normal vector encoding/decoding, directional bevel & chamfer geometry,
 * shallow spherical rivet/stud domes, Reoriented Normal Mapping (RNM, Barré-Brisebois & Hill 2012),
 * and two-phase stroke envelope buffer to eliminate intra-stroke angular accumulation.
 */

export interface NormalVector3 {
  x: number;
  y: number;
  z: number;
}

export type NormalBlendMode = 'rnm' | 'udn' | 'overwrite';

export interface ChiselSettings {
  azimuth: number; // 0° to 360° (0 = North/Up, 90 = East/Right)
  incline: number; // 15° to 75° (angle relative to flat plane)
  width: number; // brush width (1 to 32px)
  ridgeMode: boolean; // dual-flank V-groove carving
  blendMode: NormalBlendMode;
}

export interface RivetSettings {
  radius: number; // 1 to 32px
  flatten: number; // 0.1 to 1.0 (1 = full hemisphere, 0.1 = shallow stud)
  invert: boolean; // false = dome/stud, true = dimple/countersunk screwhole
  blendMode: NormalBlendMode;
}

/**
 * Encodes a normalized tangent vector (nx, ny, nz) in [-1, 1]^3 to standard normal map RGB [0, 255]^3.
 * Uses OpenGL convention where +Y points Up (green channel increases towards top).
 * Perpendicular flat normal (0, 0, 1) encodes to (128, 128, 255).
 */
export function encodeNormalRGB(
  nx: number,
  ny: number,
  nz: number,
  openGLConvention: boolean = true
): [number, number, number] {
  // Ensure unit vector length
  const len = Math.hypot(nx, ny, nz);
  const unx = len > 1e-6 ? nx / len : 0;
  const uny = len > 1e-6 ? ny / len : 0;
  const unz = len > 1e-6 ? nz / len : 1;

  // OpenGL tangent space: +Y is Up. Screen space: +Y is Down.
  const yComp = openGLConvention ? uny : -uny;

  const r = Math.round(Math.max(0, Math.min(255, (unx + 1) * 127.5)));
  const g = Math.round(Math.max(0, Math.min(255, (yComp + 1) * 127.5)));
  const b = Math.round(Math.max(0, Math.min(255, (unz + 1) * 127.5)));

  return [r, g, b];
}

/**
 * Decodes standard normal map RGB [0, 255]^3 to a unit tangent normal vector (nx, ny, nz) in [-1, 1]^3.
 * Automatically accounts for OpenGL +Y up convention.
 */
export function decodeNormalRGB(
  r: number,
  g: number,
  b: number,
  openGLConvention: boolean = true
): [number, number, number] {
  const rawX = (r / 255) * 2 - 1;
  const rawY = (g / 255) * 2 - 1;
  const rawZ = (b / 255) * 2 - 1;

  const yComp = openGLConvention ? rawY : -rawY;

  const len = Math.hypot(rawX, yComp, rawZ);
  if (len < 1e-6) {
    return [0, 0, 1];
  }

  return [rawX / len, yComp / len, rawZ / len];
}

/**
 * Calculates a directional bevel / chamfer normal vector given compass azimuth and slope incline.
 * @param azimuthDeg Compass azimuth alpha in [0, 360) (0° = North/Up, 90° = East/Right, 180° = South, 270° = West)
 * @param inclineDeg Incline angle phi from flat plane in (0, 90] (e.g. 45° = 1:1 chamfer slope)
 * @param openGLConvention Whether +Y is OpenGL up
 */
export function computeDirectionalBevelNormal(
  azimuthDeg: number,
  inclineDeg: number,
  openGLConvention: boolean = true
): [number, number, number] {
  const alphaRad = (azimuthDeg * Math.PI) / 180;
  const phiRad = (Math.max(1, Math.min(90, inclineDeg)) * Math.PI) / 180;

  const sinPhi = Math.sin(phiRad);
  const cosPhi = Math.cos(phiRad);

  // Compass azimuth: 0° points North (+Y OpenGL, -Y screen), 90° points East (+X)
  const nx = sinPhi * Math.sin(alphaRad);
  const nyOpenGL = sinPhi * Math.cos(alphaRad);
  const nyScreen = -sinPhi * Math.cos(alphaRad);
  const nz = cosPhi;

  const ny = openGLConvention ? nyOpenGL : nyScreen;
  const len = Math.hypot(nx, ny, nz) || 1;

  return [nx / len, ny / len, nz / len];
}

/**
 * Reoriented Normal Mapping (RNM)
 * Reference: Colin Barré-Brisebois & Stephen Hill (2012), "Blending in Detail"
 * 
 * Accurately rotates the detail normal vector into the tangent space oriented by the base normal vector
 * using a shortest-arc quaternion transformation, avoiding the flattening distortion of linear averaging.
 */
export function blendNormalsRNM(
  base: [number, number, number],
  detail: [number, number, number]
): [number, number, number] {
  // Base normal shifted: t = (base.x, base.y, base.z + 1)
  const tx = base[0];
  const ty = base[1];
  const tz = Math.max(1e-5, base[2] + 1);

  // Detail normal with inverted X/Y: u = (-detail.x, -detail.y, detail.z)
  const ux = -detail[0];
  const uy = -detail[1];
  const uz = detail[2];

  // dot(t, u)
  const dotTU = tx * ux + ty * uy + tz * uz;

  // r = t * dot(t, u) - u * t.z
  const rx = tx * dotTU - ux * tz;
  const ry = ty * dotTU - uy * tz;
  const rz = tz * dotTU - uz * tz;

  const len = Math.hypot(rx, ry, rz);
  if (len < 1e-6) {
    return [0, 0, 1];
  }

  return [rx / len, ry / len, Math.max(0, rz / len)];
}

/**
 * UDN (Unreal Developer Network) Detail Normal Blending.
 * Linear combination of base and detail slopes with preserved base normal Z.
 */
export function blendNormalsUDN(
  base: [number, number, number],
  detail: [number, number, number]
): [number, number, number] {
  const rx = base[0] + detail[0];
  const ry = base[1] + detail[1];
  const rz = Math.max(1e-5, base[2]);

  const len = Math.hypot(rx, ry, rz) || 1;
  return [rx / len, ry / len, Math.max(0, rz / len)];
}

/**
 * Blends base and detail normals according to the selected blend mode.
 */
export function blendNormals(
  base: [number, number, number],
  detail: [number, number, number],
  mode: NormalBlendMode
): [number, number, number] {
  switch (mode) {
    case 'rnm':
      return blendNormalsRNM(base, detail);
    case 'udn':
      return blendNormalsUDN(base, detail);
    case 'overwrite':
    default:
      return detail;
  }
}

/**
 * Computes normal vector for a shallow spherical rivet or countersunk screwhole dimple.
 * @param dx Distance from rivet center X (-radius to +radius)
 * @param dy Distance from rivet center Y (-radius to +radius)
 * @param radius Rivet stamp radius in pixels
 * @param flatten Flattening factor h in (0, 1] (1 = hemisphere, 0.2 = shallow stud)
 * @param invert Inversion flag (true = dimple / screwhole)
 * @param openGLConvention Whether +Y is OpenGL up
 */
export function computeRivetNormal(
  dx: number,
  dy: number,
  radius: number,
  flatten: number = 0.5,
  invert: boolean = false,
  openGLConvention: boolean = true
): [number, number, number] | null {
  const rSq = (dx * dx + dy * dy) / (radius * radius);
  if (rSq > 1.0) {
    return null; // outside circular dome
  }

  const h = Math.max(0.05, Math.min(1.0, flatten));
  const u = dx / radius;
  const v = dy / radius;
  const zDome = Math.sqrt(Math.max(0, 1.0 - rSq));

  // Flattening scales horizontal slope components relative to vertical dome height
  let nx = h * u;
  let ny = openGLConvention ? -h * v : h * v;
  const nz = zDome;

  if (invert) {
    nx = -nx;
    ny = -ny;
  }

  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, Math.max(0, nz / len)];
}

/**
 * Intra-stroke envelope session.
 * Prevents angular accumulation artifacts when stamping continuously along a brush stroke.
 * Chiseled facets are tracked within an intra-stroke buffer, then composited onto the
 * underlying base layer via RNM when rendering.
 */
export class ChiselStrokeSession {
  readonly width: number;
  readonly height: number;
  readonly strokeNx: Float32Array;
  readonly strokeNy: Float32Array;
  readonly strokeNz: Float32Array;
  readonly strokeAlpha: Float32Array; // 0 to 1 coverage
  readonly modifiedIndices: Set<number>;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    const size = width * height;
    this.strokeNx = new Float32Array(size);
    this.strokeNy = new Float32Array(size);
    this.strokeNz = new Float32Array(size);
    this.strokeAlpha = new Float32Array(size);
    this.modifiedIndices = new Set<number>();
  }

  /**
   * Clears the current stroke buffer.
   */
  clear(): void {
    this.strokeNx.fill(0);
    this.strokeNy.fill(0);
    this.strokeNz.fill(0);
    this.strokeAlpha.fill(0);
    this.modifiedIndices.clear();
  }

  /**
   * Applies a directional chisel stamp at canvas coordinate (cx, cy).
   */
  stampChisel(
    cx: number,
    cy: number,
    settings: ChiselSettings,
    strokeTangent?: { dx: number; dy: number }
  ): void {
    const radius = Math.max(0.5, settings.width / 2);
    const rInt = Math.ceil(radius);

    // If ridge mode is active and we have a drag vector, use the perpendicular flank normal
    let normal: [number, number, number];
    if (settings.ridgeMode && strokeTangent && (strokeTangent.dx !== 0 || strokeTangent.dy !== 0)) {
      const len = Math.hypot(strokeTangent.dx, strokeTangent.dy);
      const perpX = -strokeTangent.dy / len;
      const perpY = strokeTangent.dx / len;
      const phiRad = (Math.max(15, Math.min(75, settings.incline)) * Math.PI) / 180;
      const sinPhi = Math.sin(phiRad);
      const cosPhi = Math.cos(phiRad);
      normal = [sinPhi * perpX, sinPhi * perpY, cosPhi];
    } else {
      normal = computeDirectionalBevelNormal(settings.azimuth, settings.incline, true);
    }

    for (let dy = -rInt; dy <= rInt; dy++) {
      const py = cy + dy;
      if (py < 0 || py >= this.height) continue;

      for (let dx = -rInt; dx <= rInt; dx++) {
        const px = cx + dx;
        if (px < 0 || px >= this.width) continue;

        const dist = Math.hypot(dx, dy);
        if (dist > radius) continue;

        const idx = py * this.width + px;

        let facetNormal = normal;
        // In dual-flank ridge mode, flip cross-flank slope on opposite side of stroke
        if (settings.ridgeMode && strokeTangent && (strokeTangent.dx !== 0 || strokeTangent.dy !== 0)) {
          const crossDot = dx * (-strokeTangent.dy) + dy * (strokeTangent.dx);
          if (crossDot < 0) {
            facetNormal = [-normal[0], -normal[1], normal[2]];
          }
        }

        // Two-phase envelope update: within this stroke, overwrite the normal facet
        // without recursive RNM self-rotation.
        this.strokeNx[idx] = facetNormal[0];
        this.strokeNy[idx] = facetNormal[1];
        this.strokeNz[idx] = facetNormal[2];
        this.strokeAlpha[idx] = 1.0;
        this.modifiedIndices.add(idx);
      }
    }
  }

  /**
   * Applies a spherical rivet or screwhole stamp at canvas coordinate (cx, cy).
   */
  stampRivet(cx: number, cy: number, settings: RivetSettings): void {
    const rInt = Math.ceil(settings.radius);

    for (let dy = -rInt; dy <= rInt; dy++) {
      const py = cy + dy;
      if (py < 0 || py >= this.height) continue;

      for (let dx = -rInt; dx <= rInt; dx++) {
        const px = cx + dx;
        if (px < 0 || px >= this.width) continue;

        const normal = computeRivetNormal(
          dx,
          dy,
          settings.radius,
          settings.flatten,
          settings.invert,
          true
        );

        if (!normal) continue;

        const idx = py * this.width + px;
        this.strokeNx[idx] = normal[0];
        this.strokeNy[idx] = normal[1];
        this.strokeNz[idx] = normal[2];
        this.strokeAlpha[idx] = 1.0;
        this.modifiedIndices.add(idx);
      }
    }
  }

  /**
   * Composites the stroke buffer onto base image data using RNM or specified blend mode.
   * Modifies the target image data in-place and returns it.
   */
  compositeOnto(
    baseImageData: ImageData,
    blendMode: NormalBlendMode = 'rnm'
  ): ImageData {
    const data = baseImageData.data;

    for (const idx of this.modifiedIndices) {
      const pIdx = idx * 4;
      const alpha = this.strokeAlpha[idx];
      if (alpha <= 0) continue;

      const detailNormal: [number, number, number] = [
        this.strokeNx[idx],
        this.strokeNy[idx],
        this.strokeNz[idx],
      ];

      const baseAlpha = data[pIdx + 3];
      let finalNormal: [number, number, number];

      if (baseAlpha > 20) {
        const baseNormal = decodeNormalRGB(data[pIdx], data[pIdx + 1], data[pIdx + 2], true);
        finalNormal = blendNormals(baseNormal, detailNormal, blendMode);
      } else {
        finalNormal = detailNormal;
      }

      const [r, g, b] = encodeNormalRGB(finalNormal[0], finalNormal[1], finalNormal[2], true);
      data[pIdx] = r;
      data[pIdx + 1] = g;
      data[pIdx + 2] = b;
      data[pIdx + 3] = 255;
    }

    return baseImageData;
  }
}
