# Native browser identity and AVC metadata — 19 October 2026

## Original CI evidence

[CI attempt 2](https://github.com/lxcario/PixiBun/actions/runs/39154907266/attempts/2), PR #6 head `749fc828a710d0420b1c2f5f83a05dbe9b09524d`, tested combined merge build `0c970094cf5b7dce43d9bc6fa4b363c4907d0503`. Development: **364 passed**, zero skipped, unexpected or flaky cases. Production: **511 passed /4 failed /4 skipped**, zero retries/flaky cases. Validate, rollback compatibility and Lighthouse passed. The build stayed frozen and independently retrieved browser artifacts matched all 319 indexed files.

The [browser artifact](https://github.com/lxcario/PixiBun/actions/runs/39154907266/artifacts/12182435105) is 34,660,375 bytes; downloaded ZIP SHA-256 `f036654610d607340a4e407542ba07111aa5898516009ad79ba5a733dd384a13`. Original JSON, logs, screenshots, traces and the actual MP4 remain locally retained. This finding came from **GitHub CI**, separately from TestSprite's App results.

## Three WebKit failures share a platform mismatch

MP4 and offline-panel checks froze while clicking MP4. Light Sweep produced neither a download nor the expected refusal within its budget. The trace identifies a Linux host but a macOS user-agent string: `Macintosh; Intel Mac OS X 10_15_7`, Safari `26.5`. The production configuration spread Playwright's Desktop Safari device descriptor, which overrides browser identity as well as geometry. That masked the actual Linux port from the existing H.264 refusal guard.

The configuration now keeps desktop geometry and uses native user agents. The MP4 regression compares the tested identity with an independently created native browser context and retains both strings with the host platform. This tests the actual port rather than disguising it as a different OS. It does not remove the unsupported-codec assertion, skip a browser, bypass CSP or expand timeouts. Playwright documents [device user-agent emulation](https://playwright.dev/docs/next/emulation).

## The Firefox MP4 contained malformed decoder metadata

Firefox decoded the red pose as `255,26,1,255`, exceeding the unchanged 12-channel tolerance. The actual downloaded file retained the intended encoded paint: FFmpeg's independent default/BT.601 decode sampled red `253,0,0` and blue `0,0,252`; forcing BT.709 reproduced the green shift. That comparison identifies a decoding/metadata boundary, not permission to relax the test.

The downloaded `avcC` description duplicated the NAL headers (`67 67…` and `68 68…`) while the actual length-prefixed keyframe contained valid SPS/PPS units. FFmpeg reported SPS decoding failures. A metadata-only diagnostic removed those duplicated headers; Windows Firefox then read 32×32 rather than 32×288. Its transparent native pixel samples are **not accepted as successful playback proof**.

The encoder now reconstructs the AVC description from actual in-band SPS/PPS when the keyframe supplies both, using the existing record writer. It retains the native description for out-of-band-only encoders. Encoded samples and painting are unchanged. Bounded parsing respects byte-view offsets and refuses truncated parameter sets. Tests use the real CI parameter bytes, verify the exact valid record, exercise the encoder-to-muxer path with malformed metadata, and confirm the media bytes stay identical. The focused muxer/encoder/ledger cohort passed **37 tests**.

## Qualification boundary

Before publication, the fixing working tree over `749fc828` passed `npm run gate:full` under Node 22.23.3: documentation integrity, TypeScript, lint, **2,902 unit tests across 268 files** with the unchanged configured coverage thresholds, warmed performance budgets and a production build. This is a working-tree result, not a clean `749fc828` result or Linux browser qualification. The first gate attempt exposed a stale hardcoded ledger-copy expectation; its failure is retained and the test now supplies its own automation note.

The [native codec regression workflow](../../.github/workflows/codec-regressions.yml) runs the affected export, Light Sweep and offline-panel specs in all three real Linux browsers, preserves the frozen build and original results, and independently retrieves its artifacts. It supplements the complete CI suite; it does not substitute for TestSprite's required PR check or merge protection.

The actual Linux playback/color outcome must pass on the fixing source before calling the Firefox repair qualified. Unit success, a metadata-only diagnostic or a changed UA alone is insufficient. The original 4 failures remain historical. Production is not released by this record.
