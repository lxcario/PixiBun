'use client';

import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BunMascot } from '@/components/ui/BunMascot';
import { SceneCanvas } from '@/components/layout/StudioSkyBackdrop';
import { setToolPreviewsDisabled } from '@/components/ui/ToolMotionPreview';
import { STUDIO_THEMES, type StudioThemeDefinition, type ThemePalette } from '@/lib/theme/registry';
import { useThemeStore } from '@/stores/themeStore';
import { usePreferencesStore, type Experience } from '@/stores/preferencesStore';
import { ICONS, PixelArt } from './PixelArt';

export type WelcomeChoice =
  | { kind: 'blank'; size: number }
  | { kind: 'starter'; templateId: string }
  | { kind: 'lessons' }
  | { kind: 'keep' };

type Step = 'hello' | 'skill' | 'look' | 'tour' | 'start';

const SKILLS: Array<{ id: Experience; title: string; body: string; icon: keyof typeof ICONS }> = [
  { id: 'new', title: "I'm new to pixel art", body: 'Friendly tips as you go, hover previews for every tool and a guided first sprite.', icon: 'seedling' },
  { id: 'some', title: "I've made a few sprites", body: "Tips only for PixiBun's own tricks, like the Lamp, color cycling and the Godot kit.", icon: 'sprite' },
  { id: 'pro', title: 'Pixel pro', body: 'No tips and no hover previews. Everything where you expect it.', icon: 'crown' },
];

const STARTS: Record<Experience, Array<{ id: string; title: string; body: string; icon: keyof typeof ICONS | 'bun'; choice: WelcomeChoice }>> = {
  new: [
    { id: 'lessons', title: 'Draw Bun with me', body: 'A guided lesson: one sprite, step by step.', icon: 'book', choice: { kind: 'lessons' } },
    { id: 'blank-16', title: 'Blank 16×16', body: 'Tiny and forgiving. Perfect for a first sprite.', icon: 'canvas', choice: { kind: 'blank', size: 16 } },
    { id: 'starter-bun', title: 'Start from Bun', body: 'Recolor and remix a finished sprite.', icon: 'bun', choice: { kind: 'starter', templateId: 'bun' } },
  ],
  some: [
    { id: 'blank-32', title: 'Blank 32×32', body: 'Room for a character with a little detail.', icon: 'canvas', choice: { kind: 'blank', size: 32 } },
    { id: 'starter-bun', title: 'Start from Bun', body: 'Then try the Lamp on a finished sprite.', icon: 'bun', choice: { kind: 'starter', templateId: 'bun' } },
    { id: 'blank-16', title: 'Blank 16×16', body: 'Quick icons and items.', icon: 'canvas', choice: { kind: 'blank', size: 16 } },
  ],
  pro: [
    { id: 'blank-32', title: 'Blank 32×32', body: 'The usual.', icon: 'canvas', choice: { kind: 'blank', size: 32 } },
    { id: 'blank-48', title: 'Blank 48×48', body: 'Portraits, bosses and tiles.', icon: 'canvas', choice: { kind: 'blank', size: 48 } },
    { id: 'keep', title: 'Keep this canvas', body: 'Straight to work.', icon: 'sprite', choice: { kind: 'keep' } },
  ],
};

/**
 * First-run journey for the Studio. It opens for people who have never
 * finished or skipped it, and on demand with ?welcome=1. Automated browsers
 * (navigator.webdriver) do not get it unasked, so test runs start on the Desk.
 */
export function shouldOpenWelcome(url: URL, onboardedAt: number | null, webdriver: boolean): boolean {
  if (url.searchParams.get('welcome') === '1') return true;
  return onboardedAt === null && !webdriver;
}

const ORDER: Step[] = ['hello', 'skill', 'look', 'tour', 'start'];

