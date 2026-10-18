/**
 * Relighting a cart in the player: the Studio's own 2.5D lighting, run on the
 * drawing at the lamp's angle and painted over it like Auto Shade. Results are
 * cached per frame in 15° steps, so dragging the lamp around feels instant
 * after the first pass. The lighting engine loads only when the lamp is used.
 */

export const LAMP_STEP_DEGREES = 15;

const cache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();

export interface Lamp { azimuth: number; elevation: number }

/** Snap the lamp to the cache grid. */
export function snapLamp(lamp: Lamp): Lamp {
  const azimuth = (Math.round(lamp.azimuth / LAMP_STEP_DEGREES) * LAMP_STEP_DEGREES + 360) % 360;
  const elevation = Math.max(15, Math.min(75, Math.round(lamp.elevation / LAMP_STEP_DEGREES) * LAMP_STEP_DEGREES));
  return { azimuth, elevation };
}

/**
 * Where a pointer on the art puts the lamp: its direction from the center sets
 * the angle (0° is above), its distance sets how low the lamp hangs.
 */
export function lampFromPointer(dx: number, dy: number, radius: number): Lamp {
  const azimuth = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  const reach = Math.min(1, Math.hypot(dx, dy) / Math.max(1, radius));
  return { azimuth, elevation: 75 - reach * 60 };
}

/** The frame lit from `lamp`, cached. */
export async function relight(frame: HTMLCanvasElement, lamp: Lamp): Promise<HTMLCanvasElement> {
  const snapped = snapLamp(lamp);
  const key = `${snapped.azimuth}:${snapped.elevation}`;
  let byLamp = cache.get(frame);
  if (!byLamp) { byLamp = new Map(); cache.set(frame, byLamp); }
  const hit = byLamp.get(key);
  if (hit) return hit;

  const { renderParametric2p5DLighting } = await import('@/lib/graphics/math/photometricLighting');
  const lit = document.createElement('canvas');
  lit.width = frame.width; lit.height = frame.height;
  const ctx = lit.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(frame, 0, 0);
  const { shadedPixels, specularPixels } = renderParametric2p5DLighting(ctx, frame.width, frame.height, {
    azimuthDeg: snapped.azimuth,
    elevationDeg: snapped.elevation,
    shadowIntensity: 0.5,
    specularShininess: 18,
  });
  for (const pixel of [...shadedPixels, ...specularPixels]) {
    ctx.fillStyle = `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, ${pixel.a / 255})`;
    ctx.fillRect(pixel.x, pixel.y, 1, 1);
  }
  byLamp.set(key, lit);
  return lit;
}
