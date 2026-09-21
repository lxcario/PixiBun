// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ServiceWorkerRegistrar } from '@/components/system/ServiceWorkerRegistrar';
import { PwaUpdateToast } from '@/components/system/PwaUpdateToast';

describe('PWA Update Lifecycle & ServiceWorkerRegistrar (Milestone C1)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('PwaUpdateToast Component', () => {
    it('renders with accessible role, message, and action buttons', () => {
      const onUpdate = vi.fn();
      const onDismiss = vi.fn();

      render(<PwaUpdateToast onUpdate={onUpdate} onDismiss={onDismiss} />);

      expect(screen.getByText(/A fresh atelier build is ready/i)).toBeDefined();
      const reloadBtn = screen.getByRole('button', { name: /reload/i });
      expect(reloadBtn).toBeDefined();

      const dismissBtn = screen.getByRole('button', { name: /dismiss update banner/i });
      expect(dismissBtn).toBeDefined();

      fireEvent.click(reloadBtn);
      expect(onUpdate).toHaveBeenCalledTimes(1);

      fireEvent.click(dismissBtn);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('ServiceWorkerRegistrar Component', () => {
    it('renders null initially when no waiting worker is detected', () => {
      const { container } = render(<ServiceWorkerRegistrar />);
      expect(container.firstChild).toBeNull();
    });

    it('displays update toast and posts SKIP_WAITING to waiting worker when reload is clicked', async () => {
      const mockPostMessage = vi.fn();
      const mockWaitingWorker = {
        state: 'installed',
        postMessage: mockPostMessage,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as ServiceWorker;

      const mockRegistration = {
        waiting: mockWaitingWorker,
        installing: null,
        active: {} as ServiceWorker,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as ServiceWorkerRegistration;

      const mockServiceWorkerContainer = {
        controller: {} as ServiceWorker,
        register: vi.fn().mockResolvedValue(mockRegistration),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      Object.defineProperty(globalThis.navigator, 'serviceWorker', {
        value: mockServiceWorkerContainer,
        writable: true,
        configurable: true,
      });

      render(<ServiceWorkerRegistrar />);

      await waitFor(() => {
        expect(screen.getByText(/A fresh atelier build is ready/i)).toBeDefined();
      });

      const reloadBtn = screen.getByRole('button', { name: /reload/i });
      fireEvent.click(reloadBtn);

      expect(mockPostMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });

    it('dismisses toast when dismiss button is clicked', async () => {
      const mockWaitingWorker = {
        state: 'installed',
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as ServiceWorker;

      const mockRegistration = {
        waiting: mockWaitingWorker,
        installing: null,
        active: {} as ServiceWorker,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as ServiceWorkerRegistration;

      const mockServiceWorkerContainer = {
        controller: {} as ServiceWorker,
        register: vi.fn().mockResolvedValue(mockRegistration),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      Object.defineProperty(globalThis.navigator, 'serviceWorker', {
        value: mockServiceWorkerContainer,
        writable: true,
        configurable: true,
      });

      render(<ServiceWorkerRegistrar />);

      await waitFor(() => {
        expect(screen.getByText(/A fresh atelier build is ready/i)).toBeDefined();
      });

      const dismissBtn = screen.getByRole('button', { name: /dismiss update banner/i });
      fireEvent.click(dismissBtn);

      expect(screen.queryByText(/A fresh atelier build is ready/i)).toBeNull();
    });
  });
});
