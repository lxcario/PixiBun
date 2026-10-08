const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');const root='docs/research/evidence/2026-10-08-motion-bounds-hardening';
const m=JSON.parse(fs.readFileSync(root+'/manifest.json'));if(m.status!=='prepared; final documentation check follows')throw Error('Archive already sealed or wrong phase');
if(!fs.readFileSync('artifacts/motion-bbox-docs-final.log','utf8').includes('Selected documentation checks passed.'))throw Error('Documentation verification missing');
for(const name of ['motion-bbox-docs-final.log','motion-bbox-cleanup.json','motion-bbox-close-evidence.cjs']){const source='artifacts/'+name;fs.copyFileSync(source,path.join(root,name));m.files.push({path:name,source,bytes:fs.statSync(source).size,sha256:hash(source)});}
m.status='sealed';m.sealedAt=new Date().toISOString();m.finalDocumentationCheck='Selected links/discovery/contracts passed; narrative accuracy is not mechanically certified.';
const bad=m.files.filter(f=>hash(path.join(root,f.path))!==f.sha256);if(bad.length)throw Error('Archive copy changed');fs.writeFileSync(root+'/manifest.json',JSON.stringify(m,null,2)+'\n');
fs.writeFileSync('artifacts/motion-bbox-evidence-integrity.json',JSON.stringify({recordedAt:new Date().toISOString(),files:m.files.length,changed:bad,manifestSha256:hash(root+'/manifest.json')},null,2)+'\n');console.log(JSON.stringify({files:m.files.length,changed:0,status:m.status}));
