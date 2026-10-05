import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
const directory = 'docs/research/evidence/2026-10-05-audit-phase2';
function chunk(type, data) {
  const bytes = Buffer.concat([Buffer.from(type), data]); let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  const size = Buffer.alloc(4), checksum = Buffer.alloc(4); size.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([size, bytes, checksum]);
}
const header = Buffer.alloc(13); header.writeUInt32BE(32, 0); header.writeUInt32BE(32, 4); header[8] = 8; header[9] = 6;
const rows = Buffer.alloc(32 * 129); rows[2 * 129 + 2 + 3 * 4] = 255; rows[2 * 129 + 4 + 3 * 4] = 128;
const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]).toString('base64');
const fixture = { format: 'pixibun-project', version: 3, name: 'Corner fixture', width: 32, height: 32, fps: 8, loopMode: 'repeat',
  onionSkin: { enabled: false, prevFrames: 1, nextFrames: 1, prevColor: '#c792df', nextColor: '#dcabdf', opacity: 0.45 },
  palettes: [{ id: 'colors', name: 'Colors', colors: ['#ff0000', '#00ff00'] }], currentPaletteId: 'colors', customRamps: [], clips: [],
  frames: [{ id: 'frame', durationMs: 100, layers: [{ id: 'body', name: 'Body', visible: true, locked: false, opacity: 1, blendMode: 'source-over', pngBase64: png }] }], createdAt: 1, updatedAt: 1 };
await writeFile(`${directory}/original-corner-fixture.pixibun`, JSON.stringify(fixture, null, 2) + '\n');
const projectId = 'ad7cf58e-3c0f-41d6-96a8-a3a076faf639';
const action = description => ({ type: 'action', description });
const assertion = description => ({ type: 'assertion', description });
const backup = action('Download Export → Project Backup → Download project backup and decode the Body PNG. Use the supported download fallback if needed. Inspect actual downloaded metadata/pixels, not a private application store. Report unavailable file/pixel inspection as BLOCKED or INCONCLUSIVE, never a visibility-only pass.');
const plans = [
  { filename: 'testsprite-stroke-consistency.plan.json', name: 'Clean corners restore original pixels and dither fills coarse pointer paths', priority: 'p1', description: 'Exact pixel/history/reload checks for whole-stroke corner filtering and interpolated canvas-anchored dither.', steps: [
    action(`Use a fresh isolated desktop browser context with 1280x720 or wider viewport. Open Studio and wait for restoration. Write a runner-local corner.pixibun file containing exactly this synthetic original JSON and import through the file picker/Confirm Import. Report unsupported upload as BLOCKED. JSON: ${JSON.stringify(fixture)}`),
    action('Select Pen, size 1, Clean corners enabled. Drag one stroke through pixel centers (2,2), (3,2), (3,3), sending a separate pointer movement for each coordinate, then release.'), backup,
    assertion('Verify Body pixel (3,2) is exactly [0,255,0,128], restoring the original beneath the removed corner. Pixels (2,2) and (3,3) have alpha 255. Retain all decoded bytes as the drawn baseline.'),
    action('Focus the drawing canvas and press Ctrl+Z. Download and decode another project backup.'),
    assertion('Verify all original pixel bytes are restored: only (3,2) is [0,255,0,128], every other pixel is transparent.'),
    action('Focus canvas, press Ctrl+Y, Save to browser storage, wait for Changes saved and reload. Download/decode the reopened backup.'),
    assertion('Verify every decoded Body byte matches the drawn baseline, including the preserved green corner pixel.'),
    action('Focus the canvas and press D to select Dither Brush without a hovering tool preview. Keep size 1, Bayer 2x2 and density 0.5. Drag from (0,8) directly to (20,8), with one movement between endpoints, then release. Download/decode the backup and retain these bytes.'),
    assertion('Verify alpha 255 at x=0,2,...,20 along y=8 and alpha 0 at x=1,3,...,19. Earlier Pen pixels remain unchanged.'),
    action('Focus canvas and Undo the dither. Draw the same Dither stroke with a movement through every integer x from 0 to 20 at y=8. Download and decode the backup.'),
    assertion('Verify all decoded bytes match the coarse dither baseline. Missing intermediate pattern pixels must fail the test.'),
    action('Undo, Redo, Save, wait for Changes saved and reload. Download/decode the backup.'),
    assertion('Verify exact reopened Body bytes still match the dither baseline. Report missing history/reload assertions explicitly.') ] },
  { filename: 'testsprite-gallery-rename.plan.json', name: 'Gallery rename contains keyboard input and shares artwork save version ownership', priority: 'p1', description: 'Active/inactive mouse and keyboard renames preserve saved pixels; a real stale tab retains its local work and refuses overwrite.', steps: [
    action('Use a fresh isolated desktop context. Open Studio, wait for restoration, draw one dot at (4,4), Save and wait for Changes saved. Download/decode a backup and retain its raster bytes and project identity.'),
    action('Open File → Projects, choose Rename artwork on the current project. Type My, Space, sprite. Press Escape in that input.'),
    assertion('Verify the input accepted My sprite including its space, the gallery did not open its card, and Escape cancelled only rename while keeping the gallery visible.'),
    action('Choose Rename artwork again, enter My sprite and click Save title. Close the gallery. Draw another dot at (7,7), Save and wait for Changes saved, then reload.'), backup,
    assertion('Verify the reopened name is My sprite, both dots are preserved, original raster bytes outside (7,7) are unchanged, and no conflict warning was manufactured by the local rename.'),
    action('Open Projects, rename My sprite to Keyboard title by pressing Enter in the title input. Verify the gallery stays visible after submission. Choose New Drawing and Save. Reopen Projects, rename the now-inactive Keyboard title to Inactive title with Enter.'),
    assertion('Verify renaming the inactive project leaves the current blank drawing unchanged. Open Inactive title and verify its saved raster bytes include both original dots.'),
    action('Close any dialog. Open a second tab in the SAME isolated browser context and origin, wait for Studio restoration, and verify it has the same stored drawing. Keep this second tab open. In the first tab, rename the active drawing First tab through Projects and wait for the completed rename.'),
    action('In the second tab draw a new dot at (8,8), then attempt gallery rename to Second tab using Save title.'),
    assertion('Verify the second tab reports title save failure and retains its local new dot. Closing the gallery exposes the real external-conflict warning with Save a copy. Do not silently refresh its expected storage version or overwrite First tab.'),
    action('Reload the first tab and download/decode its backup.'),
    assertion('Verify the stored name is First tab and its raster bytes still contain (4,4)/(7,7) but not the second tab dot (8,8). Missing shared-context tab support must be reported BLOCKED, not skipped.') ] },
];
for (const plan of plans) await writeFile(`${directory}/${plan.filename}`, JSON.stringify({ projectId, type: 'frontend', name: plan.name, description: plan.description, priority: plan.priority, planSteps: plan.steps }, null, 2) + '\n');
console.log('Prepared two Phase 2 test plans and an original fixture; nothing registered or shared.');
