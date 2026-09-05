// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { TactileButton } from '@/components/ui/TactileButton';

describe('TactileButton component', () => {
  it('renders button with children and handles clicks', () => {
    const handleClick = vi.fn();
    render(
      <TactileButton variant="primary" onClick={handleClick}>
        Click Me
      </TactileButton>
    );

    const btn = screen.getByRole('button', { name: 'Click Me' });
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('respects disabled state and does not fire clicks', () => {
    const handleClick = vi.fn();
    render(
      <TactileButton disabled onClick={handleClick}>
        Disabled Action
      </TactileButton>
    );

    const btn = screen.getByRole('button', { name: 'Disabled Action' });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('has accessible focus-visible ring styles in class list', () => {
    render(<TactileButton variant="default">Focus Ring Button</TactileButton>);
    const btn = screen.getByRole('button', { name: 'Focus Ring Button' });
    expect(btn.className).toContain('focus-visible:ring-2');
  });

  it('applies harmonized rounded-[2px] border-radius and variant hover styling', () => {
    const { unmount } = render(<TactileButton variant="default">Default</TactileButton>);
    const defaultBtn = screen.getByRole('button', { name: 'Default' });
    expect(defaultBtn.className).toContain('rounded-[2px]');
    expect(defaultBtn.className).toContain('hover:bg-[#603B82]');
    unmount();

    const { unmount: unmountGhost } = render(<TactileButton variant="ghost">Ghost</TactileButton>);
    const ghostBtn = screen.getByRole('button', { name: 'Ghost' });
    expect(ghostBtn.className).toContain('hover:bg-[#603B82]/40');
    unmountGhost();

    const { unmount: unmountAccent } = render(<TactileButton variant="accent">Accent</TactileButton>);
    const accentBtn = screen.getByRole('button', { name: 'Accent' });
    expect(accentBtn.className).toContain('hover:bg-[#b673d3]');
    unmountAccent();

    const { unmount: unmountDanger } = render(<TactileButton variant="danger">Danger</TactileButton>);
    const dangerBtn = screen.getByRole('button', { name: 'Danger' });
    expect(dangerBtn.className).toContain('hover:bg-[#c24e61]');
    unmountDanger();
  });
});
