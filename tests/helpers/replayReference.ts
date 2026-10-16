// A plain-array model of what a replay link should draw, written apart from the
// Studio's canvas, history and compositor. Vitest pins the golden replays' readout
// values with it; Playwright then checks the real Studio agrees.

import { replayStepPoints, type ReplayScript } from '../../src/lib/project/replayLink';

export interface ReferenceLayer {
  name: string;
  rgba: Uint8ClampedArray;
}

export interface ReferenceDrawing {
  width: number;
  height: number;
  /** Each frame's layers, top first, as the Studio orders them. */
  frames: ReferenceLayer[][];
  activeFrame: number;
  activeLayer: number;
}

function rgbOf(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function fill(rgba: Uint8ClampedArray, width: number, height: number, x: number, y: number, rgb: [number, number, number]) {
  const at = (px: number, py: number) => (py * width + px) * 4;
  const start = at(x, y);
  const target = [rgba[start], rgba[start + 1], rgba[start + 2], rgba[start + 3]];
  const transparent = (i: number) => rgba[i + 3] === 0;
  const matches = (i: number) => (target[3] === 0
    ? transparent(i)
    : rgba[i] === target[0] && rgba[i + 1] === target[1] && rgba[i + 2] === target[2] && rgba[i + 3] === target[3]);
  if (target[3] === 255 && target[0] === rgb[0] && target[1] === rgb[1] && target[2] === rgb[2]) return;
  const seen = new Uint8Array(width * height);
  const stack: Array<[number, number]> = [[x, y]];
  seen[y * width + x] = 1;
  while (stack.length) {
    const [px, py] = stack.pop()!;
    rgba.set([...rgb, 255], at(px, py));
    for (const [nx, ny] of [[px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || seen[ny * width + nx] || !matches(at(nx, ny))) continue;
      seen[ny * width + nx] = 1;
      stack.push([nx, ny]);
    }
  }
}

export function renderReplayReference(script: ReplayScript, stepCount = script.steps.length): ReferenceDrawing {
  const { width, height } = script;
  const blank = () => new Uint8ClampedArray(width * height * 4);
  const drawing: ReferenceDrawing = { width, height, frames: [[{ name: 'Base Layer', rgba: blank() }]], activeFrame: 0, activeLayer: 0 };
  for (const step of script.steps.slice(0, stepCount)) {
    const frame = drawing.frames[drawing.activeFrame];
    if (step.kind === 'add-layer') {
      frame.unshift({ name: `Layer ${frame.length + 1}`, rgba: blank() });
      drawing.activeLayer = 0;
      continue;
    }
    if (step.kind === 'add-frame') {
      drawing.frames.push(frame.map((layer) => ({ name: layer.name, rgba: blank() })));
      drawing.activeFrame = drawing.frames.length - 1;
      drawing.activeLayer = 0;
      continue;
    }
    const layer = frame[drawing.activeLayer].rgba;
    if (step.kind === 'fill') {
      fill(layer, width, height, step.at.x, step.at.y, rgbOf(script.palette[step.color]));
      continue;
    }
    const value = step.kind === 'eraser' ? [0, 0, 0, 0] : [...rgbOf(script.palette[step.color]), 255];
    for (const { x, y } of replayStepPoints(step, width, height)) {
      if (x >= 0 && y >= 0 && x < width && y < height) layer.set(value, (y * width + x) * 4);
    }
  }
  return drawing;
}

/** The active frame flattened like the Studio's composite: opaque layers, upper ones win. */
export function compositeReference(drawing: ReferenceDrawing): Uint8ClampedArray {
  const out = new Uint8ClampedArray(drawing.width * drawing.height * 4);
  const layers = drawing.frames[drawing.activeFrame];
  for (let l = layers.length - 1; l >= 0; l--) {
    const { rgba } = layers[l];
    for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3] > 0) out.set(rgba.subarray(i, i + 4), i);
  }
  return out;
}
