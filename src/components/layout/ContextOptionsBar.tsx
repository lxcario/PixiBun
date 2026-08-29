'use client';

import React from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon, PixelIconName } from '@/components/ui/PixelIcon';
import { DitherMatrixType } from '@/types/tools';

const TOOL_METADATA: Record<string, { label: string; shortcut: string; icon: PixelIconName }> = {
  pen: { label: 'Pen', shortcut: 'B', icon: 'pen' },
  curve: { label: 'Bézier Curve', shortcut: 'C', icon: 'curve' },
  eraser: { label: 'Eraser', shortcut: 'E', icon: 'eraser' },
  bucket: { label: 'Flood Fill', shortcut: 'G', icon: 'bucket' },
  dither: { label: 'Dither Brush', shortcut: 'D', icon: 'dither' },
  eyedropper: { label: 'Eyedropper', shortcut: 'I', icon: 'eyedropper' },
  'select-box': { label: 'Marquee Box', shortcut: 'M', icon: 'select-box' },
  'select-lasso': { label: 'Lasso Select', shortcut: 'Q', icon: 'select-lasso' },
  'select-wand': { label: 'Magic Wand', shortcut: 'W', icon: 'select-wand' },
  line: { label: 'Line', shortcut: 'L', icon: 'line' },
  'isometric-line': { label: '2:1 Iso Line', shortcut: 'J', icon: 'isometric-line' },
  rectangle: { label: 'Rectangle', shortcut: 'U', icon: 'rectangle' },
  ellipse: { label: 'Ellipse', shortcut: 'O', icon: 'ellipse' },
  'color-replace': { label: 'Color Replace', shortcut: 'R', icon: 'color-replace' },
};

