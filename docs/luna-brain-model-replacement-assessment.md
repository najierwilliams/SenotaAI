# Luna Brain Model Replacement Assessment

**Status:** Research and candidate-discovery only.  
**Assessment date:** August 26, 2026.  
**Scope constraint:** This assessment does **not** replace any brain asset, alter Luna’s viewer or scientific services, create a transform, modify Navigator, Inspector, nanobots, or Macro simulation, commit code, or deploy an application change.

## Decision at a glance

> **The strongest evidence supports a layered scientific architecture, not a new monolithic GLB.** The siibra/EBRAINS Multilevel Human Brain Atlas is the strongest scientific spatial backbone; Julich-Brain is the strongest tissue-scale assignment and identity layer; BigBrain is the strongest microscopic reference model with a documented transform/validation route to standard MRI spaces. None of the reviewed candidates is simultaneously a distribution-cleared, high-fidelity, whole-brain, structure-selectable WebGL replacement and the complete multimodal spatial ecosystem Luna needs. [1] [2] [3]

The current HRA Brain-Female v1.1 `Allen_F_Brain.glb` remains visually valuable, but it must continue to be treated as a **presentation-only model**. It must not yield MNI coordinates or provider queries. The scientific foundation should be replaced by a provider-declared canonical reference-space backbone, with every query carrying reference-space, version, transform, and provenance information.

## Assessment rules

The comparison separates **visual presentation**, **scientific spatial anchoring**, **atlas/parcellation identity**, and **observation providers**. A visual fit, shared anatomical label, similar mesh bounds, a camera transform, or a generic template name never establishes spatial registration. A model may support Luna-derived MNI/Julich queries only when the exact source asset is native to the declared space or has a provider-documented, direction-specific transform chain with retained validation evidence.

The 0–10 scores below have a narrow interpretation: 0 means unsupported or materially unsuitable, 5 means partial or conditional, and 10 means strong provider-documented support for the stated criterion. The overall score is the equal-weight mean across 16 requested criteria, calculated deterministically. It is a transparent comparison aid, **not** a substitute for hard scientific and license gates.

## Candidate comparison

| Rank | Candidate | Provider / version considered | Primary role | Overall / 10 | Principal strength | Principal blocker |
|---:|---|---|---|---:|---|---|
| 1 | siibra / EBRAINS Multilevel Human Brain Atlas | Current siibra API v3.0 and EBRAINS Human Brain Atlas | Spatial backbone and provider integration | **8.62** | Reference spaces, transforms, Julich, BigBrain, multimodal features, HTTP API | Not a single visual mesh; asset licenses vary by provider. [1] [2] |
| 2 | Julich-Brain v3.1 | EBRAINS/Julich current release | Probabilistic tissue atlas and regional identity layer | **8.25** | MNI/BigBrain ecosystem, probabilistic cytoarchitecture, provider queries | Atlas/maps are not a ready whole-brain WebGL model; redistribution requires dataset-specific review. [1] [4] |
| 3 | BigBrain + BigBrainWarp | BigBrain 2015 provider space; BigBrainWarp | Microscopic reference model and cross-scale bridge | **7.50** | Actual 3D human brain, 20 µm histology, published/validated standard-space warp workflow | Full data are too large for web; CC BY-NC-SA 4.0 blocks commercial use; web mesh requires exact asset review. [3] [5] |
| 4 | MNI ICBM 2009c + CerebrA | ICBM 2009c; CerebrA repository | Canonical MRI template and open parcellation option | **7.12** | Transparent MNI-native coordinates, reproducible labels/transforms, permissive distribution terms | Volumetric/cortical assets are visually limited; no complete cross-scale provider ecosystem. [6] [7] |
| 5 | Allen DHBAv2 / expanded Allen Human Reference Atlas | Allen CCF-MAP 2025 assets | MNI2009b whole-brain volume and ontology source | **6.81** | Versioned MNI2009b template, whole-brain annotations, HOMBA | Not the selected MNI2009c-asymmetric space; no reviewed web-ready whole-brain mesh. [8] |
| 6 | HCP / fsLR / HCP-MMP ecosystem | HCP-YA 2025 | Cortical surfaces and connectivity provider | **6.62** | High-quality surface/grayordinate and connectivity data; MNI via FNIRT | Not a complete whole-brain atlas replacement; access and redistribution vary; no direct Julich/BigBrain bridge established here. [9] [10] |
| 7 | Current HRA Brain-Female v1.1 GLB | HuBMAP HRA v1.1 `Allen_F_Brain.glb` | Presentation model only | **4.00** | High visual quality, anatomical structure selection, permissive CC BY 4.0 source asset | Exact GLB lacks documented scientific coordinate convention and validated Luna→MNI chain. [11] |

