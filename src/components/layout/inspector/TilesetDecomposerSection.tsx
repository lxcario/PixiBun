'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import PanelSection from '@/components/ui/PanelSection';
import { studioEvents } from '@/lib/events/studioEvents';
import { prepareTilesetBundle, tilesetSourceKey, assertTilesetCurrent } from '@/lib/export/tilesetBundle';
import { compositeFrame } from '@/lib/render/compositor';
import { generate47BlobEdgeData } from '@/lib/graphics/pixelRasterEngine';

function contourThumbnail(canvas: HTMLCanvasElement): string {
  const thumbnail = document.createElement('canvas');
  const scale = Math.min(1, 160 / Math.max(canvas.width, canvas.height));
  thumbnail.width = Math.max(1, Math.round(canvas.width * scale));
  thumbnail.height = Math.max(1, Math.round(canvas.height * scale));
  const ctx = thumbnail.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, 0, 0, thumbnail.width, thumbnail.height);
  return thumbnail.toDataURL('image/png');
}

export const TilesetDecomposerSection: React.FC = () => {
  const showNormalMapPreview = useStudioStore((s) => s.showNormalMapPreview);
  const toggleNormalMapPreview = useStudioStore((s) => s.toggleNormalMapPreview);
  const selection = useStudioStore((s) => s.selection);
  const bufferVersion = useStudioStore((s) => s.bufferVersion);
  const frames = useStudioStore((s) => s.frames);
  const activeFrameIndex = useStudioStore((s) => s.activeFrameIndex);
  const canvasWidth = useStudioStore((s) => s.canvasWidth);
  const canvasHeight = useStudioStore((s) => s.canvasHeight);
  const currentProjectId = useStudioStore((s) => s.currentProjectId);
  const activeLayerId = useStudioStore((s) => s.activeLayerId);
  const editRevision = useStudioStore((s) => s.editRevision);

  const [tilePreview, setTilePreview] = useState<{ tileUrl: string; repeatUrl: string; width: number; height: number } | null>(null);
  const [contourPreview, setContourPreview] = useState<{ beforeUrl: string; afterUrl: string; count: number; sourceKey: string } | null>(null);
  const [tilesetSize, setTilesetSize] = useState<8 | 16 | 32>(16);
  const [tilesetResult, setTilesetResult] = useState<{
    uniqueCount: number;
    cols: number;
    rows: number;
    json: string;
    sourceKey: string;
    ownership: number;
  } | null>(null);
  const [copiedTilemap, setCopiedTilemap] = useState<string | null>(null);
  const [tileError, setTileError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const tileJob = useRef<AbortController | null>(null);
  const tileBundle = useRef<Awaited<ReturnType<typeof prepareTilesetBundle>> | null>(null);
  // Subscribe to source changes so stale results cannot be copied or downloaded.
  const tileSourceKey = JSON.stringify([currentProjectId, frames[activeFrameIndex]?.id, activeLayerId, canvasWidth, canvasHeight, tilesetSize, editRevision, bufferVersion, tilesetSourceKey(tilesetSize)]);
  const [ownership, setOwnership] = useState({ key: tileSourceKey, version: 0 });
  // A → B → A must not revive a result whose download reservation was released at B.
  if (ownership.key !== tileSourceKey) setOwnership({ key: tileSourceKey, version: ownership.version + 1 });
  const tileJobKey = JSON.stringify([tileSourceKey, ownership.version]);
  const resultCurrent = tilesetResult?.sourceKey === tilesetSourceKey(tilesetSize) && tilesetResult?.ownership === ownership.version;
  const slicing = pendingKey === tileJobKey;
  useEffect(() => () => {
    tileJob.current?.abort(); tileJob.current = null;
    tileBundle.current?.dispose(); tileBundle.current = null;
  }, [tileJobKey]);

  useEffect(() => {
    if (!selection) {
      setTilePreview(null);
      return;
    }
    const x = Math.max(0, Math.floor(selection.x));
    const y = Math.max(0, Math.floor(selection.y));
    const width = Math.min(canvasWidth - x, Math.ceil(selection.w));
    const height = Math.min(canvasHeight - y, Math.ceil(selection.h));
    if (width < 1 || height < 1) {
      setTilePreview(null);
      return;
    }

    const source = compositeFrame(frames, activeFrameIndex, canvasWidth, canvasHeight, { freshCanvas: true });
    if (!source) return;
    const tile = document.createElement('canvas');
    tile.width = width;
    tile.height = height;
    const tileCtx = tile.getContext('2d');
    if (!tileCtx) return;
    tileCtx.imageSmoothingEnabled = false;
    tileCtx.drawImage(source, x, y, width, height, 0, 0, width, height);

    // Bound the preview even when the selected export tile is very large.
    const previewScale = Math.min(1, 384 / (3 * Math.max(width, height)));
    const previewTileWidth = Math.max(1, Math.floor(width * previewScale));
    const previewTileHeight = Math.max(1, Math.floor(height * previewScale));
    const repeat = document.createElement('canvas');
    repeat.width = previewTileWidth * 3;
    repeat.height = previewTileHeight * 3;
    const repeatCtx = repeat.getContext('2d');
    if (!repeatCtx) return;
    repeatCtx.imageSmoothingEnabled = false;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        repeatCtx.drawImage(tile, col * previewTileWidth, row * previewTileHeight, previewTileWidth, previewTileHeight);
      }
    }
    setTilePreview({ tileUrl: tile.toDataURL('image/png'), repeatUrl: repeat.toDataURL('image/png'), width, height });
  }, [selection, bufferVersion, frames, activeFrameIndex, canvasWidth, canvasHeight]);

  const frame = frames[activeFrameIndex];
  const contourSourceKey = JSON.stringify([currentProjectId, frame?.id, editRevision, bufferVersion]);
  const contourPreviewCurrent = contourPreview?.sourceKey === contourSourceKey;

  const preview47Blob = () => {
    if (!frame) return;
    const sourceFrames = frames.slice();
    sourceFrames[activeFrameIndex] = { ...frame, layers: frame.layers.filter((layer) => layer.tag !== 'blob-edges') };
    const source = compositeFrame(sourceFrames, activeFrameIndex, canvasWidth, canvasHeight, { freshCanvas: true });
    const sourceCtx = source?.getContext('2d', { willReadFrequently: true });
    if (!source || !sourceCtx) return;
    const { blobPixels } = generate47BlobEdgeData(sourceCtx, canvasWidth, canvasHeight);
    const result = document.createElement('canvas');
    result.width = canvasWidth;
    result.height = canvasHeight;
    const resultCtx = result.getContext('2d');
    if (!resultCtx) return;
    resultCtx.imageSmoothingEnabled = false;
    resultCtx.drawImage(source, 0, 0);
    for (const pixel of blobPixels) {
      resultCtx.fillStyle = `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, ${pixel.a / 255})`;
      resultCtx.fillRect(pixel.x, pixel.y, 1, 1);
    }
    setContourPreview({ beforeUrl: contourThumbnail(source), afterUrl: contourThumbnail(result),
      count: blobPixels.length, sourceKey: contourSourceKey });
  };

  const apply47Blob = () => {
    if (!contourPreviewCurrent || !contourPreview?.count) return;
    if (showNormalMapPreview) toggleNormalMapPreview();
    studioEvents.emit('pixibun:apply-47-blob');
    setContourPreview(null);
  };

  const handleDecomposeTileset = async () => {
    tileJob.current?.abort(); tileBundle.current?.dispose(); tileBundle.current = null;
    const controller = new AbortController(); tileJob.current = controller;
    setPendingKey(tileJobKey); setCopiedTilemap(null); setTileError(null); setTilesetResult(null);
    try {
      const result = await prepareTilesetBundle(tilesetSize, controller.signal);
      if (controller.signal.aborted) { result.dispose(); return; }
      tileBundle.current = result;
      setTilesetResult({ uniqueCount: result.uniqueCount, cols: result.cols, rows: result.rows, json: result.json, sourceKey: result.sourceKey, ownership: ownership.version });
    } catch (error) {
      if (!controller.signal.aborted) setTileError(error instanceof Error ? error.message : 'Tile slicing could not finish. Please try again.');
    } finally {
      if (!controller.signal.aborted) setPendingKey(null);
    }
  };

  const handleCopyTilemap = async () => {
    if (!tilesetResult || !resultCurrent) return;
    try {
      assertTilesetCurrent(tilesetResult.sourceKey, tilesetSize);
      await navigator.clipboard.writeText(tilesetResult.json);
      assertTilesetCurrent(tilesetResult.sourceKey, tilesetSize);
      setCopiedTilemap(tilesetResult.sourceKey); setTileError(null);
    } catch (error) { setTileError(error instanceof Error ? error.message : 'Copy could not start. Download the bundle instead.'); }
  };

  const handleDownloadTileset = () => {
    const result = tileBundle.current;
    if (!result || !resultCurrent) return;
    try {
      assertTilesetCurrent(result.sourceKey, tilesetSize);
      const url = URL.createObjectURL(result.blob), link = document.createElement('a');
      link.href = url; link.download = 'pixibun-tileset.zip'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setTileError(error instanceof Error ? error.message : 'Tile download could not start.'); }
  };

  return (
    <PanelSection
      title="Patterns & Tilesets"
      ariaLabel="Patterns & Tilesets"
      storageKey="pixibun:panel:tileset"
      defaultOpen={false}
    >
      <div className="flex flex-col gap-4">
        {/* The selected tile is repeated as-is; drawing remains on the source canvas. */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-sans font-medium text-[var(--text-heading)] flex items-center gap-1.5">
              <PixelIcon name="grid" size={12} />
              <span>Repeat Preview</span>
            </span>
            <span className="text-[9px] font-sans text-[var(--text-muted)]">3 × 3</span>
          </div>

          <p className="text-[10px] text-[var(--text-muted)] font-sans leading-tight">
            Select a tile on the canvas. This preview repeats its exact pixels, so you can edit the tile and inspect the seams.
          </p>
          {selection && tilePreview ? (
            <>
              <div className="text-[10px] font-mono text-[var(--text-body)]">Selected tile: {tilePreview.width} × {tilePreview.height} px</div>
              <div
                className="flex items-center justify-center h-44 overflow-hidden border border-[var(--desk-border)]"
                aria-label="3 by 3 repeated tile preview"
                style={{ backgroundColor: '#f0eef3', backgroundImage: 'linear-gradient(45deg, #dcd9e2 25%, transparent 25%), linear-gradient(-45deg, #dcd9e2 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #dcd9e2 75%), linear-gradient(-45deg, transparent 75%, #dcd9e2 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0' }}
              >
                <img src={tilePreview.repeatUrl} alt="Selected tile repeated three times in each direction" className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
              </div>
              <a href={tilePreview.tileUrl} download="pixibun-tile.png" className="text-center text-[10px] font-semibold py-1.5 border border-[var(--desk-border)] bg-[var(--surface-1)] text-[var(--text-heading)] hover:text-[var(--accent-gold)]">
                Export selected tile PNG
              </a>
              <p className="text-[10px] text-[var(--text-muted)]">The exported tile is unchanged. Check the preview edges before using it as a seamless texture.</p>
            </>
          ) : (
            <p className="text-[10px] text-[var(--text-body)] border border-[var(--desk-border)] p-2">Use a selection tool to choose the tile you want to repeat.</p>
          )}
        </div>

        <div className="h-px w-full bg-[var(--desk-border)]" />

        {/* Module 2.6: Tileset & Tilemap Decomposer */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-sans font-medium text-[var(--text-heading)] flex items-center gap-1.5">
              <PixelIcon name="grid-iso" size={12} />
              <span>Tile Slicer & Map Exporter</span>
            </span>
            <span className="text-[9px] font-sans text-[var(--text-muted)]">Game Export</span>
          </div>

          <p className="text-[10px] text-[var(--text-muted)] font-sans leading-tight">
            Slice the selected layer into unique tiles. Download its PNG and matching maps together. Canvas dimensions must divide evenly by the tile size.
          </p>

          <div className="flex items-center justify-between text-[10px] font-sans">
            <span className="text-[var(--text-body)] font-medium">Tile Size:</span>
            <div className="inline-flex bg-[var(--surface-1)] border border-[var(--desk-border)] rounded-[2px] p-0.5">
              {([8, 16, 32] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setTilesetSize(size)}
                  aria-pressed={tilesetSize === size}
                  className={`px-2 py-0.5 text-[10px] font-mono font-medium rounded-[1px] transition-colors cursor-pointer ${
                    tilesetSize === size
                      ? 'bg-[var(--surface-3)] text-[var(--text-heading)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          <TactileButton
            size="sm"
            variant="default"
            onClick={handleDecomposeTileset}
            disabled={slicing}
            title="Break sprite into unique tiles and generate a 2D tilemap"
            className="text-xs py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)] justify-center"
          >
            <PixelIcon name="layers" size={12} />
            <span>{slicing ? 'Preparing tiles…' : 'Slice Into Unique Tiles'}</span>
          </TactileButton>

          <TactileButton
            size="sm"
            variant="default"
            onClick={preview47Blob}
            title="Preview highlighted and shaded contours based on 47-blob neighbor masks"
            aria-label="Preview 47-blob contours"
            className="text-xs py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)] justify-center flex items-center gap-1"
          >
            <PixelIcon name="grid-iso" size={12} />
            <span>Preview 47-blob Contours</span>
          </TactileButton>

          {contourPreview && (
            <div className="flex flex-col gap-2 border border-[var(--desk-border)] bg-[var(--surface-1)] p-2" aria-label="47-blob contour preview">
              <p className="text-[10px] text-[var(--text-body)]">{contourPreview.count} contour pixels would be drawn on a separate layer.</p>
              <div className="grid grid-cols-2 gap-1.5 text-center text-[9px] text-[var(--text-muted)]">
                {([['Before', contourPreview.beforeUrl], ['After', contourPreview.afterUrl]] as const).map(([label, url]) => (
                  <div key={label}>
                    <div className="mb-0.5">{label}</div>
                    <div role="img" aria-label={`${label} contour thumbnail`} className="h-24 border border-[var(--desk-border)] bg-white bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${url})`, backgroundSize: 'contain', imageRendering: 'pixelated' }} />
                  </div>
                ))}
              </div>
              {!contourPreviewCurrent && <p className="text-[10px] text-[var(--accent-gold)]">Artwork changed. Preview again before applying.</p>}
              <div className="grid grid-cols-2 gap-1.5">
                <TactileButton size="sm" variant="default" onClick={() => setContourPreview(null)} className="text-[10px] justify-center">Cancel</TactileButton>
                <TactileButton size="sm" variant="primary" onClick={apply47Blob} disabled={!contourPreviewCurrent || contourPreview.count === 0} aria-label="Apply previewed 47-blob contours" className="text-[10px] justify-center">Apply Contours</TactileButton>
              </div>
            </div>
          )}

          {slicing && <TactileButton size="sm" onClick={() => { tileJob.current?.abort(); setPendingKey(null); }}>Cancel tile export</TactileButton>}
          {pendingKey && !slicing && <p role="status" className="text-[10px] text-[var(--text-body)]">Artwork changed while preparing tiles. Slice again to use the current pixels.</p>}
          {tileError && <p role="alert" className="text-[10px] text-[var(--text-body)]">{tileError}</p>}
          {tilesetResult && (
            <div className="flex flex-col gap-1.5 p-2 bg-[var(--desk-surface-raised)] rounded-[2px] border border-[var(--desk-border)] text-[10px] font-mono">
              <div className="flex justify-between text-[var(--text-body)]">
                <span>Unique Tiles:</span>
                <span className="text-[var(--accent-gold)] font-bold">{tilesetResult.uniqueCount}</span>
              </div>
              <div className="flex justify-between text-[var(--text-body)]">
                <span>Grid Dimensions:</span>
                <span className="text-[var(--accent-plum)] font-bold">
                  {tilesetResult.cols} × {tilesetResult.rows}
                </span>
              </div>
              <TactileButton
                size="sm"
                variant={copiedTilemap === tilesetResult.sourceKey && resultCurrent ? 'primary' : 'default'}
                onClick={handleCopyTilemap}
                disabled={!resultCurrent}
                className="text-[10px] py-1 font-bold justify-center"
              >
                <PixelIcon name="copy" size={10} />
                <span>{copiedTilemap === tilesetResult.sourceKey && resultCurrent ? 'Copied to Clipboard!' : 'Copy Tilemap JSON'}</span>
              </TactileButton>
              <TactileButton size="sm" variant="primary" onClick={handleDownloadTileset} disabled={!resultCurrent} className="text-[10px] py-1 font-bold justify-center">Download tile PNG + maps (.zip)</TactileButton>
              <p className="text-[10px] font-sans text-[var(--text-muted)]">Includes tileset.png, zero-based tilemap.json and Tiled map.tmj. Unpack them into the same folder.</p>
              {!resultCurrent && <p role="status" className="text-[10px] font-sans text-[var(--accent-gold)]">Artwork or settings changed. Slice again before copying or downloading.</p>}
            </div>
          )}
        </div>
      </div>
    </PanelSection>
  );
};
