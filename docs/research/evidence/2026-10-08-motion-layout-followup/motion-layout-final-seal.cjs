const fs=require('node:fs'),crypto=require('node:crypto'),cp=require('node:child_process');
const root='docs/research/evidence/2026-10-08-motion-layout-followup';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'));
if(m.status!=='pending-final-documentation-check')throw Error('Refusing to change sealed evidence');
for(const f of m.files)if(hash(fs.readFileSync(root+'/'+f.path))!==f.sha256)throw Error('Copied evidence changed: '+f.path);
for(const p of ['docs/current-status.md','docs/features.md','docs/guides/artist-workspace.md','docs/guides/studio-workspace.md'])fs.writeFileSync(p,fs.readFileSync(p,'utf8').trimEnd()+'\n');
cp.execFileSync(process.execPath,['artifacts/motion-layout-r2-census.cjs'],{stdio:'inherit'});
const census='motion-layout-r2-markdown-census.json';
const b=fs.readFileSync('artifacts/'+census);fs.writeFileSync(root+'/'+census,b);
Object.assign(m.files.find(f=>f.path===census),{bytes:b.length,sha256:hash(b)});
for(const name of ['motion-layout-r2-docs-sandbox-attempt.log','motion-layout-r2-docs-sandbox-attempt-status.json','motion-layout-final-seal.cjs']){
const source='artifacts/'+name,data=fs.readFileSync(source);fs.writeFileSync(root+'/'+name,data);m.files.push({path:name,source,bytes:data.length,sha256:hash(data)});
}
fs.writeFileSync(root+'/manifest.json',JSON.stringify(m,null,2)+'\n');
cp.execFileSync(process.execPath,['artifacts/motion-layout-r2-close-seal.cjs'],{stdio:'inherit'});
