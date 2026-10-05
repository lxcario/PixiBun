# Initial fixture diagnostics

The first scoped run passed 47 of 48 tests. The gallery-duplication fixture passed a returned StoredProject record to `db.projects.get`, rather than its `.id`. This fixture was corrected; the next scoped run passed 74/74 across five suites.

Initial typechecking rejected eight Testing Library role queries using Playwright's `exact` option. Anchored Copy-name expressions replaced those unsupported options. No application change resulted from either diagnostic.

The initial compiled run passed three Chromium artwork regressions and failed the first creation-date backup scenario at the 60-second download wait. This fixture had omitted disabling native showSaveFilePicker to select the downloadable fallback. The run was then interrupted. Its recorded result is partial, not a completed thirty-case run. Corrected runs use the existing repository fixture pattern and unchanged timeout/retry settings.
