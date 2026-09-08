import { describe, it, expect } from 'vitest';
import { depixelizeToSvg } from '@/lib/export/depixelizeVector';

function makeBuffer(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4);
}

function setPixel(
  buffer: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  color: [number, number, number, number]
) {
  const idx = (y * width + x) * 4;
  buffer[idx] = color[0];
  buffer[idx + 1] = color[1];
  buffer[idx + 2] = color[2];
  buffer[idx + 3] = color[3];
}

describe('Phase 34.3: Kopf–Lischinski Vector Depixelization (SVG Export)', () => {
  it('exports a valid SVG document with correct dimensions and viewBox', () => {
    const width = 8;
    const height = 8;
    const data = makeBuffer(width, height);

    // Draw a 4x4 solid square in center
    for (let y = 2; y < 6; y++) {
      for (let x = 2; x < 6; x++) {
        setPixel(data, width, x, y, [240, 190, 124, 255]);
      }
    }

    const result = depixelizeToSvg({ data, width, height }, { scale: 10, smooth: true });

    expect(result.width).toBe(80);
    expect(result.height).toBe(80);
    expect(result.pathCount).toBeGreaterThan(0);
    expect(result.colorCount).toBe(1);

    expect(result.svgString).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(result.svgString).toContain('viewBox="0 0 80 80"');
    expect(result.svgString).toContain('fill="rgb(240,190,124)"');
    expect(result.svgString).toContain('</svg>');
  });

  it('generates smooth cubic Bézier splines with "C" commands when smooth=true', () => {
    const width = 6;
    const height = 6;
    const data = makeBuffer(width, height);

    // Circular diamond / circle shape
    const coords = [
      [2, 1], [3, 1],
      [1, 2], [2, 2], [3, 2], [4, 2],
      [1, 3], [2, 3], [3, 3], [4, 3],
      [2, 4], [3, 4],
    ];
    for (const [x, y] of coords) {
      setPixel(data, width, x, y, [220, 80, 80, 255]);
    }

    const smoothRes = depixelizeToSvg({ data, width, height }, { scale: 10, smooth: true });
    const polyRes = depixelizeToSvg({ data, width, height }, { scale: 10, smooth: false });

    // Smooth version must contain cubic Bézier 'C' commands
    expect(smoothRes.svgString).toContain(' C ');
    // Polygon version uses linear 'L' commands
    expect(polyRes.svgString).toContain(' L ');
    expect(polyRes.svgString).not.toContain(' C ');
  });

  it('resolves diagonal pixel-neighbor crossing ambiguities in 2x2 blocks', () => {
    const width = 4;
    const height = 4;
    const data = makeBuffer(width, height);

    const gold: [number, number, number, number] = [240, 190, 124, 255];
    const purple: [number, number, number, number] = [30, 20, 45, 255];

    // Diagonal crossing:
    // [gold,   purple]
    // [purple, gold  ]
    setPixel(data, width, 1, 1, gold);
    setPixel(data, width, 2, 1, purple);
    setPixel(data, width, 1, 2, purple);
    setPixel(data, width, 2, 2, gold);

    const result = depixelizeToSvg({ data, width, height }, { scale: 8, smooth: true });

    expect(result.colorCount).toBe(2);
    expect(result.svgString).toContain('fill="rgb(240,190,124)"');
    expect(result.svgString).toContain('fill="rgb(30,20,45)"');
    expect(result.svgString).toContain('</svg>');
  });

  it('omits fully transparent pixels from vector paths', () => {
    const width = 4;
    const height = 4;
    const data = makeBuffer(width, height);

    // Only one opaque pixel
    setPixel(data, width, 1, 1, [100, 200, 150, 255]);

    const result = depixelizeToSvg({ data, width, height }, { scale: 5 });

    expect(result.colorCount).toBe(1);
    expect(result.svgString).not.toContain('transparent');
    expect(result.svgString).toContain('fill="rgb(100,200,150)"');
  });

  it('preserves alpha for semi-transparent pixels in vector paths', () => {
    const width = 4;
    const height = 4;
    const data = makeBuffer(width, height);

    // Semi-transparent red pixel: [255, 0, 0, 128] -> 128/255 = 0.502
    setPixel(data, width, 1, 1, [255, 0, 0, 128]);

    const result = depixelizeToSvg({ data, width, height }, { scale: 5 });

    expect(result.colorCount).toBe(1);
    expect(result.svgString).toContain('fill="rgba(255,0,0,0.502)"');
  });
});
