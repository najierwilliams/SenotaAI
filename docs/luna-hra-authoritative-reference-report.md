# Luna Brain — Authoritative HRA Brain Reference Asset Investigation

**Investigation date:** 2026-08-26
**Scope:** Locate the authoritative HuBMAP/HRA/CCF record and spatial reference representation for Luna’s exact `3d-vh-f-allen-brain.glb` asset. This investigation did **not** modify application source, viewer behavior, coordinate-transform code, nanobot capabilities, or lower-scale operation gates.

> **Conclusion:** An authoritative, machine-readable **HRA GLB-to-HRA CCF placement record** was found for the exact byte-identical v1.1 asset. It establishes a documented path from the raw `Allen_F_Brain.glb` object to an HRA Brain-female spatial entity and the HRA CCF body graph. It does **not** establish a Luna presentation-local-to-HRA mapping, a mesh-to-Allen-volume mapping, or any HRA/Luna-to-MNI ICBM 152 2009c nonlinear asymmetric transform. **No authoritative Luna↔MNI registration source was found.**

## HRA RECORD

The exact source object is HuBMAP’s **3D Reference Organ for Brain, Female**, version **v1.1**, with HBM identifier **`HBM724.XTTN.487`**, DOI **`10.48539/HBM724.XTTN.487`**, publication date **2021-12-01**, and CC BY 4.0 license. Its persistent HRA record is `https://purl.humanatlas.io/ref-organ/brain-female/v1.1`. The HRA-KG source tree contains the v1.1 raw object, crosswalk, and metadata under `digital-objects/ref-organ/brain-female/v1.1/raw/`. [1] [2] [3]

| Field | Authoritative value |
|---|---|
| HRA digital-object type | `ref-organ` / 3D Reference Organ |
| HRA version | `v1.1` |
| HRA record ID | `https://lod.humanatlas.io/ref-organ/brain-female/v1.1` |
| Persistent identifier | `https://purl.humanatlas.io/ref-organ/brain-female/v1.1` |
| HuBMAP ID / DOI | `HBM724.XTTN.487` / `10.48539/HBM724.XTTN.487` |
| CCF spatial type | `ccf:SpatialEntity` in the processed graph |
| Biological representation | `UBERON:0000955` (brain) |
| Raw asset | `Allen_F_Brain.glb`, media type `model/gltf-binary` |
| Related semantic asset | `crosswalk.csv`, mapping model node names to Uberon structures |
| Machine-readable graph | `graph.json`, `graph.jsonld`, Turtle, RDF/XML, N-Triples, and N-Quads distributions |

The authoritative v1.1 metadata describes the object as follows:

> “This reference organ was created using data from the ‘Allen Human Reference Atlas – 3D, 2020’ representing one half of the human brain … The 141 anatomical structures were mirrored to arrive at a whole human brain … and resized to fit the Visible Human Male and Female bodies.” [1]

The processed HRA metadata explicitly provides the graph-distribution URLs and raw GLB/crosswalk URLs. This supersedes the narrow earlier observation that the standalone GLB file has no embedded scientific coordinate declaration: **the official HRA graph does publish spatial placement information external to the GLB.** [2]

## GLB PROVENANCE

Luna’s asset is `client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb`. Its SHA-256 is `c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc`; earlier audit established that this is byte-identical to the official HRA v1.1 `Allen_F_Brain.glb` distribution. Thus the HRA v1.1 graph is authoritative for the **same raw GLB bytes**, not merely a similarly named brain model.

The immediate HRA lineage is: **Allen Human Reference Atlas – 3D, 2020 data → one hemisphere represented in the HRA source → mirrored to a whole brain → resized for Visible Human Female/Male bodies → HRA v1.1 `Allen_F_Brain.glb` → Luna’s byte-identical raw asset**. The HRA provenance statement is authoritative for this derivation at the descriptive level; it does not publish the modeling pipeline that maps each Allen annotation voxel to each HRA mesh vertex. [1] [2]

An official v1.1 FBX peer of the GLB is retained in the HRA reference-object library. A bounded header inspection found FBX `GlobalSettings` of right-handed/Y-up with an implicit centimetre system when scale factors are one, according to Autodesk’s FBX documentation. This is **file-interchange metadata**, not a medical coordinate system and not evidence that the Luna GLB uses MNI coordinates. [4] [5]

## SOURCE/REFERENCE ASSETS FOUND

