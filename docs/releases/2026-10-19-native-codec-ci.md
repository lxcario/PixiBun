# Native browser identity and AVC metadata — 19 October 2026

## Original CI evidence

[CI attempt 2](https://github.com/lxcario/PixiBun/actions/runs/39154907266/attempts/2), PR #6 head `749fc828a710d0420b1c2f5f83a05dbe9b09524d`, tested combined merge build `0c970094cf5b7dce43d9bc6fa4b363c4907d0503`. Development: **364 passed**, zero skipped, unexpected or flaky cases. Production: **511 passed /4 failed /4 skipped**, zero retries/flaky cases. Validate, rollback compatibility and Lighthouse passed. The build stayed frozen and independently retrieved browser artifacts matched all 319 indexed files.

The [browser artifact](https://github.com/lxcario/PixiBun/actions/runs/39154907266/artifacts/12182435105) is 34,660,375 bytes; downloaded ZIP SHA-256 `f036654610d607340a4e407542ba07111aa5898516009ad79ba5a733dd384a13`. Original JSON, logs, screenshots, traces and the actual MP4 remain locally retained. This finding came from **GitHub CI**, separately from TestSprite's App results.

## Three WebKit failures share a platform mismatch

MP4 and offline-panel checks froze while clicking MP4. Light Sweep produced neither a download nor the expected refusal within its budget. The trace identifies a Linux host but a macOS user-agent string: `Macintosh; Intel Mac OS X 10_15_7`, Safari `26.5`. The production configuration spread Playwright's Desktop Safari device descriptor, which overrides browser identity as well as geometry. That masked the actual Linux port from the existing H.264 refusal guard.

The first repair kept desktop geometry and removed device user-agent overrides. Its Linux follow-up below established that this was insufficient: Playwright's WebKit launcher also defaults to a macOS identity. The next configuration explicitly identifies the real Linux port while retaining the installed Safari/WebKit version. The MP4 regression retains the unmodified and tested identities beside the host platform and checks their consistency. It does not remove the unsupported-codec assertion, skip a browser, bypass CSP or expand timeouts. Playwright documents [device user-agent emulation](https://playwright.dev/docs/next/emulation).

## The Firefox MP4 contained malformed decoder metadata

Firefox decoded the red pose as `255,26,1,255`, exceeding the unchanged 12-channel tolerance. The actual downloaded file retained the intended encoded paint: FFmpeg's independent default/BT.601 decode sampled red `253,0,0` and blue `0,0,252`; forcing BT.709 reproduced the green shift. That comparison identifies a decoding/metadata boundary, not permission to relax the test.

The downloaded `avcC` description duplicated the NAL headers (`67 67…` and `68 68…`) while the actual length-prefixed keyframe contained valid SPS/PPS units. FFmpeg reported SPS decoding failures. A metadata-only diagnostic removed those duplicated headers; Windows Firefox then read 32×32 rather than 32×288. Its transparent native pixel samples are **not accepted as successful playback proof**.

The encoder now reconstructs the AVC description from actual in-band SPS/PPS when the keyframe supplies both, using the existing record writer. It retains the native description for out-of-band-only encoders. Encoded samples and painting are unchanged. Bounded parsing respects byte-view offsets and refuses truncated parameter sets. Tests use the real CI parameter bytes, verify the exact valid record, exercise the encoder-to-muxer path with malformed metadata, and confirm the media bytes stay identical. The focused muxer/encoder/ledger cohort passed **37 tests**.

## Qualification boundary

Before publication, the fixing working tree over `749fc828` passed `npm run gate:full` under Node 22.23.3: documentation integrity, TypeScript, lint, **2,902 unit tests across 268 files** with the unchanged configured coverage thresholds, warmed performance budgets and a production build. This is a working-tree result, not a clean `749fc828` result or Linux browser qualification. The first gate attempt exposed a stale hardcoded ledger-copy expectation; its failure is retained and the test now supplies its own automation note.

The [native codec regression workflow](../../.github/workflows/codec-regressions.yml) runs the affected export, Light Sweep and offline-panel specs in all three real Linux browsers, preserves the frozen build and original results, and independently retrieves its artifacts. It supplements the complete CI suite; it does not substitute for TestSprite's required PR check or merge protection.

The actual Linux playback/color outcome must pass on the fixing source before calling the Firefox repair qualified. Unit success, a metadata-only diagnostic or a changed UA alone is insufficient. The original 4 failures remain historical. Production is not released by this record.

## Fixing-source follow-up: `a5caa2cb`

The clean published candidate passed its normal five-stage pre-push gate: **2,902 unit tests /268 files**, documentation, types, lint and performance. Its separate production build identifies the full `a5caa2cb3e824c123ff43adea2309ff636be36e4` source. A serial Windows production run of the three affected specs passed **15/15**, zero retries/skips, with 432 compiled files unchanged. That platform result does not resolve Linux failures.

[Native Linux run 39270693419](https://github.com/lxcario/PixiBun/actions/runs/39270693419) tested PR merge source `aa70ba67d1964e11339deb3bf590ba9e6dd7579f`: **11 Passed /4 Failed**, zero retries/skips. [Artifact 12194953552](https://github.com/lxcario/PixiBun/actions/runs/39270693419/artifacts/12194953552) was independently retrieved: 17 indexed files, zero byte mismatches; ZIP SHA-256 `b04297b482c0b913dacad4cce9131e5bb0c134cb4280af3b99456e3233c4aa8c`.

Its actual browser-identity attachment proves even the unmodified Linux WebKit context reports macOS. The installed Playwright launcher's `DEFAULT_USER_AGENT` contains the same macOS string. Removing only the device override therefore did not exercise the existing Linux refusal. All three WebKit failures persisted; the next configuration correction remains unqualified until a new Linux run.

The new Firefox file has valid SPS/PPS metadata and reads as 32×32 in FFmpeg without the original SPS errors, but Firefox still decodes red as `255,26,1,255`. The H.264 stream does not signal a video color matrix (`video_signal_type_present_flag = 0`), and the container has no color record. This narrows the next investigation; it does not establish a safe universal matrix to hardcode. Actual encoded samples, color interpretation and browser metadata need comparison before another product change. A Windows presented-frame diagnostic timed out for both retained files and is not successful playback proof.

The [controlled color diagnostic](../../scripts/diagnoseMp4Colour.mjs) keeps the original MP4 and creates explicitly labelled container-matrix variants with FFmpeg. All three variants must retain the exact original media-payload SHA-256 before browser comparison. It also records a separate literal-red encoder's input/output color metadata. It never repairs the product file, changes the original assertion or turns its failure green. The workflow retains these observations after failure.

On Windows, the diagnostic was qualified against the actual Linux Firefox download. All variants retained media SHA-256 `a81183b00ce16005788428c2706ff7b49866237f98359c345cadf3113fe79672`. Chromium read original/BT.601 red as `254,1,0,255`, but the BT.709 container variant as `255,26,0,255`. Windows Firefox produced transparent samples and its encoder reported unsupported, so those values are explicitly unusable as color-fidelity proof. Linux comparison is still required. The diagnostic follows the documented [WebCodecs color configuration](https://www.w3.org/TR/webcodecs/) rather than guessing a universal replacement matrix.
