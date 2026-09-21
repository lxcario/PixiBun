import { describe, it, expect } from 'vitest';

/**
 * WCAG 2.1 / 2.2 Relative Luminance and Contrast Ratio calculation
 * https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 * https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

export function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((val) => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = relativeLuminance(hexToRgb(hex1));
  const lum2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Theme Contrast & WCAG 2.2 AA Conformance (Milestone C2)', () => {
  const themes = {
    'Atelier Dark': {
      bg: '#16141a',
      surface: '#201d26',
      surfaceRaised: '#282530',
      btnBg: '#282530',
      textHeading: '#ede8f4',
      textBody: '#cfc7d8',
      textMuted: '#968ca2',
      toolActiveBg: '#e5a962',
      toolActiveFg: '#16141a',
      borderDefault: '#35313d',
      focusRing: '#e5a962',
    },
    'Atelier Light': {
      bg: '#ece5d8',
      surface: '#f7f1e6',
      surfaceRaised: '#ffffff',
      btnBg: '#ffffff',
      textHeading: '#221233',
      textBody: '#4a3559',
      textMuted: '#685179',
      toolActiveBg: '#8a4500',
      toolActiveFg: '#ffffff',
      borderDefault: '#442a5c',
      focusRing: '#8a4500',
    },
    'Cozy Classic Dark': {
      bg: '#140c1e',
      surface: '#201431',
      surfaceRaised: '#281b3d',
      btnBg: '#281b3d',
      textHeading: '#ede8f4',
      textBody: '#d0c4df',
      textMuted: '#a496b8',
      toolActiveBg: '#f0be7c',
      toolActiveFg: '#140d1f',
      borderDefault: '#3a2e4c',
      focusRing: '#f0be7c',
    },
    'Cozy Classic Light': {
      bg: '#fbf8f3',
      surface: '#f3ebe0',
      surfaceRaised: '#fffdf9',
      btnBg: '#f8f3eb',
      textHeading: '#221233',
      textBody: '#4a3559',
      textMuted: '#685179',
      toolActiveBg: '#8a4500',
      toolActiveFg: '#ffffff',
      borderDefault: '#3c2254',
      focusRing: '#8a4500',
    },
  };

  for (const [themeName, t] of Object.entries(themes)) {
    describe(themeName, () => {
      it('satisfies WCAG 1.4.3 AA normal text contrast (>= 4.5:1) for headings against primary surfaces', () => {
        const surfaces = [t.bg, t.surface, t.surfaceRaised, t.btnBg];
        for (const surface of surfaces) {
          const ratio = getContrastRatio(t.textHeading, surface);
          expect(ratio, `Heading on ${surface}`).toBeGreaterThanOrEqual(4.5);
        }
      });

      it('satisfies WCAG 1.4.3 AA normal text contrast (>= 4.5:1) for body text against primary surfaces', () => {
        const surfaces = [t.bg, t.surface, t.surfaceRaised];
        for (const surface of surfaces) {
          const ratio = getContrastRatio(t.textBody, surface);
          expect(ratio, `Body on ${surface}`).toBeGreaterThanOrEqual(4.5);
        }
      });

      it('satisfies WCAG 1.4.3 AA normal text contrast (>= 4.5:1) for muted text across surfaces', () => {
        const surfaces = [t.bg, t.surface, t.surfaceRaised];
        for (const surface of surfaces) {
          const ratio = getContrastRatio(t.textMuted, surface);
          expect(ratio, `Muted text on ${surface}`).toBeGreaterThanOrEqual(4.5);
        }
      });

      it('satisfies WCAG 1.4.3 AA (>= 4.5:1) for active tool state text against tool background', () => {
        const ratio = getContrastRatio(t.toolActiveFg, t.toolActiveBg);
        expect(ratio, `Tool active fg on bg`).toBeGreaterThanOrEqual(4.5);
      });

      it('satisfies WCAG 1.4.11 AA non-text contrast (>= 3.0:1) for focus indicator against base background', () => {
        const ratio = getContrastRatio(t.focusRing, t.bg);
        expect(ratio, `Focus ring on bg`).toBeGreaterThanOrEqual(3.0);
      });
    });
  }
});
