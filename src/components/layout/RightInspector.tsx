'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { LayersPanel } from './inspector/LayersPanel';
import { PalettePanel } from './inspector/PalettePanel';
import { ToolSettingsPanel } from './inspector/ToolSettingsPanel';
import { NavigatorPanel } from './inspector/NavigatorPanel';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { PinnedColorPanel } from '@/components/ui/ArtistColorPicker';

import { PixiMotionPanel } from './inspector/PixiMotionPanel';
import { MotionRigLibrary } from './inspector/MotionRigLibrary';

const AiToolsPanel = dynamic(
  () => import('./inspector/AiToolsPanel').then((m) => m.AiToolsPanel),
  { ssr: false }
);

export const RightInspector: React.FC = () => {
  const activeInspectorTab = useStudioStore((s) => s.activeInspectorTab);
  const setActiveInspectorTab = useStudioStore((s) => s.setActiveInspectorTab);
  const motionPart = useStudioStore((s) => s.motionPart);
  const layout = useWorkspaceStore(s => s.layout);

  return (
    <aside
      data-testid="right-inspector"
      style={{ width: layout.inspectorWidth }}
      className="h-full border-x shrink-0 bg-[var(--desk-surface)] border-[var(--desk-border)] flex flex-col justify-between select-none z-10 text-[var(--text-heading)]"
    >
      {/* Top Tab Switcher (Tactile Artist Caddy Compartment Tabs) */}
      <div className="flex bg-[var(--desk-surface)] border-b border-[var(--desk-border)] h-9 p-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveInspectorTab('tools')}
          aria-label="Tools"
          data-testid="tab-tools"
          aria-pressed={activeInspectorTab === 'tools'}
          title="Tool Settings"
          className={`flex-1 min-w-0 h-7 flex items-center justify-center gap-1 text-[11px] font-sans rounded-[2px] border px-1 overflow-hidden transition-all duration-100 ${
            activeInspectorTab === 'tools'
              ? 'bg-[var(--inspector-tab-active-bg)] text-[var(--inspector-tab-active-fg)] border-[var(--inspector-tab-active-border)] font-bold shadow-[inset_1px_1px_0_rgba(255,255,255,0.15),0_1px_0_var(--btn-shadow)]'
              : 'pixel-tactile-btn border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--text-heading)]'
          }`}
        >
          <PixelIcon name="pen" size={11} className="shrink-0" />
          <span className="truncate">Tools</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveInspectorTab('layers')}
          aria-label="Layers"
          data-testid="tab-layers"
          aria-pressed={activeInspectorTab === 'layers'}
          title="Layers"
          className={`flex-1 min-w-0 h-7 flex items-center justify-center gap-1 text-[11px] font-sans rounded-[2px] border px-1 overflow-hidden transition-all duration-100 ${
            activeInspectorTab === 'layers'
              ? 'bg-[var(--inspector-tab-active-bg)] text-[var(--inspector-tab-active-fg)] border-[var(--inspector-tab-active-border)] font-bold shadow-[inset_1px_1px_0_rgba(255,255,255,0.15),0_1px_0_var(--btn-shadow)]'
              : 'pixel-tactile-btn border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--text-heading)]'
          }`}
        >
          <PixelIcon name="layers" size={11} className="shrink-0" />
          <span className="truncate">Layers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveInspectorTab('palette')}
          aria-label="Palette"
          data-testid="tab-palette"
          aria-pressed={activeInspectorTab === 'palette'}
          title="Color Palette"
          className={`flex-1 min-w-0 h-7 flex items-center justify-center gap-1 text-[11px] font-sans rounded-[2px] border px-1 overflow-hidden transition-all duration-100 ${
            activeInspectorTab === 'palette'
              ? 'bg-[var(--inspector-tab-active-bg)] text-[var(--inspector-tab-active-fg)] border-[var(--inspector-tab-active-border)] font-bold shadow-[inset_1px_1px_0_rgba(255,255,255,0.15),0_1px_0_var(--btn-shadow)]'
              : 'pixel-tactile-btn border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--text-heading)]'
          }`}
        >
          <PixelIcon name="palette" size={11} className="shrink-0" />
          <span className="truncate">Palette</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveInspectorTab('ai')}
          aria-label="PixiTools"
          data-testid="tab-ai"
          aria-pressed={activeInspectorTab === 'ai'}
          title="PixiTools (AI & FX)"
          className={`flex-1 min-w-0 h-7 flex items-center justify-center gap-1 text-[11px] font-sans rounded-[2px] border px-1 overflow-hidden transition-all duration-100 ${
            activeInspectorTab === 'ai'
              ? 'bg-[var(--inspector-tab-active-bg)] text-[var(--inspector-tab-active-fg)] border-[var(--inspector-tab-active-border)] font-bold shadow-[inset_1px_1px_0_rgba(255,255,255,0.15),0_1px_0_var(--btn-shadow)]'
              : 'pixel-tactile-btn border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--text-heading)]'
          }`}
        >
          <PixelIcon name="chisel" size={11} className="shrink-0" />
          <span className="truncate">FX</span>
        </button>
      </div>

      {/* Main Content Area: Dedicated Panels per Tab */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {layout.color && activeInspectorTab !== 'palette' && !motionPart && <PinnedColorPanel />}
        {motionPart ? (
          <PixiMotionPanel />
        ) : (
          <>
            {activeInspectorTab === 'tools' && <><MotionRigLibrary /><ToolSettingsPanel /></>}
            {activeInspectorTab === 'layers' && <LayersPanel />}
            {activeInspectorTab === 'palette' && <PalettePanel />}
            {activeInspectorTab === 'ai' && <AiToolsPanel />}
          </>
        )}
      </div>
      {layout.navigator && <NavigatorPanel />}
    </aside>
  );
};
