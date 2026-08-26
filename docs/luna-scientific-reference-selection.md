# Luna Scientific Reference Selection

**Decision:** **Option A — retain the current Luna/HRA GLB as the visual model and use Julich-Brain v3.1 in MNI ICBM 152 2009c Nonlinear Asymmetric as a separate scientific coordinate reference.** This decision does not register, replace, rescale, or otherwise alter the visual GLB.

## Selected scientific reference

| Property | Selected value |
|---|---|
| Scientific reference | Julich-Brain cytoarchitectonic maps v3.1 in MNI ICBM 152 2009c Nonlinear Asymmetric |
| Provider identity | `minds/core/referencespace/v1.0.0/dafcffc5-4826-4bf1-8ff6-46b8a31ff8e2` |
| Application identity | `ebrains-mni-icbm-152-2009c` |
| Structure source | Julich provider parcellation `minds/core/parcellationatlas/v1.0.0/94c1125b-b87e-45e4-901c-00daee7f2579-300` |
| Coordinate system | MNI stereotaxic XYZ in the named template |
| Units | Millimetres |
| Axes/origin | siibra provider metadata declares XYZ and origin values `[0,0,0]`; no handedness is inferred where it is not separately declared |
| Release and licence | Julich-Brain v3.1, DOI `10.25493/KNSN-XB4`, CC BY-NC-SA 4.0 |
| Asset disposition | Provider-hosted only; no volume, mesh, probability map, or BigBrain data is downloaded or redistributed |

The current HRA Brain-Female / `Allen_F_Brain.glb` remains the Luna visual layer. Its SHA-256 remains `c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc`, and its unavailability record for Luna-to-MNI registration is unchanged.

## Candidate evaluation

| Candidate | Result | Reason |
|---|---|---|
| Julich-Brain v3.1 + MNI ICBM 152 2009c | **Selected** | Official, versioned probabilistic maps in declared MNI 2009c, Colin27, and fsaverage spaces, with siibra support for region assignment and provider-linked multimodal context. |
| MNI ICBM 152 2009c template | Supporting template | The official 1 mm template is the exact volumetric frame distributed by Julich. It is not a Luna mesh correspondence. |
| fsaverage | Surface alternative | Provider-hosted mesh/surface representation, but a distinct surface space rather than an interchangeable MNI coordinate frame. |
| Colin27 | Alternative provider space | Distinct single-subject average, not the selected common Luna scientific frame. |
| BigBrain | Read-only linked context | Independent 20 µm histological space with separate transforms and CC BY-NC-SA terms; no Luna relationship and no bundled asset. |
| Allen/HRA current GLB | Visual only | No public checksum-bound mesh-to-volume correspondence, coordinate convention, transform, or independent landmark validation exists. |

## Implemented boundary

The manifest now includes a **ScientificReferenceAsset** registry record, and `GET /api/brain-science/scientific-reference` exposes the selected reference identity, provenance, licence, coordinate metadata, structure-source policy, and limitations. `GET /api/brain-science/julich-assignment?x=…&y=…&z=…&units=millimetres` sends only an explicit MNI 2009c coordinate to the documented siibra statistical point-assignment endpoint.

The endpoint rejects omitted, non-finite, non-millimetre, Luna viewer, or GLB coordinates before provider contact. Provider results remain provider-space data and are never converted into a Three.js point, visual highlight, or nanobot target. A provider failure returns unavailable without generating a region, probability, transform, or mapping.

## Capability and safety status

| Capability | Status |
|---|---|
| Luna visual model | Preserved, presentation-only |
| Provider-space Julich coordinate query | Available only for caller-supplied MNI 2009c millimetre coordinates; fail-closed on provider error |
| Julich probabilistic values | Preserved as provider response; not converted into binary Luna boundaries |
| Luna visual ↔ scientific coordinate conversion | **Unavailable** |
| Visual structure-name → provider region mapping | **Unavailable** unless separately evidence-backed |
| BigBrain relationship | Provider-scoped context only |
| Cellular and molecular spatial operation | **Unavailable** pending dataset-specific common-space evidence |
| Macro nanobot simulation | Unchanged |
| Lower-scale nanobot operations | Remain disabled |

## Validation

Focused scientific-provider and observation tests passed: **14 tests in 2 files**. `git diff --check` passed. No browser acceptance is claimed because this change adds registry/API evidence boundaries only and deliberately leaves the Luna visual presentation untouched.

## References

[1] [Julich-Brain Atlas](https://julich-brain-atlas.de/atlas)

[2] [Julich-Brain cytoarchitectonic maps v3.1 — EBRAINS](https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777)

[3] [ICBM 152 Nonlinear atlases (2009) — MNI](https://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/)

[4] [siibra API documentation](https://siibra-api-stable.apps.hbp.eu/v3_0/redoc)

[5] [siibra coordinate lookup and probabilistic assignment](https://siibra-explorer.readthedocs.io/en/latest/basics/looking_up_coordinates/)