| Asset or record | Role in the evidence chain | Spatial content | Status for Luna↔MNI |
|---|---|---|---|
| HRA v1.1 `graph.json` / `graph.jsonld` | Exact source object’s processed CCF graph | Dimensions, units, local and global `ccf:SpatialPlacement` fields, reference-organ links | **Found; supports HRA-local research only** |
| HRA v1.1 `Allen_F_Brain.glb` | Exact raw source GLB | 3D surfaces and anatomy-node metadata | **Found; byte-identical to Luna asset** |
| HRA v1.1 `crosswalk.csv` | HRA node-to-Uberon semantic crosswalk | Anatomical identity, not coordinate mapping | **Found** |
| HRA CCF body graph v1.2 `bodies.jsonld` | Context for Visible Human Female organs/body hierarchy | Millimetre units and object/body placements | **Found; HRA body context only** |
| Allen Human Reference Atlas – 3D, 2020 | Parent voxelwise parcellation resource | 141 structures drawn on ICBM 2009b Nonlinear Symmetric MRI | **Found; mesh derivation transform absent** |
| `annotation_full.nii.gz` / `annotation.nii.gz` | Allen 3D annotation outputs | Atlas annotations; directory lists 1,815,762 bytes and 1,117,842 bytes | **Located; not downloaded** |
| ICBM 2009b Nonlinear Symmetric template | Allen 3D parent reference MRI | 0.5 mm MRI template | **Located; no mesh mapping** |
| ICBM 2009c Nonlinear Asymmetric template | Requested Luna target standard | 1 mm MRI template | **Located; no inter-template transform found** |

The HRA CCF body graph is relevant because the original GLB metadata already named `VHFemaleOrgans` as a source spatial entity. The official body graph defines **Visual Human Female Organs** as a millimetre-scale spatial entity, places its source object with a `-90°` X rotation, and places that entity into the Visual Human Female body. This validates that HRA’s placement vocabulary is intended for reference-object assembly, not for MNI stereotaxy. [6]

## COORDINATE SYSTEM

### What is formally declared

The exact HRA v1.1 Brain-female graph declares a female-brain `ccf:SpatialEntity` with dimensions **136.3772335 × 146.09594200000004 × 167.0395271 millimetres**. Its `SpatialObjectReference` points to the exact `Allen_F_Brain.glb` raw asset. The graph declares a **Local placement of female brain** whose source is that GLB object reference and whose target is the v1.1 Brain-female spatial entity. The placement fields are shown below exactly as published. [2]

| Declared field | Value |
|---|---:|
| Scale | `(1, 1, 1)` ratio |
| Rotation | `(-90, 0, 0)` degrees |
| Translation | `(74.68038, -711.022258, 148.092479)` millimetres |
| Source | the `Allen_F_Brain.glb` HRA object reference |
| Target | `https://purl.humanatlas.io/ref-organ/brain-female/v1.1` |
| Placement date | `2021-12-01` |

The same graph declares a **Global placement of female brain** from the HRA Brain-female spatial entity to `https://purl.humanatlas.io/graph/hra-ccf-body`, with unit scale, zero rotation, and translation **`(-74.68038, 711.022258, -148.092479)` millimetres**. This is a documented HRA/CCF reference-object placement chain. [2]

### What remains undefined or unsuitable for clinical/neuroimaging use

The retrieved HRA graph gives numeric X/Y/Z field names, millimetre units, rotations, and targets. It does **not** declare a neuroimaging orientation convention such as RAS or LPS, a handedness statement for the HRA Brain-female spatial entity, an anatomical landmark origin such as AC or PC, an MNI/ICBM template identifier, a NIfTI affine, or a deformation field. Its target is the **HRA CCF body graph**, not an MNI reference image. Therefore it is scientifically appropriate to describe this as an **HRA CCF reference-object coordinate system**, not as MNI coordinates.

The raw GLB itself still lacks the HRA graph’s units/axis/origin/placement declarations. A future Luna integration must bind the graph record by its exact asset checksum and retain the HRA source/target semantics; it must not replace that relationship with scene bounds, viewer normalization, an inferred origin, or hand-authored offsets.

## MNI RELATIONSHIP

The closest documented neuroimaging reference space is not the HRA CCF body graph. Allen’s official 3D atlas documentation states that its voxelwise 141-structure parcellation was drawn on **ICBM 2009b Nonlinear Symmetric**. That is a 0.5 mm template. [7] [8]

