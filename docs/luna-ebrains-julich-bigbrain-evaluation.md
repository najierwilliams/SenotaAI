# Luna Brain EBRAINS / Julich-Brain / BigBrain Evaluation

**Author:** Manus AI

**Date:** August 25, 2026

**Decision:** **B — EBRAINS is scientifically better but not a practical drop-in foundation**

**Migration status:** **NOT STARTED**

**Recommendation:** **USE EBRAINS AS A SCIENTIFIC BACKEND WHILE KEEPING THE CURRENT MODEL VISUALLY**

## Executive conclusion

EBRAINS, siibra, Julich-Brain, and BigBrain provide a materially stronger **scientific ecosystem** than the current Luna visual asset: formally identified reference spaces, probabilistic cytoarchitectonic maps, region-linked multimodal features, high-resolution histology, and documented spatial-query tooling. However, none of the evaluated assets is a legally clear, complete, browser-ready, interaction-compatible replacement for Luna’s checksum-pinned HRA `Allen_F_Brain.glb`. The existing Luna GLB remains the only asset that currently preserves all expected interactions: named selectable meshes, canonical structure lookup, Navigator and Inspector updates, interior mode, and mesh-derived Macro nanobot presentation targets.

> **No migration, coordinate transform, model conversion, visual registration, provider API integration, or lower-scale capability change was implemented.** The result is a report-only decision. The current HRA model, HRA placements, Macro behavior, red nanobots, workspace panels, and lower-scale safety gates remain unchanged.

The primary blockers are decisive. BigBrain and Julich-Brain materials are offered under **CC BY-NC-SA 4.0**, which requires non-commercial use and ShareAlike compliance for shared adaptations. The strongest visual candidate consists of separate cortical BigBrain surfaces, not a complete whole-brain Luna model. Finally, no authoritative checksum-bound path connects the current Luna/HRA GLB to BigBrain or Julich-Brain; the available BigBrain-to-ICBM 2009b transform applies to the BigBrain ecosystem, not to Luna’s existing mesh. [5] [7] [9] [10] [14]

| Required decision criterion | Result | Consequence |
|---|---|---|
| Scientifically authoritative provider data exists | **Yes** | EBRAINS/siibra is a viable future scientific metadata/query provider. |
| Complete visual drop-in exists | **No** | Do not replace Luna’s GLB. |
| Commercially clear redistribution exists | **No** | Do not bundle or derive from BigBrain/Julich data without permissions review. |
| Luna GLB → provider spatial registration exists | **No** | Do not expose provider coordinates for the current model. |
| Lower-scale operational targets are coordinate-resolved in Luna | **No** | Preserve all existing lower-scale refusals. |
| Safe rollback exists | **Yes** | The current HRA provider remains deployed and untouched. |

# EBRAINS EVALUATION

EBRAINS provides three distinct but complementary layers. The **siibra-python** client provides a typed atlas framework for parcellations, reference spaces, maps, regional features, coordinate assignment, and high-resolution image access. The **siibra-api** exposes HTTP endpoints for parcellations, regions, templates, maps, and regional datasets. The browser-facing **siibra-explorer / Interactive Atlas Viewer** visualizes large volumes, surfaces, maps, reference spaces, and selections remotely. These are authoritative research services, not a single downloadable "EBRAINS brain" suitable for direct replacement in a Three.js application. [1] [2] [3]

The stable siibra inventory exposes a Multilevel Human Atlas with BigBrain microscopic histology, MNI 152 ICBM 2009c Nonlinear Asymmetric, MNI Colin27, and FreeSurfer fsaverage reference contexts. This supports explicit provider-space metadata and region-level scientific queries. It does **not** establish ICBM 2009b support for Julich-Brain, nor an identity or transform between Luna’s HRA GLB and any siibra asset. [2]

| EBRAINS component | Supported role | Appropriate future Luna use | Not established by the component |
|---|---|---|---|
| siibra-python | Programmatic reference-space, parcellation, feature and coordinate workflows | Server-side/research adapter, with pinned versions and explicit availability states | A browser-ready replacement mesh or a Luna coordinate transform |
| siibra-api | HTTP retrieval/query service for atlas content | Read-only provider adapter after terms, endpoint stability, CORS/authentication and dataset licence review | A permanent commercial data CDN or a visual-model licence |
| siibra-explorer | Remote visualization of large maps, volumes and surfaces | Provider reference for external exploration | Permission to bundle its rendered imagery or assets in Luna |
| EBRAINS Knowledge Graph | Dataset provenance, access and licence metadata | Dataset-level evidence lookup and citation | A guarantee that all datasets share one licence or have one coordinate space |

