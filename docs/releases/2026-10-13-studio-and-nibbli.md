# Studio and Nibbli source publication — 13 October 2026

Historical release/source record. The [15 October reconciliation](2026-10-15-codebase-and-documentation.md) describes later code and documentation; the original tests, decisions and source/build labels below retain their dated scope.

This development change record covers all pending source changes reviewed against base commit `1275be5dae6133b8192d05b42fc982f46fa1403e`, including the existing Curve/UI work, Nibbli additions and the safety corrections made during publication review. PixiBun remains version 1.14.1. Source publication does not grant production release approval.

## Added workflows

Nibbli Tester uses actual PixiBun controls and independently verifies artwork, Undo/Redo, layers, four-frame animation, saved reload and exported files. Nibbli Artist accepts bounded conversation or deterministic mock plans: goal → plan → whole-plan validation → real UI execution → screenshots/native pixels → critique → correction. Hands edits existing artwork through Move, disjoint Copy/Paste, Flip H/V and exact clockwise 90°, 180° or 270° turns with explicit pivots. Each edit records why it was selected, what should change and what must remain protected.

The shared controller is provider-neutral. No model/provider ID or API key is hardcoded, and mock/conversation adapters make no paid provider calls. The surrounding conversation model is not a local offline service. Plans cannot run code or alter test expectations. The current boundary is ordinary opaque/transparent 32×32 artwork, qualified tools/geometry and empty destinations where required. Limits include three corrections, eight adapter calls, 160 session actions, 64 actions per plan, 2,048 gesture points, a ten-minute deadline and a zero-dollar default. Provider estimates are not a provider-side billing guarantee. Experience memory records attempts and candidate strategies; it does not train model weights or automatically approve reuse.

## Studio and artwork changes

Curve now has independent start/end/bend handles, live quadratic preview, Apply/Cancel controls and immediate Undo-based re-edit. The dedicated handler replaces the generic drag-only Curve path. Valid tool switches apply the current curve; frame/layer/project switches cancel a pending preview. Re-edit requires matching source ownership and the exact latest curve history entry. It also refuses to reopen when Undo is rejected. Dialogs, inputs and focused buttons retain their keyboard behavior, and Ctrl+Z cancels an uncommitted preview without undoing older artwork. Pointer movement outside the canvas clamps handles to the edge.

The Studio header, color flyout, layer/palette strips, pinned picker and tool-help cards are refined. Tutorial animations use an illustrative pixel heart and tool-specific shading/normal/lighting examples; these are explanatory demos, not scientific accuracy evidence. Large blurred canvas decorations are replaced by bounded outlines and a small gradient. Playing frame cards avoid animated transitions and decorative active shadows. The playback clock, holds, independent visible-order expectations and browser retry/time budgets are unchanged. Read-oriented canvas hints are added to lighting showcase/readback paths.

Floating pasted selections initialize real gizmo bounds, capture an Undo baseline before transforming and discard copied pixels on Cancel. Genuinely lifted source pixels retain their owned restoration path. PNG companion metadata downloads use separate hidden Blob contexts to avoid WebKit coalescing; the primary PNG remains in the main frame and companion contexts are cleaned up.

## Findings corrected during this review

The original Curve hook chose the currently active target at commit time, allowing a pending curve to follow a frame/layer switch. Re-edit could consume a newer Undo entry or reopen despite refused Undo. Keyboard Enter also took input from focused controls, and preview Ctrl+Z could fall through to older artwork Undo. New ownership/history/input guards fix those paths. Against the preserved original hook, the corrected ownership challenge retained 11 failures and one pass; the new implementation and existing curve interaction suite passed 27 focused tests. Initial test-fixture setup failures and original source remain local, separately from product findings. No existing assertion was weakened.

## Verification and remaining scope

<!-- PUBLICATION_VERIFICATION -->
The final frozen candidate passed on 13 October 2026 (local time). The primary checkout and the owned detached validation checkout had identical source inputs before and after the checks; compiled payloads also stayed unchanged.

