# Studio Labs island refinement and liquid controls — 15 October 2026

This follows the [Studio Labs motion update](2026-10-15-studio-labs-motion.md). That record's tuning, verification and failed-trial verdicts keep their own source scope. The hover squeeze it describes was replaced as explained below.

## Dynamic island

- **One trigger for every tool.** With the island on, every tool shows its name and a ▾ that opens its settings, including Pen and Eraser. Their size presets and Clean corners now live in the expanded panel, the same as Bézier Curve. Tools without settings show the name alone. The idle status dot was removed. The classic bar (island off, Graphite, Plum) still shows Pen/Eraser sizes inline.
- **Sizing.** The pill now rests at full size while hovered; it used to rest at 94% width, crowding its controls. On mount, the content measured itself before the slot existed, so its maximum width came from the window and was never re-fitted. The slot is now observed separately once the tree is committed.
- **Hover droplet.** One separation spring carries the droplet out of the right end cap: bud → neck → pinch-off → a small pop past its seat. Opening is 360/24 (mass 1, ζ≈0.63); closing is 480/34 (mass 0.9). The pill reacts only in pixels at its right edge: it reaches 5 px toward the bud and recoils 8–12 px when the neck breaks. On closing, it swells as it takes the droplet back in. A `jelly` impulse (520/11) rings at pinch-off and on clicks. Glass and rim layers fade while the bud is still joined, so no ghost rings show inside the liquid shape. The spring starts after the goo filter's first paint; otherwise that frame's stall skipped the bud entirely.
- **Quick circle.** Hover (520/20) and press (900/34, released 520/12) springs swell and squish the droplet without moving its fixed hit target. The badge value flips like a counter. An active toggle tints the droplet and gives it an accent rim. Only keyboard focus (`:focus-visible`) keeps the circle out; before, a mouse click focused it and the droplet never retracted.
- **Pen, Eraser and Line shortcut** now steps 1 → 2 → 3 → 4 → 1 px. Any other size restarts at 1. The other tools' shortcuts are unchanged from the earlier table.

## Liquid controls (new lab)

Studio → Labs → **Liquid controls** is on by default for people on scene themes and off for automated runs, like the other labs. Source and removal notes: [Labs README](../../src/experimental/README.md#liquid-controls).

- **Slider handles** become a pill lens. They swell on hover and turn to clear glass while held, or while gliding more than 3 px behind the value. They stretch with speed. Track clicks and arrow keys glide (spring 420/26) instead of jumping. One shared loop writes CSS variables and sleeps when nothing moves. Reduced motion writes nothing.
- **Tool rail.** The rail uses the liquid tab lens logic on a vertical axis, with the same springs and timings. The lens is the active tool’s highlight; the active button hands its paint to the lens and keeps its icon and sparkle. Choosing a tool springs the lens there (300/25, mass 0.9), stretching with speed. The new tool keeps a readable icon until the lens arrives. Press and hold for 170 ms, or press and slide past 5 px: the lens lifts into glass (scale 1.1), is grabbed where it was touched, and follows the pointer (700/50) with rubber-banded ends, magnifying the tool under it. Releasing picks that tool. On grouped slots a still hold keeps opening the flyout, so only a slide lifts the glass there.

## Also in this change

A layer set to **On artwork only** clips to the artwork below it. Strokes beside that artwork stay in the layer (and its thumbnail) but never reach the stage. The status bar now marks such a layer, and the first stroke it hides offers to switch layer or blend. This is described under [layers](../guides/studio-workspace.md).

## Verification

These checks ran in the development preview on Windows with Chromium. They are geometry and behavior checks, not frame-rate or physical-device measurements:

- Strict types and lint passed.
- Unit tests passed (Vitest, 244 files).
- Island, liquid-controls and studio-chrome browser specs passed, with motion inspected through slow-motion frame captures in Tidepool and Sakura.

The island hover test now asserts that the pill reacts and returns to full width, not a resting squeeze. Under eight concurrent dev-mode browsers, its short recoil window can be missed. The activity-bubble case also fails under that load with the earlier code; both pass at normal parallelism. No Firefox or WebKit run and no production build were made for this change.
