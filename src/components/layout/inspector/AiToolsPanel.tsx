'use client';

import React, { useRef, useState } from 'react';
import { PixelIcon, type PixelIconName } from '@/components/ui/PixelIcon';
import { PixiToolsPreviewLayer } from '@/components/ui/ToolMotionPreview';
import { NormalSculptorSection } from './NormalSculptorSection';
import { PhotometricLightingSection } from './PhotometricLightingSection';
import { RaymarchedShadowSection } from './RaymarchedShadowSection';
import { TilesetDecomposerSection } from './TilesetDecomposerSection';
import { PixiBudAssistanceSection } from './PixiBudAssistanceSection';

type DomainKey = 'start' | 'all' | 'lighting' | 'tileset' | 'polish';

const LAST_DOMAIN_KEY = 'pixibun:pixitools:last-domain';

const TASKS: { key: Exclude<DomainKey, 'start' | 'all'>; title: string; description: string; icon: PixelIconName }[] = [
  { key: 'lighting', title: 'Add light and depth', description: 'Light, shadows and surface shape.', icon: 'lamp' },
  { key: 'tileset', title: 'Build tiles and patterns', description: 'Preview a repeating tile or export a tilemap.', icon: 'grid' },
  { key: 'polish', title: 'Clean and refine', description: 'Find stray pixels and polish your sprite.', icon: 'sparkles' },
];

const DOMAIN_COPY: Record<Exclude<DomainKey, 'start'>, { title: string; description: string }> = {
  all: { title: 'All PixiTools', description: 'Explore every tool by what it does.' },
  lighting: { title: 'Add light and depth', description: 'Start with 3D Lighting & Shading to place a light on your sprite. Open the other sections for surface shape and shadows.' },
  tileset: { title: 'Build tiles and patterns', description: 'Select a tile to inspect how it repeats, or split artwork into tiles.' },
  polish: { title: 'Clean and refine', description: 'Scan first to review what cleanup would change, then apply it when you are ready.' },
};

function initialDomain(): DomainKey {
  try {
    const saved = sessionStorage.getItem(LAST_DOMAIN_KEY);
    if (saved === 'all' || saved === 'lighting' || saved === 'tileset' || saved === 'polish') return saved;
  } catch {
    // Session storage is optional; the task chooser remains available.
  }
  return 'start';
}

export const AiToolsPanel: React.FC = () => {
  const [activeDomain, setActiveDomain] = useState<DomainKey>(initialDomain);
  const panelRef = useRef<HTMLDivElement>(null);

  const chooseDomain = (domain: DomainKey) => {
    panelRef.current?.parentElement?.scrollTo(0, 0);
    setActiveDomain(domain);
    try {
      if (domain === 'start') sessionStorage.removeItem(LAST_DOMAIN_KEY);
      else sessionStorage.setItem(LAST_DOMAIN_KEY, domain);
    } catch {
      // Navigation still works if storage is unavailable.
    }
  };

  return (
    <div ref={panelRef} className="flex-1 flex flex-col min-h-0 bg-[var(--desk-surface)]">
      {activeDomain === 'start' ? (
        <>
          <div className="p-3 border-b border-[var(--desk-border)] bg-[var(--desk-surface-raised)]/30">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent-gold)]">PixiTools</p>
            <h2 className="mt-1 font-display text-sm font-bold text-[var(--text-heading)]">What would you like to do?</h2>
            <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">Choose a task to see the tools for it. Your artwork will not change until you apply an action.</p>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {TASKS.map((task) => (
              <button
                key={task.key}
                type="button"
                onClick={() => chooseDomain(task.key)}
                data-testid={`pixitools-task-${task.key}`}
                className="w-full flex items-start gap-2.5 p-2.5 text-left border border-[var(--desk-border)] rounded-[2px] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] hover:border-[var(--desk-border-highlight)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] transition-colors cursor-pointer"
              >
                <span aria-hidden="true" className="w-7 h-7 shrink-0 flex items-center justify-center bg-[var(--surface-3)] text-[var(--accent-gold)] rounded-[2px]">
                  <PixelIcon name={task.icon} size={15} />
                </span>
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-semibold text-[var(--text-heading)]">{task.title}</span>
                  <span className="text-[10px] leading-4 text-[var(--text-muted)]">{task.description}</span>
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => chooseDomain('all')}
              data-testid="pixitools-browse-all"
              className="w-full min-h-8 mt-1 px-2 text-[11px] font-semibold text-[var(--text-body)] hover:text-[var(--text-heading)] border border-[var(--desk-border)] rounded-[2px] hover:bg-[var(--surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] cursor-pointer"
            >
              Browse all tools →
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="p-3 border-b border-[var(--desk-border)] bg-[var(--desk-surface-raised)]/30">
            <button
              type="button"
              onClick={() => chooseDomain('start')}
              className="min-h-6 text-[10px] font-semibold text-[var(--accent-gold)] hover:text-[var(--text-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] rounded-[2px] cursor-pointer"
            >
              ← Choose another task
            </button>
            <h2 className="mt-1 font-display text-sm font-bold text-[var(--text-heading)]">{DOMAIN_COPY[activeDomain].title}</h2>
            <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">{DOMAIN_COPY[activeDomain].description}</p>
          </div>
          <PixiToolsPreviewLayer>
            <div className="p-3 flex flex-col gap-3">
              {(activeDomain === 'all' || activeDomain === 'lighting') && (
                <div className="flex flex-col gap-2">
                  <PhotometricLightingSection />
                  <NormalSculptorSection />
                  <RaymarchedShadowSection />
                </div>
              )}
              {(activeDomain === 'all' || activeDomain === 'tileset') && (
                <div className="flex flex-col gap-2">
                  {activeDomain === 'all' && <div className="w-full h-px bg-[var(--desk-border)] my-1" />}
                  <TilesetDecomposerSection />
                </div>
              )}
              {(activeDomain === 'all' || activeDomain === 'polish') && (
                <div className="flex flex-col gap-2">
                  {activeDomain === 'all' && <div className="w-full h-px bg-[var(--desk-border)] my-1" />}
                  <PixiBudAssistanceSection />
                </div>
              )}
            </div>
          </PixiToolsPreviewLayer>
        </>
      )}
    </div>
  );
};
