import { StarterTemplate } from '@/types/landing';
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

