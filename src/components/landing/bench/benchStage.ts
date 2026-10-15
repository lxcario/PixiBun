import { computeSeparableEDT, executePhotometricPipeline } from '@/lib/ai/smartMathEngine';
import { renderBoundedSpriteCastShadow } from '@/lib/ai/shadowRayMarcher';
import { rotSprite, rotateNearest, type PixelBuffer } from '@/lib/canvas/rotSprite';
import { coordsToLightAngles, lightAnglesToCoords } from '@/lib/canvas/lightGizmoMath';
import { getBresenhamLine } from '@/lib/canvas/rasterMath';
import { BAYER_4X4 } from '@/lib/canvas/ditherMatrix';
import type { ThemePalette } from '@/lib/theme/registry';
import type { MaterialType } from '@/types/tools';
import { ambientTicker, type AmbientTicker } from '../ambientClock';
import { ART, HOP_FRAMES, HOP_H, HOP_W, TURN, hexToRgba, hopFrameAt, padForTurn, paintLine, type Rgba } from './benchArt';

/**
 * The bench stage: one small canvas that every tool draws into. Nothing here
 * runs on a timer unless something on it is actually moving (the hop loop, a
 * tool switch dissolve, the lamp's opening sweep); everything else redraws
 * once, on the next frame after a pointer or key does something. Each engine
 * result is cached by the art's version, so dragging the lamp or the turn
 * replays work it already did.
 */

export type BenchTool = 'draw' | 'light' | 'turn' | 'hop';

export const STAGE_W = 160;
export const STAGE_H = 120;

/** Canvas pixels per art pixel, and where the sprite sits, for each view. */
const DRAW_ZOOM = 6;
const DRAW_X = (STAGE_W - ART * DRAW_ZOOM) >> 1;
const DRAW_Y = (STAGE_H - ART * DRAW_ZOOM) >> 1;
/** The lit scene is 32×32 with the sprite at (8, 6), as in the Studio's lamp preview. */
const SCENE = 32;
const SCENE_SPRITE_X = 8;
const SCENE_SPRITE_Y = 6;
const LIGHT_ZOOM = 4;
const LIGHT_X = (STAGE_W - SCENE * LIGHT_ZOOM) >> 1;
const LIGHT_Y = -8;
const LAMP_CX = LIGHT_X + (SCENE_SPRITE_X + ART / 2) * LIGHT_ZOOM;
const LAMP_CY = LIGHT_Y + (SCENE_SPRITE_Y + ART / 2) * LIGHT_ZOOM;
const LAMP_REACH = 62;
const TURN_ZOOM = 3;
const TURN_Y = (STAGE_H - TURN * TURN_ZOOM) >> 1;
export const TURN_LEFT_X = 6;
export const TURN_RIGHT_X = STAGE_W - 6 - TURN * TURN_ZOOM;
const HOP_ZOOM = 3;
const HOP_X = (STAGE_W - HOP_W * HOP_ZOOM) >> 1;
const HOP_Y = 6;
const HOP_FLOOR = HOP_Y + HOP_H * HOP_ZOOM;
/** The exported sheet, at its real size, under the floor. */
const SHEET_GAP = 6;
const SHEET_X = (STAGE_W - (HOP_FRAMES.length * HOP_W + (HOP_FRAMES.length - 1) * SHEET_GAP)) >> 1;
const SHEET_Y = HOP_FLOOR + 9;
const WARM = '#ffd285';

interface Colors {
  bg: string;
  dot: string;
  checkA: string;
  checkB: string;
  ink: string;
  accent: string;
}

export interface BenchOptions {
  reduceMotion: boolean;
  /** A short readout for the stage's corner (lamp angles, turn angle). */
  onStatus?: (text: string) => void;
  /** A stroke finished or the art was replaced. */
  onArtChange?: () => void;
}

