'use client';

import React from 'react';
import Link from 'next/link';
import { BunMascot } from '@/components/ui/BunMascot';

export const MobileStudioGate: React.FC = () => {
  return (
    <div className="lg:hidden fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--desk-bg)] text-[var(--text-heading)] p-6 text-center font-mono">
      <div className="w-20 h-20 bg-[var(--desk-surface-raised)] border-2 border-[var(--accent-gold)] rounded-full flex items-center justify-center mb-6 shadow-[0_4px_0_var(--desk-border)]">
        <BunMascot size={48} pose="idle" />
      </div>
      <h1 className="text-xl font-bold font-display text-[var(--accent-gold)] mb-3">
        Desk Too Small
      </h1>
      <p className="text-sm text-[var(--text-body)] mb-6 max-w-sm leading-relaxed">
        PixiBun Atelier is a desktop workstation featuring multi-layer timelines, color ramps, and pixel math tools. Please open this studio on a laptop, desktop screen, or rotate your tablet to landscape mode (1024px+).
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
          className="px-4 py-2 bg-[#f0be7c] text-[#140d1f] font-bold border border-[#8c5120] rounded text-xs hover:bg-[#ffd699] transition-colors"
        >
          Try Pocket Doodle Pad
        </Link>
      </div>
    </div>
  );
};
