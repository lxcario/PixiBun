'use client';

import { forwardRef, useEffect, useState } from 'react';
import { motion, useIsPresent, type HTMLMotionProps, type Variants } from 'motion/react';
import {
  BLOOM, ENTER_BLUR, ENTER_SCALE, EXIT, EXIT_BLUR, EXIT_SCALE, FADE_IN, REDUCED_FADE, STAGGER, UNBLUR, spring,
} from '@/lib/motion/springs';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';

/**
 * Variants for a surface that blooms out of its trigger: scale 0.95 → 1 on the island's bloom
 * spring, 12 px blur → sharp, and a quick fade so text is legible early. Exit melts to 0.97
 * and 8 px blur. Children using `revealItem` arrive one after another.
 * Reduced motion: a 120 ms cross-fade, nothing scales, moves or blurs.
 */
/** Which way a surface unfolds: away from its trigger, or out from its middle for a modal. */
export type UnfoldFrom = 'top' | 'bottom' | 'center';

const UNFOLD_CLIP: Record<UnfoldFrom, string> = {
  top: 'inset(0% 0% 40% 0% round 16px)',
  bottom: 'inset(40% 0% 0% 0% round 16px)',
  center: 'inset(18% 0% 18% 0% round 16px)',
};
const UNFOLDED = 'inset(0% 0% 0% 0% round 16px)';

/** How long the staggered content reveal runs before [data-unfold] is lifted again. */
export const UNFOLD_MS = 1100;

/** Point the unfold away from the trigger: a surface whose origin is at its bottom grows upward. */
export function unfoldFromOrigin(origin: string): UnfoldFrom {
  return /bottom/.test(origin) ? 'bottom' : 'top';
}

/**
 * True for the first moments after mount, while content items stagger in through
 * [data-unfold] (surfaces.css). Lifting it afterwards hands every element back its own
 * animations, so a spinner inside a modal keeps spinning.
 */
export function useUnfolding(enabled = true): boolean {
  const reduce = useReducedMotion();
  const [unfolding, setUnfolding] = useState(enabled && !reduce);
  useEffect(() => {
    if (!unfolding) return;
    const timer = setTimeout(() => setUnfolding(false), UNFOLD_MS);
    return () => clearTimeout(timer);
  }, [unfolding]);
  return unfolding;
}

export function surfaceVariants(reduce: boolean, from: UnfoldFrom = 'top'): Variants {
  if (reduce) {
    return {
      closed: { opacity: 0 },
      open: { opacity: 1, transition: REDUCED_FADE },
      exit: { opacity: 0, transition: REDUCED_FADE },
    };
  }
  return {
    // The surface unfolds as it blooms: a clip opens away from the trigger on the same spring.
    closed: { opacity: 0, scale: ENTER_SCALE, filter: `blur(${ENTER_BLUR}px)`, clipPath: UNFOLD_CLIP[from] },
    open: {
      opacity: 1, scale: 1, filter: 'blur(0px)', clipPath: UNFOLDED,
      // A lingering filter would make the surface a containing block for fixed children,
      // and a lingering clip would cut off its shadow and any menu that overhangs it.
      transitionEnd: { filter: 'none', clipPath: 'none' },
      transition: { opacity: FADE_IN, filter: UNBLUR, scale: spring(BLOOM), clipPath: spring(BLOOM), staggerChildren: STAGGER, delayChildren: 0.02 },
    },
    exit: { opacity: 0, scale: EXIT_SCALE, filter: `blur(${EXIT_BLUR}px)`, transition: EXIT },
  };
}

/**
 * Staggered content reveal. Items stay fully opaque (the surface itself fades) and come into
 * focus while rising 4 px, so sizes never change and contrast is never reduced mid-reveal.
 */
export function revealVariants(reduce: boolean): Variants {
  if (reduce) return { closed: {}, open: {}, exit: {} };
  return {
    closed: { y: 4, filter: 'blur(6px)' },
    open: { y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' }, transition: { y: spring(BLOOM), filter: UNBLUR } },
    exit: {},
  };
}

type SurfaceProps = HTMLMotionProps<'div'> & {
  /** CSS transform-origin: point the bloom at the trigger, e.g. "top right" or "120px 0px". */
  origin?: string;
  /** Skip the entrance (for surfaces present on first paint). */
  appear?: boolean;
};

export const SpringSurface = forwardRef<HTMLDivElement, SurfaceProps>(function SpringSurface(
  { origin = 'top center', appear = true, style, children, ...rest }, ref,
) {
  const reduce = useReducedMotion();
  // While melting away it is already closed: out of the accessibility tree and not clickable.
  const present = useIsPresent();
  const unfolding = useUnfolding(appear);
  return (
    <motion.div
      ref={ref}
      aria-hidden={present ? undefined : true}
      inert={!present || undefined}
      data-unfold={unfolding || undefined}
      variants={surfaceVariants(reduce, unfoldFromOrigin(origin))}
      initial={appear ? 'closed' : false}
      animate="open"
      exit="exit"
      style={{ transformOrigin: origin, ...style }}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

type RevealProps = HTMLMotionProps<'div'>;

/** A block inside a SpringSurface (or ModalWrapper) that joins the staggered reveal. */
export const Reveal = forwardRef<HTMLDivElement, RevealProps>(function Reveal({ children, ...rest }, ref) {
  const reduce = useReducedMotion();
  return <motion.div ref={ref} variants={revealVariants(reduce)} {...rest}>{children}</motion.div>;
});

/** Transform origin that points from `panel` toward the centre of `anchor`, in the panel's own pixels. */
type Box = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
export function originToward(anchor: Box, panel: Box): string {
  const x = anchor.left + anchor.width / 2 - panel.left;
  const y = anchor.top + anchor.height / 2 - panel.top;
  return `${Math.round(x)}px ${Math.round(y)}px`;
}

