import type { GlintStyle, PhotometricAnalysisGeometry, PhotometricLightingParams } from '@/types/tools';
import type { ShadedPixel } from './curvesAndLines';
import { decodeNormalRGB } from '@/lib/art/normalSculptor';
import { rgbToOKLab, okLabToOKLCH, oklchToOKLab, okLabToRGB } from './colorSpace';

/** Artist-directed, two-tone GGX-shaped highlight. This is a bounded pixel-art
 * adaptation, not a full microfacet BRDF. See docs/research/specular-glint-2026-10-01.md.
 * Geometry is cached by the preview session; color edges never become glint normals.
 */
export function renderPixelGlints(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  params: PhotometricLightingParams & { glintStyle: GlintStyle },
  analysis: PhotometricAnalysisGeometry
): ShadedPixel[] {
  if (params.glintStyle === 'off') return [];
  const normals = analysis.glintNormalField ?? analysis.normalField;
  const painted = params.normalMapData;
  const normalData = painted && ('data' in painted ? painted.data : painted);
  const azimuth = params.lightAzimuth * Math.PI / 180;
  const elevation = Math.max(10, Math.min(90, params.lightElevation)) * Math.PI / 180;
  const lx = Math.sin(azimuth) * Math.cos(elevation);
  const ly = -Math.cos(azimuth) * Math.cos(elevation);
  const lz = Math.sin(elevation);
  const orbit = Math.max(8, Math.max(width, height) * 1.25);
  const centered = params.lightCenterX !== undefined && params.lightCenterY !== undefined;
  const lightX = (params.lightCenterX ?? width / 2) + lx * orbit;
  const lightY = (params.lightCenterY ?? height / 2) + ly * orbit;
  const lightZ = lz * orbit;
  const soft = params.glintStyle === 'soft';
  // A finite lobe avoids the subpixel sparkle of a zero-roughness point light.
  const roughness = soft ? 0.52 : 0.38;
  const alphaSquared = roughness ** 4;
  const strength = Math.max(0.3, Math.min(2.5, params.lightBrightness ?? 1.15));
  // Material changes the reflection's weight without making matte highlights
  // disappear. Two flat coverage levels keep the result on the native pixel grid.
  const materialGain = { matte: 1, fabric: 0.85, metal: 1.08, gold: 1.08, glass: 1.04 }[params.material] ?? 1;
  const colors = new Map<number, { r: number; g: number; b: number }>();
  const pixels: ShadedPixel[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const offset = index * 4;
      if (data[offset + 3] <= 30 || analysis.isFeatureMask?.[index] || analysis.isInkLineMask?.[index]) continue;
      // Protect colored ink too; the old path only recognized near-black outlines.
      const luminance = (data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722) / 255;
      const border = x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
        data[offset - 4 + 3] <= 30 || data[offset + 4 + 3] <= 30 ||
        data[offset - width * 4 + 3] <= 30 || data[offset + width * 4 + 3] <= 30;
      if (luminance < 0.045 || (border && luminance < 0.28)) continue;

      let nx = normals.nx[index], ny = normals.ny[index], nz = normals.nz[index];
      if (normalData && normalData[offset + 3] > 20) {
        // Painted surface normals override the estimated cushion for reflections.
        [nx, ny, nz] = decodeNormalRGB(normalData[offset], normalData[offset + 1], normalData[offset + 2], true);
        ny = -ny; // Painted OpenGL +Y is up; the bulb and estimated field use screen +Y down.
      }
      const normalLength = Math.hypot(nx, ny, nz);
      if (!Number.isFinite(normalLength) || normalLength < 1e-6) continue;
      nx /= normalLength; ny /= normalLength; nz /= normalLength;
      let px = lx, py = ly, pz = lz;
      if (centered) {
        const distance = Math.hypot(lightX - x, lightY - y, lightZ) || 1;
        px = (lightX - x) / distance; py = (lightY - y) / distance; pz = lightZ / distance;
      }
      const noLight = nx * px + ny * py + nz * pz;
      if (noLight <= 0 || nz <= 0) continue;
      const halfLength = Math.hypot(px, py, pz + 1) || 1;
      const noHalf = Math.max(0, Math.min(1, (nx * px + ny * py + nz * (pz + 1)) / halfLength));
      const denominator = noHalf * noHalf * (alphaSquared - 1) + 1;
      const lobe = (alphaSquared / denominator) ** 2;
      if (lobe < 0.16) continue;
      // A bright core and a distinct shoulder, rather than translucent gradients.
      // Strength changes these two tones together; local NoL never adds extra shades.
      const core = lobe >= 0.5;
      const coverage = core ? (soft ? 0.95 : 1) : (soft ? 0.75 : 0.9);
      const opacity = Math.min(0.96, coverage * materialGain);
      const key = ((data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2]) * 2 + Number(core);
      let color = colors.get(key);
      if (!color) {
        const lab = rgbToOKLab(data[offset], data[offset + 1], data[offset + 2]);
        const lch = okLabToOKLCH(lab.L, lab.a, lab.b);
        const lift = (core ? (soft ? 0.32 : 0.4) : (soft ? 0.2 : 0.28)) * strength;
        const lifted = oklchToOKLab(Math.min(0.98, lch.L + lift), lch.C, lch.h);
        color = okLabToRGB(lifted.L, lifted.a, lifted.b);
        colors.set(key, color);
      }
      const alpha = Math.round(opacity * 255);
      // Canvas stores premultiplied bytes. Choose representable straight RGB so
      // reading/restoring a translucent layer through Undo cannot change its color.
      const stableChannel = (channel: number) => alpha > 0
        ? Math.round(Math.round(channel * alpha / 255) * 255 / alpha) : 0;
      pixels.push({ x, y, r: stableChannel(color.r), g: stableChannel(color.g), b: stableChannel(color.b), a: alpha });
    }
  }
  return pixels;
}

/** Mix a glint into a lighting result without changing the source's coverage. */
export function applyPixelGlints(data: Uint8ClampedArray, width: number, pixels: ShadedPixel[]): void {
  for (const pixel of pixels) {
    const offset = (pixel.y * width + pixel.x) * 4;
    const opacity = pixel.a / 255;
    data[offset] = Math.round(data[offset] * (1 - opacity) + pixel.r * opacity);
    data[offset + 1] = Math.round(data[offset + 1] * (1 - opacity) + pixel.g * opacity);
    data[offset + 2] = Math.round(data[offset + 2] * (1 - opacity) + pixel.b * opacity);
  }
}
