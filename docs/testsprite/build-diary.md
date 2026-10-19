# A little drawing, a long way home

## 20 October: the number already on the desk

This time TestSprite noticed something small enough to walk past: the cycle track's own 6 Hz default was invalid. We brought the same number to the real browser, then tried 5.5 and 5.6. The browser agreed with the failure. The half-Hz step had started from 0.1, leaving the default between its permitted steps.

We kept the little half-Hz buttons and the safe bounds, and let typed rates follow the range they were meant to have. All three browsers now accept those values, honor the bounds, and leave Bun's pixels unchanged when the track goes away. The [targeted record](../releases/2026-10-20-targeted-repairs.md) keeps the original cloud red beside this local green. The automatic batch still finished 37 passed, 9 failed and 75 blocked; this repair has not borrowed a cloud pass it has not earned.

The MP4 trail belongs to a different notebook: native GitHub CI found the shifted red, and the downloaded file helped us follow the color conversion. Our targeted Windows rerun passes, including the real red, blue, gray and green frames. Linux Firefox still has to answer on the fixing source. Keeping that distinction is part of keeping the drawing safe.

Build diary, 17 October 2026. These are dated results. Automatic PR execution is still pending; the linked cloud journeys are controlled supporting replays.

PixiBun is a quiet place to make a little thing move.

A bunny on the canvas. A pause between two frames. A lamp turned toward a tiny painted surface. We want the desk to feel kind, and we want the things an artist trusts it with to come back safely.

For Season 4, we started asking what those small promises really meant.

When a button says Export, is the drawing inside the file? When a layer is locked, can a selection still erase it? When you open a backup tomorrow, does the little pause you gave the second frame come with it?

We put those questions into TestSprite.

One investigation led to Bun's coat. A journey for the Normal Chisel had started on the wrong kind of layer. Following that trail revealed a real problem: the toolbar could let surface-map colors replace ordinary paint. We added the missing check where a stroke reaches the canvas. The corrected cloud comparison failed on production and passed on the fixing preview. Bun kept its colors; the surface tool still had somewhere useful to work.

Then came the padlock. Our cloud test selected pixels, deleted them, and used Undo to bring them back. It selected again and locked the layer. Delete still changed 768 RGBA channels. Drawing tools respected the lock; selection editing had another way in. We have a tested local repair, and its integration and cloud rerun are still ahead. The original failure stays in the record.

The next question was gentler: could one little animation make the whole trip home?

First, we had to make the lighting question honest. An old report had counted decorative SVG rectangles while the canvas was empty. We kept that failure and gave the browser something worth looking after. It chose a one-pixel brush, painted the red heart row by row, and placed three small white highlights. The new cloud run checked every pixel and the actual PNG before applying the Lamp. Undo brought the heart back; Redo brought the light back; one more Undo returned the drawing again. That passed. We repaired the test's promise, not product Undo.

We made a known two-frame, two-layer drawing and gave its poses different pauses. TestSprite downloaded the real PNG, GIF and APNG. Independent readers opened the files and checked the pixels, transparent clearing and 100/200 millisecond holds. Then the journey downloaded an editable backup, closed the browser and opened that actual file in a fresh one. The layers were still separate. The pauses were still there. We duplicated a frame and undid it. The drawing was still something an artist could work on.

That journey passed in the cloud. So did another that turned an asymmetric layer around: two mirrors, then four quarter-turns. Each intermediate picture matched a separate pixel permutation, and the saved project kept the protected layers and frame timing intact.

We are also giving the canvas a quiet account of itself: dimensions, layers, painted pixels and colors for a screen reader to read. In our local Heart journey, TestSprite-compatible browser code checks that account against a literal pixel design and the actual exported PNG, including Undo and Redo. That cloud qualification waits for the candidate deployment.

TestSprite has been most useful when it gives us a trail we can follow carefully: a real browser, a specific promise, a failure worth opening. Sometimes the app needs a repair. Sometimes the test needs to ask the question more precisely. Keeping both kinds of evidence has made the work clearer.

We are still connecting the automatic PR loop. The App has received deployment events, but our latest observed PR run was stopped by billing. We will add its executed result when it exists.

