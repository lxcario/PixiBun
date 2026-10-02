// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PracticeActionsContext } from '@/components/playground/PracticeActions';
import { OnboardingOverlay } from '@/components/onboarding/OnboardingOverlay';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useStudioStore } from '@/stores/studioStore';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('OnboardingOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOnboardingStore.getState().resetOnboarding();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders without blocking welcome popups during normal drawing steps', () => {
    const { container } = render(<PracticeActionsContext.Provider value={{ keep: mockPush, returnToDrawing: vi.fn() }}><OnboardingOverlay /></PracticeActionsContext.Provider>);
    // On drawing steps with no active target, overlay is completely unobtrusive
    expect(screen.queryByText('Welcome to the Animation Desk')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it('does not enable onion skin on an original workspace after practice is inactive', () => {
    const original = useStudioStore.getState();
    try {
      useStudioStore.getState().setOnionSkin({ enabled: false, opacity: 0.3 });
      useOnboardingStore.getState().setStepIndex(2);
      render(<OnboardingOverlay />);
      expect(useStudioStore.getState().onionSkin.enabled).toBe(false);
      expect(useStudioStore.getState().onionSkin.opacity).toBe(0.3);
    } finally {
      useStudioStore.setState(original, true);
    }
  });

  it('renders complete step with celebration and transition button', () => {
    useOnboardingStore.getState().completeOnboarding();
    render(<PracticeActionsContext.Provider value={{ keep: mockPush, returnToDrawing: vi.fn() }}><OnboardingOverlay /></PracticeActionsContext.Provider>);

    expect(screen.getByText('Artisan Lesson Complete')).toBeDefined();
    expect(screen.getByText(/You have successfully built a full/)).toBeDefined();
    expect(screen.getByRole('button', { name: /Keep practice in Studio/ })).toBeDefined();

    const enterStudioBtn = screen.getByRole('button', { name: /Keep practice in Studio/ });
    fireEvent.click(enterStudioBtn);

    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});
