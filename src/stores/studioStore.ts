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
import { deferWorkspaceNotification, forgetWorkspaceNotification } from '@/lib/engine/publicationScope';
import { registerMemoryUsage } from '@/lib/safety/memoryBudget';
import { motionHistoryBytes } from '@/lib/animation/motionEditing';

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
  immer((...a) => {
    const subscribe = a[2].subscribe;
    a[2].subscribe = (listener) => {
      const key = (state: StudioState, previous: StudioState) => listener(state, previous);
      const unsubscribe = subscribe((state, previous) => {
        if (!deferWorkspaceNotification(key, state, previous)) listener(state, previous);
      });
      return () => { forgetWorkspaceNotification(key); unsubscribe(); };
    };
    return {
      ...createViewportSlice(...a),
      ...createToolSlice(...a),
      ...createLayerSlice(...a),
      ...createAnimationSlice(...a),
      ...createHistorySlice(...a),
    };
  })
);

registerMemoryUsage('motion', () => {
  const state = useStudioStore.getState(), part = state.motionPart;
  return (part ? part.raster.data.byteLength + (part.mask?.byteLength ?? 0) : 0) + motionHistoryBytes(state.motionHistory);
});

if (typeof window !== 'undefined') {
  if (process.env.NODE_ENV !== 'production') {
    (window as Window & { __studioStore?: typeof useStudioStore }).__studioStore = useStudioStore;
  }
}
