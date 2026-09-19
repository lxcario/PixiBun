// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import { TactileButton } from '@/components/ui/TactileButton';

describe('TactileButton component', () => {
  afterEach(() => {
    cleanup();
  });
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
    expect(defaultBtn.className).toContain('pixel-tactile-btn');
    unmount();

    const { unmount: unmountGhost } = render(<TactileButton variant="ghost">Ghost</TactileButton>);
    const ghostBtn = screen.getByRole('button', { name: 'Ghost' });
    expect(ghostBtn.className).toContain('hover:bg-[var(--state-hover)]');
    unmountGhost();

    const { unmount: unmountAccent } = render(<TactileButton variant="accent">Accent</TactileButton>);
    const accentBtn = screen.getByRole('button', { name: 'Accent' });
    expect(accentBtn.className).toContain('hover:bg-[var(--surface-2)]');
    unmountAccent();

    const { unmount: unmountDanger } = render(<TactileButton variant="danger">Danger</TactileButton>);
    const dangerBtn = screen.getByRole('button', { name: 'Danger' });
    expect(dangerBtn.className).toContain('hover:bg-[var(--state-danger)]');
    unmountDanger();
  });

  it('renders dual-band wisteria specular light sweep gradient on enabled non-ghost buttons', () => {
    const { container, unmount } = render(<TactileButton variant="default">Gleam</TactileButton>);
    const sweepDiv = container.querySelector('div.pointer-events-none.absolute.inset-0.z-10');
    expect(sweepDiv).not.toBeNull();
    expect(sweepDiv?.getAttribute('style')).toContain('linear-gradient(115deg');
    expect(sweepDiv?.getAttribute('style')).toContain('220,171,223');
    unmount();

    // Ghost variant excludes specular sweep
    const { container: ghostContainer, unmount: unmountGhost } = render(<TactileButton variant="ghost">No Gleam</TactileButton>);
    expect(ghostContainer.querySelector('div.pointer-events-none.absolute.inset-0.z-10')).toBeNull();
    unmountGhost();

    // Disabled button excludes specular sweep
    const { container: disabledContainer, unmount: unmountDisabled } = render(<TactileButton disabled variant="default">No Gleam</TactileButton>);
    expect(disabledContainer.querySelector('div.pointer-events-none.absolute.inset-0.z-10')).toBeNull();
    unmountDisabled();
  });

  it('renders image button with rounded-[2px] when selected', () => {
    render(<TactileButton imageSrc="/test.png" active />);
    const imgBtn = screen.getByRole('button');
    expect(imgBtn.className).toContain('rounded-[2px]');
  });

  it('supports custom imageAlt and falls back to aria-label for accessibility', () => {
    const { unmount } = render(<TactileButton imageSrc="/test.png" imageAlt="Custom Brush Icon" />);
    const img = screen.getByAltText('Custom Brush Icon');
    expect(img).toBeDefined();
    unmount();

    render(<TactileButton imageSrc="/test.png" aria-label="Eraser Tool" />);
    const imgAria = screen.getByAltText('Eraser Tool');
    expect(imgAria).toBeDefined();
  });
});
