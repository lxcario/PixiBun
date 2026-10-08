const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = process.cwd();
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const exclusions = ['node_modules','artifacts','.git','.next','test-results','playwright-report','.kilo','.codex'];
const listed = execFileSync('rg', ['--files','--hidden','--no-ignore','-g','*.md', ...exclusions.flatMap(x=>['-g',`!${x}/**`]), '-g','!docs/research/evidence/**'], {encoding:'utf8'}).trim().split(/\r?\n/).map(p=>p.replaceAll('\\','/')).sort();
const intake = JSON.parse(fs.readFileSync('artifacts/pixibun-markdown-census.json','utf8'));
const old = new Map(intake.files.map(x=>[x.path,x]));
const overrides = {
  'export/godot/ralsei_walk/README.md':'retained-example',
  'FullStackGuide.md':'generic-reference',
  'docs/research/issue-registry.md':'active-registry',
  'docs/research/testsprite-plan-registry.md':'active-registry',
  'docs/research/legacy-audit-registry.md':'historical-registry',
  'docs/research/markdown-maintenance-map.md':'historical-registry',
  'docs/research/phase-implementation-status.md':'dated-record',
  'docs/research/PHASE4_ARTIST_UX_STUDY.md':'study-protocol',
  'docs/research/phase6-artist-evaluation.md':'study-protocol',
  'docs/research/pixitools-baseline-study.md':'study-protocol',
  'testsprite-plans/challenge-2026-10-03/README.md':'dated-run-guide',
};
const sourceOwners = {
  'README.md':['src/config/shortcuts.ts','src/lib/animation/pixiMotion.ts'],
  'MAIN.md':['package.json','src/lib/animation/pixiMotion.ts'],
  'SKILL.md':['src/lib/engine/historyEngine.ts','src/lib/canvas/rotSprite.ts'],
  'DESIGN.md':['src/app/globals.css','src/config/zoom.ts','src/components/layout/BottomTimeline.tsx','src/components/ui/StudioSlider.tsx','src/components/ui/StudioToggle.tsx','src/components/ui/StudioTooltip.tsx'],
  'ARCHITECTURE.md':['src/lib/animation/pixiMotion.ts','src/lib/animation/motionRigWorkspace.ts','src/lib/engine/workspaceTransaction.ts','src/lib/render/framePreview.ts','src/lib/canvas/rotSprite.ts','src/lib/canvas/paethRotation.ts','src/lib/art/normalSculptor.ts','src/lib/export/gifEncoder.ts'],
  'BENCHMARKS.md':['src/lib/engine/historyEngine.ts','src/lib/safety/memoryBudget.ts','src/components/layout/CenterViewport.tsx'],
  'PIXIBUN_DEEP_DIVE.md':['src/lib/canvas/rotSprite.ts','src/lib/export/apngEncoder.ts','src/lib/project/schema.ts'],
  'docs/features.md':['src/config/shortcuts.ts','src/components/modals/export/ExportTabsNav.tsx','src/lib/art/playgroundLessons.ts','src/components/layout/inspector/PixiMotionPanel.tsx'],
  'docs/guides/release-readiness.md':['next.config.ts','scripts/checkDeploymentCandidate.mjs'],
  'docs/guides/studio-workspace.md':['src/hooks/viewport/useViewportSelectionTransform.ts','src/stores/slices/createLayerSlice.ts'],
  'docs/guides/artist-workspace.md':['src/components/layout/inspector/ToolSettingsPanel.tsx','src/components/layout/inspector/PixiMotionPanel.tsx','src/components/layout/inspector/MotionRigLibrary.tsx'],
};
const roleNote = role => ({
  'current-reference':'Current claims and source-owner review; corrections applied where identified; links/contracts checked separately.',
  'active-registry':'Current status/supersession review; earlier verdicts remain dated.',
  'historical-registry':'Intake/legacy scope screening; original IDs and at-run resolutions retained.',
  'dated-record':'Revision/date/result scope screening; preserve original observations, failures and limits.',
  'dated-record-or-registry':'Revision/date/result scope screening; preserve original observations, failures and limits.',
  'historical-ledger':'Historical scope screening; preserve original release/phase results and counts.',
  'proposal':'Proposal/delivered-subset screening; requirements and acceptance goals are not current implementation claims.',
  'study-protocol':'Study protocol and pending-participant scope screening; no outcomes inferred.',
  'retained-example':'Checked against bundled manifest/resource/controller; clarified separate from current exporter and engine qualification.',
  'generic-reference':'Generic engineering guidance scope; not a PixiBun implementation inventory.',
  'dated-run-guide':'Dated plan/run scope and later verification supersession; no new external run.',
  'vendor-instructions':'Metadata/provenance inventory; upstream skill instructions retained. Not a product feature document.',
  'private-transcript':'Metadata only; private conversation is not operating documentation. Content not copied or certified.',
  'generated-run-record':'Metadata only; original generated result retained, no signed media copied or current verdict inferred.',
}[role] || 'Scope screening; dated record retained.');
const missing = [];
const files = listed.map(p => {
  const bytes = fs.readFileSync(p), previous = old.get(p);
  const role = overrides[p] || previous?.category || 'dated-record';
  const metadataOnly = ['private-transcript','generated-run-record'].includes(role);
  const content = metadataOnly ? '' : bytes.toString('utf8');
  const refs = [...new Set([...content.matchAll(/\b(?:src|tests|scripts)\/[A-Za-z0-9_./+\-]+\.(?:tsx?|mjs|json|css|ps1|py)/g)].map(x=>x[0]))];
  for (const ref of refs) if (!fs.existsSync(ref)) missing.push({document:p,role,reference:ref});
  return {path:p, role, review:roleNote(role), bytes:bytes.length, sha256:hash(bytes), changedSinceIntake:previous ? previous.sha256 !== hash(bytes) : null,
    sourceOwners:[...new Set([...(sourceOwners[p]||[]), ...refs])], scopeLead:metadataOnly ? null : content.split(/\r?\n/).filter(l=>l.trim() && !l.startsWith('#')).slice(0,3).join(' ').replace(/https?:\/\/\S+/g,'[URL]').slice(0,480)};
});
const counts = {}; files.forEach(f=>counts[f.role]=(counts[f.role]||0)+1);
const report = {recordedAt:new Date().toISOString(), baseRevision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), dirtyWorkingTree:true,
  scope:'Main-workspace narrative Markdown, including local ignored proposal, vendor skills and metadata-only private/generated records; dependencies/builds/artifacts/separate worktrees/sealed evidence excluded and handled separately.',
  method:'Full-text path/role/claim screening for non-private narrative files, semantic source-owner review of current guidance and identified mismatches; not proof of every sentence or future specification.',
  initialCount:intake.files.length, count:files.length, counts, files, missingSourceReferences:missing};
fs.writeFileSync('artifacts/pixibun-markdown-reconciliation.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('artifacts/pixibun-markdown-scope-review.txt',files.filter(f=>!['current-reference','vendor-instructions','private-transcript','generated-run-record'].includes(f.role)).map(f=>`${f.path} [${f.role}]\n${f.scopeLead}\n`).join('\n'));
console.log(JSON.stringify({count:files.length,counts,missingSourceReferences:missing},null,2));
