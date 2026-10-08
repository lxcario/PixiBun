const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const root='docs/research/evidence';
const names=fs.readdirSync(root).filter(p=>/^2026-10-0[678]-/.test(p)&&p!=='2026-10-08-session-review-publication');
const staged=process.argv.includes('--staged');
const read=p=>staged?cp.execFileSync('git',['show',':'+p],{maxBuffer:100*1024*1024}):fs.readFileSync(p);
const changed=[],archives=[];let files=0;
for(const name of names){const manifestPath=path.posix.join(root,name,'manifest.json');const b=read(manifestPath),m=JSON.parse(b.toString('utf8').replace(/^\uFEFF/,''));const entries=m.files||m.artifacts||m.captures||[];archives.push({path:manifestPath,sha256:sha(b),entries:entries.length});for(const f of entries){const p=f.path.startsWith(root+'/')?f.path:path.posix.join(root,name,f.path);files++;if(sha(read(p))!==f.sha256)changed.push(p);}}
const out={recordedAt:new Date().toISOString(),scope:staged?'Staged Git blobs against original eight manifest digests':'Original eight motion/session evidence manifests against current working-tree bytes',archives,checkedFiles:files,changed};
fs.writeFileSync('artifacts/publication-evidence-'+(staged?'staged':'working')+'.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({archives:archives.length,files,changed}));if(changed.length)process.exitCode=1;
