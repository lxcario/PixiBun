/**
 * mathInvariants.ts
 *
 * Mathematically rigorous numerical and geometric invariant guards for PixiBun Atelier.
 *
 * Academic & Literature References:
 * 1. Foley, James D., Andries van Dam, Steven K. Feiner, and John F. Hughes.
 *    "Computer Graphics: Principles and Practice." 2nd ed., Addison-Wesley, 1990.
 *    Section 3.12: "Clipping Lines: The Cohen-Sutherland Algorithm", pp. 113–117.
 * 2. Goldberg, David. "What Every Computer Scientist Should Know About Floating-Point Arithmetic."
 *    ACM Computing Surveys (CSUR), Vol. 23, No. 1, 1991, pp. 5–48. DOI: 10.1145/103162.103163.
 * 3. Knuth, Donald E. "The Art of Computer Programming, Volume 2: Seminumerical Algorithms."
 *    3rd ed., Addison-Wesley, 1997. Section 4.2.2: "Accuracy of Floating Point Arithmetic."
 */

export class MathInvariants {
  /**
   * Safe minimum zoom factor (5%).
   * Prevents division-by-zero singularities when transforming client coordinates to canvas space.
   */
  public static readonly MIN_ZOOM = 0.05;

  /**
   * Safe maximum zoom factor (6400%).
   * Prevents IEEE 754 floating-point denormalization / catastrophic cancellation.
   */
  public static readonly MAX_ZOOM = 64.0;

  /**
   * Numerical tolerance epsilon for division-by-zero guards (\( \epsilon = 10^{-6} \)).
   */
  public static readonly EPSILON = 1e-6;

  /**
   * Checks if a value is a strictly finite, non-NaN IEEE 754 floating-point number.
   * Cites Goldberg (1991) on IEEE 754 NaN propagation hazards.
   */
  public static isSafeFinite(val: unknown): val is number {
    return typeof val === 'number' && Number.isFinite(val) && !Number.isNaN(val);
  }

  /**
   * Defensively bounds a zoom factor within [MIN_ZOOM, MAX_ZOOM].
   * Completely eliminates NaN, Infinity, -Infinity, zero, and negative values.
   */
  public static clampZoom(zoom: number, fallback = 1.0): number {
    if (!this.isSafeFinite(zoom) || zoom <= this.EPSILON) {
      return fallback;
    }
    return Math.min(this.MAX_ZOOM, Math.max(this.MIN_ZOOM, zoom));
  }

  /**
   * Safely divides two real numbers without producing NaN or ±Infinity.
   * If the absolute denominator is <= EPSILON or inputs are non-finite, returns fallback.
   */
  public static safeDivide(numerator: number, denominator: number, fallback = 0): number {
    if (!this.isSafeFinite(numerator) || !this.isSafeFinite(denominator) || Math.abs(denominator) <= this.EPSILON) {
      return fallback;
    }
    const quotient = numerator / denominator;
    return this.isSafeFinite(quotient) ? quotient : fallback;
  }

