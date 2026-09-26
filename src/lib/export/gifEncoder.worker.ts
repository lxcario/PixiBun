import { encodeGifRawFrames, RawFrameData } from './gifEncoderCore';

// This entrypoint runs in a worker; DOM typings expose the Window overload for self.
const postWorkerMessage = self.postMessage.bind(self) as (message: unknown, transfer?: ArrayBufferLike[]) => void;

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
          postWorkerMessage({ type: 'progress', current, total });
        },
        delays
      );
      // Send completed GIF array buffer as a transferable object to eliminate copy overhead
      postWorkerMessage(
        { type: 'done', buffer: gifUint8.buffer },
        [gifUint8.buffer]
      );
    } catch (err) {
      postWorkerMessage({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unknown GIF Worker Error',
      });
    }
  }
};
