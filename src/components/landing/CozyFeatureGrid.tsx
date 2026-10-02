'use client';

import React from 'react';
import Link from 'next/link';

interface FeatureCardData {
  id: string;
  tag: string;
  title: string;
  description: string;
  pill: string;
  linkText: string;
  illustration: React.ReactNode;
}

// 1. Tactile Brush Illustration
const BrushVignette: React.FC = () => (
  <svg
    viewBox="0 0 72 48"
    width="100%"
    height="48"
    shapeRendering="crispEdges"
    className="pixelated select-none"
    aria-hidden="true"
  >
    {/* Canvas backdrop */}
    <rect x="2" y="2" width="68" height="44" fill="var(--desk-surface)" />
    <rect x="2" y="2" width="68" height="2" fill="var(--desk-border-highlight)" />

    {/* Drawn pixel trail */}
    <rect x="8" y="28" width="4" height="4" fill="var(--text-muted)" />
    <rect x="14" y="24" width="4" height="4" fill="var(--accent-wisteria)" />
    <rect x="20" y="20" width="4" height="4" fill="var(--accent-plum)" />
    <rect x="26" y="16" width="4" height="4" fill="var(--accent-gold)" />
    <rect x="32" y="14" width="4" height="4" fill="#ffffff" />

    {/* Stylus / Brush Body */}
    <path
      d="M36 14h6v2h2v2h2v2h2v2h2v2h2v2h2v2h2v2h2v2h4v4h-4v-2h-2v-2h-2v-2h-2v-2h-2v-2h-2v-2h-2v-2h-2v-2h-2v-2h-4v-4z"
      fill="var(--desk-border)"
    />
    <path
      d="M38 16h4v2h2v2h2v2h2v2h2v2h2v2h2v2h2v2h2v2h2v2h-2v-2h-2v-2h-2v-2h-2v-2h-2v-2h-2v-2h-2v-2h-2v-2h-4v-2z"
      fill="var(--desk-surface-raised)"
    />
    {/* Stylus Nib */}
    <rect x="34" y="15" width="2" height="2" fill="var(--accent-gold)" />
    <rect x="32" y="14" width="2" height="2" fill="#ffffff" />
    {/* Stylus Accent Ring */}
    <rect x="52" y="30" width="3" height="3" fill="var(--accent-plum)" />
    <rect x="54" y="32" width="3" height="3" fill="var(--accent-wisteria)" />
  </svg>
);

// 2. Frame-by-Frame Timeline Illustration
const TimelineVignette: React.FC = () => (
  <svg
    viewBox="0 0 72 48"
    width="100%"
    height="48"
    shapeRendering="crispEdges"
    className="pixelated select-none"
    aria-hidden="true"
  >
    {/* Timeline backdrop */}
    <rect x="2" y="2" width="68" height="44" fill="var(--desk-surface)" />
    <rect x="2" y="2" width="68" height="2" fill="var(--desk-border-highlight)" />

    {/* Filmstrip sprocket holes */}
    <rect x="4" y="6" width="3" height="3" fill="var(--desk-border)" />
    <rect x="12" y="6" width="3" height="3" fill="var(--desk-border)" />
    <rect x="20" y="6" width="3" height="3" fill="var(--desk-border)" />
    <rect x="28" y="6" width="3" height="3" fill="var(--desk-border)" />
    <rect x="36" y="6" width="3" height="3" fill="var(--desk-border)" />
    <rect x="44" y="6" width="3" height="3" fill="var(--desk-border)" />
    <rect x="52" y="6" width="3" height="3" fill="var(--desk-border)" />
    <rect x="60" y="6" width="3" height="3" fill="var(--desk-border)" />

    {/* Frame 1: Ghost/Onion-skin frame */}
    <rect x="6" y="14" width="16" height="22" fill="var(--desk-border)" />
    <rect x="7" y="15" width="14" height="20" fill="var(--desk-surface-raised)" />
    <rect x="12" y="24" width="4" height="4" fill="var(--accent-plum)" opacity="0.4" />

    {/* Frame 2: Active frame (Highlighted) */}
    <rect x="26" y="12" width="20" height="26" fill="var(--accent-gold)" />
    <rect x="28" y="14" width="16" height="22" fill="var(--desk-surface-raised)" />
    {/* Mini Bun Sprite */}
    <rect x="34" y="20" width="4" height="4" fill="var(--text-heading)" />
    <rect x="33" y="17" width="2" height="4" fill="var(--accent-plum)" />
    <rect x="37" y="17" width="2" height="4" fill="var(--accent-plum)" />
    <rect x="33" y="24" width="6" height="5" fill="#ffffff" />
    <rect x="34" y="29" width="2" height="2" fill="var(--accent-gold)" />

    {/* Frame 3: Next frame */}
    <rect x="50" y="14" width="16" height="22" fill="var(--desk-border)" />
    <rect x="51" y="15" width="14" height="20" fill="var(--desk-surface-raised)" />
    <rect x="56" y="20" width="4" height="4" fill="var(--text-muted)" />
  </svg>
);

