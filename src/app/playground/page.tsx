import type { Metadata } from 'next';
import { PlaygroundLayout } from '@/components/layout/PlaygroundLayout';
import { PocketDoodlePad } from '@/components/playground/PocketDoodlePad';

export const metadata: Metadata = {
  title: 'PixiBun Playground — Beginner Pixel Art Onboarding',
  description:
    'Learn pixel art animation step-by-step with Bun in a warm, cozy playground. Master squash and stretch, onion skinning, and frame timing.',
};

export default function PlaygroundPage() {
  return (
    <>
      <PocketDoodlePad />
      <div className="hidden lg:block w-full h-full">
        <PlaygroundLayout />
      </div>
    </>
  );
}
