'use client';

import React from 'react';

/**
 * Handcrafted 16-Bit Atelier Margin Shelves & Cozy Trinket Nooks
 * Clean, perfectly proportioned wooden wall shelves safely tucked into the side gutters,
 * holding adorable pixel art (Sleeping Cat, Pikachu, Bun, Ghost, Kirby, Duck, Potions, Plants).
 * Zero bottom clutter, zero text collisions, pure cozy charm.
 */

// PixiBun Official 16-Bit Studio Palette
const PALETTE: Record<string, string> = {
  o: '#3a2e4c', // deep plum outline
  k: '#1e1730', // obsidian dark / pupil
  l: '#c792df', // wisteria lavender
  L: '#dcabdf', // plum lilac highlight
  p: '#664b68', // deep wisteria shadow
  f: '#ede8f4', // warm fur / paper white
  F: '#ffffff', // bright highlight white
  s: '#cdbfdf', // fur shade / soft purple
  a: '#d89a55', // deep amber edge
  A: '#f0be7c', // lamp amber glow
  w: '#fbe9c6', // warm light interior / cream
  r: '#e08ca6', // cute blush pink
  R: '#e05868', // Pikachu cheek red / Kirby pink
  P: '#f799b6', // Kirby bright pink
  y: '#f5d342', // Pikachu yellow body / Duck yellow
  Y: '#ffe66d', // Pikachu yellow highlight
  D: '#a67215', // Pikachu brown / Duck beak orange
  g: '#7fae6b', // sage moss / fresh green
  G: '#517a42', // deep forest shadow
  b: '#4a6f9c', // cozy navy blue
  B: '#6892c4', // bright sky blue
  t: '#bf5e34', // terracotta clay
  T: '#e28256', // warm terracotta highlight
  c: '#e69550', // calico ginger orange
  C: '#f7b87e', // calico cream orange
  m: '#8a5223', // warm oak wood top
  M: '#5e3412', // oak wood face
  d: '#331908', // dark wood shadow
};

// Pre-compiled path cache for 97% fewer DOM elements
const SPRITE_PATH_CACHE = new WeakMap<string[], { color: string; d: string }[]>();

function getSpritePaths(rows: string[]): { color: string; d: string }[] {
  let cached = SPRITE_PATH_CACHE.get(rows);
  if (cached) return cached;

  const colorBuckets: Record<string, string[]> = {};
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const char = row[x];
      if (char !== '.' && PALETTE[char]) {
        if (!colorBuckets[char]) colorBuckets[char] = [];
        colorBuckets[char].push(`M${x},${y}h1v1h-1z`);
      }
    }
  }

  cached = Object.entries(colorBuckets).map(([char, paths]) => ({
    color: PALETTE[char],
    d: paths.join(' '),
  }));

  SPRITE_PATH_CACHE.set(rows, cached);
  return cached;
}

// Ultra-fast 16-Bit Pixel Matrix Renderer (Batched SVG Paths)
const PixelSprite = React.memo<{
  rows: string[];
  pixelSize?: number;
  className?: string;
}>(function PixelSprite({ rows, pixelSize = 2.4, className = '' }) {
  const height = rows.length;
  const width = rows[0]?.length || 0;
  const paths = getSpritePaths(rows);

  return (
    <svg
      width={width * pixelSize}
      height={height * pixelSize}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      className={className}
    >
      {paths.map((p, i) => (
        <path key={i} fill={p.color} d={p.d} />
      ))}
    </svg>
  );
});

// =========================================================================
// HANDCRAFTED 16-BIT PIXEL SPRITES (Everything Cute!)
// =========================================================================

// 1. Cute Mini Pikachu (16x16)
const PIKACHU_SPRITE = [
  '..ok......ko....',
  '..oyk....kyo....',
  '..oyyk..kyyo....',
  '..oyyykkyyyo....',
  '..oyyyyyyyyyk...',
  '.oyyyyyyyyyyyk..',
  '.oykyyyyyyykyo..',
  '.oYkyyyyyyykYo..',
  '.oyyRyyyyyRyyk..',
  '.oyyRyyyyyRyyk..',
  '..oyyyyyyyyyk...',
  '..oyDyyyyyDyk...',
  '..oyyyyyyyyyyk..',
  '...oyyyyyyyyk.ko',
  '....oyyyyyk...yo',
  '.....oooo....ooo',
];

