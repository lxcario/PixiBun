/**
 * The loop ledger: the committed record of pull requests TestSprite checked.
 *
 * One module validates docs/testsprite/loop-ledger.json and renders both the
 * /verified page data and docs/testsprite/loop-ledger.md, so the page, the
 * Markdown and the JSON cannot drift apart. Plain JavaScript (with JSDoc
 * types) because the Node 22 doc gate imports it without a TypeScript step.
 */

export const LEDGER_SCHEMA_VERSION = 1;
export const REPO_URL = 'https://github.com/lxcario/PixiBun';
export const LEDGER_JSON_PATH = 'docs/testsprite/loop-ledger.json';
export const LEDGER_MARKDOWN_PATH = 'docs/testsprite/loop-ledger.md';
/** Why a first run went red. Only `product-bug` counts as a bug caught. */
export const FAILURE_CAUSES = /** @type {const} */ (['product-bug', 'test-fix', 'environment']);
export const VERDICTS = /** @type {const} */ (['passed', 'failed', 'pending']);

/** @typedef {typeof FAILURE_CAUSES[number]} FailureCause */
/** @typedef {typeof VERDICTS[number]} Verdict */
/**
 * @typedef {object} LedgerFailure
 * @property {string} case  TestSprite case name as shown in the portal.
 * @property {FailureCause} cause
 * @property {string} note  What actually went wrong, in a sentence.
 */
/**
 * @typedef {object} LedgerEntry
 * @property {number} pr
 * @property {string} title
 * @property {string} prUrl  Must be REPO_URL/pull/<pr>.
 * @property {string} checkedOn  ISO date of the first TestSprite run.
 * @property {string} testspriteRunUrl
 * @property {LedgerFailure[]} failures  What failed on the first run; empty when it was green.
 * @property {string | null} fixCommit  Commit that turned the check green; null when nothing failed.
 * @property {Verdict} verdict  The final check result.
 */
/**
 * @typedef {object} LoopLedger
 * @property {number} schemaVersion
 * @property {string} updated  ISO date the file was last edited.
 * @property {string | null} testspriteProjectUrl
 * @property {number | null} suiteCases  Cases in the TestSprite suite; null until it is counted.
 * @property {LedgerEntry[]} entries
 */
/**
 * @typedef {object} LedgerSummary
 * @property {number | null} suiteCases
 * @property {number} prsChecked
 * @property {number} bugsCaught  Product bugs found by a red first run.
 * @property {number} redToGreen  PRs whose first run failed and whose final verdict passed.
 */

const TOP_KEYS = ['schemaVersion', 'updated', 'testspriteProjectUrl', 'suiteCases', 'entries'];
const ENTRY_KEYS = ['pr', 'title', 'prUrl', 'checkedOn', 'testspriteRunUrl', 'failures', 'fixCommit', 'verdict'];
const FAILURE_KEYS = ['case', 'cause', 'note'];

export class LoopLedgerError extends Error {
  /** @param {string[]} problems */
  constructor(problems) {
    super('Invalid loop ledger:\n- ' + problems.join('\n- '));
    this.name = 'LoopLedgerError';
    this.problems = problems;
  }
}

/** @param {unknown} value */
const isRecord = value => typeof value === 'object' && value !== null && !Array.isArray(value);
/** @param {unknown} value */
const isText = value => typeof value === 'string' && value.trim().length > 0 && value === value.trim();

/** @param {unknown} value */
function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** @param {unknown} value */
function isTestSpriteUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new globalThis.URL(value);
    return url.protocol === 'https:' && (url.hostname === 'testsprite.com' || url.hostname.endsWith('.testsprite.com'));
  } catch {
    return false;
  }
}

/**
 * @param {Record<string, unknown>} record
 * @param {string[]} allowed
 * @param {string} where
 * @param {string[]} problems
 */
function checkKeys(record, allowed, where, problems) {
  for (const key of allowed) if (!(key in record)) problems.push(`${where}: missing "${key}"`);
  for (const key of Object.keys(record)) if (!allowed.includes(key)) problems.push(`${where}: unknown field "${key}"`);
}

