'use client';

import React from 'react';
import Link from 'next/link';
import { BunMascot } from '@/components/ui/BunMascot';
import { DeskScene } from './DeskScene';
import { DoodlePad } from './DoodlePad';

export const LandingHero: React.FC = () => {
  return (
    <section className="relative">
      <div className="absolute inset-0 lamp-pool pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6 pt-12 pb-8 grid gap-10 md:grid-cols-[1fr_440px] items-center">
        <div>
          <BunMascot size={56} animate />
          <h1 className="font-display text-5xl md:text-6xl mt-5 text-[#ede8f4] leading-tight">
            PixiBun
          </h1>
          <p className="font-display text-base md:text-lg mt-2 text-lamp">
            A pixel studio that lives in your browser tab.
          </p>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#cdbfdf]">
            Warm lamplight, honest tools, and every pixel placed by hand.
            Layers, onion skinning, palette ramps, GIF exports: all on one
            little desk. No install, no account, and your work never leaves
            your machine.
          </p>
          <p className="mt-3 text-sm text-[#b9aac9]">
            Pull up a chair. Bun kept the lamp on for you.
          </p>

          <div className="mt-7 flex items-center gap-4 flex-wrap">
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[4px] border-2 border-border-dark bg-accent-primary text-text-primary font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(58,46,76,0.3)] hover:bg-[#d4a5ea] active:translate-y-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp focus-visible:ring-offset-2 focus-visible:ring-offset-desk"
            >
              Open the Studio
            </Link>
            <Link
              href="/playground"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[4px] border-2 border-[var(--desk-border)] bg-[var(--desk-surface-raised)] text-[var(--accent-gold)] font-bold text-sm hover:bg-[#2e2040] hover:text-[#fff] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp"
            >
              <span>✦ Beginner Playground</span>
            </Link>
            <a
              href="#try"
              className="text-sm font-medium text-[#cdbfdf] underline decoration-[#5e4d73] underline-offset-4 hover:text-[#ede8f4] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamp rounded-[2px]"
            >
              Try the pen first
            </a>
          </div>
        </div>

        <figure className="m-0">
          <div className="rounded-[4px] border-[6px] border-[#4a3542] bg-[#191233] shadow-[0_18px_50px_rgba(12,8,18,0.7)] overflow-hidden">
            <DeskScene />
          </div>
          <figcaption className="mt-2.5 text-center text-[11px] font-mono text-[#8f7fa3]">
            The desk, live at midnight. The steam is fresh.
          </figcaption>
        </figure>
      </div>

      <div id="try" className="relative max-w-2xl mx-auto px-6 pb-14 scroll-mt-8">
        <div className="bg-surface-raised border-2 border-border-dark rounded-[4px] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_30px_rgba(12,8,18,0.55)]">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-text-secondary mb-2.5">
            Warm up your pen
          </p>
          <DoodlePad />
        </div>
      </div>
    </section>
  );
};
