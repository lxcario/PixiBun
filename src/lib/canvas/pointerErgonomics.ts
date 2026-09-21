/**
 * Stylus and Pointer Ergonomics utilities for PixiBun Atelier.
 * Provides palm contact rejection, stylus barrel button eraser detection,
 * and pressure normalization according to W3C Pointer Events Level 3.
 */

export interface StylusInputEvent {
  pointerType?: string;
  button?: number;
  buttons?: number;
  pressure?: number;
  width?: number;
  height?: number;
}

export interface StylusState {
  isPen: boolean;
  isTouch: boolean;
  isMouse: boolean;
  isEraser: boolean;
  pressure: number;
  isPalmContact: boolean;
}

/**
 * Palm rejection threshold for capacitive touch screens (in CSS pixels).
 * Stylus nibs and finger tips are typically 6-18px wide. A resting palm or
 * heel-of-hand contact creates a large contact area (> 32px).
 */
export const PALM_REJECTION_THRESHOLD_PX = 32;

export function analyzePointerEvent(e: StylusInputEvent): StylusState {
  const pointerType = e.pointerType ?? 'mouse';
  const isPen = pointerType === 'pen';
  const isTouch = pointerType === 'touch';
  const isMouse = pointerType === 'mouse';

  // W3C Pointer Events Level 3:
  // - button 5 is the eraser button or inverted stylus eraser tip
  // - buttons bitmask 32 (1 << 5) indicates eraser active
  const isEraser = isPen && (e.button === 5 || ((e.buttons ?? 0) & 32) !== 0);

  // Capacitive palm contact rejection on touch screens:
  const width = e.width ?? 0;
  const height = e.height ?? 0;
  const isPalmContact = isTouch && (width > PALM_REJECTION_THRESHOLD_PX || height > PALM_REJECTION_THRESHOLD_PX);

  // Pressure normalization:
  // Mouse / uncalibrated pens default to 0.5 or 0. Bound strictly between 0 and 1.
  const rawPressure = typeof e.pressure === 'number' && Number.isFinite(e.pressure) ? e.pressure : 0.5;
  const pressure = Math.max(0, Math.min(1, rawPressure));

  return {
    isPen,
    isTouch,
    isMouse,
    isEraser,
    pressure,
    isPalmContact,
  };
}

/**
 * Optionally modulates brush size based on pen pressure when pressure dynamics are enabled.
 */
export function computeModulatedBrushSize(baseSize: number, pressure: number, enabled: boolean): number {
  if (!enabled || pressure <= 0) return Math.max(1, baseSize);
  // Modulate between 50% and 125% of nominal brush size based on pen pressure
  const modulated = Math.round(baseSize * (0.5 + pressure * 0.75));
  return Math.max(1, modulated);
}
