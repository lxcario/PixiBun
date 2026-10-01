// @vitest-environment happy-dom
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { buildAnimationModel, playbackOrder, godotSpriteFramesResource } from '@/lib/export/animationModel';
import { defaultPaletteSemantics, indexSemanticPixels, parsePaletteSemantics } from '@/lib/color/paletteSemantics';
import { godotPaletteShader } from '@/lib/export/godotPaletteShader';
import { packSpriteSheet } from '@/lib/export/spriteSheetPacker';
import { zipBundle } from '@/lib/export/zipBundle';
import { makeCanvas } from './helpers/mockCanvas';
import type { AnimationFrame } from '@/types/canvas';
import type { ColorPalette } from '@/types/palette';

const frames = [70, 230, 110].map((durationMs, i) => ({ id: `f${i}`, durationMs, layers: [] } as AnimationFrame));
const palette: ColorPalette = { id: 'kit', name: 'Roles', colors: ['#ff0000', '#0000ff', '#ff0000'] };
beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
  return makeCanvas(this.width, this.height).getContext('2d');
}); });
afterEach(() => vi.restoreAllMocks());

it('preserves uneven holds and complete named forward, reverse and bounce periods', () => {
  const model = buildAnimationModel(frames, [
    { id: 'forward', name: 'Walk', startFrame: 0, endFrame: 2 },
    { id: 'reverse', name: 'Back', startFrame: 0, endFrame: 2, loopMode: 'reverse' },
    { id: 'bounce', name: 'Bounce', startFrame: 0, endFrame: 2, loopMode: 'ping-pong' },
  ], 'repeat');
  expect(model.frames.map(f => f.durationMs)).toEqual([70, 230, 110]);
  expect(model.clips.map(c => c.frames)).toEqual([[0, 1, 2], [0, 1, 2], [2, 1, 0], [0, 1, 2, 1]]);
  expect(model.clips.every(c => c.loop)).toBe(true);
});
it('once ends on the last pose of the requested direction and two-pose bounce holds endpoints once', () => {
  expect(playbackOrder(2, 3, 'ping-pong')).toEqual([2, 3]);
  expect(playbackOrder(0, 2, 'reverse', 'ping-pong')).toEqual([2, 1, 0, 1]);
  expect(buildAnimationModel(frames, [], 'once').clips[0].loop).toBe(false);
});
it('remaps a scoped reverse clip and omits incomplete clips', () => {
  const model = buildAnimationModel(frames.slice(1), [
    { id: 'full', name: 'Full', startFrame: 0, endFrame: 2 },
    { id: 'scoped', name: 'Back', startFrame: 1, endFrame: 2, loopMode: 'reverse' },
  ], 'repeat', [1, 2]);
  expect(model.clips.map(c => [c.name, c.frames])).toEqual([['All frames', [0, 1]], ['Back', [1, 0]]]);
});
it('escapes quoted Unicode names and distinguishes duplicate clip labels deterministically', () => {
  const model = buildAnimationModel(frames, [0, 1].map(i => ({ id: String(i), name: '歩く "left"', startFrame: 0, endFrame: 2 })), 'repeat');
  expect(model.clips.map(c => c.name)).toEqual(['All frames', '歩く "left"', '歩く "left" (2)']);
  expect(godotSpriteFramesResource(model, frames.map(() => ({ x: 0, y: 0, w: 16, h: 16 })), 'safe-sheet.png')).toContain('&"歩く \\"left\\""');
});
it.each([[-1, 1, 2], [0.5, 1, 2], [0, 0, 2]])('refuses invalid source indices %j', (...indices) => {
  expect(() => buildAnimationModel(frames, [], 'repeat', indices)).toThrow(/valid frames/);
});
it('rejects invalid durations and inverted bounds before producing resources', () => {
  expect(() => buildAnimationModel([{ ...frames[0], durationMs: 0 }], [], 'repeat')).toThrow();
  expect(() => buildAnimationModel(frames, [{ id: 'bad', name: 'Bad', startFrame: 2, endFrame: 0 }], 'repeat')).toThrow();
});
it('refuses missing frame identity before exporting binding metadata', () => {
  expect(() => buildAnimationModel([{ ...frames[0], id: '' }], [], 'repeat')).toThrow();
});
it('derives valid scoped register IDs from a maximum-length admitted palette ID', () => {
  const semantics = defaultPaletteSemantics({ ...palette, id: 'p'.repeat(256) });
  expect(parsePaletteSemantics(semantics, palette.colors.length)).toEqual(semantics);
  expect(semantics.entries.every(e => e.id.length <= 256)).toBe(true);
});
it('sprite-sheet metadata references the actual PNG and carries holds and named clips', () => {
  const model = buildAnimationModel(frames, [{ id: 'back', name: 'Back', startFrame: 0, endFrame: 2, loopMode: 'reverse' }], 'repeat');
  const result = packSpriteSheet(frames.map(() => makeCanvas(16, 16)), 16, 16, 12, 'Hero', { layout: 'grid', scale: 2, padding: 1, animation: model, textureFilename: 'hero-sheet-2x.png' });
  const tp = JSON.parse(result.metadata.texturePackerJson);
  expect(tp.meta.image).toBe('hero-sheet-2x.png'); expect(tp.frames.map((f: { duration: number }) => f.duration)).toEqual([70, 230, 110]);
  expect(tp.meta.animations[1].frames).toEqual([2, 1, 0]);
  expect(result.metadata.godotTres).toContain('path="res://hero-sheet-2x.png"');
  expect(result.metadata.godotTres).toContain('"speed": 1000.0'); expect(result.metadata.godotTres).toContain('"duration": 230.0');
});
it('requires explicit assignments for visible duplicate RGB values and keeps the raster unchanged', () => {
  const data = new Uint8ClampedArray([255, 0, 0, 51, 0, 0, 255, 255, 99, 34, 12, 0]); const before = data.slice();
  expect(() => indexSemanticPixels(data, 3, 1, palette, 'f0')).toThrow(/duplicate/);
  const semantics = defaultPaletteSemantics(palette);
  semantics.entries[2].role = 'cloth-light'; semantics.bindings.push({ id: 'bind', frameId: 'f0', entryId: semantics.entries[2].id, x: 0, y: 0, w: 1, h: 1 });
  const result = indexSemanticPixels(data, 3, 1, { ...palette, semantics }, 'f0');
  expect(Array.from(result.indices)).toEqual([2, 1, 0]); expect(Array.from(result.alpha)).toEqual([51, 255, 0]); expect(data).toEqual(before);
});
it('keeps all 256 registers available independently of source alpha', () => {
  const full = { ...palette, colors: Array.from({ length: 256 }, (_, i) => `#${i.toString(16).padStart(2, '0')}0000`) };
  const result = indexSemanticPixels(new Uint8ClampedArray([255, 0, 0, 1, 0, 0, 0, 255]), 2, 1, full, 'f0');
  expect(Array.from(result.indices)).toEqual([255, 0]); expect(Array.from(result.alpha)).toEqual([1, 255]);
});
it('only matching RGB bindings win and does not reuse another frame assignment', () => {
  const semantics = defaultPaletteSemantics(palette);
  semantics.bindings = [0, 2, 1].map((index, i) => ({ id: String(i), frameId: 'f0', entryId: semantics.entries[index].id, x: 0, y: 0, w: 1, h: 1 }));
  const data = new Uint8ClampedArray([255, 0, 0, 255]);
  expect(indexSemanticPixels(data, 1, 1, { ...palette, semantics }, 'f0').indices[0]).toBe(2);
  expect(() => indexSemanticPixels(data, 1, 1, { ...palette, semantics }, 'f1')).toThrow(/duplicate/);
});
it('refuses non-palette colors instead of silently quantizing them', () => {
  expect(() => indexSemanticPixels(new Uint8ClampedArray([250, 0, 0, 255]), 1, 1, palette, 'f0')).toThrow(/outside the selected palette/);
});
it('admits bounded canonical semantics and rejects dangling register IDs and oversized roles', () => {
  const semantics = defaultPaletteSemantics(palette); expect(parsePaletteSemantics(semantics, 3)).toEqual(semantics);
  semantics.entries[0].role = 'x'.repeat(65); expect(parsePaletteSemantics(semantics, 3)).toBeNull();
  semantics.entries[0].role = ''; semantics.bindings.push({ id: 'b', frameId: 'f0', entryId: 'missing', x: 0, y: 0, w: 1, h: 1 });
  expect(parsePaletteSemantics(semantics, 3)).toBeNull();
});
it('floors discrete phase before direction and produces rounded BlendShift for the runtime shader', () => {
  const track = { id: 't', low: 0, high: 2, rate: 1.23456789, direction: 'forward' as const, enabled: true, blendShift: false };
  expect(godotPaletteShader([track], 3)).toContain('k + floor(elapsed_seconds * 1.23456789) * -1.0');
  expect(godotPaletteShader([{ ...track, blendShift: true }], 3)).toContain('floor(mix(first, second, fract(phase)) * 255.0 + 0.5)');
});
it('refuses path traversal and duplicate archive assets before writing ZIP bytes', () => {
  expect(() => zipBundle([{ name: '../escape.png', bytes: new Uint8Array() }])).toThrow();
  expect(() => zipBundle(['same.png', 'same.png'].map(name => ({ name, bytes: new Uint8Array() })))).toThrow();
});
