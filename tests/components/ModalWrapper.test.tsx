// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import { ModalWrapper } from '@/components/ui/ModalWrapper';

describe('ModalWrapper component accessibility & focus management', () => {
  afterEach(cleanup);
  it('renders modal content when open', () => {
    const handleClose = vi.fn();
    render(
      <ModalWrapper isOpen={true} onClose={handleClose} title="Test Modal">
        <div data-testid="modal-content">Inner Modal Body</div>
      </ModalWrapper>
    );

    expect(screen.getByText('✦ Test Modal')).toBeDefined();
    expect(screen.getByTestId('modal-content')).toBeDefined();
  });

  it('triggers onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <ModalWrapper isOpen={true} onClose={handleClose} title="Test Modal">
        <div>Inner Body</div>
      </ModalWrapper>
    );

    const closeBtn = screen.getByLabelText('Close dialog');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <ModalWrapper isOpen={false} onClose={handleClose} title="Closed Modal">
        <div>Hidden Body</div>
      </ModalWrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it('focuses the interactive element inside modal body rather than the close button', () => {
    const handleClose = vi.fn();
    render(
      <ModalWrapper isOpen={true} onClose={handleClose} title="Focus Priority Modal">
        <input data-testid="body-input" placeholder="Type here" />
        <button data-testid="body-button">Save</button>
      </ModalWrapper>
    );

    const input = screen.getByTestId('body-input');
    expect(document.activeElement).toBe(input);
  });

  it('includes aria-describedby pointing to modal-body on dialog and default viewport constraints', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <ModalWrapper isOpen={true} onClose={handleClose} title="Aria Modal">
        <div>Modal content</div>
      </ModalWrapper>
    );

    const dialog = container.querySelector('dialog');
    expect(dialog?.getAttribute('aria-describedby')).toBe('modal-body');
    const modalBody = container.querySelector('#modal-body');
    expect(modalBody?.className).toContain('overflow-y-auto');
  });
});
