'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CozyScrollReveal, PixelCorners } from './CozyScrollReveal';
import { CardGoldenChains } from './CardGoldenChains';
import { ShinyText } from '@/components/reactbits/ShinyText';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';

import { PhotometricShowcase } from './showcase/PhotometricShowcase';
import { RotSpriteShowcase } from './showcase/RotSpriteShowcase';
import { PixelizeShowcase } from './showcase/PixelizeShowcase';
import { EngineExportShowcase } from './showcase/EngineExportShowcase';

const IconLighting: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
    <path d="M6 1h4v2H6V1zM4 3h8v2H4V3zm-1 2h10v3H3V5zm2 3h6v2H5V8zm1 2h4v1H6v-1zm1 1h2v3H7v-3z" />
  </svg>
);

const IconRotate: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
    <path d="M6 1v2H3v3h2v2H1V3h2V1h3zm4 14v-2h3v-3h-2V8h4v5h-2v2h-3zm3-10h-2V3h-2V1h2v2h2v2zM3 11h2v2h2v2H5v-2H3v-2z" />
  </svg>
);

const IconSynthesis: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
    <path d="M2 2h4v4H2V2zm8 0h4v4h-4V2zM2 10h4v4H2v-4zm8 0h4v4h-4v-4zm-2-4h2v2H8V6zm-2 2h2v2H6V8zm4 0h2v2h-2V8zm-2 2h2v2H8v-2z" />
  </svg>
);

const IconExport: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
    <path d="M2 4h12v8H2V4zm2 2v4h8V6H4zm1 1h2v1H5V7zm0 1h1v1H5V8zm4-1h2v2H9V7z" />
  </svg>
);

interface ShowcaseTab {
  id: string;
  number: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge: string;
}

const SHOWCASE_TABS: ShowcaseTab[] = [
  {
    id: 'photometric',
    number: '01',
    icon: IconLighting,
    title: '2.5D Lighting & Shadows',
    badge: 'Blinn-Phong & Cast Ray',
  },
  {
    id: 'rotsprite',
    number: '02',
    icon: IconRotate,
    title: 'RotSprite Precision',
    badge: 'Xenowhirl 8x Subpixel',
  },
  {
    id: 'pixelize',
    number: '03',
    icon: IconSynthesis,
    title: 'Image Synthesis',
    badge: 'Color & Edge Choices',
  },
  {
    id: 'export',
    number: '04',
    icon: IconExport,
    title: 'Game Engine Exports',
    badge: 'Godot 4, Unity & Phaser 3',
  },
];

