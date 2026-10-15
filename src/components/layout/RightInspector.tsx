'use client';

import React from 'react';
import { lazyPanel } from '@/components/system/lazyPanel';
import { useStudioStore } from '@/stores/studioStore';
import { PixelIcon, type PixelIconName } from '@/components/ui/PixelIcon';
import { CANONICAL_TOOLS } from '@/config/shortcuts';
import { LayersPanel } from './inspector/LayersPanel';
import { PalettePanel } from './inspector/PalettePanel';
import { ToolSettingsPanel } from './inspector/ToolSettingsPanel';
import { NavigatorPanel } from './inspector/NavigatorPanel';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { PinnedColorPanel } from '@/components/ui/ArtistColorPicker';

import { PixiMotionPanel } from './inspector/PixiMotionPanel';
import { MotionRigLibrary } from './inspector/MotionRigLibrary';
import { useLab } from '@/experimental/labsStore';
import { PaintPotPalette } from '@/experimental/palette/PaintPotPalette';
import { LiquidTabs } from '@/experimental/liquid/LiquidTabs';

const AiToolsPanel = lazyPanel(
  () => import('./inspector/AiToolsPanel').then((m) => m.AiToolsPanel),
  'PixiTools', 'inline'
);

type InspectorTab = 'tools' | 'layers' | 'palette' | 'ai';

const TABS: { id: InspectorTab; label: string; ariaLabel: string; title: string; icon: PixelIconName }[] = [
  { id: 'tools', label: 'Tools', ariaLabel: 'Tools', title: 'Settings for the active tool', icon: 'pen' },
  { id: 'layers', label: 'Layers', ariaLabel: 'Layers', title: 'Layers in this frame', icon: 'layers' },
  { id: 'palette', label: 'Palette', ariaLabel: 'Palette', title: 'Color picker and palette', icon: 'palette' },
  { id: 'ai', label: 'Effects', ariaLabel: 'Effects (PixiTools)', title: 'PixiTools: lighting, tiles, cleanup and animation review', icon: 'lamp' },
];

export const RightInspector: React.FC = () => {
  const activeInspectorTab = useStudioStore((s) => s.activeInspectorTab);
  const setActiveInspectorTab = useStudioStore((s) => s.setActiveInspectorTab);
  const motionPart = useStudioStore((s) => s.motionPart);
  const layout = useWorkspaceStore(s => s.layout);
  const primaryColor = useStudioStore((s) => s.primaryColor);
  const layerCount = useStudioStore((s) => s.frames[s.activeFrameIndex]?.layers.length ?? 0);
  const paintPot = useLab('paletteStudio');
  const activeToolIcon = useStudioStore((s) => CANONICAL_TOOLS.find((tool) => tool.id === s.tools.activeTool)?.icon ?? 'pen');
  const liquidTabs = useLab('liquidTabs');

  const tabInner = (tab: (typeof TABS)[number]) => (
    <>
      {tab.id === 'palette' ? (
        <span aria-hidden="true" className="w-2.5 h-2.5 shrink-0 rounded-[2px] border border-current" style={{ backgroundColor: primaryColor }} />
      ) : (
        <PixelIcon name={tab.id === 'tools' ? activeToolIcon : tab.icon} size={11} className="shrink-0" />
      )}
      <span className="truncate">{tab.label}</span>
      {tab.id === 'layers' && layerCount > 1 && (
        <span aria-hidden="true" className="shrink-0 min-w-[14px] h-[14px] px-0.5 rounded-full bg-current/15 text-[9px] leading-[14px] font-mono font-bold text-center">{layerCount}</span>
      )}
    </>
  );

  return (
    <aside
      data-testid="right-inspector"
      style={{ width: layout.inspectorWidth }}
      className="h-full border-x shrink-0 bg-[var(--desk-surface)] border-[var(--desk-border)] flex flex-col justify-between select-none z-10 text-[var(--text-heading)]"
    >
      {/* Tab bar: each tab carries a live hint of what is inside it */}
      {liquidTabs ? (
        <LiquidTabs tabs={TABS} active={activeInspectorTab} onSelect={setActiveInspectorTab} renderTab={tabInner} />
      ) : (
      <div role="group" aria-label="Inspector sections" className="flex bg-[var(--desk-surface)] border-b border-[var(--desk-border)] h-9 p-1 gap-1">
        {TABS.map((tab) => {
          const active = activeInspectorTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveInspectorTab(tab.id)}
              aria-label={tab.ariaLabel}
              data-testid={`tab-${tab.id}`}
              aria-pressed={active}
              title={tab.title}
              className={`flex-auto min-w-0 h-7 flex items-center justify-center gap-1 text-[11px] whitespace-nowrap font-sans rounded-[2px] border px-1 overflow-hidden transition-all duration-100 ${
                active
                  ? 'bg-[var(--inspector-tab-active-bg)] text-[var(--inspector-tab-active-fg)] border-[var(--inspector-tab-active-border)] font-bold shadow-[inset_1px_1px_0_rgba(255,255,255,0.15),0_1px_0_var(--btn-shadow)]'
                  : 'pixel-tactile-btn border-[var(--desk-border)] text-[var(--text-muted)] hover:text-[var(--text-heading)]'
              }`}
            >
              {tabInner(tab)}
            </button>
          );
        })}
      </div>
      )}

      {/* Main Content Area: Dedicated Panels per Tab */}
      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
        {layout.color && activeInspectorTab !== 'palette' && !motionPart && <PinnedColorPanel />}
        {motionPart ? (
          <PixiMotionPanel />
        ) : (
          <>
            {activeInspectorTab === 'tools' && <><MotionRigLibrary /><ToolSettingsPanel /></>}
            {activeInspectorTab === 'layers' && <LayersPanel />}
            {activeInspectorTab === 'palette' && (paintPot ? <PaintPotPalette /> : <PalettePanel />)}
            {activeInspectorTab === 'ai' && <AiToolsPanel />}
          </>
        )}
      </div>
      {layout.navigator && <NavigatorPanel />}
    </aside>
  );
};