| Check | Final result |
| --- | --- |
| Full quality gate | All six stages passed: documentation, strict types, lint, coverage/correctness, separate performance and production build. |
| Unit/correctness tests | 2,370 passed across 212 test files. |
| Lint | Passed without warnings. |
| Warmed RotSprite | 1.794520 ms p90, below the unchanged 10 ms limit; the separate nearest-neighbor/palette budgets passed. |
| Native Curve ownership | 21 passed: seven scenarios on Chromium, Firefox and WebKit 2×. |
| Existing native regressions | 42 passed: drawing/preview controls, Studio geometry, viewport lenses and floating/rotated selection ownership. |
| Browser totals | 63 passed, zero failures, skips or retries; one worker and the existing profiles/limits. |

The qualification receipt is `qualification-c98cf542-7f63-4342-a864-3ab954efe296`. Source-input SHA-256 is `324c655f8af42c85745353f8bd52b744ca0f934e02ad2f2218bf2ef84db7e371`; build ID is `nVR5Fs7Ku9SomRMJBy3ve`; compiled-payload SHA-256 is `d3291578ba593bdb24e298bce0ef6ab79b07ff4ff3e572e42a67e15f408ecbd5`. These identify the tested candidate, rather than a hosted release. Its 19 browser payload files were copied locally and hash-verified without deleting originals.

Earlier attempts remain separately labelled: `qualification-8f1e7f4a-c1b9-413b-a6bb-aba99128a202` is inconclusive because a source comment changed during its gate; browser checks did not run. `qualification-cb2695b5-c430-4dbe-969c-98ac6c3c6271` retains 51 passed /6 failed core cases plus six passed selection cases. Its two new test-fixture assumptions used an incomplete layer accessible name and a 1% opacity increment despite the control's 5% step. Correcting those fixtures retained the pixel/history assertions, timeouts and retry policy. Their failures, traces and screenshots remain local.

Earlier dated Nibbli Tester/Artist/Hands browser results retain their original source/build labels in [current status](../current-status.md). Those separate suites were not rerun for this publication; their results are not substituted for the 63 current checks. No new TestSprite cloud result is claimed.

The final documentation pass validated 1,237 local links/headings across 59 owned Markdown files and matched the generated inventories. The publishable source checkout measured 25.25 MiB against its unchanged 40 MiB budget. Original working files and both browser mirrors passed hash verification. The mandatory pre-push gate remains required when publishing the commit.
<!-- END_PUBLICATION_VERIFICATION -->

M3's intermittent WebKit scheduling/visible-pose stability remains open. Exact quarter-turn qualification does not establish arbitrary-angle artistic quality: the separate 37° fixture retained its palette but changed opaque pixels from 10 to 9 and four-neighbor components from 3 to 5. Larger canvases, cross-layer/general multi-frame Artist edits, scaling, free-angle Artist commands, OS-native save pickers, real model quality, physical-device latency and production hosting/update qualification remain separate work.

Curve re-edit uses Undo: Cancel ends that edit with the curve undone, and Redo restores the original committed curve. This behavior is tested and described in the [drawing guide](../guides/drawing-tools.md); it is not a transactional vector-object editor. Compact control/touch and manual screen-reader qualification remain open. Source publication does not rewrite earlier failures or approve the release.

Source inspection also found an open secondary-color Curve issue: a Shift gesture initially selects the secondary color, but entering adjustment refreshes the preview from the primary color. Re-edit can similarly refresh a recorded color from the current primary color. This review qualifies the primary-color workflow; it does not claim a native reproduction or fix for secondary/recorded-color retention.

## Complete file change map

