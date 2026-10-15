'use client';

import { useStudioStore } from '@/stores/studioStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import type { ToolType } from '@/types/tools';

type QuickAction = { label: string; badge: string; run: () => void; pressed?: boolean };

/** One reversible setting shortcut for every canonical tool; never edits artwork. */
export function useIslandQuickAction() {
  const tools = useStudioStore(s => s.tools);
  const gradientShape = useWorkspaceStore(s => s.gradient.shape);
  const state = useStudioStore.getState();
  const fine = tools.brushSize === 1;
  const brush: QuickAction = {
    label: `Brush size: ${tools.brushSize} px. Switch to ${fine ? 4 : 1} px`,
    badge: `${tools.brushSize}px`, run: () => state.setBrushSize(fine ? 4 : 1),
  };
  const rotation: QuickAction = {
    label: `Selection rotation: ${tools.rotationAlgorithm === 'paeth' ? 'Paeth' : 'RotSprite'}. Switch engine`,
    badge: tools.rotationAlgorithm === 'paeth' ? 'P' : 'R',
    run: () => state.setRotationAlgorithm(tools.rotationAlgorithm === 'paeth' ? 'rotsprite' : 'paeth'),
  };
  const connected: QuickAction = {
    label: `Connected pixels only: ${tools.bucketContiguous ? 'on' : 'off'}. Toggle`,
    badge: tools.bucketContiguous ? 'Local' : 'All', pressed: tools.bucketContiguous,
    run: () => state.setBucketContiguous(!tools.bucketContiguous),
  };
  const actions: Record<ToolType, QuickAction> = {
    pen: brush, eraser: brush, line: brush,
    curve: {
      label: `Curve tightness: ${tools.curveTightness.toFixed(2)}. ${tools.curveTightness < 0.6 ? 'Tighten' : 'Soften'} curve`,
      badge: tools.curveTightness < 0.6 ? 'Soft' : 'Tight',
      run: () => state.setCurveTightness(tools.curveTightness < 0.6 ? 0.8 : 0.3),
    },
    bucket: connected,
    gradient: {
      label: `Gradient: ${gradientShape}. Switch to ${gradientShape === 'linear' ? 'radial' : 'linear'}`,
      badge: gradientShape === 'linear' ? 'Line' : 'Radial',
      run: () => useWorkspaceStore.getState().setGradient({ shape: gradientShape === 'linear' ? 'radial' : 'linear' }),
    },
    dither: {
      label: `Dither pattern: ${tools.ditherMatrix}. Switch to ${tools.ditherMatrix === '2x2' ? '4x4' : '2x2'}`,
      badge: tools.ditherMatrix === '2x2' ? '2×2' : tools.ditherMatrix === '4x4' ? '4×4' : 'Mix',
      run: () => state.setDitherMatrix(tools.ditherMatrix === '2x2' ? '4x4' : '2x2'),
    },
    'color-replace': { label: 'Swap foreground and background colors', badge: 'Swap', run: state.swapColors },
    'erase-color': {
      label: `Match color family: ${tools.eraseColorFamily ? 'on' : 'off'}. Toggle`,
      badge: tools.eraseColorFamily ? 'Family' : 'Exact', pressed: tools.eraseColorFamily,
      run: () => state.setEraseColorFamily(!tools.eraseColorFamily),
    },
    'select-box': rotation, 'select-lasso': rotation, 'select-wand': connected,
    'isometric-line': {
      label: `2:1 angle snap: ${tools.isoAngleSnap ? 'on' : 'off'}. Toggle`,
      badge: tools.isoAngleSnap ? '2:1' : 'Free', pressed: tools.isoAngleSnap,
      run: () => state.setIsoAngleSnap(!tools.isoAngleSnap),
    },
    rectangle: {
      label: `Shape: ${tools.shapeFilled ? 'filled' : 'outline'}. Toggle fill`,
      badge: tools.shapeFilled ? 'Fill' : 'Edge', pressed: tools.shapeFilled,
      run: () => state.setShapeFilled(!tools.shapeFilled),
    },
    ellipse: {
      label: `Shape: ${tools.shapeFilled ? 'filled' : 'outline'}. Toggle fill`,
      badge: tools.shapeFilled ? 'Fill' : 'Edge', pressed: tools.shapeFilled,
      run: () => state.setShapeFilled(!tools.shapeFilled),
    },
    'normal-chisel': {
      label: `Chisel ridge mode: ${tools.chiselRidgeMode ? 'on' : 'off'}. Toggle`,
      badge: tools.chiselRidgeMode ? 'Ridge' : 'Carve', pressed: tools.chiselRidgeMode,
      run: () => state.setChiselRidgeMode(!tools.chiselRidgeMode),
    },
    eyedropper: { label: 'Swap foreground and background colors', badge: 'Swap', run: state.swapColors },
  };
  return actions[tools.activeTool];
}
