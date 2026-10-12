import { describe, expect, it } from 'vitest';
import { handsSignature, predictHandsFlip, validateHandsPlan, type HandsFlip, type HandsObservation } from '../scripts/nibbli/artist/hands';

function fixture(width = 5, height = 7) {
  const raster = { width: 32, height: 32, data: Array<number>(4096).fill(0) };
  for (const [x, y, r, g, b] of [[4, 5, 11, 22, 33], [6, 5, 99, 88, 77], [5, 7, 171, 118, 207], [0, 0, 12, 34, 56]]) raster.data.splice((y * 32 + x) * 4, 4, r, g, b, 255);
  const layer = (id: string) => ({ id, name: id, locked: false, visible: true, metadata: { opacity: 1, blendMode: 'source-over' }, raster: structuredClone(raster) });
  const observation: HandsObservation = { id: 'flip-observed', screenshotBase64: 'fixture', composite: structuredClone(raster), project: {
    metadata: { width: 32, height: 32 }, frames: [
      { id: 'frame-1', metadata: { durationMs: 125 }, layers: [layer('target'), layer('body')] },
      { id: 'frame-2', metadata: { durationMs: 180 }, layers: [layer('other-frame')] },
    ] } };
  const edit: HandsFlip = { op: 'flip-selection', axis: 'horizontal', frameId: 'frame-1', layerId: 'target', rect: { x: 3, y: 4, width, height },
    reason: 'Mirror the observed asymmetric motif inside its own rectangle.', expectedChange: 'Exact mirrored RGBA; outside pixels, other layers and frames unchanged.', protectedLayerIds: ['body', 'other-frame'] };
  return { edit, observation, raw: { protocol: 1, observationId: observation.id, edits: [edit] } };
}

describe('Hands independent lossless Flip expectations', () => {
  it.each([['horizontal', 5, 7], ['horizontal', 6, 8], ['vertical', 5, 7], ['vertical', 6, 8]] as const)('mirrors %s odd/even %s×%s colors and holes, preserving every protected pixel and metadata', (axis, w, h) => {
    const { edit, observation, raw } = fixture(w, h); edit.axis = axis;
    const original = structuredClone(observation), after = validateHandsPlan(raw, observation).checkpoints[0], data = after.frames[0].layers[0].raster.data;
    const at = (x: number, y: number) => (y * 32 + x) * 4;
    const expected = axis === 'horizontal' ? [[3 + w - 2, 5], [3 + w - 4, 5], [3 + w - 3, 7]] : [[4, 4 + h - 2], [6, 4 + h - 2], [5, 4 + h - 4]];
    expected.forEach(([x,y], i) => expect(data.slice(at(x,y), at(x,y)+4)).toEqual([[11,22,33,255],[99,88,77,255],[171,118,207,255]][i]));
    expect(data.filter((_,i)=>i%4===3 && data[i]===255)).toHaveLength(4);
    for (let y=0;y<32;y++) for (let x=0;x<32;x++) if (x<3 || x>=3+w || y<4 || y>=4+h) expect(data.slice(at(x,y),at(x,y)+4)).toEqual(original.project.frames[0].layers[0].raster.data.slice(at(x,y),at(x,y)+4));
    expect(after.frames[0].layers[1]).toEqual(original.project.frames[0].layers[1]); expect(after.frames[1]).toEqual(original.project.frames[1]);
    expect(after.metadata).toEqual(original.project.metadata); expect(after.frames[0].metadata).toEqual(original.project.frames[0].metadata); expect(observation).toEqual(original);
    const twice = predictHandsFlip(after.frames[0].layers[0].raster, edit); expect(twice).toEqual(original.project.frames[0].layers[0].raster);
  });
  it.each(['axis', 'extra-delta', 'clipping', 'fractional', 'wrong-frame', 'locked', 'hidden', 'partial-alpha', 'hidden-rgb', 'empty', 'symmetric', 'protection', 'stale', 'late-invalid'] as const)('rejects %s before mutating any observed project', kind => {
    const { edit, observation, raw } = fixture(), data = observation.project.frames[0].layers[0].raster.data;
    if (kind === 'axis') Object.assign(edit, { axis: 'diagonal' });
    if (kind === 'extra-delta') Object.assign(edit, { delta: { x: 0, y: 0 } });
    if (kind === 'clipping') edit.rect.x=29;
    if (kind === 'fractional') edit.rect.width=5.5;
    if (kind === 'wrong-frame') edit.frameId='frame-2';
    if (kind === 'locked') observation.project.frames[0].layers[0].locked=true;
    if (kind === 'hidden') observation.project.frames[0].layers[0].visible=false;
    if (kind === 'partial-alpha') data[(5*32+4)*4+3]=128;
    if (kind === 'hidden-rgb') data[(4*32+3)*4]=1;
    if (kind === 'empty') data.fill(0);
    if (kind === 'symmetric') { data.fill(0); data.splice((5*32+5)*4,4,1,2,3,255); }
    if (kind === 'protection') edit.protectedLayerIds=[];
    if (kind === 'stale') raw.observationId='stale';
    if (kind === 'late-invalid') raw.edits.push({ ...edit, rect: { ...edit.rect, x: 31 } });
    const before=handsSignature(observation.project); expect(()=>validateHandsPlan(raw,observation)).toThrow(); expect(handsSignature(observation.project)).toBe(before);
  });
  it('predicts successive horizontal and vertical flips from each preceding state', () => {
    const {edit,observation,raw}=fixture(); const steps=validateHandsPlan({...raw,edits:[edit,{...edit,axis:'vertical'}]},observation).checkpoints;
    const at=(9*32+6)*4; expect(steps[1].frames[0].layers[0].raster.data.slice(at,at+4)).toEqual([11,22,33,255]);
  });
});
