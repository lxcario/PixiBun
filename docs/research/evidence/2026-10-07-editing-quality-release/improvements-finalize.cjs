const fs = require('node:fs');
const log = fs.readFileSync('artifacts/pixibun-improvements-final-full-compiled.log', 'utf8');
const passed = Number(log.match(/^\s+(\d+) passed \(([^\r\n]+)\)/m)?.[1]);
const duration = log.match(/^\s+\d+ passed \(([^\r\n]+)\)/m)?.[1];
const skipped = Number(log.match(/^\s+(\d+) skipped\s*$/m)?.[1] ?? 0);
if (!passed || passed + skipped !== 270 || /\d+ failed/.test(log)) throw Error('Complete 270-case terminal pass required');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const integrity = read('artifacts/pixibun-improvements-final-integrity.json');
if (integrity.changed.length) throw Error('Candidate changed');
const verdicts = {
  recordedAt: new Date().toISOString(),
  scope: 'Local uncommitted R6 candidate; no publication or deployment',
  revision: 'dcf9f5c303cdbaa6a533e3315de947c261c1e3ac',
  buildId: integrity.buildId,
  cacheTag: 'pixibun-20261007-motion-quality-r6',
  gate: { passed: true, stages: 5, unitIntegrationTests: 2071, suites: 198, defaultUnitWorkers: true, unchangedUnitTimeouts: true },
  compiled: { total: 270, passed, skipped, failed: 0, duration, engines: ['chromium','firefox','webkit'], workers: 1, retries: 0,
    skips: log.split(/\r?\n/).filter(line => /^\s+-\s+\d+ \[/.test(line)).map(line => line.trim()),
    diagnostic: 'Firefox emitted a failed uncached RSC request while the offline test intentionally stopped its origin. Exact artwork reload and subsequent offline save/reload assertions passed. Original log retained.' },
  focusedWelcomeArtist: { passed: 18, failed: 0, engines: ['chromium','firefox','webkit'], workers: 1, retries: 0 },
  developmentEditor: { rerun: false, enumeratedCases: 196, inventoryIsNotVerdict: true },
  performance: { beforeScenarios: 9, afterScenarios: 9, widths: [64,128,256], physicalPen: false, INP: false, heapMeasurement: false, slowerBakeCompletion: true },
  testsprite: { testId: '3e1fe6cb-8136-4403-b9ed-756ce296d1ba', name: 'Motion pose Undo restores precise edits and supports thirty frames', runId: '3f330cd9-f235-41dc-8924-4155c0776dea', serviceVerdict: 'passed', auditedVerdict: 'inconclusive', reason: '37 steps but only two assertions; numeric history values, frame limit, bake/history frame counts and source pixels omitted', connectionClosed: true },
  dependencyAudit: { productionAdvisories: 0, scopedLockfilePatches: ['sharp 0.35.5','source-map-js 1.2.2'] },
  rollbackReader: { exactBaseReader: true, maximumFormat: 3, actualCandidateInputFormat: 4, verdict: 'refused', inputUnchanged: true, completeHistoricalApplicationQualified: false },
  suppliedHost: { url: 'https://pixibun.vercel.app', readOnly: true, observedWorkerLabel: 'pixibun-v1.14.1-dcf9f5c303cdbaa6a533e3315de947c261c1e3ac', differsFromLocal: true, candidateDeployed: false },
  pending: ['Artist participants and usefulness observations','Physical pen/touch and assistive technology','Long-session and broader project performance','Real two-build deployed update transition','Compatible full-application storage/save-back and rollback qualification']
};
fs.writeFileSync('artifacts/pixibun-improvements-final-verdicts.json', JSON.stringify(verdicts, null, 2)+'\n');
function change(file, from, to) {
 const source=fs.readFileSync(file,'utf8');
 if(!source.includes(from))throw Error('Missing finalization anchor in '+file);
 fs.writeFileSync(file,source.replace(from,to));
}
const result = `**${passed} passes /${skipped} capability skips /zero failures**`;
change('docs/research/2026-10-07-editing-quality-release-hardening.md',
 'Status: in progress.',
 'Status: engineering and local qualification complete; artist/device and deployed release qualification remain pending.');
change('docs/research/2026-10-07-editing-quality-release-hardening.md',
 '## Executed evidence so far', '## Executed evidence');
change('docs/research/2026-10-07-editing-quality-release-hardening.md',
 'Fresh final profiles and the post-product-repair external run completed; the full compiled suite remains in progress.',
 `Fresh final profiles and the post-product-repair external run completed. The complete compiled suite finished with ${result} across Chromium, Firefox and WebKit (${duration}), with one worker and zero retries. The skips concern unavailable or mismatched WebRTC/touch capabilities; they are not passing cases. The intentionally disconnected Firefox offline test emitted an uncached RSC network error while its exact artwork and subsequent save/reload assertions passed. The original log is retained.`);
change('docs/research/2026-10-07-editing-quality-release-hardening.md',
 'The final worker build and controlled before/after profiles are complete; the full compiled suite and final evidence sealing are pending.',
 'The final worker build, controlled before/after profiles and full compiled suite are complete. Execution evidence records verdicts, source/build hashes, diagnostics and unchanged prior archives.');
const status = fs.readFileSync('docs/current-status.md','utf8');
const begin = status.indexOf('The [five-area follow-up]');
const end = status.indexOf('\n\n## Previous local work: Markdown reconciliation',begin);
if(begin<0||end<0)throw Error('Missing current-status anchors');
const paragraph = `The [five-area follow-up](plans/2026-10-07-editing-quality-and-release.md) completes its local engineering and verification, with a [dated execution record](research/2026-10-07-editing-quality-release-hardening.md). It adds parameter Undo/Redo, precise numeric controls, shared 2–30-frame limits, dedicated worker previews, cancellable atomic baking, matching preview/cel timing, independent visual measurements and complete artist journeys. It also repairs welcome starter/blank-size admission while preserving saved drawings and patches two affected indirect dependencies. The final five-stage gate/build passed **2,071 tests /198 suites**; the complete compiled suite finished with ${result} across Chromium/Firefox/WebKit, one worker and zero retries. All **18 focused welcome/artist journeys** also passed. Frozen source/build inputs and 174 files in previous sealed evidence retain their hashes.\n\nControlled profiles reduced measured motion main-thread stalls, with slower bake completion; this is bounded desktop evidence. TestSprite's final service pass is **audited inconclusive** because key assertions were omitted. The [artist study kit](guides/artist-study.md) is prepared, but participants, physical devices and assistive-technology observations remain pending. The supplied deployed reference loaded successfully and has a different worker label from the candidate. The exact earlier v3 reader refuses an actual current v4 backup unchanged; a compatible rollback candidate and real two-build host/storage transition still need qualification. Changes remain local and uncommitted; no push or deployment was performed. The full development editor suite was not rerun for this follow-up.`;
fs.writeFileSync('docs/current-status.md',status.slice(0,begin)+paragraph+status.slice(end));
change('docs/plans/2026-10-07-editing-quality-and-release.md',
 'Complete artist exports pass all three engines; final full suite is in progress.',
 'Complete artist exports pass all three engines; final full compiled suite passed.');
change('docs/plans/2026-10-07-editing-quality-and-release.md',
 'Final gate/build passes; source frozen; full 270-case suite in progress.',
 `Final gate/build passes; source frozen; full compiled suite has ${passed} passes/${skipped} capability skips/zero failures.`);
console.log(`Finalized ${passed} passes, ${skipped} skips, zero failures (${duration}); external verdict remains inconclusive.`);
