<p align="center">
  <img src="docs/assets/readme/pixibun-logo.png" alt="PixiBun logo: a pixel bunny above lilac lettering, with a star and carrot." width="256" height="256" />
</p>

# PixiBun

Current engineering verification and remaining release checks are recorded in the [current status](docs/current-status.md).

**Pixels with a pulse.** A cozy studio for hand-made pixel art and animation.

**[Open PixiBun](https://pixibun.vercel.app/)** · [Start drawing](https://pixibun.vercel.app/studio)

### Season 4 verification — 17 October 2026

Our TestSprite 3.0 portal project spans the Studio, drawing and selections, layers, frames and timing, colors and palettes, themes, lighting, Labs motion, lessons, saving/recovery, accessibility and all 14 export destinations. The same account connects the GitHub App. After opening, we authored 97 detailed scenarios and generated/ran them in the portal. The [first expanded run](https://www.testsprite.com/dashboard-v3/o/resques-workspace-8da317b3/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/execution/0f149888-7b3a-4f54-b5f4-319c09943f86) finished **34 Passed, 13 Failed and 50 Blocked** (workspace access may be required). These are provider verdicts, not certification that every planned assertion executed.

The 18-case preparation run finished with **10 Passed, 1 Failed and 7 Blocked**. Its lighting failure counted decorative SVGs rather than artwork pixels, so it is not proof of an Undo defect. Exact raster checks, downloaded-byte decoding and some import fixtures remain gaps in cloud coverage. Original failures and blocked outcomes are retained while tests are reviewed.

Investigating the expanded Normal Chisel result led to a separately reproduced product defect: toolbar selection could paint normal-map colors onto an ordinary color layer. [PR #5](https://github.com/lxcario/PixiBun/pull/5) adds the missing layer guard with exact native RGBA/history regressions. Its local six-stage gate passed, including 2,626 tests and a production build; preview/cloud verification and merge remain separate.

[PR #4](https://github.com/lxcario/PixiBun/pull/4) and PR #5 automatically matched their Vercel deployment events, but TestSprite reported **“GitHub CI runs not on the Free plan. No tests were run.”** Human support confirms a Free-plan CI rollout is in development and says no upgrade is needed. Actual PR activity still shows the entitlement block. GitHub now requires TestSprite V3 and validate on main, with bypass disabled. The automatic testing loop remains incomplete until an actual latest-commit suite executes and its assertions are audited. Native repository tests and TestSprite evidence are reported separately.

Application source is MIT-licensed. The bundled fonts retain their [SIL Open Font License and copyright notices](src/app/fonts/OFL.txt).


Make a small character, a flickering flame, or the first tile of a world. PixiBun gives you a place to draw, light it with the Lamp and bring those little things to life, right in your browser. Hand-made, never generated: PixiBun contains no generative AI ([pledge page source](src/app/pledge/page.tsx), served at `/pledge`). No account needed.

Plum shadows, wisteria accents, amber buttons and a few live pixel glints make Plum feel like a desk with the lamp still on. [See every theme in Night and Day](docs/guides/themes.md).

![Plum Night Studio with the same original three-frame built-in artwork.](docs/assets/screenshots/2026-10-15-current-ui/studio-cozy-classic-dark.png)

*A little company at the drawing desk. PixiBun's own starter characters, arranged in a three-frame project.*

[Illustrated artist handbook](docs/guides/README.md) · [Every feature](docs/features.md) · [Your first few pixels](#your-first-few-pixels) · [Keep your work safe](#keep-your-work-safe) · [Run locally](#run-locally) · [Explore the docs](docs/README.md)

**Make the desk your own.** The ten scene themes include optional [Studio Labs](docs/guides/studio-workspace.md#studio-labs): a morphing tool island, liquid inspector tabs, liquid sliders and tool rail, a paint-pot palette and quick effects. Open **Studio → Labs** to switch experiments off individually or choose **Classic studio**. Graphite and Plum always use the classic interface.

## Small canvas, plenty of room to play

- **Draw something that feels like yours.** Start with a pixel pen, shapes and fills. Add layers, select a detail, move it around, or undo a stroke and try again. Import an image or sprite sheet when you already have a starting point.
- **Try a gentle first lesson.** Desktop Playground gives you a fresh practice sheet while your Studio drawing stays separate. **Return to drawing** brings it back; **Keep practice in Studio** saves a new project. The [12 coached lessons](docs/guides/learning-and-playground.md) show one pose at a time, offer a ghost-pen demonstration and point out missing cells. Narrow screens get eight Pocket lessons plus a free doodle. Practice is temporary until you keep it.
- **Give it a little life.** Draw frames, use onion skin to see faded guides from the neighboring poses, choose how long each frame stays on screen and play a loop. Group frames into named clips to keep different movements together.
- **Move one selected part.** On an unlocked color layer, capture a selection as a rigid part, set Start and End poses with precise controls and session Undo/Redo, preview the arc and bake 2–30 editable cels. Save a named rig to reopen its settings while the source artwork still matches. [Rigid-part workflow](docs/guides/artist-workspace.md#rotate-a-detail-or-try-rigid-part-motion).
- **Find your colors.** Create a named palette, rearrange its colors, or scan the canvas for up to six main colors. Choose the First and Last colors you want to cycle; choosing just the fire colors can keep the wood and outlines still.
- **Try a different light.** PixiTools opens a lighting preview with a movable bulb. Adjust the light, see how your sprite responds, then Apply or Cancel. Cleanup tools also offer before/after previews so you can look before making a change.
- **Take your pixels somewhere.** Save a still image as PNG, a moving image as GIF or APNG, or a sprite sheet with your frames in one image. Video options depend on your browser. The [illustrated export guide](docs/guides/exporting.md) helps you choose a format, including options for games.

Palette cycling changes colors in the active frame. Draw changing poses in the timeline, or try rigid-part motion for a selected detail. Rigid motion does not infer anatomy or generate a complete character animation; inspect and refine each result.

## A little light for Bun

![Auto lighting on Bun with live bulb, angle and Apply/Cancel controls.](docs/assets/screenshots/2026-10-15-current-ui/lighting-live.png)

*An afternoon experiment: turn the light, watch the colors, keep the version you like. This screenshot shows the preview before applying it.*

## Pick the desk that feels right

PixiBun has twelve looks, each with a Night and a Day. Moonlit, Sakura, Tidepool, Ember, Moss, Arcade, Cocoa, Drizzle, Harvest and Harbor float the studio over their own animated pixel scene: a sleepy town, a night blossom festival under Mt. Fuji, a glowing reef, rooftop sparks, fireflies, a neon grid, snowed-in cabins under the northern lights, a rainy café street, harvest fields and a lighthouse bay. Graphite and Plum (the original PixiBun purple, shown below) stay flat and quiet. Your first visit to the Studio helps you pick one; open **Studio** to change it any time.

![Plum Day Studio with the same original three-frame built-in artwork.](docs/assets/screenshots/2026-10-15-current-ui/studio-cozy-classic-light.png)

*The same little friends, with the curtains open.*

The [latest source review](docs/releases/2026-10-15-codebase-and-documentation.md) covers the coached desktop and Pocket lessons, homepage animation/game-kit downloads, saved canvas palettes, inspector refinements and explicit save-before-update restart. Drawing Undo keeps changed rectangles with a 4,096-step depth cap and a shared 64 MiB payload budget.

## Your first few pixels

1. Open the studio and choose **File → New drawing**. A canvas 32 pixels wide and 32 pixels tall is a comfortable place to begin.
2. Choose a color and draw with **Pen**. Press **B** for Pen or **E** for Eraser; **Ctrl/Cmd+Z** undoes a step; **Ctrl/Cmd+Shift+Z** or **Ctrl/Cmd+Y** redoes it.
3. Open **Palette** to make a small set of colors. A few shades are enough for a face, a flower or a tiny house.
4. Add a frame to try an animation. Turn on **Onion Skin** to see faded guides from the neighboring poses.
5. Use **Save**, then **Export** when you're ready to keep a project backup or share an image.

Use **Ctrl** on Windows or Linux, and **Cmd** on a Mac. Looking for a tool? **Ctrl/Cmd+K** opens a searchable list of tools and actions. The [shortcut reference](docs/contracts/shortcuts.md) is there when you want to settle into a rhythm.

PixiBun is happiest with small sprites and tiles, especially around 16–128 pixels. **File → Canvas size…** offers 4–512 pixels per side. Imported projects can admit up to 2,048 pixels per side within the [project](docs/contracts/storage.md) and [memory limits](docs/contracts/rendering.md). Import files are limited to 50 MiB (about 52 MB).

## Keep your work safe

Your projects are saved in this browser on this device. **Saved** means a local save has finished. For artwork you want to keep, use **Export → project backup** to download an editable `.pixibun` file too. Clearing browser data or losing the device can remove local projects. The [save and backup guide](docs/guides/artwork-safety.md) covers autosave, conflicts and recovery.

Load the studio online first so your browser can keep a copy for offline drawing and editing. No account or cloud sync is required. Basic troubleshooting information is kept in your browser by default; sending it through an optional reporting service needs your permission. See [privacy and security](SECURITY.md) for the details.

## Run locally

Want to run PixiBun on your own computer or help improve it? The setup is below; you can skip this part if you're here to draw.

<details>
<summary>Set up a local studio</summary>

You'll need **Git**, **Node.js 22** (the exact version is in `.nvmrc`) and **npm 10 or newer**, plus access to the GitHub repository. If GitHub asks you to sign in or request access, use an account with permission. In a terminal, run:

```sh
git clone --depth 1 https://github.com/lxcario/PixiBun.git
cd PixiBun
npm ci
npm run dev
```

Then open [localhost:3000/studio](http://localhost:3000/studio).

If you'd like to help tend the studio, start with [Contributing](CONTRIBUTING.md). Before sharing a change, run `npm run gate:full` to check the documentation and code and make sure the app builds. Tests that open the app in a browser run separately; the [testing guide](docs/guides/testing.md) walks through them.

For agent developers, **Nibbli** is a repository companion that uses the real Studio controls, checks pixels and exported files, and retains failed attempts. Tester journeys are scripted; Artist accepts plans and critiques from your existing conversation or deterministic mocks. The current Hands workflow supports bounded 32×32 edits. No additional model API key is required for these adapters. Start with the [Nibbli guide](docs/guides/nibbli.md) and [agent contract](docs/guides/nibbli-agent.md); this is developer tooling rather than an assistant panel inside the Studio.

</details>

## A few useful shelves

| When you want to… | Start here |
| --- | --- |
| Learn a tool or explore every feature with pictures | [Artist handbook](docs/guides/README.md) and [complete feature index](docs/features.md) |
| Keep an editable copy of your work | [Artwork safety and backup](docs/guides/artwork-safety.md) |
| Choose an export format | [Illustrated export guide](docs/guides/exporting.md) |
| Learn the keys | [Keyboard shortcuts](docs/contracts/shortcuts.md) |
| See what's available and what's been checked | [Current project status](docs/current-status.md) |
| Understand the engine | [Architecture](ARCHITECTURE.md) and [rendering](docs/contracts/rendering.md) |
| Run agent-driven drawing, editing or verification | [Nibbli](docs/guides/nibbli.md), [agent contract](docs/guides/nibbli-agent.md) and [milestones](docs/plans/nibbli.md) |
| Explore ideas for the future | [v2 vision](V2_VISION.md), a proposal for future work |

These screenshots show the local production build on **15 October 2026**, using PixiBun's own artwork. Compare [the Studio themes in Day and Night](docs/guides/themes.md); those pictures predate the four themes added on 16 October. [About this version](docs/current-status.md) explains the scoped checks; [capture details](docs/assets/screenshots/2026-10-15-current-ui/run.json) record the build and images.

PixiBun is licensed under the [MIT License](LICENSE).

*A few colors. A little patience. Something only you could make.*
