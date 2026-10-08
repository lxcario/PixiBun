'use client';

import React, { useId, useState, useEffect } from 'react';

interface StudioNumberInputProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export default function StudioNumberInput({
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
}: StudioNumberInputProps) {
  const autoId = useId();
  const inputId = id || `studio-number-${autoId}`;
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const commitValue = (valStr: string) => {
    if (valStr === '') {
      setLocalValue(value.toString());
      return;
    }
    let parsed = parseFloat(valStr);
    if (!Number.isFinite(parsed)) {
      setLocalValue(value.toString());
      return;
    }
    if (min !== undefined && parsed < min) parsed = min;
    if (max !== undefined && parsed > max) parsed = max;
    setLocalValue(parsed.toString());
    onChange(parsed);
  };

  const handleBlur = () => {
    commitValue(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue(localValue);
    }
  };

  const increment = () => {
    let current = parseFloat(localValue);
    if (isNaN(current)) current = value;
    commitValue((current + step).toString());
  };

  const decrement = () => {
    let current = parseFloat(localValue);
    if (isNaN(current)) current = value;
    commitValue((current - step).toString());
  };

  const isAtMin = min !== undefined && value <= min;
  const isAtMax = max !== undefined && value >= max;

  return (
    <div className={`flex items-center justify-between h-[28px] w-full gap-[var(--space-3)] ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      <label htmlFor={inputId} className="font-sans text-[11px] text-[var(--text-body)] shrink-0">
        {label}
      </label>
      <div className="flex items-center h-full bg-[var(--surface-2)] border border-[var(--desk-border)] rounded-[var(--radius-sm)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--accent-gold)] focus-within:border-[var(--accent-gold)]">
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || isAtMin}
          onClick={decrement}
          className="h-full px-2 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-3)] disabled:opacity-50 transition-colors cursor-pointer"
          aria-label="Decrease value"
        >
          -
        </button>
        <div className="relative h-full flex items-center bg-[var(--surface-1)]">
          <input
            id={inputId}
            type="number"
            value={localValue}
            disabled={disabled}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            min={min}
            max={max}
            step={step}
            className={`w-[40px] h-full bg-transparent border-none text-center font-mono text-[10px] font-bold text-[var(--text-heading)] focus:outline-none focus:ring-0 p-0 m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield] ${unit ? 'pr-4' : ''}`}
          />
          {unit && (
            <span className="absolute right-1 pointer-events-none font-mono text-[10px] font-bold text-[var(--text-muted)]">
              {unit}
            </span>
          )}
        </div>
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || isAtMax}
          onClick={increment}
          className="h-full px-2 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-3)] disabled:opacity-50 transition-colors cursor-pointer"
          aria-label="Increase value"
        >
          +
        </button>
      </div>
    </div>
  );
}
