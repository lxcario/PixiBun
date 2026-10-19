# PixiBun — Season 4 submission draft

**Not ready to submit.** Use the official Discord channel's actual template. This draft keeps the story and evidence together; it is not an entry posted on the participant's behalf.

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

Capture a fresh fixing commit, its ready PR preview/full SHA, the automatic GitHub App dispatch, the real retained failure bundle, the agent's repair and the automatic rerun. Show the required passing check actually holding the merge. Our [ledger](loop-ledger.md) currently records the first executed failed PR check; it has zero completed red → fix → green PR loops. Manual companion passes must remain labelled manual.

## A short demo, once the release is qualified

1. Open the public final build and show its version. Draw a small recognizable sprite with real gestures.
2. Select its pixels, lock the layer, attempt Delete and show the useful refusal. Show the positive unlocked edit and exact Undo separately.
3. Open Colors from a color well, choose a color and close it with Escape. Show focus returning to that actual opener.
4. Give two poses different holds. Download the real animation and editable backup, reopen the actual backup and continue drawing. Link the independent file/hold observations.
5. Show the actual automatic PR evidence and its fixing source, only after it exists. End on the live app and public repository.

This is a capture outline, not a rendered video or a claim that these final-release shots already exist.

## Go / no-go before posting

- [ ] Repository public; README names the app, live URL and suite coverage; no current credentials or sensitive artifacts exposed.
- [ ] Public app available throughout the build phase; final deployed source and artwork/export smoke checks verified.
- [ ] An in-window PR carries the actual TestSprite comment/status. PR #6 has an executed check; retain its date and original result.
- [ ] Fresh automatic fixing-commit loop and enforced passing merge check demonstrated; remaining Blocked scope disclosed honestly.
- [ ] Complete integration/browser/codec gates pass on the intended final source; original failures and skips retained.
- [ ] Same TestSprite account generated the suite, connected the App and appears in the submission. Owner confirms account-level details privately.
- [ ] Owner confirms X follow, Discord membership/badge, age/region eligibility, rights to assets and one submission per person/team.
- [ ] All members listed; final demo/link accessible; exact official Discord template/channel used before the deadline.

Do not post this draft as a finished entry while these items remain open.
