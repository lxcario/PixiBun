# PIXIBUN — Deep Code & Documentation Audit Results

Date (UTC): 2026-09-12. Auditor: External Senior Code Auditor. Methodology: Live state on disk, direct source inspection + command execution + primary external citations. Statements without evidentiary verification tags do not represent findings in this report.

## 1. Summary — Numbers Only

- Scanned repository (excluding node_modules, .git, .next): 421 files. [EXECUTION] `node audit-inv.cjs` output: `TOTAL_FILES_EXCL_DEPS=421`.
- Source code files under `src/`: 195 `.ts/.tsx/.css` files (200 including 4 `.woff2` fonts and 1 `.svg`). Total lines: 50,243. [EXECUTION] `node audit2.cjs`: `SRC_CODE_FILES=195 TOTAL_LINES=50243`.
- Top 5 largest source files: `src/lib/art/playgroundLessons.ts` 1617, `src/components/landing/AtelierDeskScene.tsx` 1449, `src/lib/ai/math/photometricLighting.ts` 1232, `src/components/layout/StudioLayout.tsx` 910, `src/lib/audio/lofiRadio.ts` 884. [EXECUTION]
- Vitest unit/integration: 80 suites, 558 tests; all passed. [EXECUTION] `npm test` final line: `Test Files 80 passed (80)`, `Tests 558 passed (558)`, duration 6.34s.
- Playwright E2E: 8 spec files, 20 tests counting `test(` calls (1+2+1+1+4+1+9+1). [CODE-INSPECTION] E2E was not run in this session.
- Primary `.md` inventory (project root + `docs/` + `.agents/`, excluding `node_modules` and `testsprite_tests/tmp` copies): 18 files. [EXECUTION] Counted by filesystem walk. Follows names in sections 3-4. 3 copies under `testsprite_tests/tmp/prd_files/` + `raw_report.md` are archived copies, noted separately.
- `node scripts/verifyDocIntegrity.mjs`: 6 of 6 checks passed. [EXECUTION] Output: TASKS 45 phases unique; ARCHITECTURE 1-23 monotonic; CHANGELOG 170/170 paths on disk; CenterViewport 759 lines; README metrics matched live test runners (80 suites/558 tests and 8 suites/20 E2E); package.json–CHANGELOG version match 1.12.1.
- `npm run typecheck` (`tsc --noEmit`): 0 errors. [EXECUTION]
- `npm run lint` (`eslint src tests`): 0 errors, 0 warnings. [EXECUTION]
- `npm run build` (Next 16.3.4 Turbopack): Succeeded. [EXECUTION] Routes: `/`, `/_not-found`, `/api/diagnostics/relay`, `/icon.svg`, `/playground`, `/studio`, `/sw.js` + Proxy.
- Finding count (assigned in this report): Critical 1, High 4, Medium 7, Low 5, Cosmetic 2. Unverified/suspect: 3 items.

## 2. Critical and High Priority Bugs

### C-1. `getIsometric2p1Line` Misses Endpoints — Critical [CODE-INSPECTION]

- File:line: `src/lib/ai/math/curvesAndLines.ts:51-107`.
- Code: `numSteps = Math.max(1, Math.round(Math.abs(dx) / 2))`, then `curX1 = x0 + k*2*sx`, `curY = y0 + k*sy`. The function does not use `dy` (except for `sy` sign).
- Trigger: `getIsometric2p1Line(0, 0, 10, 2)` produces `numSteps=5` and terminates near `(10,5)`; the requested `(10,2)` is not produced. `getIsometric2p1Line(0, 0, 3, 10)` stops near `(4,2)`. This is not a general line segment rasterizer, but a fixed 2:1 pattern generator independent of `dy`.
- Test gap: `tests/curvesAndLines.test.ts:60-99` tests only `(0,0)->(10,5)`, zero-length, pure vertical, and pure horizontal cases. No random endpoint test exists.
- Doc impact: `README.md:34`, `MAIN.md:11`, `ARCHITECTURE.md:37` describe this function as a general isometric line tool.

### H-1. Export Scale State Shared Across Tabs — High [CODE-INSPECTION]

