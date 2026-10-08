const fs=require('node:fs'),crypto=require('node:crypto'),cp=require('node:child_process');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const inputs=[...new Set(cp.execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z','--','src','tests','scripts','package.json','package-lock.json','next.config.ts','playwright.config.ts','playwright.production.config.ts','AGENTS.md'],{encoding:'utf8'}).split('\0').filter(Boolean))].sort().filter(p=>fs.statSync(p).isFile());
const files=inputs.map(path=>({path,sha256:hash(path)}));
const build=['.next/BUILD_ID','.next/build-manifest.json','.next/app-build-manifest.json','.next/server/app/sw.js/route.js'].filter(p=>fs.existsSync(p)).map(path=>({path,sha256:hash(path)}));
const snapshot={recordedAt:new Date().toISOString(),revision:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),buildId:fs.readFileSync('.next/BUILD_ID','utf8').trim(),files,build};
const phase=process.argv.includes('--complete')?'complete':process.argv.includes('--pin')?'pin':process.argv.includes('--release')?'release':process.argv.includes('--published')?'published':process.argv.includes('--pivot')?'pivot':process.argv.includes('--final')?'qualified':'final';
const target='artifacts/publication-'+phase+'-fingerprint.json';
if(process.argv.includes('--check')){
 const prior=JSON.parse(fs.readFileSync(target));const changed=[...prior.files,...prior.build].filter(f=>!fs.existsSync(f.path)||hash(f.path)!==f.sha256);
 const result={checkedAt:new Date().toISOString(),checkedInputs:prior.files.length,checkedBuildFiles:prior.build.length,buildId:prior.buildId,changed};fs.writeFileSync('artifacts/publication-'+phase+'-integrity.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(changed.length)process.exitCode=1;
}else{if(fs.existsSync(target))throw Error('Refusing to overwrite frozen fingerprint');fs.writeFileSync(target,JSON.stringify(snapshot,null,2)+'\n');console.log('Frozen '+files.length+' inputs, '+build.length+' build files; '+snapshot.buildId);}
