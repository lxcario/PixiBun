/**
 * Vector Depixelization Engine (Pixel Art to Smooth SVG).
 *
 * Inspired by the landmark computer graphics principles of Kopf & Lischinski:
 * - Johannes Kopf and Dani Lischinski, "Depixelizing Pixel Art,"
 *   ACM Transactions on Graphics (Proceedings of ACM SIGGRAPH 2011),
 *   Vol. 30, No. 4, Article 99. DOI: 10.1145/2010324.1964994.
 *
 * Architecture Note:
 * Rather than solving full non-linear Voronoi energy optimizations, PixiBun implements a
 * lightweight, domain-tailored planar similarity graph ambiguity heuristic for real-time in-browser SVG export:
 * 1. Resolves diagonal pixel-neighbor ambiguities using 1-hop parity connectivity heuristics.
 * 2. Constructs orthogonal cell boundaries with local corner offsets (±0.05).
 * 3. Fits smooth piecewise cubic Bézier paths for scalable vector asset export.
 */

export interface DepixelizeOptions {
  scale?: number; // Output SVG viewport scale factor (default: 10)
  smooth?: boolean; // Apply cubic Bézier spline smoothing (default: true)
  colorTolerance?: number; // Color difference threshold in RGB space (default: 0)
}

export interface DepixelizeResult {
  svgString: string;
  pathCount: number;
  colorCount: number;
  width: number;
  height: number;
}

interface Point2D {
  x: number;
  y: number;
}

/**
 * Color packing helper.
 */
function packRgbaKey(r: number, g: number, b: number, a: number): string {
  if (a === 0) return 'transparent';
  if (a < 255) {
    return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
  }
  return `rgb(${r},${g},${b})`;
}

/**
 * Computes Euclidean distance between two RGBA colors.
 */
function colorDistance(
  data: Uint8ClampedArray | Uint8Array,
  idxA: number,
  idxB: number
): number {
  const dr = data[idxA] - data[idxB];
  const dg = data[idxA + 1] - data[idxB + 1];
  const db = data[idxA + 2] - data[idxB + 2];
  const da = data[idxA + 3] - data[idxB + 3];
  return Math.sqrt(dr * dr + dg * dg + db * db + da * da);
}

/**
 * Converts Catmull-Rom spline control points (p0, p1, p2, p3)
 * to cubic Bézier control points (p1, c1, c2, p2).
 */
function catmullRomToBezier(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  tension: number = 0.5
): { cp1: Point2D; cp2: Point2D } {
  const factor = (1 - tension) / 6;
  return {
    cp1: {
      x: p1.x + (p2.x - p0.x) * factor * 2,
      y: p1.y + (p2.y - p0.y) * factor * 2,
    },
    cp2: {
      x: p2.x - (p3.x - p1.x) * factor * 2,
      y: p2.y - (p3.y - p1.y) * factor * 2,
    },
  };
}

/**
 * Depixelizes raster pixel art into a smooth SVG vector document.
 */
