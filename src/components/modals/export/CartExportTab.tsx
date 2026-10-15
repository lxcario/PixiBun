'use client';

import React, { useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { CART_LICENSE_LABELS, CART_LICENSES, cartId, type CartLicense } from '@/lib/cart/cartFormat';
import { buildCart, cartFileName, previewCard, type CartOptions } from '@/lib/cart/buildCart';
import type { CardStock } from '@/lib/cart/cartCard';
import { buildProjectFile } from '@/lib/project/serialize';
import { studioEvents } from '@/lib/events/studioEvents';

export interface CartExportHandle {
  save: () => Promise<void>;
}

const MAKER_KEY = 'pixibun-cart-maker';
const LICENSE_KEY = 'pixibun-cart-license';

function remembered(key: string): string {
  try { return window.localStorage.getItem(key) ?? ''; } catch { return ''; }
}
function remember(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* Private mode: just this time. */ }
}

interface CartExportTabProps {
  disabled?: boolean;
  onBusy: (busy: boolean) => void;
  onDone: () => void;
}

/** Export → Cart: a trading-card PNG that opens back into this drawing. */
export const CartExportTab = React.forwardRef<CartExportHandle, CartExportTabProps>(function CartExportTab({ disabled, onBusy, onDone }, ref) {
  const projectName = useStudioStore(s => s.projectName);
  const bufferVersion = useStudioStore(s => s.bufferVersion);
  const [title, setTitle] = useState(projectName === 'Untitled Sprite' ? '' : projectName);
  const [maker, setMaker] = useState('');
  const [note, setNote] = useState('');
  const [license, setLicense] = useState<CartLicense>('all-rights-reserved');
  const [stock, setStock] = useState<CardStock>('cream');
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const ids = useId();

  // Remembered once, on first open: the maker's name and license, and the time of day for the card stock.
  useEffect(() => {
    setMaker(remembered(MAKER_KEY));
    const saved = remembered(LICENSE_KEY) as CartLicense;
    if (CART_LICENSES.includes(saved)) setLicense(saved);
    if (document.documentElement.dataset.colorScheme === 'night') setStock('night');
  }, []);

  const options: CartOptions = { title: title || projectName, maker, note, license, stock };

  // The postmark number follows the drawing, so recompute it only when pixels change.
  const [previewId, setPreviewId] = useState('');
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void cartId(buildProjectFile()).then(id => { if (!cancelled) setPreviewId(id); }, () => undefined);
    }, 120);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [bufferVersion]);

  // Live preview of the card face; the drawing is packed only on save.
  useEffect(() => {
    if (!previewId) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const card = await previewCard(options, previewId);
          if (cancelled || !previewRef.current) return;
          card.setAttribute('aria-hidden', 'true');
          card.className = 'block max-w-full max-h-[340px] w-auto h-auto mx-auto [image-rendering:pixelated]';
          previewRef.current.replaceChildren(card);
        } catch {
          // The preview is a courtesy; saving reports real problems.
        }
      })();
    }, 180);
    return () => { cancelled = true; window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options is rebuilt from these fields each render.
  }, [title, maker, note, license, stock, previewId, projectName]);

  useImperativeHandle(ref, () => ({
    save: async () => {
      setError(null);
      onBusy(true);
      try {
        const { record, png } = await buildCart(options);
        remember(MAKER_KEY, maker.trim());
        remember(LICENSE_KEY, license);
        const url = URL.createObjectURL(new Blob([png], { type: 'image/png' }));
        const link = document.createElement('a');
        link.download = cartFileName(record);
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        studioEvents.emit('pixibun:toast', { type: 'success', message: 'Cart saved. Anyone who opens it in PixiBun gets the whole drawing.' });
        onDone();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'The cart could not be made.');
      } finally {
        onBusy(false);
      }
    },
  }));

  const field = 'w-full bg-[var(--surface-0)] border border-[var(--desk-border)] rounded-[3px] px-2 py-1.5 text-xs text-[var(--text-heading)] focus:outline-none focus:border-[var(--accent-gold)]';
  return (
    <div className="flex flex-col gap-3" data-testid="cart-export">
      <p className="text-xs text-[var(--text-body)] leading-relaxed">
        A cart is a picture card with your whole drawing tucked inside. Post it or send it; anyone who drops it into PixiBun can open it, relight it and make it their own.
      </p>
      <div className="grid grid-cols-[1fr_200px] gap-3 max-sm:grid-cols-1">
        <div
          ref={previewRef}
          role="img"
          aria-label={`Card preview: ${options.title}`}
          data-testid="cart-preview"
          className="min-h-[200px] flex items-center justify-center rounded-[4px] bg-[var(--surface-0)] border border-dashed border-[var(--desk-border)] p-2"
        />
        <div className="flex flex-col gap-2 text-[11px]">
          <label className="flex flex-col gap-1" htmlFor={`${ids}-title`}>
            <span className="text-[var(--text-muted)]">Title</span>
            <input id={`${ids}-title`} className={field} value={title} maxLength={80} placeholder={projectName} onChange={e => setTitle(e.target.value)} disabled={disabled} />
          </label>
          <label className="flex flex-col gap-1" htmlFor={`${ids}-maker`}>
            <span className="text-[var(--text-muted)]">Your name <span className="opacity-70">(optional)</span></span>
            <input id={`${ids}-maker`} className={field} value={maker} maxLength={80} placeholder="Leave blank to stay anonymous" onChange={e => setMaker(e.target.value)} disabled={disabled} />
          </label>
          <label className="flex flex-col gap-1" htmlFor={`${ids}-note`}>
            <span className="text-[var(--text-muted)]">A note <span className="opacity-70">(optional)</span></span>
            <textarea id={`${ids}-note`} className={`${field} resize-none`} rows={2} value={note} maxLength={280} placeholder="for the next person who opens it" onChange={e => setNote(e.target.value)} disabled={disabled} />
          </label>
          <label className="flex flex-col gap-1" htmlFor={`${ids}-license`}>
            <span className="text-[var(--text-muted)]">License</span>
            <select id={`${ids}-license`} className={field} value={license} onChange={e => setLicense(e.target.value as CartLicense)} disabled={disabled}>
              {CART_LICENSES.map(value => <option key={value} value={value}>{CART_LICENSE_LABELS[value]}</option>)}
            </select>
          </label>
          <fieldset className="flex flex-col gap-1">
            <legend className="text-[var(--text-muted)] mb-1">Card stock</legend>
            <div className="flex gap-1">
              {(['cream', 'night'] as const).map(value => (
                <label key={value} className={`flex-1 flex items-center justify-center gap-1 rounded-[3px] border px-2 py-1 cursor-pointer ${stock === value ? 'border-[var(--accent-gold)] text-[var(--text-heading)]' : 'border-[var(--desk-border)] text-[var(--text-muted)]'}`}>
                  <input type="radio" name={`${ids}-stock`} className="sr-only" checked={stock === value} onChange={() => setStock(value)} disabled={disabled} />
                  <span aria-hidden="true" className="w-3 h-3 rounded-[2px] border border-[var(--desk-border)]" style={{ background: value === 'cream' ? '#f6ead2' : '#241a3b' }} />
                  {value === 'cream' ? 'Cream' : 'Night'}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
        Nothing about you goes in unless you type it here. Some sites shrink or convert images and drop the drawing inside; the card still shows.
      </p>
      {error && <p role="alert" className="text-xs text-[var(--danger-fg)] bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-[2px] px-2 py-1.5">{error}</p>}
    </div>
  );
});
