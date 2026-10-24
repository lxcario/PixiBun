'use client';

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStudioStore } from '@/stores/studioStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { PixelIcon, type PixelIconName } from '@/components/ui/PixelIcon';
import { FloatingPanel } from '@/components/ui/surfaces/FloatingPanel';
import { Reveal } from '@/components/ui/surfaces/SpringSurface';
import type { CvdLensMode } from '@/lib/color/cvdLens';
import type { WallpaperGroup } from '@/types/tools';

const OVERLAYS = [
  ['none', 'Off'], ['thirds', 'Rule of thirds'], ['golden', 'Golden ratio'], ['center', 'Center lines'], ['diagonals', 'Diagonals'], ['safe', 'Safe area'],
] as const;

const LENSES: [CvdLensMode, string][] = [
  ['none', 'Off'], ['protanopia', 'Protanopia (red-weak)'], ['deuteranopia', 'Deuteranopia (green-weak)'], ['tritanopia', 'Tritanopia (blue-weak)'], ['monochromacy', 'Monochromacy'],
];

const GROUPS: [WallpaperGroup | 'none', string][] = [
  ['none', 'None'], ['p2', 'p2 · 180° turn'], ['pm', 'pm · mirror'], ['p4', 'p4 · 90° turns'], ['p4m', 'p4m · 8-way'], ['p6m', 'p6m · 12-way hex'],
];

function Tile({ on, icon, label, sub, kbd, ...rest }: {
  on?: boolean; icon: React.ReactNode; label: string; sub?: string; kbd?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="pb-tile" aria-pressed={on} {...rest}>
      <span className="pb-chip" aria-hidden="true">{icon}</span>
      <span className="min-w-0">
        <span className="pb-tile-label">{label}</span>
        {(sub || kbd) && (
          <span className="pb-tile-sub">
            {kbd ? <kbd className="pb-kbd">{kbd}</kbd> : null}{kbd && sub ? ' ' : null}{sub}
          </span>
        )}
      </span>
    </button>
  );
}

function SelectRow({ icon, label, children }: { icon: PixelIconName; label: string; children: React.ReactElement }) {
  return (
    <label className="pb-row" style={{ cursor: 'default' }}>
      <span className="pb-chip" aria-hidden="true"><PixelIcon name={icon} size={13} /></span>
      <span className="pb-row-text"><span className="pb-row-label">{label}</span></span>
      {children}
    </label>
  );
}

const selectClass = 'h-8 max-w-[150px] text-xs';

