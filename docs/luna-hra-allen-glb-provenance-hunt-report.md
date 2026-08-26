# Luna Brain — HRA/Allen GLB Provenance Hunt

**Project:** SenotaAI / Luna Brain
**Investigation date:** August 25–26, 2026
**Scope:** Exact checksum-pinned Luna/HRA v1.1 `Allen_F_Brain.glb` → official Allen Human Reference Atlas – 3D, 2020 annotation volume / ICBM 2009b Nonlinear Symmetric.
**Author:** Manus AI

## EXECUTIVE RESULT

# AUTHORITATIVE ARTIFACT NOT FOUND

The exhaustive public-provenance investigation did **not** identify an authoritative, versioned, checksum-bound artifact that maps the exact Luna/HRA v1.1 `Allen_F_Brain.glb` geometry to either official Allen 2020 annotation volume (`annotation.nii.gz` or `annotation_full.nii.gz`) or to the ICBM 2009b Nonlinear Symmetric image frame. The pre-existing HRA relationship remains valid only as a **reference-object placement**: raw GLB → HRA Brain-Female → HRA CCF body. It is not a medical-image registration. [1] [2]

> **Scientific result:** `Luna raw GLB → Allen Human Reference Atlas – 3D, 2020 / ICBM 2009b = UNAVAILABLE`.

No affine, deformation field, bounds fit, scene alignment, name-derived coordinate relationship, or other transform was estimated or implemented. The only defensible next step is to obtain a provider-authored source-volume/mesh provenance record or a provider-authored coordinate artifact that meets the explicit requirements in **MISSING BRIDGE**.

| Relationship | Status | Basis | Scope boundary |
|---|---|---|---|
| Exact Luna GLB → HRA Brain-Female | **Established** | Checksum-pinned HRA v1.1 asset plus HRA graph local placement | HRA reference-object space only. |
| HRA Brain-Female → HRA CCF body | **Established** | HRA graph global body placement | HRA body-scene space only. |
| Allen 2020 annotation → ICBM 2009b Symmetric frame | **Established** | Official package documentation, example workflow, and inspected NIfTI header | Establishes the annotation image frame, not a GLB relation. |
| Exact Luna GLB → Allen annotation volume | **Unavailable** | No public source-volume binding, mesh-generation record, transform, or voxel/vertex correspondence found | Must not be inferred from matching names, counts, shape, or placements. |
| Exact Luna GLB → ICBM 2009b | **Unavailable** | The required first bridge is absent | No coordinates may be returned. |
| Any route to ICBM 2009c | **Unavailable and out of scope** | No 2009b bridge and no 2009b→2009c artifact evaluated | No 2009c claim or conversion was attempted. |

## OFFICIAL SOURCES SEARCHED

The investigation used primary official archives, repositories, linked-data records, release histories, source-code trees, public issue trackers, official SOPs, and peer-reviewed publications. Secondary material was used only to identify possible primary leads and was not used as transform evidence.

