# Luna Brain Final Gap Audit

## Baseline reviewed

The working tree is clean at `8c92cff` (`Add assisted Luna Brain orchestration`). The audit inspected the current Macro asset and rendering pipeline, scientific registry and observation services, reference-space/transform gates, nanobot types/engine/facade, and the Luna assistant action surface.

| Requested area | Current evidence | Audit status |
| --- | --- | --- |
| Luna Local registration | The local GLB is a 11,977,884-byte glTF 2.0 asset exported by Babylon.js for Autodesk Maya. It contains no `extras`, declared units, axis orientation, anatomical template, citation, reference-space ID, or transform metadata. Its raw global mesh bounds are `[-0.07468038, 0.711022258, -0.148092479]` to `[0.0616968535, 0.8571182, 0.0189470481]`; these are unlabelled asset units. BrainViewer centers the model and applies a display-only `0.17 / maxDimension` scale. | **No validated external registration is present.** |
| MNI/Julich to Luna Local | Registry declares both directions as unavailable. The coordinate service permits identity only inside one declared space and otherwise rejects unavailable or provider-only transforms. | **Scientifically blocked unless authoritative transform evidence is found.** |
| Tissue targeting | EBRAINS/Julich atlas metadata is live, labelled as a provider-region target, and retains MNI/BigBrain provenance. It intentionally does not derive a Luna point. | **Dataset-backed metadata available; spatial operation blocked.** |
| Cellular targeting | CELLxGENE/HBCA lookup returns bounded dataset/count metadata. It records an anatomical annotation, not 3D cell positions or a Luna registration. | **Metadata only; operation blocked.** |
| Molecular targeting | Allen lookup returns bounded structure-name metadata with donor-MR provenance. It does not infer expression values or project donor/MNI coordinates. | **Metadata only; operation blocked.** |
| Subcellular data | Registry contains a single-sample human cortical EM fragment as unavailable. It is not mapped to Luna canonical whole-brain anatomy. | **Unavailable pending suitable documented spatial resource and registration.** |
| Macro mission behavior | Engine enforces resolved Macro mesh targets and produces a safe simulation lifecycle/result. Mission types vary in duration and copy, but have no richer task-specific evidence/result classification. | **Engineering extension possible; remains simulation only.** |
| Mission sequencing | No sequence, dependency, current-step, or failure-propagation contract exists. | **Engineering gap.** |
| Fleet coordination | Existing facade and UI support fleet-wide pause/resume/return. There are no individual approved control contracts, fleet plans, aggregate inspection, or partial-failure summary. | **Engineering gap.** |
| Luna action contracts | Safe state/structure/scale/dataset/spatial target/fleet/history and confirmation-gated Macro deployment exist. Per-bot controls, sequence actions, full dataset manifest queries, and explicit fleet inspection are missing. | **Engineering gap.** |
| Result provenance/classification | Targets retain dataset, spatial target, capability, reference-space, transform, and provenance fields. Results expose operation and verification modes, but do not yet provide an explicit outcome classification for simulation, spatial observation, dataset-backed result, and unavailable measurement. | **Engineering gap.** |
| Error recovery | Scientific provider timeouts/offline observations are bounded. Transform validation handles invalid finite values/units/version records. Sequence and fleet partial-failure recovery do not exist. | **Partially implemented; engineering extension needed.** |

## Safety baseline

The existing architecture correctly prohibits arbitrary React/Three.js mutation and prohibits a synthetic affine, mesh-bound alignment, guessed rotation, or inferred coordinate from being represented as a scientific registration. This constraint remains mandatory for all follow-on work.

## Next evidence required

The scientific work must locate authoritative asset/source documentation for the exact GLB provenance and any documented coordinates, then independently verify EBRAINS/Julich, Allen, CELLxGENE/HBCA, and subcellular candidate space/transform information. If that evidence does not provide an executable, validated route into Luna Local, lower-scale operations must remain unavailable with the most precise corresponding reason.

## External evidence captured during registration research

