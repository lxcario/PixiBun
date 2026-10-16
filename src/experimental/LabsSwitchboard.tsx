'use client';

import React, { useEffect } from 'react';
import { LABS, useLabsAvailable, useLabsStore } from './labsStore';

/** Studio ▸ Labs: one switch per experiment, plus a quick way back to the classic studio. */
export function LabsSwitchboard() {
  const flags = useLabsStore(s => s.flags);
  const setLab = useLabsStore(s => s.setLab);
  const setAll = useLabsStore(s => s.setAll);
  useEffect(() => useLabsStore.getState().hydrate(), []);
  const anyOn = LABS.some(lab => flags[lab.id]);
  const available = useLabsAvailable();

  return (
    <section aria-label="Labs" data-testid="labs-switchboard">
      <div className="pb-eyebrow flex items-center justify-between gap-2" style={{ letterSpacing: 0, textTransform: 'none' }}>
        <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.09em]">
          Labs
          <span className="px-1.5 py-px rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--accent-wisteria)]/20 text-[var(--accent-wisteria)]">try me</span>
        </span>
        <button
          type="button"
          onClick={() => setAll(!anyOn)}
          className="text-[11px] font-semibold text-[var(--accent-gold)] hover:underline cursor-pointer rounded-md px-1"
        >
          {anyOn ? 'Classic studio' : 'Turn all on'}
        </button>
      </div>
      {!available && (
        <p className="m-0 mb-1.5 px-1.5 text-[11px] leading-[15px] text-[var(--text-muted)]">
          Graphite and Plum always keep the classic studio. Pick another style to see Labs.
        </p>
      )}
      <div className={`pb-group ${available ? '' : 'opacity-60'}`}>
        {LABS.map(lab => (
          <label key={lab.id} className="pb-row">
            <span className="pb-row-text">
              <span className="pb-row-label">{lab.name}</span>
              <span className="pb-row-hint">{lab.blurb}</span>
            </span>
            <input
              type="checkbox"
              className="sr-only peer"
              checked={flags[lab.id]}
              onChange={e => setLab(lab.id, e.target.checked)}
              aria-label={`Lab: ${lab.name}`}
            />
            <span aria-hidden="true" className="pb-switch" />
          </label>
        ))}
      </div>
    </section>
  );
}
