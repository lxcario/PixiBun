'use client';

import React from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { CANONICAL_TOOLS } from '@/config/shortcuts';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { TactileButton } from '@/components/ui/TactileButton';
import { InspectorSection, InspectorNote, RangeRow, SelectRow, ToggleRow } from './InspectorKit';
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
  const isSelectTool = t.activeTool.startsWith('select-');

  const optionsBody = (() => {
    switch (t.activeTool) {
      case 'curve':
        return <RangeRow label="Curve tightness" value={t.curveTightness} min={0.1} max={1} step={0.05} onChange={state.setCurveTightness} />;
      case 'rectangle':
      case 'ellipse':
        return <ToggleRow label="Filled shape" checked={t.shapeFilled} onChange={state.setShapeFilled} hint="Fill the inside with the foreground color." />;
      case 'isometric-line':
        return <ToggleRow label="Snap to 2:1 slope" checked={t.isoAngleSnap} onChange={state.setIsoAngleSnap} hint="Locks lines to the classic 26.565° isometric pixel slope." />;
      case 'bucket':
        return (
          <>
            <ToggleRow label="Connected pixels only" checked={t.bucketContiguous} onChange={state.setBucketContiguous} hint="Off fills every matching pixel on the layer." />
            <RangeRow label="Fill tolerance" value={t.fillTolerance} min={0} max={255} step={1} onChange={state.setFillTolerance} />
            {t.bucketContiguous && <ToggleRow label="Fill enclosed specks" checked={t.fillEnclosedSpecks} onChange={state.setFillEnclosedSpecks} hint="Also replaces enclosed islands up to 8 pixels." />}
          </>
        );
      case 'color-replace':
      case 'select-wand':
        return (
          <>
            <RangeRow label="Color tolerance" value={t.bucketTolerance} min={0} max={255} step={1} onChange={state.setBucketTolerance} />
            {t.activeTool === 'select-wand' && <ToggleRow label="Connected pixels only" checked={t.bucketContiguous} onChange={state.setBucketContiguous} />}
          </>
        );
      case 'erase-color':
        return (
          <>
            <RangeRow label="Erase tolerance" value={t.eraseColorTolerance} min={0} max={255} step={1} onChange={state.setEraseColorTolerance} />
            <ToggleRow label="Connected pixels only" checked={t.eraseColorContiguous} onChange={state.setEraseColorContiguous} />
            <ToggleRow label="Match color family" checked={t.eraseColorFamily} onChange={state.setEraseColorFamily} />
            <ToggleRow label="Across all frames" checked={t.eraseColorAllFrames} onChange={state.setEraseColorAllFrames} hint="Uses the same layer in each frame and skips locked layers." />
          </>
        );
      case 'dither':
        return (
          <>
            <SelectRow
              label="Pattern"
              ariaLabel="Tool panel dither pattern"
              value={t.ditherMatrix}
              onChange={(value) => state.setDitherMatrix(value)}
              options={[
                ['2x2', 'Bayer 2×2'],
                ['4x4', 'Bayer 4×4'],
                ['8x8', 'Bayer 8×8'],
                ['blue-noise', 'Blue noise'],
                ['atkinson', 'Atkinson'],
              ]}
            />
            <RangeRow label="Density" ariaLabel="Tool panel dither density" value={t.ditherDensity} min={0.1} max={0.9} step={0.05} onChange={state.setDitherDensity} format={(v) => String(Math.round(v * 100))} unit="%" />
            <TactileButton size="sm" variant="default" onClick={() => state.addLayer('Dither Pass')} className="w-full justify-center text-xs mt-1">
              <PixelIcon name="plus" size={11} /> New layer for dither
            </TactileButton>
          </>
        );
      case 'gradient':
        return (
          <>
            <SelectRow
              label="Shape"
              ariaLabel="Gradient shape"
              value={gradient.shape}
              onChange={(shape) => setGradient({ shape })}
              options={[['linear', 'Linear'], ['radial', 'Radial']] as const}
            />
            <SelectRow
              label="Colors"
              ariaLabel="Gradient colors"
              value={gradient.ramp}
              onChange={(ramp) => setGradient({ ramp })}
              options={[['foreground', 'Foreground → background'], ['palette', 'Active palette, in order']] as const}
            />
            <ToggleRow label="Bayer 4×4 dithering" checked={gradient.dither} onChange={(dither) => setGradient({ dither })} hint="Interleaves pixels for a retro shaded blend." />
            <ToggleRow label="Draw on new layer" checked={gradient.newLayer} onChange={(newLayer) => setGradient({ newLayer })} hint="Keeps existing artwork untouched." />
            <div className="pt-1">
              <InspectorNote>Drag across the canvas to set the direction. With a selection, only the selected area fills.</InspectorNote>
            </div>
          </>
        );
      case 'normal-chisel':
        return (
          <>
            <RangeRow label="Chisel width" value={t.chiselWidth} min={1} max={32} step={1} onChange={state.setChiselWidth} unit="px" />
            <RangeRow label="Azimuth" value={t.chiselAzimuth} min={0} max={360} step={1} onChange={state.setChiselAzimuth} unit="°" />
            <RangeRow label="Incline" value={t.chiselIncline} min={15} max={75} step={1} onChange={state.setChiselIncline} unit="°" />
            <ToggleRow label="Ridge mode" checked={t.chiselRidgeMode} onChange={state.setChiselRidgeMode} />
            <SelectRow
              label="Normal blending"
              ariaLabel="Tool panel normal blending"
              value={t.normalBlendMode}
              onChange={(value) => state.setNormalBlendMode(value)}
              options={[['rnm', 'RNM'], ['udn', 'UDN'], ['overwrite', 'Replace']] as const}
            />
          </>
        );
      case 'eyedropper':
        return <InspectorNote icon="eyedropper">Click anywhere on the artwork to pick its color into the foreground swatch.</InspectorNote>;
      default:
        return null;
    }
  })();

  return (
    <section aria-label="Detailed tool settings" className="text-[var(--text-heading)] select-none">
      {/* Active tool: what it is, its key, and one line on how to use it */}
      <div className="px-3 pt-3 pb-3 flex items-start gap-2.5">
        <div className="insp-tool-badge w-9 h-9 flex items-center justify-center shrink-0">
          <PixelIcon name={meta?.icon ?? 'pen'} size={17} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[13px] font-bold text-[var(--text-heading)] truncate">{meta?.label ?? 'Tool settings'}</h2>
            {meta?.shortcut && <kbd className="insp-kbd" title="Keyboard shortcut">{meta.shortcut}</kbd>}
          </div>
          <p className="text-[11px] leading-4 text-[var(--text-muted)] mt-0.5">
            {TOOL_HINTS[t.activeTool] ?? `${meta?.group ?? 'Drawing'} tool`}
          </p>
        </div>
      </div>

      {isBrushTool && (
        <InspectorSection title="Stroke" meta={<span className="font-mono">{t.brushSize}px</span>}>
          <div className="grid grid-cols-6 gap-1 mb-1.5" role="group" aria-label="Tool panel brush presets">
            {BRUSH_PRESETS.map((size) => {
              const active = t.brushSize === size;
              const dot = Math.min(size + 1, 14);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => state.setBrushSize(size)}
                  aria-pressed={active}
                  aria-label={`${size} pixel brush`}
                  title={`${size}px`}
                  className={`h-10 flex flex-col items-center justify-end gap-1 pb-1 rounded-[4px] border cursor-pointer transition-colors ${
                    active
                      ? 'bg-[var(--surface-3)] border-[var(--accent-gold)] text-[var(--accent-gold)]'
                      : 'bg-[var(--surface-0)] border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:border-[var(--desk-border-highlight)]'
                  }`}
                >
                  <span aria-hidden="true" className="flex-1 flex items-center">
                    <span className="block bg-current" style={{ width: dot, height: dot }} />
                  </span>
                  <span className="text-[9px] font-mono font-bold leading-none">{size}</span>
                </button>
              );
            })}
          </div>
          <RangeRow label="Brush size" value={t.brushSize} min={1} max={32} step={1} onChange={state.setBrushSize} unit="px" />
          {['pen', 'curve'].includes(t.activeTool) && (
            <ToggleRow label="Clean corners" checked={t.pixelPerfect} onChange={state.setPixelPerfect} hint="Removes doubled corner pixels from 1px lines." />
          )}
        </InspectorSection>
      )}

      {optionsBody && <InspectorSection title={t.activeTool === 'eyedropper' ? 'How to use' : 'Options'}>{optionsBody}</InspectorSection>}

      {isSelectTool && (
        <>
          <InspectorSection title="Rotation">
            <SelectRow
              label="Engine"
              ariaLabel="Rotation algorithm"
              value={t.rotationAlgorithm ?? 'rotsprite'}
              onChange={(value) => state.setRotationAlgorithm(value)}
              options={[['rotsprite', 'RotSprite — outlines & cel shapes'], ['paeth', 'Paeth shear — dither & textures']] as const}
            />
            <p className="text-[11px] leading-4 text-[var(--text-muted)] pt-1">
              {(t.rotationAlgorithm ?? 'rotsprite') === 'rotsprite'
                ? 'Keeps character outlines clean when rotating.'
                : 'Keeps every pixel and dither pattern, without moiré clumps.'}
            </p>
          </InspectorSection>
          <InspectorSection title="Shortcuts">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11px] items-center m-0">
              {SELECTION_KEYS.map(([keys, what]) => (
                <React.Fragment key={what}>
                  <dt className="flex gap-1">{keys.map((k) => <kbd key={k} className="insp-kbd">{k}</kbd>)}</dt>
                  <dd className="m-0 text-[var(--text-body)]">{what}</dd>
                </React.Fragment>
              ))}
            </dl>
          </InspectorSection>
        </>
      )}

      <InspectorSection title="Guides">
        <div className="grid grid-cols-2 gap-1.5 mb-1" role="group" aria-label="Mirror drawing">
          {([
            ['Horizontal mirror', 'symmetry-h', 'Shift+H', t.symmetryHorizontal, state.toggleSymmetryH, 'Mirror ↔'],
            ['Vertical mirror', 'symmetry-v', 'Shift+V', t.symmetryVertical, state.toggleSymmetryV, 'Mirror ↕'],
          ] as const).map(([label, icon, keys, on, toggle, short]) => (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              aria-label={label}
              title={`${label} (${keys})`}
              onClick={() => toggle()}
              className={`h-8 px-2 flex items-center justify-center gap-1.5 rounded-[4px] border text-[11px] font-semibold cursor-pointer transition-colors ${
                on
                  ? 'bg-[var(--surface-3)] border-[var(--accent-gold)] text-[var(--accent-gold)]'
                  : 'bg-[var(--surface-0)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--text-heading)] hover:border-[var(--desk-border-highlight)]'
              }`}
            >
              <PixelIcon name={icon} size={12} />
              {short}
            </button>
          ))}
        </div>
        <SelectRow
          label="Composition overlay"
          ariaLabel="Composition guide"
          value={state.referenceOverlay}
          onChange={(value) => state.setReferenceOverlay(value)}
          options={[
            ['none', 'Off'],
            ['thirds', 'Rule of thirds'],
            ['golden', 'Golden ratio'],
            ['center', 'Center crosshair'],
            ['diagonals', 'Diagonals'],
            ['safe', 'Safe area (10%)'],
          ] as const}
        />
      </InspectorSection>

      {!state.motionPart && (
        <details open={Boolean(state.selection)} data-testid="animate-artwork" className="group border-t border-[var(--desk-border)] px-3 py-2">
          <summary className="min-h-8 flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <PixelIcon name="rotate" size={12} />
            Animate artwork
            <span aria-hidden="true" className="ml-auto group-open:rotate-90">▸</span>
          </summary>
          <div className="pt-2 pb-1">
          <p className="text-[11px] leading-4 text-[var(--text-muted)] mb-2">
            {state.selection
              ? 'Turn the selected pixels into one rigid part you can pose and tween.'
              : 'Turn the active layer into a rigid part you can pose and tween. Select an area first to animate only that piece.'}
          </p>
          <div className="flex flex-col gap-1.5">
            <TactileButton
              variant="primary"
              size="sm"
              data-testid="create-motion-part-btn"
              onClick={() => handleCreateMotionPart()}
              className="w-full text-xs font-semibold justify-center h-7"
            >
              <PixelIcon name="rotate" size={12} />
              <span>Create Motion Part</span>
            </TactileButton>
            <TactileButton
              variant="default"
              size="sm"
              data-testid="create-visible-motion-btn"
              onClick={() => {
                const result = prepareMotionArtwork();
                if (result.ok) handleCreateMotionPart(true);
                else studioEvents.emit('pixibun:toast', { type: 'error', message: result.reason });
              }}
              className="w-full text-[11px] justify-center h-7 text-[var(--text-body)]"
              title="Combines visible color layers first. Cancel, then Undo restores the layers."
            >
              Merge visible layers &amp; animate
            </TactileButton>
          </div>
          </div>
        </details>
      )}
    </section>
  );
}

