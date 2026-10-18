# Colors returns to its actual opener — 18 October 2026

## The failure

The source-pinned controlled TestSprite Colors journey on PR #7 source `37b37191550cd9e9dc1e724d5b912516b6e4a3d9` reached the actual focus assertion after keyboard palette navigation and separate primary/secondary choice. Escape closed the flyout but failed to return focus to the Primary color well that opened it. [Original cloud failure](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/710237ce-f346-4d2b-9a05-a13dd4dbd7bb), run `c6ce306c-caf8-4488-b1a2-904b2198397a`, stored code `v-147e59cf5b96`.

Three real-browser regressions on the same frozen local production build reproduced **two failures** (Primary and Secondary wells) and **one pass** (the dedicated swatches button). The initial wrong production test-directory invocation discovered no tests; it is retained and is not counted as a regression result.

## The repair

`LeftToolbar` formerly kept a ref to the dedicated swatches button as the return target for all openings. It now records `event.currentTarget` for each actual opener when opening the flyout, then returns focus there only when the existing close contract requests restoration. Outside-pointer dismissal and explicit no-restore actions retain their existing behavior.

The browser cases use actual controls and Escape, sample all 1,024 canvas channels and retain frame/layer counts. They do not write application stores or focus through a test-only app hook. The strict cloud assertion is preserved for the fixing-preview comparison. This is an application keyboard-navigation defect; the service executed and reported it correctly.

## Companion coverage

On unchanged source `37b37191`, three other controlled cloud journeys passed: saved-layout restore/reload, focused frame keyboard operations with distinguishable holds, and homepage Draw/Light/Turn plus a real decoded Hop GIF while the original Studio artwork survives. Their [public source/code/run receipts](../testsprite/cloud-receipts-2026-10-18.json) retain actual targets and scope. The expected initial readiness wait and stale homepage angle-label assumption were test corrections, not product fixes.

Fixing-source full gate/build, production/browser and cloud results must be added after they run. These earlier-source passes do not certify the later repair. The automatic App loop remains separate and billing-blocked.
