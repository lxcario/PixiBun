const fs=require('node:fs'),crypto=require('node:crypto');
const prior=JSON.parse(fs.readFileSync('artifacts/motion-layout-original-evidence.json','utf8'));
const changed=[...prior.archives,...prior.captures].filter(f=>!fs.existsSync(f.path)||crypto.createHash('sha256').update(fs.readFileSync(f.path)).digest('hex')!==f.sha256).map(f=>f.path);
const out={checkedAt:new Date().toISOString(),scope:'Pinned pre-follow-up manifests and captures; new evidence is separate',archives:prior.archives.length,captures:prior.captures.length,changed};
fs.writeFileSync('artifacts/motion-layout-original-integrity-final.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));if(changed.length)process.exitCode=1;
