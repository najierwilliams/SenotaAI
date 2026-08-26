# P33 Scientific Registration Review: Luna/HRA Brain-Female GLB to MNI ICBM 152 2009c Nonlinear Asymmetric

> **Decision — 2026-08-26:** **NO, not currently registrable as a reproducible and independently validated Luna-native transform.** The exact Luna/HRA Brain-Female / `Allen_F_Brain.glb` asset is authentic and byte-verified, and its published HRA reference-object placement is valid in HRA Brain-Female and HRA CCF body contexts. However, no authoritative artifact chain establishes its native GLB coordinates in **MNI ICBM 152 2009c Nonlinear Asymmetric**. The operational quality gate is therefore **`NOT_ESTABLISHED`**. Luna emits **no** Luna-native-to-MNI or MNI-to-Luna coordinate, and a Luna coordinate cannot query Julich-Brain.

This review follows an evidence-first standard. It does **not** infer a transform from raw mesh bounds, origin, centroid, name similarity, visual alignment, display scaling, HRA body placement, or an anatomy label. It does **not** modify, resample, mirror, regenerate, replace, or redistribute the immutable production GLB.

## Scope, target, and decision standard

The question assessed is whether the exact production mesh can be reproducibly transformed from its native asset frame to the **MNI ICBM 152 2009c Nonlinear Asymmetric** template. The target is specifically the asymmetric 2009c release at 1 mm sampling, not ICBM 2009b symmetric, 2009b asymmetric, MNI 6th generation, Colin27, fsaverage, BigBrain, an Allen donor-MR volume, or viewer coordinates. The MNI/BIC catalog distinguishes 2009b 0.5 mm templates from 2009c 1 mm templates and identifies distinct symmetric and asymmetric releases.[^4]

| Gate requirement | Required for `VALIDATED` | Result for exact Luna GLB | Consequence |
| --- | --- | --- | --- |
| Exact source identity | Immutable file/version/checksum | **Present** — byte-identical official HRA asset | Necessary but insufficient |
| Native coordinate declaration | Units, axes, handedness, origin, and frame semantics | **Missing** for raw GLB | No source coordinate can be interpreted as MNI-ready |
| Mesh-to-Allen-volume correspondence | Published generation recipe, per-vertex correspondence, or voxel mapping bound to the checksum | **Missing** | Allen annotation volume cannot be silently substituted for the GLB |
| Direction-specific transform artifact | Executable affine/deformation/surface transform with hashes and method | **Missing** | No mathematical Luna-native → MNI path exists |
| ICBM 2009b symmetric → 2009c asymmetric chain | Explicit artifact if the Allen 2009b reference is used upstream | **Missing** | A 2009b source cannot be relabeled as 2009c |
| Independent landmark validation | Source/target pairs, residuals, quality metrics, and independent review | **Missing** | Accuracy and error are unknown |

A candidate may be stored only as **`EXPERIMENTAL`** if it is separately identified and never represented as a scientific fact. Only **`VALIDATED`**, with an executable checksum-bound artifact and passed independent validation, may enable a future Luna-native coordinate conversion. **`PROVIDER_VALIDATED`** denotes a provider relation that remains non-executable or non-independently validated by Luna; it does not enable Luna. **`REJECTED`** records a disqualified candidate. The present **`NOT_ESTABLISHED`** state is intentionally non-transformable.

## Immutable source-asset provenance and integrity

The repository file `client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb` was compared directly with the official HRA v1.1 `Allen_F_Brain.glb` asset. `sha256sum` produced the same digest for both files, and `cmp -s` confirmed byte identity. The official HRA record explains that the model uses one half of the Allen Human Reference Atlas – 3D, 2020 brain, mirrors it to a whole brain, and resizes it to fit Visible Human bodies.[^1][^2]

| Property | Verified value | Evidence and permitted interpretation |
| --- | --- | --- |
| Local file | `client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb` | Immutable production source; it was not modified during P33 |
| Official asset | `Allen_F_Brain.glb` | HRA Brain-Female v1.1 asset URL [^3] |
| SHA-256 | `c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc` | Repository and official downloaded asset are byte-identical |
| Byte length | 11,977,884 bytes | Direct local inspection |
| HRA record | HuBMAP Brain-Female v1.1, DOI `10.48539/HBM724.XTTN.487` | Published 2021-12-01; CC BY 4.0 [^1] |
| GLB container | glTF 2.0; 286 nodes; 283 meshes/primitives; two materials; no skins, animations, or cameras | Read-only structural inspection |
| Exporter | Babylon.js glTF exporter for Autodesk Maya 2022.2 | Embedded glTF asset metadata; not a registration declaration |
| Native axes/handedness/origin | **Not declared** | No source artifact establishes this as a scientific MNI-compatible frame |
| Native units | **Not declared by the GLB** | HRA placements use millimetres; that does not by itself define the raw GLB’s coordinate convention |

