'use client';

import React from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { LayersPanel } from './inspector/LayersPanel';
import { PalettePanel } from './inspector/PalettePanel';
import { AiToolsPanel } from './inspector/AiToolsPanel';

export const RightInspector: React.FC = () => {
  const { activeInspectorTab, setActiveInspectorTab } = useStudioStore();

  return (
    <aside className="w-80 bg-[var(--desk-surface)] border-l-2 border-[var(--desk-border)] flex flex-col justify-between select-none z-10 text-[var(--text-heading)] shadow-sm transition-colors duration-300">
      {/* Top Tab Switcher */}
      <div className="flex bg-[var(--desk-surface-raised)] border-b-2 border-[var(--desk-border)] p-1.5 gap-1.5">
        <button
          onClick={() => setActiveInspectorTab('layers')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-mono font-bold py-2 rounded-[2px] border transition-colors cursor-pointer ${
            activeInspectorTab === 'layers'
              ? 'bg-[var(--desk-surface-raised)] border-[#f0be7c] text-[#f0be7c] shadow-[0_2px_0_#130e20]'
              : 'bg-[var(--desk-surface)] border-[#352248] text-[var(--text-body)] hover:text-[#f0be7c] hover:bg-[var(--desk-surface)]'
          }`}
        >
          <PixelIcon name="layers" size={14} />
          <span>Layers</span>
        </button>

        <button
          onClick={() => setActiveInspectorTab('palette')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-mono font-bold py-2 rounded-[2px] border transition-colors cursor-pointer ${
            activeInspectorTab === 'palette'
              ? 'bg-[var(--desk-surface-raised)] border-[#f0be7c] text-[#f0be7c] shadow-[0_2px_0_#130e20]'
              : 'bg-[var(--desk-surface)] border-[#352248] text-[var(--text-body)] hover:text-[#f0be7c] hover:bg-[var(--desk-surface)]'
          }`}
        >
          <PixelIcon name="palette" size={14} />
          <span>Palette</span>
        </button>

        <button
          onClick={() => setActiveInspectorTab('ai')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-mono font-bold py-2 rounded-[2px] border transition-colors cursor-pointer ${
            activeInspectorTab === 'ai'
              ? 'bg-[var(--desk-surface-raised)] border-[#f0be7c] text-[#f0be7c] shadow-[0_2px_0_#130e20]'
              : 'bg-[var(--desk-surface)] border-[#352248] text-[var(--text-body)] hover:text-[#f0be7c] hover:bg-[var(--desk-surface)]'
          }`}
        >
          <PixelIcon name="sparkles" size={14} />
          <span>PixiBud AI</span>
        </button>
      </div>

      {/* Active Tab Panel */}
      {activeInspectorTab === 'layers' && <LayersPanel />}
      {activeInspectorTab === 'palette' && <PalettePanel />}
      {activeInspectorTab === 'ai' && <AiToolsPanel />}
    </aside>
  );
};
