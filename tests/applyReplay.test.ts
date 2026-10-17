import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyReplay } from '@/lib/project/applyReplay';
import { parseReplay, type ReplayScript } from '@/lib/project/replayLink';
import { createHistoryEngine, setGlobalHistoryEngine } from '@/lib/engine/historyEngine';
import { useStudioStore } from '@/stores/studioStore';

const mocks = vi.hoisted(() => ({ edit: vi.fn(), flood: vi.fn() }));
vi.mock('@/lib/engine/historyEdit', () => ({ applyHistoryEdit: mocks.edit }));
vi.mock('@/lib/canvas/floodFill', () => ({ performFloodFill: mocks.flood }));

interface Stamp { x: number; y: number; style: string; op: string }

function script(text: string): ReplayScript {
  const result = parseReplay(text);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe('applying a replay to the open drawing', () => {
  let stamps: Stamp[];
  let descriptions: string[];
  beforeEach(() => {
    vi.clearAllMocks();
    stamps = [];
    descriptions = [];
    mocks.edit.mockImplementation((description: string, draw: (ctx: CanvasRenderingContext2D) => void) => {
      descriptions.push(description);
      const ctx = {
        fillStyle: '', globalCompositeOperation: 'source-over', imageSmoothingEnabled: true,
        fillRect(x: number, y: number) { stamps.push({ x, y, style: String(this.fillStyle), op: this.globalCompositeOperation }); },
      };
      draw(ctx as unknown as CanvasRenderingContext2D);
      return { ok: true };
    });
    useStudioStore.setState({
      canvasWidth: 8, canvasHeight: 8, activeFrameIndex: 0, activeLayerId: 'base',
      frames: [{ id: 'f1', durationMs: 100, layers: [{ id: 'base', name: 'Base Layer', visible: true, locked: false, opacity: 1, blendMode: 'source-over' }] }],
      isPlaying: false,
    });
    setGlobalHistoryEngine(createHistoryEngine());
  });
  afterEach(() => {
    setGlobalHistoryEngine(null);
    vi.useRealTimers();
  });

  it('stamps each drawing step with its palette color as one history edit, and adds layers and frames', async () => {
    const replay = script('1_8x8_ff0000.00ff00_p0.0.0.2.0~x.1.0~f1.5.5~L~l1.0.7.2.7~F~R0.6.6.7.7');
    await expect(applyReplay(replay)).resolves.toEqual({ ok: true, steps: 7 });
    expect(descriptions).toEqual(['Replay: Pen', 'Replay: Eraser', 'Replay: Fill', 'Replay: Line', 'Replay: Rectangle']);
    expect(stamps.slice(0, 4)).toEqual([
      { x: 0, y: 0, style: '#ff0000', op: 'source-over' },
      { x: 1, y: 0, style: '#ff0000', op: 'source-over' },
      { x: 2, y: 0, style: '#ff0000', op: 'source-over' },
      { x: 1, y: 0, style: '#000000', op: 'destination-out' },
    ]);
    expect(mocks.flood).toHaveBeenCalledWith(expect.anything(), 5, 5, '#00ff00', true, 0, false, null);
    expect(stamps.filter((stamp) => stamp.style === '#00ff00').map(({ x, y }) => [x, y])).toEqual([[0, 7], [1, 7], [2, 7]]);
    expect(stamps.filter((stamp) => stamp.y >= 6 && stamp.x >= 6)).toHaveLength(4);

    const state = useStudioStore.getState();
    expect(state.frames).toHaveLength(2);
    expect(state.activeFrameIndex).toBe(1);
    expect(state.frames[0].layers.map((layer) => layer.name)).toEqual(['Layer 2', 'Base Layer']);
    expect(state.frames[1].layers.map((layer) => layer.name)).toEqual(['Layer 2', 'Base Layer']);
    expect(state.activeLayerId).toBe(state.frames[1].layers[0].id);
  });

  it('stops at the first failing step and reports how many were drawn', async () => {
    mocks.edit.mockImplementationOnce(() => ({ ok: true }))
      .mockImplementationOnce(() => ({ ok: false, reason: 'refused', error: 'Pause playback and choose an unlocked layer before editing.' }));
    await expect(applyReplay(script('1_8x8_ff0000_p0.0.0~p0.1.1~p0.2.2'))).resolves.toEqual({
      ok: false, applied: 1, failedStep: 2, error: 'Pause playback and choose an unlocked layer before editing.',
    });
    expect(mocks.edit).toHaveBeenCalledTimes(2);
  });

  it('reports a layer or frame the Studio refused to add', async () => {
    useStudioStore.setState({ addLayer: () => {} });
    await expect(applyReplay(script('1_8x8_ff0000_p0.0.0~L'))).resolves.toMatchObject({ ok: false, applied: 1, failedStep: 2, error: 'The layer could not be added.' });
    useStudioStore.setState({ addFrame: () => {} });
    await expect(applyReplay(script('1_8x8_ff0000_F'))).resolves.toMatchObject({ ok: false, applied: 0, failedStep: 1, error: 'The frame could not be added.' });
  });

  it('refuses to start on a drawing of another size', async () => {
    await expect(applyReplay(script('1_16x8_ff0000_p0.0.0'))).resolves.toMatchObject({ ok: false, applied: 0, error: 'The drawing changed before the replay could start.' });
    expect(mocks.edit).not.toHaveBeenCalled();
  });

  it('waits for the viewport history, and gives up after five seconds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'performance'] });
    setGlobalHistoryEngine(null);
    const waiting = applyReplay(script('1_8x8_ff0000_p0.0.0'));
    await vi.advanceTimersByTimeAsync(100);
    setGlobalHistoryEngine(createHistoryEngine());
    await vi.advanceTimersByTimeAsync(20);
    await expect(waiting).resolves.toEqual({ ok: true, steps: 1 });

    setGlobalHistoryEngine(null);
    const abandoned = applyReplay(script('1_8x8_ff0000_p0.0.0'));
    await vi.advanceTimersByTimeAsync(5100);
    await expect(abandoned).resolves.toMatchObject({ ok: false, applied: 0, error: 'The canvas was not ready for the replay.' });
  });

  it('stops when aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(applyReplay(script('1_8x8_ff0000_p0.0.0'), controller.signal)).resolves.toMatchObject({ ok: false, applied: 0 });
    expect(mocks.edit).not.toHaveBeenCalled();
  });
});
