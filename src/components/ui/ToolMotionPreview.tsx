'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ToolPreviewCanvas } from './ToolPreviewCanvas';
import { PixelIcon, PixelIconName } from './PixelIcon';
import styles from './ToolMotionPreview.module.css';

export type Scene =
  | 'stroke'
  | 'line'
  | 'curve'
  | 'iso'
  | 'rectangle'
  | 'ellipse'
  | 'erase'
  | 'erase-color'
  | 'fill'
  | 'dither'
  | 'gradient'
  | 'recolor'
  | 'select-box'
  | 'select-lasso'
  | 'select-wand'
  | 'depth'
  | 'eyedropper'
  | 'light'
  | 'bake-light'
  | 'shadow'
  | 'glow'
  | 'clean'
  | 'apply-cleanup'
  | 'rotate'
  | 'palette'
  | 'animate'
  | 'tiles'
  | 'autotile'
  | 'sel-out'
  | 'jaggies'
  | 'thin'
  | 'strays'
  | 'normal-map'
  | 'bake-normal'
  | 'seamless'
  | 'dither-atkinson'
  | 'dither-smooth'
  | 'palette-snap'
  | 'palette-harmonize'
  | 'palette-ramp'
  | 'mood-sunset'
  | 'mood-moonlight'
  | 'mood-neon';

export interface ToolPreviewDefinition {
  title: string;
  description: string;
  scene: Scene;
  shortcut?: string;
  secondaryShortcut?: string;
  group?: string;
  proTip?: string;
  icon?: PixelIconName;
}

export const DRAWING_PREVIEWS: Record<string, ToolPreviewDefinition> = {
  gradient: { title: 'Pixel Gradient', group: 'Drawing', description: 'Drag a linear or radial ramp inside your selection, or fill the active layer.', scene: 'gradient', shortcut: 'Shift + G', icon: 'gradient', proTip: 'Set shape, palette order and Bayer dithering in Tool settings.' },
  pen: {
    title: 'Pen',
    group: 'Drawing',
    description: 'Draw crisp, pixel-perfect strokes and contours.',
    proTip: 'Hold Shift to connect endpoints in a straight line.',
    scene: 'stroke',
    shortcut: 'B',
    icon: 'pen',
  },
  curve: {
    title: 'Bézier Curve',
    group: 'Drawing',
    description: 'Shape a smooth curved pixel arc with control handles.',
    proTip: 'Click two endpoints, then drag the middle handle to bend.',
    scene: 'curve',
    shortcut: 'C',
    icon: 'curve',
  },
  eraser: {
    title: 'Eraser',
    group: 'Drawing',
    description: 'Remove pixels to reveal transparency or underlying layers.',
    proTip: 'Use [ and ] to resize, or right-click to quick-erase.',
    scene: 'erase',
    shortcut: 'E',
    icon: 'eraser',
  },
  bucket: {
    title: 'Flood Fill',
    group: 'Drawing',
    description: 'Fill a connected bounded region with solid color.',
    proTip: 'Ensure outlines are closed to prevent color leakage.',
    scene: 'fill',
    shortcut: 'G',
    icon: 'bucket',
  },
  dither: {
    title: 'Dither Brush',
    group: 'Drawing',
    description: 'Blend shades smoothly with retro checkerboard stippling.',
    proTip: 'Eliminates banding between two tones without adding new palette entries.',
    scene: 'dither',
    shortcut: 'D',
    icon: 'dither',
  },
  'color-replace': {
    title: 'Color Replace',
    group: 'Drawing',
    description: 'Swap one palette color across your artwork instantly.',
    proTip: 'Click the source color to swap it with your active color.',
    scene: 'recolor',
    shortcut: 'R',
    icon: 'color-replace',
  },
  'erase-color': {
    title: 'Erase Sampled Color',
    group: 'Drawing',
    description: 'Erase only the sampled sketch color, protecting all lineart.',
    proTip: 'Lifts rough pencil sketches from underneath finished inks with zero damage.',
    scene: 'erase-color',
    shortcut: 'Shift + R',
    icon: 'erase-color',
  },
  'select-box': {
    title: 'Marquee Box',
    group: 'Selection',
    description: 'Drag out a rectangular selection.',
    proTip: 'Shift to add, Alt to subtract, Ctrl+C to copy pixels.',
    scene: 'select-box',
    shortcut: 'M',
    icon: 'select-box',
  },
  'select-lasso': {
    title: 'Lasso Select',
    group: 'Selection',
    description: 'Draw a freeform selection.',
    proTip: 'Trace around irregular shapes and release to close loop.',
    scene: 'select-lasso',
    shortcut: 'Q',
    icon: 'select-lasso',
  },
  'select-wand': {
    title: 'Magic Wand',
    group: 'Selection',
    description: 'Select neighboring pixels of the same color.',
    proTip: 'Click empty canvas to select all background transparency.',
    scene: 'select-wand',
    shortcut: 'W',
    icon: 'select-wand',
  },
  line: {
    title: 'Line',
    group: 'Geometry',
    description: 'Place a crisp, straight pixel line.',
    proTip: 'Hold Shift to snap to horizontal, vertical, or 45° angle.',
    scene: 'line',
    shortcut: 'L',
    icon: 'line',
  },
  'isometric-line': {
    title: '2:1 Iso Line',
    group: 'Geometry',
    description: 'Draw a stepped isometric line.',
    proTip: 'Classic 2:1 pixel ratio for tactics RPGs and dioramas.',
    scene: 'iso',
    shortcut: 'J',
    icon: 'isometric-line',
  },
  rectangle: {
    title: 'Rectangle',
    group: 'Geometry',
    description: 'Draw a pixel-perfect rectangle.',
    proTip: 'Hold Shift while dragging to constrain to a 1:1 square.',
    scene: 'rectangle',
    shortcut: 'U',
    icon: 'rectangle',
  },
  ellipse: {
    title: 'Ellipse',
    group: 'Geometry',
    description: 'Draw a pixel ellipse.',
    proTip: 'Hold Shift while dragging to draw a perfect circle.',
    scene: 'ellipse',
    shortcut: 'O',
    icon: 'ellipse',
  },
  'normal-chisel': {
    title: 'Normal Chisel',
    group: '2.5D Sculpt',
    description: 'Carve sloped 3D bevels onto flat 2D edges so dynamic lighting creates relief.',
    proTip: 'Beveled edges catch specular highlights and cast directional shadows when light moves.',
    scene: 'depth',
    shortcut: 'K',
    icon: 'chisel',
  },
  eyedropper: {
    title: 'Eyedropper',
    group: 'Utility',
    description: 'Pick a color from your artwork.',
    proTip: 'Hold Alt in any drawing tool to sample colors instantly.',
    scene: 'eyedropper',
    shortcut: 'I',
    icon: 'eyedropper',
  },
};

