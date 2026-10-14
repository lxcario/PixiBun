import { SafeJson } from '@/lib/safety/safeJson';
/**
 * Lospec Palette Ecosystem Integration (.hex, GIMP .gpl, Lospec JSON).
 *
 * Industry Standard Reference:
 * - Lospec (lospec.com), the de facto open pixel art palette repository.
 * - GIMP Palette Specification (.gpl format with RGB integer triplets).
 *
 * Supports robust parsing, validation, and bi-directional conversion of:
 * - Plain .hex palette files (raw newline-separated hex color codes)
 * - GIMP .gpl palette files (with header metadata, columns, and color names)
 * - Lospec Palette API JSON format ({ name, author, colors })
 */

import { ColorPalette } from '@/types/palette';
import { createId } from '@/lib/engine/id';

/**
 * Normalizes any valid 3, 6, or 8-character hex string to #RRGGBB uppercase.
 */
export function normalizeHexColor(input: string): string | null {
  const clean = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    const r = clean[0];
    const g = clean[1];
    const b = clean[2];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^[0-9a-fA-F]{8}$/.test(clean)) {
    // Drop alpha for standard palette swatches
    return `#${clean.substring(0, 6).toUpperCase()}`;
  }
  return null;
}

/**
 * Parses a Lospec-style .hex file (newline-separated hex codes).
 */
export function parseLospecHex(rawText: string, fallbackName: string = 'Imported Palette'): ColorPalette {
  const lines = rawText.split(/\r?\n/);
  const colors: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('//')) {
      continue;
    }
    const hex = normalizeHexColor(trimmed);
    if (hex && !colors.includes(hex)) {
      colors.push(hex);
    }
  }

  if (colors.length === 0) {
    throw new Error('No valid hex color codes found in .hex file.');
  }

  return {
    id: createId('pal'),
    name: fallbackName.replace(/\.hex$/i, ''),
    colors,
  };
}

/**
 * Parses a GIMP .gpl palette file.
 */
export function parseGimpGpl(rawText: string, fallbackName: string = 'GIMP Palette'): ColorPalette {
  const lines = rawText.split(/\r?\n/);
  if (lines.length === 0 || !lines[0].trim().startsWith('GIMP Palette')) {
    throw new Error('Invalid GIMP palette: missing "GIMP Palette" header.');
  }

  let paletteName = fallbackName.replace(/\.gpl$/i, '');
  const colors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.toLowerCase().startsWith('name:')) {
      paletteName = line.substring(5).trim() || paletteName;
      continue;
    }
    if (line.toLowerCase().startsWith('columns:') || line.startsWith('#')) {
      continue;
    }

    // Match RGB triplet: "255 128  64  ColorName"
    const match = line.match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/);
    if (match) {
      const r = Math.min(255, parseInt(match[1], 10));
      const g = Math.min(255, parseInt(match[2], 10));
      const b = Math.min(255, parseInt(match[3], 10));

      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b)
        .toString(16)
        .slice(1)
        .toUpperCase()}`;

      if (!colors.includes(hex)) {
        colors.push(hex);
      }
    }
  }

  if (colors.length === 0) {
    throw new Error('No RGB color definitions found in .gpl file.');
  }

  return {
    id: createId('pal'),
    name: paletteName,
    colors,
  };
}

/**
 * Parses Lospec API JSON format ({ name: string, author: string, colors: string[] }).
 */
export function parseLospecJson(jsonText: string): ColorPalette {
  let parsed: unknown;
  try {
    parsed = SafeJson.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON format.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Expected JSON object.');
  }

  const record = parsed as Record<string, unknown>;
  const rawColors = Array.isArray(record.colors) ? record.colors : [];
  const colors: string[] = [];

  for (const c of rawColors) {
    if (typeof c === 'string') {
      const hex = normalizeHexColor(c);
      if (hex && !colors.includes(hex)) {
        colors.push(hex);
      }
    }
  }

  if (colors.length === 0) {
    throw new Error('No valid colors found in Lospec JSON.');
  }

  return {
    id: createId('pal'),
    name: typeof record.name === 'string' ? record.name : 'Lospec Palette',
    author: typeof record.author === 'string' ? record.author : undefined,
    colors,
  };
}

/**
 * Universal auto-detecting parser for .hex, .gpl, and .json palette files.
 */
export function parsePaletteFile(content: string, fileName: string = 'palette.hex'): ColorPalette {
  const trimmed = content.trim();

  // 1. Check GIMP .gpl header
  if (trimmed.startsWith('GIMP Palette')) {
    return parseGimpGpl(content, fileName);
  }

  // 2. Check JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      return parseLospecJson(content);
    } catch {
      // Fall through to hex parser
    }
  }

  // 3. Default to .hex parser
  return parseLospecHex(content, fileName);
}

/**
 * Exports a ColorPalette to standard Lospec .hex format.
 */
export function exportPaletteToHex(palette: ColorPalette): string {
  return palette.colors.map((c) => c.replace(/^#/, '').toLowerCase()).join('\n');
}

/**
 * Exports a ColorPalette to standard GIMP .gpl format.
 */
export function exportPaletteToGpl(palette: ColorPalette): string {
  const lines: string[] = [
    'GIMP Palette',
    `Name: ${palette.name}`,
    'Columns: 8',
    '# Exported from PixiBun (Lospec Compatible)',
  ];

  for (const hex of palette.colors) {
    const clean = hex.replace(/^#/, '');
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;

    const pad = (n: number) => String(n).padStart(3, ' ');
    lines.push(`${pad(r)} ${pad(g)} ${pad(b)}\t${hex}`);
  }

  return lines.join('\n');
}
