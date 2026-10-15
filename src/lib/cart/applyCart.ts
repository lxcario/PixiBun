/** After a cart's drawing opens: restore its light and remember where it came from. */
import { useStudioStore } from '@/stores/studioStore';
import type { CartRecord } from './cartFormat';
import { rememberCartOrigin } from './cartOrigin';

export function applyOpenedCart(cart: Omit<CartRecord, 'project'>): void {
  const state = useStudioStore.getState();
  if (cart.light) {
    state.setLightAzimuth(cart.light.azimuth);
    state.setLightElevation(cart.light.elevation);
    state.setLightBrightness(cart.light.brightness);
    state.setLightRadius(cart.light.radius);
  }
  rememberCartOrigin(useStudioStore.getState().currentProjectId, cart);
}

/** The light the current drawing would carry into a cart. */
export function currentCartLight(): NonNullable<CartRecord['light']> {
  const { tools } = useStudioStore.getState();
  return {
    azimuth: tools.lightAzimuth,
    elevation: tools.lightElevation,
    brightness: tools.lightBrightness ?? 1.15,
    radius: tools.lightRadius,
  };
}