### Sixteen-criterion scoring matrix

| Candidate | Visual | Complete | Coordinates | MNI | Julich | BigBrain | Cellular | Molecular | Connectivity | API | WebGL | Provenance | Validation | License | Integration | Scale | Mean |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Current HRA GLB | 8 | 8 | 1 | 1 | 1 | 1 | 2 | 2 | 1 | 1 | 9 | 5 | 1 | 9 | 9 | 5 | 4.00 |
| siibra / EBRAINS backbone | 6 | 9 | 9 | 10 | 10 | 10 | 9 | 9 | 9 | 10 | 7 | 9 | 9 | 4 | 8 | 10 | **8.62** |
| BigBrain + BigBrainWarp | 8 | 8 | 8 | 9 | 10 | 10 | 8 | 7 | 7 | 6 | 6 | 10 | 8 | 2 | 4 | 9 | 7.50 |
| Julich-Brain v3.1 | 6 | 9 | 9 | 10 | 10 | 10 | 8 | 8 | 8 | 9 | 6 | 10 | 10 | 3 | 7 | 9 | 8.25 |
| Allen DHBAv2 | 5 | 8 | 9 | 9 | 5 | 4 | 7 | 8 | 7 | 6 | 4 | 9 | 8 | 5 | 7 | 8 | 6.81 |
| MNI ICBM 2009c + CerebrA | 4 | 7 | 10 | 10 | 9 | 7 | 2 | 5 | 6 | 4 | 5 | 9 | 10 | 10 | 8 | 8 | 7.12 |
| HCP / fsLR / HCP-MMP | 7 | 5 | 9 | 9 | 5 | 4 | 3 | 3 | 10 | 7 | 8 | 9 | 9 | 5 | 5 | 8 | 6.62 |

The score for **licensing** is intentionally conservative where a platform brokers resources under multiple provider terms. A public API or download page is not a license to redistribute a source mesh in Luna.

## Candidate evidence and interoperability

### 1. siibra / EBRAINS Multilevel Human Brain Atlas

EBRAINS describes its human atlas as a multilevel system with Julich-Brain cytoarchitecture, MNI and other reference spaces, BigBrain integration, molecular/cellular/fibre measurements, functional data, and connectivity. siibra formalises an atlas as a reference space plus template, parcellation maps, and taxonomy, then supports multiple spaces, transformations, region assignment, and multimodal features. The documented feature categories include molecular, cellular, functional, fibres, connectivity, and macrostructural data. [1] [2]

The live provider metadata exposes both a MNI ICBM 152 2009c Nonlinear Asymmetric space and a BigBrain histology space. The MNI 2009c record provides image/mesh formats and left/right cortical fragments; the BigBrain record provides image/mesh formats and left/right grey-matter fragments. The provider record reports `XYZ` anatomical orientation, zero origin values, and micrometre native units for these visual representations, but does not expose a separate handedness field. These details should be stored exactly as supplied, rather than inferred. [12]