// 3. Homestyle Palette Illustration
const PaletteVignette: React.FC = () => (
  <svg
    viewBox="0 0 72 48"
    width="100%"
    height="48"
    shapeRendering="crispEdges"
    className="pixelated select-none"
    aria-hidden="true"
  >
    {/* Palette backdrop */}
    <rect x="2" y="2" width="68" height="44" fill="var(--desk-surface)" />
    <rect x="2" y="2" width="68" height="2" fill="var(--desk-border-highlight)" />

    {/* Swatch 1: Obsidian */}
    <rect x="6" y="14" width="9" height="20" fill="var(--desk-border)" />
    <rect x="7" y="15" width="7" height="18" fill="var(--text-heading)" />
    <rect x="8" y="16" width="3" height="3" fill="#ffffff" opacity="0.3" />

    {/* Swatch 2: Plum */}
    <rect x="18" y="14" width="9" height="20" fill="var(--desk-border)" />
    <rect x="19" y="15" width="7" height="18" fill="var(--accent-plum)" />
    <rect x="20" y="16" width="3" height="3" fill="#ffffff" />

    {/* Swatch 3: Wisteria */}
    <rect x="30" y="14" width="9" height="20" fill="var(--desk-border)" />
    <rect x="31" y="15" width="7" height="18" fill="var(--accent-wisteria)" />
    <rect x="32" y="16" width="3" height="3" fill="#ffffff" />

    {/* Swatch 4: Amber */}
    <rect x="42" y="14" width="9" height="20" fill="var(--desk-border)" />
    <rect x="43" y="15" width="7" height="18" fill="var(--accent-gold)" />
    <rect x="44" y="16" width="3" height="3" fill="#ffffff" />

    {/* Swatch 5: Alabaster */}
    <rect x="54" y="14" width="9" height="20" fill="var(--desk-border)" />
    <rect x="55" y="15" width="7" height="18" fill="var(--desk-surface-raised)" />
    <rect x="56" y="16" width="3" height="3" fill="var(--accent-gold)" />
  </svg>
);

// 4. Privacy & Export Illustration
const ExportVignette: React.FC = () => (
  <svg
    viewBox="0 0 72 48"
    width="100%"
    height="48"
    shapeRendering="crispEdges"
    className="pixelated select-none"
    aria-hidden="true"
  >
    {/* Export backdrop */}
    <rect x="2" y="2" width="68" height="44" fill="var(--desk-surface)" />
    <rect x="2" y="2" width="68" height="2" fill="var(--desk-border-highlight)" />

    {/* Floppy Disk Sprite */}
    <rect x="8" y="10" width="26" height="28" fill="var(--desk-border)" />
    <rect x="9" y="11" width="24" height="26" fill="var(--accent-wisteria)" />
    <rect x="13" y="11" width="16" height="10" fill="var(--desk-surface)" />
    <rect x="16" y="13" width="4" height="6" fill="var(--desk-border)" />
    <rect x="12" y="23" width="18" height="12" fill="var(--desk-surface-raised)" />
    <rect x="14" y="25" width="14" height="2" fill="var(--accent-plum)" />
    <rect x="14" y="29" width="10" height="2" fill="var(--accent-plum)" />

    {/* Format Badges on the right */}
    <rect x="38" y="10" width="26" height="8" fill="var(--desk-border)" />
    <rect x="39" y="11" width="24" height="6" fill="var(--desk-surface-raised)" />
    <text x="43" y="16" fill="var(--accent-gold)" fontSize="5" fontFamily="monospace" fontWeight="bold">.PNG</text>

    <rect x="38" y="20" width="26" height="8" fill="var(--desk-border)" />
    <rect x="39" y="21" width="24" height="6" fill="var(--desk-surface-raised)" />
    <text x="43" y="26" fill="var(--accent-plum)" fontSize="5" fontFamily="monospace" fontWeight="bold">.GIF</text>

    <rect x="38" y="30" width="26" height="8" fill="var(--desk-border)" />
    <rect x="39" y="31" width="24" height="6" fill="var(--desk-surface-raised)" />
    <text x="43" y="36" fill="var(--accent-wisteria)" fontSize="5" fontFamily="monospace" fontWeight="bold">.ZIP</text>
  </svg>
);

