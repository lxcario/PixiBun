'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { BUN_ACTIONS, INTRO_MS, MoonlitScene, type BunAction, type Constellation } from './moonlitScene';
import { useLiveThemeChoice } from '@/stores/themeStore';
import { isSceneTheme } from '@/lib/theme/registry';
import { buildScene, paintSceneParticles, type BuiltScene } from '@/lib/theme/scenes';
import { sceneColor } from '@/lib/theme/sceneRecolor';
import { CROSSFADE_MS, TIME_CHANGE_MS } from '@/lib/theme/themeTransition';
import { nextConstellationName, placeConstellationLabels } from './constellationLabels';
import { ambientTicker, tickWhileVisible, type AmbientTicker } from '../ambientClock';


const SEEN_KEY = 'pixibun_night_intro_v1';
const MAX_STARS = 14;

const REACTIONS: Record<BunAction, string> = {
  hop: 'Bun hops happily.',
  spin: 'Bun does a little spin.',
  wiggle: 'Bun wiggles with joy.',
  dance: 'Bun dances a tiny dance.',
  nap: 'Bun curls up for a quick nap.',
};

interface Label {
  id: number;
  name: string;
  x: number;
  y: number;
}

function ConstellationNames({ labels, reduceMotion }: { labels: Label[]; reduceMotion: boolean }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const section = overlay?.parentElement;
    const copy = section?.querySelector<HTMLElement>('[data-hero-copy]');
    if (!overlay || !section || !copy) return;
    let raf = 0, disposed = false;
    const measure = () => {
      if (disposed) return;
      const host = section.getBoundingClientRect(), text = copy.getBoundingClientRect();
      const px = host.width >= 1024 ? 4 : 3;
      const shift = Math.round((reduceMotion ? 0 : Math.max(0, window.scrollY) / px) * 0.5) * px;
      const spans = Array.from(overlay.querySelectorAll<HTMLElement>('[data-constellation-label]'));
      const measured = spans.map((span, i) => ({ id: labels[i].id, x: labels[i].x * px, y: labels[i].y * px + shift - 30, width: span.offsetWidth, height: span.offsetHeight }));
      const slots = placeConstellationLabels(measured,
        { x: 8, y: 80, width: Math.max(0, host.width - 16), height: Math.max(0, host.height * 0.64 - 80) },
        [{ x: text.x - host.x, y: text.y - host.y, width: text.width, height: text.height }]);
      for (let i = 0; i < spans.length; i++) {
        const slot = slots.get(labels[i].id);
        spans[i].style.visibility = slot ? 'visible' : 'hidden';
        if (slot) { spans[i].style.left = `${slot.x}px`; spans[i].style.top = `${slot.y}px`; }
      }
    };
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(section); observer.observe(copy);
    window.addEventListener('scroll', schedule, { passive: true });
    void document.fonts.ready.then(measure);
    measure();
    return () => { disposed = true; cancelAnimationFrame(raf); observer.disconnect(); window.removeEventListener('scroll', schedule); };
  }, [labels, reduceMotion]);
  return <div ref={overlayRef} className="absolute inset-0 pointer-events-none" aria-hidden="true">
    {labels.map(label => <span key={label.id} data-constellation-label style={{ visibility: 'hidden' }}
      className="absolute whitespace-nowrap font-mono text-[11px] tracking-wide text-[var(--accent-plum)] [text-shadow:0_1px_0_var(--desk-bg)]">
      ✦ {label.name}
    </span>)}
  </div>;
}

/** Text overlay timing: lines rise in as the town lights up. */
const reveal = (delay: number, skip: boolean) => ({
  initial: skip ? false : ({ opacity: 0, y: 24, filter: 'blur(6px)' } as const),
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.7, delay: skip ? 0 : delay, ease: [0.22, 1, 0.36, 1] as const },
});

function shouldSkipIntro(): boolean {
  try {
    if (sessionStorage.getItem(SEEN_KEY) === 'true') return true;
  } catch {
    // ignore unavailable storage
  }
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    Boolean(navigator.webdriver) ||
    window.location.search.includes('skipCurtain')
  );
}

