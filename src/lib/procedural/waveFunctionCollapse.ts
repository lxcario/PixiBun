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

export interface WfcOptions {
  N?: number; // Overlapping neighborhood size (default: 2)
  periodicInput?: boolean; // Wrap sample as a torus (default: true)
  periodicOutput?: boolean; // Wrap output boundaries (default: true)
  symmetries?: 1 | 4 | 8; // 1 = as-is, 4 = 4 rotations, 8 = 4 rotations + reflection (default: 8)
  seed?: number; // Deterministic pseudo-random seed (default: 42)
  maxRetries?: number; // Max restart attempts on contradiction (default: 10)
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
}

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
 * Runs Overlapping WaveFunctionCollapse texture synthesis.
 */
export function synthesizeWfc(input: WfcInput, options: WfcOptions = {}): WfcResult {
  const n = Math.max(2, Math.min(4, options.N ?? 2));
  const periodicInput = options.periodicInput ?? true;
  const periodicOutput = options.periodicOutput ?? true;
  const symmetries = options.symmetries ?? 8;
  const baseSeed = options.seed ?? 42;
  const maxRetries = Math.max(1, options.maxRetries ?? 10);

  const { sampleData, sampleWidth, sampleHeight, outputWidth, outputHeight } = input;

  // Convert sample image data to Uint32Array of packed RGBA
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

  // 1. Extract unique N x N patterns and calculate frequency weights
  const patternWeightsMap = new Map<string, { pattern: Uint32Array; weight: number }>();

  const xLimit = periodicInput ? sampleWidth : sampleWidth - n + 1;
  const yLimit = periodicInput ? sampleHeight : sampleHeight - n + 1;

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
      data: new Uint8ClampedArray(outputWidth * outputHeight * 4),
      width: outputWidth,
      height: outputHeight,
      iterations: 0,
      patternsCount: 0,
    };
  }

  const patterns = uniqueEntries.map((e) => e.pattern);
  const weights = uniqueEntries.map((e) => e.weight);
  const weightLogWeights = weights.map((w) => w * Math.log(w));
  const sumWeights = weights.reduce((acc, w) => acc + w, 0);

  // 2. Precompute compatibility table (propagator)
  // propagator[dir][p] = array of compatible neighbor pattern indices
  const propagator: number[][][] = Array.from({ length: 4 }, () =>
    Array.from({ length: numPatterns }, () => [])
  );

  for (let dir = 0; dir < 4; dir++) {
    for (let p1 = 0; p1 < numPatterns; p1++) {
      for (let p2 = 0; p2 < numPatterns; p2++) {
        if (arePatternsCompatible(patterns[p1], patterns[p2], n, dir)) {
          propagator[dir][p1].push(p2);
        }
      }
    }
  }

  const numCells = outputWidth * outputHeight;

  // 3. Attempt synthesis loop with retries on contradiction
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const prng = createPrng(baseSeed + attempt * 7919);

    // Wave state: wave[cell * numPatterns + p] is true if pattern p is possible
    const wave = new Uint8Array(numCells * numPatterns);
    wave.fill(1);

    // Number of possible patterns remaining at each cell
    const possibleCount = new Int32Array(numCells);
    possibleCount.fill(numPatterns);

    // Entropy tracking per cell
    const cellSumWeights = new Float64Array(numCells);
    cellSumWeights.fill(sumWeights);

    const cellSumWeightLogWeights = new Float64Array(numCells);
    const initialSumWeightLogWeights = weightLogWeights.reduce((acc, v) => acc + v, 0);
    cellSumWeightLogWeights.fill(initialSumWeightLogWeights);

    // Compatibility counters: [cell][pattern][direction] = remaining supporting patterns
    const compatible = new Int32Array(numCells * numPatterns * 4);
    for (let c = 0; c < numCells; c++) {
      for (let p = 0; p < numPatterns; p++) {
        for (let d = 0; d < 4; d++) {
          const oppositeDir = OPPOSITE[d];
          const count = propagator[oppositeDir][p].length;
          compatible[(c * numPatterns + p) * 4 + d] = count;
        }
      }
    }

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

      // 3a. Find cell with minimum Shannon entropy > 0
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

      // 3b. Collapse minCell by choosing a pattern weighted by frequency
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

      // 3c. Propagate constraints (AC-4)
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
          const compatPatterns = propagator[d][removedP];
          for (let i = 0; i < compatPatterns.length; i++) {
            const p2 = compatPatterns[i];
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
      // 4. Successful synthesis! Reconstruct output pixel buffer
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
        data: outData,
        width: outputWidth,
        height: outputHeight,
        iterations,
        patternsCount: numPatterns,
      };
    }
  }

  // If all attempts failed with contradictions
  return {
    success: false,
    data: new Uint8ClampedArray(outputWidth * outputHeight * 4),
    width: outputWidth,
    height: outputHeight,
    iterations: 0,
    patternsCount: numPatterns,
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
