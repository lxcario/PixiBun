'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { LayersPanel } from './inspector/LayersPanel';
import { PalettePanel } from './inspector/PalettePanel';

const AiToolsPanel = dynamic(
  () => import('./inspector/AiToolsPanel').then((m) => m.AiToolsPanel),
  { ssr: false }
);

export const RightInspector: React.FC = () => {
  const activeInspectorTab = useStudioStore((s) => s.activeInspectorTab);
  const setActiveInspectorTab = useStudioStore((s) => s.setActiveInspectorTab);

  return (
    <aside
      data-testid="right-inspector"
      className="w-[292px] border-l shrink-0 bg-[var(--desk-surface)] border-[var(--desk-border)] flex flex-col justify-between select-none z-10 text-[var(--text-heading)] transition-all duration-150"
    >
      {/* Top Tab Switcher (Tactile Artist Caddy Compartment Tabs) */}
      <div className="flex bg-[var(--desk-surface)] border-b border-[var(--desk-border)] h-9 p-1 gap-1">
        <button
          onClick={() => setActiveInspectorTab('layers')}
          aria-label="Layers"
          data-testid="tab-layers"
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-sans cursor-pointer rounded-[2px] transition-all duration-100 ${
            activeInspectorTab === 'layers'
              ? 'bg-[var(--inspector-tab-active-bg)] text-[var(--inspector-tab-active-fg)] border border-[var(--inspector-tab-active-border)] font-bold shadow-[inset_1px_1px_0_rgba(255,255,255,0.15),0_1px_0_var(--btn-shadow)]'
              : 'pixel-tactile-btn border border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--text-heading)]'
          }`}
        >
          <PixelIcon name="layers" size={13} />
          <span>Layers</span>
        </button>

        <button
          onClick={() => setActiveInspectorTab('palette')}
          aria-label="Palette"
          data-testid="tab-palette"
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-sans cursor-pointer rounded-[2px] transition-all duration-100 ${
            activeInspectorTab === 'palette'
              ? 'bg-[var(--inspector-tab-active-bg)] text-[var(--inspector-tab-active-fg)] border border-[var(--inspector-tab-active-border)] font-bold shadow-[inset_1px_1px_0_rgba(255,255,255,0.15),0_1px_0_var(--btn-shadow)]'
              : 'pixel-tactile-btn border border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--text-heading)]'
          }`}
        >
          <PixelIcon name="palette" size={13} />
          <span>Palette</span>
        </button>

        <button
          onClick={() => setActiveInspectorTab('ai')}
          aria-label="PixiTools"
          data-testid="tab-ai"
          title="PixiTools"
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-sans cursor-pointer rounded-[2px] transition-all duration-100 ${
            activeInspectorTab === 'ai'
              ? 'bg-[var(--inspector-tab-active-bg)] text-[var(--inspector-tab-active-fg)] border border-[var(--inspector-tab-active-border)] font-bold shadow-[inset_1px_1px_0_rgba(255,255,255,0.15),0_1px_0_var(--btn-shadow)]'
              : 'pixel-tactile-btn border border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--text-heading)]'
          }`}
        >
          <PixelIcon name="chisel" size={13} />
          <span>PixiTools</span>
        </button>
      </div>

      {/* Main Content Area: Dedicated Panels per Tab */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeInspectorTab === 'layers' && <LayersPanel />}
        {activeInspectorTab === 'palette' && <PalettePanel />}
        {activeInspectorTab === 'ai' && <AiToolsPanel />}
      </div>
    </aside>
  );
};
