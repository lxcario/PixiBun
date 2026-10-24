/**
 * Tool shelf folding. The shelf shows every tool when it fits; on shorter
 * windows it folds whole groups into flyout slots, one stage at a time, until
 * it fits: Lines & shapes first, then Selection, then Drawing, then the
 * Normal Chisel and Eyedropper share one slot, and finally every button shrinks
 * from 40px to 36px (a 1366×657 window needs that last step).
 */
import { CANONICAL_TOOLS, TOOL_SLOTS, type ToolMeta } from '@/config/shortcuts';

type Group = ToolMeta['group'];
export type FoldStage = Group | 'Extras' | 'Compact';

export const SHELF_GROUPS: Group[] = ['Drawing', 'Selection', 'Geometry', '2.5D Sculpt', 'Utility'];
export const FOLD_ORDER: FoldStage[] = ['Geometry', 'Selection', 'Drawing', 'Extras', 'Compact'];

// Matches LeftToolbar: 40px buttons (36px when compact) with 4px gaps, 16px of
// padding, and a 1px divider with 2px margins plus two 4px gaps between groups.
export const BUTTON = 40;
export const COMPACT_BUTTON = 36;
const GAP = 4;
const PADDING = 16;
const GROUP_SEPARATION = GAP + 5 + GAP;

const toolsIn = (group: Group) => CANONICAL_TOOLS.filter(tool => tool.group === group).length;
const slotsIn = (group: Group) => TOOL_SLOTS.filter(slot => slot.group === group).length;

/** The groups the shelf shows; with Extras folded, Utility joins the 2.5D slot. */
export function visibleGroups(folded: ReadonlySet<FoldStage>): Group[] {
  return folded.has('Extras') ? SHELF_GROUPS.filter(group => group !== 'Utility') : SHELF_GROUPS;
}

/** Shelf height in pixels with the given stages folded. */
export function shelfHeight(folded: ReadonlySet<FoldStage>): number {
  const button = folded.has('Compact') ? COMPACT_BUTTON : BUTTON;
  return visibleGroups(folded).reduce((height, group, index) => {
    const count = group === '2.5D Sculpt' && folded.has('Extras') ? 1 : folded.has(group) ? slotsIn(group) : toolsIn(group);
    return height + (index > 0 ? GROUP_SEPARATION : 0) + count * button + Math.max(0, count - 1) * GAP;
  }, PADDING);
}

/** The shelf's bottom padding, which may be clipped as long as the last button shows. */
const BOTTOM_PADDING = PADDING / 2;

/** The fewest stages to fold so every button fits in `available` pixels. */
export function planShelf(available: number): Set<FoldStage> {
  const folded = new Set<FoldStage>();
  for (const stage of FOLD_ORDER) {
    if (shelfHeight(folded) - BOTTOM_PADDING <= available) break;
    folded.add(stage);
  }
  return folded;
}
