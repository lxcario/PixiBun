# Issue and research registry

Updated 3 October 2026. This registry separates corrections to the [documentation audit](2026-10-02-documentation-codebase-audit.md) from research that cannot be completed by rewriting Markdown. The [current status](../current-status.md) links the completed local phases and remaining production gates; the earlier [remediation record](2026-10-02-audit-remediation.md) retains its own execution scope. Git history identifies publication; no deployed revision or production release approval is established here.

## Documentation audit corrections

| ID | Correction / current authority | Remaining qualification |
| --- | --- | --- |
| D01 | Removed current Audio Engine row; old audio plans scoped historical | Retired feature is not reintroduced |
| D02 | Updated [source-backed shortcut contract](../contracts/shortcuts.md); Alt selection subtraction now bypasses pan/translation interception; three browser regressions cover box/lasso/wand and retained panning | Transform handles still own their modifier gestures |
| D03 | Unified privacy wording; persisted capture/relay booleans parsed strictly, invalid consent fails closed | Free text is not automatically PII-redacted |
| D04 | [Physical ArrayBuffer versus logical Blob storage](../contracts/storage.md) | Old-reader rollback needs qualification |
| D05 | Complete autosave result and user transition tables | A conflict copy can itself fail |
| D06 | Global idle-pool 32 MiB cap, eviction/clear and combined-ledger accounting; boundary regressions | Checked-out/realm/browser memory is not total heap |
| D07 | Compositor ownership/default and completed source comments corrected | Fresh outputs retained for independent frames |
| D08 | Tracked/excluded memory table and admission-estimate scope | Peak and long-duration device profile pending |
| D09 | WebM MediaRecorder path and alpha limitations corrected | Additional codec/viewer qualification pending |
| D10 | APNG store-block/Blob behavior documented | Compression/streaming sink is future optimization |
| D11 | MP4 even padding described accurately | Browser codec availability varies |
| D12 | Actual replay filename, bounded retained-history/baseline scope | Durable full-session recorder not shipped |
| D13 | Forward-difference/median-cut/Lloyd names corrected | Summary and converter stay distinct |
| D14 | Squint/attribution/precedence corrected; CVD CPU/SVG moved to linear RGB with reference vectors | Simulation is a design aid, not clinical qualification |
| D15 | Current stylized GGX-shaped glints separated from legacy pills/research light | No physical BRDF/any-artwork quality guarantee |
| D16 | Pixel-copy complexity, cel/normal/void conventions and unmeasured latency corrected | End-to-end interaction benchmark pending |
| D17 | Dynamic Next hosting and warm-offline contract | Current live deployed revision not independently checked |
| D18 | Exact Origin/absent-Origin/proxy/relay admission documented | Operator/redirect risk is not universal SSRF proof |
| D19 | Compile-time bus typing distinguished from handler runtime validation | Selected boundary validators remain operation-specific |
| D20 | Legacy provenance separated from canonical research recipes | Universal executable Effect Inspector deferred |
| D21 | Host-owned guest structure policy reconciled | Real two-machine/concurrent/reconnect qualification pending |
| D22 | Current universal performance/conformance/proof claims removed or scoped | Manual accessibility, hardware and artist studies pending |
| D23 | Incorrect 256-entry swizzle/128-RGBA-pixel example removed; correct lane semantics stated | Compiled SIMD implementation not shipped |
| D24 | Tree-CRDT title/authors/issue/pages/DOI corrected | Published proof does not verify this app |
| D25 | JFA approximation/pass/work distinctions corrected | GPU/CPU parity evaluation deferred |
| D26 | Unmeasured roadmap numbers/snippets removed from guarantees; decision gates added | Native/model/GPU artifacts not shipped |
| D27 | All owned local links/headings, generated discovery and selected source contracts checked; truthful messages | Prose truth still requires review |
| D28 | Floating counters replaced with dated checkpoints and [one status record](../current-status.md) | Historical counts retain original scope |
| D29 | Removed duplicate session blocks; kept dated completion record and operating rules | Separate worktree/vendor skill history untouched |
| D30 | Historical audit IDs and local phase status scoped in [the legacy registry](legacy-audit-registry.md) | Missing closure evidence is explicit, never inferred |
| D31 | UX journeys called engineering walkthroughs; confidence/pixel-pulse claims corrected | Participant studies remain pending |
| D32 | Encoder terminology/typechecking/checker scope corrected | Static compilation is not runtime validation |
| D33 | Git-resolved hook paths; unrelated hooks preserved; worktree/core.hooksPath regressions | Hook is bypassable, tests current working tree |
| D34 | [Local/CI/coverage matrix](../guides/testing.md) states actual enforcement | Coverage is optional; no fresh Lighthouse implied |
| D35 | Safe env template and ignore exception; operator/rollback guide | Audit erratum: template was already tracked, despite broad ignore rule |
| D36 | Confirmed links fixed; underscore false positive handled in checker regression | External URLs not exhaustively re-fetched |
| D37 | [Plan-level TestSprite registry](testsprite-plan-registry.md) separates stale plans/verdicts | The explicitly authorized [3 October challenge](2026-10-03-testsprite-challenge.md) supersedes the prior local-only preference; the [full execution follow-up](2026-10-03-testsprite-full-run.md) runs all remaining cases and passes 12 executable local workflows; cloud artwork coverage remains unqualified |
| D38 | Seven tracked stale-locator failures corrected; assertions retained; complete final editor suite passed 158/158 | Scope and logs in remediation record |
| D39 | Routine screenshots use per-test outputs; new-directory publication/hash manifest; 71 tracked PNGs and 32 original audit artifacts verified unchanged | Release evidence ideally commit-pinned |
| D40 | Live Export E hint removed; current guides use Export button | E remains Eraser |

