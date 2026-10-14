'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CozyScrollReveal, PixelCorners } from './CozyScrollReveal';
import { CardGoldenChains } from './CardGoldenChains';
import { SceneBackdrop } from './night/SceneBackdrop';
import { NIGHT_VARS } from './night/nightPalette';
import { PhotometricShowcase } from './showcase/PhotometricShowcase';
import { RotSpriteShowcase } from './showcase/RotSpriteShowcase';
import { PixelizeShowcase } from './showcase/PixelizeShowcase';
import { EngineExportShowcase } from './showcase/EngineExportShowcase';

const IconLighting: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
    <path d="M6 1h4v2H6V1zM4 3h8v2H4V3zm-1 2h10v3H3V5zm2 3h6v2H5V8zm1 2h4v1H6v-1zm1 1h2v3H7v-3z" />
  </svg>
);

const IconRotate: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
    <path d="M6 1v2H3v3h2v2H1V3h2V1h3zm4 14v-2h3v-3h-2V8h4v5h-2v2h-3zm3-10h-2V3h-2V1h2v2h2v2zM3 11h2v2h2v2H5v-2H3v-2z" />
  </svg>
);

const IconSynthesis: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
    <path d="M2 2h4v4H2V2zm8 0h4v4h-4V2zM2 10h4v4H2v-4zm8 0h4v4h-4v-4zm-2-4h2v2H8V6zm-2 2h2v2H6V8zm4 0h2v2h-2V8zm-2 2h2v2H8v-2z" />
  </svg>
);

const IconExport: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
    <path d="M2 4h12v8H2V4zm2 2v4h8V6H4zm1 1h2v1H5V7zm0 1h1v1H5V8zm4-1h2v2H9V7z" />
  </svg>
);

const SHOWCASE_TABS = [
  { id: 'photometric', number: '01', icon: IconLighting, title: 'Light & shadow', color: '#ffd285' },
  { id: 'rotsprite', number: '02', icon: IconRotate, title: 'Smooth rotation', color: '#dcabdf' },
  { id: 'pixelize', number: '03', icon: IconSynthesis, title: 'Photo to pixels', color: '#a8e092' },
  { id: 'export', number: '04', icon: IconExport, title: 'Into your game', color: '#f2b8c6' },
] as const;

type TabId = (typeof SHOWCASE_TABS)[number]['id'];

const renderActiveShowcase = (tabId: TabId) => {
  switch (tabId) {
    case 'rotsprite':
      return <RotSpriteShowcase />;
    case 'pixelize':
      return <PixelizeShowcase />;
    case 'export':
      return <EngineExportShowcase />;
    default:
      return <PhotometricShowcase />;
  }
};

export const AtelierEngineShowcase: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState<TabId>('photometric');
  const activeIndex = SHOWCASE_TABS.findIndex((t) => t.id === activeTabId);
  const activeTab = SHOWCASE_TABS[activeIndex] ?? SHOWCASE_TABS[0];
  const step = (by: number) => setActiveTabId(SHOWCASE_TABS[(activeIndex + by + SHOWCASE_TABS.length) % SHOWCASE_TABS.length].id);

  return (
    <section
      id="engine-showcase"
      className="relative py-28 sm:py-32 overflow-hidden scroll-mt-14 bg-[#1c1424] text-[var(--text-heading)]"
      style={NIGHT_VARS}
    >
      <SceneBackdrop scene="workbench" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#20152b] to-transparent pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 sm:px-8">
        <CozyScrollReveal variant="fade-up">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--accent-gold)]">the workbench</p>
            <h2 className="mt-4 font-display text-3xl sm:text-5xl leading-[1.05] text-[var(--text-heading)] [text-shadow:0_4px_0_#0b0714]">
              Try the real tools.
            </h2>
            <p className="mt-5 text-base sm:text-lg leading-relaxed text-[var(--text-body)]">
              Little demos running the same code as the studio. Go on, poke at them.
            </p>
          </div>
        </CozyScrollReveal>

        {/* Tool tags hanging off the pegboard */}
        <CozyScrollReveal variant="fade-up" delayMs={60}>
          <div
            className="flex flex-wrap items-end justify-center gap-3 mb-8"
            role="tablist"
            aria-label="What the Desk can do"
          >
            {SHOWCASE_TABS.map((tab, i) => {
              const isActive = tab.id === activeTabId;
              const TabIcon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setActiveTabId(tab.id)}
                  animate={{ y: isActive ? -6 : 0, rotate: isActive ? 0 : i % 2 ? 1.5 : -1.5 }}
                  whileHover={{ y: isActive ? -6 : -3, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className={`relative flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-[2px] border-2 font-mono text-xs font-bold select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c] ${
                    isActive
                      ? 'bg-[#fff3e0] text-[#2a1945] border-[#0b0714] shadow-[0_5px_0_#0b0714]'
                      : 'bg-[#2a1945]/90 text-[var(--text-body)] border-[#46306a] shadow-[0_3px_0_#0b0714] hover:text-[var(--text-heading)]'
                  }`}
                >
                  {/* the string the tag hangs from */}
                  <span aria-hidden="true" className="absolute -top-3 left-1/2 w-px h-3 bg-[#5d4486]" />
                  <span
                    aria-hidden="true"
                    className="grid place-items-center w-6 h-6 rounded-[2px]"
                    style={{ backgroundColor: isActive ? tab.color : '#1d1336', color: isActive ? '#2a1945' : tab.color }}
                  >
                    <TabIcon />
                  </span>
                  <span>{tab.title}</span>
                  <span className={`text-[10px] ${isActive ? 'text-[#7a5a8a]' : 'text-[var(--text-muted)]'}`}>{tab.number}</span>
                </motion.button>
              );
            })}
          </div>
        </CozyScrollReveal>

        <CozyScrollReveal variant="fade-up" delayMs={100}>
          <div
            role="tabpanel"
            id={`panel-${activeTab.id}`}
            aria-labelledby={`tab-${activeTab.id}`}
            className="relative rounded-[2px] border-2 border-[#46306a] bg-[#1d1336]/92 backdrop-blur-sm px-6 sm:px-12 pt-10 pb-8 shadow-[0_10px_0_#0b0714,0_30px_60px_rgba(0,0,0,0.45)]"
          >
            <PixelCorners />
            <CardGoldenChains />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                {renderActiveShowcase(activeTab.id)}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 pt-5 border-t border-[#46306a]/70 flex items-center justify-between gap-4 font-mono text-[11px] text-[var(--text-muted)]">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {SHOWCASE_TABS.map((tab) => (
                  <span
                    key={tab.id}
                    className="h-1.5 rounded-[1px] transition-all duration-300"
                    style={{ width: tab.id === activeTab.id ? 28 : 8, backgroundColor: tab.id === activeTab.id ? tab.color : '#46306a' }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => step(-1)}
                  aria-label="Previous feature"
                  className="px-3 py-1.5 rounded-[2px] border border-[#46306a] bg-[#2a1945] text-[var(--text-heading)] hover:border-[var(--accent-gold)] transition-colors active:translate-y-px"
                >
                  ← prev
                </button>
                <span>
                  {activeIndex + 1} / {SHOWCASE_TABS.length}
                </span>
                <button
                  onClick={() => step(1)}
                  aria-label="Next feature"
                  className="px-3 py-1.5 rounded-[2px] border border-[#46306a] bg-[#2a1945] text-[var(--text-heading)] hover:border-[var(--accent-gold)] transition-colors active:translate-y-px"
                >
                  next →
                </button>
              </div>
            </div>
          </div>
        </CozyScrollReveal>
      </div>
    </section>
  );
};
