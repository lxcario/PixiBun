# Five failed reports, checked on the actual PR head — 20 October 2026

PR #6 remains at `98d7625e43e125a39d5151be578703d2040191bb`. The original five visible failures belong to the `2d27b262239fcf86aa1dc2ec9f13b42301319e4c` [App execution](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/38207a10-bdfb-463a-99ea-10d3cd934d80). The [receipt](../testsprite/visible-five-followup-2026-10-20.json) preserves case/run/environment identities, the current source, qualifications and limits. No new application defect reproduced and no application code changed in this follow-up.

## A result must belong to its source and execution

The visible baseline was **44 Passed /5 Failed /72 Blocked**, not the API default-environment-only **75/0/46**. All 121 histories were reconciled: 35 default Passed cases select a newer Blocked result in the visible catalog, five select a newer Failed result, and nine default Blocked cases select Passed. The API and UI totals therefore describe different run/environment selection. After the single fresh Outline UI replay below, the actual reloaded catalog is **44 Passed /4 Failed /73 Blocked**. That change is Failed → Blocked, not a new pass. Neither catalog is one complete cohort.

## Reproductions on published 98d7625e

Every independent journey asserts the preview's full public manifest SHA and origin. Tests use real UI input and read-only native raster/file observations; they do not write application stores or application raster buffers. Existing downloaded-file fallback fixtures remain explicitly separate from native OS picker coverage.

| Report | Original evidence | Current independent result | Disposition |
| --- | --- | --- | --- |
| layer lock | The trace used generic canvas clicks and did not establish distinct native A/B/C cells or the immediate refusal checkpoint. | Real 32×32 A=(2,2), locked B=(5,2), unlocked C=(8,2); immediate warning, every composite/layer channel, same layer identity, Undo/Redo. | Not reproduced on current source; original gesture/timing prerequisites were not established. |
| clip bounds | The transient invalid-range message was asserted only after later valid edits and Done. | Immediate 2–2 refusal feedback; original frames/holds/pixels preserved; distinct painted red/blue/green poses and actual clipped GIF prove inclusive 1–2 output, 100/200ms and exclusion of pose 3. | Not reproduced; assertion order in original execution is invalid for a transient checkpoint. Live playback-clock accuracy remains separate. |
| rectangle and ellipse | The run never opened the real folded tool flyout; no shape was drawn. | Actual tool chooser, 12-cell outline rectangle, filled ellipse interior/bounds, single Undo, and selection-mask outside-pixel preservation. | Not reproduced; control/gesture prerequisite unavailable or not exercised by original runner. |
| Outline Undo | The original action trace contains Apply Outline but no Undo click before its restoration assertion. | Actual global Undo restores every native channel; Redo restores Outline in all three engines. A fresh edited-plan portal replay records the real Undo, then retains Blocked for unavailable independent pixel/file observation. | Original missing-action configuration corrected for one supported UI replay; independent application regression not reproduced. Cloud integrity remains Blocked. |
| quick tools and text input | The run painted/focused by canvas click, selected Flood Fill instead of the authored Eraser path, and did not exercise text-input isolation. | Nonpainting focus, actual Shift+F10, all ten dialog tools and swap, Eraser selection/focus, Escape, typed g and Shift+F10 inside rename input; cancelled rename and all pixels intact. | Not reproduced; original recorded actions drift from the current authored plan. |

The five reported behavior areas were checked through **18** complete scenario executions across Chromium, Firefox and WebKit. Three additional inclusive-clip executions independently decode the real GIF: literal red/blue/green marks distinguish poses, 1–2 produces exactly the first two at 100/200ms, and the third is excluded. Three complete file journeys independently decode PNG/GIF/APNG and all backup layers, reopen the actual downloaded editable project in a fresh browser and exercise edit/Undo. Six existing final production cases that the timed-out Linux run did not complete also pass on the pinned public preview. Total **30 targeted executions, zero retries**; some behaviors overlap. These are not thirty distinct bugs or thirty official TestSprite passes.

Current-source production coverage already includes [Outline/clip/quick-tool checks](../../tests/production/testspriteWorkflowReports.spec.ts), [drawing/selection consistency](../../tests/production/drawingConsistency.spec.ts), [tool reachability](../../tests/production/toolShelf.spec.ts) and [workspace persistence/history](../../tests/production/workspaceConsistency.spec.ts). Physical mobile devices and live playback-clock accuracy are not certified here.

## One genuine edited-plan portal run

The original Outline trace never clicked Undo. Its authored Actions 4 and 7 were clarified through the supported UI editor; the exact restoration requirement and broader effect coverage limits were retained. Default was temporarily bound to the manifest-verified PR preview for this one run and restored to production after its terminal result.

