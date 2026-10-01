import fs from 'node:fs';
import { sourceContracts, testInventory } from './docContracts.mjs';
const root = process.cwd();
fs.mkdirSync('docs/generated', { recursive: true });
fs.writeFileSync('docs/generated/test-inventory.json', JSON.stringify(testInventory(root), null, 2) + '\n');
fs.writeFileSync('docs/generated/source-contracts.json', JSON.stringify(sourceContracts(root), null, 2) + '\n');
console.log('Generated test discovery and selected source contracts; no execution verdict implied.');
