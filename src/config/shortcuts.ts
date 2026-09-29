import { PixelIconName } from '@/components/ui/PixelIcon';
import { ToolType } from '@/types/tools';

export type ShortcutCategory = 'Tools' | 'Editing' | 'Canvas & Viewport' | 'Animation';

export interface ShortcutEntry {
  key: string;
  description: string;
  category: ShortcutCategory;
  toolId?: ToolType;
}

export interface ToolMeta {
  id: ToolType;
  label: string;
  shortcut: string;
  secondaryShortcut?: string;
  icon: PixelIconName;
  group: 'Drawing' | 'Selection' | 'Geometry' | '2.5D Sculpt' | 'Utility';
}

export const CANONICAL_TOOLS: ToolMeta[] = [
  // Drawing
  { id: 'pen', label: 'Pen', shortcut: 'B', icon: 'pen', group: 'Drawing' },
  { id: 'curve', label: 'Bézier Curve', shortcut: 'C', icon: 'curve', group: 'Drawing' },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: 'eraser', group: 'Drawing' },
  { id: 'bucket', label: 'Flood Fill', shortcut: 'G', icon: 'bucket', group: 'Drawing' },
  { id: 'dither', label: 'Dither Brush', shortcut: 'D', icon: 'dither', group: 'Drawing' },
  { id: 'color-replace', label: 'Color Replace', shortcut: 'R', icon: 'color-replace', group: 'Drawing' },
  { id: 'erase-color', label: 'Erase Sampled Color', shortcut: 'Shift + R', icon: 'erase-color', group: 'Drawing' },

  // Selection
  { id: 'select-box', label: 'Marquee Box', shortcut: 'M', icon: 'select-box', group: 'Selection' },
  { id: 'select-lasso', label: 'Lasso Select', shortcut: 'Q', icon: 'select-lasso', group: 'Selection' },
  { id: 'select-wand', label: 'Magic Wand', shortcut: 'W', icon: 'select-wand', group: 'Selection' },

  // Geometry
  { id: 'line', label: 'Line', shortcut: 'L', icon: 'line', group: 'Geometry' },
  { id: 'isometric-line', label: '2:1 Iso Line', shortcut: 'J', icon: 'isometric-line', group: 'Geometry' },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'U', icon: 'rectangle', group: 'Geometry' },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: 'ellipse', group: 'Geometry' },

  // 2.5D Sculpt
  { id: 'normal-chisel', label: 'Normal Chisel', shortcut: 'K', icon: 'chisel', group: '2.5D Sculpt' },

  // Utility
  { id: 'eyedropper', label: 'Eyedropper', shortcut: 'I', icon: 'eyedropper', group: 'Utility' },
];

