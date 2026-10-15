import { describe, it, expect } from 'vitest';
import { STARTER_TEMPLATES, TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';
import { BUN_INK, bunOutline, bunPixels } from '@/lib/art/bunSprite';

describe('starterTemplates', () => {
  it('keeps template ids unique', () => {
    const ids = STARTER_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('declares rows that are rectangular and within declared bounds', () => {
    for (const template of STARTER_TEMPLATES) {
      expect(template.rows.length).toBe(template.height);
      for (const row of template.rows) {
        expect(row.length).toBe(template.width);
      }
    }
  });

  it('uses only keys defined in the shared palette', () => {
    const keys = new Set(Object.keys(TEMPLATE_PALETTE));
    for (const template of STARTER_TEMPLATES) {
      for (const row of template.rows) {
        for (const char of row) {
          if (char === '.') continue;
          expect(keys.has(char), `${template.id}: unknown key "${char}"`).toBe(true);
        }
      }
    }
  });

  it('maps every palette key to a valid hex color', () => {
    for (const hex of Object.values(TEMPLATE_PALETTE)) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('starts Bun as the mascot herself, short one plain ear row and one plain body row', () => {
    // The mascot's art spans rows -1 (ear-tip outline) to 16 (foot outline).
    const mascot = new Map<string, string>();
    for (const [x, y] of bunOutline('idle')) mascot.set(`${x},${y}`, BUN_INK);
    for (const [x, y, w, h, fill] of bunPixels('idle')) {
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) mascot.set(`${x + dx},${y + dy}`, fill);
    }
    const kept = Array.from({ length: 18 }, (_, i) => i - 1).filter(y => y !== 3 && y !== 13);
    const bun = STARTER_TEMPLATES.find(t => t.id === 'bun')!;
    bun.rows.forEach((row, y) => [...row].forEach((char, x) => {
      expect(char === '.' ? undefined : TEMPLATE_PALETTE[char], `(${x}, ${y})`).toBe(mascot.get(`${x},${kept[y]}`));
    }));
  });
});
