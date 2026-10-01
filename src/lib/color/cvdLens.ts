/**
 * Perceptual Accessibility Lenses (DESIGN.md Section 12 & 13).
 *
 * CVD (Color Vision Deficiency) simulation via the Machado, Oliveira &
 * Fernandes (2009, IEEE TVCG) severity 1.0 matrices, plus the Silhouette /
 * Squint mode value-contrast transform.
 *
 * CRITICAL INVARIANT: both lenses are display-only. They transform pixel data
 * in pure functions (for tests / future canvas overlays) and are applied to
 * the viewport via CSS `filter: url(#...)` SVG feColorMatrix filters. Project
 * data, the bufferRegistry, and every export path remain 100% untouched.
 */

export type CvdLensMode =
  | 'none'
  | 'protanopia'
  | 'deuteranopia'
  | 'tritanopia'
  | 'monochromacy';

/** HUD cycle order: none -> protanopia -> deuteranopia -> tritanopia -> monochromacy -> none. */
export const CVD_LENS_MODES: readonly CvdLensMode[] = [
  'none',
  'protanopia',
  'deuteranopia',
  'tritanopia',
  'monochromacy',
];

/**
 * Machado, Oliveira & Fernandes (2009) - severity 1.0 matrices, row-major
 * (R row, G row, B row), applied to linear RGB after decoding sRGB.
 * See docs/contracts/rendering.md for attribution and transfer-function scope.
 */
export const CVD_LENS_MATRICES: Readonly<
  Record<Exclude<CvdLensMode, 'none'>, readonly [number, number, number, number, number, number, number, number, number]>
> = {
  protanopia: [
    0.152286, 1.052583, -0.204868,
    0.114503, 0.786281, 0.099216,
    -0.003882, -0.048116, 1.051998,
  ],
  deuteranopia: [
    0.367322, 0.860646, -0.227968,
    0.280085, 0.672501, 0.047413,
    -0.01182, 0.04294, 0.968881,
  ],
  tritanopia: [
    1.255528, -0.076749, -0.178779,
    -0.078411, 0.930809, 0.147602,
    0.004733, 0.691367, 0.3039,
  ],
  // Achromatopsia / monochromacy: pure Rec.709 luminance contrast validation
  // (DESIGN.md Section 12 item 4).
  monochromacy: [
    0.2126, 0.7152, 0.0722,
    0.2126, 0.7152, 0.0722,
    0.2126, 0.7152, 0.0722,
  ],
};

/** Silhouette ink color #140C1E (DESIGN.md Section 13). */
export const SQUINT_SILHOUETTE_RGB: readonly [number, number, number] = [0x14, 0x0c, 0x1e];
/** Squint mode background: solid white. */
export const SQUINT_BACKGROUND_RGB: readonly [number, number, number] = [0xff, 0xff, 0xff];

/** SVG filter element ids used by the viewport lens defs. */
export const CVD_FILTER_IDS: Readonly<Record<Exclude<CvdLensMode, 'none'>, string>> = {
  protanopia: 'pixibun-cvd-protanopia',
  deuteranopia: 'pixibun-cvd-deuteranopia',
  tritanopia: 'pixibun-cvd-tritanopia',
  monochromacy: 'pixibun-cvd-monochromacy',
};
export const SQUINT_FILTER_ID = 'pixibun-squint';

const clampByte = (v: number): number => (v <= 0 ? 0 : v >= 255 ? 255 : v);
const decodeSrgb = (byte: number): number => {
  const c = clampByte(byte) / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const encodeSrgb = (linear: number): number => {
  const c = Math.max(0, Math.min(1, linear));
  return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
};
/**
 * Decodes an sRGB triple, applies a linear RGB matrix, then encodes sRGB.
 * Pure: returns a new tuple, never mutates inputs.
 */
export function applyCvdMatrixToRgb(
  r: number,
  g: number,
  b: number,
  matrix: readonly number[]
): [number, number, number] {
  const lr = decodeSrgb(r), lg = decodeSrgb(g), lb = decodeSrgb(b);
  return [
    encodeSrgb(matrix[0] * lr + matrix[1] * lg + matrix[2] * lb),
    encodeSrgb(matrix[3] * lr + matrix[4] * lg + matrix[5] * lb),
    encodeSrgb(matrix[6] * lr + matrix[7] * lg + matrix[8] * lb),
  ];
}

/** Simulates one CVD lens mode on a single pixel. 'none' returns an unchanged copy. */
export function applyCvdLensToPixel(
  r: number,
  g: number,
  b: number,
  mode: CvdLensMode
): [number, number, number] {
  if (mode === 'none') return [r, g, b];
  return applyCvdMatrixToRgb(r, g, b, CVD_LENS_MATRICES[mode]);
}

/**
 * Simulates the CVD lens over an RGBA byte buffer. Pure: returns a NEW
 * Uint8ClampedArray; the source (e.g. canvas ImageData of project data) is
 * never mutated.
 */
export function applyCvdLensToImageData(
  data: Uint8ClampedArray,
  mode: CvdLensMode
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = applyCvdLensToPixel(data[i], data[i + 1], data[i + 2], mode);
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = data[i + 3];
  }
  return out;
}

/**
 * Silhouette transform for one pixel: every pixel with non-zero alpha becomes
 * solid #140C1E ink; alpha is preserved so the display filter composites it
 * over white. Fully transparent pixels are untouched.
 */
export function applySquintToPixel(
  r: number,
  g: number,
  b: number,
  a: number
): [number, number, number, number] {
  if (a === 0) return [r, g, b, a];
  return [SQUINT_SILHOUETTE_RGB[0], SQUINT_SILHOUETTE_RGB[1], SQUINT_SILHOUETTE_RGB[2], a];
}

/**
 * Silhouette transform over an RGBA byte buffer. Pure: returns a NEW array.
 */
export function applySquintToImageData(data: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = applySquintToPixel(data[i], data[i + 1], data[i + 2], data[i + 3]);
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = a;
  }
  return out;
}

/**
 * Serializes a 3x3 color matrix into an SVG feColorMatrix `values` attribute
 * (4 rows x 5 columns, alpha row = identity passthrough). This is the bridge
 * that keeps the GPU/display path and the tested math path on the SAME matrix
 * constants.
 */
export function feColorMatrixValues(matrix: readonly number[]): string {
  return [
    `${matrix[0]} ${matrix[1]} ${matrix[2]} 0 0`,
    `${matrix[3]} ${matrix[4]} ${matrix[5]} 0 0`,
    `${matrix[6]} ${matrix[7]} ${matrix[8]} 0 0`,
    '0 0 0 1 0',
  ].join(' ');
}

/** Cycles the HUD lens state: none -> protanopia -> ... -> monochromacy -> none. */
export function cycleCvdLens(current: CvdLensMode): CvdLensMode {
  const index = CVD_LENS_MODES.indexOf(current);
  return CVD_LENS_MODES[(index + 1) % CVD_LENS_MODES.length];
}

/**
 * Display-only CSS filter value for a viewport art surface.
 * Squint supersedes the CVD lens when both are active (a single url() filter
 * cannot stack). Returns undefined when no lens is active.
 */
export function getViewportFilterCss(mode: CvdLensMode, squintMode: boolean): string | undefined {
  if (squintMode) return `url(#${SQUINT_FILTER_ID})`;
  if (mode !== 'none') return `url(#${CVD_FILTER_IDS[mode]})`;
  return undefined;
}
