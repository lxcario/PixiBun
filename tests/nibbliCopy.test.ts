import { describe, expect, it } from 'vitest';
import { handsSignature, predictHandsCopy, validateHandsPlan, type HandsEdit, type HandsObservation } from '../scripts/nibbli/artist/hands';

function fixture() {
  const raster = { width: 32, height: 32, data: Array<number>(4096).fill(0) };
  const pixels = [[4, 5, 11, 22, 33], [5, 5, 99, 88, 77], [4, 6, 12, 34, 56], [6, 7, 171, 118, 207]];
  for (const [x, y, r, g, b] of pixels) raster.data.splice((y * 32 + x) * 4, 4, r, g, b, 255);
  const layer = (id: string) => ({ id, name: id, locked: false, visible: true,
    metadata: { id, name: id, visible: true, locked: false, opacity: 1, blendMode: 'source-over' }, raster: structuredClone(raster) });
  const observation: HandsObservation = { id: 'copy-observed', composite: structuredClone(raster), screenshotBase64: 'fixture',
    project: { metadata: { width: 32, height: 32, palette: ['#0b1621'] }, frames: [
      { id: 'frame-1', metadata: { id: 'frame-1', durationMs: 125 }, layers: [layer('target'), layer('body')] },
      { id: 'frame-2', metadata: { id: 'frame-2', durationMs: 180 }, layers: [layer('other-frame')] },
    ] } };
  const edit: HandsEdit = { op: 'copy-selection', frameId: 'frame-1', layerId: 'target', rect: { x: 3, y: 4, width: 5, height: 5 }, delta: { x: 12, y: 3 },
    reason: 'Duplicate the observed asymmetric motif without repainting or moving its source.', expectedChange: 'Only the disjoint destination gains an exact copy; source, other layers and frames stay identical.',
    protectedLayerIds: ['body', 'other-frame'] };
  return { observation, edit, raw: { protocol: 1, observationId: observation.id, edits: [edit] }, pixels };
}
describe('Hands source-preserving Copy/Paste expectations', () => {
  it('copies asymmetric multicolor pixels and transparent holes without changing the source or any protected project content', () => {
    const { observation, raw, pixels } = fixture(), original = structuredClone(observation);
    const after = validateHandsPlan(raw, observation).checkpoints[0], raster = after.frames[0].layers[0].raster;
    for (const [x, y, r, g, b] of pixels) {
      expect(raster.data.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4)).toEqual([r, g, b, 255]);
      expect(raster.data.slice(((y + 3) * 32 + x + 12) * 4, ((y + 3) * 32 + x + 12) * 4 + 4)).toEqual([r, g, b, 255]);
    }
    expect(raster.data.slice((9 * 32 + 17) * 4, (9 * 32 + 17) * 4 + 4)).toEqual([0, 0, 0, 0]);
    expect(raster.data.filter((_, i) => i % 4 === 3 && raster.data[i] === 255)).toHaveLength(8);
    expect(after.frames[0].layers[1]).toEqual(original.project.frames[0].layers[1]); expect(after.frames[1]).toEqual(original.project.frames[1]);
    expect(after.metadata).toEqual(original.project.metadata); expect(after.frames[0].metadata).toEqual(original.project.frames[0].metadata);
    expect(observation).toEqual(original);
  });
  it('predicts copy-then-move intermediate projects from prior steps while retaining the original source', () => {
    const { observation, edit, raw } = fixture();
    const move: HandsEdit = { ...edit, op: 'move-selection', rect: { x: 15, y: 7, width: 5, height: 5 }, delta: { x: 4, y: 6 } };
    const { checkpoints } = validateHandsPlan({ ...raw, edits: [edit, move] }, observation);
    expect(checkpoints).toHaveLength(2);
    const at = (x: number, y: number) => (y * 32 + x) * 4;
    expect(checkpoints[0].frames[0].layers[0].raster.data.slice(at(16, 8), at(16, 8) + 4)).toEqual([11, 22, 33, 255]);
    expect(checkpoints[1].frames[0].layers[0].raster.data.slice(at(16, 8), at(16, 8) + 4)).toEqual([0, 0, 0, 0]);
    expect(checkpoints[1].frames[0].layers[0].raster.data.slice(at(20, 14), at(20, 14) + 4)).toEqual([11, 22, 33, 255]);
    expect(checkpoints[1].frames[0].layers[0].raster.data.slice(at(4, 5), at(4, 5) + 4)).toEqual([11, 22, 33, 255]);
  });
  it.each(['overlap', 'occupied', 'hidden-destination-rgb', 'partial-source-alpha', 'clipping', 'wrong-frame', 'late-invalid'] as const)('rejects %s without altering observed pixels', kind => {
    const { observation, edit, raw } = fixture();
    if (kind === 'overlap') edit.delta = { x: 2, y: 0 };
    if (kind === 'occupied') observation.project.frames[0].layers[0].raster.data.splice((8 * 32 + 16) * 4, 4, 5, 6, 7, 255);
    if (kind === 'hidden-destination-rgb') observation.project.frames[0].layers[0].raster.data[(8 * 32 + 16) * 4] = 1;
    if (kind === 'partial-source-alpha') observation.project.frames[0].layers[0].raster.data[(5 * 32 + 4) * 4 + 3] = 128;
    if (kind === 'clipping') edit.delta = { x: 27, y: 0 };
    if (kind === 'wrong-frame') edit.frameId = 'frame-2';
    if (kind === 'late-invalid') raw.edits.push({ ...edit, delta: { x: 2, y: 0 } });
    const before = handsSignature(observation.project); expect(() => validateHandsPlan(raw, observation)).toThrow();
    expect(handsSignature(observation.project)).toBe(before);
  });
  it('does not admit overlapping copies even when the overlap is transparent', () => {
    const { observation, edit } = fixture(); edit.delta = { x: 3, y: 0 };
    expect(() => predictHandsCopy(observation.project.frames[0].layers[0].raster, edit)).toThrow('overlap');
  });
  it('rejects an otherwise valid four-copy batch before execution when copy overhead exceeds the unchanged per-plan budget', () => {
    const { observation, edit, raw } = fixture(), before = handsSignature(observation.project);
    const edits = [{ x: 12, y: 3 }, { x: 20, y: 0 }, { x: 0, y: 16 }, { x: 12, y: 16 }].map(delta => ({ ...edit, delta }));
    expect(validateHandsPlan({ ...raw, edits: edits.slice(0, 3) }, observation).checkpoints).toHaveLength(3);
    expect(() => validateHandsPlan({ ...raw, edits }, observation)).toThrow('per-plan action budget');
    expect(handsSignature(observation.project)).toBe(before);
  });
});
