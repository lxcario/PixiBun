import { describe, expect, it } from 'vitest';
import { selectiveRestore } from '@/lib/engine/selectiveRestore';

const px = (...values: number[][]) => new Uint8ClampedArray(values.flat());
const EMPTY = [0, 0, 0, 0];
const MINE = [255, 0, 0, 255];
const THEIRS = [0, 0, 255, 255];
const OLD = [9, 9, 9, 255];

describe('co-draw selective restore', () => {
  it('takes back only pixels my change touched that still show my change', () => {
    const before = px(EMPTY, OLD, EMPTY, EMPTY);
    const after = px(MINE, MINE, MINE, EMPTY);
    // A partner later painted pixel 2 and pixel 3.
    const live = px(MINE, MINE, THEIRS, THEIRS);
    expect(Array.from(selectiveRestore(live, before, after))).toEqual([...EMPTY, ...OLD, ...THEIRS, ...THEIRS]);
  });

  it('matches a full restore when nobody else drew', () => {
    const before = px(EMPTY, OLD);
    const after = px(MINE, EMPTY);
    expect(Array.from(selectiveRestore(after, before, after))).toEqual(Array.from(before));
  });

  it('works for redo too: re-applies my pixels only where the undone state still holds', () => {
    const undone = px(EMPTY, EMPTY);
    const redoTo = px(MINE, MINE);
    const live = px(EMPTY, THEIRS);
    expect(Array.from(selectiveRestore(live, redoTo, undone))).toEqual([...MINE, ...THEIRS]);
  });
});
