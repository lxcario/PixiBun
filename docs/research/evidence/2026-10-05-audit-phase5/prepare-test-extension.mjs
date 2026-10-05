import { readFile, writeFile } from 'node:fs/promises';
const directory = 'docs/research/evidence/2026-10-05-audit-phase5';
const existing = JSON.parse(await readFile(`${directory}/testsprite-backup-existing.log`, 'utf8'));
const extension = {
  projectId: existing.projectId, type: existing.type, priority: 'p1', name: existing.name,
  description: `${existing.description} Also compare downloaded creation timestamps through a saved reload and gallery duplication.`,
  planSteps: [...existing.planSteps,
    { type: 'action', description: 'Read the exact downloaded native backup as JSON. Capture createdAt, name, frame IDs, durations and decoded layer RGBA bytes. If file inspection is unavailable, report BLOCKED.' },
    { type: 'action', description: 'Save the imported project using Save.' },
    { type: 'action', description: 'Reload Studio.' },
    { type: 'action', description: 'Download another project backup using the download fallback.' },
    { type: 'assertion', description: 'The second JSON createdAt equals the first downloaded createdAt; updatedAt is later. Both frames retain their IDs, holds and decoded pixel bytes. Visibility alone cannot pass.' },
    { type: 'action', description: 'Duplicate this project using Gallery. Record the wall-clock time before duplication.' },
    { type: 'action', description: 'Open the gallery duplicate.' },
    { type: 'action', description: 'Download the duplicate as a project backup.' },
    { type: 'assertion', description: 'The duplicate has a fresh createdAt at or after duplication time. Frames, holds and decoded artwork bytes match the original.' },
    { type: 'action', description: 'Reopen the original artwork from Gallery.' },
    { type: 'action', description: 'Download the original project backup again.' },
    { type: 'assertion', description: 'The original still has the first downloaded creation date and unchanged frame holds and artwork bytes.' },
  ],
};
await writeFile(`${directory}/testsprite-backup-extension.plan.json`, JSON.stringify(extension, null, 2));
console.log(`Prepared extension for existing case ${existing.id}; no external update performed.`);
