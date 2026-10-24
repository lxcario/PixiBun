# TestSprite trust and blocked-case triage — 18 October 2026

All five new controlled cloud comparisons pinned actual preview source `36ccc6206b890f4bf5c691975a7b322a55c7773a` and origin `pixibun-git-codex-s4-artwork-proof-lxcarios-projects.vercel.app`, auto-heal false. They are CLI-dispatched saved-script replays, not automatic App tests. Provider target metadata still reports production on some results; the scripts separately assert actual browser origin and the full manifest source. Generic scripts were restored only after exact run/code proof was retained; restoration itself is not another executed pass.

## Qualified comparisons

| Scenario | Passed controlled run | Executed code version |
| --- | --- | --- |
| stale-rig | [133e2e80-6637-4fb1-bf86-52496469fbed](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/a38291d5-eaa8-429c-95be-2a9cd9484b71) | `v-be9e28b217f8` |
| explicit-normal-sources | [295f4ad8-ca0c-4f65-8633-2edb401db465](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/05860544-ef23-4642-8cd1-a5c0ee5d2fa3) | `v-53d83dbdd718` |
| save-reopen | [c560eb1d-f57d-46dd-b1e1-a5dcfff2afaa](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/56115025-8c86-4ec1-bc88-da3059411a0a) | `v-c8e1b3f9edb2` |
| corrupted-import | [901d2801-ffe8-4ac5-9116-cad3f457941a](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/ba0f1063-0b87-4ae2-a30b-761d464139f2) | `v-5b7119894afb` |
| onion-overlay | [c71b8c5a-c57e-42da-8761-84b11043cb6b](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/141040a4-40a3-40e6-92a7-ad920eee7903) | `v-d2ef4f85dd0d` |

The [sanitized cloud receipt](../testsprite/cloud-receipts-2026-10-18.json) retains exact script hashes. Cloud status and stored script identity are observed; the service exposes no per-assertion numeric stdout. Counts measured locally are not silently presented as measured cloud output.

- **Stale rig:** actual one-part capture, source SHA matched to independently decoded RGBA, successful unchanged reopening, real source edit, save/reload and clear refusal protecting every downloaded project layer/metadata. Not multi-part motion, normal-layer rig or Co-Draw refusal.
- **Explicit normals:** a real downloaded Godot normal atlas matches the literal 16×16 field inside a one-pixel transparent border; single-normal lighting Cancel preserves the whole project. Two admitted normal-tagged layers explicitly refuse normal export with zero export downloads. General lighting/shadow compositing is not required to refuse multiple normals; cast-shadow fidelity is separate.
- **Save/reopen:** a literal real Pen mark and 175/325 ms holds survive explicit Save, same-context reload and actual page closing/new-tab reopening. Four downloaded layer PNGs and metadata remain exact; both actual exported PNGs match literal composites, and fresh-session Undo starts empty. Not a process-crash, storage-denial or cross-device test.
- **Invalid import:** small truncated JSON and parseable zero-width project fixtures refuse usefully through ordinary upload. Cancel works; decoded project/PNGs stay exact, a subsequent real brush edit/Undo works and saved reload retains the original. No hidden storage writes or arbitrary parser/recovery safety claim.
- **Onion guide:** actual ghost alpha proves the guide rendered; active composite, downloaded layers and actual PNG stay exact. Disabling clears the overlay and restores original preferences. Not every tint/opacity/blend combination.

All five exact pinned scripts passed in Chromium, Firefox and WebKit against that public build: **15 local browser journeys**, no retries. Fresh contexts and real UI gestures/files were used; no app-store or raster writes. Earlier Windows single-process startup errors, unavailable default Python browser revisions, the mistaken unpadded atlas expectation and the prematurely broad download counter remain recorded as runner/expectation issues, not app defects. Available local logs/outcomes are preserved; the first startup errors were captured in the conversation and summarized in the local investigation record, rather than saved as full browser traces. Explicit installed browser paths completed the three-engine checks. The earlier local renderer/gate/cloud cohorts retain their own sources; these results are not reattributed to the later documentation publication commit.

## All 55 original Blocked cases reviewed

The [case register](../testsprite/blocked-triage-2026-10-18.md) records **38 pixel/file-observation or committed-edit gaps, 9 control/workflow discovery gaps, 4 missing disposable upload fixtures, 3 browser/network prerequisites and 1 Co-Draw investigation**. These are triage groups, not established product root causes. Existing stronger overlapping evidence is cross-linked without marking an unexecuted old case Passed. Three previously blocked priority cases now have their own strict passes.

Latest catalog snapshot at 14:31 UTC: **121 cases, 69 Passed /0 Failed /52 Blocked**, reflecting different latest runs. The original 97-case batch remains 34/13/50. These are not all-feature certificates. The [evidence guide](../testsprite/evidence-guide.md) separates the three genuine product discoveries from test improvements and other agents' fixes.

## Release and remaining work

At the recorded observation, required TestSprite App checks still stopped at the Free-plan billing gate; no automatic suite executed. PR #6 remains unmerged, production remains `92de6c74`, and the automatic ledger stays empty. The final public-page check retained 30 passes and three Vercel-toolbar/CSP console failures. No security policy or merge gate was weakened. The next work is meaningful coverage for the remaining 52 blocked assertions, operational resolution of toolbar injection, actual latest-head App execution and a protected production release, followed by final production demo/submission checks.

This publication adds test scripts and documentation. It does not introduce a further application behavior repair or claim that TestSprite saved a measured number of hours. Raw attempts/screenshots remain ignored local evidence; only lightweight sources and sanitized receipts are committed.
