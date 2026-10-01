# Session UI/UX improvements — 2026-10-01

Status: **Implemented and locally verified.** This follows the [six-phase implementation](phase-implementation-status.md) and [earlier interface pass](PHASE6_UX_HARDENING.md). Repository publication is authorized by the user; Git history records the committed state. Artist evaluation remains open.

## Artist feedback and corrections

The user rejected the text-heavy research forms, an artificial mushroom demonstration, clipped real-art previews and unexpected purple recoloring. The final interface uses the selected artwork itself. The sample component was removed.

| Area | Current behavior |
| --- | --- |
| Starting point | **Original** is the default: every RGBA byte remains unchanged. Applying an identical result is disabled. |
| Simplification | Explicit Original/2px/4px/8px choices. **Keep outlines** starts on: strong color boundaries and silhouette pixels stay exact and are excluded from block sampling. Low-contrast details can still change; disabling protection explicitly enables coarse blocks across outlines. Source-color mode retains per-pixel transparency. |
| Colors | No implicit palette remapping. **More options → Color changes → Replace with active palette** enables it explicitly. Existing saved recipes with a nonempty allowed-color list retain their palette restriction; an empty list means unrestricted colors. |
| Real preview | Automatically previews the real selected source after choices settle. Before/After share the union of their occupied bounds and fit by default; transparent margins are excluded from framing. View size, preview frame and lighting passes live in More options. Native 1×/4× canvas inspection remains available. |
| Layout | Equal-width tabs and preset buttons, equal-size material/scope choices and a centered square 3×3 light compass. Advanced fields and result notes start closed. Preview/Apply actions stay at the bottom of the visible panel while settings scroll. |
| Safe updates | An earlier comparison remains visible while a new result computes, keeping the layout stable. It cannot be applied while invalid or busy. Settings changes cancel pending work; keyboard tab switches retain focus. Artwork changes invalidate the result. |
| Apply and recovery | Applies editable generated layers in one history step, retains original source pixels and reports affected frame count. Undo restores the change. Saved source checks and recipe reload remain available. |
| Game-kit readiness | Refreshes while project layers, clips, palette and dimensions change. Status text uses readable theme colors. Metadata checks are distinguished from exact stored buffers/colors checked at export. |
| Light without normals | Estimates a rounded surface from the silhouette so direction controls change shading. Uses the editor's existing distance/height/normal functions; the estimate is labeled and can be switched to Flat surface. An authored Normal layer takes priority. New rigs start with zero cast-shadow distance to retain the silhouette. |

The initial [four-failure baseline](evidence/2026-10-01/ui-ux-baseline.log) reproduced stale Godot readiness, missing keyboard tab navigation, inaccessible enlarged-preview edges and light-theme contrast. Later preview revisions were adjusted after direct user feedback. The [real-artwork run before the color correction](evidence/2026-10-01/ui-ux-real-artwork-final.log) passed 14 focused browser checks; it does not verify the subsequent color-preservation changes.

## Design sources

