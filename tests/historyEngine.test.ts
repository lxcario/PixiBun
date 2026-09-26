import { describe, it, expect } from 'vitest';
import { createHistoryEngine, calculateStepBytes } from '@/lib/engine/historyEngine';
import type { HistoryStep, PixelHistoryStep, StructuralHistoryStep } from '@/types/canvas';

function createMockImageData(marker: number, width: number = 4, height: number = 4): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  data[0] = marker;
  return {
    width,
    height,
    data,
    colorSpace: 'srgb',
  };
}

function createMockStep(id: string, marker: number = 0, width: number = 4, height: number = 4): HistoryStep {
  return {
    type: 'pixel',
    description: `Step ${id}`,
    frameIndex: 0,
    layerId: `layer-${id}`,
    imageData: createMockImageData(marker, width, height),
  };
}

describe('HistoryEngine', () => {
  it('initializes with empty stacks and correct flags', () => {
    const engine = createHistoryEngine();
    expect(engine.canUndo).toBe(false);
    expect(engine.canRedo).toBe(false);
    expect(engine.depth).toBe(0);
    expect(engine.peekUndo()).toBeNull();
    expect(engine.peekRedo()).toBeNull();
  });

  it('pushes steps, updates depth, and enables canUndo', () => {
    const engine = createHistoryEngine();
    const step1 = createMockStep('1', 10);
    const step2 = createMockStep('2', 20);

    expect(engine.push(step1)).toBe(1);
    expect(engine.depth).toBe(1);
    expect(engine.canUndo).toBe(true);
    expect(engine.canRedo).toBe(false);
    expect(engine.peekUndo()?.description).toBe('Step 1');

    expect(engine.push(step2)).toBe(2);
    expect(engine.depth).toBe(2);
    expect(engine.peekUndo()?.description).toBe('Step 2');
  });

  it('supports undo and redo transitions', () => {
    const engine = createHistoryEngine();
    const step1 = createMockStep('1', 10);
    const step2 = createMockStep('2', 20);

    engine.push(step1);
    engine.push(step2);

    // Caller provides current canvas state before restoring undone step
    const currentAtStep2 = createMockStep('current-at-2', 25);
    const undoneStep = engine.undo(currentAtStep2);
    expect(undoneStep?.description).toBe('Step 2');
    expect(engine.depth).toBe(1);
    expect(engine.canUndo).toBe(true);
    expect(engine.canRedo).toBe(true);
    expect(engine.peekRedo()?.description).toBe('Step current-at-2');

    const currentAtStep1 = createMockStep('current-at-1', 15);
    const redoneStep = engine.redo(currentAtStep1);
    expect(redoneStep?.description).toBe('Step current-at-2');
    expect(engine.depth).toBe(2);
    expect(engine.canUndo).toBe(true);
    expect(engine.canRedo).toBe(false);
  });

  it('does not push to redo stack when undo is called without currentState', () => {
    const engine = createHistoryEngine();
    engine.push(createMockStep('1'));
    const undone = engine.undo();
    expect(undone?.description).toBe('Step 1');
    expect(engine.canRedo).toBe(false);
    expect(engine.peekRedo()).toBeNull();
  });

  it('correctly records currentState when supplied during undo and redo', () => {
    const engine = createHistoryEngine();
    const step0 = createMockStep('0', 0);
    engine.push(step0);

    const currentAtUndo = createMockStep('current-after-stroke', 100);
    const restored = engine.undo(currentAtUndo);
    expect(restored?.description).toBe('Step 0');
    expect(engine.peekRedo()?.description).toBe('Step current-after-stroke');

    const currentAtRedo = createMockStep('current-before-redo', 200);
    const redone = engine.redo(currentAtRedo);
    expect(redone?.description).toBe('Step current-after-stroke');
    expect(engine.peekUndo()?.description).toBe('Step current-before-redo');
  });

  it('invalidates redo tail upon pushing a new step', () => {
    const engine = createHistoryEngine();
    const step1 = createMockStep('1');
    const step2 = createMockStep('2');
    engine.push(step1);
    engine.push(step2);

    const current = createMockStep('current');
    engine.undo(current);
    expect(engine.canRedo).toBe(true);

    engine.push(createMockStep('3'));
    expect(engine.canRedo).toBe(false);
    expect(engine.peekRedo()).toBeNull();
    expect(engine.depth).toBe(2);
  });

  it('clears discontinuous history when an already-applied edit has an oversized snapshot', () => {
    const engine = createHistoryEngine({ maxDepth: 10, maxBytes: 2000 });
    engine.push(createMockStep('before-first-edit'));
    engine.push(createMockStep('before-second-edit'));
    engine.undo(createMockStep('current-after-second-edit'));
    engine.setBaseline({ width: 4, height: 4, frames: [], totalBytes: 1024 });
    expect(engine.canUndo).toBe(true);
    expect(engine.canRedo).toBe(true);

    const rejectedDepth = engine.push(createMockStep('before-oversized-edit', 0, 32, 32));
    expect(rejectedDepth).toBe(0);
    expect(engine.canUndo).toBe(false);
    expect(engine.canRedo).toBe(false);
    expect(engine.totalBytes).toBe(0);
    expect(engine.getBaseline()).toBeNull();
    expect(engine.isTruncated).toBe(true);
  });

  it('enforces maxDepth (50) with FIFO eviction of oldest items', () => {
    const engine = createHistoryEngine(50);
    for (let i = 0; i < 60; i++) {
      engine.push(createMockStep(String(i)));
    }

    expect(engine.depth).toBe(50);
    // The first 10 steps (0..9) should have been shifted out; oldest remaining is step 10
    // Walk back 50 steps:
    let lastPopped: HistoryStep | null = null;
    for (let i = 0; i < 50; i++) {
      lastPopped = engine.undo();
    }
    expect(lastPopped?.description).toBe('Step 10');
    expect(engine.canUndo).toBe(false);
  });

  it('clears both undo and redo stacks on clear()', () => {
    const engine = createHistoryEngine();
    engine.push(createMockStep('1'));
    engine.push(createMockStep('2'));
    engine.undo(createMockStep('current'));

    expect(engine.canUndo).toBe(true);
    expect(engine.canRedo).toBe(true);

    engine.clear();
    expect(engine.canUndo).toBe(false);
    expect(engine.canRedo).toBe(false);
    expect(engine.depth).toBe(0);
    expect(engine.peekUndo()).toBeNull();
    expect(engine.peekRedo()).toBeNull();
  });

  it('returns null on undo/redo when respective stacks are empty', () => {
    const engine = createHistoryEngine();
    expect(engine.undo()).toBeNull();
    expect(engine.redo()).toBeNull();
  });

  describe('Finding M1: Redo Stack Byte Budget & Combined History Retention Envelope', () => {
    it('enforces post-fix combined byte invariant on the M1 reproduction scenario', () => {
      const limitBytes = 1500;
      const limitDepth = 10;
      const engine = createHistoryEngine({ maxDepth: limitDepth, maxBytes: limitBytes });

      // Step 1: 4x4 image = 4*4*4 + 512 = 576 bytes
      const step1 = createMockStep('1');
      // Step 2: 4x4 image = 576 bytes
      const step2 = createMockStep('2');

      engine.push(step1);
      engine.push(step2);

      expect(engine.depth).toBe(2);
      expect(engine.undoBytes).toBe(1152);
      expect(engine.redoBytes).toBe(0);
      expect(engine.totalBytes).toBe(1152);

      // Call undo with currentState (11x11 image: 11*11*4 + 512 = 996 bytes)
      // 576 (step 1) + 996 = 1572 > 1500 limitBytes.
      // Under M1 combined budget, currentState cannot be admitted to redoStack without violating limitBytes.
      const currentAtStep2 = createMockStep('Current at 2', 0, 11, 11);
      const undone = engine.undo(currentAtStep2);
      expect(undone?.description).toBe('Step 2');

      expect(engine.undoBytes).toBe(576);
      expect(engine.redoBytes).toBe(0);
      expect(engine.redoDepth).toBe(0);
      expect(engine.totalBytes).toBe(576);
      expect(engine.totalBytes).toBeLessThanOrEqual(limitBytes);
    });

    it('enforces independent redo stack depth eviction (Case A)', () => {
      const limitDepth = 3;
      const limitBytes = 50_000;
      const engine = createHistoryEngine({ maxDepth: limitDepth, maxBytes: limitBytes });

      for (let i = 1; i <= 3; i++) {
        engine.push(createMockStep(String(i)));
      }
      expect(engine.depth).toBe(3);

      engine.undo(createMockStep('c3'));
      engine.undo(createMockStep('c2'));
      engine.undo(createMockStep('c1'));

      expect(engine.depth).toBe(0);
      expect(engine.redoDepth).toBe(3);
      expect(engine.peekRedo()?.description).toBe('Step c1');
    });

    it('evicts oldest redo entries on byte pressure before reaching depth cap (Case B)', () => {
      const limitBytes = 1500;
      const limitDepth = 20;
      const engine = createHistoryEngine({ maxDepth: limitDepth, maxBytes: limitBytes });

      // Step A: 576 bytes, Step B: 576 bytes
      engine.push(createMockStep('A'));
      engine.push(createMockStep('B'));
      expect(engine.totalBytes).toBe(1152);

      // Undo B: redoStack gets cB (576 bytes)
      engine.undo(createMockStep('cB'));
      expect(engine.depth).toBe(1);
      expect(engine.redoDepth).toBe(1);

      // Undo A: redoStack gets cA (576 bytes)
      // redoStack has [cB, cA] = 1152 bytes <= 1500
      engine.undo(createMockStep('cA'));
      expect(engine.depth).toBe(0);
      expect(engine.redoDepth).toBe(2);
      expect(engine.redoBytes).toBe(1152);

      // Redo cA with currentState c_redo (576 bytes):
      // cA popped from redoStack -> redoStack has cB (576 bytes).
      // c_redo (576 bytes) admitted to undoStack.
      // Total bytes = 576 + 576 = 1152 <= 1500.
      engine.redo(createMockStep('c_redo'));
      expect(engine.depth).toBe(1);
      expect(engine.redoDepth).toBe(1);
      expect(engine.redoBytes).toBe(576);

      // Now undo c_redo with c_large (996 bytes, 11x11 image):
      // undo pops c_redo -> undoStack has 0 bytes.
      // redoStack has cB (576 bytes).
      // 0 + 576 + 996 = 1572 > 1500!
      // Redo byte eviction triggers: oldest redo entry cB (576 bytes) is evicted from front!
      // Remaining redoBytes: 0.
      // 0 + 0 + 996 = 996 <= 1500. Fits!
      // c_large is admitted to redoStack!
      engine.undo(createMockStep('c_large', 0, 11, 11));
      expect(engine.redoDepth).toBe(1);
      expect(engine.peekRedo()?.description).toBe('Step c_large');
      expect(engine.redoBytes).toBe(996);
      expect(engine.totalBytes).toBe(996);
      expect(engine.totalBytes).toBeLessThanOrEqual(limitBytes);
    });

    it('strictly constrains combined retained bytes across undo and redo transitions (Case C)', () => {
      const limitBytes = 1500;
      const engine = createHistoryEngine({ maxDepth: 10, maxBytes: limitBytes });

      engine.push(createMockStep('1'));
      engine.push(createMockStep('2'));
      expect(engine.totalBytes).toBeLessThanOrEqual(limitBytes);

      engine.undo(createMockStep('c2'));
      expect(engine.totalBytes).toBeLessThanOrEqual(limitBytes);
      expect(engine.totalBytes).toBe(engine.undoBytes + engine.redoBytes);

      engine.redo(createMockStep('c1'));
      expect(engine.totalBytes).toBeLessThanOrEqual(limitBytes);
      expect(engine.totalBytes).toBe(engine.undoBytes + engine.redoBytes);
    });

    it('resets redoBytes and clears redoStack when a new step is pushed (Case D)', () => {
      const engine = createHistoryEngine({ maxDepth: 10, maxBytes: 5000 });
      engine.push(createMockStep('1'));
      engine.push(createMockStep('2'));
      engine.undo(createMockStep('c2'));

      expect(engine.redoBytes).toBeGreaterThan(0);
      expect(engine.redoDepth).toBe(1);
      expect(engine.canRedo).toBe(true);

      engine.push(createMockStep('3'));
      expect(engine.redoBytes).toBe(0);
      expect(engine.redoDepth).toBe(0);
      expect(engine.canRedo).toBe(false);
    });

    it('decrements redoBytes exactly when redo() pops a step (Case E)', () => {
      const engine = createHistoryEngine({ maxDepth: 10, maxBytes: 5000 });
      engine.push(createMockStep('1'));
      const c1 = createMockStep('c1');
      const c1Bytes = calculateStepBytes(c1);

      engine.undo(c1);
      expect(engine.redoBytes).toBe(c1Bytes);

      engine.redo();
      expect(engine.redoBytes).toBe(0);
      expect(engine.redoDepth).toBe(0);
    });

    it('resets both undo and redo byte counters to zero on clear() (Case F)', () => {
      const engine = createHistoryEngine({ maxDepth: 10, maxBytes: 5000 });
      engine.push(createMockStep('1'));
      engine.push(createMockStep('2'));
      engine.undo(createMockStep('c2'));

      expect(engine.undoBytes).toBeGreaterThan(0);
      expect(engine.redoBytes).toBeGreaterThan(0);

      engine.clear();
      expect(engine.undoBytes).toBe(0);
      expect(engine.redoBytes).toBe(0);
      expect(engine.totalBytes).toBe(0);
      expect(engine.depth).toBe(0);
      expect(engine.redoDepth).toBe(0);
      expect(engine.canUndo).toBe(false);
      expect(engine.canRedo).toBe(false);
    });

    it('accurately accounts for variable-size steps in both stacks (Case G)', () => {
      const engine = createHistoryEngine({ maxDepth: 10, maxBytes: 10_000 });
      const s1 = createMockStep('1', 0, 4, 4); // 576 bytes
      const s2 = createMockStep('2', 0, 8, 8); // 8*8*4 + 512 = 768 bytes
      const s3 = createMockStep('3', 0, 12, 12); // 12*12*4 + 512 = 1088 bytes

      engine.push(s1);
      engine.push(s2);
      engine.push(s3);

      const s1Bytes = calculateStepBytes(s1);
      const s2Bytes = calculateStepBytes(s2);
      const s3Bytes = calculateStepBytes(s3);
      expect(engine.undoBytes).toBe(s1Bytes + s2Bytes + s3Bytes);
      expect(engine.redoBytes).toBe(0);

      const c3 = createMockStep('c3', 0, 6, 6); // 6*6*4 + 512 = 656 bytes
      const c3Bytes = calculateStepBytes(c3);
      engine.undo(c3);

      expect(engine.undoBytes).toBe(s1Bytes + s2Bytes);
      expect(engine.redoBytes).toBe(c3Bytes);
      expect(engine.totalBytes).toBe(s1Bytes + s2Bytes + c3Bytes);
    });

    it('guarantees redo eviction does not modify or corrupt the process replay baseline (Case H & Section 14)', () => {
      const limitBytes = 1500;
      const engine = createHistoryEngine({ maxDepth: 10, maxBytes: limitBytes });

      // Step 1 (Red 4x4, 576 bytes)
      const step1: PixelHistoryStep = {
        type: 'pixel',
        description: 'Step 1 (Red)',
        frameIndex: 0,
        layerId: 'layer-1',
        imageData: createMockImageData(255, 4, 4),
      };
      // Step 2 (Green 4x4, 576 bytes)
      const step2: PixelHistoryStep = {
        type: 'pixel',
        description: 'Step 2 (Green)',
        frameIndex: 0,
        layerId: 'layer-1',
        imageData: createMockImageData(100, 4, 4),
      };
      // Step 3 (Blue 4x4, 576 bytes) forces eviction of Step 1 into baseline!
      const step3: PixelHistoryStep = {
        type: 'pixel',
        description: 'Step 3 (Blue)',
        frameIndex: 0,
        layerId: 'layer-1',
        imageData: createMockImageData(50, 4, 4),
      };

      engine.push(step1);
      engine.push(step2);
      engine.push(step3);

      expect(engine.evictionCount).toBe(1);
      const baselineBefore = JSON.stringify(engine.getBaseline());
      expect(baselineBefore).not.toBeNull();

      // Undo step 3 with c3 (576 bytes)
      engine.undo(createMockStep('c3', 0, 4, 4));

      // Undo step 2 with c2_large (996 bytes) -> triggers redo eviction of c3
      engine.undo(createMockStep('c2_large', 0, 11, 11));

      // Baseline MUST NOT be changed by redo eviction:
      const baselineAfter = JSON.stringify(engine.getBaseline());
      expect(baselineAfter).toBe(baselineBefore);
    });

    it('updates process replay baseline when redo causes undo-stack eviction under combined budget pressure (Case I & Section 13)', () => {
      const engine = createHistoryEngine({ maxDepth: 10, maxBytes: 1500 });

      // Step 1: Red (4x4 = 576 bytes)
      const step1: PixelHistoryStep = {
        type: 'pixel',
        description: 'Step 1 (Red)',
        frameIndex: 0,
        layerId: 'layer-1',
        imageData: createMockImageData(255, 4, 4),
      };
      // Step 2: Green (4x4 = 576 bytes)
      const step2: PixelHistoryStep = {
        type: 'pixel',
        description: 'Step 2 (Green)',
        frameIndex: 0,
        layerId: 'layer-1',
        imageData: createMockImageData(128, 4, 4),
      };

      engine.push(step1);
      engine.push(step2);
      expect(engine.getBaseline()).toBeNull();
      expect(engine.evictionCount).toBe(0);

      // Undo Step 2 with c2 (528 bytes, 2x2 image):
      const c2 = createMockStep('c2', 0, 2, 2);
      engine.undo(c2);

      // Redo Step 2 with currentState c1_large (996 bytes, 11x11 image):
      // c2 is popped from redoStack.
      // To admit c1_large (996 bytes) with Step 1 (576 bytes):
      // 576 + 0 + 996 = 1572 > 1500 -> Evicts Step 1 from undoStack!
      // Step 1 (Red) is folded into baseline!
      const c1_large = createMockStep('c1_large', 0, 11, 11);
      engine.redo(c1_large);

      expect(engine.evictionCount).toBe(1);
      const baseline = engine.getBaseline();
      expect(baseline).not.toBeNull();
      expect(baseline!.frames[0].layers[0].imageData.data[0]).toBe(255);
      expect(engine.totalBytes).toBeLessThanOrEqual(1500);
    });

    it('preserves H4 process replay integrity across mixed undo/redo eviction sequences (Case J)', () => {
      const engine = createHistoryEngine({ maxDepth: 10, maxBytes: 1500 });
      const step1 = createMockStep('1', 10);
      const step2 = createMockStep('2', 20);
      const step3 = createMockStep('3', 30);

      engine.push(step1);
      engine.push(step2);
      engine.push(step3);

      expect(engine.getBaseline()).not.toBeNull();
      const history = engine.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].description).toBe('Step 2');
      expect(history[1].description).toBe('Step 3');
    });

    it('maintains exact byte accounting for mixed structural and pixel steps (Case K)', () => {
      const engine = createHistoryEngine({ maxDepth: 10, maxBytes: 10_000 });

      const pixelStep: PixelHistoryStep = {
        type: 'pixel',
        description: 'Draw stroke',
        frameIndex: 0,
        layerId: 'layer-1',
        imageData: createMockImageData(10, 4, 4),
      };
      const structuralStep: StructuralHistoryStep = {
        type: 'structural',
        description: 'Add Layer',
        frameIndex: 0,
        frames: [],
        activeFrameIndex: 0,
        activeLayerId: 'l2',
        canvasWidth: 16,
        canvasHeight: 16,
        layerBuffers: [{ layerId: 'l2', imageData: createMockImageData(20, 8, 8) }],
      };

      engine.push(pixelStep);
      engine.push(structuralStep);

      const pixelBytes = calculateStepBytes(pixelStep);
      const structuralBytes = calculateStepBytes(structuralStep);
      expect(engine.undoBytes).toBe(pixelBytes + structuralBytes);
      expect(engine.redoBytes).toBe(0);

      engine.undo(createMockStep('current-canvas', 0, 4, 4));
      expect(engine.undoBytes).toBe(pixelBytes);
      expect(engine.redoBytes).toBe(576);
      expect(engine.totalBytes).toBe(pixelBytes + 576);
    });

    it('maintains continuous accounting invariant across complex push/undo/redo sequence (Section 15)', () => {
      const limitBytes = 2500;
      const engine = createHistoryEngine({ maxDepth: 5, maxBytes: limitBytes });

      function assertInvariants() {
        expect(engine.undoBytes).toBeGreaterThanOrEqual(0);
        expect(engine.redoBytes).toBeGreaterThanOrEqual(0);
        expect(engine.totalBytes).toBe(engine.undoBytes + engine.redoBytes);
        expect(engine.totalBytes).toBeLessThanOrEqual(limitBytes);
        expect(engine.depth).toBeLessThanOrEqual(engine.maxDepth);
        expect(engine.redoDepth).toBeLessThanOrEqual(engine.maxDepth);
      }

      // Sequence: push -> push -> push -> undo -> undo -> redo -> undo -> push -> undo -> redo -> clear
      engine.push(createMockStep('1'));
      assertInvariants();

      engine.push(createMockStep('2'));
      assertInvariants();

      engine.push(createMockStep('3'));
      assertInvariants();

      engine.undo(createMockStep('c3'));
      assertInvariants();

      engine.undo(createMockStep('c2'));
      assertInvariants();

      engine.redo(createMockStep('c1'));
      assertInvariants();

      engine.undo(createMockStep('c1_again'));
      assertInvariants();

      engine.push(createMockStep('4'));
      assertInvariants();

      engine.undo(createMockStep('c4'));
      assertInvariants();

      engine.redo(createMockStep('c3_again'));
      assertInvariants();

      engine.clear();
      assertInvariants();
      expect(engine.undoBytes).toBe(0);
      expect(engine.redoBytes).toBe(0);
      expect(engine.totalBytes).toBe(0);
    });

    it('rejects/truncates oversized currentState exceeding limitBytes without corrupting budget (Section 10)', () => {
      const limitBytes = 1500;
      const engine = createHistoryEngine({ maxDepth: 10, maxBytes: limitBytes });

      engine.push(createMockStep('1')); // 576 bytes

      const oversizedCurrent = createMockStep('oversized', 0, 16, 16);
      expect(calculateStepBytes(oversizedCurrent)).toBeGreaterThan(limitBytes);

      const undone = engine.undo(oversizedCurrent);
      expect(undone?.description).toBe('Step 1');
      expect(engine.redoDepth).toBe(0);
      expect(engine.redoBytes).toBe(0);
      expect(engine.totalBytes).toBe(0);
      expect(engine.totalBytes).toBeLessThanOrEqual(limitBytes);
    });

    it('clears older redo states when an undo snapshot cannot be retained', () => {
      const engine = createHistoryEngine({ maxDepth: 10, maxBytes: 1500 });
      engine.push(createMockStep('before-first-edit'));
      engine.push(createMockStep('before-second-edit'));

      engine.undo(createMockStep('after-second-edit'));
      expect(engine.redoDepth).toBe(1);

      engine.undo(createMockStep('oversized-intermediate', 0, 16, 16));
      expect(engine.redoDepth).toBe(0);
      expect(engine.redoBytes).toBe(0);
      expect(engine.canRedo).toBe(false);
      expect(engine.redo()).toBeNull();
      expect(engine.isTruncated).toBe(true);
    });

    it('clears discontinuous undo entries when a redo snapshot alone exceeds the budget', () => {
      const engine = createHistoryEngine({ maxDepth: 10, maxBytes: 1500 });
      engine.push(createMockStep('older'));
      engine.push(createMockStep('newer'));
      engine.undo(createMockStep('redo-state'));

      const evictionCountBefore = engine.evictionCount;
      const redone = engine.redo(createMockStep('oversized-current', 0, 16, 16));

      expect(redone?.description).toBe('Step redo-state');
      expect(engine.depth).toBe(0);
      expect(engine.peekUndo()).toBeNull();
      expect(engine.undo()).toBeNull();
      expect(engine.redo()).toBeNull();
      expect(engine.evictionCount).toBe(evictionCountBefore);
      expect(engine.getBaseline()).toBeNull();
      expect(engine.totalBytes).toBeLessThanOrEqual(engine.maxBytes);
      expect(engine.isTruncated).toBe(true);
    });
  });
});
