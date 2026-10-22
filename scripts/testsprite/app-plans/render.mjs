#!/usr/bin/env node
// Turn App plan specs into TestSprite plan steps ({ planSteps }) and descriptions.
//
//   node scripts/testsprite/app-plans/render.mjs          write out/<key>.steps.json + out/plans.json
//   node scripts/testsprite/app-plans/render.mjs --check  also fail on gestures the App agent cannot perform
//
// The same spec drives emulate.py, so the wording here and the emulated gestures stay in step.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const specsDir = join(here, 'specs');
const outDir = join(here, 'out');
const check = process.argv.includes('--check');

const LABELS = {
  size: 'Canvas size', frame: 'Active frame', frames: 'Frames', layer: 'Active layer', layers: 'Layers in this frame',
  pixels: 'Painted pixels in this frame', colors: 'Colors in this frame', top: 'Most used colors with pixel counts',
  digest: 'Frame digest',
};

const READOUT_INTRO = 'the Canvas readout (the screen-reader section labelled "Canvas readout", read from the page text)';
const q = (s) => `'${s}'`;
const where = (step) => (step.within ? ` inside the ${q(step.within)} dialog` : '');
const roleWord = (step) => ({ button: 'button', link: 'link', tab: 'tab', checkbox: 'checkbox', option: 'option',
  menuitemradio: 'menu item', radio: 'option', switch: 'switch' }[step.role ?? 'button'] ?? step.role);
const nameOf = (name, shown) => (shown ? `${q(shown)} (accessible name ${q(name)})` : name.startsWith('/') ? `whose name matches ${name.replace(/^\/|\/i?$/g, '')}${name.endsWith('/i') ? ' (any letter case)' : ''}` : q(name));

function value(field, want) {
  if (field.endsWith('~')) {
    const [hex, count] = want.split(' ');
    return `${LABELS[field.slice(0, -1)]} is a single color within one step (±1 in each of red, green and blue) of ${hex}, covering ${count} pixels`;
  }
  if (typeof want === 'string' && want.startsWith('!=')) {
    const [ref, sub] = want.slice(2).split('.');
    if (/^[0-9a-f]{8}$/.test(ref)) return `${LABELS[field]} is no longer "${ref}"`;
    return `${LABELS[field]} differs from the value recorded as ${ref}${sub ? ` (${LABELS[sub]})` : ''}`;
  }
  if (typeof want === 'string' && want.startsWith('=')) {
    const [ref, sub] = want.slice(1).split('.');
    return `${LABELS[field]} is exactly the value recorded as ${ref}${sub ? ` (${LABELS[sub]})` : ''}`;
  }
  return `${LABELS[field]} is exactly "${want}"`;
}

function render(step, spec) {
  if (step.say) return [{ type: step.assert ? 'assertion' : kindOf(step), description: step.say }];
  if (step.open) return [{ type: 'action', description: `Navigate directly to ${step.open} on the environment under test (the origin plus this path). This test needs no file: the page itself draws the fixture.` }];
  if (step.skip) return [{ type: 'action', description: `If a welcome dialog appears, click ${q('Skip setup')}; otherwise continue.` }];
  if (step.click && step.optional) return [{ type: 'action', description: `If a ${nameOf(step.click, step.shown)} ${roleWord(step)} appears${where(step)}, click it; otherwise continue.` }];
  if (step.click) return [{ type: 'action', description: `Click the ${nameOf(step.click, step.shown)} ${roleWord(step)}${where(step)}.` }];
  if (step.rightClick) return [{ type: 'action', description: `Right-click the ${nameOf(step.rightClick, step.shown)} ${roleWord(step)}${where(step)}.` }];
  if (step.canvas) {
    const size = spec.canvas ?? '16×16';
    const [w, h] = size.split('×').map(Number);
    return [{ type: 'action', description: `Left-click once in the centre of the ${q('Pixel art canvas workspace')} with the active tool. On this ${size} canvas the centre is pixel (${w / 2},${h / 2}); do not click anywhere else on the canvas.` }];
  }
  if (step.fill) return [{ type: 'action', description: `Fill ${q(step.value)} into the field labelled ${q(step.fill)}${where(step)}.` }];
  if (step.select) return [{ type: 'action', description: `In the ${q(step.select)} dropdown${where(step)}, choose ${q(step.option)}.` }];
  if (step.key) return [{ type: 'action', description: `Press the ${step.key} key while no text field has focus.` }];
  if (step.color) {
    const pot = step.pot ?? 'Primary';
    return [{ type: 'action', description: `Set the ${pot} color to ${step.color}: click the ${q(`${pot} color …`)} well, fill ${q(step.color)} into the field labelled ${q(`${pot} hex value`)}, then click ${q('Close color access')}.` }];
  }
  if (step.command) return [{ type: 'action', description: `Press Control+K to open the command palette, fill ${q(step.command)} into ${q('Search studio commands')}, then click the matching ${q(step.command)} result.` }];
  if (step.record) return [{ type: 'action', description: `Read ${READOUT_INTRO} and write down its Frame digest, Painted pixels in this frame, Colors in this frame and Most used colors with pixel counts as ${step.record}.` }];
  if (step.readout) {
    const parts = Object.entries(step.readout).map(([field, want]) => value(field, want));
    return [{ type: 'assertion', description: `In ${READOUT_INTRO}: ${parts.join('; ')}.${step.why ? ` ${step.why}` : ''}` }];
  }
  if (step.visible) return [{ type: 'assertion', description: `The ${nameOf(step.visible, step.shown)} ${roleWord(step)} is visible${where(step)}.${step.why ? ` ${step.why}` : ''}` }];
  if (step.absent) return [{ type: 'assertion', description: `There is no ${q(step.absent)} ${roleWord(step)}${where(step)}.${step.why ? ` ${step.why}` : ''}` }];
  if (step.enabled) return [{ type: 'assertion', description: `The ${nameOf(step.enabled, step.shown)} ${roleWord(step)} is enabled.${step.why ? ` ${step.why}` : ''}` }];
  if (step.disabled) return [{ type: 'assertion', description: `The ${nameOf(step.disabled, step.shown)} ${roleWord(step)} is disabled.${step.why ? ` ${step.why}` : ''}` }];
  if (step.pressed) return [{ type: 'assertion', description: `The ${nameOf(step.pressed, step.shown)} ${roleWord(step)} is pressed (selected).${step.why ? ` ${step.why}` : ''}` }];
  if (step.unchecked) return [{ type: 'assertion', description: `The ${nameOf(step.unchecked, step.shown)} ${roleWord(step)} is not checked.${step.why ? ` ${step.why}` : ''}` }];
  if (step.checked) return [{ type: 'assertion', description: `The ${nameOf(step.checked, step.shown)} ${roleWord(step)} is checked.${step.why ? ` ${step.why}` : ''}` }];
  if (step.field) return [{ type: 'assertion', description: `The field labelled ${q(step.field)}${where(step)} shows ${q(step.equals)}.${step.why ? ` ${step.why}` : ''}` }];
  if (step.text) return [{ type: 'assertion', description: `The page contains the text "${step.text}".${step.why ? ` ${step.why}` : ''}` }];
  if (step.alert) return [{ type: 'assertion', description: `An alert message reading "${step.alert}" is shown immediately, before any other edit.${step.why ? ` ${step.why}` : ''}` }];
  if (step.note) return [];
  throw new Error(`${spec.key}: unknown step ${JSON.stringify(step)}`);
}