/**
 * Checks shape and the loop's own rules (a fix needs a failure; a failed
 * verdict needs a recorded failure). Returns every problem, not just the first.
 * @param {unknown} value
 * @returns {string[]}
 */
export function loopLedgerProblems(value) {
  /** @type {string[]} */
  const problems = [];
  if (!isRecord(value)) return ['ledger: must be a JSON object'];
  checkKeys(value, TOP_KEYS, 'ledger', problems);
  if (value.schemaVersion !== LEDGER_SCHEMA_VERSION) problems.push(`ledger: schemaVersion must be ${LEDGER_SCHEMA_VERSION}`);
  if (!isIsoDate(value.updated)) problems.push('ledger: updated must be a YYYY-MM-DD date');
  if (value.testspriteProjectUrl !== null && !isTestSpriteUrl(value.testspriteProjectUrl)) problems.push('ledger: testspriteProjectUrl must be null or an https testsprite.com link');
  if (value.suiteCases !== null && !(Number.isInteger(value.suiteCases) && /** @type {number} */ (value.suiteCases) >= 0)) problems.push('ledger: suiteCases must be null or a whole number');
  if (!Array.isArray(value.entries)) {
    problems.push('ledger: entries must be an array');
    return problems;
  }
  const seen = new Set();
  value.entries.forEach((entry, index) => {
    const where = `entries[${index}]`;
    if (!isRecord(entry)) {
      problems.push(`${where}: must be an object`);
      return;
    }
    checkKeys(entry, ENTRY_KEYS, where, problems);
    const pr = entry.pr;
    if (!Number.isInteger(pr) || /** @type {number} */ (pr) < 1) problems.push(`${where}: pr must be a positive whole number`);
    else if (seen.has(pr)) problems.push(`${where}: PR #${pr} is listed twice`);
    else seen.add(pr);
    if (!isText(entry.title)) problems.push(`${where}: title must be non-empty text without outer spaces`);
    if (entry.prUrl !== `${REPO_URL}/pull/${pr}`) problems.push(`${where}: prUrl must be ${REPO_URL}/pull/${pr}`);
    if (!isIsoDate(entry.checkedOn)) problems.push(`${where}: checkedOn must be a YYYY-MM-DD date`);
    else if (isIsoDate(value.updated) && /** @type {string} */ (entry.checkedOn) > /** @type {string} */ (value.updated)) problems.push(`${where}: checkedOn is after the ledger's updated date`);
    if (!isTestSpriteUrl(entry.testspriteRunUrl)) problems.push(`${where}: testspriteRunUrl must be an https testsprite.com link`);
    if (!VERDICTS.includes(/** @type {Verdict} */ (entry.verdict))) problems.push(`${where}: verdict must be one of ${VERDICTS.join(', ')}`);
    if (entry.fixCommit !== null && !(typeof entry.fixCommit === 'string' && /^[0-9a-f]{7,40}$/.test(entry.fixCommit))) problems.push(`${where}: fixCommit must be null or a 7–40 character lowercase commit hash`);
    if (!Array.isArray(entry.failures)) {
      problems.push(`${where}: failures must be an array`);
      return;
    }
    entry.failures.forEach((failure, failureIndex) => {
      const at = `${where}.failures[${failureIndex}]`;
      if (!isRecord(failure)) {
        problems.push(`${at}: must be an object`);
        return;
      }
      checkKeys(failure, FAILURE_KEYS, at, problems);
      if (!isText(failure.case)) problems.push(`${at}: case must be non-empty text`);
      if (!FAILURE_CAUSES.includes(/** @type {FailureCause} */ (failure.cause))) problems.push(`${at}: cause must be one of ${FAILURE_CAUSES.join(', ')}`);
      if (!isText(failure.note)) problems.push(`${at}: note must say what went wrong`);
    });
    const failed = entry.failures.length > 0;
    if (!failed && entry.fixCommit !== null) problems.push(`${where}: a fixCommit needs at least one recorded failure`);
    if (failed && entry.verdict === 'passed' && entry.fixCommit === null) problems.push(`${where}: a red run that ended green needs the fixCommit that turned it green`);
    if (entry.verdict === 'failed' && !failed) problems.push(`${where}: a failed verdict needs at least one recorded failure`);
  });
  return problems;
}

