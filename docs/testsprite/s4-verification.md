# Season 4 verification

Live app: https://pixibun.vercel.app/

TestSprite 3.0 portal project: https://www.testsprite.com/dashboard-v3/o/resques-workspace-8da317b3/projects/ae8453ac-f859-4324-9ca2-5016e683bc6c/test-cases

Status on 16 October 2026: the portal project was created with product requirements and live exploration started. This workspace is connected to lxcario through the existing TestSprite GitHub App. A generated suite, active PR trigger and enforced merge gate must each be verified before being described as operational.

## Coverage requirements

- Drawing, erasing and Undo/Redo restore the expected pixels, not only button states.
- Locked layers refuse edits without changing artwork or consuming history.
- Frame content stays separate; save/reload preserves project identity, layers and holds.
- PNG exports decode with expected dimensions, transparency and artwork. GIF exports preserve distinct frames and timing.
- Editable backups and carts preserve artwork when reopened, where the runner supports the required file interaction.
- Lighting Cancel preserves artwork; Apply is undoable. Tool shortcuts inside text fields remain text.

Audit generated assertions and run-specific recordings. A filename, visible canvas or frame count does not establish exact artwork integrity. Record unsupported prerequisites as blocked or missing coverage. Native Playwright/unit evidence keeps its own revision and scope; it is not a portal verdict.

## Delivery evidence

Record each PR opening timestamp, head SHA, preview URL, TestSprite run ID and terminal outcome. For genuine failures retain the failed run, root cause, fixing commit and automatic rerun. Verify the latest-commit check actually prevents merge before claiming blocking protection.

The GitHub App needs a ready-deployment signal. Use this PR preview rather than an unrelated production revision. A local workflow alone does not prove an active deployment or trigger.

## Current limitations

The repo is private and must be publicly readable for submission. The latest main CI job was blocked before starting by GitHub account billing/spending limits; Vercel deployed independently. No passing application tests are inferred from this documentation change.

Official rules: https://www.testsprite.com/hackathon-s4

Integration setup: https://docs.testsprite.com/web-portal/integrations/github-integration
