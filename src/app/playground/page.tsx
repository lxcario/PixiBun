import type { Metadata } from 'next';
import { ResponsivePlayground } from '@/components/playground/ResponsivePlayground';

export const metadata: Metadata = {
  title: 'PixiBun Playground — Beginner Pixel Art Onboarding',
  description:
    'Learn pixel art animation step-by-step with Bun in a warm, cozy playground. Master squash and stretch, onion skinning, and frame timing.',
};

export default function PlaygroundPage() {
  return <ResponsivePlayground />;
}