All GLB node transforms are identity in the inspected container. This fact does **not** establish an anatomical axis convention, physical unit, origin, scale, or transform to an external reference frame. Likewise, accessor bounds are container metadata only; P33 deliberately does not use them to form, validate, or constrain a registration.

## What the official HRA artifacts establish—and what they do not

The HRA v1.1 graph declares a raw-object placement from `Allen_F_Brain.glb` to the HRA Brain-Female reference object with unit scale, a −90° X rotation, and translation **[74.68038, −711.022258, 148.092479] mm**. It also declares a distinct HRA Brain-Female global placement into the HRA CCF body graph.[^2] Those are valid HRA reference-object/body relations for the checksum-pinned asset. They do not name MNI/ICBM, Julich, BigBrain, clinical stereotaxy, or a provider coordinate frame; nor do they provide landmark pairs, residuals, an affine matrix, a deformation field, or an executable GLB-to-MNI operation.

| Source artifact | What it authoritatively provides | What it does **not** provide |
| --- | --- | --- |
| HRA Brain-Female v1.1 record [^1] | Allen-derived, mirrored, resized whole-brain provenance; version, DOI, license | A native GLB→MNI transform or validation |
| HRA graph JSON [^2] | Raw GLB→HRA Brain-Female local placement; Brain-Female→HRA CCF body placement; HRA dimensions in millimetres | MNI target, raw axes/handedness, MNI transform, error metrics |
| HRA `metadata.yaml` [^5] | Data-table inventory and provenance | Mesh-generation correspondence, raw source coordinate declaration, landmarks |
| HRA `crosswalk.csv` [^6] | Node-name to anatomy/ontology labels | Coordinates, transforms, per-vertex or per-voxel mapping |
| HRA reference-object repository mappings [^7] | `Allen_F_Brain` anatomy labels and reference-object context | MNI/ICBM registration artifact or brain landmark pairs |

The repository search also returned generic Visible-Human extraction-site and landmark-label CSVs. Those files enumerate organ and extraction-site labels; they are not paired, numeric source/target brain landmarks and contain neither MNI target coordinates nor residuals. They therefore cannot validate any GLB registration.

## Allen Human Reference Atlas 3D context is not an asset transform

The Allen Institute states that the **Allen Human Reference Atlas – 3D, 2020, version 1.0.0** is a 141-structure volumetric parcellation drawn on **ICBM 2009b Nonlinear Symmetric**.[^8] It distributes annotation volumes and ITK-SNAP examples. Its mesh guidance instructs users to generate surfaces by loading the annotation/segmentation NIfTI data into ITK-SNAP and exporting surface meshes.[^9] That is a valid method for generating a new mesh from an Allen volume; it is not evidence that the released HRA GLB was generated by that procedure, preserves a known correspondence to those voxels, or is registered to MNI 2009c.

The project’s retained Allen evidence record documents the released annotation volume as 0.5 mm voxels in an ICBM 2009b Nonlinear Symmetric RAS qform, with a 394 × 466 × 378 volume and origin (−98, −134, −72) mm. This validates the annotation volume’s own reference-frame metadata, not the unrelated raw HRA GLB frame. The official `annotation.nii.gz` endpoint is an `application/x-gzip` NIfTI payload whose current response advertises 1,117,842 bytes; its small compressed label-map size must not be mistaken for a per-vertex registration package.[^10]

| Distinct object/reference frame | Role in P33 | May be substituted for the raw Luna GLB? |
| --- | --- | --- |
| Raw `Allen_F_Brain.glb` / Luna asset frame | Exact checksum-pinned source asset | No — this is the source under review |
| HRA Brain-Female v1.1 | HRA reference object reached by published placement | No — HRA placement is not MNI |
| HRA CCF body graph | HRA body assembly context | No — body context is not neuroimaging stereotaxy |
| Allen Human Reference Atlas 3D 2020 / ICBM 2009b Symmetric | Upstream volumetric parcellation context | No — no GLB correspondence is published |
| MNI ICBM 152 2009c Nonlinear Asymmetric | Required target | No — must be the declared final target |
| Allen donor-MR coordinates | Donor-specific provider context | No — donor MR is not this HRA GLB |
| BigBrain | Independent histological reference | No — no Luna↔BigBrain chain exists |
| Julich-Brain v3.1 | Provider tissue atlas in its declared MNI space | No — MNI query input must be independent of Luna |

