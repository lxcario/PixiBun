import { describe, it, expect } from 'vitest';
import { hexToRgba } from '@/lib/canvas/floodFill';

describe('hexToRgba: hex color parsing', () => {
  it('parses 6-digit hex with implicit opaque alpha', () => {
    expect(hexToRgba('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    expect(hexToRgba('#3A2E4C')).toEqual({ r: 58, g: 46, b: 76, a: 255 });
  });

  it('expands 3-digit hex shorthand', () => {
    expect(hexToRgba('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });

  it('expands 4-digit #RGBA shorthand per CSS Color 4 (nibble doubling)', () => {
    // #f00f -> r=ff, g=00, b=00, a=ff
    expect(hexToRgba('#f00f')).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    // #0f08 -> r=00, g=ff, b=00, a=88
    expect(hexToRgba('#0f08')).toEqual({ r: 0, g: 255, b: 0, a: 0x88 });
  });

  it('parses 8-digit hex including alpha', () => {
    expect(hexToRgba('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 128 });
  });

  it('falls back to opaque white on malformed input', () => {
    expect(hexToRgba('not-a-color')).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });
});