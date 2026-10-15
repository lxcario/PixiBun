// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { useRef, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Collapse } from '@/components/ui/surfaces/Collapse';
import { FloatingPanel } from '@/components/ui/surfaces/FloatingPanel';
import { ModalWrapper } from '@/components/ui/ModalWrapper';

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Disclosure({ initial = false }: { initial?: boolean }) {
  const [open, setOpen] = useState(initial);
  return (
    <>
      <button type="button" aria-expanded={open} aria-controls="body" onClick={() => setOpen(!open)}>Toggle</button>
      <Collapse open={open} id="body" data-testid="body"><button type="button">Inside</button></Collapse>
    </>
  );
}

describe('Collapse', () => {
  it('is hidden at rest when closed and visible when open', () => {
    render(<Disclosure />);
    expect(screen.getByTestId('body').hidden).toBe(true);
    expect(screen.queryByRole('button', { name: 'Inside' })).toBeNull();
    cleanup();
    render(<Disclosure initial />);
    expect(screen.getByTestId('body').hidden).toBe(false);
    expect(screen.getByRole('button', { name: 'Inside' })).toBeDefined();
  });

  it('opens at once, and leaves the tab order while it closes', async () => {
    render(<Disclosure initial />);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    const body = screen.getByTestId('body');
    // Still on screen while it springs shut, but no longer reachable.
    expect(body.getAttribute('data-collapse')).toBe('closing');
    expect(body.hasAttribute('inert')).toBe(true);
    await waitFor(() => expect(body.hidden).toBe(true), { timeout: 3000 });
    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(body.hidden).toBe(false);
    expect(body.getAttribute('data-collapse')).toBe('opening');
    expect(screen.getByRole('button', { name: 'Inside' })).toBeDefined();
    await waitFor(() => expect(body.getAttribute('data-collapse')).toBe('open'), { timeout: 3000 });
    expect(body.style.height).toBe('');
  });

  it('snaps without animating under reduced motion', () => {
    setReducedMotion(true);
    render(<Disclosure initial />);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(screen.getByTestId('body').hidden).toBe(true);
  });
});

function Popover() {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={anchor} type="button" aria-expanded={open} onClick={() => setOpen(!open)}>Trigger</button>
      <button type="button">Elsewhere</button>
      <FloatingPanel open={open} anchorRef={anchor} onClose={() => setOpen(false)} role="dialog" aria-label="Example panel"
        initialFocus={panel => panel.querySelector<HTMLButtonElement>('button')?.focus()}>
        <button type="button">First</button>
      </FloatingPanel>
    </>
  );
}

describe('FloatingPanel', () => {
  it('portals a labelled panel next to its trigger and focuses the first control', async () => {
    render(<Popover />);
    fireEvent.click(screen.getByRole('button', { name: 'Trigger' }));
    const panel = screen.getByRole('dialog', { name: 'Example panel' });
    expect(panel.parentElement).toBe(document.body);
    expect(panel.style.top).toMatch(/px$/);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First' })));
  });

  it('closes on Escape, returns focus to the trigger and leaves the accessibility tree at once', () => {
    render(<Popover />);
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    // It may still be melting away, but only as an inert, hidden picture.
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on a press outside, but not on its trigger or inside', () => {
    render(<Popover />);
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'First' }));
    fireEvent.pointerDown(trigger);
    expect(screen.getByRole('dialog')).toBeDefined();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is removed from the document once the exit finishes', async () => {
    render(<Popover />);
    fireEvent.click(screen.getByRole('button', { name: 'Trigger' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('[data-surface="panel"]')).toBeNull(), { timeout: 3000 });
  });
});

describe('ModalWrapper motion', () => {
  function Host() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>Open</button>
        <ModalWrapper isOpen={open} onClose={() => setOpen(false)} title="Motion">
          <button type="button">Body</button>
        </ModalWrapper>
      </>
    );
  }

  it('leaves the top layer as soon as it closes, returns focus, then unmounts after its exit', async () => {
    const onClose = vi.fn();
    render(<Host />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = document.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(dialog.open).toBe(false);
    expect(dialog.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('dialog')).toBeNull();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    expect(document.activeElement).toBe(opener);
    await waitFor(() => expect(document.querySelector('dialog')).toBeNull(), { timeout: 3000 });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('becomes a real modal again when reopened while still melting away', () => {
    const { rerender } = render(<ModalWrapper isOpen onClose={() => {}} title="Again"><button type="button">Body</button></ModalWrapper>);
    const dialog = document.querySelector('dialog')!;
    rerender(<ModalWrapper isOpen={false} onClose={() => {}} title="Again"><button type="button">Body</button></ModalWrapper>);
    expect(dialog.open).toBe(false);
    rerender(<ModalWrapper isOpen onClose={() => {}} title="Again"><button type="button">Body</button></ModalWrapper>);
    const current = document.querySelector('dialog')!;
    expect(current.open).toBe(true);
    expect(current.getAttribute('aria-hidden')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Again' })).toBeDefined();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Body' }));
  });

  it('does not report its own close as a second request to close', () => {
    const onClose = vi.fn();
    const { rerender } = render(<ModalWrapper isOpen onClose={onClose} title="Once"><button type="button">Body</button></ModalWrapper>);
    const dialog = document.querySelector('dialog')!;
    rerender(<ModalWrapper isOpen={false} onClose={onClose} title="Once"><button type="button">Body</button></ModalWrapper>);
    fireEvent(dialog, new Event('close'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