# JULICH-BRAIN

Julich-Brain is a three-dimensional probabilistic cytoarchitectonic atlas, not a single illustrative mesh. Its current v3.1 provider record offers 207 maps at default granularity and 227 at high granularity, including cortical and subcortical regions and cortical gap maps. The record provides probability maps, maximum-probability maps, MNI ICBM 152 **2009c Nonlinear Asymmetric** and Colin27 volume products, plus an fsaverage cortical surface product. The provider describes the surface as 148 cortical areas, rather than a full whole-brain model. [8] [9]

This is extremely valuable for scientific annotation. A declared MNI 2009c coordinate can be probabilistically assigned to Julich regions while retaining uncertainty and probability rather than falsely converting a point to one deterministic label. The siibra documentation shows coordinate-to-region assignment and metrics such as map value, correlation, intersection-over-union, and containedness. [12]

The same facts prevent a direct Luna migration. Julich’s maps are NIfTI and surface parcellation products, not a material-rich, full-anatomy GLB with Luna’s 282 named mesh nodes. A Julich fsaverage surface cannot preserve the current selection model for deep nuclei, cerebellum, brainstem, white matter, optic chiasm, or the present HRA mesh hierarchy. [9] [10]

| Julich-Brain attribute | Authoritative state | Luna interpretation |
|---|---|---|
| Main representations | Probability maps, maximum-probability maps, cortical fsaverage surface | Strong annotation/science source; not a complete visual replacement |
| Structures | 207 default / 227 high-granularity map set; surface includes 148 cortical areas | Better scientific labels but incomplete fit for current per-mesh whole-brain interaction |
| Reference spaces | MNI ICBM 152 2009c Nonlinear Asymmetric, Colin27, fsaverage | Provider-specific coordinate support only; no Luna bridge |
| API/tooling | siibra and EBRAINS services | Potential future read-only backend adapter |
| Licence | CC BY-NC-SA 4.0 | No business-product bundling or derivative without an explicit rights determination |

# BIGBRAIN

BigBrain is a high-resolution, single-donor, reconstructed histological brain model. Official BigBrain documentation identifies its native three-dimensional histology at 20 µm resolution, with full image data on the order of one terabyte. The provider offers full images, volumes, surfaces and selected microscopic sections through its FTP/LORIS services and EBRAINS visualization. [4] [11]

The most relevant visual candidates are explicit 2009b-symmetric cortical surfaces in the official 2015 release. The release directory lists left/right white and gray `*_327680_2009b_sym` surfaces as GIFTI (7.5 MB each), MNI OBJ (17 MB each) and Wavefront OBJ (approximately 22–23 MB each). These are significant scientific assets, but they are distinct cortical shells; they do not supply the subcortical, cerebellar, brainstem and structured anatomy required by the present Luna GLB. [6]

The BigBrain release also publishes `bigbrain_to_icbm2009b_lin.xfm`, `bigbrain_to_icbm2009b_nl.xfm`, and a 780 MB nonlinear displacement grid. The descriptors identify an MNI transform and a grid transformation. Separately, the Xiao et al. registration data and BigBrainWarp documentation describe and evaluate BigBrain/BigBrainSym registration to symmetric and asymmetric ICBM 2009b using anatomical landmarks and segmented subcortical structures. [7] [13] [14]

> The BigBrain transform chain is authoritative **within BigBrain’s explicitly defined source representation**. It is not a transform from Luna’s current HRA GLB, and it must not be composed with a Luna route that has not been established.

| BigBrain attribute | Authoritative state | Luna interpretation |
|---|---|---|
| Native data | 20 µm 3D histological model; approximately 1 TB at native full-image scale | Not a browser bundle |
| Published visual surfaces | Separate cortical white/gray surfaces in GIFTI, MNI OBJ and Wavefront OBJ | Potential future derivative source only; not a direct whole-brain GLB |
| 2009b support | Published BigBrain → ICBM2009b descriptors, grid and 2009b-symmetric data products | Strong provider-internal spatial provenance |
| Microscopy | Layer maps, selected 1 µm sections and volume-of-interest access | High-value research feature; not a lower-scale Luna mission target |
| Licence | CC BY-NC-SA 4.0 | Requires non-commercial use, attribution and ShareAlike for adaptations |

# VISUAL COMPARISON

The current Luna GLB is optimized for an interactive anatomy experience. It is an 11,977,884-byte, checksum-pinned asset that already loads with Three.js, preserves node names, supports structure selection, interior display, style-consistent lighting, and red nanobot interactions. Its fidelity is limited by the source asset’s illustrative/reference-object origin and by the absence of an authoritative image-volume registration.

