# Security Policy — PixiBun Atelier

## 1. Zero-Cloud & Local-First Philosophy
PixiBun Atelier is architected as an offline-first, client-side application:
- All canvas manipulation, photometric lighting calculations, and animation exports run 100% on the client device.
- Artwork and project data persist strictly in the browser's IndexedDB storage.
- No user accounts, credentials, or tracking telemetry are collected.

## 2. Secrets & Secret Hygiene
- PixiBun requires zero API keys or external authentication tokens for local or production use.
- **Never commit Personal Access Tokens (PATs) or API keys** to this repository. All environment keys should be configured via environment variables or secret managers (e.g. Vercel Project Settings) and never hardcoded in scripts or configuration files.
- If a token is ever accidentally exposed in development, immediately revoke and rotate it at [github.com/settings/tokens](https://github.com/settings/tokens).

## 3. Reporting a Vulnerability
If you discover a security vulnerability or secret exposure in this project, please open a private GitHub Security Advisory or report it directly to the maintainers.
