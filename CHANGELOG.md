# PixiBun — Changelog

All notable changes and architectural enhancements to the PixiBun codebase are documented below.
## Unreleased

- Canvas readout: the Studio now describes the active frame as text for screen readers and black-box browser tests (`src/components/layout/CanvasReadout.tsx`, `src/lib/render/canvasReadout.ts`). A visually hidden region beside the status bar lists canvas size, active frame and layer, frame and layer counts, painted pixels, the most used colors with counts and a short FNV-1a digest of the composite, each behind a `canvas-readout-*` hook. It announces one sentence after each committed stroke, Undo or Redo, waits while a pointer is held or the animation plays, and stays readable in Focus mode. `tests/canvasReadout.test.ts` checks counts, color ranking and the digest against an independent reference; `tests/e2e/canvasReadout.spec.ts` draws an eight-pixel stroke and asserts the readout before, mid-drag, after, on Undo and on Redo. [Hooks](docs/guides/testing.md#canvas-readout).

- The bench: replaced the four-tab landing engine showcase with a unified 16×16 interactive canvas (`src/components/landing/AtelierEngineShowcase.tsx`, `src/components/landing/bench/benchStage.ts`, `src/components/landing/bench/benchArt.ts`). Visitors draw on an editable starter friend (Bun, Mochi, Sprout or Teacup Frog), then light it with a 2.5D photometric lamp and ray-marched cast shadow, rotate it with contour-aware RotSprite alongside a plain turn, and preview a four-frame hop loop with transparent GIF download, all on the same edited pixels. The stage redraws only on user input or active motion, and caches each engine result by art version. [Welcome guide](docs/guides/welcome-and-demos.md#the-bench).

- Studio Labs: new **Liquid controls** lab. Slider handles turn to glass while held and glide to track clicks and arrow keys. The tool rail’s highlight is now the liquid tab lens: it springs to each chosen tool and stretches with speed, and pressing and holding (or sliding) lifts it into glass to pick a tool. The Dynamic island now shows every tool as its name and ▾, including Pen and Eraser, and the idle dot is gone. The island also fits its slot after resizing and stays full size while hovered. The hover droplet now buds, pinches off and wobbles, and is pulled back in on leave. The quick circle swells, squishes and flips its value; it steps Pen/Eraser/Line through 1 → 2 → 3 → 4 px and no longer stays out after a mouse click. Painting on an **On artwork only** layer now explains clipped strokes in the status bar and with a one-time hint. [Record](docs/releases/2026-10-15-labs-liquid-controls.md).

- Dynamic island hover/focus pulls a glass-like quick-action droplet from a squeezing pill (squeeze since replaced; see the entry above), with direct setting shortcuts for all 17 tools, a fixed click target and Clean corners confined to expanded brush controls.

- Studio Labs: scene themes can use the Dynamic island, Liquid tabs, Paint pot palette and Quick magic, with individual switches and **Classic studio** under Studio → Labs. Graphite and Plum stay classic. Tool changes now fade/blur outgoing controls before a small incoming text bloom; separate width/height springs resize the shell, while a scale-velocity reset prevents the new label collapsing during its first bounce. Menu controls keep a stable row, reduced motion updates immediately, and repeated status events reuse their bubble. Liquid tabs and the palette/magic controls also use calmer motion. See the [Studio Labs motion update](docs/releases/2026-10-15-studio-labs-motion.md) for ownership, final tuning, integrated verification and documentation scope.

- Audit follow-up phase 4: refreshed the handbook with 129 actual production-build screenshots, including current welcome/Playground, drawing and motion controls, exports, postcards and [all eight Studio themes in Night and Day](docs/guides/themes.md). Replaced 109 outdated pictures after verifying byte-identical local backups; dated capture manifests and original Git history remain preserved. [Capture details](docs/assets/screenshots/2026-10-15-current-ui/run.json).

- Audit follow-up phase 3: explicit Line, unsnapped Iso Line and Standard Shift-click straight segments use consistent endpoint tie breaking in either drag direction. Freehand raster ordering stays directional. Shape previews now use the selection mask and thick/mirrored brush footprint used by their committed layer stamps. The pixel-perfect helper ignores consecutive dwell samples. Added native pixel/Undo regressions and instrumented 128²/512² drawing-response observations without changing pointer sampling or latency budgets. [Scope and verification](docs/plans/2026-10-15-audit-follow-up.md).

- Audit follow-up phase 2: inspector tabs keep full 12 px labels at the admitted 260 px minimum, with icons/counts on a separate row. Shared inspector headings/shortcut labels and key timeline/status labels use at least 11 px text. **Tools → Animate artwork** groups motion capture behind a disclosure and opens for a selected area; whole-layer and merged-layer capture remain available. The canvas description follows the selected pan keymap. Hero constellation names are unique among retained drawings; measured labels avoid the copy, boundaries and each other, hiding when crowded. [Scope and verification](docs/plans/2026-10-15-audit-follow-up.md).

- Audit follow-up phase 1: first-edit help follows Standard/classic pan settings; generated output and navigation no longer trigger the ordinary-layer coaching milestone, and switching projects clears queued tips. Corrected lighting navigation/palette claims, unsupported Aseprite export copy, and local diagnostics versus chosen remote reporting throughout the pledge and help surfaces. [Scope and verification](docs/plans/2026-10-15-audit-follow-up.md).
- New starter friends, and Bun is herself. The Bun starter is now the real PixiBun mascot from the logo (`src/lib/art/bunSprite.ts`), one plain ear row and one plain body row shorter to fit 16×16; `tests/starterTemplates.test.ts` checks every other pixel against the mascot. She is the model in the homepage tour (inking, the lamp chapter, the hop and the export), on the hero's easel and in the lighting demo. Hearth Ghost, Little Shroom and Little Lantern make way for **Mochi**, a round marmalade cat; **Sprout**, a mint slime growing its first leaves; and **Teacup Frog**, a frog taking a warm bath in your tea. Old `?template=` links open their replacements (`LEGACY_TEMPLATE_IDS` in `src/lib/art/starterTemplates.ts`). The gallery cards now read their tag, size and palette swatches from each sprite.
- A smoother homepage. Every decorative animation now runs from one shared clock (`src/components/landing/ambientClock.ts`): pixel-art scenes tick at a calm 12–24 fps instead of repainting 60 times a second, only while on screen and while the tab is visible, and speed up to full rate only while you interact (the hero's pointer, Bun's hop, scrolling the story, hovering a card). The feature vignettes stamp their static sky and glows instead of thousands of single-pixel fills per frame, the lighting demo caches each lamp angle it has computed, and opaque panels no longer re-blur the animated scene behind them. With the CPU slowed 4×, sections that ran at 15–40 fps now hold about 60.
- The tour's lamp chapter uses the real engines instead of a stand-in: Bun is shaded by the Studio's 2.5D lighting and casts a ray-marched shadow onto a pool of lamplight, both cached per 15° and loaded only as the tour reaches the lamp (`src/components/landing/night/storyLighting.ts`).

- Carts, part 8 (prepared): [Where carts survive](docs/guides/cart-survival.md) gives a repeatable check (save a cart, post it, download what the platform serves back, open it at `/open`) and a results table for Discord, Bluesky, Cara, itch.io, Reddit and email. No platform has been checked yet; rows are filled in only from real posts.


- Carts, part 7: Living Postcards. **File → Living postcard…** offers six 64×48 scenes painted in code for color cycling (`src/lib/postcards/scenes.ts`): a campfire with rising flames, sparks and a breathing glow; a waterfall into a rippling pool; a rainy window with steaming tea, a candle and a sleepy cat; a buzzing Neon Café sign with a bulb marquee; the tide at dusk with glittering water and lapping foam; and a lava cave with a flowing river and drifting embers. Previews move in the picker; a chosen postcard opens with cycling on, and recoloring its ramps keeps it moving. The cart player now plays cycling palettes too, through the same register map and LUT as the Studio (`src/lib/color/cycleRenderer.ts`). `tests/production/postcards.spec.ts` checks every preview moves, a postcard opens cycling, and its cart keeps cycling on the player, in Chromium, Firefox and WebKit.

- Carts, part 6: **Export → Light Sweep**, a five-second 9:16 video for phones. A lamp drifts over the drawing on a starry night, from the left over the top to the right and back, relighting it with the same 2.5D lighting as the cart player while animated drawings keep playing; the title and Bun's "open me" footer frame it (`src/lib/cart/lightSweep.ts`). Frames are drawn on whole pixels at 270×480 and doubled, so the text and lamp are as chunky as the art. MP4 where the browser can, otherwise WebM, otherwise a clear refusal. `tests/production/lightSweep.spec.ts` saves real MP4s in Chromium and Firefox and checks WebKit on Windows refuses kindly.

- Carts, part 5: the Handmade Receipt. Studio keeps each drawing's receipt in this browser: strokes, drawing time without breaks, and a making-of track that stores only the pixels each edit changed, so a replay rebuilds every stage exactly (`src/lib/cart/receiptTrack.ts`). **Include the making-of** (off until chosen) puts it in the cart; the card prints "412 strokes · 38 min of drawing", and the cart player's **Watch the making** replays it in about 15 seconds. It is a record, not proof. `tests/production/cartPlayer.spec.ts` draws three strokes, checks the count, and checks the replay ends on the finished drawing in Chromium, Firefox and WebKit.

- Carts, parts 3 and 4: cart links and the cart player. **Copy link** in Export → Cart makes `/open#…`, a link that carries the drawing after the `#`, so nothing is uploaded. `/open` is a cozy player that works on phones: the drawing sits on lamp-lit paper and plays its frames, and dragging a finger across it moves a lamp that relights it with the Studio's own 2.5D lighting. **Keep on my desk** saves the cart in this browser for later, **Share link** uses the phone's share sheet, and on a wide screen **Open in Studio** hands it to the "A cart arrived" dialog. `tests/production/cartPlayer.spec.ts` covers the phone player, the lamp, the desk shelf and the Studio handover in Chromium, Firefox and WebKit.

- Carts, part 2: **Export → Cart** makes the card. A trading-card PNG on cream paper or a starry night stock: the title with a postmark number, the drawing on a mat at a crisp whole-number scale, a row of its colors, who made it and what it remixes, and Bun's "Made in PixiBun · open me" footer. The card updates as you type; your name and license are remembered on this device only. `tests/production/carts.spec.ts` saves a cart, paints over the drawing, opens the cart to restore it exactly, and checks a remix credits its source, in Chromium, Firefox and WebKit.

- Carts, part 1: a PNG can now carry a whole drawing. Its frames, layers, palettes and their cycle tracks, the light, an optional receipt, a license and the remix lineage ride in one private `pxBn` chunk (`src/lib/cart/`). Opening, dropping or pasting a cart shows who made it and what it remixes, then opens the drawing with its light; anything made from it credits it. Carts are untrusted input: sizes are capped during unpacking, and the drawing goes through the normal safe project import. [Cart format](docs/contracts/carts.md).

- 15 October documentation correction follow-up: reconciled remaining export-note, worker/live-lighting, logo/FX, scroll-story, shortcut, gate-stage and historical-status claims with source `0662de6b`; corrected additional onion-skin, layout and component-mounting mismatches. [Findings and verification](docs/releases/2026-10-15-codebase-and-documentation.md#follow-up-corrections).

- Current scroll story (`0662de6b`): [NightStory](src/components/landing/night/NightStory.tsx) derives camera zoom, progressive ink, lamp, motion and export presentation continuously from scroll position. Time still drives lamp sway/animation. The text reel rests, then glides between chapters with scale, opacity and blur changes. This replaces the earlier fixed-time chapters and ordered-dither transition experiments recorded below.

- 15 October source and documentation reconciliation. Desktop Playground replaces the old handbook/overlay with twelve coached lessons, ghost/gap previews, a tool dock and timing-aware filmstrip. Pocket adds eight 16×16 lessons while retaining its temporary 32×32 free pad. Homepage demos keep per-tab tasks and expandable explanations, and download actual four-frame Bun GIF/APNGs or image/metadata ZIP kits. Canvas palettes use the saved theme during hydration; Day/Night has an optional View Transition with reduced-motion fallback. Inspector controls share sections/fields. Studio and practice share one playback clock; update restart saves before activation and rechecks before reloading only the initiating tab, retaining older caches for multiple clients. Maintained guides/contracts correct the 4,096-step drawing history, default fill tolerance 0, selection/mirror keys, current lesson names and dated screenshot scope. [Review and verification](docs/releases/2026-10-15-codebase-and-documentation.md).

- Small laptop windows (audit v1.14.1 layout findings). The tool shelf folds related tools into flyout buttons only as far as the window needs: Lines and shapes first, then Selection, then Drawing, and on the shortest windows the Eyedropper shares a button with the Normal Chisel (`src/lib/layout/toolShelf.ts`, `src/components/layout/ToolSlotButton.tsx`). Each button shows the active or last-used tool; its corner arrow or right-click opens the rest of the group with arrow-key navigation, and tall windows keep every tool visible. A drawing now opens fitted to the window, at most 1600%, so a 32×32 canvas is fully visible at 1280×720. `tests/production/toolShelf.spec.ts` checks every tool and the whole canvas at 1280×720 and 1366×657; browser tests and the Nibbli controller pick folded tools through the flyout.

- Standard keymap (audit v1.14.1 interaction findings). By default the canvas now follows common pixel-art conventions: hold Space and drag to pan, Alt-click picks a color (right button: secondary), Shift-click draws a straight line from the last pixel with Pen, Eraser or Dither, right-click paints with the secondary color, and Enter plays the animation. Right-click beside the artwork still opens Canvas tools. The original keys (Space plays, Alt-drag pans, Shift paints secondary, right-click opens the popup) stay available as **PixiBun classic** in **Guide & Shortcuts**, and the choice is saved locally (`src/lib/input/keymap.ts`). `tests/keymap.test.ts` checks both keymaps; `tests/production/keymaps.spec.ts` passes in Chromium, Firefox and WebKit. [Shortcuts contract](docs/contracts/shortcuts.md).

- Fixed audit v1.14.1 defect 9: Undo no longer stops at 50 steps. Each drawing step keeps only the rectangle it changed, before and after (`src/lib/engine/pixelPatch.ts`), instead of a copy of the whole layer, and the step cap rises to 4,096, so the 64 MiB budget is what limits Undo. A one-pixel stroke on a 512×512 canvas now costs about half a kilobyte instead of 1 MiB; `tests/undoPatches.test.ts` keeps 1,000 such strokes undoable and redoable in under 2 MiB. Timelapse export rebuilds full frames from the patches: the history remembers each layer once, the first time it is edited, and the first stroke after a structural edit (flip, resize, merge) keeps the whole layer. Co-draw selective Undo works on the patches too.

- Fixed audit v1.14.1 defect 3: during co-draw, Undo and Redo take back only your own pixels. Each step records the layer right after the change; restoring touches only pixels the change made that still show it, so a partner's later strokes survive on both peers (`src/lib/engine/selectiveRestore.ts`). Solo drawing restores exactly as before. Verified by `tests/production/coDrawSelectiveUndo.spec.ts` in Chromium and Firefox (WebKit on Windows has no WebRTC and skips), which fails with the fix disabled.

- Audit v1.14.1 quick fixes. Flood Fill starts at tolerance 0 and the default palette drops the near-duplicate `#DDDDDF`, so a default fill no longer bleeds into a neighboring shade (defect 7). GIF frame delays round on the running total, so 125 ms frames keep the loop's exact length instead of drifting 4% slow (defect 8). Merge Down refuses a hidden layer and asks you to show it, instead of discarding its pixels (defect 6). Canvas Size keeps artwork at its size unless **Scale Artwork (Resample)** is ticked (defect 11). Mirror symmetry always needs Shift+H / Shift+V (defect 12). RotSprite's header now states that v3 rotation matches colors exactly (defect 15; behavior unchanged). `saveLayerBlobs` stays as a storage-test fixture.

- Fixed audit v1.14.1 defect 4: transparent pixels show as a two-tone checkerboard instead of white, so they no longer look like white artwork. Squares follow the art's pixel grid (one art pixel per square when zoomed in, power-of-two blocks when zoomed out, never under 8 screen pixels; `src/lib/render/transparencyChecker.ts`), and **View → Transparency** turns it off. Verified by `tests/production/transparencyChecker.spec.ts` at 100%, 800% and 1600% in Chromium, Firefox and WebKit.

- Fixed audit v1.14.1 defect 2: a selection now limits every raster tool. Marquee and lasso selections stay active across tool switches (Esc or a click outside the canvas clears them); Pen, Eraser, Dither, Line, Iso Line, Rectangle, Ellipse and Curve stamp only selected pixels, Flood Fill and Color Replace never leave the selection, and the Normal Chisel keeps pixels outside it (`src/lib/canvas/selectionMask.ts`). Verified by `tests/production/selectionLimitsTools.spec.ts` in Chromium, Firefox and WebKit.

- Historical story experiment (`e33481a5`, superseded by `0662de6b`): transitions were crisp: inked pixels appear solid, chapters switch with a stepped ordered-dither dissolve instead of a translucent cross-fade, and the words wipe out and in without fading or blur.

- Homepage theme integration (`b427520b`): the page follows the studio theme and time of day. Its painted scenes (hero, story cottage, workbench and promise cards) are recolored into the active theme's palette by lightness (`src/lib/theme/sceneRecolor.ts`); warm light, plants and highlights keep their color, and Day turns the night painting light. The hero adds the theme's own particles (petals, bubbles, sparks, fireflies, 8-bit clouds), the page background shows the theme's studio scene behind a readable veil, and section text, buttons and demo chrome use theme tokens instead of fixed night colors. That commit's story timing (superseded by `0662de6b`) stopped drawing by scroll position: scroll picks the chapter, each chapter plays at a calm fixed pace (the sketch inks over about 6.5 seconds), chapters cross-fade over 0.8 seconds, and the loop chapter bobs at half speed without the flashing sparkle.

- Homepage scrolling update (`909d881a`): Wheel steps now ease into place on the landing page (`src/components/landing/SmoothScroll.tsx`); keyboard, scrollbar, touch and anchor scrolling stay native, any press stops the glide, and reduced motion or Ctrl/Cmd zoom keep the native wheel. Its earlier story presentation (superseded by `0662de6b`) gave more room per chapter and a softer spring; each drawing eases in, holds when finished and cross-fades slowly, and its words cross-fade with the picture from the scroll direction.

- Themes and first-run onboarding. Eight studio styles, each with a Night and a Day palette, now come from one source (`src/lib/theme/themes.json`, generated into `src/app/themes.generated.css` by `npm run themes:css`): Moonlit, Sakura, Tidepool, Ember, Moss and Arcade float the panels over their own animated pixel scene (`src/lib/theme/scenes.ts`), while Graphite and Plum (stored ids `atelier` and `cozy-classic`) stay flat. Fixed saved themes silently reverting: the theme store now starts at the server's defaults so hydration matches, and `ThemeSync` re-applies the theme attributes React drops from `<html>`. Buttons, the scene control skin, the canvas frame and 237 lines of dialog styling use theme tokens instead of the old Plum gold, so Day modes read correctly. A first Studio visit opens a welcome journey (`src/components/onboarding/WelcomeJourney.tsx`): skill level, a live theme picker, where to change it later and a first drawing; one-time tips (`CoachTips.tsx`) follow the chosen level, and the Studio menu adds Tips and Replay welcome. Color picker sliders get a 24px hit area in every theme. `tests/themeRegistry.test.ts` checks every palette's text against its panels at WCAG AA; `tests/production/welcomeJourney.spec.ts` passes in Chromium, Firefox and WebKit, and the theme axe suite now covers all 16 styles. [Studio guide](docs/guides/studio-workspace.md#appearance-help-and-command-search).

- Brand cleanup (strategy Phase 0.5): the product is now just PixiBun, and no user-facing text says "AI". The landing headline is **Pixels with a pulse.** with a hand-made, no-account subline and **Open the Desk**; "atelier" and "2.5D game studio" marketing copy, the logo's ATELIER subtitle and Atelier dialog titles are retired (**Projects & Gallery**, **Guide & Shortcuts**, **Pixel Cleanup & RotSprite**). Undo labels and tool groups drop the AI prefix, and the unused PixiBud chat state and its message type are removed. Added a dated no-generative-AI pledge at `/pledge` (`src/app/pledge/page.tsx`), linked from the landing footer. Landing backdrops no longer crash the page when their host has zero size (hidden or collapsed preview). The internal `src/lib/ai` folder keeps its name until in-progress RotSprite work that imports it is committed.

- Fixed audit v1.14.1 defect 1: opening a panel offline that had not been opened online crashed Studio and lost unsaved strokes. `next build` now writes `public/precache-manifest.json` (`scripts/writePrecacheManifest.mjs`), and the service worker precaches every listed `/_next/static` file at install. It uses the list only when the version matches and the list contains every file the served shell references, so a development server or another build of the same commit falls back to shell-only precaching. Code-split dialogs and the PixiTools panel load through `lazyPanel` (`src/components/system/lazyPanel.tsx`), which keeps a failure inside that panel with **Try again**. The Studio error screen saves the live drawing through the route session before claiming it is saved, and publishes a resume ticket so **Resume Session** keeps unsaved strokes (`src/lib/project/studioCrashSave.ts`). Verified by `tests/production/offlinePanels.spec.ts` in Chromium, Firefox and WebKit. [Offline guide](docs/guides/collaboration-and-privacy.md#local-saves-and-offline-drawing).

- Replaced free-angle RotSprite with a contour-aware v3 engine (`src/lib/canvas/rotSprite.ts`, `tests/rotSpriteContour.test.ts`). It rotates the silhouette, a measured-width outline ring, the interior and small/thin details separately, and redraws one-pixel strokes as a graph. At 37° and other free angles, outlines no longer gap or swell to 3 px, the mascot keeps both eyes at their exact pixel count, and line art stays closed and one pixel wide. Two v2-calibrated pixel-count floors now assert contour closure and blade continuity instead. [Rendering contract](docs/contracts/rendering.md#pixel-art-rotation-rotsprite-v3).

- Enhanced Tool Motion Previews (`src/components/ui/ToolMotionPreview.tsx`, `src/components/ui/ToolMotionPreview.module.css`, `src/components/ui/ToolPreviewCanvas.tsx`, `tests/toolPreviewScenes.test.ts`) with a structured 3-step storyboard (before / action / result), pro tips, tool category groups, and animated procedural canvas previews across all drawing, selection, and lighting tools.

- Added Moonlit Studio workspace skinning (`src/components/layout/StudioLayout.tsx`, `src/components/layout/FrameBun.tsx`, `src/components/layout/StudioSkyBackdrop.tsx`, `src/app/globals.css`), featuring a full-viewport starry night backdrop with fairy lights and FrameBun perched atop the canvas platen collar reacting with cheerful hops to artwork edits.

- Replaced legacy landing scenes with a living moonlit atelier hero (`src/components/landing/night/NightHero.tsx`) and scroll-driven atelier story (`src/components/landing/night/NightStory.tsx`), featuring dynamic canvas lighting, fireflies, constellation sketching, and reactive companion animations. Retired legacy desk scenes (`src/components/landing/AtelierDeskScene.tsx`, `src/components/landing/PixelDitherCurtain.tsx`).

- Hardened Bézier Curve color retention across adjustment and history re-edits, safeguarded project-layer PNG samples against profile-shift mutations during WebKit hydration, and added independent active-frame composite capture for process replay timelapse exports.

- Reconciled the root product, architecture, contributor, agent, design, benchmark, security, task and v2 documentation with Nibbli and current Curve behavior. Corrected the contributor gate stages and Curve handler ownership; aligned feature/handbook/export/security guidance. Historical reports and measurements keep their original scope. [Documentation entrypoint follow-up](docs/releases/2026-10-13-studio-and-nibbli.md#documentation-entrypoint-follow-up).

- Added Nibbli Tester, bounded Artist planning/critique and safe Hands editing through the real PixiBun UI. Added interactive quadratic Curve handles and guarded re-edit, refined Studio/color/tool-help layouts, fixed pasted-selection history/Cancel behavior and separated WebKit export companions. Publication review added Curve source/history/input ownership regressions. [Complete English file change record](docs/releases/2026-10-13-studio-and-nibbli.md), [current status and qualification limits](docs/current-status.md).

- Protect imported artwork with staged transactional replacement, transparent clearing, lock/refusal checks, grouped Undo/Redo, repaint and autosave coordination. Keep correctness under coverage while measuring RotSprite separately after controlled warmup with its unchanged 10 ms limit. [Import safety (local archive)](docs/archives.md#record-docs-research-2026-10-09-import-artwork-safety-md), [current status](docs/current-status.md).
- Recover healthy online navigation and resource loading when optional cache access rejects or stalls, preserve worker cache ownership during retirement, and repair decorative Home update priority and moving starter hit areas. Peer fixtures own cleanup; compatible rollback waits for observed native activation and records measured platform limits. Final local/CI gates, complete browser evidence and rollback results are recorded separately from release qualification in the handoff.

- Repaired motion playback when worker results arrive slower than cel timing, isolated motion from onion ghosts, and added explicit undoable **Merge artwork & animate** preparation plus crop feedback. Studio controls and timeline help keep their geometry; the earlier compact bottom-left color dock is restored with its documented small-target tradeoff. Canvas right-click selections now keep pointer ownership, with ten labeled tools, keyboard access and bounded placement. [Changes and verification scope (local archive)](docs/archives.md#record-docs-research-2026-10-08-motion-layout-followup-md).

- Repaired compact header placement, small color/tool targets and light-theme clean-corner contrast, and restored saved color-picker Pin/Unpin behavior across inspector tabs. Browser fixtures now follow current controls and write captures to test outputs without replacing archived guide images. Added exact brush-size, guide-isolation and decoded PNG-export coverage. Documentation discovery accepts a bounded larger file list for the retained evidence archive. [Review, verification and publication (local archive)](docs/archives.md#record-docs-research-2026-10-08-session-review-publication-md).

- Added bounded pose/pivot parameter Undo/Redo, precise numeric editing, dedicated worker previews and cancellable atomic motion baking. Rectangle rendering now preserves clipping and sampling phase; static previews use the same translation rounding as playback and baked cels. New captures and Center Pivot retain half-pixel geometric centers for odd-sized parts, preventing quarter-turn drift without changing saved pivots. Dependent normal/research artwork refuses unsafe motion. Welcome starters now retain their actual artwork while checkpointing the previous drawing. [Editing follow-up (local archive)](docs/archives.md#record-docs-research-2026-10-07-editing-quality-release-hardening-md), [rectangle hardening (local archive)](docs/archives.md#record-docs-research-2026-10-08-motion-bounds-hardening-md), [session review and publication (local archive)](docs/archives.md#record-docs-research-2026-10-08-session-review-publication-md). Multi-part motion, broad device responsiveness and artist/release qualification remain open.

- Extended the local PixiMotion subset with source-bound rigid-part capture/preview/bake and saved project-format-v4 single-part rigs. Cross-phase hardening protects stale selection cancellation, floating-session resets, preview caches, palette bindings, atomic rig Open and retained motion memory, and corrects Paeth/RotSprite measurements. The later editing entry above supersedes the then-open parameter-history and synchronous-preview work. [Phase 4 (local archive)](docs/archives.md#record-docs-research-2026-10-07-piximotion-foundation-phase4-md), [Phase 5 (local archive)](docs/archives.md#record-docs-research-2026-10-07-piximotion-foundation-phase5-md), [hardening and verification (local archive)](docs/archives.md#record-docs-research-2026-10-07-piximotion-cross-phase-hardening-md).

- Implemented PixiMotion host foundation repairs (Phases 1–3): atomic workspace transaction boundaries in `src/lib/engine/workspaceTransaction.ts`, publication listener deferral in `src/lib/engine/publicationScope.ts`, source-bound asynchronous job cancellation in `src/lib/engine/workspaceJob.ts`, and reproducible synthetic pixel quality fixtures in `tests/fixtures/piximotion.ts` and `tests/piximotionFixtures.test.ts`. [Phase 1 (local archive)](docs/archives.md#record-docs-research-2026-10-06-piximotion-foundation-phase1-md) and [Phases 2–3 (local archive)](docs/archives.md#record-docs-research-2026-10-06-piximotion-foundation-phases2-3-md).
- Completed 5 October audit repairs and final hardening: atomic cancellation/write ownership, browser/file save acknowledgement, palette cleanup on failure, dialog/focus preservation, and server/client initial timeline markup alignment. [Hardening scope (local archive)](docs/archives.md#record-docs-research-2026-10-05-audit-hardening-md) and [publication record (local archive)](docs/archives.md#record-docs-research-2026-10-05-audit-publication-md).
- Integrated 4 October artist workspace feedback: task layouts, pinned triangle/square color picker, credited palette library, detailed tool settings, navigator, composition guides, onion configuration, and canvas-only focus mode. [Feedback evaluation (local archive)](docs/archives.md#record-docs-research-2026-10-04-artist-workspace-feedback-md) and [verification (local archive)](docs/archives.md#record-docs-research-2026-10-04-artist-workspace-verification-md).
- Completed the 3 October audit repairs: checkpoint the guest's original before co-draw joins; reject unsafe peer clocks and signaling; isolate dialog/editable/composition input and selection/touch ownership; bound import previews and original-pixel sprite-sheet checks; yield and cancel APNG work; and bound diagnostic queues and relay traffic. Deployment accepts only successful same-repository main-push CI, uses the tested SHA and step-environment credentials, and pins Next.js `16.3.8`. [Session scope and publication (local archive)](docs/archives.md#record-docs-research-2026-10-03-audit-session-publication-md).
- Registered and executed all 12 TestSprite challenge workflows. The service reports 2 passes, 7 blocked and 3 failed with incomplete artwork coverage; all 12 executable local browser cases pass, including exact pixels, Undo/Redo, conflict copies, export cancellation and Firefox backup restoration. Direct cloud script replay remains pending explicit sharing approval. [Actual verdicts and evidence (local archive)](docs/archives.md#record-docs-research-2026-10-03-testsprite-full-run-md).

- Split the combined Iso FREE browser workflow into independent diagonal, cardinal/edge and thick-symmetry cases. All geometry/pixel and Undo/Redo checks remain, with one structured assertion covering all 1,024 mirrored cells and an added final Redo pixel check. Application source and existing test timeouts/retries are unchanged. [Linux result and fixture follow-up (local archive)](docs/archives.md#record-docs-research-2026-10-03-ci-iso-workflow-repair-md).

- Export now checks native video capabilities only when a video format is selected, so image, game-kit and backup panels avoid those calls. Timelapse MP4 checks its selected replay FPS. Browser fixtures wait for hydration before the first backup screenshot and for video-frame presentation before reading decoded pixels. Patched all five development-only brace-expansion lock entries; the fresh full dependency audit reports zero advisories. [CI follow-up and verification scope (local archive)](docs/archives.md#record-docs-research-2026-10-03-ci-export-dialog-repair-md).

- Updated Next.js to the vendor's 16.3.6 security patch and made practice-test home navigation use the configured local origin. Phase 7 adds full regression and a separate release-readiness guide/assessment; current public-site observations and incompatible September-reader results do not approve deployment or rollback. [Execution and remaining gates (local archive)](docs/archives.md#record-docs-research-2026-10-02-feature-repairs-phase7-md).

- Recovery reads now remove physical MIME metadata when reconstructing ArrayBuffer-backed raster records, allowing ordinary damaged-source recovery without weakening unknown-field checks. Untouched archive export counts before loading oversized payloads and shows readable failure messages inside the dialog. Updated safety guidance includes two fresh captures. [Phase 6 checks, retained diagnostics and fixture budgets (local archive)](docs/archives.md#record-docs-research-2026-10-02-feature-repairs-phase6-md).

- Phase 5 reconciles current practice, tile/normal export references and known limits; replaces affected guide/README pictures with ten warm/current captures; qualifies welcome/animation copy; and fixes reduced-motion welcome hydration/reveal behavior. The final local gate/build and both complete browser suites passed; execution settings and earlier failures remain in the record. [Record and scope (local archive)](docs/archives.md#record-docs-research-2026-10-02-feature-repairs-phase5-md).

- 2 October export changes: Godot kits accepted neutral manual Normal Facets layers. Unique-tile slicing downloads a matching PNG, PixiBun map and Tiled map in one ZIP, with partial-edge refusal, cancellation and stale-result checks. Welcome APNG/GIF downloads were then labeled text notes (replaced by real encoded homepage samples on 15 October); SVG describes its approximate contours. Updated guides include six fresh captures. [Phase 4 checks and limits (local archive)](docs/archives.md#record-docs-research-2026-10-02-feature-repairs-phase4-md).

- Added an illustrated artist handbook and source-backed feature index covering all current drawing tools, export tabs, lessons, PixiTools tasks and surrounding workflows; documented interface limitations alongside the instructions. Application code was unchanged by the initial handbook-only update; subsequent repair entries have their own scope.

- Desktop Playground now protects the original drawing with a save checkpoint and separate practice workspace. Return restores the original; Keep saves practice as a new project. Trace/Clear support session Undo/Redo, mobile mounts only Pocket, and practice save failures refuse unsafe transfer. [Phase 2 checks and limits (local archive)](docs/archives.md#record-docs-research-2026-10-02-feature-repairs-phase2-md).

- Iso Line FREE now follows your chosen endpoints in both preview and finished pixels; ON keeps the familiar 2:1 projection. Live PiP opens one window, redraws after expansion, and its pointer controls no longer paint the underlying canvas. [Phase 3 checks and scope (local archive)](docs/archives.md#record-docs-research-2026-10-02-feature-repairs-phase3-md).

### For artists

- A simpler studio header and preview-first lighting/cleanup workflows.
- Named palettes, smaller canvas color scans and First/Last color-cycle ranges.
- Cycle Loop exports with more frame-rate choices, plus a correction for damaged larger GIF exports; affected older files need re-export.
- Save/recovery, selection, color-preview and resource-boundary corrections.

These are repository changes. Their presence here does not identify the live deployed revision or establish a new release. See [current status](docs/current-status.md) and [deployment verification](docs/guides/deployment.md).

### Detailed changes and verification

- **2026-10-02 documentation follow-up:** Clarified repository access, unmeasured performance targets, historical benchmark environment, security reporting/dependency policy and the local PixiMotion proposal. Added current studio/palette/export/backup illustrations and removed older architecture embeds. Documentation and images only; no new application fix, release or deployment is implied. [Scope and capture record (local archive)](docs/archives.md#record-docs-research-2026-10-02-documentation-followup-md).

- **2026-10-02 audit corrections:** Reconciled current references and historical records, added safety/storage/export/rendering/shortcut/operator/testing contracts and generated source/test inventories. Strictly parse saved diagnostic consent, cap/account idle scratch buffers, apply CVD matrices in linear RGB, restore Alt selection subtraction, preserve unrelated/configured Git hooks and isolate routine screenshots from archived evidence. Corrected seven stale editor locators and the Export E hint. [Changes, executed checks and remaining qualification (local archive)](docs/archives.md#record-docs-research-2026-10-02-audit-remediation-md).

- **2026-10-01 large GIF integrity:** Removed a stale dictionary insertion after GIF LZW Clear codes that corrupted later pixels in larger exports, including 8x cycle loops. Added independent decompression regressions and a full native-decoder pixel comparison for every frame of a real 512×512 GIF. [Evidence (local archive)](docs/archives.md#record-docs-research-gif-8x-corruption-2026-10-01-md).

- **2026-10-01 slower cycle export:** Added 3, 5 and 8 FPS and made 8 FPS the initial setting. All eight choices share equal widths. Exact APNG timing and total GIF loop duration are verified at the new rates. [Sources and proof (local archive)](docs/archives.md#record-docs-research-palette-cycle-export-2026-10-01-md).

- **2026-10-01 cycle export FPS:** Added selectable frame rates including 15 FPS, a generated-frame summary and clear current-frame scope. Cycle Loop applies preview speed, emits exact integer-FPS APNG delays and distributes GIF timing rounding to avoid loop-duration drift. [Verification (local archive)](docs/archives.md#record-docs-research-palette-cycle-export-2026-10-01-md).

- **2026-10-01 fire-only cycling:** Added matching First/Last swatch rows for selecting cycle ranges. Live playback and generated animation frames preserve exact original wood/outline shades outside enabled moving ranges. Playback speed choices retain the selected numeric value. [Verification and limits (local archive)](docs/archives.md#record-docs-research-palette-cycle-scope-2026-10-01-md).

- **2026-10-01 palette creator and compact scan:** Added a named draft palette editor with color picking, hex input, copying, artwork colors, ordering and removal. Scan Canvas and From artwork group near-duplicate raster shades into at most six representative source swatches. Added Remove color directly to the Palette panel, with artwork-preserving Undo/Redo, stable remaining role IDs and remapped cycling ranges. Creation returns success explicitly so refused history admission retains the draft. [Local verification and limits (local archive)](docs/archives.md#record-docs-research-palette-creator-2026-10-01-md).

- **2026-10-01 visible pixel glints:** Raised highlight contrast on matte/fabric surfaces and replaced continuously varying glint opacity with two flat native-pixel tones: a bright core and a stepped shoulder. Soft keeps a wider footprint; Crisp is tighter. The bulb is smaller, its glow is removed, its angle badge appears on interaction, and idle guides are quieter. Character regressions require at least four pixels with a luminance increase of 35/255, alongside ink and alpha protection. [Details and local evidence (local archive)](docs/archives.md#record-docs-research-specular-glint-2026-10-01-md).

- **2026-10-01 live glints:** Added Off/Soft/Crisp beside Shade in the light-bulb HUD. Replaced the immediate Specular Glint action with a live, cancellable preview and bounded hue-preserving highlights that honor painted normals and protect ink/features. Masked effect layers retain artwork transparency, native recipe editing, and exact Undo/Redo blending. Smaller windows keep the actions inside the canvas workspace. See [research and verification (local archive)](docs/archives.md#record-docs-research-specular-glint-2026-10-01-md).

- **2026-10-01 single-row header:** Removed desktop wrapping after the user rejected a second control row. The header stays 48px high; below 1280px the wordmark and standalone dimensions yield space to controls, while the full project name and dimensions remain in the name tooltip. Larger active-tool forms open from their labeled button; Pen/Eraser retain direct size controls. Offline status is compact, with local-save details retained in its tooltip. Mirror, zoom/Fit and View remain directly visible in their shared frame. Layout checks cover all 11 configurable tools at four desktop widths and offline status; artwork checks retain tolerance, locks, cross-frame erasure and Undo behavior.

- **2026-10-01 adjacent canvas controls:** Mirror, zoom/Fit and View now sit side by side inside one shared frame, with matching heights and narrow dividers. All remain directly visible; the group wraps together. The existing header scenario verifies alignment and proximity at four desktop widths with three tools.

- **2026-10-01 simpler header:** Reduced the closed pen header from 20 to 15 buttons. Projects, New, Import and Canvas size now live in a keyboard-accessible File menu; Studio combines appearance choices, Co-Draw and Help in one panel. Canvas dimensions are plain metadata. Save, history, drawing options, Mirror, zoom and Export remain directly available. Brush presets dismiss their popup, and Studio retains focus while theme choices change. See the [toolbar follow-up (local archive)](docs/archives.md#record-docs-research-session-ui-ux-2026-10-01-md).

- **2026-10-01 lighting-menu UX:** Replaced technical section headings with Light your sprite, Shape the surface and Add a shadow, using matching icon cards and short outcome descriptions. The task view starts with lighting open and keeps new disclosure preferences separately from old expert-panel state. Preview/apply labels and surface-layer setup are clearer; the menu's surface-paint action requires an unlocked Normal layer. Detected lighting/shadow settings stay behind disclosures, and Space activates focused menu controls without starting playback. See the [menu review (local archive)](docs/archives.md#record-docs-research-session-ui-ux-2026-10-01-md).

- **2026-10-01 header placement review:** Grouped New, Import and Save beside project identity and canvas size; moved Mirror beside the active tool; labeled Theme and Help; kept Export at the right edge. Content-driven wrapping preserves control order without overlaps or clipped menus at desktop widths. Header targets are at least 24px high, and a hover/focus timer correction prevents departed tooltips from reopening. See the [research and local checks (local archive)](docs/archives.md#record-docs-research-session-ui-ux-2026-10-01-md).

- **2026-10-01 save-status placement:** Moved the visible Saved/Unsaved/Saving/Save issue badge from the header into the bottom-right status bar. The colored dot, warning tooltip and live status announcement remain; the header Save action still provides retry. The existing save-failure browser check now verifies the badge's footer placement and the absence of a header copy.

- **2026-10-01 outlined-artwork follow-up:** Keep outlines starts on and excludes strong color boundaries from block samples, preventing a dark border from spreading into the fill. Missing Normal layers now use a labeled rounded-shape estimate for directional lighting; authored normals take priority, and new rigs start without a cast shadow. Automatic updates keep settings interactive; Cancel has a separate slot so refresh clicks cannot become accidental cancellation. Optional recipe fields preserve the behavior of older saved settings. Regression coverage includes the outlined-circle screenshots, delayed real-worker interaction, source retention, direction reversal, persistence and Undo/Redo. See the [follow-up evidence and limits (local archive)](docs/archives.md#record-docs-research-session-ui-ux-2026-10-01-md).

- **2026-10-01 beginner interface and artwork-preservation corrections:** Real selected-artwork comparisons replace the artificial sample. Previews fit occupied artwork bounds by default, advanced controls start closed, the light compass is square and choices have equal sizes. Simplification starts with byte-exact Original and requires explicit palette remapping; unrestricted coarsening retains source transparency and cannot erase a block because its sampled center is transparent. Identical results cannot be applied through the panel. See the [current UI/UX report (local archive)](docs/archives.md#record-docs-research-session-ui-ux-2026-10-01-md) for verification and limits.

- **2026-09-30–2026-10-01 six-phase audit implementation:**
  - Protected asynchronous saves, refused in-between insertion, structural clip history and co-draw host authority; hardened merge publication, export alpha/palette identity, worker failures and bounded admission.
  - Added local save-conflict copies, warm-offline/update checks and shared estimated memory admission.
  - Added animation stability review, intentional exceptions, protected cleanup, shared animation ordering/holds, semantic palette roles and a locally verified Godot game kit.
  - Added Explore variations: protected block simplification, shared stylized light/material rigs and bounded seeded tile scenes, with retained originals, saved source fingerprints and one-step structural undo.
  - Recorded 1,466 passing unit/integration checks, 134 passing editor checks, and all 33 compiled-browser scenarios with one timeout passing unchanged on rerun. Phase 5 separately recorded 850 Godot assertions. Later shared interface work added three automated walkthroughs, followed by the beginner corrections; the current editor inventory is 146 tests in 32 files. Historical execution totals remain unchanged.
  - TestSprite CLI/authentication were discovered available during Phase 4; the user chose local verification after the proposed upload was blocked. No TestSprite run, tunnel or deployment is claimed. Artist evaluation and release approval remain open. See the [session completion record (local archive)](docs/archives.md#record-docs-research-session-completion-2026-10-01-md).

- **2026-09-30 studio UX and tool cleanup:**
  - Grouped Projects, project name, New, Save, and canvas size in the header. Removed the duplicate header Back up button and visible “Saved on this device” label; portable `.pixibun` backup remains in Export. Brush size and zoom use compact controls, and the header buttons share a consistent height.
  - Simplified the animation dock and its collapsed playback row, made the scrub preview readable above surrounding panels, and moved frame operations into Frame actions. Layer rows use drag reordering instead of extra skip-style move icons.
  - Removed Rivet Stamp and the one-click Material Shading / Glow & Translucent Materials interface. Kept existing normal maps, legacy effect-layer compatibility, and the photometric relighting workflow.
  - Replaced the artwork-changing Generate Seamless Pattern action with an exact selection-based 3×3 repeat preview and tile PNG download. Kept the internal WFC solver and legacy WFC layers. 47-blob contours now show a before/after preview before creating a generated layer.
  - Added before/after review for jaggy cleanup, thinning, stray removal, color moods, dithering, and palette snap. Cleanup scans and effect previews become stale after the source changes. Improved import, project-gallery, Co-Draw, diagnostics, and persistence feedback.
  - Full checkout verification passed: 1,315 unit and integration tests across 131 suites, 98 Chromium E2E tests across 24 spec files, documentation integrity, typecheck, lint, and production build. The browser suite includes photometric relighting, recovery, accessibility, and the new preview flows. TestSprite could not run because its CLI is unavailable. This is not a new production sign-off.

- Earlier 2026-09-29 studio UX iteration (some header decisions below were superseded on 2026-09-30):
  - The top rail distinguishes local save states from a portable `.pixibun` backup. `Back up` opens the Project Backup export, which stays open with an inline error after cancellation or a failed write. Onion skin explains why it has no visible ghosts with one frame or during playback.
  - PixiTools opens with task choices for lighting, tiles, or cleanup, with a Browse all route. Lighting exposes a clear Auto/Manual choice and keeps advanced controls in named disclosures.
  - Tool previews now use a 304px card with 14px titles and 13px descriptions. The 43 distinct drawing and PixiTools scenes show their own action and result, with readable step labels and an on-brand sprite. Lasso traces an irregular selection; Magic Wand selects a connected color region. Reduced motion shows the result frame.
  - Added focused unit and Chromium coverage for backup trust, PixiTools navigation, preview readability, and tool scenes. At that point the inventory was 1,314 unit tests across 130 suites and 91 Chromium tests across 23 suites. The preview browser suite, build, typecheck, and documentation checks passed; lint had one `ImportModal.tsx` dependency warning. TestSprite could not run because its CLI was unavailable.

- Added interactive Tool Motion Previews (`src/components/ui/ToolMotionPreview.tsx`, `src/components/ui/ToolPreviewCanvas.tsx`, `src/components/ui/ToolMotionPreview.module.css`):
  - Canvas-rendered before/action/result previews on hover and keyboard focus for drawing tools in `src/components/layout/LeftToolbar.tsx` and AI/shading actions in `src/components/layout/inspector/AiToolsPanel.tsx`.
  - Initial preview coverage included core drawing tools and PixiTools actions. The later cleanup retired the Rivet, Material Shading, and Seamless Pattern actions and their active previews; the retained scenes describe available tools.
  - Tactile button accessibility: updated `src/components/ui/TactileButton.tsx` disabled state to `disabled:cursor-not-allowed` so users can inspect preview capabilities of disabled actions.
  - User controls: Dismiss via Escape key, close button, or "Don't show again" button. Added "Tool Previews" preference toggle in `src/components/ui/AppearancePopover.tsx` with `localStorage` persistence and event-driven cross-component synchronization (`pixibun:tool-previews-changed`).
  - Smooth gliding transitions between tools, warmup delay scheduling, and viewport auto-clamping/re-anchoring on scroll.
- E2E Test Suite Expansion:
  - Added `tests/e2e/toolMotionPreview.spec.ts` (3 Chromium tests covering drawing tool previews on hover & focus, PixiTools action previews, and permanent dismissal/re-enabling).
  - Added multi-frame Erase Sampled Color test in `tests/e2e/eraseColor.spec.ts` verifying timeline thumbnails and canvas state across animation frames. That initial suite contained 86 tests across 21 spec suites; the current inventory is recorded above.
- TestSprite Suite & Plans:
  - Added 15 frontend test plans (`testsprite-plans/` 44 through 58 and `testsprite_tests/latest_15_regression_plans.jsonl`) covering color erasure, sprite cleanup, bucket fill tolerance, color replace tolerance, RotSprite contours & bounds, lasso hover & deletion, blank frame layer isolation, layer property structural undo, active frame duration timeline undo, smart spritesheet slicer, export modal geometry, and workspace hygiene.
  - Updated TestSprite agent skills (`.agents/skills/testsprite-onboard/SKILL.md` and `.agents/skills/testsprite-verify/SKILL.md`) with comprehensive guidance on `--env`, `--local <port>` tunnels, exit codes (10–13), wait lifecycle, cancellation refunds, and pinned run steps.
- Learning & Baseline Usability Research:
  - Added 6-week Learn-by-Making experiment plan (`docs/plans/learn-by-making-2026.md`) with artwork-preservation engineering gate, 3 first-success paths (Draw, Animate, Light), and measurement definitions.
  - Added baseline usability study kit (`docs/research/pixitools-baseline-study.md`) for 5-participant observational research.

## [v1.14.1] - 2026-09-28 (Production Sign-off)

- Fixed the production `/sw.js` MIME type by setting service-worker headers on the route response. The previous deployment served `text/plain`, preventing browser registration. The deployed fix registers and controls the studio, and a warmed production studio reloads offline. See `docs/releases/v1.14.1-signoff.md` for release evidence and deferred checks.

- Layer visibility, lock, opacity, blend mode, name, tag, effect recipe, and frame-duration edits now create structural Undo steps. Continuous opacity and duration input changes are grouped into one interaction; tutorial initialization bypasses user history.
- History-backed structural edits now estimate both Undo and Redo snapshot sizes before mutation. Edits that exceed the configured history budget are rejected with a visible message, preserving the artwork and existing history. Selection extraction now uses the tested SafeCanvas boundary helper.
- Removed unused cursor and autosave components and an unused safety export barrel. Updated current design and architecture notes to match the running app.
- Removed the Studio music widget, procedural arrangements and synthesis engine, audio-driven timeline pulse, and related landing-page copy. Earlier changelog entries below remain historical records of files that no longer ship.
- Reconciled the current task log, build log, architecture, design, product scope, and algorithm reference with the imported-art tools, bucket semantics, grid geometry, and verified test inventory. The independent audit reports and dated plans remain historical snapshots.
- Added TestSprite regression plans for frame isolation, lasso deletion, color replacement, and RotSprite behavior. They are saved as plans, not reported as executed TestSprite runs.
- Bucket fill now includes nearby shades at a controlled default tolerance, with an optional switch for tiny enclosed color specks in imported art. The bucket keeps its own setting so Color Replace remains exact by default. Removed layout borders that made the main artwork slightly smaller than its grid at high zoom. Added focused fill tests and Chromium checks for real bucket clicks and exact artwork/grid alignment.
- Added PixiTools Analyze & Crisp Artwork: scans the active layer or matching layers across frames before applying an undoable cleanup, with before/after thumbnails. It removes faint alpha and tiny detached specks (including opaque gray specks on white backgrounds), hardens surviving alpha, reduces opaque neutral grays to crisp tonal bands, and preserves distinct accents. Optional dark-line thinning is off by default to protect facial details. The panel reports per-stage pixel counts and skips locked layers.
- Added Erase Sampled Color (Shift+R): click a visible color to remove exact or nearby shades to transparency on the active layer. Color family is on by default; it clears pale background specks and replaces dark color spill embedded in an outline with a neighboring outline color. The tool has its own eyedropper/checker icon. Choose connected or all matches, and optionally apply the sampled color to the corresponding unlocked layer across animation frames. Selection masks and undo/redo are preserved; multi-frame edits are bounded by the history budget.
- Rechecked current documentation against the code and live test inventory. Corrected outdated v2 suite counts and broad dependency/proof claims, clarified that dated implementation plans are snapshots, and added a v2 inventory check to the documentation gate.
- Blank frames retain the current layer names and settings under fresh layer IDs with empty pixels, while Duplicate Frame also copies the artwork. The timeline tooltips now explain that difference, and the layer panel identifies its active frame. Added a two-layer Chromium isolation check.
- RotSprite now restores border-only and interior-only source colors to the matching region of the rotated silhouette, preventing dark blotches inside and fill-color breaks along an outline at 45°. Added a regression from the reported 32×32 circle and a Chromium check through the Rotate Cleanly button.
- Color Replace now offers an active-layer tolerance slider for nearby shades, preserves each replaced pixel's transparency, skips transparent/no-op clicks without adding history, and respects layer locks. Added focused pixel tests and a Chromium undo/lock interaction test.
- Lasso preview now draws only during an active drag. Floating selections no longer show their unrotated blue mask tint; transform scaling samples only pixels inside an irregular selection, and toolbar pointer events no longer start a new lasso. Delete and Cut honor irregular selection masks and clear stale preview strokes. Added Chromium pixel checks through an angled selection transform and masked deletion.
- Bounded viewport overlays: the selection tint canvas now keeps artwork-sized backing dimensions at every zoom, grid/reference/isometric/playground guides use screen-pixel CSS patterns, and the brush ghost is a CSS border without a canvas allocation. Added a Chromium regression at 2048×2048 and 1600%/6400% zoom.
- Hoisted the four-neighbor offsets in discrete Laplace cavity computation, removing the remaining per-pixel neighbor-array allocation in the photometric bake path.
- Normal-map worker dispatch now copies only the selected `Uint8ClampedArray` view, so subarray offsets cannot change the pixels sent for baking.
- Browser project round-trip proof now covers two frames, two layers per frame, clip metadata, and a nondefault frame duration; current collaboration docs state the v1 two-peer scope.
- Rechecked current Markdown against source: corrected export-limit status, canvas buffer type, worker-copy semantics, RotSprite scope, undo cost, historical v2 metrics, and an outdated plan index entry.
- Project, layer, and clip edits now reject metadata that project validation cannot reopen. Deleting a frame remaps affected clip ranges; invalid gallery renames are not saved, and duplicated names stay within the project-name limit.
- Oversized Redo snapshots now clear the disconnected history chain with a visible warning. The history engine retains this fallback for already-applied snapshots; current structural editor actions preflight their estimated snapshot sizes before editing.
- Odd-size MP4 exports pad to encoder-compatible even dimensions without stretching the artwork. Content-aware heightmap traversal no longer allocates neighbor arrays for each visited pixel.
- Corrected palette LUT allocation, shadow mode, spherical-dome slope, and specular-alpha descriptions to match the implementation.
- Palette and cycle-track edits now obey project validation limits, report rejected input, and mark accepted changes for autosave.
- Startup completion retries autosave for an edit made before the workspace became active.
- Updated current architecture and audit documentation. The Phase 72 bounding-box strategy recorded below was later replaced by component-member traversal with a shared distance buffer; M12 was resolved in the later audit remediation.

**Initial hardening milestone:** 2026-09-21.
### Redo Stack Byte Budget & Combined History Retention Envelope (Phase 74 / M1 Hardening)
- **Combined History Byte Envelope & Exact Redo Accounting (`src/lib/engine/historyEngine.ts`, `tests/historyEngine.test.ts`)**:
  - Implemented exact redo byte accounting (`redoBytes`) and enforced a unified combined retained-history byte envelope (`undoBytes + redoBytes <= limitBytes`). Undo and redo stacks remain independently depth-bounded by `limitDepth` (default 50), while their combined retained HistoryStep payload is constrained by the configured 64 MiB history byte envelope (`limitBytes`).
  - Resolved canonical MEDIUM finding M1: the redo stack previously had no byte budget (bounded by depth alone), which allowed retained undo + redo history to substantially exceed the documented 64 MiB history envelope.
  - On `undo()`, if combined retained bytes or redo depth cap are exceeded, oldest/farthest-future redo entries are evicted (`redoStack.shift()`) until the combined invariant holds, strictly preserving the active undo chain without corrupting the process replay baseline.
  - On `redo()`, the undo admission helper accounts for remaining `redoBytes` and uses H4's baseline-aware eviction path (`evictUntilWithinBudget`) if undo steps must be compacted to admit `currentState`.
  - If an undo snapshot cannot be retained, the now-unreachable older redo tail is cleared. An individually oversized redo snapshot is rejected before any undo entry or replay baseline is evicted.
  - When a new stroke is pushed (`push()`), the redo branch is cleared and `redoBytes` resets to 0. `clear()` resets all history byte counters to 0.
  - Verified across 16 dedicated regression tests in `tests/historyEngine.test.ts` covering redo depth eviction, redo byte eviction before depth cap, combined byte budget invariance, push/clear resets, redo pop decrements, variable-size entries, baseline invariance under redo eviction, redo-triggered undo eviction updating baseline, and continuous accounting invariants.

### WaveFunctionCollapse Working-Set Modeling & Resource Admission Bounding (Phase 73 / H5 Hardening)
- **WFC Working-Set Modeling & Defensible Resource Envelope (`src/lib/procedural/waveFunctionCollapse.ts`, `src/config/canvasLimits.ts`, `src/hooks/viewport/events/useArtisanEvents.ts`, `tests/wfcResourceSafety.test.ts`)**:
  - Defined canonical procedural working memory envelope `MAX_WFC_WORKING_SET_BYTES = 64 * 1024 * 1024` (64 MiB) in `src/config/canvasLimits.ts` as PixiBun's configured WFC subsystem admission-policy ceiling, aligning with PixiBun single-subsystem working memory budgets.
  - Implemented pure deterministic `estimateWfcWorkingSet` and `validateWfcResourceBudget` modeling exact typed array allocations across pattern storage ($P \cdot (4n^2 + 16)$), dense propagator compatibility allowance ($16 \cdot P^2$), wave state ($C \cdot P$), AC-4 support counters ($16 \cdot C \cdot P$), entropy tracking ($20 \cdot C$), and output raster ($4 \cdot C$), guarded by overflow-checked arithmetic within JavaScript's safe-integer range (`safeMultiply`, `safeAdd`).
  - Admission also charges the retained input and packed sample buffers. Propagation now uses a bounded typed stack ($8 \cdot C \cdot P$ bytes) included in the solver estimate.
  - Resolved canonical HIGH finding H5: WaveFunctionCollapse pattern and compatibility resource growth previously scaled without a defensible bound (a 64×64 selection producing 32,768 patterns required >19 GiB of working memory, causing allocation failure and worker aborts).
  - Enforced input-derived resource admission in `synthesizeWfc`: early pre-extraction structural checks reject oversized output dimensions and candidate extraction footprints before pattern extraction, incremental unique-pattern admission during the extraction loop aborts before adding over-budget patterns to Map/retained structures, and post-extraction validation rejects oversized $P/C$ combinations before constructing the $D \times P^2$ compatibility table, allocating the $C \times P$ wave buffer, or creating the $16 \cdot C \cdot P$ byte AC-4 support counter array. Decoupled propagator build via `_wfcInternal.buildPropagatorTable` and solver state allocation via `_wfcInternal.allocateSolverState` to guarantee and empirically verify zero propagator / dominant solver-state allocations occur after resource rejection.
  - Hardened artisan UI event handling in `useArtisanEvents.ts` to propagate typed `result.error` notifications to toast alerts and assistant messages without mutating canvas layers, active artwork, or undo history.
  - Verified across 26 unit tests in `tests/wfcResourceSafety.test.ts` covering exact estimator formulas across tiny, large P small C, small P large C, and large P large C dimensions; safe arithmetic boundary and overflow protection; budget boundary tests (<= B admitted, > B rejected); budget ceiling clamping (cannot raise above 64 MiB); pre-allocation rejection proof (spying on propagator and state allocators to prove 0 calls); candidate footprint early structural rejection; incremental unique-P early abort on high-entropy sources before candidate enumeration finishes; duplicate-heavy source non-rejection; output-grid C-growth verification; logical contradiction vs resource limit distinction; determinism non-regression across multiple seeds and sample patterns; and high-entropy source measurement.

### Content-Aware Heightmap Algorithmic Work & Allocation Bounding (Phase 72 / H1 Hardening)
- **Component-Local Bounding Box Tracking & Bounded Distance Work (`src/lib/ai/math/edtNormalMap.ts`, `tests/h1ContentAwarePerformance.test.ts`)**:
  - Recorded component bounding boxes `[minX, minY, maxX, maxY]` during the linear connected-component labeling pass in Stage 4 of `computeContentAwareHeightmap`, bounding Stage 6 micro-distance BFS loops and per-component temporary array allocations strictly to component-local bounding-box area (`compW * compH = localArea`) rather than full canvas pixel count (`width * height = N`).
  - Resolved canonical HIGH finding H1: removed unconditional $K \times N$ full-canvas per-component scanning and allocation inside `computeContentAwareHeightmap`.
  - Reduced per-component scan work and cumulative temporary Float32Array allocation traffic from $K \times N$ to $\sum \text{localArea}$ (over 4000× reduction on a 64×64 1024-component fragmented fixture; note that $\sum \text{bboxArea}$ is not bounded by $N$ in general and may still be super-linear for pathological overlapping bounds, while $cDist$ peak temporary allocation is bounded by the maximum component bounding-box area), eliminating full-canvas temporary buffer allocations during Stage 6 while maintaining bitwise identical component maps, height fields, normal vectors, cavity AO, and final photometric render outputs across all fixtures.
  - Verified across 17 unit tests in `tests/h1ContentAwarePerformance.test.ts` covering exact bit-for-bit equivalence across 12 representative fixtures (transparent, single pixel, large solid block, checkerboard, 2 distant blobs, narrow lines, edge-touching shapes, asymmetric character, appendage character, noisy fragmented sprite, donut ring with interior hole, and nested concentric square rings with overlapping bounding boxes), deterministic allocation and work reduction on adversarial fragmented fixtures, adversarial overlapping bounding box complexity truth proof ($\sum \text{bboxArea} > N$), large component non-regression, and final photometric render equivalence across character and prop artwork compared against independent pre-H1 legacy baseline executions.

### Photometric Pipeline Deduplication & Hoisted Analysis (Phase 71 / H6 Hardening)
- **Hoisted Photometric Analysis & Zero-Allocation Buffer Threading (`src/lib/ai/math/photometricLighting.ts`, `tests/photometricPipelineDeduplication.test.ts`)**:
  - Hoisted geometric analysis in `renderParametric2p5DLighting` to execute `computePhotometricAnalysis` once per invocation and feed the result into `executePhotometricPipeline` via `precomputedAnalysis`; the optimization remains entirely local without exposing unnecessary external injection surfaces.
  - Resolved canonical HIGH finding H6: the affected photometric render path reuses one content-aware analysis instead of recomputing the same full analysis twice, while retaining the separate specular silhouette cushion.
  - Added optional `precomputedData` buffer threading to `computePhotometricAnalysis` and `executePhotometricPipeline`, reducing `getImageData` canvas read allocations from 3 to 1 per parametric lighting pass.
  - Verified across 13 regression tests in `tests/photometricPipelineDeduplication.test.ts` proving call-count reduction from 2 to 1 on character branch, exact 100% byte-identical pixel equivalence with legacy output across matte and metallic materials, non-character orb/prop behavior preservation, empty/small input durability, specular mask feature exclusion, bit-for-bit mask equivalence across fixtures and azimuths, cavity parameter invariance, and buffer length safety.

### Redo Eviction Process-Replay Baseline Synchronization (Phase 70 / H4 Hardening)
- **Unified Eviction Loop & Replay Baseline Synchronization (`src/lib/engine/historyEngine.ts`, `tests/processReplayEviction.test.ts`)**:
  - Unified the history engine eviction loop by extracting private `evictUntilWithinBudget(incomingBytes)` shared between `push()` and `redo()`. Redo-triggered byte-budget eviction now folds every permanently evicted oldest undo entry into the Process Replay baseline via `updateBaselineFromEvicted(evicted)`. The shared eviction helper also preserves the existing depth-cap behavior used by `push()`; normal undo→redo flow has a free depth slot and does not trigger depth eviction.
  - Resolved canonical HIGH finding H4: eliminated silent baseline desynchronization where redo-triggered evictions discarded the oldest entries without advancing the Process Replay baseline, which previously resulted in corrupted speedpaint playback starting from stale or missing frames.
  - Verified across 10 comprehensive eviction and process replay unit tests in `tests/processReplayEviction.test.ts` (+8 new tests: pixel step redo eviction, sequential push-then-redo baseline advancement, structural step redo eviction, multi-entry redo batch eviction, within-budget non-mutation, full `convertHistoryToRawFrames` ground truth reconstruction, depth capacity invariance across undo $\rightarrow$ redo under zero byte pressure, and no-double-folding across push-eviction $\rightarrow$ undo $\rightarrow$ redo-eviction sequences).

### Animated Exporters Output Safety Ceilings (Phase 69 / H3 Hardening)
- **Universal Animated Export Geometry Preflight & Ceilings (`src/lib/export/exportGeometryValidation.ts`, `src/lib/canvas/scaleCanvas.ts`, `src/lib/export/gifEncoder.ts`, `src/lib/export/apngEncoder.ts`, `src/lib/export/mp4Encoder.ts`, `src/lib/export/webmEncoder.ts`, `src/components/modals/ExportModal.tsx`, `src/components/modals/export/AnimatedExportTab.tsx`, `src/config/canvasLimits.ts`, `tests/animatedExportSafety.test.ts`)**:
  - Implemented centralized `validateExportGeometry` enforcing PixiBun configured safety boundaries `MAX_SAFE_CANVAS_DIMENSION` (4096 px), `MAX_SAFE_CANVAS_PIXELS` (16,777,216 px), and format-specific aggregate source pixel budget (`MAX_EXPORT_AGGREGATE_PIXELS` = 67,108,864 aggregate pixels = 256 MiB of raw RGBA at 4 bytes/pixel) for animated image exports retaining uncompressed frames (GIF, APNG), bounding raw-frame export workloads to reduce OOM risk.
  - Enforced pre-compositing envelope validation in `src/components/modals/ExportModal.tsx` across GIF, APNG, MP4, WebM, and cycle loop workflows: pre-evaluates output dimensions and aggregate memory, aborts before frame extraction/compositing with user-facing error toasts (`pixibun:toast`), and logs errors without uncaught rejections.
  - Hardened `src/components/modals/export/AnimatedExportTab.tsx` with dynamic format-specific scale button disabling, safety tooltips, and explicit safety warning banners preventing silent resolution downgrades.
  - Added low-level defense-in-depth safety checks in `src/lib/canvas/scaleCanvas.ts`, `src/lib/export/gifEncoder.ts`, `src/lib/export/apngEncoder.ts`, `src/lib/export/mp4Encoder.ts`, and `src/lib/export/webmEncoder.ts`, throwing descriptive `RangeError` before allocating canvases, workers, or encoders.
  - Verified across 18 unit tests in `tests/animatedExportSafety.test.ts` covering individual dimensions, total area, boundary conditions (4096 px vs 4097 px), aggregate memory ceilings, format-specific scale UI semantics, scale factor multiplication, explicit UI warning banner, and encoder aborts.

### Sprite-Sheet Export Output Ceilings (Phase 68 / H2 Hardening)
- **Sprite-Sheet Geometry Preflight & Dimension Ceilings (`src/lib/export/spriteSheetPacker.ts`, `src/components/modals/ExportModal.tsx`, `src/config/canvasLimits.ts`, `tests/spriteSheetSafety.test.ts`)**:
  - Implemented `calculateSpriteSheetGeometry` and `validateExportGeometry` enforcing authoritative `MAX_SAFE_CANVAS_DIMENSION` (4096 px) and `MAX_SAFE_CANVAS_PIXELS` (16,777,216 px) from `src/config/canvasLimits.ts`.
  - Enforced pre-compositing envelope validation in `src/components/modals/ExportModal.tsx`: pre-calculates sheet geometry and aborts with user-facing error toast before compositing frames or allocating canvas resources.
  - Enforced defense-in-depth runtime ceiling checks in `packSpriteSheet`, throwing descriptive `RangeError` before calling `document.createElement('canvas')`.
  - Verified across 11 unit tests in `tests/spriteSheetSafety.test.ts` covering horizontal, vertical, grid layouts, area ceilings, padding thresholds, boundary conditions (4096 px vs 4097 px), and preflight early-rejection.

### Workspace Envelope Hardening, Forensic Diagnosis, Recovery Ledger & Streaming ZIP32 Core (Phase 67 / Phase 1A & Phase 1B)
- **Workspace Envelope Enforcement & Decoupled Import (`src/lib/project/workspaceEnvelopeGuard.ts`, `src/lib/project/imageImportExecution.ts`, `src/lib/project/schema.ts`, `src/lib/project/resourceBudget.ts`, `src/lib/engine/structuralHistory.ts`, `src/hooks/studio/useStudioAutosave.ts`, `src/components/layout/StudioLayout.tsx`, `src/hooks/viewport/events/usePhotometricEvents.ts`, `src/hooks/viewport/useViewportDrawing.ts`, `src/hooks/viewport/useViewportStudioEvents.ts`, `tests/phase1AEnvelopeEnforcement.test.ts`)**:
  - Implemented `WorkspaceEnvelopeGuard` pre-evaluating canvas resize dimensions, layer creation, and frame duplication against 64 Mpx / 2,000 layer ceilings.
  - Decoupled external raster image import execution from domain controllers.
  - Verified non-fatal envelope rejection and rollback preservation across 36 focused unit tests (`tests/phase1AEnvelopeEnforcement.test.ts`).
- **Policy-Driven Project Validation & Metadata Classifier (`src/lib/project/schema.ts`, `src/lib/safety/safeJson.ts`, `src/lib/recovery/recoveryClassifier.ts`, `src/lib/recovery/recoveryLimits.ts`, `src/lib/recovery/recoveryTypes.ts`, `tests/recoveryClassifier.test.ts`)**:
  - Unified schema validation engine with entry points `validateProjectWithPolicy`, `validateProjectJsonWithPolicy`, and `validateProjectFile` supporting envelope modes `'strict'` and `'collect-recoverable'` with 100% backward compatibility.
  - Hardened `SafeJson.parse` in `src/lib/safety/safeJson.ts` enforcing a 50 MB payload ceiling (`50 * 1024 * 1024` bytes), recursion depth ceiling ($\le 32$), prototype-pollution key stripping, and typed errors (`SafeJsonPayloadLimitError`, `SafeJsonNestingDepthError`, `SafeJsonTraversalLimitError`, `SafeJsonOptionError`, `SafeJsonSyntaxError`). The recovery classifier passes `RECOVERY_INSPECTION_CEILINGS.MAX_METADATA_NODES` (50,000 nodes) to `validateProjectJsonWithPolicy`.
  - Built typed project metadata classifier categorizing documents into `valid`, `recoverable-envelope-exceeded`, `malformed`, `unsupported-version`, and `unsafe-content`.
  - Verified across 32 unit tests (`tests/recoveryClassifier.test.ts`).
- **Recovery Ledger & Bounded Stored-Blob Diagnosis (`src/lib/storage/db.ts`, `src/lib/recovery/recoveryLedger.ts`, `src/lib/recovery/recoveryDiagnosis.ts`, `tests/recoveryDiagnosisAndLedger.test.ts`)**:
  - Migrated Dexie schema to v5 with dedicated `recoveryRecords` table (`projectId, classificationState, lastConfirmedAt`) with `projectId` primary key.
  - Implemented multi-table atomic rollback across `projects`, `layerBlobs`, and `recoveryRecords` in `deleteProject`.
  - Built non-destructive stored-project assessment engine (`assessStoredProject` in `src/lib/recovery/recoveryDiagnosis.ts`) scanning the complete compound-index keyspace `[projectId+id]` on `layerBlobs` via keyset batch pagination.
  - Probed 24-byte Blob slices with `ImageHeaderProbe` without allocating canvas bitmaps; ordinary zero-blob layers are valid transparent layers; diagnoses corrupted PNG headers, dimension mismatches, duplicate blob mappings, orphan blob records, embedded raster fields, and storage-record corruption.
  - Verified across 24 unit tests (`tests/recoveryDiagnosisAndLedger.test.ts`).
- **Streaming Store-Only ZIP32 Archive Core (`src/lib/recovery/zipWriter.ts`, `tests/recoveryZipWriter.test.ts`)**:
  - Built zero-dependency streaming PKZIP 2.0 / ZIP32 archive writer in pure TypeScript (`writeStoreOnlyZip`) serving as a low-level archive foundation.
  - Store-only uncompressed chunks streamed directly to consumer sink in bounded 64 KiB chunks with $O(1)$ payload memory relative to payload size, and $O(\text{entry count})$ bookkeeping capped at 65,535 entries.
  - Bit 3 + Bit 11 data descriptor framing (`0x0808` flags, 16-byte signed descriptor) for single-pass CRC-32 and size calculation.
  - Preflight immutable snapshotting and array stabilization: shallow-copies `entrySources` before evaluating entry getters, evaluates and binds `sink.write` exactly once, and validates paths against traversal, leading slashes, drive letters, backslashes, NUL bytes, and lone UTF-16 surrogates.
  - Responsive cancellation via `AbortSignal` with genuine `DOMException('AbortError')`.
  - Verified across 40 unit tests (`tests/recoveryZipWriter.test.ts`) with independent bitwise CRC-32 and ZIP structure parser (zero external or Python dependencies).
- **Untouched Recovery Archive Assembly & Safe Export Adapters (`src/lib/recovery/recoveryBackup.ts`, `src/lib/recovery/recoveryBackupTransport.ts`, `src/lib/recovery/recoveryTypes.ts`, `src/lib/recovery/recoveryLimits.ts`, `tests/recoveryBackup.test.ts`)**:
  - Built read-only immutable archive snapshotting executing a single read-only IndexedDB transaction across `projects`, `layerBlobs`, and `recoveryRecords` without database mutations or raster decodes.
  - Bounded full-compound-keyspace blob enumeration querying `[projectId, Dexie.minKey]` through `[projectId, Dexie.maxKey]` with `.limit(MAX_INSPECTABLE_STORED_BLOBS + 1)` via `.toArray()` to fail closed on oversized storage.
  - Preserves untouched `dataJson` as exact WHATWG UTF-8 bytes without JSON parsing or modification.
  - Generates closed-schema recovery manifest (`recovery-manifest.json`) and precomputes exact ZIP32 size before streaming.
  - Sealed non-forgeable trust boundary via module-private `WeakSet` (`trustedPreparedArchives`) and `WeakMap` (`preparedArchiveInternals`), exposing strictly scalar descriptors (`PreparedBlobDescriptor`) without public Blob or buffer handles.
  - Supports multi-pass manifest reusability via fresh byte copies on each stream open.
  - Protected post-open file-handle lifecycle (`writeRecoveryArchiveToFileHandle`) with immediate `abort()` capture, best-effort abort on failure without masking primary errors, and strict avoidance of post-abort `close()`.
  - Bounded in-memory Blob fallback (`createRecoveryArchiveBlob`) with preflight 250 MiB ceiling, defensive chunk copying (`chunk.slice()`), and release of retained chunk references on error or cancellation.
  - Responsive cooperative cancellation via `AbortSignal` throwing genuine `DOMException('AbortError')`.
  - Verified across 42 unit tests (`tests/recoveryBackup.test.ts`).
- **Deterministic Recovery Plan Builder & Safe Candidate Reconstruction (`src/lib/recovery/recoveryPlanBuilder.ts`, `src/lib/recovery/recoveryTypes.ts`, `src/lib/recovery/recoveryLimits.ts`, `tests/recoveryPlanBuilder.test.ts`)**:
  - Implemented pure domain plan builder (`buildRecoveryPlan`) synthesizing diagnostic assessments and authoritative source records into deterministic candidate reconstruction plans without IndexedDB mutations or UI dependencies.
  - Defined typed recovery plan result states: `ready`, `additional-deletion-required`, `clip-consent-required`, `unrecoverable-blocked`, and `cancelled`.
  - Supported explicit decisions (`deleteFrameIndices`, `deleteLayerIds`, `clipConsentGranted`) with bounded indexed array snapshots, rejecting out-of-bounds, duplicate, or non-existent layer/frame deletions.
  - Enforced preflight snapshot isolation: synchronous structural validation of source projects via `validateProjectWithPolicy({ envelopeMode: 'collect-recoverable' })` before asynchronous work, capturing internal record snapshots (`InternalRecoverySourceBlob`) decoupled from caller references.
  - Enforced single-evaluation runtime boundaries: assessment scalar and project fields, decision properties, source record fields, and `blob.size`/`blob.type` are evaluated exactly once into local variables, preventing accessor/Proxy mutation attacks.
  - Implemented bounded indexed snapshots for all caller-controlled arrays (`sourceBlobs`, `deleteFrameIndices`, `deleteLayerIds`) capturing `.length` once, validating bounds, comparing `sourceBlobs.length === safeScannedBlobsCount` prior to element indexing, and reading numeric indices `[i]` directly without ever accessing or invoking `Symbol.iterator`, `values()`, `Array.from()`, or spread syntax.
  - Probed 24-byte Blob slices (`Blob.prototype.slice.call(blob, 0, 24)`) with `ImageHeaderProbe` validating PNG format and dimensions matching project bounds without canvas bitmap allocation, `createImageBitmap`, or raster decoding.
  - Preserved exact `Blob.type` string identities (including empty string and custom MIME types) and byte sizes in `CandidateBlobRemapEntry`.
  - Remapped blobs deterministically by ascending record ID and exclusions by ascending ID; excluded deleted-layer and orphan blobs; preserved transparent layers with zero Blobs.
  - Enforced clip remapping invariants: detected clips intersecting deleted frames, blocked for explicit consent (`clip-consent-required`) when consent is false, and locked surviving clips to surviving frame offsets when consent is granted.
  - Blocked all-frame deletions fail-closed with `ALL_FRAMES_DELETED` before probing or clip evaluation.
  - Provided responsive cancellation: pre-aborted signal checks at immediate function entry; pending probe race priority returns `cancelled` even if probe fails concurrently.
  - Guaranteed runtime immutability by deep-freezing all candidate result trees, project structures, and remap entries via `deepFreeze()`.
  - Verified across 43 unit tests (`tests/recoveryPlanBuilder.test.ts`).
- **Trusted Recovery Orchestration & Atomic Recovered-Copy Persistence (`src/lib/recovery/recoveryOrchestrator.ts`, `tests/recoveryOrchestrator.test.ts`, `tests/e2e/recoveryTransactionLiveness.spec.ts`)**:
  - Implemented trusted plan execution in `recoveryOrchestrator.ts` computing dual SHA-256 binary fingerprints (`sourceContentFingerprint` and `commitPreimageFingerprint`) to protect against TOCTOU mutation races.
  - Enforced single-use token branding via module-private `WeakMap` (`TOKEN_ALREADY_CONSUMED`) and atomic IndexedDB multi-table commit persisting recovered copy under a fresh project ID while preserving damaged source records untouched.
  - Verified across 37 unit tests (`tests/recoveryOrchestrator.test.ts`) and 5 Chromium transaction liveness tests (`tests/e2e/recoveryTransactionLiveness.spec.ts`).
- **Startup Recovery Routing & Controlled Hydration (`src/lib/recovery/projectAdmission.ts`, `src/lib/project/serialize.ts`, `src/hooks/studio/useStudioAutosave.ts`, `tests/projectAdmission.test.ts`, `tests/startupRecoveryRouting.test.tsx`, `tests/e2e/startupRecoveryRouting.spec.ts`)**:
  - Implemented authoritative admission boundary (`inspectAndAdmitStoredProject`) combining snapshot acquisition, blob diagnosis, and schema validation before hydration.
  - Established single reactive lifecycle state machine (`RestoreLifecycleState`) with synchronous ref mirror and request epoch tracking, suspending autosave during non-active phases and guarding against stale opens.
  - Built two-phase consistent rollback in `hydrateProject` preventing split-brain workspace states upon store or buffer publication failures.
  - Verified across 20 admission tests (`tests/projectAdmission.test.ts`), 12 routing tests (`tests/startupRecoveryRouting.test.tsx`), and 4 Chromium E2E tests (`tests/e2e/startupRecoveryRouting.spec.ts`).
- **Recovery UI, Safe Modes & Repair Wizard (`src/components/modals/RecoveryModal.tsx`, `src/components/layout/StudioLayout.tsx`, `src/hooks/studio/useStudioAutosave.ts`, `tests/recoveryUIAndRouting.test.tsx`, `tests/e2e/recoveryUIFlow.spec.ts`)**:
  - Implemented accessible `RecoveryModal` dialog and non-destructive Repair Wizard with live diagnostic inspector, interactive frame/layer omission, and clip-consent resolution.
  - Integrated safe-mode routing in `StudioLayout.tsx` and `useStudioAutosave.ts`: damaged source records are never opened writable, and autosave is suspended against damaged source IDs via synchronous custody ref locking.
  - Built strict post-commit validation ordering: `clearPendingRecovery()` executes strictly after the recovered copy has passed admission, completed hydration, and published as the active workspace. If admission or hydration fails, the safe active workspace is preserved, the pending recovery token is retained, and the modal displays the failure.
  - Preserved pending recovery routing across page reloads via bounded session storage key (`pixibun:pending-recovery-source`).
  - Supported one-click untouched backup archive export (`downloadArchiveBlob` / `exportArchiveToFileHandle`) at all recovery stages.
  - Verified across 19 unit/component tests (`tests/recoveryUIAndRouting.test.tsx`) and 3 real Chromium Playwright E2E tests (`tests/e2e/recoveryUIFlow.spec.ts`).

### System Hardening & Production Polish (Phase 66 / Phase C)
- **Service Worker Lifecycle & Precache Scripts (`src/app/sw.js/route.ts`, `src/components/system/ServiceWorkerRegistrar.tsx`, `src/components/system/PwaUpdateToast.tsx`, `tests/components/ServiceWorkerRegistrar.test.tsx`, `tests/swLifecycle.test.ts`)**:
  - Validated ServiceWorkerRegistrar component rendering, accessible dismiss, SKIP_WAITING propagation, and controllerchange reload orchestration.
  - Verified byte-distinct script generation and distinct cache versioning across release identifiers (`tests/swLifecycle.test.ts`).
  - Real two-build browser service-worker update discovery: NOT TESTED / deferred.
- **Out-of-Scope Feature Segregation (Deferred to v1.15)**:
  - Reverted and deferred to v1.15: capacitive palm rejection, pen eraser inversion, stylus pressure modulation (reverted pointerErgonomics helper, `src/hooks/viewport/useBrushPointerHandler.ts`, `src/hooks/viewport/useViewportPointerEvents.ts`), and Smart Effect schema parameter clamping (`src/lib/project/schema.ts`).
- **WCAG 2.2 AA Theme Contrast Hardening (`src/app/globals.css`, `src/components/layout/BottomTimeline.tsx`, `src/components/modals/export/ExportScopeSelector.tsx`, `tests/themeContrast.test.ts`)**:
  - Programmatic token contrast audit across all 4 themes distinguishing normal text ($\ge 4.5:1$), large text ($\ge 3.0:1$), and non-text UI components ($\ge 3.0:1$).
  - Adjusted Atelier Dark `--text-muted` from `#8e8499` to `#968ca2` ($\ge 4.70:1$ on raised surface).
  - Adjusted Atelier Light and Cozy Classic Light `--text-muted` to `#685179` ($\ge 4.71:1$ on recessed `--surface-0` containers, $\ge 5.47:1$ across all light surfaces).
  - Replaced hardcoded `#181124` select dropdown background in `ExportScopeSelector.tsx` with semantic token `bg-[var(--surface-0)]`.
  - Removed artificial `/80` opacity reduction on timeline frame duration text in `BottomTimeline.tsx`.
- **Four-Theme Rendered Browser Accessibility (`tests/e2e/themeAccessibility.spec.ts`)**:
  - Implemented 20 automated Axe-core Playwright scans covering Studio shell, blank canvas, Right Inspector tabs, Export modal, Projects Gallery modal, and toast alerts across Atelier Dark, Atelier Light, Cozy Classic Dark, and Cozy Classic Light.
  - Verified 0 critical and 0 serious accessibility violations across all 20 theme scenarios.
- **Modal Accessibility & Background Isolation (`src/components/ui/ModalWrapper.tsx`, `tests/components/ModalWrapper.test.tsx`)**:
  - Migrated static modal title and body IDs to dynamic `React.useId()` instances (`modal-title-${safeId}`, `modal-body-${safeId}`).
  - Added stacked modal unit test proving independent, non-colliding DOM IDs when multiple dialogs mount concurrently.
  - Ensured native `<dialog showModal()>` enforces top-layer inert document background isolation.
- **Runtime Standardization, Security Gating & CI Verification (`package.json`, `.nvmrc`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `lighthouserc.json`, `vitest.config.mjs`, `src/app/api/diagnostics/relay/route.ts`, `src/lib/storage/db.ts`, `src/stores/studioStore.ts`, `SECURITY.md`)**:
  - Standardized runtime on Node 22 (`22.14.0`) in `.nvmrc` and `package.json` engines (`node >=22.0.0 <23.0.0`).
  - Adopted canonical GitHub Actions CI/CD (`.github/workflows/ci.yml`), pinning release tools (`vercel@50.34.0`, `@lhci/cli@0.15.1`) without floating `@latest` in credentialed steps.
  - Executed automated Lighthouse CI against production server mode (`npm run start`): 100% passing across `/` and `/studio` (Performance: 97–99, Accessibility: 96–100, Best Practices: 100, SEO: 100).
  - Measured live Vitest code coverage (63.24% statements, 52.34% branches, 59.25% functions, 63.88% lines) and configured calibrated regression floor (60/50/55/60) in `vitest.config.mjs`.
  - Hardened diagnostics relay with origin validation (`isValidOrigin()`) and documented the complete reverse proxy / rate-limit threat model in `SECURITY.md`.
  - Gated `window.__pixibunDb` and `window.__studioStore` attachments to development and localhost test environments only.
  - Audited legacy PixiBud state (`aiMessages` confirmed write-only, `isAiThinking` confirmed dead state).
  - Removed unused dependency `sharp` and unpinned transitive CLI packages; verified 0 security vulnerabilities in `npm audit`.

### Runtime Performance, Offline Reliability, Persistence & History (Phase 65 / Phase B)
- **Bidirectional Structural History Inversion & Hard Byte Budget (`src/lib/engine/historyEngine.ts`, `src/lib/engine/structuralHistory.ts`, `src/types/canvas.ts`, `src/stores/slices/createLayerSlice.ts`, `src/stores/slices/createAnimationSlice.ts`, `src/components/modals/export/ReplayExportTab.tsx`, `tests/historyEngineStructural.test.ts`, `tests/processReplayExport.test.ts`)**:
  - Replaced whole-project structural history snapshotting with minimal, bidirectional structural inversion deltas (`StructuralHistoryDelta`). Layer renames, visibility toggles, opacity changes, blend mode updates, layer reorders, additions, and deletions store only the inverse operation rather than cloning the entire project tree, scaling at $O(\text{affected state})$, rather than $O(\text{total project state})$.
  - Implemented hard memory budgeting (`HistoryMemoryBudget`): Undo history is strictly bounded to 64 MiB / 50 entries. The replay baseline is separately bounded by current project raster complexity and does not grow with session duration. Eviction accounting tracks `evictedEntriesCount` and `evictedBytesTotal`.
  - Defined explicit oversized-entry semantics: structural payloads are minimized first; if an entry still exceeds `maxBytes`, it is rejected rather than silently allocating an arbitrarily large undo snapshot.
  - Preserved Process Replay compatibility (`src/components/modals/export/ReplayExportTab.tsx`): action-log replay rebuilds canvas states step-by-step from retained stroke snapshots within the memory-budgeted history buffer.
- **Project-Scoped Revision Tracking & Atomic Incremental Autosave (`src/lib/project/persistenceRevisions.ts`, `src/lib/project/serialize.ts`, `src/lib/storage/db.ts`, `src/lib/engine/bufferRegistry.ts`, `src/hooks/studio/useStudioAutosave.ts`, `tests/auditPersistence.test.ts`, `tests/incrementalRoundtripMatrix.test.ts`)**:
  - Replaced ad-hoc autosave dirty flags with monotonic per-layer revision counters (`Layer.revision`, `Project.metadataRevision`) managed via pure, project-scoped tracker utilities (`ProjectRevisionTracker`). Avoided global module state so multiple projects can be tested or loaded concurrently.
  - Unified incremental autosave inside a single atomic Dexie `readwrite` transaction across both `projects` and `layerBlobs` tables. Clean revisions commit only after the transaction succeeds; in-flight edits ($R \to R+1$) and failed transactions safely leave layers dirty for subsequent save retries.
  - Layer revisions advance only on user-initiated edits, layer structural changes, or non-destructive recipe mutations, eliminating wasteful re-encoding of pristine layers. Verified across a 12-mutation round-trip matrix (`tests/incrementalRoundtripMatrix.test.ts`).
- **Zustand Render Isolation & Stable Studio Selectors (`src/components/layout/StudioLayout.tsx`, `src/components/layout/AtelierRail.tsx`, `src/components/layout/BottomTimeline.tsx`, `src/components/studio/RadialContextMenu.tsx`, `src/components/onboarding/ArtisanHandbookPanel.tsx`, `src/components/studio/FloatingPreviewWindow.tsx`, `src/hooks/studio/useStudioKeyboard.ts`)**:
  - Replaced monolithic `useStudioStore()` full-store subscriptions across primary studio chrome components with granular, leaf-level selectors.
  - Converted `useStudioKeyboard.ts` to access live state imperatively via `getState()` with a stable `optionsRef`, eliminating window event listener churn and stale closure traps.
  - Isolated viewport cursor position, tool parameters, timeline scrubbing, and preview updates so that canvas drawing operations no longer trigger root-level studio re-renders (measured in `tests/viewportInterruptionAndIsolation.test.tsx`).
- **Gesture Interruption Safety & Capture Cleanup (`src/hooks/viewport/useViewportPointerEvents.ts`, `src/components/layout/CenterViewport.tsx`, `tests/viewportInterruptionAndIsolation.test.tsx`)**:
  - Added robust handlers for `pointercancel`, `lostpointercapture`, window `blur` (Alt-tabbing away during an active drag), and document `visibilitychange` (switching tabs).
  - Ensures in-flight drawing gestures cleanly finalize without leaving dangling pointer capture, orphan strokes, or corrupted history stacks.
- **rAF Composite Coalescing & Error Notification Bridge (`src/components/layout/CenterViewport.tsx`, `src/hooks/viewport/events/useArtisanEvents.ts`, `src/hooks/viewport/events/usePhotometricEvents.ts`)**:
  - Implemented self-cleaning `requestAnimationFrame` coalescing for `pixibun:request-composite` custom events, preventing redundant composite passes when rapid drawing or tool switching dispatches multiple requests within a single frame tick.
  - Bridged procedural engine error notifications from `useArtisanEvents.ts` and `usePhotometricEvents.ts` to the studio toast system via `pixibun:toast` with `type: 'error'` while preserving AI chat log history.
- **Photometric Interaction Benchmarking (`src/lib/ai/math/photometricLighting.ts`, `tests/photometricPerformance.test.ts`)**:
  - Photometric compute kernel measured $\le 9.95\text{ ms}$ in the Vitest test runtime at $512\times512$ ($1.38\text{ ms}$ at $128\times128$, $2.42\text{ ms}$ at $256\times256$); browser end-to-end frame rate not measured.
- **Deterministic Build-Versioned Service Worker & Real Offline Resilience (`src/app/sw.js/route.ts`, `tests/e2e/offline.spec.ts`, `tests/e2e/pwa.spec.ts`, `tests/serviceWorkerRoute.test.ts`)**:
  - Derived deterministic `SW_CACHE_VERSION` in `next.config.ts` from `package.json` version and git commit hash (e.g., `v1.14.1-1d4c3b8`), eliminating static `'prod'` cache name collisions and ensuring predictable client cache invalidation on new deployments.
  - Added `'/theme.js'` to `PRECACHE_ASSETS` in `src/app/sw.js/route.ts` and protected it from LRU cache eviction.
  - Constrained cache deletion on service worker `activate` strictly to `key.startsWith('pixibun-') && key !== CACHE_NAME`.
  - Implemented real browser-network offline E2E test in `tests/e2e/offline.spec.ts` using Playwright's `context.setOffline(true)`. Verified warm navigation, offline hard refresh, canvas drawing, undo/redo, autosave persistence to IndexedDB, and subsequent offline reload restoration.
  - Real two-build browser service-worker update discovery: NOT TESTED / deferred.

### Integrity, Recovery & Resource Safety (Phase 64 / Phase A)
- **Neutral Import Domain Contracts (`src/types/import.ts`, `src/components/modals/ImportModal.tsx`, `src/lib/project/importFile.ts`, `src/components/layout/StudioLayout.tsx`, `tests/components/ImportModal.test.tsx`)**:
  - Decoupled the domain file-import pipeline from UI modal components. Previously, `src/lib/project/importFile.ts` imported its admission type `ImportPayload` directly from the React component `src/components/modals/ImportModal.tsx`. Extracted neutral domain contracts `ImportPayload` and `ImageImportConfirmPayload` into `src/types/import.ts`, eliminating the inverted domain-to-presentation dependency.
- **Initial Conservative Resource Envelope (`src/config/canvasLimits.ts`, `src/lib/project/resourceBudget.ts`, `src/types/project.ts`, `src/lib/project/schema.ts`, `src/lib/sync/p2pSync.ts`, `tests/resourceBudget.test.ts`, `tests/crossBoundaryEnvelope.test.ts`)**:
  - Established an initial project-complexity validation envelope capped at `MAX_PROJECT_AGGREGATE_PIXELS = 67_108_864` ($64\text{ Mpx} = 256\text{ MiB}$ base raw RGBA raster representation: $\text{materializableRasterPixels} = \text{totalLayers} \times \text{width} \times \text{height}$, $\text{baseRawRgbaBytes} = \text{materializableRasterPixels} \times 4$) and `MAX_PROJECT_TOTAL_LAYERS = 2000`.
  - Treated this envelope explicitly as an initial validation ceiling to reject abusive, corrupt, or runaway payloads upon intake and sync, rather than a proven runtime memory-safe or OOM-safe ceiling (noting that whole-project history snapshotting is slated for delta redesign in Phase B).
  - Enforced resource envelope validation across schema parsing, project import decoding, and P2P co-draw structure sync.
- **Canonical Project Domain Decoder (`src/lib/project/decodeProject.ts`, `src/hooks/studio/useStudioAutosave.ts`, `src/lib/project/importFile.ts`, `tests/historicalFixtures.test.ts`)**:
  - Centralized project file intake through `decodeAndValidateProject`, executing safe prototype-poisoning-free parsing, schema validation, schema migration, and resource envelope budgeting.
  - Polymorphically supports both raw JSON strings (IndexedDB storage) and pre-parsed JSON objects (file import payload).
- **Atomic Dexie Storage Operations (`src/lib/storage/db.ts`, `tests/auditPersistence.test.ts`)**:
  - Re-architected `deleteProject`, `renameProject`, and `duplicateProject` to execute within atomic Dexie `readwrite` transactions across `projects` and `layerBlobs` tables.
  - Eliminated orphaned layer blob residue and metadata-only mutations.
- **Storage Unavailability Distinction in Gallery (`src/lib/storage/db.ts`, `src/components/modals/ProjectsGalleryModal.tsx`)**:
  - Upgraded `listAllProjects()` to ensure the database connection opens and surfaces underlying storage failures rather than silently returning an empty array (`[]`).
  - Added visual error alert banner in `ProjectsGalleryModal` distinguishing storage access failures from legitimate empty project workspaces.
- **Lazy Canvas Buffer Allocation (`src/lib/project/serialize.ts`, `src/lib/render/compositor.ts`, `tests/auditPersistence.test.ts`)**:
  - Hardened `hydrateProject` to allocate 2D canvas backing store buffers only for layers backed by stored pixel blobs, plus the active drawing layer of the initial frame.
  - Updated `compositeFrame` (`src/lib/render/compositor.ts`) to treat unallocated layers as transparent without triggering eager allocation, preserving lazy buffers until explicit user edits occur.
  - Reduced memory footprint during multi-frame and multi-layer project restores.
- **Safe Boot Restore & Corrupt Document Preservation (`src/hooks/studio/useStudioAutosave.ts`, `tests/auditAutosave.test.tsx`, `tests/auditPersistence.test.ts`)**:
  - Hardened boot-time restore sequence: when a stored project fails JSON parsing, schema validation, or resource envelope checks, the corrupt record in IndexedDB and its layer blobs are preserved unmodified for manual recovery.
  - Replaced corrupted state by instantiating a fresh workspace under a newly generated project ID (`resetToNewProject()`), recording failure markers to prevent autosave overwrites, and alerting the user via toast notifications.
  - Upgraded `runAutosave()` to return a typed `Promise<SaveResult>`.
- **Worker Dispatcher Resiliency & Timeout Lifecycle (`src/lib/engine/workerDispatcher.ts`, `tests/workerDispatcher.test.ts`)**:
  - Added configurable 10-second request timeout (`timeoutMs: 10_000`) and individual request abort cancellation via `AbortSignal`. Late-arriving responses for aborted requests are safely discarded without resolving promises or crashing the worker.
  - Implemented fatal crash and timeout recovery (`terminateWorkerAndRejectAll`), cleanly terminating unresponsive web workers, rejecting pending callbacks, and permitting fresh re-instantiation on subsequent tasks.
- **Unified Alert & Import Toast Presentation (`src/lib/events/studioEvents.ts`, `src/lib/project/importFile.ts`, `src/components/layout/StudioLayout.tsx`, `tests/components/ImportModal.test.tsx`)**:
  - Replaced native blocking `window.alert()` in import handlers with custom `'pixibun:toast'` events.
  - Unified toast delivery in `StudioLayout` using accessible bottom banner toasts with `role="alert"` for errors and `role="status"` for operational confirmations.
- **Historical Fixture Suite & Backward Compatibility (`tests/fixtures/project-v1.13.json`, `tests/fixtures/project-v1.14.0.json`, `tests/historicalFixtures.test.ts`)**:
  - Added verified historical fixtures for schema v2 (`v1.13`) and schema v3 (`v1.14.0` with layer effect recipes).
  - Built regression suite validating schema migrations, layer recipe preservation, round-trip serialization, and resource envelope limits.

## [v1.14.0] - 2026-09-20
### Neutral Relighting & Smart-Effect Provenance (Phase 63)
- **Neutral 2.5D Silhouette & Macro-Detail Shading (`src/lib/ai/math/edtNormalMap.ts`)**:
  - Superseded Phase 61's fixed anatomical height priors with neutral macro-form and multi-scale material detail ($H_{\text{composite}} = 0.70 H_{\text{macro}} + 0.30 H_{\text{micro}}$ for characters). The 2.5D surface normal field $\mathbf{N}$ is now geometrically neutral, allowing directional tones, cel terminator boundaries, and highlights to dynamically track the virtual light source $\mathbf{L}$ across $360^\circ$ azimuth and $0^\circ-90^\circ$ elevation without baked-in distortion.
- **Source Shading Normalization & Painted Shading Removal (`src/lib/ai/math/photometricLighting.ts`, `src/lib/ai/math/edtNormalMap.ts`)**:
  - Added tactile `sourceShadingRemoval` slider ($0\% - 100\%$, default $0\%$) in `PhotometricLightingSection`, conservatively reducing directional value bands already painted into color ramps before relighting while strictly preserving authored palette families.
  - Upgraded interior ink line detection in `edtNormalMap.ts` to require two-sided opposing luminance dips ($(\text{neighbor}_{\text{opposing}} - \text{lum}) \ge 0.12$), preventing one-sided painted shadow edges from being carved as permanent ink crevices.
  - Upgraded connected-component flood-fill to recognize authored color ramps via hue and chroma distance ($\Delta\text{hue} \le 35^\circ, \Delta\text{chroma} \le 0.25$), uniting shaded regions into smooth geometric surfaces.
  - Stabilized directional cel shadow terminator calculation across brightness levels ($\text{shadowThresh} = \text{clamp}(0.46, 0.58, 0.52 - (\text{brightness} - 1.15) \times 0.04)$), preventing high exposure from flattening unlit sides.
- **Real-Time Analysis Readout & Form Overrides (`src/lib/ai/math/photometricAuto.ts`, `src/components/layout/inspector/PhotometricLightingSection.tsx`)**:
  - Upgraded `inferPhotometricSettings()` with smooth, continuous heuristic `directionalShadingCue` ($0-1$) and detailed human-readable rationale.
  - Built an interactive inspector analysis card listening to `pixibun:photometric-analysis` displaying detected form type, material, source light azimuth/elevation, directional shading cue strength (Weak / Medium / Strong), crevice AO percentage, and explanation.
  - Added tactile surface interpretation override button group: `[ Auto | Character | Prop | Orb ]` allowing artists to explicitly steer geometry reconstruction.
- **Non-Destructive Smart-Effect Recipe Model (`src/types/canvas.ts`, `src/types/project.ts`, `src/lib/project/schema.ts`, `src/lib/project/serialize.ts`)**:
  - Introduced `LayerEffectRecipe` across 11 smart-effect kinds (`photometric`, `auto-shade`, `cast-shadow`, `ground-shadow`, `volumetric-optics`, `normal-map`, `specular`, `sel-out`, `outline`, `autotile`, `wfc`).
  - Stores non-destructive recipe metadata (`id`, `kind`, `version: 1`, `sourceMode`, `params`, `analysis`, `updatedAt`) directly on `Layer.effect`.
  - Bumped project file schema to `PROJECT_FORMAT_VERSION = 3` with full forward and backward migration in `migrateProjectPayload` and `validateProjectFile`.
  - Atomically preserved and restored recipe metadata across pixel history snapshots (`PixelHistoryStep`), structural undo/redo, and layer duplication.
- **Layers Panel FX Provenance & Reopening (`src/components/layout/inspector/LayersPanel.tsx`)**:
  - Added amber `FX` provenance badge on generated output layers.
  - Added tactile `Edit FX` button on photometric layers, reopening the on-canvas pixel light bulb gizmo with the layer's saved recipe parameters for instant non-destructive tweaking.
- **Document Revision Autosave (`src/hooks/studio/useStudioAutosave.ts`, `src/stores/slices/createLayerSlice.ts`, `src/stores/slices/createViewportSlice.ts`)**:
  - Subscribed autosave engine to `state.editRevision` in addition to pixel history commits, guaranteeing that layer effect mutations, renames, reorders, and canvas dimension updates are automatically persisted to IndexedDB.
- **Unified Brand Geometry (`src/components/ui/PixiBunLogo.tsx`)**:
  - Built standalone responsive `PixiBunLogo` component (`sm`, `md`, `lg`) with Bun mascot tile and typography.
  - Standardized branding across `AtelierRail`, `PlaygroundLayout`, `LandingNav`, `AtelierHero`, `AtelierFooter`, `MobileStudioGate`, and error boundaries (`error.tsx`, `global-error.tsx`, `studio/error.tsx`).
- **Discrete 1/2/3 Shading Tones (Single / Dual / Trio Cel-Shading) (`src/lib/ai/math/photometricLighting.ts`, `src/types/tools.ts`, `src/components/layout/inspector/PhotometricLightingSection.tsx`, `src/components/studio/PixelLightBulbGizmo.tsx`)**:
  - Implemented 1 Single (1 shadow tone), 2 Dual (2 shadow tones: mid + deep), and 3 Trio (3 shadow tones: soft penumbra + mid + deep umbra) cel-shading band modes in perceptual OKLCH color space.
  - Enabled discrete cel-shading across all pixel art forms (orbs, characters, props) when shading bands mode is selected in the UI (`SHADE: 1 | 2 | 3` or `Shading Tones`), eliminating muddy 24-bit floating point gradients on pixel art while preserving smooth 3D shading when unbanded.
  - Added bottom HUD controls (`SHADE 1 | 2 | 3`) to the on-canvas `PixelLightBulbGizmo` and inspector segmented button group with accessible tooltips and test IDs.
- **Continuous 3D Specular Highlight Pill & Line-of-Sight Gating (`src/lib/ai/math/photometricLighting.ts`, `tests/orbPhotometricCelShading.test.ts`, `tests/pixiBudMath.test.ts`)**:
  - Restored continuous 3D Blinn-Phong specular highlight pill with smooth alpha falloff ($I_{\text{spec}} > 0.35, \alpha = \min(255, \text{round}(I_{\text{spec}} \times 255))$).
  - Derived specular normals from macro-silhouette dome (`specularNormalField`) using inflated EDT and bilateral filtering, eliminating vertical razor scars down cheeks and across ears caused by internal feature depth depressions.
  - Added physical line-of-sight gate ($N_{3D} \cdot L_{3D} > 0$) preventing specular highlights from appearing on unlit shadow hemispheres.
  - Shielded facial features (eyes, mouth) and line art/outlines (`charFeatureMask`, `charInkMask`, `isBlackOutline`) from receiving specular highlights.
  - Metallic materials (gold, metal) receive warm champagne/albedo-tinted highlights; dielectric materials receive pure white highlights.
- **Photometric Preview Session & Atomic Cancellation (`src/hooks/viewport/events/usePhotometricEvents.ts`, `tests/photometricPreviewSession.test.ts`)**:
  - Encapsulated live photometric preview in an atomic session lifecycle with non-blocking async rendering, drag throttling, and cancellation tokens (`cancelSession`), restoring original layer pixel buffers and metadata on `Escape` or gizmo dismissal.
- **Decomposed Viewport Studio Events (`src/hooks/viewport/events/usePhotometricEvents.ts`, `src/hooks/viewport/events/useArtisanEvents.ts`, `src/hooks/viewport/events/useGeometricEvents.ts`, `src/hooks/viewport/useViewportStudioEvents.ts`, `src/hooks/viewport/useViewportDrawing.ts`)**:
  - Modularized viewport pointer event dispatch into dedicated event hooks for photometric manipulation, artisan painting, and geometric vector primitives, completely decoupling viewport interaction from legacy header components.
- **Test Coverage Expansion**:
  - Added dedicated unit tests in `tests/photometricPreviewSession.test.ts` (preview cancellation and restoration) and expanded `tests/orbPhotometricCelShading.test.ts` (discrete 1, 2, and 3 cel-shading band modes and continuous 3D specular highlight validation).
  - Total test suite expanded to **699 unit and integration tests across 98 suites** and **22 E2E tests across 9 suites** (100% green).
- **Research-Grounded Product Roadmap**:
  - Published comprehensive roadmap in `docs/plans/research_grounded_product_roadmap.md` covering computer vision, intrinsic decomposition, rendering, animation, and local-first architecture.

### Studio Architecture Overhaul, Dual Themes & Audit Remediation (Phase 62)
- **Studio UI Architecture**:
  - AtelierRail (`src/components/layout/AtelierRail.tsx`): Unified top header rail replacing the former TopHeader + ContextOptionsBar. Houses project actions, zoom, tool params, CVD lens, symmetry, and AppearancePopover.
  - StatusBar (`src/components/layout/StatusBar.tsx`): Fixed bottom bar with live cursor coords, active tool, canvas dimensions, zoom %, frame/layer info, and embedded lo-fi radio.
  - CommandPaletteModal (`src/components/modals/CommandPaletteModal.tsx`): Fuzzy-search command launcher (`Ctrl+K`) for tools, view toggles, animation controls, project actions.
- **Design System Primitives (`src/components/ui/`)**:
  - `StudioSlider`, `StudioSelect`, `StudioToggle`, `StudioNumberInput`, `StudioTooltip`, `IconButton`, `PanelSection` — accessible, tactile controls standardizing all inspector panels.
- **Dual Studio Theme System**:
  - `themeStore` now supports dual-axis theming: `studioTheme` (`'atelier'` | `'cozy-classic'`) × `colorScheme` (`'dark'` | `'light'`).
  - AppearancePopover (`src/components/ui/AppearancePopover.tsx`): Consolidated theme/scheme switching with live preview.
  - Zero-lag transition suppression via synchronous DOM attribute + style injection.
- **Viewport Pointer Handler Decomposition**:
  - Extracted from monolithic `useViewportPointerEvents.ts` into 4 per-tool handlers:
    - `useBrushPointerHandler.ts` (pen, eraser, dither with Bresenham + pixel-perfect)
    - `useChiselPointerHandler.ts` (normal chisel sculpting sessions)
    - `useSelectionPointerHandler.ts` (box, lasso, floating selection)
    - `useShapePointerHandler.ts` (line, iso line, bezier, rect, ellipse)
- **Studio Hook Decomposition**:
  - `useStudioAutosave.ts`: Debounced IndexedDB persistence, startup restore, in-flight coalescing, quota handling.
  - `useStudioClipboard.ts`: Global `Ctrl+V` paste for image files via safe admission pipeline.
  - `useStudioFileSystem.ts`: Native File System Access API for `.pixibun` save/save-as.
  - `useStudioKeyboard.ts`: Centralized shortcut manager with input-field collision guards.
- **Teaching Animation Board**:
  - `TeachingAnimationBoard.tsx` + `TeachingBoardModal.tsx`: Interactive 7-stage character construction tutorial with Bun & Slime profiles, 10-frame jump cycles, squash & stretch physics, 8 alt colorways.
  - `teachingBoardData.ts`: Comprehensive $16\times16$ sprite datasets and physics explanations.
- **Audit Remediation (B01–B12, D01–D09, T01–T03)**:
  - B01: Database readiness awaited before startup restore.
  - B02: Save identity captured before encoding; revision comparison before marking clean.
  - B03: Atomic single-transaction metadata + layer blob commits.
  - B04: Layer tags preserved through all serialization paths.
  - B05: Validated nested custom ramps; staged hydration into temporary buffers.
  - B06: Native file handle reset on project replacement; bound to project identity.
  - B07: Reliable co-draw message queue with ACK, backpressure resume, retry, deduplication.
  - B08: Bounded import reader for picker/drop/clipboard; JSON depth check; WebP header validation.
  - B09: Globally unique layer/frame ID enforcement.
  - B10: Header images read as data URLs through shared import reader.
  - B11: Canvas dimension validation before mutations; proportional scale-down for oversized imports.
  - B12: Autosave returns boolean; confirmation shown only after successful persistence.
  - D01–D09: Documentation corrections (test counts, undo budget, export memory, PII disclaimer, rate limit semantics, algorithm labels, quota recovery).
  - T01: Synthetic Minecraft skin fixture replacing machine-specific test.
  - T02: ESLint added to standard quality gate.
  - T03: E2E tests updated to expand collapsed panels and use current labels.
- **Test Coverage**:
  - 692 unit tests across 97 suites; 22 E2E Chromium tests across 9 suites (100% green).
- **Enhanced Components**:
  - LeftToolbar: Interactive flyout color palette dock with quick swatches and recent colors.
  - BottomTimeline: FrameScrubPreview tooltip with $96\times96$ live composite on hover.
  - All inspector panels: Migrated to `PanelSection` collapsible containers with persistent state.
  - TactileButton: New variants (toggle, inset, primary, accent, danger, ghost) with reduced-motion support.
  - PixelIcon: Added icons (chisel, rivet, save, lamp-pixel, merge-down, lock, unlock, sun, sparkles, lamp, tag).

## [v1.13.1] - 2026-09-14
### Anatomical Part Decomposition & Volumetric Character Photometric Shading (Phase 61)
- **Anatomical Part Decomposition Engine (`src/lib/ai/math/edtNormalMap.ts`)**:
  - Replaced flat-silhouette macro heightmap clamping with `computeAnatomicalCharacterHeightmap()`, decomposing character morphology into distinct volumetric parts:
    1. **Cranial Head Dome**: Elevated dome ($z_{\text{baseHead}}$) with smooth camera-facing facial cushion protecting eyes and mouth.
    2. **Recessed Neck Crevice & Chin Depth Step**: Detects transverse chin ink strokes strictly below facial features, establishing an elevated chin over recessed throat ($z_{\text{baseNeck}}$) that produces downward chin normals ($N_y > 0$) and deep throat cavity ambient occlusion ($ao < 0.48$).
    3. **Torso Chest Barrel**: Synthesizes genuine horizontal barrel curvature across the chest between arm seams ($\text{Var}(N_x) > 0.05$), creating directional lighting contrast between lit and unlit flanks.
    4. **Longitudinal Arm Cylinders**: Identifies internal vertical ink strokes flanking the torso, generating separate cylindrical arm height fields separated by carved crevice seams.
  - Added morphological boundary checks distinguishing head+torso characters from head-only creatures / busts (`!hasTorsoBelow`), maintaining 100% baseline cushion and zero regressions on floating heads, cat faces, or props.
- **Precision Feature vs Structural Seam Classification (`src/lib/ai/math/edtNormalMap.ts`)**:
  - Filtered out longitudinal arm seams and transverse chin strokes from facial feature masking (`isFeature`), ensuring structural lines properly carve crevice valleys and participate in anatomical decomposition rather than being misclassified as facial features.
  - Restricts outer boundary ink lines touching transparent background from being carved as internal crevices, preventing artificial trenching along convex cheeks.
- **Dedicated Anatomical Photometric Shading Suite (`tests/anatomicalPhotometricShading.test.ts`)**:
  - Added 3 comprehensive tests verifying chin depth step, downward chin normals ($N_y > 0$), throat cavity occlusion ($ao < 0.48$), chest barrel horizontal curvature, independent arm cylinders, and dynamic light rotation.
  - Expanded test coverage to 642 unit tests across 91 test files (100% green).

### Photometric Drag-Session Correctness & Cavity AO Auto-Scaling (Phase 60)
- **Live-Drag Photometric Analysis Cache Invalidation (Phase 60a) (`src/hooks/viewport/events/usePhotometricEvents.ts`)**:
  - Implemented 20° angular-drift cache invalidation during live light gizmo drags for character and appendage-bearing silhouettes, eliminating stale geometry caching while keeping 60 FPS performance.
  - Guaranteed fresh single-shot analysis recomputation on mouseup/commit before persisting layer snapshots, achieving 100.000% byte-identity with fresh execution and 0 committed staleness.
  - Preserved full zero-recompute caching for spherical orbs and non-appendage prop forms.
- **Cavity AO Auto-Scaling for Complex Silhouettes (Phase 60b) (`src/lib/ai/math/photometricAuto.ts`, `src/lib/ai/math/photometricLighting.ts`, `src/hooks/viewport/events/usePhotometricEvents.ts`)**:
  - Added silhouette complexity metric computing circularity deficiency (`1 / circularity`) and upper-region multi-segment appendage density (`maxUpperSegments`).
  - Auto-scales recommended `cavityStrength` in `inferPhotometricSettings()` from 1.0 down toward 0.40 on complex, spiky character silhouettes (hair spikes, fur tufts), while preserving 1.0 for spherical orbs.
  - Dynamically tuned `creviceAOThresh` in cel-shading to scale with `cavityStrength`, dropping deep-crevice tone coverage from 50% down to <2% on hair-spike characters and recovering >90% directional lighting.
  - Added regression test suites in `tests/photometricAutoAnalysis.test.ts` and `tests/photometricNonDestructive.test.ts`, bringing total test coverage to 639 unit tests across 90 suites.

### Canvas Envelope Unification, Safe Subsystems Hardening & Canonical Versioning (Phase 59)
- **Single Source of Truth Canvas Envelope (`src/config/canvasLimits.ts`)**:
  - Exported canonical tier constants: `WORKSPACE_ENVELOPE` (`MAX_CANVAS_DIMENSION = 2048`, `MAX_CANVAS_FRAMES = 500`, `MAX_CANVAS_LAYERS = 100`), `EXPORT_ENVELOPE` (`MAX_EXPORT_DIMENSION = 4096`, `MAX_EXPORT_PIXELS = 16_777_216`), `PROBE_ENVELOPE` (`MAX_PROBE_DIMENSION = 8192`, `MAX_PROBE_PIXELS = 67_108_864`), and `HARDWARE_LIMITS` (`MAX_HARDWARE_DIMENSION = 16384`, `MAX_HARDWARE_PIXEL_AREA = 268_435_456`).
  - Unified project schema validation in `src/lib/project/schema.ts` against `WORKSPACE_ENVELOPE`.
  - Re-exported export boundary constants in `src/components/modals/export/PngExportTab.tsx` and `src/components/modals/ExportModal.tsx`.
- **P2P Structural & Pixel Admission Boundary Alignment (`src/lib/sync/p2pSync.ts`)**:
  - Bound `validateStructurePayload` to `WORKSPACE_ENVELOPE` dimensions ($2048\text{px}$), frame counts ($500$), and layer counts ($100$).
  - Hardened `isValidPixelOp` to strictly reject negative coordinates and values $\ge 2048$, enforcing exact schema parity across network peers.
- **Safe Canvas Hardware Bounds & TypedArray Offset Fix (`src/lib/safety/safeCanvas.ts`)**:
  - Bound buffer clipping to canonical `HARDWARE_LIMITS`.
  - Fixed `SafeCanvas.getImageData()` typed array instantiation by explicitly passing `(buffer, byteOffset, length)` to `Uint32Array`, eliminating offset copy bugs on non-zero view windows.
- **Zero-Allocation Safe JSON Byte Accounting & Plain Object Sanitizer (`src/lib/safety/safeJson.ts`)**:
  - Replaced wasteful string allocations with zero-heap `TextEncoder.encodeInto` UTF-8 byte counting in `getUtf8ByteLength`.
  - Hardened `sanitizeObject` to return a clean plain object `{}` preserving `Object.prototype` methods while stripping prototype-pollution keys (`__proto__`, `constructor`, `prototype`).
- **Progressive Multi-Window Image Header Probe (`src/lib/safety/imageHeaderProbe.ts`)**:
  - Expanded initial probe window to 256KB and implemented multi-window `Blob` segment paging for late-SOF JPEGs with massive EXIF/ICC metadata.
  - Added distinct `SOF_BEYOND_PROBE_WINDOW` error classification when markers exceed traversal limits.
- **Canonical Version Single Source of Truth (`src/config/version.ts`)**:
  - Defined canonical `APP_VERSION = '1.13.1'` consumed by `src/lib/diagnostics/capture.ts` and `src/app/api/diagnostics/relay/route.ts`.
  - Synchronized `package-lock.json` with `package.json` at version `1.13.1`.
- **Cross-Boundary & Defensive Hardening Test Suites (`tests/crossBoundaryEnvelope.test.ts`, `tests/p2pValidation.test.ts`, `tests/structurePayload.test.ts`, `tests/safetyHardening.test.ts`, `tests/diagnostics.test.ts`, `tests/photometricNonDestructive.test.ts`)**:
  - Added 9 cross-boundary envelope integration tests and updated regression assertions, expanding test coverage to 637 unit tests across 90 suites (100% green).
- **Dynamic Character Appendage Normal Stabilization (`src/lib/ai/math/edtNormalMap.ts`, `src/lib/ai/math/photometricLighting.ts`)**:
  - Decoupled static pixel geometry from light-direction-coupled appendage normal stabilization via `applyAppendageStabilization`.
  - Preserves 60 FPS live light dragging while achieving 100.000% byte-for-byte identity with fresh single-shot recomputations at any azimuth.
  - Added regression test verifying zero pixel drift during multi-frame azimuth sweeps on anatomical character sprites (`tests/photometricNonDestructive.test.ts`).

### Photometric Studio Resolution-Aware Bevel Scaling & Dark Palette Protection (Phase 58)
- **Resolution-Aware Bevel Radius & Macro Heightmap Scaling (`src/lib/ai/math/edtNormalMap.ts`)**:
  - Replaced hardcoded 2.8px bevel clamping with proportional resolution scaling (`scaleFactor = Math.max(1.0, Math.min(width, height) / 32)`).
  - Dynamically scales character bevel radius (`charBevelRadius = 2.8 * scaleFactor`), dynamic bevel radius bounds (`[2.5, 6.0 * scaleFactor]`), and appendage width ceilings (`5 * scaleFactor`).
  - Enables higher-resolution canvases ($128\times128$, $64\times64$) to generate smooth, volumetric 3D surface normal maps rather than collapsing into flat forward plateaus ($N_z = 1.0$), while preserving 100% byte-exact parity for standard $32\times32$ sprites.
- **Boundary-Aware Ink Line & Crevice Classification (`src/lib/ai/math/edtNormalMap.ts`)**:
  - Eliminated false-positive line art over-protection that previously treated any pixel with luminance $< 0.22$ as an ink line and skipped shading.
  - On user artwork featuring dark body colors (e.g. crimson $L=0.18$, navy $L=0.06$), this previously skipped $>83\%$ of character pixels.
  - Replaced naive thresholding with boundary-aware classification: only transparent-boundary dark pixels ($L < 0.14$), high-contrast interior crevices ($\max(N_{\text{lum}}) - L \ge 0.16$), or near-black pixels ($L < 0.035$) are classified as ink lines.
- **Dark Palette OKLCH Cel Ramp Clamping (`src/lib/ai/math/photometricLighting.ts`)**:
  - Fixed shadow tone luminance calculation in `buildCelRamp`, where `Math.max(0.18, lch.L * 0.78)` previously forced shadow tones to be lighter than dark base tones ($lch.L < 0.18$).
  - Clamped shadow luminance relative to base color (`Math.max(0.04, Math.min(lch.L * 0.78, lch.L - 0.03))`) and deep crevice luminance (`Math.max(0.02, Math.min(lch.L * 0.60, lch.L - 0.06))`), restoring deep, atmospheric cel-shading contrast across dark palettes.
- **Dark Palette & High-Resolution Photometric Regression Tests (`tests/photometricAutoAnalysis.test.ts`)**:
  - Added unit test asserting that $128\times128$ canvases with dark crimson ($L=0.18$) and navy ($L=0.06$) body palettes generate smooth non-flat normal fields and shade accurately without false-positive ink-line masking.

## [v1.13.0] - 2026-09-13
### Studio Workstation Ergonomics, Accessibility Focus Trapping & Unsaved Invariants (Phase 57)
- **Document Title Unsaved Dirty Invariant & Exit Guard (`src/components/layout/StudioLayout.tsx`)**:
  - Dynamically synchronizes document title with unsaved workspace state (`● Project — PixiBun`), clearing upon successful save.
  - Implements native `beforeunload` window event guard whenever changes are unsaved (`isDirty === true`), shielding users against accidental tab closure.
- **Affirmative Save Toast Notification (`src/components/layout/StudioLayout.tsx`)**:
  - Emits transient affirmative confirmation toast (`* Saved "project" to browser storage`) upon manual `Ctrl+S` keystrokes and toolbar save actions.
- **Modal Accessibility Focus Containment & Restoration (`src/components/ui/ModalWrapper.tsx`, `tests/components/ModalWrapper.test.tsx`)**:
  - Implemented WCAG 2.4.3 (Focus Order) and WCAG 2.4.11 (Focus Not Obscured) compliance with programmatic initial focus, circular Tab keyboard containment, and return-to-opener focus restoration upon dialog dismissal.
- **Shortcut Collision Isolation & Quantized Zoom Stepping (`src/components/layout/StudioLayout.tsx`)**:
  - Isolated viewport single-key hotkeys (e.g. `s` silhouette squint mode) from firing when users type in input fields or press modifier combinations (`Ctrl+S`).
  - Standardized monotonic discrete power-of-two zoom magnification stepping (`[100, 200, 400, 800, 1600, 3200, 6400]`).
- **Baseline Non-Intro Landing Page Restoration (`src/components/landing/PixelDitherCurtain.tsx`)**:
  - Restored lightweight, non-intrusive 1.1s automatic Bayer $8\times8$ dither dissolve curtain directly from git baseline.
  - Purged all experimental audio stingers and intro keyframe styles with zero residual dead code.

### Autonomous Local CI/CD Quality Gate & Git Pre-Push Protection (Phase 56)
- **Local Quality Gate Runner (`scripts/runQualityGate.mjs`, `package.json`)**:
  - Engineered an autonomous, zero-dependency Node.js ESM release gatekeeper executing sequential validation stages (`npm run gate` for pre-push, `npm run gate:full` for release bundling):
    - Stage 1: Documentation Integrity & Sync Invariant Audit (`npm run verify:docs`)
    - Stage 2: Strict Static Type Safety (`npm run typecheck` - 0 compiler errors)
    - Stage 3: Comprehensive Unit & Defensive Invariant Test Suite (`npm test` - 609 tests across 88 suites)
    - Stage 4: Next.js Production Compilation & Bundling (`npm run gate:full`)
- **Automated Git Pre-Push Gatekeeper (`scripts/installGitHooks.mjs`, `.git/hooks/pre-push`, `package.json`)**:
  - Implemented automatic pre-push git hook installation via `npm run prepare` lifecycle script.
  - Intercepts all `git push` commands locally; if any test, typecheck, or doc verification fails, the push is blocked before leaving the developer workstation.
- **Open Source Contribution & Security Documentation (`CONTRIBUTING.md`, `SECURITY.md`, `.github/workflows/ci.yml`)**:
  - Authored comprehensive `CONTRIBUTING.md` documenting zero-dependency architecture, testing standards, and Quality Gate workflows.
  - Expanded `SECURITY.md` with Section 4 detailing Defense-in-Depth pre-push invariants (CWE-409, CWE-1321, IEEE 754 float invariants, Token Bucket rate limiting).
  - Added drop-in `.github/workflows/ci.yml` pipeline configuration enforcing automated quality gates.

### Comprehensive Defensive Hardening & Mathematical Invariants (Phase 55)
- **Mathematical Viewport Invariants & Line Clipping (`src/lib/safety/mathInvariants.ts`, `src/hooks/viewport/useViewportTransform.ts`)**:
  - Grounded in Foley et al. (1990) and Newman & Sproull (1973), implemented Cohen-Sutherland 4-bit outcode line clipping (`clipLineToCanvas`) to eliminate out-of-bounds loop stalls and canvas coordinate corruption.
  - Grounded in David Goldberg (1991) and Donald E. Knuth (1997, TAOCP Vol. 2), implemented IEEE 754 floating-point invariant guards (`clampZoom`, `safeDivide`) in `useViewportTransform.ts`, immunizing trackpad pinch and mouse wheel operations against `NaN`, `Infinity`, and division-by-zero singularities.
- **Safe Canvas Hardware Boundary Clamping (`src/lib/safety/safeCanvas.ts`)**:
  - Created `SafeCanvas.createImageData` and `SafeCanvas.getImageData`, clamping dimensions to positive integers, normalizing negative coordinate drag rectangles, bounding buffer requests against GPU hardware limits (8192px / 16384px), and eliminating browser-crashing `IndexSizeError` exceptions on zero-area selections.
- **CWE-409 Decompression Bomb & Pixel Bomb Mitigation (`src/lib/safety/imageHeaderProbe.ts`)**:
  - Implemented zero-dependency pre-flight binary header parser inspecting PNG (IHDR), JPEG (SOF0/SOF2), GIF, and BMP headers in the first 64KB, rejecting malicious decompression bombs ($>8192\text{px}$ or $>67\text{MP}$) BEFORE allocating canvas memory or calling `createImageBitmap`.
- **CWE-1321 Prototype Pollution Defense & Depth Limiting (`src/lib/safety/safeJson.ts`, `src/lib/project/schema.ts`)**:
  - Grounded in Olivier Arteau (NorthSec 2018), built `safeJsonParse` stripping `__proto__`, `constructor`, and `prototype` keys and enforcing a recursion depth limit ($\le 32$). Hardened `projectSchema.ts` with strict upper bounds (names $\le 256$ chars, frames $\le 500$, layers $\le 100$, palettes $\le 50$, clips $\le 100$).
- **Storage Resilience & QuotaExceeded Protection (`src/lib/safety/storageResilience.ts`, `src/lib/storage/db.ts`)**:
  - Standardized detection of WHATWG `QuotaExceededError` across Chromium, WebKit/Safari, and Firefox. Added automatic volatile telemetry cache pruning (`pruneVolatileCaches`) to safeguard active user project data during disk pressure.
- **WebRTC Token Bucket Traffic Shaping (`src/lib/sync/p2pSync.ts`)**:
  - Grounded in Jonathan S. Turner (1986), Tanenbaum & Wetherall (§5.3.4), and RFC 2212, added Token Bucket rate limiting to P2P sync and presence channels, mitigating packet flood and CPU starvation attacks from malicious peers.
- **Safety Test Suites (`tests/safetyHardening.test.ts`, `tests/isobmffHardening.test.ts`, `tests/schemaHardening.test.ts`)**:
  - Added 25 new defensive engineering tests across 3 dedicated suites, expanding total test coverage to 609 unit tests across 88 suites (100% green).

### Workstation-Class Architectural Upgrades (Phase 54)
- **P2P Co-Draw Guest UI Mutation Locking (`src/hooks/useCoDrawStatus.ts`, `src/components/layout/inspector/LayersPanel.tsx`, `src/components/layout/BottomTimeline.tsx`)**:
  - Implemented host-authoritative structural protection. When joining a session as a guest (`peerRole === 'guest'`), layer add, duplicate, merge-down, delete, frame creation, deletion, and timeline drag-and-drop reordering are disabled with clear tooltips and `cursor-not-allowed` styles, preventing guest structural edits from being overwritten by incoming host `STRUCTURE_SYNC` packets.
- **Undo/Redo Engine Structural Command Pattern (`src/types/canvas.ts`, `src/lib/engine/historyEngine.ts`, `src/lib/engine/structuralHistory.ts`, `src/hooks/viewport/useViewportDrawing.ts`, `src/stores/slices/createLayerSlice.ts`, `src/stores/slices/createAnimationSlice.ts`, `tests/historyEngineStructural.test.ts`)**:
  - Upgraded `HistoryEngine` from a pixel-only delta store to a hybrid Command Pattern supporting both pixel stroke diffs and full structural operations (`type: 'structural'`).
  - Added snapshots capturing layer additions, deletions, reordering, merge-downs, and frame insertions/reordering with byte-accurate `LayerBufferBackup` preservation across all frames.
  - Verified undo and redo of destructive structural mutations in `tests/historyEngineStructural.test.ts`.
- **Worker EDT Distance Transform & Normal Map Offloading (`src/lib/ai/math/edtNormalMap.ts`, `src/workers/heavyCompute.worker.ts`, `src/lib/engine/workerDispatcher.ts`, `src/hooks/viewport/events/usePhotometricEvents.ts`, `tests/workerEdtNormalMap.test.ts`)**:
  - Offloaded CPU-heavy 2D Euclidean Distance Transform, bilateral Gaussian filtering, and Sobel normal map generation to `heavyCompute.worker.ts` using zero-copy Transferable ArrayBuffers.
  - Guarded main-thread canvas stability by defensively cloning outgoing buffer snapshots (`.slice(0)`), while achieving zero-copy transfer on the worker-to-main return trip.
  - Provided automatic synchronous fallback in `runEdtNormalMapInWorker` for headless/unsupported worker environments, verified in `tests/workerEdtNormalMap.test.ts`.
- **Native Desktop File System Access API & Save As (`src/lib/storage/desktopFileSystem.ts`, `src/components/layout/StudioLayout.tsx`, `src/components/modals/ExportModal.tsx`, `tests/desktopFileSystem.test.ts`)**:
  - Built zero-dependency native desktop ergonomics with `window.showSaveFilePicker` and `window.showOpenFilePicker`.
  - Bound `Ctrl+S` to instantaneous in-place disk overwriting via retained `FileSystemFileHandle`s, and `Ctrl+Shift+S` to "Save As" picker dialogs.
  - Implemented reliable browser anchor download and hidden file input fallbacks for Firefox, Safari, and headless test runners, verified in `tests/desktopFileSystem.test.ts`.
- **47-Blob Autotile Interactive Engine (`src/lib/ai/math/autotileEngine.ts`, `tests/autotileEngine.test.ts`)**:
  - Implemented complete 8-neighbor Moore bitmasking with cardinal-corner dominance, collapsing $2^8 = 256$ neighborhood configurations into the canonical 47 Wang/Blob equivalence classes.
  - Precomputed an $O(1)$ 256-element bitmask lookup table (`BITMASK_TO_47_INDEX`) and built a Chebyshev $3\times3$ dirty neighborhood reactive updater (`updateAutotileAt`) that recalculates only affected adjacent tiles.
  - Authored procedural 47-tile pixel renderer and validated full mathematical proofs in `tests/autotileEngine.test.ts`.
- **Pure-TypeScript ISOBMFF Fast-Start MP4 Container Muxer (`src/lib/export/isobmffWriter.ts`, `src/lib/export/mp4Encoder.ts`, `tests/isobmffWriter.test.ts`)**:
  - Built a 100% scratch pure-TypeScript ISO Base Media File Format container muxer (`ftyp`, `moov`, `mdat`) with progressive download Fast-Start box ordering and chunk offset back-patching in `stco`.
  - Eliminated reliance on real-time `MediaRecorder` stream playback by coupling hardware-accelerated WebCodecs `VideoEncoder` (`avc1.42001f`) with the scratch ISOBMFF muxer, while preserving graceful `MediaRecorder` fallback.
  - Verified bitstream box hierarchies and chunk offset calculations in `tests/isobmffWriter.test.ts`.

## [v1.12.1] - 2026-09-12
### Comprehensive Audit Resolution, Algorithmic Precision & State Isolation (Phase 53)
- **Dimetric Ray Projection for Isometric Lines (`src/lib/ai/math/curvesAndLines.ts`, `tests/curvesAndLines.test.ts`)**:
  - Replaced $dx$-only step scaling in `getIsometric2p1Line` with scalar dimetric ray projection ($t = (2|\Delta x| + |\Delta y|) / 5$), snapping arbitrary cursor endpoints $(x_1, y_1)$ to the true 2:1 line while maintaining exact cardinal horizontal/vertical lines.
  - Added unit test cases in `curvesAndLines.test.ts` verifying projection for off-axis points (e.g. $(0,0) \to (10, 2)$, $(0,0) \to (3, 10)$) and negative quadrant coordinates.
- **Per-Tab Export Scale State Isolation (`src/components/modals/ExportModal.tsx`, `tests/components/ExportModal.test.tsx`)**:
  - Replaced single shared scale state with `tabScales: Record<ExportType, number>`, eliminating scale bleed and downward clamping when switching between export tabs.
- **Scale2x Border Non-Matching Sentinel (`src/lib/canvas/rotSprite.ts`, `tests/rotSpriteSymmetryAndThinLines.test.ts`)**:
  - Replaced out-of-bounds `0` return with an explicit `OOB = -1` sentinel, ensuring out-of-bounds coordinates never match inside pixels or each other.
  - Added regression test in `rotSpriteSymmetryAndThinLines.test.ts` verifying that solid edge-touching sprites maintain 100% opaque corners without transparent erosion.
- **Canonical DPaint CRNG Parity (`src/lib/color/paletteCycling.ts`, `tests/paletteCycling.test.ts`)**:
  - Removed unmotivated `rateRaw !== 36` check, aligning track activation strictly with the official Amiga IFF ILBM `RNG_ACTIVE` flag bit.
  - Added unit test verifying that slow 0.13 Hz cycle tracks parse and round-trip cleanly.
- **Documentation Truthfulness Alignment (`src/lib/ai/smartMathEngine.ts`, `src/lib/export/depixelizeVector.ts`, `src/lib/export/apngEncoder.ts`, `src/lib/procedural/waveFunctionCollapse.ts`, `.env.example`, `SECURITY.md`, `README.md`, `MAIN.md`, `ARCHITECTURE.md`, `BENCHMARKS.md`)**:
  - Corrected `smartMathEngine.ts` line 18 comment to Quadratic Bézier.
  - Added Kopf-Lischinski DOI `10.1145/2010324.1964994` and domain heuristic note in `depixelizeVector.ts`.
  - Added Mozilla origins and W3C Third Edition integration citation in `apngEncoder.ts`.
  - Clarified WFC constraint guarantee for converged outputs in `waveFunctionCollapse.ts`.
  - Replaced `ghp_` prefixes in `.env.example`.
  - Documented diagnostics relay rate limiting, payload ceiling, and HTTPS security in `SECURITY.md`.
  - Synchronized showcase models, 5 materials, 6-canvas stack, 100-state history capacity, $Nz \ge 0.88$, and benchmark conclusions across README, MAIN, ARCHITECTURE, and BENCHMARKS.

### Canvas Safety Ceilings, Codebase Calibration & Rigor Remediation (Phase 52)
- **Export Canvas Safety Bounds & Scale Tab Isolation (`src/components/modals/export/PngExportTab.tsx`, `src/components/modals/ExportModal.tsx`, `tests/exportCanvasScaleBounds.test.ts`)**:
  - Established cross-platform hardware safety bounds (`MAX_SAFE_CANVAS_DIMENSION = 4096`, `MAX_SAFE_CANVAS_PIXELS = 16_777_216`) based on mobile WebKit / iOS Safari canvas allocation limits.
  - Dynamically disabled out-of-bounds scale options in `PngExportTab` (e.g. 16× and 32× on 512×512 canvases) to prevent tab crashes and 1 GB raw memory buffer allocations.
  - Isolated and clamped `scale` across export modal tabs (GIF max 8×, Spritesheet max 4×, APNG/MP4 max 16×, PNG/SVG max 32× subject to canvas bounds) so high PNG scaling does not bleed into animation encoders.
  - Added unit test suite in `tests/exportCanvasScaleBounds.test.ts` verifying safe dimension and pixel area evaluation across all canvas sizes.
- **Persistent Storage Eviction Warning Banner (`src/components/layout/StudioLayout.tsx`)**:
  - Added a visible, non-blocking, dismissible warning banner when `requestPersistentStorage()` is denied or not granted by the browser.
  - Warns users that local IndexedDB storage may be evicted under disk pressure (common on iOS/Safari) and provides a direct "Export Backup" action with session dismissal persistence.
- **Quadratic Bézier Precision Nomenclature (`src/lib/ai/math/curvesAndLines.ts`, `PIXIBUN_DEEP_DIVE.md`, `README.md`, `MAIN.md`)**:
  - Corrected misnamed "Rational Bézier" references to "Quadratic Bézier", accurately reflecting the unweighted degree-2 polynomial de Casteljau formula implemented in source code ($B(t) = (1-t)^2 P_0 + 2(1-t)t P_1 + t^2 P_2$).
- **Codebase Hyperbole Calibration (`src/components/landing/showcase/RotSpriteShowcase.tsx`, `src/lib/art/playgroundLessons.ts`, `src/lib/audio/lofiRadio.ts`, `src/components/modals/export/ShaderExportTab.tsx`, `src/lib/color/paletteCycling.ts`, `src/components/modals/export/AnimatedExportTab.tsx`, `src/components/modals/ImportModal.tsx`, `src/components/modals/CoDrawModal.tsx`, `src/components/modals/ShortcutsModal.tsx`)**:
  - Calibrated promotional UI text and comments removing unprovable assertions ("100% stable", "completely eliminates", "guaranteeing zero gaps", "100% pure") while intentionally preserving legitimate academic and distributed systems terms (CRDT Strong Eventual Consistency, WFC constraints).
- **Automated Version & Documentation Synchronization (`package.json`, `package-lock.json`, `scripts/verifyDocIntegrity.mjs`, `src/lib/diagnostics/capture.ts`, `src/app/api/diagnostics/relay/route.ts`, `tests/diagnostics.test.ts`)**:
  - Synchronized `package.json`, `package-lock.json`, `capture.ts`, and test fixtures to `1.12.1`.
  - Added Check 6 to `scripts/verifyDocIntegrity.mjs` asserting that `package.json` version matches the latest release header in `CHANGELOG.md`.

### Documentation Truthfulness, Academic Rigor & Tone De-Escalation (Phase 51)
- **Marketing Tone De-Escalation (`README.md`, `DESIGN.md`, `MAIN.md`, `SECURITY.md`, `ARCHITECTURE.md`, `PIXIBUN_DEEP_DIVE.md`)**: Softened marketing puffery, absolute guarantees, and hyperbolic adjectives across all documentation, replacing them with modest, academically precise technical descriptions.
- **RotSprite Claims Calibration (`README.md`, `ARCHITECTURE.md`, `TASKS.md`, `CHANGELOG.md`, `LOGS.md`)**: Replaced over-reaching phrases ("completely eliminated 45° distortion", "micro-details never vanish", "100% leak-proof") with accurate descriptions of Xenowhirl's 8x Scale2x cascade, subpixel continuous inverse sampling, and parabolic majority voting reducing distortion and outline erosion while preserving palette purity.
- **Stylized 2D Optics Clarification (`README.md`)**: Explicitly documented Beer-Lambert chord extinction, Henyey-Greenstein phase scattering, Cauchy dispersion, and Kajiya-Kay highlights as stylized 2D screen-space approximations designed for pixel art rather than claiming full 3D volumetric simulations.
- **Felzenszwalb-Huttenlocher EDT Citation Synchronization (`CHANGELOG.md`, `LOGS.md`)**: Corrected references that erroneously attributed the EDT algorithm to Meijster, standardizing across all documentation on the actual implemented algorithm by Pedro F. Felzenszwalb & Daniel P. Huttenlocher (2012 / 2004).
- **Benchmark Hardware Context & Budget Ceilings (`BENCHMARKS.md`)**: Added reference hardware environment notice and clarified that automated CI gates assert upper-bound budget ceilings ($\le 16.66\text{ ms}$ for 60 FPS interaction) rather than asserting machine-specific timings as universal guarantees.
- **Character Encoding & Markdown Polish (`LOGS.md`, `CHANGELOG.md`)**: Fixed Unicode replacement character corruptions in `LOGS.md` and purged decorative emoji clutter from `CHANGELOG.md` subheaders to maintain clean, technical documentation standards.

### External Audit Remediation & Terminology Harmonization (Phase 50)
- **P2P Co-Draw Modal Network Default (`src/components/modals/CoDrawModal.tsx`)**: Changed default network mode from `'internet'` to `'lan'`, matching the zero-egress LAN promise (`iceServers: []`) in `README.md`.
- **Lossless PNG Export 32× Resolution Option (`src/components/modals/export/PngExportTab.tsx`)**: Added `32` to the scale button array (`[1, 2, 4, 8, 16, 32]`), fulfilling the documented "1× to 32× lossless PNG" export capability in the UI.
- **Eradication of "Wu" Attribution on 2:1 Isometric Stepping (`README.md`, `ARCHITECTURE.md`, `PIXIBUN_DEEP_DIVE.md`, `CHANGELOG.md`, `TASKS.md`, `LOGS.md`)**: Replaced all mentions with "Quantized 2:1 Isometric Line Stepper", reflecting classic 1980s dimetric rasterization ($\arctan(0.5) \approx 26.565^\circ$) rather than Xiaolin Wu's anti-aliasing technique.
- **Historical Citation Cleanup (`src/lib/ai/math/rotSprite.ts`)**: Standardized citation on canonical author name Xenowhirl (2007) and removed the leftover alias "Xenowoz".
- **HistoryEngine Memory Arithmetic Correction (`BENCHMARKS.md`, `tests/benchmark.test.ts`)**: Corrected 256×256 50-step memory from 12.80 MB to 13.11 MB ($13{,}107{,}200 / 1{,}000{,}000$) and 100-step max memory from 25.60 MB to 26.21 MB.
- **CenterViewport 6-Canvas Stack Diagram (`ARCHITECTURE.md`)**: Updated the mermaid diagram to include all 6 hardware-accelerated canvas layers (`onionCanvasRef`, `stencilCanvasRef`, `mainCanvasRef`, `previewCanvasRef`, `gridCanvasRef`, `cursorCanvasRef`).
- **Deep Dive Directory Tree Alignment (`PIXIBUN_DEEP_DIVE.md`)**: Added `curvesAndLines.ts` and `morphology.ts` to the `src/lib/ai/math/` tree.
- **Persistent Storage Rejection Handling (`src/components/layout/StudioLayout.tsx`)**: Handled the promise returned by `requestPersistentStorage()`, logging a diagnostic warning if persistence is not granted.

### Deep Audit Remediation, RotSprite Fast Paths, SDF Morphing & Test Suite Re-alignment (Phase 49)
- **P2P WebRTC Data Channel Backpressure & Buffer Ceilings (`src/lib/sync/p2pSync.ts`, `tests/p2pSync.test.ts`)**:
  - Implemented `MAX_DATA_CHANNEL_BUFFERED_AMOUNT` (1 MB) and `MAX_PRESENCE_BUFFERED_AMOUNT` (64 KB) backpressure thresholds for dual RTCDataChannel transports.
  - Enforced backpressure guards in `broadcastPixelOps`, `broadcastInitialSync`, `broadcastStructure`, and `broadcastCursor` to eliminate channel buffer congestion and memory bloat.
  - Added unit test in `tests/p2pSync.test.ts` verifying graceful yielding and cursor frame dropping when data channel `bufferedAmount` exceeds thresholds.
- **Palette Cycling & History Engine Runtime Memory Benchmarks (`tests/benchmark.test.ts`, `BENCHMARKS.md`)**:
  - Added automated empirical benchmarks for 32-bit `updateLivePaletteLUT32` and raster pixel remapping across 64x64, 128x128, 256x256, and 512x512 sprite dimensions, verifying execution within 16.66ms (60 FPS budget). The LUT update itself allocates small RGB tuples.
  - Added formal memory footprint and ring buffer pruning capacity assertions for `HistoryEngine` across 16x16 through 512x512 resolutions, confirming exact agreement with `BENCHMARKS.md` ceilings (e.g. 13.1 MB for 50 steps at 256x256).
- **Photometric Light Bulb Gizmo UX & Cel Shading Remediation (`src/components/studio/PixelLightBulbGizmo.tsx`, `src/hooks/viewport/useViewportPointerEvents.ts`, `src/hooks/viewport/useViewportTransform.ts`, `src/lib/ai/math/photometricLighting.ts`, `src/lib/events/studioEvents.ts`, `src/stores/slices/createToolSlice.ts`, `tests/orbPhotometricCelShading.test.ts`, `tests/components/PixelLightBulbGizmo.test.tsx`)**:
  - Modulated directional cel shadow terminator threshold inversely by brightness (`(0.55 * 1.15) / max(0.2, brightness)` clamped to `[0.15, 0.85]`), ensuring bulb strength changes physically drive the shadow boundary back on character sprites while preserving exact palette purity and leaving default 1.15 output bit-identical.
  - Added event propagation suppression (`e.stopPropagation()`) across HUD buttons, steppers, inputs, and container `onPointerDown`, alongside an explicit `photometricGizmoActive` guard in `useViewportPointerEvents.ts` to eliminate canvas draw tool leakage when interacting with HUD controls.
  - Relocated the floating viewport HUD toolbar from `top-3` to `top-full mt-2 left-1/2 -translate-x-1/2`, anchoring it safely beneath the bottom canvas boundary and preventing artwork occlusion.
  - Intercepted mouse wheel events during active photometric sessions in `useViewportTransform.ts`, re-routing scroll deltas via `pixibun:photometric-strength-delta` to bulb strength adjustments ($\pm 0.05$ per tick) and preventing disruptive viewport zoom jumping.
  - Aligned tool store `setLightBrightness` lower clamp boundary from 0.4 to 0.3 to match the stepper minimum, and added unit tests in `tests/orbPhotometricCelShading.test.ts` and `tests/components/PixelLightBulbGizmo.test.tsx`.
- **RotSprite Rectangular 90°/270° Fast Path & Centered Layer Rotation (`src/lib/ai/math/rotSprite.ts`, `src/lib/canvas/rotSprite.ts`, `src/hooks/viewport/events/useGeometricEvents.ts`, `tests/rotSpriteRectangular.test.ts`)**:
  - Removed `w === h` restriction on orthogonal 90° and 270° fast paths across both canvas and math processing chains, transposing output canvas dimensions ($W' = H, H' = W$) and updating coordinate indexing to $y' \cdot H + x'$.
  - Added dedicated fixed-dimension centered fast-paths for $90^\circ$ and $270^\circ$ rotations on non-square bounds ($O(W \times H)$) when `outW === w && outH === h`, and centered rotated content in `useGeometricEvents.ts` to prevent asymmetrical layer clipping.
  - Deduplicated `src/lib/ai/math/rotSprite.ts` by removing 220 lines of redundant Scale2x/majority voting code and converting `rotateWithRotSprite` into a thin DOM adapter delegating directly to canonical `rotSprite` in `src/lib/canvas/rotSprite.ts`.
  - Corrected downsampling kernel documentation from Gaussian to Xenowhirl's parabolic center-weighted majority voting kernel: $w(u, v) = 1.0 + 0.01 \cdot (25 - (u^2 + v^2))$.
  - Created unit tests in `tests/rotSpriteRectangular.test.ts` (6 tests) verifying rectangular canvas rotation equivalence.
- **Morph Fraction Forwarding & Multi-Source BFS Color Sampling (`src/lib/ai/pixelAiEngine.ts`, `src/workers/heavyCompute.worker.ts`, `src/lib/engine/workerDispatcher.ts`, `tests/pixelAiEngineMorphFraction.test.ts`)**:
  - Replaced $O(W \times H \times R^2)$ spiral search with an 8-connected multi-source Breadth-First Search (BFS) in exact $O(W \times H)$ time for nearest opaque color lookups.
  - Exported `morphInBetweenFrameAtFraction` and forwarded time fraction parameter `t` in `morphInBetweenFrames`.
  - Added `fraction` property support across Web Worker message schemas and dispatcher fallback routes.
  - Created unit tests in `tests/pixelAiEngineMorphFraction.test.ts` (5 tests) asserting intermediate fraction color transitions.
- **History Engine Popped Step Loop Elimination (`src/lib/engine/historyEngine.ts`, `tests/historyEngine.test.ts`)**:
  - Guarded opposite stack push on `undo()` and `redo()` to execute only when `currentState !== undefined`, eliminating ghost state cycles.
  - Added unit test in `tests/historyEngine.test.ts` verifying no-arg undo behavior.
- **FloodFill Hex Parsing & Unsigned 32-Bit Contract (`src/lib/canvas/floodFill.ts`, `tests/floodFillHex.test.ts`)**:
  - Documented strict 6-digit `#RRGGBB` contract for color picker inputs and exported explicit `rgbToHex` alias.
  - Unified test suite in `tests/floodFillHex.test.ts` to 14 tests preserving all 5 `hexToRgba` tests (including CSS Color 4 4/8-digit `#RGBA` expansion), 4 `performFloodFill` algorithm tests, and 5 `rgbaToHex` contract tests.
- **Diagnostics Relay Fallback Version Synchronization (`src/lib/diagnostics/capture.ts`, `src/app/api/diagnostics/relay/route.ts`, `tests/diagnostics.test.ts`)**:
  - Synchronized `APP_VERSION = '1.12.0'` in `capture.ts` and default route fallback in `src/app/api/diagnostics/relay/route.ts`.
- **E2E Spec Test Reliability & Teardown Race Elimination (`tests/e2e/chiselAndPaletteLiveProof.spec.ts`, `tests/e2e/landing.spec.ts`, `tests/e2e/volumetricVisualProof.spec.ts`, `tests/e2e/selectionGizmoLiveProof.spec.ts`, `src/components/layout/AtelierRail.tsx`, `src/lib/storage/db.ts`)**:
  - Root-caused intermittent E2E failure to `DatabaseClosedError` thrown when in-flight `loadLatestSavedWorkspace()` collided with explicit test database teardown (`win.__pixibunDb.close()`).
  - Added `isIgnorableDbClosure` in `db.ts` to recognize expected database closures during teardown/navigation and downgrade them to `console.warn`.
  - Cleared `consoleErrors` buffer post-reload in `selectionGizmoLiveProof.spec.ts` so pre-reload teardown noise does not pollute the active test run.
  - Disambiguated `Rivet Stamp` role queries between LeftToolbar and RightInspector, added accessible `aria-label` to Guide button in the top rail (`AtelierRail.tsx`), and handled intro curtain detachment timeouts in `landing.spec.ts`.
  - Replaced hardcoded machine-specific brain directory paths with dynamic `path.join(process.cwd(), 'test-results', 'e2e-artifacts')` and recursive folder creation.
  - All 8 Playwright E2E suites (20 tests) pass 100% green deterministically across repeated parallel runs.
- **Automated Semantic Verifier, Musical Attribution & Algorithmic Rigor (`scripts/verifyDocIntegrity.mjs`, `ARCHITECTURE.md`, `README.md`, `MAIN.md`, `PIXIBUN_DEEP_DIVE.md`, `SKILL.md`, `src/lib/audio/tracks.ts`, `tests/benchmark.test.ts`)**:
  - Added Check 5 in `scripts/verifyDocIntegrity.mjs` verifying claimed unit and E2E test counts against live `npx vitest list` and `npx playwright test --list` runners.
  - Added Toby Fox / Deltarune musical composition copyright and educational fan homage attribution notices in `tracks.ts` and `README.md`.
  - Updated benchmark test title from obsolete "optical flow" to "signed distance field morphing" in `tests/benchmark.test.ts`.
  - Replaced optical flow claims with Signed Distance Field (SDF) morphing and 8-connected multi-source BFS.
  - Aligned frontal cushion formula to $\text{rimRatio} = \min(1, D / 2.8)$ and $H = \max(D) \cdot \sqrt{\text{rimRatio}}$.
  - Aligned salience weighting to $2\times2$ forward differences with $[1.0, 3.5]$ clamp.
  - Aligned palette cycling retuning to harmonic rational retuning: $k = \operatorname{round}(T \cdot \text{rate} / M)$.
  - Documented missing keyboard shortcuts (<kbd>N</kbd>, <kbd>S</kbd>, <kbd>P</kbd>), `/playground` sandbox route, and APNG/MP4/WebM export nuances.
  - Harmonized `SKILL.md:12` emoji rule to distinguish functional documentation markers from decorative AI slop emojis.

## [v1.12.0] - 2026-09-08
### Selection Free-Transform Gizmo, Sprite Sheet Slicer & Web Worker Offloading Engine (Phase 48)
- **RotSprite Rotation Engine (`src/lib/canvas/rotSprite.ts`, `tests/rotSpriteAcademic.test.ts`)**:
  - Implemented the full Xenowhirl (2007) RotSprite algorithm for low-resolution pixel art (as popularized in Aseprite).
  - Features three-stage pipeline: Scale8x cascade via Scale2x corner-connectivity, subpixel inverse affine rotation, and parabolic center-weighted majority voting filter to downscale back to 1x without introducing new color shades.
  - Created unit tests in `tests/rotSpriteAcademic.test.ts` validating rotation symmetry, palette preservation, and 90° exact equivalence.
- **Selection Boundary Extraction & Marching Ants (`src/lib/canvas/selectionUtils.ts`, `tests/selectionBoundary.test.ts`)**:
  - Implemented `extractSelectionBoundarySegments` traversing 1-bit binary selection masks along orthogonal cell boundaries to extract per-pixel edge segments for arbitrary irregular shapes.
  - Implemented `boundarySegmentsToSvgPath` converting boundary edges to dual-tone SVG dashed marching ants paths.
  - Added unit tests in `tests/selectionBoundary.test.ts` verifying boundary extraction and disconnected selection islands.
- **Interactive Selection Free-Transform Gizmo (`src/components/studio/SelectionTransformGizmo.tsx`, `src/hooks/viewport/useViewportSelectionTransform.ts`, `src/components/layout/CenterViewport.tsx`, `tests/components/SelectionTransformGizmo.test.tsx`)**:
  - Mounted an interactive free-transform gizmo with 8 transform handles at 16×16 px screen-space hitboxes in this release. Current source uses 18 px; the original release dimensions are retained as history.
  - Center pivot reticle ($\oplus$) draggable for setting custom rotation/scaling centers.
  - 4 corner rotation hit zones with 15° Shift snapping, angle readout badge, 60 FPS nearest-neighbor preview during drag, and quick-action HUD bar (Flip H, Flip V, Rotate 90° CW/CCW, Commit, Cancel).
  - Added component tests in `tests/components/SelectionTransformGizmo.test.tsx` verifying handle rendering, HUD controls, and interactive dragging.
- **Timeline TagManagerModal Integration (`src/components/layout/BottomTimeline.tsx`, `tests/components/BottomTimeline.test.tsx`)**:
  - Added "Manage Tags" launcher button in the timeline clip bar next to `+ Tag Clip`.
  - Connected `TagManagerModal` dialog directly into timeline workflow for creating, editing, and deleting animation tags.
  - Added component tests in `tests/components/BottomTimeline.test.tsx` verifying modal opening and tag creation.
- **Sprite Sheet Auto-Slicer Engine (`src/lib/canvas/spritesheetSlicer.ts`, `src/components/modals/ImportModal.tsx`, `src/components/layout/StudioLayout.tsx`, `tests/spritesheetSlicer.test.ts`, `tests/components/ImportModal.test.tsx`)**:
  - Added pure slicer engine computing grid coordinates, filtering blank alpha cells, and extracting frames.
  - Added dedicated "Sprite Sheet Slicer" tab in `ImportModal.tsx` with preset buttons (16x16, 24x24, 32x32, 48x48, 64x64, custom), live cutline canvas preview with indexed frame badges (`#1`, `#2`, ...), and timeline append/replace options.
  - Updated `StudioLayout.tsx` to batch-import sliced frames directly into the timeline.
  - Added unit tests in `tests/spritesheetSlicer.test.ts` and component tests in `tests/components/ImportModal.test.tsx`.
- **Heavy Compute Web Worker Offloading (`src/workers/heavyCompute.worker.ts`, `src/lib/engine/workerDispatcher.ts`, `src/hooks/viewport/events/useArtisanEvents.ts`, `tests/workerDispatcher.test.ts`)**:
  - Created background Web Worker for heavy graphics tasks (`rotSprite`, `wfc`, `morph`) using Transferable `ArrayBuffer` objects for zero-copy transfers.
  - Created `workerDispatcher.ts` with automatic synchronous fallback for Node.js test environments or when workers are unavailable.
  - Integrated worker dispatcher into `useArtisanEvents.ts` for asynchronous WFC synthesis and in-between frame morphing.
  - Added unit tests in `tests/workerDispatcher.test.ts` verifying task execution and fallback handling.

## [v1.11.1] - 2026-09-08
### Graphics Pipeline Bug Fixes, Bitwise Normalization & System Hardening (Phase 47)
- **Unsigned 32-Bit Bitwise Normalization (`src/lib/canvas/floodFill.ts`, `tests/floodFillHex.test.ts`)**:
  - Fixed flood fill failure on opaque colored regions caused by signed 32-bit shift overflow (`(a << 24)` returning negative signed integers for $a = 255$) failing strict equality against unsigned `Uint32Array` values.
  - Appended `>>> 0` to `targetColor32` and `replacementColor32`, and added view-safe `Uint32Array` buffer offset instantiation.
  - Added unit tests in `tests/floodFillHex.test.ts` verifying opaque colored pixel expansion.
- **Export Modal Download Stream Race Prevention (`src/components/modals/ExportModal.tsx`, `tests/components/ExportModal.test.tsx`)**:
  - Replaced synchronous `URL.revokeObjectURL(url)` immediately after `link.click()` with a 1000ms deferred teardown (`setTimeout`) across all 11 download handlers (PNG, SVG, GIF, MP4, WebM, APNG, Spritesheet, Replay) to prevent premature blob invalidation in Firefox and Safari.
  - Added component tests in `tests/components/ExportModal.test.tsx` verifying asynchronous revocation timing.
- **Semi-Transparent Vector SVG Alpha Preservation (`src/lib/export/depixelizeVector.ts`, `tests/depixelizeVectorExport.test.ts`)**:
  - Corrected `packRgbaKey` to serialize fractional alpha via `rgba(r,g,b,(a/255).toFixed(3))` for $0 < a < 255$, preserving translucent sprite elements upon SVG export.
- **MP4 Odd-Dimension Macroblock Alignment (`src/lib/export/mp4Encoder.ts`, `tests/mp4Encoder.test.ts`)**:
  - Padded export canvas dimensions to even integer bounds via `(width * scale + 1) & ~1` and `(height * scale + 1) & ~1` to prevent hardware H.264 macroblock encoding and YUV 4:2:0 subsampling crashes on odd sprite dimensions.
- **P2P Post-Connection Layer Sync & State Hardening (`src/lib/sync/coDrawBridge.ts`, `tests/p2pSync.test.ts`)**:
  - Tracked `syncedLayerIds` and canvas dimensions to push initial snapshots when layers are added post-connection or canvas is resized.
  - Pruned deleted layer CRDT replicas and isolated guest active frame/layer pointers from incoming host updates.
- **Viewport Drawing HUD Decoupling (`src/components/layout/CursorStatusBadge.tsx`, `src/components/layout/CenterViewport.tsx`, `src/hooks/viewport/useViewportDrawing.ts`, `tests/components/CursorStatusBadge.test.tsx`)**:
  - Decoupled cursor coordinate state from parent `CenterViewport.tsx` into isolated subscriber `CursorStatusBadge.tsx`, eliminating component re-render cascades during active pen and brush strokes.
- **Photometric Lighting Cel-Shading Backlight Verification (`src/lib/ai/math/photometricLighting.ts`, `tests/orbPhotometricCelShading.test.ts`)**:
  - Verified existing `Math.max(0, ...)` guard in `wrapNdotL` and added unit test verifying that azimuth $180^\circ$ and negative elevation ($N \cdot L = -1.0$) evaluates to shadow tones without `NaN`.

## [v1.11.0] - 2026-09-08
### 2.5D Normal Chisel & Mark Ferrari Palette Cycling Suite (Phase 46)
- **2.5D Normal Chisel & Bas-Relief Sculptor (`src/lib/art/normalSculptor.ts`)**:
  - Implemented unit tangent normal vector encoding and decoding with OpenGL $+Y$ up convention ($N_x, N_y, N_z \in [-1, 1] \leftrightarrow [0, 255]$ with flat baseline at $(128, 128, 255)$).
  - Analytical directional bevel geometry with compass azimuth $\alpha \in [0, 360^\circ)$ and incline $\phi \in (0, 90^\circ]$.
  - Shallow spherical rivet/stud stamp calculation with flattening factor $h \in (0, 1]$ and inversion flag for dimples/countersunk holes.
  - Reoriented Normal Mapping (RNM, Colin Barré-Brisebois & Stephen Hill 2012) via shortest-arc quaternion rotation, plus UDN detail normal blending.
  - Two-phase `ChiselStrokeSession` envelope buffer preventing intra-stroke angular accumulation.
- **Studio Chisel & Rivet Integration (`src/types/tools.ts`, `src/stores/slices/createToolSlice.ts`, `src/components/layout/LeftToolbar.tsx`, `src/components/ui/PixelIcon.tsx`, `src/components/layout/inspector/NormalSculptorSection.tsx`, `src/components/layout/inspector/AiToolsPanel.tsx`, `src/components/layout/CenterViewport.tsx`)**:
  - Added `'normal-chisel'` and `'rivet-stamp'` tool options and state slices.
  - Interactive 3D normal vector sphere gizmo visualizing active normal azimuth and incline in real time.
  - Chisel and rivet icons on LeftToolbar with keyboard shortcuts.
- **Mark Ferrari 8-Bit Dynamic Palette Cycling Engine (`src/lib/color/paletteCycling.ts`)**:
  - Binary parsing and serialization for Amiga IFF ILBM `CRNG` (8-byte) and Commodore Graphicraft `CCRT` (14-byte) chunks.
  - 32-bit LUT renderer (`updateLivePaletteLUT32`) updating canvas ImageData buffers at 60 FPS; the LUT update allocates RGB tuples while per-pixel remapping does not.
  - Mathematically sound triangle-wave ping-pong period $M = 2(S - 1)$ with zero-bound fencepost safety.
  - Sub-step `BlendShift` linear color interpolation between adjacent palette registers.
  - Harmonic rational retuning (`retuneTracksForSeamlessLoop`) preventing coprime LCM period explosion during loop baking.
- **Palette Inspector Controls & Exporters (`src/components/layout/inspector/PalettePanel.tsx`, `src/lib/export/shaderExporter.ts`, `src/components/modals/ExportModal.tsx`)**:
  - In-studio palette cycling preview with speed, direction, ping-pong, and BlendShift controls.
  - Standalone Godot 4 `.gdshader` and Unity URP 2D HLSL shader generator with point filtering.
  - APNG and animated GIF cycle loop unroller.
- **Zero Name-Sniffing & Pure Machine-Tag Architecture (`src/hooks/viewport/useViewportStudioEvents.ts`)**:
  - Purged all legacy display-name heuristic checks (`startsWith('photometric')`, `startsWith('specular')`, `startsWith('normal')`) across `compositeSourceSnapshot`, `updateTaggedLayer`, `duplicateLayers`, and `bakePhotometricLighting`.
  - Excluded `tag === 'normal'` and `tag === 'normal-map'` from diffuse albedo composites to protect base sprite textures from vector byte corruption.
  - Enforced strict machine-tag matching (`l.tag === tag`) across all layer types in the raster and photometric pipeline.
- **Sequential Test Isolation & Clean Database Teardown (`src/lib/storage/db.ts`, `tests/e2e/chiselAndPaletteLiveProof.spec.ts`)**:
  - Implemented explicit `window.__pixibunDb.close()` prior to database schema deletion.
  - Wrapped `indexedDB.deleteDatabase('PixiBunDB')` in a Promise that explicitly rejects on `req.onblocked` to eliminate hanging connection races.
  - Added post-reload store assertions (`frameCount === 1`, `layerCount === 1`, `hasNormalLayer === false`, `showNormalPreview === false`) guaranteeing clean test starting states.
- **Live Studio E2E Verification Suite (`tests/e2e/chiselAndPaletteLiveProof.spec.ts`)**:
  - Built comprehensive Playwright E2E test verifying live chisel carving, normal preview overlay toggle, 45° vs 225° relighting contrast inversion (32,558 modified pixels), and live Mark Ferrari palette cycling.
  - Archived 8 verified visual integration proof artifacts in `docs/assets/screenshots/`.
- **Unit & Integration Suite (`tests/normalSculptor.test.ts`, `tests/paletteCycling.test.ts`)**:
  - Added 31 unit tests validating normal math, RNM quaternion blending, IFF chunk codecs, ping-pong fenceposts, and shader syntax. Full suite passes: 445 tests across 66 suites.

## [v1.10.4] - 2026-09-07
### Landing Page Anti-Slop Remediation & Silky-Smooth Animations (Phase 45)
- **Direct Static Imports & Zero-Lag Tab Switching (`src/components/landing/AtelierEngineShowcase.tsx`)**:
  - Replaced `next/dynamic` lazy imports with direct static imports for all 4 showcase panels (`PhotometricShowcase`, `RotSpriteShowcase`, `PixelizeShowcase`, `EngineExportShowcase`), eliminating dark flashing, loading skeletons, and unmounting delay.
- **Framer Motion `layoutId` Spring Pill Selector (`src/components/landing/AtelierEngineShowcase.tsx`)**:
  - Added spring physics pill indicator (`layoutId="activeEngineShowcaseTab"`, stiffness 440, damping 32) behind active tab labels and smooth cross-fade transition on panel swap.
- **Landing Navigation Layout Stability & Progress Track (`src/components/landing/LandingNav.tsx`)**:
  - Replaced inline text layout-shifting spark with absolute bottom underline indicator (`layoutId="activeNavIndicator"`), preventing horizontal text jitter during viewport scroll.
  - Housed scroll progress bar within an explicit background track.
- **Purge of Residual Emojis and Copy Polish (`src/components/landing/showcase/PhotometricShowcase.tsx`, `src/components/landing/showcase/EngineExportShowcase.tsx`, `src/components/landing/AtelierDeskScene.tsx`, `src/app/error.tsx`, `src/app/studio/error.tsx`, `src/app/global-error.tsx`)**:
  - Replaced emoji buttons and icons with crisp 16x16 pixel SVG vectors (`<IconLighting />`, `<IconRotate />`, `<IconSynthesis />`, `<IconExport />`, pixel lamp, pixel heart, pixel chevrons).
  - Upgraded error boundary visuals with official `<BunMascot size={28} />`.
  - Replaced broken marketing badge with `"INTERACTIVE GRAPHICS BENCHMARK"`.
- **Regression Suite Verification (`tests/components/AtelierEngineShowcase.test.tsx`)**:
  - Updated clipboard copy assertion and verified all 8 integration tests pass.

## [v1.10.3] - 2026-09-07
### Zero-Slop Hardening, Accessibility & Documentation Parity (Phase 44)
- **WCAG 2.2 AA Accessibility (`src/components/landing/showcase/RotSpriteShowcase.tsx`, `src/components/modals/ColorPickerModal.tsx`, `src/components/onboarding/ArtisanHandbookPanel.tsx`)**:
  - Added programmatic `aria-label` attributes to the three auxiliary range inputs ("Rotation angle", "Color hue", "Lightbox opacity").
  - Regression tested in `tests/components/ArtisanHandbookPanel.test.tsx`.
- **Anti-Slop Emoji Purge (`SKILL.md` Rule 12)**:
  - Eliminated 12 residual decorative Unicode characters across `CoDrawModal.tsx`, `ShortcutsModal.tsx`, `PixelLightBulbGizmo.tsx`, and `PhotometricLightingSection.tsx`.
  - Added native pixel-art `'lamp'` icon in `PixelIcon.tsx` on a 16x16 grid.
  - Regression tested in `tests/components/PixelLightBulbGizmo.test.tsx` verifying zero emoji characters in HUD toolbar.
- **Documentation Truthfulness & Metric Alignment (`README.md`, `ARCHITECTURE.md`)**:
  - Corrected E2E metric in `README.md` to "6 E2E spec suites (18 tests)".
  - Aligned `ARCHITECTURE.md` §4 undo history limit with physical 50-step circular ring buffer matching `SKILL.md` and `useViewportDrawing.ts:33`.
- **Test Environment Polish (`tests/setup.ts`, `vitest.config.mjs`)**:
  - Added in-memory `localStorage` mock in `tests/setup.ts` to eliminate all Node v26 experimental warnings during `vitest` runs.

## [v1.10.2] - 2026-09-07
### Cel-Shading Shadow Terminator Math Fix (Phase 43b)
- **Fixed flat/invisible cel-shading on character sprites (`src/lib/ai/math/photometricLighting.ts`)**:
  - Root cause: the discrete OKLCH cel-shading branch mixed an ambient signal (`ambSignal ≈ 1.27`) into the `lightLevel` formula and applied a double brightness multiplication, making `lightLevel ≥ 1.0` for ALL pixels — mathematically impossible to drop below `shadowThresh = 0.58`.
  - Fix: shadow placement is now driven purely by the directional diffuse signal (`diffSignal = wrapNdotL × effectiveFalloff`), with threshold `0.55`. The ambient contribution no longer factors into shadow termination — it fills all surfaces equally and must not overwhelm the directional terminator.
  - Result: character sprites now show crisp anatomical cel-shadows on the unlit side (ears, chin, snout, limb backsides, body bottom), with ~40–50% surface coverage in shadow for typical side-lit compositions.

## [v1.10.1] - 2026-09-07
### Minecraft Skin vs 2.5D Character Sprite Topological Discriminator & Photometric User Sovereignty (Phase 43)
- **Deep 8-Connected Topological Discriminator (`src/lib/ai/math/minecraftSkin.ts`)**:
  - Replaced naive 2-condition void/head check with `analyzeMinecraftSkinTopology(isOpaque, width, height)`.
  - Analyzes 8-connected component graph, dominant component pixel ratio (`largestComponentRatio`), bilateral limb presence ($x \in [0, 16)$ Right Leg, $x \in [40, 56)$ Right Arm), canonical void zone integrity ($<20\%$ pollution), and bounding box margins ($x < 10$ and $x > 48$).
  - Corrects the false positive where centered 64x64 character illustrations (e.g. red bunny, cat, props) were misidentified as Minecraft UV atlases, which previously led to flat $(0, 0, 1.0)$ normal generation and disabled photometric shading. Centered silhouettes ($\ge 68\%$ pixels in dominant component, empty lateral flanks) are decisively routed to standard 2.5D lighting.
- **Photometric Pipeline & Form Type Protection (`src/lib/ai/math/photometricLighting.ts`)**:
  - `executePhotometricPipeline` and `renderParametric2p5DLighting` now honor `params.minecraftSkinMode`.
  - When mode is `'disabled'` or `formType` is explicitly `'character' | 'orb' | 'prop'`, Minecraft skin shading is bypassed completely, ensuring continuous tangent normals and content-aware heightmaps.
- **User Sovereignty & Studio Store (`src/types/tools.ts`, `src/stores/slices/createToolSlice.ts`, `src/stores/slices/types.ts`, `src/hooks/viewport/useViewportStudioEvents.ts`)**:
  - Added `minecraftSkinMode?: 'auto' | 'enabled' | 'disabled'` to `PhotometricLightingParams` and `ToolSettings`.
  - Added `setMinecraftSkinMode` action to Zustand tool slice.
  - Forwarded `minecraftSkinMode` through viewport events (`handlePhotometricGizmoStartEvent`, `handlePhotometricLiveUpdateEvent`, `handleDirectPhotometricEvent`, `handleBakeNormalMapEvent`).
- **Tactile Inspector Mode Selector (`src/components/layout/inspector/PhotometricLightingSection.tsx`)**:
  - Added interactive `Skin 3D Shading: [ Auto | On | Off ]` button group in the lighting inspector whenever canvas dimensions are 64x64 or 64x32, complete with live status descriptions.
- **Comprehensive Quality Gates & Testing (`tests/minecraftSkinDetection.test.ts`, `tests/photometricNonDestructive.test.ts`)**:
  - Authored 8 new unit tests covering empty canvases, authentic Minecraft UV unwrap detection, centered character sprite classification, non-standard dimensions, and mode overrides.
  - Total test count expanded to 414 tests across 64 suites (100% passing).

## [v1.10.0] - 2026-09-06
### Co-Draw Activation: End-to-End CRDT Sync & Deep Audit Remediation (Phase 42)
- **P2P Co-Draw Wired End-to-End (`src/lib/sync/coDrawBridge.ts`, `src/lib/sync/p2pSync.ts`, `src/lib/collab/crdtPixelBuffer.ts`)**:
  - The CRDT engine was previously exercised only by tests; the CoDrawModal created sessions with no sync callbacks, so connected peers never exchanged a single pixel despite UI claims. The new module-scoped `CoDrawBridge` singleton integrates the full pipeline: structure join, full-state antientropy, delta propagation, and presence.
  - Full-state antientropy join per Shapiro et al. (SSS 2011, §4): on connect, the host broadcasts a `STRUCTURE_SYNC` payload so both peers share one layer-ID namespace, seeds one `CrdtPixelBuffer` per layer from the live canvases, and transmits complete per-layer state snapshots (with a bounded retry loop, since `RTCPeerConnection.connectionState === 'connected'` does not imply RFC 8831 data-channel openness).
  - Delta propagation: committed strokes are diffed against their pre-stroke history snapshot via the new pure `diffImageDataToOps` in `src/lib/sync/strokeDiff.ts`; each changed pixel becomes an LWW op broadcast per layer. Remote ops are applied via `applyRemoteOp` (HLC + bounded drift + deterministic peerId tie-break) and painted onto layer buffers in a single `getImageData`/`putImageData` pass.
  - Protocol extension in `src/lib/sync/p2pSync.ts`: new `STRUCTURE_SYNC` message with strict `validateStructurePayload` (bounds-checked dimensions, frame/layer counts, blend-mode whitelist, tag length); `layerId` is now mandatory on ops messages for unambiguous per-layer CRDT routing.
  - Presence: throttled ~30fps cursor broadcast over the lossy PR-SCTP channel, rendered by the new zoom-aware `src/components/studio/RemoteCursorsOverlay.tsx` with 4-second staleness pruning.
  - Sessions now outlive modal unmount (singleton-owned instead of modal `useState`-owned); `src/components/modals/CoDrawModal.tsx` rehydrates connection state on mount, and its copy now honestly states that the host owns the layer structure while connected.
- **Deep Audit Remediation (Critical/High Severity)**:
  - Canvas resize no longer corrupts artwork on undo: undo snapshots store full-canvas `ImageData` at capture-time dimensions, so `src/components/layout/StudioLayout.tsx` now dispatches `pixibun:history-clear` after both resize paths (resize modal and image-import resize-to-match).
  - Studio boot crash eliminated: `src/stores/slices/createToolSlice.ts` parsed `pixibun_recent_colors` from localStorage with unguarded module-scope `JSON.parse`; a corrupted value would white-screen the studio permanently. Now guarded with try/catch, array/string type filtering, and a safe fallback.
  - Frame operation bounds guards in `src/stores/slices/createAnimationSlice.ts`: `deleteFrame` no longer crashes on out-of-range indices, and `reorderFrames` can no longer splice `undefined` entries into `frames`.
- **Deep Audit Remediation (Medium/Low Severity)**:
  - Redo of created layers now re-inserts them into their originating frame (`nextStep.frameIndex`) instead of the currently active frame, and preserves the machine tag via the new `createdLayerTag` field on `HistoryStep` in `src/types/canvas.ts`, captured in `src/hooks/viewport/useViewportDrawing.ts` and `src/hooks/viewport/useViewportStudioEvents.ts`.
  - Merge-down is now a two-step confirm in `src/components/layout/inspector/LayersPanel.tsx` (the pixel-granularity history engine cannot represent structural layer ops, so it was previously irreversible with a single misclick).
  - Eyedropper no longer leaves a stale pre-stroke snapshot that a fast pointer-up could commit as a no-op undo step (`src/components/layout/CenterViewport.tsx`).
  - `hexToRgba` in `src/lib/canvas/floodFill.ts` now expands 4-digit `#RGBA` shorthand per CSS Color 4 instead of silently returning white.
  - Theme detection in `src/stores/themeStore.ts` respects `prefers-color-scheme` for first-time visitors.
  - `loadProjectState` in `src/stores/slices/createHistorySlice.ts` resets viewport-local state (selection, selection mask, active clip, playback) across project boundaries.
- **Diagnostics Relay Server Hardening (`src/app/api/diagnostics/relay/route.ts`, `src/lib/server/tokenBucket.ts`)**:
  - Added token-bucket rate limiting (12 requests/minute, burst 12, keyed by client IP) via the new pure, unit-tested `src/lib/server/tokenBucket.ts`.
  - Added a 64KB request-body ceiling enforced before JSON parsing and a 100-event cap on forwarded batches (413/429 responses), closing unbounded-body and upstream-flooding vectors. The SSRF/HTTPS-only upstream guard is unchanged.
- **Documentation Integrity**: All changes verified with `tsc --noEmit`, `eslint`, 406/406 unit tests (20 new in `tests/strokeDiff.test.ts`, `tests/tokenBucket.test.ts`, `tests/structurePayload.test.ts`, `tests/floodFillHex.test.ts`), and a clean production build. Known documented limitation: while connected, the host owns the layer/frame structure; guest structural edits stay local and are overwritten by the next host structure push.

## [v1.9.2] - 2026-09-05
### TestSprite Cloud End-to-End Suite & Complex Feature Verification (Phase 41)
- **P2P Co-Draw Modal & Serverless Signaling Token Generation (`src/components/modals/CoDrawModal.tsx`)**:
  - Authored and verified TestSprite frontend test plan (`c2ef43f3-cb81-4b9a-914b-6995344f953f`) evaluating header button integration, WebRTC host invite generation, join answer inputs, and clean modal dismissal (8/8 steps passed).
- **On-Canvas Pixel Light Bulb Gizmo & Live Shading Preview (`src/components/studio/PixelLightBulbGizmo.tsx`)**:
  - Authored and verified TestSprite frontend test plan (`d4bc65ba-70f5-4951-9c72-89f467290cf3`) evaluating circular artwork drawing, PixiBud studio activation, on-canvas pixel light bulb gizmo and top floating action bar (`Apply` / `Cancel`) mounting, and clean cancellation restoring canvas interactivity (11/11 steps passed).
- **Export Modal Multi-Format & Codec Capability Detection (`src/components/modals/ExportModal.tsx`)**:
  - Authored and verified TestSprite frontend test plan (`fca5c184-839d-4c09-a96c-ca6d560a5f3d`) evaluating Sprite Sheet layout packing options and MP4 video format codec capability notice evaluation (8/8 steps passed).
- **PWA Web Application Manifest & Strict Security Headers (`public/manifest.webmanifest`)**:
  - Authored and verified TestSprite backend test (`8aaeceaa-265c-4ead-94df-fcfbf723cd57`) asserting HTTP 200 OK, `application/manifest+json` MIME type, manifest JSON structure, and strict security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`) passed.
- **Suite-Wide Verification**: Achieved 22/22 (100%) pass rate across TestSprite frontend (13 tests) and backend (9 tests) suites with zero failures.

## [v1.9.1] - 2026-09-05
### Audit Remediation & Quality Gate Parity (Phase 40)
- **Honest MP4 Capability Detection & CI Test Harness (`src/lib/export/mp4Encoder.ts`, `src/components/modals/ExportModal.tsx`, `tests/mp4Encoder.test.ts`)**:
  - Replaced non-functional ~200-byte stub container output with honest capability detection via `isMp4ExportSupported()` requiring both `MediaRecorder` and `captureStream` support.
  - Added user-facing warning in `src/components/modals/ExportModal.tsx` advising users to export as WebM or GIF when native MP4 encoding is unsupported.
  - Implemented mock `MediaRecorder` test harness in `tests/mp4Encoder.test.ts` (expanded to 12 tests).
- **Studio Accessibility Rigor & Complete Rule Carve-Out Elimination (`tests/e2e/studio.spec.ts`, `src/components/studio/FloatingPreviewWindow.tsx`, `src/components/layout/inspector/LayersPanel.tsx`, `src/components/layout/BottomTimeline.tsx`, `src/stores/themeStore.ts`)**:
  - Completely removed `.disableRules(['target-size', 'color-contrast'])` in `tests/e2e/studio.spec.ts`.
  - Upgraded touch targets to $\ge 24\times24$px across `src/components/studio/FloatingPreviewWindow.tsx` backdrop options, `src/components/layout/inspector/LayersPanel.tsx` layer lock button, and `src/components/layout/BottomTimeline.tsx` clip delete button.
  - Upgraded frame duration text contrast to $>6:1$ against dark panel surfaces.
  - Configured dark color scheme parity in `playwright.config.ts` and `src/stores/themeStore.ts`.
  - All 17 Playwright E2E tests pass with zero axe violations.
- **Photometric & Tangent-Space Normal Map Optimization (`src/lib/ai/math/edtNormalMap.ts`, `src/components/layout/CenterViewport.tsx`)**:
  - Precomputed 2D spatial Gaussian distance lookup table (`spatialLUT`) in `applyBilateralFilter` in `src/lib/ai/math/edtNormalMap.ts`, eliminating 50% of inner-loop `Math.exp()` calls, with bounds guards for non-positive dimensions and sigmas.
  - Memoized normal map preview canvas in `src/components/layout/CenterViewport.tsx` (measured 1179 lines) using an offscreen canvas ref cache invalidated only when `bufferVersion`, `activeFrameIndex`, layer structure signature, or floating selection key changes.
  - Removed inert `isDrawingRef` dependency from `src/components/layout/CenterViewport.tsx`'s `useEffect`.
- **P2P WebRTC Sync Hardening & Bounded CRDT Log (`src/lib/sync/p2pSync.ts`, `src/lib/collab/crdtPixelBuffer.ts`, `tests/p2pValidation.test.ts`)**:
  - Enforced 256KB DataChannel payload ceiling in `src/lib/sync/p2pSync.ts`.
  - Implemented strict runtime schema and integer bounds validation on incoming `PixelOp`s.
  - Added automatic chunking into 1000-op batches for `broadcastPixelOps` and `broadcastInitialSync`.
  - Bounded `opLog` in `src/lib/collab/crdtPixelBuffer.ts` (`MAX_OP_LOG_SIZE = 10000`) with sliding window eviction.
  - Added 17 unit tests in `tests/p2pValidation.test.ts`.
- **APNG Store Block Documentation (`src/lib/export/apngEncoder.ts`)**:
  - Honestly documented uncompressed DEFLATE store blocks (BTYPE 00) and byte-exact CRC32/Adler-32 chunking in `src/lib/export/apngEncoder.ts`.
- **Color Ramp Generator Hardening & Unit Tests (`src/lib/color/rampGenerator.ts`, `tests/rampGenerator.test.ts`)**:
  - Fixed `hexToRgb` to slice 8-character and 4-character hex inputs with alpha before parsing, eliminating blue channel bit-shift drift in `src/lib/color/rampGenerator.ts`.
  - Added 11 comprehensive unit tests in `tests/rampGenerator.test.ts`.
- **Codebase Polish (`src/hooks/viewport/useViewportDrawing.ts`, `src/lib/canvas/floodFill.ts`)**:
  - Translated Turkish comment to English in `src/hooks/viewport/useViewportDrawing.ts`.
  - Corrected docstring in `src/lib/canvas/floodFill.ts` to document iterative 4-connected stack-based fill.
- **Unit Test Suite Expansion**: Expanded unit test suite from 317 tests (53 suites) to 351 tests (55 suites) with 100% pass rate.

---

## [v1.9.0] - 2026-09-05
### Studio UI/UX 10/10 Overhaul: Amethyst Wisteria Hover, Specular Sweep Upgrade & Viewport Harmonization
- **Harmonized Tactile Button Design System (`src/components/ui/TactileButton.tsx`, `src/app/globals.css`)**:
  - Replaced blinding white hover states (`hover:bg-[#f0ecf6]`, `hover:bg-[#fff8db]`) that washed out amber text and obscured specular light sweeps with calibrated Amethyst Wisteria (`#603B82`, OKLCH $L \approx 0.42, C \approx 0.13, H \approx 312^\circ$).
  - Guarantees WCAG 2.2 AA contrast ratios ($4.6:1$ against `#f0be7c` gold text, $6.2:1$ against `#ede8f4` cream text).
  - Upgraded specular CC light sweep animation to a dual-band gradient with wisteria flanking wings (`linear-gradient(115deg, transparent 0%, rgba(220,171,223,0.15) 20%, rgba(255,255,255,0.75) 50%, rgba(220,171,223,0.15) 80%, transparent 100%)`).
  - Standardized microinteraction spring physics across all studio buttons (`scale: 1.025` on hover, `scale: 0.97` on tap, `rounded-[2px]`).
  - Harmonized modal action buttons across `src/components/layout/AtelierRail.tsx`, `src/components/modals/ExportModal.tsx`, `src/components/modals/ShortcutsModal.tsx`, `src/components/modals/ImportModal.tsx`, `src/components/modals/ColorPickerModal.tsx`, `src/components/modals/CanvasResizeModal.tsx`, and `src/components/system/PwaUpdateToast.tsx`.
- **Viewport HUD & Control Deduplication (`src/components/layout/CenterViewport.tsx`)**:
  - Eliminated redundant bottom-left viewport zoom HUD (`[-] {zoom}% [+] [Fit] [16x] [32x32]`) that conflicted with the primary TopHeader zoom controls.
  - Redesigned bottom-right cursor coordinate indicator from generic gray pill to dark atelier aesthetic (`bg-[var(--desk-surface-raised)] border-2 border-[var(--desk-border)] rounded-[2px] text-[var(--accent-gold)] font-mono text-[10px]`).
- **Inspector Panel Feature Reorganization (`src/components/layout/inspector/VolumetricOpticsSection.tsx`, `src/components/layout/inspector/TilesetDecomposerSection.tsx`)**:
  - Removed misplaced `47-Blob Autotile Edges` button and duplicate `Ground Drop Shadow` button from Volumetric Optics section.
  - Relocated `47-Blob Autotile Edges` to the dedicated Tileset Decomposer panel alongside `Decompose Layer`.
- **Light Gizmo Header Collision Prevention (`src/components/studio/PixelLightBulbGizmo.tsx`)**:
  - Repositioned the floating gizmo action bar from `-top-12` to `top-3` within the canvas boundary, completely eliminating visual collisions with the secondary context options bar.
- **Unit & Integration Test Suite Verification (`tests/components/TactileButton.test.tsx`, `tests/components/PixelLightBulbGizmo.test.tsx`, `tests/components/InspectorDeduplication.test.tsx`)**:
  - Updated button unit tests validating `rounded-[2px]`, Amethyst Wisteria hover classes, dual-band specular light sweep, and variant styling with 100% pass rate.
  - Verified floating light gizmo toolbar position (`top-3`) inside viewport boundaries.
  - Verified inspector deduplication suite isolating autotile contours to the tileset decomposition engine.

---

## [v1.8.0] - 2026-09-05
### Live-Time On-Canvas Pixel Light Bulb Gizmo & Dynamic Focus Alignment
- **Interactive On-Canvas Light Bulb Gizmo (`src/components/studio/PixelLightBulbGizmo.tsx`)**:
  - Implemented an on-canvas draggable light bulb widget (`pixel-light-bulb-handle`) updating light azimuth and elevation in real time with throttled 60fps requestAnimationFrame rendering.
  - Added dedicated focal center reticle handle (`pixel-light-center-handle`), decoupling bulb orbit from focal center positioning so artists can reposition the lighting subject anchor anywhere across the canvas.
  - Isolated bulb orbit from the center reticle: dragging the bulb updates azimuth and elevation around the stationary center reticle without moving the focus anchor.
  - Dynamically calculates light azimuth from pointer coordinates relative to the subject anchor ($\text{azimuth} = \text{round}((\text{atan2}(dx, -dy) \times 180 / \pi + 360) \pmod{360})$).
  - Added on-canvas keyboard bindings: quick commit with Enter, cancel with Escape, reset focus with R, and brightness/exposure adjustments via `+` / `-` keys or mouse wheel scrolling over the gizmo.
  - Verified in `tests/components/PixelLightBulbGizmo.test.tsx`.

### Deep Character / Object Analysis Hardening & Cel-Shading Engine Restoration
- **Uncapped Asymmetrical Ear & Appendage Scanning (`src/lib/ai/math/photometricAuto.ts`, `src/lib/ai/math/edtNormalMap.ts`)**:
  - Removed the arbitrary 8-pixel cap on silhouette appendage scanning. Scans up to 45% of sprite dimensions across horizontal and vertical sweeps, reliably identifying asymmetrical ears, horns, wings, and cheek tufts at any canvas resolution.
- **Expressive Facial Feature Recognition (`src/lib/ai/math/photometricAuto.ts`)**:
  - Expanded cluster detection limits to support up to 32 facial feature clusters and improved contrast thresholds for darker and red fur tones, protecting eyes, eyebrows, nose, mouth, and whiskers from diffuse crush.
- **Prop & Complex Shape Content-Aware Decomposition (`src/lib/ai/math/photometricLighting.ts`)**:
  - Extended `computeContentAwareHeightmap` decomposition to props and general objects, isolating pure spherical dome EDT strictly to geometric orbs (`formType === 'orb'`).
  - Unified `formType` inference in `src/hooks/viewport/useViewportStudioEvents.ts` for both Auto and Manual studio modes, ensuring hand-drawn characters receive anatomical part segmentation and discrete OKLCH cel-shading even when setting light direction manually.
- **Calibrated Spherical Convex Dome Normal Mathematics (`src/lib/ai/math/edtNormalMap.ts`, `src/lib/ai/math/photometricLighting.ts`)**:
  - Calibrated spherical dome heightmap inflation blends 75% spherical profile with 25% gamma profile; the spherical term flattens at the apex, while the blend retains a nonzero apex slope (`tests/orbPhotometricCelShading.test.ts`).
  - Decoupled direct key light from cavity ambient occlusion on convex slopes to eliminate center-locked apex highlight glitches.

### Test Suite & Verification Expansion
- **Vitest Unit & Integration Suites**: Expanded test suite to 312 tests across 52 suites with 100% pass rate (`tests/components/PixelLightBulbGizmo.test.tsx`, `tests/photometricAutoAnalysis.test.ts`, `tests/orbPhotometricCelShading.test.ts`).

---

## [v1.7.0] - 2026-09-05
### Deep Art Understanding, Anatomical Part Segmentation & OKLCH Cel-Shading
- **Art Morphology & Anatomical Form Classification (`src/lib/ai/math/photometricAuto.ts`)**:
  - Implemented automatic classification of canvas drawings into `character` (creatures with ears/horns, facial features, limbs) vs. `orb` (geometric spheres/circles) vs. `prop`.
  - Connected-component clustering isolates eyes, pupils, mouth, snout, and lateral whiskers (`isFeature`, `isInkLine`).
  - Scans the top 15%–35% of the silhouette for distinct local convex lobes to detect ears and horns.
  - Distinguishes flat unshaded base colors from intentional pre-painted highlights to prevent double-shading artifacts.
  - Verified in `tests/photometricAutoAnalysis.test.ts`.
- **Frontal Face Cushion Plateau & Narrow Appendage Stabilization (`src/lib/ai/math/edtNormalMap.ts`)**:
  - Eliminated "bowling-ball" face inflation on character sprites: for `character` forms, the height reaches a smooth plateau within 2.8px of the boundary contour while the interior remains flat facing the camera ($N_z \ge 0.85$), ensuring light illuminates faces without splitting them in half with shadow.
  - Preserves dedicated local 3D peaks for ears and horns so they catch directional light independently from the head.
  - Stabilizes narrow appendages (ears, horns, antennae, tails $\le 5$px wide) on the light-facing side: clamps $N_x \le 0$ when light comes from the left and enforces $N_z \ge 0.88$, preventing narrow 2–4px ears from bisecting into a 1px lit tube and a 1px dark shadow tube.
  - Stabilizes facial feature and whisker normals to $N = (0, 0, 1)$.
- **Feature Preservation & Discrete OKLCH Cel-Shading Ramps (`src/lib/ai/math/photometricLighting.ts`)**:
  - Pixels identified as `isFeature` (eyes, mouth) or `isInkLine` (outlines, whiskers) bypass diffuse and ambient multipliers entirely, maintaining exact artist colors without diffuse brown mud or dark ambient crush.
  - Excludes facial features and line art from receiving specular highlights.
  - Implemented discrete OKLCH cel-shading ramps cached per unique base color (`CelRamp`): maps each artist base color to exactly one unified crisp shadow tone (cool skylight hue shifted to 260°, $L \times 0.78$), one deep crevice tone for concave seams/folds ($AO < 0.60$, $L \times 0.60$), and optional warm highlight tone (65°).
  - Replaces continuous float gradients and intermediate hue banding with discrete cel steps across character fills.
  - Supports optional Bayer ordered dithering stippling along the cel shadow boundary when `ditherModulation > 0`.
- **Matte Character Specular Suppression (`src/hooks/viewport/useViewportStudioEvents.ts`)**:
  - Automatically suppresses harsh specular glint overlays on matte/fabric character fur and skin, preventing random white spots across character faces.
  - Maintains non-destructive tagged layer replacement (`Photometric <material>`).

### Bounded 2.5D Sprite Cast Shadows & Ground Drop Shadows
- **Length-Bounded 2.5D Sprite Cast Shadow Projection (`src/lib/ai/shadowRayMarcher.ts`)**:
  - Replaced infinite 2D planar cone-tracing wedge with professional length-bounded 2.5D sprite cast shadows.
  - Implemented exact 1-to-1 sheared silhouette projection ($h = y_{\text{base}} - y_s \ge 0$, $\text{projX} = \text{round}(x_s + h \cdot \text{shear}_x)$, $\text{projY} = \text{round}(y_{\text{ground}} + h \cdot \text{shear}_y)$) anchored at the sprite contact baseline ($y_{\text{base}}$).
  - Preserves hollow leg arches, waist indentations, and wing gaps without bounding-box bloat or muddy center ambient occlusion blobs.
  - Verified in `tests/shadowRayMarcher.test.ts`.
- **Classic Ground Contact Drop Shadows (`src/lib/ai/shadowRayMarcher.ts`, `src/components/layout/inspector/RaymarchedShadowSection.tsx`)**:
  - Added dedicated `shadowStyle: 'cast' | 'drop'` support: 'cast' renders directional sheared silhouette on the floor, while 'drop' renders a crisp stylized Bresenham pixel ellipse/capsule under the character contact baseline.
- **Crisp Pixel Art Uniform Opacity (`ditherMode: 'none'`)**:
  - When `ditherMode === 'none'`, shadows render with crisp uniform flat opacity $\text{round}(\text{shadowOpacity} \times 255)$, completely eliminating blurry continuous float alpha gradients and digital airbrush smear.
  - Changed default `ditherMode` across the shadow engine and inspector UI to `'none'`.
- **Smart Shadow Auto-Analysis (`src/lib/ai/math/shadowAuto.ts`)**:
  - Implemented "Analyze & Render" for shadows: analyzes canvas sprite morphology to auto-infer optimal light source coordinates, elevation, radius, opacity, and shadow style with plain-language rationale chips.
  - Verified in `tests/shadowAutoAnalysis.test.ts`.

### Test Suite & Verification Expansion
- **Vitest Unit & Integration Suites**: Expanded test suite from 276 tests across 49 suites to 296 tests across 50 suites with 100% pass rate (`tests/photometricAutoAnalysis.test.ts`, `tests/shadowAutoAnalysis.test.ts`, `tests/shadowRayMarcher.test.ts`).
- **Zero-Error Quality Gates**: Clean TypeScript typecheck (`tsc --noEmit`), zero ESLint errors/warnings, Next.js 16 Turbopack production build passing, and all documentation integrity checks passing.

---

## [v1.6.0] - 2026-09-04
### Architectural Decoupling & Modularization (Phase 33)
- **Viewport Custom Hook Refactoring (`src/hooks/viewport/`)**: Decomposed monolithic `CenterViewport.tsx` (2,328 lines $\to$ 1,176 lines) into five cohesive, single-responsibility hooks (totaling 1,972 lines across extracted hooks):
  - `useViewportDrawing.ts`: Isolated stroke drawing hot path, stroke buffer point management, and `requestAnimationFrame`-throttled buffer version bumps.
  - `useViewportSelection.ts`: Marquee, lasso, and wand selection state; Shift (union) / Alt (subtract) mask merging, floating selection dragging, and clean commit.
  - `useViewportTransform.ts`: Viewport zoom, pan offsets, wheel zooming/panning, center canvas alignment, `Ctrl+0` (fit to screen), and `Ctrl+1` (100% zoom).
  - `useViewportOverlays.ts`: Pixel grid rendering, 2:1 isometric guides, wallpaper symmetry lines, onion skin ghosts, brush ghost cursor, and CVD/Squint display lenses.
  - `useViewportStudioEvents.ts`: Strongly typed subscriber pipeline for photometric lighting, normal map bakes, thinning, WFC synthesis, and procedural filters.
- **Zustand Slices Pattern (`src/stores/slices/`)**: Decomposed monolithic `studioStore.ts` into five domain slices while preserving 100% backwards compatibility:
  - `createToolSlice.ts`: Tool types, brush size, pixel-perfect rasterization, dither matrices, ramps, material presets, and light settings.
  - `createLayerSlice.ts`: Layer stack management, opacity, blend modes, and non-destructive merge down.
  - `createAnimationSlice.ts`: Frames list, active frame index, playback loop, FPS, and onion skinning.
  - `createViewportSlice.ts`: Zoom, pan, grid, isometric guides, 3x3 tile preview, and perceptual lenses.
  - `createHistorySlice.ts`: Selection bounding box, selection mask, buffer version incrementing, and canUndo/canRedo flags.
- **Smart Math Modularization (`src/lib/ai/math/`)**: Extracted `smartMathEngine.ts` into modular domain modules with a clean barrel file:
  - `edtNormalMap.ts`: Felzenszwalb & Huttenlocher (2012) exact Euclidean Distance Transform, inflated heightmaps, bilateral filtering, and tangent normal field computation.
  - `photometricLighting.ts`: Parametric Blinn-Phong 2.5D lighting and volumetric raymarched soft shadows.
  - `dithering.ts`: Atkinson and Riemersma error-diffusion dithering.
  - `rotSprite.ts`: Xenowhirl 8x Scale2X RotSprite rotation engine and Zhang-Suen morphological thinning.
  - `minecraftSkin.ts`: Minecraft player skin UV detection and normal mapping.
- **Dynamic Dialog Code-Splitting**: Code-split client-side dialogs (`ColorPickerModal`, `ExportModal`, `CanvasResizeModal`, `ProjectsGalleryModal`, `ShortcutsModal`) with `next/dynamic(..., { ssr: false })` to optimize initial page bundle payload.

### Academic Research-Backed Graphics Intelligence (Phase 34)
- **Blue-Noise Void-and-Cluster Dithering (`src/lib/canvas/ditherMatrix.ts`)**: Implemented Robert Ulichney's 1993 SPIE void-and-cluster matrix generation algorithm (`generateVoidAndClusterMatrix(16, 16, 1.9)`), producing high-frequency, isotropic dither masks without low-frequency periodic spikes characteristic of Bayer matrices. Verified in `tests/blueNoiseDither.test.ts`.
- **WaveFunctionCollapse (WFC) Pattern Synthesis (`src/lib/procedural/waveFunctionCollapse.ts`)**: Implemented Maxim Gumin's 2016 Overlapping Model constraint solver with Shannon entropy heuristics and deterministic backtracking. Extracts sample tiles and synthesizes textures obeying local $N \times N$ neighborhood constraints with 0 violations. Verified in `tests/waveFunctionCollapse.test.ts`. Integrated into `RightInspector.tsx` and `useViewportStudioEvents.ts`.
- **Kopf–Lischinski Inspired Vector SVG Export (`src/lib/export/depixelizeVector.ts`)**: Implemented pixel art vectorization inspired by Johannes Kopf & Dani Lischinski (SIGGRAPH 2011): 8-connected pixel similarity graphs, diagonal crossing ambiguity resolution via 1-hop parity connectivity heuristics, cell corner offsets ($\pm 0.05$), and smooth cubic Bézier SVG path generation. Verified in `tests/depixelizeVectorExport.test.ts`. Integrated as "Vector SVG" in `ExportModal.tsx`.
- **Crystallographic Wallpaper Group Symmetry Brushes (`src/lib/canvas/wallpaperSymmetry.ts`)**: Implemented Doris Schattschneider's 1978 AMM crystallographic symmetry groups (`p2` 180° rotation, `pm` reflection, `p4` 4-fold rotation, `p4m` 4-fold rotation with reflection, and `p6m` 6-fold rotation with reflection). Multiplies canvas strokes deterministically across crystallographic group orbits. Verified in `tests/wallpaperSymmetry.test.ts`.

### Direct-Manipulation Interaction Model (Phase 35)
- **Direct-Manipulation PixiBud Light Gizmo (`src/components/studio/LightGizmoOverlay.tsx`, `src/lib/canvas/lightGizmoMath.ts`)**: Implemented Ben Shneiderman's 1983 direct manipulation interaction model on the viewport overlay canvas. Renders concentric elevation rings, an azimuth direction line, and a draggable sun disc with real-time spherical coordinate conversion $(x, y) \to (\text{azimuth}, \text{elevation})$. Verified in `tests/lightGizmo.test.ts`.

### Sharing, Collaboration & Process Value (Phase 36)
- **Live Peer-to-Peer WebRTC Canvas Pairing (`src/lib/sync/p2pSync.ts`, `src/components/modals/CoDrawModal.tsx`)**: Built a 100% serverless, accountless co-drawing system on top of `crdtPixelBuffer.ts`. Utilizes a dual `RTCDataChannel` architecture (reliable ordered channel for CRDT ops, lossy PR-SCTP channel for 60fps cursor awareness), copy-paste base64 signaling tokens with Google STUN NAT traversal, and automatic canvas reconciliation. Verified in `tests/p2pSync.test.ts` (4 tests).
- **Process Replay Timelapse Video & GIF Export (`src/lib/export/processReplay.ts`, `src/lib/export/speedpaintExporter.ts`)**: Built a chronological speedpaint replay engine that extracts historical snapshot buffers via `getGlobalHistory()` and renders them into animated GIF and MP4 timelapse videos with nearest-neighbor scaling and progress reporting. Integrated as "Timelapse" in `ExportModal.tsx`. Verified in `tests/processReplayExport.test.ts` and `tests/mp4Encoder.test.ts`.
- **CRDT Pixel-Merge Engine Foundation (`src/lib/collab/crdtPixelBuffer.ts`)**: Implemented Marc Shapiro et al. (SSS 2011) Last-Write-Wins (LWW-Register) CRDT per pixel cell with Kulkarni et al. (OPODIS 2014) Hybrid Logical Clocks and deterministic peer ID tie-breaking, following the local-first architecture advocated by Kleppmann et al. (Onward! 2019). Guarantees Strong Eventual Consistency (SEC) across network partitions. Verified in `tests/p2pCoDrawCrdt.test.ts`.
- **Radio-Synced Visual Pulse (`src/lib/audio/spectralFlux.ts`, `src/lib/audio/lofiRadio.ts`)**: Implemented Simon Dixon (DAFx 2006) and Bello et al. (IEEE Trans. Speech Audio Process. 2005) half-wave rectified spectral energy flux onset detection over Web Audio FFT frames with adaptive thresholding. Emits `pixibun:audio-onset` events on `studioEvents`, driving a gentle, warm amber pulse on the active frame thumbnail in `BottomTimeline.tsx`. Verified in `tests/audioOnsetDetection.test.ts`.

### Competitive Parity & Platform Strategy (Phase 37)
- **Tileset / Tile-Stamping Engine & Decomposer (`src/lib/canvas/tileStamp.ts`)**:
  - Implemented 2D grid snapping (`snapToTileGrid`), buffer tile extraction, stamping, flip horizontal/vertical, and 90° clockwise rotation.
  - Implemented `decomposeIntoTileset` converting canvas layers into deduplicated unique tile atlases and 2D tilemap matrices for Godot, Unity, and Tiled map pipelines.
  - Integrated interactive "Tileset Decomposer" module in `RightInspector.tsx` with 8px, 16px, 32px grid slicing and one-click "Copy Tilemap JSON".
  - Verified in `tests/tileStamp.test.ts` (9 tests).
- **Lospec Palette Ecosystem Integration (`src/lib/color/lospecPalette.ts`)**:
  - Multi-format parser for Lospec `.hex` files, GIMP `.gpl` (RGB triplets) files, and Lospec JSON schemas.
  - Added "+ Lospec (.hex)" import button and native drag-and-drop file import in `RightInspector.tsx`.
  - Verified in `tests/lospecPalette.test.ts` (5 tests).
- **Social Video & Truecolor Animation Export (WebM, MP4, APNG) (`src/lib/export/webmEncoder.ts`, `src/lib/export/mp4Encoder.ts`, `src/lib/export/apngEncoder.ts`)**:
  - Built standards-compliant Animated PNG (APNG) encoder (`acTL`, `fcTL`, `fdAT`) preserving full 24-bit/32-bit RGBA color without GIF 256-color palette limits.
  - Built multi-tier MP4 encoder (native `MediaRecorder` + ISOBMFF FastStart box muxer) supporting nearest-neighbor integer scaling (1x, 2x, 4x, 8x, 16x) and per-frame duration timing.
  - Implemented browser `MediaRecorder` canvas recording pipeline capturing animation sequences in WebM format (VP9/VP8).
  - Integrated "WebM Video", "MP4 Video", and "APNG" format tabs in `ExportModal.tsx`.
  - Verified in `tests/webmEncoder.test.ts` (4 tests), `tests/mp4Encoder.test.ts` (6 tests), and `tests/apngEncoder.test.ts` (5 tests).
- **Tauri Desktop Packaging Assessment (`TASKS.md` §37.4)**: Documented architectural feasibility and distribution prerequisites for wrapping PixiBun Atelier in Tauri 2.0 with native filesystem access, file associations, and offline runtime guarantees.

---

## [v1.5.0] - 2026-09-03
### Accessibility, Next.js 16 Security Proxy & Perceptual Color Lenses (Phase 32)
- **Automated WCAG 2.2 Axe Audits (`tests/e2e/studio.spec.ts`)**: Integrated `@axe-core/playwright` automated a11y test suites across blank canvas workspace, open Export modal, and all expanded RightInspector panels (Layers, Palette, PixiBud AI). Achieved 100% compliance with zero violations.
- **Accessible Slider and Control Associations**: Added explicit `aria-label` tags to all custom inputs across `ContextOptionsBar.tsx`, `RightInspector.tsx`, `BottomTimeline.tsx`, and `ExportModal.tsx`, completely satisfying WCAG 4.1.2 accessible name requirements.
- **Next.js 16 Proxy Nonce CSP (`src/proxy.ts`)**: Replaced deprecated middleware with Next.js 16 `proxy.ts`, generating per-request crypto nonces, injecting `script-src 'self' 'nonce-{nonce}'` with production `'unsafe-inline'` script elimination, and bounding matchers strictly to dynamic page routes (skipping static assets, icons, and service workers).
- **Dynamic Service Worker Route Handler (`src/app/sw.js/route.ts`)**: Transitioned static `public/sw.js` into a dynamic Next.js route handler with build-time cache versioning (`pixibun-v2`), serving authoritative `Cache-Control: no-cache, no-store, must-revalidate` and `Service-Worker-Allowed: /` headers.
- **Machado 2009 CVD Colorblindness Simulation & Squint Silhouette Mode (`src/lib/color/cvdLens.ts`, `ViewportLensFilters.tsx`)**: Implemented mathematically rigorous on-device color vision deficiency simulation lenses (Protanopia, Deuteranopia, Tritanopia, Monochromacy) based on Machado et al. 2009 IEEE TVCG matrices, plus an instant 1-bit Squint silhouette filter. Rendered via zero-mutation GPU SVG `feColorMatrix` CSS display filters, guaranteeing canvas pixel buffers and export outputs remain completely pristine.
- **HUD Controls & Keyboard Shortcuts**: Added `CVD` lens cycle and `SIL` silhouette toggle buttons to `ContextOptionsBar.tsx`, wired hotkeys `p` (CVD cycle) and `s` (Squint toggle) in `StudioLayout.tsx`, and documented them in `ShortcutsModal.tsx`.
- **Lighthouse CI & Test Verification**:
  - Landing: Performance 0.85, Accessibility 1.00, Best Practices 1.00, SEO 1.00.
  - Studio: Performance 0.86, Accessibility 1.00, Best Practices 1.00, SEO 1.00.
  - Studio JS Bundle: 260.79 KB (< 300 KB budget).
  - Vitest: 186/186 tests passing across 32 test suites.
  - Playwright: 17/17 tests passing across all end-to-end suites.
  - TypeScript & Linter: 0 errors, 0 warnings.

---

## [v1.4.0] - 2026-09-03

### Performance, Storage & Hot-Path Decoupling (Phase 30)
- **Stroke Hot-Path Decoupling**: Pruned monolithic `useStudioStore` subscriptions in `CenterViewport.tsx` to atomic selectors. Completely decoupled `bufferVersion` subscriptions from viewport rendering, eliminating re-render cascades during active pen/eraser strokes.
- **Throttled Live Signals**: Throttled `bumpBufferVersion()` via `requestAnimationFrame` strictly for decoupled observers (`BottomTimeline`, `FloatingPreviewWindow`), while deferring snapshot commits and autosave triggers strictly to stroke completion (`pointerup`).
- **Dexie Schema v4 Binary Blob Storage**: Upgraded IndexedDB engine to schema v4 with a dedicated `layerBlobs` table (`++id, [projectId+layerId+frameIndex], projectId, layerId`). Layer pixel buffers are stored directly as raw PNG `Blob` instances, omitting `pngBase64` from metadata JSON to eliminate serialization overhead and storage duplication. Added `paintLayerFromBlob` with zero-leak `ImageBitmap.close()` management and full backward compatibility for legacy projects.
- **Export Constructor Hardening**: Replaced illegal `new HTMLCanvasElement()` constructor fallback in `ExportModal.tsx` with standard `document.createElement('canvas')`.
- **Compositor Re-entrancy Protection**: Set `freshCanvas: true` default in `compositor.ts` to prevent shared singleton canvas overwrite bugs during concurrent renders.
- **Zero Linter Warnings**: Cleaned up all 6 `react-hooks/exhaustive-deps` warnings in `CenterViewport.tsx`.

### Product Alignment, Viewport Precision & Timing (Phase 31)
- **Layer Merge Down (`mergeLayerDown`)**: Implemented non-destructive layer merge in `studioStore.ts` that composites the active layer onto the underlying layer respecting opacity and blend modes (`source-over`, `multiply`, `screen`, etc.), releases upper buffer memory, and focuses the lower layer. Added tactile UI buttons in `RightInspector.tsx` and a new pixel-aligned icon in `PixelIcon.tsx`.
- **Variable Frame Duration Pacing**: Wired per-frame `durationMs` to a high-resolution delta-time animation clock in `BottomTimeline.tsx`. Added proportional timeline card widths ($W_{\text{card}}$) and amber timing hold badges (`+Xms`) for frames held $\ge 2\times$ baseline duration per Richard Williams timing principles.
- **Heterogeneous GIF Export**: Upgraded `gifEncoderCore.ts`, `gifEncoder.worker.ts`, and `ExportModal.tsx` to output frame-specific centisecond delays ($D_i = \max(2, \text{round}(\text{durationMs}_i / 10))$).
- **Selection Modifiers**: Implemented Shift (Union) and Alt (Subtract) across Marquee Box, Freehand Lasso, and Magic Wand in `CenterViewport.tsx`, with dynamic binary mask merging, bounding box recalculation, and real-time color-coded viewport preview outlines.
- **Keyboard Zoom Shortcuts**: Bound `Ctrl/Cmd +` / `Ctrl/Cmd =`, `Ctrl/Cmd -`, `Ctrl/Cmd 0` (Fit to screen), and `Ctrl/Cmd 1` (100% zoom) in `StudioLayout.tsx`, with documentation added to `ShortcutsModal.tsx`.
- **Canvas Brush Ghost Bounding Cursor**: Added a 1px integer pixel bounding box on an overlay canvas layer in `CenterViewport.tsx` matching `tools.brushSize` at $\ge 400\%$ zoom, with zero React re-renders.

### Critical UX, Viewport Precision & RotSprite Polish
- **Onboarding Stencil Isolation**: Added strict `isPlaygroundActive` gating in `CenterViewport.tsx` and reset stencil state on `StudioLayout.tsx` mount, preventing playground tracing templates from leaking onto the studio canvas.
- **Playground Animation Transfer**: Added `?fromPlayground=true` parameter in `PlaygroundLayout.tsx` to preserve animated frame sequences authored during onboarding when entering the studio, autosaving to IndexedDB under the project name `'Playground Animation'`.
- **Viewport Zoom Aspect Ratio Fix**: Added `shrink-0` and explicit `flexShrink: 0`, `minWidth`, and `minHeight` styles to `#center-canvas-area` in `CenterViewport.tsx`, eliminating horizontal flexbox compression at high zoom levels (e.g. 2625%) and maintaining an exact 1:1 square aspect ratio up to 6400% zoom.
- **Area-Preserving Pixel Art Downsampling (`bufferRegistry.ts`)**: Replaced naive `drawImage` downsampling with mathematical presence conservation (`resamplePixelArtBuffer`). By integrating source footprints and voting among solid pixels, 1-pixel strokes and continuous outlines (e.g. circles, character silhouettes) are preserved with 0 holes or dropouts when downscaling (e.g. 32x32 to 16x16).
- **Canonical Xenowhirl RotSprite Engine (`smartMathEngine.ts`)**: Mitigated 45-degree rotation distortion (bloated top-left outlines, erased bottom-right outlines, and asymmetrical corner spurs). Replaced the weighted voting alpha threshold engine with native 32-bit 3-pass Scale2X cascade ($1\times \to 2\times \to 4\times \to 8\times$) combined with subpixel center continuous inverse sampling ($x_s = \cos(-\theta)(x + 0.5 - C_x) - \sin(-\theta)(y + 0.5 - C_y) + C_x$). Added single-pixel detail presence conservation to protect isolated dots and micro-features from erosion. Verified closed contours under flood fill across 360-degree rotation sweeps and 4-quadrant bilateral symmetry on reference star sprites.
- **Floating Preview Dragging & Resize Window (`FloatingPreviewWindow.tsx`)**: Completely resolved the sticky mouse dragging defect by binding pointer movement and release to `window` with `e.buttons === 0` abort guards. Added an interactive bottom-right resize handle (`◢`) allowing smooth drag-to-resize viewport scaling from 100x100 to 640x640.
- **Test Suite Updates**: 169 tests passing across 31 suites (+10 comprehensive tests in `tests/rotSpriteAndPrecision.test.ts`).

---

## [v1.3.0] - 2026-09-01

### UX & Onboarding Overhaul
- **Progressive Playground & Onboarding**: Implemented a onboarding flow with a progressive playground, allowing users to transition smoothly into the full studio experience.
- **Radial Menu & Recent Colors**: Added a contextual radial menu for rapid tool access, an autosave activity indicator, progressive disclosure of advanced tools, and a tracked "Recent Colors" palette.
- **Hydration & SSR**: Fixed hydration mismatch and console warnings in the `recentColors` component logic.

### Advanced Selection Tools
- **Magic Wand & Lasso Rasterization**: Shipped the Magic Wand tool for continuous flood-fill color selection and implemented precise polygon rasterization for the freehand Lasso tool.

### Rendering Pipeline & AI Morphing Rewrite
- **Signed Distance Field (SDF) Morphing Engine (`src/lib/ai/pixelAiEngine.ts`)**: Replaced artifact-prone optical flow with Felzenszwalb-Huttenlocher O(N) EDT (Euclidean Distance Transform) to provide pixel-perfect topological morphing for in-between frames.
- **Smart Morph Relighting (`src/components/layout/CenterViewport.tsx`)**: Re-architected in-between generation to cleanly extract base artwork, perform the SDF morph, and automatically re-dispatch `pixibun:photometric-lighting` and `pixibun:volumetric-optics` passes so newly generated frames match the dynamic lighting of the scene.
- **Physical Rendering Fix**: Restored omitted Lambertian diffuse reflection to physical composites, vastly improving lighting realism.
- **RotSprite Artifact-Free Canvas Rotation (`src/lib/ai/smartMathEngine.ts`)**: Implemented a custom Scale3x + Nearest-Neighbor Inverse Mapping algorithm to fix floating-point holes created by native `ctx.rotate`.
- **GIF Export Multiframe Pooled Canvas Fix (`src/components/modals/ExportModal.tsx`, `src/lib/render/compositor.ts`)**: Passed `{ freshCanvas: true }` during multi-frame composite jobs, preventing the `sharedOffscreenCanvas` singleton from destructively overwriting all output frames with the final frame.
- **GIF Delay Centisecond Clamping (`src/lib/export/gifEncoderCore.ts`)**: Added a lower bound of `2` centiseconds to GIF frame delays to bypass aggressive browser 100ms throttling penalties for fast animations.
- **Test Suite Updates**: 123 tests passing. Added new unit tests for GIF chunk distinction and delay clamping.

---

## [v1.2.0] - 2026-08-31

### 2D Ray Marching & Physically Accurate Soft Shadows Engine
- **Aaltonen Contact-Hardening Cone Tracing (`src/lib/ai/shadowRayMarcher.ts`)**: Implemented CPU-bound 2D sphere tracing directly over discrete Euclidean Distance Fields ($O(N)$ Felzenszwalb EDT) using Sebastian Aaltonen's tangent geometric correction ($y = \frac{h^2}{2ph}, d = \sqrt{h^2 - y^2}$) and physical area light cone tracing ($r_{\text{cone}} = R_L \frac{t_{\text{closest}}}{T}$).
- **Branchless $C^0$ Bilinear Field Interpolation (`sampleEDTBilinear`)**: Eliminates grid-stepping quantization and ray-stepping acne across fractional query coordinates.
- **Zero-Allocation TypedArray Memory Safety**: Reused Float32Array visibility buffers from `bufferPool.ts` (`acquireFloat32Buffer` / `releaseFloat32Buffer`) with structured `try...finally` deallocation blocks.
- **Bayer Matrix Ordered Penumbra Dithering**: Converts continuous float visibility gradients into authentic retro pixel art stippling patterns (`2x2`, `4x4`, `8x8`).
- **Studio Inspector UI (`src/components/layout/RightInspector.tsx`)**: Built a dedicated **Cast & Ground Shadows** card with light coordinates, light disk radius ($R_L$), opacity slider, shadow color picker with 5 presets (Indigo `#180B26`, Obsidian `#0A0612`, Umber `#26140B`, Violet `#2E1065`, Teal/Fog `#062419`), and Bayer dither mode selector. The current UI dispatches the bounded 2.5D shadow mode.
- **Non-Destructive Viewport Layer Execution (`src/components/layout/CenterViewport.tsx`)**: Added `pixibun:render-cast-shadow` handler routing output non-destructively to a tagged `'cast-shadow'` layer without mutating hand-drawn base artwork.
- **Comprehensive Vitest Suite (`tests/shadowRayMarcher.test.ts`)**: 9 unit and integration tests covering bilinear sampling precision, boundary clamping, contact hardening, memory pool recycling, color composition, Bayer stippling, and non-destructive layer replacement (123 total unit tests passing across 20 suites).

---

## [v1.1.0] - 2026-08-30

### Core Engine & Rendering Optimizations
- **Zero-GC Compositor Canvas Pooling**: Added `sharedOffscreenCanvas` singleton and `targetCanvas` parameter in `compositeFrame()`, eliminating dynamic canvas element creation during onion skinning, scrubbing, and frame compositing.
- **TypedArray Buffer Pool (`src/lib/engine/bufferPool.ts`)**: Built a memory-bounded scratch buffer pool (`acquireFloat32Buffer`, `releaseFloat32Buffer`, `acquireInt32Buffer`, `releaseInt32Buffer`, clamped arrays) with zero-fill reset guarantees.
- **Zero-GC EDT Distance Transform (`src/lib/ai/smartMathEngine.ts`)**: Refactored 1D parabolic envelope calculations in `computeSeparableEDT` and `dt1D` to borrow scratch buffers from `TypedArrayPool`.
- **Zero-GC Downsampling Gradient Allocation (`src/lib/ai/pixelizeEngine.ts`)**: Swapped dynamic gradient map allocations with buffer pool acquires.
- **Web Worker GIF Encoding Engine (`src/lib/export/gifEncoder.worker.ts`)**: Offloaded heavy LZW compression and median-cut color quantization to a dedicated worker thread with transferable ArrayBuffers.
- **Buffer Registry Memory Safety (`src/stores/studioStore.ts`)**: Integrated `clearAllBuffers()` calls during `resetToNewProject()` and `loadProjectState()`, preventing memory leaks on project switches.
- **Flood Fill Exact Tolerance 0 (`src/lib/canvas/floodFill.ts`)**: Added strict integer RGBA comparison when `tolerance === 0`, preventing floating-point alpha edge case false positives.
- **Async Autosave & Project Serialization (`src/lib/project/serialize.ts`)**: Added `rasterizeLayerPngAsync` with non-blocking `canvas.toBlob()`, wired `buildAutosavePayloadAsync()` to background autosave with Dexie binary blobs, and provided `buildProjectFileAsync()` for non-blocking project file exports.

### Architecture & State Management
- **Strongly-Typed Event Bus (`src/lib/events/studioEvents.ts`)**: Created a typed TypeScript event pub/sub system with discriminated payloads for 23 studio actions.
- **Image-to-Pixel-Art Hook (`src/hooks/usePixelizeEngine.ts`)**: Decomposed monolithic modal logic from `ImportModal.tsx` into a reusable, testable React hook.

### Web Platform, Accessibility & Security
- **Node.js SSR Storage Warning**: Replaced bare `typeof localStorage !== 'undefined'` checks with `typeof window !== 'undefined' && window.localStorage` across `capture.ts` and `themeStore.ts`.
- **Responsive Workspace Gate (< 1024px) (`src/components/layout/MobileStudioGate.tsx`)**: Added a tactile fallback screen with Bun mascot guiding users on small screens / mobile devices.
- **Static Theme Initialization & Clean CSP Configuration**: Externalized theme bootstrapping script into `public/theme.js` with structured fallback error handling.
- **Semantic Theme Tokens in Error Boundaries**: Refactored `error.tsx`, `global-error.tsx`, and `studio/error.tsx` to use design system CSS variables.
- **Accessibility & Contrast**: Upgraded `--text-muted` to `#a496b8` for WCAG AA compliance, added skip-to-workspace navigation link, and added missing `aria-label`s on buttons and color swatches.
- **Diagnostics Relay Error Handling**: Handled malformed JSON payloads gracefully with server logging and 400 Bad Request responses.

---

## [v1.0.0] - Initial Release
- Multi-layer timeline animation engine with customizable FPS and onion skinning.
- Full artisan raster tools: Bresenham pen, dither brush, 2:1 isometric guides, flood fill, bezier curves.
- PixiBud Smart Studio: Photometric surface normal baking, Blinn-Phong lighting, volumetric sub-surface scattering, and autotiling.
- Offline-first storage with Dexie IndexedDB and multi-engine export suite (PNG, GIF, Godot, Unity, Phaser 3).