export const ContextOptionsBar: React.FC = () => {
  const {
    tools,
    setBrushSize,
    setPixelPerfect,
    setDitherMatrix,
    setDitherDensity,
    setBucketContiguous,
    setShapeFilled,
    setCurveTightness,
    setIsoAngleSnap,
    toggleSymmetryH,
    toggleSymmetryV,
    showIsoGuides,
    toggleIsoGuides,
    showTilePreview,
    toggleTilePreview,
    showFloatingPreview,
    toggleFloatingPreview,
  } = useStudioStore();

  const currentToolMeta = TOOL_METADATA[tools.activeTool] || {
    label: tools.activeTool,
    shortcut: '',
    icon: 'pen' as PixelIconName,
  };

  const isShapeTool =
    tools.activeTool === 'rectangle' ||
    tools.activeTool === 'ellipse' ||
    tools.activeTool === 'line' ||
    tools.activeTool === 'isometric-line';

  return (
    <div className="h-8 bg-[var(--desk-surface)] border-b-2 border-[var(--desk-border)] px-3 flex items-center justify-between text-xs font-mono text-[var(--text-heading)] select-none z-10 transition-colors duration-300 shadow-xs">
      {/* 1. Left: Active Tool Identifier & Shortcut */}
      <div className="flex items-center gap-2 pr-3 border-r border-[var(--desk-border)]">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] text-[#f0be7c] font-bold">
          <PixelIcon name={currentToolMeta.icon} size={14} />
          <span className="text-[11px]">{currentToolMeta.label}</span>
          {currentToolMeta.shortcut && (
            <span className="text-[9px] bg-[#140d1f] text-[#dcabdf] px-1 py-0.2 rounded-[1px]">
              {currentToolMeta.shortcut}
            </span>
          )}
        </div>
      </div>

      {/* 2. Center: Contextual Tool Parameters */}
      <div className="flex-1 flex items-center gap-3 px-3 overflow-x-auto">
        {/* Brush Size Slider (for Pen, Curve, Eraser, Shapes) */}
        {(tools.activeTool === 'pen' ||
          tools.activeTool === 'curve' ||
          tools.activeTool === 'eraser' ||
          tools.activeTool === 'dither' ||
          isShapeTool) && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[var(--text-body)] font-bold uppercase">Size:</span>
            <div className="flex items-center gap-1 bg-[var(--desk-surface-raised)] px-1.5 py-0.5 rounded-[2px] border border-[var(--desk-border)]">
              <input
                type="range"
                min="1"
                max="16"
                value={tools.brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                className="w-16 h-1.5 accent-[#f0be7c] cursor-pointer"
              />
              <span className="text-[#f0be7c] font-bold text-[10px] min-w-[24px] text-right">
                {tools.brushSize}px
              </span>
            </div>
          </div>
        )}

        {/* Pixel-Perfect Smoothing Toggle */}
        {(tools.activeTool === 'pen' || tools.activeTool === 'curve') && (
          <button
            onClick={() => setPixelPerfect(!tools.pixelPerfect)}
            title="Pixel-Perfect Smoothing: Removes L-corner double pixels"
            className={`px-2 py-0.5 text-[10px] font-bold rounded-[2px] border transition-colors cursor-pointer ${
              tools.pixelPerfect
                ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
            }`}
          >
            PP: {tools.pixelPerfect ? 'ON' : 'OFF'}
          </button>
        )}

        {/* Bézier Curve Tightness */}
        {tools.activeTool === 'curve' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[var(--text-body)] font-bold uppercase">Tightness:</span>
            <div className="flex items-center gap-1 bg-[var(--desk-surface-raised)] px-1.5 py-0.5 rounded-[2px] border border-[var(--desk-border)]">
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={tools.curveTightness}
                onChange={(e) => setCurveTightness(parseFloat(e.target.value))}
                className="w-14 h-1.5 accent-[#f0be7c] cursor-pointer"
              />
              <span className="text-[#dcabdf] font-bold text-[10px]">
                {Math.round(tools.curveTightness * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Bucket Mode & Tolerance */}
        {tools.activeTool === 'bucket' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBucketContiguous(!tools.bucketContiguous)}
              title={tools.bucketContiguous ? 'Fill Contiguous Island' : 'Replace All Matching Pixels'}
              className={`px-2 py-0.5 text-[10px] font-bold rounded-[2px] border transition-colors cursor-pointer ${
                !tools.bucketContiguous
                  ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                  : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
              }`}
            >
              Mode: {tools.bucketContiguous ? 'Contiguous Area' : 'Global Replace'}
            </button>
          </div>
        )}

        {/* Dither Matrix & Density */}
        {tools.activeTool === 'dither' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-body)] font-bold uppercase">Matrix:</span>
            <select
              value={tools.ditherMatrix}
              onChange={(e) => setDitherMatrix(e.target.value as DitherMatrixType)}
              className="bg-[var(--desk-surface-raised)] text-[#f0be7c] font-bold text-[10px] px-2 py-0.5 rounded-[2px] border border-[var(--desk-border)] outline-none cursor-pointer"
            >
              <option value="2x2">Bayer 2x2</option>
              <option value="4x4">Bayer 4x4</option>
              <option value="8x8">Bayer 8x8</option>
              <option value="atkinson">Atkinson (Retro Mac)</option>
              <option value="riemersma">Riemersma (Hilbert)</option>
            </select>

            <div className="flex items-center gap-1 bg-[var(--desk-surface-raised)] px-1.5 py-0.5 rounded-[2px] border border-[var(--desk-border)]">
              <span className="text-[9px] text-[var(--text-body)] font-bold">Density:</span>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={tools.ditherDensity}
                onChange={(e) => setDitherDensity(parseFloat(e.target.value))}
                className="w-14 h-1.5 accent-[#f0be7c] cursor-pointer"
              />
              <span className="text-[#f0be7c] font-bold text-[10px]">
                {Math.round(tools.ditherDensity * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Shape Fill vs Outline */}
        {(tools.activeTool === 'rectangle' || tools.activeTool === 'ellipse') && (
          <button
            onClick={() => setShapeFilled(!tools.shapeFilled)}
            className={`px-2 py-0.5 text-[10px] font-bold rounded-[2px] border transition-colors cursor-pointer ${
              tools.shapeFilled
                ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
            }`}
          >
            Shape: {tools.shapeFilled ? 'Filled Solid' : 'Outline Stroke'}
          </button>
        )}

        {/* Isometric Snap Toggle */}
        {tools.activeTool === 'isometric-line' && (
          <button
            onClick={() => setIsoAngleSnap(!tools.isoAngleSnap)}
            className={`px-2 py-0.5 text-[10px] font-bold rounded-[2px] border transition-colors cursor-pointer ${
              tools.isoAngleSnap
                ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
                : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
            }`}
          >
            2:1 Snap: {tools.isoAngleSnap ? 'ON (26.5°)' : 'FREE'}
          </button>
        )}

        {/* Selection Tools Advice */}
        {(tools.activeTool === 'select-box' || tools.activeTool === 'select-lasso') && (
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-body)]">
            <span>[Ctrl+C: Copy | Ctrl+X: Cut | H: Flip-H | V: Flip-V | Esc: Clear]</span>
          </div>
        )}
      </div>

      {/* 3. Right: Symmetry & Viewport Quick Toggles */}
      <div className="flex items-center gap-1.5 pl-3 border-l border-[var(--desk-border)]">
        {/* Symmetry H / V */}
        <button
          onClick={toggleSymmetryH}
          title="Horizontal Symmetry Axis (X)"
          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[2px] border transition-colors cursor-pointer ${
            tools.symmetryHorizontal
              ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
              : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
          }`}
        >
          Sym-H
        </button>

        <button
          onClick={toggleSymmetryV}
          title="Vertical Symmetry Axis (Y)"
          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[2px] border transition-colors cursor-pointer ${
            tools.symmetryVertical
              ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
              : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
          }`}
        >
          Sym-V
        </button>

        <div className="h-4 w-px bg-[var(--desk-border)] mx-0.5" />

        {/* Isometric 2:1 Guide Grid */}
        <button
          onClick={toggleIsoGuides}
          title="Toggle 2:1 Isometric Projection Guide Grid"
          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[2px] border transition-colors cursor-pointer flex items-center gap-1 ${
            showIsoGuides
              ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
              : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
          }`}
        >
          <PixelIcon name="grid-iso" size={12} />
          <span>Iso</span>
        </button>

        {/* 3x3 Seamless Tile Preview */}
        <button
          onClick={toggleTilePreview}
          title="Toggle 3x3 Seamless Pattern Tiling Matrix"
          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[2px] border transition-colors cursor-pointer flex items-center gap-1 ${
            showTilePreview
              ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
              : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
          }`}
        >
          <PixelIcon name="wrap" size={12} />
          <span>3x3</span>
        </button>

        {/* Floating Live 1x Preview Window Toggle */}
        <button
          onClick={toggleFloatingPreview}
          title="Toggle Floating Live 1x/2x/4x Animation Preview Window"
          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[2px] border transition-colors cursor-pointer flex items-center gap-1 ${
            showFloatingPreview
              ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
              : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
          }`}
        >
          <PixelIcon name="preview" size={12} />
          <span>Live</span>
        </button>
      </div>
    </div>
  );
};
