# Luna Local ↔ MNI Registration Evidence Record

**Status:** `MNI REGISTRATION: UNAVAILABLE`  
**Record version:** 1.0.0  
**Assessment date:** 2026-08-25  
**Scope:** The current Luna Macro asset only: `client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb`.

> This record distinguishes **verified anatomical provenance** from a **scientifically executable spatial registration**. A visual mesh origin, mesh bounds, viewer centering, or display scale is not a spatial-registration artifact and must not be used for coordinate conversion.

## 1. Verified source-asset identity

The repository GLB is **11,977,884 bytes** and has SHA-256 `c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc`. Downloading the documented HuBMAP Human Reference Atlas (HRA) v1.1 `Allen_F_Brain.glb` asset produced the exact same digest. The Luna asset is therefore byte-identical to that HRA release asset, rather than merely having a similar filename.

| Field | Verified value | Evidentiary significance |
|---|---|---|
| Repository path | `client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb` | Exact asset assessed by this record. |
| HRA source asset | `https://cdn.humanatlas.io/hra-releases/v1.1/models/Allen_F_Brain.glb` | Byte-identical upstream asset. |
| Source release | HRA Brain-female v1.1 | Versioned source identity. |
| SHA-256 | `c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc` | Reproducible identity check. |
| Publisher / dataset | HuBMAP Human Reference Atlas, Brain-female | Anatomical provenance. |
| DOI | `10.48539/HBM724.XTTN.487` | Citable source record. |
| License | CC BY 4.0 | Source reuse condition. |

The HRA Brain-female documentation states that the reference object was created using Allen Human Reference Atlas data, with **141 structures mirrored to form a whole brain and resized to fit Visible Human male and female bodies**. This makes the GLB a useful anatomical reference object, but it also means its presentation mesh must not be silently equated with the original Allen volumetric atlas or an MRI-template coordinate frame. [1] [2] [3]

## 2. GLB inspection and coordinate-system conclusion

The included `scripts/inspect-luna-glb-registration.py` parses the GLB JSON chunk and reports the asset metadata, scene/node transforms and extras, position-accessor bounds, byte count, and SHA-256. The inspection found a glTF 2.0 Maya/Babylon export with 283 meshes and 286 nodes. Anatomy/UBERON extras establish anatomical lineage, but the file has no top-level reference-space record, no template identifier, no declared units, no axis-orientation convention, no origin, no voxel-to-world affine, no matrix/warp artifact, and no landmark-validation data.

| Coordinate-system question | Result | Evidence-based interpretation |
|---|---|---|
| Native GLB units | **Unknown** | No authoritative units declaration in the GLB or retrieved HRA Brain-female release record. |
| Axes and anatomical orientation | **Unknown** | No documented mesh coordinate convention or validated left/right, anterior/posterior, or superior/inferior landmark pairs. |
| Origin / world affine | **Unknown** | No source-volume-to-mesh mapping or affine is supplied. |
| MNI / ICBM reference-space ID | **Absent** | No MNI/ICBM declaration or transform artifact is embedded or supplied alongside the source asset. |
| Viewer normalization | **Presentation-only** | `BrainViewer` centers and display-scales the loaded mesh; this cannot be a scientific transform. |
| Mesh bounds | **Not usable for registration** | Bounds cannot determine anatomical origin, orientation, unit scale, or a valid MNI mapping. |

The direct conclusion is **Luna Local coordinate system: unknown as a scientific reference frame**. Luna's local mesh positions remain valid only for the existing presentation and Macro simulation behavior. They are not MNI coordinates and cannot be transformed scientifically with the information presently available.

## 3. Target reference space

The intended target is the explicit reference-space record **MNI ICBM 152 2009c Nonlinear Asymmetric**, in millimetres. The MNI documentation describes it as a 1×1×1 mm nonlinear MRI population template with T1w, T2w, PDw and tissue-probability maps. EBRAINS describes spatial workflows that warp an MRI scan into this template. Neither source provides evidence that an independently mirrored/resized HRA presentation mesh is already expressed in this frame. [4] [5]

