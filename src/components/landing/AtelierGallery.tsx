'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { STARTER_TEMPLATES, TEMPLATE_PALETTE } from '@/lib/art/starterTemplates';
import type { StarterTemplate } from '@/types/landing';
import { paintTemplate } from '@/lib/render/templateRenderer';
import { CozyScrollReveal, PixelCorners } from './CozyScrollReveal';
import { PixelGoldenAccents } from './PixelGoldenAccents';
import { ShinyText } from '@/components/reactbits/ShinyText';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';

/** A card's tag, size and its four most-used colors, read from the sprite itself. */
function spriteMetadata(template: StarterTemplate, index: number) {
  const counts = new Map<string, number>();
  for (const row of template.rows) for (const key of row) if (key !== '.') counts.set(key, (counts.get(key) ?? 0) + 1);
  const palette = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([key]) => TEMPLATE_PALETTE[key]);
  return {
    tag: `#${String(index + 1).padStart(2, '0')} / ${template.name.toUpperCase()}`,
    size: `${template.width}×${template.height}`,
    palette,
  };
}

// 1. Left Shelf Prop: Stacked Art Books, Candle, & Potted Vine
const LeftWorkshopProp: React.FC = () => (
  <svg
    viewBox="0 0 88 120"
    width="88"
    height="120"
    shapeRendering="crispEdges"
    className="pixelated select-none"
    aria-hidden="true"
  >
    {/* Hanging Ivy Leaves */}
    <rect x="12" y="2" width="4" height="6" fill="var(--desk-border)" />
    <rect x="13" y="3" width="2" height="4" fill="#7fae6b" />
    <rect x="20" y="6" width="6" height="8" fill="var(--desk-border)" />
    <rect x="21" y="7" width="4" height="6" fill="#7fae6b" />
    <rect x="23" y="9" width="2" height="2" fill="#a8e092" />
    <rect x="8" y="10" width="6" height="8" fill="var(--desk-border)" />
    <rect x="9" y="11" width="4" height="6" fill="#4e7a43" />

    {/* Lit Studio Candle on Brass Dish */}
    <rect x="25" y="22" width="6" height="8" fill="rgba(240,190,124,0.3)" />
    <rect x="26" y="24" width="4" height="5" fill="#f0be7c" />
    <rect x="27" y="25" width="2" height="2" fill="#ffffff" />
    <rect x="27" y="29" width="2" height="2" fill="var(--desk-border)" />
    {/* Candle wax pillar */}
    <rect x="24" y="31" width="8" height="16" fill="var(--desk-border)" />
    <rect x="25" y="32" width="6" height="14" fill="var(--desk-surface-raised)" />
    <rect x="27" y="33" width="2" height="4" fill="#ffffff" />
    {/* Brass holder dish */}
    <rect x="20" y="47" width="16" height="4" fill="var(--desk-border)" />
    <rect x="21" y="48" width="14" height="2" fill="#f0be7c" />

    {/* Stacked Sketchbooks */}
    {/* Book 1 */}
    <rect x="16" y="54" width="56" height="14" fill="var(--desk-border)" />
    <rect x="18" y="55" width="52" height="12" fill="var(--accent-plum)" />
    <rect x="22" y="58" width="44" height="6" fill="var(--desk-surface-raised)" />
    <rect x="58" y="60" width="10" height="8" fill="#f0be7c" />

    {/* Book 2 */}
    <rect x="12" y="68" width="64" height="16" fill="var(--desk-border)" />
    <rect x="14" y="69" width="60" height="14" fill="var(--accent-wisteria)" />
    <rect x="20" y="72" width="50" height="8" fill="var(--desk-surface-raised)" />
    <rect x="15" y="73" width="4" height="6" fill="#f0be7c" />

    {/* Book 3 */}
    <rect x="6" y="84" width="76" height="20" fill="var(--desk-border)" />
    <rect x="8" y="85" width="72" height="18" fill="var(--desk-surface)" />
    <rect x="16" y="89" width="60" height="10" fill="var(--desk-surface-raised)" />
    <rect x="9" y="90" width="6" height="8" fill="#f0be7c" />

    {/* Potted Mini Succulent */}
    <rect x="48" y="38" width="20" height="16" fill="var(--desk-border)" />
    <rect x="50" y="40" width="16" height="4" fill="#eb977b" />
    <rect x="52" y="44" width="12" height="8" fill="#d97757" />
    <rect x="52" y="30" width="12" height="10" fill="var(--desk-border)" />
    <rect x="54" y="32" width="8" height="8" fill="#4e7a43" />
    <rect x="56" y="34" width="4" height="4" fill="#a8e092" />
  </svg>
);

