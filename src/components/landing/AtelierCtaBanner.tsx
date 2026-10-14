'use client';

import React from 'react';
import Link from 'next/link';
import {
  IconPottedPlant,
  IconHeartEasel,
} from './AtelierIcons';
import { CozyScrollReveal, PixelCorners } from './CozyScrollReveal';
import { PixelGoldenAccents } from './PixelGoldenAccents';

export const AtelierCtaBanner: React.FC = () => {
  return (
    <section className="relative py-24 bg-transparent text-[var(--text-heading)] overflow-hidden border-t-2 border-[var(--desk-border)]">
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        {/* Master Wooden Workshop Display Stage */}
        <CozyScrollReveal variant="scale-up" delayMs={100} className="w-full">
          <div className="relative bg-[var(--desk-surface)] border-3 border-[var(--desk-border)] rounded-[2px] p-8 sm:p-14 shadow-sm overflow-hidden">
            <PixelCorners />
            <PixelGoldenAccents />
            {/* Top Decorative Trim Strip */}
            <div className="w-full flex items-center justify-between px-2 pb-5 mb-8 border-b border-[var(--desk-border)] text-xs font-mono text-[var(--text-body)]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[var(--accent-gold)] inline-block shadow-sm" />
                <span className="text-[11px] font-bold text-[var(--accent-gold)] tracking-wider uppercase">
                  THE DESK IS ALWAYS OPEN
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-[11px] text-[var(--accent-plum)]">
                <span>NO ACCOUNT</span>
                <span>•</span>
                <span>JUST START DRAWING</span>
              </div>
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
              {/* Left Props: Potted Plant & Sketchbook Stack */}
              <div className="hidden lg:flex flex-col items-center gap-3 shrink-0">
                <CozyScrollReveal variant="slide-left" delayMs={140}>
                  <div className="p-3 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] shadow-sm relative">
                    <PixelCorners />
                    <IconPottedPlant size={100} />
                  </div>
                  <span className="mt-2.5 text-[10px] font-mono text-[var(--text-body)] font-bold tracking-wider uppercase block text-center">
                    THE DESK
                  </span>
                </CozyScrollReveal>
              </div>

              {/* Center Call to Action & Quick Canvas Chooser */}
              <CozyScrollReveal variant="fade-up" delayMs={160} className="text-center flex-1 max-w-xl mx-auto">
                <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-[var(--accent-plum)] mb-4 leading-tight drop-shadow-sm">
                  PULL UP A CHAIR. STAY A WHILE.
                </h2>
                <p className="font-sans text-sm sm:text-base text-[var(--text-heading)] mb-7 leading-relaxed max-w-md mx-auto">
                  The desk is ready. Come draw something.
                </p>

                {/* Quick Canvas Size Shortcuts */}
                <div className="mb-7 flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-xs font-mono">
                  <Link
                    href="/studio?width=16&height=16"
                    className="px-3 py-1.5 rounded-[2px] pixel-tactile-btn text-[var(--text-heading)] hover:text-[var(--accent-gold)] transition-colors"
                  >
                    <span className="text-[var(--accent-gold)] mr-1">✦</span>
                    <span>16×16 MINI</span>
                  </Link>
                  <Link
                    href="/studio?width=24&height=24"
                    className="px-3 py-1.5 rounded-[2px] pixel-tactile-btn text-[var(--text-heading)] hover:text-[var(--accent-gold)] transition-colors"
                  >
                    <span className="text-[var(--accent-gold)] mr-1">✦</span>
                    <span>24×24 SMALL</span>
                  </Link>
                  <Link
                    href="/studio?width=32&height=32"
                    className="px-3 py-1.5 rounded-[2px] pixel-tactile-btn text-[var(--text-heading)] hover:text-[var(--accent-gold)] transition-colors"
                  >
                    <span className="text-[var(--accent-gold)] mr-1">✦</span>
                    <span>32×32 ICON</span>
                  </Link>
                  <Link
                    href="/studio?width=48&height=48"
                    className="px-3 py-1.5 rounded-[2px] pixel-tactile-btn text-[var(--text-heading)] hover:text-[var(--accent-gold)] transition-colors"
                  >
                    <span className="text-[var(--accent-gold)] mr-1">✦</span>
                    <span>48×48 SPRITE</span>
                  </Link>
                </div>

                {/* Master CTA Button */}
                <Link
                  href="/studio"
                  className="inline-flex items-center gap-3 px-9 py-4 rounded-[2px] pixel-primary-btn text-sm font-display font-bold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
                >
                  <span>START A NEW DRAWING</span>
                  <span className="text-base text-[var(--primary-fg)]">→</span>
                </Link>
              </CozyScrollReveal>

              {/* Right Props: Heart Easel Display */}
              <div className="hidden lg:flex flex-col items-center gap-3 shrink-0">
                <CozyScrollReveal variant="slide-right" delayMs={140}>
                  <div className="p-3 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] shadow-sm relative">
                    <PixelCorners />
                    <IconHeartEasel size={100} />
                  </div>
                  <span className="mt-2.5 text-[10px] font-mono text-[var(--text-body)] font-bold tracking-wider uppercase block text-center">
                    CRAFT BENCH
                  </span>
                </CozyScrollReveal>
              </div>
            </div>

            {/* Bottom Craftsperson Trust Strip */}
            <div className="mt-10 pt-6 border-t border-[var(--desk-border)] grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs font-mono text-[var(--text-body)]">
              <CozyScrollReveal variant="fade-up" delayMs={200}>
                <div className="flex flex-col items-center p-2 rounded-[1px] bg-[var(--desk-surface-raised)] border border-[var(--desk-border)]/70">
                  <span className="text-[var(--accent-gold)] font-bold text-[11px] mb-0.5">ON YOUR DEVICE</span>
                  <span className="text-[10px] text-[var(--text-muted)]">SAVES LOCALLY</span>
                </div>
              </CozyScrollReveal>
              <CozyScrollReveal variant="fade-up" delayMs={250}>
                <div className="flex flex-col items-center p-2 rounded-[1px] bg-[var(--desk-surface-raised)] border border-[var(--desk-border)]/70">
                  <span className="text-[var(--accent-plum)] font-bold text-[11px] mb-0.5">NO SETUP</span>
                  <span className="text-[10px] text-[var(--text-muted)]">OPEN &amp; DRAW</span>
                </div>
              </CozyScrollReveal>
              <CozyScrollReveal variant="fade-up" delayMs={300}>
                <div className="flex flex-col items-center p-2 rounded-[1px] bg-[var(--desk-surface-raised)] border border-[var(--desk-border)]/70">
                  <span className="text-[var(--accent-wisteria)] font-bold text-[11px] mb-0.5">SAVE YOUR WORK</span>
                  <span className="text-[10px] text-[var(--text-muted)]">PNG, GIF, Spritesheets</span>
                </div>
              </CozyScrollReveal>
              <CozyScrollReveal variant="fade-up" delayMs={350}>
                <div className="flex flex-col items-center p-2 rounded-[1px] bg-[var(--desk-surface-raised)] border border-[var(--desk-border)]/70">
                  <span className="text-[var(--accent-sage)] font-bold text-[11px] mb-0.5">NO TRACKING</span>
                  <span className="text-[10px] text-[var(--text-muted)]">YOUR DRAWINGS STAY YOURS</span>
                </div>
              </CozyScrollReveal>
            </div>
          </div>
        </CozyScrollReveal>
      </div>
    </section>
  );
};
