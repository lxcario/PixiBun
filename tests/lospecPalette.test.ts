import { describe, it, expect } from 'vitest';
import {
  parseLospecHex,
  parseGimpGpl,
  parseLospecJson,
  parsePaletteFile,
  exportPaletteToHex,
  exportPaletteToGpl,
} from '@/lib/color/lospecPalette';

describe('Phase 37.2: Lospec Palette Ecosystem Integration (.hex & .gpl)', () => {
  it('parses raw .hex files with comments and varying hex prefixes', () => {
    const rawHex = `
      ; DawnBringer 16 Palette
      // Comment line
      #140c1e
      442434
      30346d
      4e4a4e
      854c30
      346524
      d04648
      757161
      597dce
      d27d2c
      8595a1
      6daa2c
      d2a474
      4992db
      dad45e
      deeed6
    `;

    const palette = parseLospecHex(rawHex, 'DawnBringer 16.hex');

    expect(palette.name).toBe('DawnBringer 16');
    expect(palette.colors.length).toBe(16);
    expect(palette.colors[0]).toBe('#140C1E');
    expect(palette.colors[15]).toBe('#DEEED6');
  });

  it('parses standard GIMP .gpl palette files with RGB triplets', () => {
    const rawGpl = `GIMP Palette
Name: Endesga 32
Columns: 8
# Created for Lospec
 19  19  19	#131313
 66  66  66	#424242
180 180 180	#B4B4B4
240 190 124	#F0BE7C
`;

    const palette = parseGimpGpl(rawGpl);

    expect(palette.name).toBe('Endesga 32');
    expect(palette.colors.length).toBe(4);
    expect(palette.colors[0]).toBe('#131313');
    expect(palette.colors[3]).toBe('#F0BE7C');
  });

  it('parses Lospec JSON format with author metadata', () => {
    const jsonStr = JSON.stringify({
      name: 'PICO-8',
      author: 'Lexaloffle',
      colors: [
        '000000',
        '1D2B53',
        '7E2553',
        '008751',
        'AB5236',
        '5F574F',
        'C2C3C7',
        'FFF1E8',
      ],
    });

    const palette = parseLospecJson(jsonStr);

    expect(palette.name).toBe('PICO-8');
    expect(palette.author).toBe('Lexaloffle');
    expect(palette.colors.length).toBe(8);
    expect(palette.colors[0]).toBe('#000000');
    expect(palette.colors[1]).toBe('#1D2B53');
  });

  it('auto-detects file format in parsePaletteFile', () => {
    const gplSample = `GIMP Palette\nName: TestGPL\n255 0 0 Red`;
    const hexSample = `FF0000\n00FF00\n0000FF`;

    const pal1 = parsePaletteFile(gplSample, 'test.gpl');
    expect(pal1.name).toBe('TestGPL');
    expect(pal1.colors[0]).toBe('#FF0000');

    const pal2 = parsePaletteFile(hexSample, 'primary.hex');
    expect(pal2.name).toBe('primary');
    expect(pal2.colors.length).toBe(3);
  });

  it('supports round-trip export to .hex and .gpl formats', () => {
    const originalPalette = {
      id: 'test-pal',
      name: 'Roundtrip Test',
      colors: ['#F0BE7C', '#140C1E', '#7E2553'],
    };

    const exportedHex = exportPaletteToHex(originalPalette);
    const reimportedHex = parseLospecHex(exportedHex, 'reimported.hex');
    expect(reimportedHex.colors).toEqual(originalPalette.colors);

    const exportedGpl = exportPaletteToGpl(originalPalette);
    const reimportedGpl = parseGimpGpl(exportedGpl);
    expect(reimportedGpl.colors).toEqual(originalPalette.colors);
  });
});
