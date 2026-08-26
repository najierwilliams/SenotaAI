# Luna Hybrid Scientific Architecture Report

## Architectural decision

Luna now follows a **hybrid scientific architecture**. The realistic HRA Brain-Female GLB remains the presentation model. Canonical identity, provider reference spaces, scientific data metadata, and scientific targets are separate layers. The release does not force the GLB into MNI space and does not create a Luna-to-MNI transform.

> **Structure context, provider-space probabilistic data, and validated coordinate transforms remain distinct evidence classes.**

## Current crosswalk inventory

| Metric | Result |
|---|---:|
| Exact selectable GLB mesh-backed structures inventoried | 283 |
| Exact HRA graph to UBERON identity records | 102 |
| FMA identities | 0; no FMA ID was declared in the source graph evidence |
| Explicitly unmapped structures | 181 |
| Authoritative Luna-to-Julich region mappings | 0 |
| Luna-to-MNI registrations | 0 |

The crosswalk is generated from an exact equality join between the visual GLB node name and the official HRA Brain-Female v1.1 graph `file_subpath`, then retains the graph’s `representation_of` UBERON identifier. No identity is generated from semantic name matching, visual similarity, mesh shape, bounds, viewer coordinates, or a generic transform.

## Evidence tiers and ScientificTarget

The shared contract now defines exactly three evidence tiers: `structure-context`, `region-probabilistic`, and `point-validated`. The evidence-backed HRA mesh identities produce only a structure-context `ScientificTarget`. Such targets have `coordinate: null`, `status: unavailable`, no registration method/error, and a limitation stating that structure identity is non-operational without a Luna-to-reference-space coordinate.

The nanobot contract distinguishes `visual-mesh-target`, `structure-context-target`, and `scientific-coordinate-target`. Macro visual targets retain their existing simulation behavior. Structure context can be displayed but cannot begin lower-scale operations. A scientific-coordinate target remains a separate future capability requiring independently documented point evidence, reference space, registration method, uncertainty, provenance, and licence review.

## Primary scientific spine

| Layer | Current status | Boundary |
|---|---|---|
| Julich-Brain v3.1 | Primary scientific atlas | Provider-hosted MNI ICBM 152 2009c nonlinear asymmetric probability/MPM context only |
| MNI reference | `ebrains-mni-icbm-152-2009c` | Does not describe Luna GLB, viewer, or HRA-local coordinates |
| BigBrain | Provider-scoped linked context | No BigBrain-to-Luna composition; licence review remains required |
| Allen Human Brain Atlas | Sample/donor-scoped molecular context | Donor MR/MNI coordinates belong to Allen samples, not Luna meshes |
| Cellular/subcellular | Unavailable for operations | Future resources must remain sample-scoped unless registered to a shared reference space |

The official EBRAINS record identifies Julich-Brain cytoarchitectonic maps v3.1, DOI `10.25493/KNSN-XB4`, CC BY-NC-SA 4.0, with MNI ICBM 152 2009c nonlinear asymmetric, Colin27, and fsaverage products. Luna requests lightweight provider metadata only and does not redistribute maps or meshes. [1]

## Structured provenance and licensing

The release adds `ScientificProvenanceRecord`, `ScientificLicenseRecord`, and `ScientificTarget` types. The server registry records HRA, Julich, BigBrain, and Allen provider sources, dataset versions where declared, reference-space scope, source URLs, retrieval date, evidence tier, licence IDs, and redistribution state. Julich is marked non-redistributed under CC BY-NC-SA 4.0. BigBrain and Allen are marked `review-required` until dataset-specific terms are confirmed for a contemplated use.

Read-only endpoints now expose `/api/brain-science/provenance` and `/api/brain-science/licenses`. The existing `/api/brain-science/structure/:lunaStructureId` now returns structured canonical identity, review state, structure-context ScientificTarget, evidence tier, provenance, licence, provider availability, and limitations. It returns no Luna coordinate and no name-derived Julich mapping.

## User review requirement

The required review package is available at `docs/luna-structure-crosswalk-review.md`. All 102 source-supported HRA/UBERON records are labelled **REQUIRES USER REVIEW**. The 181 records without an exact source correspondence are labelled **UNMAPPED**. Nothing in the application treats either group as spatially validated or as an operational coordinate mapping.

## UI and nanobot behavior

The Inspector adds an additive anatomical identity card with canonical UBERON identity where available, evidence tier, review state, Julich context, unavailable scientific target state, and the explicit statement that Luna-to-MNI is not established. The Nanobot Panel now displays the target kind and marks a structure-context target as scientific context only with mission targeting disabled. No viewer, Navigator hierarchy, workspace, panel controls, or Macro simulation behavior was redesigned.

## Validation and release

| Validation | Result |
|---|---|
| Focused hybrid structure service and Macro mission tests | 10 passed |
| Focused provider and observation tests | 14 passed |
| `pnpm exec vite build` | Passed; existing analytics environment and chunk-size warnings only |
| `pnpm build` | Passed; same non-fatal warnings only |
| `git diff --check` | Passed before commits |
| Full `pnpm test` | 200 passed, 2 skipped, 14 known unrelated environment/configuration failures |
| Browser acceptance | Deployment route had Vercel interception/blank navigation in the authenticated browser session; not claimed as passed |

This hybrid increment was released through commits `2f621e6`, `7c8d8c1`, `253f684`, `a1baa05`, and `91af647`.

## Remaining scientific blockers

A user or qualified reviewer must review the proposed identity table before any review state may be changed. A provider-specific Julich mapping requires an explicit authoritative crosswalk or reviewed ontology relation; display-name matching is prohibited. A Luna-to-MNI transform still requires the exact asset/source correspondence artifact, coordinate conventions, reproducible workflow, validation landmarks, residuals, and licence evidence previously requested from HRA maintainers. No large volumes, BigBrain data, or Allen archives are downloaded or bundled by this release.

## References

[1] [EBRAINS — Julich-Brain Atlas cytoarchitectonic maps v3.1](https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777)

[2] [HRA Brain-Female v1.1 graph](https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json)

[3] [Julich Brain Atlas](https://julich-brain-atlas.de/atlas)

[4] [Allen Human Brain Atlas API documentation](https://brain-map.org/support/documentation/human-brain-atlas-api)
