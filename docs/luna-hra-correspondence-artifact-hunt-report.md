# Luna Brain HRA Correspondence-Artifact Hunt

**Status:** **AUTHORITATIVE CORRESPONDENCE ARTIFACT NOT FOUND**

**Registration status:** **NOT ESTABLISHED**

**Outcome:** External blocker; no transform, pipeline, mapping table, overlay, coordinate query, or capability gate was added.

## 1. Exact Luna asset

| Field | Value |
|---|---|
| Repository path | `client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb` |
| HRA filename | `Allen_F_Brain.glb` |
| Byte size | 11,977,884 bytes |
| SHA-256 | `c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc` |
| HRA release | Brain-Female v1.1 |
| HRA record | `HBM724.XTTN.487`, DOI `10.48539/HBM724.XTTN.487` |
| HRA asset URL | <https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/assets/Allen_F_Brain.glb> |
| Graph URL | <https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json> |
| Licence | CC BY 4.0 |
| Historical companion | `VH_Female/V1.1/Allen_F_Brain.fbx`, SHA-256 `b6d8d388c41f9296905f7da72454579b5bbf636a653a0b3f2021bf8ab4911ae9` |

## 2. Provenance trace

The authoritative HRA record states that the Brain-Female reference object was created using Allen Human Reference Atlas – 3D, 2020 data, with 141 structures mirrored to produce a whole brain and resized to fit Visible Human bodies. The v1.1 graph identifies the GLB and provides published local/raw-object → HRA Brain-Female and Brain-Female → HRA CCF body placements. The graph supplies HRA spatial-entity dimensions, UBERON associations, scene placement parameters and provenance, but no source-volume, source-surface, mesh-generation, conversion, transform, checksum, or landmark-validation relation. [1] [2]

The official Allen 2020 release directory contains `annotation.nii.gz`, `annotation_full.nii.gz`, examples and README files. It contains no `Allen_F_Brain` GLB/FBX, source mesh, mesh-generation script, NIfTI-to-surface mapping, transform, or landmark package. [3]

## 3. Candidate-artifact assessment

| Candidate | Identity / version | What it proves | Missing requirements | Verdict |
|---|---|---|---|---|
| HRA v1.1 graph | Brain-Female v1.1 | Exact published GLB file URL and HRA placements | GLB checksum in graph; source target; source axes/origin/handedness; source volume; mesh-generation pipeline; validation | Not a correspondence artifact |
| HRA raw directory | `Allen_F_Brain.glb`, `crosswalk.csv`, `metadata.yaml` | Published model and HRA/UBERON crosswalk context | Allen graph-16 labels, source volume, transform, vertices/voxels, validation | Not a correspondence artifact |
| Historical HRA FBX | v1.1 companion FBX | Companion Maya-exported geometry and HRA attributes | Source scientific frame, volume mapping, conversion workflow, transform, validation | Not a correspondence artifact |
| Allen 2020 annotation package | `annotation.nii.gz`, `annotation_full.nii.gz` | Official 0.5 mm annotation volume in ICBM 2009b Symmetric context | Exact GLB relationship, mesh generation, GLB checksum, transform and held-out validation | Not a correspondence artifact |
| BigBrain / EBRAINS / Julich | Provider-specific datasets and reference resources | Their own reference spaces and transforms | Any documented mapping from this HRA GLB | Not applicable to Luna GLB |

## 4. Source and target coordinate status

The source GLB’s HRA placements have millimetre translation/rotation parameters into HRA reference-object context. They do not declare the raw GLB’s scientific coordinate origin, anatomical axes, handedness or orientation in the sense required for a neuroimaging transform. The Allen annotation volume has a documented image frame, but there is no authoritative bridge between those frames.

Therefore neither a raw GLB → Allen/ICBM 2009b transform nor an Allen/ICBM 2009b → EBRAINS 2009c/Julich/BigBrain chain can start. MNI/ICBM 2009b and 2009c are distinct and must not be substituted for one another.

## 5. Transform and validation results

| Requirement | Result |
|---|---|
| Transform artifact / hash | Not found |
| Exact source-to-target correspondence | Not found |
| Reproducible model-generation workflow | Not found |
| Landmark training set | Not found |
| Independent validation landmarks | Not found |
| Mean / median / RMS / maximum error | Not computable |
| Surface error / Hausdorff / overlap | Not computable |
| Orientation, handedness, unit and origin validation | Not possible for an external target |
| Structure-level provider map | Spatially unmapped; names/ontology links alone are insufficient |

No algorithmic registration was attempted. A new rigid/affine/nonlinear solution would begin from undocumented source geometry and arbitrary correspondence; it would not meet the requested reproducibility or independent-validation requirement.

## 6. Current scale and nanobot status

| Area | Status |
|---|---|
| Macro | Current HRA visual model and HRA reference-object placement continue normally |
| Tissue / Julich | Provider metadata context only; no Luna coordinate query or target |
| BigBrain | Metadata context only; no Luna coordinate query or target |
| Cellular | Metadata-only unless a separately spatially registered dataset and validated chain exist |
| Molecular | Metadata-only unless a separately spatially registered dataset and validated chain exist |
| Subcellular | Unavailable |
| Nanobots | Macro simulation only; lower-scale operations disabled |

## 7. Exact blocker and action package

**Missing artifact:** A provider-authored, versioned, checksum-bound relationship between the exact `Allen_F_Brain.glb` (or a documented byte-identical predecessor) and a declared source surface/volume in a scientific coordinate frame.

**Maintaining organization:** HuBMAP Human Reference Atlas; the v1.1 record identifies creator Kristen Browne, project lead Katy Börner and reviewer Song-Lin Ding. [1]

**Official source/contact route:** HRA Brain-Female record, its DOI, and `infoccf@iu.edu` on the official HRA portal. [1] [4]

**Manual action required:** Send the prepared [`Luna_Brain_HRA_Spatial_Correspondence_Request.md`](./Luna_Brain_HRA_Spatial_Correspondence_Request.md) to that route. It requests exact source/target identities and checksums, coordinate conventions, generation workflow, transform/correspondence artefacts, independent validation and licence terms.

**Required response format:** Official repository/release/DOI/archive URL or bundle containing a model-production project, checksum manifest, source volume/surface identifier, transform/correspondence file and validation data. Large material should remain outside Git; only a small manifest or reproducibility script should be committed after licence review.

**No manual download is required now.** Generic MNI templates, full BigBrain data and unrelated large NIfTI archives do not resolve this provenance gap.

## 8. Files changed

This search adds documentation only. No model, coordinate transform, scientific query, UI, reference space, nanobot behavior, dependency or browser asset changed.

## References

[1]: https://purl.humanatlas.io/ref-organ/brain-female/v1.1 "HRA Brain-Female v1.1"
[2]: https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json "HRA Brain-Female v1.1 graph"
[3]: https://download.alleninstitute.org/informatics-archive/allen_human_reference_atlas_3d_2020/version_1/ "Allen Human Reference Atlas 3D 2020 release directory"
[4]: https://humanatlas.io/ "Human Reference Atlas"