| Official source or scope | Method and result | Provenance finding |
|---|---|---|
| Allen 2020 archive directory and package | Inspected the complete package directory, README materials, examples, labels, and actual NIfTI headers. [3] [4] | Only annotation volumes, documentation, and examples are published. No GLB/FBX/OBJ/PLY/STL, source MRI, source segmentation, mesh pipeline, or coordinate manifest is included. |
| Allen 2020 community release documentation | Reviewed the official release description and its 141-structure volumetric-parcellation statement. [4] | Describes the annotation/reference dataset but does not name an HRA mesh or publish a surface conversion. |
| Allen primary atlas publication and official news | Reviewed Ding et al. 2016 and Allen’s publication announcements. [5] [6] | Establishes the donor-specific MRI/DWI, histology, digital polygons, and ontology background. It does not connect the exact HRA GLB to the 2020 NIfTI volumes or to ICBM 2009b. |
| AllenInstitute GitHub organization | Exact code searches for `Allen_F_Brain`, `annotation_full.nii.gz`, `annotation.nii.gz`, and `ICBM 2009b`. | `Allen_F_Brain`: zero first-party matches. `annotation_full.nii.gz`: zero first-party matches. The sole `annotation.nii.gz` match was unrelated mouse MERFISH material. ICBM 2009b results were later CCF-MAP documentation, not the 2020 HRA GLB. |
| Allen CCF-MAP and later human-atlas documentation | Reviewed the official later DHBAv2 human-atlas page. [7] | The later resource distributes separate 2025 ICBM2009b template/annotation products; it does not supply provenance for the 2021 HRA v1.1 GLB. |
| HRA v1.1 Brain-Female graph | Retrieved and audited the complete 369,789-byte graph, including the primary entity, raw object reference, and body placement. [1] | Declares `Allen_F_Brain.glb` and the two HRA placements. It contains no annotation/NIfTI, ICBM, source-volume, mesh-generation, affine, transform, checksum, or landmark-validation relation. |
| HRA v1.1 raw directory | Retrieved its complete file inventory. [2] | Contains exactly `Allen_F_Brain.glb`, `crosswalk.csv`, and `metadata.yaml`; no source volume or model-production artifact. |
| HRA releases repository | Recursively audited the complete official `ccf-releases` tree and the v1.0–v1.4 documentation paths plus v2.0 model path. [8] | Only published model binaries, descriptive documents, and crosswalks were found. The v1.1/v1.2/v1.3/v2.0 GLB source blob is identical; none provides a volume bridge. |
| HRA 3D Reference Object Library source repository | Recursively audited the current and pre-rename historical tree, exact model history, MEL metadata scripts, FBX companion assets, and public issue tracker. [9] | Published FBX/GLB companion files and semantic metadata exist. No Maya scene/project, NIfTI, annotation-derived source, conversion script, coordinate manifest, or brain landmark artifact exists. Exact-asset issue searches returned no results. |
| HRA linked-data v1.4 archive | Audited later Brain-Female raw directory and metadata. [10] | It contains a different later GLB plus crosswalk and metadata only; it does not add a source volume, transform, or validation artifact and is not substituted for Luna v1.1. |
| HRA mesh-collision repository | Audited the exact-asset references and GLB parser. [11] | The parser consumes already published GLBs and exports geometry for collision use. It is not a segmentation-to-mesh or GLB-to-NIfTI workflow. |
| HRA official SOPs and library documentation | Read the official model-integration and model-approval SOPs and library description. [12] [13] [14] | They document medical-illustration construction, Maya/MEL metadata attachment, GLB/FBX export, HRA-body fitting, and SME macro-anatomical review—not an Allen-volume transform or quantitative neuroimage registration. |
| HRA peer-reviewed construction paper | Reviewed the 2025 HRA construction description. [15] | Defines reference objects as medical-illustrator/SME-created polygon meshes with ontology crosswalks; it supplies no Brain-Female source-volume binding or ICBM transform. |
| Checksum and exact-name public search | Searched the exact Luna SHA-256 and exact filename through GitHub code search. | The Luna SHA-256 appeared only in SenotaAI’s existing provenance/evidence records. No official HRA or Allen manifest publishes a checksum binding to an Allen source volume. |

## ASSETS INVESTIGATED

The following exact assets and records were reviewed. Development-only downloads stayed outside the repository; no large template archive, 2009c asset, browser asset, or source volume was added to the application.

| Asset or record | Version / identifier | Verified fact | Relevance |
|---|---|---|---|
| Luna Macro GLB | HRA v1.1 `Allen_F_Brain.glb` | SHA-256 `c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc`; 11,977,884 bytes | Exact source asset under investigation. |
| HRA v1.1 GLB source blob | `46be1ef8f30b42b1bda45efc909d09badc2c1013` | Same repository binary as Luna’s source line | Establishes exact HRA asset lineage, not source volume. |
| HRA v1.1 companion FBX | `VH_Female/V1.1/Allen_F_Brain.fbx` | SHA-256 `b6d8d388c41f9296905f7da72454579b5bbf636a653a0b3f2021bf8ab4911ae9`; binary FBX v7700; Maya 2022 metadata | Published companion model format. It contains HRA node attributes but no volume/ICBM provenance. |
| Allen original annotation | `annotation.nii.gz` | SHA-256 `be23763c15386f2f211105f1e8144a6887e7615571229090e209b1c78355d378`; 1,117,842 bytes | Verified target-annotation source volume. |
| Allen bilateral annotation | `annotation_full.nii.gz` | SHA-256 `2b05581e39c44f2623d9b0a69f64e3df0823c20d054abef92973812313335dc3`; 1,815,762 bytes | Verified bilateral target annotation volume. |
| Later HRA Brain-Female GLB | v1.4 `3d-allen-f-brain.glb` | 11,983,380 bytes; Git blob `f854b1a4566e3025a1519bc38b78878da882b726` | Distinct later asset; not used as a stand-in for Luna v1.1. |
| External MNI template archive | ICBM 2009b NIfTI archive | Officially referenced external template archive, approximately 348 MB | Not downloaded because it cannot resolve the missing GLB-to-volume provenance. [16] |

