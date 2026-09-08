import { describe, it, expect } from 'vitest';
import {
  extractSelectionBoundarySegments,
  boundarySegmentsToSvgPath,
  createBoxMask,
  mergeSelectionMask,
} from '@/lib/canvas/selectionUtils';

describe('Selection Boundary Extraction & Marching Ants', () => {
  it('extracts correct orthogonal boundary segments for a single 1x1 pixel', () => {
    const width = 4;
    const height = 4;
    const mask = new Uint8Array(width * height);
    // Select pixel at (1, 1)
    mask[1 * width + 1] = 1;

    const segments = extractSelectionBoundarySegments(mask, width, height);

    // A single pixel has 4 boundary segments:
    // Top: (1, 1) -> (2, 1)
    // Bottom: (1, 2) -> (2, 2)
    // Left: (1, 1) -> (1, 2)
    // Right: (2, 1) -> (2, 2)
    expect(segments).toHaveLength(4);

    expect(segments).toContainEqual({ x1: 1, y1: 1, x2: 2, y2: 1 });
    expect(segments).toContainEqual({ x1: 1, y1: 2, x2: 2, y2: 2 });
    expect(segments).toContainEqual({ x1: 1, y1: 1, x2: 1, y2: 2 });
    expect(segments).toContainEqual({ x1: 2, y1: 1, x2: 2, y2: 2 });

    const svgPath = boundarySegmentsToSvgPath(segments, 10);
    expect(svgPath).toContain('M 10.00 10.00 L 20.00 10.00');
  });

  it('merges collinear segments for a 3x3 square block', () => {
    const width = 8;
    const height = 8;
    const mask = createBoxMask({ x: 2, y: 2, w: 3, h: 3 }, width, height);

    const segments = extractSelectionBoundarySegments(mask, width, height);

    // For a 3x3 block:
    // Horizontal: Top (x=2..5, y=2) and Bottom (x=2..5, y=5)
    // Vertical: Left (x=2, y=2..5) and Right (x=5, y=2..5)
    expect(segments).toHaveLength(4);
    expect(segments).toContainEqual({ x1: 2, y1: 2, x2: 5, y2: 2 });
    expect(segments).toContainEqual({ x1: 2, y1: 5, x2: 5, y2: 5 });
    expect(segments).toContainEqual({ x1: 2, y1: 2, x2: 2, y2: 5 });
    expect(segments).toContainEqual({ x1: 5, y1: 2, x2: 5, y2: 5 });
  });

  it('extracts internal and external boundaries for a donut / hollow shape', () => {
    const width = 6;
    const height = 6;
    // Outer 4x4 box at (1, 1) with 2x2 hole at (2, 2)
    const outer = createBoxMask({ x: 1, y: 1, w: 4, h: 4 }, width, height);
    const inner = createBoxMask({ x: 2, y: 2, w: 2, h: 2 }, width, height);
    const donut = mergeSelectionMask(outer, inner, 'subtract', width, height).mask!;

    const segments = extractSelectionBoundarySegments(donut, width, height);

    // Should have 4 outer segments and 4 inner hole segments
    expect(segments.length).toBe(8);

    // Outer segments
    expect(segments).toContainEqual({ x1: 1, y1: 1, x2: 5, y2: 1 });
    expect(segments).toContainEqual({ x1: 1, y1: 5, x2: 5, y2: 5 });
    expect(segments).toContainEqual({ x1: 1, y1: 1, x2: 1, y2: 5 });
    expect(segments).toContainEqual({ x1: 5, y1: 1, x2: 5, y2: 5 });

    // Inner hole segments
    expect(segments).toContainEqual({ x1: 2, y1: 2, x2: 4, y2: 2 });
    expect(segments).toContainEqual({ x1: 2, y1: 4, x2: 4, y2: 4 });
    expect(segments).toContainEqual({ x1: 2, y1: 2, x2: 2, y2: 4 });
    expect(segments).toContainEqual({ x1: 4, y1: 2, x2: 4, y2: 4 });
  });

  it('returns empty array on empty mask', () => {
    const width = 4;
    const height = 4;
    const mask = new Uint8Array(width * height);
    const segments = extractSelectionBoundarySegments(mask, width, height);
    expect(segments).toEqual([]);
    expect(boundarySegmentsToSvgPath(segments)).toBe('');
  });
});
