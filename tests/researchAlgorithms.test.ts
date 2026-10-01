import { expect, it } from 'vitest';
import { runResearch, lightDirection, type ResearchInput } from '@/lib/research/algorithms';
import { parseResearchRecipe, parseResearchSettings, type ResearchSettings, type ResearchRecipe } from '@/lib/research/recipes';
const pixels = (w = 4, h = 4) => new Uint8ClampedArray(Array.from({ length: w * h }, () => [200, 100, 50, 255]).flat());
const detail: ResearchSettings = { kind: 'pixelize', block: 2, candidate: 'average', colors: ['#000000', '#ffffff'], protected: [] };
const light: ResearchSettings = { kind: 'light', azimuth: 90, elevation: 45, ambient: 0.25, intensity: 1, height: 0, material: 'cloth', regions: [] };
const scene: Extract<ResearchSettings, { kind: 'scene' }> = { kind: 'scene', tileSize: 2, seed: 22, path: 'horizontal', tiles: Array.from({ length: 4 }, () => ({ north: 'ground', east: 'ground', south: 'ground', west: 'ground', walkable: true })), pins: [] };
const input = (settings: ResearchSettings, data = pixels()): ResearchInput => ({ width: 4, height: 4, data, settings });
it('keeps a dark outline out of the fill at large blocks for every candidate', () => {
  const width = 32, height = 32, data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const radius = Math.hypot(x - 15.5, y - 15.5);
    if (radius <= 11) data.set(radius > 10 ? [57, 45, 76, 255] : [199, 146, 219, 255], (y * width + x) * 4);
  }
  const before = data.slice();
  for (const candidate of ['average', 'contrast', 'nearest'] as const) for (const block of [2, 4, 8, 16]) {
    const result = runResearch({ width, height, data, settings: { ...detail, colors: [], block, candidate, preserveEdges: true } });
    expect(result.data).toEqual(before);
  }
  expect(runResearch({ width, height, data, settings: { ...detail, colors: [], block: 8, candidate: 'nearest', preserveEdges: false } }).data).not.toEqual(before);
  expect(data).toEqual(before);
});
it('estimates directional rounded lighting without authored normals and leaves alpha and source intact', () => {
  const width = 32, height = 32, data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (Math.hypot(x - 15.5, y - 15.5) <= 11) data.set([199, 146, 219, 255], (y * width + x) * 4);
  const before = data.slice(), settings = { ...light, shape: 'rounded' as const };
  const right = runResearch({ width, height, data, settings }), left = runResearch({ width, height, data, settings: { ...settings, azimuth: 270 } });
  const at = (x: number, y: number) => (y * width + x) * 4;
  expect(right.data[at(23, 16)]).toBeGreaterThan(right.data[at(8, 16)]);
  expect(left.data[at(23, 16)]).toBeLessThan(left.data[at(8, 16)]);
  const top = runResearch({ width, height, data, settings: { ...settings, azimuth: 0 } });
  expect(top.data[at(16, 8)]).toBeGreaterThan(top.data[at(16, 23)]);
  expect(runResearch({ width, height, data, settings })).toEqual(right);
  for (let p = 3; p < data.length; p += 4) expect(right.data[p]).toBe(data[p]);
  expect(data).toEqual(before);
  const full = runResearch(input(settings)); expect(full.data.every(Number.isFinite)).toBe(true);
  expect(full.data.slice(0, 4)).not.toEqual(full.data.slice(12, 16));
});
it('retains old recipe behavior, honors authored normals and validates optional shape and outline choices', () => {
  expect(parseResearchSettings(detail, 4, 4)).toEqual(detail); expect(parseResearchSettings(light, 4, 4)).toEqual(light);
  expect(runResearch(input(light))).toEqual(runResearch(input({ ...light, shape: 'flat' })));
  const normal = new Uint8ClampedArray(Array.from({ length: 16 }, () => [240, 128, 190, 255]).flat());
  expect(runResearch({ ...input(light), normal })).toEqual(runResearch({ ...input({ ...light, shape: 'rounded' }), normal }));
  expect(() => parseResearchSettings({ ...detail, preserveEdges: 'yes' }, 4, 4)).toThrow(/boolean/);
  expect(() => parseResearchSettings({ ...light, shape: 'sphere' }, 4, 4)).toThrow(/option/);
});
it('keeps Original byte-exact for every style, including partial alpha and invisible RGB, in an independent buffer', () => {
  const data = pixels(); data.set([12, 34, 56, 0], 0); data.set([31, 121, 249, 51], 4);
  const before = data.slice();
  for (const candidate of ['average', 'contrast', 'nearest'] as const) {
    const settings = { ...detail, block: 1, colors: [], candidate };
    const result = runResearch(input(settings, data)); expect(result.data).toEqual(before);
    result.data.fill(0); expect(data).toEqual(before);
    expect(parseResearchSettings(settings, 4, 4)).toEqual(settings);
  }
});
it('unrestricted simplification keeps blue hues and per-pixel transparency instead of imposing an unrelated palette or filling empty space', () => {
  const data = new Uint8ClampedArray(Array.from({ length: 16 }, (_, i) => [0, 0, i * 15, i === 0 ? 0 : i === 1 ? 51 : 255]).flat());
  const before = data.slice(), result = runResearch(input({ ...detail, colors: [] }, data));
  for (let p = 0; p < data.length; p += 4) {
    expect(result.data[p]).toBe(0); expect(result.data[p + 1]).toBe(0); expect(result.data[p + 3]).toBe(data[p + 3]);
  }
  expect(data).toEqual(before);
  const remapped = runResearch(input({ ...detail, colors: ['#aa00aa'] }, data));
  expect(remapped.data[4]).toBe(170); expect(remapped.data[6]).toBe(170);
});
it('sampling an empty block center cannot delete occupied artwork when palette remapping is off', () => {
  const data = new Uint8ClampedArray(64); data.set([10, 50, 240, 255], 0); data.set([10, 50, 240, 51], 4);
  const result = runResearch(input({ ...detail, block: 4, candidate: 'nearest', colors: [] }, data));
  expect(result.data).toEqual(data);
});
it('stops adversarial scene backtracking at the search budget without claiming impossibility', () => {
  const tiles = Array.from({ length: 16 }, () => ({ north: 'ground', east: 'ground', south: 'ground', west: 'ground', walkable: true }));
  tiles[15].north = 'wall';
  expect(() => runResearch(input({ kind: 'scene', tileSize: 1, seed: 7, path: 'none', tiles, pins: [{ cell: 15, tile: 15 }] }))).toThrow(/20,000-step limit.*no impossible-map claim/);
});
it('preserves named rectangles byte-for-byte including partial alpha and transparent RGB while enforcing the palette elsewhere', () => {
  const data = pixels(); data.set([99, 61, 20, 51], 20); data.set([120, 70, 30, 0], 40);
  const before = data.slice(), result = runResearch(input({ ...detail, protected: [{ name: 'Thin detail', x: 1, y: 1, w: 2, h: 2 }] }, data));
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const p = (y * 4 + x) * 4;
    if (x >= 1 && x <= 2 && y >= 1 && y <= 2) expect(result.data.slice(p, p + 4)).toEqual(data.slice(p, p + 4));
    else expect([0, 255]).toContain(result.data[p]);
  }
  expect(data).toEqual(before);
});
it('offers distinct deterministic coarse candidates on original thin-line artwork', () => {
  const data = new Uint8ClampedArray(Array.from({ length: 16 }, (_, i) => i % 4 === 1 ? [0, 0, 0, 255] : [255, 255, 255, 255]).flat());
  const average = runResearch(input(detail, data)), contrast = runResearch(input({ ...detail, candidate: 'contrast' }, data));
  expect(contrast.data).not.toEqual(average.data); expect(runResearch(input({ ...detail, candidate: 'contrast' }, data))).toEqual(contrast);
});
it('handles partial border blocks and transparent cells without leaking unlisted visible RGB', () => {
  const data = pixels(3, 3); data.fill(0, 0, 4);
  const result = runResearch({ width: 3, height: 3, data, settings: { ...detail, block: 2, colors: ['#ff0000'] } });
  for (let p = 0; p < result.data.length; p += 4) if (result.data[p + 3]) expect([...result.data.slice(p, p + 3)]).toEqual([255, 0, 0]);
});
it('uses clockwise azimuth with Y up, matching positive-X and positive-Y authored normals', () => {
  expect(lightDirection(0, 45)[1]).toBeGreaterThan(0); expect(lightDirection(90, 45)[0]).toBeGreaterThan(0);
  const normal = new Uint8ClampedArray(Array.from({ length: 16 }, (_, i) => i % 4 < 2 ? [240, 128, 190, 255] : [15, 128, 190, 255]).flat());
  const result = runResearch({ ...input(light), normal });
  expect(result.data[0]).toBeGreaterThan(result.data[8]);
  const reverse = runResearch({ ...input({ ...light, azimuth: 270 }), normal }); expect(reverse.data[0]).toBeLessThan(reverse.data[8]);
});
it('keeps emissive regions unchanged and height-zero output alpha intact', () => {
  const data = pixels(); data[3] = 51;
  const result = runResearch(input({ ...light, regions: [{ name: 'Glow', x: 0, y: 0, w: 2, h: 4, material: 'emissive' }] }, data));
  expect(result.data.slice(0, 8)).toEqual(data.slice(0, 8));
  for (let p = 3; p < data.length; p += 4) expect(result.data[p]).toBe(data[p]);
  expect(result.shadow!.some(Boolean)).toBe(false);
});
it('casts opposite the same light direction and clips the manual-height projection', () => {
  const data = new Uint8ClampedArray(64); data.set([255, 255, 255, 255], (2 * 4 + 2) * 4);
  const result = runResearch(input({ ...light, height: 1 }, data));
  expect(result.shadow![(2 * 4 + 1) * 4 + 3]).toBeGreaterThan(0); expect(result.shadow![(2 * 4 + 3) * 4 + 3]).toBe(0);
});
it('reproduces seeded scenes with exact pins, compatible edges and a walkable center path', () => {
  const result = runResearch(input({ ...scene, pins: [{ cell: 0, tile: 3 }] })); expect(result.map![0]).toBe(3);
  expect(runResearch(input({ ...scene, pins: [{ cell: 0, tile: 3 }] }))).toEqual(result);
  for (const tile of result.map!.slice(2)) expect(scene.tiles[tile].walkable).toBe(true);
});
it('refuses contradictory edge labels instead of publishing a partial scene', () => {
  const settings = { ...scene, tiles: scene.tiles.map(t => ({ ...t, east: 'water', west: 'wall' })) };
  expect(() => runResearch(input(settings))).toThrow(/rules conflict/);
});
it('allows a blocked scene when no path is required without claiming walkability', () => {
  const settings = { ...scene, path: 'none' as const, tiles: scene.tiles.map(t => ({ ...t, walkable: false })) };
  const result = runResearch(input(settings));
  expect(result.map).toHaveLength(4);
  for (const tile of result.map!) expect(settings.tiles[tile].walkable).toBe(false);
  expect(result.notes).toContain('No path required; this scene may have blocked or disconnected cells.');
  expect(result.notes!.some(note => note.includes('path is walkable'))).toBe(false);
});
it('explains a pinned unwalkable path tile and rejects duplicate cell pins', () => {
  const settings = { ...scene, tiles: scene.tiles.map((t, i) => ({ ...t, walkable: i !== 1 })), pins: [{ cell: 2, tile: 1 }] };
  expect(() => runResearch(input(settings))).toThrow(/walkable path/);
  expect(() => parseResearchSettings({ ...scene, pins: [{ cell: 0, tile: 1 }, { cell: 0, tile: 2 }] }, 4, 4)).toThrow(/contradictory pins/);
});
it('reports visible border differences and repeated placements independently of matching labels', () => {
  const data = pixels(); data.set([255, 0, 0, 255], 4); data.set([0, 255, 0, 255], 0);
  const result = runResearch(input({ ...scene, pins: [0, 1, 2, 3].map(cell => ({ cell, tile: 0 })) }, data));
  expect(result.seams!.length).toBeGreaterThan(0); expect(result.repeats).toBe(3);
});
it('ignores meaningless RGB differences across fully transparent scene borders', () => {
  const data = pixels(); for (let p = 3; p < data.length; p += 4) data[p] = 0;
  expect(runResearch(input(scene, data)).seams).toEqual([]);
});
it.each([
  { ...detail, block: 0 }, { ...detail, colors: ['#xyzxyz'] }, { ...detail, protected: [{ name: 'bad', x: 3, y: 0, w: 2, h: 1 }] },
  { ...light, intensity: NaN }, { ...light, elevation: 0 }, { ...scene, seed: -1 }, { ...scene, tileSize: 3 },
])('refuses malformed or unbounded research settings %#', settings => { expect(() => parseResearchSettings(settings, 4, 4)).toThrow(); });
it('canonically copies bounded recipes and rejects mismatched normal provenance', () => {
  const recipe: ResearchRecipe = { version: 1, name: 'Original study', width: 4, height: 4, settings: detail, source: { frameId: 'f', layerId: 'l', sha256: 'a'.repeat(64) } };
  const parsed = parseResearchRecipe({ ...recipe, unused: 'discarded' })!; expect(parsed).toEqual(recipe); expect(parsed.settings).not.toBe(detail);
  expect(() => parseResearchRecipe({ ...recipe, source: { ...recipe.source, normalLayerId: 'n' } })).toThrow(/fingerprint/);
});
it('rejects raster shape mismatches before running a preview algorithm', () => { expect(() => runResearch(input(light, pixels(2, 2)))).toThrow(/invalid shape/); });