| Required attribute | Evidence-backed answer |
|---|---|
| Source/provider/dataset | EBRAINS Multilevel Human Brain Atlas; siibra API v3.0; provider catalogues and reference-space records. [1] [2] |
| Canonical reference candidate | MNI ICBM 152 2009c Nonlinear Asymmetric, siibra ID `minds/core/referencespace/v1.0.0/dafcffc5-4826-4bf1-8ff6-46b8a31ff8e2`. [12] |
| Coordinate properties | Provider metadata: `XYZ`, origin `[0,0,0]`, native unit `µm` for listed visual representations; no separate handedness field reviewed. User-facing MNI coordinates must state the exact provider convention and units used by the query endpoint. [12] |
| MNI / Julich / BigBrain | Strongest reviewed ecosystem: Julich maps occur in multiple spaces; siibra supports provider transformations; EBRAINS describes BigBrain integration with MNI and FreeSurfer. [1] [2] |
| Cellular / molecular / connectivity | Provider feature categories exist, but every feature remains dataset-scoped and may be direct data or metadata-only. [2] |
| Programmatic access | HTTP API supports reference templates, parcellations, regions, maps, and data features. [13] |
| WebGL / asset availability | Provider-hosted mesh/image endpoints exist, but a Luna bundle requires specific asset/version/checksum/license approval. [12] |
| License / redistribution | Mixed and asset-specific. Do not infer permission from API access. |

**Conclusion:** This is the recommended scientific backbone, not an immediate visual replacement.

### 2. Julich-Brain

Julich-Brain provides probabilistic cytoarchitectonic maps for more than 200 areas. Its probabilities encode inter-individual variation in the location and size of brain areas; maximum-probability maps simplify this to a single most-likely assignment and gap maps identify unmapped areas. This makes it the correct tissue-scale assignment layer once a coordinate is proven to be in a supported provider space. [4]

The Julich framework describes BigBrain as a 20 µm reference brain, and identifies BigBrain as one of the individual brains contributing to its cytoarchitectonic maps. It presents interactive exploration and EBRAINS/FTP/LORIS access, but it is fundamentally a probabilistic atlas rather than a single high-detail GLB replacement. [3] [4]

| Required attribute | Evidence-backed answer |
|---|---|
| Source/provider/dataset | Julich Brain Atlas; current provider release evaluated as v3.1. [4] |
| Reference spaces and MNI | Provider ecosystem supports MNI and multiple spaces; the current Luna registry already pins MNI ICBM 152 2009c Asymmetric for direct provider queries. A chosen production record must retain its exact provider ID/version. [1] [12] |
| Coordinate properties | Query semantics depend on the declared provider reference space. Julich cannot interpret an HRA/Luna local coordinate by name or appearance. |
| BigBrain relation | Direct and explicit within the Julich/EBRAINS ecosystem. [3] |
| Ontology / structures | Stable provider region identifiers and parcellation hierarchy; probability maps make uncertainty explicit. [2] [4] |
| Cellular / molecular / connectivity | Accessed through linked siibra/EBRAINS features, with dataset-specific provenance. [2] |
| API / formats | siibra map, region, feature, and assignment interfaces; provider maps include volumetric and surface contexts. [2] [13] |
| License / redistribution | Treat map and mesh licenses as provider-release specific. The reviewed Julich family includes non-commercial ShareAlike terms in EBRAINS records; exact v3.1 terms must be accepted before any redistribution. [14] |

**Conclusion:** Julich eliminates the **tissue-assignment** limitation only for a new canonical anchor that is already in a compatible declared space. It does not register the current HRA GLB.

### 3. BigBrain and BigBrainWarp

BigBrain is a three-dimensional reconstruction of one human brain from 7,404 cell-body-stained histological sections, at nearly cellular 20 µm resolution. The project provides images, volumes, and surfaces through FTP/LORIS and online siibra exploration. It provides cortical-layer, cytoarchitectonic, and microscopic-section contexts, and is a reference brain within the Julich ecosystem. [3] [15]

Critically, BigBrainWarp supplies preprocessed data, scripts, and published transform workflows between BigBrain and standard MRI spaces. Its evaluation workflow describes BigBrain-to-ICBM routes and reports Jacobian deformation measurements, regional Dice overlap, and landmark misregistration in millimetres. This is evidence of a reproducible, evaluated transform **family**, not permission to apply a transform without binding Luna to the exact BigBrain asset and artifact. [5]

