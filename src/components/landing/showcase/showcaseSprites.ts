import { StarterTemplate } from '@/types/landing';
import { STARTER_TEMPLATES } from '@/lib/art/starterTemplates';
import { paintTemplate } from '@/lib/render/templateRenderer';

export interface ShowcaseTemplate {
  id: string;
  name: string;
  blurb: string;
  width: number;
  height: number;
  rows: string[];
}

/**
 * Creates an offscreen canvas of the specified width and height.
 */
export function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Renders a StarterTemplate to a new HTMLCanvasElement.
 */
export function templateToCanvas(template: StarterTemplate | ShowcaseTemplate): HTMLCanvasElement {
  const canvas = createOffscreenCanvas(template.width, template.height);
  paintTemplate(canvas, template as StarterTemplate);
  return canvas;
}

/**
 * 16x16 Pixel Sword template for RotSprite rotation demo.
 */
export const SWORD_ROWS = [
  '..............oo',
  '.............oFFo',
  '............oFFfo',
  '...........oFFfo.',
  '..........oFFfo..',
  '.........oFFfo...',
  '........oFFfo....',
  '.......oFFfo.....',
  '..oo..oFFfo......',
  '.oAAooFFfo.......',
  '..oAAAfpo........',
  '...oAAoo.........',
  '..oAaoAAo........',
  '.oaao..oo........',
  '.oao.............',
  '..o..............',
];

export const SWORD_TEMPLATE: ShowcaseTemplate = {
  id: 'sword',
  name: 'Artisan Blade',
  blurb: 'A 16-bit forged sword with brass pommel.',
  width: 16,
  height: 16,
  rows: SWORD_ROWS,
};

/**
 * 4 Frames of Bun Mascot Walk & Hop Cycle for Timeline Showcase.
 */
export const BUN_WALK_FRAMES: (StarterTemplate | ShowcaseTemplate)[] = [
  // Frame 1: Rest Idle
  STARTER_TEMPLATES.find((t) => t.id === 'bun')!,
  // Frame 2: Step Left & Ears Angle
  {
    id: 'bun-walk-1',
    name: 'Bun Step Left',
    blurb: 'Left paw forward, ears swing slightly.',
    width: 16,
    height: 16,
    rows: [
      '..oo......oo....',
      '.oFro....oFro...',
      '.oFro....oFro...',
      '.oFro....oFro...',
      '..oFffoooooFfo..',
      '.oFFFFFFFFFFfFo.',
      '.oFffffffffffffo',
      '.oFfooffffoofffo',
      '.oFffffffffffffo',
      '.oFfrffroffrfFfo',
      '.oFffffffffffffo',
      '..ossssssssssso.',
      '.offfo..offfo...',
      '.oFFFo..oFFFss..',
      '..oo.....oooo...',
      '................',
    ],
  },
  // Frame 3: Mid-Hop Bounce (Body up 1px)
  {
    id: 'bun-walk-2',
    name: 'Bun Hop',
    blurb: 'Airborne bounce with ears flying high.',
    width: 16,
    height: 16,
    rows: [
      '....oo......oo..',
      '...oFro....oFro.',
      '...oFro....oFro.',
      '..oFffoooooFfo..',
      '.oFFFFFFFFFFfFo.',
      '.oFffffffffffffo',
      '.oFfooffffoofffo',
      '.oFffffffffffffo',
      '.oFfrffroffrfFfo',
      '.oFffffffffffffo',
      '..ossssssssssso.',
      '..offfofffofffo.',
      '..oFFFoFFFoFFss.',
      '...oooooooooo...',
      '................',
      '................',
    ],
  },
  // Frame 4: Step Right
  {
    id: 'bun-walk-3',
    name: 'Bun Step Right',
    blurb: 'Right paw forward, ears settle.',
    width: 16,
    height: 16,
    rows: [
      '....oo......oo..',
      '...oFro....oFro.',
      '...oFro....oFro.',
      '...oFro....oFro.',
      '..oFffoooooFfo..',
      '.oFFFFFFFFFFfFo.',
      '.oFffffffffffffo',
      '.oFfooffffoofffo',
      '.oFffffffffffffo',
      '.oFfrffroffrfFfo',
      '.oFffffffffffffo',
      '..ossssssssssso.',
      '...offfo..offfo.',
      '..ssFFFo..oFFFo.',
      '...oooo.....oo..',
      '................',
    ],
  },
];

/**
 * 4 Frames of Bun Mascot Attack / Strike Cycle for Timeline Showcase.
 */
