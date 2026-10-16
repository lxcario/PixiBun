'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { animate, useMotionValue, type AnimationPlaybackControls } from 'motion/react';
import { ENTER_BLUR, EXIT, FADE_IN, MORPH_H, MORPH_W, UNBLUR, spring } from '@/lib/motion/springs';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';

type Phase = 'open' | 'closed' | 'opening' | 'closing';

interface CollapseProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'hidden'> {
  open: boolean;
  /** Classes for the inner content wrapper (padding belongs here, so a closed body is truly 0 px). */
  innerClassName?: string;
  children: React.ReactNode;
}

/**
 * A disclosure body that springs open like the island growing: height on the bouncy morph
 * spring (460/25), content blooming in from 12 px blur. It closes on the softer width spring
 * (420/31) so it lands without bouncing back open. Closed at rest it is `hidden`, so it leaves
 * the accessibility tree and tab order exactly as a plain disclosure would; while closing it is inert.
 */
export function Collapse({ open, innerClassName, children, style, ...rest }: CollapseProps) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(open ? 'open' : 'closed');
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const height = useMotionValue(0);
  const running = useRef<AnimationPlaybackControls[]>([]);
  const wasOpen = useRef(open);

  // Translate the prop into a phase before paint, so the first frame is already the start pose.
  useLayoutEffect(() => {
    if (wasOpen.current === open) return;
    wasOpen.current = open;
    setPhase(reduce ? (open ? 'open' : 'closed') : open ? 'opening' : 'closing');
  }, [open, reduce]);

  useLayoutEffect(() => {
    const shell = outer.current;
    const content = inner.current;
    if (!shell || !content || (phase !== 'opening' && phase !== 'closing')) return;
    const opening = phase === 'opening';
    const from = running.current.length ? height.get() : opening ? 0 : shell.offsetHeight;
    running.current.forEach(run => run.stop());
    shell.style.height = '';
    const to = opening ? shell.offsetHeight : 0;
    height.jump(from);
    const write = height.on('change', value => { shell.style.height = `${Math.max(0, value)}px`; });
    shell.style.height = `${Math.max(0, from)}px`;
    shell.style.overflow = 'clip';
    const runs = [
      animate(height, to, spring(opening ? MORPH_H : MORPH_W)),
      opening
        ? animate(content, { opacity: [0, 1], filter: [`blur(${ENTER_BLUR}px)`, 'blur(0px)'] }, { opacity: FADE_IN, filter: UNBLUR })
        : animate(content, { opacity: 0, filter: 'blur(6px)' }, EXIT),
    ];
    running.current = runs;
    let current = true;
    void Promise.all(runs).then(() => {
      if (!current) return;
      running.current = [];
      shell.style.height = '';
      shell.style.overflow = '';
      content.style.filter = '';
      content.style.opacity = '';
      setPhase(opening ? 'open' : 'closed');
    });
    return () => { current = false; write(); };
  }, [phase, height]);

  useLayoutEffect(() => () => running.current.forEach(run => run.stop()), []);

  return (
    <div
      ref={outer}
      hidden={phase === 'closed'}
      inert={phase === 'closing' || undefined}
      data-collapse={phase}
      style={style}
      {...rest}
    >
      <div ref={inner} className={innerClassName}>{children}</div>
    </div>
  );
}