The MNI catalog makes the 2009b/2009c distinction material: 2009b provides 0.5 mm symmetric and asymmetric templates, whereas 2009c provides 1 mm symmetric and asymmetric templates; the site notes differing sampling across releases.[^4] A published 6th-generation→2009b ANTs transform exists as a distinct external dataset, demonstrating why a transform artifact must be named and versioned; it does not supply a 2009b symmetric→2009c asymmetric conversion and has no connection to the HRA GLB.[^11]

## Validation evidence and quality metrics

No usable landmark table, independent validation set, residual distribution, overlap statistic, surface-distance statistic, registration confidence interval, transform file hash, or target-space quality report was found for the exact source checksum. The HRA record confirms source provenance, but provenance is not a spatial validation measurement. The required landmarks below remain explicitly **not evaluated**, not zero-error and not estimated.

| Required validation dimension | Required independent evidence | P33 result | Reportable residual / metric |
| --- | --- | --- | --- |
| Left/right | Paired source and MNI 2009c landmark coordinates | Missing | Not available |
| Anterior/posterior | Paired source and MNI 2009c landmark coordinates | Missing | Not available |
| Superior/inferior | Paired source and MNI 2009c landmark coordinates | Missing | Not available |
| Deep anatomy | Independent, unambiguous landmarks such as ventricular/commissural/deep-nuclear features | Missing | Not available |
| Whole-brain/surface fit | Defined mask/surface correspondence and predeclared metric | Missing | Not available |
| Final independent assessment | Held-out landmarks plus reproducible method, tool version, inputs, and artifact hashes | Missing | Not available |

The absence of residuals means no numerical localization accuracy may be stated. It also means a visually plausible alignment, a scale/rotation/translation trial, or a new registration computed from an unproven mesh geometry would be **experimental research**, not a Luna scientific transform. P33 therefore creates no candidate affine or nonlinear field.

## Exact missing artifacts and manual acquisition plan

The table is intentionally concrete about what is unavailable. “Not published/found” means that the targeted official HRA, HuBMAP, Allen, MNI, and HRA reference-object repository review did not identify a public artifact for this checksum-bound chain as of 2026-08-26. It does not assert that an unreleased artifact cannot exist.

| Missing item | Required provider / version / source URL | Expected format and approximate size | License/status | Manual acquisition and acceptance plan |
| --- | --- | --- | --- | --- |
| **Checksum-bound GLB generation provenance** | HuBMAP HRA Brain-Female v1.1 / Allen Institute source workflow; current public record [^1][^2][^5] | Editable source mesh/project or manifest plus deterministic script; format unknown (for example Maya/FBX plus source manifest); **no public package/size identified** | HRA release is CC BY 4.0; separate source-project terms unknown | With user authorization, request a versioned, checksum-binding generation manifest from the HRA/asset maintainer. Accept only if it names inputs, transformations, mirroring/resizing operations, native units/axes/origin, tool versions, and output checksum. Do not replace the GLB. |
| **GLB ↔ Allen annotation correspondence** | Allen Human Reference Atlas – 3D 2020 v1.0.0; public annotation endpoint [^10] | Per-vertex correspondence, voxel-to-mesh lookup, or deterministic surface-generation record; CSV/TSV/JSON plus script; **not published** | Allen atlas CC BY 4.0 since 2022-09-01 [^8] | Download/use annotation data locally only after license review. Obtain or reconstruct correspondence only if upstream maintainers provide a reproducible procedure bound to the exact GLB—not an independently regenerated look-alike mesh. |
| **Raw GLB → ICBM 2009b Symmetric transform** | HRA/Allen source pipeline; no official public URL identified | Direction-specific affine `.mat`/`.xfm` or nonlinear field `.h5`/NIfTI plus metadata; **not published** | Unknown because no artifact is published | Require source/target definitions, coordinates, units, axes, interpolation semantics, invertibility, code/tool version, and SHA-256. Record as `EXPERIMENTAL` until independently validated. |
| **ICBM 2009b Symmetric → 2009c Asymmetric transform** | MNI/BIC ICBM 152 NLin 2009 catalog [^4]; exact 2009c target package is available as a 57 MB NIfTI zip | Executable directional transform plus inverse if claimed; `.xfm`, `.h5`, or documented reproducible workflow; **no pairwise artifact identified** | MNI/BIC catalog permission notice applies to templates; artifact status unavailable | Do not infer from matching template names or sample grids. Obtain a versioned conversion artifact from a responsible source or develop a separately documented experimental template-registration study only after the upstream GLB correspondence exists. Validate against 2009c Asymmetric, not 2009b. |
| **Independent landmark-pair validation data** | Independent neuroanatomy/registration validator; no published HRA GLB→MNI set identified | Side- and landmark-defined CSV/TSV/JSON, at least bilateral/AP/SI coverage, plus held-out set; **not published** | Provider/license unknown | Curate independently from transform fitting. Each row must include source coordinate/frame, target MNI 2009c Asym coordinate/frame, landmark definition, observer/protocol, and uncertainty. Preserve provenance and hashes. |
| **Validation report and quality metrics** | Independent validator; no public report identified | Versioned report (Markdown/PDF) plus machine-readable metric output; expected small (<10 MB) but **no public file** | Provider/license unknown | Pre-register acceptance criteria; report landmark residuals in millimetres, distribution and max values, directional bias, outlier policy, surface/volume overlap where valid, and held-out performance. Bind report to source and transform hashes. |

