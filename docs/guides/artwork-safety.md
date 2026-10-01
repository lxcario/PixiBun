# Artwork safety and backup

PixiBun saves projects in this browser's IndexedDB. **Saved** means the latest completed local save, not a cloud copy or a downloaded project file. Clearing site data, browser eviction, private browsing and device loss can remove local projects. Persistent-storage requests can be refused.

Edits schedule autosave after an 800 ms debounce. Encoding and the transaction take additional time. Closing during that window can lose recent changes. Use the direct **Save** button or **Ctrl/Cmd+S**, wait for Saved, then create a portable backup for work you need to keep.

Use **Export → project backup** to save a `.pixibun` project file. That includes admitted raster artwork and supported project metadata. Exporting a PNG or GIF is an artwork output, not an editable-project backup. Picker cancellation is not a successful backup. Reopen a saved project file periodically to check that your backup works.

## Save and restore outcomes

| State/outcome | Meaning and next action |
| --- | --- |
| Unsaved / dirty | The in-memory project has changes beyond the saved revision |
| Saving | A revision snapshot is encoding/writing; newer edits may queue another save |
| Saved | The completed revision matches the current project; newer edits are not falsely marked saved |
| Conflict / stale revision / deleted project | Another tab changed or removed the stored project. Keep the workspace open and use **Save a copy** to preserve both versions |
| Memory limit / invalid workspace | The save was refused; reduce the operation/workspace or keep a portable admitted backup |
| Quota / other failure | Work can remain in memory, but has not been committed. Make a backup before closing; review storage availability |
| Aborted / superseded restore | A cancelled or older load must not publish over the active workspace |

A conflict copy is a separate save that can itself fail. Do not treat clicking Save a copy as proof that a copy exists; wait for the result. Opening projects is under **File → Projects**. Failed admission or hydration should preserve the existing active artwork rather than blanking it.

## Damaged stored projects

Recovery assessment reads the original records before decoding them. The Repair Wizard builds a separately admitted recovered copy and retains the source. Options and loss summaries depend on the assessed damage; not every corrupt raster can be reconstructed.

An **untouched recovery ZIP** is a forensic archive of original metadata and raw records, with a manifest. It is different from a normal `.pixibun` export and is not promised to open as a repaired project. The file sink can stream; the in-memory fallback has a 250 MiB admission ceiling. Preserve the archive before destructive browser-storage cleanup.

Undo is session-local, bounded by independent depth caps and a combined 64 MiB payload budget. An oversized history-backed edit is refused before mutation. Process Replay reconstructs retained history and its eviction baseline; it is not a durable complete recording of every earlier stroke.

Implementation: [autosave](../../src/hooks/studio/useStudioAutosave.ts), [database](../../src/lib/storage/db.ts), [recovery admission](../../src/lib/recovery/projectAdmission.ts), [recovery orchestration](../../src/lib/recovery/recoveryOrchestrator.ts). For persistence compatibility see [storage](../contracts/storage.md).