| Source | Verified finding | Consequence for Luna |
| --- | --- | --- |
| Allen Human Brain Atlas API: <https://brain-map.org/support/documentation/human-brain-atlas-api> | Allen documents that human microarray sampling sites were mapped to each individual donor MR image space and that all brains were registered to MNI. The API documents sample `(x,y,z)` locations in donor MR-volume millimetres and donor-specific MR-to-MNI transforms through an Alignment3d model. | This supports provider-side donor/MNI provenance and possible provider-value queries. It does **not** identify the local Luna GLB as that donor MRI, an Allen Human Reference Atlas volume, or an executable MNI-to-Luna transform. |
| Allen community mesh guidance: <https://community.brain-map.org/t/human-brain-atlas-mesh-files/560> | The official community material describes Allen Human Reference Atlas 3D annotation/segmentation NIfTI resources that can be surfaced/exported with ITK-SNAP. It does not provide a documented relation to the project’s Maya-exported GLB. | A registration cannot be inferred from similar anatomical appearance, mesh names, or bounding boxes. |
| BICCN atlas catalog: <https://biccn.org/tools/atlas> | The Allen Human Reference Atlas – 3D, 2020 is described as an annotated adult-brain parcellation in the MRI reference brain **ICBM 2009b Nonlinear Symmetric**, derived from an MNI152 average. | This is a recognized template reference for the separate Allen 3D atlas, but it differs from the currently registered EBRAINS MNI ICBM 152 2009c space and still has no documented identity or transform to the Luna GLB. |

**Interim registration decision:** The current local GLB cannot legitimately be relabelled as an Allen Human Reference Atlas MNI/ICBM asset. The research establishes scientifically useful Allen donor-MR/MNI provenance and a separate Allen 3D ICBM 2009b atlas, but no source-proven executable transform into the asset actually rendered by Luna. The MNI/Julich-to-Luna Local transform therefore remains unavailable unless an asset-specific source, reference image, and validated registration procedure are supplied.

[1]: https://brain-map.org/support/documentation/human-brain-atlas-api "Allen Human Brain Atlas API"
[2]: https://community.brain-map.org/t/human-brain-atlas-mesh-files/560 "Allen Human Brain Atlas Mesh Files"
[3]: https://biccn.org/tools/atlas "BICCN Atlases and Ontologies"

| EBRAINS/Julich evidence | Verified finding | Consequence for Luna |
| --- | --- | --- |
| EBRAINS Julich-Brain v3.1 dataset: <https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777> | Current v3.1 documentation identifies 207 default-granularity maps (227 high-granularity maps), probability maps from ten post-mortem samples, and MNI ICBM 152 2009c nonlinear asymmetric, Colin27, and fsaverage availability. It states that probability/maximum-probability maps are stored as map files, including hemisphere-specific PMs. | A Julich target can legitimately be described as a **provider region/probabilistic map**, not a Luna Local point. The registered `ebrains-mni-icbm-152-2009c` metadata is technically consistent with the current atlas source. |
| EBRAINS Human Brain Atlas: <https://ebrains.eu/data-tools-services/brain-atlases/human-brain> | EBRAINS describes integration across MNI Colin27, ICBM 152 2009c, average, BigBrain, and FreeSurfer reference spaces; BigBrain is a 20 μm microscopic model. | EBRAINS can link atlas spaces internally. This does not connect any of those spaces to Luna’s separate GLB. |
| siibra concepts: <https://siibra-python.readthedocs.io/en/latest/concepts.html> | A valid spatial atlas requires a reference template/coordinate space and parcellation map. It distinguishes region, coordinate, and bounding-box locations, and explains that cross-space transformations preserve a region of interest only when spatial transformations exist. | Luna must keep the present region/point distinction. A map’s existence in MNI/BigBrain does not authorize a viewer-local coordinate without a transform that applies to the actual Luna mesh. |

**Julich decision:** The provider evidence strengthens Tissue provenance and exact terminology but does not establish `Julich → MNI → Luna Local`. No enabled lower-scale target or transform follows from it.

[4]: https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777 "EBRAINS Julich-Brain v3.1"
[5]: https://ebrains.eu/data-tools-services/brain-atlases/human-brain "EBRAINS Human Brain Atlas"
[6]: https://siibra-python.readthedocs.io/en/latest/concepts.html "siibra concepts"

