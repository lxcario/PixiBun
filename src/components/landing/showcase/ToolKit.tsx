'use client';

import React, { useId } from 'react';
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
    className={`w-full rounded-[3px] border-2 border-[#0b0714] bg-[#241640] shadow-[0_6px_0_#0b0714] overflow-hidden select-none ${className}`}
  >
    <div className="flex items-center gap-2 px-3 py-2 bg-[#2f1d52] border-b-2 border-[#0b0714]">
      <span aria-hidden="true" className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#e08ca6] shadow-[inset_0_-1px_0_rgba(0,0,0,0.3)]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#ffd285] shadow-[inset_0_-1px_0_rgba(0,0,0,0.3)]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#a8e092] shadow-[inset_0_-1px_0_rgba(0,0,0,0.3)]" />
      </span>
      <span className="ml-1 font-mono text-[11px] text-[#cdbfdf] truncate">{name}</span>
      {status && <span className="ml-auto font-mono text-[11px] text-[#ffd285] whitespace-nowrap">{status}</span>}
    </div>
    <div className="p-4">{children}</div>
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
      className={`relative p-[6px] rounded-[2px] bg-[#7a4a34] border-2 border-[#0b0714] shadow-[inset_2px_2px_0_#a8683f,inset_-2px_-2px_0_#4a2a1e,0_4px_0_#0b0714] ${
        glow ? 'ring-2 ring-[#ffd285]/60 ring-offset-2 ring-offset-[#241640]' : ''
      }`}
    >
      <span
        className={`absolute -top-3 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap px-2 py-0.5 rounded-[2px] border-2 border-[#0b0714] font-mono text-[10px] font-bold uppercase tracking-wider ${
          glow ? 'bg-[#ffd285] text-[#2a1945]' : 'bg-[#f6ead6] text-[#4a3559]'
        }`}
      >
        {tag}
      </span>
      <div className="bg-[#140b21] p-1.5 border-2 border-[#0b0714]">{children}</div>
    </div>
    {caption && <figcaption className="mt-2.5 font-mono text-[11px] text-[#cdbfdf]">{caption}</figcaption>}
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
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-mono text-[11px] text-[#cdbfdf]">{label}</span>
        {hint && <span className="font-mono text-[11px] text-[#ffd285]">{hint}</span>}
      </div>
      <div
        className="grid gap-1 p-1 rounded-[3px] bg-[#140b21] border-2 border-[#0b0714]"
        style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`relative px-2 py-1.5 rounded-[2px] font-mono text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c] ${
                active ? 'text-[#2a1945]' : 'text-[#cdbfdf] hover:text-[#fff3e0] hover:bg-[#2a1945]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId={`picker-${id}`}
                  className="absolute inset-0 rounded-[2px] bg-[#ffd285] shadow-[inset_0_-2px_0_#d89a55]"
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                />
              )}
              <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
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
  <span className="inline-block w-2.5 h-2.5 rounded-full border border-[#0b0714]" style={{ background: color }} />
);
