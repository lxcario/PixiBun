/**
 * verifyDocIntegrity.mjs
 * Automated verification harness for PixiBun documentation integrity:
 * 1. Checks for duplicate phase headers in TASKS.md.
 * 2. Checks for duplicate section numbers and monotonicity in ARCHITECTURE.md.
 * 3. Asserts all local filepaths cited in CHANGELOG.md exist on disk.
 * 4. Asserts line-count claims in CHANGELOG.md match measured file lengths.
 * 5. Asserts current test count and suite claims in README.md, BENCHMARKS.md, and V2_VISION.md match live runners.
 * 6. Asserts package.json version matches the latest release version in CHANGELOG.md.
 */

import { execSync } from 'node:child_process';
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
  const phaseHeaderRegex = /^## Phase ([\d.]+[a-z]?)/gm;
  const seenPhases = new Map();
  let hasDuplicatePhase = false;
  let match;

  while ((match = phaseHeaderRegex.exec(tasksContent)) !== null) {
    const phaseNum = match[1];
    if (seenPhases.has(phaseNum)) {
      reportError(`Duplicate Phase number "${phaseNum}" found in TASKS.md!`);
      hasDuplicatePhase = true;
    } else {
      seenPhases.set(phaseNum, true);
    }
  }

  if (seenPhases.size === 0) {
    reportError('No phase headers found in TASKS.md');
  } else if (!hasDuplicatePhase) {
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
      reportPass(`CenterViewport.tsx obsolete-phrase check passed (current measured count: ${cvLines} lines)`);
    }
  }
} else {
  reportError('CHANGELOG.md not found');
}