## GLB PROVENANCE

The exact Luna GLB is byte-identical to the published HRA v1.1 Brain-Female asset. The HRA graph identifies it as a `model/gltf-binary` object reference with the `Allen_brain` subpath and defines a local HRA placement with unit scale, rotation `(-90°, 0°, 0°)`, and translation `(74.68038, -711.022258, 148.092479)` mm. That placement targets the HRA Brain-Female reference object; the graph separately defines an inverse-like global placement into the HRA CCF female body. [1]

The HRA documentation consistently says that the Brain-Female model was created using data from the Allen human brain reference atlas, that 141 structures were mirrored to make a whole brain, and that the result was resized to fit the Visible Human bodies. The later v1.4 metadata narrows the wording to say that Ding et al. 2016 informed model creation. [8] [10]

> “The 141 anatomical structures were mirrored to arrive at a whole human brain … and resized to fit the Visible Human Male and Female bodies.” — official HRA Brain-Female release documentation [8]

This is credible **descriptive and HRA-reference-object provenance**. It is not a statement that the v1.1 GLB is a direct coordinate-preserving surface export of `annotation.nii.gz` or `annotation_full.nii.gz`. The public FBX confirms Autodesk Maya 2022 production and HRA semantic attributes such as `anatomical_structure_of`, `source_spatial_entity`, `ontologyid`, and `representation_of`; it does not contain an Allen volume filename, graph-16 label IDs, NIfTI affine, source-volume checksum, ICBM/MNI coordinate declaration, or vertex/voxel map.

The official HRA SOPs explain this distinction. Reference objects are designed by medical illustrators, reviewed by domain experts for macro-anatomy and HRA use, fitted to the overall HRA body, enriched by an MEL script with semantic metadata, and exported as FBX/GLB. Their published process does not prescribe or document a medical-image registration to the Allen 2020 volume. [12] [13]

## ANNOTATION PROVENANCE

The official Allen package is a 141-structure adult-human-brain parcellation on ICBM 2009b Nonlinear Symmetric. Its actual package filenames are **`annotation.nii.gz`** and **`annotation_full.nii.gz`**; no official file named `mni_annotation_full.nii.gz` exists in the released directory. [3] [4]

Both inspected NIfTI files have dimensions `394 × 466 × 378`, 0.5 mm isotropic spacing, millimetre units, a qform affine, and increasing-index RAS orientation. The verified affine is:

```text
[[0.5, 0,   0,   -98],
 [0,   0.5, 0,  -134],
 [0,   0,   0.5, -72],
 [0,   0,   0,    1]]
```

Thus the world origin is `(-98, -134, -72)` mm and both volumes contain 141 non-background labels. The official `flip_annotation.py` example zeros the central x index, mirrors the one-sided `annotation.nii.gz` volume, and writes `annotation_full.nii.gz`; it does not create a surface, FBX, GLB, or mesh-to-volume coordinate artifact. The package’s conversion example maps label IDs to the Allen structure graph and writes segmentation-label information; it likewise does not export meshes or supply a GLB correspondence. [3]

## ICBM 2009b

The official Allen 2020 release describes the 3D parcellation as being drawn on the **ICBM 2009b Nonlinear Symmetric** reference. The package example separately references the high-resolution 2009b template file `mni_icbm152_t1_tal_nlin_sym_09b_hires.nii` from an external MNI distribution. [4] [16]

This establishes the **annotation/reference image frame**, not the coordinate system of the HRA GLB. The current evidence properly labels the Allen target space as `Allen Human Reference Atlas – 3D, 2020 / ICBM 2009b Nonlinear Symmetric` while retaining no bridge from raw GLB coordinates to that space.

## MISSING BRIDGE

The missing artifact must bind the **exact source asset** and an **exact source volume or equivalent surface**. A sufficient provider-authored artifact would be one of the following:

| Acceptable artifact form | Mandatory content |
|---|---|
| Versioned model-generation record | Exact v1.1 GLB/FBX identity and checksum; source NIfTI/segmentation or source surface identity and checksum; mesh-extraction/export steps; units; axis/orientation convention; mirroring/resizing/resampling details; final coordinate system. |
| Direct mesh-to-volume correspondence | Per-vertex source voxel/label linkage, or a complete deterministic reconstruction artifact that demonstrably regenerates the exact checksum-bound mesh from the exact input. |
| Provider-authored transformation manifest | Source and target spaces, units, orientation, transformation type and parameters, versioned target reference, and explicit applicability to the exact v1.1 GLB. |
| Independent validation record | Multiple named landmarks spanning left/right, anterior/posterior, superior/inferior, and scale, with measured residuals in millimetres and clear acceptance criteria. |

