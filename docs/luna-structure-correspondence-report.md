# Luna Evidence-Based Anatomical Structure Correspondence

## Decision and scope

Luna now supports **structure-level anatomical correspondence** without claiming a Luna visual-coordinate to MNI coordinate transform. The exact HRA Brain-Female GLB remains the presentation model. The selected Julich/MNI reference remains an independent scientific provider reference. A structure identity is displayed as scientific context only; it is not a provider-space point, visual alignment, spatial registration, or lower-scale mission coordinate.

## Inventory and correspondence results

| Measure | Result |
|---|---:|
| Exact visual GLB mesh-backed nodes inspected | 283 |
| Named GLB nodes | 286 |
| Exact HRA v1.1 graph-to-mesh UBERON correspondences | 102 |
| Mesh nodes explicitly retained as unmapped | 181 |
| Authoritative Julich region mappings | 0 |
| Allen provider mappings | 0 |
| BigBrain provider mappings | 0 |
| Cellular spatial mappings | 0 |
| Molecular spatial mappings | 0 |
| Luna visual-to-MNI registrations | 0 |

## Methodology

The visual inventory is derived directly from the GLB JSON node table, which identifies 283 mesh-backed source names. The crosswalk generator then performs an **exact equality join** between each mesh name and the official HRA Brain-Female v1.1 graph’s `object_reference.file_subpath`. When the graph record has `representation_of`, that declared UBERON identifier is retained. No display-name, mesh-name semantic, geometry, centre, axis, bounds, or visual-similarity matching is used.

This produces `EVIDENCE_BACKED` records only where the official graph explicitly names both the GLB subpath and UBERON representation. All other mesh nodes remain `UNMAPPED`; their identifiers are not guessed. The generated crosswalk also leaves all provider mappings empty pending their own authoritative evidence.

## Scientific provider boundary

The inspected siibra Julich catalog exposes provider-specific parcellation and regional identifiers in MNI ICBM 152 2009c, but the inspected metadata does not provide an authoritative UBERON-to-Julich region crosswalk. No automatic mapping has been made. The structure API therefore reports Julich as `unmapped` while retaining the selected MNI reference as provider-space scientific context.

> **Luna → MNI remains not established.** The HRA/UBERON mesh identity records do not create an MNI coordinate, a point mapping, or a mesh-to-volume registration.

## Released implementation

The generated `HRA_V11_STRUCTURE_CROSSWALK` contains the exact HRA evidence records, while `GET /api/brain-science/structure/:lunaStructureId` returns canonical identity, provider-mapping availability, reference context, registration status, spatial status, and limitations. The response intentionally carries no Luna or MNI coordinate.

The Inspector adds an **Anatomical identity** card. It shows the HRA/UBERON identity only where evidence exists; otherwise it shows `Unmapped — no identifier inferred from the mesh name`. The same card explicitly states that Luna-to-MNI is not established and that the identity is not a mission target.

The nanobot target contract distinguishes `visual-mesh-target`, `structure-context-target`, and `scientific-coordinate-target`. Macro targets retain their visual mesh behavior. Structure context remains non-operational. Lower-scale operations remain disabled unless independently supplied with a coordinate-resolved scientific target and all pre-existing gates.

## Validation and release

| Check | Result |
|---|---|
| Focused scientific provider/observation tests | Passed: 14 tests |
| Focused nanobot/provider tests after target classification | Passed: 14 tests |
| `pnpm exec vite build` | Passed; existing analytics-env and chunk-size warnings only |
| `pnpm build` | Passed; same non-fatal warnings only |
| `git diff --check` | Passed before each release commit |
| Full `pnpm test` | 197 passed, 2 skipped, 14 known unrelated environment/configuration failures |
| Production browser acceptance | Source release deployed `READY`; interactive Luna route was blocked in this browser/network session by Vercel route interception/blank navigation, so not claimed as passed |

The implementation was released in commits `90c7a5e`, `e7f8be2`, `e758355`, and `9b66abc`.

## Remaining limitations

The crosswalk is intentionally only as broad as the authoritative graph evidence. The 181 unmapped mesh nodes require a future authoritative graph record or curated source evidence. A provider-specific Julich mapping requires an explicit published crosswalk, ontology relation, or separately reviewed, documented correspondence; matching a Luna display name to a Julich label is prohibited. BigBrain, cellular, and molecular information remain provider/dataset-specific context and are not converted into Luna coordinates.

## Primary evidence

[1] [HRA Brain-Female v1.1 graph](https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json)

[2] [HRA Brain-Female v1.1 record](https://purl.humanatlas.io/ref-organ/brain-female/v1.1)

[3] [Julich-Brain cytoarchitectonic maps v3.1 — EBRAINS](https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777)

[4] [siibra API](https://siibra-api-stable.apps.hbp.eu/v3_0/redoc)