export const BUN_ATTACK_FRAMES: (StarterTemplate | ShowcaseTemplate)[] = [
  // Frame 1: Anticipation / Crouch windup
  {
    id: 'bun-atk-0',
    name: 'Bun Windup',
    blurb: 'Crouches back, ears pinned, paw charged with spark.',
    width: 16,
    height: 16,
    rows: [
      '................',
      '....oooo..oooo..',
      '...oFrrrooFrrro.',
      '..oFffoooooFfo..',
      '.oFFFFFFFFFFfFo.',
      '.oFffffffffffffo',
      '.oFfooffffoofffo',
      '.oFffffffffffffo',
      '.oFfrffroffrfFfo',
      '.oFffffffffffffo',
      '..ossssssssssso.',
      '.offfo.oAAaoffo.',
      '.oFFFo.oAwwaFFs.',
      '..ooo...oAAaoo..',
      '.........oo.....',
      '................',
    ],
  },
  // Frame 2: Forward Dash & Thrust
  {
    id: 'bun-atk-1',
    name: 'Bun Dash Strike',
    blurb: 'Lunges forward with glowing blade spark.',
    width: 16,
    height: 16,
    rows: [
      '................',
      '...oo......oo...',
      '..oFro....oFro..',
      '..oFffoooooFfo..',
      '.oFFFFFFFFFFfFo.',
      '.oFffffffffffffo',
      '.oFfooffffoofffo',
      '.oFffffffffffffo',
      '.oFfrffroffrfFfo.oFF',
      '.oFffffffffffffffoFw',
      '..osssssssssssssfoFw',
      '...offfoofffooffooFF',
      '...oFFFssFFFssFFo...',
      '....ooooooooooo.....',
      '....................',
      '....................',
    ].map((r) => r.slice(0, 16)),
  },
  // Frame 3: Slash Arc Flare
  {
    id: 'bun-atk-2',
    name: 'Bun Slash Flare',
    blurb: 'Full golden arc energy sweep.',
    width: 16,
    height: 16,
    rows: [
      '..........oAAo..',
      '.........oAwwAo.',
      '..oo.....oAwwAo.',
      '.oFro.....oAAo..',
      '.oFffoooooo.....',
      '.oFFFFFFFFfFo...',
      '.oFfffffffffffo.',
      '.oFfooffffoofffo',
      '.oFffffffffffffo',
      '.oFfrffroffrfFfo',
      '..ossssssssssso.',
      '..offfofffofffo.',
      '..oFFFoFFFoFFss.',
      '...oooooooooo...',
      '................',
      '................',
    ],
  },
  // Frame 4: Recovery / Follow-through
  {
    id: 'bun-atk-3',
    name: 'Bun Recovery',
    blurb: 'Slowing momentum, ears swinging forward.',
    width: 16,
    height: 16,
    rows: [
      '..oo......oo....',
      '.oFro....oFro...',
      '.oFro....oFro...',
      '..oFffoooooFfo..',
      '.oFFFFFFFFFFfFo.',
      '.oFffffffffffffo',
      '.oFfooffffoofffo',
      '.oFffffffffffffo',
      '.oFfrffroffrfFfo',
      '.oFffffffffffffo',
      '..ossssssssssso.',
      '..offfofffofffo.',
      '..oFFFoFFFoFFss.',
      '...oooooooooo...',
      '................',
      '................',
    ],
  },
];

/**
 * 4 Frames of Bun Mascot Idle Breathing & Ear-Twitch Cycle.
 */
