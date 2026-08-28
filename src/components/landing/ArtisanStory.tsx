'use client';

import React from 'react';
import {
  IconCushionCat,
  IconCozyHearth,
} from './AtelierIcons';
import { CozyScrollReveal, PixelCorners } from './CozyScrollReveal';
import { PixelGoldenAccents } from './PixelGoldenAccents';
import { ShinyText } from '@/components/reactbits/ShinyText';

export const ArtisanStory: React.FC = () => {
  return (
    <section
      id="story"
      className="relative py-24 bg-transparent text-[var(--text-heading)] overflow-hidden scroll-mt-14"
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8 flex flex-col items-center">
        {/* Top Badge Tag */}
        <CozyScrollReveal variant="fade-up">
          <div className="pixel-box-frame text-[var(--accent-plum)] font-display font-bold text-xs uppercase px-5 py-1.5 rounded-[2px] mb-8 shadow-sm">
            <span className="text-[var(--accent-gold)] text-xs font-mono mr-1.5 animate-gold-pulse inline-block">✦</span>
            <ShinyText text="A NOTE FROM THE DESK" speed={2.6} />
          </div>
        </CozyScrollReveal>

        {/* Master Artisan Desk Bulletin Chassis */}
        <CozyScrollReveal variant="scale-up" delayMs={100} className="w-full">
          <div className="w-full bg-[var(--desk-surface)] border-3 border-[var(--desk-border)] rounded-[2px] p-6 sm:p-10 shadow-sm relative overflow-hidden">
            <PixelCorners />
            <PixelGoldenAccents />
            {/* Top Decorative Trim Strip */}
            <div className="w-full flex items-center justify-between px-4 pb-4 mb-6 border-b border-[var(--desk-border)] text-xs font-mono text-[var(--text-body)]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[var(--accent-gold)] inline-block shadow-sm" />
                <span className="text-[11px] font-bold text-[var(--accent-gold)] tracking-wider uppercase">
                  A NOTE FROM THE DESK
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-[var(--accent-plum)]">
                <span>EST. 2026</span>
                <span>•</span>
                <span>MADE WITH CARE</span>
              </div>
            </div>

            {/* 3-Column Layout: Left Beloved Cat, Center Story, Right Cozy Hearth */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[220px_1fr_220px] gap-8 items-center">
              {/* Left Vignette: Beloved Velvet Cushion Cat */}
              <CozyScrollReveal variant="slide-left" delayMs={140} className="flex flex-col items-center">
                <div className="w-full bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] p-3 flex flex-col items-center justify-center shadow-sm relative">
                  <PixelCorners />
                  <div className="w-full bg-[var(--desk-surface)] border border-[var(--desk-border)] rounded-[1px] p-2 flex flex-col items-center">
                    <IconCushionCat size={140} />
                  </div>
                </div>
              </CozyScrollReveal>

              {/* Center Story & Manifesto */}
              <CozyScrollReveal variant="fade-up" delayMs={180} className="text-center px-2 sm:px-6">
                <h2 className="font-display text-2xl sm:text-3xl text-[var(--accent-plum)] mb-4 flex items-center justify-center gap-2 drop-shadow-sm">
                  <span>WHY WE MADE THIS</span>
                </h2>

                <p className="font-sans text-sm sm:text-base leading-relaxed text-[var(--text-heading)] max-w-lg mx-auto">
                  A lot of drawing apps start to feel like work. Too many buttons, too many accounts, too much getting in the way. We wanted something simpler — a little desk you can open whenever you feel like drawing.
                </p>

                <p className="mt-4 font-sans text-xs sm:text-sm text-[var(--text-body)] leading-relaxed max-w-lg mx-auto">
                  No account to make, no setup to get through. Just pull up a chair and draw.
                </p>

                {/* Craftsperson Sign-off & Stamp */}
                <div className="mt-6 pt-5 border-t border-[var(--desk-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[var(--text-body)]">
                  <span className="font-display text-xs text-[var(--accent-gold)] font-bold tracking-wide">
                    HAPPY SKETCHING ✦
                  </span>
                  <span className="px-2.5 py-1 rounded-[1px] bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] text-[10px] text-[var(--accent-plum)]">
                    NO ACCOUNT • SAVES TO YOUR DEVICE
                  </span>
                </div>
              </CozyScrollReveal>

              {/* Right Vignette: Cozy Brick Hearth Companion */}
              <CozyScrollReveal variant="slide-right" delayMs={140} className="flex flex-col items-center">
                <div className="w-full bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] p-3 flex flex-col items-center justify-center shadow-sm relative">
                  <PixelCorners />
                  <div className="w-full bg-[var(--desk-surface)] border border-[var(--desk-border)] rounded-[1px] p-2 flex flex-col items-center">
                    <IconCozyHearth size={140} />
                  </div>
                  <span className="mt-2.5 text-[10px] font-mono text-[var(--accent-gold)] font-bold tracking-wider uppercase">
                    WARM HEARTH
                  </span>
                </div>
              </CozyScrollReveal>
            </div>
          </div>
        </CozyScrollReveal>
      </div>
    </section>
  );
};
