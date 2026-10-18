/** Dated supporting cloud evidence. It never increments automatic PR counters. */
export const STORIES_PATH = 'docs/testsprite/verification-stories.json';

/**
 * @typedef {object} VerificationStory
 * @property {string} id
 * @property {string} title
 * @property {string} promise
 * @property {string} discovery
 * @property {string} repair
 * @property {'preview-passed' | 'local-passed'} status
 * @property {string} sourceCommit
 * @property {string | null} fixCommit
 * @property {string | null} prUrl
 * @property {string} redUrl
 * @property {string} redRunId
 * @property {string | null} followUpUrl
 * @property {string} scope
 */
/**
 * @typedef {object} SupportingCheck
 * @property {string} id
 * @property {string} title
 * @property {string} scope
 * @property {string} runUrl
 * @property {string} runId
 * @property {string} codeVersion
 * @property {string} sourceCommit
 */
/**
 * @typedef {object} VerificationStories
 * @property {number} schemaVersion
 * @property {string} updated
 * @property {string} automationNote
 * @property {VerificationStory[]} stories
 * @property {SupportingCheck[]} checks
 */

const text = value => typeof value === 'string' && value.trim().length > 0;
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const execution = value => {
  if (typeof value !== 'string') return false;
  try {
    const url = new globalThis.URL(value);
    return url.origin === 'https://www.testsprite.com' && !url.username && !url.password
      && !url.search && !url.hash && /^\/dashboard-v3\/o\/[^/]+\/projects\/[a-f0-9-]+\/execution\/[a-f0-9-]+$/.test(url.pathname);
  } catch { return false; }
};

/** Fail at build time if evidence loses its source, scope or real run links.
 * @param {unknown} value
 * @returns {VerificationStories}
 */
export function parseVerificationStories(value) {
  if (!record(value)) throw new Error('Invalid verification stories: expected an object');
  const data = /** @type {VerificationStories} */ (value);
  const problems = [];
  if (data.schemaVersion !== 1) problems.push('schemaVersion must be 1');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.updated) || Number.isNaN(Date.parse(data.updated))
    || new Date(data.updated).toISOString().slice(0, 10) !== data.updated) problems.push('invalid updated date');
  if (!text(data.automationNote)) problems.push('automationNote required');
  if (!Array.isArray(data.stories) || !Array.isArray(data.checks)) throw new Error('Invalid verification stories: stories and checks must be arrays');
  const ids = new Set();
  for (const story of data.stories) {
    if (!record(story)) { problems.push('story must be an object'); continue; }
    if (!/^[a-z][a-z0-9-]+$/.test(story.id) || ids.has(story.id)) problems.push('invalid or duplicate story id');
    ids.add(story.id);
    for (const key of ['title', 'promise', 'discovery', 'repair', 'scope']) if (!text(story[key])) problems.push(`${story.id}: ${key} required`);
    if (!sha(story.sourceCommit) || !uuid(story.redRunId) || !execution(story.redUrl)) problems.push(`${story.id}: source and original run required`);
    if (story.fixCommit !== null && !sha(story.fixCommit)) problems.push(`${story.id}: invalid fix commit`);
    if (story.prUrl !== null && !/^https:\/\/github.com\/lxcario\/PixiBun\/pull\/[1-9]\d*$/.test(story.prUrl)) problems.push(`${story.id}: invalid PR`);
    if (story.followUpUrl !== null && !execution(story.followUpUrl)) problems.push(`${story.id}: invalid follow-up run`);
    if (story.status === 'preview-passed') {
      if (!story.fixCommit || !story.prUrl || !story.followUpUrl || story.followUpUrl === story.redUrl) problems.push(`${story.id}: preview pass needs fixing commit, PR and different follow-up run`);
    } else if (story.status === 'local-passed') {
      if (story.followUpUrl !== null) problems.push(`${story.id}: a local-only repair cannot claim a cloud follow-up`);
    } else problems.push(`${story.id}: invalid status`);
  }
  for (const check of data.checks) {
    if (!record(check)) { problems.push('check must be an object'); continue; }
    if (!/^[a-z][a-z0-9-]+$/.test(check.id) || ids.has(check.id)) problems.push('invalid or duplicate check id');
    ids.add(check.id);
    if (!text(check.title) || !text(check.scope) || !/^v-[a-f0-9]+$/.test(check.codeVersion)
      || !sha(check.sourceCommit) || !uuid(check.runId) || !execution(check.runUrl)) problems.push(`${check.id}: check needs scope, source, code version and run`);
  }
  if (problems.length) throw new Error('Invalid verification stories: ' + problems.join('; '));
  return data;
}
