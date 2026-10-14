# PixiBun — Learn by Making

Planning status — 11 October 2026: the [current status](../current-status.md) records completed engineering validation and open release checks. Proposals below retain their own scope.

**Working plan · 28 September–8 November 2026.** This is a product experiment, not a release promise or a TestSprite milestone. The first decision comes from observing new users; the findings below are code-review hypotheses, not user-test results.

**15 October source reconciliation:** Desktop coaching/ghost demos/filmstrip and eight Pocket lessons are now implemented; their current scope is in the [learning contract](../contracts/learning.md). This plan's historical intake, proposed in-Studio progression, recruitment schedule and participant outcomes are not delivery evidence.

## Outcome and boundaries

Help a first-time visitor make a small sprite, animate it, or change its lighting in the normal Studio. Each path is optional, can be closed and reopened, and leaves the person's project, history, frames, and saved work intact. Publish short videos made from the same genuine creation sessions so viewers can see a result and try the tool themselves.

Do not gate the editor behind lessons. Keep the existing Playground available while the replacement is tested. Ship a path only after it passes the project-safety checks below.

## Original implementation: audit hypotheses

These observations describe the 28 September baseline, before the October repairs. [Phase 1 (local archive)](../archives.md#record-docs-research-2026-10-02-feature-repairs-phase1-md) makes Trace/Clear history-backed; [phase 2 (local archive)](../archives.md#record-docs-research-2026-10-02-feature-repairs-phase2-md) isolates desktop practice and preserves the original through save-before-entry, Return and separate Keep. Task-based PixiTools is also implemented. The proposed in-Studio guided paths, verified learning progression, recruitment and measured outcomes below remain proposals; they were not delivered by those repairs. Use the [current learning contract](../contracts/learning.md) for present custody/refresh limits.

| Observation from code | User-facing risk to test | Decision needed |
| --- | --- | --- |
| The landing hero enters `/studio`, while Playground is a separate navigation item. | New visitors may never encounter learning help when they need it. | Test both routes; make contextual help reachable in Studio. |
| `PlaygroundLayout` calls `startPlayground()` on mount. `syncStudioWithLesson()` changes canvas size, FPS, frame count, frame durations, and active frame. | Entering or changing a lesson may alter a live project. | Isolate a sample project or snapshot/restore the whole workspace before any lesson writes. Do this before linking lessons from Studio. |
| The Playground lesson selector calls the same sync function, including `deleteFrame()` when the lesson has fewer frames. | Switching lessons may remove frames the user made. | Never use lesson switching on an existing project until preservation is proven. |
| Progress dots and Next call `setStepIndex()`; it marks the previous step complete. | The interface can claim completion without the requested action. | Separate `visited`, `skipped`, and `verified` states. Verify the art or timeline state before completion. |
| `recordAnalysis()` checks stencil coverage for drawing; playback advances after a timer while `isPlaying`. | Drawing has some real evidence; animation completion may only mean playback started. | Define a result predicate for each step and test undo/redo after it fires. |
| Handbook actions draw directly into a buffer or clear it, then call `touchBuffer()`/`bumpBufferVersion()`. | Trace/Clear may bypass normal history boundaries. | Route example edits through the same commit path as ordinary drawing; verify undo, redo, and save. |
| PixiTools lists technical sections under domain filters. Lighting already has an Advanced Shading foldout. | First-time users may struggle to connect a desired result to a tool name or option. | Test findability before choosing four preview targets. |

### First engineering gate: protect artwork

Before any in-Studio lesson, make a throwaway sample workspace with an explicit **Open sample** action. If the user has work open, preserve it as a separate project and return to it on Exit. Lesson state must never call `setCanvasSize`, `deleteFrame`, `clearRect`, or reset history on the original project. A path passes this gate when the original project's pixels, dimensions, layer order, frames, durations, undo/redo position, and saved identity match before and after Exit. Also test refresh and reopening after a browser restart.

## Three connected workstreams

### A. Interactive first success

Present three outcome choices: **Draw something**, **Bring it to life**, **Play with light**. A choice opens a small sample in Studio. Each path has at most three observable actions and a visible result:

| Path | User action | Verified result | Optional next step |
| --- | --- | --- | --- |
| Draw | Put pixels on a blank sample with Pen. | Nontransparent pixels appear on the active layer after a committed stroke. | Try on own project. |
| Animate | Add a second frame, change at least one pixel, play it. | Two distinct frames exist and playback begins. | Adjust timing. |
| Light | Move the light on a prepared sprite, change one control, apply. | A changed lighting preview is committed as an editable result. | Open same tool on own art. |

Guidance is a compact nonmodal card near the relevant control. It can be dismissed, resumed from Help, or skipped without implying success. The final card points to the result and offers **Keep making** and **Try on my art**. Start with Draw as the first vertical slice; Animation and Light use the same step contract after it passes safety and usability checks.

### B. Contextual PixiTools learning

Use one information pattern for each tool: plain-language name, one-sentence outcome, static poster or user-started muted real-use clip, **Try it on a sample**, then expandable advanced controls. Do not autoplay a video on hover. A focusable button opens the preview; Escape and an explicit Close button dismiss it. If hover content is later added, meet WCAG 1.4.13's dismissible, hoverable, and persistent requirements. Respect reduced motion and keep captions or concise text that explains the action without audio.

Select the first four tools from the baseline study's observed confusion, not from engineering convenience. Record each demo once in the actual editor and reuse the capture as a tutorial illustration and Reel source.

### C. Developer storytelling

For the first three weeks, target two Reels per week as a sustainable trial. Use a real artifact and show the finished result in the opening seconds. Rotate three formats: tiny creation and reveal, honest development mishap, and one useful before/after lesson. Add a clear route into Studio, using a tagged link per Reel. Use Trial Reels when the account has access; check account eligibility rather than assuming availability.

Record for each Reel: format, topic, first-frame promise, length, publish time, views, average watch time, early-skip or retention signal when available, shares, saves, profile visits, tagged site visits, Studio opens, and first-result completions. Compare formats after six posts as directional evidence; do not infer causality from a tiny set of posts.

## Six-week sequence

| Week | Dates | Product delivery | Content delivery | Go/no-go evidence |
| --- | --- | --- | --- | --- |
| 1 | 28 Sep–4 Oct | Run five baseline sessions with the [study kit](../research/pixitools-baseline-study.md); rank the five most costly problems. | Capture two authentic creation clips, keep them as drafts. | Observed task paths and issue list, with no claimed population success rate. |
| 2 | 5–11 Oct | Sketch and test three Studio-based path prototypes; resolve project-preservation design. | Publish two Reels using real prototype footage. | Participants understand each path's goal; Exit preserves the original workspace. |
| 3 | 12–18 Oct | Build shared guidance contract and one end-to-end Draw path. | Publish two Reels; compare opening frames and tagged visits. | Draw completion comes from a committed stroke; Skip stays distinct; refresh/resume works. |
| 4 | 19–25 Oct | Add four PixiTools cards and real-use clips chosen from Week 1 findings. | Publish two Reels from the tool captures. | Keyboard, Escape, reduced motion, load behavior, and tool discovery checks pass. |
| 5 | 26 Oct–1 Nov | Add sample library, Help entry, and replay; implement Animation and Light paths after safety gate. | Publish two Reels showing before/after results. | Each path can be resumed and exited; own project and history remain intact. |
| 6 | 2–8 Nov | Retest with new participants; fix the largest regressions and prepare small release. | Publish two Reels and review the six-week funnel. | Repeat tasks without help, check Studio reliability, publish findings and open issues. |

If Week 1 shows a plain interface-label or workflow problem, fix that before writing a tutorial for it. If artwork safety fails, postpone in-Studio lesson launch and keep the sample isolated.

## Measurement contract

- **First meaningful result:** elapsed time from Studio open to a committed sprite stroke, distinct second frame with playback, or applied lighting result. The two-minute target is a design hypothesis for a simple first task.
- **Independent use:** after a short unrelated task, repeat the same action with guidance closed. Record successful, partial, and unable, plus the help requested.
- **Tool discovery:** first place clicked, tool chosen, wrong turns, and whether the right tool was found without moderator help.
- **Technical reliability:** compare project ID, pixels, canvas size, layers, frames, durations, history behavior, and saved/reloaded state before/after lesson exit.
- **Content to product:** tagged Reel visits → Studio opens → first committed result. Use counts and conversion rates only when tracking is actually installed and consent/privacy rules are settled.

Five qualitative participants can reveal problems; they cannot establish a reliable population completion rate. Repeat with new people after changes. Keep the baseline and retest tasks, starting state, and scoring rules the same.

## Source notes

- [NN/g on onboarding and contextual help](https://www.nngroup.com/articles/onboarding-tutorials/) and [progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) support help at the moment of need and keeping common controls visible.
- [Adobe's Photoshop tooltip guide](https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/show-or-hide-tool-tips.html) documents standard and rich tips and user control of them.
- [W3C WCAG 1.4.13](https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus) defines behavior for custom hover/focus content.
- [NN/g on five qualitative participants](https://www.nngroup.com/articles/5-test-users-qual-quant/) explains the limit of small studies.
- [Meta on Trial Reels](https://about.fb.com/news/2024/12/trial-reels-try-content-non-followers-first-see-what-perfoms-best/) and [Meta on Edits insights](https://about.fb.com/news/2025/04/introducing-edits-streamlined-video-creation-app/) document available creator experiments and skip-rate feedback.
- [Portal development retrospective](https://www.gamedeveloper.com/design/thinking-with-portals-creating-valve-s-new-ip) supports testing learning steps early; it is an analogy, not evidence that the same tutorial format will work in PixiBun.
