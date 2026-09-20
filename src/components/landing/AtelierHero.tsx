'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { AtelierDeskScene } from './AtelierDeskScene';
import { CozyParticles } from '@/components/ui/CozyParticles';
import { ShinyText } from '@/components/reactbits/ShinyText';

export const AtelierHero: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  // Subtle smooth scroll response (disabled if reduced motion)
  const heroOpacity = useTransform(scrollY, [0, 500], [1, shouldReduceMotion ? 1 : 0.6]);
  const heroY = useTransform(scrollY, [0, 500], [0, shouldReduceMotion ? 0 : 50]);
  const scrollCueOpacity = useTransform(scrollY, [0, 120], [1, 0]);

  return (
    <section className="relative min-h-screen pt-24 pb-16 bg-transparent text-[var(--text-heading)] overflow-hidden flex flex-col justify-start lg:justify-center items-center">
      {/* 1. Ambient Floating Golden Fireflies */}
      <CozyParticles count={24} />

      {/* 2. Soft Constellation Pixel Stars scattered across room */}
      <div className="absolute inset-0 pointer-events-none select-none z-0">
        <span className="absolute top-[18%] left-[12%] text-[var(--accent-gold)]/60 text-xs font-mono animate-pulse">✦</span>
        <span className="absolute top-[28%] left-[28%] text-[var(--accent-plum)]/50 text-[10px] font-mono">✧</span>
        <span className="absolute top-[15%] right-[22%] text-[var(--accent-gold)]/70 text-sm font-mono animate-pulse">✦</span>
        <span className="absolute top-[45%] right-[8%] text-[var(--accent-plum)]/40 text-xs font-mono">✧</span>
        <span className="absolute bottom-[25%] left-[8%] text-[var(--accent-gold)]/50 text-xs font-mono">✦</span>
        <span className="absolute bottom-[35%] right-[42%] text-[var(--accent-plum)]/60 text-[10px] font-mono animate-pulse">✧</span>
      </div>

      {/* 3. Main Hero Container with Smooth Scroll-Driven Parallax Response */}
      <motion.div
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 w-full"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Left Column: Hero Text & Actions */}
          <div className="flex flex-col items-start relative">
            {/* Soft Ambient Text Back-Glow */}
            <div
              className="absolute -top-10 -left-10 w-96 h-96 pointer-events-none -z-10"
              style={{
                background: 'radial-gradient(circle, rgba(220, 171, 223, 0.12) 0%, transparent 70%)',
              }}
            />

            {/* Steady Warm Badge Tag */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[2px] pixel-box-frame text-[var(--accent-plum)] font-display font-bold text-xs uppercase tracking-wider mb-6 shadow-sm"
            >
              <span className="text-[var(--accent-gold)] text-xs font-mono animate-gold-pulse inline-block">✦</span>
              <ShinyText text="2.5D PIXEL ART STUDIO & ANIMATION SUITE" speed={2.6} />
              <span className="text-[var(--accent-gold)] text-xs font-mono animate-gold-pulse inline-block">✦</span>
            </motion.div>

            {/* Headline with Plum Highlight */}
            <motion.h1
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl text-[var(--text-heading)] leading-[1.14] tracking-tight drop-shadow-sm"
            >
              THE OFFLINE-FIRST PIXEL ART ATELIER &amp;{' '}
              <span className="inline-block text-[var(--accent-plum)]">
                2.5D GAME STUDIO.
              </span>
            </motion.h1>

            {/* Warm, Human Body Copy in Thistle */}
            <motion.p
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 text-base sm:text-lg leading-relaxed text-[var(--text-body)] max-w-lg font-sans"
            >
              Photometric cel-shading, RotSprite geometry, frame-by-frame animation, and native Godot 4 &amp; Unity exports.
              An honest, quiet desk in your browser.
            </motion.p>

            {/* Honest Feature Pills (Static Non-Clickable Tags) */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 flex items-center gap-2.5 flex-wrap text-xs font-mono text-[var(--text-heading)] select-none"
            >
              <span className="px-2.5 py-1 rounded-[2px] bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] flex items-center gap-1.5 cursor-default select-none shadow-sm">
                <span className="text-[var(--accent-gold)]">✦</span>
                <span>2.5D PHOTOMETRIC LIGHT</span>
              </span>
              <span className="px-2.5 py-1 rounded-[2px] bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] flex items-center gap-1.5 cursor-default select-none shadow-sm">
                <span className="text-[var(--accent-gold)]">✦</span>
                <span>ROTSPRITE 8X</span>
              </span>
              <span className="px-2.5 py-1 rounded-[2px] bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] flex items-center gap-1.5 cursor-default select-none shadow-sm">
                <span className="text-[var(--accent-gold)]">✦</span>
                <span>GODOT 4 &amp; UNITY EXPORTS</span>
              </span>
            </motion.div>

            {/* Action Buttons with 16-bit Tactile Physics */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 flex items-center gap-4 flex-wrap"
            >
              <Link
                href="/studio"
                className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-[2px] pixel-primary-btn text-sm font-display font-bold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c]"
              >
                <span>OPEN THE ATELIER</span>
                <span className="text-base text-[#140d1f]">→</span>
              </Link>

              <a
                href="#engine-showcase"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[2px] pixel-tactile-btn text-[var(--text-heading)] font-display text-xs font-bold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c]"
              >
                <span>EXPLORE THE ENGINE</span>
                <span className="text-[var(--accent-gold)]">↓</span>
              </a>
            </motion.div>

            {/* Craftsperson Trust Row */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-8 pt-6 border-t border-[var(--desk-border)] w-full max-w-lg flex items-center justify-between gap-4 text-xs font-mono text-[var(--text-body)]"
            >
              <span className="flex items-center gap-1.5">
                <span className="text-[var(--accent-plum)]">✦</span>
                <span>MADE WITH TEA &amp; LATE NIGHTS</span>
              </span>
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <span className="text-[var(--accent-gold)]">✦</span>
                <span>STAY A WHILE</span>
              </span>
            </motion.div>
          </div>

          {/* Right Column: Interactive Desk Scene with Smooth Scale-In */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex justify-center"
          >
            <AtelierDeskScene />
          </motion.div>
        </div>
      </motion.div>

      {/* 4. Cozy Scroll-Down Cue */}
      <motion.div
        style={{ opacity: scrollCueOpacity }}
        className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-1.5 pointer-events-auto z-10 select-none"
      >
        <a
          href="#engine-showcase"
          className="flex flex-col items-center gap-1.5 text-xs font-mono text-[var(--accent-plum)] hover:text-[var(--accent-gold)] transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c] px-3 py-1 rounded-[2px]"
          aria-label="Scroll down to engine showcase"
        >
          <span className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-1">
            <span>SCROLL A LITTLE</span>
            <span className="text-[var(--accent-gold)]">✦</span>
          </span>
          <motion.span
            animate={shouldReduceMotion ? {} : { y: [0, 4, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="text-xs text-[var(--accent-gold)] block"
          >
            ▼
          </motion.span>
        </a>
      </motion.div>
    </section>
  );
};
