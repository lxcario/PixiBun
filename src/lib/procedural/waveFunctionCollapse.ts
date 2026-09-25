/**
 * WaveFunctionCollapse (WFC) Overlapping Constraint-Satisfaction Texture Synthesis Engine.
 *
 * Academic / Industry References:
 * - Maxim Gumin, "WaveFunctionCollapse," 2016 (constraint-satisfaction procedural texture synthesis).
 * - Paul Merrell, "Example-Based Model Synthesis," I3D 2007 (ACM SIGGRAPH Symposium on
 *   Interactive 3D Graphics and Games). DOI: 10.1145/1230100.1230118.
 *
 * Extracts N x N local overlapping pixel neighborhood patterns, calculates pattern compatibility
 * across orthogonal directions, and collapses a wave of possibilities using minimum Shannon entropy
 * observation and constraint propagation (AC-4 arc consistency with pre-allocated support counters).
 *
 * For successfully converged outputs (status === 'complete'), guarantees zero local neighborhood constraint violations across generated regions.
 */

import { MAX_WFC_WORKING_SET_BYTES } from '@/config/canvasLimits';

export { MAX_WFC_WORKING_SET_BYTES };
export const DEFAULT_WFC_MAX_WORKING_SET_BYTES = MAX_WFC_WORKING_SET_BYTES;

export type WfcStatus =
  | 'complete'
  | 'contradiction'
  | 'resource_limit_exceeded'
  | 'invalid_input';

export interface WfcResourceBreakdown {
  patternStorageBytes: number;
  propagatorBytes: number;
  waveBytes: number;
  compatibilityBytes: number;
  entropyBytes: number;
  outputBytes: number;
  totalWorkingSetBytes: number;
}

export interface WfcResourceEstimateResult {
  admitted: boolean;
  totalWorkingSetBytes: number;
  maxWorkingSetBytes: number;
  breakdown: WfcResourceBreakdown | null;
  error?: string;
}

export interface WfcOptions {
  N?: number; // Overlapping neighborhood size (default: 2)
  periodicInput?: boolean; // Wrap sample as a torus (default: true)
  periodicOutput?: boolean; // Wrap output boundaries (default: true)
  symmetries?: 1 | 4 | 8; // 1 = as-is, 4 = 4 rotations, 8 = 4 rotations + reflection (default: 8)
  seed?: number; // Deterministic pseudo-random seed (default: 42)
  maxRetries?: number; // Max restart attempts on contradiction (default: 10)
  maxWorkingSetBytes?: number; // Configured working-set budget ceiling in bytes (default: 64 MiB)
}

export interface WfcInput {
  sampleData: Uint8ClampedArray | Uint8Array;
  sampleWidth: number;
  sampleHeight: number;
  outputWidth: number;
  outputHeight: number;
}

export interface WfcResult {
  success: boolean;
  data: Uint8ClampedArray;
  width: number;
  height: number;
  iterations: number;
  patternsCount: number;
  status: WfcStatus;
  error?: string;
  resourceUsage?: {
    estimatedWorkingSetBytes: number;
    maxWorkingSetBytes: number;
    breakdown?: WfcResourceBreakdown;
  };
}

/**
 * Multiplies two or more non-negative safe integers, returning null on overflow or invalid input.
 */
export function safeMultiply(...factors: number[]): number | null {
  let result = 1;
  for (const factor of factors) {
    if (!Number.isSafeInteger(factor) || factor < 0) {
      return null;
    }
    if (factor === 0) return 0;
    if (result > Math.floor(Number.MAX_SAFE_INTEGER / factor)) {
      return null;
    }
    result *= factor;
  }
  return Number.isSafeInteger(result) ? result : null;
}

/**
 * Adds two or more non-negative safe integers, returning null on overflow or invalid input.
 */
export function safeAdd(...terms: number[]): number | null {
  let sum = 0;
  for (const term of terms) {
    if (!Number.isSafeInteger(term) || term < 0) {
      return null;
    }
    if (sum > Number.MAX_SAFE_INTEGER - term) {
      return null;
    }
    sum += term;
  }
  return Number.isSafeInteger(sum) ? sum : null;
}