No public artifact reviewed satisfies these requirements. The Allen NIfTI qform is not a mesh transform. The HRA object/body placements are not image registrations. Semantic node-name matches and the common “141 structures” description are not vertex/voxel correspondence. The public HRA process also permits resizing to a Visible Human body, so even generic source-atlas knowledge cannot be used to preserve or infer target coordinates.

## ARTIFACT FOUND

**No authoritative GLB → Allen annotation / ICBM 2009b artifact was found.**

The most relevant near-miss was the published v1.1 FBX companion. It confirms Maya-based model production and HRA attributes, but fails every required volume-registration criterion: it has no explicit Allen 2020 volume identity, no source-volume checksum, no declared medical-image coordinate frame, no mesh-to-volume transform, no per-vertex/voxel linkage, and no landmark residual record. The HRA v1.1 graph is similarly valuable for HRA placement but explicitly lacks an Allen/NIfTI/ICBM relation.

## TRANSFORM STATUS

# UNAVAILABLE

A “partial” result would imply that some GLB coordinate can be reproduced in the Allen/ICBM frame with authoritative coverage and documented limitations. The evidence does not support that: only the **target frame** is established, while the exact GLB-to-target source relationship is absent. Therefore `UNAVAILABLE`, rather than `PARTIAL`, is the scientifically correct status.

No numerical transform artifact exists in this report. No value was derived from geometry bounds, centers, visual alignment, HRA scene placement, mesh names, label counts, camera placement, or the viewer’s presentation normalization.

## VALIDATION

The following checks were completed with actual evidence:

| Check | Result |
|---|---|
| Exact Luna asset identity | Verified against the HRA v1.1 GLB SHA-256. |
| Allen annotation image metadata | Verified directly from both NIfTI headers and payload label counts. |
| Allen package mesh workflow | Package directory and official examples reviewed; no surface/GLB workflow found. |
| HRA linked-data graph | Complete v1.1 graph audited; only HRA object/body placements found. |
| HRA public source/release history | Current and historical repository trees, release documentation, raw directories, crosswalks, MEL script, GLB/FBX companions, and exact-asset issue searches audited. |
| First-party Allen code searches | Exact asset and annotation filename searches completed; no 2020 GLB provenance artifact found. |
| Semantic structure candidates | Multiple exact-name candidates confirmed as semantic matches only; no spatial claim made. |

The following checks remain **not performed because the required source relation is absent**: GLB vertex-to-voxel correspondence, a raw-GLB-to-Allen/ICBM affine or deformation, cross-frame landmark identification, and landmark residual measurement. No validation residual was fabricated.

## MAINTAINER REQUEST

The following draft is prepared but **has not been sent**.

> **Subject:** Request for versioned mesh-to-volume provenance for HRA v1.1 `Allen_F_Brain.glb`
>
> Dear HRA 3D Reference Object Library and Allen Human Reference Atlas maintainers,
>
> I am validating a scientific coordinate correspondence for the exact HRA v1.1 female-brain asset used by Luna Brain:
>
> - Filename: `Allen_F_Brain.glb`
> - Exact SHA-256: `c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc`
> - HRA v1.1 record: `https://purl.humanatlas.io/ref-organ/brain-female/v1.1`
>
> The public HRA records establish reference-object placements and descriptive attribution to the Allen human reference atlas, while the Allen 2020 package establishes the ICBM 2009b annotation frame. We could not find a public artifact that binds this exact GLB or its v1.1 FBX companion to `annotation.nii.gz`, `annotation_full.nii.gz`, another Allen source volume, or an ICBM 2009b transformation.
>
> Could you provide or identify the authoritative, versioned record for the following, if it exists?
>
> 1. The source volume, segmentation, source surface, or model file used to generate the exact v1.1 GLB/FBX, including filename, version, URL, and checksum.
> 2. The model-generation, surface-extraction, mirroring, resizing, smoothing, decimation, and GLB/FBX export pipeline, including parameters and software versions.
> 3. The source mesh and source-volume coordinate systems, units, axis/orientation conventions, and any scale/origin conventions.
> 4. The exact relation of the GLB/FBX to Allen `annotation.nii.gz` and `annotation_full.nii.gz`, including whether either volume was an input.
> 5. Any rigid, affine, nonlinear, or deformation transformation from the exact source mesh/GLB to ICBM 2009b Nonlinear Symmetric.
> 6. Any per-vertex label/voxel correspondence, conversion manifest, Maya/Blender project, source scene, or deterministic reconstruction material.
> 7. Any independent anatomical landmark validation and measured residuals for such a correspondence.
>
> We will keep the GLB→ICBM 2009b relationship unavailable unless a provenance-bound source artifact supports it. Thank you for directing us to any public record or approved request route.

