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
- **Zero-PII Payload Invariant:** Transmits strictly machine-level telemetry (timestamp, user-agent, error stack trace, performance metrics). No canvas pixel buffers, artwork, project names, or user data are ever serialized.
- **Strict Rate Limiting:** Hard-capped at 12 requests per minute per IP via an in-memory token bucket to prevent abuse and spamming (`route.ts:7-14`).
- **Payload Ceiling Guard:** Enforces a maximum request body size of 64 KB and a maximum of 100 diagnostic events per batch, rejecting oversized requests with HTTP 413.
- **Transport Security:** Enforces secure HTTPS in production environments.
- **Opt-In Transmission:** Diagnostic relay dispatch is strictly opt-in and never runs automatically without user interaction.

## 4. Reporting a Vulnerability
If you discover a security vulnerability or secret exposure in this project, please open a private GitHub Security Advisory or report it directly to the maintainers.
