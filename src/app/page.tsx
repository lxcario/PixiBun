import type { Metadata } from 'next';
import { LandingNav } from '@/components/landing/LandingNav';
import { NightHero } from '@/components/landing/night/NightHero';
import { NightStory } from '@/components/landing/night/NightStory';
import { AtelierEngineShowcase } from '@/components/landing/AtelierEngineShowcase';
import { CozyFeatureGrid } from '@/components/landing/CozyFeatureGrid';
import { AtelierGallery } from '@/components/landing/AtelierGallery';
import { ArtisanStory } from '@/components/landing/ArtisanStory';
import { AtelierCtaBanner } from '@/components/landing/AtelierCtaBanner';
import { AtelierFooter } from '@/components/landing/AtelierFooter';
import { CozyAtelierBackground } from '@/components/landing/CozyAtelierBackground';
import { PixelWaveDivider } from '@/components/landing/hero/PixelWaveDivider';

export const metadata: Metadata = {
  title: 'PixiBun Atelier — 2.5D Photometric Pixel Art Studio & Animation Engine',
  description:
    'A quiet pixel art studio in your browser. Draw sprites, animate a few frames, try a light, and export images, a Godot kit or Unity shader code. No account needed.',
};

export default function Home() {
  return (
    <>
      <CozyAtelierBackground />

      <main id="top" tabIndex={-1} className="min-h-screen bg-transparent text-[var(--text-heading)] flex flex-col relative z-10">
        <LandingNav />

        {/* A living pixel night that builds itself as the intro, then invites play */}
        <NightHero />

        {/* Scroll-driven story: sketch → light → move → take it home */}
        <NightStory />

        <AtelierEngineShowcase />
        <CozyFeatureGrid />
        <AtelierGallery />
        <PixelWaveDivider tone="gold" />
        <ArtisanStory />
        <AtelierCtaBanner />
        <AtelierFooter />
      </main>
    </>
  );
}
