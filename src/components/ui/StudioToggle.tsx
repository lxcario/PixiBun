'use client';

import { useId } from 'react';

interface StudioToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export default function StudioToggle({
  label,
  checked,
  onChange,
  id,
  disabled,
  className = ''
}: StudioToggleProps) {
  const autoId = useId();
  const toggleId = id || `studio-toggle-${autoId}`;

  return (
    <div className={`flex items-center justify-between h-[28px] w-full gap-[var(--space-3)] ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
      <label htmlFor={toggleId} className="font-sans text-[11px] text-[var(--text-body)] shrink-0 cursor-pointer">
        {label}
      </label>
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          id={toggleId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-[16px] w-[28px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent-gold)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--surface-1)] ${
            checked ? 'bg-[var(--accent-gold)]' : 'bg-[var(--desk-border)]'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-[12px] w-[12px] transform rounded-full shadow transition duration-200 ease-in-out ${
              checked ? 'translate-x-[14px] bg-[var(--text-heading)]' : 'translate-x-[2px] bg-[var(--text-muted)]'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
