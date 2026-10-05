// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import { ModalWrapper } from '@/components/ui/ModalWrapper';

describe('ModalWrapper component accessibility & focus management', () => {
  afterEach(cleanup);
  it('ignores a queued close after reopening but acknowledges a native close of the current dialog', () => {
    const close = vi.fn();
    render(<ModalWrapper isOpen onClose={close} title="Current dialog"><button>Continue</button></ModalWrapper>);
    const dialog = screen.getByRole('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    fireEvent(dialog, new Event('close'));
    expect(close).not.toHaveBeenCalled();
    dialog.removeAttribute('open');
    fireEvent(dialog, new Event('close'));
    expect(close).toHaveBeenCalledOnce();
  });
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

  it('includes aria-describedby and aria-labelledby pointing to unique ids on dialog and default viewport constraints', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <ModalWrapper isOpen={true} onClose={handleClose} title="Aria Modal">
        <div>Modal content</div>
      </ModalWrapper>
    );

    const dialog = container.querySelector('dialog');
    const modalBody = container.querySelector('[data-modal-body]');
    const heading = container.querySelector('h2');

    expect(dialog).not.toBeNull();
    expect(modalBody).not.toBeNull();
    expect(heading).not.toBeNull();

    const describedBy = dialog?.getAttribute('aria-describedby');
    const labelledBy = dialog?.getAttribute('aria-labelledby');

    expect(describedBy).toBe(modalBody?.id);
    expect(labelledBy).toBe(heading?.id);
    expect(modalBody?.className).toContain('overflow-y-auto');
  });

  it('renders stacked modals without id collisions between instances', () => {
    const handleClose1 = vi.fn();
    const handleClose2 = vi.fn();

    const { container } = render(
      <div>
        <ModalWrapper isOpen={true} onClose={handleClose1} title="Modal A">
          <div>Content A</div>
        </ModalWrapper>
        <ModalWrapper isOpen={true} onClose={handleClose2} title="Modal B">
          <div>Content B</div>
        </ModalWrapper>
      </div>
    );

    const dialogs = container.querySelectorAll('dialog');
    expect(dialogs.length).toBe(2);

    const dialogA = dialogs[0];
    const dialogB = dialogs[1];

    const titleA = dialogA.querySelector('h2');
    const titleB = dialogB.querySelector('h2');
    const bodyA = dialogA.querySelector('[data-modal-body]');
    const bodyB = dialogB.querySelector('[data-modal-body]');

    expect(titleA?.id).toBeDefined();
    expect(titleB?.id).toBeDefined();
    expect(titleA?.id).not.toBe(titleB?.id);

    expect(bodyA?.id).toBeDefined();
    expect(bodyB?.id).toBeDefined();
    expect(bodyA?.id).not.toBe(bodyB?.id);

    expect(dialogA.getAttribute('aria-labelledby')).toBe(titleA?.id);
    expect(dialogA.getAttribute('aria-describedby')).toBe(bodyA?.id);
    expect(dialogB.getAttribute('aria-labelledby')).toBe(titleB?.id);
    expect(dialogB.getAttribute('aria-describedby')).toBe(bodyB?.id);
  });
});
