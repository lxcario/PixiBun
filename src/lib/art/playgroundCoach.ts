// Plain-language coaching for the Playground lessons. The lesson data in
// playgroundLessons.ts keeps its animation-theory names for the Teaching Board
// and tests; this file says the same thing the way a friend would.

import { getTemplateGridSize, getTemplateRows, type LessonFrameTemplate, type PlaygroundLesson } from './playgroundLessons';
import type { StencilAnalysis } from './stencilEvaluator';

export type LessonLevel = 'First steps' | 'Getting comfy' | 'Big projects';

export interface CoachFrame {
  /** A short name for the pose, e.g. "Squish!". */
  title: string;
  /** One sentence: what to draw and why it works. */
  hint: string;
}

export interface CoachLesson {
  title: string;
  blurb: string;
  /** The one idea this lesson teaches, in everyday words. */
  bigIdea: string;
  level: LessonLevel;
  frames: CoachFrame[];
}

const COACH: Record<string, CoachLesson> = {
  'bouncing-mochi': {
    title: 'Bouncy Mochi',
    blurb: 'A squishy rice cake drops, squashes and springs back up.',
    bigIdea: 'Things look longer when they move fast and flatter when they land.',
    level: 'First steps',
    frames: [
      { title: 'Floating at the top', hint: 'Draw the mochi round and relaxed. At the top of a bounce it almost stops, so this frame stays up a little longer.' },
      { title: 'Falling fast', hint: 'Make it taller and thinner as it drops. Stretching is how a picture shows speed.' },
      { title: 'Squish!', hint: 'Flatten it wide against the floor. The squash makes it feel soft and heavy.' },
      { title: 'Spring back up', hint: 'Pop it tall again as it leaves the floor, ready to float back to the top.' },
    ],
  },
  'twinkling-star': {
    title: 'Twinkling Star',
    blurb: 'A tiny spark grows into a sparkle, then fades softly.',
    bigIdea: 'Growing and shrinking a shape is enough to make it shine.',
    level: 'First steps',
    frames: [
      { title: 'A tiny spark', hint: 'Start small: just a little glowing dot in the middle.' },
      { title: 'Plus-shaped shine', hint: 'Grow four short rays, straight up, down, left and right.' },
      { title: 'Full sparkle', hint: 'Make it as big and bright as it gets. This is the twinkle.' },
      { title: 'Fade softly', hint: 'Shrink it back down so the loop can start again gently.' },
    ],
  },
  'hearth-flame': {
    title: 'Cozy Flame',
    blurb: 'A little fire that sways and sends up a spark.',
    bigIdea: 'Flames never hold still: keep the tip moving every frame.',
    level: 'First steps',
    frames: [
      { title: 'A small flame', hint: 'Start with a soft teardrop of fire sitting on the log.' },
      { title: 'Lean and rise', hint: 'Let the tip lean and reach upward, like the flame is dancing.' },
      { title: 'A spark flies off', hint: 'Pinch off a tiny ember at the top so it floats away.' },
    ],
  },
  'bun-hop': {
    title: 'Bun Hops',
    blurb: 'Bun crouches down, jumps up and lands.',
    bigIdea: 'Every jump starts by going the other way: down first, then up.',
    level: 'First steps',
    frames: [
      { title: 'Crouch down', hint: 'Squash Bun low to the ground, getting ready to push off.' },
      { title: 'Up in the air', hint: 'Bun is high and stretched, with the ears trailing behind.' },
      { title: 'Land softly', hint: 'Back on the ground, a little squashed, then ready to go again.' },
    ],
  },
  'potion-bubble': {
    title: 'Potion Bubbles',
    blurb: 'A bubble rises through a potion and pops at the top.',
    bigIdea: 'Small shapes that move a bit further each frame look like they speed up.',
    level: 'Getting comfy',
    frames: [
      { title: 'A bubble forms', hint: 'Draw a small bubble near the bottom of the potion.' },
      { title: 'Floating up', hint: 'Move it higher and let it grow a little as it rises.' },
      { title: 'Reaching the top', hint: 'The bubble pushes the surface up into a little dome.' },
      { title: 'Pop!', hint: 'Burst it into tiny droplets that fly outward.' },
    ],
  },
  'slime-glide': {
    title: 'Slime Slide',
    blurb: 'A slime stretches forward, then pulls the rest of itself along.',
    bigIdea: 'Soft creatures move in waves: the front goes first and the back catches up.',
    level: 'Getting comfy',
    frames: [
      { title: 'Resting slime', hint: 'Draw a calm, round blob sitting on the ground.' },
      { title: 'Reach forward', hint: 'Stretch the front of the slime out ahead.' },
      { title: 'Pull the back along', hint: 'Now the back slides up to catch the front.' },
      { title: 'Settle', hint: 'Let it relax back into a round blob, a little further along.' },
    ],
  },
  'water-ripple': {
    title: 'Water Ripple',
    blurb: 'A drop lands and rings spread across the water.',
    bigIdea: 'Rings that grow wider and fainter feel like they travel away.',
    level: 'Getting comfy',
    frames: [
      { title: 'A drop lands', hint: 'Draw the drop just touching the water with a little splash.' },
      { title: 'A small ring', hint: 'A tight ring appears right where the drop landed.' },
      { title: 'The ring spreads', hint: 'Make the ring wider and flatter as it moves outward.' },
      { title: 'Fading away', hint: 'Spread it wider still and let parts of it disappear.' },
    ],
  },
  'sword-slash': {
    title: 'Sword Swing',
    blurb: 'Wind up, swoosh, follow through.',
    bigIdea: 'A pause before the action makes the action feel stronger.',
    level: 'Getting comfy',
    frames: [
      { title: 'Wind up', hint: 'Raise the sword high and hold it there for a moment.' },
      { title: 'Swoosh!', hint: 'Draw the swing as one big curved blur. It only flashes by.' },
      { title: 'Follow through', hint: 'The sword keeps going a little past the swing, then stops.' },
    ],
  },
  'master-bouncing-ball': {
    title: 'The Full Bounce',
    blurb: 'Every stage of a real bounce, in twelve frames on a bigger canvas.',
    bigIdea: 'Slow near the top, fast near the floor, and a squish when it lands.',
    level: 'Big projects',
    frames: [
      { title: 'Resting at the top', hint: 'The ball hangs in the air for a moment. Keep it nice and round.' },
      { title: 'Starting to drop', hint: 'Just a little lower. Tiny moves near the top make it feel floaty.' },
      { title: 'Picking up speed', hint: 'A bigger drop this time, and the ball gets a touch taller.' },
      { title: 'Zooming down', hint: 'Stretch it tall and thin. The faster it moves, the longer it looks.' },
      { title: 'Touching the floor', hint: 'The ball just meets the ground. This frame flashes by.' },
      { title: 'Big squish', hint: 'Squash it wide and flat, and hold it so the landing really hits.' },
      { title: 'Springing up', hint: 'It shoots back up, tall and stretched again.' },
      { title: 'Rising', hint: 'Still quick and a little stretched, climbing higher.' },
      { title: 'Slowing down', hint: 'It is running out of push, so let it get rounder.' },
      { title: 'Almost at the top', hint: 'Small moves now. The ball eases into the top.' },
      { title: 'A little wobble', hint: 'A gentle wobble in shape keeps it feeling squishy and alive.' },
      { title: 'Back to the start', hint: 'Match the first frame so the loop joins up smoothly.' },
    ],
  },
  'subpixel-idle': {
    title: 'Breathing Idle',
    blurb: 'Make a character standing still look alive with tiny breaths.',
    bigIdea: 'Even a one-pixel move is enough to bring a still pose to life.',
    level: 'Big projects',
    frames: [
      { title: 'Standing still', hint: 'Draw the resting pose. This is home base for the loop.' },
      { title: 'Breathing in', hint: 'Lift the chest by a single pixel. Small is plenty.' },
      { title: 'Breathing out', hint: 'Let it sink back down. This one lingers, like a relaxed sigh.' },
    ],
  },
  'combat-slash-hitstop': {
    title: 'Power Slash',
    blurb: 'A punchy sword hit with a freeze on the impact.',
    bigIdea: 'Freezing for a moment on a hit makes it feel powerful.',
    level: 'Big projects',
    frames: [
      { title: 'Wind up', hint: 'Raise the sword high and hold. The wait builds power.' },
      { title: 'Swoosh!', hint: 'One big curved blur for the swing. It is gone in a blink.' },
      { title: 'Hit!', hint: 'Freeze on the impact and add a spark. The pause sells the hit.' },
      { title: 'Back on guard', hint: 'Ease back into a ready pose.' },
    ],
  },
  'character-hop-shock': {
    title: 'Big Hop',
    blurb: 'A full jump with a crouch, hang time and a soft landing.',
    bigIdea: 'Squash before and after a jump; stretch while flying.',
    level: 'Big projects',
    frames: [
      { title: 'Crouch down', hint: 'Squash low to get ready. Every jump starts by going down.' },
      { title: 'Launch!', hint: 'Stretch tall as the feet leave the ground.' },
      { title: 'Hang in the air', hint: 'At the top, float for a moment while the ears lag behind.' },
      { title: 'Land with a squish', hint: 'Squash on landing and hold it so the weight lands.' },
      { title: 'Settle', hint: 'Spring back up to normal size, ready for the next hop.' },
    ],
  },
};

