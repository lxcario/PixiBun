import type { Metadata } from 'next';
import { LandingNav } from '@/components/landing/LandingNav';
import { AtelierHero } from '@/components/landing/AtelierHero';
import { CozyFeatureGrid } from '@/components/landing/CozyFeatureGrid';
import { AtelierGallery } from '@/components/landing/AtelierGallery';
import { ArtisanStory } from '@/components/landing/ArtisanStory';
import { AtelierCtaBanner } from '@/components/landing/AtelierCtaBanner';
import { AtelierFooter } from '@/components/landing/AtelierFooter';
import { LamplitIntroProvider } from '@/components/landing/LamplitIntroProvider';
import { PixelDitherCurtain } from '@/components/landing/PixelDitherCurtain';
import { ClickSpark } from '@/components/reactbits/ClickSpark';
import { PixelCursor } from '@/components/reactbits/PixelCursor';
import { CozyAtelierBackground } from '@/components/landing/CozyAtelierBackground';

export const metadata: Metadata = {
  title: 'PixiBun Atelier — A little pixel art desk in your browser',
  description:
    'A little pixel art studio for drawing, animating, and taking your time. Put on the radio and draw.',
};

export default function Home() {
  return (
    <LamplitIntroProvider>
      <PixelDitherCurtain />
      
      {/* 1. Custom 16-Bit Golden Pixel Cursor */}
      <PixelCursor />

      {/* 2. Cozy Atelier Background (Soft Lamplight Radiance, Candle Follow, Embers, Shelves) */}
      <CozyAtelierBackground />

      <ClickSpark
        className="relative z-10"
        sparkColors={['#f0be7c', '#fff8db', '#dcabdf']}
        sparkSize={2.5}
        sparkRadius={20}
        sparkCount={5}
        duration={320}
      >
        <main id="top" className="min-h-screen bg-transparent text-[var(--text-heading)] flex flex-col relative z-10">

          <LandingNav />
          <AtelierHero />
          <CozyFeatureGrid />

          {/* Decorative Section Divider */}
          <div className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-center gap-4 text-[var(--desk-border)]">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--desk-border)] to-[var(--desk-border)]" />
            <span className="text-xs font-mono text-[var(--accent-plum)] select-none">✦ ─── ✧ ─── ✦</span>
            <div className="flex-1 h-px bg-gradient-to-r from-[var(--desk-border)] via-[var(--desk-border)] to-transparent" />
          </div>

          <AtelierGallery />

          {/* Decorative Section Divider */}
          <div className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-center gap-4 text-[var(--desk-border)]">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--desk-border)] to-[var(--desk-border)]" />
            <span className="text-xs font-mono text-[var(--accent-gold)] select-none">✦ ─── ✧ ─── ✦</span>
            <div className="flex-1 h-px bg-gradient-to-r from-[var(--desk-border)] via-[var(--desk-border)] to-transparent" />
          </div>

          <ArtisanStory />
          <AtelierCtaBanner />
          <AtelierFooter />
        </main>
      </ClickSpark>
    </LamplitIntroProvider>
  );
}
