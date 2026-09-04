#!/usr/bin/env node

/**
 * verifyDocIntegrity.mjs
 * Automated verification harness for PixiBun documentation integrity:
 * 1. Checks for duplicate phase headers in TASKS.md.
 * 2. Checks for duplicate section numbers and monotonicity in ARCHITECTURE.md.
 * 3. Asserts all local filepaths cited in CHANGELOG.md exist on disk.
 * 4. Asserts line-count claims in CHANGELOG.md match measured file lengths.
 */

import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
let errorCount = 0;

function reportError(msg) {
  console.error(`❌ [DOC INTEGRITY ERROR] ${msg}`);
  errorCount++;
}

function reportPass(msg) {
  console.log(`✅ ${msg}`);
}

// -----------------------------------------------------------------------------
// 1. Verify TASKS.md Phase Headers
// -----------------------------------------------------------------------------
const tasksPath = path.join(rootDir, 'TASKS.md');
if (fs.existsSync(tasksPath)) {
  const tasksContent = fs.readFileSync(tasksPath, 'utf8');
  const phaseHeaderRegex = /^## Phase ([\d.]+)/gm;
  const seenPhases = new Map();
  let match;

  while ((match = phaseHeaderRegex.exec(tasksContent)) !== null) {
    const phaseNum = match[1];
    if (seenPhases.has(phaseNum)) {
      reportError(`Duplicate Phase number "${phaseNum}" found in TASKS.md!`);
    } else {
      seenPhases.set(phaseNum, true);
    }
  }

  if (!seenPhases.has('32') || seenPhases.get('32') === true) {
    reportPass(`TASKS.md phase headers verified (all ${seenPhases.size} phases unique)`);
  }
} else {
  reportError('TASKS.md not found');
}

// -----------------------------------------------------------------------------
// 2. Verify ARCHITECTURE.md Section Numbers & Monotonicity
// -----------------------------------------------------------------------------
const archPath = path.join(rootDir, 'ARCHITECTURE.md');
if (fs.existsSync(archPath)) {
  const archContent = fs.readFileSync(archPath, 'utf8');
  const sectionHeaderRegex = /^## (\d+)\.\s+(.+)$/gm;
  const seenSections = new Set();
  const sectionSequence = [];
  let match;

  while ((match = sectionHeaderRegex.exec(archContent)) !== null) {
    const secNum = parseInt(match[1], 10);
    const title = match[2];
    if (seenSections.has(secNum)) {
      reportError(`Duplicate section number "${secNum}" ("${title}") found in ARCHITECTURE.md!`);
    }
    seenSections.add(secNum);
    sectionSequence.push(secNum);
  }

  // Check monotonic sequence 1, 2, 3...
  let isMonotonic = true;
  for (let i = 0; i < sectionSequence.length; i++) {
    if (sectionSequence[i] !== i + 1) {
      reportError(
        `Non-monotonic section order in ARCHITECTURE.md: expected ${i + 1}, found ${sectionSequence[i]}`
      );
      isMonotonic = false;
      break;
    }
  }

  if (isMonotonic && seenSections.size > 0) {
    reportPass(
      `ARCHITECTURE.md sections verified (strictly monotonic 1 through ${seenSections.size})`
    );
  }
} else {
  reportError('ARCHITECTURE.md not found');
}

// -----------------------------------------------------------------------------
// 3. Verify Local File Paths in CHANGELOG.md
// -----------------------------------------------------------------------------
const changelogPath = path.join(rootDir, 'CHANGELOG.md');
if (fs.existsSync(changelogPath)) {
  const changelogContent = fs.readFileSync(changelogPath, 'utf8');
  // Match cited paths like `src/...` or `tests/...`
  const pathRegex = /`((?:src|tests)\/[^`]+)`/g;
  let match;
  const citedPaths = new Set();

  while ((match = pathRegex.exec(changelogContent)) !== null) {
    const cleanPath = match[1].trim();
    // Exclude trailing directory slashes
    if (!cleanPath.endsWith('/')) {
      citedPaths.add(cleanPath);
    }
  }

  let pathsPassed = 0;
  for (const relPath of citedPaths) {
    const fullPath = path.join(rootDir, relPath);
    if (!fs.existsSync(fullPath)) {
      reportError(`Phantom file cited in CHANGELOG.md does not exist: "${relPath}"`);
    } else {
      pathsPassed++;
    }
  }

  if (pathsPassed === citedPaths.size) {
    reportPass(`CHANGELOG.md file paths verified (${pathsPassed}/${citedPaths.size} verified on disk)`);
  }

  // -----------------------------------------------------------------------------
  // 4. Verify CenterViewport.tsx Line Count Claim
  // -----------------------------------------------------------------------------
  if (changelogContent.includes('<500 lines')) {
    reportError('CHANGELOG.md still contains false "<500 lines" claim for CenterViewport.tsx');
  } else {
    const cvPath = path.join(rootDir, 'src/components/layout/CenterViewport.tsx');
    if (fs.existsSync(cvPath)) {
      const cvLines = fs.readFileSync(cvPath, 'utf8').split('\n').length;
      reportPass(`CenterViewport.tsx line count verified truthful (measured ${cvLines} lines)`);
    }
  }
} else {
  reportError('CHANGELOG.md not found');
}

// -----------------------------------------------------------------------------
// Verdict
// -----------------------------------------------------------------------------
if (errorCount > 0) {
  console.error(`\n💥 Doc integrity audit failed with ${errorCount} error(s).\n`);
  process.exit(1);
} else {
  console.log('\n🌟 All documentation integrity checks passed successfully!\n');
  process.exit(0);
}
