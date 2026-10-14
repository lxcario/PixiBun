'use client';

import React, { useId, useState } from 'react';
import { motion } from 'motion/react';

/**
 * Small, cozy building blocks shared by the workbench demos: a little app
 * window, a wooden picture frame for before/after canvases, and pill pickers
 * whose highlight slides between choices.
 */

export const ToolWindow: React.FC<{
  name: string;
  status?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ name, status, children, className = '' }) => (
  <div
    className={`w-full rounded-[3px] border-2 border-[var(--ink)] bg-[var(--desk-surface)] shadow-[0_6px_0_var(--ink)] overflow-hidden select-none ${className}`}
  >
    <div className="flex items-center gap-2 px-3 py-2 bg-[var(--state-active)] border-b-2 border-[var(--ink)]">
      <span aria-hidden="true" className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-plum)] shadow-[inset_0_-1px_0_rgba(0,0,0,0.3)]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary-bg)] shadow-[inset_0_-1px_0_rgba(0,0,0,0.3)]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-sage)] shadow-[inset_0_-1px_0_rgba(0,0,0,0.3)]" />
      </span>
      <span className="ml-1 font-mono text-[11px] text-[var(--text-muted)] truncate">{name}</span>
      {status && <span className="ml-auto font-mono text-[11px] text-[var(--accent-gold)] whitespace-nowrap">{status}</span>}
    </div>
    <div className="p-3">{children}</div>
  </div>
);

/** A wooden frame with a paper name tag, for showing a canvas like a little painting. */
export const ArtFrame: React.FC<{
  tag: string;
  caption?: React.ReactNode;
  glow?: boolean;
  children: React.ReactNode;
}> = ({ tag, caption, glow = false, children }) => (
  <figure className="flex flex-col items-center">
    <div
      className={`relative p-[6px] rounded-[2px] bg-[var(--frame-wood)] border-2 border-[var(--ink)] shadow-[inset_2px_2px_0_var(--frame-light),inset_-2px_-2px_0_var(--frame-dark),0_4px_0_var(--ink)] ${
        glow ? 'ring-2 ring-[var(--accent-gold)]/60 ring-offset-2 ring-offset-[var(--surface-0)]' : ''
      }`}
    >
      <span
        className={`absolute -top-3 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap px-2 py-0.5 rounded-[2px] border-2 border-[var(--ink)] font-mono text-[10px] font-bold uppercase tracking-wider ${
          glow ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)]' : 'bg-[var(--desk-surface-raised)] text-[var(--text-body)]'
        }`}
      >
        {tag}
      </span>
      <div className="bg-[var(--surface-0)] p-1.5 border-2 border-[var(--ink)]">{children}</div>
    </div>
    {caption && <figcaption className="mt-2.5 font-mono text-[11px] text-[var(--text-muted)]">{caption}</figcaption>}
  </figure>
);

export interface PickerOption<T> {
  value: T;
  label: string;
  /** Optional decoration shown before the label (hidden from assistive tech). */
  icon?: React.ReactNode;
}

/** A labelled row of pill buttons. The gold highlight glides to the chosen pill. */
export function Picker<T extends string | number>({
  label,
  hint,
  options,
  value,
  onChange,
  columns,
}: {
  label: string;
  hint?: React.ReactNode;
  options: PickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: number;
}) {
  const id = useId();
  // Each pick sends a little ring out of the chosen pill, so a click always visibly lands.
  const [pokes, setPokes] = useState(0);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-mono text-[11px] text-[var(--text-muted)]">{label}</span>
        {hint && <span className="font-mono text-[11px] text-[var(--accent-gold)]">{hint}</span>}
      </div>
      <div
        className="grid gap-1 p-1 rounded-[3px] bg-[var(--surface-0)] border-2 border-[var(--ink)]"
        style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => {
                setPokes((n) => n + 1);
                onChange(option.value);
              }}
              aria-pressed={active}
              className={`relative min-h-8 px-1 py-1.5 rounded-[2px] font-mono text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] ${
                active ? 'text-[var(--primary-fg)]' : 'text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--desk-surface-raised)]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId={`picker-${id}`}
                  className="absolute inset-0 rounded-[2px] bg-[var(--primary-bg)] shadow-[inset_0_-2px_0_var(--primary-shade)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                />
              )}
              {active && pokes > 0 && <span key={pokes} aria-hidden="true" className="picker-pop" />}
              <span className="relative z-10 inline-flex flex-wrap items-center justify-center gap-1">
                {option.icon && <span aria-hidden="true">{option.icon}</span>}
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A tiny round swatch used as a picker icon. */
export const Dot: React.FC<{ color: string }> = ({ color }) => (
  <span className="inline-block w-2.5 h-2.5 rounded-full border border-[var(--ink)]" style={{ background: color }} />
);
