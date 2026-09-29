'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import PanelSection from '@/components/ui/PanelSection';
import StudioSlider from '@/components/ui/StudioSlider';
import { applyAtmosphericColorGrade, cleanJaggiesOnCanvas, cleanStrayPixelsOnCanvas, harmonizePaletteColors, quantizeToActivePalette } from '@/lib/ai/pixelAiEngine';
import { applyAtkinsonDither, applyRiemersmaDither, applyZhangSuenThinning } from '@/lib/ai/smartMathEngine';
import { getOrCreateBuffer } from '@/lib/engine/bufferRegistry';
import { studioEvents } from '@/lib/events/studioEvents';
import type { SpriteCleanupOptions, SpriteCleanupStats } from '@/lib/ai/spriteCleanup';

type RasterAction = 'jaggies' | 'thin' | 'strays' | 'sunset' | 'moonlight' | 'neon' | 'atkinson' | 'riemersma' | 'palette';
const RASTER_LABELS: Record<RasterAction, string> = {
  jaggies: 'Smooth Jaggies', thin: 'Thin to 1px', strays: 'Erase Stray Pixels',
  sunset: 'Sunset Mood', moonlight: 'Moonlight Mood', neon: 'Neon Mood',
  atkinson: 'Atkinson Dither', riemersma: 'Smooth Dither', palette: 'Snap to Active Palette',
};

function thumbnail(ctx: CanvasRenderingContext2D, width: number, height: number): string {
  const output = document.createElement('canvas');
  const scale = Math.min(1, 160 / Math.max(width, height));
  output.width = Math.max(1, Math.round(width * scale));
  output.height = Math.max(1, Math.round(height * scale));
  const outputCtx = output.getContext('2d')!;
  outputCtx.imageSmoothingEnabled = false;
  outputCtx.drawImage(ctx.canvas, 0, 0, output.width, output.height);
  return output.toDataURL('image/png');
}

