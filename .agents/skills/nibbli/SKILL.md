---
name: nibbli
description: Run or extend Nibbli's PixiBun Tester and bounded Artist workflows, plan drawings through its real UI controller, and inspect retained pixel/file evidence. Use for Nibbli tasks and agent-driven PixiBun drawing; ordinary application edits do not require this skill.
---

# Nibbli

Nibbli is PixiBun's atelier apprentice. Tester owns independent functional expectations; Artist proposes bounded plans and critiques. The shared controller uses real mouse/keyboard/UI actions. It never writes application state or raster buffers.

Read [agent operating guidance](../../../docs/guides/nibbli-agent.md) for Artist planning/critique envelopes, command boundaries, session inboxes and budgets. Read [Tester guidance](../../../docs/guides/nibbli.md) when running existing journeys. The [protocol](../../../scripts/nibbli/artist/protocol.ts) is authoritative for validation and adapter contracts.

Use the repository's Node 22 runtime. `npm run nibbli:artist -- --conversation` connects this conversation to a local plan/observation/critique loop; `--mock` tests orchestration without a provider. Read new request JSON, choose coordinates from the supplied goal, inspect actual screenshots/native RGBA, then reply using the matching request ID. Write a temporary sibling and rename it atomically. Do not execute model-supplied code or reuse earlier response IDs.

Keep tool correctness, goal planning and artistic opinion separate. Mock opinions do not establish artistic quality. Conversation support is not an independently running model service. No provider/model is selected automatically; future adapters need external configuration and bounded usage.

At most three corrections are allowed. The runner validates each whole plan before painting, and constrains actions, points, time, calls, tokens and reported cost. Failed input, tool and file checks stop the attempt. Inspect product/usage/adapter/expectation evidence before proposing a separate repair. Never weaken test assertions or rewrite failures to get a pass.

Read `outcome.json` before reporting success. Source/build changes make browser results inconclusive. Preserve every run and its original verdict locally in ignored `artifacts/nibbli`; never force-add raw evidence to Git. Candidate strategy memory does not train a model or grant reuse approval. Commit, merge, publication and paid provider use follow the user's explicit authorization, not this skill.
