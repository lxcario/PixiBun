'use client';

import React, { useRef, useCallback } from 'react';

interface PixelSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
  width?: string;
  label?: string;
}

export const PixelSlider: React.FC<PixelSliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  className = '',
  width = 'w-24',
  label,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const track = trackRef.current;
    if (!track) return;

    const updateFromPointer = (clientX: number) => {
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const rawValue = min + ratio * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      onChange(Math.max(min, Math.min(max, steppedValue)));
    };

    updateFromPointer(e.clientX);

    const onPointerMove = (moveEvent: PointerEvent) => {
      updateFromPointer(moveEvent.clientX);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [min, max, step, onChange]);

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      className={`relative h-6 ${width} bg-surface-inset texture-dither border-2 border-border-dark rounded-[4px] cursor-pointer select-none flex items-center p-0.5 shadow-[inset_0_2px_4px_rgba(58,46,76,0.3)] ${className}`}
    >
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
        aria-label={label}
      />
      {/* Filled Progress Track */}
      <div
        className="h-full bg-accent-primary rounded-l-[2px] transition-none"
        style={{ width: `${percentage}%` }}
      />

      {/* Chunky Tactile Slider Thumb with 3 Vertical Grooves */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-4 h-5 bg-surface-raised border-2 border-border-dark rounded-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(58,46,76,0.3)] flex items-center justify-center gap-0.5 pointer-events-none"
        style={{ left: `calc(${percentage}% - 8px)` }}
      >
        <div className="w-[1.5px] h-2.5 bg-border-dark" />
        <div className="w-[1.5px] h-2.5 bg-border-dark" />
        <div className="w-[1.5px] h-2.5 bg-border-dark" />
      </div>
    </div>
  );
};