export const LESSON_LEVELS: LessonLevel[] = ['First steps', 'Getting comfy', 'Big projects'];

export function coachForLesson(lesson: PlaygroundLesson): CoachLesson {
  const known = COACH[lesson.id];
  if (known) return known;
  return {
    title: lesson.title,
    blurb: lesson.description,
    bigIdea: lesson.concept,
    level: 'Getting comfy',
    frames: lesson.frames.map(frame => ({ title: frame.principle, hint: 'Trace the faint shape on the canvas.' })),
  };
}

export function coachForFrame(lesson: PlaygroundLesson, frameIndex: number): CoachFrame {
  const coach = coachForLesson(lesson);
  return coach.frames[frameIndex] ?? { title: `Frame ${frameIndex + 1}`, hint: 'Trace the faint shape on the canvas.' };
}

/** How long a frame stays on screen, in words. */
export function holdInWords(ms: number): string {
  if (ms <= 50) return 'a blink';
  if (ms <= 90) return 'a quick moment';
  if (ms <= 150) return 'a short beat';
  if (ms <= 250) return 'a little pause';
  return 'a long, slow hold';
}

/** Encouragement for a 0–100 tracing score. */
export function progressMessage(score: number, complete: boolean, keys = true, messy = false): string {
  const fill = keys ? 'Fill (G)' : 'Fill';
  if (complete) return 'That matches the shape. Lovely work!';
  if (messy) return `Some pixels landed outside the shape. The eraser${keys ? ' (E)' : ''} can tidy them up.`;
  if (score <= 0) return `Trace the outline with the Pen, then use ${fill} for the inside.`;
  if (score < 30) return 'Nice start! Keep following the shape.';
  if (score < 60) return `Looking good, you are about halfway. ${fill} colors a closed shape in one go.`;
  return 'So close! Fill in the last few gaps.';
}

