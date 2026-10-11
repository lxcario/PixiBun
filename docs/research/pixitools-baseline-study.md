# PixiTools baseline usability study — ready-to-run kit

Maintenance update — 11 October 2026: see the [current status](../current-status.md) for the current engineering milestone. Earlier measurements, failures and decisions below retain their original revision and scope.

**Status:** planned; no participant sessions have been run. Use this to establish evidence before selecting tutorial content or the first four tool previews.

## Recruit and prepare

Recruit five people who have never used PixiBun. Include a mix of people with and without pixel-art experience. Keep their experience level in the notes, because it may explain different paths. Schedule 25–35 minutes per person and use the same desktop browser, viewport, starting route, and build for all sessions. Use a throwaway browser profile or clear local PixiBun data between sessions; never expose someone else's artwork.

Prepare an empty project, a simple two-frame goal image, and a small sprite that could benefit from lighting. Ask permission before screen recording. If they decline, use written notes. Do not record personal details in the issue log.

## Moderator opening

> We're testing PixiBun, not you. Please try the tasks as you normally would and say what you expect to happen. I may be quiet while you work. If you get stuck, tell me what you're looking for. You can stop at any point.

Do not mention menu names, the Playground, PixiTools, or shortcuts before the task. Ask “What would you expect this to do?” instead of pointing to a control. Give help only after a participant declares they are stuck; record the help and mark the task as assisted.

## Tasks, in order

1. **Draw:** “Make a tiny character or object on the canvas and keep it in your project.” Start at the landing page. End when pixels are committed and the person knows the work is retained. Observe whether they enter Studio or Playground, tool choice, first stroke, and save expectations.
2. **Animate:** “Give your drawing a second pose and play the result.” Start from their drawing. End when a distinct second frame exists and playback runs. Observe where they search for frames, whether they edit the correct frame, and how they identify Play.
3. **PixiTools discovery:** “Change the atmosphere of this sprite with light. Find a suitable feature and try it.” Give the prepared sprite in a separate throwaway project so earlier work is safe. End when a lighting result is visibly applied or the participant stops. Observe their first click, filter choice, labels they understand, parameter confusion, and whether they can cancel or undo.
4. **Independent repeat:** After a short unrelated question, ask them to repeat one action from Task 2 or 3 with any guidance closed. Record what they remembered and what they sought again.

Stop a task after about five minutes of no progress, but record the exact point of difficulty. Do not count moderator intervention as independent success.

## Per-participant record

| Field | Entry |
| --- | --- |
| Anonymous ID, date, build | |
| Pixel-art/editor experience | |
| Starting route, browser, viewport | |
| Task and start/end time | |
| Completed independently / assisted / partial / stopped | |
| First click and wrong turns | |
| Verbatim expectation or confusion | |
| Help requested and moderator action | |
| Unexpected project, frame, undo/redo, or save behavior | |
| Recording or timestamp reference (if consented) | |

Record one row or short note block per task. For the first result, time from opening Studio to the committed result as well as from task prompt. These are different measures.

## Issue synthesis after all five sessions

For each issue, capture: **task**, **observed behavior**, **expected behavior**, **participant IDs affected**, **impact** (blocked / serious delay / minor), **likely cause**, **one proposed change**, and **how to retest**. Rank first by blocked work or data risk, then by recurrence and time cost. A single data-loss issue outranks a frequently misunderstood label.

Create three outputs:

1. A task-flow map for Draw, Animate, and Lighting with the points where people hesitate, backtrack, or need help.
2. A ranked top-five issue list, distinguishing interface fixes from things that truly need instruction.
3. Four PixiTools preview candidates chosen from actual tool confusion, with the exact question each preview must answer.

Retest the same tasks on a revised build with new participants in Week 6. Compare individual observations and timings as directional evidence. Do not report “X% of users” from five people.
