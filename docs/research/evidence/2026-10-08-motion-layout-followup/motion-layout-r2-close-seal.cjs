const fs=require('node:fs'),crypto=require('node:crypto');
const root='docs/research/evidence/2026-10-08-motion-layout-followup';
const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'));
if(manifest.status!=='pending-final-documentation-check')throw Error('Refusing to change a sealed archive');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const file of manifest.files)if(hash(fs.readFileSync(root+'/'+file.path))!==file.sha256)throw Error('Capture changed: '+file.path);
const result=JSON.parse(fs.readFileSync('artifacts/motion-layout-r2-final-docs-status.json','utf8'));
if(result.exitCode!==0)throw Error('Final documentation validation must pass');
for(const name of ['motion-layout-r2-final-docs.log','motion-layout-r2-final-docs-status.json']) {
 if(manifest.files.some(f=>f.path===name))throw Error('Final receipt already present');
 const source='artifacts/'+name,b=fs.readFileSync(source);fs.writeFileSync(root+'/'+name,b);manifest.files.push({path:name,source,bytes:b.length,sha256:hash(b)});
}
manifest.status='sealed';manifest.sealedAt=new Date().toISOString();manifest.finalDocumentation=result;
fs.writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({status:manifest.status,files:manifest.files.length,captures:manifest.captures.length,manifestSHA256:hash(fs.readFileSync(root+'/manifest.json'))}));
