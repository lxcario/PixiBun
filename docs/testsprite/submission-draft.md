# PixiBun — Season 4 submission draft

**Not ready to submit.** Use the official Discord channel's actual template. This draft keeps the story and evidence together; it is not an entry posted on the participant's behalf.

## 23 October evidence update — still a draft

- **Demo video:** [youtu.be/ic4LoLqSFvA](https://youtu.be/ic4LoLqSFvA). The README opens with its thumbnail.
- **Judge-facing evidence page:** [docs/testsprite/README.md](README.md): thirteen product bugs TestSprite led us to, each with its fix commit and twelve with a regression test; the run-by-run climb; what the cloud agent can't do.
- **Latest automatic App run:** 118 Passed / 3 Failed / 0 Blocked on `c0d1009d` (from 33/7/81 on `b78fffb1`); the three it missed passed in a re-run on the same PR preview, so every case's latest result is a pass. The best automatic run so far is 119/2/0 on `f97621a4`. On `53ac2afe` GitHub's statuses showed the App starting nine seconds after Vercel's preview was ready, with no manual trigger. Four App cases that caught product bugs (S4-ANIM-03, S4-PAL-04, S4-RELATION-01, S4-HIST-03) now pass on their fixed builds.
- **Early tester feedback:** six people answered a feedback survey between 29 September and 13 October; their requests shaped the 5 October workspace release ([record](../research/2026-10-user-feedback.md)). It is a survey, not an observed study.
- **Still open:** the PR check is red until one run passes all 121, and production still serves the older `main`.

## 22 October evidence update — still a draft

An automatic case-level red → fix → green now exists on PR #6. The GitHub App run on `b78fffb1` [failed S4-ANIM-03](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/b628a4b9-5173-45e0-9275-4083a2b21e92/test/0f8d6ed7-ec0e-480e-9575-bc9dfcb01f49): when Clips refused an inverted range, its error message sat outside the open dialog, where the browser makes content inert, so screen readers never heard it. Commit `e43248c0` moves the message into the open dialog, and the next automatic App run, on `48f9b999`, [passed the same case](https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/89634b92-4729-4ee2-8948-e463dbd50a9a/test/96f2f816-b333-4247-8b0f-89dca05ae402). That run went from 33/7/81 to **55 Passed /7 Failed /59 Blocked** after 28 plans were rewritten to use only gestures the App agent performs and the Studio's Canvas readout. The PR check as a whole is still red and still holds the merge. Details: [22 October record](../releases/2026-10-22-app-plan-reliability.md).

## 21 October evidence update — still a draft

Our fourth confirmed TestSprite-led product finding came from PR #6 itself: a palette loop's default 6 Hz was marked invalid. The [evidence story](../releases/2026-10-21-testsprite-verification-and-pr-story.md) links the original automatic failure, fix `f2f13f3c` in this PR, and the same case's passing manual cloud follow-up on the current fixing preview. We kept the bounds and buttons, strengthened the independent color/history checks, and retained the original failure. This is an honest product repair with controlled green evidence; the overall automatic PR check has not become green.

Current observation: the actual catalog is 91 Passed /0 Failed /30 Blocked across mixed latest executions; PR #6's required App cohort remains 37/5/79 and prevents merge. E2E, Lighthouse and native-codec checks pass on current HEAD `a8c0f90f`. Starter is now active. No final production release or complete automatic green loop is claimed. Replace these dated observations only with verifiable newer evidence before using the official submission template.

## Our story, in a few words

PixiBun is a tiny drawing desk, so we wanted its promises to stay small and dependable: a lock protects your pixels, Undo brings them back, and the file you take home is really your drawing. TestSprite helped us find the places where those promises broke. On PR #6 it even caught a palette loop rejecting its own default speed. We kept the failed run, found the native input constraint and fixed it without changing the artist's controls. Now we follow real gestures into exact pixels and actual downloaded files. The automatic PR check still holds the merge, and we are leaving that unfinished green visible. A cozy desk earns trust by keeping the drawing safe—and by keeping the evidence honest.

The [original red, code fix, latest automatic Blocked attempt and controlled green](../releases/2026-10-21-testsprite-verification-and-pr-story.md) are separate linked observations. Replace the unfinished-check sentence only after the real automatic green exists. This prose is ready to adapt to the official template; it has not been posted.

## The project

PixiBun is a little pixel-art and animation desk for making something worth keeping. Draw a sprite, give its frames different pauses, try a little light, and take home an editable project or an animation. Its quietest features matter most: a lock that protects finished pixels, Undo that brings a pose back, and a file that really contains the drawing.

- Repository: [lxcario/PixiBun](https://github.com/lxcario/PixiBun).
- Public app: [pixibun.vercel.app](https://pixibun.vercel.app). Verify the final production SHA before submission; the current evidence candidate is still on the integration branch.
- Integration proof: [PR #6](https://github.com/lxcario/PixiBun/pull/6).
- Participant Discord username supplied by the owner: `resquwue`. List every team member in the official submission.

## What TestSprite changed for us

We began by asking the browser to follow the artist's promises, not simply visit the panels. That led to three real discoveries: Normal Chisel could put surface-map colors into ordinary paint; selection edits could bypass a layer lock; and closing Colors could return keyboard focus to the wrong opener. Each has its original cloud failure, a named repair and a separately source-labelled preview follow-up in the [findings](findings.md), [stories](verification-stories.json) and [evidence guide](evidence-guide.md).

Then we made the questions more demanding. The browser drew a literal heart, compared real canvas pixels, decoded actual exported files, changed frame holds and followed an editable drawing out of the desk and back home. Those bounded comparisons are supporting evidence; they do not claim every artwork, codec, device or setting is certified.

The first executed PR App batch was 32 Passed /13 Failed /76 Blocked. We kept it. Eight exact, source-pinned controlled companion replays subsequently passed, and the [19 October register](pr6-triage-2026-10-19.md) separates the original result from later plan/script repairs and missing runner capabilities. A green result from an older stored script did not get promoted as proof of a newer question. GitHub CI's codec findings have [their own attribution](../releases/2026-10-19-native-codec-ci.md).

## The automatic loop — evidence still required

Capture a fresh fixing commit, its ready PR preview/full SHA, the automatic GitHub App dispatch, the real retained failure bundle, the agent's repair and the automatic rerun. Show the required passing check actually holding the merge. Our [ledger](loop-ledger.md) currently records the first executed failed PR check; it has zero PR-level red → fix → green loops; S4-ANIM-03 is a completed case-level automatic loop (22 October update above). Manual companion passes must remain labelled manual.

## A short demo, once the release is qualified

1. Open the public final build and show its version. Draw a small recognizable sprite with real gestures.
2. Select its pixels, lock the layer, attempt Delete and show the useful refusal. Show the positive unlocked edit and exact Undo separately.
3. Open Colors from a color well, choose a color and close it with Escape. Show focus returning to that actual opener.
4. Give two poses different holds. Download the real animation and editable backup, reopen the actual backup and continue drawing. Link the independent file/hold observations.
5. Show the actual automatic PR evidence and its fixing source, only after it exists. End on the live app and public repository.

This is a capture outline, not a rendered video or a claim that these final-release shots already exist.

## Go / no-go before posting

- [x] Repository public; README names the app, live URL, demo video and suite coverage (23 October). Recheck for credentials or sensitive artifacts before posting.
- [ ] Public app available throughout the build phase; final deployed source and artwork/export smoke checks verified.
- [ ] An in-window PR carries the actual TestSprite comment/status. PR #6 has an executed check; retain its date and original result.
- [ ] Fresh automatic fixing-commit loop and enforced passing merge check demonstrated; remaining Blocked scope disclosed honestly.
- [ ] Complete integration/browser/codec gates pass on the intended final source; original failures and skips retained.
- [ ] Same TestSprite account generated the suite, connected the App and appears in the submission. Owner confirms account-level details privately.
- [ ] Owner confirms X follow, Discord membership/badge, age/region eligibility, rights to assets and one submission per person/team.
- [ ] All members listed; final demo/link accessible; exact official Discord template/channel used before the deadline.

Do not post this draft as a finished entry while these items remain open.
