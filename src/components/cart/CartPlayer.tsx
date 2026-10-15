'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { PixiBunLogo } from '@/components/ui/PixiBunLogo';
import { CART_LICENSE_LABELS, CartError, readCart, type CartRecord } from '@/lib/cart/cartFormat';
import { cartFromFragment, cartLink } from '@/lib/cart/cartLink';
import { renderCartFrames, type CartFrames } from '@/lib/cart/cartFrames';
import { lampFromPointer, relight, type Lamp } from '@/lib/cart/relight';
import { cartFromShelf, keepOnShelf, listShelf, removeFromShelf, type ShelfEntry } from '@/lib/cart/shelf';
import { setPendingCart, PENDING_CART_QUERY } from '@/lib/cart/pendingCart';
import { formatReceipt } from '@/lib/cart/receiptText';
import { unpackTrack } from '@/lib/cart/receiptRecorder';
import { applyStep, type TrackStep } from '@/lib/cart/receiptTrack';
import { createCycleRenderer } from '@/lib/color/cycleRenderer';

type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

const STUDIO_MIN_WIDTH = 1024;
const DEFAULT_LAMP: Lamp = { azimuth: 315, elevation: 45 };
/** A making-of replays in about this long, however many strokes it has. */
const REPLAY_MS = 15_000;
const REPLAY_HOLD_MS = 1_200;

function displayScale(width: number, height: number, room: number): number {
  return Math.max(1, Math.floor((Math.min(room, 520) - 24) / Math.max(width, height, 1)));
}

