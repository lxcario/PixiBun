/** Strict launcher arguments. A grep is a journey filter, never a browser selection. */
export function artistOptions(args) {
  let mode = 'mock', workflow = 'artist', copy = false, flip = false, rotate = false; const browserArgs = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--conversation') { mode = 'conversation'; continue; }
    if (args[i] === '--mock') { mode = 'mock'; continue; }
    if (args[i] === '--hands') { workflow = 'hands'; continue; }
    if (args[i] === '--copy') { copy = true; continue; }
    if (args[i] === '--flip') { flip = true; continue; }
    if (args[i] === '--rotate') { rotate = true; continue; }
    if (args[i] === '--project' && ['chromium', 'firefox', 'webkit'].includes(args[i + 1])) { browserArgs.push('--project', args[++i]); continue; }
    throw new Error('Use --mock or --conversation, optional --hands, --copy, --flip or --rotate and --project chromium/firefox/webkit. No retries or expectation overrides.');
  }
  if ((copy || flip || rotate) && workflow !== 'hands') throw new Error('Editing journeys are only available in the Hands workflow.');
  if ([copy,flip,rotate].filter(Boolean).length>1) throw new Error('Choose one conversation journey: --copy, --flip or --rotate.');
  if (workflow === 'hands' && (mode === 'conversation' || copy || flip || rotate)) browserArgs.push('--grep', rotate ? 'Hands rotation 90 variant 1' : flip ? 'Hands flips horizontal asymmetric 5x7' : copy ? 'Hands copies an eye' : 'Hands records intent');
  if (mode === 'conversation' && !browserArgs.includes('--project')) browserArgs.push('--project', 'chromium');
  return { mode, workflow, copy, flip, rotate, browserArgs };
}