export const BUN_IDLE_FRAMES: (StarterTemplate | ShowcaseTemplate)[] = [
  // Frame 1: Standard Rest Stance
  STARTER_TEMPLATES.find((t) => t.id === 'bun')!,
  // Frame 2: Gentle Inhale (Ears perk slightly)
  {
    id: 'bun-idle-1',
    name: 'Bun Inhale',
    blurb: 'Chest rises gently, ears perk up 1px.',
    width: 16,
    height: 16,
    rows: [
      '..oo......oo....',
      '..oFro....oFro..',
      '..oFro....oFro..',
      '..oFro....oFro..',
      '..oFffoooooFfo..',
      '.oFFFFFFFFFFfFo.',
      '.oFffffffffffffo',
      '.oFfooffffoofffo',
      '.oFffffffffffffo',
      '.oFfrffroffrfFfo',
      '.oFffffffffffffo',
      '..ossssssssssso.',
      '..offfofffofffo.',
      '..oFFFoFFFoFFss.',
      '...oooooooooo...',
      '................',
    ],
  },
  // Frame 3: Ear Twitch & Cute Blink
  {
    id: 'bun-idle-2',
    name: 'Bun Ear Twitch',
    blurb: 'Right ear flicks, eyes soften happily.',
    width: 16,
    height: 16,
    rows: [
      '...oo........oo.',
      '..oFro......oFro',
      '..oFro.....oFro.',
      '..oFro....oFro..',
      '..oFffoooooFfo..',
      '.oFFFFFFFFFFfFo.',
      '.oFffffffffffffo',
      '.oFfooffffoofffo',
      '.oFffffffffffffo',
      '.oFfrffroffrfFfo',
      '.oFffffffffffffo',
      '..ossssssssssso.',
      '..offfofffofffo.',
      '..oFFFoFFFoFFss.',
      '...oooooooooo...',
      '................',
    ],
  },
  // Frame 4: Exhale & Settle
  {
    id: 'bun-idle-3',
    name: 'Bun Settle',
    blurb: 'Exhales softly, settling back to rest.',
    width: 16,
    height: 16,
    rows: [
      '...oo......oo...',
      '..oFro....oFro..',
      '..oFro....oFro..',
      '..oFro....oFro..',
      '..oFffoooooFfo..',
      '.oFFFFFFFFFFfFo.',
      '.oFffffffffffffo',
      '.oFfooffffoofffo',
      '.oFffffffffffffo',
      '.oFfrffroffrfFfo',
      '.oFffffffffffffo',
      '..ossssssssssso.',
      '..offfofffofffo.',
      '..oFFFoFFFoFFss.',
      '...oooooooooo...',
      '................',
    ],
  },
];

export interface TagClip {
  id: 'walk' | 'attack' | 'idle';
  label: string;
  tag: string;
  frames: (StarterTemplate | ShowcaseTemplate)[];
  defaultDurations: number[];
}

export const TIMELINE_TAG_CLIPS: TagClip[] = [
  {
    id: 'walk',
    label: 'Walk Cycle',
    tag: 'WALK_CYCLE',
    frames: BUN_WALK_FRAMES,
    defaultDurations: [125, 125, 125, 125],
  },
  {
    id: 'attack',
    label: 'Attack Slash',
    tag: 'ATTACK_SLASH',
    frames: BUN_ATTACK_FRAMES,
    defaultDurations: [80, 80, 125, 250],
  },
  {
    id: 'idle',
    label: 'Cozy Idle',
    tag: 'IDLE_BREATHE',
    frames: BUN_IDLE_FRAMES,
    defaultDurations: [250, 250, 125, 500],
  },
];

/**
 * Creates an authentic 64x64 Minecraft Skin texture canvas.
 * Conforms to Java / Bedrock UV layout specification.
 */
