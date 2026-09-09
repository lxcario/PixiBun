import { StarterTemplate } from '@/types/landing';

/**
 * Shared char-to-hex palette for every starter sprite. Keys are single ASCII
 * chars so templates stay reviewable as text grids in code review.
 */
export const TEMPLATE_PALETTE: Record<string, string> = {
  o: '#3a2e4c', // deep plum ink (outlines)
  l: '#c792df', // wisteria lavender
  L: '#dcabdf', // plum lilac highlight
  p: '#664b68', // deep wisteria shadow
  f: '#ede8f4', // warm fur / paper white
  F: '#ffffff', // bright highlight white
  s: '#cdbfdf', // fur shade / soft purple
  a: '#d89a55', // deep amber edge
  A: '#f0be7c', // lamp amber glow
  w: '#fbe9c6', // warm light interior
  r: '#e08ca6', // cute blush pink
  g: '#7fae6b', // sage moss / fresh green
  k: '#1e1730', // obsidian pupil
};

const EMPTY_ROW_16 = '................';

function blankRows(): string[] {
  return [
    EMPTY_ROW_16, EMPTY_ROW_16, EMPTY_ROW_16, EMPTY_ROW_16,
    EMPTY_ROW_16, EMPTY_ROW_16, EMPTY_ROW_16, EMPTY_ROW_16,
    EMPTY_ROW_16, EMPTY_ROW_16, EMPTY_ROW_16, EMPTY_ROW_16,
    EMPTY_ROW_16, EMPTY_ROW_16, EMPTY_ROW_16, EMPTY_ROW_16,
  ];
}

function withRows(partial: Array<[number, string]>): string[] {
  const rows = blankRows();
  for (const [index, row] of partial) {
    rows[index] = row;
  }
  return rows;
}

// 1. Hearth Ghost: Adorable floating sheet ghost holding a warm hearth ember
const HEARTH_GHOST_ROWS = withRows([
  [0,  '......oooo......'],
  [1,  '....ooFFFFoo....'],
  [2,  '...oFFffffFFo...'],
  [3,  '..oFfffffffffo..'],
  [4,  '..offffffffffo..'],
  [5,  '..offooffooffo..'],
  [6,  '..offffffffffo..'],
  [7,  '..ofrffffffrfo..'],
  [8,  '.oFfffaAAafffFo.'],
  [9,  '.oFffaAwwAAafFo.'],
  [10, '..offfaAAaffso..'],
  [11, '..offfffffffso..'],
  [12, '..osssssssssso..'],
  [13, '..ofsoffsofsoo..'],
  [14, '...oo.oo..oo....'],
]);

// 2. Desk Mushroom: Fairytale polka-dot mushroom cap with cute rosy face
const MUSHROOM_ROWS = withRows([
  [1,  '.....oooooo.....'],
  [2,  '...ooLLFLLLLoo..'],
  [3,  '..oLLFFFLLFFLLo.'],
  [4,  '.oLLLFLLLLLFLLpo'],
  [5,  '.olLLLLLLLLLLLpo'],
  [6,  '.olllFFllllFFlpo'],
  [7,  '.opppFFppppFFpo.'],
  [8,  '.oooooooooooooo.'],
  [9,  '....osffffso....'],
  [10, '....osoffoso....'],
  [11, '....osroffrso...'],
  [12, '....osffffso....'],
  [13, '...oggssssggo...'],
  [14, '..oggggggggggo..'],
  [15, '...oooooooooo...'],
]);

// 3. Bun: Adorable studio mascot bunny with pink ear fluff and rosy cheeks
const BUN_ROWS = withRows([
  [0,  '...oo......oo...'],
  [1,  '..oFro....oFro..'],
  [2,  '..oFro....oFro..'],
  [3,  '..oFro....oFro..'],
  [4,  '..oFffoooooFfo..'],
  [5,  '.oFFFFFFFFFFfFo.'],
  [6,  '.oFffffffffffffo'],
  [7,  '.oFfooffffoofffo'],
  [8,  '.oFffffffffffffo'],
  [9,  '.oFfrffroffrfFfo'],
  [10, '.oFffffffffffffo'],
  [11, '..ossssssssssso.'],
  [12, '..offfofffofffo.'],
  [13, '..oFFFoFFFoFFss.'],
  [14, '...oooooooooo...'],
]);

// 4. Little Lantern: Cozy brass lantern with glass glints and warm amber glow
const LANTERN_ROWS = withRows([
  [1,  '......oooo......'],
  [2,  '.....oaaaaao....'],
  [3,  '.....oaaaaao....'],
  [4,  '...oooAAAAAooo..'],
  [5,  '..oFFFfffffFFpo.'],
  [6,  '.oFFFAAAAAAAffpo'],
  [7,  '.oFFAAwwAAAFffpo'],
  [8,  '.oFFAwwwwAAAffpo'],
  [9,  '.oFFAAwwAAAFffpo'],
  [10, '.oFFFAAAAAAAffpo'],
  [11, '.oFFFfffffFFfpo.'],
  [12, '..ooAAAAAAAAoo..'],
  [13, '...oaaaaaaaaao..'],
  [14, '..oaaaaaaaaaao..'],
  [15, '...oooooooooo...'],
]);

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'hearth-ghost',
    name: 'Hearth Ghost',
    blurb: 'A tiny ghost keeping an ember warm.',
    width: 16,
    height: 16,
    rows: HEARTH_GHOST_ROWS,
  },
  {
    id: 'mushroom',
    name: 'Little Shroom',
    blurb: "A spotted mushroom with a face you can't say no to.",
    width: 16,
    height: 16,
    rows: MUSHROOM_ROWS,
  },
  {
    id: 'bun',
    name: 'Bun',
    blurb: 'Our little studio rabbit. Usually found sitting somewhere nearby.',
    width: 16,
    height: 16,
    rows: BUN_ROWS,
  },
  {
    id: 'lantern',
    name: 'Little Lantern',
    blurb: 'A little brass lantern for late-night drawing.',
    width: 16,
    height: 16,
    rows: LANTERN_ROWS,
  },
];