/**
 * @param {unknown} value
 * @returns {LoopLedger}
 */
export function parseLoopLedger(value) {
  const problems = loopLedgerProblems(value);
  if (problems.length) throw new LoopLedgerError(problems);
  return /** @type {LoopLedger} */ (value);
}

/**
 * Newest PR first, so the latest loop is what a visitor reads first.
 * @param {LoopLedger} ledger
 * @returns {LedgerEntry[]}
 */
export function orderedEntries(ledger) {
  return [...ledger.entries].sort((a, b) => b.pr - a.pr);
}

/**
 * @param {LoopLedger} ledger
 * @returns {LedgerSummary}
 */
export function summarizeLoopLedger(ledger) {
  let bugsCaught = 0;
  let redToGreen = 0;
  for (const entry of ledger.entries) {
    bugsCaught += entry.failures.filter(failure => failure.cause === 'product-bug').length;
    if (entry.failures.length > 0 && entry.verdict === 'passed') redToGreen++;
  }
  return { suiteCases: ledger.suiteCases, prsChecked: ledger.entries.length, bugsCaught, redToGreen };
}

/** @param {string} text */
const cell = text => text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

/** @param {LedgerFailure} failure */
export const describeFailure = failure => `${failure.case} (${failure.cause}): ${failure.note}`;

/**
 * The human-readable twin of the JSON, written by `npm run ledger:md` and
 * checked by `npm run verify:docs`.
 * @param {LoopLedger} ledger
 * @returns {string}
 */
export function renderLoopLedgerMarkdown(ledger) {
  const summary = summarizeLoopLedger(ledger);
  const lines = [
    '# TestSprite loop ledger',
    '',
    '<!-- Generated from loop-ledger.json by `npm run ledger:md`. Edit the JSON, then regenerate. -->',
    '',
    `Every pull request TestSprite checked, what failed on its first run and the commit that turned it green. Source: [loop-ledger.json](loop-ledger.json), validated by \`src/lib/verified/loopLedger.mjs\`; shown live at [pixibun.vercel.app/verified](https://pixibun.vercel.app/verified). Last updated ${ledger.updated}.`,
    '',
    `- TestSprite project: ${ledger.testspriteProjectUrl ? `<${ledger.testspriteProjectUrl}>` : 'not linked yet'}`,
    `- Cases in the suite: ${summary.suiteCases === null ? 'not counted yet' : summary.suiteCases}`,
    `- PRs checked: ${summary.prsChecked}`,
    `- Bugs caught (product bugs only): ${summary.bugsCaught}`,
    `- Red → fix → green PRs: ${summary.redToGreen}`,
    '',
  ];
  if (!ledger.entries.length) {
    lines.push('No pull request has been checked yet. Rows are added only for real TestSprite runs, with their run link.', '');
    return lines.join('\n');
  }
  lines.push('| PR | Checked | TestSprite run | What failed | Fixing commit | Verdict |', '| --- | --- | --- | --- | --- | --- |');
  for (const entry of orderedEntries(ledger)) {
    const failed = entry.failures.length ? entry.failures.map(failure => cell(describeFailure(failure))).join('<br>') : 'Nothing; green on the first run';
    const commit = entry.fixCommit ? `[\`${entry.fixCommit.slice(0, 7)}\`](${REPO_URL}/commit/${entry.fixCommit})` : '—';
    lines.push(`| [#${entry.pr}](${entry.prUrl}) ${cell(entry.title)} | ${entry.checkedOn} | [run](${entry.testspriteRunUrl}) | ${failed} | ${commit} | ${entry.verdict} |`);
  }
  lines.push('');
  return lines.join('\n');
}