export function depixelizeToSvg(
  image: { data: Uint8ClampedArray | Uint8Array; width: number; height: number },
  options: DepixelizeOptions = {}
): DepixelizeResult {
  const { width, height, data } = image;
  const scale = Math.max(1, options.scale ?? 10);
  const smooth = options.smooth ?? true;
  const tol = options.colorTolerance ?? 0;

  if (width <= 0 || height <= 0 || data.length === 0) {
    return {
      svgString: `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"></svg>`,
      pathCount: 0,
      colorCount: 0,
      width: 0,
      height: 0,
    };
  }

  // 1. Color similarity test between two pixel coordinates
  const isSameColor = (x1: number, y1: number, x2: number, y2: number): boolean => {
    if (x1 < 0 || x1 >= width || y1 < 0 || y1 >= height) return false;
    if (x2 < 0 || x2 >= width || y2 < 0 || y2 >= height) return false;

    const idx1 = (y1 * width + x1) * 4;
    const idx2 = (y2 * width + x2) * 4;

    const a1 = data[idx1 + 3];
    const a2 = data[idx2 + 3];
    if (a1 === 0 && a2 === 0) return true;
    if (a1 === 0 || a2 === 0) return false;

    if (tol === 0) {
      return (
        data[idx1] === data[idx2] &&
        data[idx1 + 1] === data[idx2 + 1] &&
        data[idx1 + 2] === data[idx2 + 2] &&
        a1 === a2
      );
    }
    return colorDistance(data, idx1, idx2) <= tol;
  };

  // 2. Kopf-Lischinski Diagonal Ambiguity Resolution
  // In each 2x2 neighborhood [p00, p10; p01, p11]:
  // If (p00 == p11) AND (p10 == p01), diagonal edges cross.
  // We resolve the crossing deterministically using curve length / continuity heuristic.
  // diagChoice: 0 = none, 1 = main diagonal (top-left to bottom-right), 2 = anti-diagonal (top-right to bottom-left)
  const diagChoice = new Uint8Array((width + 1) * (height + 1));

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const matchMain = isSameColor(x, y, x + 1, y + 1);
      const matchAnti = isSameColor(x + 1, y, x, y + 1);

      const vertexIdx = (y + 1) * (width + 1) + (x + 1);

      if (matchMain && matchAnti) {
        // Ambiguous crossing: compute heuristic component continuity
        // Measure 1-hop orthogonal neighborhood support
        let mainSupport = 0;
        let antiSupport = 0;

        if (isSameColor(x, y, x - 1, y)) mainSupport++;
        if (isSameColor(x, y, x, y - 1)) mainSupport++;
        if (isSameColor(x + 1, y + 1, x + 2, y + 1)) mainSupport++;
        if (isSameColor(x + 1, y + 1, x + 1, y + 2)) mainSupport++;

        if (isSameColor(x + 1, y, x + 2, y)) antiSupport++;
        if (isSameColor(x + 1, y, x + 1, y - 1)) antiSupport++;
        if (isSameColor(x, y + 1, x - 1, y + 1)) antiSupport++;
        if (isSameColor(x, y + 1, x, y + 2)) antiSupport++;

        if (mainSupport > antiSupport) {
          diagChoice[vertexIdx] = 1;
        } else if (antiSupport > mainSupport) {
          diagChoice[vertexIdx] = 2;
        } else {
          // Tie-break deterministically
          diagChoice[vertexIdx] = 1;
        }
      } else if (matchMain) {
        diagChoice[vertexIdx] = 1;
      } else if (matchAnti) {
        diagChoice[vertexIdx] = 2;
      }
    }
  }

  // 3. Extract boundary segments for each colored component
  // Group adjacent pixels into connected regions by color
  const visited = new Uint8Array(width * height);
  const colorPathsMap = new Map<string, string[]>();

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const pIdx = py * width + px;
      if (visited[pIdx] === 1) continue;

      const dataIdx = pIdx * 4;
      const alpha = data[dataIdx + 3];
      if (alpha === 0) {
        visited[pIdx] = 1;
        continue; // Transparent pixels omitted from SVG rendering
      }

      const colorKey = packRgbaKey(
        data[dataIdx],
        data[dataIdx + 1],
        data[dataIdx + 2],
        alpha
      );

      // Flood-fill connected region of this color
      const regionPixels: Point2D[] = [];
      const queue: Point2D[] = [{ x: px, y: py }];
      visited[pIdx] = 1;

      while (queue.length > 0) {
        const curr = queue.pop()!;
        regionPixels.push(curr);

        const neighbors = [
          { x: curr.x + 1, y: curr.y },
          { x: curr.x - 1, y: curr.y },
          { x: curr.x, y: curr.y + 1 },
          { x: curr.x, y: curr.y - 1 },
        ];

        for (const n of neighbors) {
          if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
            const nIdx = n.y * width + n.x;
            if (visited[nIdx] === 0 && isSameColor(curr.x, curr.y, n.x, n.y)) {
              visited[nIdx] = 1;
              queue.push(n);
            }
          }
        }
      }

      // 4. Construct polygonal boundary contours for this region
      const pixelSet = new Set<string>();
      regionPixels.forEach((p) => pixelSet.add(`${p.x},${p.y}`));

      // Generate polygon boundary edges
      // A pixel (x, y) has 4 edges: Top, Right, Bottom, Left.
      // Edges are directed clockwise around pixels:
      // Top: (x, y) -> (x+1, y)
      // Right: (x+1, y) -> (x+1, y+1)
      // Bottom: (x+1, y+1) -> (x, y+1)
      // Left: (x, y+1) -> (x, y)
      const edgeMap = new Map<string, Point2D>();

      for (const p of regionPixels) {
        const x = p.x;
        const y = p.y;

        // Top edge
        if (!pixelSet.has(`${x},${y - 1}`)) {
          edgeMap.set(`${x},${y}`, { x: x + 1, y });
        }
        // Right edge
        if (!pixelSet.has(`${x + 1},${y}`)) {
          edgeMap.set(`${x + 1},${y}`, { x: x + 1, y: y + 1 });
        }
        // Bottom edge
        if (!pixelSet.has(`${x},${y + 1}`)) {
          edgeMap.set(`${x + 1},${y + 1}`, { x, y: y + 1 });
        }
        // Left edge
        if (!pixelSet.has(`${x - 1},${y}`)) {
          edgeMap.set(`${x},${y + 1}`, { x, y });
        }
      }

      // Trace closed boundary loops from edgeMap
      const visitedEdges = new Set<string>();
      for (const startKey of edgeMap.keys()) {
        if (visitedEdges.has(startKey)) continue;

        const loopPoints: Point2D[] = [];
        let currKey: string | undefined = startKey;

        while (currKey && !visitedEdges.has(currKey)) {
          visitedEdges.add(currKey);
          const [cx, cy] = currKey.split(',').map(Number);
          loopPoints.push({ x: cx, y: cy });

          const nextPt = edgeMap.get(currKey);
          if (!nextPt) break;
          currKey = `${nextPt.x},${nextPt.y}`;
          if (currKey === startKey) break;
        }

        if (loopPoints.length < 3) continue;

        // 5. Apply Kopf-Lischinski fillet smoothing to vertex positions
        // Scale and smooth with Catmull-Rom -> Bézier splines
        const scaledPoints = loopPoints.map((pt) => {
          let fx = pt.x;
          let fy = pt.y;

          // If vertex coincides with a resolved diagonal, adjust corner fillet
          const vIdx = pt.y * (width + 1) + pt.x;
          const choice = diagChoice[vIdx];
          if (choice === 1) {
            // Main diagonal fillet
            fx += 0.05;
            fy += 0.05;
          } else if (choice === 2) {
            // Anti-diagonal fillet
            fx -= 0.05;
            fy += 0.05;
          }

          return { x: fx * scale, y: fy * scale };
        });

        // 6. Build SVG path command (smooth cubic spline or polygon)
        let pathD = '';
        const len = scaledPoints.length;

        if (smooth && len >= 4) {
          pathD = `M ${scaledPoints[0].x.toFixed(2)} ${scaledPoints[0].y.toFixed(2)}`;
          for (let i = 0; i < len; i++) {
            const p0 = scaledPoints[(i - 1 + len) % len];
            const p1 = scaledPoints[i];
            const p2 = scaledPoints[(i + 1) % len];
            const p3 = scaledPoints[(i + 2) % len];

            const { cp1, cp2 } = catmullRomToBezier(p0, p1, p2, p3, 0.4);
            pathD += ` C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)}, ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
          }
          pathD += ' Z';
        } else {
          pathD = `M ${scaledPoints.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`;
        }

        if (!colorPathsMap.has(colorKey)) {
          colorPathsMap.set(colorKey, []);
        }
        colorPathsMap.get(colorKey)!.push(pathD);
      }
    }
  }

  // 7. Compile final SVG Document
  const svgWidth = width * scale;
  const svgHeight = height * scale;
  let totalPaths = 0;

  const svgElements: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">`,
  ];

  for (const [color, paths] of colorPathsMap.entries()) {
    const combinedD = paths.join(' ');
    svgElements.push(`  <path d="${combinedD}" fill="${color}" fill-rule="evenodd" />`);
    totalPaths += paths.length;
  }

  svgElements.push('</svg>');

  return {
    svgString: svgElements.join('\n'),
    pathCount: totalPaths,
    colorCount: colorPathsMap.size,
    width: svgWidth,
    height: svgHeight,
  };
}