export function createMinecraftSkinCanvas(): HTMLCanvasElement {
  const canvas = createOffscreenCanvas(64, 64);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;

  // Head Base (8..24, 0..16)
  // Top / Bottom head (8..16, 0..8 and 16..24, 0..8): Hair
  ctx.fillStyle = '#4a3325'; // dark brown hair
  ctx.fillRect(8, 0, 16, 8);

  // Head Sides: Right, Front, Left, Back (0..32, 8..16)
  // Right side: Hair + skin
  ctx.fillStyle = '#4a3325';
  ctx.fillRect(0, 8, 8, 4);
  ctx.fillStyle = '#d9a07a'; // skin
  ctx.fillRect(0, 12, 8, 4);

  // Front Face (8..16, 8..16): Hair fringe, face, eyes, mouth
  ctx.fillStyle = '#4a3325';
  ctx.fillRect(8, 8, 8, 2);
  ctx.fillStyle = '#d9a07a';
  ctx.fillRect(8, 10, 8, 6);
  // Eyes
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(9, 12, 2, 1);
  ctx.fillRect(13, 12, 2, 1);
  ctx.fillStyle = '#2b4d82'; // blue pupils
  ctx.fillRect(10, 12, 1, 1);
  ctx.fillRect(13, 12, 1, 1);
  // Nose / mouth
  ctx.fillStyle = '#b87c56';
  ctx.fillRect(11, 13, 2, 1);
  ctx.fillStyle = '#613824';
  ctx.fillRect(11, 14, 2, 1);

  // Left side & Back head
  ctx.fillStyle = '#4a3325';
  ctx.fillRect(16, 8, 16, 4);
  ctx.fillStyle = '#d9a07a';
  ctx.fillRect(16, 12, 8, 4);
  ctx.fillStyle = '#4a3325';
  ctx.fillRect(24, 12, 8, 4);

  // Torso / Jacket (16..40, 16..32)
  // Cozy Teal Wool Sweater
  ctx.fillStyle = '#2f6d6d';
  ctx.fillRect(16, 16, 24, 16);
  // Gold sweater buttons & collar
  ctx.fillStyle = '#f0be7c';
  ctx.fillRect(23, 16, 2, 1);
  ctx.fillRect(23, 20, 2, 2);
  ctx.fillRect(23, 25, 2, 2);

  // Right Arm (40..56, 16..32)
  ctx.fillStyle = '#2f6d6d';
  ctx.fillRect(40, 16, 16, 10);
  ctx.fillStyle = '#d9a07a'; // Hand
  ctx.fillRect(40, 26, 16, 6);

  // Left Arm (32..48, 48..64)
  ctx.fillStyle = '#2f6d6d';
  ctx.fillRect(32, 48, 16, 10);
  ctx.fillStyle = '#d9a07a'; // Hand
  ctx.fillRect(32, 58, 16, 6);

  // Right Leg (0..16, 16..32)
  ctx.fillStyle = '#2c334d'; // Navy jeans
  ctx.fillRect(0, 16, 16, 12);
  ctx.fillStyle = '#5c3924'; // Leather boots
  ctx.fillRect(0, 28, 16, 4);

  // Left Leg (16..32, 48..64)
  ctx.fillStyle = '#2c334d'; // Navy jeans
  ctx.fillRect(16, 48, 16, 12);
  ctx.fillStyle = '#5c3924'; // Leather boots
  ctx.fillRect(16, 60, 16, 4);

  // Outer Hat / Headwear layer (32..64, 0..16)
  // Cute flower crown / bandana
  ctx.fillStyle = '#dcabdf';
  ctx.fillRect(36, 10, 4, 2);
  ctx.fillStyle = '#f0be7c';
  ctx.fillRect(44, 10, 4, 2);

  return canvas;
}

/**
 * Creates a high-detail 64x64 Scenic Sunset Mountain canvas for the image downsampling demo.
 */
export function createScenicCanvas(): HTMLCanvasElement {
  const canvas = createOffscreenCanvas(64, 64);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Sunset Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 36);
  skyGrad.addColorStop(0, '#532959'); // Deep Plum twilight
  skyGrad.addColorStop(0.4, '#a24b6e'); // Rosy Magenta
  skyGrad.addColorStop(0.7, '#e87e51'); // Warm Amber Tangerine
  skyGrad.addColorStop(1, '#fed476'); // Golden Horizon
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 64, 38);

  // Glowing Sun
  ctx.fillStyle = '#fffdf0';
  ctx.beginPath();
  ctx.arc(38, 22, 9, 0, Math.PI * 2);
  ctx.fill();

  // Distant Mountain Peaks (Purple silhouette)
  ctx.fillStyle = '#5a3d68';
  ctx.beginPath();
  ctx.moveTo(0, 36);
  ctx.lineTo(14, 22);
  ctx.lineTo(26, 32);
  ctx.lineTo(42, 18);
  ctx.lineTo(54, 28);
  ctx.lineTo(64, 20);
  ctx.lineTo(64, 40);
  ctx.lineTo(0, 40);
  ctx.closePath();
  ctx.fill();

  // Mountain Snowcaps
  ctx.fillStyle = '#ede8f4';
  ctx.beginPath();
  ctx.moveTo(14, 22);
  ctx.lineTo(11, 26);
  ctx.lineTo(17, 26);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(42, 18);
  ctx.lineTo(37, 24);
  ctx.lineTo(46, 23);
  ctx.closePath();
  ctx.fill();

  // Midground Forest Hills
  ctx.fillStyle = '#2f3d43';
  ctx.beginPath();
  ctx.moveTo(0, 40);
  ctx.lineTo(20, 34);
  ctx.lineTo(48, 38);
  ctx.lineTo(64, 33);
  ctx.lineTo(64, 52);
  ctx.lineTo(0, 52);
  ctx.closePath();
  ctx.fill();

  // Stylized Pine Trees
  const drawTree = (x: number, y: number, h: number) => {
    ctx.fillStyle = '#1e292d';
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x - h * 0.45, y);
    ctx.lineTo(x + h * 0.45, y);
    ctx.closePath();
    ctx.fill();
  };

  drawTree(8, 48, 12);
  drawTree(14, 46, 14);
  drawTree(22, 50, 11);
  drawTree(44, 47, 13);
  drawTree(52, 49, 15);
  drawTree(58, 46, 12);

  // Foreground Lake / Water with Reflections
  const waterGrad = ctx.createLinearGradient(0, 48, 0, 64);
  waterGrad.addColorStop(0, '#23384a');
  waterGrad.addColorStop(1, '#151e2e');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, 48, 64, 16);

  // Golden Sun Water Shimmer
  ctx.fillStyle = 'rgba(254, 212, 118, 0.7)';
  ctx.fillRect(35, 50, 6, 1);
  ctx.fillRect(34, 52, 8, 1);
  ctx.fillRect(36, 54, 5, 1);
  ctx.fillRect(33, 57, 9, 1);
  ctx.fillRect(35, 60, 6, 1);

  return canvas;
}

