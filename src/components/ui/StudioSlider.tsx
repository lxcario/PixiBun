'use client';

import React, { useId } from 'react';

interface StudioSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export default function StudioSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = '',
  id,
  disabled,
  className = ''
}: StudioSliderProps) {
  const autoId = useId();
  const inputId = id || `studio-slider-${autoId}`;

  // Calculate percentage for styling the track
  const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className={`flex flex-col gap-[var(--space-3)] w-full ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      <div className="flex justify-between items-center leading-none">
        <label htmlFor={inputId} className="font-sans text-[11px] text-[var(--text-body)]">
          {label}
        </label>
        <span className="font-mono text-[10px] font-bold text-[var(--text-heading)]">
          {value}{unit}
        </span>
      </div>
      <div className="relative flex items-center h-[12px]">
        <input
          type="range"
          id={inputId}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full appearance-none bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)] rounded-full h-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent-gold)] [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--accent-gold)] [&::-moz-range-thumb]:border-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--accent-gold) 0%, var(--accent-gold) ${percent}%, var(--desk-border) ${percent}%, var(--desk-border) 100%)`,
            height: '4px',
            borderRadius: '2px',
          }}
        />
      </div>
    </div>
  );
}