| File | Addition or change |
| --- | --- |
| [.agents/skills/nibbli/SKILL.md](../../.agents/skills/nibbli/SKILL.md) | Provides the local agent entry point with independent oracles, bounded workflows and immutable failure evidence. |
| [.gitignore](../../.gitignore) | Keeps the browser debug log local; existing source, handbook assets and raw archive rules remain. |
| [AGENTS.md](../../AGENTS.md) | Adds the Nibbli skill/agent-contract entry point and requires independent expectations and retained failures. |
| [CHANGELOG.md](../../CHANGELOG.md) | Adds the English summary and links this complete development change record. |
| [docs/README.md](../../docs/README.md) | Indexes Nibbli operating guidance and this source change record. |
| [docs/archives.md](../../docs/archives.md) | Documents measured Nibbli archive growth, proposed 8/12 GiB review thresholds and verified retention without automatic deletion. |
| [docs/contracts/rendering.md](../../docs/contracts/rendering.md) | Describes the existing elapsed-time catch-up clock, 250 ms cap and unqualified visible-frame stability. |
| [docs/current-status.md](../../docs/current-status.md) | Retains dated candidate/build/failure labels and records current source publication and remaining qualification. |
| [docs/generated/test-inventory.json](../../docs/generated/test-inventory.json) | Updates discovery counts; inventory values do not claim execution. |
| [docs/guides/drawing-tools.md](../../docs/guides/drawing-tools.md) | Documents adjustable quadratic curves, context cancellation, guarded re-edit and Undo-based Cancel/Redo behavior. |
| [docs/guides/nibbli-agent.md](../../docs/guides/nibbli-agent.md) | Defines provider-neutral plan/critique envelopes, bounded commands, inbox identity, budgets and editing safety. |
| [docs/guides/nibbli.md](../../docs/guides/nibbli.md) | Explains scripted Tester journeys, real UI interactions, independent pixels/files and retained attempt memory. |
| [docs/guides/testing.md](../../docs/guides/testing.md) | Adds separate Tester, Artist and Hands commands, frozen-candidate rules and scoped qualification guidance. |
| [docs/plans/README.md](../../docs/plans/README.md) | Indexes the active Nibbli milestone plan. |
| [docs/plans/nibbli.md](../../docs/plans/nibbli.md) | Separates M3 stability, bounded M4 editing and future creative M5 motion planning. |
| [docs/releases/2026-10-13-studio-and-nibbli.md](../../docs/releases/2026-10-13-studio-and-nibbli.md) | Lists every source/document/test change, verification scope and current limitations for this publication. |
| [package.json](../../package.json) | Adds nibbli:test, nibbli:memory, nibbli:artist and nibbli:hands; no package version/dependency change. |
| [playwright.artist.config.ts](../../playwright.artist.config.ts) | Separates Artist fixtures/inboxes and recorded profiles with fixed deadlines and zero retries. |
| [playwright.hands.config.ts](../../playwright.hands.config.ts) | Reuses the Artist profiles for the separate Hands fixture directory. |
| [playwright.nibbli.config.ts](../../playwright.nibbli.config.ts) | Separates recorded three-engine Tester journeys, fresh server/port, one worker and zero retries. |
| [scripts/nibbli/artist/adapters.ts](../../scripts/nibbli/artist/adapters.ts) | Provides deterministic fixtures and local request/reply inboxes behind a provider-neutral adapter interface. |
| [scripts/nibbli/artist/hands.ts](../../scripts/nibbli/artist/hands.ts) | Preflights existing-art edits and independently predicts Move/Copy/Flip/exact quarter-turn RGBA, metadata and protected content. |
| [scripts/nibbli/artist/handsLoop.ts](../../scripts/nibbli/artist/handsLoop.ts) | Orchestrates observation-bound edit plans, reasons/expected changes, budget reservations and separate critiques. |
| [scripts/nibbli/artist/loop.ts](../../scripts/nibbli/artist/loop.ts) | Implements goal/plan/validate/execute/observe/critique/correct with at most three corrections and independent file/pixel checks. |
| [scripts/nibbli/artist/protocol.ts](../../scripts/nibbli/artist/protocol.ts) | Defines strict drawing/critique schemas, independent semantics and action/point/token/cost/deadline budgets. |
| [scripts/nibbli/artistOptions.mjs](../../scripts/nibbli/artistOptions.mjs) | Validates journey/browser arguments and preserves the single-Chromium conversation default. |
| [scripts/nibbli/controller.ts](../../scripts/nibbli/controller.ts) | Controls real UI tools, coordinates, layers, timeline, save/export and bounded selections/transforms; no raster/state injection. |
| [scripts/nibbli/experience.mjs](../../scripts/nibbli/experience.mjs) | Reads Tester/Artist/Hands histories, including failures and incomplete journals, without training or rewriting outcomes. |
| [scripts/nibbli/fingerprints.mjs](../../scripts/nibbli/fingerprints.mjs) | Hashes source/test/config inputs and compiled server/static payloads before and after qualification. |
| [scripts/nibbli/geometry.ts](../../scripts/nibbli/geometry.ts) | Maps validated integer pixels to measured client-space centers and refuses unavailable/out-of-bounds geometry. |
| [scripts/nibbli/memory.ts](../../scripts/nibbli/memory.ts) | Writes fresh action journals, screenshots/files, HTML reports and SHA-256 manifests without overwriting attempts. |
| [scripts/nibbli/run.mjs](../../scripts/nibbli/run.mjs) | Builds a guarded Tester candidate and retains logs/results; refuses unsupported timeout/retry overrides. |
| [scripts/nibbli/runArtist.mjs](../../scripts/nibbli/runArtist.mjs) | Runs separate Artist/Hands mock or conversation workflows with immutable outcomes and source/build guards. |
| [scripts/nibbli/vision.ts](../../scripts/nibbli/vision.ts) | Reads native pixels and independently decodes project, PNG, sprite-sheet and animation metadata evidence. |
| `src/components/landing/showcase/PhotometricShowcase.tsx` | Requests read-oriented 2D contexts for normal/shadow preview readbacks. |
| [src/components/layout/AtelierRail.tsx](../../src/components/layout/AtelierRail.tsx) | Uses a fixed-height header with centered tool options and grouped workspace/export controls. |
| [src/components/layout/BottomTimeline.tsx](../../src/components/layout/BottomTimeline.tsx) | Disables frame-card transitions and active decorative shadows during playback; clock arithmetic is unchanged. |
| [src/components/layout/CenterViewport.tsx](../../src/components/layout/CenterViewport.tsx) | Mounts Curve handles/Apply/Cancel/re-edit controls, passes history callbacks and replaces large blurred decorations with bounded outlines/gradient. |
| [src/components/layout/LeftToolbar.tsx](../../src/components/layout/LeftToolbar.tsx) | Refines the color flyout, adds an explicit Close control and larger palette access while preserving keyboard/color actions. |
| [src/components/layout/inspector/LayersPanel.tsx](../../src/components/layout/inspector/LayersPanel.tsx) | Rebalances the opacity/blend strip, fixed blend width, flexible slider and tabular percentage display. |
| [src/components/layout/inspector/PalettePanel.tsx](../../src/components/layout/inspector/PalettePanel.tsx) | Refines preset selection, color indicators, palette browsing and swatch/recent-color presentation. |
| [src/components/layout/inspector/ToolSettingsPanel.tsx](../../src/components/layout/inspector/ToolSettingsPanel.tsx) | Reorders compact settings and places Create Motion Part/Merge artwork actions in a dedicated helper card. |
| [src/components/modals/ExportModal.tsx](../../src/components/modals/ExportModal.tsx) | Downloads Blob companions through separate contexts so WebKit does not coalesce the same-frame files. |
| [src/components/studio/CurveAdjustmentGizmo.tsx](../../src/components/studio/CurveAdjustmentGizmo.tsx) | Adds screen-space start/end/control handles and tangent guides for quadratic-curve adjustment. |
| [src/components/ui/ArtistColorPicker.tsx](../../src/components/ui/ArtistColorPicker.tsx) | Refines triangle/square picker layout, hue/S/V controls, editable hex draft and pinned primary/secondary color panel. |
| [src/components/ui/ToolMotionPreview.module.css](../../src/components/ui/ToolMotionPreview.module.css) | Compacts the tutorial card from 304 px to 244 px with smaller spacing, labels and actions. |
| [src/components/ui/ToolPreviewCanvas.tsx](../../src/components/ui/ToolPreviewCanvas.tsx) | Reworks illustrative tool animations around a handcrafted heart, shading/normal/lighting examples and tool-specific gestures; these are demos. |
| [src/hooks/viewport/useCurvePointerHandler.ts](../../src/hooks/viewport/useCurvePointerHandler.ts) | Adds draft/adjust/apply/cancel/re-edit workflow; publication review binds source ownership/history and preserves input owners. |
| [src/hooks/viewport/useShapePointerHandler.ts](../../src/hooks/viewport/useShapePointerHandler.ts) | Removes Curve from the generic shape path so its dedicated interactive handler owns preview and commit. |
| [src/hooks/viewport/useViewportDrawing.ts](../../src/hooks/viewport/useViewportDrawing.ts) | Reads the current store target when painting, touches raster revisions and marks artwork dirty while preserving the existing history callbacks. |
| [src/hooks/viewport/useViewportPointerEvents.ts](../../src/hooks/viewport/useViewportPointerEvents.ts) | Routes Curve pointer phases, cancellation and Undo to its handler; outside-canvas movement is clamped instead of jumping to (0,0). |
| [src/hooks/viewport/useViewportSelectionTransform.ts](../../src/hooks/viewport/useViewportSelectionTransform.ts) | Initializes floating-paste gizmo bounds, captures pasted-copy Undo once and avoids restoring pasted pixels on Cancel. |
| [src/lib/ai/math/photometricLighting.ts](../../src/lib/ai/math/photometricLighting.ts) | Requests read-oriented 2D context options for lighting pixel analysis. |
| [src/lib/export/downloadAsset.ts](../../src/lib/export/downloadAsset.ts) | Creates hidden Blob-only companion download frames and removes their contexts after navigation starts. |
| [tests/curveOwnership.test.tsx](../../tests/curveOwnership.test.tsx) | Adds source/frame/layer/project/lock/history/Undo-refusal and keyboard ownership regressions found during this publication review. |
| [tests/curveSplineInteraction.test.tsx](../../tests/curveSplineInteraction.test.tsx) | Adds hook and rendered-viewport curve adjustment, handles, Apply/Cancel, keyboard and immediate re-edit tests. |
| [tests/nibbli/ghostJourney.nibbli.ts](../../tests/nibbli/ghostJourney.nibbli.ts) | Tests drawing/fill/eraser/layers, exact Undo/Redo and saved project/PNG output; invalid coordinates are refused. |
| [tests/nibbli/motionJourney.nibbli.ts](../../tests/nibbli/motionJourney.nibbli.ts) | Tests four poses, timing, save/reload, sprite-sheet/Godot metadata and actual playback evidence with unchanged visible-order expectations. |
| [tests/nibbliArtist.test.ts](../../tests/nibbliArtist.test.ts) | Tests strict schemas, budget refusal, adapter usage and independent drawing semantics. |
| [tests/nibbliArtist/artistJourney.artist.ts](../../tests/nibbliArtist/artistJourney.artist.ts) | Tests the complete mock/conversation drawing loop and correction ceiling in disposable projects. |
| [tests/nibbliCopy.test.ts](../../tests/nibbliCopy.test.ts) | Tests disjoint empty destination, source preservation, stale/locked/invalid plans and copy action limits. |
| [tests/nibbliFlip.test.ts](../../tests/nibbliFlip.test.ts) | Tests lossless mirror permutations, symmetric no-op rejection and existing safety constraints. |
| [tests/nibbliHands.test.ts](../../tests/nibbliHands.test.ts) | Tests ownership, bounds, protected-layer identity and exact lossless translation preflight. |
| [tests/nibbliHands/flipJourney.hands.ts](../../tests/nibbliHands/flipJourney.hands.ts) | Tests exact H/V mirrors of asymmetric odd/even motifs, two zooms, history/files, Cancel and refusals. |
| [tests/nibbliHands/freeRotationDiagnostic.hands.ts](../../tests/nibbliHands/freeRotationDiagnostic.hands.ts) | Records trusted approximately 37 degree rotation separately; uses an exposed owned grip and assesses protection/palette/history/files and silhouette metrics. |
| [tests/nibbliHands/handsJourney.hands.ts](../../tests/nibbliHands/handsJourney.hands.ts) | Tests safe moves/copies, protected source/layers/frames, history/files, Cancel and refusals. |
| [tests/nibbliHands/rotationJourney.hands.ts](../../tests/nibbliHands/rotationJourney.hands.ts) | Tests exact 90/180/270 degree scalar permutations, centered/corner pivots, two zooms, protected content and refusal/history/file boundaries. |
| [tests/nibbliLauncher.test.ts](../../tests/nibbliLauncher.test.ts) | Tests single-browser conversation defaults, explicit engines, full mock discovery and rejected overrides. |
| [tests/nibbliRotation.test.ts](../../tests/nibbliRotation.test.ts) | Tests explicit pivot/grid/bounds rules, independent golden quarter-turn pixels, normal-map refusal and rotation budgets. |
| [tests/nibbliSafety.test.ts](../../tests/nibbliSafety.test.ts) | Tests coordinates, artifact identity, immutable evidence and independent raster/file checks. |
| [tests/production/curveOwnership.spec.ts](../../tests/production/curveOwnership.spec.ts) | Adds real-browser frame/layer/lock safety, stale re-edit, keyboard Cancel, Redo and edge-clamped handle cases. |
| [tests/workspaceJob.test.tsx](../../tests/workspaceJob.test.tsx) | Adds pasted-copy Undo baseline and Cancel-without-pixel-write regressions; earlier ownership cases remain. |
| [tests/workspaceSelectionKeyboard.test.tsx](../../tests/workspaceSelectionKeyboard.test.tsx) | Checks fresh floating-paste gizmo bounds and existing selection keyboard behavior. |