// 2. Right Shelf Prop: Brush Cup, Steaming Mug, Crystal Potion & Rolls
const RightWorkshopProp: React.FC = () => (
  <svg
    viewBox="0 0 88 120"
    width="88"
    height="120"
    shapeRendering="crispEdges"
    className="pixelated select-none"
    aria-hidden="true"
  >
    {/* Artist Brush Jar */}
    <rect x="54" y="10" width="3" height="32" fill="var(--desk-border)" />
    <rect x="55" y="11" width="1" height="30" fill="#d89a55" />
    <rect x="53" y="6" width="5" height="6" fill="var(--accent-plum)" />

    <rect x="62" y="14" width="3" height="28" fill="var(--desk-border)" />
    <rect x="63" y="15" width="1" height="26" fill="var(--desk-surface-raised)" />
    <rect x="61" y="8" width="5" height="7" fill="#f0be7c" />

    <rect x="46" y="18" width="3" height="24" fill="var(--desk-border)" />
    <rect x="47" y="19" width="1" height="22" fill="#d89a55" />
    <rect x="45" y="12" width="5" height="7" fill="var(--accent-wisteria)" />

    {/* Jar Body */}
    <rect x="44" y="38" width="26" height="30" fill="var(--desk-border)" />
    <rect x="46" y="40" width="22" height="26" fill="var(--desk-surface)" />
    <rect x="48" y="44" width="18" height="18" fill="var(--desk-border-highlight)" />
    <rect x="50" y="48" width="14" height="2" fill="var(--accent-wisteria)" />

    {/* Crystal Amber Star Potion */}
    <rect x="18" y="44" width="18" height="24" fill="var(--desk-border)" />
    <rect x="22" y="40" width="10" height="5" fill="var(--desk-border)" />
    <rect x="24" y="41" width="6" height="3" fill="#d89a55" />
    <rect x="20" y="46" width="14" height="20" fill="#f0be7c" />
    <rect x="22" y="48" width="10" height="16" fill="#fbe9c6" />
    <rect x="25" y="52" width="4" height="4" fill="#ffffff" />

    {/* Steaming Coffee Mug on Coaster */}
    <rect x="18" y="66" width="2" height="6" fill="rgba(221,223,223,0.4)" />
    <rect x="23" y="62" width="2" height="8" fill="rgba(221,223,223,0.55)" />
    <rect x="28" y="66" width="2" height="6" fill="rgba(221,223,223,0.4)" />

    <rect x="12" y="74" width="28" height="24" fill="var(--desk-border)" />
    <rect x="14" y="76" width="24" height="20" fill="var(--desk-surface-raised)" />
    <rect x="16" y="78" width="20" height="4" fill="var(--desk-surface)" />
    <rect x="22" y="85" width="8" height="7" fill="#e08ca6" />
    <rect x="23" y="86" width="6" height="5" fill="var(--accent-plum)" />
    <rect x="6" y="78" width="7" height="16" fill="var(--desk-border)" />
    <rect x="8" y="80" width="3" height="12" fill="var(--desk-surface)" />

    {/* Coaster */}
    <rect x="6" y="98" width="38" height="6" fill="var(--desk-border)" />
    <rect x="8" y="99" width="34" height="4" fill="#d89a55" />

    {/* Rolled Canvas Blueprints */}
    <rect x="42" y="72" width="38" height="14" fill="var(--desk-border)" />
    <rect x="44" y="74" width="34" height="10" fill="var(--desk-surface-raised)" />
    <rect x="58" y="74" width="4" height="10" fill="var(--accent-wisteria)" />

    <rect x="40" y="86" width="42" height="16" fill="var(--desk-border)" />
    <rect x="42" y="88" width="38" height="12" fill="var(--desk-surface)" />
    <rect x="60" y="88" width="4" height="12" fill="var(--accent-plum)" />
  </svg>
);