const renderActiveShowcase = (tabId: string) => {
  switch (tabId) {
    case 'photometric':
      return <PhotometricShowcase />;
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
  const [activeTabId, setActiveTabId] = useState<string>('photometric');

  const activeIndex = SHOWCASE_TABS.findIndex((t) => t.id === activeTabId);
  const activeTab = SHOWCASE_TABS[activeIndex] || SHOWCASE_TABS[0];

  const handlePrev = () => {
    const nextIdx = (activeIndex - 1 + SHOWCASE_TABS.length) % SHOWCASE_TABS.length;
    setActiveTabId(SHOWCASE_TABS[nextIdx].id);
  };

  const handleNext = () => {
    const nextIdx = (activeIndex + 1) % SHOWCASE_TABS.length;
    setActiveTabId(SHOWCASE_TABS[nextIdx].id);
  };

  return (
    <section
      id="engine-showcase"
      className="relative py-24 bg-[var(--desk-surface)]/90 border-t-2 border-b-2 border-[var(--desk-border)] overflow-hidden scroll-mt-14"
    >
      <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <CozyScrollReveal variant="fade-up">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[2px] pixel-box-frame text-[var(--accent-plum)] font-display font-bold text-xs uppercase tracking-wider mb-4 shadow-sm">
              <span className="text-[var(--accent-gold)] text-xs font-mono animate-gold-pulse inline-block">✦</span>
              <ShinyText text="INTERACTIVE GRAPHICS BENCHMARK" speed={2.6} />
              <span className="text-[var(--accent-gold)] text-xs font-mono animate-gold-pulse inline-block">✦</span>
            </div>

            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[var(--text-heading)] drop-shadow-sm tracking-tight">
              A REAL COMPUTER GRAPHICS ATELIER IN YOUR BROWSER
            </h2>

            <p className="mt-4 text-sm sm:text-base font-sans text-[var(--text-body)] leading-relaxed">
              PixiBun is not a simplistic 16-color doodle pad. It is an offline-first pixel art studio
              powered by mathematically rigorous 2.5D photometric lighting, subpixel RotSprite rotation,
              physical shadow cone-tracing, and game-engine exports. Click below to test every system live.
            </p>
          </div>
        </CozyScrollReveal>

        {/* 4-Tab Smooth Animated Selector Bar */}
        <CozyScrollReveal variant="fade-up" delayMs={60}>
          <div className="w-full overflow-x-auto pb-3 mb-8 scrollbar-thin">
            <div
              className="flex items-center justify-start lg:justify-center gap-2 min-w-max p-1 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] shadow-sm relative"
              role="tablist"
              aria-label="Atelier Engine Features"
            >
              {SHOWCASE_TABS.map((tab) => {
                const isActive = tab.id === activeTabId;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls={`panel-${tab.id}`}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-[2px] font-mono text-xs select-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c] ${
                      isActive
                        ? 'text-[#140d1f] font-bold'
                        : 'text-[var(--text-body)] hover:text-[var(--text-heading)] hover:bg-[var(--desk-surface)]/60'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeEngineShowcaseTab"
                        className="absolute inset-0 bg-[var(--accent-gold)] rounded-[2px] shadow-sm z-0"
                        transition={{ type: 'spring', stiffness: 440, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center">
                      <TabIcon className={isActive ? 'text-[#140d1f]' : 'text-[var(--accent-gold)]'} />
                    </span>
                    <span className="relative z-10 font-display text-xs tracking-wide">{tab.title}</span>
                    <span
                      className={`relative z-10 text-[9px] px-1.5 py-0.5 rounded-[1px] transition-colors ${
                        isActive
                          ? 'bg-[#140d1f]/20 text-[#140d1f]'
                          : 'bg-[var(--desk-surface)] border border-[var(--desk-border)] text-[var(--text-muted)]'
                      }`}
                    >
                      {tab.number}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </CozyScrollReveal>

        {/* Active Tab Interactive Stage Card */}
        <CozyScrollReveal variant="fade-up" delayMs={100}>
          <SpotlightCard
            spotlightColor="rgba(240, 190, 124, 0.12)"
            className="rounded-[2px] w-full"
          >
            <div
              role="tabpanel"
              id={`panel-${activeTab.id}`}
              aria-labelledby={`tab-${activeTab.id}`}
              className="bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] p-6 sm:p-8 relative shadow-md transition-all duration-300"
            >
              {/* 16-Bit Corner Brackets & Golden Chains */}
              <PixelCorners />
              <CardGoldenChains />

              {/* Active Tab Top Status Ribbon */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--desk-border)] mb-6 text-xs font-mono text-[var(--text-muted)]">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--accent-gold)] font-bold">{activeTab.number} /</span>
                  <span className="text-[var(--text-heading)] uppercase font-bold tracking-wider">
                    {activeTab.title}
                  </span>
                  <span className="px-2 py-0.5 rounded-[1px] bg-[var(--desk-surface)] border border-[var(--desk-border)] text-[10px] text-[var(--accent-plum)]">
                    {activeTab.badge}
                  </span>
                </div>

                {/* Quick Prev / Next Navigator Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrev}
                    aria-label="Previous feature"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-[1px] bg-[var(--desk-surface)] border border-[var(--desk-border)] hover:border-[var(--accent-gold)] text-[var(--text-heading)] transition-colors text-xs font-mono font-bold active:translate-y-[1px]"
                  >
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path d="M10 2L4 8l6 6V2z" />
                    </svg>
                    <span>Prev</span>
                  </button>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] px-1">
                    {activeIndex + 1} / {SHOWCASE_TABS.length}
                  </span>
                  <button
                    onClick={handleNext}
                    aria-label="Next feature"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-[1px] bg-[var(--desk-surface)] border border-[var(--desk-border)] hover:border-[var(--accent-gold)] text-[var(--text-heading)] transition-colors text-xs font-mono font-bold active:translate-y-[1px]"
                  >
                    <span>Next</span>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path d="M6 2l6 6-6 6V2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Animated Tab Content Component */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  {renderActiveShowcase(activeTab.id)}
                </motion.div>
              </AnimatePresence>
            </div>
          </SpotlightCard>
        </CozyScrollReveal>

        {/* Engine Philosophy Banner */}
        <div className="mt-8 text-center text-xs font-mono text-[var(--text-muted)] flex items-center justify-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="text-[var(--accent-gold)] text-xs">✦</span>
            <span>Offline after your first online load</span>
          </span>
          <span className="text-[var(--desk-border)]">•</span>
          <span className="flex items-center gap-1.5">
            <span className="text-[var(--accent-plum)] text-xs">✦</span>
            <span>Creative tools run on your device</span>
          </span>
          <span className="text-[var(--desk-border)]">•</span>
          <span className="flex items-center gap-1.5">
            <span className="text-[var(--accent-gold)] text-xs">✦</span>
            <span>Zero Generative Hallucinations</span>
          </span>
        </div>
      </div>
    </section>
  );
};
