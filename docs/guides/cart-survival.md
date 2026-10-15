# Where carts survive

A cart's drawing lives in a private PNG chunk. Sites that keep the original PNG keep the drawing; sites that shrink, convert (to JPEG or WebP) or strip metadata leave only the card picture. The card still shows everywhere. Where the drawing does not survive, post the cart link (Export → Cart → **Copy link**) beside the image.

This table records real checks. A row is only filled in after someone posts a cart and checks it; nothing here is assumed. [Cart format](../contracts/carts.md).

## How to check a platform

1. In Studio, open a drawing and choose **Export → Cart**, then **Save cart**. Note the cart number on the card.
2. Post the PNG on the platform the way people normally would (a message, a post, an upload page).
3. From another device or a signed-out window, download the image the platform serves back. Use the platform's own download or "open original" action, not a screenshot.
4. Open `/open` in PixiBun and choose that downloaded file. If the player opens the drawing with the same cart number, the drawing survived. If it says the picture has no drawing inside, it did not.
5. Paste the cart link on the same platform and check that it opens the drawing, unshortened.
6. Add a row below with the date and what you saw. Keep failed checks; they are the useful ones.

## Results

| Platform | How it was posted | Card shows | Drawing survives | Link survives | Checked on | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Discord | | Not checked yet | Not checked yet | Not checked yet | | |
| Bluesky | | Not checked yet | Not checked yet | Not checked yet | | |
| Cara | | Not checked yet | Not checked yet | Not checked yet | | |
| itch.io | | Not checked yet | Not checked yet | Not checked yet | | |
| Reddit | | Not checked yet | Not checked yet | Not checked yet | | |
| Email attachment | | Not checked yet | Not checked yet | Not checked yet | | |

Platforms change their image handling without notice; re-check a row before relying on it for a launch.
