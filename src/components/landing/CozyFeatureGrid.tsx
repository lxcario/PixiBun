'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CozyScrollReveal, PixelCorners } from './CozyScrollReveal';
import { CardGoldenChains } from './CardGoldenChains';
import { SceneBackdrop } from './night/SceneBackdrop';
import { NIGHT_VARS } from './night/nightPalette';
import { paintPromise, SCENE_H, SCENE_W, type PromiseKind } from './night/promiseScenes';

type Kind = PromiseKind;

const Vignette: React.FC<{ kind: Kind; active: boolean }> = ({ kind, active }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef(active);
  const reduceMotion = Boolean(useReducedMotion());
  activeRef.current = active;

  useEffect(() => {
    const g = ref.current?.getContext('2d');
    const el = ref.current;
    if (!g || !el) return;
    let raf = 0;
    let k = 0;
    let visible = typeof IntersectionObserver === 'undefined';
    const start = performance.now();
    const loop = () => {
      k += ((activeRef.current ? 1 : 0) - k) * 0.12;
      paintPromise(g, kind, reduceMotion ? 0 : performance.now() - start, reduceMotion ? (activeRef.current ? 1 : 0) : k);
      if (visible && !reduceMotion) raf = requestAnimationFrame(loop);
    };
    paintPromise(g, kind, 0, 0);
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
    });
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [kind, reduceMotion]);

  useEffect(() => {
    // Reduced motion still shows the hovered state, just without easing.
    if (!reduceMotion) return;
    const g = ref.current?.getContext('2d');
    if (g) paintPromise(g, kind, 0, active ? 1 : 0);
  }, [active, kind, reduceMotion]);

  return (
    <canvas
      ref={ref}
      width={SCENE_W}
      height={SCENE_H}
      aria-hidden="true"
      className="block w-full h-auto"
      style={{ imageRendering: 'pixelated', aspectRatio: `${SCENE_W} / ${SCENE_H}` }}
    />
  );
};

const PROMISES: Array<{ kind: Kind; tag: string; title: string; body: string; color: string }> = [
  {
    kind: 'door',
    tag: 'come on in',
    title: 'No account, ever.',
    body: 'Open the page and start drawing. There is nothing to sign up for.',
    color: '#ffd285',
  },
  {
    kind: 'fort',
    tag: 'no wifi? no worries',
    title: 'Works offline.',
    body: 'After your first visit the Desk keeps working without a connection, on a train or in a blanket fort.',
    color: '#dcabdf',
  },
  {
    kind: 'home',
    tag: 'yours to keep',
    title: 'Your art stays home.',
    body: 'Drawings save on your own device. Your artwork is never uploaded anywhere.',
    color: '#f2b8c6',
  },
  {
    kind: 'game',
    tag: 'press start',
    title: 'Ready for your game.',
    body: 'Sprite sheets, GIF, APNG and a Godot kit, ready to drop into a project.',
    color: '#a8e092',
  },
];

export const CozyFeatureGrid: React.FC = () => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section
      id="features"
      className="relative pt-28 pb-36 sm:pb-40 overflow-hidden scroll-mt-14 bg-[#110d22] text-[var(--text-heading)]"
      style={NIGHT_VARS}
    >
      <SceneBackdrop scene="garden" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#0b0714] to-transparent pointer-events-none" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[var(--desk-bg)] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 sm:px-8">
        <CozyScrollReveal variant="fade-up">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--accent-gold)]">little promises</p>
            <h2 className="mt-4 font-display text-3xl sm:text-5xl leading-[1.05] [text-shadow:0_4px_0_#0b0714]">
              Made to feel like home.
            </h2>
            <p className="mt-5 text-base sm:text-lg leading-relaxed text-[var(--text-body)]">
              A few things we keep true, however big PixiBun gets.
            </p>
          </div>
        </CozyScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PROMISES.map((promise, i) => (
            <CozyScrollReveal key={promise.kind} variant="fade-up" delayMs={i * 90} className="h-full">
              <motion.article
                onHoverStart={() => setHovered(i)}
                onHoverEnd={() => setHovered((h) => (h === i ? null : h))}
                whileHover={{ y: -8 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="relative h-full flex flex-col rounded-[2px] border-2 border-[#46306a] bg-[#1d1336]/90 backdrop-blur-sm px-6 pt-6 pb-7 shadow-[0_8px_0_#0b0714]"
              >
                <PixelCorners />
                <CardGoldenChains />
                <div className="border-2 border-[#0b0714] rounded-[1px] overflow-hidden shadow-[0_3px_0_#0b0714]">
                  <Vignette kind={promise.kind} active={hovered === i} />
                </div>
                <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: promise.color }}>
                  {promise.tag}
                </p>
                <h3 className="mt-2 font-display text-xl leading-tight text-[var(--text-heading)]">{promise.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-body)]">{promise.body}</p>
              </motion.article>
            </CozyScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
