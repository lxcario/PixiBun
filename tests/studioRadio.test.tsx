// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { lofiRadio, TRACKS } from '@/lib/audio/lofiRadio';
import { studioEvents } from '@/lib/events/studioEvents';
import { StudioRadioWidget } from '@/components/audio/StudioRadioWidget';

describe('Procedural Web Audio Engine & StudioRadioWidget', () => {
  beforeEach(() => {
    lofiRadio.pause();
    lofiRadio.setVolume(0.6);
  });

  afterEach(() => {
    cleanup();
  });

  describe('lofiRadio Core Engine', () => {
    it('initializes with default state, 3 procedural tracks, and 0.6 volume', () => {
      const state = lofiRadio.getState();
      expect(state.isPlaying).toBe(false);
      expect(TRACKS).toEqual(['Cyber Run', 'Rainy Lilac', 'Neon Castle']);
      expect(TRACKS).toContain(state.trackTitle);
      expect(state.volume).toBe(0.6);
    });

    it('clamps volume to [0, 1] range and notifies subscribers', () => {
      let notifiedVolume = 0;
      const unsub = lofiRadio.subscribe((state) => {
        notifiedVolume = state.volume;
      });

      lofiRadio.setVolume(1.5);
      expect(lofiRadio.getState().volume).toBe(1);
      expect(notifiedVolume).toBe(1);

      lofiRadio.setVolume(-0.5);
      expect(lofiRadio.getState().volume).toBe(0);
      expect(notifiedVolume).toBe(0);

      lofiRadio.setVolume(0.4);
      expect(lofiRadio.getState().volume).toBe(0.4);
      expect(notifiedVolume).toBe(0.4);

      unsub();
    });

    it('cycles through procedural tracks on nextTrack()', async () => {
      const initialTrack = lofiRadio.getState().trackTitle;
      await lofiRadio.nextTrack();
      const secondTrack = lofiRadio.getState().trackTitle;
      expect(secondTrack).not.toBe(initialTrack);

      await lofiRadio.nextTrack();
      const thirdTrack = lofiRadio.getState().trackTitle;
      expect(thirdTrack).not.toBe(secondTrack);

      await lofiRadio.nextTrack();
      const fourthTrack = lofiRadio.getState().trackTitle;
      expect(fourthTrack).toBe(initialTrack);
    });

    it('returns 4 normalized equalizer bands in [0..1] range', () => {
      const levels = lofiRadio.getEqualizerLevels();
      expect(levels).toHaveLength(4);
      levels.forEach((val) => {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Studio Events Direct Dispatch & Safety', () => {
    it('directly dispatches events to registered in-memory listeners', () => {
      let receivedFlux = 0;
      const unsub = studioEvents.on('pixibun:audio-onset', (payload) => {
        receivedFlux = payload.flux;
      });

      studioEvents.emit('pixibun:audio-onset', { flux: 42.5, timestamp: 12345 });
      expect(receivedFlux).toBe(42.5);

      unsub();
      studioEvents.emit('pixibun:audio-onset', { flux: 99.9, timestamp: 12346 });
      expect(receivedFlux).toBe(42.5); // No update after unsub
    });
  });

  describe('StudioRadioWidget Component', () => {
    it('renders radio widget with current track title and accessible controls', () => {
      render(<StudioRadioWidget />);

      expect(screen.getByRole('region', { name: /Studio Synthesizer Radio/i })).toBeDefined();
      expect(screen.getByText(lofiRadio.getState().trackTitle)).toBeDefined();
      expect(screen.getByRole('button', { name: /Play Radio/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Next Track/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Volume: 60%/i })).toBeDefined();
    });

    it('toggles playback when play/pause button is clicked', async () => {
      const toggleSpy = vi.spyOn(lofiRadio, 'toggle').mockImplementation(async () => {});
      render(<StudioRadioWidget />);

      const playBtn = screen.getByRole('button', { name: /Play Radio/i });
      await act(async () => {
        fireEvent.click(playBtn);
      });

      expect(toggleSpy).toHaveBeenCalledTimes(1);
      toggleSpy.mockRestore();
    });

    it('skips track when next track button is clicked', async () => {
      const nextSpy = vi.spyOn(lofiRadio, 'nextTrack').mockImplementation(async () => {});
      render(<StudioRadioWidget />);

      const nextBtn = screen.getByRole('button', { name: /Next Track/i });
      await act(async () => {
        fireEvent.click(nextBtn);
      });

      expect(nextSpy).toHaveBeenCalledTimes(1);
      nextSpy.mockRestore();
    });

    it('opens volume slider popover and adjusts volume', async () => {
      const setVolSpy = vi.spyOn(lofiRadio, 'setVolume');
      render(<StudioRadioWidget />);

      const volBtn = screen.getByRole('button', { name: /Volume: 60%/i });
      fireEvent.click(volBtn);

      const slider = screen.getByLabelText(/Radio Volume Slider/i) as HTMLInputElement;
      expect(slider).toBeDefined();
      expect(slider.value).toBe('0.6');

      fireEvent.change(slider, { target: { value: '0.8' } });
      expect(setVolSpy).toHaveBeenCalledWith(0.8);

      setVolSpy.mockRestore();
    });
  });
});
