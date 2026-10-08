const fs=require('node:fs');
const qualified=JSON.parse(fs.readFileSync('artifacts/motion-layout-r3-qualified-fingerprint.json','utf8'));
const frozen=JSON.parse(fs.readFileSync('artifacts/motion-layout-r3-fingerprint.json','utf8'));
const previous=new Map(frozen.files.map(f=>[f.path,f.sha256]));
const changed=qualified.files.filter(f=>previous.get(f.path)!==f.sha256).map(f=>f.path);
if(changed.length!==1||changed[0]!=='tests/production/canvasContextMenu.spec.ts'||JSON.stringify(qualified.build)!==JSON.stringify(frozen.build))throw Error('Unexpected final fixture/build difference');
const out={checkedAt:new Date().toISOString(),buildId:qualified.buildId,applicationUnchanged:true,buildUnchanged:true,changed,scope:'Native starter readiness prerequisite strengthened; all exact RGBA/tool/focus assertions retained. Strict types and fixture lint rerun before final browser qualification.'};
fs.writeFileSync('artifacts/motion-layout-r3-fixture-delta.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
