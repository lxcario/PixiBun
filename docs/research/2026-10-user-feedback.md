# What six early testers told us

Feedback record, 23 October 2026. Six people tried PixiBun and answered a Google Form between 29 September and 13 October 2026. Friends also reported bugs to the owner directly over Discord. Those messages are not kept in this repository, and they are counted only as "bugs reported", not as fixes they caused.

Respondents are shown as P1–P6 in the order they replied. Discord names and the raw form export stay with the owner. One response contains joke answers and offensive words; only its product points are summarized here.

This is a feedback survey, not an observed usability study. Nobody was timed or watched completing tasks, so the [artist study kit](../guides/artist-study.md) and the participant rows in the [issue registry](issue-registry.md) stay open.

## Who answered

| | Pixel-art experience | Tools used before | Device and browser |
| --- | --- | --- | --- |
| P1 | Complete beginner | Photoshop, other | Windows 11 laptop, Brave and Chrome |
| P2 | Complete beginner | None | PC, Chrome |
| P3 | Complete beginner | None | Laptop, Opera |
| P4 | Makes pixel art occasionally | Piskel, Photoshop | Chrome |
| P5 | Has tried it a few times | Other | PC, Brave |
| P6 | Complete beginner | None | Laptop, Chrome |

Four of the six were complete beginners. All six tried the drawing tools and saving/exporting. Five tried animation and Photometric Lighting, four tried shadows and other lighting tools, four tried other PixiTools, and two tried Normal Sculptor.

## The numbers

| Question | P1 | P2 | P3 | P4 | P5 | P6 | Average |
| --- | --- | --- | --- | --- | --- | --- | --- |
| How easy was it to find the tools you needed? (1–5) | 4 | 5 | 4 | 3 | 3 | 4 | 3.8 |
| How likely are you to recommend PixiBun? (0–10) | 9 | 10 | 10 | 10 | 3 | 10 | 8.7 |

Five of six would recommend PixiBun at 9 or 10. P5 chose 3 while also writing that they love it and find it easy, so that score may not mean what it says. Finding tools averaged 3.8 of 5: people liked the look but some still had to search.

## What they said

- **The look.** Every respondent praised the design. P1, a designer, called it clean and smooth where similar tools feel clunky. P2 compared it to professional design programs and liked the pixel drawings around the interface. P3 liked the colors, the step-by-step sections, the encouraging copy and not needing an account.
- **Lighting.** P1 said the lighting features "gave life" to their drawings. P4 liked automatic shadows. P5 liked the animations and what they called "the heating tools".
- **First steps.** P2 asked for a tutorial bubble the first time the Studio opens, with a way to skip it. P3 found the timeline hard at first and suggested short tutorial videos. P6 expected "Take a sprite from the shelf" to show how the bunny is drawn rather than open a finished sprite, and did not think to scroll down the homepage at first.
- **Bugs.** P3 reported a slow export in Opera: a GIF export needed a second try. P6 reported bugs privately over Discord. The other four saw none.
- **Theme.** P2 felt the purple theme did not fully suit the site.
- **Professional workflow.** P4, the most experienced respondent, asked for custom panels and workspace presets, a triangle color spectrum within easy reach, more palettes with previews, more composition overlays such as the golden ratio, a small whole-canvas overview, automatic layers for character parts, a gradient tool that works inside a selection, deeper tool settings, customizable onion skin, a shortcut that hides every panel, a particle emitter, and liquify and free warp.
- **Automatic animation.** P2 suggested generated idle and attack animations. P5 asked for auto-animation and an "AI mode".

## What changed because of it

The first five responses shaped the 5 October artist-workspace release (`f18f4e47`). Its detailed decision record, with public references for each request, was moved to the owner's local archive on 11 October under the [archive policy](../archives.md#record-docs-research-2026-10-04-artist-workspace-feedback-md). Everything below is in the current source, and the [artist workspace guide](../guides/artist-workspace.md) explains how to use it.

| Request | Who | What PixiBun does now |
| --- | --- | --- |
| Workspace presets and custom panels | P4 | Drawing, Animation and Lighting layouts; inspector on either side with adjustable width; up to six saved layouts. Panels cannot be detached or docked freely. |
| Triangle color spectrum close at hand | P4 | Hue ring with a triangle (or square) picker that can be pinned to stay open on every inspector tab. |
| More palettes with previews | P4 | Palette library with visual cards, search, filters, favorites and credits. Previewing never changes the active palette or the artwork. |
| Composition overlays | P4 | Rule of thirds, golden ratio, center, diagonals and a 10% safe area. Guides never appear in exports. |
| Whole-canvas overview | P4 | Navigator panel with the visible area outlined; click or drag to move the view. |
| Gradient inside a selection | P4 | Linear and radial gradients limited to the selection, with an optional Bayer dither and one-step Undo. |
| Deeper tool settings | P4 | A Tools tab in the inspector with the selected tool's options. |
| Customizable onion skin | P4 | Separate previous/next frame counts, tints, opacity and presets; F3 toggles. |
| Hide every panel with one key | P4 | Canvas only, Shift+Tab. |
| A different color theme | P2 | Eight Night/Day Studio themes (14 October, `58067ebb`). The default stays, and switching is one choice. |
| A tutorial when the Studio first opens | P2, P3 | A first-run welcome that can be skipped (14 October, `58067ebb`). Guided desktop lessons in the Playground with per-pose coaching and ghost-pen demos were in place by 15 October; there are twelve today (see the [learning contract](../contracts/learning.md)). |
| A hint to scroll the homepage | P6 | A **see how a night goes ↓** button under the hero links to the next section. It landed on 13 October (`a2260f7e`), the evening P6 replied, so it was not a response to them. |

## What we did not do, and why

- **Generated animation or an "AI mode".** PixiBun keeps its [pledge](https://pixibun.vercel.app/pledge): no generative AI model. The 4 October record also noted that pixel morphing cannot animate a character's anatomy. Readable motion still comes from duplicating and editing frames.
- **Automatic character-part layers.** Connected color areas are not body parts: a hand can touch a torso. A useful version would start from parts the artist marks.
- **Particle emitter, liquify and free warp.** Not built. A particle tool would have to bake to editable, repeatable frames, and smooth warping can damage intentional pixel edges.
- **Showing how a shelf sprite is drawn.** The shelf still opens a finished sprite. The Playground lessons teach drawing step by step instead; connecting the two is open.
- **The Opera GIF report.** Never reproduced. It has no browser version or project attached. Automated checks run in Chromium, Firefox and WebKit, not Opera.

## What this does not show

Six self-selected people, most of them beginners and several of them friends, can surface problems and preferences. They cannot show how most artists would use PixiBun. Ratings are self-reported and nobody was observed. The next step is the timed, observed tasks in the [artist study kit](../guides/artist-study.md), especially for the timeline that P3 found hard.
