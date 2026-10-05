// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceStore, WORKSPACE_PRESETS } from '@/stores/workspaceStore';
import { useStudioStore } from '@/stores/studioStore';
import { triangleHsv, trianglePoint, hsvToHex, hexToHsv } from '@/lib/color/hsvPicker';
import { pixelGradient, type PixelGradientOptions } from '@/lib/canvas/pixelGradient';

describe('Artist workspace preferences', () => {
  beforeEach(() => { localStorage.clear(); useWorkspaceStore.setState({ layout: { ...WORKSPACE_PRESETS.drawing }, activeLayout: 'drawing', savedLayouts: [], favoritePalettes: [], focusMode: false }); });
  it('restores a named left-side layout without changing artwork or its revision', () => {
    const before = useStudioStore.getState(), frames = before.frames, revision = before.editRevision;
    useWorkspaceStore.getState().updateLayout({ inspectorSide: 'left', inspectorWidth: 400, navigator: true, timeline: false });
    expect(useWorkspaceStore.getState().saveLayout('Sprite desk')).toBe(true);
    const id = useWorkspaceStore.getState().activeLayout;
    useWorkspaceStore.getState().chooseLayout('animation');
    useWorkspaceStore.getState().hydrate();
    useWorkspaceStore.getState().chooseLayout(id);
    expect(useWorkspaceStore.getState().layout).toMatchObject({ inspectorSide: 'left', inspectorWidth: 400, navigator: true, timeline: false });
    expect(useStudioStore.getState().frames).toBe(frames); expect(useStudioStore.getState().editRevision).toBe(revision);
  });
  it('restores focus mode without overwriting the workspace and does not persist focus', () => {
    useWorkspaceStore.getState().updateLayout({ color: true }); const layout = useWorkspaceStore.getState().layout;
    useWorkspaceStore.getState().toggleFocus(); useWorkspaceStore.getState().toggleFocus();
    expect(useWorkspaceStore.getState().layout).toBe(layout); expect(localStorage.getItem('pixibun:artist-workspace:v1')).not.toContain('focusMode');
  });
  it('ignores malformed and oversized preferences and survives denied storage', () => {
    for (const raw of ['null', '{', 'x'.repeat(32769), JSON.stringify({ layout: { ...WORKSPACE_PRESETS.drawing, inspectorWidth: '999px' } })]) {
      localStorage.setItem('pixibun:artist-workspace:v1', raw); useWorkspaceStore.getState().hydrate();
      expect(useWorkspaceStore.getState().layout).toEqual(WORKSPACE_PRESETS.drawing);
    }
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => useWorkspaceStore.getState().updateLayout({ inspectorWidth: 999 })).not.toThrow();
    expect(useWorkspaceStore.getState().layout.inspectorWidth).toBe(420); spy.mockRestore();
  });
  it('limits user layouts and restores palette favorites', () => {
    for (let i = 0; i < 6; i++) expect(useWorkspaceStore.getState().saveLayout(`Desk ${i}`)).toBe(true);
    expect(new Set(useWorkspaceStore.getState().savedLayouts.map(layout => layout.id)).size).toBe(6);
    expect(useWorkspaceStore.getState().saveLayout('Seventh')).toBe(false);
    useWorkspaceStore.getState().toggleFavorite('sweetie-16'); useWorkspaceStore.setState({ favoritePalettes: [] }); useWorkspaceStore.getState().hydrate();
    expect(useWorkspaceStore.getState().favoritePalettes).toEqual(['sweetie-16']);
  });
});
describe('Onion settings admission', () => {
  it('bounds counts and opacity, ignores nonfinite values and does not dirty an unchanged setting', () => {
    const studio = useStudioStore.getState();
    studio.setOnionSkin({ prevFrames: 99, nextFrames: -2, opacity: 2 });
    expect(useStudioStore.getState().onionSkin).toMatchObject({ prevFrames: 5, nextFrames: 0, opacity: 1 });
    const revision = useStudioStore.getState().editRevision;
    studio.setOnionSkin({ prevFrames: NaN, nextFrames: Infinity, opacity: NaN });
    studio.setOnionSkin({ prevFrames: 5, nextFrames: 0, opacity: 1 });
    expect(useStudioStore.getState().editRevision).toBe(revision);
  });
});
describe('Color triangle geometry', () => {
  it('maps the three vertices to hue, white and black', () => {
    const hue = triangleHsv(0.5, 0), white = triangleHsv(0, 1), black = triangleHsv(1, 1);
    expect(hsvToHex(120, ...hue)).toBe('#00ff00'); expect(hsvToHex(120, ...white)).toBe('#ffffff'); expect(hsvToHex(120, ...black)).toBe('#000000');
  });
  it('round-trips saturation/value and clamps drags outside the triangle', () => {
    for (const s of [0, 0.25, 0.75, 1]) for (const v of [0.1, 0.5, 1]) {
      const p = trianglePoint(s, v), actual = triangleHsv(p.x, p.y); expect(actual[0]).toBeCloseTo(s); expect(actual[1]).toBeCloseTo(v);
    }
    for (const [x, y] of [[-5, 0], [3, 0], [0.5, -2], [0.5, 8]]) for (const c of triangleHsv(x, y)) { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThanOrEqual(1); }
    for (const hex of ['#fa3366', '#00ff00', '#778899', '#000000', '#ffffff']) expect(hsvToHex(...hexToHsv(hex))).toBe(hex);
  });
});
describe('Selection-aware pixel gradients', () => {
  const options: PixelGradientOptions = { shape: 'linear', colors: ['#ff0000', '#0000ff'], dither: true, selection: null, mask: null };
  it('keeps exact ramp colors and endpoints without introducing intermediate RGB values', () => {
    const data = pixelGradient(16, 4, { x: 0, y: 0 }, { x: 15, y: 0 }, options);
    for (let i = 0; i < data.length; i += 4) expect([[255, 0, 0, 255], [0, 0, 255, 255]]).toContainEqual(Array.from(data.slice(i, i + 4)));
    expect(Array.from(data.slice(0, 4))).toEqual([255, 0, 0, 255]); expect(Array.from(data.slice(60, 64))).toEqual([0, 0, 255, 255]);
  });
  it('honors a nonrectangular mask and selection boundary', () => {
    const mask = new Uint8Array(16); mask[5] = mask[10] = mask[0] = 1;
    const data = pixelGradient(4, 4, { x: 0, y: 0 }, { x: 3, y: 0 }, { ...options, selection: { x: 1, y: 1, w: 2, h: 2 }, mask });
    expect(Array.from(data).filter((_, i) => i % 4 === 3 && data[i] !== 0)).toHaveLength(2); expect(data[3]).toBe(0);
  });
  it('uses palette order for hard bands and radial distance for circular ramps', () => {
    const ramp = { ...options, dither: false, colors: ['#ff0000', '#00ff00', '#0000ff'] };
    const data = pixelGradient(5, 1, { x: 0, y: 0 }, { x: 4, y: 0 }, ramp);
    expect(Array.from(data.slice(8, 12))).toEqual([0, 255, 0, 255]);
    const radial = pixelGradient(5, 5, { x: 2, y: 2 }, { x: 4, y: 2 }, { ...ramp, shape: 'radial' });
    expect(Array.from(radial.slice((2 * 5 + 3) * 4, (2 * 5 + 3) * 4 + 4))).toEqual(Array.from(radial.slice((3 * 5 + 2) * 4, (3 * 5 + 2) * 4 + 4)));
  });
  it('does not paint a zero-length drag or a one-color ramp', () => {
    expect(pixelGradient(4, 4, { x: 1, y: 1 }, { x: 1, y: 1 }, options).every(v => v === 0)).toBe(true);
    expect(pixelGradient(4, 4, { x: 0, y: 0 }, { x: 3, y: 0 }, { ...options, colors: ['#ffffff'] }).every(v => v === 0)).toBe(true);
  });
});
