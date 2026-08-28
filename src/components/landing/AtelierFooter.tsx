'use client';

import React from 'react';
import Link from 'next/link';
import { BunMascot } from '@/components/ui/BunMascot';
import { CozyScrollReveal } from './CozyScrollReveal';

export const AtelierFooter: React.FC = () => {
  return (
    <footer className="w-full footer-trim-bar bg-[var(--desk-surface)]/95 text-[var(--text-body)] border-t-2 border-[var(--desk-border)]">
      {/* Upper Multi-Column Section */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Column 1: Brand & Craft Identity */}
          <CozyScrollReveal variant="fade-up" delayMs={50}>
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-1.5 bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] shadow-sm">
                  <BunMascot size={28} />
                </div>
                <span className="font-display font-bold text-base text-[var(--accent-plum)] tracking-wide">
                  PIXIBUN ATELIER
                </span>
              </div>

              <p className="font-sans text-xs leading-relaxed text-[var(--text-body)] max-w-xs mb-4">
                A little pixel art studio for drawing, animating, and taking your time.
              </p>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[1px] bg-[var(--desk-surface-raised)] border border-[var(--desk-border)] text-[10px] font-mono text-[var(--accent-gold)]">
                <span className="w-1.5 h-1.5 bg-[var(--accent-gold)] rounded-none" />
                <span>v1.0 • THE DESK IS OPEN</span>
              </div>
            </div>
          </CozyScrollReveal>

          {/* Column 2: Studio Tools & Features */}
          <CozyScrollReveal variant="fade-up" delayMs={100}>
            <div className="flex flex-col">
              <h3 className="font-display text-xs font-bold text-[var(--accent-plum)] tracking-wider uppercase mb-4">
                STUDIO TOOLS
              </h3>
              <ul className="space-y-2.5 text-xs font-mono">
                <li>
                  <Link href="/studio" className="hover:text-[var(--accent-gold)] transition-colors flex items-center gap-1.5">
                    <span className="text-[var(--accent-wisteria)]">✦</span>
                    <span>Pixel Canvas</span>
                  </Link>
                </li>
                <li>
                  <Link href="/studio" className="hover:text-[var(--accent-gold)] transition-colors flex items-center gap-1.5">
                    <span className="text-[var(--accent-wisteria)]">✦</span>
                    <span>Frame Timeline</span>
                  </Link>
                </li>
                <li>
                  <Link href="/studio" className="hover:text-[var(--accent-gold)] transition-colors flex items-center gap-1.5">
                    <span className="text-[var(--accent-wisteria)]">✦</span>
                    <span>Onion Skinning</span>
                  </Link>
                </li>
                <li>
                  <Link href="/studio" className="hover:text-[var(--accent-gold)] transition-colors flex items-center gap-1.5">
                    <span className="text-[var(--accent-wisteria)]">✦</span>
                    <span>Homestyle Palettes</span>
                  </Link>
                </li>
              </ul>
            </div>
          </CozyScrollReveal>

          {/* Column 3: Atelier Shelf & Starters */}
          <CozyScrollReveal variant="fade-up" delayMs={150}>
            <div className="flex flex-col">
              <h3 className="font-display text-xs font-bold text-[var(--accent-plum)] tracking-wider uppercase mb-4">
                STARTER SHELF
              </h3>
              <ul className="space-y-2.5 text-xs font-mono">
                <li>
                  <Link href="/studio?template=bun" className="hover:text-[var(--accent-gold)] transition-colors flex items-center gap-1.5">
                    <span className="text-[var(--accent-gold)]">✦</span>
                    <span>Bun (16×16)</span>
                  </Link>
                </li>
                <li>
                  <Link href="/studio?template=hearth-ghost" className="hover:text-[var(--accent-gold)] transition-colors flex items-center gap-1.5">
                    <span className="text-[var(--accent-gold)]">✦</span>
                    <span>Hearth Ghost (16×16)</span>
                  </Link>
                </li>
                <li>
                  <Link href="/studio?template=mushroom" className="hover:text-[var(--accent-gold)] transition-colors flex items-center gap-1.5">
                    <span className="text-[var(--accent-gold)]">✦</span>
                    <span>Little Shroom (16×16)</span>
                  </Link>
                </li>
                <li>
                  <Link href="/studio?template=lantern" className="hover:text-[var(--accent-gold)] transition-colors flex items-center gap-1.5">
                    <span className="text-[var(--accent-gold)]">✦</span>
                    <span>Little Lantern (16×16)</span>
                  </Link>
                </li>
              </ul>
            </div>
          </CozyScrollReveal>

          {/* Column 4: Craft Values & Privacy */}
          <CozyScrollReveal variant="fade-up" delayMs={200}>
            <div className="flex flex-col">
              <h3 className="font-display text-xs font-bold text-[var(--accent-plum)] tracking-wider uppercase mb-4">
                GOOD THINGS TO KNOW
              </h3>
              <div className="space-y-3 text-xs font-sans text-[var(--text-body)]">
                <p className="leading-relaxed">
                  No trackers, no uploads. Your drawings stay on your device.
                </p>
                <div className="pt-2 flex items-center gap-4 text-xs font-mono">
                  <a href="#features" className="text-[var(--text-body)] hover:text-[var(--accent-gold)] transition-colors">
                    Studio
                  </a>
                  <a href="#gallery" className="text-[var(--text-body)] hover:text-[var(--accent-gold)] transition-colors">
                    Shelf
                  </a>
                  <a href="#story" className="text-[var(--text-body)] hover:text-[var(--accent-gold)] transition-colors">
                    Story
                  </a>
                </div>
              </div>
            </div>
          </CozyScrollReveal>
        </div>
      </div>

      {/* Bottom Copyright Strip */}
      <div className="border-t border-[var(--desk-border)] py-6 bg-[var(--desk-surface-raised)]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <p className="text-[var(--text-muted)] text-center sm:text-left">
            © 2026 PixiBun Atelier. Made with pixels &amp; late nights.
          </p>
          <p className="text-[var(--accent-gold)] flex items-center gap-1">
            <span>Made for anyone who likes making little things.</span>
            <span>✦</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