| Required attribute | Evidence-backed answer |
|---|---|
| Source/provider/dataset | BigBrain ultrahigh-resolution whole-brain model (2015); BigBrain histology provider space. [3] [12] |
| Native reference space | Individual BigBrain histological space, not native MNI. Provider metadata lists `XYZ`, zero origin values, and `µm`; no separate handedness field was reviewed. [12] |
| MNI relationship | BigBrainWarp documents published nonlinear paths to ICBM2009sym and ICBM2009asym, including validation outputs. [5] |
| Julich relationship | BigBrain is a Julich microscopic reference/contributing brain. [3] |
| Cellular / microstructure | Very strong: histology, cortical layers, cytoarchitecture, and selected microscopic scans. [3] |
| Molecular / connectivity | Provider-linked and multilevel, not guaranteed as a coordinate-resolved whole-brain layer by the visual mesh alone. [1] [2] |
| Visual/web practicality | Surfaces exist, but full 20 µm data are not web-appropriate. The reviewed provider default mesh fragments are cortex/grey matter; a complete anatomy-preserving web model needs specific evaluation. [12] |
| License / redistribution | **CC BY-NC-SA 4.0**: non-commercial-only sharing/adaptation, attribution, ShareAlike, and no added downstream restrictions. This is incompatible with a commercial/proprietary bundled Luna asset unless a separate license is obtained. [16] |

**Conclusion:** BigBrain is the best research-grade scientific brain **model**, but it is not yet the best production Luna visual replacement because of license and web-delivery constraints. It is the strongest optional microscopic bridge if the intended Luna use is demonstrably non-commercial or a separate license is granted.

### 4. MNI ICBM 2009c and CerebrA

MNI’s ICBM 152 nonlinear family contains several symmetric/asymmetric and resolution-specific templates. The official distribution explicitly cautions that the templates represent the same anatomy with differing sampling/pre-processing; a specific variant must therefore always be named. It provides structural modalities, tissue probability maps, masks, and downloadable volumetric files. [6]

CerebrA is a manually edited cortical/subcortical atlas registered nonlinearly to the **symmetric MNI-ICBM2009c** template. It ships NIfTI/MINC labelled volumes, transform files, scripts, metadata, and a CC0 1.0 licence. Its native target is **symmetric 2009c**, which must not be silently substituted for the siibra Julich target **2009c Nonlinear Asymmetric**. [7]

| Required attribute | Evidence-backed answer |
|---|---|
| Source/provider/dataset | MNI ICBM 152 nonlinear atlases (2009); CerebrA 2020 repository. [6] [7] |
| Reference space | MNI template family; CerebrA specifically MNI-ICBM2009c symmetric. [6] [7] |
| Transform / validation | CerebrA ships transform/scripts and derives from nonlinear registration plus manual correction. [7] |
| Julich / BigBrain | MNI is a major provider reference, but specific relationships require the named target variant and provider chain. [1] [5] |
| Visual/web practicality | The reviewed assets are volumes and cortical fragments, not an anatomy-complete, selectable 3D WebGL mesh. [6] [7] |
| License | MNI page grants use/copy/modify/distribution under its stated notice; CerebrA is CC0. [6] [7] |

**Conclusion:** This is the cleanest MNI-native coordinate/label solution, but is scientifically and visually incomplete as Luna’s sole brain asset.

### 5. Allen human resources: DHBAv2, HMBA, and AHBA

Allen’s DHBAv2 is a whole-brain 3D CCF that parcellates the **MNI152 ICBM2009b symmetric** template at 500 µm and distributes versioned NIfTI template and gyral/Brodmann annotations. It uses the Harmonized Ontology of the Mammalian Brain Anatomy (HOMBA), intended to support transcriptomic and connectomic integration. [8]

The HMBA adult human basal-ganglia atlas is based on an HCP template coregistered to MNI152 nonlinear space and has versioned NIfTI assets, but it is not a whole-brain replacement. The provider itself notes that some presented subcortical annotations have not yet been manually corrected. [17]

The separate Allen Human Brain Atlas API is a valuable molecular provider: donor sample sites are mapped into donor MRI spaces and the documented brains are registered to MNI for cross-donor comparison. It supports expression/MRI downloads and analytical services. It is an observation provider, not a canonical WebGL model. [18]

**Conclusion:** Allen DHBAv2 is a strong versioned whole-brain *volume* anchor when its MNI2009b symmetric target is explicitly selected. It neither establishes a 2009b-to-2009c-asymmetric mapping for Luna nor supplies a reviewed whole-brain visual mesh. AHBA should remain an MNI-addressable molecular provider with donor/MR provenance intact.

