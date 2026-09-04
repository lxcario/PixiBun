'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { TactileButton } from '@/components/ui/TactileButton';
import { PixelIcon } from '@/components/ui/PixelIcon';
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
    <>
      {/* Module 2.5: Procedural WaveFunctionCollapse (WFC) Texture Synthesis */}
      <div className="bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-[#f0be7c] uppercase tracking-wider flex items-center gap-1">
            <PixelIcon name="grid" size={12} />
            <span>WFC Pattern Synthesis</span>
          </span>
          <span className="text-[9px] font-mono text-[#a89ab8]">Gumin 2016</span>
        </div>

        <p className="text-[10px] text-[var(--text-body)] font-mono leading-tight">
          Select or draw a sample tile (8×8–16×16), then extend into an arbitrary tileable region obeying local neighborhood constraints.
        </p>

        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-[var(--text-body)] font-bold">Neighborhood (N):</span>
          <div className="flex gap-1">
            {([2, 3] as const).map((size) => (
              <button
                key={size}
                onClick={() => setWfcN(size)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-[2px] border cursor-pointer ${
                  wfcN === size
                    ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                    : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)]'
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
          title="Run WaveFunctionCollapse synthesis using canvas pixels as sample distribution"
          className="text-xs py-1.5 font-bold justify-center"
        >
          <PixelIcon name="sparkles" size={12} />
          <span>Extend Pattern (WFC)</span>
        </TactileButton>
      </div>

      {/* Module 2.6: Tileset & Tilemap Decomposer */}
      <div className="bg-[var(--desk-surface)] p-2.5 rounded-[2px] border-2 border-[var(--desk-border)] flex flex-col gap-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-[#f0be7c] uppercase tracking-wider flex items-center gap-1">
            <PixelIcon name="grid-iso" size={12} />
            <span>Tileset Decomposer</span>
          </span>
          <span className="text-[9px] font-mono text-[#a89ab8]">Phase 37.1</span>
        </div>

        <p className="text-[10px] text-[var(--text-body)] font-mono leading-tight">
          Decompose layer into unique tile atlas &amp; 2D tilemap matrix (Tiled / Godot format).
        </p>

        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-[var(--text-body)] font-bold">Tile Size:</span>
          <div className="flex gap-1">
            {([8, 16, 32] as const).map((size) => (
              <button
                key={size}
                onClick={() => setTilesetSize(size)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-[2px] border cursor-pointer ${
                  tilesetSize === size
                    ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                    : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)]'
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
          title="Analyze canvas, extract deduplicated tiles, and build 2D index matrix"
          className="text-xs py-1.5 font-bold bg-[var(--desk-surface-raised)] border-[var(--desk-border)] text-[var(--text-body)] hover:text-[#f0be7c] justify-center"
        >
          <PixelIcon name="layers" size={12} />
          <span>Decompose Layer</span>
        </TactileButton>

        {tilesetResult && (
          <div className="flex flex-col gap-1.5 p-2 bg-[var(--desk-surface-raised)] rounded-[2px] border border-[var(--desk-border)] text-[10px] font-mono">
            <div className="flex justify-between text-[var(--text-body)]">
              <span>Unique Tiles:</span>
              <span className="text-[#f0be7c] font-bold">{tilesetResult.uniqueCount}</span>
            </div>
            <div className="flex justify-between text-[var(--text-body)]">
              <span>Grid Dimensions:</span>
              <span className="text-[#dcabdf] font-bold">
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
    </>
  );
};
