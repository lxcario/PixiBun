# Carts

A cart is a PNG that is a picture, a drawing and its making-of at once. Any image viewer shows the card; PixiBun opens the drawing inside it. Source: [cartFormat.ts](../../src/lib/cart/cartFormat.ts), [pngChunks.ts](../../src/lib/cart/pngChunks.ts).

## Format (cart version 1)

| Part | Contract |
| --- | --- |
| Carrier | One `pxBn` chunk before `IEND`: ancillary, private, safe to copy. Other chunks and the card pixels are untouched. |
| Chunk data | One encoding byte (`1` = deflate JSON), then a zlib (`deflate`) stream of UTF-8 JSON. At most 16 MiB packed and 50 MiB unpacked; inflation stops at the cap. |
| Record | `format: "pixibun-cart"`, `version: 1`, `title`, optional `maker` and `note`, `license` (`all-rights-reserved`, `cc-by`, `cc-by-sa`, `cc0`), `createdAt`, optional `light` (azimuth, elevation, brightness, radius), optional `receipt` (`strokes`, `activeMs`, optional `track`), `lineage` (`id`, `parents`), `project` (a normal `.pixibun` project, including palettes and their cycle tracks). |
| Id | The first 16 hex digits of SHA-256 over the normalized project without its timestamps. Readers recompute it; a cart cannot claim another drawing's id. |
| Lineage | Up to 16 ancestors, nearest first, each `{ id, title?, maker? }`. Opening a cart remembers it in this browser only (`pixibun-cart-origins`), so a cart made from that drawing lists it. |

## The card

[cartCard.ts](../../src/lib/cart/cartCard.ts) draws the face on whole pixels: a title strip with a postmark number (the cart id) and a small light bulb when the cart carries its light, the active frame at the largest whole scale that keeps it near 320 px, a row of its most used colors, the maker, receipt and remix lines, and a stitched footer where Bun says "Made in PixiBun · open me" beside the license. **Cream** and **Night** card stocks are offered; the night card sets the drawing on lamp-lit paper so dark outlines stay readable. The card art is only a picture; opening always uses the drawing inside.

## Reading rules

Carts are untrusted. Chunk lengths and CRCs are checked; JSON goes through SafeJson with the project import node ceiling; the project goes through the normal project schema; text is stripped of control characters and capped; unknown fields are dropped; nothing in a cart is executed. A PNG without a `pxBn` chunk imports as an ordinary image. A damaged `pxBn` chunk is reported as a damaged cart rather than imported as a picture. A newer version or encoding is refused with an update message.

Opening a cart uses the normal project import: the current drawing is saved first, then the cart's drawing and light replace the desk.

## Limits

Sites that re-encode uploads (to JPEG or WebP, or by stripping private chunks) remove the drawing; the card still shows. A receipt is a record of how a drawing was made in PixiBun, not proof: a determined person can script strokes. Nothing identifying is added by default; the maker name, note and receipt are chosen at export.
