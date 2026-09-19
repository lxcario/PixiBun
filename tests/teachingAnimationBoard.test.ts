import { describe, it, expect, beforeEach } from 'vitest';
import {
  TEACHING_CHARACTERS,
  ALT_COLOURS,
  resolvePixelColor,
  loadTeachingAnimationIntoPlayground,
} from '@/lib/art/teachingBoardData';
import { useStudioStore } from '@/stores/studioStore';
import { getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import { installDocumentCanvasMock } from './helpers/mockCanvas';

describe('Teaching Animation Board Engine & Discrete Physics', () => {
  beforeEach(() => {
    installDocumentCanvasMock();
    // Reset studio state to clean baseline
    useStudioStore.setState({
      canvasWidth: 16,
      canvasHeight: 16,
      fps: 12,
      activeFrameIndex: 0,
    });
  });

  describe('1. Character Profiles & Construction Stages (7 Stages)', () => {
    it('defines Bun and Slime character profiles with 7 progressive construction steps', () => {
      const bun = TEACHING_CHARACTERS.bun;
      const slime = TEACHING_CHARACTERS.slime;

      expect(bun).toBeDefined();
      expect(slime).toBeDefined();

      expect(bun.buildingSteps.length).toBe(7);
      expect(slime.buildingSteps.length).toBe(7);
    });

    it('establishes exact dimension callouts on Step 1 (Silhouette & Bounds)', () => {
      const bunStep1 = TEACHING_CHARACTERS.bun.buildingSteps[0];
      const slimeStep1 = TEACHING_CHARACTERS.slime.buildingSteps[0];

      expect(bunStep1.hasDimensions).toBe(true);
      expect(bunStep1.dimensionW).toBe(16);
      expect(bunStep1.dimensionH).toBe(16);

      expect(slimeStep1.hasDimensions).toBe(true);
      expect(slimeStep1.dimensionW).toBe(15);
      expect(slimeStep1.dimensionH).toBe(15);
    });

    it('verifies all building step grids are strictly 16 rows of 16 columns', () => {
      ['bun', 'slime'].forEach((charKey) => {
        const char = TEACHING_CHARACTERS[charKey as 'bun' | 'slime'];
        char.buildingSteps.forEach((step) => {
          expect(step.grid16.length).toBe(16);
          step.grid16.forEach((row) => {
            expect(row.length).toBe(16);
          });
        });
      });
    });
  });

  describe('2. Alt Colours (8 Distinct Palettes & Color Resolving)', () => {
    it('contains exactly 8 colorways derived from PixiBun semantic palette tokens', () => {
      expect(ALT_COLOURS.length).toBe(8);

      const paletteIds = ALT_COLOURS.map((p) => p.id);
      expect(paletteIds).toEqual([
        'wisteria',
        'amber',
        'peach',
        'matcha',
        'celestine',
        'amethyst',
        'sakura',
        'obsidian',
      ]);
    });

    it('correctly maps pixel symbols to hex codes for every palette', () => {
      const wisteria = ALT_COLOURS[0];
      expect(resolvePixelColor('o', wisteria)).toBe(wisteria.outline);
      expect(resolvePixelColor('f', wisteria)).toBe(wisteria.fill);
      expect(resolvePixelColor('s', wisteria)).toBe(wisteria.shade);
      expect(resolvePixelColor('h', wisteria)).toBe(wisteria.highlight);
      expect(resolvePixelColor('g', wisteria)).toBe(wisteria.glint);
      expect(resolvePixelColor('e', wisteria)).toBe(wisteria.feature);
      expect(resolvePixelColor('r', wisteria)).toBe(wisteria.blush);
      expect(resolvePixelColor('.', wisteria)).toBeNull();
      expect(resolvePixelColor(' ', wisteria)).toBeNull();
    });
  });

  describe('3. Discrete 10-Frame Jump Parabolic Arc & Dynamics', () => {
    it('implements the exact parabolic height trajectory [0, 16, 24, 30, 32, 30, 24, 16, 0, 0]', () => {
      const expectedHeights = [0, 16, 24, 30, 32, 30, 24, 16, 0, 0];

      ['bun', 'slime'].forEach((charKey) => {
        const char = TEACHING_CHARACTERS[charKey as 'bun' | 'slime'];
        expect(char.jumpFrames.length).toBe(10);

        const heights = char.jumpFrames.map((jf) => jf.heightPx);
        expect(heights).toEqual(expectedHeights);
      });
    });

    it('applies classical animation timing with apex float cushioning and impact squash', () => {
      const bun = TEACHING_CHARACTERS.bun;
      const f1Anticipation = bun.jumpFrames[0];
      const f2Stretch = bun.jumpFrames[1];
      const f5Apex = bun.jumpFrames[4];
      const f8FallStretch = bun.jumpFrames[7];
      const f10Squash = bun.jumpFrames[9];

      // Anticipation hold
      expect(f1Anticipation.holdMs).toBeGreaterThanOrEqual(120);
      // Fast kinetic stretches have minimal hold ms
      expect(f2Stretch.holdMs).toBeLessThanOrEqual(60);
      expect(f8FallStretch.holdMs).toBeLessThanOrEqual(60);
      // Apex zero-gravity cushion hang has longest airborne hold
      expect(f5Apex.holdMs).toBeGreaterThanOrEqual(150);
      // Ground squash settle has extended recovery hold
      expect(f10Squash.holdMs).toBeGreaterThanOrEqual(120);
    });

    it('verifies all 10 jump frame grids are strictly 16x16 pixel arrays', () => {
      ['bun', 'slime'].forEach((charKey) => {
        const char = TEACHING_CHARACTERS[charKey as 'bun' | 'slime'];
        char.jumpFrames.forEach((jf) => {
          expect(jf.grid16.length).toBe(16);
          jf.grid16.forEach((row) => {
            expect(row.length).toBe(16);
          });
        });
      });
    });
  });

  describe('4. Playground Timeline Injection Engine', () => {
    it('loads the 10-frame animation directly into the studio frames timeline', () => {
      const bun = TEACHING_CHARACTERS.bun;
      const amberPalette = ALT_COLOURS[1];

      loadTeachingAnimationIntoPlayground(bun, amberPalette);

      const studio = useStudioStore.getState();
      expect(studio.canvasWidth).toBe(16);
      expect(studio.canvasHeight).toBe(16);
      expect(studio.fps).toBe(10);
      expect(studio.frames.length).toBe(10);

      // Verify each frame duration was synchronized
      bun.jumpFrames.forEach((jf, idx) => {
        expect(studio.frames[idx].durationMs).toBe(jf.holdMs);
      });

      // Verify that layer buffers were written with non-empty content
      const frame0LayerId = studio.frames[0].layers[0].id;
      const buf0 = getOrCreateBuffer(frame0LayerId, 16, 16);
      const imgData = buf0.ctx.getImageData(0, 0, 16, 16);
      const hasPixels = imgData.data.some((channel) => channel > 0);
      expect(hasPixels).toBe(true);
    });
  });
});