export interface BenchLamp {
  azimuth: number;
  elevation: number;
}

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const g = c.getContext('2d');
  if (!g) throw new Error('Canvas 2D is unavailable.');
  g.imageSmoothingEnabled = false;
  return g;
}

function bufferToCanvas(buffer: PixelBuffer): HTMLCanvasElement {
  const c = canvas(buffer.width, buffer.height);
  const g = ctx2d(c);
  const image = g.createImageData(buffer.width, buffer.height);
  image.data.set(buffer.data);
  g.putImageData(image, 0, 0);
  return c;
}

/** A dithered warm glow, the same 4×4 Bayer stipple the Studio uses for light falloff. */
function halo(radius: number, color: string): HTMLCanvasElement {
  const size = radius * 2 + 1;
  const c = canvas(size, size);
  const g = ctx2d(c);
  g.fillStyle = color;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - radius, y - radius) / radius;
      if (d <= 1 && (1 - d) * 0.85 > (BAYER_4X4[y & 3][x & 3] + 0.5) / 16) g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

/** Bayer masks for the pixel dissolve between tools: level k keeps k of every 16 pixels. */
function dissolveMasks(): HTMLCanvasElement[] {
  return Array.from({ length: 17 }, (_, level) => {
    const c = canvas(4, 4);
    const g = ctx2d(c);
    g.fillStyle = '#000';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (BAYER_4X4[y][x] < level) g.fillRect(x, y, 1, 1);
    return c;
  });
}

class LruCache<V> {
  private map = new Map<string, V>();
  constructor(private limit: number) {}
  get(key: string): V | undefined {
    const hit = this.map.get(key);
    if (hit !== undefined) {
      this.map.delete(key);
      this.map.set(key, hit);
    }
    return hit;
  }
  set(key: string, value: V) {
    if (this.map.size >= this.limit) this.map.delete(this.map.keys().next().value!);
    this.map.set(key, value);
  }
  clear() {
    this.map.clear();
  }
}

export class BenchStage {
  private ctx: CanvasRenderingContext2D;
  private art = canvas(ART, ART);
  private artCtx = ctx2d(this.art);
  private pixels: Uint8ClampedArray = new Uint8ClampedArray(ART * ART * 4);
  private version = 0;
  private sceneEdt: Float32Array | null = null;
  private edtVersion = -1;

  private tool: BenchTool = 'draw';
  private colors: Colors = { bg: '#211a30', dot: '#3a2e4c', checkA: '#2b2140', checkB: '#33284a', ink: '#140c1e', accent: '#7ee8d0' };
  private material: MaterialType = 'matte';
  private lamp: BenchLamp = { azimuth: 315, elevation: 50 };
  private angle = 30;
  private mirror = true;
  private paint: Rgba | null = [58, 46, 76, 255];

  private hover: { x: number; y: number } | null = null;
  private stroke: { last: { x: number; y: number } | null; changed: boolean } | null = null;
  private turnDrag: { x: number; angle: number } | null = null;
  private lampDragging = false;

  private lit = new LruCache<{ scene: HTMLCanvasElement; sprite: HTMLCanvasElement }>(320);
  private turned = new LruCache<{ smooth: HTMLCanvasElement; plain: HTMLCanvasElement }>(360);
  private hopFrames: { key: string; frames: HTMLCanvasElement[] } | null = null;
  private background: { key: string; stage: HTMLCanvasElement; checker: HTMLCanvasElement } | null = null;
  private glow = halo(30, WARM);
  private masks = dissolveMasks();

  private frame = 0;
  private visible = true;
  private ticker: AmbientTicker;
  private observer: IntersectionObserver | null = null;
  private dissolve: { from: HTMLCanvasElement; start: number } | null = null;
  private sweep: { start: number; from: number; to: number } | null = null;
  private swept = false;
  private scratch: HTMLCanvasElement | null = null;
  private hopStart = 0;
  private thumbs: Partial<Record<BenchTool, HTMLCanvasElement | null>> = {};
  private thumbTimer = 0;

