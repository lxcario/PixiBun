# The small promises journeys

Seventeen standalone Python/Playwright scripts for the existing TestSprite Season 4 portal project. They refine its browser verification with independent literal-pixel and file oracles. They are supporting saved-script replays; the required GitHub App automatic suite remains a separate qualification.

| Script | Promise | Independent observation |
| --- | --- | --- |
| `pixibun-readout-journey.py` | A Heart recipe can be read back, undone and exported exactly | Literal design rows and highlight pixels; independent digest/counts; canvas RGBA; actual decoded PNG |
| `pixibun-journey-journey.py` | A small layered animation can leave the desk and come home editable | Known imported layers; actual PNG, GIF and APNG bytes, decoded poses/holds; actual backup reopened in a fresh browser; edit/Undo |
| `pixibun-relations-journey.py` | Reversible edits return a drawing to its original state | Real selection/HUD mirror and quarter-turn actions; independent pixel permutations; downloaded layers/frame/hold metadata |
| `pixibun-lighting-journey.py` | A heart drawn through real Pen controls survives lighting Undo/Redo | Thirteen actual red brush drags, three white clicks; literal 100-pixel artwork; real PNG decoding; exact color/alpha restoration |

| `pixibun-animate-integrity.py` | Keyboard activation creates a blank frame without changing the first | Actual reel-end action, exact RGBA, observed frame hold, Undo/Redo |
| `pixibun-themes-integrity.py` | A different theme leaves the drawing intact | Four real theme controls in both schemes, exact RGBA and frame/layer counts, reload |

| `pixibun-color-focus-integrity.py` | Escape returns to the actual Colors opener | Real keyboard palette navigation, separate foreground/background choices, exact focus and artwork |
| `pixibun-saved-layout-integrity.py` | A saved desk remembers its shelves | Actual inspector side/width and panel states, opposite-state sensitivity, reload/reapply, exact artwork |
| `pixibun-frame-keys-integrity.py` | Focused frame keys preserve identity | Distinct 100/200 ms holds, reorder/duplicate/Delete, useful focus, independent text-input Delete |
| `pixibun-homepage-bench-integrity.py` | The bench keeps its own tiny world | Real canvas changes and decoded Hop GIF while a separate Studio drawing survives reload |

| `pixibun-valid-surface-integrity.py` | A normal surface takes the mark while diffuse paint stays safe | Explicit surface tag, actual downloaded layer PNGs, ordinary-paint refusal and exact normal-layer Undo/Redo |
| `pixibun-erase-family-integrity.py` | A neighboring color and the other frame survive erasure | Known admitted family/neighbor colors, explicit mode/scope, exact canvas and actual project downloads through Undo/Redo |

Use disposable contexts and the fixtures created by the scripts. They never write application stores or application raster buffers. The explicit `showSaveFilePicker` capability fixture exercises the browser-download fallback, not the native OS picker. The readout recipe is not pointer painting. These bounded 16×16 examples do not certify arbitrary artwork, every encoder option or manual screen-reader usability.

The lighting journey is the real pointer-drawing example: it starts blank and uses neither a template, import nor a recipe link. Its old portal failure counted decorative SVG rectangles on an empty canvas; retain that as an invalid oracle, not proof that product Undo failed.

## Before a cloud run

For a controlled comparison, pin `EXPECTED_COMMIT` to the candidate's full SHA in the stored code. The reusable scripts default to `None` so future PRs do not inherit a stale preview or production pin. Save the plan before the code: changing a plan invalidates the stored definition stamp. The readout and lighting scripts use bounded driver-side polling, preserving the app’s Content Security Policy and all pixel assertions. In that mode they require a full source identity in the actual origin's public manifest, record it and require it to remain stable across the journey. Compare that identity with the intended PR head before attributing a pass to the PR; this mode does not independently discover the triggering PR. The first controlled cloud passes pinned observed production `92de6c74b259eafcf73cc986b1def6c69f5566aa`. Provider target metadata alone is insufficient.

