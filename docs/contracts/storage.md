# Project and storage contract

The portable `.pixibun` **project format v3** is separate from **Dexie schema v5**. Raising or keeping one number does not establish compatibility for the other. [Schema](../../src/lib/project/schema.ts), [serialization](../../src/lib/project/serialize.ts), [database](../../src/lib/storage/db.ts) own these boundaries.

## Logical versus physical raster records

Application APIs expose `StoredLayerBlob.blob: Blob`. New IndexedDB writes encode its bytes as an **ArrayBuffer**, storing MIME information in `blobType`. Reads reconstruct the logical Blob and retain support for older Blob-backed records. PNG records remain associated with project, layer and frame. Metadata and raster writes commit atomically, with revision checks against concurrent changes/deletion.

Binary bytes avoid base64 in database records. Portable JSON/image serialization has a different representation and overhead. Do not claim every logical Blob is physically persisted as a browser Blob or a universal percentage saving.

The `projects`, `layerBlobs`, `diagnostics` and `recoveryRecords` tables have distinct roles. Diagnostic records are not artwork backups. Recovery records describe assessment/progress; repairing creates a new project rather than replacing the source.

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