BigBrain offers much higher anatomical and histological fidelity at the source-data level, but its published surfaces target scientific analysis. The inspected 2009b surfaces are not texture/material-equivalent to Luna’s brain, are cortical rather than comprehensive, and have no established mapping to the current canonical structure set. Julich-Brain supplies probabilistic regional anatomy and 148-area cortical surface parcellation, but it is intentionally an atlas/map product rather than a realistic whole-brain presentation mesh.

| Visual dimension | Current Allen/HRA Luna GLB | BigBrain | Julich-Brain |
|---|---|---|---|
| Browser-native format | GLB | GIFTI, OBJ, MNI OBJ, volumes | NIfTI maps, fsaverage surface map |
| Whole-brain coverage for current UI | Yes | No: inspected candidate is cortical white/gray surfaces | No: cortical surface plus separate atlas volumes |
| Named clickable structures | Yes: current mesh names drive canonical registry | Not established for Luna | Provider region names exist but require an explicit mapping adapter |
| Clinical/illustrative presentation | Current production visual | Scientific surface morphology, not Luna-ready materials | Parcellation visualization rather than a realistic anatomical model |
| Authoritative microstructure | No direct lower-scale connection | Strong | Strong cytoarchitecture/probability maps |
| Drop-in visual replacement | **Yes, current model** | **No** | **No** |

# SPATIAL COMPARISON

The current Luna system truthfully distinguishes three different concepts: the raw checksum-pinned GLB, its established HRA Brain-Female / HRA CCF reference-object placements, and its visual presentation coordinates. The previously investigated Luna GLB → Allen 2020 annotation / ICBM 2009b bridge remains unavailable because no checksum-bound mesh-to-volume mapping, coordinate convention, source-volume binding, or landmark-validation artifact was found.

BigBrain has a different and stronger internal spatial story. Its own explicitly named 2009b-symmetric surfaces and published BigBrain-to-ICBM2009b transforms are evidence for BigBrain-only spatial operations, subject to exact-asset/version confirmation and transform validation. Julich v3.1 supplies MNI **2009c Nonlinear Asymmetric**, Colin27 and fsaverage contexts. The official MNI description differentiates 2009b as 0.5 mm and 2009c as 1 mm, with different sampling; the templates may not be conflated. [7] [9] [14] [15]

| Spatial relationship | Status | Reason |
|---|---|---|
| Luna raw GLB ↔ HRA Brain-Female / HRA CCF | **Established** | Existing checksum-pinned HRA reference-object metadata |
| Luna raw GLB ↔ Allen 2020 annotation / ICBM 2009b | **Unavailable** | No authoritative GLB-to-volume correspondence artifact |
| BigBrain source representation ↔ ICBM 2009b | **Established within BigBrain scope** | Published transform descriptors/grid and validation literature |
| Julich v3.1 ↔ MNI ICBM 152 2009c Asymmetric | **Established within Julich scope** | Dataset’s declared coordinate space and products |
| BigBrain / 2009b ↔ Julich / 2009c | **Not established for Luna** | No evaluated exact transform/asset chain justifies composition |
| Luna visual presentation ↔ any scientific provider space | **Unavailable** | Presentation normalization is not a scientific coordinate transform |

# MULTISCALE COMPARISON

EBRAINS materially expands the range of scientific data that could be described or queried, but availability must remain per-dataset rather than being assumed from a provider brand. siibra documents regional features such as receptor densities, gene expressions, cell distributions, connectivity, and high-resolution volumes of interest. BigBrain supports reduced-resolution/full-resolution volume-of-interest retrieval; its native image scale makes it unsuitable for a direct browser scene. [3] [11]

| Scale | Current Luna state | EBRAINS / Julich / BigBrain evidence | Coordinate and access status | Luna capability decision |
|---|---|---|---|---|
| Macro | Enabled simulation using current mesh targets | BigBrain surfaces; Julich maps/surface; viewer/API | Provider-space specific | Remains current GLB only |
| Tissue | Disabled | Julich probability/maximum-probability maps; BigBrain layers | No Luna source-coordinate path | Disabled |
| Cellular | Disabled | Cytoarchitectonic maps, cell distributions, selected 1 µm sections | Dataset/region/VOI access, not Luna target coordinates | Disabled |
| Subcellular | Unavailable | 20 µm BigBrain and selected microscopic sections | Very large image data; no operational target contract | Unavailable |
| Molecular | Disabled | Receptor density and gene-expression features | Feature-specific provenance/licence/space required | Disabled |

# NANOBOT COMPATIBILITY

