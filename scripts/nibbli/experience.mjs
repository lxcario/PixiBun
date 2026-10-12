import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const observationKinds = new Set(['action-failed', 'journey-failed', 'capture-failed', 'pixel-verification',
  'file-verification', 'playback-observation', 'preview-video', 'observation', 'artist-goal',
  'artist-plan-validated', 'artist-observation', 'artist-critique', 'artist-failed', 'expected-refusal',
  'hands-goal', 'hands-plan-validated', 'hands-edit-intent', 'hands-observation', 'hands-verification', 'hands-critique', 'hands-failed']);

/** Read Tester, Artist and Hands without changing outcomes, journals or candidate strategies. */
export async function readExperiences(workspace) {
  const experiences = [];
  for (const family of ['runs', 'artist-runs', 'hands-runs']) {
    const root = path.join(workspace, 'artifacts/nibbli', family);
    let runs;
    try { runs = await readdir(root, { withFileTypes: true }); }
    catch (error) { if (error.code !== 'ENOENT') throw error; runs = []; }
    for (const run of runs.filter(entry => entry.isDirectory() && !entry.isSymbolicLink())) {
      const directory = path.join(root, run.name);
      let outcome = { verdict: 'incomplete' };
      try { outcome = JSON.parse(await readFile(path.join(directory, 'outcome.json'), 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      const observations = [];
      const attempts = (await readdir(directory, { withFileTypes: true })).filter(entry =>
        entry.isDirectory() && entry.name.startsWith('attempt-') && !entry.isSymbolicLink());
      for (const attempt of attempts) {
        let journal;
        try { journal = await readFile(path.join(directory, attempt.name, 'events.jsonl'), 'utf8'); }
        catch (error) {
          if (error.code !== 'ENOENT') throw error;
          observations.push({ attempt: attempt.name, journal: 'missing', status: 'incomplete' }); continue;
        }
        for (const line of journal.trim().split('\n').filter(Boolean)) {
          let event;
          try { event = JSON.parse(line); }
          catch { observations.push({ attempt: attempt.name, journal: 'unparseable-line', status: 'incomplete', originalLine: line }); continue; }
          if (!event || typeof event !== 'object' || typeof event.kind !== 'string') {
            observations.push({ attempt: attempt.name, journal: 'invalid-event', status: 'incomplete', originalLine: line }); continue;
          }
          if (observationKinds.has(event.kind)) observations.push({ attempt: attempt.name, ...event });
        }
      }
      experiences.push({ run: path.relative(workspace, directory).replaceAll('\\', '/'), outcome, observations });
    }
  }
  return { schema: 1, policy: 'Recorded experience only. Candidate strategies require independent review; no automatic training or test repair.', experiences };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await readExperiences(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')), null, 2));
}