No provider should be contacted, no credentials should be used, and no unpublished data should be acquired automatically without the user’s explicit authorization. Before any artifact is incorporated, its license must permit local use and any intended redistribution; raw third-party data should remain outside Git and Vercel unless explicitly licensed and approved for that purpose.

## Safe implementation outcome

P33 adds a first-class registration-quality gate to the shared and server-authoritative record. The legacy availability field remains for compatibility, while the scientifically meaningful decision is now explicit. The transform service recognizes both Luna viewer-local and raw HRA GLB source identifiers as Luna-native when paired with the declared MNI 2009c target, checks finite coordinates and declared units, and then refuses the request under `NOT_ESTABLISHED` before it can return a coordinate. It also rejects the reverse MNI→raw-GLB direction.

| P33 control | Behaviour now | Prohibited outcome |
| --- | --- | --- |
| Luna-native → MNI 2009c | `registration-not-established`; no `coordinate` field | Invented/visual/affine conversion |
| MNI 2009c → raw Luna GLB | `registration-not-established`; no `coordinate` field | Projecting provider points into viewer geometry |
| Raw GLB wrong units | `invalid-units` before registration | Treating mesh-space values as voxels or arbitrary units |
| Supplied registered-looking transform ID | Still blocked if quality gate is not `VALIDATED` | Bypassing provenance with a string identifier |
| HRA raw→Brain-Female→CCF body placement | Preserved in its own HRA contract | Promoting HRA placement to MNI |
| Structure identity / Julich mapping | Preserved independently; released result remains 0 AUTHORITATIVE, 0 PROBABILISTIC, 0 REQUIRES_DOMAIN_REVIEW, 102 UNMAPPED | Using a spatial hypothesis to change ontology mapping |
| Direct MNI → Julich form | Preserved only for an independently known finite coordinate in MNI 2009c millimetres | Reverse-use of Luna/viewer/selected-structure coordinates |
| Nanobots | Macro mesh-target simulation remains available under existing safeguards | Enabling tissue/cellular/molecular/subcellular operation or coordinate-resolved targeting |

The Inspector now labels the registration **NOT ESTABLISHED**, names the exact checksum-bound source asset, states that no Luna-native or reverse-MNI coordinate is emitted, and retains the separately guarded direct MNI→Julich provider form. It does not add a coordinate picker, target control, lower-scale deployment affordance, or a transform download.

## Reproducibility checks

The P33 repository includes `scripts/inspectLunaGlb.mjs`, a read-only GLB structure inspector. It reads the immutable GLB and writes a local report to `/tmp` (or `LUNA_GLB_INSPECTION_OUTPUT`); it neither rewrites the asset nor derives a registration. The P33 verification ran the following check, confirmed the expected checksum before and after inspection, and reported glTF 2.0 / 11,977,884 bytes / 286 nodes / 283 primitives.

```bash
cd /home/ubuntu/SenotaAI
sha256sum client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb
# Expected: c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc

LUNA_GLB_INSPECTION_OUTPUT=/tmp/luna-glb-inspection-p33.json \
  node scripts/inspectLunaGlb.mjs

sha256sum client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb
# The checksum must remain unchanged.
```

