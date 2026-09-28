'use client';

import { useId } from 'react';

interface StudioSelectOption {
  value: string;
  label: string;
}

interface StudioSelectProps {
  label: string;
  value: string;
  options: StudioSelectOption[];
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export default function StudioSelect({
  label,
  value,
  options,
  onChange,
  id,
  disabled,
  className = ''
}: StudioSelectProps) {
  const autoId = useId();
  const selectId = id || `studio-select-${autoId}`;

  return (
    <div className={`flex items-center justify-between h-[28px] w-full gap-[var(--space-3)] ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      <label htmlFor={selectId} className="font-sans text-[11px] text-[var(--text-body)] shrink-0">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-full bg-[var(--surface-2)] border border-[var(--desk-border)] text-[var(--text-heading)] font-sans text-[11px] px-2 py-0 rounded-[var(--radius-sm)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:border-[var(--accent-gold)]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
