import { describe, it, expect } from 'vitest';
import { createHistoryEngine } from '@/lib/engine/historyEngine';
import type { HistoryStep } from '@/types/canvas';

function createMockImageData(marker: number): ImageData {
  const data = new Uint8ClampedArray(4 * 4 * 4);
  data[0] = marker;
  return {
    width: 4,
    height: 4,
    data,
    colorSpace: 'srgb',
  };
}

function createMockStep(id: string, marker: number = 0): HistoryStep {
  return {
    description: `Step ${id}`,
    frameIndex: 0,
    layerId: `layer-${id}`,
    imageData: createMockImageData(marker),
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

    const undoneStep = engine.undo();
    expect(undoneStep?.description).toBe('Step 2');
    expect(engine.depth).toBe(1);
    expect(engine.canUndo).toBe(true);
    expect(engine.canRedo).toBe(true);
    expect(engine.peekRedo()?.description).toBe('Step 2');

    const redoneStep = engine.redo();
    expect(redoneStep?.description).toBe('Step 2');
    expect(engine.depth).toBe(2);
    expect(engine.canUndo).toBe(true);
    expect(engine.canRedo).toBe(false);
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
    engine.push(createMockStep('1'));
    engine.push(createMockStep('2'));

    engine.undo();
    expect(engine.canRedo).toBe(true);

    engine.push(createMockStep('3'));
    expect(engine.canRedo).toBe(false);
    expect(engine.peekRedo()).toBeNull();
    expect(engine.depth).toBe(2);
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
    engine.undo();

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
});