Fresh [portal execution](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/68fe7f8b-6575-45bc-bbdc-fa963a843ce6/test/86879042-2cac-4e0a-89f7-4279309a27bd), run `86879042-2cac-4e0a-89f7-4279309a27bd`, records actual Apply Outline and **Undo last action** clicks on the intended preview. The visible summary returns to 192 painted pixels, six colors and digest `6af29269`. The verdict remains **Blocked** because no independent native/file pixel comparison was available. Its final recorded assertion also appears after Undo, so assertion ordering remains a runner qualification issue. Aggregate counts are not promoted into independent artwork proof. This is a test-sequence correction and capability diagnosis, not a new application red-to-green claim.

## The original 72 Blocked cases

Each latest visible original Blocked report was read and assigned one primary reported prerequisite. Secondary blockers overlap; these categories are not confirmed product or TestSprite implementation bugs. The fresh Outline adds one independent-oracle Blocked case, bringing the visible total to 73.

| Reported prerequisite | Original cases | Safe next qualification |
| --- | ---: | --- |
| Precise pointer, selection or modified-click input | 16 | Real gestures and exact before/after rasters; keep unsupported App actions Blocked |
| Downloaded file or container inspection | 18 | Actual returned bytes, independent decoding and protected project comparison |
| Known fixture not admitted | 11 | Supported public import/admission; do not pretend the Free shared fixture pool is enabled |
| Independent pixel, focus or history oracle | 20 | Separate native/file/focus observations from aggregate UI summaries |
| Environment, timing or preference controls | 4 | Real viewport, reduced-motion/network or display-clock boundaries |
| Scenario navigation or source checkpoint | 3 | Establish the actual control/source transition before evaluating its outcome |

The current file roundtrip batch meaningfully requalifies the export/backup path locally. It does not change the corresponding App records. No cases or historical attempts were deleted. One local shape-test preparation used an overly exact accessible checkbox label; it was corrected to the actual label including its hint, and the original preparation failure remains local.

## GitHub verification and the minimal CI candidate

On exact PR head `98d7625e`, [CI](https://github.com/lxcario/PixiBun/actions/runs/39435162705) passed validation and **365 development tests**, with zero development failures, skips or flaky results. Native codec verification separately passes **15/15**.

The serial E2E job exceeded its **two-hour job budget**. GitHub annotations explicitly confirm the timeout. Its production log reached **555 Passed /4 capability Skipped /0 logged Failed**, with **two of 561 scheduled cases uncompleted**. No completed production JSON was emitted. These partial results are not a full pass. The compiled build stayed frozen: 432 files compared, zero changed. Three selectively downloaded report files match the retained evidence index; this is not a locally verified digest of the entire 586-MB artifact ZIP.

[Lighthouse retry](https://github.com/lxcario/PixiBun/actions/runs/39435162705/job/118814341493) **passed** on the same head. The original setup failure occurred before checkout while GitHub timed out downloading actions; both attempts remain. Only that job was retried.

The sole local operating-code change raises [E2E job budget](../../.github/workflows/ci.yml) from 120 to **150 minutes**. Every case, assertion, per-test timeout, zero-retry policy and frozen-build check remains. The existing workflow tests pass **10/10**. Publication and the complete new Linux verdict remain pending owner approval; the budget change is not declared successful remotely yet.

## Automatic App gate

The existing trigger watches Vercel ready commit status, targets the integration branch preview pattern, excludes drafts and reports a blocking status. GitHub protection still requires `validate` and `TestSprite V3`, including for admins. The trigger remains Disabled while publication awaits approval. No manually fabricated App status or source was submitted.

Official [Run Behavior documentation](https://docs.testsprite.com/web-portal/setup/execution-settings) describes an authored-plan control; the actual project UI still exposes only login reuse, viewport and concurrency (10). The missing control is documented, not guessed through an undocumented API. The [GitHub integration contract](https://docs.testsprite.com/web-portal/integrations/github-integration) requires a real ready-deployment event. After an approved source push, enable the existing trigger before the deployment event, pin the new manifest/head, hold the preview unchanged, and inspect the App-created PR check and all final run verdicts. Do not substitute the thirty independent passes for that gate or narrow away failing cases to obtain a badge.

A genuine passing automatic App cohort has **not** been obtained. Source publication needs approval, and runner capability/assertion ordering remains a qualification gate even though the independently reproduced product behaviors pass. Production and merges remain untouched. Raw attempts and UI screenshots follow the [local archive policy](../archives.md).
