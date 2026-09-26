import { describe, it, expect, vi } from 'vitest';
import {
  synthesizeWfc,
  estimateWfcWorkingSet,
  validateWfcResourceBudget,
  safeMultiply,
  safeAdd,
  _wfcInternal,
  MAX_WFC_WORKING_SET_BYTES,
  DEFAULT_WFC_MAX_WORKING_SET_BYTES,
  verifyWfcAdjacencyConstraints,
} from '@/lib/procedural/waveFunctionCollapse';

function createUniformSample(width: number, height: number, rgba: [number, number, number, number] = [100, 150, 200, 255]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    data[idx] = rgba[0];
    data[idx + 1] = rgba[1];
    data[idx + 2] = rgba[2];
    data[idx + 3] = rgba[3];
  }
  return data;
}

function createCheckerboardSample(width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  const c1 = [240, 190, 124, 255];
  const c2 = [20, 12, 30, 255];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isEven = (x + y) % 2 === 0;
      const c = isEven ? c1 : c2;
      const idx = (y * width + x) * 4;
      data[idx] = c[0];
      data[idx + 1] = c[1];
      data[idx + 2] = c[2];
      data[idx + 3] = c[3];
    }
  }
  return data;
}

function createBrickSample(width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  const brick = [180, 80, 50, 255];
  const mortar = [100, 100, 120, 255];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (y % 4 === 0) {
        data[idx] = mortar[0];
        data[idx + 1] = mortar[1];
        data[idx + 2] = mortar[2];
        data[idx + 3] = mortar[3];
      } else {
        const row = Math.floor(y / 4);
        const stagger = (row % 2) * 4;
        if ((x + stagger) % 8 === 0) {
          data[idx] = mortar[0];
          data[idx + 1] = mortar[1];
          data[idx + 2] = mortar[2];
          data[idx + 3] = mortar[3];
        } else {
          data[idx] = brick[0];
          data[idx + 1] = brick[1];
          data[idx + 2] = brick[2];
          data[idx + 3] = brick[3];
        }
      }
    }
  }
  return data;
}

/**
 * Creates a deterministic high-entropy sample where every single pixel has a distinct colour,
 * maximizing extracted pattern uniqueness under rotations and reflections.
 */
function createHighEntropySample(width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const id = y * width + x + 1;
      data[idx] = id & 0xff;
      data[idx + 1] = (id >> 8) & 0xff;
      data[idx + 2] = (id >> 16) & 0xff;
      data[idx + 3] = 255;
    }
  }
  return data;
}

