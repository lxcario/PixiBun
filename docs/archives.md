# Local archive policy and catalog

Completed audits and raw verification output are retained locally. Operating guides, architecture, active plans, release records, source, tests and useful handbook images remain in Git.

## Preservation receipt

Original source revision: `210df955fd25c840ab52d92c2e9bcc95ed050f0e`. The cleanup preserves **7,838 original files**, including backups of every previously tracked Markdown page. It removes **7,786 files /611.05 MB** from current Git tracking, including **243 Markdown files**. Original working copies remain at their previous paths and are ignored; the second verified copy mirrors those paths under `artifacts/local-repository-archive-2026-10-11/`.

The local `manifest.json` records each original path, Git blob, byte length, SHA-256 and disposition. All original worktree files matched their source Git blobs before copying; every copy matched its original SHA-256. Manifest SHA-256:

`ad36189aae62ad9d3ce97064c298fec6f8b28d44f92c4a3a032ddb871108f111`

This is a local retention receipt, not proof of an off-machine backup. New checkouts do not contain the archive. Request the relevant original from the maintainer when needed; keep a separate verified backup if machine loss must be survivable.

## Raw evidence

Original traces, images, logs, run manifests, failed diagnostics and final qualifying browser/rollback payloads are preserved byte for byte. No failure is rewritten as a pass. The collection paths below are relative to `docs/research/evidence/` inside the local archive.

| Collection | Files | MB |
| --- | ---: | ---: |
| `2026-09-30` | 104 | 1.39 |
| `2026-10-01` | 144 | 3.29 |
| `2026-10-02` | 34 | 1.39 |
| `2026-10-02-feature-repairs-phase2` | 20 | 0.33 |
| `2026-10-02-feature-repairs-phase3` | 17 | 0.29 |
| `2026-10-02-feature-repairs-phase4` | 49 | 2.65 |
| `2026-10-02-feature-repairs-phase5` | 67 | 28.00 |
| `2026-10-02-feature-repairs-phase6` | 71 | 11.55 |
| `2026-10-02-feature-repairs-phase7` | 87 | 1.34 |
| `2026-10-02-remediation` | 13 | 0.20 |
| `2026-10-03-ci-export-dialog-repair` | 27 | 0.75 |
| `2026-10-03-ci-iso-workflow-repair` | 12 | 2.80 |
| `2026-10-03-codraw-phase1` | 5 | 0.01 |
| `2026-10-03-deployment-phase2` | 11 | 0.11 |
| `2026-10-03-input-phase3` | 19 | 0.32 |
| `2026-10-03-protocol-phase4` | 9 | 0.23 |
| `2026-10-03-remaining-audit-phases5-7` | 54 | 8.56 |
| `2026-10-03-session-documentation-review` | 10 | 0.07 |
| `2026-10-03-testsprite-challenge` | 35 | 0.25 |
| `2026-10-03-testsprite-full-run` | 78 | 0.44 |
| `2026-10-05-audit-hardening` | 2,546 | 161.60 |
| `2026-10-05-audit-phase1` | 10 | 3.01 |
| `2026-10-05-audit-phase2` | 14 | 1.19 |
| `2026-10-05-audit-phase3` | 23 | 2.80 |
| `2026-10-05-audit-phase4` | 46 | 15.20 |
| `2026-10-05-audit-phase5` | 29 | 2.59 |
| `2026-10-05-deep-audit` | 14 | 0.35 |
| `2026-10-06-piximotion-foundations` | 27 | 0.28 |
| `2026-10-06-piximotion-readiness` | 10 | 0.09 |
| `2026-10-07-editing-quality-release` | 83 | 2.97 |
| `2026-10-07-markdown-codebase-reconciliation` | 12 | 0.47 |
| `2026-10-07-piximotion-cross-phase-hardening` | 41 | 20.72 |
| `2026-10-07-piximotion-phase4` | 51 | 36.17 |
| `2026-10-07-piximotion-phase5` | 39 | 0.24 |
| `2026-10-08-motion-bounds-hardening` | 52 | 0.82 |
| `2026-10-08-motion-layout-followup` | 659 | 116.43 |
| `2026-10-08-publication-typecheck-boundary` | 8 | 0.01 |
| `2026-10-08-session-review-publication` | 2,818 | 160.42 |
| `2026-10-09-import-artwork-safety` | 1 | 0.00 |
| `2026-10-09-validation-repeatability` | 1 | 0.01 |
| `2026-10-11-validation-handoff` | 329 | 17.61 |
| `ux-qa` | 25 | 2.57 |

