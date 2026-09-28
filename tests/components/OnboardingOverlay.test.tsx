// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { OnboardingOverlay } from '@/components/onboarding/OnboardingOverlay';
import { useOnboardingStore } from '@/stores/onboardingStore';

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
    const { container } = render(<OnboardingOverlay />);
    // On drawing steps with no active target, overlay is completely unobtrusive
    expect(screen.queryByText('Welcome to the Animation Desk')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it('renders complete step with celebration and transition button', () => {
    useOnboardingStore.getState().completeOnboarding();
    render(<OnboardingOverlay />);

    expect(screen.getByText('Artisan Lesson Complete')).toBeDefined();
    expect(screen.getByText(/You have successfully built a full/)).toBeDefined();
    expect(screen.getByRole('button', { name: /Enter Full Studio/ })).toBeDefined();

    const enterStudioBtn = screen.getByRole('button', { name: /Enter Full Studio/ });
    fireEvent.click(enterStudioBtn);

    expect(mockPush).toHaveBeenCalledWith('/studio?fromPlayground=true');
  });
});
