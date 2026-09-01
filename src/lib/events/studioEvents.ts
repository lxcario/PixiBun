/**
 * Strongly-typed Studio Event Bus for PixiBun Atelier.
 * 
 * Eliminates loose window.dispatchEvent(new CustomEvent(...)) strings and provides
 * type safety, lifecycle cleanup, and predictable event dispatch across studio panels.
 */

export type StudioEventMap = {
  'pixibun:undo': void;
  'pixibun:redo': void;
  'pixibun:history-clear': void;
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
    lightRadius?: number;
    shadowOpacity?: number;
    shadowColor?: string;
    ditherMode?: 'none' | '2x2' | '4x4' | '8x8';
  };
  'pixibun:apply-47-blob': void;
  'pixibun:rot-sprite': { angle: number };
  'pixibun:atkinson-dither': { colors?: string[]; paletteColors?: string[] };
  'pixibun:riemersma-dither': { colors?: string[]; paletteColors?: string[] };
  'pixibun:skeleton-thinning': void;
  'pixibun:color-grade': { grade: 'sunset' | 'moonlight' | 'neon' | 'gameboy' };
  'pixibun:quantize-palette': { colors?: string[]; paletteColors?: string[] };
  'pixibun:remove-strays': void;
  'pixibun:photometric-lighting': {
    material?: string;
    lightAzimuth?: number;
    lightElevation?: number;
    lightRadius?: number;
    lightBrightness?: number;
    lightColor?: string;
    ambientIntensity?: number;
    cavityStrength?: number;
    ditherModulation?: number;
    bayerSize?: string;
    paletteColors?: string[];
  };
  'pixibun:volumetric-optics': {
    preset?: string;
    translucencyDepth?: number;
    fresnelPower?: number;
    anisoAngle?: number;
    anisoFlow?: boolean;
    celTones?: number;
    lightAzimuth?: number;
    lightElevation?: number;
    lightColor?: string;
    paletteColors?: string[];
    ditherModulation?: number;
  };
  'pixibun:bake-normal-map': void;
  'pixibun:in-between-frame': void;
};

type EventHandler<T> = (data: T) => void;

class StudioEventBus {
  private handlers = new Map<keyof StudioEventMap, Set<EventHandler<unknown>>>();

  on<K extends keyof StudioEventMap>(event: K, handler: EventHandler<StudioEventMap[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as EventHandler<unknown>);

    const windowListener = (e: Event) => {
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
  }
}

export const studioEvents = new StudioEventBus();