/** The cart player at /open: look at a cart, relight it with a finger, keep it for later. */
export function CartPlayer() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [cart, setCart] = useState<CartRecord | null>(null);
  const [frames, setFrames] = useState<CartFrames | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [lampOn, setLampOn] = useState(false);
  const [lamp, setLamp] = useState<Lamp>(DEFAULT_LAMP);
  const [lit, setLit] = useState<HTMLCanvasElement | null>(null);
  const [room, setRoom] = useState(320);
  const [wide, setWide] = useState(false);
  const [shelf, setShelf] = useState<ShelfEntry[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [kept, setKept] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [replay, setReplay] = useState<{ steps: TrackStep[]; at: number } | null>(null);
  const replayBufferRef = useRef<{ width: number; height: number; data: Uint8ClampedArray } | null>(null);

  const refreshShelf = useCallback(() => { void listShelf().then(setShelf, () => setShelf([])); }, []);

  const load = useCallback(async (next: CartRecord) => {
    setStatus({ kind: 'loading' });
    try {
      const rendered = await renderCartFrames(next.project);
      setCart(next); setFrames(rendered); setFrameIndex(0); setPlaying(rendered.frames.length > 1);
      setLamp(next.light ? { azimuth: next.light.azimuth, elevation: next.light.elevation } : DEFAULT_LAMP);
      setLampOn(false); setLit(null); setKept(false); setReplay(null);
      setStatus({ kind: 'ready' });
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof CartError ? error.message : 'This cart could not be opened.' });
    }
  }, []);

  // Open the cart in the link, if there is one.
  useEffect(() => {
    const openHash = () => {
      if (!window.location.hash) return;
      setStatus({ kind: 'loading' });
      cartFromFragment(window.location.hash).then(load, error =>
        setStatus({ kind: 'error', message: error instanceof CartError ? error.message : 'This cart link could not be opened.' }));
    };
    openHash();
    refreshShelf();
    window.addEventListener('hashchange', openHash);
    return () => window.removeEventListener('hashchange', openHash);
  }, [load, refreshShelf]);

  // Fit the drawing to the screen at a whole-number scale.
  useEffect(() => {
    const measure = () => { setRoom(Math.max(160, Math.min(window.innerWidth - 48, window.innerHeight - 260))); setWide(window.innerWidth >= STUDIO_MIN_WIDTH); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Play the frames with their own holds.
  useEffect(() => {
    if (!frames || !playing || frames.frames.length < 2) return;
    const timer = window.setTimeout(() => setFrameIndex(index => (index + 1) % frames.frames.length), frames.durations[frameIndex]);
    return () => window.clearTimeout(timer);
  }, [frames, frameIndex, playing]);

  // Relight the current frame when the lamp moves (cached per 15°).
  useEffect(() => {
    if (!frames || !lampOn) { setLit(null); return; }
    let cancelled = false;
    const frame = frames.frames[frameIndex];
    const handle = requestAnimationFrame(() => {
      void relight(frame, lamp).then(result => { if (!cancelled) setLit(result); }, () => undefined);
    });
    return () => { cancelled = true; cancelAnimationFrame(handle); };
  }, [frames, frameIndex, lamp, lampOn]);

  const scale = frames ? displayScale(frames.width, frames.height, room) : 1;

  // Replay the making-of: several steps per tick so any receipt takes about 15 seconds.
  useEffect(() => {
    if (!replay || !frames) return;
    const canvas = canvasRef.current;
    if (replay.at >= replay.steps.length) {
      const timer = window.setTimeout(() => setReplay(null), REPLAY_HOLD_MS);
      return () => window.clearTimeout(timer);
    }
    const tick = Math.max(30, REPLAY_MS / replay.steps.length);
    const perTick = Math.max(1, Math.ceil((replay.steps.length * tick) / REPLAY_MS));
    const timer = window.setTimeout(() => {
      let buffer = replayBufferRef.current;
      const end = Math.min(replay.steps.length, replay.at + perTick);
      for (let i = replay.at; i < end; i++) buffer = applyStep(replay.steps[i], buffer);
      replayBufferRef.current = buffer;
      if (canvas && buffer) {
        const ctx = canvas.getContext('2d')!;
        const picture = new ImageData(new Uint8ClampedArray(buffer.data), buffer.width, buffer.height);
        const scratch = document.createElement('canvas');
        scratch.width = buffer.width; scratch.height = buffer.height;
        scratch.getContext('2d')!.putImageData(picture, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(scratch, 0, 0, canvas.width, canvas.height);
      }
      setReplay({ steps: replay.steps, at: end });
    }, tick);
    return () => window.clearTimeout(timer);
  }, [replay, frames]);

  const watchMaking = async () => {
    if (!cart?.receipt?.track) return;
    try {
      const steps = await unpackTrack(cart.receipt.track);
      if (steps.length === 0) return;
      replayBufferRef.current = null;
      setPlaying(false); setLampOn(false); setReplay({ steps, at: 0 });
    } catch {
      setNotice('The making-of in this cart could not be read.');
    }
  };

  // Color cycling: postcards and other cycling palettes keep moving here too.
  const cycling = useMemo(() => {
    if (!cart) return null;
    const palette = cart.project.palettes.find(p => p.id === cart.project.currentPaletteId) ?? cart.project.palettes[0];
    return palette?.cycleTracks?.some(track => track.enabled && track.rate > 0) ? palette : null;
  }, [cart]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frames || !cycling || replay || lampOn) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const cycler = createCycleRenderer(frames.frames[frameIndex], cycling.colors, cycling.cycleTracks);
    const ctx = canvas.getContext('2d');
    if (!cycler || !ctx) return;
    let handle = 0;
    const start = performance.now();
    const tick = (now: number) => { cycler.render((now - start) / 1000, ctx); handle = requestAnimationFrame(tick); };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [cycling, frames, frameIndex, replay, lampOn, scale]);

  // Paint the stage.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frames || replay) return;
    canvas.width = frames.width * scale; canvas.height = frames.height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const source = lampOn && lit && lit.width === frames.width ? lit : frames.frames[frameIndex];
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  }, [frames, frameIndex, lit, lampOn, scale, replay]);

  const moveLamp = (event: React.PointerEvent) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = event.clientX - (rect.left + rect.width / 2), dy = event.clientY - (rect.top + rect.height / 2);
    setLamp(lampFromPointer(dx, dy, Math.max(rect.width, rect.height) / 2));
    setLampOn(true);
  };

  const lampPosition = useMemo(() => {
    const rad = (lamp.azimuth * Math.PI) / 180, reach = (75 - lamp.elevation) / 60;
    return { left: `${50 + Math.sin(rad) * (30 + reach * 22)}%`, top: `${50 - Math.cos(rad) * (30 + reach * 22)}%` };
  }, [lamp]);

  const openFile = async (file: File) => {
    setStatus({ kind: 'loading' });
    try {
      const found = await readCart(new Uint8Array(await file.arrayBuffer()));
      if (!found) throw new CartError('That picture has no drawing inside. Carts are PNGs saved from PixiBun.');
      window.history.replaceState(null, '', '/open');
      await load(found);
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof CartError ? error.message : 'That file could not be opened as a cart.' });
    }
  };

  const share = async () => {
    if (!cart) return;
    try {
      const link = await cartLink(cart, window.location.origin);
      if (navigator.share) await navigator.share({ title: cart.title, text: `${cart.title}, a PixiBun cart`, url: link });
      else { await navigator.clipboard.writeText(link); setNotice('Link copied. The drawing travels inside it.'); }
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') setNotice(error instanceof CartError ? error.message : 'The link could not be shared.');
    }
  };

  const keep = async () => {
    if (!cart) return;
    try { await keepOnShelf(cart); setKept(true); refreshShelf(); setNotice('On your desk. It stays in this browser for later.'); }
    catch { setNotice('This browser would not keep the cart. Copy the link instead.'); }
  };

  const openInStudio = async () => {
    if (!cart) return;
    if (await setPendingCart(cart)) window.location.assign(`/studio?${PENDING_CART_QUERY}=1`);
    else setNotice('The cart is too big to hand over. Save the card and open it in Studio.');
  };

  return (
    <main className="min-h-dvh bg-[var(--desk-bg)] text-[var(--text-heading)] px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-xl flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="PixiBun home"><PixiBunLogo size="sm" /></Link>
          <span className="font-display text-[10px] uppercase tracking-widest text-[var(--text-muted)]">cart player</span>
        </header>

        {status.kind !== 'ready' && (
          <section className="rounded-[8px] border-2 border-dashed border-[var(--desk-border)] bg-[var(--desk-surface)] p-6 text-center flex flex-col items-center gap-3" data-testid="cart-player-empty">
            {status.kind === 'loading' ? (
              <p className="text-sm text-[var(--text-body)]">Unwrapping the cart…</p>
            ) : (
              <>
                {status.kind === 'error' && <p role="alert" className="text-sm text-[var(--danger-fg)]">{status.message}</p>}
                <p className="font-display text-sm">Open a cart</p>
                <p className="text-xs text-[var(--text-body)] max-w-sm">A cart is a PixiBun picture card with a whole drawing inside. Open a link someone sent you, or pick a cart PNG.</p>
                <label className="pixel-primary-btn px-4 py-2 rounded-[6px] text-xs font-bold cursor-pointer">
                  Choose a cart
                  <input type="file" accept="image/png" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) void openFile(file); }} />
                </label>
              </>
            )}
          </section>
        )}

        {status.kind === 'ready' && cart && frames && (
          <>
            <section className="flex flex-col items-center gap-3">
              <div
                ref={stageRef}
                data-testid="cart-stage"
                className="relative rounded-[10px] p-5 bg-[var(--desk-surface)] border-2 border-[var(--desk-border)] shadow-[0_10px_30px_var(--shadow-far,rgba(0,0,0,0.3))] touch-none select-none cursor-crosshair"
                onPointerDown={event => { draggingRef.current = true; (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); moveLamp(event); }}
                onPointerMove={event => { if (draggingRef.current) moveLamp(event); }}
                onPointerUp={() => { draggingRef.current = false; }}
                onPointerCancel={() => { draggingRef.current = false; }}
              >
                {lampOn && (
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[10px]"
                    style={{ background: `radial-gradient(circle at ${lampPosition.left} ${lampPosition.top}, rgba(255, 214, 140, 0.35), transparent 55%)` }} />
                )}
                {/* Lamp-lit paper, as on the card, so dark outlines read in every theme. */}
                <div className="relative rounded-[4px] bg-[#f8ecd2] p-3 shadow-[inset_0_0_0_2px_rgba(93,74,134,0.25)]">
                  <canvas ref={canvasRef} role="img" aria-label={`${cart.title}${cart.maker ? ` by ${cart.maker}` : ''}`} className="block [image-rendering:pixelated]" data-testid="cart-canvas" />
                </div>
                {lampOn && (
                  <span aria-hidden="true" data-testid="cart-lamp" className="pointer-events-none absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-[#ffd68c] shadow-[0_0_18px_6px_rgba(255,214,140,0.7)] border-2 border-[#fff3d6]" style={lampPosition} />
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)]" aria-live="polite">
                {replay ? `Watching it come together… ${Math.min(replay.at, replay.steps.length)} of ${replay.steps.length}` : lampOn ? 'Drag to move the lamp.' : 'Drag across the drawing to light it with a lamp.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                {frames.frames.length > 1 && (
                  <>
                    <button type="button" className="pixel-tactile-btn px-3 py-1.5 rounded-[6px]" onClick={() => setPlaying(value => !value)} aria-pressed={playing}>{playing ? 'Pause' : 'Play'}</button>
                    <div className="flex items-center gap-1" role="group" aria-label="Frames">
                      {frames.frames.map((_, index) => (
                        <button key={index} type="button" aria-label={`Frame ${index + 1}`} aria-current={index === frameIndex}
                          onClick={() => { setPlaying(false); setFrameIndex(index); }}
                          className={`w-6 h-6 flex items-center justify-center rounded-full ${index === frameIndex ? 'text-[var(--accent-gold)]' : 'text-[var(--text-muted)]'}`}>
                          <span aria-hidden="true" className="block w-2 h-2 rounded-full bg-current" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <button type="button" className="pixel-tactile-btn px-3 py-1.5 rounded-[6px]" onClick={() => setLampOn(value => !value)} aria-pressed={lampOn} disabled={!!replay}>{lampOn ? 'Lamp off' : 'Lamp on'}</button>
                {cart.receipt?.track && (
                  replay
                    ? <button type="button" className="pixel-tactile-btn px-3 py-1.5 rounded-[6px]" onClick={() => setReplay(null)}>Skip</button>
                    : <button type="button" className="pixel-tactile-btn px-3 py-1.5 rounded-[6px]" onClick={() => void watchMaking()} data-testid="cart-watch-making">Watch the making</button>
                )}
              </div>
            </section>

            <section className="relative rounded-[8px] border-2 border-[var(--desk-border)] bg-[var(--desk-surface)] p-4" data-testid="cart-details">
              <h1 className="font-display text-lg leading-tight break-words">{cart.title}</h1>
              {cart.maker && <p className="text-sm text-[var(--text-body)]">by {cart.maker}</p>}
              {cart.note && <p className="mt-2 text-sm italic text-[var(--text-body)] break-words">“{cart.note}”</p>}
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs font-mono">
                <dt className="text-[var(--text-muted)]">Canvas</dt>
                <dd>{frames.width}×{frames.height} · {frames.frames.length} {frames.frames.length === 1 ? 'frame' : 'frames'}</dd>
                {cart.receipt && (<><dt className="text-[var(--text-muted)]">Made in</dt><dd>{formatReceipt(cart.receipt)}</dd></>)}
                <dt className="text-[var(--text-muted)]">License</dt><dd>{CART_LICENSE_LABELS[cart.license]}</dd>
                <dt className="text-[var(--text-muted)]">Cart</dt><dd>No. {cart.lineage.id.slice(0, 8)}</dd>
              </dl>
              {cart.lineage.parents.length > 0 && (
                <p className="mt-3 text-xs text-[var(--text-body)]">
                  Remixed from {cart.lineage.parents.map(parent => `${parent.title ?? `#${parent.id.slice(0, 8)}`}${parent.maker ? ` · ${parent.maker}` : ''}`).join(' ← ')}
                </p>
              )}
            </section>

            <section className="flex flex-wrap gap-2 justify-center">
              <button type="button" className="pixel-primary-btn px-4 py-2 rounded-[6px] text-xs font-bold" onClick={() => void keep()} disabled={kept} data-testid="cart-keep">{kept ? 'On your desk' : 'Keep on my desk'}</button>
              <button type="button" className="pixel-tactile-btn px-4 py-2 rounded-[6px] text-xs" onClick={() => void share()}>Share link</button>
              {wide && <button type="button" className="pixel-tactile-btn px-4 py-2 rounded-[6px] text-xs" onClick={() => void openInStudio()} data-testid="cart-open-studio">Open in Studio</button>}
            </section>
            {!wide && <p className="text-center text-[11px] text-[var(--text-muted)]">To remix it, open this link on a laptop or tablet in landscape.</p>}
          </>
        )}

        {notice && <p role="status" className="text-center text-xs text-[var(--text-body)]">{notice}</p>}

        {shelf.length > 0 && (
          <section aria-labelledby="shelf-heading" className="flex flex-col gap-2" data-testid="cart-shelf">
            <h2 id="shelf-heading" className="font-display text-xs uppercase tracking-widest text-[var(--text-muted)]">On your desk</h2>
            <ul className="flex flex-col gap-1.5">
              {shelf.map(entry => (
                <li key={entry.id} className="flex items-center gap-2 rounded-[6px] border border-[var(--desk-border)] bg-[var(--desk-surface)] px-3 py-2 text-xs">
                  <button type="button" className="flex-1 text-left truncate" onClick={() => { window.history.replaceState(null, '', '/open'); void cartFromShelf(entry).then(load, () => setNotice('That cart could not be read.')); }}>
                    <span className="font-bold">{entry.title}</span>{entry.maker ? <span className="text-[var(--text-muted)]"> · {entry.maker}</span> : null}
                  </button>
                  <button type="button" aria-label={`Remove ${entry.title} from your desk`} className="w-6 h-6 text-[var(--text-muted)] hover:text-[var(--danger-fg)]" onClick={() => void removeFromShelf(entry.id).then(refreshShelf)}>×</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="pt-4 text-center text-[11px] text-[var(--text-muted)]">
          Made by hand in <Link href="/" className="underline">PixiBun</Link>. Nothing here leaves your device. <Link href="/pledge" className="underline">Our pledge</Link>
        </footer>
      </div>
    </main>
  );
}