/**
 * Creates a cozy 64x64 Lamplit Atelier Desk Scene for image downsampling demo.
 */
export function createInteriorCanvas(): HTMLCanvasElement {
  const canvas = createOffscreenCanvas(64, 64);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Dark Plum Wood Paneling Wall
  const wallGrad = ctx.createLinearGradient(0, 0, 0, 48);
  wallGrad.addColorStop(0, '#2b1f3d');
  wallGrad.addColorStop(1, '#44315c');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, 64, 48);

  // Vertical wood panel grooves
  ctx.fillStyle = '#1e152d';
  for (let x = 8; x < 64; x += 8) {
    ctx.fillRect(x, 0, 1, 48);
  }

  // 2. Stone Fireplace / Hearth on Left (x: 0..26, y: 16..48)
  ctx.fillStyle = '#191226';
  ctx.fillRect(2, 16, 24, 32);
  ctx.fillStyle = '#3a2e4c';
  ctx.fillRect(4, 18, 20, 30);
  // Fireplace interior chamber
  ctx.fillStyle = '#0f0a17';
  ctx.fillRect(7, 26, 14, 22);

  // Warm Fireplace Fire Embers (Red/Amber/Gold)
  const fireGrad = ctx.createRadialGradient(14, 40, 1, 14, 40, 10);
  fireGrad.addColorStop(0, '#ffffff');
  fireGrad.addColorStop(0.2, '#fed476');
  fireGrad.addColorStop(0.5, '#e87e51');
  fireGrad.addColorStop(1, '#661f36');
  ctx.fillStyle = fireGrad;
  ctx.beginPath();
  ctx.arc(14, 40, 7, 0, Math.PI * 2);
  ctx.fill();

  // Floating Fire Spurt
  ctx.fillStyle = '#fed476';
  ctx.fillRect(13, 31, 2, 3);
  ctx.fillRect(15, 33, 2, 2);

  // 3. Wooden Atelier Desk (x: 28..64, y: 34..48)
  ctx.fillStyle = '#614131';
  ctx.fillRect(28, 34, 36, 14);
  ctx.fillStyle = '#875c43'; // Desk top highlight
  ctx.fillRect(28, 34, 36, 2);

  // 4. Glowing Brass Desk Lamp (x: 50, y: 18)
  ctx.fillStyle = '#a67c48';
  ctx.fillRect(52, 26, 2, 8); // Lamp stand
  ctx.fillRect(48, 33, 8, 2); // Lamp base
  ctx.fillStyle = '#f0be7c'; // Lamp hood
  ctx.fillRect(48, 22, 10, 5);

  // Radial Lamp Glow Bulb
  const lampGlow = ctx.createRadialGradient(53, 24, 1, 53, 24, 16);
  lampGlow.addColorStop(0, 'rgba(255, 255, 230, 0.9)');
  lampGlow.addColorStop(0.4, 'rgba(240, 190, 124, 0.45)');
  lampGlow.addColorStop(1, 'rgba(240, 190, 124, 0)');
  ctx.fillStyle = lampGlow;
  ctx.beginPath();
  ctx.arc(53, 24, 16, 0, Math.PI * 2);
  ctx.fill();

  // 5. Hardwood Floor (y: 48..64)
  const floorGrad = ctx.createLinearGradient(0, 48, 0, 64);
  floorGrad.addColorStop(0, '#241a27');
  floorGrad.addColorStop(1, '#18101a');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, 48, 64, 16);

  // Floor plank lines
  ctx.fillStyle = '#0f0a12';
  ctx.fillRect(0, 53, 64, 1);
  ctx.fillRect(0, 59, 64, 1);

  return canvas;
}

