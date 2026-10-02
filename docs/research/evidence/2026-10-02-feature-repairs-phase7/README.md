# Phase 7 local verification evidence

Started 2 October and completed locally on 3 October 2026, Europe/Istanbul. Logs use UTC. This record closes local regression; it does not approve production release.

[Execution report](../../2026-10-02-feature-repairs-phase7.md), [candidate assessment](../../../releases/2026-10-02-local-candidate-assessment.md) and [commands, identities and limits](run.json) give the interpretation.

The patched gate passed 1,575 tests /159 suites. The unchanged full Chromium editor rerun passed 183 cases; the complete compiled suite passed 84 cases across Chromium/Firefox/WebKit. The initial patched editor navigation failure is preserved in [its trace](theme-navigation-failure/trace.zip), context and parsed trace log. Its cause remains unresolved; no timeout was increased.

Four actual ZIP downloads and their original source summaries are retained under downloads. The independent Python CRC/byte oracle is retained as text. All copied download hashes match their original test artifacts. Scripts and reader bundles are saved as text to avoid entering application compilation. Exact source/build identities, advisory outputs, compatibility diagnostic, public observations and cleanup/integrity results remain separate files.

The negative September-reader diagnostic uses exact historical modules with current dependencies; it is not a full old build or qualified rollback. Initial restricted HTTP failures and npm's non-fatal retired-DLL cleanup warning remain recorded. The initial esbuild helper-resolution failure was observed in tool output; its empty stdout log is not a raw error transcript.

The final documentation check verifies links, inventory and selected contracts; it does not certify all prose. After final checks, manifest.json seals the files by SHA-256. Earlier sealed evidence and tracked screenshots remain unchanged.