| Cellular/subcellular evidence | Verified finding | Consequence for Luna |
| --- | --- | --- |
| HCA Human Brain Cell Atlas v1.0: <https://data.humancellatlas.org/hca-bio-networks/nervous-system/atlases/brain-v1-0> | The atlas is a transcriptomic census from three postmortem donors, with more than three million nuclei from about 100 dissections. Its portal presents biologically meaningful cell/region partitions and downloadable/integrated objects. The material describes dissected regional sampling, not a single 3D coordinate field registered to the Luna GLB. | The current CELLxGENE implementation correctly treats this as transcriptomic/anatomical metadata. No cell position, cluster coordinate, or Luna target is enabled. |
| Allen Human Adult Brain Cell Atlas catalog: <https://knowledge.brain-map.org/data/C5I7P4XFTZHKOC6JQWH/9e0a1e27-6b44-4b14-8b1a-1d5e2a7b3c15> | The catalog describes a planned spatial multi-omic map and lists controlled in-progress human multiome collections. | A project-level spatial-data ambition is not an open, registered, executable spatial dataset. Luna must not use it for targeting. |
| BigBrain: <https://bigbrainproject.org/maps-and-models.html> | BigBrain is a single human brain reconstructed from microscopic histological sections, with maps/sections made available at multiple resolutions and licensed data access. It is a reference for high-resolution localization in its own BigBrain space, not a subcellular whole-brain Luna GLB transform. | It is an important future tissue/microscopic reference candidate. Its size, distinct coordinate frame, licensing review, and absent Luna registration prevent browser-side inclusion or nanobot targeting today. |
| Human H01 cortical EM (Shapson-Coe et al., 2024): <https://pmc.ncbi.nlm.nih.gov/articles/PMC11718559/> | This is a ~1.05 mm³ surgically resected anterior middle-temporal-cortex specimen with 4 × 4 nm² imaging (5.55 × 4 nm corrected pixels), 33.9 nm sections, 1.4 PB aligned dataset, and online analysis tools. The authors identify surgical/pathology context and sample-scoped limitations. | It is a compelling human EM fragment but not a whole-brain reference or a Luna canonical-structure transform. It remains unsuitable for Subcellular navigation and must not be used to imply a generalized human-brain target. |

**Cellular/Subcellular decision:** No currently registered candidate creates a legitimate `dataset → spatial sample → declared reference space → Luna target` chain. Cellular and Subcellular deployments remain unavailable. The strongest correct fallback is richer provenance/capability disclosure, rather than a fabricated point, cell, or molecular/subcellular measurement.

[7]: https://data.humancellatlas.org/hca-bio-networks/nervous-system/atlases/brain-v1-0 "Human Brain Cell Atlas v1.0"
[8]: https://knowledge.brain-map.org/data/C5I7P4XFTZHKOC6JQWH/9e0a1e27-6b44-4b14-8b1a-1d5e2a7b3c15 "Allen Human Adult Brain Cell Atlas Catalog"
[9]: https://bigbrainproject.org/maps-and-models.html "BigBrain Maps and Models"
[10]: https://pmc.ncbi.nlm.nih.gov/articles/PMC11718559/ "A petavoxel fragment of human cerebral cortex reconstructed at nanoscale resolution"

The GLB path’s complete Git history contains only `Create 3d-vh-f-allen-brain.glb` and `Add files via upload` commit messages. Neither source URL, original asset package, coordinate declaration, license, reference image, nor registration artifact exists in repository history. This rules out an asset-specific local provenance recovery and reinforces the unavailable registration state.

