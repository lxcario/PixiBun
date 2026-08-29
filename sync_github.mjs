import fs from 'fs';
import path from 'path';

const TOKEN = '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';
const OWNER = 'lxcario';
const REPO = 'PixiBun';
const BRANCH = 'main';
const ROOT_DIR = process.cwd();

const IGNORED_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'coverage',
  'build',
  'out',
  '.vscode',
  '.idea',
  '.github',
]);

const IGNORED_FILES = new Set([
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.test.local',
  '.env.production.local',
  '.DS_Store',
  'sync_github.mjs',
  'check_status.mjs',
  'check_repo.mjs',
  'next-env.d.ts',
]);

async function ghFetch(endpoint, options = {}) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'PixiBun-Publisher',
    'X-GitHub-Api-Version': '2022-11-28',
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(`[${res.status}] ${JSON.stringify(data)}`);
  return data;
}

function getAllFiles(dir, fileList = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (IGNORED_DIRS.has(item)) continue;
    if (IGNORED_FILES.has(item)) continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else {
      if (item.endsWith('.tsbuildinfo') || item.endsWith('.log')) continue;
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function createBlob(filePath) {
  const content = fs.readFileSync(filePath);
  const base64 = content.toString('base64');
  const res = await ghFetch('/git/blobs', {
    method: 'POST',
    body: JSON.stringify({ content: base64, encoding: 'base64' }),
  });
  return res.sha;
}

async function main() {
  console.log('Fetching latest remote commit SHA...');
  const refData = await ghFetch(`/git/ref/heads/${BRANCH}`);
  const parentCommitSha = refData.object.sha;

  console.log('Scanning local files...');
  const files = getAllFiles(ROOT_DIR);
  const treeEntries = [];

  console.log(`Processing and uploading ${files.length} files...`);
  for (const file of files) {
    const relativePath = path.relative(ROOT_DIR, file).split(path.sep).join('/');
    const sha = await createBlob(file);
    treeEntries.push({
      path: relativePath,
      mode: '100644',
      type: 'blob',
      sha,
    });
  }

  console.log('Creating Git tree...');
  const tree = await ghFetch('/git/trees', {
    method: 'POST',
    body: JSON.stringify({ tree: treeEntries }),
  });

  console.log('Creating Git commit...');
  const commit = await ghFetch('/git/commits', {
    method: 'POST',
    body: JSON.stringify({
      message: 'chore: sync latest changes and trigger production redeploy',
      tree: tree.sha,
      parents: [parentCommitSha],
    }),
  });

  console.log('Updating main branch reference...');
  await ghFetch(`/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: true }),
  });

  console.log('Git push to GitHub completed successfully!');
  try { fs.unlinkSync('sync_github.mjs'); } catch {}
}

main().catch((err) => {
  console.error('Git push failed:', err);
  process.exit(1);
});
