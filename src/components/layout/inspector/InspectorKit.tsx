'use client';

import React, { useId } from 'react';
import { clsx } from 'clsx';
import { PixelIcon, type PixelIconName } from '@/components/ui/PixelIcon';

/**
 * Small building blocks shared by the inspector tabs. Sections are separated by
 * a quiet rule and a small label instead of a boxed card each, so the eye reads
 * the panel as one sheet of settings rather than a stack of nested boxes.
 */

export function InspectorSection({
  title,
  meta,
  icon,
  children,
  className,
  testId,
}: {
  title: string;
  meta?: React.ReactNode;
  icon?: PixelIconName;
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} data-testid={testId} className={clsx('insp-section px-3 py-3', className)}>
      <div className="flex items-center justify-between gap-2 mb-2 min-h-5">
        <h3 id={headingId} className="insp-eyebrow flex items-center gap-1.5">
          {icon && <PixelIcon name={icon} size={11} className="text-[var(--accent-gold)]" />}
          {title}
        </h3>
        {meta && <div className="flex items-center gap-1 shrink-0 text-[11px] text-[var(--text-muted)]">{meta}</div>}
      </div>
      {children}
    </section>
  );
}

/** A labelled on/off switch built on a real checkbox, so it keeps checkbox semantics. */
export function ToggleRow({
  label,
  checked,
  onChange,
  hint,
  shortcut,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
  shortcut?: string;
  disabled?: boolean;
}) {
  const hintId = useId();
  return (
    <label className={clsx('insp-toggle relative flex items-start gap-2.5 py-1.5 select-none', disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer')}>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-heading)]">
          {label}
          {shortcut && <kbd className="insp-kbd">{shortcut}</kbd>}
        </span>
        {hint && <span id={hintId} className="block mt-0.5 text-[11px] leading-4 text-[var(--text-muted)]">{hint}</span>}
      </span>
      {/* The real checkbox lies, invisible, exactly over the drawn switch, so a
          pointer or an automated click on the control lands on the switch. */}
      <input
        type="checkbox"
        className="peer absolute right-0 top-2 z-10 m-0 h-[18px] w-[30px] opacity-0 cursor-pointer disabled:cursor-not-allowed"
        checked={checked}
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span aria-hidden="true" className="insp-switch mt-0.5"><span /></span>
    </label>
  );
}

/** Slider with its value shown in a small readout chip. */
export function RangeRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = '',
  ariaLabel,
  format,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
  ariaLabel?: string;
  format?: (value: number) => string;
  /** One line under the label, also read as the slider's description. */
  hint?: string;
}) {
  const hintId = useId();
  return (
    <div className="py-1">
      <div className="flex justify-between items-center gap-2">
        <span className="text-xs font-medium text-[var(--text-body)]">{label}</span>
        <output className="insp-readout">{format ? format(value) : value}{unit}</output>
      </div>
      {hint && <span id={hintId} className="block mb-0.5 text-[11px] leading-4 text-[var(--text-muted)]">{hint}</span>}
      <input
        aria-label={ariaLabel ?? `Tool panel ${label.toLowerCase()}`}
        aria-describedby={hint ? hintId : undefined}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-6 accent-[var(--accent-gold)] cursor-pointer"
      />
    </div>
  );
}

/** Native select with a visible label above it. */
export function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
  ariaLabel,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <label className="block py-1 space-y-1">
      <span className="block text-xs font-medium text-[var(--text-body)]">{label}</span>
      <select
        aria-label={ariaLabel ?? label}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="block w-full px-2 py-1 bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[3px] text-xs text-[var(--text-heading)] cursor-pointer"
      >
        {options.map(([id, text]) => (
          <option key={id} value={id}>{text}</option>
        ))}
      </select>
    </label>
  );
}

/** A quiet sentence of guidance; never an instruction the artist must act on. */
export function InspectorNote({ children, icon = 'help' }: { children: React.ReactNode; icon?: PixelIconName }) {
  return (
    <p className="insp-note flex gap-2 text-[11px] leading-4 text-[var(--text-muted)]">
      <PixelIcon name={icon} size={11} className="mt-0.5 shrink-0 text-[var(--accent-wisteria)]" />
      <span>{children}</span>
    </p>
  );
}