The original 11 October handoff preserves all 279 final CI browser files and their custody indexes. Final candidate/source/build scope is summarized in [current status](current-status.md). Only the small historical [CI transfer witness](verification/README.md) remains tracked; routine CI artifacts and source/build capsules retain their distinct scope and expiry.

## Historical reports

These originals are local files at the listed paths, mirrored beneath the archive root. Links from maintained pages identify the corresponding catalog entry; they do not embed or ship the report.

| Original path | Local disposition |
| --- | --- |
| <a id="record-logs-md"></a>`LOGS.md` | Preserved; untracked |
| <a id="record-pixibun-audit-results-deep-md"></a>`PIXIBUN_AUDIT_RESULTS+DEEP.md` | Preserved; untracked |
| <a id="record-pixibun-audit-results-md"></a>`PIXIBUN_AUDIT_RESULTS.md` | Preserved; untracked |
| <a id="record-pixibun-deep-dive-md"></a>`PIXIBUN_DEEP_DIVE.md` | Preserved; untracked |
| <a id="record-pixibun-ux-audit-md"></a>`PIXIBUN_UX_AUDIT.md` | Preserved; untracked |
| <a id="record-pixibun-ux-changelog-md"></a>`PIXIBUN_UX_CHANGELOG.md` | Preserved; untracked |
| <a id="record-pixibun-ux-implementation-plan-md"></a>`PIXIBUN_UX_IMPLEMENTATION_PLAN.md` | Preserved; untracked |
| <a id="record-docs-plans-2026-10-02-feature-repairs-md"></a>`docs/plans/2026-10-02-feature-repairs.md` | Preserved; untracked |
| <a id="record-docs-plans-2026-10-07-editing-quality-and-release-md"></a>`docs/plans/2026-10-07-editing-quality-and-release.md` | Preserved; untracked |
| <a id="record-docs-plans-audit-remediation-2026-09-26-md"></a>`docs/plans/audit-remediation-2026-09-26.md` | Preserved; untracked |
| <a id="record-docs-plans-audit-remediation-plan-md"></a>`docs/plans/audit_remediation_plan.md` | Preserved; untracked |
| <a id="record-docs-plans-audit-remediation-walkthrough-md"></a>`docs/plans/audit_remediation_walkthrough.md` | Preserved; untracked |
| <a id="record-docs-plans-implementation-plan-md"></a>`docs/plans/implementation_plan.md` | Preserved; untracked |
| <a id="record-docs-plans-implementation-plan-v2-md"></a>`docs/plans/implementation_plan_v2.md` | Preserved; untracked |
| <a id="record-docs-releases-2026-10-02-local-candidate-assessment-md"></a>`docs/releases/2026-10-02-local-candidate-assessment.md` | Preserved; untracked |
| <a id="record-docs-research-2026-09-30-codebase-and-pixel-art-audit-md"></a>`docs/research/2026-09-30-codebase-and-pixel-art-audit.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-02-audit-remediation-md"></a>`docs/research/2026-10-02-audit-remediation.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-02-documentation-codebase-audit-md"></a>`docs/research/2026-10-02-documentation-codebase-audit.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-02-documentation-followup-md"></a>`docs/research/2026-10-02-documentation-followup.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-02-feature-handbook-md"></a>`docs/research/2026-10-02-feature-handbook.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-02-feature-repairs-phase1-md"></a>`docs/research/2026-10-02-feature-repairs-phase1.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-02-feature-repairs-phase2-md"></a>`docs/research/2026-10-02-feature-repairs-phase2.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-02-feature-repairs-phase3-md"></a>`docs/research/2026-10-02-feature-repairs-phase3.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-02-feature-repairs-phase4-md"></a>`docs/research/2026-10-02-feature-repairs-phase4.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-02-feature-repairs-phase5-md"></a>`docs/research/2026-10-02-feature-repairs-phase5.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-02-feature-repairs-phase6-md"></a>`docs/research/2026-10-02-feature-repairs-phase6.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-02-feature-repairs-phase7-md"></a>`docs/research/2026-10-02-feature-repairs-phase7.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-03-audit-session-publication-md"></a>`docs/research/2026-10-03-audit-session-publication.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-03-ci-export-dialog-repair-md"></a>`docs/research/2026-10-03-ci-export-dialog-repair.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-03-ci-iso-workflow-repair-md"></a>`docs/research/2026-10-03-ci-iso-workflow-repair.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-03-codraw-phase1-md"></a>`docs/research/2026-10-03-codraw-phase1.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-03-deployment-phase2-md"></a>`docs/research/2026-10-03-deployment-phase2.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-03-input-phase3-md"></a>`docs/research/2026-10-03-input-phase3.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-03-protocol-phase4-md"></a>`docs/research/2026-10-03-protocol-phase4.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-03-remaining-audit-phases5-7-md"></a>`docs/research/2026-10-03-remaining-audit-phases5-7.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-03-session-documentation-review-md"></a>`docs/research/2026-10-03-session-documentation-review.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-03-testsprite-challenge-md"></a>`docs/research/2026-10-03-testsprite-challenge.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-03-testsprite-full-run-md"></a>`docs/research/2026-10-03-testsprite-full-run.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-04-artist-workspace-feedback-md"></a>`docs/research/2026-10-04-artist-workspace-feedback.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-04-artist-workspace-verification-md"></a>`docs/research/2026-10-04-artist-workspace-verification.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-05-audit-hardening-md"></a>`docs/research/2026-10-05-audit-hardening.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-05-audit-phase1-md"></a>`docs/research/2026-10-05-audit-phase1.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-05-audit-phase2-md"></a>`docs/research/2026-10-05-audit-phase2.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-05-audit-phase3-md"></a>`docs/research/2026-10-05-audit-phase3.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-05-audit-phase4-md"></a>`docs/research/2026-10-05-audit-phase4.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-05-audit-phase5-md"></a>`docs/research/2026-10-05-audit-phase5.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-05-audit-publication-md"></a>`docs/research/2026-10-05-audit-publication.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-05-deep-product-code-audit-md"></a>`docs/research/2026-10-05-deep-product-code-audit.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-06-pixibun-piximotion-readiness-md"></a>`docs/research/2026-10-06-pixibun-piximotion-readiness.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-06-piximotion-amendment-review-md"></a>`docs/research/2026-10-06-piximotion-amendment-review.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-06-piximotion-foundation-phase1-md"></a>`docs/research/2026-10-06-piximotion-foundation-phase1.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-06-piximotion-foundation-phases2-3-md"></a>`docs/research/2026-10-06-piximotion-foundation-phases2-3.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-06-piximotion-spec-amendments-md"></a>`docs/research/2026-10-06-piximotion-spec-amendments.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-07-editing-quality-release-hardening-md"></a>`docs/research/2026-10-07-editing-quality-release-hardening.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-07-markdown-codebase-reconciliation-md"></a>`docs/research/2026-10-07-markdown-codebase-reconciliation.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-07-piximotion-cross-phase-hardening-md"></a>`docs/research/2026-10-07-piximotion-cross-phase-hardening.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-07-piximotion-foundation-phase4-md"></a>`docs/research/2026-10-07-piximotion-foundation-phase4.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-07-piximotion-foundation-phase5-md"></a>`docs/research/2026-10-07-piximotion-foundation-phase5.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-08-motion-bounds-hardening-md"></a>`docs/research/2026-10-08-motion-bounds-hardening.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-08-motion-layout-followup-md"></a>`docs/research/2026-10-08-motion-layout-followup.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-08-publication-typecheck-boundary-md"></a>`docs/research/2026-10-08-publication-typecheck-boundary.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-08-session-review-publication-md"></a>`docs/research/2026-10-08-session-review-publication.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-09-import-artwork-safety-md"></a>`docs/research/2026-10-09-import-artwork-safety.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-09-l09-recovery-followup-md"></a>`docs/research/2026-10-09-l09-recovery-followup.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-09-l09-remote-verdict-md"></a>`docs/research/2026-10-09-l09-remote-verdict.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-09-validation-repeatability-md"></a>`docs/research/2026-10-09-validation-repeatability.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-10-resource-cache-recovery-md"></a>`docs/research/2026-10-10-resource-cache-recovery.md` | Preserved; untracked |
| <a id="record-docs-research-2026-10-11-validation-handoff-md"></a>`docs/research/2026-10-11-validation-handoff.md` | Preserved; untracked |
| <a id="record-docs-research-phase6-ux-hardening-md"></a>`docs/research/PHASE6_UX_HARDENING.md` | Preserved; untracked |
| <a id="record-docs-research-pixibun-ux-hardening-audit-md"></a>`docs/research/PIXIBUN_UX_HARDENING_AUDIT.md` | Preserved; untracked |
| <a id="record-docs-research-pixibun-ux-hardening-report-md"></a>`docs/research/PIXIBUN_UX_HARDENING_REPORT.md` | Preserved; untracked |
| <a id="record-docs-research-pixibun-ux-visual-qa-md"></a>`docs/research/PIXIBUN_UX_VISUAL_QA.md` | Preserved; untracked |
| <a id="record-docs-research-gif-8x-corruption-2026-10-01-md"></a>`docs/research/gif-8x-corruption-2026-10-01.md` | Preserved; untracked |
| <a id="record-docs-research-legacy-audit-registry-md"></a>`docs/research/legacy-audit-registry.md` | Preserved; untracked |
| <a id="record-docs-research-markdown-maintenance-map-md"></a>`docs/research/markdown-maintenance-map.md` | Preserved; untracked |
| <a id="record-docs-research-palette-creator-2026-10-01-md"></a>`docs/research/palette-creator-2026-10-01.md` | Preserved; untracked |
| <a id="record-docs-research-palette-cycle-export-2026-10-01-md"></a>`docs/research/palette-cycle-export-2026-10-01.md` | Preserved; untracked |
| <a id="record-docs-research-palette-cycle-scope-2026-10-01-md"></a>`docs/research/palette-cycle-scope-2026-10-01.md` | Preserved; untracked |
| <a id="record-docs-research-phase-implementation-status-md"></a>`docs/research/phase-implementation-status.md` | Preserved; untracked |
| <a id="record-docs-research-session-completion-2026-10-01-md"></a>`docs/research/session-completion-2026-10-01.md` | Preserved; untracked |
| <a id="record-docs-research-session-ui-ux-2026-10-01-md"></a>`docs/research/session-ui-ux-2026-10-01.md` | Preserved; untracked |
| <a id="record-docs-research-specular-glint-2026-10-01-md"></a>`docs/research/specular-glint-2026-10-01.md` | Preserved; untracked |

## Future retention and source budget

Store routine output in ignored `artifacts/`, `test-results/` or `audit/`. The capture helper writes only to ignored `artifacts/evidence-archive/<new-run-id>` and refuses replacing originals. Keep concise current results in maintained docs, and preserve detailed run records locally with explicit revision/build/verdict and hash manifests. Update the ignore policy when adding local report names; do not force-add an archive.

The documentation gate rejects raw archive roots and the retired root audit files, and limits publishable source content to **40 MiB**. Review intentional product/documentation assets before changing that budget. This budget measures file content, not Git pack size or installed dependencies.

## Earlier Git history

This normal cleanup commit shrinks the latest source ZIP and checkout. Earlier commits still contain their original evidence; full-history clones can remain large. The README uses a shallow clone for a small initial download. History removal requires a separately approved coordinated rewrite and durable evidence retention. No history rewrite or force-push is part of this cleanup.