## Local-only material

The browser `debug.log`, original working-source snapshot, detailed review notes, failed challenges, native browser traces/screenshots and qualification receipts remain local and ignored. Existing historical reports and artwork images are preserved. The [archive policy](../archives.md) keeps completed audits/raw payloads out of Git and measures publishable source separately from local evidence storage. The original 68-file working inventory included one runtime log; all 67 source/document/test entries are covered above, together with this publication's documentation and regression additions.

## Documentation entrypoint follow-up

The 73-file source publication is [commit 8c207b22](https://github.com/lxcario/PixiBun/commit/8c207b22cae6a1a2f4a7f299ee42f64f65a1c665), including 14 Markdown files. Most of its documentation lived under `docs/`; the root entrypoints still lacked Nibbli and some current Curve/gate details. This English documentation-only follow-up fixes those omissions without altering application, asset, controller, test, config or dependency files.

| Document | Maintenance change |
| --- | --- |
| [README](../../README.md) | Adds the developer companion entrypoint and links supported workflows without promising a Studio assistant panel. |
| [Product scope](../../MAIN.md) | Distinguishes Nibbli developer tooling, conversation/mock planning and qualified Hands operations from future model services. |
| [Architecture](../../ARCHITECTURE.md) | Defines planner/controller/vision/memory boundaries and corrects Curve's ownership in the pointer-handler table. |
| [Contributing](../../CONTRIBUTING.md) | Corrects the gate to five stages plus optional build, separates coverage from timing, and explains Nibbli verification/independent expectations. |
| [Agent rules](../../SKILL.md) | Routes Nibbli work to its skill/contract and separates deterministic graphics from conversation planning. |
| [Design](../../DESIGN.md) | Records Curve/color/tool-help changes and reduced decorative paint work, without claiming M3 closure or physical-lighting accuracy. |
| [Benchmarks](../../BENCHMARKS.md) | Labels earlier local/CI numbers as historical and links the separate 13 October candidate; preserves original tables. |
| [Security policy](../../SECURITY.md) | Describes bounded plans, host-process limitations, evidence privacy and future provider configuration. |
| [Tasks](../../TASKS.md) | Adds the published checkpoint and current open work; leaves earlier phase entries intact. |
| [v2 vision](../../V2_VISION.md) | Places current Nibbli work before unmeasured infrastructure proposals; preserves proposal status. |
| [Feature index](../features.md) | Describes adjustable Curve controls and labels the older screenshot accurately. |
| [Artist handbook](../guides/README.md) | Links optional agent tooling and clarifies which controls lack fresh handbook pictures. |
| [Nibbli operating guide](../guides/nibbli.md) | Replaces the stale future-only Artist description with implemented Artist/Hands workflows and their limits. |
| [Security boundaries](../contracts/security-boundaries.md) | Defines protocol/evidence/provider boundaries without implying a sandbox or security certification. |
| [Exports](../contracts/exports.md) | Describes Blob companion download contexts and their cleanup/qualification boundaries. |
| [Changelog](../../CHANGELOG.md) | Links this documentation reconciliation separately from the code publication. |
| [Current status](../current-status.md) | Keeps the documentation-only follow-up separate from dated build/browser qualification. |
| [This change record](2026-10-13-studio-and-nibbli.md) | Lists the follow-up's affected pages alongside the original 73-file code map. |

Application/test/controller bytes still match the published candidate; no fresh production build or native browser result is claimed for Markdown changes. The Nibbli guide participates in source fingerprints, so earlier source/build labels remain attached to their original runs. Documentation links/inventories and the mandatory pre-push gate are checked for this follow-up before publication. The generic `FullStackGuide.md`, unchanged configuration files and local historical audits do not need content changes merely to acquire a newer file timestamp.

The follow-up's documentation validation passed: 1,297 local links/headings across 59 owned Markdown files, matching generated inventories and a 25.27 MiB publishable checkout within the unchanged 40 MiB budget. All 18 pending files are Markdown and match the follow-up map; comparing source fingerprints confirms that the Nibbli guide is the only changed input, with application/assets/tests/controllers/configuration unchanged.