The direct official asset comparison used:

```bash
sha256sum /tmp/Allen_F_Brain.glb \
  client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb
cmp -s /tmp/Allen_F_Brain.glb \
  client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb \
  && echo byte-identical
```

The temporary official copy was deleted after byte comparison. The generated inspection JSON is intentionally not versioned, and neither raw GLB accessor data nor inspected bounds is used in any transform.

## Boundary statement

**Luna coordinates cannot query Julich-Brain.** A Julich query may be made only from a user-supplied, independently known finite coordinate in the provider-declared **MNI ICBM 152 2009c Nonlinear Asymmetric** reference and millimetres. It is not invertible to Luna under P33. The released ontology mapping remains independently **0/0/0/102** and unchanged.

**BigBrain remains independent scientific reference context.** Published BigBrain-to-MNI or BigBrain-to-other-template work has no implication for Luna unless a separately documented, checksum-bound and validated Luna chain is established. No BigBrain coordinate, tissue claim, or microscopic localization is emitted from the Luna mesh.

**Nanobot scope is unchanged.** The current system remains **Macro mesh-target simulation only**. P33 does not enable tissue, cellular, molecular, or subcellular operation; it does not create clinical, surgical, stereotactic, therapeutic, diagnostic, or real-world targeting capability.

## Conclusion

The appropriate answer is **“possible with additional source data, but not presently established.”** The exact GLB is verified and its HRA placement is real, but neither fact supplies the required registration chain to MNI ICBM 152 2009c Nonlinear Asymmetric. No transform was built, no candidate was guessed, no coordinates were emitted, and the app now makes that scientific boundary operational and visible. A future milestone may revisit this only after all missing artifacts are acquired with explicit authorization and an independently validated, checksum-bound, direction-specific chain is accepted.

## References

[^1]: [Human Reference Atlas: Brain-Female v1.1 persistent record](https://purl.humanatlas.io/ref-organ/brain-female/v1.1). HuBMAP, DOI: `10.48539/HBM724.XTTN.487`, CC BY 4.0.
[^2]: [HRA Brain-Female v1.1 machine-readable spatial graph](https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json).
[^3]: [Official HRA Brain-Female v1.1 `Allen_F_Brain.glb` asset](https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/assets/Allen_F_Brain.glb).
[^4]: [MNI/BIC: ICBM 152 Nonlinear Atlases, version 2009](https://www.bic.mni.mcgill.ca/ServicesAtlases/ICBM152NLin2009).
[^5]: [HRA Brain-Female v1.1 raw metadata](https://raw.githubusercontent.com/hubmapconsortium/hra-kg/main/digital-objects/ref-organ/brain-female/v1.1/raw/metadata.yaml).
[^6]: [HRA Brain-Female v1.1 node/anatomy crosswalk](https://raw.githubusercontent.com/hubmapconsortium/hra-kg/main/digital-objects/ref-organ/brain-female/v1.1/raw/crosswalk.csv).
[^7]: [HuBMAP CCF 3D Reference Object Library](https://github.com/hubmapconsortium/ccf-3d-reference-object-library), including its Brain-Female mapping and extraction-landmark label files.
[^8]: [Allen Institute: Allen Human Reference Atlas – 3D, 2020](https://community.brain-map.org/t/allen-human-reference-atlas-3d-2020-new/405), version 1.0.0, RRID:SCR_017764.
[^9]: [Allen Institute: Human Brain Atlas Mesh Files](https://community.brain-map.org/t/human-brain-atlas-mesh-files/560).
[^10]: [Allen Human Reference Atlas 3D 2020 annotation NIfTI](https://download.alleninstitute.org/informatics-archive/allen_human_reference_atlas_3d_2020/version_1/annotation.nii.gz).
[^11]: [Horn, A. MNI T1 6thGen NLIN to MNI 2009b NLIN ANTs transform](https://doi.org/10.6084/m9.figshare.3502238), CC BY 4.0. This is cited as an example of a separately distributed template transform, not as a Luna registration artifact.

---

**P33 status:** `NOT_ESTABLISHED` · **Target:** MNI ICBM 152 2009c Nonlinear Asymmetric · **Luna→MNI:** disabled · **MNI→Luna:** disabled · **Luna→Julich:** disabled · **Nanobots:** Macro simulation only.