Luna’s requested target, **ICBM 2009c Nonlinear Asymmetric**, is a distinct 1 mm template. The MNI publisher states that the 2009 atlas templates describe the same anatomy but have different sampling and/or preprocessing. It publishes separate archives for 2009b symmetric and 2009c asymmetric, but the official page does not publish a 2009b-symmetric-to-2009c-asymmetric registration matrix, deformation field, or resampling map. [8]

| Relationship | Evidence status | Scientific interpretation |
|---|---|---|
| Exact HRA v1.1 GLB → HRA Brain-female entity | Published HRA `SpatialPlacement` | **Documented HRA reference-object placement** |
| HRA Brain-female entity → HRA CCF body graph | Published HRA `SpatialPlacement` | **Documented HRA body placement** |
| HRA GLB → Allen 3D annotation NIfTI | No modeling transform or per-vertex/voxel correspondence published | **Unavailable** |
| Allen 3D annotation / ICBM 2009b Sym → MNI 2009c Asym | No authoritative direct transform found | **Unavailable** |
| Luna viewer presentation local → HRA graph source local | Luna currently recentres/rescales for display only | **Unavailable for science** |
| Luna Local → MNI ICBM 2009c Asym | Requires all missing links and validation | **UNAVAILABLE** |

## TRANSFORM FOUND

A transform was found only at the **HRA reference-object level**. The exact v1.1 graph publishes a transform-bearing `ccf:SpatialPlacement` from the exact `Allen_F_Brain.glb` object reference into its HRA Brain-female spatial entity, plus a placement into the HRA body graph. It is versioned, source-addressable, has explicit units for translations, and associates the mesh with a declared HRA target. [2]

This is valuable new evidence and is the appropriate starting point for a **future raw-asset-local ↔ HRA CCF** bridge. Before it can be operationalized in Luna, the application must define “Luna source local” as the unmodified, checksum-verified raw GLB coordinate frame—not BrainViewer’s presentation-normalized scene frame—and independently validate the HRA placement with named structures/landmarks in the official HRA viewer or equivalent reproducible procedure.

## TRANSFORM NOT FOUND

**No authoritative Luna↔MNI registration source was found.** The following artifacts remain absent from the authoritative material retrieved:

| Missing artifact | Why it is necessary |
|---|---|
| Exact GLB/FBX-to-Allen-annotation-volume conversion artifact | The HRA record says the model was created using Allen data, but does not publish the surface-extraction/modeling transform, source volume version binding, or vertex-to-voxel correspondence. |
| HRA CCF Brain-female-to-ICBM 2009b Sym transform | HRA’s target is a Visible Human/HRA body reference graph, not the Allen MRI template. |
| ICBM 2009b Sym-to-ICBM 2009c Asym transform | The MNI publisher distributes distinct templates but no direct inter-template matrix/deformation field in the located official release documentation. |
| Luna presentation-local-to-raw-GLB transform record | The client currently centres and uniformly scales the loaded model for rendering. That display operation is not an externally validated coordinate convention. |
| Independent landmark/orientation validation | The HRA metadata declares numeric transforms but does not provide MNI landmarks, orientation labels, target registration residuals, or error statistics. |

A valid future Luna↔MNI chain would need to be: **checksum-verified raw Luna/HRA GLB local → documented HRA Brain-female entity → documented HRA/Allen source-volume correspondence → validated ICBM 2009b Sym-to-2009c Asym transform → MNI ICBM 152 2009c Asymmetric**, with named landmarks, units, axis/orientation metadata, source and target versions, artifact checksums, and independent validation results. None of the missing links may be replaced by visual similarity or a scale/offset fit.

## REQUIRED DOWNLOADS

No large data were downloaded during this investigation. The following assets have been identified for a **future, separately approved validation workflow** only. Authentication was not indicated by the public source URLs.