export const PIXITOOLS: Array<[RegExp, ToolPreviewDefinition]> = [
  [/bake light|apply lighting/i, {
    title: 'Bake Lighting',
    group: 'Light & Shading',
    description: 'Bake directional light and shadow tones permanently onto your artwork.',
    proTip: 'Converts dynamic lighting preview into permanent layer pixels.',
    scene: 'bake-light',
    icon: 'sun',
  }],
  [/place light bulb|analyze & light bulb|^light bulb$|preview lighting/i, {
    title: 'Lighting',
    group: 'Light & Shading',
    description: 'Move the light across a finished sprite.',
    proTip: 'Drag the light bulb gizmo to cast dynamic highlights & shadows.',
    scene: 'light',
    icon: 'lamp',
  }],
  [/view normals|hide normals|3d map:|show surface directions|hide surface directions/i, {
    title: 'Normal Map',
    group: 'Light & Shading',
    description: 'See the surface directions used for lighting.',
    proTip: 'Converts 2D pixel silhouettes into illuminated 3D geometric surfaces.',
    scene: 'normal-map',
    icon: 'chisel',
  }],
  [/bake normal map|new 3d normal layer/i, {
    title: 'Bake Normal Map',
    group: 'Light & Shading',
    description: 'Save 3D surface depth angles into a dedicated normal map layer.',
    proTip: 'Exports standard OpenGL tangent-space normal maps for 3D game engines.',
    scene: 'bake-normal',
    icon: 'export',
  }],
  [/specular glint/i, {
    title: 'Specular Glint',
    group: 'Light & Shading',
    description: 'Cast sharp 3D specular light reflections matching your scene light.',
    proTip: 'Calculates Blinn-Phong surface reflections to add brilliant metallic and gemstone highlights.',
    scene: 'glow',
    icon: 'sparkles',
  }],
  [/sel.out/i, {
    title: 'Selective Outline',
    group: 'Light & Shading',
    description: 'Replace harsh black borders with light-aware edge colors.',
    proTip: 'Softens sprite edges to blend harmoniously with backgrounds like professional pixel art.',
    scene: 'sel-out',
    icon: 'sparkles',
  }],
  [/chisel bevel|^paint raised edges$/i, {
    title: 'Chisel Bevel',
    group: '2.5D Sculpt',
    description: 'Carve sloped 3D bevels onto flat 2D edges so dynamic lighting creates relief.',
    proTip: 'Generates embossed relief bevels that react dynamically to light.',
    scene: 'depth',
    icon: 'chisel',
  }],
  [/add floor shadow|cast ground shadow|render cast shadow|analyze & cast shadow/i, {
    title: 'Ground Shadow',
    group: 'Light & Shading',
    description: 'Cast the sprite’s silhouette onto the floor.',
    proTip: 'Raymarches realistic contact shadows anchored to character feet.',
    scene: 'shadow',
    icon: 'sun',
  }],
  [/repeat preview/i, {
    title: 'Repeat Preview',
    group: 'Tileset Engine',
    description: 'Inspect a selected tile repeated in both directions.',
    proTip: 'Edit the selected tile on the canvas to improve visible seams.',
    scene: 'seamless',
    icon: 'grid',
  }],
  [/slice into unique tiles/i, {
    title: 'Tile Slicer',
    group: 'Tileset Engine',
    description: 'Slice artwork into unique grid tiles and export a 2D tilemap.',
    proTip: 'Deconstructs sprites into reusable non-redundant tile matrices.',
    scene: 'tiles',
    icon: 'grid',
  }],
  [/shade 47-blob contours/i, {
    title: '47-Blob Contours',
    group: 'Tileset Engine',
    description: 'Shade contour pixels using 47-blob neighbor masks.',
    proTip: 'Creates a separate visible contour layer.',
    scene: 'autotile',
    icon: 'grid-iso',
  }],
  [/smooth jaggies|de-jaggy/i, {
    title: 'Smooth Jaggies',
    group: 'Polish & Clean',
    description: 'Eliminate unsightly single-pixel L-corner stair-stepping along strokes.',
    proTip: 'Smooths jagged lines into fluid, professional 1-pixel steps.',
    scene: 'jaggies',
    icon: 'pen',
  }],
  [/thin to 1px|skeleton thinning/i, {
    title: 'Thin to 1px',
    group: 'Polish & Clean',
    description: 'Trim thick pixel strokes down to crisp, razor-sharp 1px lines.',
    proTip: 'Tightens heavy strokes without breaking line continuity.',
    scene: 'thin',
    icon: 'pen',
  }],
  [/erase stray pixels|remove stray pixels/i, {
    title: 'Erase Stray Pixels',
    group: 'Polish & Clean',
    description: 'Find and erase isolated single-pixel dots with no touching neighbors.',
    proTip: 'Cleans single-pixel orphan noise and accidental clicks.',
    scene: 'strays',
    icon: 'eraser',
  }],
  [/scan artwork/i, {
    title: 'Scan Artwork',
    group: 'Polish & Clean',
    description: 'Scan the selected layer for faint pixels, detached specks, and thick dark edges.',
    proTip: 'Identifies cleanup candidates and previews changes before applying.',
    scene: 'clean',
    icon: 'sparkles',
  }],
  [/apply cleanup|apply analyzed artwork cleanup/i, {
    title: 'Apply Cleanup',
    group: 'Polish & Clean',
    description: 'Batch-fix detected noise, harden semi-transparent edges, and crisp lines.',
    proTip: 'Executes analyzed cleanup optimizations across all frames.',
    scene: 'apply-cleanup',
    icon: 'sparkles',
  }],
  [/rotate cleanly|rotSprite/i, {
    title: 'RotSprite Clean Rotation',
    group: 'Transform',
    description: 'Rotate pixel art at arbitrary angles without blurry bilinear smoothing.',
    proTip: 'RotSprite algorithm rotates without blurry bilinear smoothing.',
    scene: 'rotate',
    icon: 'rotate',
  }],
  [/^sunset$/i, {
    title: 'Sunset Atmosphere',
    group: 'Palette',
    description: 'Grade sprite colors with warm golden hour tones, amber hues, and coral shadows.',
    proTip: 'Simulates evening sunlight with warm ambient temperature.',
    scene: 'mood-sunset',
    icon: 'palette',
  }],
  [/^moonlight$/i, {
    title: 'Moonlight Atmosphere',
    group: 'Palette',
    description: 'Grade sprite colors with cool midnight blues, silver highlights, and deep indigo.',
    proTip: 'Transforms artwork into mystical nocturnal lighting.',
    scene: 'mood-moonlight',
    icon: 'palette',
  }],
  [/^neon$/i, {
    title: 'Cyberpunk Neon',
    group: 'Palette',
    description: 'Grade sprite colors with vibrant synthwave magenta, electric cyan, and neon violet.',
    proTip: 'Creates vibrant retro-futuristic arcade game lighting.',
    scene: 'mood-neon',
    icon: 'palette',
  }],
  [/atkinson dither/i, {
    title: 'Atkinson Dithering',
    group: 'Shading',
    description: 'Classic retro Macintosh dither pattern with high-contrast stippling.',
    proTip: 'Spreads 3/4 of quantization error to maintain crisp, high-contrast stippling.',
    scene: 'dither-atkinson',
    icon: 'dither',
  }],
  [/smooth dither|riemersma/i, {
    title: 'Smooth Dithering',
    group: 'Shading',
    description: 'Smooth continuous-tone Hilbert-curve dither without directional banding.',
    proTip: 'Uses a space-filling curve with exponential decay for seamless shading.',
    scene: 'dither-smooth',
    icon: 'dither',
  }],
  [/snap to active palette|quantize palette/i, {
    title: 'Snap to Palette',
    group: 'Palette',
    description: 'Match all layer colors to their closest swatches in the active palette.',
    proTip: 'Snaps off-palette pixels to the nearest swatch in the active palette.',
    scene: 'palette-snap',
    icon: 'palette',
  }],
  [/harmonize accents/i, {
    title: 'Harmonize Accents',
    group: 'Palette',
    description: 'Add complementary and accent shades to your active palette in OKLCH.',
    proTip: 'Computes harmonious color chords to expand your current palette.',
    scene: 'palette-harmonize',
    icon: 'palette',
  }],
  [/oklch ramp/i, {
    title: 'OKLCH Color Ramp',
    group: 'Palette',
    description: 'Generate a 5-step highlight and shadow color ramp in perceptual OKLCH space.',
    proTip: 'Maintains perceptual uniformity from darkest shadow to peak highlight.',
    scene: 'palette-ramp',
    icon: 'palette',
  }],
  [/generate in.between frame|in.between frame/i, {
    title: 'In-Between Frame',
    group: 'Animation',
    description: 'Generate a smooth in-between breakdown frame between adjacent keyframes.',
    proTip: 'Generates onion-skinned breakdown frames for fluid animation.',
    scene: 'animate',
    icon: 'play',
  }],
];