/**
 * Estimates working set memory requirements for WFC constraint satisfaction solver structures.
 *
 * Production data representation: 100% TYPED ARRAYS.
 * - wave: Uint8Array (C * P * 1 byte, exact)
 * - compatible: Int32Array (C * P * D * 4 = 16 * C * P bytes, exact)
 * - entropy: possibleCount (Int32Array, 4*C), cellSumWeights (Float64Array, 8*C), cellSumWeightLogWeights (Float64Array, 8*C) (20 * C bytes, exact)
 * - output: Uint8ClampedArray (C * 4 bytes, exact)
 * - pattern storage: patterns (Uint32Array(n^2)[], P * 4*n^2 bytes), weights (Float64Array, 8*P bytes), weightLogWeights (Float64Array, 8*P bytes) (exact typed buffers)
 * - propagator: WfcPropagatorTable CSR typed representation (offsets: Int32Array, counts: Int32Array, neighbors: Int32Array).
 *   Modeled pre-allocation by its dense capacity upper bound D * P^2 * 4 = 16 * P^2 bytes.
 *
 * Resource model breakdown:
 * - patternStorageBytes: P * (n^2 * 4 bytes + 16 bytes weights) [exact typed array allocations]
 * - propagatorBytes: D * P * P * 4 bytes [dense CSR typed neighbor capacity upper bound]
 * - waveBytes: C * P * 1 byte [exact typed array allocation]
 * - compatibilityBytes: C * P * D * 4 bytes (16 * C * P) [exact typed array allocation]
 * - entropyBytes: C * 20 bytes [exact typed array allocations]
 * - outputBytes: C * 4 bytes [exact typed array allocation]
 *
 * Total modeled working set = 17 * C * P + 24 * C + 16 * P^2 + (4*n^2 + 16) * P bytes.
 */
export function estimateWfcWorkingSet(
  numPatterns: number,
  numCells: number,
  n: number = 2,
  directions: number = 4
): WfcResourceBreakdown | null {
  if (
    !Number.isSafeInteger(numPatterns) ||
    !Number.isSafeInteger(numCells) ||
    !Number.isSafeInteger(n) ||
    !Number.isSafeInteger(directions) ||
    numPatterns < 0 ||
    numCells < 0 ||
    n < 2 ||
    n > 4 ||
    directions !== 4
  ) {
    return null;
  }

  const nArea = safeMultiply(n, n);
  if (nArea === null) return null;

  // patternStorageBytes = P * (n^2 * 4 + 16)
  const bytesPerPattern = safeAdd(safeMultiply(nArea, 4)!, 16);
  if (bytesPerPattern === null) return null;
  const patternStorageBytes = safeMultiply(numPatterns, bytesPerPattern);
  if (patternStorageBytes === null) return null;

  // propagatorBytes = D * P * P * 4 = 16 * P^2
  const pSquared = safeMultiply(numPatterns, numPatterns);
  if (pSquared === null) return null;
  const propagatorBytes = safeMultiply(directions, pSquared, 4);
  if (propagatorBytes === null) return null;

  // waveBytes = C * P
  const waveBytes = safeMultiply(numCells, numPatterns);
  if (waveBytes === null) return null;

  // compatibilityBytes = C * P * D * 4 = 16 * C * P
  const compatibilityBytes = safeMultiply(numCells, numPatterns, directions, 4);
  if (compatibilityBytes === null) return null;

  // entropyBytes = C * (4 + 8 + 8) = 20 * C
  const entropyBytes = safeMultiply(numCells, 20);
  if (entropyBytes === null) return null;

  // outputBytes = C * 4
  const outputBytes = safeMultiply(numCells, 4);
  if (outputBytes === null) return null;

  const totalWorkingSetBytes = safeAdd(
    patternStorageBytes,
    propagatorBytes,
    waveBytes,
    compatibilityBytes,
    entropyBytes,
    outputBytes
  );
  if (totalWorkingSetBytes === null) return null;

  return {
    patternStorageBytes,
    propagatorBytes,
    waveBytes,
    compatibilityBytes,
    entropyBytes,
    outputBytes,
    totalWorkingSetBytes,
  };
}

/**
 * Validates projected WFC solver resource demands against configured working-set budget.
 */
export function validateWfcResourceBudget(params: {
  numPatterns: number;
  numCells: number;
  n?: number;
  directions?: number;
  maxWorkingSetBytes?: number;
}): WfcResourceEstimateResult {
  const { numPatterns, numCells, n = 2, directions = 4 } = params;
  const requestedBudget = params.maxWorkingSetBytes ?? MAX_WFC_WORKING_SET_BYTES;

  if (
    !Number.isSafeInteger(requestedBudget) ||
    requestedBudget <= 0
  ) {
    return {
      admitted: false,
      totalWorkingSetBytes: Infinity,
      maxWorkingSetBytes: MAX_WFC_WORKING_SET_BYTES,
      breakdown: null,
      error: 'WaveFunctionCollapse: invalid working set budget ceiling.',
    };
  }

  // Enforce bounded budget contract: callers can inject a smaller budget for boundary testing,
  // but cannot bypass or raise the safety ceiling above MAX_WFC_WORKING_SET_BYTES.
  const maxWorkingSetBytes = Math.min(requestedBudget, MAX_WFC_WORKING_SET_BYTES);

  const breakdown = estimateWfcWorkingSet(numPatterns, numCells, n, directions);
  if (!breakdown) {
    return {
      admitted: false,
      totalWorkingSetBytes: Infinity,
      maxWorkingSetBytes,
      breakdown: null,
      error: 'WaveFunctionCollapse: arithmetic overflow calculating working set bounds.',
    };
  }

  if (breakdown.totalWorkingSetBytes > maxWorkingSetBytes) {
    const estimatedMib = (breakdown.totalWorkingSetBytes / (1024 * 1024)).toFixed(1);
    const budgetMib = (maxWorkingSetBytes / (1024 * 1024)).toFixed(0);
    return {
      admitted: false,
      totalWorkingSetBytes: breakdown.totalWorkingSetBytes,
      maxWorkingSetBytes,
      breakdown,
      error: `WaveFunctionCollapse: projected working set (${estimatedMib} MiB) exceeds safe resource budget (${budgetMib} MiB). Reduce output dimensions, sample size, or symmetries.`,
    };
  }

  return {
    admitted: true,
    totalWorkingSetBytes: breakdown.totalWorkingSetBytes,
    maxWorkingSetBytes,
    breakdown,
  };
}

