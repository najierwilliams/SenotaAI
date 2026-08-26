# Luna Brain — Request for HRA Brain-Female Spatial-Correspondence Evidence

**To:** HuBMAP Human Reference Atlas 3D Reference Object / Brain-Female maintainers

**Official project contact route:** [HRA Brain-Female v1.1 record](https://purl.humanatlas.io/ref-organ/brain-female/v1.1) and [Human Reference Atlas contact](mailto:infoccf@iu.edu)

**Subject:** Request for versioned mesh-to-source-volume provenance for HRA v1.1 `Allen_F_Brain.glb`

Dear HRA Brain-Female / 3D Reference Object maintainers,

We are maintaining the Luna Brain application, which uses a repository-local, byte-identical copy of the HuBMAP Human Reference Atlas Brain-Female v1.1 GLB. We are seeking to determine whether a defensible, reproducible scientific registration can be established between this exact mesh and a declared source/reference coordinate frame. We will not infer a neuroimaging coordinate relationship from visual alignment, mesh bounds, anatomical labels, or HRA scene placement.

## Exact asset under investigation

| Field | Verified value |
|---|---|
| HRA object | 3D Reference Organ for Brain, Female, v1.1 |
| HRA data ID / DOI | `HBM724.XTTN.487` / `10.48539/HBM724.XTTN.487` |
| HRA object URL | <https://purl.humanatlas.io/ref-organ/brain-female/v1.1> |
| HRA graph | <https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json> |
| File name | `Allen_F_Brain.glb` |
| HRA file URL | <https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/assets/Allen_F_Brain.glb> |
| Luna repository path | `client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb` |
| Luna SHA-256 | `c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc` |
| Luna byte size | `11,977,884` bytes |
| Published related source attribution | Allen Human Reference Atlas – 3D, 2020; brain structures mirrored and resized for the HRA reference object |
| Published licence | CC BY 4.0 |

We have verified the HRA graph’s raw-object-to-Brain-Female placement and Brain-Female-to-HRA-CCF-body placement. We understand that these are HRA reference-object placements, **not** by themselves a transform to an Allen annotation volume, MNI/ICBM, BigBrain, EBRAINS, or Julich-Brain coordinate system.

## Requested evidence

Could you please provide, link, or confirm the existence/non-existence of the versioned production evidence required to relate this exact GLB—or a documented byte-identical predecessor—to its scientific source representation?

1. The exact source asset identifier, version, checksum and source format (`.ma`, `.mb`, `.fbx`, `.obj`, surface, NIfTI, segmentation, or another format).
2. The source coordinate convention, units, axes/orientation, handedness, origin, scale, and any affine/world matrix.
3. The exact source annotation, image volume, surface, or other target representation used for this Brain-Female model, including version, checksum, coordinate convention and licence.
4. The mesh-generation or surface-extraction workflow, including software and version, scripts/configuration, mirroring/resizing steps, and any pre/post-export coordinate conversions.
5. Any per-vertex/per-voxel correspondence, label-to-mesh mapping, source geometry, transform matrix, nonlinear deformation, registration file, or export manifest that applies to the exact GLB or documented predecessor.
6. Any anatomical-landmark package, independent validation landmarks, residual/error measurements, orientation/handedness tests, or published validation methodology.
7. The intended licence, required attribution, redistribution rights, derivative-work restrictions, computational-use restrictions, and any required data-use agreement for the above material.

## Accepted response formats

A direct link to an official repository, DOI deposit, release archive, model-production project, transform file, NIfTI/surface manifest, checksum manifest, or validation report would be sufficient. If no such artifact exists publicly, a written confirmation of its absence and the best maintainer/archive that retains the original model-production materials would also be valuable.

We do **not** need a generic MNI template, a BigBrain download, or a large image archive unless it is specifically identified as an input to the exact original GLB-generation or validated-registration workflow. We will keep any restricted or large source material outside Git and will preserve source licensing/attribution.

The requested evidence would let us reproduce and independently validate a spatial relationship rather than assert one from appearance. Until it is available, Luna will keep the GLB-to-external-reference registration as **not established**.

Thank you for your assistance.

Sincerely,

**Luna Brain / SenotaAI maintainers**