function kindOf(step) {
  return ['readout', 'visible', 'absent', 'enabled', 'disabled', 'pressed', 'checked', 'unchecked', 'field', 'text', 'alert']
    .some((k) => k in step) ? 'assertion' : 'action';
}

// Words that ask the App agent for something it cannot do, or that invite a Blocked verdict.
const UNSUPPORTED = [
  [/\bdrag\b/i, 'drag gestures'],
  [/decod/i, 'decoding a downloaded file'],
  [/\bRGBA\b|channels?\b/i, 'raw pixel channels'],
  [/download/i, 'reading a download'],
  [/upload|import .*\.(png|pixibun)|Test Files/i, 'fixture uploads'],
  [/viewport|resize the browser/i, 'changing the viewport'],
  [/report .*Blocked|mark .*Blocked/i, 'pre-authorised Blocked verdicts'],
];

function description(spec) {
  return [
    spec.goal,
    'App plan: every step is a click, fill, select or a named key on a labelled control, and every artwork check reads the Studio\'s Canvas readout (painted pixels, colors with counts, frame digest), which is computed from the actual composite of the active frame.',
    spec.cliOnly?.length ? `Byte-level checks kept in this test's stored Python replay: ${spec.cliOnly.join('; ')}.` : '',
    'A readout or control that differs from the stated value is a Failed result, not Blocked.',
  ].filter(Boolean).join(' ');
}

mkdirSync(outDir, { recursive: true });
const plans = [];
const problems = [];
for (const file of readdirSync(specsDir).filter((f) => f.endsWith('.json')).sort()) {
  const spec = JSON.parse(readFileSync(join(specsDir, file), 'utf8'));
  const planSteps = spec.steps.flatMap((step) => render(step, spec));
  if (planSteps.length > 200) problems.push(`${spec.key}: ${planSteps.length} steps (limit 200)`);
  for (const step of planSteps) {
    for (const [pattern, what] of UNSUPPORTED) {
      if (pattern.test(step.description) && !spec.allow?.includes(what)) problems.push(`${spec.key}: "${step.description.slice(0, 80)}…" asks for ${what}`);
    }
  }
  const desc = description(spec);
  writeFileSync(join(outDir, `${spec.key}.steps.json`), `${JSON.stringify({ planSteps }, null, 2)}\n`);
  plans.push({ id: spec.id, key: spec.key, title: spec.title, description: desc, steps: planSteps.length, previousSteps: spec.previousSteps ?? null });
}
writeFileSync(join(outDir, 'plans.json'), `${JSON.stringify(plans, null, 2)}\n`);
console.log(`Rendered ${plans.length} App plans to ${outDir}`);
if (problems.length) {
  console.log(problems.map((p) => `  ! ${p}`).join('\n'));
  if (check) process.exit(1);
}