// 2. Cute Curled-up Sleeping Calico Cat (16x12)
const SLEEPING_CAT_SPRITE = [
  '..oo......oo....',
  '.occo....offo...',
  '.occco..offfo...',
  'occcccffffffk...',
  'ocCccccffffffk..',
  'ocCkkffffkkffk..',
  'ocCccffffffffkoo',
  'occcrffffrfffkco',
  '.offfffffffffko.',
  '..offfffffffko..',
  '..occccccccck...',
  '...ooooooooo....',
];

// 3. Sleeping Studio Bun Loaf (16x12)
const BUN_LOAF_SPRITE = [
  '..oo......oo....',
  '.oLLo....oLLo...',
  '.oLrooooooLro...',
  'oFFFFFFFFFFFFo..',
  'oFffffffffffffo.',
  'oFfooffffoofffo.',
  'oFfrffroffrfFfo.',
  'oFffffffffffffo.',
  '.osssssssssssooo',
  '.offfofffofffoFo',
  '..oFFoFFFoFFssoo',
  '...oooooooooo...',
];

// 4. Hearth Ghost with Glowing Flame (16x16)
const GHOST_SPRITE = [
  '......oooo......',
  '....ooFFFFoo....',
  '...oFFffffFFo...',
  '..oFfffffffffo..',
  '..offffofffffo..',
  '..offooffooffo..',
  '..offffffffffo..',
  '..ofrffffffrfo..',
  '.oFfffaAAafffFo.',
  '.oFffaAwwAAafFo.',
  '..offfaAAaffso..',
  '..offfffffffso..',
  '..osssssssssso..',
  '..ofsoffsofsoo..',
  '...oo.oo..oo....',
  '................',
];

// 5. Cute Mini Kirby (16x14)
const KIRBY_SPRITE = [
  '.....oooooo.....',
  '...ooPPPPPPoo...',
  '..oPPPPPPPPPPk..',
  '.oPPPPPPPPPPPPk.',
  'okPkPkkPPkPkkPko',
  'okPkPkkPPkPkkPko',
  '.oPRRPPPPPRRPk..',
  '..oPPPPoPPPPo...',
  '..oPPPPPPPPk....',
  '.okRRkkkRRko....',
  'okRRRk.okRRRk...',
  'okRRk...okRRk...',
  '.oko.....oko....',
  '................',
];

// 6. Cute Duck with Leaf Sprout (16x14)
const DUCK_SPRITE = [
  '.....oggo.......',
  '....ogGGgo......',
  '.....oggo.......',
  '....ooooo.......',
  '...oyyyyyk......',
  '..oyyyykyyk.....',
  '.oDDyyyyyyk.....',
  '.oDDyyyyyyyk....',
  '..oyyyyyyyyyk...',
  '..oyyyyyyyyyk...',
  '...oyyyyyyyk....',
  '....okkkkkk.....',
  '....oDDoDDo.....',
  '................',
];

// 7. Desk Mushroom (16x16)
const MUSHROOM_SPRITE = [
  '.....oooooo.....',
  '...ooLLFLLLLoo..',
  '..oLLFFFLLFFLLo.',
  '.oLLLFLLLLLFLLpo',
  '.olLLLLLLLLLLLpo',
  '.olllFFllllFFlpo',
  '.opppFFppppFFpo.',
  '.oooooooooooooo.',
  '....osffffso....',
  '....osoffoso....',
  '....osroffrso...',
  '....osffffso....',
  '...oggssssggo...',
  '..oggggggggggo..',
  '...oooooooooo...',
  '................',
];

// 8. Steaming Ceramic Teacup (14x12)
const TEACUP_SPRITE = [
  '....oo....oo....',
  '...oFFo..oFFo...',
  '....oo....oo....',
  '..oooooooooooo..',
  '..oTTTTTTTTTTo..',
  '..oTFFTTTTTTTooo',
  '..ottttttttttoTo',
  '..ottttttttttoTo',
  '..oddddddddddooo',
  '..oooooooooooo..',
  '.oTTTTTTTTTTTTT.',
  '..oooooooooooo..',
];

// 9. Potted Jade Succulent (16x16)
const SUCCULENT_SPRITE = [
  '......oooo......',
  '.....oggggo.....',
  '....ogGFGggo....',
  '...oggGGggggo...',
  '..ogGggoogGggo..',
  '..ogGggoogGggo..',
  '.ogGGggoogGGggo.',
  '.oggggooogggggo.',
  '..oooooooooooo..',
  '..oTTTTTTTTTTo..',
  '..oTFFFFFFFFTo..',
  '..otttttttttto..',
  '..otttttttttto..',
  '..oddddddddddo..',
  '..oddddddddddo..',
  '...oooooooooo...',
];

