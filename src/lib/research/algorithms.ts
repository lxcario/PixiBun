import { parseResearchSettings, type ResearchSettings, type MaterialRole, type DetailRegion } from './recipes';
import { srgbToLinear, linearToSrgb } from '@/lib/ai/math/colorSpace';
import { computeSeparableEDT, generateInflatedHeightmap, computeTangentNormalField, bakeNormalMapToRgba } from '@/lib/ai/math/edtNormalMap';
export interface ResearchInput { width: number; height: number; data: Uint8ClampedArray; normal?: Uint8ClampedArray; settings: ResearchSettings }
export interface ResearchOutput { data: Uint8ClampedArray; specular?: Uint8ClampedArray; shadow?: Uint8ClampedArray; map?: number[]; seams?: { cell: number; side: 'east' | 'south'; mismatches: number }[]; repeats?: number; notes: string[] }
const inside = (x: number, y: number, r: DetailRegion) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
export function validateResearchInput(input: ResearchInput): ResearchSettings {
  const settings = parseResearchSettings(input.settings, input.width, input.height), bytes = input.width * input.height * 4;
  if (!(input.data instanceof Uint8ClampedArray) || input.data.length !== bytes || (input.normal && (!(input.normal instanceof Uint8ClampedArray) || input.normal.length !== bytes))) throw new Error('Research pixels have an invalid shape.');
  return settings;
}
export function simplifyDetails({ width, height, data }: ResearchInput, s: Extract<ResearchSettings, { kind: 'pixelize' }>): ResearchOutput {
  if (s.block === 1 && !s.colors.length) return { data: data.slice(), notes: ['Original: every RGBA pixel is unchanged.'] };
  const output = new Uint8ClampedArray(data.length), colors = s.colors.map(c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)));
  const kept = new Uint8Array(width * height);
  if (s.preserveEdges) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = (y * width + x) * 4;
    if (!data[p + 3]) continue;
    // Retain both sides of strong color boundaries and the occupied silhouette.
    // Kept pixels are excluded from block samples so an outline cannot bleed into the fill.
    kept[p / 4] = Number(s.protected.some(r => inside(x, y, r)) || [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([nx, ny]) => {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return true;
      const q = (ny * width + nx) * 4;
      return !data[q + 3] || [0, 1, 2].some(c => Math.abs(data[p + c] - data[q + c]) >= 64);
    }));
  }
  for (let by = 0; by < height; by += s.block) for (let bx = 0; bx < width; bx += s.block) {
    const indices: number[] = []; const sums = [0, 0, 0]; let alpha = 0, pixels = 0;
    for (let y = by; y < Math.min(height, by + s.block); y++) for (let x = bx; x < Math.min(width, bx + s.block); x++) {
      const p = (y * width + x) * 4;
      if (kept[p / 4]) continue;
      pixels++; alpha += data[p + 3];
      if (data[p + 3]) { indices.push(p); for (let c = 0; c < 3; c++) sums[c] += srgbToLinear(data[p + c]) * data[p + 3]; }
    }
    let rgb = sums.map(v => alpha ? linearToSrgb(v / alpha) : 0), a = Math.round(alpha / pixels);
    if (indices.length && s.candidate !== 'average') {
      let pick = indices[0];
      if (s.candidate === 'contrast') {
        let distance = -1; for (const p of indices) { const d = rgb.reduce((sum, v, c) => sum + (v - data[p + c]) ** 2, 0); if (d > distance) { pick = p; distance = d; } }
      } else {
        const cx = Math.min(width - 1, bx + Math.floor(s.block / 2)), cy = Math.min(height - 1, by + Math.floor(s.block / 2));
        pick = (cy * width + cx) * 4;
        if (kept[pick / 4] || (!colors.length && !data[pick + 3])) {
          // A transparent sample must not erase the occupied part of a block.
          pick = indices.reduce((best, p) => {
            const distance = (i: number) => (i / 4 % width - cx) ** 2 + (Math.floor(i / 4 / width) - cy) ** 2;
            return distance(p) < distance(best) ? p : best;
          }, indices[0]);
        }
      }
      rgb = Array.from(data.slice(pick, pick + 3)); a = data[pick + 3];
    }
    let chosen = colors[0] ?? rgb.map(Math.round), distance = Infinity;
    for (const color of colors) { const d = color.reduce((sum, v, c) => sum + (srgbToLinear(v) - srgbToLinear(rgb[c])) ** 2, 0); if (d < distance) { chosen = color; distance = d; } }
    for (let y = by; y < Math.min(height, by + s.block); y++) for (let x = bx; x < Math.min(width, bx + s.block); x++) {
      const p = (y * width + x) * 4;
      if (kept[p / 4] || s.protected.some(r => inside(x, y, r)) || (!colors.length && !data[p + 3])) output.set(data.subarray(p, p + 4), p);
      else if (!colors.length) output.set([...chosen, data[p + 3]], p);
      else output.set(a ? [...chosen, a] : [0, 0, 0, 0], p);
    }
  }
  return { data: output, notes: ['Protected rectangles keep exact native RGBA and may break the coarse grid or allowed palette.', ...(s.preserveEdges ? ['Strong color boundaries and silhouette pixels are kept and excluded from block samples; low-contrast details can still change.'] : []), colors.length ? 'Palette remapping is enabled for unprotected pixels.' : 'No palette remapping. Original transparency and silhouette are retained; larger blocks replace small color details.'] };
}
const profiles: Record<MaterialRole, { diffuse: number; specular: number; power: number }> = {
  cloth: { diffuse: 1, specular: 0.04, power: 8 }, skin: { diffuse: 0.9, specular: 0.15, power: 16 }, metal: { diffuse: 0.45, specular: 0.65, power: 32 }, emissive: { diffuse: 0, specular: 0, power: 1 },
};
/** X right, Y up, Z toward viewer; azimuth clockwise from the screen's top. */
export function lightDirection(azimuth: number, elevation: number): number[] {
  const a = azimuth * Math.PI / 180, e = elevation * Math.PI / 180; return [Math.sin(a) * Math.cos(e), Math.cos(a) * Math.cos(e), Math.sin(e)];
}
export function lightSprite({ width, height, data, normal }: ResearchInput, s: Extract<ResearchSettings, { kind: 'light' }>): ResearchOutput {
  const authoredNormal = normal;
  if (!normal && s.shape === 'rounded') {
    // Pad with transparent pixels so even a canvas-filling shape has a finite EDT.
    const paddedWidth = width + 2;
    const padded = computeSeparableEDT((x, y) => x > 0 && y > 0 && x <= width && y <= height && data[((y - 1) * width + x - 1) * 4 + 3] > 0, paddedWidth, height + 2);
    const distance = new Float32Array(width * height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) distance[y * width + x] = padded[(y + 1) * paddedWidth + x + 1];
    normal = bakeNormalMapToRgba(computeTangentNormalField(generateInflatedHeightmap(distance, width, height), width, height), width, height, (x, y) => data[(y * width + x) * 4 + 3] > 0);
  }
  const output = new Uint8ClampedArray(data.length), specular = new Uint8ClampedArray(data.length), shadow = new Uint8ClampedArray(data.length), l = lightDirection(s.azimuth, s.elevation);
  const half = [l[0], l[1], l[2] + 1], hn = Math.hypot(...half); const h = half.map(v => v / hn);
  const dx = Math.round(-l[0] * s.height / l[2]), dy = Math.round(l[1] * s.height / l[2]);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = (y * width + x) * 4, a = data[p + 3]; if (!a) continue;
    const tx = x + dx, ty = y + dy;
    if (s.height > 0 && tx >= 0 && ty >= 0 && tx < width && ty < height) shadow[(ty * width + tx) * 4 + 3] = Math.max(shadow[(ty * width + tx) * 4 + 3], Math.round(a * 0.35));
    const n = normal && normal[p + 3] ? [0, 1, 2].map(c => normal[p + c] / 127.5 - 1) : [0, 0, 1];
    const length = Math.hypot(...n); if (length < 1e-6) { n[0] = 0; n[1] = 0; n[2] = 1; } else for (let c = 0; c < 3; c++) n[c] /= length;
    let role = s.material; for (const region of s.regions) if (inside(x, y, region)) role = region.material;
    const m = profiles[role], diffuse = Math.max(0, n.reduce((sum, v, c) => sum + v * l[c], 0));
    const shine = Math.round(Math.max(0, n.reduce((sum, v, c) => sum + v * h[c], 0)) ** m.power * m.specular * s.intensity * 4) / 4;
    const strength = Math.round((s.ambient + diffuse * m.diffuse * s.intensity) * 4) / 4;
    for (let c = 0; c < 3; c++) { output[p + c] = role === 'emissive' ? data[p + c] : linearToSrgb(Math.min(1, srgbToLinear(data[p + c]) * strength + shine)); specular[p + c] = linearToSrgb(Math.min(1, shine)); }
    output[p + 3] = a; specular[p + 3] = a;
  }
  // Bake the same directional cast behind the lit surface, preserving separate previews.
  for (let p = 0; p < output.length; p += 4) {
    const a = output[p + 3] / 255, b = shadow[p + 3] / 255 * (1 - a), combined = a + b;
    for (let c = 0; c < 3; c++) output[p + c] = combined ? Math.round(output[p + c] * a / combined) : 0;
    output[p + 3] = Math.round(combined * 255);
  }
  return { data: output, specular, shadow, notes: [authoredNormal ? 'Uses the stored X+ Y+ Z+ normal map.' : normal ? 'Rounded shape estimated from the opaque silhouette; not recovered 3D geometry.' : 'No normal map: flat front-facing surface.', 'Quarter-step stylized Lambert/Blinn shading; constant manual height casts a clipped 2D shadow.'] };
}
export function tileScene({ width, height, data }: ResearchInput, s: Extract<ResearchSettings, { kind: 'scene' }>): ResearchOutput {
  const cols = width / s.tileSize, rows = height / s.tileSize, map = new Array<number>(cols * rows).fill(-1), pins = new Map(s.pins.map(p => [p.cell, p.tile]));
  let seed = s.seed >>> 0, steps = 0, blocked = 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const orders = map.map(() => { const values = s.tiles.map((_, i) => i); for (let i = values.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [values[i], values[j]] = [values[j], values[i]]; } return values; });
  const search = (cell: number): boolean => {
    if (cell === map.length) return true;
    if (++steps > 20_000) throw new Error('Scene search reached its 20,000-step limit. Relax pins or edge labels; no impossible-map claim is made.');
    const x = cell % cols, y = Math.floor(cell / cols), walk = s.path === 'horizontal' ? y === Math.floor(rows / 2) : s.path === 'vertical' && x === Math.floor(cols / 2);
    for (const tile of pins.has(cell) ? [pins.get(cell)!] : orders[cell]) {
      const t = s.tiles[tile];
      if ((walk && !t.walkable) || (x && s.tiles[map[cell - 1]].east !== t.west) || (y && s.tiles[map[cell - cols]].south !== t.north)) continue;
      map[cell] = tile; if (search(cell + 1)) return true;
    }
    blocked = Math.max(blocked, cell); map[cell] = -1; return false;
  };
  if (!search(0)) throw new Error(`Scene rules conflict near cell ${blocked + 1}. No assignment matches the pinned tiles, walkable path and neighboring edge labels.`);
  const output = new Uint8ClampedArray(data.length);
  for (let cell = 0; cell < map.length; cell++) for (let y = 0; y < s.tileSize; y++) for (let x = 0; x < s.tileSize; x++) {
    const sx = map[cell] % cols * s.tileSize + x, sy = Math.floor(map[cell] / cols) * s.tileSize + y, dx = cell % cols * s.tileSize + x, dy = Math.floor(cell / cols) * s.tileSize + y;
    output.set(data.subarray((sy * width + sx) * 4, (sy * width + sx) * 4 + 4), (dy * width + dx) * 4);
  }
  const seams: NonNullable<ResearchOutput['seams']> = [];
  const different = (a: number, b: number) => (output[a + 3] || output[b + 3]) && [0, 1, 2, 3].some(c => output[a + c] !== output[b + c]);
  for (let cell = 0; cell < map.length; cell++) for (const side of ['east', 'south'] as const) {
    const cx = cell % cols, cy = Math.floor(cell / cols); if (side === 'east' ? cx === cols - 1 : cy === rows - 1) continue;
    let mismatches = 0;
    for (let i = 0; i < s.tileSize; i++) { const x = side === 'east' ? (cx + 1) * s.tileSize - 1 : cx * s.tileSize + i, y = side === 'south' ? (cy + 1) * s.tileSize - 1 : cy * s.tileSize + i, a = (y * width + x) * 4;
      if (different(a, a + (side === 'east' ? 4 : width * 4))) mismatches++; }
    if (mismatches) seams.push({ cell, side, mismatches });
  }
  return { data: output, map, seams, repeats: map.length - new Set(map).size, notes: ['Edge labels guarantee label compatibility, not identical border pixels. Seam counts are review cues.', s.path === 'none' ? 'No path required; this scene may have blocked or disconnected cells.' : 'The required center path is walkable; other walkable cells may remain disconnected.'] };
}
export function runResearch(input: ResearchInput): ResearchOutput {
  const s = validateResearchInput(input);
  return s.kind === 'pixelize' ? simplifyDetails(input, s) : s.kind === 'light' ? lightSprite(input, s) : tileScene(input, s);
}