  constructor(private stage: HTMLCanvasElement, private options: BenchOptions) {
    stage.width = STAGE_W;
    stage.height = STAGE_H;
    this.ctx = ctx2d(stage);
    // 20 ticks a second is plenty for the hop's 100 ms frames; tool switches borrow full rate briefly.
    this.ticker = ambientTicker((now) => this.tick(now), 20);
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        this.updateTicker();
      }, { rootMargin: '80px 0px' });
      this.observer.observe(stage);
    }
    this.emitStatus();
  }

  dispose() {
    this.observer?.disconnect();
    this.ticker.dispose();
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    if (this.thumbTimer) {
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(this.thumbTimer);
      else clearTimeout(this.thumbTimer);
    }
    this.thumbTimer = 0;
  }

  // ── state from the page ────────────────────────────────────────────────

  setArt(pixels: Uint8ClampedArray) {
    this.pixels = pixels;
    this.artChanged();
    this.requestRender();
  }

  getPixels(): Uint8ClampedArray {
    return this.pixels;
  }

  setTheme(palette: ThemePalette) {
    this.colors = { bg: palette.sunken, dot: palette.borderSubtle, checkA: palette.surface, checkB: palette.raised, ink: palette.ink, accent: palette.primary };
    // Shadows take the theme's ink, so lit views are drawn again.
    this.lit.clear();
    this.hopFrames = null;
    this.requestRender();
    this.paintThumbs();
  }

  setTool(tool: BenchTool) {
    if (tool === this.tool) return;
    if (!this.options.reduceMotion) {
      const from = canvas(STAGE_W, STAGE_H);
      ctx2d(from).drawImage(this.stage, 0, 0);
      this.dissolve = { from, start: performance.now() };
      this.ticker.boost(260);
    }
    this.tool = tool;
    this.hover = null;
    if (tool === 'hop') this.hopStart = performance.now();
    if (tool === 'light' && !this.swept && !this.options.reduceMotion) {
      this.swept = true;
      // The lamp swings in once, so it is obvious the light is live.
      this.sweep = { start: performance.now(), from: 215, to: 315 };
      this.ticker.boost(900);
    }
    this.updateTicker();
    this.requestRender();
    this.emitStatus();
  }

  setPaint(color: string | null) {
    this.paint = color ? hexToRgba(color) : null;
  }

  setMirror(mirror: boolean) {
    this.mirror = mirror;
    this.requestRender();
  }

  setMaterial(material: MaterialType) {
    this.material = material;
    this.requestRender();
    this.paintThumbs();
  }

  turnTo(angle: number) {
    this.setAngle(angle);
    this.paintThumbs();
  }

  setReduceMotion(reduceMotion: boolean) {
    this.options.reduceMotion = reduceMotion;
    this.updateTicker();
    this.requestRender();
  }

  setThumbs(thumbs: Partial<Record<BenchTool, HTMLCanvasElement | null>>) {
    this.thumbs = thumbs;
    this.paintThumbs();
  }

  // ── input, in stage coordinates ────────────────────────────────────────

  pointerDown(x: number, y: number) {
    if (this.tool === 'draw') {
      const cell = this.cellAt(x, y);
      if (!cell) return;
      this.stroke = { last: null, changed: false };
      this.paintTo(cell);
    } else if (this.tool === 'light') {
      this.lampDragging = true;
      this.sweep = null;
      this.moveLamp(x, y);
    } else if (this.tool === 'turn') {
      this.turnDrag = { x, angle: this.angle };
    }
  }

  pointerMove(x: number, y: number, pressed: boolean) {
    if (this.tool === 'draw') {
      const cell = this.cellAt(x, y);
      if (pressed && this.stroke) {
        if (cell) this.paintTo(cell);
        else this.stroke.last = null;
      }
      if (cell?.x !== this.hover?.x || cell?.y !== this.hover?.y) {
        this.hover = cell;
        this.requestRender();
      }
    } else if (this.tool === 'light' && pressed && this.lampDragging) {
      this.moveLamp(x, y);
    } else if (this.tool === 'turn' && pressed && this.turnDrag) {
      // Two degrees per stage pixel: a sideways drag across the stage is almost a full turn.
      this.setAngle(this.turnDrag.angle + (x - this.turnDrag.x) * 2);
    }
  }

  pointerUp() {
    if (this.stroke?.changed) {
      this.artChanged();
      this.options.onArtChange?.();
    }
    this.stroke = null;
    if (this.lampDragging || this.turnDrag) this.paintThumbs();
    this.lampDragging = false;
    this.turnDrag = null;
  }

  pointerLeave() {
    if (this.hover && !this.stroke) {
      this.hover = null;
      this.requestRender();
    }
  }

  /** Arrow keys and Space, so the stage works without a pointer. Returns whether the key was used. */
  key(key: string, shift: boolean): boolean {
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key];
    if (this.tool === 'draw') {
      if (step) {
        const from = this.hover ?? { x: 7, y: 7 };
        this.hover = { x: Math.max(0, Math.min(ART - 1, from.x + step[0])), y: Math.max(0, Math.min(ART - 1, from.y + step[1])) };
        this.requestRender();
        return true;
      }
      if ((key === ' ' || key === 'Enter' || key === 'Delete' || key === 'Backspace') && this.hover) {
        const keep = this.paint;
        if (key === 'Delete' || key === 'Backspace') this.paint = null;
        this.stroke = { last: null, changed: false };
        this.paintTo(this.hover);
        this.paint = keep;
        this.pointerUp();
        return true;
      }
    } else if (this.tool === 'light' && step) {
      this.sweep = null;
      this.lamp = {
        azimuth: (this.lamp.azimuth + step[0] * 15 + 360) % 360,
        elevation: Math.max(15, Math.min(85, this.lamp.elevation - step[1] * 10)),
      };
      this.requestRender();
      this.emitStatus();
      this.paintThumbs();
      return true;
    } else if (this.tool === 'turn' && step && step[0]) {
      this.setAngle(this.angle + step[0] * (shift ? 15 : 5));
      this.paintThumbs();
      return true;
    }
    return false;
  }

  /** The hop as four frames, for the GIF. */
  hopCanvases(): HTMLCanvasElement[] {
    return this.getHopFrames();
  }

  // ── engines ────────────────────────────────────────────────────────────

  private artChanged() {
    this.version++;
    this.artCtx.clearRect(0, 0, ART, ART);
    const image = this.artCtx.createImageData(ART, ART);
    image.data.set(this.pixels);
    this.artCtx.putImageData(image, 0, 0);
    this.paintThumbs();
  }

  private cellAt(x: number, y: number) {
    const cx = Math.floor((x - DRAW_X) / DRAW_ZOOM);
    const cy = Math.floor((y - DRAW_Y) / DRAW_ZOOM);
    return cx >= 0 && cy >= 0 && cx < ART && cy < ART ? { x: cx, y: cy } : null;
  }

  private paintTo(cell: { x: number; y: number }) {
    if (!this.stroke) return;
    if (paintLine(this.pixels, this.stroke.last, cell, this.paint, this.mirror)) {
      this.stroke.changed = true;
      const image = this.artCtx.createImageData(ART, ART);
      image.data.set(this.pixels);
      this.artCtx.putImageData(image, 0, 0);
      this.requestRender();
    }
    this.stroke.last = cell;
  }

  private moveLamp(x: number, y: number) {
    const { azimuth, elevation } = coordsToLightAngles(x, y, LAMP_CX, LAMP_CY, LAMP_REACH);
    this.lamp = { azimuth, elevation: Math.max(15, Math.min(85, elevation)) };
    this.requestRender();
    this.emitStatus();
  }

  private setAngle(angle: number) {
    this.angle = ((Math.round(angle) % 360) + 360) % 360;
    this.requestRender();
    this.emitStatus();
  }

  private emitStatus() {
    const { onStatus } = this.options;
    if (!onStatus) return;
    if (this.tool === 'light') onStatus(`☀ ${Math.round(this.lamp.azimuth)}° · up ${Math.round(this.lamp.elevation)}°`);
    else if (this.tool === 'turn') onStatus(`↻ ${this.angle}°`);
    else if (this.tool === 'hop') onStatus(`${HOP_FRAMES.length} frames · ${HOP_W}×${HOP_H}`);
    else onStatus(`${ART}×${ART}`);
  }

  private getSceneEdt(): Float32Array {
    if (this.sceneEdt && this.edtVersion === this.version) return this.sceneEdt;
    const px = this.pixels;
    const isOpaque = (x: number, y: number) => {
      const ax = x - SCENE_SPRITE_X;
      const ay = y - SCENE_SPRITE_Y;
      return ax >= 0 && ay >= 0 && ax < ART && ay < ART && px[(ay * ART + ax) * 4 + 3] > 30;
    };
    this.sceneEdt = computeSeparableEDT(isOpaque, SCENE, SCENE);
    this.edtVersion = this.version;
    return this.sceneEdt;
  }

  /** The Studio's lamp: photometric shading plus the raymarched cast shadow, at 7.5° steps. */
  private getLit(lamp: BenchLamp) {
    const az = (Math.round(lamp.azimuth / 7.5) * 7.5) % 360;
    const el = Math.round(lamp.elevation / 5) * 5;
    const key = `${this.version}|${this.material}|${az}|${el}`;
    const hit = this.lit.get(key);
    if (hit) return hit;

    const scene = canvas(SCENE, SCENE);
    const g = ctx2d(scene);
    const shadow = renderBoundedSpriteCastShadow(this.getSceneEdt(), SCENE, SCENE, {
      lightAzimuth: az,
      lightElevation: el,
      shadowOpacity: 0.62,
      shadowColor: this.colors.ink,
      ditherMode: '4x4',
      shadowStyle: 'cast',
      isFloating: false,
      perspectiveForeshortening: 0.55,
      volumetricDepthBias: 0.25,
    });
    g.putImageData(shadow, 0, 0);
    const sprite = executePhotometricPipeline(this.artCtx, ART, ART, {
      lightAzimuth: az,
      lightElevation: el,
      lightRadius: 32,
      lightColor: this.material === 'gold' ? '#FFE8B0' : '#FFFFFF',
      ambientIntensity: 0.48,
      lightBrightness: 1.15,
      material: this.material,
      cavityStrength: 1,
      ditherModulation: 0.25,
      bayerSize: '4x4',
      formType: 'character',
      celShading: true,
    });
    g.drawImage(sprite, SCENE_SPRITE_X, SCENE_SPRITE_Y);
    const result = { scene, sprite };
    this.lit.set(key, result);
    return result;
  }

  /** RotSprite beside a plain nearest-neighbour turn of the same pixels. */
  private getTurned(angle: number) {
    const key = `${this.version}|${angle}`;
    const hit = this.turned.get(key);
    if (hit) return hit;
    const padded = padForTurn(this.pixels);
    const rad = (angle * Math.PI) / 180;
    const result = { smooth: bufferToCanvas(rotSprite(padded, rad)), plain: bufferToCanvas(rotateNearest(padded, rad)) };
    this.turned.set(key, result);
    return result;
  }

  /** The hop, built from the lit sprite so the GIF carries the lamp too. */
  private getHopFrames(): HTMLCanvasElement[] {
    const az = Math.round(this.lamp.azimuth / 7.5) * 7.5;
    const el = Math.round(this.lamp.elevation / 5) * 5;
    const key = `${this.version}|${this.material}|${az}|${el}`;
    if (this.hopFrames?.key === key) return this.hopFrames.frames;
    const { sprite } = this.getLit(this.lamp);
    const frames = HOP_FRAMES.map(({ lift, squash }) => {
      const c = canvas(HOP_W, HOP_H);
      const g = ctx2d(c);
      // A dithered contact shadow that shrinks as the sprite rises.
      g.fillStyle = this.colors.ink;
      const half = 6 - lift;
      for (let x = -half; x < half; x++) {
        for (let y = 0; y < 2; y++) {
          const fade = 1 - Math.abs(x + 0.5) / (half + 0.5) - y * 0.35;
          if (fade > (BAYER_4X4[y][(x + 16) & 3] + 0.5) / 16) g.fillRect(HOP_W / 2 + x, HOP_H - 2 + y, 1, 1);
        }
      }
      const top = HOP_H - 2 - ART - lift;
      if (squash) g.drawImage(sprite, 1, top + 1, ART + 2, ART - 1);
      else g.drawImage(sprite, 2, top);
      return c;
    });
    this.hopFrames = { key, frames };
    return frames;
  }

  // ── drawing ───────────────────────────────────────────────────────────

  private requestRender() {
    if (this.frame || typeof requestAnimationFrame === 'undefined') return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.render(performance.now());
    });
  }

  private animating(now: number): boolean {
    return Boolean(
      (this.tool === 'hop' && !this.options.reduceMotion) ||
      (this.dissolve && now - this.dissolve.start < 240) ||
      this.sweep
    );
  }

  private updateTicker() {
    this.ticker.setActive(this.visible && this.animating(performance.now()));
  }

  private tick(now: number) {
    this.render(now);
    if (!this.animating(now)) this.updateTicker();
  }

  private getBackground() {
    const key = `${this.colors.bg}|${this.colors.dot}|${this.colors.checkA}|${this.colors.checkB}`;
    if (this.background?.key === key) return this.background;
    const stage = canvas(STAGE_W, STAGE_H);
    const g = ctx2d(stage);
    g.fillStyle = this.colors.bg;
    g.fillRect(0, 0, STAGE_W, STAGE_H);
    // A cutting mat: a dot every 8 pixels and a brighter one every 32.
    g.fillStyle = this.colors.dot;
    for (let y = 4; y < STAGE_H; y += 8) for (let x = 4; x < STAGE_W; x += 8) g.fillRect(x, y, (x - 4) % 32 === 0 && (y - 4) % 32 === 0 ? 2 : 1, 1);
    const checker = canvas(ART * DRAW_ZOOM, ART * DRAW_ZOOM);
    const c = ctx2d(checker);
    for (let y = 0; y < ART; y++) {
      for (let x = 0; x < ART; x++) {
        c.fillStyle = (x + y) & 1 ? this.colors.checkA : this.colors.checkB;
        c.fillRect(x * DRAW_ZOOM, y * DRAW_ZOOM, DRAW_ZOOM, DRAW_ZOOM);
      }
    }
    this.background = { key, stage, checker };
    return this.background;
  }

  private render(now: number) {
    const g = this.ctx;
    g.imageSmoothingEnabled = false;
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    const bg = this.getBackground();
    g.drawImage(bg.stage, 0, 0);

    if (this.sweep) {
      const t = Math.max(0, Math.min(1, (now - this.sweep.start) / 800));
      const ease = 1 - (1 - t) ** 3;
      this.lamp = { azimuth: this.sweep.from + (this.sweep.to - this.sweep.from) * ease, elevation: this.lamp.elevation };
      if (t >= 1) {
        this.sweep = null;
        this.paintThumbs();
      }
      this.emitStatus();
    }

    if (this.tool === 'draw') this.renderDraw(g, bg.checker);
    else if (this.tool === 'light') this.renderLight(g);
    else if (this.tool === 'turn') this.renderTurn(g);
    else this.renderHop(g, now);

    if (this.dissolve) {
      const t = (now - this.dissolve.start) / 240;
      if (t >= 1) this.dissolve = null;
      else {
        // The old view crumbles away pixel by pixel through a Bayer mask.
        // A frame's timestamp can predate the switch, so clamp both ends.
        const level = Math.max(0, Math.min(16, Math.floor(t * 17)));
        const fx = (this.scratch ??= canvas(STAGE_W, STAGE_H));
        const f = ctx2d(fx);
        f.globalCompositeOperation = 'source-over';
        f.clearRect(0, 0, STAGE_W, STAGE_H);
        f.drawImage(this.dissolve.from, 0, 0);
        f.globalCompositeOperation = 'destination-out';
        const pattern = f.createPattern(this.masks[level], 'repeat');
        if (pattern) {
          f.fillStyle = pattern;
          f.fillRect(0, 0, STAGE_W, STAGE_H);
        }
        g.drawImage(fx, 0, 0);
      }
    }
  }

  private renderDraw(g: CanvasRenderingContext2D, checker: HTMLCanvasElement) {
    g.drawImage(checker, DRAW_X, DRAW_Y);
    g.drawImage(this.art, DRAW_X, DRAW_Y, ART * DRAW_ZOOM, ART * DRAW_ZOOM);
    const size = ART * DRAW_ZOOM;
    if (this.mirror) {
      // The mirror seam, stitched down the middle.
      g.fillStyle = this.colors.accent;
      g.globalAlpha = 0.55;
      for (let y = DRAW_Y - 4; y < DRAW_Y + size + 4; y += 4) g.fillRect(STAGE_W / 2 - 1, y, 1, 2);
      g.globalAlpha = 1;
    }
    if (this.hover) {
      const outline = (cx: number, cy: number, alpha: number) => {
        const x = DRAW_X + cx * DRAW_ZOOM;
        const y = DRAW_Y + cy * DRAW_ZOOM;
        g.globalAlpha = alpha;
        g.fillStyle = this.colors.accent;
        g.fillRect(x - 1, y - 1, DRAW_ZOOM + 2, 1);
        g.fillRect(x - 1, y + DRAW_ZOOM, DRAW_ZOOM + 2, 1);
        g.fillRect(x - 1, y, 1, DRAW_ZOOM);
        g.fillRect(x + DRAW_ZOOM, y, 1, DRAW_ZOOM);
        if (this.paint) {
          g.fillStyle = `rgb(${this.paint[0]} ${this.paint[1]} ${this.paint[2]})`;
          g.fillRect(x + 2, y + 2, DRAW_ZOOM - 4, DRAW_ZOOM - 4);
        }
        g.globalAlpha = 1;
      };
      outline(this.hover.x, this.hover.y, 1);
      if (this.mirror && this.hover.x !== ART - 1 - this.hover.x) outline(ART - 1 - this.hover.x, this.hover.y, 0.45);
    }
  }

  private renderLight(g: CanvasRenderingContext2D) {
    // The room dims so the lamp is the only light in it.
    g.fillStyle = this.colors.ink;
    g.globalAlpha = 0.55;
    g.fillRect(0, 0, STAGE_W, STAGE_H);
    const bulb = lightAnglesToCoords(this.lamp.azimuth, this.lamp.elevation, LAMP_CX, LAMP_CY, LAMP_REACH);
    const bx = Math.round(bulb.x);
    const by = Math.round(bulb.y);
    g.globalAlpha = 0.42;
    g.drawImage(this.glow, bx - 30, by - 30);
    g.globalAlpha = 1;

    const { scene } = this.getLit(this.lamp);
    g.drawImage(scene, LIGHT_X, LIGHT_Y, SCENE * LIGHT_ZOOM, SCENE * LIGHT_ZOOM);

    // A dotted beam from the bulb to the sitter, then the bulb itself.
    g.fillStyle = WARM;
    g.globalAlpha = 0.5;
    getBresenhamLine(bx, by, LAMP_CX, LAMP_CY).forEach((p, i) => {
      if (i > 5 && i % 4 === 0 && Math.hypot(p.x - LAMP_CX, p.y - LAMP_CY) > 30) g.fillRect(p.x, p.y, 1, 1);
    });
    g.globalAlpha = 1;
    g.fillStyle = this.colors.ink;
    g.fillRect(bx - 3, by - 2, 7, 5);
    g.fillRect(bx - 2, by - 3, 5, 7);
    g.fillStyle = WARM;
    g.fillRect(bx - 2, by - 1, 5, 3);
    g.fillRect(bx - 1, by - 2, 3, 5);
    g.fillStyle = '#fffbea';
    g.fillRect(bx - 1, by - 1, 2, 2);
  }

  private renderTurn(g: CanvasRenderingContext2D) {
    const { smooth, plain } = this.getTurned(this.angle);
    const size = TURN * TURN_ZOOM;
    g.drawImage(smooth, TURN_LEFT_X, TURN_Y, size, size);
    g.globalAlpha = 0.9;
    g.drawImage(plain, TURN_RIGHT_X, TURN_Y, size, size);
    g.globalAlpha = 1;
    g.fillStyle = this.colors.dot;
    for (let y = 10; y < STAGE_H - 10; y += 4) g.fillRect(STAGE_W / 2, y, 1, 2);
  }

  private renderHop(g: CanvasRenderingContext2D, now: number) {
    const frames = this.getHopFrames();
    g.fillStyle = this.colors.dot;
    g.fillRect(24, HOP_FLOOR, STAGE_W - 48, 1);
    if (this.options.reduceMotion) {
      // Without motion, the hop is shown as the sprite sheet it exports.
      const zoom = 2;
      const width = frames.length * HOP_W * zoom + (frames.length - 1) * 4;
      frames.forEach((frame, i) => g.drawImage(frame, ((STAGE_W - width) >> 1) + i * (HOP_W * zoom + 4), (STAGE_H - HOP_H * zoom) >> 1, HOP_W * zoom, HOP_H * zoom));
      return;
    }
    const index = hopFrameAt(now - this.hopStart);
    g.drawImage(frames[index], HOP_X, HOP_Y, HOP_W * HOP_ZOOM, HOP_H * HOP_ZOOM);
    // The sprite sheet it exports, at real size, with the playing frame lit.
    frames.forEach((frame, i) => {
      const x = SHEET_X + i * (HOP_W + SHEET_GAP);
      g.globalAlpha = i === index ? 1 : 0.35;
      g.drawImage(frame, x, SHEET_Y);
      if (i === index) {
        g.fillStyle = this.colors.accent;
        g.fillRect(x + 4, SHEET_Y + HOP_H + 2, HOP_W - 8, 1);
      }
      g.globalAlpha = 1;
    });
  }

  /** Thumbnails wait for idle time, so finishing a stroke or a drag never costs a frame. */
  private paintThumbs() {
    if (this.thumbTimer) return;
    const run = () => {
      this.thumbTimer = 0;
      this.paintThumbsNow();
    };
    this.thumbTimer = typeof requestIdleCallback === 'function' ? requestIdleCallback(run, { timeout: 300 }) : window.setTimeout(run, 60);
  }

  private paintThumbsNow() {
    const draw = (tool: BenchTool, paint: (g: CanvasRenderingContext2D) => void) => {
      const c = this.thumbs[tool];
      if (!c) return;
      if (c.width !== 32) c.width = 32;
      if (c.height !== 32) c.height = 32;
      const g = c.getContext('2d');
      if (!g) return;
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, 32, 32);
      paint(g);
    };
    draw('draw', (g) => g.drawImage(this.art, 8, 8));
    draw('light', (g) => g.drawImage(this.getLit(this.lamp).scene, 0, -3));
    draw('turn', (g) => g.drawImage(this.getTurned(this.angle || 30).smooth, 4, 4));
    draw('hop', (g) => g.drawImage(this.getHopFrames()[2], 6, 4));
  }
}
