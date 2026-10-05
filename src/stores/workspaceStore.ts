'use client';

import { create } from 'zustand';

export interface WorkspaceLayout {
  inspectorSide: 'left' | 'right';
  inspectorWidth: number;
  timeline: boolean;
  color: boolean;
  navigator: boolean;
}
export type WorkspacePreset = 'drawing' | 'animation' | 'lighting';
export const WORKSPACE_PRESETS: Record<WorkspacePreset, WorkspaceLayout> = {
  drawing: { inspectorSide: 'right', inspectorWidth: 292, timeline: true, color: false, navigator: false },
  animation: { inspectorSide: 'right', inspectorWidth: 320, timeline: true, color: false, navigator: true },
  lighting: { inspectorSide: 'right', inspectorWidth: 340, timeline: false, color: true, navigator: true },
};
interface SavedLayout { id: string; name: string; layout: WorkspaceLayout }
interface WorkspaceStore {
  layout: WorkspaceLayout;
  activeLayout: string;
  savedLayouts: SavedLayout[];
  focusMode: boolean;
  favoritePalettes: string[];
  colorPicker: 'triangle' | 'square';
  gradient: { shape: 'linear' | 'radial'; ramp: 'foreground' | 'palette'; dither: boolean; newLayer: boolean };
  setGradient: (patch: Partial<WorkspaceStore['gradient']>) => void;
  hydrate: () => void;
  updateLayout: (patch: Partial<WorkspaceLayout>) => void;
  chooseLayout: (id: string) => void;
  saveLayout: (name: string) => boolean;
  deleteLayout: (id: string) => void;
  toggleFocus: () => void;
  toggleFavorite: (id: string) => void;
  setColorPicker: (shape: 'triangle' | 'square') => void;
}
const STORAGE_KEY = 'pixibun:artist-workspace:v1';
function parseLayout(value: unknown): WorkspaceLayout | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if ((v.inspectorSide !== 'left' && v.inspectorSide !== 'right') || typeof v.inspectorWidth !== 'number' ||
      !Number.isFinite(v.inspectorWidth) || typeof v.timeline !== 'boolean' || typeof v.color !== 'boolean' || typeof v.navigator !== 'boolean') return null;
  return { inspectorSide: v.inspectorSide, inspectorWidth: Math.round(Math.max(260, Math.min(420, v.inspectorWidth))),
    timeline: v.timeline, color: v.color, navigator: v.navigator };
}
function persist(state: WorkspaceStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout: state.layout, activeLayout: state.activeLayout,
      savedLayouts: state.savedLayouts, favoritePalettes: state.favoritePalettes, colorPicker: state.colorPicker, gradient: state.gradient }));
  } catch { /* Layout preferences remain usable when browser storage is unavailable. */ }
}
export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  layout: { ...WORKSPACE_PRESETS.drawing }, activeLayout: 'drawing', savedLayouts: [], focusMode: false,
  favoritePalettes: [], colorPicker: 'triangle',
  gradient: { shape: 'linear', ramp: 'foreground', dither: true, newLayer: true },
  setGradient: patch => { set(s => ({ gradient: { ...s.gradient, ...patch } })); persist(get()); },
  hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw || raw.length > 32768) return;
      const data = JSON.parse(raw);
      const layout = parseLayout(data?.layout);
      if (!layout) return;
      const seen = new Set<string>();
      const savedLayouts: SavedLayout[] = Array.isArray(data.savedLayouts) ? data.savedLayouts.slice(0, 6).flatMap((item: SavedLayout) => {
        const parsed = parseLayout(item?.layout);
        if (!parsed || typeof item.id !== 'string' || !/^user-[0-9]+$/.test(item.id) || seen.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || item.name.trim().length > 32) return [];
        seen.add(item.id); return [{ id: item.id, name: item.name.trim(), layout: parsed }];
      }) : [];
      const activeLayout = typeof data.activeLayout === 'string' &&
        (Object.hasOwn(WORKSPACE_PRESETS, data.activeLayout) || savedLayouts.some(l => l.id === data.activeLayout)) ? data.activeLayout : 'drawing';
      set({ layout, savedLayouts, activeLayout, colorPicker: data.colorPicker === 'square' ? 'square' : 'triangle',
        gradient: { shape: data.gradient?.shape === 'radial' ? 'radial' : 'linear', ramp: data.gradient?.ramp === 'palette' ? 'palette' : 'foreground', dither: data.gradient?.dither !== false, newLayer: data.gradient?.newLayer !== false },
        favoritePalettes: Array.isArray(data.favoritePalettes) ? data.favoritePalettes.filter((id: unknown): id is string => typeof id === 'string' && id.length <= 128).slice(0, 128) : [] });
    } catch { /* Malformed preferences must not prevent opening artwork. */ }
  },
  updateLayout: patch => { const layout = parseLayout({ ...get().layout, ...patch }); if (layout) { set({ layout }); persist(get()); } },
  chooseLayout: id => {
    const layout = Object.hasOwn(WORKSPACE_PRESETS, id) ? WORKSPACE_PRESETS[id as WorkspacePreset] : get().savedLayouts.find(l => l.id === id)?.layout;
    if (layout) { set({ layout: { ...layout }, activeLayout: id, focusMode: false }); persist(get()); }
  },
  saveLayout: name => {
    const clean = name.trim();
    if (!clean || clean.length > 32 || get().savedLayouts.length >= 6) return false;
    let serial = Date.now();
    while (get().savedLayouts.some(l => l.id === `user-${serial}`)) serial++;
    const id = `user-${serial}`;
    set(s => ({ savedLayouts: [...s.savedLayouts, { id, name: clean, layout: { ...s.layout } }], activeLayout: id }));
    persist(get()); return true;
  },
  deleteLayout: id => { set(s => ({ savedLayouts: s.savedLayouts.filter(l => l.id !== id), activeLayout: s.activeLayout === id ? 'drawing' : s.activeLayout, layout: s.activeLayout === id ? { ...WORKSPACE_PRESETS.drawing } : s.layout })); persist(get()); },
  toggleFocus: () => set(s => ({ focusMode: !s.focusMode })),
  toggleFavorite: id => { set(s => ({ favoritePalettes: s.favoritePalettes.includes(id) ? s.favoritePalettes.filter(p => p !== id) : [...s.favoritePalettes, id].slice(-128) })); persist(get()); },
  setColorPicker: colorPicker => { set({ colorPicker }); persist(get()); },
}));
