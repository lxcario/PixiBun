export type MaterialRole = 'cloth' | 'metal' | 'skin' | 'emissive';
export interface DetailRegion { name: string; x: number; y: number; w: number; h: number }
export interface TileRule { north: string; east: string; south: string; west: string; walkable: boolean }
export type ResearchSettings =
  | { kind: 'pixelize'; block: number; candidate: 'average' | 'contrast' | 'nearest'; colors: string[]; protected: DetailRegion[]; preserveEdges?: boolean }
  | { kind: 'light'; azimuth: number; elevation: number; ambient: number; intensity: number; height: number; material: MaterialRole; regions: (DetailRegion & { material: MaterialRole })[]; shape?: 'flat' | 'rounded' }
  | { kind: 'scene'; tileSize: number; seed: number; path: 'none' | 'horizontal' | 'vertical'; tiles: TileRule[]; pins: { cell: number; tile: number }[] };
export interface ResearchRecipe {
  version: 1; name: string; width: number; height: number; settings: ResearchSettings;
  source: { frameId: string; layerId: string; sha256: string; normalLayerId?: string; normalSha256?: string };
}
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Research recipe must be an object.');
  return v as Record<string, unknown>;
};
const text = (v: unknown, max: number): string => {
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error('Invalid research recipe label.'); return v;
};
const number = (v: unknown, min: number, max: number, integer = true): number => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) throw new Error('Invalid research recipe number.'); return v;
};
const choice = <T extends string>(v: unknown, allowed: readonly T[]): T => {
  if (!allowed.includes(v as T)) throw new Error('Unknown research recipe option.'); return v as T;
};
const array = (v: unknown, max: number): unknown[] => { if (!Array.isArray(v) || v.length > max) throw new Error('Research recipe list exceeds its limit.'); return v; };
const material = (v: unknown) => choice(v, ['cloth', 'metal', 'skin', 'emissive'] as const);
function region(v: unknown, width: number, height: number): DetailRegion {
  const r = object(v), x = number(r.x, 0, width - 1), y = number(r.y, 0, height - 1);
  return { name: text(r.name, 64), x, y, w: number(r.w, 1, width - x), h: number(r.h, 1, height - y) };
}
export function parseResearchSettings(v: unknown, width: number, height: number): ResearchSettings {
  const s = object(v);
  number(width, 1, 256); number(height, 1, 256);
  if (s.kind === 'pixelize') {
    if (s.preserveEdges !== undefined && typeof s.preserveEdges !== 'boolean') throw new Error('Outline protection must be a boolean.');
    const colors = array(s.colors, 256).map(c => { if (typeof c !== 'string' || !/^#[a-f\d]{6}$/i.test(c)) throw new Error('Invalid allowed palette color.'); return c.toLowerCase(); });
    // Empty colors means no palette remapping. Existing nonempty recipes retain their restriction.
    return { kind: 'pixelize', block: number(s.block, 1, 16), candidate: choice(s.candidate, ['average', 'contrast', 'nearest']), colors,
      protected: array(s.protected, 16).map(r => region(r, width, height)), ...(s.preserveEdges === undefined ? {} : { preserveEdges: s.preserveEdges }) };
  }
  if (s.kind === 'light') return { kind: 'light', azimuth: number(s.azimuth, 0, 359), elevation: number(s.elevation, 5, 90),
    ambient: number(s.ambient, 0, 1, false), intensity: number(s.intensity, 0, 2, false), height: number(s.height, 0, 16), material: material(s.material),
    regions: array(s.regions, 16).map(v => ({ ...region(v, width, height), material: material(object(v).material) })),
    ...(s.shape === undefined ? {} : { shape: choice(s.shape, ['flat', 'rounded'] as const) }) };
  if (s.kind === 'scene') {
    const tileSize = number(s.tileSize, 1, 64);
    if (width % tileSize || height % tileSize || width * height / tileSize ** 2 > 16) throw new Error('Scene preview needs an evenly divided atlas with at most 16 tiles.');
    const tiles = array(s.tiles, 16).map(v => {
      const t = object(v); if (typeof t.walkable !== 'boolean') throw new Error('Tile walkability must be explicit.');
      return { north: text(t.north, 16), east: text(t.east, 16), south: text(t.south, 16), west: text(t.west, 16), walkable: t.walkable };
    });
    if (tiles.length !== width * height / tileSize ** 2) throw new Error('Every atlas tile needs an edge rule.');
    const pins = array(s.pins, 16).map(v => { const p = object(v); return { cell: number(p.cell, 0, tiles.length - 1), tile: number(p.tile, 0, tiles.length - 1) }; });
    if (new Set(pins.map(p => p.cell)).size !== pins.length) throw new Error('A scene cell has contradictory pins.');
    return { kind: 'scene', tileSize, seed: number(s.seed, 0, 0xffffffff), path: choice(s.path, ['none', 'horizontal', 'vertical']), tiles, pins };
  }
  throw new Error('Unknown research workflow.');
}
export function parseResearchRecipe(v: unknown): ResearchRecipe | undefined {
  if (v === undefined) return undefined;
  const r = object(v); if (r.version !== 1) throw new Error('Unsupported research recipe version.');
  const width = number(r.width, 1, 256), height = number(r.height, 1, 256), s = object(r.source);
  const hash = (v: unknown) => { if (typeof v !== 'string' || !/^[a-f\d]{64}$/.test(v)) throw new Error('Invalid research source fingerprint.'); return v; };
  const source: ResearchRecipe['source'] = { frameId: text(s.frameId, 128), layerId: text(s.layerId, 128), sha256: hash(s.sha256) };
  if (s.normalLayerId !== undefined || s.normalSha256 !== undefined) { source.normalLayerId = text(s.normalLayerId, 128); source.normalSha256 = hash(s.normalSha256); }
  return { version: 1, name: text(r.name, 64), width, height, settings: parseResearchSettings(r.settings, width, height), source };
}
export const researchBytes = (recipe?: ResearchRecipe) => recipe ? 256 + JSON.stringify(recipe).length * 2 : 0;
