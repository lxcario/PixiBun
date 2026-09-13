'use client';

import React from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon, PixelIconName } from '@/components/ui/PixelIcon';
import { DitherMatrixType, WallpaperGroup } from '@/types/tools';
import { CvdLensMode, cycleCvdLens } from '@/lib/color/cvdLens';
import { TOOL_METADATA_MAP } from '@/config/shortcuts';

const CVD_LENS_BUTTON_LABELS: Record<CvdLensMode, string> = {
  none: 'OFF',
  protanopia: 'Pro',
  deuteranopia: 'Deu',
  tritanopia: 'Tri',
  monochromacy: 'Mono',
};

const CVD_LENS_TITLES: Record<CvdLensMode, string> = {
  none: 'Colorblindness Lens (P): OFF — cycles Protanopia / Deuteranopia / Tritanopia / Monochromacy',
  protanopia: 'Colorblindness Lens (P): Protanopia (red-weak) — cycles lens modes',
  deuteranopia: 'Colorblindness Lens (P): Deuteranopia (green-weak) — cycles lens modes',
  tritanopia: 'Colorblindness Lens (P): Tritanopia (blue-weak) — cycles lens modes',
  monochromacy: 'Colorblindness Lens (P): Monochromacy (luminance only) — cycles lens modes',
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
    setSymmetryGroup,
    showGrid,
    toggleGrid,
    showIsoGuides,
    toggleIsoGuides,
    showTilePreview,
    toggleTilePreview,
    showFloatingPreview,
    toggleFloatingPreview,
    cvdLens,
    squintMode,
    setCvdLens,
    toggleSquintMode,
  } = useStudioStore();

  const currentToolMeta = TOOL_METADATA_MAP[tools.activeTool] || {
    label: tools.activeTool,
    shortcut: '',
    icon: 'pen' as PixelIconName,
  };

  const isShapeTool =
    tools.activeTool === 'rectangle' ||
    tools.activeTool === 'ellipse' ||
    tools.activeTool === 'line' ||
    tools.activeTool === 'isometric-line';

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  React.useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, tools.activeTool]);

  return (
    <div className="h-8 bg-[var(--desk-surface)] border-b-2 border-[var(--desk-border)] px-3 flex items-center justify-between text-xs font-mono text-[var(--text-heading)] select-none z-10 transition-colors duration-300 shadow-xs">
      {/* 1. Left: Active Tool Identifier & Shortcut */}
      <div className="flex items-center gap-2 pr-3 border-r border-[var(--desk-border)] shrink-0">
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

      {/* 2. Center: Contextual Tool Parameters with Horizontal Scroll Affordance (UX-12) */}
      <div className="flex-1 relative min-w-0 overflow-hidden h-full flex items-center">
        {canScrollLeft && (
          <div
            className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[var(--desk-surface)] via-[var(--desk-surface)]/80 to-transparent pointer-events-none z-10 flex items-center"
            aria-hidden="true"
          >
            <span className="text-[8px] text-[var(--accent-gold)] pl-0.5">◀</span>
          </div>
        )}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="w-full flex items-center gap-3 px-3 overflow-x-auto scrollbar-none"
        >
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
                aria-label="Brush size"
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
                aria-label="Curve tightness"
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
              aria-label="Dither matrix algorithm"
              onChange={(e) => setDitherMatrix(e.target.value as DitherMatrixType)}
              className="bg-[var(--desk-surface-raised)] text-[#f0be7c] font-bold text-[10px] px-2 py-0.5 rounded-[2px] border border-[var(--desk-border)] outline-none cursor-pointer"
            >
              <option value="2x2">Bayer 2x2</option>
              <option value="4x4">Bayer 4x4</option>
              <option value="8x8">Bayer 8x8</option>
              <option value="blue-noise">Blue Noise (Void & Cluster)</option>
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
                aria-label="Dither density"
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
            aria-label={tools.shapeFilled ? 'Shape: Filled Solid' : 'Shape: Outline Stroke'}
            data-testid="shape-fill-toggle"
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
        {canScrollRight && (
          <div
            className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[var(--desk-surface)] via-[var(--desk-surface)]/80 to-transparent pointer-events-none z-10 flex items-center justify-end"
            aria-hidden="true"
          >
            <span className="text-[8px] text-[var(--accent-gold)] pr-0.5">▶</span>
          </div>
        )}
      </div>

      {/* 3. Right: Symmetry & Viewport Quick Toggles */}
      <div className="flex items-center gap-1.5 pl-3 border-l border-[var(--desk-border)] shrink-0">
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

        {/* Wallpaper Group Symmetry Brush (Schattschneider 1978) */}
        <select
          value={tools.symmetryGroup || 'none'}
          aria-label="Wallpaper group symmetry brush mode"
          onChange={(e) => setSymmetryGroup(e.target.value as WallpaperGroup)}
          className="bg-[var(--desk-surface-raised)] text-[#f0be7c] font-bold text-[10px] px-1.5 py-0.5 rounded-[2px] border border-[var(--desk-border)] outline-none cursor-pointer"
          title="Crystallographic Wallpaper Group Symmetry Brush (Schattschneider 1978): p2, pm, p4, p4m, p6m"
        >
          <option value="none">Group: None</option>
          <option value="p2">p2 (180° Rot)</option>
          <option value="pm">pm (Mirror)</option>
          <option value="p4">p4 (4-Fold 90°)</option>
          <option value="p4m">p4m (8-Way D4)</option>
          <option value="p6m">p6m (12-Way D6 Hex)</option>
        </select>

        <div className="h-4 w-px bg-[var(--desk-border)] mx-0.5" />

        {/* Pixel Grid Toggle */}
        <button
          onClick={toggleGrid}
          title="Toggle Pixel Grid Lines (Ctrl+')"
          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[2px] border transition-colors cursor-pointer flex items-center gap-1 ${
            showGrid
              ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
              : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
          }`}
        >
          <PixelIcon name="grid-iso" size={12} />
          <span>Grid</span>
        </button>

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

        <div className="h-4 w-px bg-[var(--desk-border)] mx-0.5" />

        {/* CVD Colorblindness Lens (DESIGN.md §12) — display-only, never touches project data */}
        <button
          onClick={() => setCvdLens(cycleCvdLens(cvdLens))}
          title={CVD_LENS_TITLES[cvdLens]}
          aria-label={`Colorblindness simulation lens: ${cvdLens}. Press P to cycle.`}
          aria-pressed={cvdLens !== 'none'}
          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[2px] border transition-colors cursor-pointer flex items-center gap-1 ${
            cvdLens !== 'none'
              ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
              : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
          }`}
        >
          <PixelIcon name="eyedropper" size={12} />
          <span>CVD:{CVD_LENS_BUTTON_LABELS[cvdLens]}</span>
        </button>

        {/* Silhouette / Squint Mode (DESIGN.md §13) — display-only */}
        <button
          onClick={toggleSquintMode}
          title="Silhouette / Squint Mode (S): renders all painted pixels as solid silhouette over white for value-contrast readability checks"
          aria-label="Silhouette squint mode. Press S to toggle."
          aria-pressed={squintMode}
          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[2px] border transition-colors cursor-pointer flex items-center gap-1 ${
            squintMode
              ? 'bg-[#f0be7c] text-[#140d1f] border-[#8c5120]'
              : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)] border-[var(--desk-border)] hover:text-[#f0be7c]'
          }`}
        >
          <PixelIcon name="select-box" size={12} />
          <span>SIL</span>
        </button>
      </div>
    </div>
  );
};
