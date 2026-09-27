import { MAX_CANVAS_DIMENSION, MAX_CANVAS_FRAMES, MAX_PROJECT_AGGREGATE_PIXELS } from '@/config/canvasLimits';

export interface AnalyzedSheetGrid {
  width: number;
  height: number;
  frames: number;
  startX: number;
  startY: number;
  spacingX: number;
  spacingY: number;
}

interface Band { start: number; end: number }
interface Axis { cell: number; start: number; spacing: number; count: number }

const COMMON_CELL_SIZES = [16, 24, 32, 48, 64, 96, 128, 192, 256];

function bands(occupied: Uint8Array): Band[] {
  const result: Band[] = [];
  for (let index = 0; index < occupied.length;) {
    if (!occupied[index]) { index++; continue; }
    const start = index;
    while (index < occupied.length && occupied[index]) index++;
    result.push({ start, end: index });
  }
  return result;
}

function inferAxis(runs: Band[], length: number, workspaceSize: number): Axis | null {
  if (runs.length < 2 || runs.length > MAX_CANVAS_FRAMES) return null;
  let pitch = Math.round((runs[runs.length - 1].start - runs[0].start) / (runs.length - 1));
  let slots = runs.map((_, index) => index);
  const regularDrift = Math.max(2, Math.floor(pitch / 5));
  if (pitch < 2 || runs.some((run, index) => Math.abs(run.start - runs[0].start - index * pitch) > regularDrift)) {
    // A longer gap may be an intentionally blank animation cell. Infer a
    // smaller pitch only when several visible bands prove the cadence.
    if (runs.length < 3) return null;
    const deltas = runs.slice(1).map((run, index) => run.start - runs[index].start);
    pitch = Math.min(...deltas);
    if (pitch < 2 || !deltas.some((delta) => delta >= pitch * 2 - 1)) return null;
    slots = [0];
    for (const delta of deltas) {
      const step = Math.round(delta / pitch);
      if (step < 1 || Math.abs(delta - step * pitch) > 1) return null;
      slots.push(slots[slots.length - 1] + step);
    }
    if (slots[slots.length - 1] + 1 > MAX_CANVAS_FRAMES) return null;
  }
  const widest = Math.max(...runs.map((run) => run.end - run.start));
  if (widest > pitch) return null;

  // A missing transparent timing cell can make the apparent pitch a multiple
  // of the real one. The known workspace grid preserves that blank frame.
  if (workspaceSize > 0 && length % workspaceSize === 0 && pitch >= workspaceSize * 2 &&
      runs.every((run) => Math.floor(run.start / workspaceSize) === Math.floor((run.end - 1) / workspaceSize))) return null;

  const maxGap = Math.max(12, Math.floor(pitch / 4));
  const choices = [workspaceSize, ...COMMON_CELL_SIZES].filter((size) =>
    size >= widest && size <= pitch && pitch - size <= maxGap);
  const cell = choices[0] ?? (pitch - widest <= maxGap ? widest : pitch);
  const margin = Math.floor((cell - (runs[0].end - runs[0].start)) / 2);
  const earliestStart = Math.max(0, ...runs.map((run, index) => run.end - slots[index] * pitch - cell));
  const latestStart = Math.min(length - slots[slots.length - 1] * pitch - cell,
    ...runs.map((run, index) => run.start - slots[index] * pitch));
  if (earliestStart > latestStart) return null;
  const start = Math.max(earliestStart, Math.min(latestStart, runs[0].start - margin));
  const spacing = pitch - cell;
  if (runs.some((run, index) => run.start < start + slots[index] * pitch || run.end > start + slots[index] * pitch + cell)) return null;
  if (start + slots[slots.length - 1] * pitch + cell > length) return null;
  return { cell, start, spacing, count: slots[slots.length - 1] + 1 };
}

function inferSingleAxis(runs: Band[], length: number, workspaceSize: number): Axis {
  if (runs.length !== 1) return { cell: length, start: 0, spacing: 0, count: 1 };
  const run = runs[0];
  const contentSize = run.end - run.start;
  const cell = [workspaceSize, ...COMMON_CELL_SIZES].find((size) =>
    size >= contentSize && size <= length && length - size <= Math.max(12, Math.floor(size / 2))) ?? length;
  const start = Math.max(0, Math.min(length - cell, run.start - Math.floor((cell - contentSize) / 2)));
  return { cell, start, spacing: 0, count: 1 };
}

function inferSafeCutAxis(counts: Uint32Array, otherLength: number, foregroundCount: number): Axis | null {
  const length = counts.length;
  const density = foregroundCount / (length * otherLength);
  if (density < 0.02 || density > 0.9) return null;
  const prefix = new Uint32Array(length + 1);
  for (let index = 0; index < length; index++) prefix[index + 1] = prefix[index] + counts[index];
  const maxCells = Math.min(32, Math.floor(length / 8), MAX_CANVAS_FRAMES);
  for (let cells = maxCells; cells >= 2; cells--) {
    if (length % cells !== 0) continue;
    const cell = length / cells;
    const maximumBoundaryDensity = Math.max(0.015, density * 0.3);
    let safe = true;
    for (let boundary = cell; boundary < length; boundary += cell) {
      const cutDensity = (counts[boundary - 1] + counts[boundary] + counts[Math.min(length - 1, boundary + 1)]) /
        (3 * otherLength);
      if (cutDensity > maximumBoundaryDensity) { safe = false; break; }
    }
    if (!safe) continue;
    // This path is for visible, tightly packed cells. Sparse sheets with blank
    // timing slots are handled by foreground bands or the workspace grid.
    const averageInk = foregroundCount / cells;
    for (let index = 0; index < cells; index++) {
      if (prefix[(index + 1) * cell] - prefix[index * cell] < averageInk * 0.25) {
        safe = false;
        break;
      }
    }
    if (safe) return { cell, start: 0, spacing: 0, count: cells };
  }
  return null;
}

