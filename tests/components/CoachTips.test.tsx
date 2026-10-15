// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CoachTips } from '@/components/onboarding/CoachTips';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useStudioStore } from '@/stores/studioStore';
import type { Layer } from '@/types/canvas';

vi.mock('@/components/ui/BunMascot', () => ({ BunMascot: () => null }));
const motionComponents: Record<string, React.ComponentType<Record<string, unknown>>> = {};
vi.mock('motion/react', () => ({
  useReducedMotion: () => true,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: (_target, tag: string) => {
      motionComponents[tag] ??= React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        const { initial: _i, animate: _a, exit: _e, transition: _t, ...rest } = props;
        return React.createElement(tag, { ...rest, ref });
      });
      return motionComponents[tag];
    },
  }),
}));

const layer = (id: string, extra: Partial<Layer> = {}): Layer => ({
  id, name: id, visible: true, locked: false, opacity: 1, blendMode: 'source-over', ...extra,
});
const seenOtherTips = ['first-edit', 'lamp', 'second-frame', 'share'];
const renderTips = () => render(<>
  <div data-testid="main-composite-canvas" />
  <div data-testid="right-inspector" />
  <CoachTips exportOpen={false} />
</>);
const waitForTip = async () => { await act(async () => { vi.advanceTimersByTime(750); }); };

beforeEach(() => {
  vi.useFakeTimers();
  usePreferencesStore.setState({ experience: 'new', onboardedAt: 1, seenTips: seenOtherTips, tipsEnabled: true, keymap: 'standard' });
  useStudioStore.setState({
    currentProjectId: 'drawing-a', frames: [{ id: 'frame-a', durationMs: 100, layers: [layer('ink')] }],
    activeFrameIndex: 0, activeLayerId: 'ink', activeInspectorTab: 'tools', canUndo: false, editRevision: 0,
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it.each([
  ['standard', 'Space'],
  ['classic', 'Alt'],
] as const)('teaches the saved %s pan gesture after an edit', async (keymap, key) => {
  usePreferencesStore.setState({ keymap, seenTips: ['lamp', 'second-frame', 'second-layer', 'share'] });
  renderTips();
  act(() => useStudioStore.setState({ canUndo: true }));
  await waitForTip();
  expect(screen.getByTestId('coach-tip-first-edit').textContent).toContain(`hold ${key} and drag`);
  act(() => usePreferencesStore.getState().setKeymap(keymap === 'standard' ? 'classic' : 'standard'));
  expect(screen.getByTestId('coach-tip-first-edit').textContent).toContain(`hold ${key === 'Space' ? 'Alt' : 'Space'} and drag`);
});

it.each([
  { tag: 'photometric' },
  { tag: 'normal-map' },
  { effect: { id: 'light', kind: 'photometric', version: 1, sourceMode: 'active-layer', params: {}, updatedAt: 1 } },
] satisfies Partial<Layer>[])('ignores generated-layer creation (%j) and still teaches adding a drawing layer', async extra => {
  renderTips();
  act(() => useStudioStore.setState(state => { state.frames[0].layers.unshift(layer('generated', extra)); }));
  await waitForTip();
  expect(screen.queryByTestId('coach-tip-second-layer')).toBeNull();
  act(() => useStudioStore.setState(state => { state.frames[0].layers.unshift(layer('color')); }));
  await waitForTip();
  expect(screen.getByTestId('coach-tip-second-layer')).toBeDefined();
});

it('does not mistake switching to an existing layered frame for creating a layer', async () => {
  useStudioStore.setState(state => { state.frames.push({ id: 'frame-b', durationMs: 100, layers: [layer('color'), layer('outline')] }); });
  renderTips();
  act(() => useStudioStore.setState({ activeFrameIndex: 1, activeLayerId: 'color' }));
  await waitForTip();
  expect(screen.queryByTestId('coach-tip-second-layer')).toBeNull();
});

it('discards a queued tip when another project opens', async () => {
  renderTips();
  act(() => useStudioStore.setState(state => { state.frames[0].layers.push(layer('color')); }));
  act(() => useStudioStore.setState({
    currentProjectId: 'drawing-b', frames: [{ id: 'frame-b', durationMs: 100, layers: [layer('other')] }], activeLayerId: 'other',
  }));
  await waitForTip();
  expect(screen.queryByTestId('coach-tip-second-layer')).toBeNull();
});

it('does not teach layer creation when opening an already layered project', async () => {
  renderTips();
  act(() => useStudioStore.setState({
    currentProjectId: 'drawing-b', frames: [{ id: 'frame-b', durationMs: 100, layers: [layer('color'), layer('outline')] }], activeLayerId: 'color',
  }));
  await waitForTip();
  expect(screen.queryByTestId('coach-tip-second-layer')).toBeNull();
});
