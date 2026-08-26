# Luna → Julich Crosswalk Investigation

## Decision

**No authoritative HRA → Julich, UBERON → Julich, FMA → Julich, or Julich → UBERON/FMA crosswalk was found for the current Luna/HRA Brain-Female GLB.** The released `JULICH_STRUCTURE_MAPPINGS` registry therefore remains empty. This is the scientifically correct result: no Luna structure is presented as a Julich region merely because two names or anatomical descriptions appear related.

## Sources audited

| Source | Evidence examined | Result |
|---|---|---|
| EBRAINS Julich-Brain v3.1 record | Dataset identity, maps, reference spaces, licence | v3.1 is verified; maps are probability/MPM products in MNI ICBM 152 2009c nonlinear asymmetric, Colin27, and fsaverage. It does not publish an HRA/UBERON/FMA crosswalk. |
| siibra region documentation | Region identifiers and parent/child hierarchy | Julich region hierarchy and provider IDs are available, but examples are name/specification lookups—not ontology correspondence evidence. |
| siibra-api region serializer | Populated ontology field behavior | The serializer builds Julich/OpenMINDS region records with `ontology_identifier=None`. Its IDs are generated provider parcellation entity URIs, not UBERON/FMA IDs. |
| OpenMINDS SANDS schema | Potential ontology fields | The schema permits optional `ontologyIdentifier` and `relatedUBERONTerm` fields. Schema support is not evidence that Julich v3.1 records populate them. |
| Official HRA Brain-Female v1.1 graph | GLB subpath-to-ontology evidence | The graph supplies exact HRA entity → UBERON relations for 102 Luna mesh nodes, but no Julich region relation. |

## Julich hierarchy boundary

Julich v3.1 can provide a parent region and multiple cytoarchitectonic children. For example, a broad anatomical entity can be represented by a provider hierarchy of multiple cytoarchitectonic areas. This demonstrates why an apparent broad-anatomy match cannot be reduced to a single deterministic region. The hierarchy is a **provider-internal anatomical organization**, not an authoritative crosswalk from Luna/HRA/UBERON to a Julich record.

Any future association must be at least one of the following, with each record carrying its evidence and review state:

| Relationship type | Evidence needed | Current status |
|---|---|---|
| One-to-one | Published explicit canonical ontology ↔ Julich region relation | Not found |
| One-to-many | Published explicit relation from canonical entity to listed Julich regions | Not found |
| Many-to-one | Published aggregation/crosswalk | Not found |
| Probabilistic | Provider map/region relationship plus explicit canonical bridge and reference-space provenance | Not found |
| Unmapped | No defensible relation | Current state for all Luna structures |

## MNI coordinate query capability

The app permits only an explicit MNI ICBM 152 2009c nonlinear asymmetric coordinate expressed in millimetres to reach the public siibra Julich assignment adapter. Its request declares the provider reference space, parcellation ID, point, statistical assignment type, and zero sigma. Invalid/non-finite/non-millimetre inputs return unavailable. A provider response is not projected into Luna, and no Luna viewer, GLB, HRA-local, or body coordinate is accepted.

## Required artifact to move beyond `UNMAPPED`

A future mapping must include a versioned, citable, machine-readable or reviewer-verifiable record with all of the following:

1. The canonical source ontology and identifier (HRA/UBERON/FMA as applicable).
2. The exact Julich-Brain dataset and parcellation version, provider region identifier, and laterality/scope.
3. Relationship type and semantics, including one-to-many/probabilistic behavior when relevant.
4. Source URL/DOI, reference-space scope, provenance, licence/attribution, and review authority.
5. Explicit evidence that the relation is ontology/provider-backed rather than display-name similarity.

This artifact would establish a **structure-level provider correspondence** only. It would still not create a Luna → MNI transform, a Luna coordinate, or a coordinate-resolved nanobot target.

## References

[1] [EBRAINS — Julich-Brain Atlas, cytoarchitectonic maps v3.1](https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777)

[2] [siibra — Find brain regions in a parcellation](https://siibra-python.readthedocs.io/en/v1/examples/01_atlases_and_parcellations/003_find_regions.html)

[3] [siibra-api region serializer](https://raw.githubusercontent.com/FZJ-INM1-BDA/siibra-api/master/api/serialization/core/region.py)

[4] [OpenMINDS SANDS parcellation entity schema](https://raw.githubusercontent.com/FZJ-INM1-BDA/siibra-api/master/api/models/openminds/SANDS/v3/atlas/parcellationEntity.py)

[5] [HRA Brain-Female v1.1 graph](https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json)
