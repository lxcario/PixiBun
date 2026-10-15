'use client';

import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * Studio Labs: experimental UI that can be switched off from Studio ▸ Labs,
 * or deleted outright (see src/experimental/README.md). Nothing outside
 * src/experimental depends on these flags except the small gates listed there.
 */
export type LabId = 'island' | 'liquidTabs' | 'paletteStudio' | 'quickMagic';

export const LABS: { id: LabId; name: string; blurb: string }[] = [
  { id: 'island', name: 'Dynamic island', blurb: 'The tool bar morphs, glows and pops out little status bubbles.' },
  { id: 'liquidTabs', name: 'Liquid tabs', blurb: 'Press and slide across the panel tabs to pick one.' },
  { id: 'paletteStudio', name: 'Paint pot palette', blurb: 'Big swatches, shades and recent colors first; the mixer on demand.' },
  { id: 'quickMagic', name: 'Quick magic', blurb: 'One-tap effects for beginners at the top of Effects.' },
];

type LabFlags = Record<LabId, boolean>;

const STORAGE_KEY = 'pixibun:labs:v1';
const DEFAULTS: LabFlags = { island: true, liquidTabs: true, paletteStudio: true, quickMagic: true };
const ALL_OFF: LabFlags = { island: false, liquidTabs: false, paletteStudio: false, quickMagic: false };

/** Automated runs (Vitest, Playwright) keep covering the classic studio unless a test opts in via storage. */
function automated(): boolean {
  return process.env.NODE_ENV === 'test' || (typeof navigator !== 'undefined' && navigator.webdriver === true);
}

function load(): LabFlags {
  const base = automated() ? ALL_OFF : DEFAULTS;
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Record<LabId, unknown>>;
    const flags = { ...base };
    for (const lab of LABS) if (typeof raw[lab.id] === 'boolean') flags[lab.id] = raw[lab.id] as boolean;
    return flags;
  } catch {
    return { ...base };
  }
}

interface LabsStore {
  flags: LabFlags;
  hydrated: boolean;
  hydrate: () => void;
  setLab: (id: LabId, on: boolean) => void;
  setAll: (on: boolean) => void;
}

function persist(flags: LabFlags) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(flags)); } catch { /* Labs still toggle for this visit. */ }
}

export const useLabsStore = create<LabsStore>((set, get) => ({
  // Server render and first client render agree (all off); hydrate() then applies stored or default flags.
  flags: { ...ALL_OFF },
  hydrated: false,
  hydrate: () => { if (!get().hydrated) set({ flags: load(), hydrated: true }); },
  setLab: (id, on) => { const flags = { ...get().flags, [id]: on }; set({ flags }); persist(flags); },
  setAll: on => {
    const flags = Object.fromEntries(LABS.map(lab => [lab.id, on])) as LabFlags;
    set({ flags }); persist(flags);
  },
}));

/** True when a lab is on. Reads stored flags on first use so every gate agrees after hydration. */
export function useLab(id: LabId): boolean {
  useEffect(() => useLabsStore.getState().hydrate(), []);
  return useLabsStore(s => s.flags[id]);
}
