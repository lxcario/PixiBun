import { renderPlacedMotionRaster } from '@/lib/animation/motionRaster';
import type { MotionRenderRequest } from '@/lib/animation/motionRenderer';

const send = self.postMessage.bind(self) as (message: unknown, transfer?: ArrayBuffer[]) => void;
self.onmessage = (event: MessageEvent<MotionRenderRequest>) => {
  const { id, raster, bounds, pivot, pose } = event.data;
  try {
    const result = renderPlacedMotionRaster(raster, bounds, pivot, pose);
    send({ id, result }, [result.data.buffer as ArrayBuffer]);
  } catch (error) {
    send({ id, error: error instanceof Error ? error.message : 'Motion rendering failed.' });
  }
};
