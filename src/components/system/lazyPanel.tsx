'use client';

import React, { Component, Suspense, lazy, useState, type ComponentType, type ReactNode } from 'react';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { TactileButton } from '@/components/ui/TactileButton';
import { captureDiagnostic } from '@/lib/diagnostics/capture';

type PanelKind = 'dialog' | 'inline';

interface BoundaryProps {
  label: string;
  kind: PanelKind;
  isOpen: boolean;
  onClose?: () => void;
  onRetry: () => void;
  children: ReactNode;
}

interface BoundaryState {
  error: Error | null;
}

const RETRY_MESSAGE = 'Your drawing is untouched. If you are offline, reconnect and try again.';

/**
 * Contains a panel's failure (usually its chunk not loading offline) to that
 * panel. Without it the error reaches the Studio route boundary, which unmounts
 * the canvas and every unsaved stroke with it.
 */
export class PanelErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    void captureDiagnostic({ kind: 'error', message: `${this.props.label} could not load`, detail: error.stack || error.message });
  }

  private retry = () => {
    this.props.onRetry();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { label, kind, isOpen, onClose } = this.props;
    const actions = (
      <div className="flex gap-2 justify-end">
        {onClose && <TactileButton size="sm" variant="ghost" onClick={onClose}>Close</TactileButton>}
        <TactileButton size="sm" variant="primary" onClick={this.retry}>Try again</TactileButton>
      </div>
    );
    if (kind === 'inline') {
      return (
        <div role="alert" data-testid="panel-load-error" className="m-3 p-3 flex flex-col gap-2 text-xs rounded border border-[var(--desk-border)] bg-[var(--desk-surface-raised)] text-[var(--text-body)]">
          <p className="font-bold text-[var(--text-heading)]">{label} could not load.</p>
          <p>{RETRY_MESSAGE}</p>
          {actions}
        </div>
      );
    }
    if (!isOpen || !onClose) return null;
    return (
      <ModalWrapper isOpen onClose={onClose} title={`${label} could not open`}>
        <div role="alert" data-testid="panel-load-error" className="flex flex-col gap-3 text-xs text-[var(--text-body)]">
          <p>{RETRY_MESSAGE}</p>
          {actions}
        </div>
      </ModalWrapper>
    );
  }
}

/**
 * Code-splits a panel like next/dynamic (client only, fetched on first render)
 * and gives it a local error boundary. "Try again" starts a fresh import: the
 * bundler forgets a chunk whose request failed, so the retry fetches it again.
 */
export function lazyPanel<P extends object>(
  load: () => Promise<ComponentType<P>>,
  label: string,
  kind: PanelKind = 'dialog',
): ComponentType<P> {
  const create = () => lazy(async () => ({ default: await load() }));
  let Loaded = create();

  function LazyPanel(props: P) {
    const [, setAttempt] = useState(0);
    const { isOpen, onClose } = props as { isOpen?: boolean; onClose?: () => void };
    const retry = () => {
      Loaded = create();
      setAttempt(attempt => attempt + 1);
    };
    return (
      <PanelErrorBoundary label={label} kind={kind} isOpen={isOpen !== false} onClose={onClose} onRetry={retry}>
        <Suspense fallback={null}>
          <Loaded {...props} />
        </Suspense>
      </PanelErrorBoundary>
    );
  }
  LazyPanel.displayName = `LazyPanel(${label})`;
  return LazyPanel;
}
