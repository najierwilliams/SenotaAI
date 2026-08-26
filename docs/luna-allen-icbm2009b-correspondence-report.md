# Luna/HRA GLB to Allen Human Reference Atlas 3D / ICBM 2009b Correspondence Investigation

**Author:** Manus AI  
**Date:** August 25, 2026  
**Scope:** Scientific provenance investigation only. This report does not derive, estimate, validate, or expose a Luna raw-GLB-to-ICBM transform.

> **Finding — LUNA → ICBM 2009b: UNAVAILABLE.** The official Allen Human Reference Atlas (AHRA) 3D annotation volume is verifiably expressed in the ICBM 2009b Nonlinear Symmetric reference frame, but no authoritative artifact establishes a coordinate correspondence from the exact checksum-pinned Luna/HRA `Allen_F_Brain.glb` mesh to that annotation volume. Names, structure counts, raw GLB bounds, scene presentation coordinates, visual alignment, and the existing HRA reference-object placements are not substitutes for this missing correspondence.

## ALLEN HRA PACKAGE

The authoritative source examined was the Allen Institute’s **Allen Human Reference Atlas – 3D**, 2020, version 1.0.0 directory. The package documents a 141-structure human-brain 3D parcellation drawn on the ICBM 2009b Nonlinear Symmetric template. [1] Its publicly listed annotation-volume filenames are `annotation.nii.gz` and `annotation_full.nii.gz`; the user-specified name `mni_annotation_full.nii.gz` is not a file published in that directory. [1]

| Development-only asset | Official filename or location | Investigation result | SHA-256, when retrieved |
|---|---|---|---|
| Original annotation | `annotation.nii.gz` | Retrieved temporarily and header/payload inspected | `be23763c15386f2f211105f1e8144a6887e7615571229090e209b1c78355d378` |
| Bilateral annotation | `annotation_full.nii.gz` | Retrieved temporarily and header/payload inspected | `2b05581e39c44f2623d9b0a69f64e3df0823c20d054abef92973812313335dc3` |
| Package documentation | `README.pdf`, `README.docx` | Retrieved temporarily and reviewed | Not retained as application content |
| Package examples and label material | `examples/`, label CSVs, voxel-count CSV | Retrieved temporarily and inspected | Not retained as application content |
| ICBM 2009b high-resolution T1 | External MNI archive, not an Allen package file | Not downloaded | N/A |

Only the two small annotation volumes and supporting small package files, approximately 3 MB of compressed annotation data, were retrieved to a temporary development location. No annotation volume, template, or derived asset was added to the repository, shipped to the browser, or used by the Luna viewer. The external 0.5 mm ICBM 2009b NIfTI distribution is separately published by MNI as a 348 MB archive. [2]

## ANNOTATION VOLUME

Both official annotation NIfTI files were inspected from their actual headers and payloads rather than inferred from documentation. They use a `qform` (`qform_code = 1`, `sform_code = 0`) in millimetres with the following affine matrix, where voxel indices increase in **RAS** orientation:

```text
[[0.5, 0,   0,  -98],
 [0,   0.5, 0, -134],
 [0,   0,   0.5, -72],
 [0,   0,   0,     1]]
```

| Verified property | `annotation.nii.gz` | `annotation_full.nii.gz` |
|---|---:|---:|
| Dimensions | 394 × 466 × 378 voxels | 394 × 466 × 378 voxels |
| Voxel spacing | 0.5 × 0.5 × 0.5 mm | 0.5 × 0.5 × 0.5 mm |
| World origin | (-98, -134, -72) mm | (-98, -134, -72) mm |
| Units | Millimetres | Millimetres |
| Affine source | qform | qform |
| Increasing-index orientation | RAS | RAS |
| Non-background label IDs | 141 | 141 |
| Nonzero voxels | 6,999,201 | 13,963,410 |

The official `flip_annotation.py` example explains the bilateral volume behavior. It starts from `annotation.nii.gz`, zeroes midline x-index 197, applies a left-right scale transform of `(-1, 1, 1)`, and combines original and mirrored labels with a maximum operation to write `annotation_full.nii.gz`. It may read the externally distributed `mni_icbm152_t1_tal_nlin_sym_09b_hires.nii` for display or reference but does not produce a mesh or establish a GLB transform. [1]

The official `convert_to_itksnap.py` example resolves annotation labels against Allen structure graph 16 and prepares ITK-SNAP segmentation-description material. It contains no surface extraction, marching-cubes pipeline, GLB/FBX export, mesh-to-voxel mapping, or coordinate-conversion implementation. [1]

## LUNA GLB

