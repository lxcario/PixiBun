'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { BUN_ACTIONS, INTRO_MS, MoonlitScene, type BunAction, type Constellation } from './moonlitScene';

const SEEN_KEY = 'pixibun_night_intro_v1';
const MAX_STARS = 14;
const NAMES = [
  'The Sleepy Teacup',
  "Bun's Left Ear",
  'The Lost Mitten',
  'The Great Dumpling',
  'Two Moths Gossiping',
  'The Midnight Snack',
  'The Wobbly Kettle',
  'A Cat Pretending Not to Care',
  'The Little Paintbrush',
  "Grandma's Cardigan",
  'The Forgotten Sock',
  'Three Peas, Arguing',
];

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
  points: Array<{ x: number; y: number }>;
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

  const { scrollY } = useScroll();
  const labelShift = useTransform(scrollY, (v) => v * 0.5);
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

    let raf = 0;
    let visible = true;
    const frozen = reduceMotion;

    const build = () => {
      const rect = section.getBoundingClientRect();
      const PX = rect.width >= 1024 ? 4 : 3;
      pxRef.current = PX;
      const w = Math.ceil(rect.width / PX);
      const h = Math.ceil(rect.height / PX);
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w * PX}px`;
      canvas.style.height = `${h * PX}px`;
      ctx.imageSmoothingEnabled = false;
      sceneRef.current = new MoonlitScene(w, h, ctx);
    };

    const draw = () => {
      const scene = sceneRef.current;
      if (!scene) return;
      const l = look.current;
      l.x += (l.tx - l.x) * 0.06;
      l.y += (l.ty - l.y) * 0.06;
      const t = frozen ? INTRO_MS + 1200 : now();
      scene.render(ctx, {
        t,
        lookX: frozen ? 0 : l.x,
        lookY: frozen ? 0 : l.y,
        scroll: frozen ? 0 : Math.max(0, window.scrollY) / pxRef.current,
        constellations: drawing.current ? [...constellations.current, drawing.current] : constellations.current,
        bunAction: bunAction.current,
        bunHover: bunHover.current,
      });
    };
    renderNow.current = draw;

    const loop = () => {
      draw();
      if (visible && !frozen) raf = requestAnimationFrame(loop);
    };

    build();
    loop();

    const ro = new ResizeObserver(() => {
      build();
      draw();
    });
    ro.observe(section);
    const io = new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting;
      if (visible && !was && !frozen) raf = requestAnimationFrame(loop);
    });
    io.observe(section);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
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
      c.name = NAMES[Math.floor(Math.random() * NAMES.length)];
      const cx = c.stars.reduce((s, p) => s + p.x, 0) / c.stars.length;
      const top = Math.min(...c.stars.map((p) => p.y));
      const PX = pxRef.current;
      const id = labelId.current++;
      setLabels((all) => [...all, { id, name: c.name!, x: cx * PX, y: top * PX - 30, points: c.stars.map(({ x, y }) => ({ x, y })) }].slice(-4));
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
      className="relative min-h-[max(100svh,640px)] overflow-hidden bg-[#0d0a1c] text-[#fff3e0] select-none"
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
        aria-label="A pixel-art night: a little town under the moon, fireflies, and Bun the rabbit painting a ghost at an easel beside a lantern."
        className="absolute top-0 left-0 pixelated"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Constellation names float with the sky */}
      <motion.div style={{ y: labelShift }} className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <AnimatePresence>
          {labels.map((label) => (
            <motion.span
              key={label.id}
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="absolute -translate-x-1/2 whitespace-nowrap font-mono text-[11px] tracking-wide text-[#f6d7f7] [text-shadow:0_1px_0_#0d0a1c]"
              style={{ left: label.x, top: label.y }}
            >
              ✦ {label.name}
            </motion.span>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Soft vignette so the copy always reads */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 55% at 22% 38%, rgba(13,10,28,0.55) 0%, transparent 70%)' }}
      />

      {skipIntro !== null && (
        <motion.div
          style={{ y: copyY, opacity: copyOpacity }}
          className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 pt-28 sm:pt-32 lg:pt-36 pb-20 sm:pb-24 lg:pb-0"
        >
          <div className="max-w-xl">
            <motion.p
              {...reveal(1.3, skip)}
              className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.2em] uppercase text-[#f0be7c]"
            >
              <span aria-hidden="true" className="inline-block w-2 h-2 bg-[#f0be7c] animate-pulse" />
              a cozy pixel atelier
            </motion.p>

            <h1
              className="mt-5 font-display leading-[1.02] tracking-tight [text-shadow:0_4px_0_#0d0a1c]"
              style={{ fontSize: 'clamp(2.5rem, 6.4vw, 5.4rem)' }}
            >
              {[
                ['Draw', false],
                ['tiny', true],
                ['worlds', true],
                ['by', false],
                ['lamplight.', false],
              ].map(([word, gold], i) => (
                <span key={word as string} className="inline-block overflow-hidden align-bottom pb-[0.08em] mr-[0.28em]">
                  <motion.span
                    className={`inline-block ${gold ? 'text-[#ffd285]' : ''}`}
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
              className="mt-6 max-w-md text-base sm:text-lg leading-relaxed text-[#e9dcf2] [text-shadow:0_1px_0_#0d0a1c] select-text"
            >
              PixiBun is an offline-first pixel art atelier &amp; 2.5D game studio. Draw a little sprite, try a
              different light, or bring a few frames to life. Share an image or animation, and take a Godot kit into
              your game.
            </motion.p>

            <motion.div {...reveal(2.35, skip)} className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/studio"
                className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-[2px] pixel-primary-btn font-display text-sm font-bold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c]"
              >
                <span>OPEN THE ATELIER</span>
                <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1.5">
                  →
                </span>
              </Link>
              <a
                href="#a-night-at-the-atelier"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-[2px] border-2 border-[#fff3e0]/30 bg-[#0d0a1c]/40 backdrop-blur-sm font-mono text-xs font-bold tracking-wide text-[#fff3e0] hover:border-[#f0be7c] hover:text-[#ffd285] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0be7c]"
              >
                see how a night goes
                <span aria-hidden="true">↓</span>
              </a>
            </motion.div>

            <motion.ul
              {...reveal(2.5, skip)}
              className="mt-6 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] tracking-wide text-[#cdbfdf]"
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