/**
 * The lesson's score for a drawing: how much of the pose is covered, held just
 * under a match while many pixels spill outside it (a flood fill of the whole
 * canvas covers every cell but is not the pose).
 */
export function lessonScore(analysis: StencilAnalysis, cellPixels: number): { score: number; messy: boolean } {
  const stray = analysis.totalDrawnPixels - analysis.coveredOutlineCells * cellPixels;
  const messy = analysis.totalDrawnPixels > 0 && stray > Math.max(4, analysis.targetOutlineCells * cellPixels * 0.25);
  return { score: messy ? Math.min(analysis.completionScore, 80) : analysis.completionScore, messy };
}

export interface TemplateCell { x: number; y: number; color: string; edge: boolean }

/**
 * The template's filled cells in a natural drawing order: the outline first,
 * walked around the centre like a pen would, then the inside row by row.
 */
export function traceOrder(template: LessonFrameTemplate, palette: Record<string, string>): TemplateCell[] {
  const rows = getTemplateRows(template);
  const size = getTemplateGridSize(template);
  const filled = (x: number, y: number) => {
    const char = rows[y]?.[x];
    return char !== undefined && char !== '.' && Boolean(palette[char]);
  };
  const cells: TemplateCell[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!filled(x, y)) continue;
      const edge = !filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1);
      cells.push({ x, y, color: palette[rows[y][x]], edge });
    }
  }
  if (!cells.length) return cells;
  const cx = cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length;
  const cy = cells.reduce((sum, cell) => sum + cell.y, 0) / cells.length;
  const angle = (cell: TemplateCell) => (Math.atan2(cell.y - cy, cell.x - cx) + Math.PI * 2.5) % (Math.PI * 2);
  const edges = cells.filter(cell => cell.edge).sort((a, b) => angle(a) - angle(b));
  const inside = cells.filter(cell => !cell.edge);
  return [...edges, ...inside];
}

/** Cells of the template that the drawing has not reached yet (same rule as the coverage score). */
export function uncoveredCells(
  ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, template: LessonFrameTemplate,
): Array<{ x: number; y: number }> {
  const rows = getTemplateRows(template);
  const size = getTemplateGridSize(template);
  const data = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;
  const cellW = canvasWidth / size;
  const cellH = canvasHeight / size;
  const needed = Math.max(1, cellW * cellH * 0.15);
  const missing: Array<{ x: number; y: number }> = [];
  for (let gy = 0; gy < size; gy++) {
    for (let gx = 0; gx < size; gx++) {
      const char = rows[gy]?.[gx];
      if (char === undefined || char === '.') continue;
      let inked = 0;
      for (let y = Math.floor(gy * cellH); y < Math.floor((gy + 1) * cellH); y++) {
        for (let x = Math.floor(gx * cellW); x < Math.floor((gx + 1) * cellW); x++) {
          if (data[(y * canvasWidth + x) * 4 + 3] > 40) inked++;
        }
      }
      if (inked < needed) missing.push({ x: gx, y: gy });
    }
  }
  return missing;
}

/** Paint a template's cells onto a context sized to the template grid (or any multiple). */
export function paintTemplate(
  ctx: CanvasRenderingContext2D, template: LessonFrameTemplate, palette: Record<string, string>,
  width: number, height: number, tint?: string,
) {
  const rows = getTemplateRows(template);
  const size = getTemplateGridSize(template);
  const cellW = width / size;
  const cellH = height / size;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = tint ?? color;
      ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
    }
  });
}
