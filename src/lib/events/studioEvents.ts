/**
 * Strongly-typed Studio Event Bus for PixiBun Atelier.
 * 
 * Eliminates loose window.dispatchEvent(new CustomEvent(...)) strings and provides
 * type safety, lifecycle cleanup, and predictable event dispatch across studio panels.
 */

export type StudioEventMap = {
  'pixibun:bake-normal-map': void;
  'pixibun:color-grade': { grade: 'sunset' | 'moonlight' | 'neon' | 'gameboy' };
  'pixibun:clean-jaggies': void;
  'pixibun:smart-sel-out': void;
  'pixibun:smart-lighting': void;
  'pixibun:volumetric-optics': void;
  'pixibun:skin-lighting': void;
  'pixibun:autotile': void;
  'pixibun:skeleton-thin': void;
  'pixibun:ground-shadow': void;
  'pixibun:history-clear': void;
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

    // Also support global window listeners for backward compatibility
    const windowListener = (e: Event) => {
      const customEvent = e as CustomEvent<StudioEventMap[K]>;
      handler(customEvent.detail);
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
    const set = this.handlers.get(event);
    if (set) {
      set.forEach((handler) => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in handler for studio event ${String(event)}:`, err);
        }
      });
    }

    // Also dispatch to window for any native subscribers
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
  }
}

export const studioEvents = new StudioEventBus();