export interface WfcPropagatorTable {
  directions: number;
  numPatterns: number;
  offsets: Int32Array;
  counts: Int32Array;
  neighbors: Int32Array;
  totalCompatiblePairs: number;
  exactBytes: number;
}

export interface WfcSolverState {
  wave: Uint8Array;
  possibleCount: Int32Array;
  cellSumWeights: Float64Array;
  cellSumWeightLogWeights: Float64Array;
  compatible: Int32Array;
}

export function allocateWfcSolverState(
  numCells: number,
  numPatterns: number,
  propagator: WfcPropagatorTable,
  sumWeights: number,
  initialSumWeightLogWeights: number
): WfcSolverState {
  const wave = new Uint8Array(numCells * numPatterns);
  wave.fill(1);

  const possibleCount = new Int32Array(numCells);
  possibleCount.fill(numPatterns);

  const cellSumWeights = new Float64Array(numCells);
  cellSumWeights.fill(sumWeights);

  const cellSumWeightLogWeights = new Float64Array(numCells);
  cellSumWeightLogWeights.fill(initialSumWeightLogWeights);

  const compatible = new Int32Array(numCells * numPatterns * 4);
  for (let c = 0; c < numCells; c++) {
    for (let p = 0; p < numPatterns; p++) {
      for (let d = 0; d < 4; d++) {
        const oppositeDir = OPPOSITE[d];
        const count = propagator.counts[oppositeDir * numPatterns + p];
        compatible[(c * numPatterns + p) * 4 + d] = count;
      }
    }
  }

  return { wave, possibleCount, cellSumWeights, cellSumWeightLogWeights, compatible };
}

export const _wfcInternal = {
  allocateSolverState: allocateWfcSolverState,
  buildPropagatorTable: buildWfcPropagatorTable,
};

// 4 Orthogonal Directions: [dx, dy]
// 0: Up (0, -1), 1: Right (1, 0), 2: Down (0, 1), 3: Left (-1, 0)
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const OPPOSITE = [2, 3, 0, 1];

/**
 * Deterministic 32-bit Mulberry32 PRNG.
 */
function createPrng(seed: number) {
  let a = (seed ^ 0x6d2b79f5) >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Packs 4 RGBA bytes into a 32-bit unsigned integer.
 */
function packRgba(r: number, g: number, b: number, a: number): number {
  return ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}

/**
 * Unpacks 32-bit unsigned integer into 4 RGBA bytes.
 */
function unpackRgba(color: number, out: Uint8ClampedArray, offset: number): void {
  out[offset] = (color >>> 24) & 0xff;
  out[offset + 1] = (color >>> 16) & 0xff;
  out[offset + 2] = (color >>> 8) & 0xff;
  out[offset + 3] = color & 0xff;
}

/**
 * Extracts rotated/reflected variants of an N x N pattern.
 */
function getSymmetryVariants(pattern: Uint32Array, n: number, symmetries: 1 | 4 | 8): Uint32Array[] {
  const rotate90 = (p: Uint32Array): Uint32Array => {
    const res = new Uint32Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        res[x * n + (n - 1 - y)] = p[y * n + x];
      }
    }
    return res;
  };

  const reflect = (p: Uint32Array): Uint32Array => {
    const res = new Uint32Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        res[y * n + (n - 1 - x)] = p[y * n + x];
      }
    }
    return res;
  };

  const variants: Uint32Array[] = [];
  let curr = pattern;

  for (let r = 0; r < (symmetries === 1 ? 1 : 4); r++) {
    variants.push(curr);
    if (symmetries === 8) {
      variants.push(reflect(curr));
    }
    if (symmetries > 1) {
      curr = rotate90(curr);
    }
  }

  return variants;
}

