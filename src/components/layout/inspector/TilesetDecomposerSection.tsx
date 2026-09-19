'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
import PanelSection from '@/components/ui/PanelSection';
import { studioEvents } from '@/lib/events/studioEvents';
import { decomposeIntoTileset } from '@/lib/canvas/tileStamp';
import { getOrCreateBuffer } from '@/lib/engine/bufferRegistry';

export const TilesetDecomposerSection: React.FC = () => {
  const { showNormalMapPreview, toggleNormalMapPreview } = useStudioStore();

  const [wfcN, setWfcN] = useState<2 | 3>(2);
  const [tilesetSize, setTilesetSize] = useState<8 | 16 | 32>(16);
  const [tilesetResult, setTilesetResult] = useState<{
    uniqueCount: number;
    cols: number;
    rows: number;
    json: string;
  } | null>(null);
  const [copiedTilemap, setCopiedTilemap] = useState(false);

  const handleWfcExtend = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    studioEvents.emit('pixibun:wfc-synthesis', { n: wfcN, symmetries: 8 });
  };

  const handle47Blob = () => {
    if (showNormalMapPreview) toggleNormalMapPreview();
    studioEvents.emit('pixibun:apply-47-blob');
  };

  const handleDecomposeTileset = () => {
    const state = useStudioStore.getState();
    const activeId = state.activeLayerId;
    if (!activeId) return;

    try {
      const { ctx } = getOrCreateBuffer(activeId, state.canvasWidth, state.canvasHeight);
      const imgData = ctx.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
      const { tileset, tilemap } = decomposeIntoTileset(
        { width: state.canvasWidth, height: state.canvasHeight, data: imgData.data },
        tilesetSize
      );
      const jsonPayload = JSON.stringify(
        {
          tileSize: tilesetSize,
          columns: tilemap[0]?.length || 0,
          rows: tilemap.length,
          uniqueTiles: tileset.length,
          tilemap,
        },
        null,
        2
      );
      setTilesetResult({
        uniqueCount: tileset.length,
        cols: tilemap[0]?.length || 0,
        rows: tilemap.length,
        json: jsonPayload,
      });
    } catch (err) {
      console.error('Failed to decompose tileset:', err);
    }
  };

  const handleCopyTilemap = async () => {
    if (!tilesetResult) return;
    try {
      await navigator.clipboard.writeText(tilesetResult.json);
      setCopiedTilemap(true);
      setTimeout(() => setCopiedTilemap(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  return (
    <PanelSection
      title="Seamless Patterns & Tilesets"
      ariaLabel="Seamless Patterns & Tilesets (WFC & Tileset Tools)"
      storageKey="pixibun:panel:tileset"
      defaultOpen={false}
    >
      <div className="flex flex-col gap-4">
        {/* Module 2.5: Procedural WaveFunctionCollapse (WFC) Texture Synthesis */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-sans font-medium text-[var(--text-heading)] flex items-center gap-1.5">
              <PixelIcon name="grid" size={12} />
              <span>Seamless Pattern Generator</span>
            </span>
            <span className="text-[9px] font-sans text-[var(--text-muted)]">Tile Extender</span>
          </div>

          <p className="text-[10px] text-[var(--text-muted)] font-sans leading-tight">
            Sample selection edges to synthesize an extended repeating pattern.
          </p>

          <div className="flex items-center justify-between text-[10px] font-sans">
            <span className="text-[var(--text-body)] font-medium">Sample Window:</span>
            <div className="inline-flex bg-[var(--surface-1)] border border-[var(--desk-border)] rounded-[2px] p-0.5">
              {([2, 3] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setWfcN(size)}
                  className={`px-2 py-0.5 text-[10px] font-mono font-medium rounded-[1px] transition-colors cursor-pointer ${
                    wfcN === size
                      ? 'bg-[var(--surface-3)] text-[var(--text-heading)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                  }`}
                >
                  {size}×{size}
                </button>
              ))}
            </div>
          </div>

          <TactileButton
            size="sm"
            variant="primary"
            onClick={handleWfcExtend}
            title="Generate an extended seamless texture based on your canvas artwork"
            aria-label="Generate Seamless Pattern (WFC)"
            className="text-xs py-1.5 font-bold justify-center"
          >
            <PixelIcon name="grid" size={12} />
            <span>Generate Seamless Pattern</span>
          </TactileButton>
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
            Slice artwork into unique tiles and export a 2D tilemap.
          </p>

          <div className="flex items-center justify-between text-[10px] font-sans">
            <span className="text-[var(--text-body)] font-medium">Tile Size:</span>
            <div className="inline-flex bg-[var(--surface-1)] border border-[var(--desk-border)] rounded-[2px] p-0.5">
              {([8, 16, 32] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setTilesetSize(size)}
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
            title="Break sprite into unique tiles and generate a 2D tilemap"
            className="text-xs py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)] justify-center"
          >
            <PixelIcon name="layers" size={12} />
            <span>Slice Into Unique Tiles</span>
          </TactileButton>

          <TactileButton
            size="sm"
            variant="default"
            onClick={handle47Blob}
            title="Generate standard 47-blob corner and edge transitions for terrain tilesets"
            aria-label="47-Blob Autotile Edges"
            className="text-xs py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[var(--accent-gold)] justify-center flex items-center gap-1"
          >
            <PixelIcon name="grid-iso" size={12} />
            <span>Autotile Edges (47-Blob)</span>
          </TactileButton>

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
                variant={copiedTilemap ? 'primary' : 'default'}
                onClick={handleCopyTilemap}
                className="text-[10px] py-1 font-bold justify-center"
              >
                <PixelIcon name="copy" size={10} />
                <span>{copiedTilemap ? 'Copied to Clipboard!' : 'Copy Tilemap JSON'}</span>
              </TactileButton>
            </div>
          )}
        </div>
      </div>
    </PanelSection>
  );
};