- File:line: `src/components/modals/ExportModal.tsx:58` (single `scale` state), `:103-111` (only `Math.min` clamping), usages `:640-720` (all tabs receive the same pair).
- Trigger: Selecting 32x in PNG tab and switching to GIF tab clamps via `Math.min(prev, 8)`. Returning to PNG leaves the scale at 8x.
- Contradiction: `TASKS.md:14` ("Isolated and clamped scale ... does not bleed") and `ARCHITECTURE.md:490` ("per-tab export scale states are fully isolated") contradict the code.
- Secondary: `TASKS.md:10` scale ceilings are partially correct (GIF `[1,2,4,8]`, spritesheet `[1,2,4]`, APNG/WebM/MP4 `[1,2,4,8,16]`, PNG `[1,2,4,8,16,32]`), but palette-cycle is capped at `[1,2,4,8]` (`ShaderExportTab.tsx:76`). 4096px/16.7MP UI guard is only in PNG tab; only the PNG execution path aborts (`ExportModal.tsx:118-130`).

### H-2. `scale2x` Boundary Pixels Treat Out-of-Bounds as Transparent Neighbors — High [CODE-INSPECTION]

- File:line: `src/lib/canvas/rotSprite.ts:49-52` (`getPx` out-of-bounds `0`) + `:29` (`a1<16 && a2<16` gives distance 0).
- Impact: Rules may trigger incorrectly on opaque boundary pixels. RotSprite tests do not include opaque edge regression coverage.

### H-3. Unexplained Magic `rateRaw !== 36` in `parseCRNG` — High [CODE-INSPECTION]

- File:line: `src/lib/color/paletteCycling.ts:45`, `:48-49`, `:56`.
- Rationale is missing from code, tests, and documentation. `serializeCRNG` (`:66-86`) lacks this exclusion. Rounding makes parse→serialize cycles lossy.

### H-4. Archived Copies Contradict Up-to-Date Documents — High [CODE-INSPECTION]

- `testsprite_tests/tmp/prd_files/ARCHITECTURE.md:447` mentions "Farey Rational Retuning"; active `ARCHITECTURE.md:460` states "Harmonic Rational Retuning". "Farey" does not exist in code.
- `testsprite_tests/tmp/prd_files/PIXIBUN_DEEP_DIVE.md:122` states "Rational Bezier Curves"; active docs state "Quadratic Bézier".
- `testsprite_tests/tmp/prd_files/README.md:34` states "Wu's 2:1 Iso Lines" and "Rational Bézier Splines"; active README does not contain them.
- `scripts/verifyDocIntegrity.mjs:1-10` executes only 6 checks; archives are excluded.



## 3. Documentation Inaccuracies / Errors — File-by-File

1. `README.md:44` — "sprite model switching (Ghost, Shroom, Bun, Lantern)" [CODE-INSPECTION] Inaccurate. `PhotometricShowcase.tsx:23` only uses `STARTER_TEMPLATES`; this selector does not exist. `RotSpriteShowcase.tsx:10` (`sword|ghost|bun`) is a different showcase.
2. `README.md:44` — "material profiles (Matte, Gold, Glass, Fabric)" [CODE-INSPECTION] Incomplete. Code contains 5 profiles (`photometricLighting.ts:50-91`: matte, metal, gold, glass, fabric); UI displays all 5 (`PhotometricLightingSection.tsx:23-55`).
3. `README.md:45` — "standard blurry bicubic filtering" [CODE-INSPECTION] Inaccurate. `RotSpriteShowcase.tsx:48-60` comparison branch uses `imageSmoothingEnabled=false` + canvas rotate.
4. `README.md:60-71` — tool list [CODE-INSPECTION] Partially inaccurate: "Blue-Noise Dither" is not a standalone tool, but a brush matrix option (`types/tools.ts:19`). "Normal Chisel (K) & Rivet (Shift+K)" is stated; `PIXIBUN_DEEP_DIVE.md:419-420` states the inverse (N/rivet, K/chisel).
5. `README.md:85` + `ARCHITECTURE.md:59-70` — canvas count [CODE-INSPECTION] Inconsistent. `CenterViewport.tsx:644-696` contains 6 `<canvas>` elements; ARCH counts 7 layer tags by including the L0 background.
6. `README.md:240` — "minimum target hit sizes (>=24px)" [UNVERIFIED] General 24px check not found in codebase.
7. `README.md:250` — "React Compiler memoization" [UNVERIFIED] No evidence in `next.config.ts`, `package.json`, or source.
8. `ARCHITECTURE.md:33` — "50-Step History Ring" [CODE-INSPECTION] Misleading. `historyEngine.ts:24` is only for undo; redo also retains 50 (`:39-61`). Total capacity is 100.
9. `ARCHITECTURE.md:453`, `PIXIBUN_DEEP_DIVE.md:331` — "16384=60Hz / Full parsing" [CODE-INSPECTION] Consistent with code, but unverified against primary Amiga hardware spec [UNVERIFIED]; "Full" is overstated due to Y-3.
10. `MAIN.md:15` — "frontal face cushion plateau (Nz>=0.85)" [CODE-INSPECTION] `0.85` does not exist in code; actual lower bounds found are `0.88` and `0.78`.
11. `MAIN.md:21` — "32x for sprites up to 128x128" [CODE-INSPECTION] True only for square canvases. On rectangular canvases, even 16x triggers the single-axis cap (`exportCanvasScaleBounds.test.ts:59-73`).
12. `BENCHMARKS.md:26,79,107` — "comfortably holds / completely preventing / guaranteeing" [CODE-INSPECTION] Overstated; CI only checks upper bound.
13. `CHANGELOG.md:15`, `TASKS.md:16`, `LOGS.md:1424` — "Corrected ... across all files" [CODE-INSPECTION] Inaccurate. `src/lib/ai/smartMathEngine.ts:18` still mentions "Rational Bézier Curves".
14. `docs/plans/implementation_plan.md:91` — `public/sw.js` description [CODE-INSPECTION] Outdated. Actual SW is generated via `src/app/sw.js/route.ts`.
15. `SECURITY.md` — relay protections (12/min, 64KB, 100-event, HTTPS; `route.ts:7-14,44-59`) omitted [CODE-INSPECTION]. Missing documentation.
16. `.env.example:5-6` — `ghp_` prefixed examples [CODE-INSPECTION]. Low risk.
17. `FullStackGuide.md:42-46` — unused stack entries [CODE-INSPECTION]. Generic protocol document.