The local Luna Macro mesh remains byte-identical to the HRA v1.1 `Allen_F_Brain.glb` reference-object asset. The asset has SHA-256 checksum `c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc`, is glTF 2.0 generated with Babylon/Maya, and contains 286 nodes and 283 meshes. Of its mesh nodes, 282 are named `Allen_*`; the remaining mesh is `VH_F_optic_chiasm`.

The HRA v1.1 raw directory supplies this GLB, a `crosswalk.csv`, and `metadata.yaml`. The crosswalk gives HRA/UBERON-oriented semantic mappings; it does not provide Allen graph-16 numeric annotation IDs, an annotation-volume version or checksum, a NIfTI affine, a declared medical image orientation, a source-volume-to-mesh extraction recipe, or a vertex/voxel correspondence. The published HRA placements establish the raw GLB to HRA Brain-Female and HRA Brain-Female to HRA CCF body placements, but those HRA reference-object placements are a distinct provenance layer and not an Allen-volume or MNI registration. [3] [4]

The raw GLB accessor bounds were audited as file geometry only and are intentionally not used: minimum `[-0.07468038, 0.711022258, -0.148092479]`, maximum `[0.0616968535, 0.8571182, 0.0189470481]`. Luna’s Three.js normalizing, centering, camera, selection, and nanobot presentation positions are likewise separate rendering coordinates rather than scientific registration evidence.

## GLB→ALLEN CORRESPONDENCE

The investigation found **semantic candidate correspondence, not spatial correspondence**. Exact name/structure matches occur between several GLB mesh names and the official Allen label table. For example, the official IDs for head, body, and tail of hippocampus are 12171, 12173, and 12174; head, body, and tail of caudate are 10335, 10336, and 10337; and putamen is 10338. The GLB has matching paired node names. Additional checked candidates include posteroventral putamen (146034754), thalamus (10390), corpus callosum (10561), paravermis of cerebellum (12384), and lateral cerebellar hemisphere (12390). [1]

| Evidence category | Result | Why it is insufficient for transformation |
|---|---|---|
| Official Allen annotation header | Verified ICBM 2009b voxel-to-world affine | Defines the volume frame, not a mesh-to-volume mapping |
| GLB checksum and HRA identity | Verified exact HRA v1.1 source mesh | Pins the source asset, not its Allen NIfTI provenance |
| Structure names and labels | Multiple exact semantic candidates | Names do not locate GLB vertices in label voxels |
| 282 GLB Allen meshes versus 141 annotation labels | Suggestive descriptive relation | Cardinality differs and does not encode an affine or correspondence |
| HRA metadata statement that structures were mirrored/resized | Descriptive provenance | No source-volume version, extraction parameters, or coordinate convention is supplied |
| Allen package scripts | Annotation mirroring and label conversion only | No mesh generation, surface export, or GLB/FBX conversion is supplied |
| Public HRA reference-object library audit | Allen GLB/FBX versions present | No source NIfTI binding, conversion artifact, Maya project, vertex map, or landmark validation was found |

No authoritative source provides a GLB-to-NIfTI affine, deformation field, mesh-generation script, source NIfTI checksum binding, per-vertex label assignment, per-vertex voxel coordinate, or independently measured anatomical landmark residuals. The only defensible conclusion is therefore that the raw GLB-to-Allen annotation connection is **unavailable**.

## LUNA→ICBM 2009b STATUS

**UNAVAILABLE.** The target annotation/reference frame is well established: it is the Allen Human Reference Atlas 3D 2020 annotation expressed on ICBM 2009b Nonlinear Symmetric. The source mesh is well established: it is the exact, checksum-pinned HRA v1.1 GLB. The bridge between them is not established.

No affine, rigid transform, non-linear registration, bounds fitting, orientation inference, mesh-centre alignment, visual registration, camera-space conversion, name-based projection, or HRA-placement composition was derived. This is deliberate. Each would fabricate an unvalidated coordinate claim from evidence that does not encode spatial correspondence.

The application now carries this conclusion only as an **evidence-only unavailable record**. That record preserves the verified annotation metadata, semantic-candidate limitation, missing-artifact list, and explicit absence of an executable transform. It adds no raw-GLB-to-2009b function, no client coordinate display, no server transform route, and no change to the viewer’s presentation coordinates.

## VALIDATION

No numeric validation was performed, because there is no authoritative transform artifact to validate. Reporting a landmark count, residual, or registration quality score without source coordinates would be fabricated. The existing HRA landmark-validation framework remains intentionally empty and metadata-only.

