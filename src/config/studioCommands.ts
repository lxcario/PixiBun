import { CANONICAL_TOOLS } from './shortcuts';
import { calculateFitZoom } from './zoom';
import { useStudioStore } from '@/stores/studioStore';
import type { PixelIconName } from '@/components/ui/PixelIcon';

export interface StudioCommand {
  id: string;
  title: string;
  category: 'Tools' | 'View & Guides' | 'Animation' | 'Project & Studio';
  icon: PixelIconName;
  shortcut?: string;
  disabledReason?: string;
  action: () => void;
}

// These actions read current state when invoked, including after dialog handoff.
export const STUDIO_COMMANDS: StudioCommand[] = [
  ...CANONICAL_TOOLS.map(tool => ({
    id: `tool-${tool.id}`, title: `${tool.label} Tool`, category: 'Tools' as const,
    icon: tool.icon, shortcut: tool.shortcut,
    action: () => useStudioStore.getState().setActiveTool(tool.id),
  })),
  { id: 'view-grid', title: 'Toggle Pixel Grid', category: 'View & Guides', icon: 'grid', shortcut: "Ctrl+'",
    action: () => useStudioStore.getState().toggleGrid() },
  { id: 'view-fit-screen', title: 'Fit Canvas to Viewport', category: 'View & Guides', icon: 'zoom-in', shortcut: 'Ctrl+0',
    action: () => { const s = useStudioStore.getState(); s.setZoomAndPan(calculateFitZoom(s.canvasWidth, s.canvasHeight), 0, 0); } },
  { id: 'view-zoom-100', title: 'Zoom to 100% Actual Pixel Scale', category: 'View & Guides', icon: 'zoom-in', shortcut: 'Ctrl+1',
    action: () => useStudioStore.getState().setZoomAndPan(100, 0, 0) },
  { id: 'anim-onion-skin', title: 'Toggle Onion Skin Lightbox', category: 'Animation', icon: 'onion', shortcut: 'F3',
    action: () => { const s = useStudioStore.getState(); s.setOnionSkin({ enabled: !s.onionSkin.enabled }); } },
];

export function executeStudioCommand(id: string): void {
  const command = STUDIO_COMMANDS.find(command => command.id === id);
  if (!command) throw new Error(`Unknown studio command: ${id}`);
  command.action();
}

export function studioCommandForKey(event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>): StudioCommand | undefined {
  if (event.altKey) return;
  const modified = event.ctrlKey || event.metaKey;
  const key = /^Key[A-Z]$/.test(event.code) ? event.code.slice(3) : event.key.toUpperCase();
  return STUDIO_COMMANDS.find(command => {
    const shortcut = command.shortcut;
    if (!shortcut) return false;
    if (shortcut.startsWith('Ctrl+')) {
      const expected = shortcut.slice(5);
      return modified && !event.shiftKey && (expected === "'" ? event.code === 'Quote' || event.key === "'" : event.key === expected);
    }
    if (modified) return false;
    const shifted = shortcut.startsWith('Shift + ');
    return event.shiftKey === shifted && key === (shifted ? shortcut.slice(8) : shortcut);
  });
}
