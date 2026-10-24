# P0 hardening: video recording, runtime pin, CI and stale browser checks — 16 October 2026

Branch `testsprite-s4`, on top of `c4b2a924`. This record covers the first hardening batch from the 16 October codebase audit: the WebM/MP4 recording race, the Node runtime pin, CI workflow hardening and the browser checks that were red before TestSprite starts blocking pull requests. Main and production were still at `1a4b96b7`. Earlier records keep their own verdicts; the failures they describe stand for their revisions.

## Video recording (WebM and MP4)

The [studio surfaces record](2026-10-16-studio-surfaces.md) treated `exportBoundaries.spec.ts` "downloaded WEBM…" as an environment-dependent failure: the first export in a fresh headless browser produced a 110-byte WebM with no frames. It is a product defect in `src/lib/export/videoRecorder.ts`.

- **Cause.** A canvas capture track emits a frame only when the canvas is painted, and Chromium's recorder starts, and fires `start`, only once it receives a frame. The recorder painted one frame immediately after `start()`, before the recorder was attached, then held it without repainting. A single held frame therefore never reached the encoder, and the file held only a header. Instrumenting `MediaRecorder` showed `start` arriving only when `stop()` was called, followed by 110 bytes of data.
- **First attempt, failed.** Waiting for `start` before painting deadlocked, because `start` itself waits for a painted frame. The export timed out. This is retained here because it explains the final design.
- **Repair.** The first frame is painted before `start()`, and whatever frame is showing is repainted at the stream rate for the whole recording. Frame holds and progress are timed from the `start` event. A first VP9 recording in a fresh browser measured about 5 s of warm-up before `start`, so warm-up has its own 20 s bound (`RECORDER_START_TIMEOUT_MS`), and the recording deadline (total holds + 5 s) begins at `start`.
- **Refusing empty files.** `containsEncodedMedia` refuses a recording that holds only a container header: a WebM must contain a Cluster element and an MP4 a non-empty top-level `mdat` box. The user sees "Video recording produced no frames" instead of downloading an empty video. Other container types are not inspected.

The three `MediaRecorder` mocks (`tests/webmEncoder.test.ts`, `tests/mp4Encoder.test.ts`, `tests/animatedExportSafety.test.ts`) now fire `start` asynchronously like real recorders, and emit container bytes with media: a Cluster for WebM, and a correctly sized `ftyp` followed by an `mdat` box for MP4. The old MP4 fixture declared a 24-byte `ftyp` box in 12 bytes. No existing assertion was removed. New unit cases cover painting before start, repainting a held frame, hold timing from `start`, a slow warm-up, a recorder that never starts, a header-only recording and WebM/MP4 container inspection. Six of them failed against the original recorder.

## Header target size

Making `backupTrust.spec.ts` current exposed seven top-bar controls (Mirror H and V, Zoom out, zoom level, Zoom in, Fit and View) at 24 × 22 px. That is below the WCAG 2.2 minimum target size (2.5.8) the spec enforces. `.bar-cluster` buttons were fixed at 22 px inside a 28 px cluster with a 2 px border. They are now 24 px, filling the cluster's inner height without changing its size (`src/app/surfaces.css`). This is a measured target-size repair, not a conformance audit. Manual screen-reader and touch equivalence remain open in the [issue registry](../research/issue-registry.md).

## Runtime pin

`.nvmrc` moves from 22.14.0 to **22.23.3**, the runtime the 15 October gates recorded; CI reads the same file. `scripts/runQualityGate.mjs` now stops before its first stage when the running Node major differs from `.nvmrc`, and warns on a different minor or patch version. Previously a Node 26 machine ran the documentation, type, lint and unit stages for minutes before the performance stage refused the runtime. `package.json` engines are unchanged.

## CI workflows

- `ci.yml` declares `permissions: contents: read, actions: read`; it previously inherited the repository's default token scope.
- A newer push to the same pull request cancels that PR's running CI. Runs on `main` are never cancelled, because each completed run gates its own production deploy (`deploy.yml`).
- Every CI job has `timeout-minutes`: validate 45, browser e2e 120, browser diagnostics 60, evidence custody 20, Lighthouse 30 (rollback already had 20).
- Every `actions/*` step in `ci.yml`, `deploy.yml` and `preview.yml` is pinned to a commit SHA, commented with its tag: checkout v4.4.0, setup-node v4.4.0, upload-artifact v4.6.2, download-artifact v4.3.0, github-script v7.1.0.
- `.github/dependabot.yml` proposes weekly grouped GitHub Actions and npm minor/patch updates. Major `@types/node` updates are ignored while Node 22 is pinned. Nothing merges automatically.

`tests/deploymentTrust.test.ts` and `tests/previewDeployTrust.test.ts` pass unchanged (38 cases). The preview workflow still builds pull-request code with `VERCEL_TOKEN` in its environment for branches in this repository, as before; that is a remaining exposure for anyone who can push a branch.

## Browser checks brought up to date