A valid future validation would require independently identifiable landmarks present in both the checksum-pinned source GLB and the exact, checksum-pinned target annotation/reference artifact; source and target coordinate conventions; an explicit transform or correspondence; and reported residuals in millimetres. Multi-structure name matches alone are not landmark validation.

> **Validation status:** No GLB-to-Allen or Luna-to-ICBM 2009b landmark residuals exist in the reviewed authoritative material. No residuals are claimed in Luna.

## TRANSFORM ARTIFACT

**No transform artifact exists in the reviewed authoritative sources.** Consequently, no transform is committed or executed.

The exact artifact required before work may resume is a versioned, provenance-bound conversion record that connects the specific mesh asset to the specific Allen annotation release. At minimum, it must identify the GLB/FBX checksum and NIfTI checksum; declare source and target coordinate systems, units, orientation, and axis conventions; provide an affine, deformation field, or explicit vertex/voxel correspondence; describe the model-generation or surface-extraction process; and include independently reproducible multi-landmark residual validation in millimetres.

Acceptable forms include an official HRA/Allen model-generation project, a checksum-bound source-volume-to-surface extraction manifest, or an official per-vertex/per-voxel correspondence with declared conventions. A screenshot, matching structure names, a generic atlas registration, a secondary reconstruction, or a manually fitted transform would not satisfy this requirement.

## 2009c STATUS

**ICBM 2009c Nonlinear Asymmetric remains outside this investigation and remains not established.** This work concerns only the Allen 2020 annotation/reference relationship to **ICBM 2009b Nonlinear Symmetric**. No 2009c data, transform, surrogate, or interpretation was downloaded, created, or exposed. A future authoritative GLB-to-2009b artifact would not, by itself, establish any 2009c correspondence.

## NANOBOT STATUS

The nanobot system remains **Macro-only**. No Tissue, Molecular, Cellular, or Subcellular operation, provider target, navigation projection, or capability has been enabled. The existing refusals and scale gates remain unchanged. In particular, even if an authoritative 2009b correspondence became available later, it would establish at most a spatial-reference claim; it would not establish biological target resolution, clinical validity, provider data access, or permission to operate below Macro scale.

## REQUIRED USER ACTIONS

**No immediate user action is required.** No additional download is justified until an authoritative conversion artifact is identified. The temporary official annotation assets were sufficient to confirm the target annotation frame and insufficient to create a source-mesh bridge; downloading the external 348 MB 2009b T1 template would not resolve that provenance gap.

If the user wishes to pursue registration in the future, the appropriate request is to the HRA/Allen maintainers for the checksum-bound GLB/FBX-to-Allen annotation source artifact or documented surface-generation pipeline described above. The request should specify `Allen_F_Brain.glb` HRA v1.1 SHA-256 `c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc` and the official Allen 2020 `annotation.nii.gz`/`annotation_full.nii.gz` release checksums.

## REMAINING BLOCKERS

| Blocker | Current state | Consequence |
|---|---|---|
| Checksum-bound GLB-to-annotation provenance | Missing | No defensible source-to-target transform can be created |
| Mesh-generation or surface-extraction workflow | Missing | Cannot determine whether meshes derive from, differ from, or are merely semantically related to annotation labels |
| Coordinate-system and axis-convention declaration for mesh-to-volume conversion | Missing | Cannot safely interpret raw GLB coordinates in the NIfTI world frame |
| Per-vertex/per-voxel correspondence or official affine/deformation | Missing | Cannot map a mesh point to an annotation voxel or ICBM 2009b coordinate |
| Independent multi-landmark residual validation | Missing | Cannot quantify or accept registration quality |
| ICBM 2009c artifact | Deliberately not sought | 2009c must remain unavailable |
| Lower-scale biological target evidence | Not provided by spatial resources | Nanobot actions must remain Macro-only |

The project should remain at the present scientifically honest boundary: **established HRA reference-object placements, verified Allen/ICBM 2009b annotation metadata, and an unavailable raw-GLB-to-Allen/ICBM correspondence.**

## References

[1]: https://download.alleninstitute.org/informatics-archive/allen_human_reference_atlas_3d_2020/version_1/ "Allen Human Reference Atlas – 3D 2020, version 1.0.0 official package directory"
[2]: https://www.bic.mni.mcgill.ca/~vfonov/icbm/2009/mni_icbm152_nlin_sym_09b_nifti.zip "MNI ICBM 152 nonlinear symmetric 2009b NIfTI distribution"
[3]: https://purl.humanatlas.io/ref-organ/brain-female/v1.1 "HRA Brain Female v1.1 reference organ"
[4]: https://lod.humanatlas.io/ref-organ/brain-female/v1.1/ "HRA Brain Female v1.1 linked-data record"
