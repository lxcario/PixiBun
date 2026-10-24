import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getBresenhamLine } from '@/lib/canvas/rasterMath';
import {
  REPLAY_LIMITS,
  describeReplayStep,
  encodeReplay,
  parseReplay,
  replayStepPoints,
  type ReplayScript,
} from '@/lib/project/replayLink';
import { formatReadoutColors, summarizeCanvasPixels } from '@/lib/render/canvasReadout';
import { compositeReference, renderReplayReference } from './helpers/replayReference';

interface Golden {
  id: string;
  title: string;
  replay: string;
  steps: number;
  expect: {
    size: string; frame: string; frames: number; layer: string; layers: number;
    pixels: number; colors: number; topColors: string; digest: string;
  };
  afterUndo: { pixels: number; colors: number; topColors: string; digest: string };
}

const goldens = (JSON.parse(readFileSync('docs/testsprite/replays.json', 'utf8')) as { format: number; replays: Golden[] }).replays;

function parsed(text: string): ReplayScript {
  const result = parseReplay(text);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function errorOf(text: unknown): string {
  const result = parseReplay(text);
  expect(result.ok).toBe(false);
  return result.ok ? '' : result.error;
}

function readout(script: ReplayScript, stepCount?: number) {
  const drawing = renderReplayReference(script, stepCount);
  const summary = summarizeCanvasPixels(compositeReference(drawing), script.width, script.height);
  return { drawing, summary };
}

describe('replay link format', () => {
  it('round-trips every step kind through a canonical string', () => {
    const script: ReplayScript = {
      width: 20, height: 12, palette: ['#ff3355', '#00aaff', '#ffffff'],
      steps: [
        { kind: 'pen', color: 0, points: [{ x: 0, y: 0 }, { x: 4, y: 2 }, { x: 4, y: 7 }] },
        { kind: 'eraser', points: [{ x: 1, y: 1 }] },
        { kind: 'line', color: 1, from: { x: 19, y: 0 }, to: { x: 0, y: 11 } },
        { kind: 'rect', color: 2, filled: false, from: { x: 2, y: 2 }, to: { x: 6, y: 6 } },
        { kind: 'rect', color: 2, filled: true, from: { x: 8, y: 2 }, to: { x: 9, y: 3 } },
        { kind: 'ellipse', color: 1, filled: false, from: { x: 10, y: 1 }, to: { x: 18, y: 9 } },
        { kind: 'ellipse', color: 0, filled: true, from: { x: 12, y: 3 }, to: { x: 16, y: 7 } },
        { kind: 'fill', color: 2, at: { x: 19, y: 11 } },
        { kind: 'add-layer' },
        { kind: 'add-frame' },
      ],
    };
    const text = encodeReplay(script);
    expect(text).toBe('1_20x12_ff3355.00aaff.ffffff_p0.0.0.4.2.4.7~x.1.1~l1.19.0.0.11~r2.2.2.6.6~R2.8.2.9.3~e1.10.1.18.9~E0.12.3.16.7~f2.19.11~L~F');
    expect(text).toMatch(/^[A-Za-z0-9._~-]+$/);
    expect(encodeURIComponent(text)).toBe(text);
    expect(parsed(text)).toEqual(script);
  });

  it('reads uppercase palette digits as lowercase colors', () => {
    expect(parsed('1_4x4_FF3355.0A0B0C_p1.0.0').palette).toEqual(['#ff3355', '#0a0b0c']);
  });

  it('accepts the size, palette, step and path limits exactly', () => {
    const max = REPLAY_LIMITS.maxDimension;
    expect(parsed(`1_${max}x1_000000_p0.${max - 1}.0`).width).toBe(max);
    const palette = Array.from({ length: REPLAY_LIMITS.maxPaletteColors }, (_, i) => i.toString(16).padStart(6, '0')).join('.');
    expect(parsed(`1_4x4_${palette}_p15.0.0`).palette).toHaveLength(16);
    const path = Array.from({ length: REPLAY_LIMITS.maxPathPoints }, (_, i) => `.${i % 2}.0`).join('');
    expect(parsed(`1_4x4_000000_p0${path}`).steps).toHaveLength(1);
    const steps = Array.from({ length: REPLAY_LIMITS.maxSteps }, () => 'p0.0.0').join('~');
    expect(parsed(`1_4x4_000000_${steps}`).steps).toHaveLength(REPLAY_LIMITS.maxSteps);
    expect(parsed(`1_4x4_000000_${Array(REPLAY_LIMITS.maxAddedLayers).fill('L').join('~')}`).steps).toHaveLength(7);
    expect(parsed(`1_4x4_000000_${Array(REPLAY_LIMITS.maxAddedFrames).fill('F').join('~')}`).steps).toHaveLength(23);
  });

  it.each([
    [undefined, 'empty'],
    [42, 'empty'],
    ['', 'empty'],
    ['x'.repeat(REPLAY_LIMITS.maxLength + 1), 'longer than 2048'],
    ['hello', 'not a PixiBun replay link'],
    ['0_4x4_000000_p0.0.0', 'not a PixiBun replay link'],
    ['01_4x4_000000_p0.0.0', 'not a PixiBun replay link'],
    ['2_4x4_000000_p0.0.0', 'uses format 2'],
    ['1_4x4_000000', 'four parts'],
    ['1_4x4_000000_p0.0.0_extra', 'four parts'],
    ['1_4_000000_p0.0.0', 'look like 16x16'],
    ['1_4x4x4_000000_p0.0.0', 'look like 16x16'],
    ['1_0x4_000000_p0.0.0', 'width must be between 1 and 64'],
    ['1_4x65_000000_p0.0.0', 'height must be between 1 and 64'],
    ['1_04x4_000000_p0.0.0', 'width must be a whole number'],
    ['1_4x-4_000000_p0.0.0', 'height must be a whole number'],
    ['1_4x4__p0.0.0', 'Palette color “” is not six hex digits'],
    ['1_4x4_ggg000_p0.0.0', 'Palette color “ggg000”'],
    ['1_4x4_fff_p0.0.0', 'Palette color “fff”'],
    ['1_4x4_ff000080_p0.0.0', 'Palette color “ff000080”'],
    [`1_4x4_${Array(17).fill(0).map((_, i) => i.toString(16).padStart(6, '0')).join('.')}_p0.0.0`, 'more than 16 colors'],
    ['1_4x4_ff0000.FF0000_p0.0.0', 'ff0000 appears twice'],
    ['1_4x4_000000_', 'Step 1 (empty) is not a step'],
    ['1_4x4_000000_p0.0.0~~p0.1.1', 'Step 2 (empty)'],
    ['1_4x4_000000_q0.0.0', 'Step 1 (q0.0.0) is not a step'],
    ['1_4x4_000000_p.0.0', 'needs a palette index after “p”'],
    ['1_4x4_000000_x0.0.0', 'takes no palette index'],
    ['1_4x4_000000_L0', 'takes no palette index'],
    ['1_4x4_000000_p1.0.0', 'uses color 1, but the palette only has color 0'],
    ['1_4x4_000000.ffffff_f2.0.0', 'only has colors 0–1'],
    ['1_4x4_000000_p0.0.0.1', 'x without its y'],
    ['1_4x4_000000_p0.4.0', 'reaches 4,0, outside the 4×4 canvas'],
    ['1_4x4_000000_p0.0.01', 'is not a step'],
    ['1_4x4_000000_p0.0.0.', 'is not a step'],
    ['1_4x4_000000_p0', 'needs 1–64 points, not 0'],
    ['1_4x4_000000_l0.0.0', 'needs exactly 2 points, not 1'],
    ['1_4x4_000000_R0.0.0.1.1.2.2', 'needs exactly 2 points, not 3'],
    ['1_4x4_000000_f0.0.0.1.1', 'needs exactly 1 point, not 2'],
    ['1_4x4_000000_L.1.1', 'needs exactly 0 points, not 1'],
    ['1_4x4_000000_p0 .0.0', 'is not a step'],
    ['1_4x4_000000_p0%2E0.0', 'is not a step'],
    [`1_4x4_000000_p0${Array(65).fill('.0.0').join('')}`, 'needs 1–64 points, not 65'],
    [`1_4x4_000000_${Array(201).fill('L').join('~')}`, 'more than 200 steps'],
    [`1_4x4_000000_${Array(8).fill('L').join('~')}`, 'adds more than 7 layers'],
    [`1_4x4_000000_${Array(24).fill('F').join('~')}`, 'adds more than 23 frames'],
  ])('refuses %j with a clear message', (input, message) => {
    expect(errorOf(input)).toContain(message);
  });

  it('shortens a long step in its message', () => {
    expect(errorOf(`1_4x4_000000_p0${'.9'.repeat(20)}`)).toMatch(/^Step 1 \(p0\.9\.9\.9\.9\.9\.9\.9\.9\.9\.9\.9…\)/);
  });

  it('ignores invisible characters and spaces a copied link picks up, but nothing visible', () => {
    const link = '1_16x16_ff0000.0000ff_p0.2.3~F~p1.8.10';
    const clean = parseReplay(link);
    expect(clean.ok).toBe(true);
    for (const copied of [`${link}\u200C`, `\uFEFF${link}`, `${link.slice(0, 20)}\u200B${link.slice(20)}`, ` ${link}\u2060 `]) {
      expect(parseReplay(copied)).toEqual(clean);
    }
    expect(parseReplay(`${link}x`).ok).toBe(false);
    expect(parseReplay('\u200C').ok).toBe(false);
  });

  it('never throws on arbitrary input', () => {
    const alphabet = '0123456789_x.~pxlrReEfLFab-%';
    let seed = 7;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
    for (let i = 0; i < 2000; i++) {
      const length = Math.floor(random() * 40);
      let text = i % 2 ? '1_8x8_ff0000.00ff00_' : '';
      for (let c = 0; c < length; c++) text += alphabet[Math.floor(random() * alphabet.length)];
      const result = parseReplay(text);
      expect(typeof result.ok).toBe('boolean');
      if (result.ok) expect(parseReplay(encodeReplay(result.value))).toEqual(result);
    }
  });

  it('refuses to encode a script that would not parse back', () => {
    expect(() => encodeReplay({ width: 4, height: 4, palette: ['#000000'], steps: [{ kind: 'fill', color: 3, at: { x: 0, y: 0 } }] }))
      .toThrow(RangeError);
    expect(() => encodeReplay({ width: 99, height: 4, palette: ['#000000'], steps: [{ kind: 'add-layer' }] })).toThrow('between 1 and 64');
  });
});

describe('replay step geometry', () => {
  it('walks a Pen path like a drag: the press, then a Bresenham line to each point', () => {
    const step = parsed('1_16x16_000000_p0.1.1.6.3.6.9').steps[0];
    const expected = [{ x: 1, y: 1 }, ...getBresenhamLine(1, 1, 6, 3).slice(1), ...getBresenhamLine(6, 3, 6, 9).slice(1)];
    expect(replayStepPoints(step, 16, 16)).toEqual(expected);
    expect(replayStepPoints(parsed('1_16x16_000000_p0.5.5').steps[0], 16, 16)).toEqual([{ x: 5, y: 5 }]);
  });

  it('draws the same pixels for a line either way round', () => {
    const forward = replayStepPoints(parsed('1_16x16_000000_l0.1.2.13.7').steps[0], 16, 16);
    const backward = replayStepPoints(parsed('1_16x16_000000_l0.13.7.1.2').steps[0], 16, 16);
    const key = (points: { x: number; y: number }[]) => points.map((p) => `${p.x},${p.y}`).sort();
    expect(key(backward)).toEqual(key(forward));
  });

  it('stamps nothing itself for fill and structure steps, and names each step for Undo', () => {
    const script = parsed('1_4x4_000000_f0.0.0~L~F~x.0.0~r0.0.0.1.1~E0.0.0.3.3~l0.0.0.1.1~p0.0.0');
    expect(script.steps.slice(0, 3).map((step) => replayStepPoints(step, 4, 4))).toEqual([[], [], []]);
    expect(script.steps.map(describeReplayStep)).toEqual([
      'Replay: Fill', 'Add Layer', 'Add Frame', 'Replay: Eraser', 'Replay: Rectangle', 'Replay: Ellipse', 'Replay: Line', 'Replay: Pen',
    ]);
  });
});

describe('golden replays (docs/testsprite/replays.json)', () => {
  const prd = readFileSync('docs/testsprite/PRD.md', 'utf8');
  const guide = readFileSync('docs/testsprite/replays.md', 'utf8');

  it('ships four to six named replays with distinct links and digests', () => {
    expect(goldens.length).toBeGreaterThanOrEqual(4);
    expect(goldens.length).toBeLessThanOrEqual(6);
    expect(new Set(goldens.map((golden) => golden.id)).size).toBe(goldens.length);
    expect(new Set(goldens.map((golden) => golden.expect.digest)).size).toBe(goldens.length);
  });

  it.each(goldens.map((golden) => [golden.id, golden] as const))('%s parses, is canonical and matches the reference model', (_id, golden) => {
    const script = parsed(golden.replay);
    expect(encodeReplay(script)).toBe(golden.replay);
    expect(script.steps).toHaveLength(golden.steps);

    const { drawing, summary } = readout(script);
    const frame = drawing.frames[drawing.activeFrame];
    expect({
      size: `${script.width}×${script.height}`,
      frame: `${drawing.activeFrame + 1} of ${drawing.frames.length}`,
      frames: drawing.frames.length,
      layer: frame[drawing.activeLayer].name,
      layers: frame.length,
      pixels: summary.paintedPixels,
      colors: summary.colorCount,
      topColors: formatReadoutColors(summary.topColors),
      digest: summary.digest,
    }).toEqual(golden.expect);

    // One Undo removes the last step, which is a drawing step on the active frame.
    expect(script.steps.at(-1)!.kind).not.toMatch(/^add-/);
    const undone = readout(script, script.steps.length - 1).summary;
    expect({
      pixels: undone.paintedPixels, colors: undone.colorCount, topColors: formatReadoutColors(undone.topColors), digest: undone.digest,
    }).toEqual(golden.afterUndo);
    expect(undone.digest).not.toBe(summary.digest);
  });

  it.each(goldens.map((golden) => [golden.id, golden] as const))('%s is published in the PRD and the replay guide', (_id, golden) => {
    for (const doc of [prd, guide]) {
      expect(doc).toContain(`/studio?replay=${golden.replay}`);
      expect(doc).toContain(golden.expect.digest);
      expect(doc).toContain(golden.afterUndo.digest);
    }
    expect(guide).toContain(golden.expect.topColors);
  });
});
