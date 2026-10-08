/**
 * Strongly-typed Studio Event Bus for PixiBun Atelier.
 * 
 * Eliminates loose window.dispatchEvent(new CustomEvent(...)) strings and provides
 * type safety, lifecycle cleanup, and predictable event dispatch across studio panels.
 */
import type { ShadingBandMode } from '@/types/tools';
import type { P2PConnectionState, RemoteCursor } from '@/lib/sync/p2pSync';
import type { SpriteCleanupOptions, SpriteCleanupStats } from '@/lib/ai/spriteCleanup';

export type StudioEventMap = {
  'pixibun:undo': void;
  'pixibun:redo': void;
  'pixibun:history-clear': void;
  'pixibun:motion-bake': void;
  'pixibun:motion-preview-status': { partId: string; pending: boolean; clippedPixels?: number };
  'pixibun:extract-palette': void;
  'pixibun:clean-jaggies': void;
  'pixibun:auto-shade': { lightAzimuth?: number; lightElevation?: number; material?: string };
  'pixibun:highlight': { lightAzimuth?: number; lightElevation?: number; highlightColor?: string };
  'pixibun:sel-out': { lightAzimuth?: number; lightElevation?: number } | void;
  'pixibun:auto-outline': { color?: string; thickness?: number };
  'pixibun:ground-shadow': void;
  'pixibun:render-cast-shadow': {
    lightX?: number;
    lightY?: number;
    lightAzimuth?: number;
    lightElevation?: number;
    lightRadius?: number;
    shadowOpacity?: number;
    shadowColor?: string;
    ditherMode?: 'none' | '2x2' | '4x4' | '8x8';
    mode?: 'bounded-2.5d' | 'raymarch-2d';
    shadowStyle?: 'cast' | 'drop';
  };
  'pixibun:render-cast-shadow-auto': { shadowStyle?: 'cast' | 'drop' } | void;
  'pixibun:shadow-settings-inferred': {
    lightX: number;
    lightY: number;
    lightAzimuth?: number;
    lightElevation?: number;
    lightRadius: number;
    shadowOpacity: number;
    shadowColor: string;
    ditherMode: 'none' | '2x2' | '4x4' | '8x8';
    rationale: string;
    shadowStyle?: 'cast' | 'drop';
  };
  'pixibun:apply-47-blob': void;
  'pixibun:rot-sprite': { angle: number };
  'pixibun:atkinson-dither': { colors?: string[]; paletteColors?: string[] };
  'pixibun:riemersma-dither': { colors?: string[]; paletteColors?: string[] };
  'pixibun:skeleton-thinning': void;
  'pixibun:color-grade': { grade: 'sunset' | 'moonlight' | 'neon' | 'gameboy' };
  'pixibun:quantize-palette': { colors?: string[]; paletteColors?: string[] };
  'pixibun:remove-strays': void;
  'pixibun:sprite-cleanup-scan': { options: SpriteCleanupOptions; allFrames: boolean };
  'pixibun:sprite-cleanup-apply': { options: SpriteCleanupOptions; allFrames: boolean };
  'pixibun:sprite-cleanup-report': {
    phase: 'scan' | 'applied';
    stats: SpriteCleanupStats;
    frames: number;
    skippedLocked: number;
    source: {
      projectId: string;
      frameId: string;
      layerId: string;
      editRevision: number;
      bufferVersion: number;
      reviewKey?: string;
    };
    beforePreview?: string;
    afterPreview?: string;
  };
  'pixibun:photometric-lighting': {
    material?: string;
    lightAzimuth?: number;
    lightElevation?: number;
    lightRadius?: number;
    lightBrightness?: number;
    sourceShadingRemoval?: number;
    lightColor?: string;
    ambientIntensity?: number;
    cavityStrength?: number;
    ditherModulation?: number;
    bayerSize?: string;
    shadingBands?: ShadingBandMode;
    paletteColors?: string[];
  };
  'pixibun:photometric-auto': void;
  'pixibun:photometric-gizmo-start': { auto?: boolean; layerId?: string; glintOnly?: boolean } | void;
  'pixibun:photometric-analysis': {
    formType: 'character' | 'orb' | 'prop';
    material: string;
    sourceLightAzimuth: number;
    sourceLightElevation: number;
    cueStrength: number;
    cavityStrength: number;
    rationale: string;
  };
  'pixibun:photometric-gizmo-commit': void;
  'pixibun:photometric-gizmo-cancel': void;
  'pixibun:photometric-strength-delta': number;
  'pixibun:photometric-lighting-live': {
    lightAzimuth: number;
    lightElevation: number;
    lightCenterX?: number;
    lightCenterY?: number;
    lightBrightness?: number;
  };
  'pixibun:bake-normal-map': void;
  'pixibun:in-between-frame': void;
  'pixibun:codraw-state': P2PConnectionState;
  'pixibun:codraw-error': string;
  'pixibun:remote-cursors': RemoteCursor[];
  'pixibun:request-composite': void;
  'pixibun:remote-change': void;
  'pixibun:open-teaching-board': void;
  'pixibun:toast': {
    message: string;
    type?: 'default' | 'error' | 'success';
    action?: {
      label: string;
      onClick: () => void;
    };
  };
};

type EventHandler<T> = (data: T) => void;

class StudioEventBus {
  private handlers = new Map<keyof StudioEventMap, Set<EventHandler<unknown>>>();
  private emittedDomEvents = new WeakSet<Event>();

  on<K extends keyof StudioEventMap>(event: K, handler: EventHandler<StudioEventMap[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as EventHandler<unknown>);

    const windowListener = (e: Event) => {
      if (this.emittedDomEvents.has(e)) {
        // Event was already dispatched in-memory by studioEvents.emit()
        return;
      }
      const customEvent = e as CustomEvent<StudioEventMap[K]>;
      try {
        handler(customEvent.detail);
      } catch (err) {
        console.error(`Error executing handler for ${String(event)}:`, err);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(event, windowListener);
    }

    return () => {
      set?.delete(handler as EventHandler<unknown>);
      if (typeof window !== 'undefined') {
        window.removeEventListener(event, windowListener);
      }
    };
  }

  emit<K extends keyof StudioEventMap>(
    event: K,
    ...args: StudioEventMap[K] extends void ? [] : [StudioEventMap[K]]
  ): void {
    const data = args[0];

    // 1. Direct in-memory dispatch to registered handlers
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (err) {
          console.error(`Error executing in-memory handler for ${String(event)}:`, err);
        }
      });
    }

    // 2. Dispatch to DOM window for external listeners and test spies
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      const customEvent = new CustomEvent(event, { detail: data });
      this.emittedDomEvents.add(customEvent);
      window.dispatchEvent(customEvent);
    }
  }
}

export const studioEvents = new StudioEventBus();
