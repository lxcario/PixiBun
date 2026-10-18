# Dead code, newcomer docs and the homepage Day/Night switch — 18 October 2026

Branch `testsprite-s4`, after `55c59f9d`. A last scan of the code and documentation, and a fix for the homepage Day/Night switch the user found laggy. Screenshots and lazy loading were left for later at the user's request.

## Dead code removed

A scan counted, for every source file, whether anything imports it, and for every exported function or constant, whether anything outside its declaration names it.

- **Files nothing imports:** `WorkspaceBar.tsx` (a stub returning `null` since the workspace bar moved into the top rail), and `BorderGlow.tsx` and `ClickSpark.tsx` (never mounted; DESIGN.md already said so).
- **Components only their own tests used:** `QuickPaletteBar` and `ThemeToggle`, with their tests. The `PinnedColorPanel` case that shared a test file with `QuickPaletteBar` is kept, in `tests/components/PinnedColorPanel.test.tsx`.
- **The retired volumetric-optics engine:** its panel was removed earlier, as ARCHITECTURE.md records, but `executeVolumetricOpticalPipeline`, its five helpers, its material table and parameter types remained, used only by their test. About 575 lines leave `photometricLighting.ts`. The `volumetric-optics` layer tag stays in the project schema, so older projects still open.
- **Fourteen exports nothing used:** two landing hint icons, `EXPORT_TYPES`, `SQUINT_BACKGROUND_RGB`, `setBufferRevision`, `bufferCount`, `renderProceduralAutotileTile`, the `oklabDistance` alias, `deleteRecoveryRecord`, four Co-Draw event-name constants and `THEME_IDS`.

Not removed: exports that only tests use on purpose (test seams such as `_resetSharedWorkerForTesting`, and `rotSpriteV1`/`rotSpriteV2`, which the rendering contract keeps for comparison).

## Documentation

- The README opened with an engineering-status link and a dense block about TestSprite runs, billing errors and pull requests, before the welcome. The welcome and the artist sections now come first. The Season 4 block moves near the end under **Tested on every pull request**, which is also the anchor the `/verified` page links to; that link previously pointed at a heading that did not exist.
- The handbook index said "All 16 desk appearances" (there are 24: 12 styles, Night and Day) and "all 12 export tabs" (there are 14, with Cart and Light Sweep); the export guide's source link said 12 as well.
- DESIGN.md's mentions of `ClickSpark` and `ThemeToggle` now say they were removed.

Screenshots were not retaken: 101 of the 125 pictures in the living documentation date from 15 October and show the interface before the 16–18 October changes. Only the theme gallery is current.

## Homepage Day/Night switch

The user reported that pressing Day was laggy and that a sun appeared from nowhere and moved randomly.

**What it did.** The switch revealed the new scheme as a widening circle (a View Transition), and on top of it flew an 84 px sun or moon from the switch down into the middle of the page, spun a dashed ring the size of the viewport with a 40 px glowing shadow, and dimmed the whole old page with a filter. The switch's own knob swapped the moon for the sun the moment it was pressed and spun it 180° while sliding.

**Measured** in a production build (Chromium, one run each): switching to Day blocked the main thread for 134 ms and the slowest frame took 158 ms. A CPU profile of the switch put 220 ms in `getImageData`: the homepage scenes recolour their canvases for the theme by reading every pixel back and remapping it.

**Changed.** The flying sun or moon, the ring and the full-page filter are removed; the circular reveal stays, with a small sparkle burst at the switch ([themeTransition.ts](../../src/lib/theme/themeTransition.ts), [theme-transition.css](../../src/app/theme-transition.css)). The knob now cross-fades the moon into the sun as it slides, without the spin ([DayNightSwitch.tsx](../../src/components/landing/DayNightSwitch.tsx)). After the change, the same measurement showed no long main-thread task and a slowest frame of 73 ms on the first switch to Day, 54 ms on the next. `tests/themeTransition.test.ts` checks that only the sparkle burst is mounted; it fails on the previous code.

**Still open.** The homepage scenes recolour by reading their canvases back every frame whenever the palette is not Moonlit at night: by Day, that was 34 readbacks and about 82 ms of main-thread time per second at idle in this build. Recolouring the scene's prebuilt layers once per theme, and drawing with mapped colours, would remove the readbacks, but it changes how translucent glows blend and needs checking in all 24 appearances, so it is left as separate work.

## Verification

Windows, Node 22.23.3. `npm run gate:full` passed all six stages with **2,876 tests / 266 files**; the count falls because the removed code's own tests went with it, and coverage stays above its thresholds. In the development server, `landing` and `verified` passed 28 of 28. In a production build, `auditInterface`, `remainingAuditSafety` and `welcomeJourney` passed **48 of 48** across Chromium, Firefox and WebKit. The frame measurements above are single headless Chromium runs on this machine, not a device benchmark; a phone or a slower GPU was not measured.

## CI follow-up

CI run #101 (source `e8ede3de`, before the branch's attribution rewrite) passed validation, the compatible rollback and Lighthouse, and failed the browser job. The development suite passed 356 of 357. The failure, `exportCompleteness` › welcome bench GIF, clicked the bench's Hop tool before the server-rendered page had hydrated, so the click was lost; the test now repeats the click until the tool is selected. The two timing failures of the earlier run #96 passed this time, and are fixed regardless: `themeAccessibility` scanned the Studio options dialog while it was still blooming, and `dynamicIsland` counted running animations once while a press could still be finishing. Both now wait for the surface to settle, through `tests/helpers/settle.ts`, which the game-kit scan also uses.

The production suite on Linux passed 509 of 519, skipped 4 and failed 6:

- **WebKit, MP4 tab (three tests).** Opening the MP4 tab froze the page: Playwright's click never returned, in `animatedExportIntegrity` and in `offlinePanels`, while the WebM tab just before it opened normally. Saving a Light Sweep, which runs the same H.264 check, closed the page. PixiBun now treats WebKit on Linux (WebKitGTK and WPE browsers) as unable to make MP4 and never calls its H.264 encoder or recorder there; Light Sweep saves WebM instead. Safari on macOS and iOS is unaffected. The production MP4 test expects that refusal on Linux WebKit instead of probing H.264 itself. Not yet verified in CI: whether WebKit on Linux records the Light Sweep WebM.
- **WebKit, Co-Draw guest.** After pairing, the gallery card never held still long enough for a pointer click (60 s of "element is not stable"). Nothing on the card animates; the test now opens the project with the keyboard, which the card supports. Pointer opening stays covered by the other gallery tests.
- **Chromium, compact header.** A stroke started just after the Dither preview closed did not reach the canvas. The check now waits for the canvas to be reachable and names whatever covers it if it never is.
- **Firefox, MP4 colours.** The downloaded MP4 decoded, but at least one pose's colour was more than 12 levels off in Firefox on Linux. Firefox on Windows has no H.264 encoder and refuses MP4, so this could not be reproduced here. The assertion now prints the decoded colours; it is **still failing** and needs those numbers before a fix.