export const WelcomeJourney: React.FC<{ ready: boolean; onStart: (choice: WelcomeChoice) => void }> = ({ ready, onStart }) => {
  const titleId = useId();
  const reduce = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('hello');
  const [direction, setDirection] = useState(1);
  const [skipStart, setSkipStart] = useState(false);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
  const experience = usePreferencesStore(s => s.experience);
  const setExperience = usePreferencesStore(s => s.setExperience);
  const completeOnboarding = usePreferencesStore(s => s.completeOnboarding);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!shouldOpenWelcome(url, usePreferencesStore.getState().onboardedAt, navigator.webdriver === true)) return;
    // Arriving with a starter or size already chosen: that drawing is the start.
    setSkipStart(url.searchParams.has('template') || url.searchParams.has('width') || url.searchParams.has('replay'));
    setOpen(true);
  }, []);

  // "Replay welcome" in the Studio menu reopens the journey from the start.
  const welcomeRequests = usePreferencesStore(s => s.welcomeRequests);
  useEffect(() => {
    if (welcomeRequests === 0) return;
    setSkipStart(false);
    setDirection(1);
    setStep('hello');
    setOpen(true);
  }, [welcomeRequests]);

  const steps = useMemo(() => ORDER.filter(s => s !== 'start' || !skipStart), [skipStart]);
  const index = steps.indexOf(step);

  const go = useCallback((next: Step) => {
    setDirection(steps.indexOf(next) >= steps.indexOf(step) ? 1 : -1);
    setStep(next);
  }, [step, steps]);

  const finish = useCallback((choice: WelcomeChoice | null) => {
    const level = usePreferencesStore.getState().experience;
    if (level) setToolPreviewsDisabled(level === 'pro');
    completeOnboarding();
    const url = new URL(window.location.href);
    if (url.searchParams.has('welcome')) {
      url.searchParams.delete('welcome');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    setOpen(false);
    if (choice && choice.kind !== 'keep') onStart(choice);
  }, [completeOnboarding, onStart]);

  const next = useCallback(() => {
    const following = steps[index + 1];
    if (following) go(following);
    else finish(null);
  }, [finish, go, index, steps]);

  // Focus the step's first control and keep Tab inside the dialog.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open, step]);

  // Escape closes the journey wherever focus is (WebKit can leave it on the opener).
  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      finish(null);
    };
    window.addEventListener('keydown', onEscape, true);
    return () => window.removeEventListener('keydown', onEscape, true);
  }, [finish, open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex="0"]'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  if (!open) return null;

  const slide = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 48, filter: 'blur(2px)' }),
    center: { opacity: 1, x: 0, filter: 'blur(0px)' },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -48, filter: 'blur(2px)' }),
  };

  if (step === 'tour') {
    return <Spotlight reduce={reduce} onDone={next} />;
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" data-testid="welcome-journey">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          background: step === 'look' ? 'color-mix(in srgb, var(--desk-bg) 35%, transparent)' : 'color-mix(in srgb, var(--desk-bg) 72%, transparent)',
          backdropFilter: step === 'look' ? 'blur(1px)' : 'blur(6px)',
          transition: 'background 300ms ease, backdrop-filter 300ms ease',
        }}
      />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="relative w-full max-w-[760px] max-h-[calc(100dvh-32px)] overflow-y-auto overflow-x-hidden rounded-[14px] border-2 border-[var(--ink)] bg-[var(--desk-surface)] text-[var(--text-heading)] shadow-[0_6px_0_var(--ink),0_30px_80px_var(--shadow-far)]"
      >
        {/* Progress and skip */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-1.5" aria-label={`Step ${index + 1} of ${steps.length}`} role="img">
            {steps.map((s, i) => (
              <motion.span
                key={s}
                className="block h-2 rounded-[1px]"
                animate={{ width: i === index ? 22 : 8, backgroundColor: i <= index ? 'var(--accent-gold)' : 'var(--desk-border)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              />
            ))}
          </div>
          <button
            type="button"
            data-testid="welcome-skip"
            onClick={() => finish(null)}
            className="text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-heading)] underline-offset-4 hover:underline cursor-pointer px-2 py-1 rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
          >
            Skip setup
          </button>
        </div>

        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduce ? 0.12 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="px-6 pb-6 pt-4"
            data-testid={`welcome-step-${step}`}
          >
            {step === 'hello' && <Hello titleId={titleId} reduce={reduce} onNext={next} />}
            {step === 'skill' && (
              <Skill
                titleId={titleId}
                value={experience}
                onPick={level => setExperience(level)}
                onBack={() => go('hello')}
                onNext={next}
              />
            )}
            {step === 'look' && <Look titleId={titleId} reduce={reduce} onBack={() => go('skill')} onNext={next} />}
            {step === 'start' && (
              <Start
                titleId={titleId}
                experience={experience ?? 'new'}
                ready={ready}
                onPick={(choice, at) => {
                  if (reduce) { finish(choice); return; }
                  setBurst(at);
                  window.setTimeout(() => finish(choice), 650);
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
      {burst && <Confetti x={burst.x} y={burst.y} />}
    </div>
  );
};

/* ─────────────────────────────── Steps ─────────────────────────────── */

const Hello: React.FC<{ titleId: string; reduce: boolean; onNext: () => void }> = ({ titleId, reduce, onNext }) => (
  <div className="flex flex-col items-center text-center gap-4 py-4">
    <div className="relative h-[120px] w-[160px]">
      {!reduce && [[-58, 18], [58, 8], [-40, 84], [52, 78]].map(([x, y], i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="absolute left-1/2 block h-2 w-2 bg-[var(--accent-gold)]"
          style={{ top: y, marginLeft: x }}
          initial={{ scale: 0, opacity: 0, rotate: 45 }}
          animate={{ scale: [0, 1.2, 0.8, 1], opacity: [0, 1, 0.6, 1] }}
          transition={{ delay: 0.5 + i * 0.12, duration: 0.9, repeat: Infinity, repeatType: 'reverse', repeatDelay: 1.2 }}
        />
      ))}
      <motion.div
        className="absolute left-1/2 bottom-2 -translate-x-1/2"
        initial={reduce ? false : { y: -90, opacity: 0 }}
        animate={reduce ? undefined : { y: [-90, 0, -14, 0], scaleY: [1, 0.82, 1.08, 1], scaleX: [1, 1.18, 0.94, 1], opacity: 1 }}
        transition={{ duration: 0.9, times: [0, 0.55, 0.78, 1], ease: 'easeOut' }}
        style={{ originY: 1 }}
      >
        <BunMascot size={96} pose="happy" />
      </motion.div>
    </div>
    <h2 id={titleId} className="font-display text-2xl sm:text-3xl leading-tight">Welcome to the Desk</h2>
    <p className="max-w-md text-sm leading-relaxed text-[var(--text-body)]">
      I&apos;m Bun. Let&apos;s set up your studio the way you like it. It takes about thirty seconds, and you can change everything later.
    </p>
    <button type="button" data-autofocus onClick={onNext} className="mt-2 pixel-primary-btn px-6 py-3 rounded-[6px] font-display text-sm cursor-pointer">
      Set up my Desk →
    </button>
  </div>
);

const Skill: React.FC<{ titleId: string; value: Experience | null; onPick: (e: Experience) => void; onBack: () => void; onNext: () => void }> = ({ titleId, value, onPick, onBack, onNext }) => (
  <div className="flex flex-col gap-4">
    <div>
      <h2 id={titleId} className="font-display text-xl sm:text-2xl leading-tight">Have you made pixel art before?</h2>
      <p className="mt-1 text-sm text-[var(--text-body)]">This only changes tips and defaults. Every tool stays available.</p>
    </div>
    <div role="radiogroup" aria-labelledby={titleId} className="grid gap-3 sm:grid-cols-3">
      {SKILLS.map((skill, i) => {
        const selected = value === skill.id;
        return (
          <motion.button
            key={skill.id}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`skill-option-${skill.id}`}
            data-autofocus={i === 0 ? true : undefined}
            onClick={() => onPick(skill.id)}
            whileHover={{ y: -3 }}
            
            className={`relative flex flex-col items-start gap-3 rounded-[10px] border-2 p-4 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] ${
              selected ? 'border-[var(--accent-gold)] bg-[var(--state-active)] shadow-[0_3px_0_var(--ink)]' : 'border-[var(--desk-border)] bg-[var(--desk-surface-raised)] hover:border-[var(--desk-border-highlight)]'
            }`}
          >
            <motion.span animate={selected ? { rotate: [0, -8, 8, 0], scale: [1, 1.15, 1] } : {}} transition={{ duration: 0.45 }}>
              <PixelArt {...ICONS[skill.icon]} size={40} />
            </motion.span>
            <span className="font-semibold text-sm">{skill.title}</span>
            <span className="text-xs leading-relaxed text-[var(--text-body)]">{skill.body}</span>
            <AnimatePresence>
              {selected && (
                <motion.span
                  aria-hidden="true"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-[4px] border-2 border-[var(--ink)] bg-[var(--primary-bg)] text-[10px] text-[var(--primary-fg)]"
                >
                  ✓
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
    <NavRow onBack={onBack} onNext={onNext} nextDisabled={!value} />
  </div>
);

const Look: React.FC<{ titleId: string; reduce: boolean; onBack: () => void; onNext: () => void }> = ({ titleId, reduce, onBack, onNext }) => {
  const studioTheme = useThemeStore(s => s.studioTheme);
  const colorScheme = useThemeStore(s => s.colorScheme);
  const setStudioTheme = useThemeStore(s => s.setStudioTheme);
  const setColorScheme = useThemeStore(s => s.setColorScheme);
  const day = colorScheme === 'light';
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={titleId} className="font-display text-xl sm:text-2xl leading-tight">Pick your Desk</h2>
          <p className="mt-1 text-sm text-[var(--text-body)]">Every look has a Day and a Night. Your studio changes behind this card as you choose.</p>
        </div>
        <DayNightSwitch day={day} reduce={reduce} onChange={next => setColorScheme(next ? 'light' : 'dark')} />
      </div>
      <div role="radiogroup" aria-label="Studio style" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STUDIO_THEMES.map((theme, i) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            day={day}
            selected={studioTheme === theme.id}
            autofocus={studioTheme === theme.id || (i === 0 && !STUDIO_THEMES.some(t => t.id === studioTheme))}
            onPick={() => setStudioTheme(theme.id)}
          />
        ))}
      </div>
      <NavRow onBack={onBack} onNext={onNext} />
    </div>
  );
};

const ThemeCard: React.FC<{ theme: StudioThemeDefinition; day: boolean; selected: boolean; autofocus: boolean; onPick: () => void }> = ({ theme, day, selected, autofocus, onPick }) => {
  const palette = day ? theme.day : theme.night;
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${theme.name}: ${day ? theme.dayBlurb : theme.blurb}`}
      data-testid={`welcome-theme-${theme.id}`}
      data-autofocus={autofocus ? true : undefined}
      onClick={onPick}
      whileHover={{ y: -4 }}
      
      animate={{ boxShadow: selected ? `0 0 0 3px ${palette.accent}, 0 4px 0 ${palette.ink}` : `0 0 0 0px transparent, 0 2px 0 ${palette.ink}` }}
      className="group relative flex flex-col overflow-hidden rounded-[10px] border-2 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent-gold)]"
      style={{ borderColor: palette.ink, backgroundColor: palette.surface }}
    >
      <div className="relative h-[84px] w-full overflow-hidden" style={{ backgroundColor: palette.bg }}>
        {theme.layout === 'scene' && <SceneCanvas themeId={theme.id} day={day} pixelSize={2} />}
        <MiniStudio palette={palette} floating={theme.layout === 'scene'} />
      </div>
      <div className="flex flex-col gap-0.5 px-2.5 py-2">
        <span className="flex items-center justify-between text-xs font-semibold" style={{ color: palette.heading }}>
          {theme.name}
          <AnimatePresence>
            {selected && (
              <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} aria-hidden="true" style={{ color: palette.accent }}>
                ●
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="text-[10px] leading-snug" style={{ color: palette.muted }}>{day ? theme.dayBlurb : theme.blurb}</span>
      </div>
    </motion.button>
  );
};

/** A thumbnail of the studio chrome in a theme's own colors. */
const MiniStudio: React.FC<{ palette: ThemePalette; floating: boolean }> = ({ palette, floating }) => {
  const card = (extra: string) => `absolute ${extra} rounded-[2px] border`;
  const panel = { backgroundColor: floating ? `color-mix(in srgb, ${palette.surface} 88%, transparent)` : palette.surface, borderColor: floating ? palette.ink : palette.border };
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <div className={card(floating ? 'left-1 right-1 top-1 h-2' : 'left-0 right-0 top-0 h-2.5')} style={panel} />
      <div className={card(floating ? 'left-1 top-4 bottom-6 w-2.5' : 'left-0 top-2.5 bottom-5 w-3')} style={panel}>
        <span className="absolute left-[2px] top-[3px] block h-1.5 w-1.5 rounded-[1px]" style={{ backgroundColor: palette.primary }} />
      </div>
      <div className={card(floating ? 'right-1 top-4 bottom-6 w-7' : 'right-0 top-2.5 bottom-5 w-8')} style={panel}>
        <span className="absolute left-1 right-1 top-1 block h-1 rounded-[1px]" style={{ backgroundColor: palette.accent }} />
        <span className="absolute left-1 right-2 top-3 block h-[3px] rounded-[1px]" style={{ backgroundColor: palette.raised }} />
      </div>
      <div className={card(floating ? 'left-1 right-1 bottom-1 h-4' : 'left-0 right-0 bottom-0 h-5')} style={panel}>
        <span className="absolute left-1 top-1 block h-2 w-3 rounded-[1px] border" style={{ borderColor: palette.accent, backgroundColor: palette.active }} />
      </div>
      <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 h-8 w-8 border-2" style={{ backgroundColor: '#ffffff', borderColor: floating ? palette.frame : palette.border, boxShadow: `0 2px 0 ${palette.ink}` }}>
        <span className="absolute left-[9px] top-[10px] block h-[6px] w-[10px]" style={{ backgroundColor: palette.accent3 }} />
      </div>
    </div>
  );
};

const DayNightSwitch: React.FC<{ day: boolean; reduce: boolean; onChange: (day: boolean) => void }> = ({ day, reduce, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={day}
    aria-label="Day mode"
    data-testid="welcome-scheme-toggle"
    onClick={() => onChange(!day)}
    className="relative flex h-10 w-[132px] items-center rounded-full border-2 border-[var(--ink)] p-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
    style={{ background: day ? 'linear-gradient(90deg, #ffe7b0, #bfe6ff)' : 'linear-gradient(90deg, #1a1440, #0b0718)', transition: 'background 300ms ease' }}
  >
    <span className="absolute left-3 text-[10px] font-mono font-bold" style={{ color: '#1d1336', opacity: day ? 1 : 0, transition: 'opacity 200ms' }}>DAY</span>
    <span className="absolute right-3 text-[10px] font-mono font-bold" style={{ color: '#fff3e0', opacity: day ? 0 : 1, transition: 'opacity 200ms' }}>NIGHT</span>
    <motion.span
      layout={!reduce}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--ink)]"
      style={{ marginLeft: day ? 'auto' : 0, backgroundColor: day ? '#fff6d6' : '#2a1945' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={day ? 'sun' : 'moon'}
          initial={reduce ? { opacity: 0 } : { rotate: -120, scale: 0, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { rotate: 120, scale: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <PixelArt {...(day ? ICONS.sun : ICONS.moon)} size={16} />
        </motion.span>
      </AnimatePresence>
    </motion.span>
  </button>
);

const Start: React.FC<{ titleId: string; experience: Experience; ready: boolean; onPick: (choice: WelcomeChoice, at: { x: number; y: number }) => void }> = ({ titleId, experience, ready, onPick }) => (
  <div className="flex flex-col gap-4">
    <div>
      <h2 id={titleId} className="font-display text-xl sm:text-2xl leading-tight">What shall we make first?</h2>
      <p className="mt-1 text-sm text-[var(--text-body)]">
        {ready ? 'Pick one. The canvas you have now is saved first.' : 'Getting your Desk ready…'}
      </p>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      {STARTS[experience].map((option, i) => (
        <motion.button
          key={option.id}
          type="button"
          disabled={!ready}
          data-testid={`welcome-start-${option.id}`}
          data-autofocus={i === 0 ? true : undefined}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i }}
          whileHover={ready ? { y: -3 } : undefined}
          
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            onPick(option.choice, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          }}
          className="flex flex-col items-start gap-3 rounded-[10px] border-2 border-[var(--desk-border)] bg-[var(--desk-surface-raised)] p-4 text-left cursor-pointer hover:border-[var(--accent-gold)] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
        >
          {option.icon === 'bun' ? <BunMascot size={40} pose="happy" /> : <PixelArt {...ICONS[option.icon]} size={40} />}
          <span className="font-semibold text-sm">{option.title}</span>
          <span className="text-xs leading-relaxed text-[var(--text-body)]">{option.body}</span>
        </motion.button>
      ))}
    </div>
  </div>
);

const NavRow: React.FC<{ onBack: () => void; onNext: () => void; nextDisabled?: boolean }> = ({ onBack, onNext, nextDisabled }) => (
  <div className="flex items-center justify-between pt-1">
    <button type="button" onClick={onBack} className="pixel-tactile-btn px-4 py-2 rounded-[6px] text-xs cursor-pointer">← Back</button>
    <button type="button" data-testid="welcome-next" onClick={onNext} disabled={nextDisabled} className="pixel-primary-btn px-5 py-2 rounded-[6px] text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
      Next →
    </button>
  </div>
);

/* ───────────────────── Tour: where to change it later ───────────────────── */

const Spotlight: React.FC<{ reduce: boolean; onDone: () => void }> = ({ reduce, onDone }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const titleId = useId();
  const doneRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const target = document.querySelector<HTMLElement>('[data-testid="appearance-button"]');
    if (!target) { onDone(); return; }
    const measure = () => setRect(target.getBoundingClientRect());
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [onDone]);

  useEffect(() => { doneRef.current?.focus(); }, [rect]);

  if (!rect) return null;
  const pad = 6;
  const bubbleTop = rect.bottom + 18;
  const bubbleRight = Math.max(12, window.innerWidth - rect.right - 8);
  return (
    <div className="fixed inset-0 z-[10000]" data-testid="welcome-step-tour">
      <motion.div
        aria-hidden="true"
        className="absolute rounded-[10px]"
        initial={reduce ? false : { opacity: 0, scale: 1.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        style={{
          left: rect.left - pad,
          top: rect.top - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: '0 0 0 9999px color-mix(in srgb, var(--ink) 55%, transparent)',
        }}
      />
      {!reduce && (
        <motion.div
          aria-hidden="true"
          className="absolute rounded-[12px] border-2 border-[var(--accent-gold)]"
          style={{ left: rect.left - pad - 4, top: rect.top - pad - 4, width: rect.width + pad * 2 + 8, height: rect.height + pad * 2 + 8 }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.9, 0.2, 0.9] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      )}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute w-[300px] rounded-[12px] border-2 border-[var(--ink)] bg-[var(--desk-surface)] p-4 text-[var(--text-heading)] shadow-[0_4px_0_var(--ink),0_20px_50px_var(--shadow-far)]"
        style={{ top: bubbleTop, right: bubbleRight }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: reduce ? 0 : 0.15, type: 'spring', stiffness: 260, damping: 22 }}
      >
        <span aria-hidden="true" className="absolute -top-[9px] right-6 h-4 w-4 rotate-45 border-l-2 border-t-2 border-[var(--ink)] bg-[var(--desk-surface)]" />
        <div className="flex gap-3">
          <BunMascot size={40} pose="happy" />
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-sm font-bold">Change your Desk anytime</h2>
            <p className="text-xs leading-relaxed text-[var(--text-body)]">
              Open <b>Studio</b> to switch styles, flip between Day and Night, or turn tips off.
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button ref={doneRef} type="button" data-testid="welcome-next" onClick={onDone} className="pixel-primary-btn px-4 py-1.5 rounded-[6px] text-xs font-bold cursor-pointer">
            Got it →
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/* ─────────────────────────── A little celebration ─────────────────────────── */

const Confetti: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const bits = useMemo(() => Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.2;
    const distance = 70 + ((i * 37) % 90);
    return { dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance - 40, color: ['var(--primary-bg)', 'var(--accent-wisteria)', 'var(--accent-plum)', 'var(--accent-sage)'][i % 4], size: 4 + (i % 3) * 2 };
  }), []);
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[10001]">
      {bits.map((bit, i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{ left: x, top: y, width: bit.size, height: bit.size, backgroundColor: bit.color, boxShadow: '0 1px 0 var(--ink)' }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: bit.dx, y: [0, bit.dy, bit.dy + 60], opacity: [1, 1, 0], rotate: 180 + i * 20 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
};