## 4. Undocumented Code Behaviors

1. Shared `scale` state is not documented as a cross-tab constraint. [CODE-INSPECTION]
2. `MAX_SAFE_*` UI safeguard existing only on the PNG export tab is undocumented. [CODE-INSPECTION]
3. `parseCRNG` 36-exclusion and speed rounding are undocumented. [CODE-INSPECTION]
4. Redo capacity (50) is undocumented. [CODE-INSPECTION]
5. `WallpaperGroup` only accepts 6 values (`types/tools.ts:90`); "17 groups" text does not mention that only 5 sub-groups are modeled. [CODE-INSPECTION]
6. `CrdtPixelBuffer.merge` throws on dimension mismatch (`crdtPixelBuffer.ts:381-384`). [CODE-INSPECTION]
7. `getOpsSince` silently returns incomplete results after pruning (`crdtPixelBuffer.ts:353-366`). [CODE-INSPECTION]
8. `diffImageDataToOps` returns empty array on dimension change (`strokeDiff.ts:27-32`). [CODE-INSPECTION]
9. Guest structural edits being overwritten is documented only in code comments (`coDrawBridge.ts:13-16`). [CODE-INSPECTION]
10. MP4/WebM `loopCount` default is 2 (`mp4Encoder.ts:78`, `webmEncoder.ts:37`); not documented. [CODE-INSPECTION]
11. H.264 even-dimension padding exists only in the MP4 path (`mp4Encoder.ts:81-82`); absent in WebM. [CODE-INSPECTION]

## 5. Algorithm / Citation Verification Table

| Technique | Code / Doc Claim | Real Source | Verdict |
|---|---|---|---|
| Scale2x/EPX (Johnston 1992) | `rotSprite.ts:6`, showcase "Johnston 1992" | https://en.wikipedia.org/wiki/Pixel-art_scaling_algorithms | [WEB-VERIFIED] Name/year match; out-of-bounds `0` choice is not part of canonical spec (Y-2). |
| RotSprite (Xenowhirl 2007) | 3-pass 8x + inverse mapping + majority voting | RotSprite section on same page | [WEB-VERIFIED] Architecture matches; "distortion-free" claim is hyperbolic. |
| Felzenszwalb-Huttenlocher EDT | "O(W*H) exact 2D", "2012 Theory of Computing; Cornell TR 2004" (`edtNormalMap.ts:5-7`) | https://en.wikipedia.org/wiki/Distance_transform | [WEB-VERIFIED] Year/journal match. |
| Kopf-Lischinski (SIGGRAPH 2011, TOG 30(4):99) | `depixelizeVector.ts:4-7` citation | Wikipedia Depixelization 404; ACM record unavailable | [UNVERIFIED] Not fabricated, but unconfirmed against primary source. Implementation is a simplified heuristic. |
| OKLab/OKLCH (Ottosson 2020) | `colorSpace.ts:4` | https://en.wikipedia.org/wiki/Oklab_color_space | [WEB-VERIFIED] Year/author match; coefficients not bit-by-bit checked. |
| Bayer (1973, IEEE ICC) | `dithering.ts:5-6`, matrices `ditherMatrix.ts:14-35` | https://en.wikipedia.org/wiki/Ordered_dithering | [WEB-VERIFIED] Year/venue/matrix match. |
| Ulichney void-and-cluster (1993) | `ditherMatrix.ts:5-6` | Ulichney citation on same page | [WEB-VERIFIED] Year/author match; full loop unverified. |
| Atkinson (1984) / Riemersma (1998) / Zhang-Suen (1984) | Respective file headers | Primary source unavailable | [UNVERIFIED] Code resembles algorithm; bibliographic details unconfirmed. |
| WFC (Gumin 2016) + Merrell (2007/2008/2009) | `waveFunctionCollapse.ts:5-6` | https://en.wikipedia.org/wiki/Wave_function_collapse_(algorithm) | [WEB-VERIFIED] Year/author match. Guarantee holds only on successful return (`:444-452`). |
| Color-cycling (Ferrari; CRNG/CCRT) | `paletteCycling.ts:3-9`, `16384=60Hz` | https://en.wikipedia.org/wiki/Color_cycling | [WEB-VERIFIED] Ferrari matches; CRNG/CCRT layout unconfirmed. |
| CRDT (Shapiro et al. SSS 2011) | `crdtPixelBuffer.ts:6-19` | https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type | [WEB-VERIFIED] Year/author match. HLC citation unverified. SEC applies only to pixel-state. |
| Token-bucket (Tanenbaum; RFC 2697) | `tokenBucket.ts:3-6` | Unavailable | [UNVERIFIED] Standard algorithm, tests green; citation unverified. |
| Other lighting physics & copyright citations | Respective headers | Not individually opened | [UNVERIFIED] Not fabricated; unverified. "Physically accurate" is hyperbolic. |