export function pixiToolsPreviewForButton(button: HTMLButtonElement): ToolPreviewDefinition | null {
  // Section headers and parameter toggles should not show an effect demo.
  if (button.hasAttribute('aria-controls')) return null;
  const label = `${button.getAttribute('aria-label') ?? ''} ${button.textContent ?? ''}`.trim();
  return PIXITOOLS.find(([pattern]) => pattern.test(label))?.[1] ?? null;
}

export const TOOL_PREVIEWS_DISABLED_STORAGE_KEY = 'pixibun:tool-previews-disabled';
export const TOOL_PREVIEWS_CHANGED_EVENT = 'pixibun:tool-previews-changed';

export function isToolPreviewsDisabled(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    return window.localStorage.getItem(TOOL_PREVIEWS_DISABLED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setToolPreviewsDisabled(disabled: boolean) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (disabled) {
      window.localStorage.setItem(TOOL_PREVIEWS_DISABLED_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(TOOL_PREVIEWS_DISABLED_STORAGE_KEY);
    }
    window.dispatchEvent(new Event(TOOL_PREVIEWS_CHANGED_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

// Global warmth tracker for instant cross-tool transitions
let globalLastDismissTime = 0;
let globalActiveSource: HTMLElement | null = null;
const PREVIEW_WIDTH = 304;
const PREVIEW_HEIGHT = 360;

function PreviewCard({
  definition,
  id,
  side,
  caretTop,
  isClosing,
  onClose,
  onDisable,
}: {
  definition: ToolPreviewDefinition;
  id: string;
  side: 'left' | 'right';
  caretTop: number;
  isClosing?: boolean;
  onClose: () => void;
  onDisable: () => void;
}) {
  return (
    <div
      id={id}
      className={styles.card}
      role="group"
      aria-label={`${definition.title} preview`}
      data-side={side}
      data-closing={isClosing ? 'true' : undefined}
    >
      {/* Caret arrow pointing at triggering tool button */}
      <div
        className={styles.caret}
        style={{ top: `${Math.max(10, Math.min(PREVIEW_HEIGHT - 16, caretTop))}px` }}
        aria-hidden="true"
      />

      <div key={definition.title} className={styles.contentWrap}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.iconWrap}>
              <PixelIcon name={definition.icon || 'pen'} size={14} />
            </div>
            <div className={styles.titleStack}>
              {definition.group && <span className={styles.eyebrow}>{definition.group}</span>}
              <span className={styles.titleText}>{definition.title}</span>
            </div>
          </div>

          <div className={styles.headerActions}>
            {definition.shortcut && (
              <kbd className={styles.shortcutKey}>{definition.shortcut}</kbd>
            )}
            {definition.secondaryShortcut && (
              <kbd className={styles.shortcutKey}>{definition.secondaryShortcut}</kbd>
            )}
            <button
              type="button"
              className={styles.closeBtn}
              aria-label="Close tool preview"
              onClick={onClose}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>

        {/* Stage: Interactive Animated Pixel Art Canvas */}
        <div className={styles.stageFrame}>
          <div className={styles.stage}>
            <ToolPreviewCanvas scene={definition.scene} />
          </div>
        </div>

        {/* Storyboard: before, action, result, filling in step with the demo */}
        <div className={styles.storyboard} aria-hidden="true">
          <div className={`${styles.storyStep} ${styles.storyBefore}`}>
            <div className={styles.storyBar}><span /></div>
            <span className={styles.storyLabel}>before</span>
          </div>
          <div className={`${styles.storyStep} ${styles.storyAction}`}>
            <div className={styles.storyBar}><span /></div>
            <span className={styles.storyLabel}>action</span>
          </div>
          <div className={`${styles.storyStep} ${styles.storyResult}`}>
            <div className={styles.storyBar}><span /></div>
            <span className={styles.storyLabel}>result</span>
          </div>
        </div>

        {/* Body: Actionable Description & Dismiss Option */}
        <div className={styles.body}>
          <p className={styles.description}>{definition.description}</p>
          {definition.proTip && (
            <div className={styles.tip}>
              <span className={styles.tipBadge}>TIP</span>
              <span>{definition.proTip}</span>
            </div>
          )}
          <div className={styles.footer}>
            <span className={styles.escHint} aria-hidden="true">esc to close</span>
            <button
              type="button"
              className={styles.dontShowBtn}
              onClick={onDisable}
            >
              Don&apos;t show again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ActivePreview {
  definition: ToolPreviewDefinition;
  x: number;
  y: number;
  caretTop: number;
  source: HTMLElement;
  version: number;
  isGliding: boolean;
  isClosing?: boolean;
}

interface PendingPreview {
  source: HTMLElement;
  timer: ReturnType<typeof setTimeout>;
}

function usePreviewController(side: 'left' | 'right') {
  const [active, setActive] = useState<ActivePreview | null>(null);
  const pending = useRef<PendingPreview | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalTitle = useRef<{ source: HTMLElement; value: string } | null>(null);
  const originalDescription = useRef<{ source: HTMLElement; value: string | null } | null>(null);
  const version = useRef(0);
  const id = useId();

  const cancelHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const cancelPending = () => {
    if (pending.current) {
      clearTimeout(pending.current.timer);
      pending.current = null;
    }
  };

  const restoreAttributes = () => {
    if (originalTitle.current) {
      originalTitle.current.source.setAttribute('title', originalTitle.current.value);
      originalTitle.current = null;
    }
    if (originalDescription.current) {
      const { source, value } = originalDescription.current;
      if (value === null) source.removeAttribute('aria-describedby');
      else source.setAttribute('aria-describedby', value);
      originalDescription.current = null;
    }
  };

  const hide = () => {
    cancelPending();
    cancelHide();
    restoreAttributes();
    if (globalActiveSource === active?.source) {
      globalActiveSource = null;
      globalLastDismissTime = Date.now();
    }
    setActive((prev) => (prev ? { ...prev, isClosing: true } : null));
    hideTimer.current = setTimeout(() => {
      setActive(null);
    }, 120);
  };

  const explicitDismiss = () => {
    cancelPending();
    cancelHide();
    restoreAttributes();
    globalLastDismissTime = 0; // Reset warmth so it won't pop back immediately
    globalActiveSource = null;
    setActive(null);
  };

  const disablePreviews = () => {
    setToolPreviewsDisabled(true);
    hide();
  };

  const scheduleHide = () => {
    cancelPending();
    cancelHide();
    // 160ms grace window so user can mouse over into the card
    hideTimer.current = setTimeout(hide, 160);
  };

  const requestShow = (source: HTMLElement, definition: ToolPreviewDefinition, isKeyboard = false) => {
    if (isToolPreviewsDisabled()) return;
    cancelHide();
    if (active?.source === source && !active.isClosing) return;

    // Determine delay:
    // If actively open (gliding between tools): 0ms (immediate glide)!
    // If warm group (last 450ms): 30ms.
    // If keyboard focus: 60ms.
    // If cold hover: 260ms (prompt, comfortable, avoids flicker when brushing cursor).
    const isCurrentlyOpen = active !== null && !active.isClosing;
    const now = Date.now();
    const isWarm = isCurrentlyOpen || globalActiveSource !== null || (now - globalLastDismissTime < 450);
    const delay = isKeyboard ? 60 : isCurrentlyOpen ? 0 : isWarm ? 30 : 260;

    // Remove any previous pending previews
    cancelPending();
    restoreAttributes();

    const title = source.getAttribute('title');
    if (title) {
      originalTitle.current = { source, value: title };
      source.removeAttribute('title');
    }

    const timer = setTimeout(() => {
      if (isToolPreviewsDisabled()) return;
      pending.current = null;
      const box = source.getBoundingClientRect();
      const cardWidth = Math.min(PREVIEW_WIDTH, window.innerWidth - 24);
      const cardHeight = PREVIEW_HEIGHT;

      // Horizontal positioning
      const x = side === 'right'
        ? Math.min(window.innerWidth - cardWidth - 12, box.right + 8)
        : Math.max(12, box.left - cardWidth - 8);

      // Vertical positioning: vertically centered relative to the trigger button,
      // strictly clamped between top navigation rail (48px) and bottom workspace area.
      const buttonCenterY = box.top + box.height / 2;
      const idealY = buttonCenterY - cardHeight / 2;
      const minY = 48; // Below top AtelierRail to prevent header clipping
      const maxY = Math.max(minY, window.innerHeight - cardHeight - 20);
      const y = Math.max(minY, Math.min(maxY, idealY));
      const caretTop = buttonCenterY - y;

      const target = source instanceof HTMLButtonElement ? source : source.querySelector('button');
      if (target) {
        const value = target.getAttribute('aria-describedby');
        originalDescription.current = { source: target, value };
        target.setAttribute('aria-describedby', [value, id].filter(Boolean).join(' '));
      }

      globalActiveSource = source;
      setActive((prev) => ({
        definition,
        x,
        y,
        caretTop,
        source,
        version: ++version.current,
        isGliding: prev !== null && !prev.isClosing,
        isClosing: false,
      }));
    }, delay);

    pending.current = { source, timer };
  };

  useEffect(() => {
    const onPrefChange = () => {
      if (isToolPreviewsDisabled()) hide();
    };
    window.addEventListener('storage', onPrefChange);
    window.addEventListener(TOOL_PREVIEWS_CHANGED_EVENT, onPrefChange);
    return () => {
      window.removeEventListener('storage', onPrefChange);
      window.removeEventListener(TOOL_PREVIEWS_CHANGED_EVENT, onPrefChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') explicitDismiss();
    };
    const onScroll = (event: Event) => {
      // If the scroll happened within the container of the active trigger button,
      // re-anchor rather than abruptly destroying the preview
      if (active?.source && event.target instanceof Node && event.target.contains(active.source)) {
        const box = active.source.getBoundingClientRect();
        const cardWidth = Math.min(PREVIEW_WIDTH, window.innerWidth - 24);
        const cardHeight = PREVIEW_HEIGHT;
        const x = side === 'right'
          ? Math.min(window.innerWidth - cardWidth - 12, box.right + 8)
          : Math.max(12, box.left - cardWidth - 8);
        const buttonCenterY = box.top + box.height / 2;
        const idealY = buttonCenterY - cardHeight / 2;
        const minY = 48;
        const maxY = Math.max(minY, window.innerHeight - cardHeight - 20);
        const y = Math.max(minY, Math.min(maxY, idealY));
        const caretTop = buttonCenterY - y;
        setActive((prev) => (prev ? { ...prev, x, y, caretTop, isGliding: false } : null));
        return;
      }
      hide();
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.source, active?.x, active?.y]);

  useEffect(() => () => {
    if (pending.current) clearTimeout(pending.current.timer);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (originalTitle.current) originalTitle.current.source.setAttribute('title', originalTitle.current.value);
    if (originalDescription.current) {
      const { source, value } = originalDescription.current;
      if (value === null) source.removeAttribute('aria-describedby');
      else source.setAttribute('aria-describedby', value);
    }
  }, []);

  const popup = active && typeof document !== 'undefined'
    ? createPortal(
        <div
          className={styles.position}
          data-gliding={active.isGliding ? 'true' : undefined}
          style={{ left: active.x, top: active.y }}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
          onFocus={cancelHide}
          onBlur={scheduleHide}
        >
          <PreviewCard
            definition={active.definition}
            id={id}
            side={side}
            caretTop={active.caretTop}
            isClosing={active.isClosing}
            onClose={explicitDismiss}
            onDisable={disablePreviews}
          />
        </div>,
        document.body
      )
    : null;

  return { requestShow, scheduleHide, explicitDismiss, popup };
}

export const DrawingPreviewContext = React.createContext<ReturnType<typeof usePreviewController> | null>(null);

export function DrawingToolsPreviewLayer({ children }: { children: React.ReactNode }) {
  const controller = usePreviewController('right');
  return (
    <DrawingPreviewContext.Provider value={controller}>
      {children}
      {controller.popup}
    </DrawingPreviewContext.Provider>
  );
}

export function DrawingToolPreview({
  toolId,
  children,
}: {
  toolId: string;
  children: React.ReactNode;
}) {
  const contextController = React.useContext(DrawingPreviewContext);
  const definition = DRAWING_PREVIEWS[toolId];

  if (contextController) {
    return (
      <div
        className="inline-flex"
        onMouseEnter={(event) => contextController.requestShow(event.currentTarget, definition, false)}
        onMouseLeave={contextController.scheduleHide}
        onFocus={(event) => contextController.requestShow(event.currentTarget, definition, true)}
        onBlur={contextController.scheduleHide}
        onClickCapture={contextController.explicitDismiss}
      >
        {children}
      </div>
    );
  }

  return <StandaloneDrawingToolPreview toolId={toolId}>{children}</StandaloneDrawingToolPreview>;
}

function StandaloneDrawingToolPreview({
  toolId,
  children,
}: {
  toolId: string;
  children: React.ReactNode;
}) {
  const controller = usePreviewController('right');
  const definition = DRAWING_PREVIEWS[toolId];

  return (
    <div
      className="inline-flex"
      onMouseEnter={(event) => controller.requestShow(event.currentTarget, definition, false)}
      onMouseLeave={controller.scheduleHide}
      onFocus={(event) => controller.requestShow(event.currentTarget, definition, true)}
      onBlur={controller.scheduleHide}
      onClickCapture={controller.explicitDismiss}
    >
      {children}
      {controller.popup}
    </div>
  );
}

export function PixiToolsPreviewLayer({ children }: { children: React.ReactNode }) {
  const controller = usePreviewController('left');

  const onTarget = (target: EventTarget, isKeyboard = false) => {
    if (!(target instanceof Element)) return;
    const button = target.closest('button');
    if (!(button instanceof HTMLButtonElement)) return;
    const definition = pixiToolsPreviewForButton(button);
    if (definition) controller.requestShow(button, definition, isKeyboard);
  };

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto"
      onMouseOver={(event) => onTarget(event.target, false)}
      onMouseOut={(event) => {
        const from = event.target instanceof Element ? event.target.closest('button') : null;
        const to = event.relatedTarget;
        if (from && (!(to instanceof Node) || !from.contains(to))) controller.scheduleHide();
      }}
      onFocus={(event) => onTarget(event.target, true)}
      onBlur={controller.scheduleHide}
    >
      {children}
      {controller.popup}
    </div>
  );
}
