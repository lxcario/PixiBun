# Project and storage contract

The portable `.pixibun` **project format v3** is separate from **Dexie schema v5**. Raising or keeping one number does not establish compatibility for the other. [Schema](../../src/lib/project/schema.ts), [serialization](../../src/lib/project/serialize.ts), [database](../../src/lib/storage/db.ts) own these boundaries.

## Logical versus physical raster records

Application APIs expose `StoredLayerBlob.blob: Blob`. New IndexedDB writes encode its bytes as an **ArrayBuffer**, storing MIME information in `blobType`. Reads reconstruct the logical Blob, remove the physical MIME field from that logical record and retain support for older Blob-backed records. Other unknown fields remain visible to strict recovery validation. PNG records remain associated with project, layer and frame. Metadata and raster writes commit atomically, with revision checks against concurrent changes/deletion.

Binary bytes avoid base64 in database records. Portable JSON/image serialization has a different representation and overhead. Do not claim every logical Blob is physically persisted as a browser Blob or a universal percentage saving.

The `projects`, `layerBlobs`, `diagnostics` and `recoveryRecords` tables have distinct roles. Diagnostic records are not artwork backups. Recovery records describe assessment/progress; repairing creates a new project rather than replacing the source.

## Untouched archive admission

[Untouched recovery archive preparation](../../src/lib/recovery/recoveryBackup.ts) counts the source's `[projectId+id]` index range before loading its raster payloads. More than 10,000 matching records are refused without materializing those payloads. Count, admitted payload enumeration, project metadata and recovery-ledger reads share one read-only transaction; a displayed earlier diagnosis is not admission for a later export. The admitted query retains its 10,001-record limit, and the original validation/error ordering remains.

Dexie caps the returned count at the query limit; the native index count can still inspect the full matching range. This reduces payload cloning on overflow, not a guarantee of constant-time counting, bounded browser heap or faster normal-size exports. Admitted sources perform an additional index request. The diagnosis and recovery-plan snapshot paths still enumerate bounded records; this preflight applies specifically to untouched archive preparation. [Phase 6 scope](../research/2026-10-02-feature-repairs-phase6.md).

## Admission and optional metadata

| Boundary | Current policy |
| --- | --- |
| Canvas | Whole dimensions 1–2048 per axis |
| Structure | Up to 500 frames, 100 layers per frame, 2,000 total layer records |
| Aggregate project raster footprint | At most 67,108,864 pixels (256 MiB raw RGBA); limits apply together, not independently attainable maxima |
| Import | Size, depth, version, structure and decoded-raster checks; see `schema.ts`, header probes and decoding paths |
| Format version | Non-positive/non-integer versions invalid; newer unsupported versions rejected with an update prompt; supported legacy migrations retained |
| Effects/research/review/palette registers | Optional metadata is validated by its own contract; old readers may discard optional fields |

`LayerEffectRecipe` retains legacy provenance and bounded generic parameter containers. It is not an executable per-kind schema with universal recomputation. Research recipes are a separate versioned, bounded contract with source IDs/fingerprints. Undo/redo move raster and associated metadata together for supported actions. Merges and incompatible transforms can detach single-source provenance.

Normal-map encoding rounds normalized components to bytes; flat is `(128,128,255)`. The chisel supports OpenGL +Y-up and the alternate green-channel convention. Rendering uses screen-coordinate light vectors and converts imported normals appropriately; see [rendering](rendering.md). A target engine may require a green-channel flip.

## Save result and rollback compatibility

`AutoSaveOutcome` is success or `conflict`, `memory-limit`, `invariant-invalid`, `aborted`, `quota-exceeded`, or `error`. The UI lifecycle also tracks restore/admission, dirty revision, encoding and queued saves; these are not additional database result variants. See [artist actions](../guides/artwork-safety.md).

An older deployment can lack the ArrayBuffer read path even with the same Dexie version. Rolling back a server does not roll back browser IndexedDB. Export portable backups and qualify the rollback reader against new physical records and optional metadata before reverting. Never clear storage as an automatic deployment step.

Known reader incompatibilities are recorded in the [dated local candidate assessment](../releases/2026-10-02-local-candidate-assessment.md). A module-level reader check can reject a specific candidate; it cannot qualify an entire historical production build, optional metadata or save-back behavior. Follow the [release-readiness guide](../guides/release-readiness.md).

## Desktop practice checkpoint and handoff

Before detaching an active Studio drawing, desktop practice awaits its coordinator's save and verifies clean ownership. The original's store snapshot, raster references and native-file association remain in memory; practice receives a fresh identity and has no implicit autosave. Unmount clears the Studio debounce timer, and the old coordinator refuses writes while practice is active.

Return restores the original and its confirmed storage-version map, lifecycle and conflict state. Keep serializes practice and checks session ownership/edit revision before and after a separate atomic write. It adopts only after a confirmed storage version; failed or cancelled adoption cannot overwrite the original. A write already committed when cancellation arrives may leave an extra separate practice copy in Projects.

A session-storage original-project pointer is written and verified before detachment. After a reload, Studio targets that record through ordinary admission instead of treating practice as the latest artwork; the pointer clears after successful restore/adoption or an explicitly selected project open. If its original record is missing, Studio reports that loss and releases the stale pointer so later drawings can save/restore normally. This is not a pixel backup. Cleared browser storage, missing records and damaged projects still require the normal safety/recovery flow. A confirmed IndexedDB transaction is not a universal power-loss durability promise. [Implementation](../../src/lib/project/practiceSession.ts), [coordinator](../../src/hooks/studio/useStudioAutosave.ts), [local checks](../research/2026-10-02-feature-repairs-phase2.md).
