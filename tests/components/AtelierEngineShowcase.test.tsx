// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// The stage engine draws with real canvas engines; here it is a recorder, so
// these tests cover how the section drives it. benchArt is tested for real below.
const calls: Array<[string, unknown]> = [];
vi.mock('@/components/landing/bench/benchStage', () => {
  class BenchStage {
    private pixels: Uint8ClampedArray = new Uint8ClampedArray(16 * 16 * 4);
    constructor(_stage: HTMLCanvasElement, private options: { onStatus?: (text: string) => void }) {
      options.onStatus?.('16×16');
    }
    setArt(px: Uint8ClampedArray) { this.pixels = px; calls.push(['art', px]); }
    getPixels() { return this.pixels; }
    setTheme() {}
    setTool(tool: string) { calls.push(['tool', tool]); }
    setPaint(color: string | null) { calls.push(['paint', color]); }
    setMirror(mirror: boolean) { calls.push(['mirror', mirror]); }
    setMaterial(material: string) { calls.push(['material', material]); }
    setReduceMotion() {}
    setThumbs() {}
    turnTo(angle: number) { calls.push(['turn', angle]); }
    pointerDown() {}
    pointerMove() {}
    pointerUp() {}
    pointerLeave() {}
    key() { return false; }
    hopCanvases() { return []; }
    dispose() {}
  }
  return { BenchStage, STAGE_W: 160, STAGE_H: 120, TURN_LEFT_X: 6, TURN_RIGHT_X: 82 };
});

vi.mock('motion/react', () => ({ useReducedMotion: () => true }));

import { AtelierEngineShowcase } from '@/components/landing/AtelierEngineShowcase';
import { HOP_FRAMES, HOP_LOOP_MS, hopFrameAt, padForTurn, paintLine, samePixels, spriteSwatches, templatePixels, TURN } from '@/components/landing/bench/benchArt';
import { STARTER_TEMPLATES, TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';

const last = (kind: string) => [...calls].reverse().find(([k]) => k === kind)?.[1];

describe('AtelierEngineShowcase (the bench)', () => {
  beforeEach(() => {
    calls.length = 0;
    HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });
  afterEach(() => cleanup());

  it('keeps the Engine anchor and offers four tools, Draw first', () => {
    const { container } = render(<AtelierEngineShowcase />);
    expect(container.querySelector('#engine-showcase')).not.toBeNull();
    const tools = screen.getAllByRole('radio').filter((el) => el.closest('[aria-label="Tool"]'));
    expect(tools.map((t) => t.textContent?.match(/Draw|Light|Turn|Hop/)?.[0])).toEqual(['Draw', 'Light', 'Turn', 'Hop']);
    expect(tools[0].getAttribute('aria-checked')).toBe('true');
    expect(last('tool')).toBe('draw');
  });

  it('switches tools from the rack and from number keys on the stage', () => {
    render(<AtelierEngineShowcase />);
    fireEvent.click(screen.getByRole('radio', { name: /Light/ }));
    expect(last('tool')).toBe('light');
    expect(screen.getByRole('button', { name: 'Gold' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Gold' }));
    expect(last('material')).toBe('gold');

    fireEvent.keyDown(screen.getByRole('img', { name: /on the bench/ }), { key: '3' });
    expect(last('tool')).toBe('turn');
    fireEvent.click(screen.getByRole('button', { name: '45°' }));
    expect(last('turn')).toBe(45);
    expect(screen.getByText('plain turn')).toBeDefined();
  });

  it('paints with the sprite’s own colours, an eraser and a mirror', () => {
    render(<AtelierEngineShowcase />);
    expect(last('paint')).toBe(TEMPLATE_PALETTE.o);
    fireEvent.click(screen.getByRole('radio', { name: 'Eraser' }));
    expect(last('paint')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /mirror/ }));
    expect(last('mirror')).toBe(false);
  });

  it('swaps friends and points the Studio link at the same starter', () => {
    render(<AtelierEngineShowcase />);
    fireEvent.click(screen.getByRole('radio', { name: 'Mochi' }));
    expect(screen.getByRole('link', { name: /Open Mochi in the Studio/ }).getAttribute('href')).toBe('/studio?template=mochi');
    expect(samePixels(last('art') as Uint8ClampedArray, templatePixels(STARTER_TEMPLATES[1].rows))).toBe(true);
  });

  it('offers the GIF only on the Hop tool', () => {
    render(<AtelierEngineShowcase />);
    expect(screen.queryByRole('button', { name: 'Save GIF' })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: /Hop/ }));
    expect(screen.getByRole('button', { name: 'Save GIF' })).toBeDefined();
  });
});

describe('bench art', () => {
  const bun = STARTER_TEMPLATES.find((t) => t.id === 'bun')!;

  it('reads a starter into RGBA with transparent background', () => {
    const px = templatePixels(bun.rows);
    expect(px.length).toBe(16 * 16 * 4);
    expect(px[3]).toBe(0);
    const ink = (0 * 16 + 3) * 4; // row 0 col 3 is outline ink
    expect([...px.subarray(ink, ink + 4)]).toEqual([0x3a, 0x2e, 0x4c, 255]);
  });

  it('paints mirrored, pixel-perfect lines and erases', () => {
    const px = new Uint8ClampedArray(16 * 16 * 4);
    expect(paintLine(px, { x: 1, y: 1 }, { x: 4, y: 1 }, [255, 0, 0, 255], true)).toBe(true);
    for (const x of [1, 2, 3, 4, 11, 12, 13, 14]) expect(px[(16 + x) * 4 + 3]).toBe(255);
    expect(paintLine(px, null, { x: 2, y: 1 }, null, false)).toBe(true);
    expect(px[(16 + 2) * 4 + 3]).toBe(0);
    expect(paintLine(px, null, { x: 2, y: 1 }, null, false)).toBe(false);
  });

  it('pads for turning without moving the sprite off-centre', () => {
    const px = templatePixels(bun.rows);
    const padded = padForTurn(px);
    expect(padded.width).toBe(TURN);
    const off = (TURN - 16) / 2;
    expect(padded.data[((off + 0) * TURN + off + 3) * 4 + 3]).toBe(255);
  });

  it('leads the swatches with ink and always adds something new', () => {
    const swatches = spriteSwatches(bun.rows);
    expect(swatches[0]).toBe(TEMPLATE_PALETTE.o);
    expect(new Set(swatches).size).toBe(swatches.length);
    expect(swatches).toContain(TEMPLATE_PALETTE.A);
  });

  it('times the hop loop from its frame holds', () => {
    expect(hopFrameAt(0)).toBe(0);
    expect(hopFrameAt(HOP_FRAMES[0].ms)).toBe(1);
    expect(hopFrameAt(HOP_LOOP_MS + 1)).toBe(0);
    expect(hopFrameAt(-1)).toBe(HOP_FRAMES.length - 1);
  });
});
