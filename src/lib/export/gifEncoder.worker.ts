import { encodeGifRawFrames, RawFrameData } from './gifEncoderCore';

export interface WorkerRequest {
  type: 'encode';
  frames: RawFrameData[];
  fps: number;
  delays?: number[];
}

export type WorkerResponse =
  | { type: 'progress'; current: number; total: number }
  | { type: 'done'; buffer: ArrayBuffer }
  | { type: 'error'; message: string };

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  if (e.data?.type === 'encode') {
    try {
      const { frames, fps, delays } = e.data;
      const gifUint8 = encodeGifRawFrames(
        frames,
        fps,
        (current, total) => {
          (self as unknown as Worker).postMessage({ type: 'progress', current, total });
        },
        delays
      );
      // Send completed GIF array buffer as a transferable object to eliminate copy overhead
      (self as unknown as Worker).postMessage(
        { type: 'done', buffer: gifUint8.buffer },
        [gifUint8.buffer]
      );
    } catch (err) {
      (self as unknown as Worker).postMessage({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unknown GIF Worker Error',
      });
    }
  }
};
