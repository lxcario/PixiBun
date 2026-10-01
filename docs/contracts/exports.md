# Export capability matrix

The direct **Export** button opens format choices. **E selects Eraser**; there is no E shortcut for Export. Normal timeline export and **Cycle Loop** are different inputs.

| Output | Actual path | Fidelity and timing limits |
| --- | --- | --- |
| PNG / sprite sheet | Canvas PNG + `spriteSheetPacker.ts` | Raster output, alpha; nearest-neighbor admitted scaling. A sheet needs metadata for pose order/holds |
| APNG | `apngEncoder.ts` | Admitted RGBA and rational frame delays; uncompressed DEFLATE store blocks with valid zlib framing. Builds a Blob from chunks; can be large; no streaming sink contract |
| GIF | worker/shared `gifEncoderCore.ts` | Palette quantization, at most 256 table entries including transparency policy; binary rather than arbitrary RGBA alpha. Delays rounded to GIF centiseconds; LZW dictionary reset fixed, old damaged files need re-export |
| WebM | `webmEncoder.ts` → `videoRecorder.ts` | Canvas captureStream + MediaRecorder (supported VP8/VP9). Real-time scheduling/capability dependent; arbitrary alpha preservation is not promised |
| MP4 | WebCodecs H.264 + `isobmffWriter.ts`, supported MediaRecorder fallback | Pads odd dimensions to even values without rescaling; not rounding to 16×16. Codec/browser availability applies. Fallback bypasses the custom muxer; no general alpha guarantee |
| Process Replay | `processReplay.ts` | Retained session history plus eviction baseline; not complete from-blank history and not restored Undo from a saved file |
| Godot / TexturePacker / Phaser metadata | Shared animation model + sheet/resource writers | Ordered poses and supported holds/loop semantics represented by the target format; consumer import support must be qualified |
| Palette shader / indexed assets | Shader and palette-register exporters | Source shades/register/alpha constraints apply. CPU cycling and shader indexing are distinct paths; do not infer arbitrary-source parity |
| SVG | `depixelizeVector.ts` | PixiBun contour/diagonal heuristic inspired by Kopf–Lischinski, not their full canonical algorithm or byte-identical raster output |
| Portable project / recovery archive | Serialization / recovery ZIP | Different backup purposes; see [artwork safety](../guides/artwork-safety.md) |

## Scope, holds and cycling

Shared animation export models preserve selected clip pose order and durations where the format can represent them. GIF rounds holds; MediaRecorder samples in real time. Browser playback scheduling is not guaranteed by encoded frame timestamps. Inspect the chosen scope before exporting.

Cycle Loop samples the active frame's color animation, not moving silhouettes across the drawn timeline. It offers 3/5/8/10/12/15/24/30 FPS, initially 8. A two-second 8 FPS loop has 16 samples. Cycle rate remains separate from export FPS. First/Last swatches bound each track: source colors outside active ranges keep their bytes in live CPU cycling and generated frames. Shared source colors cannot simultaneously belong to two independent semantic objects without authoring changes.

## Resource boundaries and evidence

Output dimensions are at most 4096 per axis / 16,777,216 pixels. Animated-image admission additionally bounds aggregate retained raw frames to 67,108,864 pixels; combined memory reservations and operation-specific constraints also apply. Admission reduces resource risk; it is not a cap on total browser RAM or codec internals.

See [geometry validation](../../src/lib/export/exportGeometryValidation.ts), [export source](../../src/lib/export), [GIF correction](../research/gif-8x-corruption-2026-10-01.md), [cycle timing evidence](../research/palette-cycle-export-2026-10-01.md), [game-delivery phase](../research/phase-implementation-status.md). The recorded Godot run applies to its named version/backend/fixture; generic Unity/Phaser compatibility requires consumer verification. The production browser suite checks the scenarios in [generated inventory](../generated/test-inventory.json), not every format/codec/input combination.
