'use client';

import { create } from 'zustand';
import { parseKeymap, type Keymap } from '@/lib/input/keymap';

/** How much pixel art someone has made; tunes tips and defaults, never locks features. */
export type Experience = 'new' | 'some' | 'pro';

export interface Preferences {
  experience: Experience | null;
  /** When the welcome journey finished or was skipped (ms since epoch). */
  onboardedAt: number | null;
  /** Contextual tips already shown, so each appears once. */
  seenTips: string[];
  /** People can switch tips off entirely, whatever their experience. */
  tipsEnabled: boolean;
  /** Canvas mouse and key conventions (see keymap.ts). */
  keymap: Keymap;
}

interface PreferencesStore extends Preferences {
  /** Bumped to reopen the welcome journey on demand; never saved. */
  welcomeRequests: number;
  requestWelcome: () => void;
  setExperience: (experience: Experience) => void;
  completeOnboarding: () => void;
  markTipSeen: (id: string) => void;
  setTipsEnabled: (enabled: boolean) => void;
  setKeymap: (keymap: Keymap) => void;
  resetOnboarding: () => void;
}

export const PREFERENCES_KEY = 'pixibun-preferences';

const DEFAULTS: Preferences = { experience: null, onboardedAt: null, seenTips: [], tipsEnabled: true, keymap: 'standard' };

export function parsePreferences(raw: string | null): Preferences {
  if (!raw || raw.length > 8192) return { ...DEFAULTS };
  try {
    const value = JSON.parse(raw) as Partial<Preferences>;
    return {
      experience: value.experience === 'new' || value.experience === 'some' || value.experience === 'pro' ? value.experience : null,
      onboardedAt: typeof value.onboardedAt === 'number' && Number.isFinite(value.onboardedAt) ? value.onboardedAt : null,
      seenTips: Array.isArray(value.seenTips) ? value.seenTips.filter((id): id is string => typeof id === 'string' && id.length <= 64).slice(0, 64) : [],
      tipsEnabled: value.tipsEnabled !== false,
      keymap: parseKeymap(value.keymap),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function persist(state: Preferences) {
  try {
    const { experience, onboardedAt, seenTips, tipsEnabled, keymap } = state;
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ experience, onboardedAt, seenTips, tipsEnabled, keymap }));
  } catch {
    // Restricted storage: preferences last for this visit only.
  }
}

// Starts at the defaults so the hydration render matches the server; the saved
// preferences load right after creation (see themeStore for the same pattern).
export const usePreferencesStore = create<PreferencesStore>((set, get) => {
  const update = (patch: Partial<Preferences>) => {
    set(patch);
    persist(get());
  };
  return {
    ...DEFAULTS,
    welcomeRequests: 0,
    requestWelcome: () => set({ welcomeRequests: get().welcomeRequests + 1 }),
    setExperience: experience => update({ experience }),
    completeOnboarding: () => update({ onboardedAt: Date.now() }),
    markTipSeen: id => {
      if (!get().seenTips.includes(id)) update({ seenTips: [...get().seenTips, id] });
    },
    setTipsEnabled: tipsEnabled => update({ tipsEnabled }),
    setKeymap: keymap => update({ keymap }),
    resetOnboarding: () => update({ onboardedAt: null, seenTips: [] }),
  };
});

if (typeof window !== 'undefined') {
  let saved: string | null = null;
  try { saved = window.localStorage.getItem(PREFERENCES_KEY); } catch { /* restricted storage */ }
  usePreferencesStore.setState(parsePreferences(saved));
}
