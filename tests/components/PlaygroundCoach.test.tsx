// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PracticeActionsContext } from '@/components/playground/PracticeActions';
import { CoachPanel } from '@/components/playground/CoachPanel';
import { LessonPicker } from '@/components/playground/LessonPicker';
import { usePlaygroundUi } from '@/components/playground/playgroundUi';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useStudioStore } from '@/stores/studioStore';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Render motion elements as plain elements (happy-dom has no Web Animations), as other component tests do.
const motionComponents: Record<string, React.ComponentType<Record<string, unknown>>> = {};
vi.mock('motion/react', () => ({
  useReducedMotion: () => true,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: (_target, tag: string) => {
      motionComponents[tag] ??= React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        const { initial: _i, animate: _a, exit: _e, transition: _t, layoutId: _l, ...rest } = props;
        return React.createElement(tag, { ...rest, ref });
      });
      return motionComponents[tag];
    },
  }),
}));

const actions = { keep: vi.fn(), returnToDrawing: vi.fn() };
const renderCoach = () => render(
  <PracticeActionsContext.Provider value={actions}><CoachPanel /><LessonPicker /></PracticeActionsContext.Provider>,
);

describe('Playground coach', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOnboardingStore.getState().resetOnboarding();
    usePlaygroundUi.getState().reset();
  });
  afterEach(() => cleanup());

  it('opens on a show-first intro, then one instruction at a time', async () => {
    renderCoach();
    expect(screen.getByRole('heading', { name: /Let.s make Bouncy Mochi/ })).toBeDefined();
    expect(screen.getByRole('img', { name: /finished animation/ })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: "Let's start" }));
    expect(usePlaygroundUi.getState().introSeen['bouncing-mochi']).toBe(true);
    expect(usePlaygroundUi.getState().cue?.kind).toBe('demo');
    expect(await screen.findByRole('heading', { name: 'Floating at the top' })).toBeDefined();
    expect(screen.getByText('Frame 1 of 4')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Trace it for me' })).toBeDefined();
    expect(screen.getByText(/a little pause \(160 ms\)/)).toBeDefined();
  });

  it('moves to the next pose and creates its frame when needed', async () => {
    usePlaygroundUi.getState().dismissIntro('bouncing-mochi');
    renderCoach();
    fireEvent.click(await screen.findByRole('button', { name: /Next: Falling fast/ }));
    expect(useOnboardingStore.getState().currentStepIndex).toBe(1);
    expect(useStudioStore.getState().activeFrameIndex).toBe(1);
    expect(await screen.findByRole('heading', { name: 'Falling fast' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Start from last frame' })).toBeDefined();
  });

  it('lets the learner jump along the lesson path', async () => {
    usePlaygroundUi.getState().dismissIntro('bouncing-mochi');
    renderCoach();
    fireEvent.click(screen.getByRole('button', { name: 'Watch it play' }));
    expect(useOnboardingStore.getState().getCurrentStep().type).toBe('PLAYBACK');
    expect(await screen.findByRole('heading', { name: 'Watch it move!' })).toBeDefined();
  });

  it('offers Keep once the lesson is finished', async () => {
    usePlaygroundUi.getState().dismissIntro('bouncing-mochi');
    act(() => useOnboardingStore.getState().completeOnboarding());
    renderCoach();
    fireEvent.click(await screen.findByRole('button', { name: /Keep it in Studio/ }));
    expect(actions.keep).toHaveBeenCalledTimes(1);
  });

  it('switches lessons from the picker cards', async () => {
    renderCoach();
    act(() => usePlaygroundUi.getState().setPickerOpen(true));
    fireEvent.click(await screen.findByRole('button', { name: /^Potion Bubbles/ }));
    expect(useOnboardingStore.getState().activeLessonId).toBe('potion-bubble');
    expect(usePlaygroundUi.getState().pickerOpen).toBe(false);
    expect(await screen.findByRole('heading', { name: /Let.s make Potion Bubbles/ })).toBeDefined();
  });
});
