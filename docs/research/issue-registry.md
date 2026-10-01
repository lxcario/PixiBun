# Issue and research registry

Updated 2 October 2026. This registry separates corrections to the [documentation audit](2026-10-02-documentation-codebase-audit.md) from research that cannot be completed by rewriting Markdown. Fixes below are in the working tree; no new commit, deployment or release approval is claimed. Final execution is recorded in [the remediation record](2026-10-02-audit-remediation.md).

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
| D37 | [Plan-level TestSprite registry](testsprite-plan-registry.md) separates stale plans/verdicts | Prior local-only preference retained; no external run claimed |
| D38 | Seven tracked stale-locator failures corrected; assertions retained; complete final editor suite passed 158/158 | Scope and logs in remediation record |
| D39 | Routine screenshots use per-test outputs; new-directory publication/hash manifest; 71 tracked PNGs and 32 original audit artifacts verified unchanged | Release evidence ideally commit-pinned |
| D40 | Live Export E hint removed; current guides use Export button | E remains Eraser |

## Outstanding research and qualification

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
