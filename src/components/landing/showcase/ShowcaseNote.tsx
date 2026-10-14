'use client';

import React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useQuests } from './quests';

interface ShowcaseNoteProps {
  kicker: string;
  title: string;
  body: string;
  tips: string[];
  cta: string;
  href?: string;
}

const CHECK = 'M8 0h2v2H8v2H6v2H4v2H2V6H0V4h2v2h2V4h2V2h2z';

/**
 * The note beside each workbench demo: what the tool is for, then a short
 * "try this" list that ticks itself off as the visitor plays with the demo.
 */
export const ShowcaseNote: React.FC<ShowcaseNoteProps> = ({ kicker, title, body, tips, cta, href = '/studio' }) => {
  const { done } = useQuests();
  const reduceMotion = Boolean(useReducedMotion());
  const tried = tips.filter((_, i) => done.has(i)).length;
  const all = tried === tips.length;

  return (
    <div className="lg:col-span-5 flex flex-col items-start text-left">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent-gold)]">{kicker}</p>
      <h3 className="mt-2 font-display text-xl sm:text-2xl leading-tight text-[var(--text-heading)]">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-body)] max-w-md">{body}</p>

      <div className="mt-4 w-full max-w-md rounded-[3px] border-2 border-dashed border-[color-mix(in_srgb,var(--accent-gold)_45%,var(--desk-border))] bg-[color-mix(in_srgb,var(--surface-0)_70%,transparent)] px-3.5 pt-3 pb-3.5">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span className="uppercase tracking-[0.18em] text-[var(--text-muted)]">try this</span>
          <span className="text-[var(--accent-gold)] tabular-nums" aria-live="polite">
            {tried} / {tips.length} tried
          </span>
        </div>
        <ul className="mt-2.5 space-y-2">
          {tips.map((tip, i) => {
            const isDone = done.has(i);
            return (
              <li key={tip} className="flex items-start gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className={`relative mt-0.5 shrink-0 grid place-items-center w-5 h-5 rounded-[2px] border-2 border-[var(--ink)] font-mono text-[10px] font-bold transition-colors duration-300 ${
                    isDone ? 'bg-[var(--accent-sage)] text-[var(--primary-fg)]' : 'bg-[var(--desk-surface-raised)] text-[var(--text-muted)]'
                  }`}
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    {isDone ? (
                      <motion.svg
                        key="done"
                        viewBox="0 0 10 8"
                        width="10"
                        height="8"
                        shapeRendering="crispEdges"
                        fill="currentColor"
                        initial={reduceMotion ? false : { scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 16 }}
                      >
                        <path d={CHECK} />
                      </motion.svg>
                    ) : (
                      <motion.span key="todo" exit={{ scale: 0 }}>
                        {i + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className={`transition-colors duration-300 ${isDone ? 'text-[var(--text-muted)] line-through decoration-[var(--accent-sage)] decoration-2' : 'text-[var(--text-body)]'}`}>
                  {tip}
                  <span className="sr-only">{isDone ? ' (tried)' : ''}</span>
                </span>
              </li>
            );
          })}
        </ul>
        <AnimatePresence>
          {all && (
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              className="mt-3 font-mono text-[11px] text-[var(--accent-sage)]"
            >
              ✦ nicely done. The full tool is waiting in the Studio.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <Link
        href={href}
        className={`group mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-[2px] pixel-primary-btn text-xs font-display font-bold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] ${all && !reduceMotion ? 'workbench-cta-ready' : ''}`}
      >
        <span>{cta}</span>
        <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">
          →
        </span>
      </Link>
    </div>
  );
};
