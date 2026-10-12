# Nibbli: PixiBun's atelier apprentice

Nibbli starts as developer tooling. Tester and the bounded Artist v0.1 loop share the [PixiBun controller](../../scripts/nibbli/controller.ts). Tester journeys remain deterministic. Artist supports a local conversation adapter and explicit mock plans; a real autonomous model, model training and a user-facing assistant remain unqualified future work. AI agents should start with the [agent contract](nibbli-agent.md).

## Run and inspect

Use the repository's Node 22 runtime and installed Playwright browsers. `npm run nibbli:test` builds the current source, starts its own production server on port 3190 and runs the core, controller-correction and motion journeys in Chromium, Firefox and WebKit, sequentially with zero retries. Set `NIBBLI_PORT` to choose another free local port. Use `npm run nibbli:test -- --project chromium` for a scoped investigation; its verdict covers only the selected browser. Use `--grep "Floating Ghost"` to select the motion journey. No paid testing service or model API is needed.

Every invocation creates a new ignored `artifacts/nibbli/runs/<id>/` directory. Read `outcome.json` first: passing browser assertions are inconclusive if source or compiled-build hashes changed. The directory retains source/build identities, native browser traces/video, downloaded files and an HTML report per attempt. Interruptions leave an incomplete record. `npm run nibbli:memory` reads completed and incomplete experiences without changing them.

The core journey creates an isolated 32×32 project, draws a simple three-color ghost, fills its closed body, proves exact Undo/Redo, adds a separate eye layer, erases/restores an eye, saves/reloads and independently checks project-layer PNG payloads and exported PNG samples. The correction case deliberately submits an invalid stroke: every coordinate is checked before mouse-down, so a rejected plan cannot partly paint. It then links the corrected action to the retained failure. This controlled diagnostic is distinct from unexpected product failures.

Project export uses the existing browser-download fallback. The test environment explicitly makes `showSaveFilePicker` unavailable, as the existing export tests do. It does not fabricate a file handle, drawing, serializer result or download. Actual OS-native picker interaction is outside this pilot; the controller refuses that path until a separate adapter is qualified. Earlier headless-picker cancellation remains a failed run, not a passing native-picker result.

## Motion journey: The Floating Ghost

The [motion journey](../../tests/nibbli/motionJourney.nibbli.ts) authors four 32×32 poses through real pen, bucket and timeline controls. A separately specified golden sprite has a rounded head and scalloped feet. The poses move by 0, −2, −1 and +1 pixels, with hold durations of 160, 120, 180 and 220 ms. This is a reviewed deterministic reference, not autonomous art planning.

Every pose and duration is checked before save and after reload. Independently decoded `.pixibun` layer PNGs and the actual 128×32 horizontal sprite sheet must match all RGBA bytes in order. TexturePacker JSON and Godot SpriteFrames downloads are checked for atlas regions, holds and repeating playback. No GIF qualification is inferred from the sprite sheet result.

A fresh page in the disposable browser context restores the saved project. Read-only animation-tick sampling checks the live canvas against the four references, requiring ordered repeating transitions and zero unmatched samples. Observed dwell times are retained separately from stored durations; this is not a wall-clock performance test. Playwright records that real preview session to `preview.webm`, displayed in the attempt's HTML report. This video includes restoration and frame inspection before playback; it is not synthesized from the reference images.

Playback observations also retain each animation-tick timestamp, tick gap, native pixel-read cost and reference-match cost. These measurements help distinguish slow rendering from observation overhead. Deeper investigations can use temporary frame-publication and composite timing marks in a separate diagnostic build; remove those marks before qualifying the final product candidate. Keep diagnostic style, scale and recording comparisons separate from the unchanged official browser profile and pixel/order expectations.

Reports separate functional pass/fail from an artistic review rubric covering silhouette, palette, continuity and timing appeal. Artistic quality remains `human-review-required`; fixed vertical translation does not establish deformation, easing, aesthetic judgment or Artist autonomy. The motion case has a larger explicit timeout for its additional UI gestures and evidence captures; the core journey's timeout and assertions remain unchanged.

## Shared boundaries

- **Controller:** UI tool/color selection, pixel-centre mouse gestures, layers, frames, frame durations, playback, Undo/Redo, save/reload and project/PNG/sprite sheet exports. It measures current canvas geometry, including zoom/pan, rather than guessing fixed screen coordinates. It never sets Zustand state or writes raster buffers. Lighting and import adapters can extend this same boundary; they are not yet qualified Nibbli operations.
- **Vision:** Screenshots plus native RGBA observations and independently decoded downloaded files. Expected fixtures belong to the test, not to an agent's visual opinion or the production renderer. Functional correctness and artistic quality remain separate.
- **Memory:** Append-only events for actions, failures, checks, corrections and evidence-linked candidate observations. Captures cannot overwrite earlier files. A manifest hashes the retained payloads. Candidate strategies need review before reuse; recording experience does not train model weights.
- **Tester:** The current workflow is scripted and reproducible. An exploratory agent can author additional journeys through the controller, with reviewed expectations. The existing [feature index](../features.md), [drawing guide](drawing-tools.md) and [test helpers](../../tests/helpers/drawingAndPreviewWorkflows.ts) remain the knowledge sources.
- **Artist:** Later planners can reuse these operations to produce artwork. Evaluate silhouette, palette, pose, timing and correction separately. Four-frame animation supplements the preserved core pen/fill/Undo journey.

## Failure and repair policy

A missing control, timing failure or pixel mismatch begins with unknown attribution. Preserve the failed run and determine whether the product, the test contract or the controller caused it. An invalid out-of-bounds command has attributable controller evidence. Record investigation and any correction against earlier event IDs.

Nibbli has no automatic product/test repair path. Its runner rejects snapshot-update and retry-override arguments. Do not lower pixel expectations, target sizes or timing limits to obtain a pass. A proposed repair requires a separate reviewed change and a new run; earlier failures remain. Keep screenshot baselines tied to the relevant browser/environment and retain small necessary reference fixtures separately from raw runs.

Use fresh browser contexts and disposable test projects. Never point the pilot at an artist's existing browser profile. Evidence stays local under the [archive policy](../archives.md); source checkouts contain tooling and useful operating instructions, not accumulating screenshots, videos or audit logs.

The pilot does not qualify all features, physical devices, production hosting or artistic usefulness. Those obligations remain in the [issue registry](../research/issue-registry.md).
