import { describe, it, expect } from 'vitest';
import { hexToRgba, performFloodFill } from '@/lib/canvas/floodFill';
import { makeCanvas } from './helpers/mockCanvas';

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

describe('performFloodFill: 32-bit unsigned pixel matching', () => {
  it('fills an opaque colored region on a canvas with tolerance = 0', () => {
    const canvas = makeCanvas(4, 4);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    // Fill canvas with opaque red (#ff0000, alpha = 255)
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 4, 4);

    // Verify initial pixel is opaque red
    const before = ctx.getImageData(0, 0, 4, 4);
    expect(before.data[0]).toBe(255);
    expect(before.data[1]).toBe(0);
    expect(before.data[2]).toBe(0);
    expect(before.data[3]).toBe(255);

    // Perform flood fill to green (#00ff00) with tolerance 0
    performFloodFill(ctx, 0, 0, '#00ff00', true, 0);

    const after = ctx.getImageData(0, 0, 4, 4);
    // All 16 pixels must be filled with opaque green
    for (let i = 0; i < 16; i++) {
      const idx = i * 4;
      expect(after.data[idx]).toBe(0);
      expect(after.data[idx + 1]).toBe(255);
      expect(after.data[idx + 2]).toBe(0);
      expect(after.data[idx + 3]).toBe(255);
    }
  });

  it('performs non-contiguous (global) color replacement on opaque pixels with tolerance = 0', () => {
    const canvas = makeCanvas(4, 4);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    ctx.fillStyle = '#0000ff';
    ctx.fillRect(0, 0, 4, 4);

    // Flood fill globally to #ffffff
    performFloodFill(ctx, 2, 2, '#ffffff', false, 0);

    const after = ctx.getImageData(0, 0, 4, 4);
    for (let i = 0; i < 16; i++) {
      const idx = i * 4;
      expect(after.data[idx]).toBe(255);
      expect(after.data[idx + 1]).toBe(255);
      expect(after.data[idx + 2]).toBe(255);
      expect(after.data[idx + 3]).toBe(255);
    }
  });

  it('fills transparent canvas region with opaque color when tolerance = 0', () => {
    const canvas = makeCanvas(4, 4);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    // Canvas is initially blank (alpha = 0)
    performFloodFill(ctx, 0, 0, '#ffaa00', true, 0);

    const after = ctx.getImageData(0, 0, 4, 4);
    for (let i = 0; i < 16; i++) {
      const idx = i * 4;
      expect(after.data[idx]).toBe(255);
      expect(after.data[idx + 1]).toBe(170);
      expect(after.data[idx + 2]).toBe(0);
      expect(after.data[idx + 3]).toBe(255);
    }
  });

  it('aborts cleanly without modifying canvas when target and replacement colors match', () => {
    const canvas = makeCanvas(2, 2);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 2, 2);

    // Target is red, fill is identical red -> should return early without modifying
    performFloodFill(ctx, 0, 0, '#ff0000', true, 0);

    const after = ctx.getImageData(0, 0, 2, 2);
    expect(after.data[0]).toBe(255);
    expect(after.data[1]).toBe(0);
    expect(after.data[2]).toBe(0);
    expect(after.data[3]).toBe(255);
  });
});