| Field | Target-space record |
|---|---|
| Luna registry ID | `ebrains-mni-icbm-152-2009c` |
| Template | ICBM 152 2009c |
| Version | 2009c Nonlinear Asymmetric |
| Units | millimetres |
| Nominal resolution | 1×1×1 mm MRI template |
| Exact GLB relationship | **Unavailable** |

The asset’s Allen source lineage does not remove the template mismatch. The Allen Human Reference Atlas – 3D documentation states that its 141-structure volumetric parcellation was drawn on **MNI ICBM 2009b Nonlinear Symmetric**, whereas the Luna target is **MNI ICBM 152 2009c Nonlinear Asymmetric**. Even if a source-volume-to-GLB artifact were later found, a documented, reproducible chain to the requested 2009c asymmetric target would still be required. [6]

## 4. Allen, Tissue, Molecular, and Cellular evidence

The Allen Human Brain Atlas API documents donor-specific MR-space sample coordinates and donor-MR-to-MNI alignment through `Alignment3d`. These are provider-side donor/sample pathways, not a registration for the HuBMAP Brain-female GLB. The independent AllenHumanGeneMNI project similarly supplies workflows/artifacts for **Allen donor MRI and sample coordinates** to MNI ICBM NLIN SYM 09c; it does not map this GLB to MNI 2009c asymmetric. [7] [8]

| Scale / provider | Proven spatial representation | Relevant target-space fact | Why Luna targeting remains unavailable |
|---|---|---|---|
| Macro / HRA Brain-female v1.1 | Mirrored/resized anatomical GLB | Scientific local frame undocumented | No mesh-to-source/MNI transform or validation artifact. |
| Tissue / EBRAINS Julich-Brain | 4D NIfTI probabilistic maps and maximum-probability maps | Certain published maps use MNI ICBM 152 2009c Nonlinear Asymmetric | Provider region/map semantics do not yield a Luna point without the missing Luna bridge and documented target selection. |
| Molecular / Allen Human Brain Atlas | Donor MR and sample-coordinate pathways | Provider documents donor-MR-to-MNI alignment | The provider path does not identify this GLB as the donor-MR representation and is not executable in Luna. |
| Cellular / Human Brain Cell Atlas, CELLxGENE | Human single-nucleus transcriptomic metadata from dissections | No whole-brain human MNI-to-Luna coordinate field | Region/cell metadata is not an individual whole-brain spatial target. |
| Cellular research candidate / Allen ABC Atlas | Whole-brain coordinate-resolved MERFISH in mouse CCFv3; limited human regional content | Mouse CCFv3 is not a human MNI bridge | No whole-brain human spatial chain to this GLB. |
| Human CCF candidate / HMBA | Basal-ganglia scoped human CCF with template/annotation assets | Useful future research input only | No transform to the HRA GLB and no whole-brain cell-level bridge. |

Julich-Brain sources explicitly document probability and maximum-probability maps in MNI ICBM 152 (2009c Nonlinear Asymmetric), which supports the accuracy of Luna’s Tissue reference-space/provenance display. It does not authorize the conversion of a region label or voxel into a Luna-local coordinate. [9] [10]

## 5. Registration decision and validation record

**Decision: `MNI REGISTRATION: UNAVAILABLE`.** No direct documented transform, affine, nonlinear deformation field, surface-registration artifact, source-volume-to-mesh map, or landmark-validation dataset was found for the exact HRA v1.1 GLB. No numerical matrix has been placed in the application.

| Required validation | Status | Reason |
|---|---|---|
| Left/right orientation | Not evaluated | GLB orientation and source landmark correspondence are undocumented. |
| Anterior/posterior orientation | Not evaluated | No source coordinate convention or mesh-to-template transform is available. |
| Hippocampal correspondence | Not evaluated | Labels are not landmark coordinate pairs. |
| Ventricular correspondence | Not evaluated | No mapped source-to-target landmark pair or residual measurement exists. |
| Scale / translation / rotation / axis-inversion assessment | Not evaluated | Would require an actual transform artifact and validated landmarks. |

