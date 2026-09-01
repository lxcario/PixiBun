// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ArtisanHandbookPanel } from '@/components/onboarding/ArtisanHandbookPanel';
import { useOnboardingStore } from '@/stores/onboardingStore';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('ArtisanHandbookPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOnboardingStore.getState().resetOnboarding();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders lesson title and step progression', () => {
    render(<ArtisanHandbookPanel />);

    expect(screen.getByText('The Bouncing Mochi')).toBeDefined();
    expect(screen.getByText('Physics 101')).toBeDefined();
    expect(screen.getByText(/Step 1 of/)).toBeDefined();
  });

  it('switches lessons when selecting from curriculum dropdown', () => {
    render(<ArtisanHandbookPanel />);

    const select = screen.getByRole('combobox', { name: /Choose animation lesson/i });
    fireEvent.change(select, { target: { value: 'potion-bubble' } });

    expect(useOnboardingStore.getState().activeLessonId).toBe('potion-bubble');
    expect(screen.getByText('Magic Potion Bubbles')).toBeDefined();
  });

  it('toggles stencil lightbox when in drawing step', () => {
    useOnboardingStore.getState().setStepIndex(1);
    render(<ArtisanHandbookPanel />);

    expect(screen.getByText('Tracing Lightbox')).toBeDefined();
    const toggleBtn = screen.getByRole('button', { name: 'Hide Lightbox' });
    fireEvent.click(toggleBtn);

    expect(useOnboardingStore.getState().showStencilGuide).toBe(false);
  });
});