We want artists to spend their attention on a bunny's next expression. Ours goes into the small promises that bring it safely home.

## Follow the evidence

The [findings register](findings.md) separates genuine application defects, test improvements, qualified behavior and remaining service blockers. This diary retains its 17 October scope; later candidate verification belongs in the dated follow-up records.

- [Chisel fix PR #5](https://github.com/lxcario/PixiBun/pull/5), fixing source `aab9da89559ebe5ac395e49258419c494e1c6280`.
- [Original Chisel cloud red](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/216f659a-4736-4e92-93e7-5d525d33bddf), [controlled fixing-preview pass](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/19a2bcb6-3cf3-4f41-a3dc-3e52bfd7179f).
- [Selection-lock production red](https://www.testsprite.com/dashboard-v3/o/resques-workspace-8da317b3/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/deb3794c-8831-4e5d-8720-8af739122e15). Local repair: 114 focused tests and nine browser cases; not deployed in this record.
- [Animation comes home — strict cloud pass](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/ba62e217-35cf-4cbf-a78a-4740e3e200ce), saved code `v-2497e01ad86f`.
- [Reversible actions — strict cloud pass](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/3dfee777-d654-4f35-b1ab-f61432b5c537), saved code `v-55d860ff165f`.
- [Painted heart and lighting — corrected cloud pass](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/d9ca81b8-d9c6-4e2c-a269-a4853302f2bc), saved code `v-f2f352efaa06`; 13 real brush drags and three clicks, no admitted/imported artwork.

The two new strict passes pinned production source `92de6c74b259eafcf73cc986b1def6c69f5566aa`, with autoHeal false. Reusable versions also passed; their scripts observe a stable actual origin/build and can be repinned for a controlled candidate comparison. The fixture is admitted by normal Import; it is not original pointer drawing. Native OS save pickers, arbitrary artwork/encoder settings and manual screen-reader studies remain outside these results. See the [journey guide](../../scripts/testsprite/README.md), [replay contracts](replays.md), [committed evidence data](verification-stories.json) and [automatic PR ledger](loop-ledger.md).

## 18 October: a promise kept on the preview

The padlock has its follow-up now. We brought the same question to the fixing preview: prove Delete works, Undo it, select again, lock the layer, and try once more. This time the selected pixels stayed exactly where the artist had left them. The strict cloud replay passed. The original red remains beside it, so the small repair has a trail someone else can follow.

The heart has a voice now, too. A separate cloud journey checked its literal three-color recipe against the canvas, its quiet readout and the real PNG. Undo and Redo agreed. That recipe is a reproducible drawing; our row-by-row brush-painted heart remains the separate proof that actual pointer gestures work.

We also asked the keyboard to give Bun a blank next frame, then bring the first one safely back. And we changed the desk through Cocoa, Drizzle, Harvest and Harbor, by night and by day. Each choice left the drawing’s pixels alone; a reload remembered Harbor Day. These controlled cloud checks passed on the same source `37b37191`.

The automatic PR check still stopped at the service’s billing gate. We have kept its counter empty. While that door waits to open, there is still useful work we can finish: better questions, real files, a public account of each result, and a little film of the drawing making its way home. The [candidate record](../releases/2026-10-18-artwork-safety-and-evidence.md) and [evidence data](verification-stories.json) link the precise scope and receipts.

## A small way back to the palette

Another question came from the keyboard. After choosing colors, could an artist close the little palette and return to the button they came from? TestSprite found that the palette closed, but focus went elsewhere. Three doors shared one return address. We are giving each opening its own way back, with a regression for both color wells and the swatches button. The original cloud red stays beside the repair’s qualification record.

While we followed that trail, the desk remembered a saved arrangement after a reload. Frame cards traveled left and right by keyboard, carrying their different pauses with them. On the homepage, the tiny bench made a real moving GIF while the artist’s Studio drawing stayed safe in the other tab. Those three controlled cloud journeys passed. The [Colors follow-up](../releases/2026-10-18-color-focus-return.md) and [dated receipts](cloud-receipts-2026-10-18.json) keep the exact sources and limits close to the story.

## 18 October: the way back works

The keyboard came back to the color well it had opened. The same cloud question that failed on the earlier preview now passes on the fixing one. We also checked all three ways into Colors in Chromium, Firefox and WebKit. The small return address mattered.

We followed the surface question a little further, too. A color canvas cannot tell the whole story of a normal layer. This time TestSprite downloaded the actual project, checked the surface’s own pixels, undid the mark and brought it back. The paint underneath stayed exactly as it was. On a separate two-frame color fixture, the green family could leave while its red and blue neighbors—and the other frame—stayed. Undo brought the original pixels back.

Those controlled cloud journeys passed on source `77a40070`. So did the brush-painted heart’s lighting check with waits that respect the app’s CSP. The [fixing record](../releases/2026-10-18-color-focus-return.md#qualified-fixing-preview--source-77a40070) and [versioned receipts](cloud-receipts-2026-10-18.json) carry the precise scope. The automatic PR gate is still waiting on service billing; its empty counter remains honest.

## The drawing that was still there

We gave the first frame one last little red mark, and the second a different pause. Then we saved, reloaded, closed the desk and opened it again. The mark was there. So were both layers, both pauses, the palette and the pixels inside each real PNG.

Next we brought the desk two broken files. It told us why they could not come in, let us Cancel, and left the original drawing alone. We could still make a mark and undo it. The onion ghost was gentler still: visible while we drew, absent from the file we took home. Those three controlled cloud checks passed, alongside the saved-rig and normal-source comparisons. The [trust record](../releases/2026-10-18-testsprite-trust-and-triage.md) keeps their exact source and limits.

These questions did not need new repairs. They made the evidence better. We want the account of TestSprite helping PixiBun to be as careful as the small drawing itself: a real failure where one happened, a repair with its proof, and a promise already kept where the stronger check found it. The [evidence guide](evidence-guide.md) brings those threads together.

## 19 October: the check finally reaches the desk

The billing door opened, and the PR check finally visited the drawing. Its first full answer was untidy: 32 passed, 13 failed, 76 blocked. We kept that answer. It is more useful to us than a tidy number without a trail.

Some questions needed a small correction. Before asking whether Undo brought Bun back, the browser needed to press Undo. Before asking what a lesson was missing, it needed a half-finished pose. And before looking for a saved variation, it needed to apply one deliberately, keep its original layer and come back to the layer carrying the recipe. Three browsers followed those paths independently, with the pixels beside the controls.

Dither asked us to be more careful with our words. It lays the chosen color into a pattern and leaves little gaps alone. The hint had promised two colors at once. We corrected the hint, then checked every cell of a small blue stroke and its Undo. The drawing did not need a new engine; the promise needed to describe the one we had.

We also found a green check that was answering yesterday's question: its saved script had not changed with the plan. We kept that pass in history and wrote a replay that really visits the incomplete pose. A script that did not even reach a page stays a failed attempt, too. The [19 October record](../releases/2026-10-19-pr-verification-triage.md) keeps those limits, original failures and follow-ups together.

Some questions still need tools the cloud browser does not have: a real drag, a file it can open, or an independent view of every pixel. We have asked for the supported fixture path. Until those observations exist, the honest answer stays Blocked. Bun deserves a dependable way home, and so does the evidence we submit with it.

The next push opened the check by itself. Its traces asked us to slow down once more: one Undo and one Redo should be a pair; a layer made in the second pose belongs to that pose when we come home. We followed those small promises in three browsers and decoded the backup itself. The [automatic follow-up](automatic-followup-2026-10-19.json) keeps those nine passing comparisons beside the cloud failures that prompted them. The automatic check finished with 33 passed, 10 failed and 78 blocked. That is its answer, separate from our supporting checks.

Even the export limit needed a fair question. Bun at thirty-two times its size still fits comfortably inside a 512-pixel image. We checked that it was welcome, then brought a larger canvas to the same door. The unsafe sizes were disabled before a giant image existed; Cancel brought us back to the same pixels. All three browsers agreed. Some days making the studio safer means fixing a tool. Some days it means learning to ask the tool the right question, and keeping both answers in the notebook.
