'use client';

import { usePathname } from 'next/navigation';

export function SkipToContent() {
  const pathname = usePathname();
  return <a tabIndex={0} href={pathname === '/' ? '#top' : '#main-workspace'}
    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-[99999] px-4 py-2 bg-[var(--desk-surface)] text-[var(--accent-gold)] border-2 border-[var(--accent-gold)] font-mono text-xs rounded shadow-lg">
    Skip to content
  </a>;
}
