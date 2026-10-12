import type { Page } from '@playwright/test';
import { NibbliMemory } from './memory';
import { readNativePng } from '../../tests/helpers/readNativePng';

export interface Raster { width: number; height: number; data: number[] }

/** Observes native pixels; never writes application state or calls its drawing engine. */
export async function readCanvas(page: Page): Promise<Raster> {
  return page.getByTestId('main-composite-canvas').evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Native canvas is unavailable.');
    return { width: canvas.width, height: canvas.height,
      data: Array.from(ctx.getImageData(0, 0, canvas.width, canvas.height).data) };
  });
}

export function rasterDifference(actual: Raster, expected: Raster) {
  if (actual.width !== expected.width || actual.height !== expected.height || actual.data.length !== expected.data.length) {
    return { equal: false, geometry: true, changedPixels: null, firstDifference: null };
  }
  let changedPixels = 0;
  let firstDifference: { x: number; y: number; actual: number[]; expected: number[] } | null = null;
  for (let at = 0; at < actual.data.length; at += 4) {
    if (actual.data.slice(at, at + 4).some((v, c) => v !== expected.data[at + c])) {
      changedPixels++;
      firstDifference ??= { x: (at / 4) % actual.width, y: Math.floor(at / 4 / actual.width),
        actual: actual.data.slice(at, at + 4), expected: expected.data.slice(at, at + 4) };
    }
  }
  return { equal: changedPixels === 0, geometry: false, changedPixels, firstDifference };
}

export class VisionMismatch extends Error {
  constructor(message: string) { super(message); this.name = 'VisionMismatch'; }
}

export async function verifyRaster(memory: NibbliMemory, label: string, actual: Raster, expected: Raster) {
  const difference = rasterDifference(actual, expected);
  const id = await memory.event('pixel-verification', { label, difference,
    verdict: difference.equal ? 'passed' : 'failed', failureOwner: difference.equal ? undefined : 'unknown',
    review: difference.equal ? undefined : 'Check product, expected fixture and controller evidence before attribution.' });
  if (!difference.equal) throw new VisionMismatch(`${label}: ${JSON.stringify(difference)}`);
  return id;
}

/** Sample the live renderer on browser animation ticks, independently of store state. */
export async function observePlayback(page: Page, references: Raster[], milliseconds = 3200) {
  if (references.length < 2 || references.length > 16 || !Number.isInteger(milliseconds) || milliseconds < 100 || milliseconds > 10_000) {
    throw new VisionMismatch('Invalid playback observation request.');
  }
  return page.getByTestId('main-composite-canvas').evaluate(async (canvas: HTMLCanvasElement, input) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Playback canvas is unavailable.');
    const transitions: { frame: number; elapsedMs: number }[] = [];
    const sampleTimings: { elapsedMs: number; rafTimestampMs: number; gapMs: number | null; pixelReadMs: number; matchMs: number }[] = [];
    let samples = 0, unmatchedSamples = 0;
    let previousTimestamp: number | null = null;
    const started = performance.now();
    await new Promise<void>(resolve => {
      const sample = (timestamp: number) => {
        const elapsedMs = performance.now() - started;
        const readStarted = performance.now();
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const matchStarted = performance.now();
        const frame = input.references.findIndex(reference => reference.width === canvas.width && reference.height === canvas.height
          && reference.data.length === pixels.length && reference.data.every((value, index) => value === pixels[index]));
        sampleTimings.push({ elapsedMs, rafTimestampMs: timestamp,
          gapMs: previousTimestamp === null ? null : timestamp - previousTimestamp,
          pixelReadMs: matchStarted - readStarted, matchMs: performance.now() - matchStarted });
        previousTimestamp = timestamp;
        samples++;
        if (frame < 0) unmatchedSamples++;
        if (transitions.at(-1)?.frame !== frame) transitions.push({ frame, elapsedMs });
        if (elapsedMs >= input.milliseconds) resolve(); else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    return { samples, unmatchedSamples, elapsedMs: performance.now() - started, transitions, sampleTimings,
      timingScope: 'Observed renderer dwell times; not a wall-clock performance qualification.' };
  }, { references, milliseconds });
}

/** Parse an actual downloaded project independently of the production serializer. */
export interface ProjectObservation {
  width: number; height: number;
  frames: { durationMs: number; layers: { name: string; raster: Raster }[] }[];
}
export function readProject(bytes: Buffer): ProjectObservation {
  const value = JSON.parse(bytes.toString('utf8'));
  if (value.format !== 'pixibun-project' || value.version !== 4
    || !Number.isInteger(value.width) || !Number.isInteger(value.height)
    || value.width < 1 || value.height < 1 || value.width > 2048 || value.height > 2048
    || !Array.isArray(value.frames) || !value.frames.length) throw new VisionMismatch('Invalid downloaded project structure.');
  const frames = value.frames.map((frame: { durationMs: number; layers: { name: string; pngBase64?: string }[] }) => {
    if (!Number.isFinite(frame.durationMs) || frame.durationMs <= 0 || !Array.isArray(frame.layers)) throw new VisionMismatch('Invalid downloaded frame.');
    return { durationMs: frame.durationMs, layers: frame.layers.map(layer => {
      if (!layer.pngBase64 || typeof layer.name !== 'string') throw new VisionMismatch('Downloaded layer has no native pixel payload.');
      const raster = readNativePng(Buffer.from(layer.pngBase64, 'base64'));
      if (raster.width !== value.width || raster.height !== value.height) throw new VisionMismatch('Downloaded layer dimensions changed.');
      return { name: layer.name, raster };
    }) };
  });
  return { width: value.width as number, height: value.height as number, frames };
}

export { readNativePng };
