'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CozyScrollReveal, PixelCorners } from './CozyScrollReveal';
import { CardGoldenChains } from './CardGoldenChains';
import { ShinyText } from '@/components/reactbits/ShinyText';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';

import dynamic from 'next/dynamic';

const ShowcaseSkeleton: React.FC = () => (
  <div className="w-full h-80 flex flex-col items-center justify-center gap-3 p-8">
    <div className="w-6 h-6 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
    <span className="font-mono text-xs text-[var(--text-muted)] animate-pulse">
      Assembling atelier laboratory...
    </span>
  </div>
);

const PhotometricShowcase = dynamic(
  () => import('./showcase/PhotometricShowcase').then((m) => m.PhotometricShowcase),
  { ssr: false, loading: () => <ShowcaseSkeleton /> }
);
const RotSpriteShowcase = dynamic(
  () => import('./showcase/RotSpriteShowcase').then((m) => m.RotSpriteShowcase),
  { ssr: false, loading: () => <ShowcaseSkeleton /> }
);
const PixelizeShowcase = dynamic(
  () => import('./showcase/PixelizeShowcase').then((m) => m.PixelizeShowcase),
  { ssr: false, loading: () => <ShowcaseSkeleton /> }
);
const EngineExportShowcase = dynamic(
  () => import('./showcase/EngineExportShowcase').then((m) => m.EngineExportShowcase),
  { ssr: false, loading: () => <ShowcaseSkeleton /> }
);

interface ShowcaseTab {
  id: string;
  number: string;
  icon: string;
  title: string;
  badge: string;
}

const SHOWCASE_TABS: ShowcaseTab[] = [
  {
    id: 'photometric',
    number: '01',
    icon: '💡',
    title: '2.5D Lighting & Shadows',
    badge: 'Blinn-Phong & Cast Ray',
  },
  {
    id: 'rotsprite',
    number: '02',
    icon: '🔄',
    title: 'RotSprite Precision',
    badge: 'Xenowhirl 8x Subpixel',
  },
  {
    id: 'pixelize',
    number: '03',
    icon: '✨',
    title: 'Image Synthesis',
    badge: 'Sobel & OKLab Clustering',
  },
  {
    id: 'export',
    number: '04',
    icon: '🎮',
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
              <ShinyText text="WHAT WE HAS: DEEP GRAPHICS ENGINE" speed={2.6} />
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

        {/* 8-Tab Selector Bar */}
        <CozyScrollReveal variant="fade-up" delayMs={60}>
          <div className="w-full overflow-x-auto pb-3 mb-8 scrollbar-thin">
            <div
              className="flex items-center justify-start lg:justify-center gap-2 min-w-max p-1 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] shadow-sm"
              role="tablist"
              aria-label="Atelier Engine Features"
            >
              {SHOWCASE_TABS.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls={`panel-${tab.id}`}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-[2px] font-mono text-xs transition-all select-none ${
                      isActive
                        ? 'bg-[var(--accent-gold)] text-[#140d1f] font-bold shadow-md scale-[1.02]'
                        : 'text-[var(--text-body)] hover:text-[var(--text-heading)] hover:bg-[var(--desk-surface)]'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span className="font-display text-xs">{tab.title}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-[1px] ${
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
                    className="px-2 py-1 rounded-[1px] bg-[var(--desk-surface)] border border-[var(--desk-border)] hover:border-[var(--accent-gold)] text-[var(--text-heading)] transition-colors text-xs font-bold"
                  >
                    ◀ Prev
                  </button>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {activeIndex + 1} / {SHOWCASE_TABS.length}
                  </span>
                  <button
                    onClick={handleNext}
                    aria-label="Next feature"
                    className="px-2 py-1 rounded-[1px] bg-[var(--desk-surface)] border border-[var(--desk-border)] hover:border-[var(--accent-gold)] text-[var(--text-heading)] transition-colors text-xs font-bold"
                  >
                    Next ▶
                  </button>
                </div>
              </div>

              {/* Animated Tab Content Component */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
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
            <span className="text-[var(--accent-gold)]">✦</span>
            <span>100% Offline in Browser</span>
          </span>
          <span className="text-[var(--desk-border)]">•</span>
          <span className="flex items-center gap-1.5">
            <span className="text-[var(--accent-plum)]">✦</span>
            <span>Deterministic Math &amp; Zero Cloud Lag</span>
          </span>
          <span className="text-[var(--desk-border)]">•</span>
          <span className="flex items-center gap-1.5">
            <span className="text-[var(--accent-gold)]">✦</span>
            <span>Zero Generative Hallucinations</span>
          </span>
        </div>
      </div>
    </section>
  );
};
