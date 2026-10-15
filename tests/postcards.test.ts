import { describe, expect, it } from 'vitest';
import { POSTCARDS, POSTCARD_HEIGHT, POSTCARD_WIDTH, postcard, postcardRgba } from '@/lib/postcards/scenes';

// Strategy Phase 2: six Living Postcards painted for color cycling.

describe('Living Postcards', () => {
  it('offers the six scenes', () => {
    expect(POSTCARDS.map(card => card.id)).toEqual(['campfire', 'waterfall', 'rainy-window', 'neon-sign', 'tide', 'lava']);
    expect(postcard('tide')?.name).toBe('Tide at Dusk');
    expect(postcard('nope')).toBeUndefined();
  });

  it.each(POSTCARDS)('$name has a cycling palette the Studio can map exactly', card => {
    expect([card.width, card.height]).toEqual([POSTCARD_WIDTH, POSTCARD_HEIGHT]);
    expect(card.pixels.length).toBe(card.width * card.height);
    expect(card.palette.length).toBeLessThanOrEqual(256);
    // Unique colors: the register map can find every pixel's entry.
    expect(new Set(card.palette).size).toBe(card.palette.length);
    for (const hex of card.palette) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(card.tracks.length).toBeGreaterThanOrEqual(2);
    const used = new Set(card.pixels);
    for (const track of card.tracks) {
      expect(track.enabled).toBe(true);
      expect(track.rate).toBeGreaterThan(0);
      expect(track.high).toBeGreaterThan(track.low);
      expect(track.high).toBeLessThan(card.palette.length);
      // Every track moves something on the card.
      const registers = Array.from({ length: track.high - track.low + 1 }, (_, i) => track.low + i);
      expect(registers.some(register => used.has(register))).toBe(true);
    }
    for (const index of used) expect(index).toBeLessThan(card.palette.length);
  });

  it('paints opaque pixels from the palette', () => {
    const card = POSTCARDS[0];
    const rgba = postcardRgba(card);
    expect(rgba.length).toBe(card.width * card.height * 4);
    const first = card.palette[card.pixels[0]];
    expect(`#${[rgba[0], rgba[1], rgba[2]].map(v => v.toString(16).padStart(2, '0')).join('')}`).toBe(first);
    for (let i = 3; i < rgba.length; i += 4) expect(rgba[i]).toBe(255);
  });
});
