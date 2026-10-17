'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo, useLayoutEffect, useId } from 'react';
import { animate, motion, useMotionValue, useSpring, useTransform, useVelocity } from 'motion/react';
import { useStudioStore } from '@/stores/studioStore';
import { studioEvents } from '@/lib/events/studioEvents';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { shouldIgnoreWorkspaceKey, workspaceShortcutKey } from '@/lib/input/workspaceKeyboard';
import {
  coordsToLightAngles,
  lightAnglesToCoords,
  computeArtworkCentroid,
  GizmoPoint,
} from '@/lib/canvas/lightGizmoMath';
import { LIGHT_TINTS, useLightLook, type LightLook } from '@/lib/canvas/lightLook';
import { SpringSurface, Reveal } from '@/components/ui/surfaces/SpringSurface';
import { Collapse } from '@/components/ui/surfaces/Collapse';
import { SNAP, spring } from '@/lib/motion/springs';
import { useReducedMotion } from '@/lib/motion/useReducedMotion';
import { useLab } from '@/experimental/labsStore';
import type { MaterialType } from '@/types/tools';
import './lightBar.css';

/** Quick light directions, row by row around Recenter. 0° is above the artwork, clockwise. */
const COMPASS: Array<{ label: string; glyph: string; azimuth: number | null }> = [
  { label: 'top left', glyph: '↖', azimuth: 315 }, { label: 'above', glyph: '↑', azimuth: 0 }, { label: 'top right', glyph: '↗', azimuth: 45 },
  { label: 'the left', glyph: '←', azimuth: 270 }, { label: 'center', glyph: '↺', azimuth: null }, { label: 'the right', glyph: '→', azimuth: 90 },
  { label: 'bottom left', glyph: '↙', azimuth: 225 }, { label: 'below', glyph: '↓', azimuth: 180 }, { label: 'bottom right', glyph: '↘', azimuth: 135 },
];

const MATERIALS: Array<{ value: MaterialType; label: string; title: string }> = [
  { value: 'matte', label: 'Matte', title: 'Matte: soft, chalky light' },
  { value: 'fabric', label: 'Fabric', title: 'Fabric: velvety, wraps around edges' },
  { value: 'metal', label: 'Metal', title: 'Metal: sharp, bright reflections' },
  { value: 'gold', label: 'Gold', title: 'Gold: warm metallic shine' },
  { value: 'glass', label: 'Glass', title: 'Glass: glossy, see-through highlight' },
];

const LOOK_DEFAULTS = { lightColor: '#FFFFFF', ambientIntensity: 0.48, cavityStrength: 1, ditherModulation: 0 };

function angleDistance(a: number, b: number) {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return Math.min(d, 360 - d);
}

/** Matches LIQUID_GLIDE_EVENT in the Labs liquid sliders; harmless when that lab is off. */
const LIQUID_GLIDE_EVENT = 'pixibun:liquid-glide';

/**
 * A native range (so themes and the Labs liquid lens dress it) with its filled track drawn
 * inline. When its value changes from elsewhere (a stepper, a preset, the wheel) it asks the
 * liquid lens to glide from the old value instead of jumping.
 */
function LightRange({ label, min, max, step, value, onChange, testId }: {
  label: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void; testId?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const previous = useRef(value);
  const fromSelf = useRef(false);
  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (fromSelf.current) { fromSelf.current = false; return; }
    if (from !== value) ref.current?.dispatchEvent(new CustomEvent(LIQUID_GLIDE_EVENT, { bubbles: true, detail: { from } }));
  }, [value]);
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <input
      ref={ref}
      type="range"
      aria-label={label}
      data-testid={testId}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => { fromSelf.current = true; onChange(parseFloat(e.target.value)); }}
      className="lb-range"
      style={{ backgroundImage: `linear-gradient(90deg, var(--primary-bg) 0 ${pct}%, var(--desk-border) ${pct}% 100%)` }}
    />
  );
}

/** One control in the bar: its name and value on top, the control underneath. */
function LightField({ label, value, valueTestId, title, action, children }: {
  label: string; value?: string; valueTestId?: string; title?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="lb-field" title={title}>
      <span className="lb-field-head">
        <span className="lb-label">{label}</span>
        {value !== undefined && <span className="lb-value" data-testid={valueTestId}>{value}</span>}
        {action}
      </span>
      <span className="lb-field-body">{children}</span>
    </div>
  );
}

function tintName(color: string) {
  return LIGHT_TINTS.find((tint) => tint.color === color.toUpperCase())?.label ?? color.toUpperCase();
}

/** Pressed-button choices whose highlight slides between them on the snap spring. */
// The tool rail lens's timings (src/experimental/liquidControls/ToolRailLens.tsx), so the
// light bar's segments and the rail read as one material.
const LENS_HOLD_MS = 170;
const LENS_DRAG_SLOP = 5;
const LENS_FOLLOW = { type: 'spring', stiffness: 700, damping: 50, mass: 0.6 } as const;

/**
 * Segmented choice with a liquid lens: the chosen option's highlight springs to it and
 * stretches with its speed, like the tool rail's lens. With the Liquid controls lab on,
 * press and hold (or press and slide) lifts the lens into glass that follows the pointer;
 * releasing chooses the option under it. Taps and the keyboard work as before.
 * The lens is placed from offsets inside the segment, so the bar moving or growing
 * (opening More) never displaces it; a shared-layout thumb was measured on screen and
 * trailed a row behind while the bar moved.
 */