### 6. HCP / fsLR / HCP-MMP ecosystem

HCP-YA 2025 is a large, actively maintained research release with updated 3T/7T processing. HCP’s public documentation states that relevant CIFTI voxels are in MNI space via FNIRT, while surface coordinates are separate `.surf.gii` files. CIFTI combines surface vertices and subcortical voxels as “grayordinates” and includes dense connectivity/time-series contexts. [9] [10]

**Conclusion:** HCP/fsLR is particularly valuable for cortical presentation, multimodal parcellation, and connectivity. It is not a complete whole-brain MNI/Julich/BigBrain anchor, and its access/restricted-data distinction precludes assuming that a surface can be bundled into Luna.

### 7. Current HRA Brain-Female v1.1 GLB

The current Luna binary is byte-identical to HRA Brain-Female v1.1 `Allen_F_Brain.glb` and is a legitimate anatomical/presentation asset. However, the HRA graph supplies HRA placement context rather than a provider-declared raw-GLB scientific coordinate convention, source volume correspondence, MNI transform artifact, or landmark-validation set. Previous review correctly kept Luna→MNI `NOT_ESTABLISHED`. [11]

**Conclusion:** Retain it for visual presentation and Macro simulation; do not use it as the scientific anchor.

## Scientific interoperability comparison

| Capability | siibra / EBRAINS | Julich-Brain | BigBrain + Warp | MNI / CerebrA | Allen DHBAv2 / AHBA | HCP / fsLR | Current HRA GLB |
|---|---|---|---|---|---|---|---|
| Direct MNI-space operation | Yes, provider-declared spaces | Yes, in supported provider spaces | Via named published transform artifacts | Yes, template-native | MNI2009b symmetric, not 2009c asymmetric | Volumes via FNIRT | No |
| Julich tissue assignment | Yes | Native role | Through validated/provider route only | Possible only after precise space chain | Requires explicit chain | Requires explicit chain | No |
| BigBrain bridge | Yes | Native ecosystem | Native model | Through exact transform chain | Not established in reviewed sources | Not established in reviewed sources | No |
| Cellular information | Provider feature availability; dataset-specific | Provider-linked | Histology/cortical layers; not universal cell positions | No | Annotation/ontology basis; data-provider dependent | No primary cell layer | No |
| Molecular information | Provider features, dataset-scoped | Provider-linked | Multilevel links, not universal per-vertex molecular values | No | AHBA MNI-linked donor samples | Limited/not primary | No |
| Connectivity | Provider features | Provider-linked | Research integration only | No native broad system | Ontology/framework path | Strongest dedicated source | No |
| Web presentation | Provider viewer/API or selected mesh | Atlas visualisation/maps | Conditional surface; license gate | Volume/cortical fragments | Neuroglancer/volumes | GIFTI/CIFTI conversions | Strong existing model |

## Recommended architecture

```text
Presentation layer
  └─ Existing HRA Brain-Female v1.1 GLB
     └─ visual selection and Macro simulation only
     └─ explicitly NOT an MNI/Julich coordinate source

Scientific spatial backbone
  └─ siibra / EBRAINS provider ecosystem
     └─ Canonical provider reference: MNI ICBM 152 2009c Nonlinear Asymmetric
        (`minds/core/referencespace/v1.0.0/dafcffc5-4826-4bf1-8ff6-46b8a31ff8e2`)
     └─ Reference-space/version/unit/orientation/provenance required on every query

Tissue/identity layer
  └─ Julich-Brain v3.1 probabilistic maps and provider identifiers
  └─ UBERON/HOMBA as semantic crosswalks only; never as coordinate transforms

Microscopic bridge
  └─ BigBrain provider space plus a named BigBrainWarp artifact only where its
     exact version, direction, target, validation outputs, and license are retained

Observation layer
  ├─ siibra provider features for available region/coordinate-scoped data
  ├─ Allen Human Brain Atlas for MNI-linked donor/sample molecular observations
  ├─ Allen Brain Cell Atlas only at its dataset-native spatial context
  └─ HCP/fsLR for properly licensed surface/connectivity observations

Simulation layer
  └─ Macro remains visually resolved in Luna only
  └─ Tissue/cellular/molecular/subcellular operations remain disabled unless their
     coordinate and dataset-specific capability gates pass
```