/**
 * Serializes an N x N pattern to string key for deduplication.
 */
function patternKey(pattern: Uint32Array): string {
  return pattern.join(',');
}

/**
 * Checks if pattern p1 placed at (0, 0) is compatible with p2 placed at (dx, dy).
 */
function arePatternsCompatible(p1: Uint32Array, p2: Uint32Array, n: number, dir: number): boolean {
  const dx = DX[dir];
  const dy = DY[dir];

  const xMin = Math.max(0, dx);
  const xMax = Math.min(n, n + dx);
  const yMin = Math.max(0, dy);
  const yMax = Math.min(n, n + dy);

  for (let y = yMin; y < yMax; y++) {
    for (let x = xMin; x < xMax; x++) {
      const v1 = p1[y * n + x];
      const v2 = p2[(y - dy) * n + (x - dx)];
      if (v1 !== v2) return false;
    }
  }

  return true;
}

/**
 * Precomputes directional pattern compatibility table using a flat, compact CSR
 * (Compressed Sparse Row) typed representation with exact byte metrics.
 *
 * offsets: Int32Array (directions * numPatterns)
 * counts:  Int32Array (directions * numPatterns)
 * neighbors: Int32Array (totalCompatiblePairs)
 *
 * Dominant bytes are 100% typed arrays: (offsets.byteLength + counts.byteLength + neighbors.byteLength).
 */
export function buildWfcPropagatorTable(
  patterns: Uint32Array[],
  n: number,
  directions: number = 4
): WfcPropagatorTable {
  const numPatterns = patterns.length;
  const slotCount = directions * numPatterns;
  const counts = new Int32Array(slotCount);

  // Pass 1: Count compatible neighbor patterns per (direction, pattern) slot
  let totalPairs = 0;
  for (let dir = 0; dir < directions; dir++) {
    const dirOffset = dir * numPatterns;
    for (let p1 = 0; p1 < numPatterns; p1++) {
      let c = 0;
      for (let p2 = 0; p2 < numPatterns; p2++) {
        if (arePatternsCompatible(patterns[p1], patterns[p2], n, dir)) {
          c++;
        }
      }
      counts[dirOffset + p1] = c;
      totalPairs += c;
    }
  }

  // Compute prefix-sum offsets
  const offsets = new Int32Array(slotCount);
  let currentOffset = 0;
  for (let i = 0; i < slotCount; i++) {
    offsets[i] = currentOffset;
    currentOffset += counts[i];
  }

  // Pass 2: Populate contiguous neighbors typed array
  const neighbors = new Int32Array(totalPairs);
  const writePos = new Int32Array(offsets);

  for (let dir = 0; dir < directions; dir++) {
    const dirOffset = dir * numPatterns;
    for (let p1 = 0; p1 < numPatterns; p1++) {
      const slot = dirOffset + p1;
      for (let p2 = 0; p2 < numPatterns; p2++) {
        if (arePatternsCompatible(patterns[p1], patterns[p2], n, dir)) {
          neighbors[writePos[slot]++] = p2;
        }
      }
    }
  }

  const exactBytes = slotCount * 4 + slotCount * 4 + totalPairs * 4;

  return {
    directions,
    numPatterns,
    offsets,
    counts,
    neighbors,
    totalCompatiblePairs: totalPairs,
    exactBytes,
  };
}

/**
 * Runs Overlapping WaveFunctionCollapse texture synthesis.
 */