function opaqueBackground(data: Uint8ClampedArray, width: number, height: number): number[] | null {
  const pixels = width * height;
  const stride = Math.max(1, Math.floor(pixels / 100_000));
  let transparent = 0;
  let samples = 0;
  for (let pixel = 0; pixel < pixels; pixel += stride) {
    samples++;
    if (data[pixel * 4 + 3] <= 5) transparent++;
  }
  if (transparent > samples * 0.01) return null;
  const corners = [0, (width - 1) * 4, (height - 1) * width * 4, (width * height - 1) * 4];
  const reference = Array.from(data.slice(0, 4));
  if (reference[3] > 5 && corners.every((offset) =>
    reference.every((channel, index) => Math.abs(channel - data[offset + index]) <= 12))) return reference;

  // When labels or borders occupy corners, use the dominant opaque color.
  // Quantization tolerates small variations in a solid-color sheet background.
  const bins = new Map<number, { count: number; r: number; g: number; b: number; a: number }>();
  let sampled = 0;
  for (let pixel = 0; pixel < pixels; pixel += stride) {
    const offset = pixel * 4;
    if (data[offset + 3] <= 5) continue;
    sampled++;
    const key = ((data[offset] >> 4) << 8) | ((data[offset + 1] >> 4) << 4) | (data[offset + 2] >> 4);
    const bin = bins.get(key) ?? { count: 0, r: 0, g: 0, b: 0, a: 0 };
    bin.count++;
    bin.r += data[offset];
    bin.g += data[offset + 1];
    bin.b += data[offset + 2];
    bin.a += data[offset + 3];
    bins.set(key, bin);
  }
  const dominant = Array.from(bins.values()).sort((a, b) => b.count - a.count)[0];
  if (!dominant || dominant.count < sampled * 0.25) return null;
  return [dominant.r, dominant.g, dominant.b, dominant.a].map((sum) => Math.round(sum / dominant.count));
}

/**
 * Find a regular grid from foreground bands or low-ink cell boundaries. A
 * dominant opaque color can serve as background when transparency is absent.
 * Ambiguous atlases return null instead of silently cutting through artwork.
 */
export function analyzeSpriteSheetGrid(
  image: { data: Uint8ClampedArray; width: number; height: number },
  workspaceWidth: number,
  workspaceHeight: number
): AnalyzedSheetGrid | null {
  const { data, width, height } = image;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 ||
      width * height > 4_194_304 || data.length !== width * height * 4) return null;
  if (width === workspaceWidth && height === workspaceHeight) return null;

  const background = opaqueBackground(data, width, height);
  const xOccupied = new Uint8Array(width);
  const yOccupied = new Uint8Array(height);
  const xCounts = new Uint32Array(width);
  const yCounts = new Uint32Array(height);
  let foregroundCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const alpha = data[offset + 3];
      if (alpha <= 5) continue;
      const matchesBackground = background &&
        Math.abs(data[offset] - background[0]) <= 12 &&
        Math.abs(data[offset + 1] - background[1]) <= 12 &&
        Math.abs(data[offset + 2] - background[2]) <= 12 &&
        Math.abs(alpha - background[3]) <= 12;
      if (matchesBackground) continue;
      xOccupied[x] = 1;
      yOccupied[y] = 1;
      xCounts[x]++;
      yCounts[y]++;
      foregroundCount++;
    }
  }
  if (foregroundCount === 0) return null;

  const xRuns = bands(xOccupied);
  const yRuns = bands(yOccupied);
  const hasWorkspaceBlank = (runs: Band[], length: number, cell: number) =>
    cell > 0 && length % cell === 0 && runs.length >= 2 && runs.length < length / cell &&
    runs.every((run) => Math.floor(run.start / cell) === Math.floor((run.end - 1) / cell));
  const xAxis = inferAxis(xRuns, width, workspaceWidth) ??
    (hasWorkspaceBlank(xRuns, width, workspaceWidth) ? null : inferSafeCutAxis(xCounts, height, foregroundCount));
  const yAxis = inferAxis(yRuns, height, workspaceHeight) ??
    (hasWorkspaceBlank(yRuns, height, workspaceHeight) ? null : inferSafeCutAxis(yCounts, width, foregroundCount));
  if (!xAxis && !yAxis) return null;
  if ((!xAxis && xRuns.length > 1) || (!yAxis && yRuns.length > 1)) return null;

  const resolvedX = xAxis ?? inferSingleAxis(xRuns, width, workspaceWidth);
  const resolvedY = yAxis ?? inferSingleAxis(yRuns, height, workspaceHeight);
  const columns = resolvedX.count;
  const rows = resolvedY.count;
  const frames = columns * rows;
  if (frames < 2 || frames > MAX_CANVAS_FRAMES) return null;
  const cellWidth = resolvedX.cell;
  const cellHeight = resolvedY.cell;
  if (cellWidth > MAX_CANVAS_DIMENSION || cellHeight > MAX_CANVAS_DIMENSION ||
      frames * cellWidth * cellHeight > MAX_PROJECT_AGGREGATE_PIXELS) return null;
  // A string of disconnected details in one tall image is weak evidence of
  // multiple frames. Reject very elongated inferred cells.
  if (Math.max(cellWidth / cellHeight, cellHeight / cellWidth) > 4) return null;
  return {
    width: cellWidth, height: cellHeight, frames,
    startX: resolvedX.start, startY: resolvedY.start,
    spacingX: resolvedX.spacing, spacingY: resolvedY.spacing,
  };
}
