// Replay links: a drawing written as a short, URL-safe recipe that the Studio
// redraws step by step (`/studio?replay=...`). Black-box tests open one, then
// compare the Canvas readout with known values, so they can assert exact pixels
// without seeing inside the <canvas>.
//
// Format version 1, using only URL-unreserved characters:
//
//   1_<width>x<height>_<palette>_<steps>
//
//   palette  1–16 different colors as six hex digits, separated by `.`  (ff3355.ffffff)
//   steps    1–200 steps separated by `~`; each is a letter, a palette index
//            where the step paints, then `.`-separated x.y coordinates:
//
//   p<c>.x.y[.x.y…]   Pen through the points (1–64 points)
//   x.x.y[.x.y…]      Eraser through the points (1–64 points)
//   l<c>.x0.y0.x1.y1  Line
//   r<c> / R<c>       Rectangle outline / filled, corner to corner
//   e<c> / E<c>       Ellipse outline / filled, inside the corners' box
//   f<c>.x.y          Flood fill (contiguous, exact color)
//   L                 Add layer (it becomes the active layer)
//   F                 Add frame (it becomes the active frame)
//
// Every stamp is one pixel, and the Studio's own symmetry, selection, brush
// size and fill settings are ignored, so a link draws the same pixels for
// everyone.

import {
  type Point,
  getBresenhamLine,
  getEllipsePoints,
  getRectanglePoints,
  getUndirectedLine,
} from '@/lib/canvas/rasterMath';

export const REPLAY_VERSION = 1;

export const REPLAY_LIMITS = {
  maxLength: 2048,
  maxDimension: 64,
  maxPaletteColors: 16,
  maxSteps: 200,
  maxPathPoints: 64,
  maxAddedLayers: 7,
  maxAddedFrames: 23,
} as const;

export type ReplayStep =
  | { kind: 'pen'; color: number; points: Point[] }
  | { kind: 'eraser'; points: Point[] }
  | { kind: 'line'; color: number; from: Point; to: Point }
  | { kind: 'rect' | 'ellipse'; color: number; filled: boolean; from: Point; to: Point }
  | { kind: 'fill'; color: number; at: Point }
  | { kind: 'add-layer' }
  | { kind: 'add-frame' };

export interface ReplayScript {
  width: number;
  height: number;
  /** Lowercase `#rrggbb`. */
  palette: string[];
  steps: ReplayStep[];
}

export type ReplayParseResult = { ok: true; value: ReplayScript } | { ok: false; error: string };

const NUMBER = /^(0|[1-9]\d{0,2})$/;
const STEP = /^([pxlrReEfLF])((?:0|[1-9]\d?)?)((?:\.(?:0|[1-9]\d{0,2}))*)$/;
const HEX = /^[0-9a-f]{6}$/i;

const PAINTS = new Set(['p', 'l', 'r', 'R', 'e', 'E', 'f']);
const POINT_COUNT: Record<string, [number, number]> = {
  p: [1, REPLAY_LIMITS.maxPathPoints], x: [1, REPLAY_LIMITS.maxPathPoints],
  l: [2, 2], r: [2, 2], R: [2, 2], e: [2, 2], E: [2, 2], f: [1, 1], L: [0, 0], F: [0, 0],
};

class ReplayError extends Error {}

function fail(message: string): never {
  throw new ReplayError(message);
}

function parseDimension(text: string | undefined, name: string): number {
  if (text === undefined || !NUMBER.test(text)) fail(`The ${name} must be a whole number.`);
  const value = Number(text);
  if (value < 1 || value > REPLAY_LIMITS.maxDimension) fail(`The ${name} must be between 1 and ${REPLAY_LIMITS.maxDimension} pixels.`);
  return value;
}

function parseStep(text: string, index: number, width: number, height: number, paletteSize: number): ReplayStep {
  const label = `Step ${index + 1} (${text.length > 24 ? `${text.slice(0, 24)}…` : text || 'empty'})`;
  const match = STEP.exec(text);
  if (!match) fail(`${label} is not a step PixiBun knows.`);
  const [, letter, colorText, coordText] = match;
  if (PAINTS.has(letter) !== (colorText !== '')) {
    fail(PAINTS.has(letter) ? `${label} needs a palette index after “${letter}”.` : `${label} takes no palette index.`);
  }
  const color = colorText === '' ? -1 : Number(colorText);
  if (color >= paletteSize) fail(`${label} uses color ${color}, but the palette only has ${paletteSize === 1 ? 'color 0' : `colors 0–${paletteSize - 1}`}.`);
  const numbers = coordText === '' ? [] : coordText.slice(1).split('.').map(Number);
  if (numbers.length % 2 !== 0) fail(`${label} has an x without its y.`);
  const points: Point[] = [];
  for (let i = 0; i < numbers.length; i += 2) {
    const point = { x: numbers[i], y: numbers[i + 1] };
    if (point.x >= width || point.y >= height) fail(`${label} reaches ${point.x},${point.y}, outside the ${width}×${height} canvas.`);
    points.push(point);
  }
  const [min, max] = POINT_COUNT[letter];
  if (points.length < min || points.length > max) {
    fail(min === max
      ? `${label} needs exactly ${min} ${min === 1 ? 'point' : 'points'}, not ${points.length}.`
      : `${label} needs ${min}–${max} points, not ${points.length}.`);
  }
  switch (letter) {
    case 'p': return { kind: 'pen', color, points };
    case 'x': return { kind: 'eraser', points };
    case 'l': return { kind: 'line', color, from: points[0], to: points[1] };
    case 'r': case 'R': return { kind: 'rect', color, filled: letter === 'R', from: points[0], to: points[1] };
    case 'e': case 'E': return { kind: 'ellipse', color, filled: letter === 'E', from: points[0], to: points[1] };
    case 'f': return { kind: 'fill', color, at: points[0] };
    case 'L': return { kind: 'add-layer' };
    default: return { kind: 'add-frame' };
  }
}

