import { describe, it, expect, beforeEach } from 'vitest';
import {
  PLAYGROUND_LESSONS,
  getTemplateRows,
} from '@/lib/art/playgroundLessons';
import { useStudioStore } from '@/stores/studioStore';
import { useOnboardingStore, syncStudioWithLesson } from '@/stores/onboardingStore';
import { evaluateStencilCoverage } from '@/lib/art/stencilEvaluator';
import { makeCanvas } from './helpers/mockCanvas';

describe('Playground Senior Animation Physics & Discrete Dynamics', () => {
  const bouncingBallLesson = PLAYGROUND_LESSONS.find(l => l.id === 'master-bouncing-ball')!;
  const subpixelIdleLesson = PLAYGROUND_LESSONS.find(l => l.id === 'subpixel-idle')!;
  const combatSlashLesson = PLAYGROUND_LESSONS.find(l => l.id === 'combat-slash-hitstop')!;
  const characterHopLesson = PLAYGROUND_LESSONS.find(l => l.id === 'character-hop-shock')!;
  const mochiLesson = PLAYGROUND_LESSONS.find(l => l.id === 'bouncing-mochi')!;

  beforeEach(() => {
    useOnboardingStore.getState().resetOnboarding();
  });

  describe('1. Mathematical Volume Preservation (12-Frame Bouncing Ball)', () => {
    it('exists as a 12-frame master lesson running on a 32x32 canvas at 12 FPS', () => {
      expect(bouncingBallLesson).toBeDefined();
      expect(bouncingBallLesson.canvasSize).toBe(32);
      expect(bouncingBallLesson.fps).toBe(12);
      expect(bouncingBallLesson.totalFrames).toBe(12);
      expect(bouncingBallLesson.frames.length).toBe(12);
    });

    it('strictly preserves effective pixel mass within A in [112, 114] px across all 12 keyframes', () => {
      const BASELINE_MASS = 113; // pi * 6^2 approx 113.1 px

      bouncingBallLesson.frames.forEach((frame) => {
        expect(frame.effectivePixelArea).toBeDefined();
        const area = frame.effectivePixelArea!;

        expect(area).toBeGreaterThanOrEqual(112);
        expect(area).toBeLessThanOrEqual(114);

        const deviation = Math.abs(area - BASELINE_MASS);
        expect(deviation).toBeLessThanOrEqual(1);

        const rows = getTemplateRows(frame);
        expect(rows.length).toBe(32);
        rows.forEach((row) => {
          expect(row.length).toBe(32);
        });

        // Verifiable physical count: non-dot non-shadow pixels in the actual template grid
        const actualBallPixels = rows.reduce(
          (sum, row) => sum + row.split('').filter((c) => c !== '.' && c !== 'p').length,
          0
        );
        expect(actualBallPixels).toBe(area);

        expect(frame.kineticPhase).toBeDefined();
        expect(frame.opticalTrick).toBeDefined();
      });
    });

    it('implements asymmetric timing hierarchy with apex hang and impact hitstop', () => {
      const f1Apex = bouncingBallLesson.frames[0];
      const f4Speed = bouncingBallLesson.frames[3];
      const f6Squash = bouncingBallLesson.frames[5];
      const f7Rebound = bouncingBallLesson.frames[6];

      expect(f1Apex.recommendedHoldMs).toBe(120);
      expect(f4Speed.recommendedHoldMs).toBe(50);
      expect(f6Squash.recommendedHoldMs).toBe(200);
      expect(f7Rebound.recommendedHoldMs).toBe(40);
    });
  });

  describe('2. Sub-Pixel Character Idle Breathing & Anti-Boiling', () => {
    it('maintains 100% identical outer silhouette rows between frames to prevent pixel boiling', () => {
      expect(subpixelIdleLesson).toBeDefined();
      expect(subpixelIdleLesson.frames.length).toBe(3);

      const f1Rows = getTemplateRows(subpixelIdleLesson.frames[0]);
      const f2Rows = getTemplateRows(subpixelIdleLesson.frames[1]);
      const f3Rows = getTemplateRows(subpixelIdleLesson.frames[2]);

      expect(f1Rows.length).toBe(32);
      expect(f2Rows.length).toBe(32);
      expect(f3Rows.length).toBe(32);

      expect(f1Rows[11]).toBe(f2Rows[11]);
      expect(f2Rows[11]).toBe(f3Rows[11]);
      expect(f1Rows[24]).toBe(f2Rows[24]);
      expect(f2Rows[24]).toBe(f3Rows[24]);
    });

    it('applies physiological asymmetric breathing pacing (inhale < exhale)', () => {
      const inhale = subpixelIdleLesson.frames[1].recommendedHoldMs;
      const exhale = subpixelIdleLesson.frames[2].recommendedHoldMs;

      expect(inhale).toBe(300);
      expect(exhale).toBe(550);
      expect(exhale).toBeGreaterThan(inhale);
    });
  });

  describe('3. Combat Sword Slash & 1-Frame Smear Discipline', () => {
    it('restricts the 180 deg crescent smear arc strictly to 1 frame (~40 ms)', () => {
      expect(combatSlashLesson).toBeDefined();
      const smearFrame = combatSlashLesson.frames[1];
      expect(smearFrame.kineticPhase).toBe('Action Smear');
      expect(smearFrame.recommendedHoldMs).toBe(40);

      const hitstopFrame = combatSlashLesson.frames[2];
      expect(hitstopFrame.kineticPhase).toBe('Impact Hitstop');
      expect(hitstopFrame.recommendedHoldMs).toBe(180);
    });
  });

  describe('4. Character Hop & Shock Absorption (Secondary Overlap & Ground Hitstop)', () => {
    it('exists as a 5-frame 32x32 lesson with complete anticipation-launch-apex-hitstop-settle lifecycle', () => {
      expect(characterHopLesson).toBeDefined();
      expect(characterHopLesson.canvasSize).toBe(32);
      expect(characterHopLesson.fps).toBe(10);
      expect(characterHopLesson.totalFrames).toBe(5);
      expect(characterHopLesson.frames.length).toBe(5);

      // Frame 0: Crouch anticipation
      expect(characterHopLesson.frames[0].kineticPhase).toBe('Crouch Anticipation');
      expect(characterHopLesson.frames[0].recommendedHoldMs).toBe(140);

      // Frame 1: Launch stretch
      expect(characterHopLesson.frames[1].kineticPhase).toBe('Launch Stretch');
      expect(characterHopLesson.frames[1].recommendedHoldMs).toBe(50);

      // Frame 2: Apex hang with secondary ear drag
      expect(characterHopLesson.frames[2].kineticPhase).toBe('Apex Hang');
      expect(characterHopLesson.frames[2].recommendedHoldMs).toBe(160);

      // Frame 3: Impact squash hitstop
      expect(characterHopLesson.frames[3].kineticPhase).toBe('Impact Squash (Hitstop)');
      expect(characterHopLesson.frames[3].recommendedHoldMs).toBe(180);

      // Frame 4: Sub-pixel settle
      expect(characterHopLesson.frames[4].kineticPhase).toBe('Sub-Pixel Settle');
      expect(characterHopLesson.frames[4].recommendedHoldMs).toBe(100);
    });
  });

  describe('5. Store & Timeline Synchronization', () => {
    it('dynamically adapts studio canvas size and frame durationMs when switching lessons', () => {
      syncStudioWithLesson(bouncingBallLesson);
      const studioState = useStudioStore.getState();

      expect(studioState.canvasWidth).toBe(32);
      expect(studioState.canvasHeight).toBe(32);
      expect(studioState.fps).toBe(12);
      expect(studioState.frames.length).toBeGreaterThanOrEqual(12);

      expect(studioState.frames[5].durationMs).toBe(200);

      syncStudioWithLesson(mochiLesson);
      const updatedState = useStudioStore.getState();

      expect(updatedState.canvasWidth).toBe(16);
      expect(updatedState.canvasHeight).toBe(16);
      expect(updatedState.fps).toBe(10);
    });
  });

  describe('6. Stencil Coverage Evaluator on Dynamic Grids', () => {
    it('evaluates stencil coverage accurately on a 32x32 template', () => {
      const canvas = makeCanvas(32, 32);
      const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;

      const frame1 = bouncingBallLesson.frames[0];
      const analysisEmpty = evaluateStencilCoverage(ctx, 32, 32, frame1);

      expect(analysisEmpty.totalTargetCells).toBeGreaterThan(0);
      expect(analysisEmpty.coveredOutlineCells).toBe(0);
      expect(analysisEmpty.isComplete).toBe(false);
      expect(analysisEmpty.effectivePixelArea).toBe(frame1.effectivePixelArea);
      expect(analysisEmpty.areaDeviation).toBe(-frame1.effectivePixelArea!);

      ctx.fillStyle = '#f0be7c';
      ctx.fillRect(0, 0, 32, 32);

      const analysisFull = evaluateStencilCoverage(ctx, 32, 32, frame1);
      expect(analysisFull.isComplete).toBe(true);
      expect(analysisFull.completionScore).toBe(100);
      expect(analysisFull.outlineCoverage).toBe(1.0);
    });
  });
});