## APPLICATION CHANGES

**No runtime coordinate transform was implemented.**

This provenance-hunt cycle adds this report only. The previously released evidence-only `unavailable` contract remains unchanged. The following safeguards are preserved:

| Application boundary | Current state |
|---|---|
| Raw GLB/HRA executable placements | Unchanged; limited to HRA reference-object and HRA CCF body spaces. |
| Allen/ICBM 2009b coordinate executor | Not present. |
| MNI/ICBM 2009c executor | Not present and not investigated as a target route. |
| Viewer presentation coordinates | Remain separate from all HRA and Allen reference spaces. |
| External provider/observation targets | No new provider target was enabled. |

## NANOBOT STATUS

The current scale gates are unchanged. **Macro simulation remains enabled.** Tissue, Cellular, Molecular, and Subcellular nanobot operations remain disabled. This investigation did not alter the current Macro mission engine, target resolver, visuals, lifecycle, workspace, or UI.

| Observation or operation scale | Status |
|---|---|
| Macro | Enabled; unchanged. |
| Tissue | Disabled; unchanged. |
| Cellular | Disabled; unchanged. |
| Molecular | Disabled; unchanged. |
| Subcellular | Disabled; unchanged. |

## NEXT SCIENTIFIC STEP

The only evidence-based next step is to obtain the provider-authored artifact specified in **MISSING BRIDGE**, preferably from the HRA 3D Reference Object Library’s archival/model-production records or from the Allen team responsible for the 2020 volume. The ready-to-send request above identifies the exact v1.1 GLB and checksum and asks for the smallest set of materials capable of resolving the provenance gap.

Downloading the external 2009b template, deriving a new mesh from the annotation volume, or using generic MRI/MNI registration would **not** resolve the gap, because none establishes a validated relationship to the exact checksum-pinned Luna GLB.

## REFERENCES

[1]: https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json "HRA Brain-Female v1.1 graph"
[2]: https://github.com/hubmapconsortium/hra-kg/tree/main/digital-objects/ref-organ/brain-female/v1.1/raw "HRA KG Brain-Female v1.1 raw directory"
[3]: https://download.alleninstitute.org/informatics-archive/allen_human_reference_atlas_3d_2020/version_1/ "Allen Human Reference Atlas – 3D, 2020 official package"
[4]: https://community.brain-map.org/t/allen-human-reference-atlas-3d-2020-new/405 "Allen Human Reference Atlas – 3D, 2020 official release announcement"
[5]: https://pmc.ncbi.nlm.nih.gov/articles/PMC5054943/ "Ding et al. 2016, Comprehensive cellular-resolution atlas of the adult human brain"
[6]: https://alleninstitute.org/news/allen-institute-publishes-highest-resolution-map-of-the-entire-human-brain-to-date "Allen Institute: highest-resolution human-brain map announcement"
[7]: https://alleninstitute.github.io/CCF-MAP/descriptions/human_ccf.html "Allen CCF-MAP: Developing Human Brain Atlas v2"
[8]: https://github.com/hubmapconsortium/ccf-releases "HuBMAP CCF releases repository"
[9]: https://github.com/hubmapconsortium/ccf-3d-reference-object-library "HuBMAP CCF 3D Reference Object Library repository"
[10]: https://github.com/hubmapconsortium/hra-kg/tree/main/digital-objects/ref-organ/brain-female/v1.4/raw "HRA KG Brain-Female v1.4 raw directory"
[11]: https://github.com/hubmapconsortium/hra-tissue-block-annotation "HRA Mesh Collision API repository"
[12]: https://zenodo.org/records/10358858 "HRA SOP: Adding 3D Reference Objects to the Human Reference Atlas"
[13]: https://zenodo.org/records/5944197 "HRA SOP: 3D Reference Object Approval"
[14]: https://humanatlas.io/3d-reference-library "Human Reference Atlas 3D Reference Object Library"
[15]: https://www.nature.com/articles/s41592-024-02563-5 "Börner et al. 2025, Human BioMolecular Atlas Program: 3D HRA construction and usage"
[16]: https://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/ "MNI ICBM 152 nonlinear atlases, 2009"