export const NightHero: React.FC = () => {
  const reduceMotion = Boolean(useReducedMotion());
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<MoonlitScene | null>(null);
  const pxRef = useRef(4);
  const startRef = useRef(0);
  const look = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const tickerRef = useRef<AmbientTicker | null>(null);
  const constellations = useRef<Constellation[]>([]);
  const drawing = useRef<Constellation | null>(null);
  const bunAction = useRef<{ type: BunAction; start: number } | null>(null);
  const bunHover = useRef(false);
  const actionIndex = useRef(0);
  const renderNow = useRef<() => void>(() => {});
  const [skipIntro, setSkipIntro] = useState<boolean | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [announce, setAnnounce] = useState('');
  const labelId = useRef(0);
  // The painted night follows the studio theme: painted in its palette, by day or night,
  // with the theme's own drifting particles (petals, bubbles, sparks...) on top. The scene
  // paints its colors directly (sceneColor), so no frame is read back and recolored.
  const { studioTheme, colorScheme } = useLiveThemeChoice();
  const day = colorScheme === 'light';
  const themeRef = useRef({ studioTheme, day });
  const retheme = useRef<() => void>(() => {});
  useEffect(() => {
    themeRef.current = { studioTheme, day };
    retheme.current();
  }, [studioTheme, day]);

  const { scrollY } = useScroll();
  // On wide screens the copy drifts and fades as the scene scrolls away.
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  const copyY = useTransform(scrollY, [0, 700], [0, reduceMotion || !wide ? 0 : 120]);
  const copyOpacity = useTransform(scrollY, [0, 500], [1, wide ? 0 : 1]);

  const now = useCallback(() => performance.now() - startRef.current, []);

  useEffect(() => {
    const skip = shouldSkipIntro();
    setSkipIntro(skip);
    startRef.current = performance.now() - (skip ? INTRO_MS + 1200 : 0);
    if (!skip) {
      const id = window.setTimeout(() => {
        try {
          sessionStorage.setItem(SEEN_KEY, 'true');
        } catch {
          // ignore
        }
      }, INTRO_MS);
      return () => window.clearTimeout(id);
    }
  }, []);

  // Scene lifecycle: build on resize, animate while on screen.
  useEffect(() => {
    if (skipIntro === null) return;
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!section || !canvas || !ctx) return;

    const frozen = reduceMotion;
    let motes: BuiltScene | null = null;
    const buildMotes = (w: number, h: number) => {
      const { studioTheme: theme, day: isDay } = themeRef.current;
      motes = isSceneTheme(theme) ? buildScene(theme, isDay, w, h) : null;
    };

    // Switching Day/Night changes the time inside the painting: for a moment both
    // landscapes render, the old one fading over the new, while the old sun or
    // moon sets behind the hills and the new one rises (MoonlitScene timeChange).
    let change: { start: number; toDay: boolean; from: MoonlitScene; layer: CanvasRenderingContext2D } | null = null;

    const build = () => {
      change = null;
      const rect = section.getBoundingClientRect();
      const PX = rect.width >= 1024 ? 4 : 3;
      pxRef.current = PX;
      const w = Math.ceil(rect.width / PX);
      const h = Math.ceil(rect.height / PX);
      // A hidden or collapsed host has no pixels to paint; wait for ResizeObserver.
      if (w < 1 || h < 1) { sceneRef.current = null; return; }
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w * PX}px`;
      canvas.style.height = `${h * PX}px`;
      ctx.imageSmoothingEnabled = false;
      const { studioTheme: theme, day: isDay } = themeRef.current;
      sceneRef.current = new MoonlitScene(w, h, ctx, isDay, sceneColor(theme, isDay, true));
      buildMotes(w, h);
    };

    const draw = () => {
      const scene = sceneRef.current;
      if (!scene) return;
      const l = look.current;
      l.x += (l.tx - l.x) * 0.06;
      l.y += (l.ty - l.y) * 0.06;
      const t = frozen ? INTRO_MS + 1200 : now();
      const p = change ? (now() - change.start) / TIME_CHANGE_MS : 1;
      if (change && p >= 1) change = null;
      const input = {
        t,
        lookX: frozen ? 0 : l.x,
        lookY: frozen ? 0 : l.y,
        scroll: frozen ? 0 : Math.max(0, window.scrollY) / pxRef.current,
        constellations: drawing.current ? [...constellations.current, drawing.current] : constellations.current,
        bunAction: bunAction.current,
        bunHover: bunHover.current,
        timeChange: change ? { p, toDay: change.toDay } : undefined,
      };
      scene.render(ctx, input);
      if (change) {
        // The old time of day fades out over the new one as the sun and moon trade places. The
        // colors finish with the page's crossfade; the sun and moon keep moving a little longer.
        change.from.render(change.layer, input);
        const fade = Math.min(1, Math.max(0, (p * TIME_CHANGE_MS) / CROSSFADE_MS));
        ctx.globalAlpha = 1 - fade * fade * (3 - 2 * fade);
        ctx.drawImage(change.layer.canvas, 0, 0);
        ctx.globalAlpha = 1;
      }
      // The hero paints its own stars; add only the theme's other particles.
      if (motes) paintSceneParticles(ctx, motes, t, ['stars']);
    };
    renderNow.current = draw;
    retheme.current = () => {
      const old = sceneRef.current;
      if (!old) return;
      // A new theme or time of day repaints the landscape in its colors; the town is seeded, so it stays.
      build();
      if (old.day !== themeRef.current.day && !frozen && sceneRef.current) {
        const layer = document.createElement('canvas');
        layer.width = canvas.width;
        layer.height = canvas.height;
        const layerCtx = layer.getContext('2d');
        if (layerCtx) {
          layerCtx.imageSmoothingEnabled = false;
          change = { start: now(), toDay: themeRef.current.day, from: old, layer: layerCtx };
          tickerRef.current?.boost(TIME_CHANGE_MS + 100);
        }
      }
      draw();
    };

    build();
    draw();

    const ro = new ResizeObserver(() => {
      build();
      draw();
    });
    ro.observe(section);
    // Calm 20 fps when idle; full rate through the intro and whenever the pointer moves.
    const ticker = ambientTicker(draw, 20);
    tickerRef.current = ticker;
    const stop = tickWhileVisible(section, ticker, !frozen);
    if (!frozen) ticker.boost(Math.max(0, INTRO_MS + 1200 - now()));

    return () => {
      stop();
      tickerRef.current = null;
      ro.disconnect();
      retheme.current = () => {};
    };
  }, [skipIntro, reduceMotion, now]);

  const toLogical = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const PX = pxRef.current;
    return { x: Math.floor((clientX - rect.left) / PX), y: Math.floor((clientY - rect.top) / PX) };
  };
  const skyShift = () => Math.round((reduceMotion ? 0 : Math.max(0, window.scrollY) / pxRef.current) * 0.5);

  const finishConstellation = useCallback((c: Constellation | null) => {
    if (!c || c.stars.length === 0) return;
    if (c.stars.length >= 3) {
      c.name = nextConstellationName(constellations.current.flatMap(item => item.name ? [item.name] : []));
      const cx = c.stars.reduce((s, p) => s + p.x, 0) / c.stars.length;
      const top = Math.min(...c.stars.map((p) => p.y));
      const id = labelId.current++;
      setLabels((all) => [...all, { id, name: c.name!, x: cx, y: top }].slice(-4));
      setAnnounce(`You drew a constellation of ${c.stars.length} stars. Bun named it ${c.name}.`);
    }
    constellations.current = [...constellations.current, c].slice(-6);
    renderNow.current();
  }, []);

  /** Each boop gets a different reaction, cycling hop → spin → wiggle → dance → nap. */
  const react = (t: number) => {
    const type = BUN_ACTIONS[actionIndex.current++ % BUN_ACTIONS.length];
    bunAction.current = { type, start: t };
    setAnnounce(REACTIONS[type]);
    renderNow.current();
  };

  const isInteractive = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest('a, button, [data-hero-copy-text]'));

  const onPointerDown = (e: React.PointerEvent) => {
    tickerRef.current?.boost(1500);
    const scene = sceneRef.current;
    if (!scene || isInteractive(e.target)) return;
    const t = now();
    // Any tap during the intro fast-forwards it.
    if (t < INTRO_MS && !reduceMotion) {
      startRef.current -= INTRO_MS - t;
      return;
    }
    const p = toLogical(e.clientX, e.clientY);
    const box = scene.bunBox(t);
    if (p.x >= box.x - 2 && p.x <= box.x + box.w + 2 && p.y >= box.y - 2 && p.y <= box.y + box.h + 2) {
      react(t);
      return;
    }
    const y = p.y - skyShift();
    if (!scene.isSky(p.x, y)) return;
    e.preventDefault();
    (e.currentTarget).setPointerCapture?.(e.pointerId);
    drawing.current = { stars: [{ x: p.x, y, born: t, hue: Math.random() }] };
    renderNow.current();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    tickerRef.current?.boost(1000);
    const section = sectionRef.current;
    const scene = sceneRef.current;
    if (!section || !scene) return;
    const rect = section.getBoundingClientRect();
    look.current.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    look.current.ty = ((e.clientY - rect.top) / rect.height) * 2 - 1;

    const p = toLogical(e.clientX, e.clientY);
    const t = now();
    const c = drawing.current;
    if (c) {
      const last = c.stars[c.stars.length - 1];
      const y = p.y - skyShift();
      if (c.stars.length < MAX_STARS && Math.hypot(p.x - last.x, y - last.y) >= 9 && scene.isSky(p.x, y)) {
        c.stars.push({ x: p.x, y, born: t, hue: Math.random() });
        renderNow.current();
      }
      return;
    }
    if (isInteractive(e.target)) {
      section.style.cursor = '';
      bunHover.current = false;
      return;
    }
    const box = scene.bunBox(t);
    const overBun = p.x >= box.x - 2 && p.x <= box.x + box.w + 2 && p.y >= box.y - 2 && p.y <= box.y + box.h + 2;
    bunHover.current = overBun && t > INTRO_MS - 800;
    section.style.cursor = overBun ? 'pointer' : scene.isSky(p.x, p.y - skyShift()) ? 'crosshair' : '';
  };

  const onPointerUp = () => {
    const c = drawing.current;
    drawing.current = null;
    finishConstellation(c);
  };

  const skip = skipIntro !== false;

  return (
    <section
      ref={sectionRef}
      aria-label="Welcome to PixiBun"
      className="landing-hero relative min-h-[max(100svh,640px)] overflow-hidden bg-[var(--desk-bg)] text-[var(--text-heading)] select-none"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => {
        bunHover.current = false;
      }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="A pixel-art night: a little town under the moon, fireflies, and Bun the rabbit painting her own portrait at an easel beside a lantern."
        className="absolute top-0 left-0 pixelated"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Constellation names float with the sky */}
      <ConstellationNames labels={labels} reduceMotion={reduceMotion} />

      {/* Soft vignette so the copy always reads; its color blends with the theme on Day/Night (theme-transition.css) */}
      <div
        aria-hidden="true"
        className="hero-vignette absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 58% 72% at 20% 50%, color-mix(in srgb, var(--desk-bg) 72%, transparent) 0%, color-mix(in srgb, var(--desk-bg) 35%, transparent) 45%, transparent 72%)' }}
      />

      {skipIntro !== null && (
        <motion.div
          style={{ y: copyY, opacity: copyOpacity }}
          className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 pt-28 sm:pt-32 lg:pt-36 pb-20 sm:pb-24 lg:pb-0"
        >
          <div data-hero-copy className="max-w-xl">
            <motion.p
              {...reveal(1.3, skip)}
              className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.2em] uppercase text-[var(--accent-gold)]"
            >
              <span aria-hidden="true" className="inline-block w-2 h-2 bg-[var(--accent-gold)] animate-pulse" />
              hand-made, never generated
            </motion.p>

            <h1
              className="mt-5 font-display leading-[1.02] tracking-tight [text-shadow:0_4px_0_var(--desk-bg)]"
              style={{ fontSize: 'clamp(2.5rem, 6.4vw, 5.4rem)' }}
            >
              {[
                ['Pixels', false],
                ['with', false],
                ['a', false],
                ['pulse.', true],
              ].map(([word, gold], i) => (
                <span key={word as string} className="inline-block overflow-hidden align-bottom pb-[0.08em] mr-[0.28em]">
                  <motion.span
                    className={`inline-block ${gold ? 'text-[var(--accent-gold)]' : ''}`}
                    initial={skip ? false : { y: '110%', rotate: 6 }}
                    animate={{ y: '0%', rotate: 0 }}
                    transition={{ duration: 0.8, delay: skip ? 0 : 1.5 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={reduceMotion ? undefined : { y: -6, rotate: i % 2 ? 3 : -3 }}
                  >
                    {word}
                  </motion.span>
                </span>
              ))}
            </h1>

            <motion.p
              {...reveal(2.1, skip)}
              data-hero-copy-text
              className="mt-6 max-w-md text-base sm:text-lg leading-relaxed text-[var(--text-body)] [text-shadow:0_1px_0_var(--desk-bg)] select-text"
            >
              A cozy pixel studio in your browser. Draw a little sprite, move the Lamp to light it, and loop a few
              frames into something alive. Hand-made, never generated. No account.
            </motion.p>

            <motion.div {...reveal(2.35, skip)} className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/studio"
                className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-[2px] pixel-primary-btn font-display text-sm font-bold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
              >
                <span>OPEN THE DESK</span>
                <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1.5">
                  →
                </span>
              </Link>
              <a
                href="#a-night-at-the-desk"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-[2px] border-2 border-[color-mix(in_srgb,var(--text-heading)_30%,transparent)] bg-[color-mix(in_srgb,var(--desk-bg)_45%,transparent)] backdrop-blur-sm font-mono text-xs font-bold tracking-wide text-[var(--text-heading)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
              >
                see how a night goes
                <span aria-hidden="true">↓</span>
              </a>
            </motion.div>

            <motion.ul
              {...reveal(2.5, skip)}
              className="mt-6 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] tracking-wide text-[var(--text-muted)]"
            >
              <li>✦ no account</li>
              <li>✦ works offline</li>
              <li>✦ saves to your device</li>
            </motion.ul>
          </div>
        </motion.div>
      )}

      <span className="sr-only" aria-live="polite">
        {announce}
      </span>

      {/* Dawn fade into the rest of the page */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-20 pointer-events-none bg-gradient-to-b from-transparent to-[var(--desk-bg)]"
      />
    </section>
  );
};
