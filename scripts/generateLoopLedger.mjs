/** Writes docs/testsprite/loop-ledger.md from the validated JSON; `npm run verify:docs` fails when it is stale. */
import fs from 'node:fs';
import { LEDGER_JSON_PATH, LEDGER_MARKDOWN_PATH, parseLoopLedger, renderLoopLedgerMarkdown } from '../src/lib/verified/loopLedger.mjs';

const ledger = parseLoopLedger(JSON.parse(fs.readFileSync(LEDGER_JSON_PATH, 'utf8')));
fs.writeFileSync(LEDGER_MARKDOWN_PATH, renderLoopLedgerMarkdown(ledger));
console.log('Wrote ' + LEDGER_MARKDOWN_PATH + ' from the validated ledger (' + ledger.entries.length + ' entries).');
