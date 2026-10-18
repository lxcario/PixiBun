# A little drawing, a long way home

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
