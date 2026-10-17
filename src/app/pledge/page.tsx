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
  'Lighting, image to pixels, cleanup and rotation use documented graphics algorithms with settings you control. They do not call a generative model.',
  'Drawings are saved in your browser, without an account or automatic artwork uploads. Local error and performance logs stay on your device unless you enable remote reporting. You choose whether to share a cart or join co-draw; Internet co-draw also contacts Google to help connect the peers.',
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
            {' · '}wording clarified <time dateTime="2026-10-15">15 October 2026</time>
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

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/studio" className="font-mono text-sm text-[var(--accent-gold)] underline underline-offset-4 hover:opacity-80">
            Open the Desk →
          </Link>
          <Link href="/verified" className="font-mono text-sm text-[var(--accent-gold)] underline underline-offset-4 hover:opacity-80">
            How PixiBun is tested →
          </Link>
        </div>
      </article>
    </main>
  );
}