The formal `LunaReferenceRegistration` record in `shared/brainScience.ts` and `server/scientificData/registry.ts` captures this status, the exact source asset/version/checksum, null artifact fields, unknown source units/orientation, authoritative provenance URLs, non-evaluated validation results, and the blockers below. The coordinate service rejects Luna↔MNI requests with `registration-unavailable`; its strict request path also requires a finite coordinate, source and target spaces, compatible units/version, a registered transform ID, and provenance.

## 6. Exact artifact required for completion

A target-template download by itself would **not** complete this work. The missing artifact must establish a reproducible chain from the exact GLB local frame to a documented source representation and then to MNI ICBM 152 2009c Nonlinear Asymmetric.

| Required item | Minimum contents | Why it is necessary |
|---|---|---|
| Mesh-to-source mapping | Exact GLB version/checksum; source volume/surface identity; units; axis orientation; origin; vertex/mesh correspondence or documented transform | Establishes what Luna-local coordinates mean scientifically. |
| Source-to-2009c asymmetric transform chain | Versioned affine and/or nonlinear field with software/method parameters; input/output reference-space IDs; checksums | Resolves the 2009b symmetric / 2009c asymmetric and presentation-mesh gaps without guessing. |
| Landmark-validation package | Anatomical landmark IDs, source/target coordinates, orientation checks, residual/error measures, acceptance criteria | Demonstrates that the chain is not mirrored, axis-inverted, rotated, translated, or scaled implausibly. |
| Provenance and license record | Authoritative source URL/DOI, license, artifact version/date/checksum, allowed derivative use | Makes the registration auditable and reproducible. |
| Independent review outcome | Validation method, reviewer/source, failures and limitations | Prevents an unreviewed numerical artifact from being treated as scientific truth. |

When, and only when, those artifacts exist, Luna can add an offline/server-side transform implementation and test it against the validation package. The browser must remain a lightweight consumer of a versioned validated artifact; it must not perform heavy registration or invent a geometric alignment.

## References

[1]: https://hubmapconsortium.github.io/ccf-releases/v1.1/docs/ref-organs/brain-female.html "HuBMAP CCF Brain-female v1.1"
[2]: https://apps.humanatlas.io/kg-explorer/ref-organ/brain-female/v1.4 "Human Reference Atlas 3D Reference Organ for Brain, Female v1.4"
[3]: https://3d.nih.gov/entries/3DPX-020959 "NIH 3D Brain, Female"
[4]: https://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/ "MNI ICBM 152 Nonlinear Atlases (2009)"
[5]: https://ebrains.eu/data-tools-services/brain-atlases/data-integration/data-integration-resources "EBRAINS Data Integration Resources"
[6]: https://community.brain-map.org/t/allen-human-reference-atlas-3d-2020-new/405 "Allen Human Reference Atlas – 3D, 2020"
[7]: https://brain-map.org/support/documentation/human-brain-atlas-api "Allen Human Brain Atlas API"
[8]: https://github.com/CoBrALab/AllenHumanGeneMNI "AllenHumanGeneMNI"
[9]: https://search.kg.ebrains.eu/instances/ab191c17-8cd8-4622-aaac-eee11b2fa670 "Julich-Brain whole-brain collections of cytoarchitectonic probabilistic maps v2.9"
[10]: https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777 "Julich-Brain Atlas cytoarchitectonic maps v3.1"
[11]: https://data.humancellatlas.org/hca-bio-networks/nervous-system/atlases/brain-v1-0 "Human Brain Cell Atlas v1.0"
[12]: https://brain-map.org/bkp/explore/abc-atlas "Allen Brain Cell Atlas"
[13]: https://alleninstitute.github.io/CCF-MAP/descriptions/human_BG_ccf.html "HMBA Adult Human Brain Atlas"

---

**Reproduction:** From the repository root, run `python3 scripts/inspect-luna-glb-registration.py` and compare the reported SHA-256 with this record. The script is an asset-metadata audit tool only; it does not register, transform, or validate coordinates.
