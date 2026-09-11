'use client';

import React, { useEffect, useRef, useState } from 'react';
import { lofiRadio, RadioState } from '@/lib/audio/lofiRadio';

export const StudioRadioWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [state, setState] = useState<RadioState>(() => lofiRadio.getState());
  const [eqLevels, setEqLevels] = useState<[number, number, number, number]>([0.08, 0.08, 0.08, 0.08]);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const volumePopoverRef = useRef<HTMLDivElement>(null);

  // Subscribe to radio state changes
  useEffect(() => {
    const unsub = lofiRadio.subscribe((next) => {
      setState(next);
    });
    return unsub;
  }, []);

  // Poll equalizer levels and trigger onset detector via requestAnimationFrame during playback
  useEffect(() => {
    if (!state.isPlaying) {
      setEqLevels([0.08, 0.08, 0.08, 0.08]);
      return;
    }

    let animId: number;
    const pollLevels = () => {
      const levels = lofiRadio.getEqualizerLevels();
      setEqLevels(levels);
      animId = requestAnimationFrame(pollLevels);
    };

    animId = requestAnimationFrame(pollLevels);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [state.isPlaying]);

  // Click outside to close volume popover
  useEffect(() => {
    if (!isVolumeOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (volumePopoverRef.current && !volumePopoverRef.current.contains(e.target as Node)) {
        setIsVolumeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isVolumeOpen]);

  const handleTogglePlay = async () => {
    await lofiRadio.toggle();
  };

  const handleNextTrack = async () => {
    await lofiRadio.nextTrack();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    lofiRadio.setVolume(vol);
  };

  return (
    <div
      className={`relative flex items-center gap-1.5 px-2 py-1 rounded-[2px] bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] shadow-[0_2px_0_var(--btn-shadow)] text-[var(--text-body)] select-none transition-colors ${className}`}
      role="region"
      aria-label="Studio Synthesizer Radio"
    >
      {/* 4-Band Animated Equalizer */}
      <div
        className="flex items-end gap-[2px] h-3.5 w-3.5 px-[1px] py-[1px] bg-[var(--desk-surface)] border border-[var(--desk-border)] rounded-[1px]"
        title={state.isPlaying ? `Equalizer active: ${state.trackTitle}` : 'Radio idle'}
        aria-hidden="true"
      >
        {eqLevels.map((lvl, idx) => {
          const heightPct = Math.max(14, Math.min(100, Math.round(lvl * 100)));
          return (
            <div
              key={idx}
              className={`w-[2px] rounded-t-[1px] transition-[height] duration-75 ${
                state.isPlaying ? 'bg-[#f0be7c]' : 'bg-[var(--text-muted)] opacity-40'
              }`}
              style={{ height: `${heightPct}%` }}
            />
          );
        })}
      </div>

      {/* Track Title */}
      <span
        className="text-[11px] font-mono font-bold text-[var(--text-heading)] max-w-[105px] truncate leading-tight cursor-default"
        title={`Current Track: ${state.trackTitle} (${state.isPlaying ? 'Playing' : 'Paused'})`}
      >
        {state.trackTitle}
      </span>

      {/* Play / Pause Button */}
      <button
        type="button"
        onClick={handleTogglePlay}
        title={state.isPlaying ? 'Pause Radio' : 'Play Radio'}
        aria-label={state.isPlaying ? 'Pause Radio' : 'Play Radio'}
        className={`w-6 h-6 flex items-center justify-center rounded-[1px] border border-[var(--desk-border)] bg-[var(--desk-surface)] hover:bg-[var(--desk-surface-raised)] hover:text-[#f0be7c] transition-colors cursor-pointer ${
          state.isPlaying ? 'text-[#f0be7c]' : 'text-[var(--text-body)]'
        }`}
      >
        {state.isPlaying ? (
          // Pause Icon
          <svg viewBox="0 0 10 10" width="10" height="10" fill="currentColor">
            <rect x="2" y="1.5" width="2" height="7" rx="0.5" />
            <rect x="6" y="1.5" width="2" height="7" rx="0.5" />
          </svg>
        ) : (
          // Play Icon
          <svg viewBox="0 0 10 10" width="10" height="10" fill="currentColor">
            <polygon points="2.5,1.5 8.5,5 2.5,8.5" />
          </svg>
        )}
      </button>

      {/* Skip to Next Track */}
      <button
        type="button"
        onClick={handleNextTrack}
        title="Next Track"
        aria-label="Next Track"
        className="w-6 h-6 flex items-center justify-center rounded-[1px] border border-[var(--desk-border)] bg-[var(--desk-surface)] hover:bg-[var(--desk-surface-raised)] hover:text-[#f0be7c] text-[var(--text-body)] transition-colors cursor-pointer"
      >
        {/* Next Track Icon */}
        <svg viewBox="0 0 10 10" width="10" height="10" fill="currentColor">
          <polygon points="2,1.5 6.5,5 2,8.5" />
          <rect x="7" y="1.5" width="1.5" height="7" rx="0.5" />
        </svg>
      </button>

      {/* Volume Popover Button */}
      <div className="relative" ref={volumePopoverRef}>
        <button
          type="button"
          onClick={() => setIsVolumeOpen((prev) => !prev)}
          title={`Volume: ${Math.round(state.volume * 100)}%`}
          aria-label={`Volume: ${Math.round(state.volume * 100)}%`}
          className={`w-6 h-6 flex items-center justify-center rounded-[1px] border border-[var(--desk-border)] bg-[var(--desk-surface)] hover:bg-[var(--desk-surface-raised)] hover:text-[#f0be7c] transition-colors cursor-pointer ${
            isVolumeOpen ? 'border-[#f0be7c] text-[#f0be7c]' : 'text-[var(--text-body)]'
          }`}
        >
          {state.volume === 0 ? (
            // Muted Speaker Icon
            <svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor">
              <path d="M1 4h2l3-3v10L3 8H1V4z" />
              <line x1="8" y1="4" x2="11" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="11" y1="4" x2="8" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          ) : (
            // Speaker Icon
            <svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor">
              <path d="M1 4h2l3-3v10L3 8H1V4z" />
              <path
                d="M8.5 3.5a3.5 3.5 0 0 1 0 5M10 2a5.5 5.5 0 0 1 0 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>

        {/* Volume Slider Dropdown */}
        {isVolumeOpen && (
          <div className="absolute right-0 top-full mt-1.5 p-2 bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[2px] shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-50 flex items-center gap-2 min-w-[130px]">
            <span className="text-[10px] font-mono text-[var(--text-muted)]">VOL</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={state.volume}
              onChange={handleVolumeChange}
              aria-label="Radio Volume Slider"
              className="w-16 h-1.5 bg-[var(--desk-surface-raised)] accent-[#f0be7c] rounded-[1px] cursor-pointer"
            />
            <span className="text-[10px] font-mono text-[#f0be7c] min-w-[24px] text-right">
              {Math.round(state.volume * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
