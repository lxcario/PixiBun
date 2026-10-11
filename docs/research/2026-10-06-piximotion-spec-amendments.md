# PixiMotion specification amendments — 6 October 2026

Maintenance update — 11 October 2026: see the [11 October validation handoff](2026-10-11-validation-handoff.md) for the current engineering milestone. Earlier measurements, failures and decisions below retain their original revision and scope.

The user authorized improving the local master specification with real academic sources and requested an assessment of its fit and feasibility for PixiBun. This record concerns documentation changes, not implementation, benchmark execution, publication or deployment.

## Changed artifact and scope

Updated `PIXIMOTION_ENGINE_MASTER_SPEC.md` in place. It remains an ignored local proposal, as its opening notice states. The earlier [amendment review](2026-10-06-piximotion-amendment-review.md) retains its original input fingerprint and at-review statement that the master had not yet changed; this is the subsequent authorized edit.

- Before SHA-256: `B19443F65CD93765B88753437FD63B3DB4C1BFDD0E14781BE8796E7D37BC307C`.
- After SHA-256: `6E1B38BFEA32736AEB337CD5600FD155B68C28471638BECBE1B6F45507A096C6`.
- Checkout base: `dcf9f5c303cdbaa6a533e3315de947c261c1e3ac`.

All 82 top-level numbered sections (0–81) remain in sequence. The implementation roadmap now uses end-to-end Slices 0–6 instead of the former 24 horizontal phases. No application code, package dependency, storage version or production behavior changed.

## Substantive changes

| Spec sections | Amendment |
| --- | --- |
| 0–2 | Narrow first-release value, explicit PixiBun fit/reuse matrix and separation of academic evidence from design/experiments |
| 3, 16, 80 | Component-specific provenance review; replace the Aseprite implementation pointer with its license boundary; distinguish the existing RotSprite-inspired baseline |
| 6, 12 | Layer/mask-to-region admission, persistent identities, alpha-mode boundaries, hidden plates and artist-authored view variants |
| 9–10 | Interior versus parent-relative IK angles, singular/invalid/unreachable targets and explicit infeasible-contact policy |
| 16–19 | Strict final-pixel scope, protected feature/outline ownership, experimental optimizer status and temporal access-order semantics |
| 25, 29–35 | Academic basis for counter-based streams, coupled-channel limits, one initial secondary solver, bounded loop convergence and controlled canonical numerics |
| 37, 48 | Feasible fracture-count requests and recognition evidence/data permissions without automatic correction collection |
| 59–61 | Small parameter history plus legitimate raster undo, live motion persistence, compatible recovery, bake/timing integration and source/normal/lighting composition |
| 63–72 | Explicit provisional workload budgets and admission ceilings; fidelity/lag/feature metrics; canonical raw-frame bytes and versioned platform/access-order checks |
| 75–79 | Complete editable first slice, capability-specific exits, first-release versus full-engine acceptance and research qualification boundaries |

## Academic sources and exact support

Primary academic references are attached to their supported claims, with proposals retaining `[P]` and unproven optimizer choices retaining `[E]`.

- Kuo, Yang & Chu, *Feature-Aware Pixel Art Animation*, Computer Graphics Forum 35(7), 411–420 (2016), DOI [10.1111/cgf.13038](https://doi.org/10.1111/cgf.13038). The [authors' project](https://cgv.cs.nthu.edu.tw/projects/Recreational_Graphics/PixelLineAnim) describes feature-line optimization for spatial/temporal quality; the [institutional record](https://researchportal.bath.ac.uk/en/publications/feature-aware-pixel-art-animation/) confirms publication identity. This supports feature-aware temporal research, not the exact proposed PixiMotion solver. Manuscript downloads were unavailable in the earlier review, so no full-text optimizer verification is claimed.
- Salmon, Moraes, Dror & Shaw, *Parallel Random Numbers: As Easy as 1, 2, 3*, SC 2011. The [author-hosted paper](https://www.thesalmons.org/john/random123/papers/random123sc11.pdf) describes keyed counter-based streams. A different compact PixiMotion hash still requires its own distribution and reproducibility checks.
- Hauser, *Robotic Systems*, [Inverse Kinematics](https://motion.cs.illinois.edu/RoboticSystems/InverseKinematics.html). Primary university-hosted search extraction provided the planar 2R derivation and bend alternatives; a full-page open exceeded the browser tool's content-size limit. Source admission, singular-direction retention and constraint priorities are PixiMotion policies.
- Macklin, Müller & Chentanez, *XPBD*, Motion in Games (2016), DOI [10.1145/2994258.2994272](https://doi.org/10.1145/2994258.2994272), confirmed in the [author-hosted paper](https://matthias-research.github.io/pages/publications/XPBD.pdf). Supports compliant constraints/stiffness treatment, not universal collision or performance guarantees.
- [BBW](https://igl.ethz.ch/projects/bbw/), [ARAP](https://igl.ethz.ch/projects/ARAP/), [APES](https://zhan-xu.github.io/parts/), [Pinocchio](https://dspace.mit.edu/entities/publication/02216671-1424-4552-a2d3-74cec29e2062) and [Shewchuk's bibliography](https://www.cs.cmu.edu/~quake/papers.html) supply established deformation, part extraction, skeleton fitting and robust geometry references. They do not qualify tiny-pixel temporal quality or confer implementation/dataset rights automatically.

The 2026 SpriteToMesh preprint remains explicitly a preprint and its failed vertex-heatmap experiment is scoped to the tested setup. Standards, license terms and official product workflows are identified separately from academic sources. Existing bibliography entries not individually rechecked retain the verification limits recorded in the earlier review; this amendment does not certify every citation.

## Fit and feasibility assessment

**Fit:** good as a local authoring subsystem whose baked output becomes ordinary PixiBun cels. Existing drawing, layers, exposures, exports, history, autosave, worker infrastructure and normals supply integration foundations. They do not already provide live rig tracks or persistent cross-frame part identity.

**Buildability:** an editable rigid-part workflow, IK, keying and simple secondary motion are credible engineering targets. Their development is substantial but does not require hosted generation or a new external animation runtime. A pure numerical core plus a bounded PixiBun adapter limits direct coupling to store/DOM raster ownership.

**Expected quality:** supported assets can benefit from faster setup and retakes, but no implementation or artist benchmark establishes the eventual quality yet. Continuous rotation/deformation of 16×16 features, disocclusion, new directions and extreme stylization remain the largest uncertainties. Explicit authored angle/pose variants and final-pixel repair provide useful fallback workflows; broad automatic rigging/cloth must qualify separately.

## Verification

- Explicit master-spec structural/link check: **82 numbered sections in order; 13 local Markdown destinations; zero errors**. The generic documentation inventory excludes this ignored proposal, so it was checked explicitly.
- Repository `npm run verify:docs`: passed after the evidence/map additions, checking 2,145 local destinations across 160 owned Markdown files plus selected source/inventory contracts. The earlier pre-map run also passed.
- `git diff --check`: passed. The master after-edit SHA-256 was rechecked against the recorded value.
- Source/hash and reference-scope review performed; documentation checks do not verify academic interpretations automatically.
- No build, application regression suite, browser motion test, performance benchmark or artist study was run because application behavior did not change.

The documentation checker ran under the available Node 26.5.1 environment; this is not qualification of the project's supported Node 22 application/build runtime.