[NN/G progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) supports placing less-used controls behind one clear disclosure. [NN/G recognition and recall](https://www.nngroup.com/articles/recognition-and-recall/) informed direct visual comparisons and plain choices. These principles informed the implementation; they are not measurements of this editor's artist usefulness.

## Verification

The broad results below describe the preceding correction pass. The subsequent outlined-artwork fix has its own current evidence in the follow-up section; inventory counts are now 1,472 unit tests, 146 editor tests and 39 compiled scenarios.

| Check | Result |
| --- | --- |
| Color/safety algorithms and integration | 39 tests in two files passed; includes Original byte identity, hue/alpha retention and empty-center sampling |
| Final focused browser checks | 21 passed in 2.1 minutes; research, game delivery, three walkthroughs, four themes, fitting, palette opt-in and keyboard access |
| Final full gate/build | All five checks passed in 81.46 seconds; 1,469 unit tests in 143 files and production build |
| Full editor suite | 145 passed in 32 Chromium spec files in 2.8 minutes |
| Compiled app | 36 passed in 5.9 minutes across Chromium, Firefox and WebKit |
| Final action-row alignment | Two focused editor checks passed in 14.2 seconds; a fresh production build and three compiled keyboard/alignment checks passed across all three engines |

[Color-preservation tests](evidence/2026-10-01/ui-ux-color-preservation-unit.log), [final focused browser log](evidence/2026-10-01/ui-ux-safe-defaults-final.log). Those runs preceded the three outlined-artwork unit regressions. Scoped axe checks do not establish whole-product WCAG conformance.

## Limits

Coarsening is an intentional pixel effect; it cannot preserve every facial feature or outline color at large block sizes. Protected rectangles preserve exact source RGBA. Optional palette replacement changes colors deliberately. Lighting remains a stylized approximation, and tile scenes require suitable atlas artwork. Algorithm limits, history checks, source fingerprints and memory admission remain in force.

Artist preference, comparative task-time metrics, wider device coverage and new lighting engine parity remain unverified. The [Phase 4 study](PHASE4_ARTIST_UX_STUDY.md) and [Phase 6 evaluation](phase6-artist-evaluation.md) remain open. All verification is local: no TestSprite upload, tunnel or deployment.

The first full gate reached 1,468/1,469 passing tests, with the existing palette LUT benchmark measuring 2.0404 ms against its 2 ms ceiling. Its unchanged isolated rerun passed all six benchmark checks. The failure and rerun remain recorded; no root cause is established. [First gate](evidence/2026-10-01/ui-ux-gate-final.log), [isolated benchmark](evidence/2026-10-01/ui-ux-benchmark-rerun.log).

[Final passing gate](evidence/2026-10-01/ui-ux-gate-final-rerun.log), [full editor run](evidence/2026-10-01/ui-ux-editor-final.log), [compiled three-engine run](evidence/2026-10-01/ui-ux-production-final.log). The final adjustment makes a single pending-preview action fill the whole row. It followed the broad runs and was verified with [two focused editor checks](evidence/2026-10-01/ui-ux-final-alignment.log), a [fresh build](evidence/2026-10-01/ui-ux-final-build.log) and [three compiled keyboard/alignment checks](evidence/2026-10-01/ui-ux-final-alignment-production.log).

Final screenshots use authored local test artwork: [Original, no change](evidence/2026-10-01/original-no-change.png), [simplification](evidence/2026-10-01/beginner-pixelize.png), [light compass](evidence/2026-10-01/beginner-light.png), [tiles](evidence/2026-10-01/beginner-scene.png), [corner artwork fitted into both panes](evidence/2026-10-01/corner-artwork-fit.png). They are regression evidence, not samples shown in the product or a reproduction of the user's portrait.

## Outlined-artwork screenshot follow-up

The next user screenshots exposed two functional gaps: a center sample could spread the dark outline through a large block even without palette remapping, and directional controls could not shade a flat surface without a Normal layer. The outlined-circle fixture reproduces that source shape with a purple fill, dark border and transparent surroundings through the real importer; it does not use the user's actual saved project.

Outline protection excludes strong boundaries from block statistics and sampling as well as preserving their output pixels. A uniformly filled outlined shape therefore produces **No change**, including at 8px, rather than inventing a block effect. This protection is a local contrast heuristic, not recognition of faces or semantic outlines. The former “Edges” style is renamed **Strongest**, since its actual behavior selects the most contrasting block color.

For a missing Normal layer, the new rounded option reuses `computeSeparableEDT`, `generateInflatedHeightmap`, `computeTangentNormalField` and `bakeNormalMapToRgba`. Transparent padding gives finite distances for canvas-filling shapes. The existing EDT is based on [Felzenszwalb and Huttenlocher, Distance Transforms of Sampled Functions (2012)](https://theoryofcomputing.org/articles/v008a019/). Rounded inflation and lighting are editor approximations; the paper does not establish recovered geometry or artistic quality.

Optional `preserveEdges` and `shape` recipe fields round-trip through canonical parsing. Omitted fields retain the previous algorithm behavior, so old saved recipes are not silently changed. The original source and authored normals remain intact. New worker previews stay inside the existing pixel, frame, time and estimated memory limits.

Current verification: 42 focused algorithm/integration checks passed; 15 editor checks passed in 37.1 seconds, including outline opt-out, normal-free directional lighting, source immutability, saved recipe reproduction, Undo/Redo and four-theme accessibility. The first editor run passed the new outlined-circle test but failed four older scenarios that expected every block-size change to alter dense boundary artwork. Those tests now explicitly opt out for coarse-application coverage; the safe-default case is asserted separately. [Focused units](evidence/2026-10-01/outlined-art-unit.log), [initial browser run](evidence/2026-10-01/outlined-art-editor.log), [passing browser run](evidence/2026-10-01/outlined-art-editor-final.log).

The [repository gate/build before the cancel correction](evidence/2026-10-01/outlined-art-gate-final.log) passed all five checks in 59.16 seconds, including 1,472 unit tests in 143 files. The [initial gate](evidence/2026-10-01/outlined-art-gate.log) stopped at a new recipe-field type error; correcting the literal type resolved it.

The first [compiled research run](evidence/2026-10-01/outlined-art-production.log) passed 14/15 scenarios, including outlined-artwork behavior in all three engines. WebKit's shared-light scenario ended with an aborted preview; its [unchanged isolated rerun](evidence/2026-10-01/outlined-art-webkit-rerun.log) passed. Inspection found the automatic-preview action replacing Update with Cancel in the same slot. A [controlled delayed-real-worker reproduction](evidence/2026-10-01/outlined-art-cancel-baseline.log) confirmed that clicking this slot canceled the automatic job and prevented a result. The footer now keeps a disabled Updating action in the refresh slot and puts Cancel in the separate right slot. Apply is absent while busy. This reproduction explains the slot hazard; it does not establish that every prior intermittent abort had the same cause.

The strengthened [15-check editor run](evidence/2026-10-01/outlined-art-editor-complete.log) passed in 24.5 seconds. The [repository gate/build after the footer correction](evidence/2026-10-01/outlined-art-gate-complete.log) passed all five checks in 49.19 seconds, including all 1,472 unit tests.

A second [compiled run](evidence/2026-10-01/outlined-art-production-complete.log) again passed 14/15, including outlined-artwork behavior in all engines; WebKit now reported a checkbox click that did not change state. Automatic jobs could disable the entire settings fieldset between a click's actionability check and delivery. Settings now remain interactive, changed choices cancel outdated work, and cancellation retains the previous comparison until a new result arrives. Apply remains absent while busy or invalid. The delayed-real-worker scenario also asserts that an 8px choice is immediately usable during a pending job and that its latest result arrives. The [final focused editor run](evidence/2026-10-01/outlined-art-editor-stable.log) passed all 15 checks in 24.6 seconds.

The [final gate/build after the input-race correction](evidence/2026-10-01/outlined-art-gate-stable.log) passed all five checks in 48.78 seconds, including all 1,472 unit tests. The [final compiled research run](evidence/2026-10-01/outlined-art-production-stable.log) passed all 15 scenarios across Chromium, Firefox and WebKit in 2.8 minutes. This is targeted coverage of the changed workflows, not a rerun of all 39 production scenarios or all 146 editor tests. [Documentation integrity](evidence/2026-10-01/outlined-art-docs-final.log) and whitespace checks passed.

Current local comparison images: [outlined simplification](evidence/2026-10-01/outlined-simplification.png), [directional rounded lighting](evidence/2026-10-01/outlined-directional-light.png). An already-open development panel can retain previous settings; use **Choose another task → Try a new look** to initialize the corrected defaults without reloading the project or losing its undo history. No deployment or external test upload is performed.

## Save-status placement follow-up

At the user's screenshot-marked request, the visible save badge moved from the header to the bottom-right status bar. Saved, Unsaved, Saving and Save issue remain visible beside their colored dot; the header Save action retains its retry behavior. The footer badge keeps the existing memory-safety tooltip and a polite live status announcement. Its text is visible at all breakpoints, rather than hidden below the previous header's small-screen breakpoint.

The existing save-failure browser scenario now checks footer containment, right-edge placement and the absence of a header badge, while retaining its source-pixel safety assertion. It passed in 3.6 seconds: [local browser log](evidence/2026-10-01/save-status-footer.log), [rendered screenshot](evidence/ux-qa/20-save-issue-state.png). TypeScript and scoped ESLint checks passed. This small relocation follows the earlier gate/build and compiled research evidence; those earlier runs are not rerun claims for this placement change. Test inventories are unchanged.

## Header placement review

The user's wide-header screenshot exposed a grouping problem: Import was distant from New and Save, canvas dimensions interrupted the document-to-history sequence, symmetry controls were attached to View, and appearance/help used icons without visible names. The previous fixed two-row grid could also squeeze tool options beside the document controls. The assessment is based on code inspection, the supplied screenshot and editor guidance; no task-time or preference study was performed.

| Group | Current order and purpose |
| --- | --- |
| Project | Projects → project name → canvas size → New → Import → Save; a divider separates Undo/Redo |
| Drawing | Active-tool options → labeled Mirror controls with announced pressed state |
| Canvas | Zoom controls and Fit → View |
| Studio | Theme → Co-Draw → Help |
| Output | Export stays at the right edge as the primary action |

The drawing group now sits beside editing controls rather than floating in the middle of the screen. Groups wrap when their actual content needs space, preserving their document and keyboard order; long tool settings can use an additional row. Wrapping does not add scrolling or clip the brush/zoom dropdowns. The compact logo, consistent 28px instruments, 24px minimum control targets and spacing distinguish groups without adding explanatory paragraphs. The user's requested save status remains in the bottom-right footer. Advanced symmetry options remain available through View for compatibility.

### Research and application

- [NN/G: Proximity Principle in Visual Design](https://www.nngroup.com/articles/gestalt-proximity/) explains how spacing and containment communicate relationships and how responsive arrangements must preserve those relationships. This informed grouping the document actions and keeping Zoom/Fit together.
- [NN/G: Closeness of Actions and Objects in GUI Design](https://www.nngroup.com/articles/closeness-of-actions-and-objects-gui/) supports keeping actions near their affected object. Project controls remain near project identity; drawing symmetry remains near the active tool. The article cites Nielsen's *Usability Engineering* (1993); the book itself was not directly consulted.
- [Aseprite: Context Bar](https://www.aseprite.org/docs/context-bar/) places options for the current tool above the sprite editor. [Krita: Navigation](https://docs.krita.org/en/user_manual/getting_started/navigation.html) also distinguishes tool parameters from document commands and allows customization. These are editor precedents, not evidence that either exact arrangement will be optimal for PixiBun users.
- [NN/G: Icon Usability](https://www.nngroup.com/articles/icon-usability/) supports visible labels where icon meaning is ambiguous. Theme and Help now have labels; compact mirror directions retain explicit accessible names and tooltips.
- [Microsoft: Toolbars](https://learn.microsoft.com/en-us/windows/win32/uxguide/cmd-toolbars) discusses functional grouping, recognizable commands and keeping frequent actions accessible in small windows. This is historical Windows 7 guidance, used for grouping principles rather than current platform styling.
- [W3C: Understanding Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) describes the 24×24 CSS-pixel minimum and spacing exceptions. The header's contextual buttons and sliders now meet that minimum directly. This is a local target-size improvement, not a claim of whole-product WCAG conformance.

### Current local verification

The existing project-controls browser scenario now checks every visible header control for viewport containment, at least 24×24px targets and pairwise overlap at 1920, 1536, 1280 and 1024px with Pen, Bucket and Erase Color. It renames through the real control, checks Mirror state, changes a brush preset and zoom through their menus, opens View and Theme, verifies Escape returns Theme focus, and checks departed hover/focus tooltips stay closed. A visual pass found overlapping hover/focus timers could reopen an old tooltip after departure; clearing the previous timer before scheduling resolves that issue.

[Nine focused Chromium checks](evidence/2026-10-01/header-placement-editor-final.log) passed in 23.6 seconds: header behavior, backup cancellation and writing, onion skin, four theme accessibility scans and the bottom-right save-error badge. TypeScript, scoped ESLint and whitespace checks passed. Screenshots: [1920px](evidence/2026-10-01/header-placement-1920.png), [1024px](evidence/2026-10-01/header-placement-1024.png), [Erase Color at 1024px](evidence/2026-10-01/header-placement-erase-color-1024.png). The four earlier passing backup/header checks are retained in [initial evidence](evidence/2026-10-01/header-placement-editor.log); those screenshots revealed the tooltip issue before its correction.

Test inventories remain unchanged. These are local automated and visual checks; this header pass does not claim a new cross-engine production run or a completed artist study.

The [full repository gate](evidence/2026-10-01/header-placement-gate.log) passed all five stages in 149.44 seconds, including all 1,472 unit tests in 143 files and a fresh production build. The documentation was subsequently updated with these results and checked again separately.

## Lighting-menu follow-up

The screenshot showed three collapsed sections with technical labels and status readouts that did not explain their purpose. The task now offers **Light your sprite**, **Shape the surface** and **Add a shadow** as matching icon cards with one short outcome description each. Angle readouts and the ambiguous “3D Map: OFF” header action no longer compete with navigation. The intro is one short sentence.

The task's lighting card starts open, with Auto setup, shading choices and **Preview lighting**. The on-canvas light keeps its existing drag, Enter-to-apply and Escape-to-cancel behavior. Manual mode uses **Apply lighting** and **Preview lighting** labels. Detected analysis is a closed disclosure. New task-specific storage keys ignore the legacy closed-lighting setting while preserving choices made in the redesigned view; Browse all retains its separate expert-panel preferences.

Surface setup offers **Create surface layer**, **Show surface directions** and **Paint raised edges**. The paint action is disabled until an unlocked Normal layer is selected. Creating that layer retains source pixels, and surface directions have a pressed-state announcement. Curved, Flat and Replace labels replace RNM/UDN abbreviations in the visible blending options. This layer check applies to the menu action; it is not a new admission guard for every entry point to the drawing engine. Creating a blank surface layer does not trigger a rendered-normal-map hover example.

The shadow choices are equally sized **From the light** and **Under sprite** buttons. Each choice gets one direct explanation, followed by the existing Add Floor Shadow action. Default parameter tables are hidden before analysis; detected settings are available through a disclosure afterward. The helper says the action uses a shadow layer and Undo restores changes, covering both creation and updates to an existing generated layer.

The shared disclosure component provides a heading containing its button, separate accessible description, expanded state and content relationship. Storage failures no longer prevent toggling it. A browser regression exposed the existing global Space shortcut consuming native button activation and starting playback; Space now leaves focused buttons and summaries to their native interaction.

This applies [NN/G progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) to keep useful actions visible and specialized settings optional. The structure and keyboard checks follow the [W3C accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/). These sources inform the design; no comparative artist study or task-time improvement is claimed.

The [seven-check local browser run](evidence/2026-10-01/lighting-menu-browser-stable.log) passed in 48.1 seconds: task discovery, legacy-state isolation and new-state persistence, Enter/Space activation, matching collapsed-card bounds, source pixel retention during surface-layer setup, normal-view state, shadow choices, four rendered themes, hover-action previews and the existing live chisel/lighting/palette workflow. The [capture check](evidence/2026-10-01/lighting-menu-capture.log) passed in 4.2 seconds after dismissing focus and hover overlays for screenshots. Inventories remain 1,472 unit tests, 146 editor scenarios and 39 compiled scenarios.

The [first run](evidence/2026-10-01/lighting-menu-browser.log) exposed the Space-key conflict. A later [six-of-seven run](evidence/2026-10-01/lighting-menu-browser-complete.log) failed an old test's ambiguous text selector, which matched both the new description and action. Making that selector exact resolved it; [both live checks](evidence/2026-10-01/lighting-menu-live-check.log) then passed in 19.1 seconds. Failures remain recorded.

Current screenshots: [matching choices](evidence/2026-10-01/lighting-menu-choices.png), [lighting ready to preview](evidence/2026-10-01/lighting-menu-ready.png), [surface setup](evidence/2026-10-01/lighting-menu-surface.png), [shadow options](evidence/2026-10-01/lighting-menu-shadow.png). Verification remains local; this pass does not add a compiled cross-engine browser run or finish the artist study.

After removing the rendered-normal-map hover association from blank-layer creation, [both final action checks](evidence/2026-10-01/lighting-menu-actions-final.log) passed in 15.7 seconds. The [full repository gate](evidence/2026-10-01/lighting-menu-gate.log) passed all five stages in 59.24 seconds, including all 1,472 unit tests in 143 files, documentation checks, TypeScript, ESLint and a production build. Whitespace checks passed. The session record was then updated with these results.

<!-- session-publication-2026-10-01 -->
## Session checkpoint — 2026-10-01

The user requested a complete Markdown reconciliation and Git publication. The latest lighting-menu gate passed all five checks, including 1,472 unit tests and a production build; seven focused browser scenarios cover the menu workflows and four themes. Repository publication and deployed-release approval are tracked separately. See the [completion record](session-completion-2026-10-01.md).
<!-- /session-publication-2026-10-01 -->
