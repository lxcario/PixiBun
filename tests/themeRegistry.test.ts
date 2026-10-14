import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildThemeCss, readThemeData, THEME_CSS_PATH } from '../scripts/generateThemeCss.mjs';
import { STUDIO_THEMES, isSceneTheme, isThemeId, type ThemePalette } from '@/lib/theme/registry';
import { hasScene } from '@/lib/theme/scenes';
import { normalizeStudioTheme } from '@/stores/themeStore';

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Text roles must read at WCAG AA (4.5:1) on every panel surface; accents that
// only mark state or decorate need 3:1 (WCAG non-text contrast).
const TEXT_ON_PANELS: Array<keyof ThemePalette> = ['heading', 'body', 'muted', 'accent', 'danger'];
const MARKS_ON_PANELS: Array<keyof ThemePalette> = ['accent2', 'positive'];
const PANELS: Array<keyof ThemePalette> = ['surface', 'raised'];

describe('studio theme registry', () => {
  it('keeps the generated CSS in step with themes.json', () => {
    expect(readFileSync(THEME_CSS_PATH, 'utf8').replace(/\r\n/g, '\n')).toBe(buildThemeCss(readThemeData()));
  });

  it('keeps the saved ids of the original three themes', () => {
    for (const id of ['moonlit', 'atelier', 'cozy-classic']) expect(isThemeId(id)).toBe(true);
    expect(normalizeStudioTheme('retired-theme')).toBe('moonlit');
  });

  it('gives every scene theme a scene and keeps flat themes plain', () => {
    for (const theme of STUDIO_THEMES) expect(hasScene(theme.id)).toBe(isSceneTheme(theme.id));
  });

  for (const theme of STUDIO_THEMES) {
    for (const mode of ['night', 'day'] as const) {
      it(`${theme.name} ${mode} text and marks meet WCAG contrast`, () => {
        const palette = theme[mode];
        const failures: string[] = [];
        for (const panel of PANELS) {
          for (const role of TEXT_ON_PANELS) {
            const ratio = contrast(palette[role], palette[panel]);
            if (ratio < 4.5) failures.push(`${role} on ${panel}: ${ratio.toFixed(2)}`);
          }
          for (const role of MARKS_ON_PANELS) {
            const ratio = contrast(palette[role], palette[panel]);
            if (ratio < 3) failures.push(`${role} on ${panel}: ${ratio.toFixed(2)}`);
          }
        }
        const onPrimary = contrast(palette.primaryFg, palette.primary);
        if (onPrimary < 4.5) failures.push(`primaryFg on primary: ${onPrimary.toFixed(2)}`);
        const headingOnBg = contrast(palette.heading, palette.bg);
        if (headingOnBg < 4.5) failures.push(`heading on bg: ${headingOnBg.toFixed(2)}`);
        expect(failures).toEqual([]);
      });
    }
  }
});
