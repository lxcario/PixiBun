'use client';

import React from 'react';
import Link from 'next/link';
import { PixiBunLogo } from '@/components/ui/PixiBunLogo';

export const MobileStudioGate: React.FC = () => {
  return (
    <div className="lg:hidden fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--desk-bg)] text-[var(--text-heading)] p-6 text-center font-mono">
      <div className="mb-6 flex justify-center">
        <PixiBunLogo size="lg" className="drop-shadow-md" />
      </div>
      <h1 className="text-xl font-bold font-display text-[var(--accent-gold)] mb-3">
        Desk Too Small
      </h1>
      <p className="text-sm text-[var(--text-body)] mb-6 max-w-sm leading-relaxed">
        PixiBun Studio is a desktop workspace featuring multi-layer timelines, color ramps, and pixel math tools. Please open this studio on a laptop, desktop screen, or rotate your tablet to landscape mode (1024px+).
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="px-4 py-2 bg-[var(--desk-surface)] text-[var(--accent-gold)] border border-[var(--desk-border)] rounded text-xs font-bold hover:bg-[var(--desk-surface-raised)] transition-colors"
        >
          Return Home
        </Link>
        <Link
          href="/playground"
          className="px-4 py-2 bg-[var(--accent-gold)] text-[var(--desk-bg)] font-bold border border-[var(--ink)] rounded text-xs hover:bg-[var(--primary-hover)] transition-colors"
        >
          Try Pocket Doodle Pad
        </Link>
      </div>
    </div>
  );
};
