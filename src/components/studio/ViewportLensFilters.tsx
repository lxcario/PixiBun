'use client';

import React from 'react';
import {
  CVD_FILTER_IDS,
  CVD_LENS_MATRICES,
  SQUINT_FILTER_ID,
  SQUINT_SILHOUETTE_RGB,
  feColorMatrixValues,
} from '@/lib/color/cvdLens';

const inkChannel = (v: number): string => (v / 255).toFixed(6);

/**
 * Display-only SVG filter definitions backing the CVD lens (DESIGN.md §12)
 * and Silhouette / Squint mode (DESIGN.md §13). Purely presentational: these
 * filters are referenced via CSS `filter: url(#id)` on the viewport art
 * surfaces and never modify buffers, project data, or exports.
 *
 * The feColorMatrix values are serialized from CVD_LENS_MATRICES so the
 * display path and the unit-tested math path share one source of truth.
 */
export const ViewportLensFilters: React.FC = () => {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-testid="viewport-lens-filters"
      width="0"
      height="0"
      style={{ position: 'absolute' }}
    >
      <defs>
        {(
          Object.keys(CVD_LENS_MATRICES) as Array<keyof typeof CVD_LENS_MATRICES>
        ).map((mode) => (
          <filter
            key={mode}
            id={CVD_FILTER_IDS[mode]}
            colorInterpolationFilters="sRGB"
            x="0"
            y="0"
            width="100%"
            height="100%"
          >
            <feColorMatrix type="matrix" values={feColorMatrixValues(CVD_LENS_MATRICES[mode])} />
          </filter>
        ))}

        {/* Squint: white flood background + all non-transparent pixels as #140C1E ink */}
        <filter
          id={SQUINT_FILTER_ID}
          colorInterpolationFilters="sRGB"
          x="0"
          y="0"
          width="100%"
          height="100%"
        >
          <feFlood floodColor="#ffffff" result="background" />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values={`0 0 0 0 ${inkChannel(SQUINT_SILHOUETTE_RGB[0])}  0 0 0 0 ${inkChannel(
              SQUINT_SILHOUETTE_RGB[1]
            )}  0 0 0 0 ${inkChannel(SQUINT_SILHOUETTE_RGB[2])}  0 0 0 1 0`}
            result="ink"
          />
          <feMerge>
            <feMergeNode in="background" />
            <feMergeNode in="ink" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
};