/** View ▾ in the top rail: grids, previews, lenses, mirror and panels, as grouped tiles. */
export function ViewOptionsPanel({ open, anchorRef, onClose, onArrange }: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onArrange: () => void;
}) {
  const s = useStudioStore(useShallow((state) => ({
    showGrid: state.showGrid, toggleGrid: state.toggleGrid,
    showTransparencyChecker: state.showTransparencyChecker, toggleTransparencyChecker: state.toggleTransparencyChecker,
    showIsoGuides: state.showIsoGuides, toggleIsoGuides: state.toggleIsoGuides,
    showTilePreview: state.showTilePreview, toggleTilePreview: state.toggleTilePreview,
    showFloatingPreview: state.showFloatingPreview, toggleFloatingPreview: state.toggleFloatingPreview,
    referenceOverlay: state.referenceOverlay, setReferenceOverlay: state.setReferenceOverlay,
    squintMode: state.squintMode, toggleSquintMode: state.toggleSquintMode,
    cvdLens: state.cvdLens, setCvdLens: state.setCvdLens,
    symmetryHorizontal: state.tools.symmetryHorizontal, symmetryVertical: state.tools.symmetryVertical,
    symmetryGroup: state.tools.symmetryGroup, toggleSymmetryH: state.toggleSymmetryH, toggleSymmetryV: state.toggleSymmetryV,
    setSymmetryGroup: state.setSymmetryGroup,
  })));
  const workspace = useWorkspaceStore((state) => state.layout);
  const updateLayout = useWorkspaceStore((state) => state.updateLayout);
  const toggleFocus = useWorkspaceStore((state) => state.toggleFocus);

  return (
    <FloatingPanel
      open={open}
      anchorRef={anchorRef}
      onClose={onClose}
      width={340}
      role="region"
      aria-label="View options menu"
      className="w-[340px] max-w-[calc(100vw-24px)]"
    >
      <Reveal className="pb-panel-head">
        <div>
          <p className="pb-panel-title">View</p>
          <p className="pb-panel-sub">What you see while drawing. Nothing here changes your artwork.</p>
        </div>
        <button type="button" className="pb-close" aria-label="Close view options" onClick={onClose}>
          <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" shapeRendering="crispEdges"><path d="M0 0h2v2h2v2h2V2h2V0h2v2H8v2H6v2h2v2h2v2H8V8H6V6H4v2H2v2H0V8h2V6h2V4H2V2H0z" fill="currentColor" /></svg>
        </button>
      </Reveal>

      <Reveal>
        <p className="pb-eyebrow">Grids &amp; guides</p>
        <div className="pb-tiles">
          <Tile on={s.showGrid} onClick={s.toggleGrid} icon={<PixelIcon name="grid" size={13} />} label="Pixel grid" kbd="Ctrl+'" />
          <Tile on={s.showTransparencyChecker} onClick={s.toggleTransparencyChecker} data-testid="toggle-transparency-checker"
            title="Show transparent pixels as a checkerboard"
            icon={<span className="inline-block w-[13px] h-[13px] rounded-[3px]" style={{ backgroundImage: 'repeating-conic-gradient(#d9d9d9 0% 25%, #ffffff 0% 50%)', backgroundSize: '6px 6px' }} />}
            label="Transparency" sub="Checkerboard" />
          <Tile on={s.showIsoGuides} onClick={s.toggleIsoGuides} icon={<PixelIcon name="grid-iso" size={13} />} label="Iso grid" sub="2:1 guides" />
          <Tile on={s.showTilePreview} onClick={s.toggleTilePreview} icon={<PixelIcon name="grid-iso" size={13} />} label="3×3 tiling" sub="Seamless check" />
        </div>
        <div className="pb-group mt-1.5">
          <SelectRow icon="grid" label="Composition guide">
            <select aria-label="Composition guide" className={selectClass} value={s.referenceOverlay}
              onChange={(event) => s.setReferenceOverlay(event.target.value as typeof s.referenceOverlay)}>
              {OVERLAYS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </SelectRow>
        </div>
      </Reveal>

      <Reveal>
        <p className="pb-eyebrow">Check your art</p>
        <div className="pb-tiles">
          <Tile on={s.showFloatingPreview} onClick={s.toggleFloatingPreview} title="Toggle the floating Live Preview window"
            icon={<PixelIcon name="preview" size={13} />} label="Live preview" sub="Floating window" />
          <Tile on={s.squintMode} onClick={s.toggleSquintMode} title="Silhouette / Squint Mode (S)"
            icon={<PixelIcon name="select-box" size={13} />} label="Silhouette" kbd="S" />
        </div>
        <div className="pb-group mt-1.5">
          <SelectRow icon="eyedropper" label="Color vision">
            <select aria-label="Color vision lens (P cycles)" className={selectClass} value={s.cvdLens}
              onChange={(event) => s.setCvdLens(event.target.value as CvdLensMode)}>
              {LENSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </SelectRow>
        </div>
      </Reveal>

      <Reveal>
        <p className="pb-eyebrow">Mirror</p>
        <div className="pb-tiles">
          <Tile on={s.symmetryHorizontal} onClick={s.toggleSymmetryH} icon={<PixelIcon name="symmetry-h" size={13} />} label="Mirror H" kbd="Shift+H" />
          <Tile on={s.symmetryVertical} onClick={s.toggleSymmetryV} icon={<PixelIcon name="symmetry-v" size={13} />} label="Mirror V" kbd="Shift+V" />
        </div>
        <div className="pb-group mt-1.5">
          <SelectRow icon="sparkles" label="Pattern brush">
            <select aria-label="Wallpaper group symmetry brush mode" className={selectClass} value={s.symmetryGroup || 'none'}
              title="Crystallographic wallpaper group symmetry brush (Schattschneider 1978)"
              onChange={(event) => s.setSymmetryGroup(event.target.value as WallpaperGroup)}>
              {GROUPS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </SelectRow>
        </div>
      </Reveal>

      <Reveal>
        <p className="pb-eyebrow">Panels</p>
        <div className="pb-tiles">
          <Tile on={workspace.timeline} onClick={() => updateLayout({ timeline: !workspace.timeline })} icon={<PixelIcon name="play" size={12} />} label="Timeline" />
          <Tile on={workspace.navigator} onClick={() => updateLayout({ navigator: !workspace.navigator })} icon={<PixelIcon name="eye" size={13} />} label="Navigator" />
          <Tile aria-label="Canvas Only ⇧ Tab" title="Canvas only mode (Shift+Tab)"
            onClick={() => { toggleFocus(); document.getElementById('center-canvas-area')?.focus({ preventScroll: true }); }}
            icon={<PixelIcon name="select-box" size={13} />} label="Canvas only" kbd="⇧ Tab" />
          <Tile aria-label="Arrange..." onClick={onArrange} icon={<PixelIcon name="grid" size={13} />} label="Arrange…" sub="Saved layouts" />
        </div>
      </Reveal>
    </FloatingPanel>
  );
}
