import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
const directory = 'docs/research/evidence/2026-10-05-audit-phase1';
function chunk(type, data) {
  const bytes = Buffer.concat([Buffer.from(type), data]); let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  const size = Buffer.alloc(4), checksum = Buffer.alloc(4); size.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([size, bytes, checksum]);
}
function png(alpha) {
  const header = Buffer.alloc(13); header.writeUInt32BE(32, 0); header.writeUInt32BE(32, 4); header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc(32 * 129);
  for (let y = 2; y < 5; y++) for (let x = 2; x < 5; x++) { rows[y * 129 + 1 + x * 4] = 255; rows[y * 129 + 4 + x * 4] = alpha; }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]).toString('base64');
}
const body = i => ({ id: `body-${i}`, name: 'Body', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: png(255) });
const light = { id: 'light-1', name: 'Lighting', visible: false, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: png(51) };
const fixture = { format: 'pixibun-project', version: 3, name: 'Identity fixture', width: 32, height: 32, fps: 8, loopMode: 'repeat',
  onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, prevColor: '#c792df', nextColor: '#dcabdf', opacity: 0.45 },
  palettes: [{ id: 'roles', name: 'Roles', colors: ['#ff0000', '#ff0000'], semantics: { entries: [{id:'cloth',role:'cloth'},{id:'fire',role:'fire'}],
    bindings: [{ id: 'fire-region', frameId: 'frame-0', entryId: 'fire', x: 0, y: 0, w: 32, h: 32 }] } }], currentPaletteId: 'roles', customRamps: [],
  clips: [{id:'attack',name:'Attack',startFrame:1,endFrame:2,loopMode:'forward'}],
  frames: [0,1,2,3].map(i => ({id:`frame-${i}`,durationMs:100,layers:i === 1 ? [light,body(i)] : [body(i)]})), createdAt: 1, updatedAt: 1 };
await writeFile(`${directory}/original-identity-fixture.pixibun`, JSON.stringify(fixture, null, 2) + '\n');
const projectId = 'ad7cf58e-3c0f-41d6-96a8-a3a076faf639';
const prepare = { type: 'action', description: `Use a fresh isolated desktop browser context. Write a runner-local file named identity.pixibun containing exactly this synthetic original project JSON, then import it in Studio through the file picker and Confirm Import. Do not access existing personal projects. If runner file upload is unavailable, report BLOCKED rather than skipping the fixture. JSON: ${JSON.stringify(fixture)}` };
const action = description => ({type:'action',description});
const assertion = description => ({type:'assertion',description});
const plans = [
  { filename: 'testsprite-clip-palette.plan.json', name: 'Frame duplication preserves clip artwork and semantic palette bindings through undo and reload', priority: 'p1', description: 'An original four-frame project retains the Attack clip members and duplicate-red register intent when frame 1 is duplicated, undone, redone and saved/reloaded.', steps: [prepare,
    action('Select frame 1, open Frame actions, and choose Move frame later.'),
    assertion('Verify the editor reports that moving the frame would split the Attack clip, and that the four-frame order remains unchanged.'),
    action('With frame 1 selected, choose Frame actions → Duplicate frame.'),
    action('Use Export → Project Backup → Download project backup. If native file save interferes, use the supported download fallback. Inspect the downloaded JSON, not private application stores.'),
    assertion('Verify there are five frames. Attack selects exactly original frame-1 and frame-2: its startFrame/endFrame are 2/3. The new second frame has a fresh ID and its Roles palette has a new binding with that frameId and entryId fire. Decode its Body PNG and verify pixel (2,2) is [255,0,0,255].'),
    action('Focus the drawing canvas and use Ctrl+Z. Download another project backup.'),
    assertion('Verify Undo restores four frames, Attack range 1/2, and the original single palette binding.'),
    action('Focus the drawing canvas and use Ctrl+Y. Save to browser storage, wait for Changes saved, and reload the page.'),
    action('Wait for restoration to finish and download the reopened project backup.'),
    assertion('Verify the reopened project retains all five frame identities, Attack still selects original frame-1/frame-2, the duplicate retains its fire binding, and its decoded Body pixel (2,2) is [255,0,0,255]. Report inability to inspect downloads as BLOCKED, not a pass based on visible controls.') ] },
  { filename: 'testsprite-batch-layer.plan.json', name: 'All-frame color erase follows matching layers across different stacks and Undo preserves unrelated pixels', priority: 'p1', description: 'Sampled-color erase must change only uniquely matching Body layers when another frame has Lighting above Body, and Undo must restore exact original rasters.', steps: [prepare,
    action('Select frame 1, choose Erase Sampled Color, open its tool settings, and switch frame scope to All frames. Keep default family/tolerance settings.'),
    action('Click the red artwork at pixel (3,3).'),
    action('Download a Project Backup and inspect each layer PNG by decoding it in the runner/browser.'),
    assertion('Verify Body pixel (2,2) has alpha 0 in all four frames. Hidden Lighting in frame-1 must retain exact original PNG pixels, including RGBA [255,0,0,51] at (2,2). Do not infer preservation from its visibility.'),
    action('Use Undo last action, or focus the drawing canvas and press Ctrl+Z. Download another backup.'),
    assertion('Verify every original Body pixel (2,2) is [255,0,0,255], and Lighting remains [255,0,0,51]. Compare all decoded pixel bytes with the original fixture where possible.'),
    action('Redo the erase, Save, wait for Changes saved, and reload Studio.'),
    action('Download the reopened Project Backup.'),
    assertion('Verify the erased Body pixels remain transparent and unrelated Lighting still matches its original raster. Report missing fixture/download/pixel assertions as BLOCKED or INCONCLUSIVE, never a visibility-only pass.') ] },
];
for (const plan of plans) await writeFile(`${directory}/${plan.filename}`, JSON.stringify({projectId,type:'frontend',name:plan.name,description:plan.description,priority:plan.priority,planSteps:plan.steps},null,2) + '\n');
console.log('Prepared two external plans and an original synthetic fixture; nothing registered or shared.');