const BRUSH_PRESETS = [1, 2, 3, 4, 8, 16] as const;

const SELECTION_KEYS: ReadonlyArray<readonly [string[], string]> = [
  [['Shift'], 'Drag to add'],
  [['Alt'], 'Drag to subtract'],
  [['Enter'], 'Apply transform'],
  [['Esc'], 'Cancel or deselect'],
];

/** One plain sentence per tool: what it does and the most useful modifier. */
const TOOL_HINTS: Partial<Record<string, string>> = {
  pen: 'Draw pixel by pixel. Right-click paints the background color.',
  curve: 'Drag to place a curve, then pull its handles. Enter applies.',
  eraser: 'Clear pixels back to transparency.',
  bucket: 'Fill an area of matching color.',
  gradient: 'Drag across the art to lay down a stepped color blend.',
  dither: 'Paint an ordered pattern between two colors.',
  'color-replace': 'Swap one color for the foreground color where you paint.',
  'erase-color': 'Erase only the pixels that match the color you click.',
  'select-box': 'Drag a rectangle to select it. Drag inside to move.',
  'select-lasso': 'Draw around any shape to select it.',
  'select-wand': 'Click to select a region of similar color.',
  line: 'Drag to draw a straight line.',
  'isometric-line': 'Draw clean 2:1 lines for isometric art.',
  rectangle: 'Drag to draw a box.',
  ellipse: 'Drag to draw an ellipse.',
  'normal-chisel': 'Carve bevels into a normal map for 2.5D lighting.',
  eyedropper: 'Pick a color from the artwork.',
};