// 10. Glowing Potions (16x14)
const POTIONS_SPRITE = [
  '..oo........oo..',
  '.oaaao....oaaao.',
  '..oao......oao..',
  '.oFFFo....oFFFo.',
  'oFAAAFpo.oFLLLpo',
  'oAwwAApo.oLLLLpo',
  'oAwwAApo.oLLLLpo',
  'oAAAAApo.ollllpo',
  'oppppppo.opppppo',
  'oooooooo.ooooooo',
  '................',
  '................',
  '................',
  '................',
];

// 11. Stacked Colorful Books (16x14)
const BOOKS_SPRITE = [
  '....oooooooo....',
  '...oLLLLLLLFFo..',
  '..oLllllllFFFpo.',
  '..oppppppppFFpo.',
  '..ooooooooooooo.',
  '.oAAAAAAAAAAFFo.',
  '.oAaaaaaaaaFFFo.',
  '.oAddddddddFFFo.',
  '.oooooooooooooo.',
  'oBBBBBBBBBBBFFo.',
  'oBbbbbbbbbbbFFo.',
  'oBbbbbbbbbbbFFo.',
  'oBddddddddddFFo.',
  'ooooooooooooooo.',
];

// 12. Little Brass Lantern (16x16)
const LANTERN_SPRITE = [
  '......oooo......',
  '.....oaaaaao....',
  '.....oaaaaao....',
  '...oooAAAAAooo..',
  '..oFFFfffffFFpo.',
  '.oFFFAAAAAAAffpo',
  '.oFFAAwwAAAFffpo',
  '.oFFAwwwwAAAffpo',
  '.oFFAAwwAAAFffpo',
  '.oFFFAAAAAAAffpo',
  '.oFFFfffffFFfpo.',
  '..ooAAAAAAAAoo..',
  '...oaaaaaaaaao..',
  '..oaaaaaaaaaao..',
  '...oooooooooo...',
  '................',
];

// 13. Retro Cartridges ("PIX" & "BUN") (16x14)
const CARTRIDGES_SPRITE = [
  '..oooooooooooo..',
  '.ommmmmmmmmmmmo.',
  '.omBBBBBBBBBBmo.',
  '.omBFFFFFFFFBmo.',
  '.omBBBBBBBBBBmo.',
  '.ommmmmmmmmmmmo.',
  '.oooooooooooooo.',
  'ommmmmmmmmmmmmmo',
  'omAAAAAAAAAAAAmo',
  'omAFFFFFFFFFFAmo',
  'omAAAAAAAAAAAAmo',
  'ommmmmmmmmmmmmmo',
  'omddddddddddddmo',
  '.oooooooooooooo.',
];

// 14. Sparkling Amethyst Geode (14x14)
const CRYSTAL_SPRITE = [
  '.....oo.........',
  '....oFFo..oo....',
  '...oFLLFo.oFo...',
  '..oFLLLLLoFLLo..',
  '..oLLLLLLLFLLo..',
  '.oLLLLLLLLLFLpo.',
  '.oLLpLLLLLLLppo.',
  '.olppLLpLLppppo.',
  '.opppppppppppo..',
  '..opppppppppo...',
  '..oddGddddGdo...',
  '..odGGddddGGdo..',
  '...oooooooooo...',
  '................',
];

// Refined 16-Bit Wooden Shelf Component (Memoized)
const PixelShelf = React.memo<{ width?: number }>(function PixelShelf({ width = 110 }) {
  return (
    <div className="relative">
      <svg
        width={width}
        height={18}
        viewBox={`0 0 ${width} 18`}
        shapeRendering="crispEdges"
        className="filter drop-shadow-[0_2px_4px_rgba(68,42,92,0.18)] dark:drop-shadow-[0_3px_6px_rgba(0,0,0,0.55)]"
      >
        <rect x="0" y="0" width={width} height="3" fill={PALETTE.a} />
        <rect x="0" y="0" width={width} height="1.5" fill={PALETTE.A} />
        <rect x="0" y="3" width={width} height="4" fill={PALETTE.m} />
        <rect x="0" y="7" width={width} height="2" fill={PALETTE.M} />
        <rect x="0" y="9" width={width} height="1.5" fill={PALETTE.d} />
        <rect x="0" y="10.5" width={width} height="1" fill={PALETTE.o} />

        {/* Left Iron Bracket */}
        <rect x="12" y="11" width="3" height="6" fill={PALETTE.o} />
        <rect x="12" y="15" width="8" height="2.5" fill={PALETTE.o} />

        {/* Right Iron Bracket */}
        <rect x={width - 15} y="11" width="3" height="6" fill={PALETTE.o} />
        <rect x={width - 20} y="15" width="8" height="2.5" fill={PALETTE.o} />
      </svg>
    </div>
  );
});