The current Macro nanobot mission engine and red visual design remain valid because they operate against the existing presentation model and its mesh-derived targets. No evidence obtained here upgrades Tissue, Cellular, Molecular, or Subcellular targeting. In particular, a region-level probability map, a high-resolution histology volume, an EBRAINS feature query, or a provider transformation does not itself constitute a coordinate-resolved mission target in the visual scene.

A future provider adapter must reject any lower-scale nanobot mission unless all of the following are true: the requested dataset is accessible under applicable terms; its exact version and source coordinate space are declared; a provider-authored, checksum-bound mapping connects the active visual asset to the dataset; canonical region IDs are mapped; target coordinates or a provider-approved target geometry exist; and independent validation meets the stated scientific threshold. Until then, the current gates remain mandatory.

# PROVENANCE

The evaluation used the official EBRAINS tool pages, siibra documentation and maintained source repositories, EBRAINS Knowledge Graph dataset records, the official Julich-Brain/Forschungszentrum Jülich pages, the official BigBrain FTP directory and licence, BigBrainWarp documentation, the primary BigBrain-to-ICBM2009b registration paper, and the official MNI ICBM 2009 template page. The report intentionally treats a provider’s general platform statement, an asset filename, an explorer rendering, and a coordinate-space label as different grades of evidence.

No large BigBrain volume, 780 MB deformation grid, 253 MB release package, full MNI template archive, or browser asset was added to the repository. Only two small official BigBrain transform descriptors were temporarily inspected outside the repository; no transform was executed, fitted or committed.

# LICENSE

The current provider candidates do **not** provide automatic commercial redistribution clearance. The official BigBrain licence is CC BY-NC-SA 4.0. The official EBRAINS records for Julich-Brain v3.1 and the v2.9 surface projections also specify CC BY-NC-SA 4.0. That licence permits sharing and adaptation only for non-commercial purposes, requires attribution and change disclosure, and imposes ShareAlike conditions on shared adaptations. [5] [9] [10]

This report records licence facts, not legal advice. Before any business deployment that bundles, hosts, transforms, or derives a model or map from these datasets, the product owner must obtain an appropriate rights determination or a separate commercial permission from the data custodian. The Apache-2.0 licences of the siibra software repositories apply to that software and do not override data licences.

# PERFORMANCE

The current production GLB is approximately **12.0 MB** and already works with the present Three.js interaction path. The smallest identified high-value BigBrain visual candidate is a pair of 7.5 MB GIFTI cortical surfaces before conversion, application metadata, materials, draw-buffer overhead, selection structures, or any supporting geometry. Published Wavefront OBJ equivalents are about 22–23 MB each. BigBrain’s 20 µm image volume is about 1 TB at native resolution, and even its published resampled 2009b NIfTI products range from tens of megabytes to several gigabytes. [6] [7] [11]

A future visual proof-of-concept would therefore need a separate performance budget: legal clearance, a version- and checksum-pinned source asset, documented decimation/conversion, no silent coordinate alteration, Draco/Meshopt or equivalent encoding only after evidence review, material/texture budget, canonical ID mapping, mobile/desktop GPU testing, and visual/browser acceptance. None of that work is justified until the licence and interaction gaps are resolved.

# INTEGRATION

No integration was performed. If future permissions and exact source assets are obtained, the smallest safe design is a provider abstraction rather than an application rewrite.

| Proposed file/component | Future responsibility | Current action |
|---|---|---|
| `client/src/components/brain/anatomy/BrainScaleAssetRegistry.ts` | Resolve provider-scoped visual/data descriptors and explicit availability | Unchanged |
| `client/src/components/brain/BrainViewer.tsx` | Load only a validated provider visual descriptor; preserve current fallback and selection pipeline | Unchanged |
| `client/src/components/brain/anatomy/BrainStructureRegistry.ts` | Adapt provider IDs/names to canonical Luna IDs at one boundary | Unchanged |
| `client/src/components/brain/anatomy/BrainObservationContext.ts` | Present provider/source-space/provenance status without claiming a transform | Unchanged |
| `server/scientificData/registry.ts` and observation services | Register read-only provider metadata/query capabilities after access/terms review | Unchanged |
| `shared/hraSpatial/*` | Remain responsible only for established HRA records; no unproven composition | Unchanged |
| Nanobot mission/target modules | Keep Macro-only gate until coordinate-resolved provider targets exist | Unchanged |

A valid future adapter would retain `CurrentHraProvider` as the default and model an `EbrainsProvider` as read-only metadata/query capability. Provider identifiers must live in a canonical mapping table, not in React components. A future `VisualAssetDescriptor` must include source URL, version, SHA-256, format, licence, required attribution, provider space, established transformations, explicit limitations, and a validation record before `BrainViewer` may load it.

