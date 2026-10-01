import { encodeGifRawFrames, RawFrameData } from './gifEncoderCore';

// This entrypoint runs in a worker; DOM typings expose the Window overload for self.
const postWorkerMessage = self.postMessage.bind(self) as (message: unknown, transfer?: ArrayBufferLike[]) => void;

export interface WorkerRequest {
  type: 'encode';
  frames: RawFrameData[];
  fps: number;
  delays?: number[];
  repeat?: boolean;
}

export type WorkerResponse =
  | { type: 'progress'; current: number; total: number }
  | { type: 'done'; buffer: ArrayBuffer }
  | { type: 'error'; message: string };

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  if (e.data?.type === 'encode') {
    try {
      const { frames, fps, delays, repeat } = e.data;
      const gifUint8 = encodeGifRawFrames(
        frames,
        fps,
        (current, total) => {
          postWorkerMessage({ type: 'progress', current, total });
        },
        delays,
        repeat
      );
      // The byte writer returns a view into a larger capacity allocation. Transfer
      // exactly the encoded bytes, excluding unused trailing capacity.
      const outputBuffer = gifUint8.slice().buffer;
      postWorkerMessage(
        { type: 'done', buffer: outputBuffer },
        [outputBuffer]
      );
    } catch (err) {
      postWorkerMessage({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unknown GIF Worker Error',
      });
    }
  }
};
