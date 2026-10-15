'use client';

import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CozyScrollReveal } from './CozyScrollReveal';
import { SceneBackdrop } from './night/SceneBackdrop';
import { PhotometricShowcase } from './showcase/PhotometricShowcase';
import { RotSpriteShowcase } from './showcase/RotSpriteShowcase';
import { PixelizeShowcase } from './showcase/PixelizeShowcase';
import { EngineExportShowcase } from './showcase/EngineExportShowcase';
import { QuestProvider } from './showcase/quests';

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
  { id: 'photometric', number: '01', icon: IconLighting, title: 'Light & shadow', blurb: 'Shade a sprite with a lamp you can drag', color: 'var(--primary-bg)' },
  { id: 'rotsprite', number: '02', icon: IconRotate, title: 'Smooth rotation', blurb: 'Turn pixel art without jaggy edges', color: 'var(--accent-plum)' },
  { id: 'pixelize', number: '03', icon: IconSynthesis, title: 'Photo to pixels', blurb: 'Turn any picture into pixel art', color: 'var(--accent-sage)' },
  { id: 'export', number: '04', icon: IconExport, title: 'Into your game', blurb: 'Export for Godot, Unity, Phaser or GIF', color: 'var(--accent-wisteria)' },
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

const NO_QUESTS: ReadonlySet<number> = new Set();

/**
 * The workbench: four live demos on a stitched mat. Each tool card says in a
 * line what the tool is for, and each demo carries a "try this" list that
 * ticks itself off as the visitor plays, so newcomers always know what to
 * press next and can see that it worked.
 */