export function synthesizeWfc(input: WfcInput, options: WfcOptions = {}): WfcResult {
  const requestedBudget = options.maxWorkingSetBytes ?? MAX_WFC_WORKING_SET_BYTES;
  const maxWorkingSetBytes =
    Number.isSafeInteger(requestedBudget) && requestedBudget > 0
      ? Math.min(requestedBudget, MAX_WFC_WORKING_SET_BYTES)
      : MAX_WFC_WORKING_SET_BYTES;
  const n = Math.max(2, Math.min(4, options.N ?? 2));
  const periodicInput = options.periodicInput ?? true;
  const periodicOutput = options.periodicOutput ?? true;
  const symmetries = options.symmetries ?? 8;
  const baseSeed = options.seed ?? 42;
  const maxRetries = Math.max(1, options.maxRetries ?? 10);

  const { sampleData, sampleWidth, sampleHeight, outputWidth, outputHeight } = input;

  // 0. Input validation
  if (
    !Number.isSafeInteger(sampleWidth) ||
    !Number.isSafeInteger(sampleHeight) ||
    !Number.isSafeInteger(outputWidth) ||
    !Number.isSafeInteger(outputHeight) ||
    sampleWidth <= 0 ||
    sampleHeight <= 0 ||
    outputWidth <= 0 ||
    outputHeight <= 0 ||
    !sampleData ||
    !(sampleData instanceof Uint8Array || sampleData instanceof Uint8ClampedArray)
  ) {
    return {
      success: false,
      status: 'invalid_input',
      error: 'WaveFunctionCollapse: invalid input dimensions or parameters.',
      data: new Uint8ClampedArray(0),
      width: outputWidth ?? 0,
      height: outputHeight ?? 0,
      iterations: 0,
      patternsCount: 0,
    };
  }

  const numCells = safeMultiply(outputWidth, outputHeight);
  const samplePixelsCount = safeMultiply(sampleWidth, sampleHeight);
  if (numCells === null || samplePixelsCount === null) {
    return {
      success: false,
      status: 'invalid_input',
      error: 'WaveFunctionCollapse: canvas pixel count overflows safe integer range.',
      data: new Uint8ClampedArray(0),
      width: outputWidth,
      height: outputHeight,
      iterations: 0,
      patternsCount: 0,
    };
  }

  const expectedSampleBytes = safeMultiply(samplePixelsCount, 4);
  if (expectedSampleBytes === null || sampleData.length < expectedSampleBytes) {
    return {
      success: false,
      status: 'invalid_input',
      error: 'WaveFunctionCollapse: sample data buffer length is insufficient for specified dimensions.',
      data: new Uint8ClampedArray(0),
      width: outputWidth,
      height: outputHeight,
      iterations: 0,
      patternsCount: 0,
    };
  }

  const xLimit = periodicInput ? sampleWidth : sampleWidth - n + 1;
  const yLimit = periodicInput ? sampleHeight : sampleHeight - n + 1;

  if (xLimit <= 0 || yLimit <= 0) {
    return {
      success: false,
      status: 'invalid_input',
      error: 'WaveFunctionCollapse: sample dimensions are too small for pattern size N.',
      data: new Uint8ClampedArray(0),
      width: outputWidth,
      height: outputHeight,
      iterations: 0,
      patternsCount: 0,
    };
  }

  // Pre-extraction lower-bound & structural policy gate:
  // Rejects source configurations whose deterministic cumulative raw candidate-payload
  // allowance (S * K * 4n^2 bytes), sample pixel storage, or minimal output solver demand
  // already exceeds PixiBun's configured WFC subsystem admission-policy ceiling
  // (MAX_WFC_WORKING_SET_BYTES) before running candidate extraction and deduplication.
  //
  // Structural work terms:
  // - S = source candidate positions (xLimit * yLimit)
  //   where xLimit = periodicInput ? sampleWidth : sampleWidth - n + 1
  //         yLimit = periodicInput ? sampleHeight : sampleHeight - n + 1
  // - K = symmetry variants (1, 4, or 8)
  // - A = pattern pixel area (n^2)
  // - candidateTransforms = S * K
  // - candidatePixelWork = S * K * A
  // - cumulativeCandidateBytes = S * K * (4 * A) (deterministic cumulative raw candidate-payload allowance, not peak heap)
  // - samplePixelsBytes = samplePixelsCount * 4 (known exact raw pixel input bytes)
  // - minSolverBytes = 41 * numCells + 4*n^2 + 32 (minimal solver structures with P=1)
  const sourcePositions = safeMultiply(xLimit, yLimit);
  const patternPixelArea = safeMultiply(n, n);
  const patternFootprint = patternPixelArea !== null ? safeMultiply(patternPixelArea, 4) : null;
  const candidateTransforms =
    sourcePositions !== null ? safeMultiply(sourcePositions, symmetries) : null;
  const cumulativeCandidateBytes =
    candidateTransforms !== null && patternFootprint !== null
      ? safeMultiply(candidateTransforms, patternFootprint)
      : null;
  const samplePixelsBytes = safeMultiply(samplePixelsCount, 4);
  const minSolverBytes = safeAdd(
    safeMultiply(numCells, 41) ?? Number.MAX_SAFE_INTEGER,
    safeAdd(patternFootprint ?? 16, 32) ?? 48
  );

  const coexistingCoreBytes =
    samplePixelsBytes !== null && minSolverBytes !== null
      ? safeAdd(samplePixelsBytes, minSolverBytes)
      : null;

  const earlyLowerBoundBytes =
    cumulativeCandidateBytes === null || coexistingCoreBytes === null
      ? null
      : Math.max(coexistingCoreBytes, cumulativeCandidateBytes);

  if (earlyLowerBoundBytes === null || earlyLowerBoundBytes > maxWorkingSetBytes) {
    const estMib = ((earlyLowerBoundBytes ?? Number.MAX_SAFE_INTEGER) / (1024 * 1024)).toFixed(1);
    const budgetMib = (maxWorkingSetBytes / (1024 * 1024)).toFixed(0);
    return {
      success: false,
      status: 'resource_limit_exceeded',
      error: `WaveFunctionCollapse: pre-extraction structural demand (${estMib} MiB) exceeds safe resource budget (${budgetMib} MiB). Reduce output dimensions, sample size, or symmetries.`,
      data: new Uint8ClampedArray(0),
      width: outputWidth,
      height: outputHeight,
      iterations: 0,
      patternsCount: 0,
      resourceUsage: {
        estimatedWorkingSetBytes: earlyLowerBoundBytes ?? Number.MAX_SAFE_INTEGER,
        maxWorkingSetBytes,
      },
    };
  }

  // Convert sample image data to Uint32Array of packed RGBA
  const samplePixels = new Uint32Array(samplePixelsCount);
  for (let i = 0; i < samplePixelsCount; i++) {
    const idx = i * 4;
    samplePixels[i] = packRgba(
      sampleData[idx],
      sampleData[idx + 1],
      sampleData[idx + 2],
      sampleData[idx + 3]
    );
  }

  // 1. Extract unique N x N patterns and calculate frequency weights
  const patternWeightsMap = new Map<string, { pattern: Uint32Array; weight: number }>();

  for (let y = 0; y < yLimit; y++) {
    for (let x = 0; x < xLimit; x++) {
      const basePattern = new Uint32Array(n * n);
      for (let dy = 0; dy < n; dy++) {
        for (let dx = 0; dx < n; dx++) {
          const sx = (x + dx) % sampleWidth;
          const sy = (y + dy) % sampleHeight;
          basePattern[dy * n + dx] = samplePixels[sy * sampleWidth + sx];
        }
      }

      const variants = getSymmetryVariants(basePattern, n, symmetries);
      for (const variant of variants) {
        const key = patternKey(variant);
        const existing = patternWeightsMap.get(key);
        if (existing) {
          existing.weight += 1;
        } else {
          // Incremental unique-pattern admission:
          // Check if admitting another unique pattern (nextP) would exceed the configured resource envelope
          // for the actual output cells C, pattern size n, and effective budget.
          const nextP = patternWeightsMap.size + 1;
          const incrementalCheck = validateWfcResourceBudget({
            numPatterns: nextP,
            numCells,
            n,
            directions: 4,
            maxWorkingSetBytes,
          });
          if (!incrementalCheck.admitted) {
            return {
              success: false,
              status: 'resource_limit_exceeded',
              error:
                incrementalCheck.error ??
                'WaveFunctionCollapse: resource limit exceeded during pattern extraction.',
              data: new Uint8ClampedArray(0),
              width: outputWidth,
              height: outputHeight,
              iterations: 0,
              patternsCount: patternWeightsMap.size,
              resourceUsage: {
                estimatedWorkingSetBytes: incrementalCheck.totalWorkingSetBytes,
                maxWorkingSetBytes,
                breakdown: incrementalCheck.breakdown ?? undefined,
              },
            };
          }
          patternWeightsMap.set(key, { pattern: variant, weight: 1 });
        }
      }
    }
  }

  const uniqueEntries = Array.from(patternWeightsMap.values());
  const numPatterns = uniqueEntries.length;
  if (numPatterns === 0) {
    return {
      success: false,
      status: 'invalid_input',
      error: 'WaveFunctionCollapse: no patterns extracted from sample.',
      data: new Uint8ClampedArray(0),
      width: outputWidth,
      height: outputHeight,
      iterations: 0,
      patternsCount: 0,
    };
  }

  // 2. Resource Admission Gate: Validate exact working-set demands before building propagator or allocating solver state
  const admission = validateWfcResourceBudget({
    numPatterns,
    numCells,
    n,
    directions: 4,
    maxWorkingSetBytes,
  });

  if (!admission.admitted) {
    return {
      success: false,
      status: 'resource_limit_exceeded',
      error: admission.error ?? 'WaveFunctionCollapse: resource limit exceeded.',
      data: new Uint8ClampedArray(0),
      width: outputWidth,
      height: outputHeight,
      iterations: 0,
      patternsCount: numPatterns,
      resourceUsage: {
        estimatedWorkingSetBytes: admission.totalWorkingSetBytes,
        maxWorkingSetBytes,
        breakdown: admission.breakdown ?? undefined,
      },
    };
  }

  const patterns = uniqueEntries.map((e) => e.pattern);
  const weights = new Float64Array(numPatterns);
  const weightLogWeights = new Float64Array(numPatterns);
  let sumWeights = 0;
  let initialSumWeightLogWeights = 0;
  for (let i = 0; i < numPatterns; i++) {
    const w = uniqueEntries[i].weight;
    const wlw = w * Math.log(w);
    weights[i] = w;
    weightLogWeights[i] = wlw;
    sumWeights += w;
    initialSumWeightLogWeights += wlw;
  }

  // 3. Precompute typed compatibility table (propagator)
  const propagator = _wfcInternal.buildPropagatorTable(patterns, n, 4);

  // 4. Attempt synthesis loop with retries on contradiction
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const prng = createPrng(baseSeed + attempt * 7919);

    // Allocate solver state using decoupled allocator hook (verifiable in tests)
    const { wave, possibleCount, cellSumWeights, cellSumWeightLogWeights, compatible } =
      _wfcInternal.allocateSolverState(
        numCells,
        numPatterns,
        propagator,
        sumWeights,
        initialSumWeightLogWeights
      );

    // Stack for constraint propagation: pairs of [cell, pattern]
    const stack: [number, number][] = [];

    const ban = (c: number, p: number): boolean => {
      const idx = c * numPatterns + p;
      if (wave[idx] === 0) return true; // Already banned

      wave[idx] = 0;
      possibleCount[c] -= 1;

      if (possibleCount[c] === 0) {
        return false; // Contradiction
      }

      const w = weights[p];
      cellSumWeights[c] -= w;
      cellSumWeightLogWeights[c] -= weightLogWeights[p];

      stack.push([c, p]);
      return true;
    };

    let totalCollapsed = 0;
    let contradiction = false;
    let iterations = 0;

    while (totalCollapsed < numCells) {
      iterations++;

      // 4a. Find cell with minimum Shannon entropy > 0
      let minEntropy = Infinity;
      let minCell = -1;

      for (let c = 0; c < numCells; c++) {
        const count = possibleCount[c];
        if (count <= 1) continue;

        const sW = cellSumWeights[c];
        const sWlogW = cellSumWeightLogWeights[c];
        // Shannon entropy: log(sum) - (sum(w log w) / sum)
        const entropy = Math.log(sW) - sWlogW / sW;
        // Add tiny deterministic noise to break ties uniformly
        const noise = prng() * 1e-6;
        const totalEntropy = entropy + noise;

        if (totalEntropy < minEntropy) {
          minEntropy = totalEntropy;
          minCell = c;
        }
      }

      if (minCell === -1) {
        // All cells collapsed
        break;
      }

      // 4b. Collapse minCell by choosing a pattern weighted by frequency
      const cellOffset = minCell * numPatterns;
      let totalRemainingWeight = 0;
      for (let p = 0; p < numPatterns; p++) {
        if (wave[cellOffset + p] === 1) {
          totalRemainingWeight += weights[p];
        }
      }

      let r = prng() * totalRemainingWeight;
      let chosenPattern = -1;
      for (let p = 0; p < numPatterns; p++) {
        if (wave[cellOffset + p] === 1) {
          r -= weights[p];
          if (r <= 0) {
            chosenPattern = p;
            break;
          }
        }
      }
      if (chosenPattern === -1) {
        chosenPattern = 0;
      }

      // Ban all patterns at minCell except chosenPattern
      for (let p = 0; p < numPatterns; p++) {
        if (p !== chosenPattern && wave[cellOffset + p] === 1) {
          if (!ban(minCell, p)) {
            contradiction = true;
            break;
          }
        }
      }

      if (contradiction) break;

      // 4c. Propagate constraints (AC-4)
      while (stack.length > 0) {
        const [currCell, removedP] = stack.pop()!;
        const cx = currCell % outputWidth;
        const cy = Math.floor(currCell / outputWidth);

        for (let d = 0; d < 4; d++) {
          const nx = cx + DX[d];
          const ny = cy + DY[d];

          if (!periodicOutput && (nx < 0 || nx >= outputWidth || ny < 0 || ny >= outputHeight)) {
            continue;
          }

          const wrappedX = (nx + outputWidth) % outputWidth;
          const wrappedY = (ny + outputHeight) % outputHeight;
          const neighborCell = wrappedY * outputWidth + wrappedX;

          // For every pattern p2 compatible with removedP in direction d:
          // Decrement compatible[neighborCell][p2][d]
          const slot = d * numPatterns + removedP;
          const startIdx = propagator.offsets[slot];
          const count = propagator.counts[slot];
          const endIdx = startIdx + count;

          for (let i = startIdx; i < endIdx; i++) {
            const p2 = propagator.neighbors[i];
            const compIdx = (neighborCell * numPatterns + p2) * 4 + d;
            compatible[compIdx] -= 1;

            if (compatible[compIdx] === 0) {
              // No pattern in currCell supports p2 anymore; ban p2 from neighborCell
              if (!ban(neighborCell, p2)) {
                contradiction = true;
                break;
              }
            }
          }

          if (contradiction) break;
        }

        if (contradiction) break;
      }

      if (contradiction) break;

      totalCollapsed++;
    }

    if (!contradiction) {
      // 5. Successful synthesis! Reconstruct output pixel buffer
      const outData = new Uint8ClampedArray(outputWidth * outputHeight * 4);

      for (let cy = 0; cy < outputHeight; cy++) {
        for (let cx = 0; cx < outputWidth; cx++) {
          const cell = cy * outputWidth + cx;
          const cellOffset = cell * numPatterns;

          let patternIdx = 0;
          for (let p = 0; p < numPatterns; p++) {
            if (wave[cellOffset + p] === 1) {
              patternIdx = p;
              break;
            }
          }

          const pattern = patterns[patternIdx];
          // Each pattern's (0, 0) top-left pixel is placed at (cx, cy)
          const color = pattern[0];
          const outIdx = (cy * outputWidth + cx) * 4;
          unpackRgba(color, outData, outIdx);
        }
      }

      return {
        success: true,
        status: 'complete',
        data: outData,
        width: outputWidth,
        height: outputHeight,
        iterations,
        patternsCount: numPatterns,
        resourceUsage: {
          estimatedWorkingSetBytes: admission.totalWorkingSetBytes,
          maxWorkingSetBytes,
          breakdown: admission.breakdown ?? undefined,
        },
      };
    }
  }

  // If all attempts failed with contradictions
  return {
    success: false,
    status: 'contradiction',
    error: 'WaveFunctionCollapse: synthesis encountered contradictions after retries. Try a different sample region or N=2.',
    data: new Uint8ClampedArray(0),
    width: outputWidth,
    height: outputHeight,
    iterations: 0,
    patternsCount: numPatterns,
    resourceUsage: {
      estimatedWorkingSetBytes: admission.totalWorkingSetBytes,
      maxWorkingSetBytes,
      breakdown: admission.breakdown ?? undefined,
    },
  };
}

