const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const target='docs/research/evidence/2026-10-07-editing-quality-release';
if(fs.existsSync(target))throw Error('Refusing to overwrite an evidence directory');
const sources=[
 'artifacts/pixibun-improvements-welcome-complete-gate.log','artifacts/pixibun-improvements-welcome-repaired-compiled.log','artifacts/pixibun-improvements-final-full-compiled.log',
 'artifacts/pixibun-improvements-final-fingerprint.json','artifacts/pixibun-improvements-final-integrity.json','artifacts/pixibun-improvements-prior-evidence.json','artifacts/pixibun-improvements-prior-evidence-before.json',
 'artifacts/pixibun-performance-before.json','artifacts/pixibun-performance-before-isolated.log','artifacts/pixibun-performance-after.json','artifacts/pixibun-performance-final-after.log','artifacts/pixibun-performance-comparison.json',
 'artifacts/pixibun-performance-after-r1.json','artifacts/pixibun-performance-after-r3.json','artifacts/pixibun-performance-before-overlapping-runs.json',
 'artifacts/pixibun-motion-quality.json','artifacts/pixibun-motion-quality.log','artifacts/pixibun-improvements-testsprite-audited.json','artifacts/pixibun-improvements-editing-testsprite-refined-plan.json',
 'artifacts/pixibun-improvements-production-audit.json','artifacts/pixibun-improvements-production-audit-patched.json','artifacts/pixibun-improvements-dependency-patches.log','artifacts/pixibun-lock-before-advisory-patches.json',
 'artifacts/pixibun-improvements-old-reader.json','artifacts/pixibun-improvements-old-reader.log','artifacts/pixibun-rollback-reader-source.zip',
 'artifacts/pixibun-deployed-read-only.json','artifacts/pixibun-improvements-host-reference.json','artifacts/pixibun-improvements-final-worker-identity.json',
 'artifacts/pixibun-improvements-editing-gate-build-repaired.log','artifacts/pixibun-improvements-editing-production.log','artifacts/pixibun-improvements-editing-production-fixture-repaired.log',
 'artifacts/pixibun-improvements-candidate-gate-build.log','artifacts/pixibun-improvements-r2-gate.log','artifacts/pixibun-improvements-final-gate.log','artifacts/pixibun-improvements-full-compiled.log',
 'artifacts/pixibun-improvements-starter-final-gate.log','artifacts/pixibun-improvements-welcome-final-gate.log','artifacts/pixibun-improvements-welcome-compiled.log',
 'artifacts/pixibun-welcome-blank-allocation-before.log','artifacts/pixibun-welcome-blank-allocation-repaired.log','artifacts/pixibun-improvements-welcome-owned-final-gate.log','artifacts/pixibun-improvements-welcome-owned-repaired-gate.log',
 'artifacts/pixibun-improvements-final-docs.log','artifacts/pixibun-improvements-final-verdicts.json','artifacts/pixibun-improvements-testsprite-artifact.log',
 'artifacts/profile-workflows.cjs','artifacts/improvements-compare.cjs','artifacts/improvements-fingerprint.cjs','artifacts/improvements-prior-evidence.cjs','artifacts/improvements-sanitize-testsprite.cjs','artifacts/improvements-old-reader.cjs','artifacts/improvements-finalize.cjs','artifacts/improvements-seal.cjs'
];
const integrity=read('artifacts/pixibun-improvements-final-integrity.json'),prior=read('artifacts/pixibun-improvements-prior-evidence.json');
if(integrity.changed.length||prior.manifestChanges.length||prior.archives.some(a=>a.changed.length))throw Error('Integrity check failed');
const log=fs.readFileSync('artifacts/pixibun-improvements-final-full-compiled.log','utf8');
if(!/\d+ passed/.test(log)||/\d+ failed/.test(log))throw Error('Full compiled terminal pass required');
for(const source of sources)if(!fs.existsSync(source))throw Error('Missing '+source);
for(const port of [3230,3235,3236,3237,3238])if(!fs.existsSync('artifacts/playwright-production-'+port))throw Error('Missing browser evidence '+port);
const files=[];fs.mkdirSync(target,{recursive:true});
function copy(source,dest){const output=path.join(target,dest);fs.mkdirSync(path.dirname(output),{recursive:true});fs.copyFileSync(source,output);files.push({path:dest.replaceAll('\\','/'),source:source.replaceAll('\\','/'),bytes:fs.statSync(source).size,sha256:hash(source)});}
for(const source of sources){if(!fs.existsSync(source))throw Error('Missing '+source);copy(source,path.basename(source));}
function walk(dir,accept){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.isSymbolicLink())throw Error('Symlink refused');const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file,accept);else if(accept(file))copy(file,'browser-evidence/'+file.replaceAll('\\','/').replace(/^artifacts\//,''));}}
for(const port of [3230,3235,3236])walk('artifacts/playwright-production-'+port,p=>/error-context\.md$|test-failed-\d+\.png$/.test(p));
walk('artifacts/playwright-production-3237',p=>/\.png$/.test(p));
walk('artifacts/playwright-production-3238',p=>/saved-rig\.pixibun$|artist-journey.*\.png$/.test(p));
const old=read('artifacts/pixibun-improvements-old-reader.json');copy(old.input.path,'rollback-input/saved-rig.pixibun');
const manifest={recordedAt:new Date().toISOString(),status:'sealed',revision:'dcf9f5c303cdbaa6a533e3315de947c261c1e3ac',dirtyWorkingTree:true,runtime:'Node 22.23.3 on Windows',buildId:integrity.buildId,cacheTag:'pixibun-20261007-motion-quality-r6',verdicts:read('artifacts/pixibun-improvements-final-verdicts.json'),sourceIntegrity:integrity,previousEvidenceIntegrity:{checked:prior.checked,changed:prior.manifestChanges},privacy:'Only synthetic/test projects and sanitized TestSprite text. Raw account fields, signed media/HTML and credentials stay outside this archive. Representative failure screenshots/context are included; complete diagnostic traces remain in ignored local artifacts.',files};
fs.writeFileSync(target+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
const bad=files.filter(f=>hash(path.join(target,f.path))!==f.sha256);if(bad.length)throw Error('Archive copy mismatch');
console.log('Sealed '+files.length+' evidence files with hashes; source and earlier archives checked.');
