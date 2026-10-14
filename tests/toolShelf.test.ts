import { describe, expect, it } from 'vitest';
import { FOLD_ORDER, planShelf, shelfHeight, visibleGroups } from '@/lib/layout/toolShelf';
import { CANONICAL_TOOLS, EXTRAS_SLOT, TOOL_SLOTS } from '@/config/shortcuts';

// Audit v1.14.1: every tool group reachable at 1280×720 and 1366×657.

describe('tool shelf folding', () => {
  it('puts every tool in exactly one slot, in its own group', () => {
    const slotted = TOOL_SLOTS.flatMap(slot => slot.tools);
    expect(slotted.slice().sort()).toEqual(CANONICAL_TOOLS.map(tool => tool.id).sort());
    for (const slot of TOOL_SLOTS) {
      for (const id of slot.tools) expect(CANONICAL_TOOLS.find(tool => tool.id === id)?.group).toBe(slot.group);
    }
    expect(EXTRAS_SLOT.tools.slice().sort()).toEqual(['eyedropper', 'normal-chisel']);
  });

  it('shows every tool when there is room', () => {
    expect(planShelf(shelfHeight(new Set()))).toEqual(new Set());
    expect(planShelf(2000)).toEqual(new Set());
  });

  it('folds one stage at a time, shapes first, only as far as needed', () => {
    const full = shelfHeight(new Set());
    expect(planShelf(full - 1)).toEqual(new Set(['Geometry']));
    const afterShapes = shelfHeight(new Set(['Geometry']));
    expect(afterShapes).toBeLessThan(full);
    expect(planShelf(afterShapes - 1)).toEqual(new Set(['Geometry', 'Selection']));
    expect([...planShelf(0)]).toEqual(FOLD_ORDER);
  });

  it('fits the measured 1366×657 and 1280×720 shelves', () => {
    // Shelf heights measured in Studio at those window sizes.
    for (const available of [332, 395]) expect(shelfHeight(planShelf(available))).toBeLessThanOrEqual(available);
  });

  it('merges the eyedropper into the chisel slot only at the last stage', () => {
    expect(visibleGroups(new Set(['Geometry', 'Selection', 'Drawing']))).toContain('Utility');
    expect(visibleGroups(new Set(FOLD_ORDER))).not.toContain('Utility');
  });
});
