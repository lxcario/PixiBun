// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import React from 'react';
import { CenterViewport } from '@/components/layout/CenterViewport';
import { makeCanvas } from './helpers/mockCanvas';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { clearAllBuffers, getOrCreateBuffer, touchBuffer, hasBuffer } from '@/lib/engine/bufferRegistry';
import { pushStructuralHistoryStep } from '@/lib/engine/structuralHistory';
import { getGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import {
  canAddLayersToFrame,
  canAddFramesToProject,
  canReplaceFrames,
  validateWorkspaceStructure,
} from '@/lib/project/workspaceEnvelopeGuard';
import {
  db,
  autoSaveWorkspaceDetailed,
  createBlankProjectFile,
} from '@/lib/storage/db';
import { validateProjectFile } from '@/lib/project/schema';
import { executeImageImport } from '@/lib/project/imageImportExecution';
import { PROJECT_FORMAT_ID, PROJECT_FORMAT_VERSION, type ProjectFile } from '@/types/project';
import type { AnimationFrame, Layer } from '@/types/canvas';

function createDummyLayer(id: string, name = 'Layer'): Layer {
  return {
    id,
    name,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'source-over',
  };
}

function createDummyFrame(id: string, layers: Layer[]): AnimationFrame {
  return {
    id,
    durationMs: 100,
    layers,
  };
}

describe('Phase 1A: Prevention & Safe Persistence (Workspace Envelope Enforcement)', () => {
  beforeEach(async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return makeCanvas(this.width || 32, this.height || 32).getContext('2d');
    });
    clearAllBuffers();
    useStudioStore.getState().resetToNewProject();
    if (!db.isOpen()) await db.open();
    await db.projects.clear();
    await db.layerBlobs.clear();
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    clearAllBuffers();
    if (db.isOpen()) {
      await db.projects.clear();
      await db.layerBlobs.clear();
    }
  });

  describe('1. Centralized Capacity Guard Functions (workspaceEnvelopeGuard)', () => {
    describe('canAddLayersToFrame', () => {
      it('allows adding up to 100 layers in a single frame, rejects 101', () => {
        const frame99 = createDummyFrame(
          'f1',
          Array.from({ length: 99 }, (_, i) => createDummyLayer(`l${i}`))
        );
        const frames = [frame99];

        // Adding 1 layer -> 100 total (allowed)
        const okCheck = canAddLayersToFrame(frames, 0, 32, 32, 1);
        expect(okCheck.ok).toBe(true);

        // Adding 2 layers -> 101 total (rejected)
        const rejectCheck = canAddLayersToFrame(frames, 0, 32, 32, 2);
        expect(rejectCheck.ok).toBe(false);
        expect(rejectCheck.reason).toContain('100 layer ceiling');
      });

      it('enforces total project layer limit (2,000 layers across frames)', () => {
        // 20 frames with 99 layers = 1,980 layers.
        // Frame 20 has 19 layers. Total across all 21 frames = 1,999 layers.
        const frames = Array.from({ length: 20 }, (_, fIdx) =>
          createDummyFrame(
            `f${fIdx}`,
            Array.from({ length: 99 }, (_, lIdx) => createDummyLayer(`l${fIdx}_${lIdx}`))
          )
        );
        frames.push(
          createDummyFrame(
            'f20',
            Array.from({ length: 19 }, (_, lIdx) => createDummyLayer(`l20_${lIdx}`))
          )
        );

        // Adding 1 layer to frame 20 (which has 19 layers) -> 19 + 1 = 20 <= 100, project total = 2,000 (allowed)
        expect(canAddLayersToFrame(frames, 20, 16, 16, 1).ok).toBe(true);

        // Adding 2 layers to frame 20 -> 19 + 2 = 21 <= 100, but project total = 2,001 (rejected by total project ceiling)
        const rejectCheck = canAddLayersToFrame(frames, 20, 16, 16, 2);
        expect(rejectCheck.ok).toBe(false);
        expect(rejectCheck.reason).toContain('total layer limit');
      });

      it('enforces 64 MP aggregate materializable raster footprint ceiling', () => {
        // At 2048x2048, 1 layer = 4,194,304 px.
        // 16 layers = 67,108,864 px (exactly 64 MP, allowed).
        // 17 layers = 71,303,168 px (> 64 MP, rejected).
        const frame15 = createDummyFrame(
          'f1',
          Array.from({ length: 15 }, (_, i) => createDummyLayer(`l${i}`))
        );
        const frames = [frame15];

        // 15 + 1 = 16 layers on 2048x2048 -> ok
        const okCheck = canAddLayersToFrame(frames, 0, 2048, 2048, 1);
        expect(okCheck.ok).toBe(true);

        // 15 + 2 = 17 layers on 2048x2048 -> rejected
        const rejectCheck = canAddLayersToFrame(frames, 0, 2048, 2048, 2);
        expect(rejectCheck.ok).toBe(false);
        expect(rejectCheck.reason).toContain('resource complexity ceiling');
      });

      it('rejects invalid guard inputs (non-positive count, out-of-bounds frame, invalid dimensions)', () => {
        const frames = [createDummyFrame('f1', [createDummyLayer('l1')])];
        // Zero or negative layer count must be rejected
        expect(canAddLayersToFrame(frames, 0, 32, 32, 0).ok).toBe(false);
        expect(canAddLayersToFrame(frames, 0, 32, 32, -1).ok).toBe(false);
        // Non-integer count rejected
        expect(canAddLayersToFrame(frames, 0, 32, 32, 1.5).ok).toBe(false);
        // Frame index out of bounds rejected
        expect(canAddLayersToFrame(frames, 5, 32, 32, 1).ok).toBe(false);
        expect(canAddLayersToFrame(frames, -1, 32, 32, 1).ok).toBe(false);
        // Dimensions out of bounds rejected
        expect(canAddLayersToFrame(frames, 0, 0, 32, 1).ok).toBe(false);
        expect(canAddLayersToFrame(frames, 0, 32, 2049, 1).ok).toBe(false);
        expect(canAddLayersToFrame(frames, 0, 32.5, 32, 1).ok).toBe(false);
      });
    });

    describe('canAddFramesToProject', () => {
      it('allows adding up to 500 frames, rejects 501', () => {
        const frames499 = Array.from({ length: 499 }, (_, i) =>
          createDummyFrame(`f${i}`, [createDummyLayer(`l${i}`)])
        );

        // Adding 1 frame -> 500 total (allowed)
        expect(canAddFramesToProject(frames499, 16, 16, [{ layerCount: 1 }]).ok).toBe(true);

        // Adding 2 frames -> 501 total (rejected)
        const rejectCheck = canAddFramesToProject(frames499, 16, 16, [
          { layerCount: 1 },
          { layerCount: 1 },
        ]);
        expect(rejectCheck.ok).toBe(false);
        expect(rejectCheck.reason).toContain('500 animation frame limit');
      });

      it('rejects adding a frame with layer count exceeding 100', () => {
        const frames = [createDummyFrame('f1', [createDummyLayer('l1')])];
        const rejectCheck = canAddFramesToProject(frames, 16, 16, [{ layerCount: 101 }]);
        expect(rejectCheck.ok).toBe(false);
        expect(rejectCheck.reason).toContain('100 layer ceiling');
      });

      it('rejects adding frames when total layers would exceed 2,000', () => {
        const frames = [
          createDummyFrame(
            'f1',
            Array.from({ length: 100 }, (_, i) => createDummyLayer(`l${i}`))
          ),
        ];
        // Adding 20 frames with 96 layers each: 100 + 1920 = 2020 > 2000
        const incoming = Array.from({ length: 20 }, () => ({ layerCount: 96 }));
        const rejectCheck = canAddFramesToProject(frames, 16, 16, incoming);
        expect(rejectCheck.ok).toBe(false);
        expect(rejectCheck.reason).toContain('total layer limit');
      });

      it('rejects adding frames when aggregate pixels would exceed 64 MP', () => {
        // At 1024x1024, 1 layer = 1,048,576 px. 64 layers = 67,108,864 px (64 MP).
        const frames = Array.from({ length: 60 }, (_, i) =>
          createDummyFrame(`f${i}`, [createDummyLayer(`l${i}`)])
        );
        // Currently 60 layers (60 MP). Adding 5 frames of 1 layer each = 65 layers (65 MP > 64 MP).
        const incoming = Array.from({ length: 5 }, () => ({ layerCount: 1 }));
        const rejectCheck = canAddFramesToProject(frames, 1024, 1024, incoming);
        expect(rejectCheck.ok).toBe(false);
        expect(rejectCheck.reason).toContain('resource complexity ceiling');
      });

      it('rejects invalid inputs (empty incoming array, frame with 0 or negative layers, invalid dimensions)', () => {
        const frames = [createDummyFrame('f1', [createDummyLayer('l1')])];
        expect(canAddFramesToProject(frames, 32, 32, []).ok).toBe(false);
        expect(canAddFramesToProject(frames, 32, 32, [{ layerCount: 0 }]).ok).toBe(false);
        expect(canAddFramesToProject(frames, 32, 32, [{ layerCount: -1 }]).ok).toBe(false);
        expect(canAddFramesToProject(frames, 32, 32, [{ layerCount: 2.5 }]).ok).toBe(false);
        expect(canAddFramesToProject(frames, 0, 32, [{ layerCount: 1 }]).ok).toBe(false);
        expect(canAddFramesToProject(frames, 32, 2049, [{ layerCount: 1 }]).ok).toBe(false);
      });

      it('differentiates non-integer, fewer than 1, and more than 100 layer count diagnostics', () => {
        const frames = [createDummyFrame('f1', [createDummyLayer('l1')])];

        // Non-integer in canAddFramesToProject
        const nonIntRes = canAddFramesToProject(frames, 32, 32, [{ layerCount: 2.5 }]);
        expect(nonIntRes.ok).toBe(false);
        expect(nonIntRes.reason).toContain('must be a whole number');

        // Fewer than 1 in canAddFramesToProject
        const zeroRes = canAddFramesToProject(frames, 32, 32, [{ layerCount: 0 }]);
        expect(zeroRes.ok).toBe(false);
        expect(zeroRes.reason).toContain('must contain at least 1 layer');

        // More than 100 in canAddFramesToProject
        const overRes = canAddFramesToProject(frames, 32, 32, [{ layerCount: 101 }]);
        expect(overRes.ok).toBe(false);
        expect(overRes.reason).toContain('100 layer ceiling');

        // In canReplaceFrames:
        expect(canReplaceFrames(32, 32, [{ layerCount: 1.5 }]).reason).toContain('must be a whole number');
        expect(canReplaceFrames(32, 32, [{ layerCount: 0 }]).reason).toContain('must contain at least 1 layer');
        expect(canReplaceFrames(32, 32, [{ layerCount: 101 }]).reason).toContain('100 layer ceiling');

        // In validateWorkspaceStructure:
        expect(validateWorkspaceStructure(32, 32, [{ layers: [] }]).reason).toContain('must contain at least 1 layer');
        expect(
          validateWorkspaceStructure(32, 32, [
            { layers: Array.from({ length: 101 }, (_, i) => ({ id: `l${i}` })) },
          ]).reason
        ).toContain('100 layer ceiling');
      });
    });

    describe('canReplaceFrames', () => {
      it('rejects replacement with 0 frames', () => {
        expect(canReplaceFrames(32, 32, []).ok).toBe(false);
      });

      it('rejects replacement with >500 frames or >100 layers per frame', () => {
        expect(
          canReplaceFrames(
            32,
            32,
            Array.from({ length: 501 }, () => ({ layerCount: 1 }))
          ).ok
        ).toBe(false);

        expect(canReplaceFrames(32, 32, [{ layerCount: 101 }]).ok).toBe(false);
      });

      it('rejects invalid replacement inputs (0 or negative layers, invalid dimensions)', () => {
        expect(canReplaceFrames(32, 32, [{ layerCount: 0 }]).ok).toBe(false);
        expect(canReplaceFrames(32, 32, [{ layerCount: -5 }]).ok).toBe(false);
        expect(canReplaceFrames(0, 32, [{ layerCount: 1 }]).ok).toBe(false);
        expect(canReplaceFrames(32, 2049, [{ layerCount: 1 }]).ok).toBe(false);
      });
    });

    describe('validateWorkspaceStructure', () => {
      it('validates complete target workspace structure accurately', () => {
        // 16 layers at 2048x2048 = 64 MP (valid)
        const frame16 = createDummyFrame(
          'f1',
          Array.from({ length: 16 }, (_, i) => createDummyLayer(`l${i}`))
        );
        expect(validateWorkspaceStructure(2048, 2048, [frame16]).ok).toBe(true);

        // 17 layers at 2048x2048 = 71.3 MP (>64 MP, invalid)
        const frame17 = createDummyFrame(
          'f1',
          Array.from({ length: 17 }, (_, i) => createDummyLayer(`l${i}`))
        );
        expect(validateWorkspaceStructure(2048, 2048, [frame17]).ok).toBe(false);

        // Empty frames rejected
        expect(validateWorkspaceStructure(32, 32, []).ok).toBe(false);

        // Frame with 0 layers rejected
        expect(validateWorkspaceStructure(32, 32, [createDummyFrame('f0', [])]).ok).toBe(false);

        // Frame with >100 layers rejected
        expect(
          validateWorkspaceStructure(32, 32, [
            createDummyFrame('f0', Array.from({ length: 101 }, (_, i) => createDummyLayer(`l${i}`))),
          ]).ok
        ).toBe(false);
      });
    });
  });

  describe('2. Live Zustand Mutation Enforcement & Rejection Semantics', () => {
    it('rejects addLayer when frame is at 100 layers: zero history, unchanged revision, toast emitted', () => {
      useStudioStore.setState({
        frames: [
          createDummyFrame(
            'f0',
            Array.from({ length: 100 }, (_, i) => createDummyLayer(`l-${i}`))
          ),
        ],
        activeFrameIndex: 0,
        editRevision: 10,
        isDirty: false,
      });

      const revisionBefore = useStudioStore.getState().editRevision;
      const isDirtyBefore = useStudioStore.getState().isDirty;
      const toastEvents: Array<{ type?: string; message?: string }> = [];
      const unsub = studioEvents.on('pixibun:toast', (t) => toastEvents.push(t));

      // Attempt 101st layer via public addLayer mutation
      useStudioStore.getState().addLayer('Overflow Layer');

      unsub();

      const stateAfter = useStudioStore.getState();
      expect(stateAfter.frames[0].layers.length).toBe(100);
      expect(stateAfter.editRevision).toBe(revisionBefore);
      expect(stateAfter.isDirty).toBe(isDirtyBefore);
      expect(toastEvents.length).toBe(1);
      expect(toastEvents[0].type).toBe('error');
      expect(toastEvents[0].message).toContain('100 layer ceiling');
    });

    it('rejects duplicateLayer when frame is at 100 layers: zero history, unchanged revision, toast emitted', () => {
      const layers = Array.from({ length: 100 }, (_, i) => createDummyLayer(`l-${i}`));
      useStudioStore.setState({
        frames: [createDummyFrame('f0', layers)],
        activeFrameIndex: 0,
        editRevision: 10,
        isDirty: false,
      });

      const targetLayerId = layers[0].id;
      const revisionBefore = useStudioStore.getState().editRevision;
      const toastEvents: Array<{ type?: string; message?: string }> = [];
      const unsub = studioEvents.on('pixibun:toast', (t) => toastEvents.push(t));

      useStudioStore.getState().duplicateLayer(targetLayerId);

      unsub();

      const stateAfter = useStudioStore.getState();
      expect(stateAfter.frames[0].layers.length).toBe(100);
      expect(stateAfter.editRevision).toBe(revisionBefore);
      expect(toastEvents.length).toBe(1);
      expect(toastEvents[0].type).toBe('error');
      expect(toastEvents[0].message).toContain('100 layer ceiling');
    });

    it('rejects addFrame when project is at 500 frames: zero history, unchanged revision, toast emitted', () => {
      useStudioStore.setState({
        frames: Array.from({ length: 500 }, (_, i) =>
          createDummyFrame(`frame-${i}`, [createDummyLayer(`l-${i}`)])
        ),
        activeFrameIndex: 0,
        editRevision: 10,
        isDirty: false,
      });

      const revisionBefore = useStudioStore.getState().editRevision;
      const toastEvents: Array<{ type?: string; message?: string }> = [];
      const unsub = studioEvents.on('pixibun:toast', (t) => toastEvents.push(t));

      useStudioStore.getState().addFrame();

      unsub();

      const stateAfter = useStudioStore.getState();
      expect(stateAfter.frames.length).toBe(500);
      expect(stateAfter.editRevision).toBe(revisionBefore);
      expect(toastEvents.length).toBe(1);
      expect(toastEvents[0].type).toBe('error');
      expect(toastEvents[0].message).toContain('500 animation frame limit');
    });

    it('rejects duplicateFrame when project is at 500 frames: zero history, unchanged revision, toast emitted', () => {
      useStudioStore.setState({
        frames: Array.from({ length: 500 }, (_, i) =>
          createDummyFrame(`frame-${i}`, [createDummyLayer(`l-${i}`)])
        ),
        activeFrameIndex: 0,
        editRevision: 10,
        isDirty: false,
      });

      const revisionBefore = useStudioStore.getState().editRevision;
      const toastEvents: Array<{ type?: string; message?: string }> = [];
      const unsub = studioEvents.on('pixibun:toast', (t) => toastEvents.push(t));

      useStudioStore.getState().duplicateFrame(0);

      unsub();

      const stateAfter = useStudioStore.getState();
      expect(stateAfter.frames.length).toBe(500);
      expect(stateAfter.editRevision).toBe(revisionBefore);
      expect(toastEvents.length).toBe(1);
      expect(toastEvents[0].type).toBe('error');
      expect(toastEvents[0].message).toContain('500 animation frame limit');
    });

    it('rejects duplicateFrame when prospective total layers exceeds 2,000', () => {
      const frame0 = createDummyFrame(
        'f0',
        Array.from({ length: 90 }, (_, i) => createDummyLayer(`l0_${i}`))
      );
      const otherFrames = Array.from({ length: 19 }, (_, f) =>
        createDummyFrame(
          `f${f + 1}`,
          Array.from({ length: 100 }, (_, i) => createDummyLayer(`l${f + 1}_${i}`))
        )
      );
      useStudioStore.setState({
        frames: [frame0, ...otherFrames],
        activeFrameIndex: 0,
        editRevision: 10,
        isDirty: false,
      });

      const toastEvents: Array<{ type?: string; message?: string }> = [];
      const unsub = studioEvents.on('pixibun:toast', (t) => toastEvents.push(t));

      useStudioStore.getState().duplicateFrame(0);

      unsub();

      expect(useStudioStore.getState().frames.length).toBe(20);
      expect(toastEvents.length).toBe(1);
      expect(toastEvents[0].type).toBe('error');
      expect(toastEvents[0].message).toContain('total layer limit');
    });

    it('rejects mutations when aggregate raster footprint exceeds 64 MP', () => {
      useStudioStore.setState({
        canvasWidth: 2048,
        canvasHeight: 2048,
        frames: [
          createDummyFrame('f0', Array.from({ length: 16 }, (_, i) => createDummyLayer(`l_${i}`))),
        ],
        activeFrameIndex: 0,
        editRevision: 10,
        isDirty: false,
      });

      const toastEvents: Array<{ type?: string; message?: string }> = [];
      const unsub = studioEvents.on('pixibun:toast', (t) => toastEvents.push(t));

      // Attempt adding 17th layer to 2048x2048 frame
      useStudioStore.getState().addLayer('Over-budget Layer');

      unsub();

      expect(useStudioStore.getState().frames[0].layers.length).toBe(16);
      expect(toastEvents.length).toBe(1);
      expect(toastEvents[0].type).toBe('error');
      expect(toastEvents[0].message).toContain('resource complexity ceiling');
    });
  });

  describe('3. Canvas Resizing Resource Budget Guard & History Regression', () => {
    it('throws RangeError and leaves dimensions unchanged when resize exceeds 64 MP budget', () => {
      useStudioStore.setState({
        canvasWidth: 32,
        canvasHeight: 32,
        frames: [
          createDummyFrame('f0', Array.from({ length: 50 }, (_, i) => createDummyLayer(`l_${i}`))),
        ],
      });
      expect(useStudioStore.getState().canvasWidth).toBe(32);
      expect(useStudioStore.getState().canvasHeight).toBe(32);

      // Resizing to 2048x2048 with 50 layers would require 209.7 MP (>64 MP limit)
      expect(() => {
        useStudioStore.getState().setCanvasSize(2048, 2048);
      }).toThrow(RangeError);

      // Verify canvas size did NOT change
      expect(useStudioStore.getState().canvasWidth).toBe(32);
      expect(useStudioStore.getState().canvasHeight).toBe(32);
    });

    it('preserves undo/redo across large canvas resize without throwing RangeError', async () => {
      render(React.createElement(CenterViewport));

      // 1. Configure a large 16-layer canvas at 2048x2048 (exactly 64 MP, maximum permitted)
      const layers16 = Array.from({ length: 16 }, (_, i) => createDummyLayer(`layer-${i}`, `Layer ${i}`));
      useStudioStore.setState({
        canvasWidth: 2048,
        canvasHeight: 2048,
        frames: [createDummyFrame('f0', layers16)],
        activeFrameIndex: 0,
        activeLayerId: layers16[0].id,
      });

      // 2. Record structural snapshot before resizing to small canvas (32x32)
      pushStructuralHistoryStep('Resize to 32x32', {
        opKind: 'generic-structural',
        canvasWidth: 2048,
        canvasHeight: 2048,
      });
      useStudioStore.getState().setCanvasSize(32, 32, 'center', false);
      expect(useStudioStore.getState().canvasWidth).toBe(32);

      // 3. Add a 17th layer on the small canvas (32x32, 17 layers is well within 64 MP)
      useStudioStore.getState().addLayer('Layer 17');
      expect(useStudioStore.getState().frames[0].layers.length).toBe(17);

      // 4. Undo the layer addition: back to 16 layers on 32x32
      act(() => {
        studioEvents.emit('pixibun:undo');
      });
      expect(useStudioStore.getState().frames[0].layers.length).toBe(16);

      // 5. Undo the canvas resize: restores 2048x2048 with 16 layers.
      // Under the regression, setCanvasSize checked current frames against old dimensions and threw RangeError.
      // Under our atomic structural undo, validateWorkspaceStructure validates the historical 16-layer target and succeeds!
      expect(() => {
        act(() => {
          studioEvents.emit('pixibun:undo');
        });
      }).not.toThrow();

      expect(useStudioStore.getState().canvasWidth).toBe(2048);
      expect(useStudioStore.getState().canvasHeight).toBe(2048);
      expect(useStudioStore.getState().frames[0].layers.length).toBe(16);

      cleanup();
    });

    it('prevalidates structural undo target: rejects invalid target without mutating history stacks, depth, baseline, or workspace state', () => {
      render(React.createElement(CenterViewport));
      const engine = getGlobalHistoryEngine()!;
      expect(engine).toBeDefined();

      const baselineMock = {
        width: 32,
        height: 32,
        frames: [],
        activeFrameIndex: 0,
        totalBytes: 1024,
      };
      engine.setBaseline(baselineMock);

      useStudioStore.setState({
        canvasWidth: 32,
        canvasHeight: 32,
        frames: [createDummyFrame('f0', [createDummyLayer('l0')])],
        activeFrameIndex: 0,
        activeLayerId: 'l0',
      });

      // Push an over-envelope step (501 frames) onto the history engine
      const invalidFrames = Array.from({ length: 501 }, (_, i) =>
        createDummyFrame(`f${i}`, [createDummyLayer(`l${i}`)])
      );
      engine.push({
        type: 'structural',
        opKind: 'generic-structural',
        description: 'Over-envelope step',
        frameIndex: 0,
        frames: invalidFrames,
        activeFrameIndex: 0,
        activeLayerId: 'l0',
        canvasWidth: 32,
        canvasHeight: 32,
      });

      const undoDepthBefore = engine.depth;
      const canRedoBefore = engine.canRedo;
      const baselineBefore = engine.getBaseline();
      const widthBefore = useStudioStore.getState().canvasWidth;
      const frameCountBefore = useStudioStore.getState().frames.length;

      const toasts: string[] = [];
      const unsubToast = studioEvents.on('pixibun:toast', (payload) => {
        if (payload.type === 'error') toasts.push(payload.message);
      });

      // Trigger undo
      act(() => {
        studioEvents.emit('pixibun:undo');
      });

      unsubToast();

      // History stacks and baseline must be completely untouched
      expect(engine.depth).toBe(undoDepthBefore);
      expect(engine.canRedo).toBe(canRedoBefore);
      expect(engine.getBaseline()).toBe(baselineBefore);

      // Workspace state must be completely untouched
      expect(useStudioStore.getState().canvasWidth).toBe(widthBefore);
      expect(useStudioStore.getState().frames.length).toBe(frameCountBefore);

      // Exactly one error toast emitted
      expect(toasts.length).toBe(1);
      expect(toasts[0]).toContain('500 animation frame limit');

      cleanup();
    });

    it('prevalidates structural redo target: rejects invalid target without mutating history stacks, depth, baseline, or workspace state', () => {
      render(React.createElement(CenterViewport));
      const engine = getGlobalHistoryEngine()!;
      expect(engine).toBeDefined();

      const baselineMock = {
        width: 32,
        height: 32,
        frames: [],
        activeFrameIndex: 0,
        totalBytes: 1024,
      };
      engine.setBaseline(baselineMock);

      useStudioStore.setState({
        canvasWidth: 32,
        canvasHeight: 32,
        frames: [createDummyFrame('f0', [createDummyLayer('l0')])],
        activeFrameIndex: 0,
        activeLayerId: 'l0',
      });

      const invalidFrames = Array.from({ length: 501 }, (_, i) =>
        createDummyFrame(`f${i}`, [createDummyLayer(`l${i}`)])
      );
      // Push a valid initial step
      engine.push({
        type: 'structural',
        opKind: 'generic-structural',
        description: 'Valid initial step',
        frameIndex: 0,
        frames: useStudioStore.getState().frames,
        activeFrameIndex: 0,
        activeLayerId: 'l0',
        canvasWidth: 32,
        canvasHeight: 32,
      });

      // Move invalid step onto redoStack by passing it as currentState to undo
      engine.undo({
        type: 'structural',
        opKind: 'generic-structural',
        description: 'Over-envelope redo step',
        frameIndex: 0,
        frames: invalidFrames,
        activeFrameIndex: 0,
        activeLayerId: 'l0',
        canvasWidth: 32,
        canvasHeight: 32,
      });
      expect(engine.canRedo).toBe(true);
      expect(engine.peekRedo()?.description).toBe('Over-envelope redo step');

      const undoDepthBefore = engine.depth;
      const canRedoBefore = engine.canRedo;
      const baselineBefore = engine.getBaseline();
      const widthBefore = useStudioStore.getState().canvasWidth;
      const frameCountBefore = useStudioStore.getState().frames.length;

      const toasts: string[] = [];
      const unsubToast = studioEvents.on('pixibun:toast', (payload) => {
        if (payload.type === 'error') toasts.push(payload.message);
      });

      // Trigger redo
      act(() => {
        studioEvents.emit('pixibun:redo');
      });

      unsubToast();

      // History stacks and baseline must be completely untouched
      expect(engine.depth).toBe(undoDepthBefore);
      expect(engine.canRedo).toBe(canRedoBefore);
      expect(engine.getBaseline()).toBe(baselineBefore);

      // Workspace state must be completely untouched
      expect(useStudioStore.getState().canvasWidth).toBe(widthBefore);
      expect(useStudioStore.getState().frames.length).toBe(frameCountBefore);

      // Exactly one error toast emitted
      expect(toasts.length).toBe(1);
      expect(toasts[0]).toContain('500 animation frame limit');

      cleanup();
    });

    it('guards pixel-history layer recreation during redo: rejects when frame reaches 100-layer limit without mutating stacks, buffers, or state', () => {
      render(React.createElement(CenterViewport));
      const engine = getGlobalHistoryEngine()!;
      expect(engine).toBeDefined();

      const baselineMock = {
        width: 32,
        height: 32,
        frames: [],
        activeFrameIndex: 0,
        totalBytes: 1024,
      };
      engine.setBaseline(baselineMock);

      // 1. Prepare a redo step that would recreate a missing generated layer
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = 32;
      dummyCanvas.height = 32;
      const dummyCtx = dummyCanvas.getContext('2d')!;
      const dummyImageData = dummyCtx.createImageData(32, 32);

      // Push initial valid pixel step
      engine.push({
        type: 'pixel',
        layerId: 'base-layer',
        frameIndex: 0,
        imageData: dummyImageData,
        description: 'Base stroke',
      });

      // Move a generated layer pixel step onto redoStack by passing it as currentState to undo
      engine.undo({
        type: 'pixel',
        layerId: 'generated-photometric-layer',
        frameIndex: 0,
        imageData: dummyImageData,
        description: 'Photometric Rim Light',
        createdLayerId: 'generated-photometric-layer',
        createdLayerTag: 'photometric-rim',
        createdLayerIndex: 1,
      });

      expect(engine.canRedo).toBe(true);
      const pendingRedo = engine.peekRedo();
      expect(pendingRedo?.type === 'pixel' ? pendingRedo.createdLayerId : undefined).toBe('generated-photometric-layer');

      // 2. Put the target frame at the 100-layer limit
      const layers100 = Array.from({ length: 100 }, (_, i) =>
        createDummyLayer(`layer-${i}`, `Layer ${i + 1}`)
      );
      useStudioStore.setState({
        canvasWidth: 32,
        canvasHeight: 32,
        frames: [createDummyFrame('f0', layers100)],
        activeFrameIndex: 0,
        activeLayerId: layers100[0].id,
        editRevision: 5,
        isDirty: false,
      });

      // Ensure the generated layer does not exist yet and has no buffer
      expect(useStudioStore.getState().frames[0].layers.some((l) => l.id === 'generated-photometric-layer')).toBe(false);
      expect(hasBuffer('generated-photometric-layer')).toBe(false);

      const undoDepthBefore = engine.depth;
      const canRedoBefore = engine.canRedo;
      const baselineBefore = engine.getBaseline();
      const frameLayersCountBefore = useStudioStore.getState().frames[0].layers.length;
      const activeLayerBefore = useStudioStore.getState().activeLayerId;
      const revisionBefore = useStudioStore.getState().editRevision;
      const dirtyBefore = useStudioStore.getState().isDirty;

      const toasts: string[] = [];
      const unsubToast = studioEvents.on('pixibun:toast', (payload) => {
        if (payload.type === 'error') toasts.push(payload.message);
      });

      // 3. Attempt redo
      act(() => {
        studioEvents.emit('pixibun:redo');
      });

      unsubToast();

      // 4. Assert complete rejection with unchanged history and workspace state
      // History stacks and baseline untouched
      expect(engine.depth).toBe(undoDepthBefore);
      expect(engine.canRedo).toBe(canRedoBefore);
      expect(engine.getBaseline()).toBe(baselineBefore);

      // Workspace state untouched
      expect(useStudioStore.getState().frames[0].layers.length).toBe(frameLayersCountBefore);
      expect(useStudioStore.getState().frames[0].layers.some((l) => l.id === 'generated-photometric-layer')).toBe(false);
      expect(useStudioStore.getState().activeLayerId).toBe(activeLayerBefore);
      expect(useStudioStore.getState().editRevision).toBe(revisionBefore);
      expect(useStudioStore.getState().isDirty).toBe(dirtyBefore);

      // No buffer allocated
      expect(hasBuffer('generated-photometric-layer')).toBe(false);

      // Exactly one actionable error toast emitted
      expect(toasts.length).toBe(1);
      expect(toasts[0]).toContain('100 layer ceiling');

      cleanup();
    });
  });

  describe('4. Storage & Autosave Invariant Validation (db.ts)', () => {
    it('autoSaveWorkspaceDetailed returns invariant-invalid when project exceeds envelope', async () => {
      const overEnvelopeProject: ProjectFile = {
        format: PROJECT_FORMAT_ID,
        version: PROJECT_FORMAT_VERSION,
        name: 'Over Envelope Project',
        width: 32,
        height: 32,
        fps: 8,
        loopMode: 'repeat',
        onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, prevColor: '#000', nextColor: '#fff', opacity: 0.5 },
        palettes: [{ id: 'p1', name: 'Default', colors: ['#000000'] }],
        currentPaletteId: 'p1',
        customRamps: [],
        clips: [],
        // 501 frames (>500)
        frames: Array.from({ length: 501 }, (_, i) => ({
          id: `f_${i}`,
          durationMs: 100,
          layers: [{ id: `l_${i}`, name: 'Base', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }],
        })),
        createdAt: 1000,
        updatedAt: 1000,
      };

      const result = await autoSaveWorkspaceDetailed(
        'test-proj-501',
        overEnvelopeProject
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invariant-invalid');
        expect(result.error).toContain('500 animation frame limit');
      }
    });

    it('autoSaveWorkspaceDetailed preserves existing valid database record on invariant rejection', async () => {
      // 1. Save a valid project
      const validProject: ProjectFile = createBlankProjectFile('Known Good Project', 32, 32, 8);

      const saveOk = await autoSaveWorkspaceDetailed(
        'preserved-proj',
        validProject,
        undefined,
        [{ layerId: validProject.frames[0].layers[0].id, frameIndex: 0, blob: new Blob(['precious-data']) }]
      );
      expect(saveOk.ok).toBe(true);

      const recordBefore = await db.projects.get('preserved-proj');
      expect(recordBefore).toBeDefined();

      // 2. Attempt to autosave an invalid state (101 layers)
      const invalidProject: ProjectFile = {
        ...validProject,
        frames: [
          {
            id: 'f_1',
            durationMs: 100,
            layers: Array.from({ length: 101 }, (_, i) => ({
              id: `l_${i}`,
              name: `L${i}`,
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
            })),
          },
        ],
      };

      const invalidResult = await autoSaveWorkspaceDetailed(
        'preserved-proj',
        invalidProject
      );

      expect(invalidResult.ok).toBe(false);
      if (!invalidResult.ok) {
        expect(invalidResult.reason).toBe('invariant-invalid');
      }

      // 3. Database record MUST be completely intact, untouched, and matching the known-good checkpoint
      const recordAfter = await db.projects.get('preserved-proj');
      expect(recordAfter).toBeDefined();
      expect(recordAfter?.name).toBe('Known Good Project');
      expect(recordAfter?.dataJson).toBe(recordBefore?.dataJson);
      expect(recordAfter?.updatedAt).toBe(recordBefore?.updatedAt);
    });

    it('autoSaveWorkspaceDetailed rejects invalid canvas dimensions', async () => {
      const invalidDimProject: ProjectFile = {
        ...createBlankProjectFile('Invalid Dim', 32, 32, 8),
        width: 4000, // > 2048
      };
      const result = await autoSaveWorkspaceDetailed(
        'invalid-dim',
        invalidDimProject
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invariant-invalid');
      }
    });
  });

  describe('5. Invariant Inviolability: Public Actions Never Violate Project Schema', () => {
    it('verifies public action sequences maintain project schema validity', () => {
      const store = useStudioStore.getState();

      // Perform a series of additions and mutations
      store.addLayer('Layer A');
      store.addLayer('Layer B');
      store.addFrame();
      store.duplicateFrame(0);
      store.duplicateLayer(store.frames[0].layers[0].id);

      const current = useStudioStore.getState();
      const projectPayload: ProjectFile = {
        format: PROJECT_FORMAT_ID,
        version: PROJECT_FORMAT_VERSION,
        name: current.projectName,
        width: current.canvasWidth,
        height: current.canvasHeight,
        fps: current.fps,
        loopMode: current.loopMode,
        onionSkin: current.onionSkin,
        palettes: current.palettes,
        currentPaletteId: current.currentPaletteId,
        customRamps: current.customRamps,
        clips: current.clips,
        frames: current.frames,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const validation = validateProjectFile(projectPayload);
      expect(validation.ok).toBe(true);
    });
  });

  describe('6. Generated Layer Creation Capacity Protection', () => {
    it('rejects creating cast shadow layer when frame is at 100 layer limit: zero side-effects', () => {
      render(React.createElement(CenterViewport));
      useStudioStore.setState({
        frames: [
          createDummyFrame('f0', Array.from({ length: 100 }, (_, i) => createDummyLayer(`l-${i}`))),
        ],
        activeFrameIndex: 0,
        editRevision: 10,
        isDirty: false,
      });

      const revisionBefore = useStudioStore.getState().editRevision;
      const isDirtyBefore = useStudioStore.getState().isDirty;
      const toastEvents: Array<{ type?: string; message?: string }> = [];
      const unsub = studioEvents.on('pixibun:toast', (t) => toastEvents.push(t));

      act(() => {
        studioEvents.emit('pixibun:render-cast-shadow-auto', {
          shadowStyle: 'cast',
        });
      });

      unsub();
      cleanup();

      const stateAfter = useStudioStore.getState();
      expect(stateAfter.frames[0].layers.length).toBe(100);
      expect(stateAfter.editRevision).toBe(revisionBefore);
      expect(stateAfter.isDirty).toBe(isDirtyBefore);
      expect(toastEvents.length).toBe(1);
      expect(toastEvents[0].type).toBe('error');
      expect(toastEvents[0].message).toContain('100 layer ceiling');
    });

    it('rejects creating photometric layer when frame is at 100 layer limit: zero side-effects', () => {
      render(React.createElement(CenterViewport));
      const layers = Array.from({ length: 100 }, (_, i) => createDummyLayer(`l-${i}`));
      useStudioStore.setState({
        frames: [createDummyFrame('f0', layers)],
        activeFrameIndex: 0,
        activeLayerId: layers[0].id,
        editRevision: 10,
        isDirty: false,
      });

      const buf = getOrCreateBuffer(layers[0].id, 32, 32);
      const ctx = buf.canvas.getContext('2d');
      ctx?.fillRect(0, 0, 10, 10);
      touchBuffer(layers[0].id);

      const revisionBefore = useStudioStore.getState().editRevision;
      const isDirtyBefore = useStudioStore.getState().isDirty;
      const toastEvents: Array<{ type?: string; message?: string }> = [];
      const unsub = studioEvents.on('pixibun:toast', (t) => toastEvents.push(t));

      act(() => {
        studioEvents.emit('pixibun:photometric-gizmo-start', { auto: true });
      });

      unsub();
      cleanup();

      const stateAfter = useStudioStore.getState();
      expect(stateAfter.frames[0].layers.length).toBe(100);
      expect(stateAfter.editRevision).toBe(revisionBefore);
      expect(stateAfter.isDirty).toBe(isDirtyBefore);
      expect(toastEvents.length).toBe(1);
      expect(toastEvents[0].type).toBe('error');
      expect(toastEvents[0].message).toContain('100 layer ceiling');
    });
  });

  describe('7. Real Studio Image Import Route Testing (executeImageImport)', () => {
    it('rejects sheet cells larger than the canvas before mutating the project', () => {
      useStudioStore.setState({
        canvasWidth: 64,
        canvasHeight: 64,
        frames: [createDummyFrame('f0', [createDummyLayer('l0')])],
        editRevision: 4,
        isDirty: false,
      });
      const toastEvents: Array<{ type?: string; message?: string }> = [];
      const unsubToast = studioEvents.on('pixibun:toast', (event) => toastEvents.push(event));
      const result = executeImageImport({
        canvas: makeCanvas(128, 192),
        target: 'sprite-sheet-append',
        slicedFrames: [makeCanvas(128, 192)],
        extractedPalette: [],
        addToPalette: false,
        filename: 'cats.png',
      });
      unsubToast();
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/Resize the canvas/);
      expect(toastEvents).toHaveLength(1);
      expect(useStudioStore.getState().frames).toHaveLength(1);
      expect(useStudioStore.getState().editRevision).toBe(4);
      expect(useStudioStore.getState().isDirty).toBe(false);
    });

    it('sprite-sheet-replace exceeding 500 frames halts with zero side-effects', () => {
      useStudioStore.setState({
        canvasWidth: 32,
        canvasHeight: 32,
        frames: [createDummyFrame('f0', [createDummyLayer('l0')])],
        editRevision: 5,
        isDirty: false,
      });

      const revisionBefore = useStudioStore.getState().editRevision;
      const toastEvents: Array<{ type?: string; message?: string }> = [];
      let historyCleared = false;
      const unsubToast = studioEvents.on('pixibun:toast', (t) => toastEvents.push(t));
      const unsubClear = studioEvents.on('pixibun:history-clear', () => { historyCleared = true; });

      const sliced501 = Array.from({ length: 501 }, () => makeCanvas(32, 32));
      const result = executeImageImport({
        canvas: makeCanvas(32, 32),
        target: 'sprite-sheet-replace',
        slicedFrames: sliced501,
        extractedPalette: [],
        addToPalette: false,
        filename: 'sheet.png',
      });

      unsubToast();
      unsubClear();

      expect(result.ok).toBe(false);
      expect(toastEvents.length).toBe(1);
      expect(toastEvents[0].type).toBe('error');
      expect(toastEvents[0].message).toContain('500 animation frame limit');
      expect(historyCleared).toBe(false);

      const stateAfter = useStudioStore.getState();
      expect(stateAfter.frames.length).toBe(1);
      expect(stateAfter.canvasWidth).toBe(32);
      expect(stateAfter.canvasHeight).toBe(32);
      expect(stateAfter.editRevision).toBe(revisionBefore);
      expect(stateAfter.isDirty).toBe(false);
    });

    it('sprite-sheet-append exceeding 500 frames halts with zero side-effects', () => {
      useStudioStore.setState({
        canvasWidth: 32,
        canvasHeight: 32,
        frames: Array.from({ length: 498 }, (_, i) => createDummyFrame(`f${i}`, [createDummyLayer(`l${i}`)])),
        editRevision: 8,
        isDirty: false,
      });

      const toastEvents: Array<{ type?: string; message?: string }> = [];
      const unsubToast = studioEvents.on('pixibun:toast', (t) => toastEvents.push(t));

      const sliced5 = Array.from({ length: 5 }, () => makeCanvas(32, 32));
      const result = executeImageImport({
        canvas: makeCanvas(32, 32),
        target: 'sprite-sheet-append',
        slicedFrames: sliced5,
        extractedPalette: [],
        addToPalette: false,
        filename: 'append.png',
      });

      unsubToast();

      expect(result.ok).toBe(false);
      expect(toastEvents.length).toBe(1);
      expect(toastEvents[0].type).toBe('error');
      expect(toastEvents[0].message).toContain('500 animation frame limit');

      const stateAfter = useStudioStore.getState();
      expect(stateAfter.frames.length).toBe(498);
      expect(stateAfter.editRevision).toBe(8);
      expect(stateAfter.isDirty).toBe(false);
    });

    it('new-layer exceeding 100 layer ceiling halts with zero side-effects', () => {
      useStudioStore.setState({
        canvasWidth: 32,
        canvasHeight: 32,
        frames: [createDummyFrame('f0', Array.from({ length: 100 }, (_, i) => createDummyLayer(`l${i}`)))],
        activeFrameIndex: 0,
        editRevision: 12,
        isDirty: false,
      });

      const toastEvents: Array<{ type?: string; message?: string }> = [];
      const unsubToast = studioEvents.on('pixibun:toast', (t) => toastEvents.push(t));

      const result = executeImageImport({
        canvas: makeCanvas(32, 32),
        target: 'new-layer',
        extractedPalette: [],
        addToPalette: false,
        filename: 'layer.png',
      });

      unsubToast();

      expect(result.ok).toBe(false);
      expect(toastEvents.length).toBe(1);
      expect(toastEvents[0].type).toBe('error');
      expect(toastEvents[0].message).toContain('100 layer ceiling');

      const stateAfter = useStudioStore.getState();
      expect(stateAfter.frames[0].layers.length).toBe(100);
      expect(stateAfter.editRevision).toBe(12);
      expect(stateAfter.isDirty).toBe(false);
    });

    it('new-frame exceeding 500 frames halts with zero side-effects', () => {
      useStudioStore.setState({
        canvasWidth: 32,
        canvasHeight: 32,
        frames: Array.from({ length: 500 }, (_, i) => createDummyFrame(`f${i}`, [createDummyLayer(`l${i}`)])),
        activeFrameIndex: 0,
        editRevision: 15,
        isDirty: false,
      });

      const toastEvents: Array<{ type?: string; message?: string }> = [];
      const unsubToast = studioEvents.on('pixibun:toast', (t) => toastEvents.push(t));

      const result = executeImageImport({
        canvas: makeCanvas(32, 32),
        target: 'new-frame',
        extractedPalette: [],
        addToPalette: false,
        filename: 'frame.png',
      });

      unsubToast();

      expect(result.ok).toBe(false);
      expect(toastEvents.length).toBe(1);
      expect(toastEvents[0].type).toBe('error');
      expect(toastEvents[0].message).toContain('500 animation frame limit');

      const stateAfter = useStudioStore.getState();
      expect(stateAfter.frames.length).toBe(500);
      expect(stateAfter.editRevision).toBe(15);
      expect(stateAfter.isDirty).toBe(false);
    });

    it('resizeCanvasToMatch exceeding 64 MP footprint halts with zero side-effects and no history-clear', () => {
      useStudioStore.setState({
        canvasWidth: 32,
        canvasHeight: 32,
        frames: [createDummyFrame('f0', Array.from({ length: 50 }, (_, i) => createDummyLayer(`l${i}`)))],
        activeFrameIndex: 0,
        activeLayerId: 'l0',
        editRevision: 20,
        isDirty: false,
      });

      const toastEvents: Array<{ type?: string; message?: string }> = [];
      let historyCleared = false;
      const unsubToast = studioEvents.on('pixibun:toast', (t) => toastEvents.push(t));
      const unsubClear = studioEvents.on('pixibun:history-clear', () => { historyCleared = true; });

      // Resizing 50 layers to 2048x2048 = 209.7 MP (>64 MP)
      const result = executeImageImport({
        canvas: makeCanvas(2048, 2048),
        target: 'replace-layer',
        extractedPalette: [],
        addToPalette: false,
        filename: 'huge.png',
        resizeCanvasToMatch: { width: 2048, height: 2048 },
      });

      unsubToast();
      unsubClear();

      expect(result.ok).toBe(false);
      expect(toastEvents.length).toBe(1);
      expect(toastEvents[0].type).toBe('error');
      expect(toastEvents[0].message).toContain('resource complexity ceiling');
      expect(historyCleared).toBe(false);

      const stateAfter = useStudioStore.getState();
      expect(stateAfter.canvasWidth).toBe(32);
      expect(stateAfter.canvasHeight).toBe(32);
      expect(stateAfter.editRevision).toBe(20);
      expect(stateAfter.isDirty).toBe(false);
    });
  });
});
