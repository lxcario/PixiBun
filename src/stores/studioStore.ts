'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type {
  StudioState,
  ViewportSlice,
  ToolSlice,
  LayerSlice,
  AnimationSlice,
  HistorySlice,
} from './slices/types';

import { createViewportSlice } from './slices/createViewportSlice';
import { createToolSlice, PRESET_PALETTES } from './slices/createToolSlice';
import { createLayerSlice } from './slices/createLayerSlice';
import { createAnimationSlice } from './slices/createAnimationSlice';
import { createHistorySlice } from './slices/createHistorySlice';

export { PRESET_PALETTES };
export type {
  StudioState,
  ViewportSlice,
  ToolSlice,
  LayerSlice,
  AnimationSlice,
  HistorySlice,
};

export const useStudioStore = create<StudioState>()(
  immer((...a) => ({
    ...createViewportSlice(...a),
    ...createToolSlice(...a),
    ...createLayerSlice(...a),
    ...createAnimationSlice(...a),
    ...createHistorySlice(...a),
  }))
);

if (typeof window !== 'undefined') {
  if (process.env.NODE_ENV !== 'production') {
    (window as Window & { __studioStore?: typeof useStudioStore }).__studioStore = useStudioStore;
  }
}
