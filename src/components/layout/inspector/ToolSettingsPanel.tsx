'use client';

import React from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { CANONICAL_TOOLS } from '@/config/shortcuts';
import type { DitherMatrixType } from '@/types/tools';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { TactileButton } from '@/components/ui/TactileButton';
import { captureMotionPart } from '@/lib/animation/pixiMotion';
import { prepareMotionArtwork } from '@/lib/animation/prepareMotionArtwork';
import { snapshotBuffers } from '@/lib/engine/bufferRegistry';
import { studioEvents } from '@/lib/events/studioEvents';
import { isNormalLayer } from '@/lib/export/normalLayers';
import { coDrawBridge } from '@/lib/sync/coDrawBridge';

export function ToolSettingsPanel() {
  const t = useStudioStore((s) => s.tools);
  const state = useStudioStore();
  const gradient = useWorkspaceStore((s) => s.gradient);
  const setGradient = useWorkspaceStore((s) => s.setGradient);

  const handleCreateMotionPart = (wholeArtwork = false) => {
    try {
      const currentStore = useStudioStore.getState();
      const { canvasWidth, canvasHeight, activeFrameIndex, activeLayerId, frames, selection, selectionMask } = currentStore;
      const currentFrame = frames[activeFrameIndex];
      const layer = currentFrame?.layers.find(l => l.id === activeLayerId);
      if (!layer || layer.locked) {
        studioEvents.emit('pixibun:toast', {
          type: 'error',
          message: 'Cannot create motion part on a locked layer.',
        });
        return;
      }
      if (currentStore.hasFloatingSelection) throw new Error('Commit or cancel the floating selection before creating a motion part.');
      if (coDrawBridge.getRole() !== null) throw new Error('Close co-draw before creating motion parts.');
      if (isNormalLayer(layer)) throw new Error('Motion parts currently support color artwork. Use layer rotation for normal maps.');
      const entry = snapshotBuffers().get(activeLayerId);
      if (!entry) throw new Error('Paint some artwork before creating a motion part.');
      const part = captureMotionPart({
        canvasWidth,
        canvasHeight,
        activeFrameIndex,
        activeLayerId,
        frames,
        selection: wholeArtwork ? null : selection,
        selectionMask: wholeArtwork ? null : selectionMask,
        layerCanvas: entry.canvas,
      });
      if (part) {
        currentStore.setMotionPart(part);
        currentStore.setMotionActivePose('end');
        studioEvents.emit('pixibun:toast', {
          type: 'default',
          message: 'Motion Part created! Drag pivot or pose END frame, then scrub or bake.',
        });
      } else {
        studioEvents.emit('pixibun:toast', {
          type: 'error',
          message: 'Selection is empty or has no visible pixels.',
        });
      }
    } catch (error) {
      studioEvents.emit('pixibun:toast', { type: 'error', message: error instanceof Error ? error.message : 'Could not capture this motion part.' });
    }
  };

  const meta = CANONICAL_TOOLS.find((tool) => tool.id === t.activeTool);
  const isBrushTool = ['pen', 'eraser', 'curve', 'dither', 'line', 'isometric-line', 'rectangle', 'ellipse'].includes(t.activeTool);

  const checkbox = (
    label: string,
    checked: boolean,
    change: (value: boolean) => void,
    help?: string
  ) => (
    <label className="flex items-start gap-2.5 text-xs py-1 cursor-pointer select-none group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => change(e.target.checked)}
        className="mt-0.5 accent-[var(--accent-gold)] rounded-[2px] cursor-pointer"
      />
      <span className="flex-1">
        <span className="font-medium text-[var(--text-heading)] group-hover:text-[var(--accent-gold)] transition-colors">
          {label}
        </span>
        {help && (
          <span className="block text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
            {help}
          </span>
        )}
      </span>
    </label>
  );

  const range = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    change: (value: number) => void,
    unit: string = ''
  ) => (
    <div className="space-y-1.5 text-xs">
      <div className="flex justify-between items-center">
        <span className="font-medium text-[var(--text-body)]">{label}</span>
        <span className="font-mono text-[11px] tabular-nums px-1.5 py-0.5 rounded-[2px] bg-[var(--surface-0)] border border-[var(--desk-border)] text-[var(--text-heading)] font-bold">
          {value}{unit}
        </span>
      </div>
      <input
        aria-label={`Tool panel ${label.toLowerCase()}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => change(Number(e.target.value))}
        className="w-full h-2 accent-[var(--accent-gold)] cursor-pointer bg-[var(--surface-0)] rounded-full"
      />
    </div>
  );

  return (
    <section aria-label="Detailed tool settings" className="p-3 space-y-3 text-[var(--text-heading)] select-none">
      {!state.motionPart && <div className="p-2.5 rounded-[4px] bg-[var(--surface-0)]/80 border border-[var(--desk-border)] space-y-2">
        <h3 className="font-bold text-xs">PixiMotion</h3>
        <p className="text-[11px] text-[var(--text-muted)]">{state.selection
          ? 'Animate the selected artwork as one rigid part.'
          : 'Animate the active layer as one rigid part, or select an area first.'}</p>
        <TactileButton variant="primary" data-testid="create-motion-part-btn" onClick={() => handleCreateMotionPart()} className="w-full text-xs font-semibold">
          <PixelIcon name="rotate" size={13} /><span>Create Motion Part</span>
        </TactileButton>
        <p className="text-[11px] text-[var(--text-muted)]">This moves the active layer; other layers remain still.</p>
        <TactileButton data-testid="create-visible-motion-btn" className="w-full text-xs" onClick={() => {
          const result = prepareMotionArtwork();
          if (result.ok) handleCreateMotionPart(true);
          else studioEvents.emit('pixibun:toast', { type: 'error', message: result.reason });
        }}>Merge artwork &amp; animate</TactileButton>
        <p className="text-[11px] text-[var(--text-muted)]">Combines visible color layers first. Cancel, then Undo restores the layers.</p>
      </div>}
      {/* 1. Tool Identity Card */}
      <div className="flex items-center gap-2.5 p-2.5 rounded-[4px] bg-[var(--desk-surface-raised)]/60 border border-[var(--desk-border)] shadow-xs">
        <div className="w-8 h-8 rounded-[3px] bg-[var(--surface-0)] border border-[var(--accent-gold)] flex items-center justify-center shrink-0 shadow-xs text-[var(--accent-gold)]">
          <PixelIcon name={meta?.icon ?? 'pen'} size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs font-bold text-[var(--text-heading)] truncate">
              {meta?.label ?? 'Tool Settings'}
            </h2>
            {meta?.shortcut && (
              <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[var(--surface-1)] border border-[var(--desk-border)] font-mono text-[9px] text-[var(--accent-gold)] font-bold">
                {meta.shortcut}
              </kbd>
            )}
          </div>
          <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
            {meta?.group ?? 'Drawing'} Tool Controls
          </p>
        </div>
      </div>

      {/* 2. Brush Size & Quick Presets (Pen, Eraser, Curve, Shapes, Dither) */}
      {isBrushTool && (
        <div className="p-2.5 rounded-[4px] bg-[var(--surface-0)]/80 border border-[var(--desk-border)] space-y-2.5 shadow-xs">
          {range('Brush size', t.brushSize, 1, 32, 1, state.setBrushSize, 'px')}
          <div className="flex gap-1" aria-label="Tool panel brush presets">
            {[1, 2, 3, 4, 8, 16].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => state.setBrushSize(size)}
                aria-pressed={t.brushSize === size}
                className={`flex-1 py-1 rounded-[2px] border text-xs font-mono font-bold cursor-pointer transition-colors ${
                  t.brushSize === size
                    ? 'bg-[var(--accent-gold)] text-[var(--surface-0)] border-[var(--accent-gold)] shadow-xs'
                    : 'bg-[var(--surface-1)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)] hover:border-[var(--text-muted)]'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Specific Tool Settings */}
      {['pen', 'curve'].includes(t.activeTool) && (
        <div className="p-2.5 rounded-[4px] bg-[var(--surface-0)]/80 border border-[var(--desk-border)] shadow-xs">
          {checkbox('Clean corners', t.pixelPerfect, state.setPixelPerfect, 'Removes doubled corner pixels (L-shapes) when drawing single-pixel lines.')}
        </div>
      )}

      {t.activeTool === 'curve' && (
        <div className="p-2.5 rounded-[4px] bg-[var(--surface-0)]/80 border border-[var(--desk-border)] shadow-xs">
          {range('Curve tightness', t.curveTightness, 0.1, 1, 0.05, state.setCurveTightness)}
        </div>
      )}

      {['rectangle', 'ellipse'].includes(t.activeTool) && (
        <div className="p-2.5 rounded-[4px] bg-[var(--surface-0)]/80 border border-[var(--desk-border)] shadow-xs">
          {checkbox('Filled shape', t.shapeFilled, state.setShapeFilled, 'Fill the inner area of the geometric shape with foreground color.')}
        </div>
      )}

      {t.activeTool === 'isometric-line' && (
        <div className="p-2.5 rounded-[4px] bg-[var(--surface-0)]/80 border border-[var(--desk-border)] shadow-xs">
          {checkbox('Snap to 2:1 slope', t.isoAngleSnap, state.setIsoAngleSnap, 'Constrains drawn angles to classic 26.565° isometric pixel slopes.')}
        </div>
      )}

      {t.activeTool === 'bucket' && (
        <div className="p-2.5 rounded-[4px] bg-[var(--surface-0)]/80 border border-[var(--desk-border)] space-y-2.5 shadow-xs">
          {checkbox('Connected pixels only', t.bucketContiguous, state.setBucketContiguous, 'Fill contiguous area only, rather than all matching pixels on the layer.')}
          {range('Fill tolerance', t.fillTolerance, 0, 255, 1, state.setFillTolerance)}
          {t.bucketContiguous && checkbox('Fill enclosed specks', t.fillEnclosedSpecks, state.setFillEnclosedSpecks, 'Also replace enclosed islands up to 8 pixels.')}
        </div>
      )}

      {['color-replace', 'select-wand'].includes(t.activeTool) && (
        <div className="p-2.5 rounded-[4px] bg-[var(--surface-0)]/80 border border-[var(--desk-border)] space-y-2.5 shadow-xs">
          {range('Color tolerance', t.bucketTolerance, 0, 255, 1, state.setBucketTolerance)}
          {t.activeTool === 'select-wand' && checkbox('Connected pixels only', t.bucketContiguous, state.setBucketContiguous)}
        </div>
      )}

      {t.activeTool === 'erase-color' && (
        <div className="p-2.5 rounded-[4px] bg-[var(--surface-0)]/80 border border-[var(--desk-border)] space-y-2 shadow-xs">
          {range('Erase tolerance', t.eraseColorTolerance, 0, 255, 1, state.setEraseColorTolerance)}
          {checkbox('Connected pixels only', t.eraseColorContiguous, state.setEraseColorContiguous)}
          {checkbox('Match color family', t.eraseColorFamily, state.setEraseColorFamily)}
          {checkbox('Across all frames', t.eraseColorAllFrames, state.setEraseColorAllFrames, 'Uses the same layer position in each frame and skips locked layers.')}
        </div>
      )}

      {t.activeTool === 'dither' && (
        <div className="p-2.5 rounded-[4px] bg-[var(--surface-0)]/80 border border-[var(--desk-border)] space-y-3 shadow-xs">
          <label className="block text-xs space-y-1">
            <span className="font-medium text-[var(--text-body)]">Dither Matrix Pattern</span>
            <select
              aria-label="Tool panel dither pattern"
              value={t.ditherMatrix}
              onChange={(e) => state.setDitherMatrix(e.target.value as DitherMatrixType)}
              className="block w-full p-1.5 bg-[var(--surface-1)] border border-[var(--desk-border)] rounded-[2px] text-xs font-mono text-[var(--text-heading)] cursor-pointer"
            >
              {[
                ['2x2', 'Bayer 2×2'],
                ['4x4', 'Bayer 4×4'],
                ['8x8', 'Bayer 8×8'],
                ['blue-noise', 'Blue noise'],
                ['atkinson', 'Atkinson'],
              ].map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {range('Dither density', t.ditherDensity, 0.1, 0.9, 0.05, state.setDitherDensity)}
          <TactileButton
            size="sm"
            variant="default"
            onClick={() => state.addLayer('Dither Pass')}
            className="w-full justify-center text-xs"
          >
            <PixelIcon name="plus" size={11} /> ＋ New Layer for Dither
          </TactileButton>
        </div>
      )}

      {/* 4. Pixel Gradient / Dither Tool Settings with "Draw on new layer" */}
      {t.activeTool === 'gradient' && (
        <div className="p-2.5 rounded-[4px] bg-[var(--surface-0)]/80 border border-[var(--desk-border)] space-y-3 shadow-xs">
          <label className="block text-xs space-y-1">
            <span className="font-medium text-[var(--text-body)]">Gradient Shape</span>
            <select
              aria-label="Gradient shape"
              value={gradient.shape}
              onChange={(e) => setGradient({ shape: e.target.value as 'linear' | 'radial' })}
              className="block w-full p-1.5 bg-[var(--surface-1)] border border-[var(--desk-border)] rounded-[2px] text-xs text-[var(--text-heading)] cursor-pointer"
            >
              <option value="linear">Linear Gradient</option>
              <option value="radial">Radial Gradient</option>
            </select>
          </label>

          <label className="block text-xs space-y-1">
            <span className="font-medium text-[var(--text-body)]">Color Ramp Source</span>
            <select
              aria-label="Gradient colors"
              value={gradient.ramp}
              onChange={(e) => setGradient({ ramp: e.target.value as 'foreground' | 'palette' })}
              className="block w-full p-1.5 bg-[var(--surface-1)] border border-[var(--desk-border)] rounded-[2px] text-xs text-[var(--text-heading)] cursor-pointer"
            >
              <option value="foreground">Foreground → Background</option>
              <option value="palette">Active palette, in order</option>
            </select>
          </label>

          {checkbox('Bayer 4×4 dithering', gradient.dither, (dither) => setGradient({ dither }), 'Interleaves pixels using Bayer pattern for retro shaded transitions.')}
          {checkbox('Draw on new layer', gradient.newLayer, (newLayer) => setGradient({ newLayer }), 'Automatically creates a new layer for the dither pass so existing artwork is preserved.')}

          <p className="text-[10px] leading-relaxed text-[var(--text-muted)] bg-[var(--surface-1)]/50 p-2 rounded-[2px] border border-[var(--desk-border)]/50">
            Drag across the canvas to define direction. If a selection is active, only the selected area is filled.
          </p>
        </div>
      )}

      {t.activeTool === 'normal-chisel' && (
        <div className="p-2.5 rounded-[4px] bg-[var(--surface-0)]/80 border border-[var(--desk-border)] space-y-2 shadow-xs">
          {range('Chisel width', t.chiselWidth, 1, 32, 1, state.setChiselWidth)}
          {range('Azimuth', t.chiselAzimuth, 0, 360, 1, state.setChiselAzimuth)}
          {range('Incline', t.chiselIncline, 15, 75, 1, state.setChiselIncline)}
          {checkbox('Ridge mode', t.chiselRidgeMode, state.setChiselRidgeMode)}
          <label className="block text-xs space-y-1">
            <span>Normal blending</span>
            <select
              aria-label="Tool panel normal blending"
              value={t.normalBlendMode}
              onChange={(e) => state.setNormalBlendMode(e.target.value as 'rnm' | 'udn' | 'overwrite')}
              className="block w-full p-1.5 bg-[var(--surface-1)] border border-[var(--desk-border)] rounded-[2px] text-xs"
            >
              <option value="rnm">RNM</option>
              <option value="udn">UDN</option>
              <option value="overwrite">Replace</option>
            </select>
          </label>
        </div>
      )}

      {t.activeTool.startsWith('select-') && (
        <>
          <div className="p-2.5 rounded-[4px] bg-[var(--surface-0)]/80 border border-[var(--desk-border)] space-y-2 shadow-xs">
            <span className="font-bold text-xs text-[var(--text-heading)]">Rotation Engine</span>
            <select
              aria-label="Rotation algorithm"
              value={t.rotationAlgorithm ?? 'rotsprite'}
              onChange={(e) => state.setRotationAlgorithm(e.target.value as 'rotsprite' | 'paeth')}
              className="block w-full p-1.5 bg-[var(--surface-1)] border border-[var(--desk-border)] rounded-[2px] text-xs text-[var(--text-heading)] cursor-pointer"
            >
              <option value="rotsprite">RotSprite v2 (Contours & Outlines)</option>
              <option value="paeth">Paeth 3-Shear (Dither & Textures)</option>
            </select>
            <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
              {(t.rotationAlgorithm ?? 'rotsprite') === 'rotsprite'
                ? '8× subpixel majority voting & contour refinement. Best for clean character outlines and cel shapes.'
                : 'Area-preserving 1D shear decomposition. Strictly preserves pixel count and dither without Moiré clumping.'}
            </p>
          </div>

          <div className="p-2.5 rounded-[4px] bg-[var(--surface-0)]/80 border border-[var(--desk-border)] space-y-1.5 text-xs shadow-xs">
            <p className="font-medium text-[var(--text-heading)]">Selection Shortcuts</p>
            <ul className="text-[11px] text-[var(--text-muted)] space-y-1 list-disc list-inside">
              <li><kbd className="font-mono text-[var(--accent-gold)]">Shift</kbd> + drag: Add to selection</li>
              <li><kbd className="font-mono text-[var(--accent-gold)]">Alt</kbd> + drag: Subtract from selection</li>
              <li>Drag handles to resize, rotate, or move</li>
              <li><kbd className="font-mono text-[var(--accent-gold)]">Enter</kbd>: Commit transform</li>
              <li><kbd className="font-mono text-[var(--accent-gold)]">Esc</kbd>: Cancel / deselect</li>
            </ul>
          </div>
        </>
      )}

      {t.activeTool === 'eyedropper' && (
        <div className="p-2.5 rounded-[4px] bg-[var(--surface-0)]/80 border border-[var(--desk-border)] text-xs text-[var(--text-muted)] shadow-xs">
          Click anywhere on the artwork to sample its color into the foreground swatch.
        </div>
      )}

      {/* 5. Drawing Guides Card */}
      <div className="p-2.5 rounded-[4px] bg-[var(--surface-0)]/80 border border-[var(--desk-border)] space-y-2 shadow-xs">
        <h3 className="text-xs font-bold text-[var(--text-heading)]">Symmetry & Composition</h3>
        {checkbox('Horizontal mirror (Shift+H)', t.symmetryHorizontal, (value) => {
          if (value !== t.symmetryHorizontal) state.toggleSymmetryH();
        })}
        {checkbox('Vertical mirror (Shift+V)', t.symmetryVertical, (value) => {
          if (value !== t.symmetryVertical) state.toggleSymmetryV();
        })}
        <label className="block text-xs space-y-1">
          <span className="font-medium text-[var(--text-body)]">Composition Guide</span>
          <select
            aria-label="Composition guide"
            value={state.referenceOverlay}
            onChange={(e) => state.setReferenceOverlay(e.target.value as typeof state.referenceOverlay)}
            className="block w-full p-1.5 bg-[var(--surface-1)] border border-[var(--desk-border)] rounded-[2px] text-xs text-[var(--text-heading)] cursor-pointer"
          >
            {[
              ['none', 'Off'],
              ['thirds', 'Rule of thirds'],
              ['golden', 'Golden ratio'],
              ['center', 'Center crosshair'],
              ['diagonals', 'Diagonals'],
              ['safe', 'Safe area (10%)'],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