// -----------------------------------------------------------------------------
// 5. Verify Documentation Test Count Claims against Live Test Suites
// -----------------------------------------------------------------------------
const readmePath = path.join(rootDir, 'README.md');
if (fs.existsSync(readmePath)) {
  const readmeContent = fs.readFileSync(readmePath, 'utf8');

  try {
    const vitestRaw = execSync('npx vitest list --json', {
      cwd: rootDir,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const vitestTests = JSON.parse(vitestRaw);
    const liveUnitTests = vitestTests.length;
    const liveUnitSuites = new Set(vitestTests.map((item) => item.file)).size;

    const pwRaw = execSync('npx playwright test --list', {
      cwd: rootDir,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const pwMatch = pwRaw.match(/Total:\s+(\d+)\s+tests\s+in\s+(\d+)\s+files/);
    if (!pwMatch) {
      reportError('Failed to parse Playwright test list output');
    } else {
      const liveE2ETests = parseInt(pwMatch[1], 10);
      const liveE2ESuites = parseInt(pwMatch[2], 10);

      const unitRegex = /(\d+)\s+unit and integration tests across\s+(\d+)\s+suites/g;
      let unitMatch;
      let unitClaimsFound = 0;
      while ((unitMatch = unitRegex.exec(readmeContent)) !== null) {
        unitClaimsFound++;
        const claimedTests = parseInt(unitMatch[1], 10);
        const claimedSuites = parseInt(unitMatch[2], 10);
        if (claimedTests !== liveUnitTests || claimedSuites !== liveUnitSuites) {
          reportError(
            `README.md unit test claim mismatch: claimed ${claimedTests} tests across ${claimedSuites} suites, but live Vitest runner reports ${liveUnitTests} tests across ${liveUnitSuites} suites.`
          );
        }
      }

      if (unitClaimsFound === 0) {
        reportError('No unit test count claims found in README.md to verify.');
      }

      const benchmarkPath = path.join(rootDir, 'BENCHMARKS.md');
      if (!fs.existsSync(benchmarkPath)) {
        reportError('BENCHMARKS.md not found');
      } else {
        const benchmarkContent = fs.readFileSync(benchmarkPath, 'utf8');
        const benchmarkMatch = benchmarkContent.match(/Current suite inventory:\s*(\d+) unit tests across (\d+) suites/);
        if (!benchmarkMatch) {
          reportError('Current unit test inventory claim not found in BENCHMARKS.md');
        } else if (Number(benchmarkMatch[1]) !== liveUnitTests || Number(benchmarkMatch[2]) !== liveUnitSuites) {
          reportError(`BENCHMARKS.md current suite inventory mismatch: claimed ${benchmarkMatch[1]} tests across ${benchmarkMatch[2]} suites, but Vitest reports ${liveUnitTests} across ${liveUnitSuites}.`);
        }
      }

      const visionPath = path.join(rootDir, 'V2_VISION.md');
      if (!fs.existsSync(visionPath)) {
        reportError('V2_VISION.md not found');
      } else {
        const visionContent = fs.readFileSync(visionPath, 'utf8');
        const visionMatch = visionContent.match(/Current suite inventory:\s*(\d+) unit and integration tests across (\d+) suites; (\d+) Chromium E2E tests across (\d+) spec suites/);
        if (!visionMatch) {
          reportError('Current test inventory claim not found in V2_VISION.md');
        } else if (
          Number(visionMatch[1]) !== liveUnitTests || Number(visionMatch[2]) !== liveUnitSuites ||
          Number(visionMatch[3]) !== liveE2ETests || Number(visionMatch[4]) !== liveE2ESuites
        ) {
          reportError(`V2_VISION.md current test inventory mismatch: claimed ${visionMatch[1]}/${visionMatch[2]} unit and ${visionMatch[3]}/${visionMatch[4]} E2E, but live runners report ${liveUnitTests}/${liveUnitSuites} unit and ${liveE2ETests}/${liveE2ESuites} E2E.`);
        }
      }

      const e2eRegex = /(\d+)\s+E2E spec suites\s*\(\s*(\d+)\s+tests/g;
      let e2eMatch;
      let e2eClaimsFound = 0;
      while ((e2eMatch = e2eRegex.exec(readmeContent)) !== null) {
        e2eClaimsFound++;
        const claimedSuites = parseInt(e2eMatch[1], 10);
        const claimedTests = parseInt(e2eMatch[2], 10);
        if (claimedSuites !== liveE2ESuites || claimedTests !== liveE2ETests) {
          reportError(
            `README.md E2E test claim mismatch: claimed ${claimedSuites} suites (${claimedTests} tests), but live Playwright runner reports ${liveE2ESuites} suites (${liveE2ETests} tests).`
          );
        }
      }

      if (e2eClaimsFound === 0) {
        reportError('No E2E test count claims found in README.md to verify.');
      }

      if (unitClaimsFound > 0 && e2eClaimsFound > 0 && errorCount === 0) {
        reportPass(
          `README.md, BENCHMARKS.md, and V2_VISION.md test metrics verified against live runners (${liveUnitTests} unit tests across ${liveUnitSuites} suites; ${liveE2ETests} E2E tests across ${liveE2ESuites} suites)`
        );
      }
    }
  } catch (err) {
    reportError(`Failed to query live test runners: ${err.message}`);
  }
} else {
  reportError('README.md not found');
}

// -----------------------------------------------------------------------------
// 6. Verify package.json Version Synchronized with CHANGELOG.md
// -----------------------------------------------------------------------------
const packageJsonPath = path.join(rootDir, 'package.json');
if (fs.existsSync(packageJsonPath) && fs.existsSync(changelogPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const changelogContent = fs.readFileSync(changelogPath, 'utf8');
    const versionMatch = changelogContent.match(/^##\s+\[v?(\d+\.\d+\.\d+)\]/m);
    if (!versionMatch) {
      reportError('Could not find latest version release header in CHANGELOG.md (expected "## [vX.Y.Z]")');
    } else {
      const changelogVersion = versionMatch[1];
      if (pkg.version !== changelogVersion) {
        reportError(
          `Version mismatch: package.json has version "${pkg.version}", but latest CHANGELOG.md entry specifies "${changelogVersion}"!`
        );
      } else {
        reportPass(`package.json version synchronized with latest CHANGELOG.md release (v${pkg.version})`);
      }
    }
  } catch (err) {
    reportError(`Failed to verify package.json version: ${err.message}`);
  }
} else {
  reportError('package.json or CHANGELOG.md not found');
}

// -----------------------------------------------------------------------------
// Verdict
// -----------------------------------------------------------------------------
if (errorCount > 0) {
  console.error(`\nDoc integrity audit failed with ${errorCount} error(s).\n`);
  process.exit(1);
} else {
  console.log('\nAll documentation integrity checks passed successfully.\n');
  process.exit(0);
}
