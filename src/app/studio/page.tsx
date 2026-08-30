import type { Metadata } from 'next';
import { StudioLayout } from '@/components/layout/StudioLayout';
import { MobileStudioGate } from '@/components/layout/MobileStudioGate';

export const metadata: Metadata = {
  title: 'PixiBun Studio — Tactile Pixel Art & Animation',
  description:
    'The workspace: layers, onion skinning, palette ramps, and game-ready exports on one warm little desk.',
};

export default function StudioPage() {
  return (
    <>
      <MobileStudioGate />
      <div className="hidden lg:block w-full h-full">
        <StudioLayout />
      </div>
    </>
  );
}