export const PixiBudAssistanceSection: React.FC = () => {
  const palettes = useStudioStore((s) => s.palettes);
  const currentPaletteId = useStudioStore((s) => s.currentPaletteId);
  const addCustomColorToPalette = useStudioStore((s) => s.addCustomColorToPalette);
  const currentProjectId = useStudioStore((s) => s.currentProjectId);
  const activeFrameId = useStudioStore((s) => s.frames[s.activeFrameIndex]?.id);
  const activeLayerId = useStudioStore((s) => s.activeLayerId);
  const editRevision = useStudioStore((s) => s.editRevision);
  const bufferVersion = useStudioStore((s) => s.bufferVersion);
  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const canvasHeight = useStudioStore((s) => s.canvasHeight);
  const activeLayerLocked = useStudioStore((s) => s.frames[s.activeFrameIndex]?.layers.find((layer) => layer.id === s.activeLayerId)?.locked ?? false);

  const [rotationAngle, setRotationAngle] = useState<number>(45);
  const [cleanupAlpha, setCleanupAlpha] = useState(96);
  const [cleanupPalette, setCleanupPalette] = useState(true);
  const [cleanupThin, setCleanupThin] = useState(false);
  const [cleanupAllFrames, setCleanupAllFrames] = useState(false);
  const [cleanupReport, setCleanupReport] = useState<{
    phase: 'scan' | 'applied'; stats: SpriteCleanupStats; frames: number; skippedLocked: number;
    source: { projectId: string; frameId: string; layerId: string; editRevision: number; bufferVersion: number };
    beforePreview?: string; afterPreview?: string;
  } | null>(null);
  const [rasterPreview, setRasterPreview] = useState<{
    action: RasterAction; sourceKey: string; beforeUrl: string; afterUrl: string; changedPixels: number; paletteColors: string[];
  } | null>(null);
  const rasterPreviewRef = useRef<HTMLDivElement>(null);
  const currentPalette = palettes.find((p) => p.id === currentPaletteId) || palettes[0];
  const sourceKey = JSON.stringify([currentProjectId, activeFrameId, activeLayerId, editRevision, bufferVersion,
    activeLayerLocked, currentPaletteId, currentPalette.colors]);
  const rasterPreviewCurrent = rasterPreview?.sourceKey === sourceKey && !activeLayerLocked;
  const cleanupPreviewCurrent = cleanupReport?.phase === 'scan' &&
    cleanupReport.source.projectId === currentProjectId &&
    cleanupReport.source.frameId === activeFrameId &&
    cleanupReport.source.layerId === activeLayerId &&
    cleanupReport.source.editRevision === editRevision &&
    cleanupReport.source.bufferVersion === bufferVersion;

  useEffect(() => studioEvents.on('pixibun:sprite-cleanup-report', setCleanupReport), []);
  useEffect(() => {
    if (rasterPreview) rasterPreviewRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [rasterPreview]);

  const cleanupOptions = (): SpriteCleanupOptions => ({
    alphaCutoff: cleanupAlpha,
    maxSpeckPixels: 2,
    paletteSize: 24,
    simplifyColors: cleanupPalette,
    thinDarkLines: cleanupThin,
  });

  const handleRotSprite = (angle: number) => {
    studioEvents.emit('pixibun:rot-sprite', { angle });
  };

  const prepareRasterPreview = (action: RasterAction) => {
    if (!activeLayerId || activeLayerLocked) {
      studioEvents.emit('pixibun:toast', { type: 'error', message: 'Unlock and select a layer before previewing an edit.' });
      return;
    }
    const source = getOrCreateBuffer(activeLayerId, canvasWidth, canvasHeight).ctx;
    const beforeData = source.getImageData(0, 0, canvasWidth, canvasHeight);
    const working = document.createElement('canvas');
    working.width = canvasWidth;
    working.height = canvasHeight;
    const ctx = working.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.putImageData(beforeData, 0, 0);
    const paletteColors = [...currentPalette.colors];
    switch (action) {
      case 'jaggies': cleanJaggiesOnCanvas(ctx, canvasWidth, canvasHeight); break;
      case 'thin': applyZhangSuenThinning(ctx, canvasWidth, canvasHeight); break;
      case 'strays': cleanStrayPixelsOnCanvas(ctx, canvasWidth, canvasHeight); break;
      case 'sunset': case 'moonlight': case 'neon': applyAtmosphericColorGrade(ctx, canvasWidth, canvasHeight, action); break;
      case 'atkinson': applyAtkinsonDither(ctx, canvasWidth, canvasHeight, paletteColors); break;
      case 'riemersma': applyRiemersmaDither(ctx, canvasWidth, canvasHeight, paletteColors); break;
      case 'palette': quantizeToActivePalette(ctx, canvasWidth, canvasHeight, paletteColors); break;
    }
    const afterData = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;
    let changedPixels = 0;
    for (let i = 0; i < afterData.length; i += 4) {
      if (afterData[i] !== beforeData.data[i] || afterData[i + 1] !== beforeData.data[i + 1] ||
          afterData[i + 2] !== beforeData.data[i + 2] || afterData[i + 3] !== beforeData.data[i + 3]) changedPixels++;
    }
    setRasterPreview({ action, sourceKey, beforeUrl: thumbnail(source, canvasWidth, canvasHeight),
      afterUrl: thumbnail(ctx, canvasWidth, canvasHeight), changedPixels, paletteColors });
  };

  const applyRasterPreview = () => {
    if (!rasterPreview || !rasterPreviewCurrent || rasterPreview.changedPixels === 0) return;
    const { action, paletteColors } = rasterPreview;
    switch (action) {
      case 'jaggies': studioEvents.emit('pixibun:clean-jaggies'); break;
      case 'thin': studioEvents.emit('pixibun:skeleton-thinning'); break;
      case 'strays': studioEvents.emit('pixibun:remove-strays'); break;
      case 'sunset': case 'moonlight': case 'neon': studioEvents.emit('pixibun:color-grade', { grade: action }); break;
      case 'atkinson': studioEvents.emit('pixibun:atkinson-dither', { colors: paletteColors }); break;
      case 'riemersma': studioEvents.emit('pixibun:riemersma-dither', { colors: paletteColors }); break;
      case 'palette': studioEvents.emit('pixibun:quantize-palette', { colors: paletteColors }); break;
    }
    setRasterPreview(null);
  };

  const handleHarmonizePalette = () => {
    const harmonics = harmonizePaletteColors(currentPalette.colors);
    harmonics.forEach((c) => addCustomColorToPalette(currentPaletteId, c));
  };

  const handleInBetweenFrame = () => {
    studioEvents.emit('pixibun:in-between-frame');
  };

  return (
    <PanelSection
      title="Pixel Cleanup & RotSprite"
      ariaLabel="Pixel Cleanup & RotSprite (Atelier Assistants & Ramps)"
      storageKey="pixibun:panel:pixibud"
      defaultOpen={true}
    >
      <div className="flex flex-col gap-4">
        <div className="bg-[var(--surface-1)] border border-[var(--desk-border)] rounded-[2px] p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[var(--text-heading)]">Analyze &amp; Crisp Artwork</span>
            <span className="text-[9px] text-[var(--text-muted)]">Undoable</span>
          </div>
          <p className="text-[10px] leading-snug text-[var(--text-muted)]">
            Scan the selected layer for faint pixels, detached specks, excess shades, and thick dark edges.
          </p>
          <label className="flex items-center gap-2 text-[10px] text-[var(--text-body)]">
            <span className="shrink-0">Faint alpha ≤ {cleanupAlpha}</span>
            <input type="range" min="0" max="200" value={cleanupAlpha}
              aria-label="Cleanup faint alpha threshold"
              onChange={(event) => { setCleanupAlpha(Number(event.target.value)); setCleanupReport(null); }}
              className="w-full h-1 accent-[var(--accent-gold)]" />
          </label>
          <div className="flex gap-1.5">
            <button type="button" aria-label="Cleanup simplify shades" aria-pressed={cleanupPalette}
              onClick={() => { setCleanupPalette(!cleanupPalette); setCleanupReport(null); }}
              className="flex-1 py-1 text-[9px] pixel-tactile-btn cursor-pointer">
              Shades: {cleanupPalette ? 'Crisp' : 'Keep'}
            </button>
            <button type="button" aria-label="Cleanup thin dark lines" aria-pressed={cleanupThin}
              title="Optional: tighten thick dark strokes. Leave off to preserve facial and interior details."
              onClick={() => { setCleanupThin(!cleanupThin); setCleanupReport(null); }}
              className="flex-1 py-1 text-[9px] pixel-tactile-btn cursor-pointer">
              Lines: {cleanupThin ? 'Thin' : 'Keep'}
            </button>
          </div>
          <button type="button" aria-label="Cleanup frame scope"
            onClick={() => { setCleanupAllFrames(!cleanupAllFrames); setCleanupReport(null); }}
            className="py-1 text-[9px] pixel-tactile-btn cursor-pointer">
            {cleanupAllFrames ? 'Same layer across all frames' : 'Current frame only'}
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            <TactileButton size="sm" variant="default" aria-label="Scan artwork for cleanup"
              onClick={() => studioEvents.emit('pixibun:sprite-cleanup-scan', {
                options: cleanupOptions(), allFrames: cleanupAllFrames,
              })} className="text-[10px] justify-center">
              Scan Artwork
            </TactileButton>
            <TactileButton size="sm" variant="primary" aria-label="Apply analyzed artwork cleanup"
              disabled={!cleanupPreviewCurrent}
              onClick={() => studioEvents.emit('pixibun:sprite-cleanup-apply', {
                options: cleanupOptions(), allFrames: cleanupAllFrames,
              })} className="text-[10px] justify-center">
              Apply Cleanup
            </TactileButton>
          </div>
          {cleanupReport && (
            <div role="status" aria-live="polite" className="text-[9px] leading-relaxed text-[var(--text-body)]">
              {cleanupReport.phase === 'scan' ? 'Found' : 'Changed'} {cleanupReport.stats.changedPixels} pixels in {cleanupReport.frames} frame{cleanupReport.frames === 1 ? '' : 's'}:
              {' '}{cleanupReport.stats.removedFaint} faint removed, {cleanupReport.stats.hardenedAlpha} alpha hardened,
              {' '}{cleanupReport.stats.removedSpecks} stray,
              {' '}{cleanupReport.stats.simplifiedColors} shade, {cleanupReport.stats.thinnedLinePixels} line.
              {' '}Colors: {cleanupReport.stats.sourceColors} → {cleanupReport.stats.resultColors}.
              {cleanupReport.stats.removedFaint === 0 && cleanupReport.stats.hardenedAlpha === 0 &&
                ' No translucent pixels found; the alpha slider cannot remove opaque gray marks.'}
              {cleanupReport.skippedLocked > 0 && ` Skipped ${cleanupReport.skippedLocked} locked layer${cleanupReport.skippedLocked === 1 ? '' : 's'}.`}
            </div>
          )}
          {cleanupReport?.phase === 'scan' && !cleanupPreviewCurrent && (
            <p role="status" className="text-[10px] text-[var(--accent-gold)]">Artwork changed since this preview. Scan again before applying.</p>
          )}
          {cleanupReport?.phase === 'scan' && cleanupReport.beforePreview && cleanupReport.afterPreview && (
            <div className="grid grid-cols-2 gap-1.5 text-center text-[9px] text-[var(--text-muted)]">
              {([['Before', cleanupReport.beforePreview], ['Preview', cleanupReport.afterPreview]] as const).map(([label, url]) => (
                <div key={label}>
                  <div className="mb-0.5">{label}</div>
                  <div role="img" aria-label={`${label} artwork cleanup thumbnail`}
                    className="h-24 border border-[var(--desk-border)] bg-white bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${url})`, backgroundSize: 'contain', imageRendering: 'pixelated' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {rasterPreview && (
          <div ref={rasterPreviewRef} className="border border-[var(--desk-border)] bg-[var(--surface-1)] p-2.5 flex flex-col gap-2" aria-label={`${RASTER_LABELS[rasterPreview.action]} artwork preview`}>
            <div className="text-[11px] font-semibold text-[var(--text-heading)]">{RASTER_LABELS[rasterPreview.action]} preview</div>
            <p className="text-[10px] text-[var(--text-body)]">{rasterPreview.changedPixels} pixel{rasterPreview.changedPixels === 1 ? '' : 's'} would change on the selected layer.</p>
            <div className="grid grid-cols-2 gap-1.5 text-center text-[9px] text-[var(--text-muted)]">
              {([['Before', rasterPreview.beforeUrl], ['After', rasterPreview.afterUrl]] as const).map(([label, url]) => (
                <div key={label}>
                  <div className="mb-0.5">{label}</div>
                  <div role="img" aria-label={`${label} ${RASTER_LABELS[rasterPreview.action]} thumbnail`}
                    className="h-24 border border-[var(--desk-border)] bg-white bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${url})`, backgroundSize: 'contain', imageRendering: 'pixelated' }} />
                </div>
              ))}
            </div>
            {!rasterPreviewCurrent && <p role="status" className="text-[10px] text-[var(--accent-gold)]">Artwork or palette changed. Preview again before applying.</p>}
            <div className="grid grid-cols-2 gap-1.5">
              <TactileButton size="sm" variant="default" onClick={() => setRasterPreview(null)} className="text-[10px] justify-center">Cancel</TactileButton>
              <TactileButton size="sm" variant="primary" onClick={applyRasterPreview} disabled={!rasterPreviewCurrent || rasterPreview.changedPixels === 0} aria-label={`Apply ${RASTER_LABELS[rasterPreview.action]} preview`} className="text-[10px] justify-center">Apply to Layer</TactileButton>
            </div>
          </div>
        )}

        {/* Module 4: Pixel Perfection & RotSprite Engine */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-sans font-medium text-[var(--text-heading)] flex items-center gap-1.5">
              <PixelIcon name="rotate" size={12} />
              <span>Clean Rotation &amp; Lines</span>
            </span>
            <span className="text-[9px] font-sans text-[var(--text-muted)]">RotSprite</span>
          </div>

          {/* RotSprite Angle Control */}
          <div className="bg-[var(--surface-1)] p-2.5 rounded-[2px] border border-[var(--desk-border)] flex flex-col gap-2.5">
            <StudioSlider
              label="Rotation Angle"
              value={rotationAngle}
              min={-180}
              max={180}
              unit="°"
              onChange={(val) => setRotationAngle(val)}
            />

            <div className="inline-flex bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[2px] p-0.5 w-full">
              {[-90, -45, 45, 90].map((deg) => (
                <button
                  key={deg}
                  onClick={() => {
                    setRotationAngle(deg);
                    handleRotSprite(deg);
                  }}
                  className="flex-1 py-0.5 text-[9px] font-mono font-medium text-[var(--text-muted)] hover:text-[var(--text-heading)] rounded-[1px] hover:bg-[var(--surface-2)] cursor-pointer transition-colors"
                >
                  {deg > 0 ? `+${deg}°` : `${deg}°`}
                </button>
              ))}
            </div>
          </div>

          <TactileButton
            size="sm"
            variant="default"
            onClick={() => handleRotSprite(rotationAngle)}
            title="RotSprite: Clean rotation without blurry bilinear artifacts"
            aria-label="Rotate Cleanly"
            data-testid="rotate-cleanly-button"
            className="text-[10px] py-1.5 font-medium bg-[var(--surface-1)] border-[var(--desk-border)] text-[var(--text-heading)] hover:text-[var(--accent-gold)] justify-center flex items-center gap-1.5"
          >
            <PixelIcon name="rotate" size={12} />
            <span>Rotate Cleanly</span>
            <span className="opacity-90 font-mono">({rotationAngle}°)</span>
          </TactileButton>

          <div className="grid grid-cols-2 gap-1.5">
            <TactileButton
              size="sm"
              variant="default"
              onClick={() => prepareRasterPreview('jaggies')}
              title="Clean single-pixel L-corner stair-stepping along strokes"
              aria-label="Smooth Jaggies - De-Jaggy"
              className="text-[10px] py-1.5 font-medium bg-[var(--surface-1)] border-[var(--desk-border)] text-[var(--text-heading)] hover:text-[var(--accent-gold)] flex items-center justify-center gap-1"
            >
              <PixelIcon name="pen" size={12} />
              <span>Smooth Jaggies</span>
            </TactileButton>

            <TactileButton
              size="sm"
              variant="default"
              onClick={() => prepareRasterPreview('thin')}
              title="Trim thick pixel strokes down to crisp 1px lines"
              aria-label="Thin to 1px"
              className="text-[10px] py-1.5 font-medium bg-[var(--surface-1)] border-[var(--desk-border)] text-[var(--text-heading)] hover:text-[var(--accent-gold)] flex items-center justify-center gap-1"
            >
              <PixelIcon name="pen" size={12} />
              <span>Thin to 1px</span>
            </TactileButton>
          </div>

          <TactileButton
            size="sm"
            variant="default"
            onClick={() => prepareRasterPreview('strays')}
            title="Erase isolated single-pixel dots with no touching neighbors"
            aria-label="Erase Stray Pixels - Remove Stray Pixels"
            className="text-[10px] py-1.5 font-medium bg-[var(--surface-1)] border-[var(--desk-border)] text-[var(--text-heading)] hover:text-[var(--accent-gold)] justify-center"
          >
            <PixelIcon name="eraser" size={12} />
            <span>Erase Stray Pixels</span>
          </TactileButton>
        </div>

        <div className="h-px w-full bg-[var(--desk-border)]" />

        {/* Module 5: Color Science, Grading & In-Betweening */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[11px] font-sans font-medium text-[var(--text-heading)] flex items-center gap-1.5">
            <PixelIcon name="palette" size={12} />
            <span>Color Moods &amp; Palette</span>
          </span>

          {/* Color Grading Presets */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-sans text-[var(--text-muted)]">Color Mood:</span>
            <div className="inline-flex bg-[var(--surface-1)] border border-[var(--desk-border)] rounded-[2px] p-0.5">
              <button
                onClick={() => prepareRasterPreview('sunset')}
                className="flex-1 py-1 text-[9px] font-sans font-medium text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)] rounded-[1px] cursor-pointer transition-colors"
              >
                Sunset
              </button>
              <button
                onClick={() => prepareRasterPreview('moonlight')}
                className="flex-1 py-1 text-[9px] font-sans font-medium text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)] rounded-[1px] cursor-pointer transition-colors"
              >
                Moonlight
              </button>
              <button
                onClick={() => prepareRasterPreview('neon')}
                className="flex-1 py-1 text-[9px] font-sans font-medium text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-2)] rounded-[1px] cursor-pointer transition-colors"
              >
                Neon
              </button>
            </div>
          </div>

          {/* Advanced Dithering */}
          <div className="grid grid-cols-2 gap-1.5">
            <TactileButton
              size="sm"
              variant="default"
              onClick={() => prepareRasterPreview('atkinson')}
              title="Classic retro Macintosh dither pattern for shading"
              aria-label="Atkinson Dither"
              className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)] flex items-center justify-center gap-1"
            >
              <PixelIcon name="dither" size={12} />
              <span>Atkinson Dither</span>
            </TactileButton>

            <TactileButton
              size="sm"
              variant="default"
              onClick={() => prepareRasterPreview('riemersma')}
              title="Smooth continuous-tone dither without directional banding"
              aria-label="Smooth Dither - Riemersma Dither"
              className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)] flex items-center justify-center gap-1"
            >
              <PixelIcon name="dither" size={12} />
              <span>Smooth Dither</span>
            </TactileButton>
          </div>

          {/* Snap / Quantize to Palette */}
          <TactileButton
            size="sm"
            variant="default"
            onClick={() => prepareRasterPreview('palette')}
            title="Match all layer colors to their closest swatches in the active palette"
            aria-label="Snap to Active Palette"
            className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)] justify-center"
          >
            <PixelIcon name="palette" size={12} />
            <span>Snap to Active Palette</span>
          </TactileButton>

          {/* Harmonize Palette */}
          <TactileButton
            size="sm"
            variant="default"
            onClick={handleHarmonizePalette}
            title="Add complementary and accent shades to your active palette"
            aria-label="+ Harmonize Accents"
            className="text-[10px] py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)] justify-center"
          >
            <PixelIcon name="palette" size={12} />
            <span>+ Harmonize Accents</span>
          </TactileButton>

          {/* In-Between Animation Frame */}
          <TactileButton
            size="sm"
            variant="primary"
            onClick={handleInBetweenFrame}
            title="Generate a smooth in-between frame between adjacent keyframes"
            aria-label="+ In-Between Frame (Morph)"
            className="text-xs py-2 font-bold justify-center"
          >
            <PixelIcon name="play" size={12} />
            <span>+ Generate In-Between Frame</span>
          </TactileButton>
        </div>
      </div>
    </PanelSection>
  );
};
