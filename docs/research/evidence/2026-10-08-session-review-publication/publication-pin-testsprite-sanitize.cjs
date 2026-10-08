const fs = require('node:fs');
const read = p => { const s = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''); return JSON.parse(s.slice(s.indexOf('{'))); };
const cases = [
  { role: 'tools', testId: '2518c15a-345c-471c-a1da-6a432827e453', runId: '7e772727-f37c-4fae-91da-ede8c5e55b46', auditVerdict: 'blocked; full workflow remains unqualified' },
  { role: 'motion', testId: '3e1fe6cb-8136-4403-b9ed-756ce296d1ba', runId: '0f77dd6b-0b50-404e-b924-d95ec4e84295', auditVerdict: 'inconclusive for the complete planned workflow' },
].map(c => {
  const r = read(`artifacts/publication-pin-testsprite-${c.role}-result.json`);
  if (r.runIdIfAvailable !== c.runId) throw Error('Latest result does not match the pinned run');
  const s = read(`artifacts/publication-pin-testsprite-${c.role}-steps.json`);
  const steps = (s.items || s.steps || []).map(({ stepIndex, action, description, status }) => ({ stepIndex, action, description, status }));
  return { ...c, serviceVerdict: r.status, startedAt: r.startedAt, finishedAt: r.finishedAt, steps,
    assertions: steps.filter(x => /assert|verify|visible/i.test(x.action)),
    dashboardUrl: `https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ad7cf58e-3c0f-41d6-96a8-a3a076faf639/test-cases/${c.testId}` };
});
const out = { recordedAt: new Date().toISOString(), buildId: 'jJUpvYssT5C0_qYh8GuKv', cacheTag: 'pixibun-20261008-publication-r4', sourceFingerprint: 'publication-pin-fingerprint.json',
  privacy: 'Only pinned IDs, terminal verdicts, public dashboard links and textual synthetic steps retained. Signed media, external scripts, credentials, account fields and raw HTML omitted.',
  artifactRetrieval: { attempted: true, result: 'Service withheld tools failure bundle because its temporary environment was changed/deleted after the run; original receipt retained locally.', productInference: 'Tools summary speculates about download timing, but its recorded actions click Export repeatedly without a recorded Download PNG click. No product defect is inferred from that speculation; native browser checks are independent.' }, cases };
fs.writeFileSync('artifacts/publication-pin-testsprite-audited.json', JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(cases.map(x => ({ role: x.role, serviceVerdict: x.serviceVerdict, steps: x.steps.length, assertions: x.assertions, auditVerdict: x.auditVerdict }))));
