const fs=require('node:fs'),crypto=require('node:crypto'),cp=require('node:child_process');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const target='artifacts/motion-layout-r2-fingerprint.json';
if(process.argv.includes('--check')){
 const prior=JSON.parse(fs.readFileSync(target));const changed=[...prior.files,...prior.build].filter(f=>!fs.existsSync(f.path)||hash(f.path)!==f.sha256);
 const result={checkedAt:new Date().toISOString(),inputs:prior.files.length,buildFiles:prior.build.length,buildId:prior.buildId,changed};fs.writeFileSync('artifacts/motion-layout-r2-integrity.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(changed.length)process.exitCode=1;
}else{
 if(fs.existsSync(target))throw Error('Refusing to overwrite fingerprint');
 const inputs=[...new Set(cp.execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z','--','src','tests','scripts','package.json','package-lock.json','next.config.ts','tsconfig.json','eslint.config.mjs','vitest.config.ts','playwright.config.ts','playwright.production.config.ts','AGENTS.md'],{encoding:'utf8'}).split('\0').filter(Boolean))].sort().filter(p=>fs.statSync(p).isFile());
 const files=inputs.map(path=>({path,sha256:hash(path)}));
 const build=['.next/BUILD_ID','.next/build-manifest.json','.next/app-build-manifest.json','.next/server/app/sw.js/route.js'].filter(p=>fs.existsSync(p)).map(path=>({path,sha256:hash(path)}));
 const snapshot={recordedAt:new Date().toISOString(),revision:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirtyWorkingTree:true,buildId:fs.readFileSync('.next/BUILD_ID','utf8').trim(),cacheTag:'pixibun-20261008-motion-layout-r2',files,build};
 fs.writeFileSync(target,JSON.stringify(snapshot,null,2)+'\n');console.log(JSON.stringify({inputs:files.length,buildFiles:build.length,buildId:snapshot.buildId}));
}