function ChoiceSegment<T extends string | number>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; testId?: string; title?: string }>;
  onChange: (value: T) => void;
}) {
  const reduce = useReducedMotion();
  const liquid = useLab('liquidControls');
  const segmentRef = useRef<HTMLDivElement>(null);
  const index = options.findIndex((option) => option.value === value);
  const x = useMotionValue(0);
  const width = useMotionValue(0);
  const lift = useMotionValue(1);
  const speed = useSpring(useTransform(useVelocity(x), (v) => Math.min(Math.abs(v) / 2400, 0.22)), { stiffness: 420, damping: 40 });
  const scaleX = useTransform([speed, lift], ([s, l]: number[]) => l * (1 + s));
  const scaleY = useTransform([speed, lift], ([s, l]: number[]) => l * (1 - s * 0.45));
  const [placed, setPlaced] = useState(false);
  const [glass, setGlass] = useState(false);
  const placedRef = useRef(false);
  const holding = useRef(false);

  const optionRects = useCallback(() => Array.from(segmentRef.current?.querySelectorAll<HTMLElement>('.lb-seg-opt') ?? [])
    .map((button) => ({ button, left: button.offsetLeft, width: button.offsetWidth })), []);
  const target = useCallback(() => optionRects()[index] ?? null, [index, optionRects]);

  // A new choice glides (also from wherever a held lens was let go); the first placement jumps.
  useLayoutEffect(() => {
    const to = target();
    if (!to) return;
    if (!placedRef.current || reduce) {
      x.jump(to.left); width.jump(to.width);
      placedRef.current = true; setPlaced(true);
      return;
    }
    const runs = [animate(x, to.left, spring(SNAP)), animate(width, to.width, spring(SNAP))];
    return () => runs.forEach((run) => run.stop());
  }, [target, reduce, x, width]);

  // Only the segment's own size (fonts, labels) re-places the lens, at once. One observer
  // for the segment's life: a new one reports at once and would cut every glide short.
  const targetRef = useRef(target);
  targetRef.current = target;
  useLayoutEffect(() => {
    const segment = segmentRef.current;
    if (!segment || typeof ResizeObserver === 'undefined') return;
    let size = { width: segment.offsetWidth, height: segment.offsetHeight };
    const observer = new ResizeObserver(() => {
      const next = { width: segment.offsetWidth, height: segment.offsetHeight };
      if (next.width === size.width && next.height === size.height) return;
      size = next;
      const to = targetRef.current();
      if (to && placedRef.current && !holding.current) { x.jump(to.left); width.jump(to.width); }
    });
    observer.observe(segment);
    return () => observer.disconnect();
  }, [x, width]);

  // Press, hold and slide, as on the tool rail, along x.
  useEffect(() => {
    const segment = segmentRef.current;
    if (!segment || !liquid) return;
    type Rect = ReturnType<typeof optionRects>[number];
    type Drag = { id: number; startX: number; offset: number; timer: ReturnType<typeof setTimeout> | null; live: boolean };
    let drag: Drag | null = null;
    let under: HTMLElement | null = null;
    let suppressClick = false;
    const markUnder = (button: HTMLElement | null) => {
      if (under === button) return;
      if (under) delete under.dataset.lqUnder;
      under = button;
      if (under) under.dataset.lqUnder = '';
    };
    const nearest = (center: number) => optionRects().reduce<Rect | null>((best, rect) =>
      !best || Math.abs(rect.left + rect.width / 2 - center) < Math.abs(best.left + best.width / 2 - center) ? rect : best, null);
    const begin = () => {
      const d = drag;
      if (!d || d.live) return;
      d.live = true; holding.current = true; setGlass(true);
      if (!reduce) animate(lift, 1.1, { type: 'spring', stiffness: 300, damping: 22 });
      try { segment.setPointerCapture(d.id); } catch { /* The pointer was already released. */ }
    };
    const follow = (clientX: number) => {
      const d = drag;
      const rects = optionRects();
      if (!d || !rects.length) return;
      const min = rects[0].left, max = rects[rects.length - 1].left;
      let left = clientX - segment.getBoundingClientRect().left - d.offset;
      // Rubber band past the ends, like pulling an elastic.
      if (left < min) left = min - Math.pow(min - left, 0.7);
      else if (left > max) left = max + Math.pow(left - max, 0.7);
      const over = nearest(left + width.get() / 2);
      if (reduce) x.set(left); else animate(x, left, LENS_FOLLOW);
      if (over) {
        if (reduce) width.set(over.width); else animate(width, over.width, LENS_FOLLOW);
        markUnder(over.button);
      }
    };
    const end = (commit: boolean) => {
      const d = drag;
      drag = null;
      if (!d) return;
      if (d.timer) clearTimeout(d.timer);
      if (!d.live) return;
      // Choose the option shown magnified under the lens: it follows the pointer, while the
      // lens itself is still springing after it.
      const chosen = commit ? under : null;
      holding.current = false; setGlass(false); markUnder(null);
      if (!reduce) animate(lift, 1, { type: 'spring', stiffness: 280, damping: 21 });
      if (chosen && chosen.getAttribute('aria-pressed') !== 'true') chosen.click();
      else {
        const to = targetRef.current();
        if (to) { animate(x, to.left, spring(SNAP)); animate(width, to.width, spring(SNAP)); }
      }
      // The release is not also a click on whatever sits under it.
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || drag || !(e.target as Element | null)?.closest('.lb-seg-opt')) return;
      // Grab the lens where it was touched, so it does not jump under the finger.
      const touch = e.clientX - segment.getBoundingClientRect().left;
      const onLens = touch >= x.get() && touch <= x.get() + width.get();
      drag = { id: e.pointerId, startX: e.clientX, offset: onLens ? touch - x.get() : width.get() / 2, live: false,
        timer: setTimeout(() => { begin(); follow(e.clientX); }, LENS_HOLD_MS) };
    };
    const onMove = (e: PointerEvent) => {
      const d = drag;
      if (!d || d.id !== e.pointerId) return;
      if (!d.live && Math.abs(e.clientX - d.startX) > LENS_DRAG_SLOP) begin();
      if (d.live) follow(e.clientX);
    };
    const onUp = (e: PointerEvent) => { if (drag?.id === e.pointerId) end(true); };
    const onCancel = () => end(false);
    const onLost = () => { if (drag?.live) end(true); };
    const onClick = (e: MouseEvent) => { if (suppressClick) { suppressClick = false; e.stopPropagation(); e.preventDefault(); } };
    segment.addEventListener('pointerdown', onDown);
    segment.addEventListener('pointermove', onMove);
    segment.addEventListener('pointerup', onUp);
    segment.addEventListener('pointercancel', onCancel);
    segment.addEventListener('lostpointercapture', onLost);
    segment.addEventListener('click', onClick, true);
    return () => {
      if (drag?.timer) clearTimeout(drag.timer);
      drag = null; holding.current = false; markUnder(null);
      segment.removeEventListener('pointerdown', onDown);
      segment.removeEventListener('pointermove', onMove);
      segment.removeEventListener('pointerup', onUp);
      segment.removeEventListener('pointercancel', onCancel);
      segment.removeEventListener('lostpointercapture', onLost);
      segment.removeEventListener('click', onClick, true);
    };
  }, [liquid, reduce, optionRects, x, width, lift]);

  return (
    <div ref={segmentRef} className="lb-seg" role="group" aria-label={label} data-liquid={liquid || undefined}>
      {index >= 0 && (
        <motion.span aria-hidden="true" className={`lb-seg-thumb${glass ? ' is-glass' : ''}`}
          style={{ x, width, scaleX, scaleY, opacity: placed ? 1 : 0 }} />
      )}
      {options.map((option) => (
        <button key={String(option.value)} type="button" className="lb-seg-opt" aria-pressed={option.value === value}
          data-testid={option.testId} title={option.title}
          onClick={(e) => { e.stopPropagation(); onChange(option.value); }}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface PixelLightBulbGizmoProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  mainCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onCommit: () => void;
  onCancel: () => void;
  onLightChange?: (
    azimuth: number,
    elevation: number,
    centerX?: number,
    centerY?: number,
    brightness?: number,
    look?: LightLook
  ) => void;
}

export const PixelLightBulbGizmo: React.FC<PixelLightBulbGizmoProps> = ({
  canvasWidth,
  canvasHeight,
  zoom,
  mainCanvasRef,
  onCommit,
  onCancel,
  onLightChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement | null>(null);
  const panX = useStudioStore((s) => s.panX);
  const panY = useStudioStore((s) => s.panY);
  const [hudBounds, setHudBounds] = useState<{ left: number; top: number; maxWidth: number } | null>(null);
  const tools = useStudioStore((s) => s.tools);
  const setLightAzimuth = useStudioStore((s) => s.setLightAzimuth);
  const setLightElevation = useStudioStore((s) => s.setLightElevation);
  const setLightBrightness = useStudioStore((s) => s.setLightBrightness);
  const glintOnly = useStudioStore((s) => s.photometricGlintOnly);
  const setGlintStyle = useStudioStore((s) => s.setGlintStyle);
  const setShadingBands = useStudioStore((s) => s.setShadingBands);
  const setMaterialPreset = useStudioStore((s) => s.setMaterialPreset);
  const setCavityStrength = useStudioStore((s) => s.setCavityStrength);
  const setDitherModulation = useStudioStore((s) => s.setDitherModulation);
  const look = useLightLook();
  const [moreOpen, setMoreOpen] = useState(false);
  const drawerId = useId();

  const [dragTarget, setDragTarget] = useState<'none' | 'bulb' | 'center'>('none');
  const [brightness, setBrightness] = useState<number>(() => tools.lightBrightness ?? 1.15);

  const rafIdRef = useRef<number | null>(null);
  const pendingChangeRef = useRef<{
    azimuth: number;
    elevation: number;
    centerX: number;
    centerY: number;
    brightness: number;
  } | null>(null);

  const scale = zoom / 100;
  const stageWidth = canvasWidth * scale;
  const stageHeight = canvasHeight * scale;

  // Keep every HUD action inside the workspace, even when zoomed or panned.
  useLayoutEffect(() => {
    const container = containerRef.current, hud = hudRef.current;
    const workspace = container?.closest('main');
    if (!container || !hud || !workspace) return;
    const place = () => {
      const stage = container.getBoundingClientRect(), area = workspace.getBoundingClientRect();
      if (!area.width) return;
      const maxWidth = Math.max(1, area.width - 16);
      // Layout size, not the blooming (scaled) box.
      const size = { width: hud.offsetWidth, height: hud.offsetHeight };
      const width = Math.min(size.width, maxWidth);
      const minLeft = area.left - stage.left + 8;
      const maxLeft = area.right - stage.left - width - 8;
      const left = Math.max(minLeft, Math.min(maxLeft, stage.width / 2 - width / 2)) + width / 2;
      const top = Math.max(area.top - stage.top + 8, Math.min(stage.height + 8, area.bottom - stage.top - size.height - 8));
      setHudBounds(previous => previous?.left === left && previous.top === top && previous.maxWidth === maxWidth
        ? previous : { left, top, maxWidth });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(workspace); observer.observe(hud); observer.observe(container);
    window.addEventListener('resize', place);
    return () => { observer.disconnect(); window.removeEventListener('resize', place); };
  }, [canvasWidth, canvasHeight, zoom, panX, panY, glintOnly, moreOpen]);

  // Middle light point in canvas coordinates (freely draggable focus)
  const [canvasCentroid, setCanvasCentroid] = useState<GizmoPoint>(() => ({
    x: Math.round(canvasWidth / 2),
    y: Math.round(canvasHeight / 2),
  }));

  // Initialize from artwork centroid on mount
  useEffect(() => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    try {
      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const centroid = computeArtworkCentroid(imgData.data, canvasWidth, canvasHeight);
      setCanvasCentroid(centroid);
    } catch {
      setCanvasCentroid({
        x: Math.round(canvasWidth / 2),
        y: Math.round(canvasHeight / 2),
      });
    }
  }, [canvasWidth, canvasHeight, mainCanvasRef]);

  // Middle light point in stage coordinates
  const stageCentroid = useMemo<GizmoPoint>(() => ({
    x: canvasCentroid.x * scale,
    y: canvasCentroid.y * scale,
  }), [canvasCentroid, scale]);

  // Radius representing horizon grazing (0° elevation)
  const maxRadius = useMemo(() => {
    return Math.max(40, Math.min(stageWidth, stageHeight) * 0.44);
  }, [stageWidth, stageHeight]);

  // Current bulb coordinates on stage (orbits around middle light point)
  const bulbCoords = useMemo(() => {
    return lightAnglesToCoords(
      tools.lightAzimuth,
      tools.lightElevation,
      stageCentroid.x,
      stageCentroid.y,
      maxRadius
    );
  }, [tools.lightAzimuth, tools.lightElevation, stageCentroid, maxRadius]);

  // Throttled 60 FPS update loop during drag
  const flushLightChange = useCallback(() => {
    if (pendingChangeRef.current) {
      const { azimuth, elevation, centerX, centerY, brightness: b } = pendingChangeRef.current;
      setLightAzimuth(azimuth);
      setLightElevation(elevation);
      setLightBrightness(b);
      onLightChange?.(azimuth, elevation, centerX, centerY, b, useLightLook.getState());
      pendingChangeRef.current = null;
    }
    rafIdRef.current = null;
  }, [setLightAzimuth, setLightElevation, setLightBrightness, onLightChange]);

  const scheduleLightChange = useCallback((
    azimuth: number,
    elevation: number,
    centerX: number,
    centerY: number,
    newBrightness: number
  ) => {
    pendingChangeRef.current = {
      azimuth,
      elevation,
      centerX,
      centerY,
      brightness: newBrightness,
    };
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(flushLightChange);
    }
  }, [flushLightChange]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const updateStrength = useCallback((val: number) => {
    const clamped = Math.max(0.3, Math.min(2.5, Math.round(val * 100) / 100));
    setBrightness(clamped);
    scheduleLightChange(tools.lightAzimuth, tools.lightElevation, canvasCentroid.x, canvasCentroid.y, clamped);
  }, [tools.lightAzimuth, tools.lightElevation, canvasCentroid, scheduleLightChange]);

  const adjustStrength = useCallback((delta: number) => {
    setBrightness((prev) => {
      const next = Math.max(0.3, Math.min(2.5, Math.round((prev + delta) * 100) / 100));
      scheduleLightChange(tools.lightAzimuth, tools.lightElevation, canvasCentroid.x, canvasCentroid.y, next);
      return next;
    });
  }, [tools.lightAzimuth, tools.lightElevation, canvasCentroid, scheduleLightChange]);

  const resetFocus = useCallback(() => {
    const cx = Math.round(canvasWidth / 2);
    const cy = Math.round(canvasHeight / 2);
    setCanvasCentroid({ x: cx, y: cy });
    scheduleLightChange(tools.lightAzimuth, tools.lightElevation, cx, cy, brightness);
  }, [canvasWidth, canvasHeight, tools.lightAzimuth, tools.lightElevation, brightness, scheduleLightChange]);

  /**
   * Queue a re-render that changes only what is given. It builds on a change still waiting for
   * the next frame, so two quick edits (height, then tint) both land.
   */
  const scheduleCurrent = useCallback((patch: { azimuth?: number; elevation?: number } = {}) => {
    const pending = pendingChangeRef.current;
    const t = useStudioStore.getState().tools;
    scheduleLightChange(
      patch.azimuth ?? pending?.azimuth ?? t.lightAzimuth,
      patch.elevation ?? pending?.elevation ?? t.lightElevation,
      pending?.centerX ?? canvasCentroid.x,
      pending?.centerY ?? canvasCentroid.y,
      pending?.brightness ?? brightness,
    );
  }, [canvasCentroid, brightness, scheduleLightChange]);

  const aimFrom = useCallback((azimuth: number) => scheduleCurrent({ azimuth }), [scheduleCurrent]);
  const updateHeight = useCallback((elevation: number) => scheduleCurrent({ elevation: Math.round(elevation) }), [scheduleCurrent]);

  const setLook = useCallback((patch: Partial<LightLook>) => {
    useLightLook.setState(patch);
    scheduleCurrent();
  }, [scheduleCurrent]);

  const resetLook = useCallback(() => {
    setCavityStrength(LOOK_DEFAULTS.cavityStrength);
    setDitherModulation(LOOK_DEFAULTS.ditherModulation);
    setLook({ lightColor: LOOK_DEFAULTS.lightColor, ambientIntensity: LOOK_DEFAULTS.ambientIntensity });
  }, [setCavityStrength, setDitherModulation, setLook]);

  const handleApply = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    flushLightChange();
    onCommit();
  }, [flushLightChange, onCommit]);

  const handleCancel = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    pendingChangeRef.current = null;
    onCancel();
  }, [onCancel]);

  // Global keyboard shortcuts: Enter to apply, Escape to cancel, [-]/[+] to adjust strength, Alt+R to reset focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreWorkspaceKey(e, containerRef.current)) return;
      if (e.key === 'Enter' && (e.target as HTMLElement)?.closest?.('button, input, select')) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleApply();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      } else if (e.key === '[' || e.key === '-') {
        e.preventDefault();
        e.stopPropagation();
        adjustStrength(-0.15);
      } else if (e.key === ']' || e.key === '+' || e.key === '=') {
        e.preventDefault();
        e.stopPropagation();
        adjustStrength(+0.15);
      } else if (workspaceShortcutKey(e) === 'r' && e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        resetFocus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [handleApply, handleCancel, adjustStrength, resetFocus]);

  // Listen for wheel events dispatched from viewport background
  useEffect(() => {
    const unsub = studioEvents.on('pixibun:photometric-strength-delta', (delta) => {
      adjustStrength(delta);
    });
    return () => {
      unsub();
    };
  }, [adjustStrength]);

  // Update angles from client pointer event (drags bulb around center point)
  const updateAnglesFromPointer = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = Math.max(0, Math.min(stageWidth, clientX - rect.left));
    const py = Math.max(0, Math.min(stageHeight, clientY - rect.top));

    const angles = coordsToLightAngles(
      px,
      py,
      stageCentroid.x,
      stageCentroid.y,
      maxRadius
    );

    scheduleLightChange(angles.azimuth, angles.elevation, canvasCentroid.x, canvasCentroid.y, brightness);
  }, [stageWidth, stageHeight, stageCentroid, maxRadius, canvasCentroid, brightness, scheduleLightChange]);

  // Update center position from client pointer event (drags center point)
  const updateCenterFromPointer = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    const clampedPx = Math.max(0, Math.min(stageWidth, px));
    const clampedPy = Math.max(0, Math.min(stageHeight, py));
    const newCanvasX = Math.round(clampedPx / scale);
    const newCanvasY = Math.round(clampedPy / scale);

    setCanvasCentroid({ x: newCanvasX, y: newCanvasY });
    scheduleLightChange(tools.lightAzimuth, tools.lightElevation, newCanvasX, newCanvasY, brightness);
  }, [stageWidth, stageHeight, scale, tools.lightAzimuth, tools.lightElevation, brightness, scheduleLightChange]);

  const handleBulbPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragTarget('bulb');
    updateAnglesFromPointer(e.clientX, e.clientY);
  };

  const handleCenterPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragTarget('center');
    updateCenterFromPointer(e.clientX, e.clientY);
  };

  const handleContainerPointerDown = (e: React.PointerEvent) => {
    // Ignore clicks on HUD buttons or inputs and stop propagation to viewport
    if ((e.target as HTMLElement).closest('button, input, [role="toolbar"]')) {
      e.stopPropagation();
      return;
    }

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // If pointer is near center reticle (< 24px), drag center
    const distCenter = Math.hypot(px - stageCentroid.x, py - stageCentroid.y);
    if (distCenter <= 24) {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDragTarget('center');
      updateCenterFromPointer(e.clientX, e.clientY);
      return;
    }

    // Otherwise, drag/aim light bulb towards pointer position
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragTarget('bulb');
    updateAnglesFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragTarget === 'bulb') {
      e.preventDefault();
      e.stopPropagation();
      updateAnglesFromPointer(e.clientX, e.clientY);
    } else if (dragTarget === 'center') {
      e.preventDefault();
      e.stopPropagation();
      updateCenterFromPointer(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragTarget !== 'none') {
      e.preventDefault();
      e.stopPropagation();
      setDragTarget('none');
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture may already have been released by browser
      }
      if (pendingChangeRef.current) {
        flushLightChange();
      }
    }
  };

  const handleResetCenter = () => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    try {
      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const centroid = computeArtworkCentroid(imgData.data, canvasWidth, canvasHeight);
      setCanvasCentroid(centroid);
      scheduleLightChange(tools.lightAzimuth, tools.lightElevation, centroid.x, centroid.y, brightness);
    } catch {
      const def = { x: Math.round(canvasWidth / 2), y: Math.round(canvasHeight / 2) };
      setCanvasCentroid(def);
      scheduleLightChange(tools.lightAzimuth, tools.lightElevation, def.x, def.y, brightness);
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.10 : -0.10;
      adjustStrength(delta);
    };
    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onNativeWheel);
    };
  }, [adjustStrength]);

  return (
    <div
      ref={containerRef}
      data-testid="pixel-light-bulb-gizmo"
      className="absolute inset-0 z-30 pointer-events-auto select-none"
      style={{ width: `${stageWidth}px`, height: `${stageHeight}px` }}
      onPointerDown={handleContainerPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Floating light bar (below the canvas), on the shared surface: blooms in, springs its drawer */}
      <SpringSurface
        ref={hudRef}
        origin="top center"
        className="lb-bar pb-panel absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
        style={hudBounds ? { left: hudBounds.left, top: hudBounds.top, maxWidth: hudBounds.maxWidth, marginTop: 0 } : undefined}
        role="toolbar"
        aria-label="Live Light Bulb Controls"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Reveal className="lb-row">
          <div className="lb-head">
            <span className="lb-bulb" aria-hidden="true" style={{ ['--tint' as string]: look.lightColor }}>
              <PixelIcon name="lamp" size={16} />
            </span>
            <span className="lb-head-text">
              <span className="lb-title">{glintOnly ? 'Live Glint' : 'Live Light Bulb'}</span>
              <span className="lb-readout" title="Light direction (0° is above) and height">
                {tools.lightAzimuth}° · {tools.lightElevation}°
              </span>
            </span>
          </div>

          {/* Direction: eight quick angles around Recenter */}
          <div className="lb-compass" role="group" aria-label="Light direction" title="Light from a direction (or drag the bulb for any angle)">
            {COMPASS.map((dir) => dir.azimuth === null ? (
              <button key="center" type="button" onClick={handleResetCenter} aria-label="Recenter light"
                title="Reset the light's focus to the middle of your artwork (Alt+R)" className="lb-dir lb-dir-center">↺</button>
            ) : (
              <button key={dir.label} type="button" aria-label={`Light from ${dir.label}`} title={`Light from ${dir.label}`}
                aria-pressed={angleDistance(tools.lightAzimuth, dir.azimuth) < 22.5}
                onClick={() => aimFrom(dir.azimuth!)} className="lb-dir">{dir.glyph}</button>
            ))}
          </div>

          <LightField label="Strength" value={`${Math.round(brightness * 100)}%`} valueTestId="pixel-light-strength-val"
            title="Light strength (- / + keys or the mouse wheel)">
            <button type="button" data-testid="pixel-light-strength-dec" className="lb-step"
              onClick={(e) => { e.stopPropagation(); adjustStrength(-0.15); }}
              title="Decrease light strength (- / [)" aria-label="Decrease light strength">−</button>
            <LightRange label="Light Strength Slider" min={0.3} max={2.5} step={0.05} value={brightness} onChange={updateStrength} />
            <button type="button" data-testid="pixel-light-strength-inc" className="lb-step"
              onClick={(e) => { e.stopPropagation(); adjustStrength(+0.15); }}
              title="Increase light strength (+ / ])" aria-label="Increase light strength">+</button>
          </LightField>

          <LightField label="Height" value={`${tools.lightElevation}°`}
            title="Light height: low lights rake across the surface, high lights shine from overhead">
            <LightRange label="Light height" min={5} max={85} step={1} value={tools.lightElevation} onChange={updateHeight} testId="pixel-light-height" />
          </LightField>

          {!glintOnly && (
            <LightField label="Shade" title="Shadow tones: 1 = classic two-tone, 2 = mid + core, 3 = penumbra + mid + core">
              <ChoiceSegment
                label="Shading tones"
                value={tools.shadingBands}
                options={[1, 2, 3].map((count) => ({
                  value: count as 1 | 2 | 3,
                  label: String(count),
                  testId: `pixel-light-shade-${count}`,
                  title: count === 1 ? 'Single: 1 shadow tone (classic 2-tone cel-shading)' : count === 2 ? 'Dual: 2 shadow tones (mid + core shadow)' : 'Trio: 3 shadow tones (soft penumbra + mid + deep core)',
                }))}
                onChange={(count) => { setShadingBands(count); scheduleCurrent(); }}
              />
            </LightField>
          )}

          <LightField label="Glint" title="The small reflected highlight">
            <ChoiceSegment
              label="Glint style"
              value={tools.glintStyle ?? 'soft'}
              options={(['off', 'soft', 'crisp'] as const).map((style) => ({
                value: style,
                label: style === 'off' ? 'Off' : style === 'soft' ? 'Soft' : 'Crisp',
                testId: `pixel-light-glint-${style}`,
                title: style === 'off' ? 'No reflected highlight' : style === 'soft' ? 'Gentle, wider highlight' : 'Small, defined highlight',
              }))}
              onChange={(style) => { setGlintStyle(style); scheduleCurrent(); }}
            />
          </LightField>

          <div className="lb-actions">
            <button type="button" className="lb-more" aria-expanded={moreOpen} aria-controls={drawerId}
              data-testid="pixel-light-more" onClick={() => setMoreOpen((open) => !open)}
              title={glintOnly ? 'Material' : 'Tint, fill, material, edges and dither'}>
              <PixelIcon name="sparkles" size={12} /><span>More</span><span aria-hidden="true" className="lb-more-chevron">▾</span>
            </button>
            <button type="button" onClick={handleCancel} title="Discard preview and restore layer (Esc)" aria-label="Cancel"
              data-testid="pixel-light-cancel" className="pb-button">Cancel</button>
            <button type="button" onClick={handleApply} title="Apply preview to an editable layer (Enter)" aria-label="Apply"
              data-testid="pixel-light-apply" className="pb-button" data-tone="primary">Apply</button>
          </div>
        </Reveal>

        <Collapse open={moreOpen} id={drawerId} innerClassName="lb-row lb-drawer">
          {!glintOnly && (
            <LightField label="Tint" value={tintName(look.lightColor)} title="The light's color"
              action={<button type="button" className="lb-chip-btn" onClick={resetLook} data-testid="pixel-light-reset-look"
                title="Back to daylight, default fill, normal edges and no dither">Reset</button>}>
              <div className="lb-tints" role="group" aria-label="Light tint">
                {LIGHT_TINTS.map((tint) => (
                  <button key={tint.id} type="button" className="lb-tint" style={{ ['--tint' as string]: tint.color }}
                    aria-pressed={look.lightColor.toUpperCase() === tint.color} aria-label={`${tint.label} light`} title={tint.label}
                    data-testid={`pixel-light-tint-${tint.id}`}
                    onClick={() => setLook({ lightColor: tint.color })} />
                ))}
                <input type="color" className="lb-tint-picker" aria-label="Custom light color" title="Any color"
                  data-on={LIGHT_TINTS.every((tint) => tint.color !== look.lightColor.toUpperCase()) || undefined}
                  value={look.lightColor.toLowerCase()} onChange={(e) => setLook({ lightColor: e.target.value.toUpperCase() })} />
              </div>
            </LightField>
          )}

          {!glintOnly && (
            <LightField label="Fill" value={`${Math.round(look.ambientIntensity * 100)}%`} title="Fill light: low sinks the shadows, high lifts them toward the base color">
              <LightRange label="Fill light" min={0.08} max={0.65} step={0.01} value={look.ambientIntensity}
                onChange={(value) => setLook({ ambientIntensity: value })} testId="pixel-light-fill" />
            </LightField>
          )}

          <LightField label="Material" title="What the surface is made of">
            <ChoiceSegment
              label="Material"
              value={look.material}
              options={MATERIALS.map((material) => ({ value: material.value, label: material.label, testId: `pixel-light-material-${material.value}`, title: material.title }))}
              onChange={(material) => { setMaterialPreset(material); setLook({ material }); }}
            />
          </LightField>

          {!glintOnly && (
            <LightField label="Edges" value={`${Math.round(tools.cavityStrength * 100)}%`} title="Edge depth: how deep creases and seams sink into shadow (0 turns them off)">
              <LightRange label="Edge depth" min={0} max={2} step={0.05} value={tools.cavityStrength}
                onChange={(value) => { setCavityStrength(value); scheduleCurrent(); }} testId="pixel-light-edges" />
            </LightField>
          )}

          {!glintOnly && (
            <LightField label="Dither" value={`${Math.round(tools.ditherModulation * 100)}%`} title="Dither: break up shadow edges with an ordered pixel pattern">
              <LightRange label="Dither" min={0} max={1} step={0.05} value={tools.ditherModulation}
                onChange={(value) => { setDitherModulation(value); scheduleCurrent(); }} testId="pixel-light-dither" />
            </LightField>
          )}

        </Collapse>
      </SpringSurface>

      {/* SVG Canvas for Rays and Guides */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        width={stageWidth}
        height={stageHeight}
      >
        {/* Horizon Range Guide Ring */}
        <circle
          cx={stageCentroid.x}
          cy={stageCentroid.y}
          r={maxRadius}
          fill="none"
          stroke="var(--accent-gold)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity={dragTarget ? 0.35 : 0.12}
        />

        {/* Zenith Overhead Ring */}
        <circle
          cx={stageCentroid.x}
          cy={stageCentroid.y}
          r={maxRadius * 0.33}
          fill="none"
          stroke="var(--accent-gold)"
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity={dragTarget ? 0.2 : 0.08}
        />

        {/* Ray from Middle Light Point to Light Bulb */}
        <line
          x1={stageCentroid.x}
          y1={stageCentroid.y}
          x2={bulbCoords.x}
          y2={bulbCoords.y}
          stroke={look.lightColor === '#FFFFFF' ? 'var(--accent-gold)' : look.lightColor}
          strokeWidth="2"
          strokeDasharray="5 3"
          opacity={dragTarget ? 0.75 : 0.2}
        />
      </svg>

      {/* Interactive Draggable Middle Light Point Reticle */}
      <div
        role="slider"
        tabIndex={0}
        data-testid="pixel-light-center-handle"
        aria-label="Middle Light Point. Drag to reposition light focus on canvas."
        aria-valuenow={Math.round(canvasCentroid.x)}
        onPointerDown={handleCenterPointerDown}
        className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing pointer-events-auto touch-none group ${
          dragTarget === 'center' ? 'scale-125' : 'hover:scale-115'
        } transition-transform z-35`}
        style={{
          left: `${stageCentroid.x}px`,
          top: `${stageCentroid.y}px`,
        }}
      >
        {/* Retro 16-bit Pixel Art Center Reticle */}
        <div className="relative flex items-center justify-center w-7 h-7">
          {/* Pulsing focal aura */}
          <div
            className={`absolute inset-0 rounded-full border-2 border-[var(--accent-gold)] ${
              dragTarget === 'center' ? 'opacity-90 scale-110 shadow-[0_0_12px_var(--accent-gold)]' : 'opacity-40 animate-pulse'
            } pointer-events-none transition-all`}
            aria-hidden="true"
          />
          {/* Reticle Disk */}
          <div className="w-5 h-5 rounded-full bg-[var(--ink)]/90 border-2 border-[var(--accent-gold)] shadow-[0_0_8px_var(--glow)] flex items-center justify-center">
            {/* 4 Directional Crosshair Ticks */}
            <div className="absolute -top-1 w-0.5 h-1.5 bg-[var(--accent-gold)]" />
            <div className="absolute -bottom-1 w-0.5 h-1.5 bg-[var(--accent-gold)]" />
            <div className="absolute -left-1 h-0.5 w-1.5 bg-[var(--accent-gold)]" />
            <div className="absolute -right-1 h-0.5 w-1.5 bg-[var(--accent-gold)]" />
            {/* Center Core Bead */}
            <div className="w-2 h-2 rounded-full bg-[var(--accent-gold)] flex items-center justify-center">
              <div className="w-0.5 h-0.5 rounded-full bg-white" />
            </div>
          </div>
        </div>

        {/* Center Coordinate Tooltip */}
        <div className="absolute left-1/2 -top-5 -translate-x-1/2 px-1.5 py-0.5 bg-[var(--desk-surface-raised)] text-[var(--text-heading)] text-[9px] font-mono font-bold rounded-[2px] border border-[var(--pb-panel-edge)] shadow-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
          Light Center ({Math.round(canvasCentroid.x)}, {Math.round(canvasCentroid.y)})
        </div>
      </div>

      {/* Interactive Pixel Light Bulb Token */}
      <div
        role="slider"
        tabIndex={0}
        data-testid="pixel-light-bulb-handle"
        aria-label="Directional Light Bulb. Drag to rotate light around sprite."
        aria-valuenow={tools.lightAzimuth}
        aria-valuemin={0}
        aria-valuemax={360}
        onPointerDown={handleBulbPointerDown}
        className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing pointer-events-auto touch-none group ${
          dragTarget === 'bulb' ? 'scale-110' : 'hover:scale-105'
        } transition-transform z-40`}
        style={{
          left: `${bulbCoords.x}px`,
          top: `${bulbCoords.y}px`,
        }}
      >
        {/* Retro 16-bit Pixel Art Light Bulb SVG */}
        <svg
          width="24"
          height="27"
          viewBox="0 0 16 18"
          fill="none"
          className="relative"
        >
          {/* Glass Dome Outline */}
          <rect x="5" y="1" width="6" height="1" fill="#181124" />
          <rect x="3" y="2" width="2" height="1" fill="#181124" />
          <rect x="11" y="2" width="2" height="1" fill="#181124" />
          <rect x="2" y="3" width="1" height="5" fill="#181124" />
          <rect x="13" y="3" width="1" height="5" fill="#181124" />
          <rect x="3" y="8" width="1" height="2" fill="#181124" />
          <rect x="12" y="8" width="1" height="2" fill="#181124" />
          <rect x="4" y="10" width="1" height="2" fill="#181124" />
          <rect x="11" y="10" width="1" height="2" fill="#181124" />

          {/* Glass Dome Fill (Golden Warmth) */}
          <rect x="5" y="2" width="6" height="1" style={{ fill: `color-mix(in srgb, ${look.lightColor} 55%, #fff9db)` }} />
          <rect x="3" y="3" width="10" height="5" style={{ fill: `color-mix(in srgb, ${look.lightColor} 60%, #fef08a)` }} />
          <rect x="4" y="8" width="8" height="2" style={{ fill: `color-mix(in srgb, ${look.lightColor} 55%, #fde047)` }} />
          <rect x="5" y="10" width="6" height="2" style={{ fill: `color-mix(in srgb, ${look.lightColor} 50%, #facc15)` }} />

          {/* Highlight Glint */}
          <rect x="4" y="3" width="2" height="3" fill="#ffffff" />
          <rect x="6" y="3" width="2" height="1" fill="#ffffff" />

          {/* Glowing Orange Filament */}
          <rect x="7" y="6" width="2" height="2" fill="#f97316" />
          <rect x="6" y="8" width="1" height="1" fill="#ea580c" />
          <rect x="9" y="8" width="1" height="1" fill="#ea580c" />

          {/* Screw Base Socket */}
          <rect x="5" y="12" width="6" height="1" fill="#181124" />
          <rect x="5" y="13" width="6" height="1" fill="#94a3b8" />
          <rect x="5" y="14" width="6" height="1" fill="#475569" />
          <rect x="6" y="15" width="4" height="1" fill="#94a3b8" />
          <rect x="6" y="16" width="4" height="1" fill="#181124" />
          <rect x="7" y="16" width="2" height="1" fill="#eab308" />
        </svg>

        {/* Angle Badge Tooltip */}
        <div className="absolute left-1/2 -bottom-5 -translate-x-1/2 px-1.5 py-0.5 bg-[var(--desk-surface-raised)] text-[var(--text-heading)] text-[9px] font-mono font-bold rounded-[2px] border border-[var(--pb-panel-edge)] shadow-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100">
          {tools.lightAzimuth}°
        </div>
      </div>
    </div>
  );
};