# MIGRATION STATUS

**NOT STARTED.** No prototype was created because the evidence does not meet the user’s prerequisite that EBRAINS be demonstrably superior as a practical Luna replacement. It is scientifically superior as a data ecosystem, but it fails the complete-visual-model, interaction, legal-clearance, and current-Luna spatial-correspondence gates.

# ROLLBACK

No rollback is required because no runtime change was made. The current checksum-pinned Allen/HRA GLB remains the active production model, its established HRA placements remain intact, and its existing Macro-only nanobot system remains available. Any future work must preserve this as the default provider and must be disabled by configuration or selection before any candidate provider is allowed to load.

# TEST RESULTS

No code, dependency, browser asset, transform, provider adapter, or configuration was added in this evaluation. Therefore no prototype-specific model-loading, structure-mapping, coordinate-query, or browser-acceptance tests were applicable or run. The repository was inspected before documentation creation and had no code change from this task.

The documentation-only release must still pass `git diff --check` before commit. Production build, unit test, and browser validation are deliberately not represented as new results because the application runtime is unchanged. The last released scientific boundary continues to preserve Macro-only operations and rejects unestablished spatial registrations.

# FINAL RECOMMENDATION

**USE EBRAINS AS A SCIENTIFIC BACKEND WHILE KEEPING THE CURRENT MODEL VISUALLY.** Do not adopt BigBrain or Julich-Brain as a visual replacement now. They offer important scientific capabilities for a future opt-in provider adapter, but their asset forms, coverage, licensing and absent Luna correspondence prevent a safe migration.

The next permissible step is not model conversion. It is an **evidence-and-rights preflight**: obtain explicit commercial/redistribution permission if needed; select one exact provider asset; obtain its source checksum, format and coordinate conventions; establish an authored, version-bound canonical ID mapping; define provider endpoint/authentication/terms; and validate a separate asset-to-reference-space chain with independent landmarks. Only then should a reversible, behind-a-feature-flag prototype be considered. The current HRA model must remain the fallback until that prototype passes model load/unload, structure mapping, selection, Navigator, Inspector, workspace, Macro mission, safety-gate, performance, and browser acceptance tests.

## References

[1]: https://ebrains.eu/data-tools-services/tools/siibra-python "EBRAINS — siibra-python"
[2]: https://siibra-python.readthedocs.io/en/latest/examples/02_maps_and_templates/001_selecting_reference_spaces.html "siibra — Find predefined reference spaces"
[3]: https://ebrains.eu/data-tools-services/tools/siibra-api "EBRAINS — siibra-api"
[4]: https://bigbrainproject.org/maps-and-models.html "BigBrain Project — Maps & Models"
[5]: https://ftp.bigbrainproject.org/bigbrain-ftp/License.txt "BigBrain licence"
[6]: https://ftp.bigbrainproject.org/bigbrain-ftp/BigBrainRelease.2015/3D_Surfaces/Apr7_2016/gii/ "BigBrain 2015 GIFTI surface directory"
[7]: https://ftp.bigbrainproject.org/bigbrain-ftp/BigBrainRelease.2015/3D_Volumes/MNI-ICBM152_Space/transformation/ "BigBrain 2015 ICBM transform directory"
[8]: https://www.fz-juelich.de/en/news/archive/new-release-of-the-julich-brain-atlas-adds-52-new-maps "Forschungszentrum Jülich — Julich-Brain v3.1 release"
[9]: https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777 "EBRAINS Knowledge Graph — Julich-Brain v3.1"
[10]: https://search.kg.ebrains.eu/instances/ff1bae02-857d-4d1b-8b2d-b9dbd583a459 "EBRAINS Knowledge Graph — Julich-Brain v2.9 surface projections"
[11]: https://siibra-python.readthedocs.io/en/latest/examples/02_maps_and_templates/004_access_bigbrain.html "siibra — Access BigBrain high-resolution data"
[12]: https://siibra-python.readthedocs.io/en/latest/examples/05_anatomical_assignment/001_coordinates.html "siibra — Assigning coordinates to brain regions"
[13]: https://bigbrainwarp.readthedocs.io/en/latest/pages/tutorial_evaluation.html "BigBrainWarp — Evaluate transformations"
[14]: https://pmc.ncbi.nlm.nih.gov/articles/PMC6797784/ "Xiao et al. 2019 — Accurate BigBrain registration with MNI PD25 and ICBM152"
[15]: https://www.bic.mni.mcgill.ca/ServicesAtlases/ICBM152NLin2009 "MNI — ICBM 152 nonlinear atlases version 2009"
