/**
 * CVD Colorblindness Lens (DESIGN.md §12) & Silhouette / Squint Mode
 * (DESIGN.md §13) unit tests:
 *  - Machado, Oliveira & Fernandes (2009) severity 1.0 matrix reference vectors
 *  - Purity of the color transforms (source data never mutated)
 *  - Silhouette transform (#140C1E ink, alpha-preserving)
 *  - SVG feColorMatrix serialization bridge
 *  - Store integration + display-only CSS filter resolution
 *  - Export invariance: compositeFrame bytes are IDENTICAL with lenses active
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyCvdMatrixToRgb,
  applyCvdLensToPixel,
  applyCvdLensToImageData,
  applySquintToPixel,
  applySquintToImageData,
  CVD_LENS_MATRICES,
  CVD_FILTER_IDS,
  SQUINT_FILTER_ID,
  SQUINT_SILHOUETTE_RGB,
  cycleCvdLens,
  feColorMatrixValues,
  getViewportFilterCss,
} from '@/lib/color/cvdLens';
import { installDocumentCanvasMock, MockCanvas, MockCtx } from './helpers/mockCanvas';

describe('Machado 2009 CVD matrices — known reference vectors', () => {
  it('protanopia maps pure red to its published severity-1.0 response', () => {
    const [r, g, b] = applyCvdLensToPixel(255, 0, 0, 'protanopia');
    expect(r).toBeCloseTo(108.785160, 3); // linear-RGB transform, encoded to sRGB
    expect(g).toBeCloseTo(95.026841, 3);
    expect(b).toBeCloseTo(0, 3); // negative clamp
  });

  it('deuteranopia maps pure green to its published response', () => {
    const [r, g, b] = applyCvdLensToPixel(0, 255, 0, 'deuteranopia');
    expect(r).toBeCloseTo(238.693017, 3);
    expect(g).toBeCloseTo(214.008173, 3);
    expect(b).toBeCloseTo(58.443926, 3);
  });

  it('tritanopia maps pure blue to its published response with negative clamp', () => {
    const [r, g, b] = applyCvdLensToPixel(0, 0, 255, 'tritanopia');
    expect(r).toBeCloseTo(0, 3); // -0.178779 * 255 clamped
    expect(g).toBeCloseTo(107.196897, 3);
    expect(b).toBeCloseTo(149.756093, 3);
  });

  it('each published matrix row sums to 1 so grays are invariant', () => {
    for (const matrix of Object.values(CVD_LENS_MATRICES)) {
      for (let row = 0; row < 3; row++) {
        const sum = matrix[row * 3] + matrix[row * 3 + 1] + matrix[row * 3 + 2];
        expect(sum).toBeCloseTo(1, 5);
      }
      const [r, g, b] = applyCvdMatrixToRgb(128, 128, 128, matrix);
      expect(r).toBeCloseTo(128, 2);
      expect(g).toBeCloseTo(128, 2);
      expect(b).toBeCloseTo(128, 2);
    }
  });

  it('monochromacy collapses every hue to Rec.709 luminance', () => {
    const [r, g, b] = applyCvdLensToPixel(255, 0, 0, 'monochromacy');
    expect(r).toBeCloseTo(127.10218, 3);
    expect(g).toBeCloseTo(127.10218, 3);
    expect(b).toBeCloseTo(127.10218, 3);

    const [r2, g2, b2] = applyCvdLensToPixel(30, 144, 255, 'monochromacy');
    const lum = 142.939972; // linear Rec.709 luminance re-encoded to sRGB
    expect(r2).toBeCloseTo(lum, 3);
    expect(g2).toBeCloseTo(lum, 3);
    expect(b2).toBeCloseTo(lum, 3);
  });

  it('white and black are fixed points of every lens', () => {
    for (const mode of Object.keys(CVD_LENS_MATRICES) as Array<keyof typeof CVD_LENS_MATRICES>) {
      expect(applyCvdLensToPixel(255, 255, 255, mode).every((c) => Math.abs(c - 255) < 0.5)).toBe(true);
      expect(applyCvdLensToPixel(0, 0, 0, mode).every((c) => c === 0)).toBe(true);
    }
  });

  it("'none' is the identity transform", () => {
    expect(applyCvdLensToPixel(12, 34, 56, 'none')).toEqual([12, 34, 56]);
  });

  it('buffers are transformed non-destructively (new array, source untouched)', () => {
    const src = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 0, 0]);
    const snapshot = new Uint8ClampedArray(src);
    const out = applyCvdLensToImageData(src, 'protanopia');
    expect(out).not.toBe(src);
    expect(Array.from(src)).toEqual(Array.from(snapshot));
    // Alpha channel preserved per pixel
    expect(out[3]).toBe(255);
    expect(out[7]).toBe(128);
    expect(out[11]).toBe(0);
    // First pixel red channel clamped/transformed by the protanopia matrix
    expect(out[0]).toBeCloseTo(109, 0);
  });
});
describe('Silhouette / Squint Mode transform (#140C1E over white)', () => {
  it('forces every non-transparent pixel to the silhouette ink color', () => {
    const [r, g, b, a] = applySquintToPixel(255, 30, 90, 255);
    expect([r, g, b]).toEqual([SQUINT_SILHOUETTE_RGB[0], SQUINT_SILHOUETTE_RGB[1], SQUINT_SILHOUETTE_RGB[2]]);
    expect([SQUINT_SILHOUETTE_RGB[0], SQUINT_SILHOUETTE_RGB[1], SQUINT_SILHOUETTE_RGB[2]]).toEqual([0x14, 0x0c, 0x1e]);
    expect(a).toBe(255);
  });

  it('preserves partial alpha so ghosts composite over white', () => {
    const [r, g, b, a] = applySquintToPixel(255, 0, 0, 64);
    expect([r, g, b]).toEqual([0x14, 0x0c, 0x1e]);
    expect(a).toBe(64);
  });

  it('leaves fully transparent pixels untouched', () => {
    expect(applySquintToPixel(255, 0, 0, 0)).toEqual([255, 0, 0, 0]);
  });

  it('buffers are transformed non-destructively and alpha is preserved', () => {
    const src = new Uint8ClampedArray([10, 200, 30, 255, 0, 0, 0, 0, 200, 100, 50, 7]);
    const snapshot = new Uint8ClampedArray(src);
    const out = applySquintToImageData(src);
    expect(out).not.toBe(src);
    expect(Array.from(src)).toEqual(Array.from(snapshot));
    expect(Array.from(out.slice(0, 4))).toEqual([0x14, 0x0c, 0x1e, 255]);
    expect(Array.from(out.slice(4, 8))).toEqual([0, 0, 0, 0]);
    expect(Array.from(out.slice(8, 12))).toEqual([0x14, 0x0c, 0x1e, 7]);
  });
});

describe('SVG feColorMatrix bridge & HUD helpers', () => {
  it('serializes 3x3 matrices into a 20-value feColorMatrix string with identity alpha', () => {
    const values = feColorMatrixValues(CVD_LENS_MATRICES.protanopia);
    const parts = values.split(' ');
    expect(parts).toHaveLength(20);
    // alpha row: 0 0 0 1 0
    expect(parts.slice(15, 20).join(' ')).toBe('0 0 0 1 0');
    // first row matches the matrix + zero offsets
    expect(parts.slice(0, 5).join(' ')).toBe(
      `${CVD_LENS_MATRICES.protanopia[0]} ${CVD_LENS_MATRICES.protanopia[1]} ${CVD_LENS_MATRICES.protanopia[2]} 0 0`
    );
  });

  it('cycles the lens through all modes and back to none', () => {
    expect(cycleCvdLens('none')).toBe('protanopia');
    expect(cycleCvdLens('protanopia')).toBe('deuteranopia');
    expect(cycleCvdLens('deuteranopia')).toBe('tritanopia');
    expect(cycleCvdLens('tritanopia')).toBe('monochromacy');
    expect(cycleCvdLens('monochromacy')).toBe('none');
  });

  it('resolves the display-only CSS filter without stacking lenses', () => {
    expect(getViewportFilterCss('none', false)).toBeUndefined();
    expect(getViewportFilterCss('protanopia', false)).toBe(`url(#${CVD_FILTER_IDS.protanopia})`);
    expect(getViewportFilterCss('deuteranopia', false)).toBe(`url(#${CVD_FILTER_IDS.deuteranopia})`);
    expect(getViewportFilterCss('tritanopia', false)).toBe(`url(#${CVD_FILTER_IDS.tritanopia})`);
    expect(getViewportFilterCss('monochromacy', false)).toBe(`url(#${CVD_FILTER_IDS.monochromacy})`);
    // Squint supersedes the CVD matrix (single url() filter cannot stack)
    expect(getViewportFilterCss('protanopia', true)).toBe(`url(#${SQUINT_FILTER_ID})`);
  });
});

describe('CVD & Squint store integration (display-only state)', () => {
  beforeEach(() => {
    installDocumentCanvasMock();
  });

  it('setCvdLens and toggleSquintMode update viewport lens state', async () => {
    const { useStudioStore } = await import('@/stores/studioStore');
    useStudioStore.setState({ cvdLens: 'none', squintMode: false });
    useStudioStore.getState().setCvdLens('deuteranopia');
    expect(useStudioStore.getState().cvdLens).toBe('deuteranopia');
    useStudioStore.getState().toggleSquintMode();
    expect(useStudioStore.getState().squintMode).toBe(true);
    useStudioStore.getState().toggleSquintMode();
    expect(useStudioStore.getState().squintMode).toBe(false);
    useStudioStore.getState().setCvdLens('none');
    expect(useStudioStore.getState().cvdLens).toBe('none');
  });
});

describe('Export invariance: compositor output is byte-identical with lenses active', () => {
  beforeEach(() => {
    installDocumentCanvasMock();
  });

  it('compositeFrame bytes do not change when CVD lens / squint mode activate', async () => {
    const { compositeFrame } = await import('@/lib/render/compositor');
    const { clearAllBuffers, getOrCreateBuffer } = await import('@/lib/engine/bufferRegistry');
    const { useStudioStore } = await import('@/stores/studioStore');

    useStudioStore.setState({ cvdLens: 'none', squintMode: false });
    clearAllBuffers();
    const width = 8;
    const height = 8;

    const baseBuf = getOrCreateBuffer('lens-base', width, height);
    baseBuf.ctx.fillStyle = '#FF5500';
    baseBuf.ctx.fillRect(0, 0, width, height);

    const frames = [
      {
        id: 'f1',
        durationMs: 100,
        layers: [
          { id: 'lens-base', name: 'Base', visible: true, locked: false, opacity: 1, blendMode: 'source-over' as const },
        ],
      },
    ];

    const baseline = compositeFrame(frames, 0, width, height, { freshCanvas: true });
    expect(baseline).toBeTruthy();
    const baselineCtx = (baseline as unknown as MockCanvas).getContext('2d') as MockCtx;
    const baselineBytes = Array.from(baselineCtx._imageData.data);

    // Activate BOTH lenses (worst case) — project data + export path must not change
    useStudioStore.getState().setCvdLens('protanopia');
    useStudioStore.getState().toggleSquintMode();
    expect(useStudioStore.getState().squintMode).toBe(true);

    const withLens = compositeFrame(frames, 0, width, height, { freshCanvas: true });
    const lensCtx = (withLens as unknown as MockCanvas).getContext('2d') as MockCtx;
    expect(Array.from(lensCtx._imageData.data)).toEqual(baselineBytes);

    // The layer buffer itself is untouched too (source art intact)
    const bufferCtx = getOrCreateBuffer('lens-base', width, height).ctx as unknown as MockCtx;
    expect(Array.from(bufferCtx._imageData.data.slice(0, 3))).toEqual([0xff, 0x55, 0x00]);
  });
});
