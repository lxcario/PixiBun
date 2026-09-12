import { describe, it, expect, beforeEach } from 'vitest';
import { createHistoryEngine, HistoryEngine, StructuralHistoryStep } from '@/lib/engine/historyEngine';

describe('HistoryEngine - Hybrid Command Pattern (Structural Steps)', () => {
  let engine: HistoryEngine;

  beforeEach(() => {
    engine = createHistoryEngine(20);
  });

  it('correctly pushes and tracks structural history steps', () => {
    const structuralStep: StructuralHistoryStep = {
      type: 'structural',
      description: 'Katman Silindi',
      frameIndex: 0,
      frames: [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [
            {
              id: 'layer-1',
              name: 'Background',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
            },
            {
              id: 'layer-2',
              name: 'Foreground',
              visible: true,
              locked: false,
              opacity: 0.8,
              blendMode: 'source-over',
            },
          ],
        },
      ],
      activeFrameIndex: 0,
      activeLayerId: 'layer-2',
      layerBuffers: [
        {
          layerId: 'layer-2',
          imageData: { width: 4, height: 4, data: new Uint8ClampedArray(64) } as ImageData,
        },
      ],
    };

    engine.push(structuralStep);

    expect(engine.depth).toBe(1);
    expect(engine.canUndo).toBe(true);
    expect(engine.canRedo).toBe(false);

    const peek = engine.peekUndo();
    expect(peek).not.toBeNull();
    expect(peek?.type).toBe('structural');
    expect(peek?.description).toBe('Katman Silindi');
  });

  it('correctly undoes and redoes structural state transitions', () => {
    const step1: StructuralHistoryStep = {
      type: 'structural',
      description: 'State 1 - Initial 2 Layers',
      frameIndex: 0,
      frames: [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [
            { id: 'l-1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
            { id: 'l-2', name: 'L2', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
          ],
        },
      ],
      activeFrameIndex: 0,
      activeLayerId: 'l-2',
    };

    engine.push(step1);

    const step2Current: StructuralHistoryStep = {
      type: 'structural',
      description: 'State 2 - Layer 2 Deleted',
      frameIndex: 0,
      frames: [
        {
          id: 'frame-1',
          durationMs: 100,
          layers: [
            { id: 'l-1', name: 'L1', visible: true, locked: false, opacity: 1, blendMode: 'source-over' },
          ],
        },
      ],
      activeFrameIndex: 0,
      activeLayerId: 'l-1',
    };

    // Perform Undo: passing current state (Layer 2 Deleted) pushes it to redo stack
    const restored = engine.undo(step2Current);
    expect(restored).not.toBeNull();
    expect(restored?.type).toBe('structural');
    if (restored?.type === 'structural') {
      expect(restored.frames[0].layers.length).toBe(2);
      expect(restored.activeLayerId).toBe('l-2');
    }

    expect(engine.canRedo).toBe(true);
    expect(engine.peekRedo()?.description).toBe('State 2 - Layer 2 Deleted');

    // Perform Redo: restores the state where layer 2 was deleted
    const redone = engine.redo(step1);
    expect(redone).not.toBeNull();
    expect(redone?.type).toBe('structural');
    if (redone?.type === 'structural') {
      expect(redone.frames[0].layers.length).toBe(1);
      expect(redone.activeLayerId).toBe('l-1');
    }
  });
});
