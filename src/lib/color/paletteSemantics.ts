import type { ColorPalette } from '@/types/palette';
import { hexToRgb } from './paletteCycling';

export interface PaletteSemantics {
  entries: { id: string; role: string }[];
  bindings: { id: string; frameId: string; entryId: string; x: number; y: number; w: number; h: number }[];
}
export const MAX_PALETTE_BINDINGS = 128;
export function defaultPaletteSemantics(palette: ColorPalette): PaletteSemantics {
  // Entry IDs are scoped to their palette; reserve room for the register suffix.
  return { entries: palette.colors.map((_, i) => ({ id: `${palette.id.slice(0, 240)}:register:${i}`, role: '' })), bindings: [] };
}
export function parsePaletteSemantics(input: unknown, colorCount: number): PaletteSemantics | null {
  if (!input || typeof input !== 'object' || colorCount < 1 || colorCount > 256) return null;
  const value = input as PaletteSemantics;
  if (!Array.isArray(value.entries) || value.entries.length !== colorCount || !Array.isArray(value.bindings) || value.bindings.length > MAX_PALETTE_BINDINGS) return null;
  const validId = (id: unknown): id is string => typeof id === 'string' && id.length > 0 && id.length <= 256;
  const ids = new Set<string>(), bindings = new Set<string>();
  for (const entry of value.entries) {
    if (!entry || !validId(entry.id) || ids.has(entry.id) || typeof entry.role !== 'string' || entry.role.length > 64) return null;
    ids.add(entry.id);
  }
  for (const binding of value.bindings) {
    if (!binding || !validId(binding.id) || bindings.has(binding.id) || !validId(binding.frameId) || !ids.has(binding.entryId) ||
        ![binding.x, binding.y, binding.w, binding.h].every(Number.isInteger) || binding.x < 0 || binding.y < 0 ||
        binding.w < 1 || binding.h < 1 || binding.x + binding.w > 16384 || binding.y + binding.h > 16384) return null;
    bindings.add(binding.id);
  }
  return { entries: value.entries.map(e => ({ id: e.id, role: e.role })), bindings: value.bindings.map(b => ({
    id: b.id, frameId: b.frameId, entryId: b.entryId, x: b.x, y: b.y, w: b.w, h: b.h,
  })) };
}
export function estimatePaletteBytes(palette: ColorPalette): number {
  return 512 + palette.colors.length * 32 + JSON.stringify(palette.semantics ?? {}).length * 2 +
    JSON.stringify(palette.cycleTracks ?? []).length * 2;
}

/** Exact matching only. RGBA artwork cannot infer which duplicate register was painted. */
export function indexSemanticPixels(data: Uint8ClampedArray, width: number, height: number, palette: ColorPalette, frameId: string) {
  if (data.length !== width * height * 4 || palette.colors.length < 1 || palette.colors.length > 256) throw new Error('Indexed export requires 1–256 palette colors.');
  const semantics = palette.semantics ?? defaultPaletteSemantics(palette);
  if (!parsePaletteSemantics(semantics, palette.colors.length)) throw new Error('Invalid palette roles or bindings.');
  const indices = new Uint8Array(width * height), alpha = new Uint8Array(width * height);
  const registers = new Map<number, number[]>();
  palette.colors.forEach((hex, index) => {
    const [r, g, b] = hexToRgb(hex), key = (r << 16) | (g << 8) | b;
    const matches = registers.get(key) ?? []; matches.push(index); registers.set(key, matches);
  });
  const bindings = semantics.bindings.filter(b => b.frameId === frameId).map(b => ({ ...b, index: semantics.entries.findIndex(e => e.id === b.entryId) })).reverse();
  let unmapped = 0, ambiguous = 0, bound = 0;
  for (let p = 0; p < indices.length; p++) {
    alpha[p] = data[p * 4 + 3]; if (!alpha[p]) continue;
    const matches = registers.get((data[p * 4] << 16) | (data[p * 4 + 1] << 8) | data[p * 4 + 2]);
    if (!matches) { unmapped++; continue; }
    const x = p % width, y = Math.floor(p / width);
    const binding = bindings.find(b => x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h && matches.includes(b.index));
    indices[p] = binding?.index ?? matches[0];
    if (binding) bound++; else if (matches.length > 1) ambiguous++;
  }
  if (unmapped) throw new Error(`${unmapped} visible pixels are outside the selected palette. Use a matching palette or export the color-only Godot kit.`);
  if (ambiguous) throw new Error(`${ambiguous} pixels match duplicate palette registers. Assign their selection to a register in Palette → Roles and index bindings.`);
  return { indices, alpha, bound, semantics };
}
