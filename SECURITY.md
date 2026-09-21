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

## 3. Diagnostics Relay Security Boundaries & Threat Model
The optional crash and diagnostic relay endpoint (`/api/diagnostics/relay`) acts as a server-side proxy to an operator-configured upstream (`DIAGNOSTICS_RELAY_URL`). Its threat model and defense boundaries include:
- **Diagnostic Content Privacy:** Error messages and stack traces are free text and can contain names, file paths, URLs, or browser environment data. Truncation is not redaction. Review diagnostic reports before opting into transmission; a zero-PII guarantee is not established.
- **Origin Validation & CSRF Mitigation:** The endpoint inspects the `Origin` request header against the request host (`Host` or `X-Forwarded-Host`). Requests originating from untrusted foreign origins are rejected with HTTP 403 Forbidden to prevent cross-site request forgery and quota exhaustion.
- **Trusted Reverse Proxy Assumptions & Client IP Identity:** Client identity is extracted via `X-Forwarded-For` and `X-Real-IP`. Security assumption: In production (e.g. Vercel, Cloudflare, AWS ALB), an operator-trusted edge reverse proxy must sanitize or prepend the client IP. In raw, direct Internet-facing Node.js deployments without an edge proxy, an adversary could spoof `X-Forwarded-For` headers to circumvent per-IP rate limits or exhaust quotas of other IP addresses.
- **In-Memory Token Bucket Limits & Multi-Instance Serverless Scaling:** Rate limiting (`capacity: 12, refillPerMinute: 12`) is stored in process memory via `TokenBucketStore`. This rate limit is local to the active Node.js / serverless worker container. In horizontally scaled or multi-instance serverless deployments, each container enforces its own rate limit independently; aggregate cluster throughput scales to (N_instances * 12 req/min) rather than an authoritative global ceiling. Enforcing a global cluster limit would require an external distributed cache (e.g. Redis or Upstash).
- **Payload Streaming Ceilings & DoS Mitigation:** Request bodies are streamed via chunk reader enforcing a strict 64 KB (`MAX_BODY_BYTES`) ceiling before buffering, preventing memory exhaustion and allocation bombs (CWE-400 / CWE-770). Diagnostic event batches are truncated to a maximum of 100 events.
- **SSRF Defense & Transport Security:** The endpoint ignores any client-supplied destination URLs and strictly proxies to the server-side environment variable `DIAGNOSTICS_RELAY_URL`, requiring HTTPS. Upstream requests enforce a 5-second timeout (`AbortSignal.timeout(5000)`).
- **Opt-In Transmission:** Diagnostic transmission requires explicit user opt-in; once enabled, captured error events can be sent automatically. Local client-side diagnostic capture in IndexedDB is enabled by default.

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

