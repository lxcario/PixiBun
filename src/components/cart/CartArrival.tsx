'use client';

import React from 'react';
import { TactileButton } from '@/components/ui/TactileButton';
import { CART_LICENSE_LABELS, type CartRecord } from '@/lib/cart/cartFormat';
import { formatDuration } from '@/lib/cart/receiptText';

interface CartArrivalProps {
  cart: Omit<CartRecord, 'project'>;
  frames: number;
  size: string;
  error?: string | null;
  onCancel: () => void;
  onOpen: () => void;
}

/** The import dialog's view of a cart: who made it, what it remixes, and how it was made. */
export function CartArrival({ cart, frames, size, error, onCancel, onOpen }: CartArrivalProps) {
  const parents = cart.lineage.parents;
  return (
    <div className="flex flex-col gap-3" data-testid="cart-arrival">
      <div className="relative rounded-[6px] border-2 border-[var(--desk-border)] bg-[var(--desk-surface)] p-4 shadow-xs overflow-hidden">
        {/* A ticket notch on each side, like a cart label. */}
        <span aria-hidden="true" className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[var(--surface-0)] border-2 border-[var(--desk-border)]" />
        <span aria-hidden="true" className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[var(--surface-0)] border-2 border-[var(--desk-border)]" />
        <p className="text-[11px] text-[var(--text-muted)]">Bun found this on your doorstep:</p>
        <h3 className="mt-1 text-base font-bold text-[var(--text-heading)] break-words">{cart.title}</h3>
        {cart.maker && <p className="text-xs text-[var(--text-body)]">by {cart.maker}</p>}
        {cart.note && <p className="mt-2 text-xs italic text-[var(--text-body)] break-words">“{cart.note}”</p>}
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] font-mono">
          <dt className="text-[var(--text-muted)]">Canvas</dt>
          <dd className="text-[var(--text-heading)]">{size} · {frames} {frames === 1 ? 'frame' : 'frames'}</dd>
          {cart.receipt && (
            <>
              <dt className="text-[var(--text-muted)]">Made in</dt>
              <dd className="text-[var(--text-heading)]">{cart.receipt.strokes.toLocaleString()} strokes · {formatDuration(cart.receipt.activeMs)} of drawing</dd>
            </>
          )}
          {cart.light && (
            <>
              <dt className="text-[var(--text-muted)]">Light</dt>
              <dd className="text-[var(--text-heading)]">lamp at {Math.round(cart.light.azimuth)}°, {Math.round(cart.light.elevation)}° high</dd>
            </>
          )}
          <dt className="text-[var(--text-muted)]">License</dt>
          <dd className="text-[var(--text-heading)]">{CART_LICENSE_LABELS[cart.license]}</dd>
          <dt className="text-[var(--text-muted)]">Cart</dt>
          <dd className="text-[var(--text-heading)]">#{cart.lineage.id.slice(0, 8)}</dd>
        </dl>
        {parents.length > 0 && (
          <div className="mt-3 text-[11px]">
            <p className="text-[var(--text-muted)]">Remixed from</p>
            <ol className="mt-1 flex flex-wrap items-center gap-1 text-[var(--text-heading)]">
              {parents.map((parent, index) => (
                <li key={parent.id} className="flex items-center gap-1">
                  {index > 0 && <span aria-hidden="true" className="text-[var(--text-muted)]">←</span>}
                  <span className="rounded-[3px] border border-[var(--desk-border)] px-1.5 py-0.5">
                    {parent.title ?? `#${parent.id.slice(0, 8)}`}{parent.maker ? ` · ${parent.maker}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
        Opening it puts this drawing on your desk. Your current drawing is saved to Projects first. Anything you make from it will say where it came from.
      </p>
      {error && (
        <p role="alert" className="bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger-fg)] rounded-[2px] px-2 py-1.5 text-xs font-bold">{error}</p>
      )}
      <div className="flex justify-end gap-2 pt-2 border-t border-[var(--desk-border)]">
        <TactileButton size="sm" variant="default" onClick={onCancel}>Not now</TactileButton>
        <TactileButton size="sm" variant="primary" onClick={onOpen} data-testid="cart-open">Open on my desk</TactileButton>
      </div>
    </div>
  );
}
