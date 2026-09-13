import type { Metadata } from 'next';
import { LandingNav } from '@/components/landing/LandingNav';
import { AtelierHero } from '@/components/landing/AtelierHero';
import { AtelierEngineShowcase } from '@/components/landing/AtelierEngineShowcase';
import { CozyFeatureGrid } from '@/components/landing/CozyFeatureGrid';
import { AtelierGallery } from '@/components/landing/AtelierGallery';
import { ArtisanStory } from '@/components/landing/ArtisanStory';
import { AtelierCtaBanner } from '@/components/landing/AtelierCtaBanner';
import { AtelierFooter } from '@/components/landing/AtelierFooter';
import { LamplitIntroProvider } from '@/components/landing/LamplitIntroProvider';
import { PixelDitherCurtain } from '@/components/landing/PixelDitherCurtain';
import { ClickSpark } from '@/components/reactbits/ClickSpark';
import { CozyAtelierBackground } from '@/components/landing/CozyAtelierBackground';

export const metadata: Metadata = {
  title: 'PixiBun Atelier — 2.5D Photometric Pixel Art Studio & Animation Engine',
  description:
    'An offline-first pixel art atelier and game animation suite in your browser. Real-time 2.5D photometric lighting, RotSprite geometry, bounded cast shadows, and native Godot 4 & Unity exports.',
};

export default function Home() {
  return (
    <LamplitIntroProvider>
      <PixelDitherCurtain />
      
      {/* Cozy Atelier Background (Soft Lamplight Radiance, Candle Follow, Embers, Shelves) */}
      <CozyAtelierBackground />

      <main id="top" className="min-h-screen bg-transparent text-[var(--text-heading)] flex flex-col relative z-10">
        <LandingNav />

        {/* Hero & Interactive Canvas Showcase with Tactile Cursor & Click Sparks (UX-11) */}
        <ClickSpark
          className="custom-cursor-active relative"
          sparkColors={['#f0be7c', '#fff8db', '#dcabdf']}
          sparkSize={2.5}
          sparkRadius={20}
          sparkCount={5}
          duration={320}
        >
          <AtelierHero />
        </ClickSpark>

          {/* Decorative Section Divider */}
          <div className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-center gap-4 text-[var(--desk-border)]">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--desk-border)] to-[var(--desk-border)]" />
            <span className="w-1.5 h-1.5 rotate-45 bg-[var(--accent-gold)] shrink-0" aria-hidden="true" />
            <div className="flex-1 h-px bg-gradient-to-r from-[var(--desk-border)] via-[var(--desk-border)] to-transparent" />
          </div>

          {/* Interactive Atelier Engine Showcase: 8 Deep Core Features */}
          <AtelierEngineShowcase />

          {/* Decorative Section Divider */}
          <div className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-center gap-4 text-[var(--desk-border)]">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--desk-border)] to-[var(--desk-border)]" />
            <span className="w-1.5 h-1.5 rotate-45 bg-[var(--accent-plum)] shrink-0" aria-hidden="true" />
            <div className="flex-1 h-px bg-gradient-to-r from-[var(--desk-border)] via-[var(--desk-border)] to-transparent" />
          </div>

          <CozyFeatureGrid />

          {/* Decorative Section Divider */}
          <div className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-center gap-4 text-[var(--desk-border)]">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--desk-border)] to-[var(--desk-border)]" />
            <span className="w-1.5 h-1.5 rotate-45 bg-[var(--accent-plum)] shrink-0" aria-hidden="true" />
            <div className="flex-1 h-px bg-gradient-to-r from-[var(--desk-border)] via-[var(--desk-border)] to-transparent" />
          </div>

          <AtelierGallery />

          {/* Decorative Section Divider */}
          <div className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-center gap-4 text-[var(--desk-border)]">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--desk-border)] to-[var(--desk-border)]" />
            <span className="w-1.5 h-1.5 rotate-45 bg-[var(--accent-gold)] shrink-0" aria-hidden="true" />
            <div className="flex-1 h-px bg-gradient-to-r from-[var(--desk-border)] via-[var(--desk-border)] to-transparent" />
          </div>

          <ArtisanStory />
          <AtelierCtaBanner />
          <AtelierFooter />
        </main>
    </LamplitIntroProvider>
  );
}