export const CANONICAL_SHORTCUTS: ShortcutEntry[] = [
  // Tools
  { key: 'B', description: 'Pen Tool', category: 'Tools', toolId: 'pen' },
  { key: 'C', description: 'Bézier Curve Tool', category: 'Tools', toolId: 'curve' },
  { key: 'E', description: 'Eraser Tool', category: 'Tools', toolId: 'eraser' },
  { key: 'G', description: 'Flood Fill / Bucket', category: 'Tools', toolId: 'bucket' },
  { key: 'D', description: 'Dither Brush', category: 'Tools', toolId: 'dither' },
  { key: 'I', description: 'Eyedropper', category: 'Tools', toolId: 'eyedropper' },
  { key: 'M', description: 'Marquee Box Select', category: 'Tools', toolId: 'select-box' },
  { key: 'Q', description: 'Lasso Select', category: 'Tools', toolId: 'select-lasso' },
  { key: 'W', description: 'Magic Wand', category: 'Tools', toolId: 'select-wand' },
  { key: 'L', description: 'Line Tool', category: 'Tools', toolId: 'line' },
  { key: 'J', description: 'Isometric 2:1 Line', category: 'Tools', toolId: 'isometric-line' },
  { key: 'U', description: 'Rectangle Tool', category: 'Tools', toolId: 'rectangle' },
  { key: 'O', description: 'Ellipse Tool', category: 'Tools', toolId: 'ellipse' },
  { key: 'R', description: 'Color Replace Tool', category: 'Tools', toolId: 'color-replace' },
  { key: 'Shift + R', description: 'Erase Sampled Color Tool', category: 'Tools', toolId: 'erase-color' },
  { key: 'K', description: 'Normal Chisel Tool', category: 'Tools', toolId: 'normal-chisel' },

  // Editing
  { key: 'Ctrl + S', description: 'Save Project Now', category: 'Editing' },
  { key: 'X', description: 'Swap Colors', category: 'Editing' },
  { key: '[ / ]', description: 'Decrease / Increase Size', category: 'Editing' },
  { key: 'H / V', description: 'Flip Selection H / V', category: 'Editing' },
  { key: 'Ctrl + C / X / V', description: 'Copy / Cut / Paste', category: 'Editing' },
  { key: 'Ctrl + Z / Y', description: 'Undo / Redo Stroke', category: 'Editing' },
  { key: 'Esc', description: 'Deselect / Commit Float', category: 'Editing' },
  { key: 'Shift + Select', description: 'Add to Selection (Union)', category: 'Editing' },
  { key: 'Alt + Select', description: 'Subtract from Selection', category: 'Editing' },

  // Canvas & Viewport
  { key: 'Middle / Alt + Drag', description: 'Pan Canvas Viewport', category: 'Canvas & Viewport' },
  { key: 'Arrow Keys', description: 'Pan Viewport / Nudge Selection', category: 'Canvas & Viewport' },
  { key: 'Mouse Wheel', description: 'Zoom In / Out Canvas', category: 'Canvas & Viewport' },
  { key: 'Ctrl + + / -', description: 'Zoom In / Out Step', category: 'Canvas & Viewport' },
  { key: 'Ctrl + 0', description: 'Fit Canvas to Screen', category: 'Canvas & Viewport' },
  { key: 'Ctrl + 1', description: 'Reset Zoom to 100%', category: 'Canvas & Viewport' },
  { key: 'Shift + H', description: 'Toggle Horizontal Symmetry Mirror', category: 'Canvas & Viewport' },
  { key: 'Shift + V', description: 'Toggle Vertical Symmetry Mirror', category: 'Canvas & Viewport' },
  { key: 'P', description: 'Cycle CVD Colorblindness Lens', category: 'Canvas & Viewport' },
  { key: 'S', description: 'Silhouette / Squint Mode', category: 'Canvas & Viewport' },

  // Animation
  { key: 'Space', description: 'Play / Pause Animation', category: 'Animation' },
  { key: ',', description: 'Step to Previous Frame', category: 'Animation' },
  { key: '.', description: 'Step to Next Frame', category: 'Animation' },
];

/** Tool groups derived directly for LeftToolbar */
export const TOOL_GROUPS = [
  'Drawing',
  'Selection',
  'Geometry',
  '2.5D Sculpt',
  'Utility',
].map((groupName) => ({
  groupName,
  tools: CANONICAL_TOOLS.filter((t) => t.group === groupName).map((t) => ({
    id: t.id,
    label: t.label,
    shortcut: t.shortcut,
    icon: t.icon,
  })),
}));

/** Tool metadata dictionary shared by toolbar and shortcut surfaces. */
export const TOOL_METADATA_MAP: Record<string, { label: string; shortcut: string; icon: PixelIconName }> =
  CANONICAL_TOOLS.reduce(
    (acc, tool) => {
      acc[tool.id] = {
        label: tool.label,
        shortcut: tool.shortcut,
        icon: tool.icon,
      };
      return acc;
    },
    {} as Record<string, { label: string; shortcut: string; icon: PixelIconName }>
  );