/** Reads a replay link's `replay` value. Never throws. */
export function parseReplay(input: unknown): ReplayParseResult {
  try {
    if (typeof input !== 'string' || input.length === 0) fail('The replay link is empty.');
    if (input.length > REPLAY_LIMITS.maxLength) fail(`The replay link is longer than ${REPLAY_LIMITS.maxLength} characters.`);
    const sections = input.split('_');
    const version = sections[0];
    if (!NUMBER.test(version)) fail('This is not a PixiBun replay link.');
    if (Number(version) !== REPLAY_VERSION) {
      fail(Number(version) > REPLAY_VERSION
        ? `This replay link uses format ${version}; this version of PixiBun reads format ${REPLAY_VERSION}.`
        : 'This is not a PixiBun replay link.');
    }
    if (sections.length !== 4) fail('A replay link has four parts: version, size, palette and steps.');
    const [, sizeText, paletteText, stepsText] = sections;
    const size = sizeText.split('x');
    if (size.length !== 2) fail('The canvas size must look like 16x16.');
    const width = parseDimension(size[0], 'width');
    const height = parseDimension(size[1], 'height');

    const colors = paletteText.split('.');
    if (colors.length > REPLAY_LIMITS.maxPaletteColors) fail(`The palette has more than ${REPLAY_LIMITS.maxPaletteColors} colors.`);
    const bad = colors.find((color) => !HEX.test(color));
    if (bad !== undefined) fail(`Palette color “${bad.slice(0, 12)}” is not six hex digits.`);
    const palette = colors.map((color) => `#${color.toLowerCase()}`);
    const repeated = palette.find((color, index) => palette.indexOf(color) !== index);
    if (repeated) fail(`Palette color ${repeated.slice(1)} appears twice.`);

    const stepTexts = stepsText.split('~');
    if (stepTexts.length > REPLAY_LIMITS.maxSteps) fail(`The replay has more than ${REPLAY_LIMITS.maxSteps} steps.`);
    const steps = stepTexts.map((text, index) => parseStep(text, index, width, height, palette.length));
    const layers = steps.filter((step) => step.kind === 'add-layer').length;
    const frames = steps.filter((step) => step.kind === 'add-frame').length;
    if (layers > REPLAY_LIMITS.maxAddedLayers) fail(`The replay adds more than ${REPLAY_LIMITS.maxAddedLayers} layers.`);
    if (frames > REPLAY_LIMITS.maxAddedFrames) fail(`The replay adds more than ${REPLAY_LIMITS.maxAddedFrames} frames.`);
    return { ok: true, value: { width, height, palette, steps } };
  } catch (error) {
    if (error instanceof ReplayError) return { ok: false, error: error.message };
    return { ok: false, error: 'The replay link could not be read.' };
  }
}

const coords = (points: Point[]) => points.map((point) => `.${point.x}.${point.y}`).join('');

function encodeStep(step: ReplayStep): string {
  switch (step.kind) {
    case 'pen': return `p${step.color}${coords(step.points)}`;
    case 'eraser': return `x${coords(step.points)}`;
    case 'line': return `l${step.color}${coords([step.from, step.to])}`;
    case 'rect': return `${step.filled ? 'R' : 'r'}${step.color}${coords([step.from, step.to])}`;
    case 'ellipse': return `${step.filled ? 'E' : 'e'}${step.color}${coords([step.from, step.to])}`;
    case 'fill': return `f${step.color}${coords([step.at])}`;
    case 'add-layer': return 'L';
    case 'add-frame': return 'F';
  }
}

/** Writes a script as a `replay` value. Throws a RangeError if the result would not parse back. */
export function encodeReplay(script: ReplayScript): string {
  const palette = script.palette.map((color) => color.replace(/^#/, '').toLowerCase()).join('.');
  const text = `${REPLAY_VERSION}_${script.width}x${script.height}_${palette}_${script.steps.map(encodeStep).join('~')}`;
  const check = parseReplay(text);
  if (!check.ok) throw new RangeError(check.error);
  return text;
}

/** The pixels a painting or erasing step stamps, in order; empty for fill and structure steps. */
export function replayStepPoints(step: ReplayStep, width: number, height: number): Point[] {
  switch (step.kind) {
    case 'pen':
    case 'eraser': {
      // The same walk as a Pen drag: the press, then a Bresenham line to each move.
      const [first, ...rest] = step.points;
      const points = [first];
      let previous = first;
      for (const point of rest) {
        points.push(...getBresenhamLine(previous.x, previous.y, point.x, point.y).slice(1));
        previous = point;
      }
      return points;
    }
    case 'line': return getUndirectedLine(step.from.x, step.from.y, step.to.x, step.to.y, width, height);
    case 'rect': return getRectanglePoints(step.from.x, step.from.y, step.to.x, step.to.y, step.filled);
    case 'ellipse': return getEllipsePoints(step.from.x, step.from.y, step.to.x, step.to.y, step.filled);
    default: return [];
  }
}

/** What the Undo history calls each step. */
export function describeReplayStep(step: ReplayStep): string {
  switch (step.kind) {
    case 'pen': return 'Replay: Pen';
    case 'eraser': return 'Replay: Eraser';
    case 'line': return 'Replay: Line';
    case 'rect': return 'Replay: Rectangle';
    case 'ellipse': return 'Replay: Ellipse';
    case 'fill': return 'Replay: Fill';
    case 'add-layer': return 'Add Layer';
    case 'add-frame': return 'Add Frame';
  }
}
