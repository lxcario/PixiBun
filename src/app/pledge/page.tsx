import type { Metadata } from 'next';
import Link from 'next/link';
import { PixiBunLogo } from '@/components/ui/PixiBunLogo';

export const metadata: Metadata = {
  title: 'Our pledge — PixiBun',
  description: 'Every pixel placed by a person. PixiBun contains no generative AI model and never trains on anyone’s art.',
};

const PLEDGE_DATE = '2026-10-14';

const PROMISES = [
  'PixiBun contains no generative AI model and never will.',
  'We never train anything on anyone’s art.',
  'Every automatic tool (lighting, image to pixels, cleanup, rotation) is a documented algorithm: the same input always makes the same pixels.',
  'Your drawings stay on your device. No accounts, no uploads, no telemetry. Co-draw sends strokes straight to the person you invite, and crash reports leave your device only if you turn them on.',
];

export default function PledgePage() {
  return (
    <main className="min-h-screen bg-[var(--desk-bg)] text-[var(--text-heading)] px-4 sm:px-6 py-12 sm:py-20">
      <article className="max-w-2xl mx-auto flex flex-col gap-8">
        <Link href="/" aria-label="PixiBun home" className="self-start">
          <PixiBunLogo size="md" />
        </Link>

        <header className="flex flex-col gap-3">
          <h1 className="font-display text-3xl sm:text-4xl leading-tight">Every pixel placed by a person.</h1>
          <p className="font-mono text-sm text-[var(--accent-gold)]">
            Our pledge, <time dateTime={PLEDGE_DATE}>14 October 2026</time>
          </p>
        </header>

        <ol className="flex flex-col gap-4 list-none p-0 m-0">
          {PROMISES.map((promise, index) => (
            <li
              key={index}
              className="flex gap-4 p-4 sm:p-5 bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] rounded-[2px]"
            >
              <span aria-hidden="true" className="font-display text-lg text-[var(--accent-gold)] shrink-0 w-6">
                {index + 1}
              </span>
              <p className="text-base leading-relaxed text-[var(--text-body)]">{promise}</p>
            </li>
          ))}
        </ol>

        <p className="text-base leading-relaxed text-[var(--text-body)]">If we ever break this, this page will say so.</p>

        <Link href="/studio" className="self-start font-mono text-sm text-[var(--accent-gold)] underline underline-offset-4 hover:opacity-80">
          Open the Desk →
        </Link>
      </article>
    </main>
  );
}