Review the portal case plan, save the exact script, retain its code version/hash and dispatch a controlled replay with autoHeal false when collecting a strict comparison. Preserve every original result. Once the App works, verify these meaningful assertions on the intended PR preview through the normal deployment-ready trigger too. Do not treat a manually dispatched replay as an automatic PR check.

## Local qualification

Use Python with the official `playwright` package and installed browsers. Set `PIXIBUN_LOCAL_URL` to a loopback development server. Optionally set `PIXIBUN_BROWSER_EXECUTABLE` to the installed matching browser executable and `PIXIBUN_EVIDENCE_PATH` to a local JSON receipt path. These overrides are restricted to local qualification, which makes no deployed-SHA claim. Chromium's Linux cloud launch flags are omitted in that mode. For Firefox/WebKit set `PIXIBUN_BROWSER` too.

The GIF/APNG readers are intentionally bounded. They independently check container structure, GIF LZW/palettes/disposal, APNG CRC/sequence/disposal, decoded frames and holds. The APNG reader admits RGBA, non-interlaced files with no separate poster image. Their local fixture checks include Pillow-encoded files, dictionary-width growth and corrupt/truncated input refusal. A reader rejecting an unsupported encoding must not be reported as an application defect without investigation.

Rotation commits run asynchronously: wait for the transform HUD to leave before observing the completed raster. The original premature observation remains in the dated local attempt record.

With Pillow installed, run `python scripts/testsprite/check_oracles.py` from the repository root to cross-check the GIF/APNG readers. The lightweight scripts are the shipped sources; screenshots, logs and generated receipts remain under ignored artifacts.

The homepage journey’s independent GIF reader permits dimensions up to 256×256 for the bench’s 4× download (observed 80×96, four distinct poses). The original animation readers retain their smaller bounded fixtures. Stale angle text and a nonexistent frame-rename field are not test prerequisites: use the bench’s actual canvas/selected controls and the real workspace-name input. Initial template opening is asynchronous; establish a nonempty 16×16 Bun before taking a baseline.

The source `77a40070` production qualification passed all four complete original journeys, twelve decoder fixture checks and the new Colors/surface/family journeys. The three new scenarios and the painted-lighting CSP-safe variant also passed strict source-pinned controlled cloud replays. Reusable scripts remove one-off target/source pins only after exact run/code proof has been retained; removing a pin is not another executed pass. Full source-labelled receipts are in [the dated cloud record](../../docs/testsprite/cloud-receipts-2026-10-18.json).

## Trust and refusal journeys — 18 October follow-up

| Script | Independent observation |
| --- | --- |
| `pixibun-stale-rig-integrity.py` | Actual saved-rig source fingerprint, real edit/reload, useful refusal and exact protected project |
| `pixibun-explicit-normal-sources-integrity.py` | Literal decoded Godot normal atlas, exact lighting Cancel, two-normal export refusal with zero downloads |
| `pixibun-save-reopen-integrity.py` | Last Pen pixel, changed holds, exact all-layer/project/PNG observations after save/reload/new-tab reopening |
| `pixibun-corrupted-import-integrity.py` | Explicit invalid files, clear refusal/Cancel, unchanged original and subsequent real edit/Undo |
| `pixibun-onion-overlay-integrity.py` | Actual nonempty ghost and clearing sensitivity; exact artwork and PNG guide exclusion |

For these five scripts, `PIXIBUN_QUALIFICATION=1` permits an explicit installed browser executable against the public preview and omits Linux-only launch flags on Windows. Controlled proofs still pin and assert the full deployed source; this switch does not bypass app security, change application data or establish native picker coverage. These scripts passed fifteen local three-engine journeys plus five controlled cloud replays on source `36ccc620`. See the [trust record](../../docs/releases/2026-10-18-testsprite-trust-and-triage.md). Reusable target restoration does not itself establish an executed result.
