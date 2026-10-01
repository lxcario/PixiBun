// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderPixelGlints, applyPixelGlints } from '@/lib/ai/math/pixelGlint';
import { computePhotometricAnalysis, executePhotometricPipeline } from '@/lib/ai/math/photometricLighting';
import { encodeNormalRGB } from '@/lib/art/normalSculptor';
import type { PhotometricLightingParams } from '@/types/tools';
import { makeCanvas, installDocumentCanvasMock } from './helpers/mockCanvas';
import { purpleCharacterPixels } from './fixtures/purpleCharacter';

installDocumentCanvasMock();
const width = 32, height = 32;
const settings: PhotometricLightingParams & { glintStyle: 'soft' | 'crisp' | 'off' } = {
  glintStyle: 'soft', lightAzimuth: 315, lightElevation: 45, lightRadius: 64,
  lightColor: '#FFFFFF', ambientIntensity: 0.48, lightBrightness: 1.15,
  material: 'metal', cavityStrength: 0, ditherModulation: 0, bayerSize: '4x4', formType: 'orb',
};
function sprite() {
  const canvas = makeCanvas(width, height), ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const radius = Math.hypot(x - 15.5, y - 15.5);
    if (radius <= 11) image.data.set(radius >= 10 ? [58, 46, 76, 255] : [46, 92, 210, x === 11 && y === 11 ? 128 : 255], (y * width + x) * 4);
  }
  ctx.putImageData(image, 0, 0);
  return { canvas, ctx, data: image.data, analysis: computePhotometricAnalysis(ctx, width, height, settings) };
}

