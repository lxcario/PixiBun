// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PlaygroundLayout } from '@/components/layout/PlaygroundLayout';
import { PocketDoodlePad } from '@/components/playground/PocketDoodlePad';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useStudioStore } from '@/stores/studioStore';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/layout/CenterViewport', () => ({ CenterViewport: () => <main id="main-content" aria-label="Pixel art canvas workspace" /> }));
vi.mock('@/components/playground/TeachingBoardModal', () => ({ TeachingBoardModal: () => null }));

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

describe('Playground layout', () => {
  beforeEach(() => useOnboardingStore.getState().resetOnboarding());
  afterEach(() => cleanup());

  it('shows the canvas, one coach and the frames, with Keep and Return in reach', () => {
    render(<PlaygroundLayout />);
    expect(screen.getByRole('main', { name: 'Pixel art canvas workspace' })).toBeDefined();
    expect(screen.getByRole('complementary', { name: 'Lesson coach' })).toBeDefined();
    expect(screen.getByRole('navigation', { name: 'Drawing tools' })).toBeDefined();
    expect(screen.getByRole('list', { name: 'Frames' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Keep practice in Studio' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Return to drawing' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Open Teaching Board' })).toBeDefined();
  });

  it('does not enable onion skin on an original workspace after practice is inactive', () => {
    const original = useStudioStore.getState();
    try {
      useStudioStore.getState().setOnionSkin({ enabled: false, opacity: 0.3 });
      useOnboardingStore.getState().setStepIndex(2);
      render(<PlaygroundLayout />);
      expect(useStudioStore.getState().onionSkin.enabled).toBe(false);
      expect(useStudioStore.getState().onionSkin.opacity).toBe(0.3);
    } finally {
      useStudioStore.setState(original, true);
    }
  });

  it('ignores Playground shortcuts outside practice', () => {
    render(<PlaygroundLayout />);
    const before = useStudioStore.getState().tools.activeTool;
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', code: 'KeyG' })); });
    expect(useStudioStore.getState().tools.activeTool).toBe(before);
  });
});

describe('Pocket Playground', () => {
  afterEach(() => cleanup());

  it('starts phones on a short lesson and keeps the free doodle pad', () => {
    render(<PocketDoodlePad />);
    expect(screen.getByRole('heading', { name: 'Pocket Doodle Pad' })).toBeDefined();
    expect(screen.getByRole('radio', { name: /Bouncy Mochi/ }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Floating at the top' })).toBeDefined();
    expect(screen.getByRole('img', { name: 'Lesson canvas' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Next: Falling fast/ }));
    expect(screen.getByRole('heading', { name: 'Falling fast' })).toBeDefined();
    fireEvent.click(screen.getByRole('tab', { name: 'Free doodle' }));
    expect(screen.getByRole('img', { name: 'Pocket doodle canvas' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Save PNG' })).toBeDefined();
  });

  it('never touches the Studio workspace', () => {
    const before = useStudioStore.getState();
    render(<PocketDoodlePad />);
    fireEvent.click(screen.getByRole('radio', { name: /Cozy Flame/ }));
    expect(useStudioStore.getState().frames).toBe(before.frames);
    expect(useStudioStore.getState().canvasWidth).toBe(before.canvasWidth);
  });
});