const StarterSpriteCanvas: React.FC<{ template: (typeof STARTER_TEMPLATES)[number] }> = ({ template }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      paintTemplate(canvas, template);
    }
  }, [template]);

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={160}
      className="w-full aspect-square pixelated bg-[var(--desk-surface-raised)] rounded-[1px] block"
    />
  );
};

export const AtelierGallery: React.FC = () => {
  return (
    <section
      id="gallery"
      className="relative py-24 bg-[var(--desk-surface)]/75 text-[var(--text-heading)] overflow-hidden scroll-mt-14 border-t-2 border-b-2 border-[var(--desk-border)]"
      style={{
        backgroundImage: `
          linear-gradient(color-mix(in srgb, var(--text-muted) 4%, transparent) 1px, transparent 1px),
          linear-gradient(90deg, color-mix(in srgb, var(--text-muted) 4%, transparent) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
      }}
    >
      <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <CozyScrollReveal variant="fade-up">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-[2px] pixel-box-frame text-[var(--accent-plum)] font-display font-bold text-xs uppercase tracking-wider mb-4 shadow-sm">
              <span className="text-[var(--accent-gold)] text-xs font-mono animate-gold-pulse inline-block">✦</span>
              <ShinyText text="STARTER COLLECTION" speed={2.6} />
            </div>

            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl text-[var(--text-heading)] flex items-center justify-center gap-3 drop-shadow-sm">
              <span>TAKE A SPRITE FROM THE SHELF</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base font-sans text-[var(--text-body)]">
              Pick one, change a few colours, and make it yours.
            </p>
          </div>
        </CozyScrollReveal>

        {/* Master Wooden Workshop Display Unit */}
        {/* Keep starter hit areas fixed while the collection appears. */}
        <CozyScrollReveal variant="fade" delayMs={100}>
          <div className="relative max-w-6xl mx-auto bg-[var(--desk-surface)] border-3 border-[var(--desk-border)] rounded-[2px] p-6 sm:p-8 shadow-sm transition-colors duration-300">
            <PixelCorners />
            <PixelGoldenAccents />
            {/* Top Hanging Fairy Lights across the display */}
            <div className="w-full flex items-center justify-between px-6 mb-6 pb-4 border-b border-[var(--desk-border)]/80 text-xs font-mono text-[var(--text-body)]">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-[var(--accent-gold)] inline-block shadow-sm" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-gold)]">
                  SHELF 01 / PICK A FRIEND
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-[var(--accent-plum)]">
                <span>4 LITTLE STARTERS</span>
                <span>•</span>
                <span>16×16</span>
              </div>
            </div>

            {/* Shelf Stage: Left Prop + 4 Cards + Right Prop */}
            <div className="relative flex items-end justify-center gap-4 lg:gap-6 flex-wrap w-full">
              {/* Left Props */}
              <div className="hidden lg:flex flex-col items-center shrink-0 mb-3">
                <CozyScrollReveal variant="slide-left" delayMs={160}>
                  <LeftWorkshopProp />
                </CozyScrollReveal>
              </div>

              {/* Center 4 Sprite Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-end flex-1 max-w-4xl">
                {STARTER_TEMPLATES.map((template, i) => {
                  const meta = spriteMetadata(template, i);
                  return (
                    <CozyScrollReveal key={template.id} variant="fade" delayMs={180 + i * 80} className="h-full">
                      <SpotlightCard
                        spotlightColor="color-mix(in srgb, var(--accent-gold) 12%, transparent)"
                        className="rounded-[2px] h-full"
                      >
                        <figure
                          className="flex flex-col bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] p-4 shadow-sm group relative h-full transition-colors duration-300"
                        >
                          <PixelCorners />
                          <PixelGoldenAccents />
                          {/* Header Tag Row */}
                          <div className="w-full flex items-center justify-between gap-1 mb-2.5">
                            <span className="font-mono text-[10px] font-bold text-[var(--accent-gold)] tracking-wider">
                              {meta.tag}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-[1px] bg-[var(--desk-surface)] border border-[var(--desk-border)] text-[9px] font-mono text-[var(--text-body)]">
                              {meta.size}
                            </span>
                          </div>

                          {/* Canvas Viewport Frame */}
                          <div className="p-2 bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[1px] shadow-inner mb-2.5 transition-colors duration-300">
                            <StarterSpriteCanvas template={template} />
                          </div>

                          {/* Sprite Color Palette Strip */}
                          <div className="w-full flex items-center justify-between px-1 py-1 bg-[var(--desk-surface)] border border-[var(--desk-border)]/80 rounded-[1px] mb-3">
                            <span className="text-[9px] font-mono text-[var(--text-muted)]">PALETTE:</span>
                            <div className="flex items-center gap-1.5">
                              {meta.palette.map((hex, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="w-2.5 h-2.5 rounded-[1px] border border-[var(--desk-border)] inline-block"
                                  style={{ backgroundColor: hex }}
                                  title={hex}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Caption & Text */}
                          <figcaption className="flex-1 flex flex-col">
                            <span className="font-display font-bold text-sm text-[var(--accent-plum)] tracking-wide">
                              {template.name}
                            </span>
                            <span className="mt-1 text-xs leading-relaxed text-[var(--text-body)] flex-1 font-sans">
                              {template.blurb}
                            </span>

                            {/* Paint CTA Button with Specular CC Light-Sweep */}
                            <Link
                              href={`/studio?template=${template.id}`}
                              className="mt-3.5 text-center text-xs font-display font-bold px-3 py-2.5 rounded-[2px] pixel-primary-btn text-[var(--primary-fg)] tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
                              title={`Open ${template.name} in studio`}
                            >
                              <span>GIVE IT A TRY</span>
                              <span className="ml-1 text-[10px]">✦</span>
                            </Link>
                          </figcaption>
                        </figure>
                      </SpotlightCard>
                    </CozyScrollReveal>
                  );
                })}
              </div>

              {/* Right Props */}
              <div className="hidden lg:flex flex-col items-center shrink-0 mb-3">
                <CozyScrollReveal variant="slide-right" delayMs={160}>
                  <RightWorkshopProp />
                </CozyScrollReveal>
              </div>
            </div>

            {/* Solid Wooden Shelf Plank with Brass Brackets */}
            <div className="w-full mt-4 h-7 border-2 border-[var(--desk-border)] bg-[var(--desk-surface-raised)] rounded-b-[2px] shadow-[0_8px_0_var(--btn-shadow)] relative flex items-center justify-between px-12 sm:px-20 transition-colors duration-300">
              {/* Top shelf wood highlight */}
              <div className="absolute top-0 inset-x-0 h-1 bg-[var(--desk-border-highlight)]" />

              {/* Left Bracket */}
              <div className="w-7 h-4 bg-[var(--desk-border)] rounded-b-[1px] flex flex-col items-center justify-center">
                <div className="w-4 h-2 bg-[var(--primary-bg)] rounded-none" />
              </div>

              {/* Center-Left Bracket */}
              <div className="w-7 h-4 bg-[var(--desk-border)] rounded-b-[1px] flex flex-col items-center justify-center">
                <div className="w-4 h-2 bg-[var(--primary-shade)] rounded-none" />
              </div>

              {/* Center-Right Bracket */}
              <div className="w-7 h-4 bg-[var(--desk-border)] rounded-b-[1px] flex flex-col items-center justify-center">
                <div className="w-4 h-2 bg-[var(--primary-shade)] rounded-none" />
              </div>

              {/* Right Bracket */}
              <div className="w-7 h-4 bg-[var(--desk-border)] rounded-b-[1px] flex flex-col items-center justify-center">
                <div className="w-4 h-2 bg-[var(--primary-bg)] rounded-none" />
              </div>
            </div>
          </div>
        </CozyScrollReveal>
      </div>
    </section>
  );
};
