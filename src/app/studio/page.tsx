import type { Metadata } from 'next';
import { StudioLayout } from '@/components/layout/StudioLayout';

export const metadata: Metadata = {
  title: 'PixiBun Studio — Tactile Pixel Art & Animation',
  description:
    'The workspace: layers, onion skinning, palette ramps, and game-ready exports on one warm little desk.',
};

export default function StudioPage() {
  return <StudioLayout />;
}