export const AtelierEngineShowcase: React.FC = () => {
  const reduceMotion = Boolean(useReducedMotion());
  const [activeTabId, setActiveTabId] = useState<TabId>('photometric');
  const [direction, setDirection] = useState(1);
  // What the visitor has tried on each demo, kept while they flip between demos.
  const [quests, setQuests] = useState<Partial<Record<TabId, ReadonlySet<number>>>>({});
  const activeIndex = SHOWCASE_TABS.findIndex((t) => t.id === activeTabId);
  const activeTab = SHOWCASE_TABS[activeIndex] ?? SHOWCASE_TABS[0];
  const go = (index: number) => {
    const next = (index + SHOWCASE_TABS.length) % SHOWCASE_TABS.length;
    if (next === activeIndex) return;
    const forward = (next - activeIndex + SHOWCASE_TABS.length) % SHOWCASE_TABS.length <= SHOWCASE_TABS.length / 2;
    setDirection(forward ? 1 : -1);
    setActiveTabId(SHOWCASE_TABS[next].id);
  };
  const completeQuest = useCallback(
    (index: number) =>
      setQuests((all) => {
        const done = all[activeTabId] ?? NO_QUESTS;
        if (done.has(index)) return all;
        return { ...all, [activeTabId]: new Set([...done, index]) };
      }),
    [activeTabId]
  );
  const prevTab = SHOWCASE_TABS[(activeIndex + SHOWCASE_TABS.length - 1) % SHOWCASE_TABS.length];
  const nextTab = SHOWCASE_TABS[(activeIndex + 1) % SHOWCASE_TABS.length];

  return (
    <section
      id="engine-showcase"
      className="workbench-section relative py-10 lg:py-8 overflow-hidden scroll-mt-0 bg-[var(--surface-0)] text-[var(--text-heading)]"
    >
      <SceneBackdrop scene="workbench" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--desk-bg)] to-transparent pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <CozyScrollReveal variant="fade-up">
          <div className="text-center max-w-2xl mx-auto mb-5">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--accent-gold)]">the workbench</p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl leading-[1.05] text-[var(--text-heading)] [text-shadow:0_4px_0_var(--ink)]">
              Try the real tools.
            </h2>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-[var(--text-body)]">
              Four little demos running the very same code as the Studio. Every button here works, so go on, poke at them.
            </p>
          </div>
        </CozyScrollReveal>

        {/* The tool rack: pick a demo. */}
        <CozyScrollReveal variant="fade-up" delayMs={60}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4" role="tablist" aria-label="What the Desk can do">
            {SHOWCASE_TABS.map((tab, i) => {
              const isActive = tab.id === activeTabId;
              const TabIcon = tab.icon;
              const tried = quests[tab.id]?.size ?? 0;
              return (
                <motion.button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => go(i)}
                  onKeyDown={(event) => {
                    const next = event.key === 'ArrowRight' ? (i + 1) % SHOWCASE_TABS.length
                      : event.key === 'ArrowLeft' ? (i + SHOWCASE_TABS.length - 1) % SHOWCASE_TABS.length
                      : event.key === 'Home' ? 0 : event.key === 'End' ? SHOWCASE_TABS.length - 1 : -1;
                    if (next < 0) return;
                    event.preventDefault();
                    go(next);
                    document.getElementById('tab-' + SHOWCASE_TABS[next].id)?.focus();
                  }}
                  animate={{ y: isActive ? -4 : 0 }}
                  whileHover={reduceMotion ? undefined : { y: isActive ? -4 : -2 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                  className={`relative text-left flex items-start gap-3 px-3 py-2.5 rounded-[4px] border-2 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] transition-colors ${
                    isActive
                      ? 'bg-[var(--primary-bg)] text-[var(--primary-fg)] border-[var(--ink)] shadow-[0_5px_0_var(--ink)]'
                      : 'bg-[color-mix(in_srgb,var(--desk-surface-raised)_88%,transparent)] text-[var(--text-body)] border-[var(--desk-border)] shadow-[0_3px_0_var(--ink)] hover:border-[var(--desk-border-highlight)] hover:text-[var(--text-heading)]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 grid place-items-center w-7 h-7 sm:w-8 sm:h-8 rounded-[3px] border-2 border-[var(--ink)]"
                    style={{ backgroundColor: isActive ? 'var(--primary-fg)' : tab.color, color: isActive ? tab.color : 'var(--primary-fg)' }}
                  >
                    <TabIcon />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-2 font-mono text-xs font-bold leading-tight">
                      <span>{tab.title}</span>
                      <span className={`hidden sm:inline text-[10px] ${isActive ? 'opacity-70' : 'text-[var(--text-muted)]'}`}>{tab.number}</span>
                    </span>
                    <span className={`mt-0.5 hidden sm:block text-[11px] leading-snug ${isActive ? 'opacity-80' : 'text-[var(--text-muted)]'}`}>{tab.blurb}</span>
                  </span>
                  {tried > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-[2px] border-2 border-[var(--ink)] bg-[var(--accent-sage)] font-mono text-[9px] font-bold text-[var(--primary-fg)]"
                    >
                      {tried}/3
                    </span>
                  )}
                  {/* A notch points from the chosen card down at its demo */}
                  {isActive && (
                    <motion.span
                      layoutId="workbench-notch"
                      aria-hidden="true"
                      className="hidden lg:block absolute left-1/2 -bottom-[13px] -ml-[7px] w-3.5 h-3.5 rotate-45 bg-[var(--primary-bg)] border-r-2 border-b-2 border-[var(--ink)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
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
            className="workbench-mat workbench-panel relative rounded-[6px] border-2 border-[var(--ink)] px-4 sm:px-7 pt-5 pb-4 shadow-[0_10px_0_var(--ink),0_30px_60px_var(--shadow-far)]"
          >
            <p className="relative mb-3 inline-flex items-center gap-2 px-2 py-1 rounded-[2px] bg-[var(--surface-0)] border border-[var(--desk-border)] font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[var(--accent-sage)] animate-pulse" />
              live demo · same engine as the studio
            </p>

            <div className="relative">
              <QuestProvider done={quests[activeTabId] ?? NO_QUESTS} onComplete={completeQuest}>
                <AnimatePresence mode="wait" initial={false} custom={direction}>
                  <motion.div
                    key={activeTab.id}
                    custom={direction}
                    variants={{
                      enter: (d: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: d * 36, filter: 'blur(4px)' }),
                      center: { opacity: 1, x: 0, filter: 'blur(0px)' },
                      exit: (d: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: d * -36, filter: 'blur(4px)' }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {renderActiveShowcase(activeTab.id)}
                  </motion.div>
                </AnimatePresence>
              </QuestProvider>
            </div>

            <div className="relative mt-4 pt-3 border-t-2 border-dashed border-[color-mix(in_srgb,var(--desk-border)_80%,transparent)] flex items-center justify-between gap-3 font-mono text-[11px] text-[var(--text-muted)]">
              <button
                onClick={() => go(activeIndex - 1)}
                aria-label="Previous feature"
                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-[2px] border-2 border-[var(--desk-border)] bg-[var(--desk-surface-raised)] text-[var(--text-heading)] hover:border-[var(--accent-gold)] transition-colors active:translate-y-px"
              >
                <span aria-hidden="true" className="transition-transform group-hover:-translate-x-0.5">←</span>
                <span className="hidden sm:inline">{prevTab.title}</span>
                <span className="sm:hidden">prev</span>
              </button>
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {SHOWCASE_TABS.map((tab) => (
                  <span
                    key={tab.id}
                    className="h-1.5 rounded-[1px] transition-all duration-300"
                    style={{ width: tab.id === activeTab.id ? 28 : 8, backgroundColor: tab.id === activeTab.id ? tab.color : 'var(--desk-border)' }}
                  />
                ))}
                <span className="ml-2 tabular-nums">
                  {activeIndex + 1} / {SHOWCASE_TABS.length}
                </span>
              </div>
              <button
                onClick={() => go(activeIndex + 1)}
                aria-label="Next feature"
                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-[2px] border-2 border-[var(--desk-border)] bg-[var(--desk-surface-raised)] text-[var(--text-heading)] hover:border-[var(--accent-gold)] transition-colors active:translate-y-px"
              >
                <span className="hidden sm:inline">{nextTab.title}</span>
                <span className="sm:hidden">next</span>
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
              </button>
            </div>
          </div>
        </CozyScrollReveal>
      </div>
    </section>
  );
};
