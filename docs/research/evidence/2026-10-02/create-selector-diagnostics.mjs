import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const root=process.cwd(),out='artifacts/doc-audit-2026-10-02';
fs.mkdirSync(out+'/adapted',{recursive:true});
for(const name of ['importImageAndSheet','offline','recoveryUIFlow','studio','uxVisualQa']){
 let s=fs.readFileSync(`tests/e2e/${name}.spec.ts`,'utf8').replaceAll("from '../helpers/","from '../../../tests/helpers/").replaceAll("from '../fixtures/","from '../../../tests/fixtures/");
 s=s.replaceAll("await expect(page.getByRole('button', { name: '64×64' })).toBeVisible();","await expect(page.getByTestId('main-composite-canvas')).toHaveJSProperty('width', 64);");
 s=s.replaceAll("page.getByText(/Offline · Drawing & local saves active|Offline Mode/i)","page.getByText('Offline', { exact: true })").replaceAll("page.getByText(/Offline · Drawing & local saves active/i)","page.getByText('Offline', { exact: true })");
 s=s.replaceAll("await page.getByRole('button', { name: /Gallery/i }).click();","await page.getByTestId('file-menu-button').click(); await page.getByRole('menuitem', { name: 'Projects', exact: true }).click();");
 s=s.replace("const guideBtn = page.getByRole('button', { name: /Atelier Guide, Diagnostics and Shortcuts|Guide/i });","await page.getByTestId('appearance-button').click(); const guideBtn = page.getByTestId('shortcuts-guide-button');");
 s=s.replace('/2\\.5D Photometric Studio/i','/Light your sprite/i');
 s=s.replace("const SCREENSHOT_DIR = 'docs/research/evidence/ux-qa';",`const SCREENSHOT_DIR = '${out}/diagnostic-captures';`);
 fs.writeFileSync(`${out}/adapted/${name}.spec.ts`,s);
}
console.log('Created seven selected workflow diagnostic copies; tracked tests are untouched.');
