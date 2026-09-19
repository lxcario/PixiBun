# Security Policy — PixiBun Atelier

## 1. Zero-Cloud & Local-First Philosophy
PixiBun Atelier is architected as an offline-first, client-side application:
- All canvas manipulation, photometric lighting calculations, and animation exports run on the client device.
- Artwork and project data persist on-device in browser IndexedDB storage.
- No user accounts, credentials, or tracking telemetry are collected.

## 2. Secrets & Secret Hygiene
- PixiBun requires zero API keys or external authentication tokens for local or production use.
- **Never commit Personal Access Tokens (PATs) or API keys** to this repository. All environment keys should be configured via environment variables or secret managers (e.g. Vercel Project Settings) and never hardcoded in scripts or configuration files.
- If a token is ever accidentally exposed in development, immediately revoke and rotate it at [github.com/settings/tokens](https://github.com/settings/tokens).

## 3. Diagnostics Relay Security Boundaries
The optional crash and diagnostic relay endpoint (`/api/diagnostics/relay`) enforces strict defense-in-depth boundaries:
- **Diagnostic content:** Error messages and stacks are free text and can contain names, paths, URLs or other personal data. Truncation is not redaction. Review diagnostic reports before opting into transmission; a zero-PII guarantee is not established.
- **Strict Rate Limiting:** Allows an initial burst of 12 requests and continuously refills 12 tokens per minute per IP, per server process, via an in-memory token bucket to prevent abuse and spamming (`route.ts:7-14`).
- **Payload Ceiling Guard:** Enforces a maximum request body size of 64 KB with HTTP 413 for oversized bodies. Byte-valid event arrays are truncated to the first 100 events.
- **Transport Security:** Enforces secure HTTPS in production environments.
- **Opt-In Transmission:** Transmission requires opt-in; once enabled, captured events can be sent automatically. Local capture is enabled by default.

## 4. Defense-in-Depth & Quality Gate Invariants
PixiBun Atelier enforces an automated, zero-trust Quality Gate (`npm run gate`) wired into a local `.git/hooks/pre-push` gatekeeper. The configured hook runs documentation checks, typecheck, lint and unit tests. Hooks can be bypassed and passing checks are not a security certification. Relevant safeguards include:
- **CWE-409 Decompression Bomb Defense:** Image imports probe binary headers via `ImageHeaderProbe` (`imageHeaderProbe.ts`), rejecting dimensions $>8192\text{px}$ or pixel counts $>67\text{ MP}$ before memory allocation.
- **CWE-1321 Prototype Pollution Defense:** All imported project files pass through `SafeJson.parse` (`safeJson.ts`), stripping `__proto__`, `constructor`, and `prototype` keys and enforcing a recursion depth limit ($\le 32$).
- **IEEE 754 Floating-Point Invariants:** Viewport transformations enforce `clampZoom` and `safeDivide` (`mathInvariants.ts`), preventing `NaN` propagation, zero-division, and negative coordinate corruption.
- **Safe Canvas Boundaries:** Dynamic canvas extraction uses `SafeCanvas` (`safeCanvas.ts`), clipping dimensions against hardware limits and preventing browser-crashing `IndexSizeError` exceptions.
- **WebRTC Packet Flood Mitigation:** Reliable co-draw traffic uses a bounded retry queue with acknowledgments and payload validation. Presence traffic uses a single token bucket and may be dropped. This is not a claim of RFC 2212 or RFC 2697 conformance.
- **Storage Resilience:** IndexedDB operations detect `QuotaExceededError` and automatically prune volatile telemetry caches (`storageResilience.ts`) to safeguard user artwork.

## 5. Reporting a Vulnerability
If you discover a security vulnerability or secret exposure in this project, please open a private GitHub Security Advisory or report it directly to the maintainers.