export const CozyAtelierShelvesBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-y-0 inset-x-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden hidden 2xl:block"
    >
      {/* ========================================================================= */}
      {/* LEFT GUTTER: Cozy Atelier Wall Shelves with Cute Pixel Companions */}
      {/* ========================================================================= */}
      <div className="absolute top-0 bottom-0 left-0 w-36 sm:w-44 md:w-52 overflow-visible pointer-events-none">

        {/* 1. HERO TOP SHELF (y = 440px): Steaming Cocoa & Sleeping Calico Cat */}
        <div className="absolute top-[440px] left-2 sm:left-4 md:left-6 lg:left-8 z-0">
          <div className="flex items-end gap-2 pb-0 pl-2">
            <div className="relative">
              <div className="absolute -top-3 left-1 animate-pixel-steam">
                <div className="w-1.5 h-1.5 bg-[#ffffff]/80 rounded-[1px]" />
              </div>
              <PixelSprite rows={TEACUP_SPRITE} pixelSize={2.2} />
            </div>
            <div className="animate-bun-breathe">
              <PixelSprite rows={SLEEPING_CAT_SPRITE} pixelSize={2.3} />
            </div>
          </div>
          <PixelShelf width={115} />
        </div>

        {/* 2. HERO MID SHELF (y = 590px): Mini Pikachu & Potted Jade Succulent */}
        <div className="absolute top-[590px] left-2 sm:left-4 md:left-6 lg:left-8 z-0">
          <div className="flex items-end gap-2.5 pb-0 pl-2">
            <PixelSprite rows={PIKACHU_SPRITE} pixelSize={2.3} />
            <PixelSprite rows={SUCCULENT_SPRITE} pixelSize={2.2} />
          </div>
          <PixelShelf width={115} />
        </div>

        {/* 3. HERO BASE SHELF (y = 740px): Cute Kirby & Stacked Books */}
        <div className="absolute top-[740px] left-2 sm:left-4 md:left-6 lg:left-8 z-0">
          <div className="flex items-end gap-2.5 pb-0 pl-2">
            <div className="animate-bun-breathe">
              <PixelSprite rows={KIRBY_SPRITE} pixelSize={2.2} />
            </div>
            <PixelSprite rows={BOOKS_SPRITE} pixelSize={2.2} />
          </div>
          <PixelShelf width={115} />
        </div>

        {/* 4. FEATURES LEVEL (y = 1180px): Glowing Potions & Desk Mushroom */}
        <div className="absolute top-[1180px] left-2 sm:left-4 md:left-6 lg:left-8 z-0">
          <div className="flex items-end gap-2.5 pb-0 pl-2">
            <PixelSprite rows={POTIONS_SPRITE} pixelSize={2.2} />
            <PixelSprite rows={MUSHROOM_SPRITE} pixelSize={2.2} />
          </div>
          <PixelShelf width={115} />
        </div>

        {/* 5. GALLERY LEVEL (y = 1900px): Sleeping Bun Loaf & Cartridges */}
        <div className="absolute top-[1900px] left-2 sm:left-4 md:left-6 lg:left-8 z-0">
          <div className="flex items-end gap-2 pb-0 pl-2">
            <div className="relative flex flex-col items-center">
              <div className="absolute -top-3 right-1 animate-sleep-z pointer-events-none">
                <span className="font-mono text-[9px] font-bold text-[#f0be7c] select-none">
                  z
                </span>
              </div>
              <div className="animate-bun-breathe">
                <PixelSprite rows={BUN_LOAF_SPRITE} pixelSize={2.2} />
              </div>
            </div>
            <PixelSprite rows={CARTRIDGES_SPRITE} pixelSize={2.2} />
          </div>
          <PixelShelf width={115} />
        </div>

        {/* 6. STORY & FOOTER LEVEL (y = 2800px): Kirby & Jade Succulent */}
        <div className="absolute top-[2800px] left-2 sm:left-4 md:left-6 lg:left-8 z-0">
          <div className="flex items-end gap-2.5 pb-0 pl-2">
            <div className="animate-bun-breathe">
              <PixelSprite rows={KIRBY_SPRITE} pixelSize={2.2} />
            </div>
            <PixelSprite rows={SUCCULENT_SPRITE} pixelSize={2.2} />
          </div>
          <PixelShelf width={115} />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT GUTTER: Cozy Atelier Wall Shelves with Cute Pixel Companions */}
      {/* ========================================================================= */}
      <div className="absolute top-0 bottom-0 right-0 w-36 sm:w-44 md:w-52 overflow-visible pointer-events-none">

        {/* 1. HERO TOP SHELF (y = 440px): Little Brass Lantern & Raw Amethyst */}
        <div className="absolute top-[440px] right-2 sm:right-4 md:right-6 lg:right-8 z-0">
          <div className="flex items-end justify-end gap-2.5 pb-0 pr-2">
            <PixelSprite rows={CRYSTAL_SPRITE} pixelSize={2.2} />
            <PixelSprite rows={LANTERN_SPRITE} pixelSize={2.2} />
          </div>
          <PixelShelf width={115} />
        </div>

        {/* 2. HERO MID SHELF (y = 590px): Cute Duck with Sprout & Desk Mushroom */}
        <div className="absolute top-[590px] right-2 sm:right-4 md:right-6 lg:right-8 z-0">
          <div className="flex items-end justify-end gap-2.5 pb-0 pr-2">
            <PixelSprite rows={MUSHROOM_SPRITE} pixelSize={2.2} />
            <PixelSprite rows={DUCK_SPRITE} pixelSize={2.3} />
          </div>
          <PixelShelf width={115} />
        </div>

        {/* 3. HERO BASE SHELF (y = 740px): Sleeping Bun Loaf & Hearth Ghost */}
        <div className="absolute top-[740px] right-2 sm:right-4 md:right-6 lg:right-8 z-0">
          <div className="flex items-end justify-end gap-2 pb-0 pr-2">
            <PixelSprite rows={GHOST_SPRITE} pixelSize={2.2} />
            <div className="relative flex flex-col items-center">
              <div className="absolute -top-3 right-1 animate-sleep-z pointer-events-none">
                <span className="font-mono text-[9px] font-bold text-[#f0be7c] select-none">
                  z
                </span>
              </div>
              <div className="animate-bun-breathe">
                <PixelSprite rows={BUN_LOAF_SPRITE} pixelSize={2.2} />
              </div>
            </div>
          </div>
          <PixelShelf width={115} />
        </div>

        {/* 4. FEATURES LEVEL (y = 1200px): Hearth Ghost & Collectible Cartridges */}
        <div className="absolute top-[1200px] right-2 sm:right-4 md:right-6 lg:right-8 z-0">
          <div className="flex items-end justify-end gap-2.5 pb-0 pr-2">
            <PixelSprite rows={GHOST_SPRITE} pixelSize={2.2} />
            <PixelSprite rows={CARTRIDGES_SPRITE} pixelSize={2.2} />
          </div>
          <PixelShelf width={115} />
        </div>

        {/* 5. GALLERY LEVEL (y = 1920px): Pikachu & Glowing Potions */}
        <div className="absolute top-[1920px] right-2 sm:right-4 md:right-6 lg:right-8 z-0">
          <div className="flex items-end justify-end gap-2.5 pb-0 pr-2">
            <PixelSprite rows={POTIONS_SPRITE} pixelSize={2.2} />
            <PixelSprite rows={PIKACHU_SPRITE} pixelSize={2.2} />
          </div>
          <PixelShelf width={115} />
        </div>

        {/* 6. STORY & FOOTER LEVEL (y = 2820px): Sleeping Calico Cat & Lantern */}
        <div className="absolute top-[2820px] right-2 sm:right-4 md:right-6 lg:right-8 z-0">
          <div className="flex items-end justify-end gap-2 pb-0 pr-2">
            <div className="animate-bun-breathe">
              <PixelSprite rows={SLEEPING_CAT_SPRITE} pixelSize={2.2} />
            </div>
            <PixelSprite rows={LANTERN_SPRITE} pixelSize={2.2} />
          </div>
          <PixelShelf width={115} />
        </div>
      </div>
    </div>
  );
};
