// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useThemeStore } from '@/stores/themeStore';

describe('ThemeToggle component', () => {
  afterEach(cleanup);
  beforeEach(() => {
    useThemeStore.setState({ theme: 'dark' });
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  });

  it('renders theme toggle button with accessible label', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: 'Toggle Theme' });
    expect(btn).toBeDefined();
  });

  it('toggles theme when clicked', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: 'Toggle Theme' });
    fireEvent.click(btn);

    const currentTheme = useThemeStore.getState().theme;
    expect(currentTheme).toBe('light');
  });
});