## 6. Test / Build Health Status — Actual Command Outputs

- `node scripts/verifyDocIntegrity.mjs` [EXECUTION]: 45 unique phases; 1-23 monotonic; 170/170 paths; CenterViewport 759 lines; 80 suites/558 tests + 8 suites/20 E2E; version 1.12.1. 6/6 passed.
- `npm run typecheck` [EXECUTION]: zero errors.
- `npm run lint` [EXECUTION]: zero errors / zero warnings.
- `npm test` [EXECUTION]: `Test Files 80 passed (80)`, `Tests 558 passed (558)`, `Duration 6.34s`.
- `npm run build` [EXECUTION]: `Compiled successfully in 763ms`, TypeScript 1829ms, static 8/8.
- E2E not executed; "E2E passed" verdict cannot be rendered.
- Test meaningfulness [CODE-INSPECTION]: benchmarks check real budgets; RotSprite tests 0 new colors; p2p/token/export are targeted. K-1 gap and cvdLens circularity risks remain.

## 7. Unverified / Suspicious Findings

1. E2E / Lighthouse all-green status [UNVERIFIED] — not executed in automated pipeline.
2. Real-world sub-16ms drawing in field [UNVERIFIED] — not profiled in deployment.
3. Citations marked in table [UNVERIFIED] — not fabricated, unconfirmed.

## 8. Recommended Remediations — Ordered by Priority

1. Critical — `getIsometric2p1Line` fix or contract narrowing (`curvesAndLines.ts:51-107`).
2. High — Export `scale` isolation or documentation fix (`ExportModal.tsx:58,103-111,640-720`); cap indicator for other tabs.
3. High — `scale2x` boundary condition (`rotSprite.ts:49-52`); opaque edge test.
4. High — `parseCRNG` magic numbers (`paletteCycling.ts:45,56`); cycle testing.
5. High — Delete or add to audit check the archived copies (`testsprite_tests/tmp/prd_files/`).
6. Medium — "Rational Bézier" remnant (`smartMathEngine.ts:18`).
7. Medium — README showcase descriptions (models, 5 materials, bicubic, canvas count).
8. Medium — Shortcut contradiction (`README.md:69` vs `PIXIBUN_DEEP_DIVE.md:419-420`).
9. Medium — `MAIN.md:15` figure (0.85 → 0.88/0.78 or remove).
10. Medium — `MAIN.md:21` rectangular warning.
11. Medium — WFC guarantee phrasing (`waveFunctionCollapse.ts:12`).
12. Medium — Depixelize header (`depixelizeVector.ts:1-12`).
13. Low — APNG "W3C" phrasing (`apngEncoder.ts:4-6`).
14. Low — `.env.example` examples.
15. Low — `SECURITY.md` relay protections.
16. Low — `BENCHMARKS.md` hyperbolic statements.
17. Low — `LOGS.md` historical record note.
18. Cosmetic — SW route path (`implementation_plan.md:91`).
19. Cosmetic — E2E counting method note.
