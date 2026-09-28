'use client';

import React, { useState } from 'react';
import { NormalSculptorSection } from './NormalSculptorSection';
import { PhotometricLightingSection } from './PhotometricLightingSection';
import { RaymarchedShadowSection } from './RaymarchedShadowSection';
import { VolumetricOpticsSection } from './VolumetricOpticsSection';
import { TilesetDecomposerSection } from './TilesetDecomposerSection';
import { PixiBudAssistanceSection } from './PixiBudAssistanceSection';
import { PixiToolsPreviewLayer } from '@/components/ui/ToolMotionPreview';

type DomainKey = 'all' | 'lighting' | 'tileset' | 'polish';

export const AiToolsPanel: React.FC = () => {
  const [activeDomain, setActiveDomain] = useState<DomainKey>('all');

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--desk-surface)]">
      {/* Domain Navigation Filter Bar */}
      <div className="p-2 border-b border-[var(--desk-border)] flex items-center gap-1 bg-[var(--desk-surface-raised)]/30 shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveDomain('all')}
          aria-label="All Tools"
          className={`flex-1 py-1 text-[10px] font-sans text-center rounded-[2px] transition-colors cursor-pointer whitespace-nowrap ${
            activeDomain === 'all'
              ? 'bg-[var(--surface-2)] text-[var(--text-heading)] font-semibold border border-[var(--desk-border-highlight)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-1)] border border-transparent'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveDomain('lighting')}
          title="Lighting & Shadows"
          aria-label="Lighting & Shadows"
          className={`flex-1 py-1 text-[10px] font-sans text-center rounded-[2px] transition-colors cursor-pointer whitespace-nowrap ${
            activeDomain === 'lighting'
              ? 'bg-[var(--surface-2)] text-[var(--text-heading)] font-semibold border border-[var(--desk-border-highlight)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-1)] border border-transparent'
          }`}
        >
          Lighting
        </button>
        <button
          onClick={() => setActiveDomain('tileset')}
          title="Tiles & Patterns"
          aria-label="Tiles & Patterns"
          className={`flex-1 py-1 text-[10px] font-sans text-center rounded-[2px] transition-colors cursor-pointer whitespace-nowrap ${
            activeDomain === 'tileset'
              ? 'bg-[var(--surface-2)] text-[var(--text-heading)] font-semibold border border-[var(--desk-border-highlight)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-1)] border border-transparent'
          }`}
        >
          Tileset
        </button>
        <button
          onClick={() => setActiveDomain('polish')}
          title="Clean & Polish"
          aria-label="Clean & Polish"
          className={`flex-1 py-1 text-[10px] font-sans text-center rounded-[2px] transition-colors cursor-pointer whitespace-nowrap ${
            activeDomain === 'polish'
              ? 'bg-[var(--surface-2)] text-[var(--text-heading)] font-semibold border border-[var(--desk-border-highlight)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-1)] border border-transparent'
          }`}
        >
          Cleanup
        </button>
      </div>

      {/* Main Domain Content Stream */}
      <PixiToolsPreviewLayer>
      <div className="p-3 flex flex-col gap-3">
        {/* 1. Lighting & Depth Domain */}
        {(activeDomain === 'all' || activeDomain === 'lighting') && (
          <div className="flex flex-col gap-2">
            <PhotometricLightingSection />
            <NormalSculptorSection />
            <RaymarchedShadowSection />
            <VolumetricOpticsSection />
          </div>
        )}

        {/* 2. Tileset & Autotile Domain */}
        {(activeDomain === 'all' || activeDomain === 'tileset') && (
          <div className="flex flex-col gap-2">
            {activeDomain === 'all' && <div className="w-full h-px bg-[var(--desk-border)] my-1" />}
            <TilesetDecomposerSection />
          </div>
        )}

        {/* 3. Clean & Polish Domain */}
        {(activeDomain === 'all' || activeDomain === 'polish') && (
          <div className="flex flex-col gap-2">
            {activeDomain === 'all' && <div className="w-full h-px bg-[var(--desk-border)] my-1" />}
            <PixiBudAssistanceSection />
          </div>
        )}
      </div>
      </PixiToolsPreviewLayer>
    </div>
  );
};
