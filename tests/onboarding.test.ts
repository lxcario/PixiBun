import { describe, expect, it } from 'vitest';
import { parsePreferences } from '@/stores/preferencesStore';
import { shouldOpenWelcome } from '@/components/onboarding/WelcomeJourney';
import { COACH_TIPS, tipsFor } from '@/components/onboarding/CoachTips';

describe('welcome journey and tips', () => {
  it('opens once for people, on request with ?welcome=1, and never unasked for automation', () => {
    const studio = new URL('https://pixibun.test/studio');
    const asked = new URL('https://pixibun.test/studio?welcome=1');
    expect(shouldOpenWelcome(studio, null, false)).toBe(true);
    expect(shouldOpenWelcome(studio, 1791981649533, false)).toBe(false);
    expect(shouldOpenWelcome(studio, null, true)).toBe(false);
    expect(shouldOpenWelcome(asked, 1791981649533, true)).toBe(true);
  });

  it('reads saved preferences defensively', () => {
    expect(parsePreferences(null)).toEqual({ experience: null, onboardedAt: null, seenTips: [], tipsEnabled: true, keymap: 'standard' });
    expect(parsePreferences('{not json')).toEqual({ experience: null, onboardedAt: null, seenTips: [], tipsEnabled: true, keymap: 'standard' });
    expect(parsePreferences(JSON.stringify({ experience: 'wizard', onboardedAt: 'yesterday', seenTips: ['lamp', 7, 'x'.repeat(65)], tipsEnabled: false })))
      .toEqual({ experience: null, onboardedAt: null, seenTips: ['lamp'], tipsEnabled: false, keymap: 'standard' });
    expect(parsePreferences(JSON.stringify({ experience: 'pro', onboardedAt: 12, seenTips: [], tipsEnabled: true })).experience).toBe('pro');
    expect(parsePreferences('x'.repeat(9000)).experience).toBeNull();
  });

  it('gives pros no tips, a few PixiBun-specific ones to the experienced, and all of them to newcomers', () => {
    expect(tipsFor('pro')).toEqual([]);
    expect(tipsFor('some').map(tip => tip.id)).toEqual(['lamp', 'second-frame', 'share']);
    expect(tipsFor('new')).toEqual(COACH_TIPS);
    // Skipping the question reads as "don't fuss".
    expect(tipsFor(null)).toEqual(tipsFor('some'));
  });

  it('keeps every tip short enough to read at a glance', () => {
    for (const tip of COACH_TIPS) {
      expect(tip.title.length).toBeLessThanOrEqual(32);
      expect(tip.body.length).toBeLessThanOrEqual(170);
    }
  });
});
