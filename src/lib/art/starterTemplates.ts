import type { StarterTemplate, TemplateId } from '@/types/landing';

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
  c: '#f2a65e', // marmalade orange
  C: '#ffd29a', // cream muzzle and belly
  h: '#c9733a', // tabby stripe
  m: '#8fd6b4', // mint slime
  M: '#c8f2dc', // mint shine
  t: '#4fa58a', // slime shade
  G: '#a8d58a', // new leaf
  d: '#4f8a4a', // leaf vein
  e: '#f3ead8', // porcelain
  E: '#c9b8a0', // porcelain shade
  u: '#7cc4e8', // teacup pattern
  y: '#6aa85c', // frog green
  Y: '#9fd27f', // frog belly light
  n: '#f2ecf7', // Bun's fur
  N: '#d9cde8', // Bun's fur shade
  i: '#f0b7cf', // Bun's inner ear
  b: '#f2b8c6', // Bun's cheeks
  v: '#faf6fc', // Bun's belly
};

// 1. Bun: the PixiBun mascot herself (bunSprite.ts), outline and all. Her
// full art is 16 rows plus outline, so one plain ear row and one plain body
// row are left out to fit the 16×16 canvas; tests/starterTemplates.test.ts
// checks every other pixel against the mascot.
const BUN_ROWS = [
  '...ooo....ooo...',
  '..oonoo..oonoo..',
  '..onnno..onnno..',
  '..onino..onino..',
  '..oninoooonino..',
  '..oonnnnnnnnoo..',
  '.oonnnnnnnnnnoo.',
  '.onnnnnnnnnnnno.',
  '.onnnonnnnonnno.',
  '.onbbonnnnobbno.',
  '.onnnnnnnnnnnno.',
  '.ooNNNNNNNNNNoo.',
  '..oNnnnnnnnnNo..',
  '..oNnnvvvvnnNo..',
  '..oNNNNNNNNNNo..',
  '..oooooooooooo..',
];

// 2. Mochi: A round marmalade cat with shiny eyes and a tiny pink nose
const MOCHI_ROWS = [
  '................',
  '..oo........oo..',
  '..oro......oro..',
  '..occoooooocco..',
  '.occhcchhcchcco.',
  '.occcccccccccco.',
  '.occkFcccckFcco.',
  '.occkkcccckkcco.',
  '.ocrcccrrcccrco.',
  '.occcCkCCkCccco.',
  '.ocCCCCkkCCCCco.',
  '.ocCCCCCCCCCCco.',
  '..ocCCCCCCCCco..',
  '...oCoCCCCoCo...',
  '....oooooooo....',
  '................',
];

// 3. Sprout: A mint slime growing its very first leaves
const SPROUT_ROWS = [
  '.......dd.......',
  '.....dGGo.dd....',
  '....dGGGdoGGd...',
  '.....dddooGd....',
  '........o.......',
  '......ooooo.....',
  '....oommMMmoo...',
  '...omMMmmmmmmo..',
  '..omMMmmmmmmmmo.',
  '..ommkFmmmkFmmo.',
  '.ommmkkmmmkkmmo.',
  '.omrmmmkkmmmrto.',
  '.ommmmmmmmmmtto.',
  '..otmmmmmmmtto..',
  '...oottttttoo...',
  '................',
];

// 4. Teacup Frog: A little frog taking a bath in a porcelain teacup
const TEACUP_FROG_ROWS = [
  '................',
  '...oooo..oooo...',
  '..oFFkko.oFFkko.',
  '..oFFkko.oFFkko.',
  '..oyyyyooyyyyo..',
  '.oyYYYYYYYYYYyo.',
  '.oyrYYYYYYYYryo.',
  '.oyYYkYYYYkYYyo.',
  '.oyYYYkkkkYYYyo.',
  '.oeeeeeeeeeeeo..',
  '.oeeeeeeeeeeeoo.',
  '.oeueueueueueoo.',
  '..oeeeeeeeeEoo..',
  '...oEEEEEEEo....',
  '..oooooooooooo..',
  '................',
];

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'bun',
    name: 'Bun',
    blurb: 'Our little studio rabbit. Usually found sitting somewhere nearby.',
    width: 16,
    height: 16,
    rows: BUN_ROWS,
  },
  {
    id: 'mochi',
    name: 'Mochi',
    blurb: 'A round marmalade cat who naps wherever the light lands.',
    width: 16,
    height: 16,
    rows: MOCHI_ROWS,
  },
  {
    id: 'sprout',
    name: 'Sprout',
    blurb: 'A mint slime growing its very first leaves.',
    width: 16,
    height: 16,
    rows: SPROUT_ROWS,
  },
  {
    id: 'teacup-frog',
    name: 'Teacup Frog',
    blurb: 'A little frog taking a warm bath in your tea.',
    width: 16,
    height: 16,
    rows: TEACUP_FROG_ROWS,
  },
];

/** Starters that were retired keep their links working: each opens one of today's friends. */
export const LEGACY_TEMPLATE_IDS: Record<string, TemplateId> = {
  'hearth-ghost': 'mochi',
  mushroom: 'sprout',
  lantern: 'teacup-frog',
};

/** The starter for an id, including retired ids from older links. */
export function findStarterTemplate(id: string): StarterTemplate | undefined {
  const current = LEGACY_TEMPLATE_IDS[id] ?? id;
  return STARTER_TEMPLATES.find(template => template.id === current);
}