describe('pixel glint quality and coverage', () => {
  it('makes compact blue highlight clusters, with a smaller crisp footprint and no gold or white blotch', () => {
    const { data, analysis } = sprite();
    const soft = renderPixelGlints(data, width, height, settings, analysis);
    const crisp = renderPixelGlints(data, width, height, { ...settings, glintStyle: 'crisp' }, analysis);
    expect(soft.length).toBeGreaterThan(1);
    expect(crisp.length).toBeGreaterThan(0);
    expect(crisp.length).toBeLessThan(soft.length);
    expect(soft.length).toBeLessThan(40);
    for (const pixel of [...soft, ...crisp]) {
      expect(pixel.b).toBeGreaterThan(pixel.r);
      expect(pixel.b).toBeGreaterThan(pixel.g);
      expect(pixel.a).toBeLessThanOrEqual(245);
      expect(data[(pixel.y * width + pixel.x) * 4 + 3]).toBeGreaterThan(0);
    }
    expect(renderPixelGlints(data, width, height, { ...settings, glintStyle: 'off' }, analysis)).toEqual([]);
  });

  it('makes default matte character glints visibly brighter with just two native pixel tones', () => {
    const canvas = makeCanvas(width, height), ctx = canvas.getContext('2d')!;
    const image = ctx.createImageData(width, height);
    image.data.set(purpleCharacterPixels()); ctx.putImageData(image, 0, 0);
    const params = { ...settings, material: 'matte' as const, formType: 'character' as const };
    const analysis = computePhotometricAnalysis(ctx, width, height, params);
    const glints = renderPixelGlints(image.data, width, height, params, analysis);
    const result = image.data.slice(); applyPixelGlints(result, width, glints);
    const visible = glints.filter(p => {
      const i = (p.y * width + p.x) * 4;
      const luminance = (bytes: Uint8ClampedArray) => bytes[i] * 0.2126 + bytes[i + 1] * 0.7152 + bytes[i + 2] * 0.0722;
      return luminance(result) - luminance(image.data) >= 35;
    });
    expect(visible.length).toBeGreaterThanOrEqual(4);
    expect(glints.length).toBeLessThan(70);
    const tones = new Set(glints.filter(p => image.data[(p.y * width + p.x) * 4] === 164)
      .map(p => `${p.r},${p.g},${p.b},${p.a}`));
    expect(tones.size).toBeLessThanOrEqual(2);
    expect(glints.every(p => image.data[(p.y * width + p.x) * 4] !== 58)).toBe(true);
    const points = new Set(glints.map(p => p.y * width + p.x));
    expect(visible.filter(p => [p.x - 1 + p.y * width, p.x + 1 + p.y * width,
      p.x + (p.y - 1) * width, p.x + (p.y + 1) * width].some(i => points.has(i))).length).toBeGreaterThanOrEqual(4);
  });

  it('keeps light-side highlights compact across cardinal directions and a small angular movement', () => {
    const { data, analysis } = sprite();
    for (const angle of [0, 90, 180, 270, 315, 316]) {
      const pixels = renderPixelGlints(data, width, height, { ...settings, lightAzimuth: angle }, analysis);
      expect(pixels.length).toBeGreaterThan(0);
      expect(pixels.length).toBeLessThan(40);
      const az = angle * Math.PI / 180;
      const centerX = pixels.reduce((sum, p) => sum + p.x, 0) / pixels.length;
      const centerY = pixels.reduce((sum, p) => sum + p.y, 0) / pixels.length;
      expect((centerX - 15.5) * Math.sin(az) - (centerY - 15.5) * Math.cos(az)).toBeGreaterThan(0);
    }
    const first = renderPixelGlints(data, width, height, settings, analysis);
    const shifted = renderPixelGlints(data, width, height, { ...settings, lightAzimuth: 316 }, analysis);
    const keys = new Set(first.map(p => p.y * width + p.x));
    expect(shifted.filter(p => keys.has(p.y * width + p.x)).length).toBeGreaterThan(first.length * 0.5);
  });

  it('honors authored normals rather than a color edge or guessed cushion', () => {
    const { data, analysis } = sprite();
    const normals = new Uint8ClampedArray(data.length);
    // Explicitly face away from the upper-left light everywhere.
    const rgb = encodeNormalRGB(0.7, -0.7, 0.1, true);
    for (let i = 0; i < data.length; i += 4) normals.set([...rgb, 255], i);
    expect(renderPixelGlints(data, width, height, { ...settings, normalMapData: normals }, analysis)).toEqual([]);
  });

  it('protects features, colored outlines, source pixels, and partial transparency', () => {
    const { data, analysis } = sprite();
    const original = data.slice();
    const pixels = renderPixelGlints(data, width, height, settings, analysis);
    const point = pixels[0], index = point.y * width + point.x;
    analysis.isFeatureMask = new Uint8Array(width * height);
    analysis.isFeatureMask[index] = 1;
    expect(renderPixelGlints(data, width, height, settings, analysis).some(p => p.x === point.x && p.y === point.y)).toBe(false);
    expect(data).toEqual(original);
    const target = data.slice(); target[index * 4 + 3] = 120;
    applyPixelGlints(target, width, pixels);
    expect(target[index * 4 + 3]).toBe(120);
    expect(target.filter((_, i) => i % 4 === 3)).toEqual(data.filter((_, i) => i % 4 === 3).map((a, i) => i === index ? 120 : a));
  });

  it('uses the painted OpenGL up direction consistently with the bulb compass', () => {
    const { data, analysis } = sprite();
    const normals = new Uint8ClampedArray(data.length);
    const halfAngle = Math.PI / 8;
    const rgb = encodeNormalRGB(0, Math.sin(halfAngle), Math.cos(halfAngle), true);
    for (let offset = 0; offset < data.length; offset += 4) normals.set([...rgb, 255], offset);
    const north = renderPixelGlints(data, width, height, { ...settings, lightAzimuth: 0, normalMapData: normals }, analysis);
    const south = renderPixelGlints(data, width, height, { ...settings, lightAzimuth: 180, normalMapData: normals }, analysis);
    expect(north.length).toBeGreaterThan(0);
    expect(south).toEqual([]);
  });

  it('controls real lighting highlights without changing diffuse shading or adding alpha', () => {
    const { ctx, data, analysis } = sprite();
    const original = data.slice();
    const off = executePhotometricPipeline(ctx, width, height, { ...settings, glintStyle: 'off', precomputedAnalysis: analysis }).getContext('2d')!.getImageData(0, 0, width, height).data;
    const soft = executePhotometricPipeline(ctx, width, height, { ...settings, precomputedAnalysis: analysis }).getContext('2d')!.getImageData(0, 0, width, height).data;
    const points = new Set(renderPixelGlints(data, width, height, settings, analysis).map(p => p.y * width + p.x));
    let differences = 0;
    for (let i = 0; i < width * height; i++) {
      expect(soft[i * 4 + 3]).toBe(data[i * 4 + 3]);
      if (soft[i * 4] !== off[i * 4] || soft[i * 4 + 1] !== off[i * 4 + 1] || soft[i * 4 + 2] !== off[i * 4 + 2]) {
        differences++; expect(points.has(i)).toBe(true);
      }
    }
    expect(differences).toBeGreaterThan(0);
    expect(ctx.getImageData(0, 0, width, height).data).toEqual(original);
  });

  it('keeps highlighted pixels in an explicitly chosen palette', () => {
    const { ctx, data, analysis } = sprite();
    const palette = ['#1f3460', '#2e5cd2', '#87b6ff'];
    const output = executePhotometricPipeline(ctx, width, height, { ...settings, precomputedAnalysis: analysis }, palette).getContext('2d')!.getImageData(0, 0, width, height).data;
    const allowed = new Set(['31,52,96', '46,92,210', '135,182,255']);
    for (const pixel of renderPixelGlints(data, width, height, settings, analysis)) {
      const offset = (pixel.y * width + pixel.x) * 4;
      expect(allowed.has(Array.from(output.slice(offset, offset + 3)).join(','))).toBe(true);
    }
  });
});
