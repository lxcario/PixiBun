// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rotateWithRotSprite } from '../src/lib/ai/math/rotSprite';
import { makeCanvas } from './helpers/mockCanvas';

describe('RotSprite Shaded & Gradient Cel-Shading Test', () => {
  let origCreateElement: typeof document.createElement;

  beforeEach(() => {
    origCreateElement = document.createElement.bind(document);
    document.createElement = (tag: string) => {
      if (tag === 'canvas') {
        return makeCanvas(16, 16);
      }
      return origCreateElement(tag);
    };
  });

  afterEach(() => {
    document.createElement = origCreateElement;
  });

  it('preserves all subtle OKLCH cel-shaded lilac shadow bands without crushing or flattening', () => {
    // 16x16 sprite with 4 stepped photometric tonal bands:
    // Band 0 (Highlight): #ffffff [255, 255, 255]
    // Band 1 (Warm Paper/Midtone): #ede8f4 [237, 232, 244] - delta = 18 + 23 + 11 = 52
    // Band 2 (Cool Lilac Shadow): #cdbfdf [205, 191, 223] - delta = 32 + 41 + 21 = 94
    // Band 3 (Deep Shadow / Crease): #bcaacb [188, 170, 203] - delta = 17 + 21 + 20 = 58
    // Band 4 (Plum Shadow): #664b68 [102, 75, 104]
    const BANDS: [number, number, number][] = [
      [255, 255, 255],
      [237, 232, 244],
      [205, 191, 223],
      [188, 170, 203],
    ];

    const canvas = makeCanvas(16, 16);
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(16, 16);

    // Draw a shaded sphere-like disc with concentric tonal bands
    const cx = 8, cy = 8, r = 6;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= r) {
          // Linear shade ramp along light vector (top-left to bottom-right)
          const shadeNorm = ((dx + dy) / (2 * r) + 0.5); // 0 (brightest) to 1 (darkest)
          const bandIdx = Math.min(3, Math.max(0, Math.floor(shadeNorm * 4)));
          const [rC, gC, bC] = BANDS[bandIdx];
          const idx = (y * 16 + x) * 4;
          imgData.data[idx] = rC;
          imgData.data[idx + 1] = gC;
          imgData.data[idx + 2] = bC;
          imgData.data[idx + 3] = 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Count source band frequencies
    const srcCounts = [0, 0, 0, 0];
    for (let i = 0; i < imgData.data.length; i += 4) {
      if (imgData.data[i + 3] > 128) {
        const rVal = imgData.data[i];
        const gVal = imgData.data[i + 1];
        const bVal = imgData.data[i + 2];
        for (let b = 0; b < 4; b++) {
          if (rVal === BANDS[b][0] && gVal === BANDS[b][1] && bVal === BANDS[b][2]) {
            srcCounts[b]++;
            break;
          }
        }
      }
    }
    expect(srcCounts.every((c) => c > 5)).toBe(true);

    // Rotate by 45 degrees
    const rotated = rotateWithRotSprite(ctx, 16, 16, 45);
    const rData = rotated.getContext('2d')!.getImageData(0, 0, 16, 16).data;

    const rotCounts = [0, 0, 0, 0];
    let otherColors = 0;
    for (let i = 0; i < rData.length; i += 4) {
      if (rData[i + 3] > 128) {
        const rVal = rData[i];
        const gVal = rData[i + 1];
        const bVal = rData[i + 2];
        let matched = false;
        for (let b = 0; b < 4; b++) {
          if (rVal === BANDS[b][0] && gVal === BANDS[b][1] && bVal === BANDS[b][2]) {
            rotCounts[b]++;
            matched = true;
            break;
          }
        }
        if (!matched) otherColors++;
      }
    }

    // 1. PALETTE PURITY: RotSprite must never invent new blurred or blended colors
    expect(otherColors).toBe(0);

    // 2. NO BAND CRUSHING: Every single subtle lilac shadow band must survive rotation intact
    for (let b = 0; b < 4; b++) {
      expect(rotCounts[b]).toBeGreaterThanOrEqual(8);
    }
  });
});
