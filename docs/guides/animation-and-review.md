# Give your little sprite a moment to move

[Handbook](README.md) · [Exports](exporting.md) · [All features](../features.md)

Start with two or three poses. A blink or a small bounce is plenty for a first animation. Each frame has independent layer pixels, and **frame time** controls how long that pose stays on screen.

## Frames, holds and playback

![Timeline with three frames, onion skin and preview speed choices.](../assets/screenshots/2026-10-02-feature-guide/animation-timeline.png)

1. Choose a frame thumbnail to edit it. **+ Frame** adds a blank pose with the current layer names and settings. For a starting pose with actual pixels, use **Frame actions → Duplicate frame**.
2. Paint the difference on the intended layer. Turn on **Onion Skin** to see nearby poses faintly behind the current artwork. Notices explain when a project budget limits the preview.
3. Set **Frame time** in milliseconds. A smaller number is quicker; a longer hold can make a blink or the top of a jump easier to read. Admitted holds range from 1 to 60,000 ms.
4. Press **Play / Space**. **Repeat**, **Ping-Pong** and **Once** change the playback loop. **Preview** offers 0.5×, 1× and 2× speed for inspection; preview speed is separate from the stored frame holds and export timing.
5. Pause before rearranging. Drag a thumbnail or use **Frame actions → Move frame earlier / later**. The same menu deletes the active frame when more than one remains. **,** and **.** step backward and forward. Collapse the timeline for more drawing room, and expand it again when needed.

Moving or deleting a frame also affects clip ranges. Recheck the clip boundaries after structural edits. Frame/layer/pixel limits can refuse growth; adding a frame does not guarantee unlimited memory. [Storage and history limits](../contracts/storage.md) describe admission and bounded Undo.

For tempo, edit each pose's **Frame time**. The project retains an FPS value for defaults/compatibility, but the current Studio timeline does not offer a separate project-FPS editor. **Onion Skin** toggles the overlay using its stored neighboring-frame count, tint and opacity; there are no separate current timeline controls for those three settings. Pause playback to inspect the onion guides.

## Tags and clips

![Animation Tags & Clips with a named sample range.](../assets/screenshots/2026-10-02-feature-guide/animation-tags.png)

Open **Clips** at the right of the timeline to reach **Animation Tags & Clips**. Add a name such as Idle or Wave, choose the first and last frames and a ribbon color, then add the tag. Its bounds are inclusive and shown as ordinary one-based frame numbers in the UI.

Existing tags can be renamed, resized, reordered, recolored or deleted. Choose Forward, Reverse or Ping-Pong for the tag's ordering, and use **Filter** to preview that range. **All frames** clears a clip filter when the timeline presents it. Tags and clips use the shared animation model; they are not a second copy of the pixels.

Sprite sheets and game-delivery exports can include clip metadata; format support differs. The in-app sentence about “Aseprite formats” does **not** mean there is an `.aseprite` project exporter. The current export choices are [listed individually](exporting.md). Verify a generated resource in the engine you will actually use.

## Review animation

![A completed animation stability scan with interval findings and comparison.](../assets/screenshots/2026-10-02-feature-guide/animation-review.png)

Open **PixiTools → Review animation → Animation stability**. This is a non-destructive comparison tool; scanning does not repair or paint the frames.

1. Select **Review clip**, or create a clip from all frames. A comparison needs at least two frames.
2. Choose whether to **Align whole-sprite motion** and **Compare last frame to first**. Alignment searches a bounded motion of up to three pixels; the last-to-first option checks the loop seam.
3. Choose **Scan animation**. A pending scan can be canceled. If art, regions or the selected clip changes, scan again rather than trusting stale findings.
4. Pick a **Frame interval** in the report. Findings include protected-detail changes, one-frame reversals, contact drift, silhouette/outline differences and color changes. Clicking a finding focuses the reviewed frame.
5. Compare **Before**, **Aligned**, and **Changed pixels** at 1×, 4× or 8×. The small panes can scroll. Red marks disappeared pixels, blue appeared pixels and purple color/alpha differences; alignment can move edge changes outside the view.
6. If a smear, sparkle or color change is intentional, choose **Mark this change intentional**. **Reopen this interval** or **Clear saved exceptions** removes the mark. Marks apply to the exact reviewed frame data and settings; later edits require a fresh review.

“Consistent transition” means the implemented comparisons found no reported change, not that the motion is artistically correct. Color counts describe visible RGB values, not palette-register identities. Human evaluation of the tool's usefulness remains pending.

## Regions and protection

![A named protected Bun region saved for the selected animation clip.](../assets/screenshots/2026-10-02-feature-guide/animation-protection.png)

Open **Regions and protection**, make a canvas selection and give it a name. Choose a purpose, then **Save selected region**:

| Purpose | What it does | What it does not promise |
| --- | --- | --- |
| Protect during Pixel Cleanup | Keeps that rectangle from the Scan Artwork / Apply Cleanup workflow while this clip is selected | Does not lock Pen, transforms, other filters or every cleanup button |
| Ignore intentional motion | Excludes the named region from applicable review comparisons | Does not alter animation pixels |
| Watch contact drift | Reports changes in the content center within a contact region | Does not implement skeletal or foot-pinning correction |

The saved region is the selection's **bounding rectangle**, at fixed canvas coordinates across the clip. A lasso's irregular mask is not preserved as the region. Removing or changing regions clears saved exceptions. [Clean and refine](pixitools-cleanup-and-tiles.md#scan-before-cleaning) shows the cleanup workflow that uses this protection.

## Add an in-between pose

![The cleanup task's Generate In-Between Frame control.](../assets/screenshots/2026-10-02-feature-guide/cleanup-color-actions.png)

Open **PixiTools → Clean and refine**, scroll to **Generate In-Between Frame**, and select the first of two adjacent keyframes. The action creates an intermediate pose using the implemented pixel morphing heuristic. Inspect the new frame's outline, timing and layer content, then adjust by hand or Undo. It is not a promise of anatomically correct interpolation, a rig, or motion generated by a trained model.

To share the result, choose [APNG/GIF/video](exporting.md) or a sprite sheet. To preserve editable frames and layers, choose **Project Backup** instead.

Sources: [timeline](../../src/components/layout/BottomTimeline.tsx), [tags](../../src/components/modals/TagManagerModal.tsx), [review panel](../../src/components/layout/inspector/AnimationReviewSection.tsx), [scan](../../src/lib/animation/scanClip.ts), [in-between action](../../src/components/layout/inspector/PixiBudAssistanceSection.tsx).