This architecture protects both scientific and user-interface integrity. The presentation mesh still supports anatomy selection, visual focus, and Macro simulation. Scientific provider queries remain rooted in a declared canonical space and never fabricate a relation from a visual mesh. A future visual-to-scientific registration may be added only if an exact replacement mesh or a provider-issued transform satisfies the existing quality gate.

## Exact assets to evaluate before any implementation

No asset below should be downloaded or committed in this research phase. These are **procurement/evaluation targets**, not approved application dependencies.

| Priority | Exact asset or service | Purpose | Required acceptance evidence before use |
|---:|---|---|---|
| 1 | siibra MNI ICBM 152 2009c Asymmetric space ID `minds/core/referencespace/v1.0.0/dafcffc5-4826-4bf1-8ff6-46b8a31ff8e2` and its exact provider mesh/image descriptor | Canonical visual/scientific reference metadata | Provider version, full orientation/unit/origin declaration, asset URL/version/checksum, licence, permitted redistribution, and a retained copy of metadata. [12] |
| 2 | siibra API v3.0 reference-space, parcellation, region, map, and feature endpoints | Programmatic backbone; no bulk atlas bundling | API availability/terms, endpoint versioning, caching/rate/attribution policy, provider licence per returned asset. [13] |
| 3 | Julich-Brain v3.1 current provider parcellation and MNI2009c map metadata | Tissue assignment in canonical space | Exact v3.1 licence/attribution, provider IDs, target-space version, returned probability semantics, and no inference from Luna names. [4] |
| 4 | BigBrainWarp transform artifact(s) only if BigBrain is selected | Auditable BigBrain↔ICBM route | Artifact hash, source/target variant, direction, transform type, validation report, landmark/Dice/Jacobian outputs, and commercial licence clearance. [5] |
| 5 | BigBrain surface descriptor `https://neuroglancer.humanbrainproject.eu/precomputed/BigBrainRelease.2015/classif_mesh 100` | Research-only visual evaluation | Confirmation that it is the intended decimation, anatomy coverage review, version/checksum, CC BY-NC-SA compliance or separate licence. [12] [16] |
| 6 | HCP surface/CIFTI derivatives only if connectivity/surface enhancement is needed | Licensed cortical/connectivity observation layer | Exact HCP access agreement, derivative redistribution rights, fsLR/CIFTI/GIFTI identity, and explicit reference-space provenance. [9] [10] |

## Datasets that should **not** be downloaded unnecessarily

The scientific blocker is provenance and reference-space binding, not a shortage of large files. Do **not** download the full BigBrain 20 µm histology, all 7,404 sections, whole HCP releases, every Julich map, all Allen ABC `h5ad` matrices, or generic MNI/Allen volumes merely to search for a visual alignment. The full BigBrain data are exceptionally large and licensed CC BY-NC-SA; HCP and ABC releases are analysis-scale data; their existence does not create a Luna transform. [3] [9] [16] [19]

Do not convert a Neuroglancer endpoint to a bundled GLB, decimate a provider mesh, or redistribute a Julich/BigBrain/HCP derivative until its explicit licence and exact selected version have been reviewed.

## What the replacement architecture solves—and does not solve