## Illustrated handbook findings

The [2 October handbook review](2026-10-02-feature-handbook.md) recorded the following limits before product repairs. The [repair plan](../plans/2026-10-02-feature-repairs.md) tracks subsequent implementation; the original capture record stays unchanged.

| ID | Observed behavior | Current guidance / remaining action |
| --- | --- | --- |
| H01 | Phase 3 wires Iso FREE to the ordinary line path in both preview and commit; ON retains 2:1 projection | [Current controls](../guides/drawing-tools.md#21-iso-line), [local execution scope](2026-10-02-feature-repairs-phase3.md); broader pen/device qualification remains pending |
| H02 | Phase 3 retains one viewport-level preview, prevents its pointer controls from painting artwork, and redraws after expansion | [Current preview guide](../guides/studio-workspace.md#view-and-symmetry), [local execution scope](2026-10-02-feature-repairs-phase3.md) |
| H03 | Phase 2 now checkpoints the original and separates desktop practice pixels, metadata, native association and history; Keep writes a fresh project ID | [Current Keep/Return/refresh guide](../guides/learning-and-playground.md#keep-your-drawing-try-something-new), [local execution](2026-10-02-feature-repairs-phase2.md); session history and native handles are not reload backups, browser permanence and device studies remain unqualified |
| H04 | Phase 4 admits exactly one neutral manual Normal Facets or baked Normal Map per exported frame | [Normal export requirements](../guides/lighting-and-surfaces.md#shape-the-surface); ambiguous sources are refused; [phase 4 checks](2026-10-02-feature-repairs-phase4.md) |
| H05 | Phase 4 labels welcome APNG/GIF downloads as text notes (.txt) | [Use Studio for actual animation](../guides/welcome-and-demos.md#game-engine-exports); actual downloaded notes are checked |
| H06 | Phase 4 replaces lossless/full-algorithm wording with approximate contour conversion | [Actual SVG scope](../guides/exporting.md#vector-svg); pixel-exact/canonical fidelity is still not promised |
| H07 | Phase 4 packages a matching native PNG, PixiBun JSON and Tiled map in one ZIP; stale work is blocked | [Tile output limits](../guides/pixitools-cleanup-and-tiles.md#slice-into-unique-tiles); browser reconstruction is checked; fresh Tiled desktop/general engine tilemap qualification remains pending |

## Final October reconciliation

[Phase 5](2026-10-02-feature-repairs-phase5.md) reconciles the October repairs with current scope, technical references, handbook/screenshots and public wording. H01–H07 describe locally repaired engineering findings; they do not close the qualification rows below. The welcome image converter uses forward-difference edge weighting, Godot kits and Unity shader code have distinct delivery scopes, and offline use requires a prior online load/cache. APNG/MP4 notes no longer promise instant generation or universal playback. The [remaining-work table](../features.md#what-the-remaining-work-would-involve) explains concrete follow-ups.

Phase 5 also found **H08: reduced-motion welcome startup**. Auto-orbit initialized differently during server/client rendering; reduced-motion reveal/hero branches could leave transparent content or hydration attribute mismatches. The repair keeps initial markup consistent and reveals without timed movement. The strengthened welcome workflow checks panel opacity, stopped/manual orbit, both startup preferences and page/console errors; [execution and diagnostics](2026-10-02-feature-repairs-phase5.md#execution-and-diagnostics) preserve the discovery and final scope. This is a local interface repair, not closure of assistive-technology or participant qualification.

## Recovery archive follow-up

[Phase 6](2026-10-02-feature-repairs-phase6.md) adds an index-count preflight inside untouched archive preparation's existing read-only transaction. It avoids materializing payloads when the current source exceeds 10,000 records, while preserving refusal and original source custody. Other diagnosis/plan paths still enumerate bounded records. The source can grow after a displayed diagnosis, so export admission remains independent. This is a local payload-loading improvement; single fake-IndexedDB timing observations cannot establish the cause of phase 5's intermittent timeouts or close low-memory/long-session qualification. [Operating contract](../contracts/storage.md#untouched-archive-admission).

Visual review also found physical `blobType` leaking onto logical ArrayBuffer-backed records, causing strict recovery to refuse them, and failure toasts blurred behind the dialog. Phase 6 removes that physical field during conversion, retains unknown-field rejection and shows backup failures inside the dialog. Storage/read regressions and both legacy/current recovery-copy paths cover the conversion; named browser checks cover the dialog. Physical-device and assistive-technology qualification remains separate.

## Outstanding research and qualification

[Phase 7](2026-10-02-feature-repairs-phase7.md) records broader regression and a separate [local candidate assessment](../releases/2026-10-02-local-candidate-assessment.md). The Next.js dependency advisory is patched locally; production approval remains open. The isolated September reader diagnostic establishes a specific incompatible rollback target, not a qualified replacement. Public Vercel smoke and a worker label do not identify the full deployed candidate; the custom-domain lookup failed from the test environment. None of these observations closes the rows below.

| Area | Status / required evidence |
| --- | --- |
| Artist usefulness and learning | Pending recruitment/consented sessions, build/task order and actual observations; automated dry-runs do not close these |
| Physical pen/device and assistive technologies | Pending device/browser/input and manual keyboard/screen-reader matrix |
| Long-session and low-memory behavior | Pending peak, retained/active scratch, JS/decoder/GPU/worker profiles on named devices |
| Real collaboration | Pending two-machine network modes, concurrent paints/locks, structure refusal, disconnect/reconnect and congestion |
| Latency/FPS and future acceleration | Pending end-to-end input-to-pixel measurements with named hardware/build/fixtures and distributions |
| More game/video consumers | Pending actual importer/decoder/codec qualification beyond recorded named fixtures |
| Release/update/rollback | Pending deployed revision record and cache/old-reader compatibility; local gates do not approve a new release |

Do not close these with prose, inventory, or a screenshot. Keep the [animation study](PHASE4_ARTIST_UX_STUDY.md), [research artist evaluation](phase6-artist-evaluation.md) and [baseline protocol](pixitools-baseline-study.md) pending until real results exist.
