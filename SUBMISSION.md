# PixiBun × TestSprite Hackathon S4

> **121 of 121 TestSprite cases passing. PR #6 merged through a required check with no bypass. Live at [pixibun.vercel.app](https://pixibun.vercel.app).**

## 🐰 In one breath

PixiBun is a cozy pixel-art and animation studio for the evening. You light a lamp, draw Bun one square at a time, give each frame its own pause, and take the drawing home. Pixel art is small, so small things matter. A 16×16 sprite is 256 squares, and if one changes when you didn't ask, you stop trusting the desk.

So PixiBun is built on quiet promises: **a locked layer stays locked, Undo returns the pose you had, each frame keeps its hold, and the file you save really holds your drawing.** This season, 121 TestSprite cases checked those promises on every push. It took 19 automatic runs to get from 33 passing to all 121, and the merge button stayed grey until they did.

## Links

- **Live app:** https://pixibun.vercel.app (production serves `main`, where PR #6 merged as `238ff87b`)
- **Repository:** https://github.com/lxcario/PixiBun
- **The PR with the TestSprite check:** https://github.com/lxcario/PixiBun/pull/6 (opened 18 October, merged 24 October)
- **Final TestSprite report, 121/121:** https://www.testsprite.com/dashboard-v3/o/8da317b3-5f3e-506d-b110-a2ae9c2af7b8/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/6c0fedd6-d38e-4abe-a0d8-70242bb19731
- **Run log, every automatic run in order:** https://github.com/lxcario/PixiBun/blob/main/docs/testsprite/run-log.md
- **Mutation proof:** https://github.com/lxcario/PixiBun/blob/main/docs/testsprite/mutation-proof.md
- **Evidence page (bugs, fixes, guard tests):** https://github.com/lxcario/PixiBun/blob/main/docs/testsprite/README.md
- **Demo video:** https://youtu.be/ic4LoLqSFvA
- **Write-up:** [121 promises to a pixel artist](https://medium.com/@resquedzn05/121-promises-to-a-pixel-artist-521055d4167e) (Medium)

## Team

- **Résque**: Discord `resquwue` · GitHub [`lxcario`](https://github.com/lxcario)
- Previous seasons: 1st place, TestSprite Hackathon S3 ([Nora](https://github.com/lxcario/Nora)); 2nd place, S2 (CinePurr)

## TestSprite account

The same account generated all 121 cases, installed the GitHub App on `lxcario/PixiBun` and owns the PR trigger. The account email is in the Discord submission post.

## The result

| | |
| --- | --- |
| Final automatic run | **121 passed · 0 failed · 0 blocked** on `c2670d1c` |
| The climb | 19 automatic runs on PR #6, from **33** passing on 21 October to **121** on 23 October |
| Bugs TestSprite led us to | **13**, each with a fix commit, 12 with a regression test |
| Merge gate | `TestSprite V3` and `validate` required on `main`, with no admin bypass. PR #6 stayed unmergeable through every red run and merged only after 121/121. (The one exception was the documentation-only PR #14, which couldn't run for lack of credits: see the run log.) |
| Do the tests catch real damage? | We planted 10 artist-harming bugs. The same plans caught **9**, and a regression test caught the 10th |
| Alongside | 3,053 unit tests and 564 production browser checks in Chromium, Firefox and WebKit, all green on the PR's final commit |

## How verification is wired into shipping

1. Every push to a ready-for-review PR deploys a Vercel preview. Draft PRs are skipped.
2. The **TestSprite GitHub App** sees the deployment and queues all 121 cases against that exact preview, usually within ten seconds, with nobody pressing Run.
3. In parallel, a **Stored Python Replay** workflow uses the TestSprite CLI to replay two deep scripts that decode real canvas pixels and the downloaded PNG.
4. `main` requires the TestSprite check, with no admin bypass. PR #6, which carried all of this season's code, merged only after it was green.
5. Before a plan costs a credit, a small local **emulator** runs it with only the gestures the cloud agent uses. That rehearsal caught one real bug before any run was spent.

## What's inside PixiBun

No AI model draws, shades or "improves" anything in PixiBun, and nothing trains on your art. Everything below is graphics math you can tune, running in your browser:

- **The Lamp.** Drag a bulb around your sprite and real shading follows. An exact Euclidean distance transform (Felzenszwalb & Huttenlocher) gives a flat sprite a sense of depth. Sobel gradients turn that into surface normals, then Blinn-Phong shading and a raymarched soft cast shadow light it, with new tones built from your own colors.
- **Distortion-free rotation.** Turning pixel art usually smears it. PixiBun uses **RotSprite**: it upscales 8× with Scale2x (EPX) and rotates there, so lines stay crisp.
- **Dithering with taste.** Bayer ordered matrices, Atkinson diffusion, and **Riemersma** dithering along a Hilbert space-filling curve.
- **Color that looks right.** Palette tools work in **OKLab**, a perceptual color space, so color steps look even to the eye, not just in the numbers.
- **Cleanup and generation.** **Zhang–Suen** skeleton thinning for one-pixel lines, **Wave Function Collapse** texture synthesis, and 47-tile blob autotiling for game maps.
- **Animation without frames.** Six living postcards (rain on a window, a campfire, a tide at dusk) move through **palette cycling**, the classic technique of a few colors taking turns.
- **Draw together, peer to peer.** Co-Draw connects two browsers directly over WebRTC. Every pixel is a last-write-wins **CRDT** register with a hybrid logical clock, so two people drawing at once converge on the same picture with no server deciding.
- **Files you can trust.** PixiBun writes its own GIFs (median-cut palettes, LZW compression), APNG, and MP4 through an **ISO-BMFF muxer written from scratch in TypeScript**. A **Cart** is a trading-card PNG with the whole editable drawing inside it.

## Teaching an agent to see a canvas

A `<canvas>` is a blank rectangle to a browser agent. So PixiBun describes its own drawing in a screen-reader **Canvas readout**: size, frame, layer, painted pixels, color counts, and a 32-bit FNV-1a digest of the real composite. It helps people using screen readers, and it lets TestSprite check the artwork, not just the buttons around it. A changed digest proves the art changed. The byte-exact checks run alongside, in stored replays and Playwright. **Replay links** (`/studio?replay=…`) draw an exact starting picture from a URL, so the agent never needs a file upload.

## Three bugs TestSprite found

**Type 24, get 44.** An automatic run typed 24 into the canvas-size field and got a 44×44 canvas. The field clamped on every keystroke, so the 2 became 4 before the 4 arrived, and no size starting with 1, 2 or 3 could be typed at all. Fixed in [`4d838ca9`](https://github.com/lxcario/PixiBun/commit/4d838ca9) with a component test. The next automatic run passed the same case.

**The buttons nobody could name.** The agent couldn't find the selection-transform buttons, because their names were arrow glyphs. Reproducing it by hand found something worse: flip a selection, press Escape, and the pixels were gone, with no Undo. Both were fixed ([`ff320663`](https://github.com/lxcario/PixiBun/commit/ff320663), [`c534cc99`](https://github.com/lxcario/PixiBun/commit/c534cc99)) with an end-to-end test covering five ways back.

**The invisible character.** A replay link with a zero-width character stuck to the end opened a blank canvas instead of the drawing. That happens whenever links are copied out of chats. Fixed in [`04acc9bb`](https://github.com/lxcario/PixiBun/commit/04acc9bb), and the next run passed.

## Testing the tests

A green check only means something if it would turn red when the app breaks. So we broke PixiBun on purpose, ten ways an artist would hate: Undo that forgets a deleted frame, a locked layer that takes paint, holds that don't survive a save, an eyedropper that fills the wrong color, an eraser that ignores a single click. The same plans TestSprite runs caught **9 of the 10**, and each catch was confirmed against the clean build. The 10th only shows up when you type one key at a time, which our local emulator doesn't do and the cloud agent does. Its regression test catches it.

## What we kept honest

- **Every red run stays in the log**, sorted into our bug, our plan, or the agent slipping, with the commit that changed each plan.
- **When the agent slipped on a clear step,** we made the step clearer instead of removing it: "Click Undo once now; this click is required." "Read the button before you close the dialog."
- **When a plan asked for something the agent can't reliably do,** that check moved to a stored Python replay or a Playwright test, or is read from another place on the page. It wasn't just dropped, and the run log says where each one went.
- **A manual retry on narrowed plans** was labelled as exactly that, and not counted as green.