/**
 * Pure verification utility:
 * Checks whether every N x N local neighborhood in the generated output image
 * exists within the allowed dictionary of patterns extracted from the sample.
 *
 * Returns 0 if zero violations (100% mathematically valid), or the number of invalid N x N patches.
 */
export function verifyWfcAdjacencyConstraints(
  outputData: Uint8ClampedArray,
  outputWidth: number,
  outputHeight: number,
  sampleData: Uint8ClampedArray | Uint8Array,
  sampleWidth: number,
  sampleHeight: number,
  n: number = 2,
  periodicOutput: boolean = true,
  symmetries: 1 | 4 | 8 = 8
): { violations: number; totalChecked: number } {
  // 1. Build valid pattern set from sample
  const samplePixels = new Uint32Array(sampleWidth * sampleHeight);
  for (let i = 0; i < sampleWidth * sampleHeight; i++) {
    const idx = i * 4;
    samplePixels[i] = packRgba(
      sampleData[idx],
      sampleData[idx + 1],
      sampleData[idx + 2],
      sampleData[idx + 3]
    );
  }

  const validPatterns = new Set<string>();
  for (let y = 0; y < sampleHeight; y++) {
    for (let x = 0; x < sampleWidth; x++) {
      const basePattern = new Uint32Array(n * n);
      for (let dy = 0; dy < n; dy++) {
        for (let dx = 0; dx < n; dx++) {
          const sx = (x + dx) % sampleWidth;
          const sy = (y + dy) % sampleHeight;
          basePattern[dy * n + dx] = samplePixels[sy * sampleWidth + sx];
        }
      }

      const variants = getSymmetryVariants(basePattern, n, symmetries);
      for (const variant of variants) {
        validPatterns.add(patternKey(variant));
      }
    }
  }

  // 2. Check every N x N patch in output
  const outputPixels = new Uint32Array(outputWidth * outputHeight);
  for (let i = 0; i < outputWidth * outputHeight; i++) {
    const idx = i * 4;
    outputPixels[i] = packRgba(
      outputData[idx],
      outputData[idx + 1],
      outputData[idx + 2],
      outputData[idx + 3]
    );
  }

  const xLimit = periodicOutput ? outputWidth : outputWidth - n + 1;
  const yLimit = periodicOutput ? outputHeight : outputHeight - n + 1;

  let violations = 0;
  let totalChecked = 0;

  for (let y = 0; y < yLimit; y++) {
    for (let x = 0; x < xLimit; x++) {
      const patch = new Uint32Array(n * n);
      for (let dy = 0; dy < n; dy++) {
        for (let dx = 0; dx < n; dx++) {
          const ox = (x + dx) % outputWidth;
          const oy = (y + dy) % outputHeight;
          patch[dy * n + dx] = outputPixels[oy * outputWidth + ox];
        }
      }

      totalChecked++;
      const key = patternKey(patch);
      if (!validPatterns.has(key)) {
        violations++;
      }
    }
  }

  return { violations, totalChecked };
}