**`tests/e2e/backupTrust.spec.ts` "project and drawing controls…"** failed on expectations that predate later intended changes. Each was checked against the current interface before it was changed:

| Expectation | Now | Why |
| --- | --- | --- |
| File menu without **Living postcard…** | Five items including it | Added in `422b47d4` |
| 20 header buttons | 15 visible, 4 quick brush presets (2xl only), 5 sizes in the closed brush menu: 24 in the DOM | Each group asserted separately |
| Tool rail contains `Pen:` / `Erase-color:` | The rail's first label equals the tool's canonical name, for all eleven tools | Labels come from `src/config/shortcuts.ts`; an exact match is stricter than the old substring |
| Mirror→Zoom and Fit→View gaps ≤ 5 px | ≤ 7 px | The 16 October top bar adds a 1 px cluster gap on each side of a separator |
| Co-Draw and Help buttons equal size, measured immediately | Measured after the Studio options panel finishes unfolding | It differed by 0.87 px mid-bloom; same pattern as `recoveryAccessibility.spec.ts` |

The target-size check stayed as written and is satisfied by the product repair above.

**`tests/production/workspaceConsistency.spec.ts` navigator case.** Pan is stored in whole screen pixels (`setPan`, `previewPan`), so at 6400 % the view can stop only on a 1/64-art-pixel grid. The test also aimed at fractional pointer positions, which Firefox delivers rounded to whole CSS pixels. On this branch Chromium landed at x 83.95 instead of 84 and Firefox at 83.62/41.78; the 14 October record saw y 55.02 instead of 56. The case now records where each engine actually delivered the pointer, requires that to be within 1 px of the request, and requires the view centre within half a pan step of it (about 0.05 overview px here). Keyboard steps move the stored pan by whole pixels and stay exact. The square-pixel check uses the canvas's layout size rather than its transformed bounding box, which an inspector spring can briefly scale (Chromium measured 2.00004 after a resize). It passed 12 of 12 repeated runs across Chromium, Firefox and WebKit.

**`tests/production/stableStudioGeometry.spec.ts` color dock** already passed on this branch: the 15 October fixture explicitly selects the flat Graphite desk. No change was needed.

## Verification

Run on Windows with Node **26.5.1** (not the pinned runtime; the performance stage was therefore not run) and production builds of this working tree:

- Type check and lint passed. Vitest: **2,629 passed / 250 files** after the recorder change, then 69 export cases across four files after the start-deadline split.
- `exportBoundaries.spec.ts` "downloaded WEBM…" alone in a fresh Chromium: **3 of 3 passed** with the repair; **2 of 2 failed** on the original recorder (the downloaded file could not be opened by Chromium's own decoder). GIF/WebM/MP4 downloads repeated three times: 9 of 9 passed.
- Development Chromium, `backupTrust`, `studioChrome`, `studioSurfaces`, `artistWorkspace`, `dynamicIsland` and `exportBoundaries`: 33 passed and the WebM case failed under the first, deadlocking recorder change; that case then passed as above.
- Production, three engines: see below.

**First production run.** Seven spec files (`workspaceConsistency`, `stableStudioGeometry`, `animatedExportIntegrity`, `artistWorkspace`, `brushGuideExportIntegrity`, `memoryPaths`, `transparencyChecker`) in Chromium, Firefox and WebKit: **62 passed / 10 failed** in 19.6 minutes, zero retries. None of the ten came from this batch's changes. They are kept as found:

| Failures | Cause | Disposition |
| --- | --- | --- |
| `brushGuideExportIntegrity` ×3 | "Composition guide" now exists in the inspector and in the View menu (16 October surfaces); the unscoped locator matched both | Scoped to the View menu the test has just opened |
| `artistWorkspace` radial gradient ×3 | Toggle rows hid their checkbox as a 1 px `sr-only` input under the label text, so a direct click on the checkbox was intercepted | Product fix in the [P1 record](2026-10-17-p1-hardening.md#toggle-rows); the original `uncheck()` lines are unchanged |
| `animatedExportIntegrity` GIF and MP4, WebKit | The app-update banner covered "+ Frame" in a fresh browser | Product fix in the [P1 record](2026-10-17-p1-hardening.md#first-visit-update-banner-in-webkit) |
| `stableStudioGeometry` Atelier, WebKit | The pose button was measured mid-press (32.03 instead of 32 px); every press springs the control's scale since 16 October | Measured once the press animation finishes |
| `animatedExportIntegrity` MP4, Firefox | WebCodecs reports H.264 support and then fails; Firefox's MediaRecorder offers no MP4. The same with the old and the new recorder, checked directly against Firefox's MediaRecorder | Remained open in this record. Update, 17 October: MP4 support is now probed with a real one-frame encode, so such an engine is refused explicitly ([final integration](2026-10-17-final-integration.md#fixes)) |

Re-runs after these repairs are recorded in the [P1 record](2026-10-17-p1-hardening.md#verification).

Not run: the six-stage gate on Node 22 (including the performance budget), the complete development and production suites, physical devices and Safari. The handbook screenshots are unchanged.
