const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve('artifacts/pixibun-rollback-reader-source/src'),loaded=[];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const originalResolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest){return originalResolve.call(this,request.startsWith('@/')?path.join(root,request.slice(2)):request,parent,...rest)};
require.extensions['.ts']=(module,file)=>{
 if(!path.resolve(file).startsWith(root+path.sep))throw Error('Historical source escape');
 const text=fs.readFileSync(file,'utf8');loaded.push({path:path.relative(root,file).replaceAll('\\','/'),sha256:hash(text)});
 module._compile(ts.transpileModule(text,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
};
const reader=require(path.join(root,'lib/project/schema.ts'));
const version=require(path.join(root,'types/project.ts')).PROJECT_FORMAT_VERSION;
const input=process.argv[2];if(!input)throw Error('Pass an actual candidate-written portable backup path');
const bytes=fs.readFileSync(input),project=JSON.parse(bytes),before=hash(JSON.stringify(project));
const result=reader.validateProjectFile(project),after=hash(JSON.stringify(project));
const record={checkedAt:new Date().toISOString(),scope:'Exact Git HEAD schema graph, isolated Node TypeScript transpilation. Portable-file admission diagnostic only; not a historical production browser/storage/update qualification.',historicalRevision:'dcf9f5c303cdbaa6a533e3315de947c261c1e3ac',historicalSupportedVersion:version,sourceArchiveSha256:hash(fs.readFileSync('artifacts/pixibun-rollback-reader-source.zip')),candidateBuildId:fs.readFileSync('.next/BUILD_ID','utf8').trim(),input:{path:input,sha256:hash(bytes),version:project.version,motionRigs:project.motionRigs?.length||0},verdict:result.ok?'admitted':'refused',error:result.ok?null:result.error,inputObjectUnchanged:before===after,inputFileUnchanged:hash(fs.readFileSync(input))===hash(bytes),loadedSourceFiles:loaded};
fs.writeFileSync('artifacts/pixibun-improvements-old-reader.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({...record,loadedSourceFiles:loaded.length},null,2));if(!record.inputObjectUnchanged||!record.inputFileUnchanged)process.exitCode=1;