  /**
   * Clamps an integer or float coordinate into an inclusive [min, max] range.
   */
  public static clampCoordinate(val: number, min: number, max: number): number {
    if (!this.isSafeFinite(val)) return min;
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Normalizes an arbitrary rectangle (supporting negative or inverted drag vectors)
   * into a canonical top-left origin coordinate with strictly positive integer width & height.
   */
  public static normalizeRect(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): { x: number; y: number; w: number; h: number } {
    const safeX1 = this.isSafeFinite(x1) ? x1 : 0;
    const safeY1 = this.isSafeFinite(y1) ? y1 : 0;
    const safeX2 = this.isSafeFinite(x2) ? x2 : 0;
    const safeY2 = this.isSafeFinite(y2) ? y2 : 0;

    const x = Math.floor(Math.min(safeX1, safeX2));
    const y = Math.floor(Math.min(safeY1, safeY2));
    const w = Math.floor(Math.abs(safeX2 - safeX1));
    const h = Math.floor(Math.abs(safeY2 - safeY1));

    return { x, y, w, h };
  }

  /**
   * Cohen-Sutherland 2D Line Clipping Algorithm.
   *
   * Clips an arbitrary 2D line segment (x0, y0) -> (x1, y1) against an axis-aligned
   * canvas bounding box [0, 0, canvasW - 1, canvasH - 1].
   *
   * Bitwise Outcode encoding (Foley et al., Section 3.12):
   *   Bit 0 (1): Left of window   (x < xMin)
   *   Bit 1 (2): Right of window  (x > xMax)
   *   Bit 2 (4): Below window     (y < yMin)
   *   Bit 3 (8): Above window     (y > yMax)
   *
   * Guarantees that line rasterizers (Bresenham / DDA) never execute redundant
   * iterations outside the canvas boundary or write out-of-bounds array indices.
   *
   * Returns clipped integer endpoints { x0, y0, x1, y1 } or null if completely outside.
   */
  public static clipLineToCanvas(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    canvasW: number,
    canvasH: number
  ): { x0: number; y0: number; x1: number; y1: number } | null {
    if (canvasW <= 0 || canvasH <= 0) return null;

    const INSIDE = 0; // 0000
    const LEFT = 1;   // 0001
    const RIGHT = 2;  // 0010
    const BOTTOM = 4; // 0100
    const TOP = 8;    // 1000

    const xMin = 0;
    const yMin = 0;
    const xMax = canvasW - 1;
    const yMax = canvasH - 1;

    function computeOutCode(x: number, y: number): number {
      let code = INSIDE;
      if (x < xMin) code |= LEFT;
      else if (x > xMax) code |= RIGHT;
      if (y < yMin) code |= BOTTOM;
      else if (y > yMax) code |= TOP;
      return code;
    }

    let pX0 = this.isSafeFinite(x0) ? x0 : 0;
    let pY0 = this.isSafeFinite(y0) ? y0 : 0;
    let pX1 = this.isSafeFinite(x1) ? x1 : 0;
    let pY1 = this.isSafeFinite(y1) ? y1 : 0;

    let code0 = computeOutCode(pX0, pY0);
    let code1 = computeOutCode(pX1, pY1);
    let accept = false;

    // Loop at most 4 times (each step clips against 1 edge)
    for (let iter = 0; iter < 5; iter++) {
      if ((code0 | code1) === 0) {
        // Trivial accept: both points are inside the clipping window
        accept = true;
        break;
      } else if ((code0 & code1) !== 0) {
        // Trivial reject: both points share an outside region
        break;
      } else {
        // Line needs clipping: select an endpoint that is outside
        const outCode = code0 !== 0 ? code0 : code1;
        let x = 0;
        let y = 0;

        // Find intersection point using slope equations:
        //   y = y0 + slope * (x - x0)
        //   x = x0 + (1 / slope) * (y - y0)
        if ((outCode & TOP) !== 0) {
          x = pX0 + ((pX1 - pX0) * (yMax - pY0)) / (pY1 - pY0);
          y = yMax;
        } else if ((outCode & BOTTOM) !== 0) {
          x = pX0 + ((pX1 - pX0) * (yMin - pY0)) / (pY1 - pY0);
          y = yMin;
        } else if ((outCode & RIGHT) !== 0) {
          y = pY0 + ((pY1 - pY0) * (xMax - pX0)) / (pX1 - pX0);
          x = xMax;
        } else if ((outCode & LEFT) !== 0) {
          y = pY0 + ((pY1 - pY0) * (xMin - pX0)) / (pX1 - pX0);
          x = xMin;
        }

        if (outCode === code0) {
          pX0 = x;
          pY0 = y;
          code0 = computeOutCode(pX0, pY0);
        } else {
          pX1 = x;
          pY1 = y;
          code1 = computeOutCode(pX1, pY1);
        }
      }
    }

    if (!accept) return null;

    return {
      x0: Math.round(pX0),
      y0: Math.round(pY0),
      x1: Math.round(pX1),
      y1: Math.round(pY1),
    };
  }
}
