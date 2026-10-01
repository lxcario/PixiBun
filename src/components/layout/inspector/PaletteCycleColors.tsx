'use client';

import type { PaletteCycleTrack } from '@/types/palette';

export function PaletteCycleColors({ colors, track, onChange }: {
  colors: string[];
  track: PaletteCycleTrack;
  onChange: (range: { low: number; high: number }) => void;
}) {
  return <div className="flex flex-col gap-2">
    <span className="text-[11px] text-[var(--text-heading)]">Choose the first and last colors to animate.</span>
    {(['First', 'Last'] as const).map(end => <div key={end} className="flex flex-col gap-1">
      <span className="text-[10px] text-[var(--text-muted)]">{end} color</span>
      <div className="grid grid-cols-8 gap-1.5 p-1 max-h-36 overflow-y-auto" role="group" aria-label={`${end} cycle color`}>
        {colors.map((color, index) => <button key={index} type="button"
          aria-label={`${end} color ${index}: ${color}`} aria-pressed={index === (end === 'First' ? track.low : track.high)}
          title={`${color} · color ${index}`} style={{ backgroundColor: color }}
          onClick={() => onChange(end === 'First' ? { low: index, high: Math.max(index, track.high) } : { low: Math.min(index, track.low), high: index })}
          className={`min-h-6 aspect-square w-full rounded-[2px] border cursor-pointer relative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-gold)] ${index === (end === 'First' ? track.low : track.high) ? 'border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]' : 'border-[var(--desk-border)]'}`}>
          <span className="absolute bottom-0 right-0 bg-black/80 px-0.5 text-white text-[8px] leading-3">{index}</span>
        </button>)}
      </div>
    </div>)}
    <div className="flex h-4 border border-[var(--desk-border)] overflow-hidden rounded-[2px]" aria-label="Colors that will animate">
      {colors.slice(track.low, track.high + 1).map((color, i) => <span key={i} style={{ backgroundColor: color }} className="flex-1" />)}
    </div>
  </div>;
}