| Asset | Exact URL and filename | Approximate size | License | Why it could be needed | Authentication / recommended storage |
|---|---|---:|---|---|---|
| HRA Brain-female graph | `https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json` | 293,162 bytes | CC BY 4.0 | Canonical machine-readable HRA placement record for the exact GLB | Public; store as a checksum-pinned scientific metadata artifact, not as browser runtime data |
| HRA Brain-female graph JSON-LD | `https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.jsonld` | Small metadata graph; exact size not measured | CC BY 4.0 | RDF/JSON-LD provenance and semantic validation | Public; store alongside the JSON graph only if RDF validation is required |
| Allen full annotation | `http://download.alleninstitute.org/informatics-archive/allen_human_reference_atlas_3d_2020/version_1/annotation_full.nii.gz` | 1,815,762 bytes | CC BY 4.0 | Could test a provider-supplied GLB-to-volume correspondence; it cannot establish that correspondence by itself | Public; store under a non-public research input directory with checksum and source README |
| Allen annotation | `http://download.alleninstitute.org/informatics-archive/allen_human_reference_atlas_3d_2020/version_1/annotation.nii.gz` | 1,117,842 bytes | CC BY 4.0 | Smaller associated annotation asset; same limitation | Public; non-public research input directory |
| ICBM 2009b Sym NIfTI archive | `https://www.bic.mni.mcgill.ca/~vfonov/icbm/2009/mni_icbm152_nlin_sym_09b_nifti.zip` | 348 MB | MNI license published on the official template page | Only after an exact Allen/HRA-to-2009b correspondence exists | Public; do **not** download yet; store outside browser assets |
| ICBM 2009c Asym NIfTI archive | `https://www.bic.mni.mcgill.ca/~vfonov/icbm/2009/mni_icbm152_nlin_asym_09c_nifti.zip` | 57 MB | MNI license published on the official template page | Target-image/header validation only; cannot solve the missing mesh/Allen link | Public; do **not** download yet; store outside browser assets |
| HRA female unified-body GLB | `VH_F_United.glb` in HRA CCF body graph v1.2 | 53,997,696 bytes | CC BY 4.0 | Optional visual validation of the HRA body context; not needed for MNI registration | Public; do **not** download yet |

## REQUIRED USER ACTIONS

No user action is required to preserve the current scientifically conservative application state. Specifically, no template download, user credential, provider API key, manual scale adjustment, or browser-side processing is warranted now.

To complete a scientifically defensible Luna↔MNI bridge, an authoritative asset owner or qualified spatial-registration team must provide either the original HRA modeling source project or a published derivative artifact that contains the exact following materials: the input Allen annotation volume identifier and checksum; the conversion/surface-extraction pipeline or a source-GLB/FBX-to-volume transform; declared source and target coordinate conventions; a versioned, checksum-pinned ICBM 2009b Sym-to-2009c Asym transformation if not supplied by MNI; named landmarks/orientation checks; and independent error/validation results. A template download alone is insufficient.

## RECOMMENDED NEXT STEP

The recommended next milestone is a **HRA CCF evidence-integration and validation-design review**, not an MNI conversion implementation. It should first checksum-pin the official v1.1 `graph.json`/`graph.jsonld`, model the raw-GLB-to-HRA placement as a *documented HRA-only* registration candidate, and define a reproducible landmark/structure validation protocol against HRA’s own reference-object viewer and graph semantics. This would improve provenance and HRA-coordinate transparency while leaving MNI conversion unavailable.

Only after the missing HRA/Allen source-volume correspondence and a valid transform path to the requested MNI target are available should a separate milestone consider executable MNI support. Until then, **Tissue, Molecular, and Cellular targeting must remain disabled**, and no MNI coordinates should be presented as Luna positions.

## References

[1]: https://lod.humanatlas.io/ref-organ/brain-female/v1.1/ "HRA-KG — 3D Reference Organ for Brain, Female v1.1"
[2]: https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/metadata.json "HRA v1.1 Brain-female processed metadata"
[3]: https://github.com/hubmapconsortium/hra-kg/tree/main/digital-objects/ref-organ/brain-female/v1.1/raw "HRA-KG Brain-female v1.1 raw digital object"
[4]: https://github.com/hubmapconsortium/ccf-3d-reference-object-library "HuBMAP CCF 3D Reference Object Library"
[5]: https://help.autodesk.com/cloudhelp/2018/ENU/FBX-Developer-Help/nodes_and_scene_graph/fbx_scenes/scene_axis_and_unit_conversion.html "Autodesk FBX scene axis and unit conversion"
[6]: https://github.com/hubmapconsortium/hra-kg/tree/main/digital-objects/graph/hra-ccf-body/v1.2/raw "HRA CCF body graph v1.2 source assets"
[7]: https://community.brain-map.org/t/allen-human-reference-atlas-3d-2020-new/405 "Allen Human Reference Atlas – 3D, 2020 documentation"
[8]: https://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/ "MNI ICBM 152 Nonlinear Atlases (2009)"
[9]: https://pmc.ncbi.nlm.nih.gov/articles/PMC10043028/ "Specimen, biological structure, and spatial ontologies in support of a Human Reference Atlas"
[10]: https://docs.humanatlas.io/apps/kg "HRA Knowledge Graph Explorer documentation"
[11]: https://docs.humanatlas.io/dev/api "HRA API and Knowledge Graph documentation"