| Additional candidate | Verified finding | Suitability for Luna |
| --- | --- | --- |
| MICrONS Mouse V1 EM: <https://knowledge.brain-map.org/data/F5BNR82CNKHZ0UXBGDC/9e0a1e27-6b44-4b14-8b1a-1d5e2a7b3c15> | Open CC BY 4.0 single-volume mouse visual-cortex EM reconstruction: 250 × 140 × 90 μm, P36 male mouse, 3.58 × 3.58 × 40 nm resolution, 301 reconstructed somata. | Scientifically unsuitable for a **human** Luna scale. It must not be blended into human anatomy or used as an alternative target. |
| MICrONS Explorer: <https://www.microns-explorer.org/> | Public portal for large-scale EM reconstructions and functional imaging from mouse visual cortex. | Useful external research infrastructure, but distinct species and local sample coordinates prevent a Luna human whole-brain mapping. |
| OpenNeuro ds002179: <https://openneuro.org/datasets/ds002179/versions/1.1.0> | CC0, 50.73 GB, single ex-vivo human brain 7T MRI at 100 μm isotropic resolution distributed in native and stereotactic space. It is MRI, not EM or synaptic-level subcellular data. | A potentially useful future registration/reference-image research input, not a browser asset and not a transform to Luna’s unproven GLB. It is not selected for this implementation. |

**Candidate-screening conclusion:** MICrONS is excluded by species and region; H01 is human but a local surgical cortical fragment; BigBrain is human and volumetric/histological but a distinct single-brain reference with an unavailable Luna registration; OpenNeuro ds002179 is human and stereotactic MRI, but separate from the GLB and not subcellular. No candidate meets all requirements for a whole-brain, coordinate-resolved, human, Luna-registered Subcellular target.

[11]: https://knowledge.brain-map.org/data/F5BNR82CNKHZ0UXBGDC/9e0a1e27-6b44-4b14-8b1a-1d5e2a7b3c15 "MICrONS Mouse V1 Layer 2/3 Electron Microscopy"
[12]: https://www.microns-explorer.org/ "MICrONS Explorer"
[13]: https://openneuro.org/datasets/ds002179/versions/1.1.0 "OpenNeuro ds002179"

## Engineering Boundary and Recovery Audit

| Boundary | Implemented safeguard | Result |
| --- | --- | --- |
| Scientific provider and scale failure | `useBrainScientificObservation` aborts superseded requests, records the provider/HTTP error, clears only the stale observation, and exposes an explicit retry token. `createBrainObservationContext` surfaces the provider error as contextual status. | A failed provider request does not become a fabricated dataset, target, or blank scientific assertion. |
| Lower-scale operation gate | `spatialTargetService`, `NanobotTargetResolver`, `NanobotMissionEngine`, Luna single-mission planning, and Luna sequence planning all require a resolved Macro target. Lower-scale/provider metadata remains non-executable until an explicit target/transform chain exists. | No route can turn an MNI/provider region, cellular metadata, donor expression sample, or unavailable subcellular source into a Luna-local point. |
| Mission evidence | `NanobotScientificSnapshot` is frozen at target assignment and retained in active targets and archived result targets. It includes dataset/provider version, provenance, reference space, coordinate convention when declared, transform state, target derivation, capability state, observation message, and limitations. | Viewer-scale changes cannot rewrite a mission's original scientific context. |
| Simulation vocabulary | Macro target and all five mission types label the route/result as simulation. Diagnostic, repair, delivery, and monitor results explicitly exclude diagnosis, repair, physical payload, treatment, and biological time-series claims. | A mission type name cannot be mistaken for a clinical or biological outcome. |
| Engine and renderer ownership | The sequence coordinator has no React, DOM, Three.js, coordinate, or lifecycle transition access. It observes only an archived engine result and asks BrainViewer to deploy the next approved step through the existing callback. | The existing mission engine remains authoritative; the Three.js renderer remains the sole visual/coordinate owner. |
| Fleet independence and retention | Individual controls call the data-oriented facade by bot ID; selected-panel controls no longer pause/resume/return the entire fleet. Sequence dependencies are explicit, failures block pending descendants, cancellation prevents future dispatch, and only 20 terminal sequence records are retained. | A bot or sequence failure does not mutate unrelated active missions, and the session-level coordination layer is bounded. |

**Final scientific registration decision:** The authoritative documentation establishes scientifically meaningful external frames for Julich/EBRAINS and Allen donor/MNI resources, and high-resolution but separately framed human candidate datasets. The local GLB has no retained asset-specific source/reference-space metadata and no executable transform into any of those external frames. The appropriate release state is therefore **Macro mesh-derived simulation enabled; all lower-scale navigation unavailable with precise reasons**, not a speculative registration.
