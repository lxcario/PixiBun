// @vitest-environment happy-dom
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { ResponsivePlayground } from '@/components/playground/ResponsivePlayground';

const { desktopStarted } = vi.hoisted(() => ({ desktopStarted: vi.fn() }));
vi.mock('@/components/playground/PracticeWorkspace', async () => {
  const { useEffect } = await import('react');
  return { PracticeWorkspace: () => {
    useEffect(() => { desktopStarted(); }, []);
    return <div>Desktop lessons</div>;
  } };
});
vi.mock('@/components/playground/PocketDoodlePad', () => ({ PocketDoodlePad: () => <div>Pocket pad</div> }));

describe('responsive Playground mounting', () => {
  let desktop: boolean;
  let listeners: Set<() => void>;
  beforeEach(() => {
    desktop = false;
    listeners = new Set();
    desktopStarted.mockClear();
    vi.stubGlobal('matchMedia', vi.fn((query: string) => {
      expect(query).toBe('(min-width: 1024px)');
      return {
        get matches() { return desktop; },
        addEventListener: (_: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
      };
    }));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('does not start hidden desktop lessons on mobile, including Strict Mode', () => {
    render(<StrictMode><ResponsivePlayground /></StrictMode>);
    expect(screen.getByText('Pocket pad')).toBeDefined();
    expect(screen.queryByText('Desktop lessons')).toBeNull();
    expect(desktopStarted).not.toHaveBeenCalled();
  });

  it('switches at the breakpoint and removes the subscription on unmount', () => {
    const view = render(<ResponsivePlayground />);
    act(() => { desktop = true; listeners.forEach(listener => listener()); });
    expect(screen.getByText('Desktop lessons')).toBeDefined();
    expect(screen.queryByText('Pocket pad')).toBeNull();
    expect(desktopStarted).toHaveBeenCalledTimes(1);
    act(() => { desktop = false; listeners.forEach(listener => listener()); });
    expect(screen.getByText('Pocket pad')).toBeDefined();
    expect(screen.queryByText('Desktop lessons')).toBeNull();
    view.unmount();
    expect(listeners.size).toBe(0);
  });
});