const FEATURES: FeatureCardData[] = [
  {
    id: 'photometric',
    tag: '01 / LIGHTING',
    title: '2.5D PHOTOMETRIC STUDIO',
    description:
      'Try a light on a small sprite, compare smooth or stepped shading, then decide what to keep. Estimated surfaces are a starting point for your own adjustments.',
    pill: 'REAL-TIME NORMALS',
    linkText: 'OPEN LIGHTING STUDIO →',
    illustration: <BrushVignette />,
  },
  {
    id: 'rotsprite',
    tag: '02 / GEOMETRY',
    title: 'ROTSPRITE PRECISION',
    description:
      'Compare RotSprite with nearest-neighbor rotation. It uses an 8x working image and keeps source colors; tiny details can still change.',
    pill: 'COMPARE THE EDGES',
    linkText: 'TEST ROTSPRITE →',
    illustration: <PaletteVignette />,
  },
  {
    id: 'animation',
    tag: '03 / TIMELINE',
    title: 'ANIMATION & SDF MORPH',
    description:
      'Give each pose its own hold, use faded onion-skin guides and organize clips. Try generated in-betweens, then review the result before keeping it.',
    pill: 'SDF TWEENING',
    linkText: 'OPEN TIMELINE →',
    illustration: <TimelineVignette />,
  },
  {
    id: 'export',
    tag: '04 / PIPELINES',
    title: 'GAME ENGINE EXPORTS',
    description:
      'Share a PNG, GIF or full-RGBA APNG. Export a sprite sheet, a bounded Godot kit or Unity shader code; check the files in your destination.',
    pill: 'SPRITES & ANIMATION',
    linkText: 'EXPORT PIPELINES →',
    illustration: <ExportVignette />,
  },
];

import { CozyScrollReveal, PixelCorners } from './CozyScrollReveal';
import { CardGoldenChains } from './CardGoldenChains';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import { ShinyText } from '@/components/reactbits/ShinyText';

export const CozyFeatureGrid: React.FC = () => {
  return (
    <section
      id="features"
      className="relative py-24 bg-[var(--desk-surface)]/80 border-t-2 border-b-2 border-[var(--desk-border)] overflow-hidden scroll-mt-14"
    >
      <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <CozyScrollReveal variant="fade-up">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[2px] pixel-box-frame text-[var(--accent-plum)] font-display font-bold text-xs uppercase tracking-wider mb-4 shadow-sm">
              <span className="text-[var(--accent-gold)] text-xs animate-gold-pulse inline-block">✦</span>
              <ShinyText text="FOUR CORE STUDIO PILLARS" speed={2.6} />
              <span className="text-[var(--accent-gold)] text-xs animate-gold-pulse inline-block">✦</span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl text-[var(--text-heading)] flex items-center justify-center gap-3 drop-shadow-sm">
              <span>CRAFTED FOR ARTISTS &amp; GAME MAKERS</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base font-sans text-[var(--text-body)]">
              Draw, preview and export on your device, with no account needed.
            </p>
          </div>
        </CozyScrollReveal>

        {/* 4 Crisp Feature Cards with Staggered Easing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, i) => (
            <CozyScrollReveal
              key={feature.id}
              variant="fade-up"
              delayMs={i * 90}
              className="h-full"
            >
              <SpotlightCard
                spotlightColor="rgba(240, 190, 124, 0.12)"
                className="rounded-[2px] h-full"
              >
                <article
                  className="bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] p-5 flex flex-col items-start text-left shadow-sm group h-full relative transition-colors duration-300"
                >
                  {/* 16-bit Amber Corner Brackets snapped directly inside card border */}
                  <PixelCorners />
                  {/* 16-Bit Golden Pixel Chains on Card Flanks */}
                  <CardGoldenChains />

                {/* Card Header Illustration Container with Retro CRT Scanlines */}
                <div className="w-full border-2 border-[var(--desk-border)] rounded-[1px] overflow-hidden mb-4 bg-[var(--desk-surface)] relative transition-colors duration-300">
                  {feature.illustration}
                  <div className="absolute inset-0 retro-scanlines pointer-events-none" />
                </div>

                {/* Tag & Pill Row */}
                <div className="w-full flex items-center justify-between gap-2 mb-2.5">
                  <span className="font-mono text-[10px] font-bold text-[var(--accent-gold)] tracking-wider">
                    {feature.tag}
                  </span>
                  <span className="px-2 py-0.5 rounded-[1px] bg-[var(--desk-surface)] border border-[var(--desk-border)] text-[10px] font-mono text-[var(--text-body)]">
                    {feature.pill}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-display font-bold text-base text-[var(--accent-plum)] mb-2 tracking-wide drop-shadow-sm">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-xs leading-relaxed text-[var(--text-body)] flex-1 font-sans mb-5">
                  {feature.description}
                </p>

                {/* Link CTA Button */}
                <Link
                  href="/studio"
                  className="w-full py-2.5 px-3 flex items-center justify-between rounded-[2px] pixel-tactile-btn text-[var(--text-heading)] font-display font-bold text-xs tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c]"
                  aria-label={`Open studio for ${feature.title}`}
                >
                  <span>{feature.linkText}</span>
                  <span className="text-[var(--accent-gold)] text-xs">✦</span>
                </Link>
              </article>
            </SpotlightCard>
          </CozyScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
