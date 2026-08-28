import { describe, it, expect } from 'vitest';
import { STARTER_TEMPLATES, TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';

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
});