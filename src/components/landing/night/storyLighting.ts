/**
 * The story's lamp chapter, lit by the Studio's real engines instead of a
 * stand-in: Bun is shaded by the same 2.5D lighting the Studio and the
 * cart player use (`relight`), and its floor shadow is ray-marched from the
 * sprite's distance field (`renderBoundedSpriteCastShadow`), as in the
 * lighting demo. Both are cached per 15° of lamp angle. The engines load only
 * when the story nears the lamp, so the homepage's first load stays light.
 */
import { LAMP_STEP_DEGREES, relight, snapLamp } from '@/lib/cart/relight';

const SIZE = 16;
/** The shadow stage: Bun sits at (8, 6) in a 32×32 field, as in the lighting demo. */
const STAGE = 32;
export const SHADOW_OFFSET = { x: 8, y: 6, size: STAGE };
const ELEVATION = 40;

type Engines = {
  renderBoundedSpriteCastShadow: typeof import('@/lib/graphics/shadowRayMarcher').renderBoundedSpriteCastShadow;
};

let ghost: HTMLCanvasElement | null = null;
let engines: Engines | null = null;
let edt: Float32Array | null = null;
let warming: Promise<void> | null = null;
const litPixels = new Map<number, Uint8ClampedArray>();
const shadows = new Map<string, HTMLCanvasElement>();

/** The lamp's on-screen angle (radians, 0 = right) as a light azimuth (degrees, 0 = above). */
export function storyAzimuth(lampAngle: number): number {
  return ((Math.atan2(Math.cos(lampAngle), -Math.sin(lampAngle)) * 180) / Math.PI + 360) % 360;
}

const bucket = (azimuth: number) => snapLamp({ azimuth, elevation: ELEVATION }).azimuth;

/** Start loading the engines and lighting every lamp angle once. Safe to call every frame. */
export function warmStoryLighting(pixels: { x: number; y: number; c: string }[]): void {
  if (warming || typeof document === 'undefined') return;
  warming = (async () => {
    ghost = document.createElement('canvas');
    ghost.width = SIZE; ghost.height = SIZE;
    const g = ghost.getContext('2d', { willReadFrequently: true })!;
    for (const p of pixels) { g.fillStyle = p.c; g.fillRect(p.x, p.y, 1, 1); }

    const [{ renderBoundedSpriteCastShadow }, { computeSeparableEDT }] = await Promise.all([
      import('@/lib/graphics/shadowRayMarcher'),
      import('@/lib/graphics/smartMathEngine'),
    ]);
    const stage = document.createElement('canvas');
    stage.width = STAGE; stage.height = STAGE;
    const s = stage.getContext('2d', { willReadFrequently: true })!;
    s.drawImage(ghost, SHADOW_OFFSET.x, SHADOW_OFFSET.y);
    const data = s.getImageData(0, 0, STAGE, STAGE).data;
    edt = computeSeparableEDT((x, y) => x >= 0 && y >= 0 && x < STAGE && y < STAGE && data[(y * STAGE + x) * 4 + 3] > 30, STAGE, STAGE);
    engines = { renderBoundedSpriteCastShadow };

    // Light every angle in the background, one per idle moment.
    for (let azimuth = 0; azimuth < 360; azimuth += LAMP_STEP_DEGREES) {
      const lit = await relight(ghost, { azimuth, elevation: ELEVATION });
      litPixels.set(azimuth, lit.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, SIZE, SIZE).data);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  })().catch(() => { warming = null; });
}

/** The engine's color for an art pixel under the lamp, or null until that angle is lit. */
export function litColor(azimuth: number, x: number, y: number): string | null {
  const data = litPixels.get(bucket(azimuth));
  if (!data) return null;
  const i = (y * SIZE + x) * 4;
  if (data[i + 3] === 0) return null;
  return `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`;
}

/** The ray-marched cast shadow for this lamp angle (32×32, Bun at (8, 6)), or null while loading. */
export function storyShadow(azimuth: number, ink: string): HTMLCanvasElement | null {
  if (!engines || !edt) return null;
  const key = `${bucket(azimuth)}:${ink}`;
  const hit = shadows.get(key);
  if (hit) return hit;
  const image = engines.renderBoundedSpriteCastShadow(edt, STAGE, STAGE, {
    lightAzimuth: bucket(azimuth),
    lightElevation: ELEVATION,
    shadowOpacity: 0.7,
    shadowColor: ink,
    ditherMode: '4x4',
    shadowStyle: 'cast',
    isFloating: false,
    perspectiveForeshortening: 0.55,
    volumetricDepthBias: 0.25,
  });
  const canvas = document.createElement('canvas');
  canvas.width = STAGE; canvas.height = STAGE;
  canvas.getContext('2d')!.putImageData(image, 0, 0);
  shadows.set(key, canvas);
  return canvas;
}
