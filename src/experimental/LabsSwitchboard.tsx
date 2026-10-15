'use client';

import React, { useEffect } from 'react';
import { LABS, useLabsStore } from './labsStore';

/** Studio ▸ Labs: one switch per experiment, plus a quick way back to the classic studio. */
export function LabsSwitchboard() {
  const flags = useLabsStore(s => s.flags);
  const setLab = useLabsStore(s => s.setLab);
  const setAll = useLabsStore(s => s.setAll);
  useEffect(() => useLabsStore.getState().hydrate(), []);
  const anyOn = LABS.some(lab => flags[lab.id]);

  return (
    <section aria-label="Labs" data-testid="labs-switchboard" className="pb-3 mb-3 border-b border-[var(--desk-border)]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold text-[11px] tracking-wide text-[var(--text-heading)]">
          Labs <span className="ml-1 px-1.5 py-px rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--accent-wisteria)]/20 text-[var(--accent-wisteria)]">try me</span>
        </span>
        <button
          type="button"
          onClick={() => setAll(!anyOn)}
          className="text-[10px] font-semibold text-[var(--accent-gold)] hover:underline cursor-pointer"
        >
          {anyOn ? 'Classic studio' : 'Turn all on'}
        </button>
      </div>
      <div className="flex flex-col">
        {LABS.map(lab => (
          <label key={lab.id} className="insp-toggle flex items-start gap-2.5 py-1.5 cursor-pointer select-none">
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-medium text-[var(--text-heading)]">{lab.name}</span>
              <span className="block mt-0.5 text-[10px] leading-[14px] text-[var(--text-muted)]">{lab.blurb}</span>
            </span>
            <input
              type="checkbox"
              className="sr-only peer"
              checked={flags[lab.id]}
              onChange={e => setLab(lab.id, e.target.checked)}
              aria-label={`Lab: ${lab.name}`}
            />
            <span aria-hidden="true" className="insp-switch mt-0.5"><span /></span>
          </label>
        ))}
      </div>
    </section>
  );
}
