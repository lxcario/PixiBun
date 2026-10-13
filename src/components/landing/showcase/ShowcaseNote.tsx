'use client';

import React from 'react';
import Link from 'next/link';

interface ShowcaseNoteProps {
  kicker: string;
  title: string;
  body: string;
  tips: string[];
  cta: string;
  href?: string;
}

/** The short, friendly note that sits beside each workbench demo. */
export const ShowcaseNote: React.FC<ShowcaseNoteProps> = ({ kicker, title, body, tips, cta, href = '/studio' }) => (
  <div className="lg:col-span-5 flex flex-col items-start text-left">
    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent-gold)]">{kicker}</p>
    <h3 className="mt-3 font-display text-2xl sm:text-3xl leading-tight text-[var(--text-heading)]">{title}</h3>
    <p className="mt-4 text-sm sm:text-base leading-relaxed text-[var(--text-body)] max-w-md">{body}</p>

    <ul className="mt-6 w-full max-w-md space-y-2.5">
      {tips.map((tip, i) => (
        <li key={tip} className="flex items-start gap-3 text-sm text-[var(--text-body)]">
          <span
            aria-hidden="true"
            className="mt-0.5 shrink-0 grid place-items-center w-5 h-5 rounded-[2px] font-mono text-[10px] font-bold text-[#1d1336]"
            style={{ backgroundColor: ['#ffd285', '#dcabdf', '#a8e092'][i % 3] }}
          >
            {i + 1}
          </span>
          <span>{tip}</span>
        </li>
      ))}
    </ul>

    <Link
      href={href}
      className="group mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-[2px] pixel-primary-btn text-xs font-display font-bold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c]"
    >
      <span>{cta}</span>
      <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">
        →
      </span>
    </Link>
  </div>
);