describe('Phase 73 / High Finding H5: WFC Resource Growth Hardening', () => {
  describe('1. Pure Resource Estimator Verification (Section 14)', () => {
    it('computes exact structural layout for tiny P/C values', () => {
      const P = 2;
      const C = 4;
      const n = 2;
      const D = 4;
      const res = estimateWfcWorkingSet(P, C, n, D);
      expect(res).not.toBeNull();
      if (!res) return;

      // Pattern storage: P * (n^2 * 4 + 16) = 2 * (16 + 16) = 64
      expect(res.patternStorageBytes).toBe(64);
      // Propagator: 64 dense-neighbor bytes + 96 slot-array bytes
      expect(res.propagatorBytes).toBe(160);
      // Wave: C * P * 1 = 4 * 2 * 1 = 8
      expect(res.waveBytes).toBe(8);
      // Compatibility: C * P * D * 4 = 4 * 2 * 4 * 4 = 128
      expect(res.compatibilityBytes).toBe(128);
      // Entropy: C * 20 = 4 * 20 = 80
      expect(res.entropyBytes).toBe(80);
      // Output: C * 4 = 4 * 4 = 16
      expect(res.outputBytes).toBe(16);
      // Bounded typed propagation stack: C * P * 8 = 64
      expect(res.propagationStackBytes).toBe(64);

      const expectedTotal = 64 + 160 + 8 + 128 + 80 + 64 + 16;
      expect(res.totalWorkingSetBytes).toBe(expectedTotal);
    });

    it('evaluates large P with small C correctly', () => {
      const P = 2000;
      const C = 16; // 4x4 output
      const res = estimateWfcWorkingSet(P, C, 2, 4);
      expect(res).not.toBeNull();
      if (!res) return;

      // waveBytes = 16 * 2000 = 32,000
      expect(res.waveBytes).toBe(32_000);
      // compatibilityBytes = 16 * 2000 * 16 = 512,000
      expect(res.compatibilityBytes).toBe(512_000);
      // Dense neighbor capacity plus offsets, counts, and write positions.
      expect(res.propagatorBytes).toBe(64_096_000);
      expect(res.totalWorkingSetBytes).toBeGreaterThan(64_000_000);
    });

    it('evaluates small P with large C correctly', () => {
      const P = 4;
      const C = 65536; // 256x256 output
      const res = estimateWfcWorkingSet(P, C, 2, 4);
      expect(res).not.toBeNull();
      if (!res) return;

      // waveBytes = 65536 * 4 = 262,144
      expect(res.waveBytes).toBe(262_144);
      // compatibilityBytes = 65536 * 4 * 16 = 4,194,304
      expect(res.compatibilityBytes).toBe(4_194_304);
      // entropyBytes = 65536 * 20 = 1,310,720
      expect(res.entropyBytes).toBe(1_310_720);
      // outputBytes = 65536 * 4 = 262,144
      expect(res.outputBytes).toBe(262_144);
      // 256 dense-neighbor bytes plus 192 slot-array bytes.
      expect(res.propagatorBytes).toBe(448);
    });

    it('evaluates large P with large C (H5 unbounded scenario)', () => {
      const P = 32768; // 64x64 unique sample * 8 symmetries
      const C = 4096; // 64x64 output
      const res = estimateWfcWorkingSet(P, C, 2, 4);
      expect(res).not.toBeNull();
      if (!res) return;

      // compatibility alone = 4096 * 32768 * 16 = 2,147,483,648 bytes (2 GiB)
      expect(res.compatibilityBytes).toBe(2_147_483_648);
      // wave = 4096 * 32768 = 134,217,728 bytes (128 MiB)
      expect(res.waveBytes).toBe(134_217_728);
      // Dense 16 GiB neighbor bound plus slot arrays.
      expect(res.propagatorBytes).toBe(17_181_442_048);
      // Total exceeds 18 GiB, including the typed propagation stack.
      expect(res.totalWorkingSetBytes).toBeGreaterThan(18 * 1024 * 1024 * 1024);
      expect(res.totalWorkingSetBytes).toBe(20_538_032_128);
    });

    it('returns null on invalid or out-of-range inputs', () => {
      expect(estimateWfcWorkingSet(-1, 16)).toBeNull();
      expect(estimateWfcWorkingSet(16, -1)).toBeNull();
      expect(estimateWfcWorkingSet(NaN, 16)).toBeNull();
      expect(estimateWfcWorkingSet(16, Infinity)).toBeNull();
      expect(estimateWfcWorkingSet(1.5, 16)).toBeNull();
      expect(estimateWfcWorkingSet(16, 16, 5)).toBeNull(); // N > 4
      expect(estimateWfcWorkingSet(16, 16, 1)).toBeNull(); // N < 2
      expect(estimateWfcWorkingSet(16, 16, 2, 8)).toBeNull(); // directions !== 4
    });

    it('handles arithmetic overflow safely without producing NaN or Infinity', () => {
      const hugeP = 1_000_000_000;
      const hugeC = 1_000_000_000;
      expect(estimateWfcWorkingSet(hugeP, hugeC)).toBeNull();
    });
  });

  describe('2. Safe Arithmetic Helper Verification (Section 7)', () => {
    it('safeMultiply handles standard, zero, and boundary safe integers', () => {
      expect(safeMultiply(2, 3, 4)).toBe(24);
      expect(safeMultiply(0, 1000)).toBe(0);
      expect(safeMultiply(Number.MAX_SAFE_INTEGER, 1)).toBe(Number.MAX_SAFE_INTEGER);
      expect(safeMultiply(Number.MAX_SAFE_INTEGER, 2)).toBeNull();
      expect(safeMultiply(-2, 3)).toBeNull();
      expect(safeMultiply(2.5, 4)).toBeNull();
      expect(safeMultiply(NaN, 5)).toBeNull();
      expect(safeMultiply(5, Infinity)).toBeNull();
    });

    it('safeAdd handles standard, zero, and boundary safe integers', () => {
      expect(safeAdd(10, 20, 30)).toBe(60);
      expect(safeAdd(0, 0)).toBe(0);
      expect(safeAdd(Number.MAX_SAFE_INTEGER - 5, 5)).toBe(Number.MAX_SAFE_INTEGER);
      expect(safeAdd(Number.MAX_SAFE_INTEGER, 1)).toBeNull();
      expect(safeAdd(-1, 10)).toBeNull();
      expect(safeAdd(3.14, 2)).toBeNull();
    });
  });

  describe('3. Budget Boundary & Resource Admission Testing (Section 18)', () => {
    it('admits configurations within configured budget and rejects 1 byte over', () => {
      const P = 10;
      const C = 16;
      const estimate = estimateWfcWorkingSet(P, C, 2, 4);
      expect(estimate).not.toBeNull();
      const exactTotal = estimate!.totalWorkingSetBytes;

      // Exactly at budget
      const passResult = validateWfcResourceBudget({
        numPatterns: P,
        numCells: C,
        maxWorkingSetBytes: exactTotal,
      });
      expect(passResult.admitted).toBe(true);
      expect(passResult.totalWorkingSetBytes).toBe(exactTotal);

      // Exactly 1 byte under budget
      const passUnderResult = validateWfcResourceBudget({
        numPatterns: P,
        numCells: C,
        maxWorkingSetBytes: exactTotal + 1,
      });
      expect(passUnderResult.admitted).toBe(true);

      // Exactly 1 byte over budget
      const failResult = validateWfcResourceBudget({
        numPatterns: P,
        numCells: C,
        maxWorkingSetBytes: exactTotal - 1,
      });
      expect(failResult.admitted).toBe(false);
      expect(failResult.error).toContain('exceeds safe resource budget');
    });

    it('uses DEFAULT_WFC_MAX_WORKING_SET_BYTES (64 MiB) by default', () => {
      expect(MAX_WFC_WORKING_SET_BYTES).toBe(64 * 1024 * 1024);
      expect(DEFAULT_WFC_MAX_WORKING_SET_BYTES).toBe(64 * 1024 * 1024);

      const validResult = validateWfcResourceBudget({
        numPatterns: 50,
        numCells: 256,
      });
      expect(validResult.admitted).toBe(true);
      expect(validResult.maxWorkingSetBytes).toBe(64 * 1024 * 1024);
    });

    it('enforces bounded budget contract: cannot raise safety ceiling above MAX_WFC_WORKING_SET_BYTES', () => {
      // If a caller attempts to inject an enormous budget (e.g. 100 GiB),
      // validateWfcResourceBudget clamps it to canonical MAX_WFC_WORKING_SET_BYTES (64 MiB)
      const oversizedBudget = 100 * 1024 * 1024 * 1024;
      const res = validateWfcResourceBudget({
        numPatterns: 32768,
        numCells: 4096,
        maxWorkingSetBytes: oversizedBudget,
      });
      expect(res.admitted).toBe(false);
      expect(res.maxWorkingSetBytes).toBe(MAX_WFC_WORKING_SET_BYTES);
    });

    it('charges retained input and packed sample bytes alongside solver allocations', () => {
      const solverBytes = estimateWfcWorkingSet(1, 1000)!.totalWorkingSetBytes;
      const retainedSampleBytes = 2000;
      const admitted = validateWfcResourceBudget({
        numPatterns: 1,
        numCells: 1000,
        retainedSampleBytes,
        maxWorkingSetBytes: solverBytes + retainedSampleBytes,
      });
      expect(admitted.admitted).toBe(true);
      expect(admitted.totalWorkingSetBytes).toBe(solverBytes + retainedSampleBytes);

      const rejected = validateWfcResourceBudget({
        numPatterns: 1,
        numCells: 1000,
        retainedSampleBytes,
        maxWorkingSetBytes: solverBytes + retainedSampleBytes - 1,
      });
      expect(rejected.admitted).toBe(false);
    });
  });

  describe('4. Pre-Allocation Rejection Proof (Section 14 & 15)', () => {
    it('rejects oversized configuration BEFORE calling buildPropagatorTable or allocateSolverState', () => {
      const allocateSpy = vi.spyOn(_wfcInternal, 'allocateSolverState');
      const propagatorSpy = vi.spyOn(_wfcInternal, 'buildPropagatorTable');

      const sampleW = 64;
      const sampleH = 64;
      const sampleData = createHighEntropySample(sampleW, sampleH);

      const result = synthesizeWfc(
        {
          sampleData,
          sampleWidth: sampleW,
          sampleHeight: sampleH,
          outputWidth: 64,
          outputHeight: 64,
        },
        {
          N: 2,
          symmetries: 8,
          // Constrain budget to standard 64 MiB (the 64x64 high entropy case demands > 19 GiB)
          maxWorkingSetBytes: MAX_WFC_WORKING_SET_BYTES,
        }
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe('resource_limit_exceeded');
      expect(result.error).toContain('exceeds safe resource budget');
      expect(result.data.length).toBe(0);

      // Neither propagator table nor solver state was constructed!
      expect(propagatorSpy).toHaveBeenCalledTimes(0);
      expect(allocateSpy).toHaveBeenCalledTimes(0);

      propagatorSpy.mockRestore();
      allocateSpy.mockRestore();
    });

    it('rejects during pre-extraction lower-bound check when output grid alone exceeds budget', () => {
      const allocateSpy = vi.spyOn(_wfcInternal, 'allocateSolverState');
      const propagatorSpy = vi.spyOn(_wfcInternal, 'buildPropagatorTable');

      // 2048x2048 canvas output cells: C = 4,194,304.
      // Minimum solver memory even at P=1 is 49 * 4,194,304 = 196 MiB > 64 MiB.
      const sampleW = 2;
      const sampleH = 2;
      const sampleData = createUniformSample(sampleW, sampleH);

      const result = synthesizeWfc(
        {
          sampleData,
          sampleWidth: sampleW,
          sampleHeight: sampleH,
          outputWidth: 2048,
          outputHeight: 2048,
        },
        {
          N: 2,
          maxWorkingSetBytes: MAX_WFC_WORKING_SET_BYTES,
        }
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe('resource_limit_exceeded');
      expect(result.error).toContain('exceeds safe resource budget');
      expect(result.data.length).toBe(0);
      expect(propagatorSpy).toHaveBeenCalledTimes(0);
      expect(allocateSpy).toHaveBeenCalledTimes(0);

      propagatorSpy.mockRestore();
      allocateSpy.mockRestore();
    });

    it('rejects during pre-extraction lower-bound check when source candidate footprint exceeds budget', () => {
      const allocateSpy = vi.spyOn(_wfcInternal, 'allocateSolverState');
      const propagatorSpy = vi.spyOn(_wfcInternal, 'buildPropagatorTable');

      // 1024x1024 sample with 8 symmetries: candidate extraction alone demands 1,048,576 * 8 * 16 = 128 MiB > 64 MiB.
      // Must be rejected BEFORE allocating sample pixels or extracting candidate patterns.
      const sampleW = 1024;
      const sampleH = 1024;
      const sampleData = new Uint8ClampedArray(sampleW * sampleH * 4);

      const result = synthesizeWfc(
        {
          sampleData,
          sampleWidth: sampleW,
          sampleHeight: sampleH,
          outputWidth: 16,
          outputHeight: 16,
        },
        {
          N: 2,
          symmetries: 8,
          maxWorkingSetBytes: MAX_WFC_WORKING_SET_BYTES,
        }
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe('resource_limit_exceeded');
      expect(result.error).toContain('exceeds safe resource budget');
      expect(result.data.length).toBe(0);
      expect(propagatorSpy).toHaveBeenCalledTimes(0);
      expect(allocateSpy).toHaveBeenCalledTimes(0);

      propagatorSpy.mockRestore();
      allocateSpy.mockRestore();
    });

    it('rejects a large uniform sample whose retained buffers exceed the ceiling with the solver', () => {
      const sampleWidth = 1810;
      const sampleHeight = 1810;
      const sampleData = new Uint8ClampedArray(sampleWidth * sampleHeight * 4);
      const allocateSpy = vi.spyOn(_wfcInternal, 'allocateSolverState');
      const propagatorSpy = vi.spyOn(_wfcInternal, 'buildPropagatorTable');

      const result = synthesizeWfc({
        sampleData,
        sampleWidth,
        sampleHeight,
        outputWidth: 1000,
        outputHeight: 1000,
      }, { N: 2, symmetries: 1 });

      expect(result.status).toBe('resource_limit_exceeded');
      expect(result.resourceUsage?.estimatedWorkingSetBytes).toBeGreaterThan(MAX_WFC_WORKING_SET_BYTES);
      expect(propagatorSpy).not.toHaveBeenCalled();
      expect(allocateSpy).not.toHaveBeenCalled();
      propagatorSpy.mockRestore();
      allocateSpy.mockRestore();
    });
  });

  describe('5. High-P Growth & High-Entropy Adversarial Fixtures (Section 16)', () => {
    it('demonstrates that admission is based on extracted uniqueness P rather than arbitrary dimensions', () => {
      const sampleW = 16;
      const sampleH = 16;

      // Case A: 16x16 uniform sample produces P = 1 unique pattern
      const uniformSample = createUniformSample(sampleW, sampleH);
      const uniformResult = synthesizeWfc(
        {
          sampleData: uniformSample,
          sampleWidth: sampleW,
          sampleHeight: sampleH,
          outputWidth: 16,
          outputHeight: 16,
        },
        {
          N: 2,
          symmetries: 8,
          // Tight 100 KiB budget
          maxWorkingSetBytes: 100 * 1024,
        }
      );
      expect(uniformResult.success).toBe(true);
      expect(uniformResult.patternsCount).toBe(1);

      // Case B: 16x16 high-entropy sample would produce up to 2048 unique patterns,
      // but incremental unique-pattern admission stops retention at the derived threshold P=14
      const entropySample = createHighEntropySample(sampleW, sampleH);
      const entropyResult = synthesizeWfc(
        {
          sampleData: entropySample,
          sampleWidth: sampleW,
          sampleHeight: sampleH,
          outputWidth: 16,
          outputHeight: 16,
        },
        {
          N: 2,
          symmetries: 8,
          // Same 100 KiB budget: P=14 costs 102,048 bytes including retained sample buffers.
          maxWorkingSetBytes: 100 * 1024,
        }
      );
      expect(entropyResult.success).toBe(false);
      expect(entropyResult.status).toBe('resource_limit_exceeded');
      expect(entropyResult.patternsCount).toBe(14);
      expect(entropyResult.patternsCount).toBeLessThan(2048);
    });

    it('aborts extraction incrementally on high-entropy source before processing all candidate transforms', () => {
      const allocateSpy = vi.spyOn(_wfcInternal, 'allocateSolverState');
      const propagatorSpy = vi.spyOn(_wfcInternal, 'buildPropagatorTable');

      const sampleW = 16;
      const sampleH = 16;
      const entropySample = createHighEntropySample(sampleW, sampleH);
      const candidateCapacity = 16 * 16 * 8; // 2048 candidate transforms

      // Test budget: 100 KiB (102,400 bytes) for C = 256 (16x16 output)
      // For P = 14: 25*256*14 + 24*256 + 16*14^2 + 80*14 + 2048 = 102,048 bytes.
      // For P = 15: the same model reaches 108,992 bytes, above the 100 KiB budget.
      // Derived admissible threshold is exactly P = 14.
      const budget100K = 100 * 1024;

      const result = synthesizeWfc(
        {
          sampleData: entropySample,
          sampleWidth: sampleW,
          sampleHeight: sampleH,
          outputWidth: 16,
          outputHeight: 16,
        },
        {
          N: 2,
          symmetries: 8,
          maxWorkingSetBytes: budget100K,
        }
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe('resource_limit_exceeded');
      expect(result.patternsCount).toBe(14);
      expect(result.patternsCount).toBeLessThan(candidateCapacity);

      // Proven: 0 calls to propagator construction and solver state allocation
      expect(propagatorSpy).toHaveBeenCalledTimes(0);
      expect(allocateSpy).toHaveBeenCalledTimes(0);

      propagatorSpy.mockRestore();
      allocateSpy.mockRestore();
    });

    it('does not false-reject duplicate-heavy source with high candidate transform count', () => {
      // 16x16 checkerboard with 8 symmetries generates 2048 candidate transforms,
      // but only 2 unique patterns due to extreme repetition.
      const sampleW = 16;
      const sampleH = 16;
      const checkerboardSample = createCheckerboardSample(sampleW, sampleH);

      const result = synthesizeWfc(
        {
          sampleData: checkerboardSample,
          sampleWidth: sampleW,
          sampleHeight: sampleH,
          outputWidth: 16,
          outputHeight: 16,
        },
        {
          N: 2,
          symmetries: 8,
          maxWorkingSetBytes: 100 * 1024, // 100 KiB budget
        }
      );

      // Must succeed: only 2 unique patterns admitted, well within the 100 KiB envelope
      expect(result.success).toBe(true);
      expect(result.patternsCount).toBe(2);
    });
  });

  describe('6. High-C Growth Fixtures (Section 17)', () => {
    it('proves resource demand increases according to modeled C-dependent structures', () => {
      const P = 12; // Brick tile pattern count
      const n = 2;
      const D = 4;

      const c16 = estimateWfcWorkingSet(P, 16 * 16, n, D)!;
      const c32 = estimateWfcWorkingSet(P, 32 * 32, n, D)!;
      const c64 = estimateWfcWorkingSet(P, 64 * 64, n, D)!;

      // P is fixed, so patternStorageBytes and propagatorBytes must be identical
      expect(c16.patternStorageBytes).toBe(c32.patternStorageBytes);
      expect(c32.patternStorageBytes).toBe(c64.patternStorageBytes);
      expect(c16.propagatorBytes).toBe(c32.propagatorBytes);
      expect(c32.propagatorBytes).toBe(c64.propagatorBytes);

      // Cell count scales 4x per step (256 -> 1024 -> 4096)
      expect(c32.waveBytes).toBe(c16.waveBytes * 4);
      expect(c64.waveBytes).toBe(c32.waveBytes * 4);

      expect(c32.compatibilityBytes).toBe(c16.compatibilityBytes * 4);
      expect(c64.compatibilityBytes).toBe(c32.compatibilityBytes * 4);

      expect(c32.entropyBytes).toBe(c16.entropyBytes * 4);
      expect(c64.entropyBytes).toBe(c32.entropyBytes * 4);

      expect(c32.outputBytes).toBe(c16.outputBytes * 4);
      expect(c64.outputBytes).toBe(c32.outputBytes * 4);
    });
  });

  describe('7. Logical Contradiction vs Resource Rejection (Section 12)', () => {
    it('distinguishes logical contradiction from resource admission rejection', () => {
      // Resource admission failure
      const highEntropySample = createHighEntropySample(16, 16);
      const resFailure = synthesizeWfc(
        {
          sampleData: highEntropySample,
          sampleWidth: 16,
          sampleHeight: 16,
          outputWidth: 32,
          outputHeight: 32,
        },
        {
          N: 2,
          symmetries: 8,
          maxWorkingSetBytes: 50 * 1024, // 50 KiB
        }
      );
      expect(resFailure.success).toBe(false);
      expect(resFailure.status).toBe('resource_limit_exceeded');
      expect(resFailure.error).toContain('exceeds safe resource budget');

      // Logical contradiction:
      // Construct a sample with mutually incompatible boundaries under periodic wrapping with maxRetries: 1
      const sampleW = 4;
      const sampleH = 4;
      const sampleData = new Uint8ClampedArray(sampleW * sampleH * 4);
      // Fill with asymmetric colors that cannot tile periodically under N=3 without contradiction
      for (let i = 0; i < sampleW * sampleH; i++) {
        sampleData[i * 4] = (i * 37) % 256;
        sampleData[i * 4 + 1] = (i * 73) % 256;
        sampleData[i * 4 + 2] = (i * 109) % 256;
        sampleData[i * 4 + 3] = 255;
      }

      const contradictionResult = synthesizeWfc(
        {
          sampleData,
          sampleWidth: sampleW,
          sampleHeight: sampleH,
          outputWidth: 8,
          outputHeight: 8,
        },
        {
          N: 3,
          symmetries: 1,
          periodicInput: false,
          periodicOutput: true,
          maxRetries: 1,
          seed: 1,
          maxWorkingSetBytes: MAX_WFC_WORKING_SET_BYTES,
        }
      );

      // If it fails, it must be reported as a contradiction, not a resource limit!
      if (!contradictionResult.success) {
        expect(contradictionResult.status).toBe('contradiction');
        expect(contradictionResult.error).toContain('contradictions after retries');
      }
    });

    it('rejects invalid inputs with invalid_input status', () => {
      const sample = createUniformSample(4, 4);
      const res1 = synthesizeWfc({
        sampleData: sample,
        sampleWidth: -4,
        sampleHeight: 4,
        outputWidth: 8,
        outputHeight: 8,
      });
      expect(res1.success).toBe(false);
      expect(res1.status).toBe('invalid_input');

      const res2 = synthesizeWfc({
        sampleData: new Uint8ClampedArray(8), // Too short for 4x4
        sampleWidth: 4,
        sampleHeight: 4,
        outputWidth: 8,
        outputHeight: 8,
      });
      expect(res2.success).toBe(false);
      expect(res2.status).toBe('invalid_input');
    });
  });

  describe('8. Determinism & Output Equivalence Preservation (Section 10 & 19)', () => {
    it('produces bit-for-bit identical outputs with identical seed and parameters', () => {
      const sampleW = 8;
      const sampleH = 8;
      const sampleData = createBrickSample(sampleW, sampleH);

      const input = {
        sampleData,
        sampleWidth: sampleW,
        sampleHeight: sampleH,
        outputWidth: 16,
        outputHeight: 16,
      };

      const run1 = synthesizeWfc(input, { seed: 4242, N: 2, symmetries: 8 });
      const run2 = synthesizeWfc(input, { seed: 4242, N: 2, symmetries: 8 });

      expect(run1.success).toBe(true);
      expect(run1.status).toBe('complete');
      expect(run2.success).toBe(true);
      expect(run2.status).toBe('complete');
      expect(Array.from(run1.data)).toEqual(Array.from(run2.data));

      const verification = verifyWfcAdjacencyConstraints(
        run1.data,
        16,
        16,
        sampleData,
        sampleW,
        sampleH,
        2,
        true,
        8
      );
      expect(verification.violations).toBe(0);
    });

    it('preserves determinism across multiple seeds on checkerboard sample', () => {
      const sampleW = 6;
      const sampleH = 6;
      const sampleData = createCheckerboardSample(sampleW, sampleH);

      const seeds = [1001, 2002, 3003];
      for (const seed of seeds) {
        const runA = synthesizeWfc(
          { sampleData, sampleWidth: sampleW, sampleHeight: sampleH, outputWidth: 12, outputHeight: 12 },
          { seed, N: 2, symmetries: 4 }
        );
        const runB = synthesizeWfc(
          { sampleData, sampleWidth: sampleW, sampleHeight: sampleH, outputWidth: 12, outputHeight: 12 },
          { seed, N: 2, symmetries: 4 }
        );
        expect(runA.success).toBe(true);
        expect(runB.success).toBe(true);
        expect(Array.from(runA.data)).toEqual(Array.from(runB.data));
      }
    });
  });

  describe('9. High-Entropy Source Measurement (Section 9 Review)', () => {
    it('measures structural candidate generation, unique P, and pre/post-allocation rejection on high-entropy sample', () => {
      const allocateSpy = vi.spyOn(_wfcInternal, 'allocateSolverState');
      const propagatorSpy = vi.spyOn(_wfcInternal, 'buildPropagatorTable');

      const sampleW = 16;
      const sampleH = 16;
      const sampleData = createHighEntropySample(sampleW, sampleH);

      // S = 16 * 16 = 256 candidate windows
      // K = 8 symmetries
      // Total candidates generated = 256 * 8 = 2048
      const n = 2;
      const candidateTransforms = sampleW * sampleH * 8;
      expect(candidateTransforms).toBe(2048);

      // Temporary candidate pattern raw footprint: 2048 * (n^2 * 4) = 32,768 bytes (32 KiB)
      const candidateBytes = candidateTransforms * (n * n * 4);
      expect(candidateBytes).toBe(32_768);

      // Synthesize to a 16x16 output canvas (C = 256)
      const result = synthesizeWfc(
        {
          sampleData,
          sampleWidth: sampleW,
          sampleHeight: sampleH,
          outputWidth: 16,
          outputHeight: 16,
        },
        {
          N: n,
          symmetries: 8,
          maxWorkingSetBytes: MAX_WFC_WORKING_SET_BYTES,
        }
      );

      // With 2048 potential unique patterns, incremental unique-pattern admission stops
      // retention at the derived threshold P=1855 (67,084,992 bytes <= 67,108,864 bytes).
      // At P=1856, demand reaches 67,150,848 bytes (> 64 MiB), so extraction aborts early.
      expect(result.success).toBe(false);
      expect(result.status).toBe('resource_limit_exceeded');
      expect(result.patternsCount).toBe(1855);
      expect(result.patternsCount).toBeLessThan(2048);
      expect(result.resourceUsage?.estimatedWorkingSetBytes).toBeGreaterThan(64 * 1024 * 1024);

      // Resource safety begins BEFORE building propagator or allocating solver state!
      expect(propagatorSpy).toHaveBeenCalledTimes(0);
      expect(allocateSpy).toHaveBeenCalledTimes(0);

      propagatorSpy.mockRestore();
      allocateSpy.mockRestore();
    });
  });

  describe('10. Typed CSR Propagator & Exact Allocations (Section 2 & 3 Review)', () => {
    it('constructs flat typed CSR propagator table without nested JavaScript arrays', () => {
      // 2 patterns of size 2x2:
      // Pattern 0: all red [255, 0, 0, 255]
      // Pattern 1: all green [0, 255, 0, 255]
      const p0 = new Uint32Array([0xff0000ff, 0xff0000ff, 0xff0000ff, 0xff0000ff]);
      const p1 = new Uint32Array([0x00ff00ff, 0x00ff00ff, 0x00ff00ff, 0x00ff00ff]);
      const patterns = [p0, p1];

      const propagator = _wfcInternal.buildPropagatorTable(patterns, 2, 4);

      // Verify flat typed representations
      expect(propagator.offsets).toBeInstanceOf(Int32Array);
      expect(propagator.counts).toBeInstanceOf(Int32Array);
      expect(propagator.neighbors).toBeInstanceOf(Int32Array);
      expect(propagator.offsets.length).toBe(4 * 2); // 8 slots
      expect(propagator.counts.length).toBe(4 * 2);

      // Pattern 0 is compatible with Pattern 0 in all directions (4 directions * 1 neighbor = 4)
      // Pattern 1 is compatible with Pattern 1 in all directions (4 directions * 1 neighbor = 4)
      // Total compatible pairs = 8
      expect(propagator.totalCompatiblePairs).toBe(8);
      expect(propagator.neighbors.length).toBe(8);

      // Exact bytes: (8 * 4) + (8 * 4) + (8 * 4) = 96 bytes
      const expectedBytes = propagator.offsets.byteLength + propagator.counts.byteLength + propagator.neighbors.byteLength;
      expect(propagator.exactBytes).toBe(expectedBytes);
      expect(propagator.exactBytes).toBe(96);
    });
  });
});
