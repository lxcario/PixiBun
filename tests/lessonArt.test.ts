import { describe, expect, it } from 'vitest';
import { PLAYGROUND_LESSONS, getTemplateGridSize, getTemplateRows } from '@/lib/art/playgroundLessons';
import { LESSON_PALETTE } from '@/lib/art/lessonPalette';
import { buildLessonArt } from '@/lib/art/lessonArt';
import { coachForFrame, coachForLesson, holdInWords, lessonScore, progressMessage, traceOrder } from '@/lib/art/playgroundCoach';
import type { StencilAnalysis } from '@/lib/art/stencilEvaluator';

describe('Playground lesson art', () => {
  it('paints every frame of every lesson on its canvas grid with known colors', () => {
    for (const lesson of PLAYGROUND_LESSONS) {
      expect(lesson.frames).toHaveLength(lesson.totalFrames);
      for (const frame of lesson.frames) {
        const rows = getTemplateRows(frame);
        const size = lesson.canvasSize ?? 16;
        expect(getTemplateGridSize(frame)).toBe(size);
        expect(rows).toHaveLength(size);
        for (const row of rows) {
          expect(row).toHaveLength(size);
          for (const char of row) if (char !== '.') expect(LESSON_PALETTE[char], `${lesson.id} uses "${char}"`).toBeDefined();
        }
        // A pose is a real drawing, not a few stray pixels.
        expect(rows.join('').replace(/\./g, '').length, `${lesson.id} ${frame.name}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('moves between poses: no two neighbouring frames are identical', () => {
    for (const lesson of PLAYGROUND_LESSONS) {
      lesson.frames.forEach((frame, i) => {
        const next = lesson.frames[(i + 1) % lesson.frames.length];
        if (next !== frame) expect(getTemplateRows(next).join(), `${lesson.id} frames ${i + 1} and ${i + 2}`).not.toBe(getTemplateRows(frame).join());
      });
    }
  });

  it('is deterministic', () => {
    expect(buildLessonArt()).toEqual(buildLessonArt());
  });

  it('counts each frame pixel area from its art, leaving out the ground shadow', () => {
    const ball = PLAYGROUND_LESSONS.find(l => l.id === 'master-bouncing-ball')!;
    for (const frame of ball.frames) {
      const counted = getTemplateRows(frame).join('').split('').filter(c => c !== '.' && c !== 'p').length;
      expect(frame.effectivePixelArea).toBe(counted);
    }
  });

  it('starts beginners on the smallest, shortest lesson', () => {
    expect(PLAYGROUND_LESSONS[0].id).toBe('bouncing-mochi');
    expect(coachForLesson(PLAYGROUND_LESSONS[0]).level).toBe('First steps');
  });
});

describe('Playground coaching', () => {
  it('has plain-language copy for every frame', () => {
    for (const lesson of PLAYGROUND_LESSONS) {
      const coach = coachForLesson(lesson);
      expect(coach.frames, lesson.id).toHaveLength(lesson.frames.length);
      lesson.frames.forEach((_, i) => {
        const frame = coachForFrame(lesson, i);
        expect(frame.title.length).toBeGreaterThan(2);
        expect(frame.hint).not.toMatch(/velocity|kinetic|volume|hitstop|apex|px/i);
      });
    }
  });

  it('describes timing in words', () => {
    expect(holdInWords(40)).toBe('a blink');
    expect(holdInWords(160)).toBe('a little pause');
    expect(holdInWords(550)).toBe('a long, slow hold');
  });

  it('draws the outline first, walking around the shape', () => {
    const mochi = PLAYGROUND_LESSONS[0].frames[0];
    const cells = traceOrder(mochi, LESSON_PALETTE);
    const firstInside = cells.findIndex(cell => !cell.edge);
    expect(firstInside).toBeGreaterThan(0);
    expect(cells.slice(firstInside).every(cell => !cell.edge)).toBe(true);
  });

  it('holds a drawing that spills far past the pose below a match', () => {
    const analysis = (drawn: number, covered: number, target = 40, score = 100) =>
      ({ totalDrawnPixels: drawn, coveredOutlineCells: covered, targetOutlineCells: target, completionScore: score }) as StencilAnalysis;
    expect(lessonScore(analysis(42, 40), 1)).toEqual({ score: 100, messy: false });
    expect(lessonScore(analysis(256, 40), 1)).toEqual({ score: 80, messy: true });
    expect(progressMessage(80, false, true, true)).toMatch(/eraser \(E\)/);
    expect(progressMessage(0, false, false)).not.toMatch(/\(G\)/);
  });
});