| Question | Answer |
|---|---|
| Does it eliminate the current Luna HRA GLB → MNI blocker? | **No for the current GLB.** It eliminates the blocker for **new scientific queries** by refusing to derive them from the GLB and instead using a native/provider-declared MNI anchor. |
| Does it enable Julich queries? | **Yes, conditionally.** A coordinate declared in the selected MNI 2009c provider space can receive a provider-scoped Julich assignment. An HRA/Luna local coordinate still cannot. |
| Does it enable BigBrain/tissue observations? | **Yes, conditionally.** Julich provides tissue-scale probabilistic assignments in supported spaces; BigBrain can be accessed through its provider space and exact validated transform artifacts. |
| Does it provide a path to cellular observations? | **Yes, but not universal coordinates.** siibra/ABC/other providers offer dataset-scoped cellular data. Luna must preserve the dataset’s declared space and never invent a whole-brain cell position. [2] [19] |
| Does it provide a path to molecular observations? | **Yes.** AHBA provides donor-MR/MNI-linked molecular samples; siibra links molecular features. These remain observation provenance, not Luna mesh points. [2] [18] |
| Does it provide connectivity? | **Yes.** siibra exposes connectivity feature categories and HCP provides dedicated dense connectivity/grayordinate contexts. [2] [10] |
| What remains impossible? | Direct scientific coordinate conversion from the current HRA GLB; exact lower-scale targeting from visual selection; unlicensed asset redistribution; universal cell/molecule positions; and any provider query where target-space/version/transform/dataset provenance is absent. |

## Final decision

# HYBRID — KEEP VISUAL BRAIN, REPLACE SCIENTIFIC SPATIAL BACKBONE

The hybrid solution is superior because it preserves Luna’s current visual quality and interface investment while replacing the scientifically weak portion—the attempt to treat an unregistered GLB as a coordinate source—with an existing, provider-authored spatial ecosystem. It does **not** hide the visual/scientific split: the application must label it explicitly and retain the current `NOT_ESTABLISHED` state for the HRA GLB.

A future Option A replacement should be reconsidered only if one of two conditions is met: (1) a commercially compatible BigBrain or MNI-native whole-brain surface becomes available with exact versioned provenance and a documented coordinate binding; or (2) a provider supplies a complete, distribution-cleared mesh whose native space is the chosen siibra MNI reference and which satisfies Luna’s transform-quality gate. Neither condition was verified in this investigation.

## References

[1]: https://ebrains.eu/data-tools-services/brain-atlases/human-brain "EBRAINS Human Brain Atlas"
[2]: https://siibra-python.readthedocs.io/en/latest/concepts.html "siibra main concepts"
[3]: https://julich-brain-atlas.de/atlas/bigbrain "BigBrain | Julich Brain Atlas"
[4]: https://julich-brain-atlas.de/atlas/probabilistic-maps "Julich-Brain probabilistic maps"
[5]: https://bigbrainwarp.readthedocs.io/en/latest/pages/tutorial_evaluation.html "BigBrainWarp transform evaluation"
[6]: https://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/ "MNI ICBM 152 nonlinear atlases (2009)"
[7]: https://gin.g-node.org/anamanera/CerebrA/src/master/ "CerebrA repository and metadata"
[8]: https://alleninstitute.github.io/CCF-MAP/descriptions/human_ccf.html "Allen DHBAv2 human CCF"
[9]: https://www.humanconnectome.org/study/hcp-young-adult/document/hcp-young-adult-2025-release "HCP Young Adult 2025 release"
[10]: https://wiki.humanconnectome.org/docs/HCP%20Users%20FAQ.html "HCP Users FAQ"
[11]: https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json "HRA Brain-Female v1.1 graph"
[12]: https://siibra-api-stable.apps.hbp.eu/v3_0/spaces?size=100 "siibra reference-space metadata"
[13]: https://ebrains.eu/data-tools-services/tools/siibra-api "siibra API"
[14]: https://search.kg.ebrains.eu/instances/7ad727a1-537d-4f80-a69b-ac8b184a823c "EBRAINS Julich-Brain v3.0.2 licensing record"
[15]: https://bigbrainproject.org/maps-and-models.html "BigBrain maps and models"
[16]: https://ftp.bigbrainproject.org/bigbrain-ftp/License.txt "BigBrain data licence"
[17]: https://alleninstitute.github.io/CCF-MAP/descriptions/human_BG_ccf.html "Allen HMBA adult human basal-ganglia atlas"
[18]: https://brain-map.org/support/documentation/human-brain-atlas-api "Allen Human Brain Atlas API"
[19]: https://alleninstitute.github.io/abc_atlas_access/intro.html "Allen Brain Cell Atlas data access"
[20]: https://ebrains.eu/data-tools-services/brain-atlases/data-integration/human-mri-volumes "EBRAINS MRI-to-MNI integration guidance"
