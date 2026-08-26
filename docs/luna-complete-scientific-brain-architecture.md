# Luna Scientific Brain Architecture

**Author:** Manus AI  
**Date:** 2026-08-26  
**Implementation status:** Provider-native MNI scientific cortex implemented; Julich cortical mesh delivery remains intentionally blocked; HRA remains an independent visual/Macro model.

## Executive decision

Luna now uses a **two-anchor architecture**. The retained HRA Brain-Female v1.1 GLB is the visual whole-brain presentation and the sole source of Macro simulation mesh positions. A separate EBRAINS/siibra MNI ICBM 152 2009c Nonlinear Asymmetric scientific anchor supplies independently entered coordinate queries, a bounded provider-streamed cortical template view, Julich probabilistic query context, and a bounded MNI-to-BigBrain coordinate transformation. These anchors are deliberately not registered to one another.

> **Scientific safety invariant:** `HRA/Luna → MNI = NOT_ESTABLISHED`. No viewer coordinate, mesh position, camera position, GLB origin, anatomical display name, or HRA placement is sent to siibra, BigBrain, or any other scientific provider.

The HRA source is authentic HRA Brain-Female v1.1, but the official source publishes HRA placement rather than an MNI/Julich/BigBrain transform. The source model is built from a mirrored Allen Human Reference Atlas half brain and resized to fit Visible Human body contexts; that provenance does not establish a reproducible registration to the exact MNI target required here.[1] [2] The existing checksum-pinned HRA asset is unchanged.

## Scientific spatial architecture

| Layer | Provider-native anchor | Luna role | Scientific status | Prohibited inference |
|---|---|---|---|---|
| Visual/Macro brain | HRA Brain-Female v1.1 GLB | Default whole-brain presentation, anatomy navigation, Macro-only simulation | Presentation-only | HRA coordinate or selection → MNI, Julich, BigBrain, tissue, cellular, molecular, or connectivity result |
| Scientific spatial cortex | siibra MNI ICBM 152 2009c Nonlinear Asymmetric | Optional, default-off provider-native cortical view | `PARTIAL` | Subcortical coverage, Julich label identity, HRA alignment, region selection, Macro target |
| Tissue/parcellation context | Julich-Brain v3.1 | Independently entered MNI coordinate → probabilistic provider assignment | Provider query / probabilistic | Name- or mesh-proximity mapping to HRA; unsupported cortical mesh overlay |
| Microscopic context | BigBrain 2015 / EBRAINS transformation collection | Explicit MNI 2009c coordinate → BigBrain provider coordinate context | Bounded remote coordinate transformation | HRA/Luna registration; microscopy/layer assignment; biological or nanobot target |
| Cellular context | CELLxGENE / human brain collection metadata | Dataset/sample-scoped evidence record | `PARTIAL` | Whole-brain MNI coordinate field or Luna structure mapping |
| Molecular context | Allen Human Brain Atlas | Donor/sample-scoped evidence record | `PARTIAL` | Expression value from a Luna mesh/name/position |
| Connectivity context | siibra feature metadata / HCP context | Provider-, cohort-, parcellation-, and method-scoped record | `PARTIAL` | HRA node/edge projection or name-derived crosswalk |

The implementation represents each layer as a normalized source-qualified observation. Every record has a provider, dataset, version when supplied, reference-space identity, coordinate or region only where truly available, measurement/method, uncertainty/limitation, provenance identifier, and license identifier. This makes absence explicit instead of replacing it with synthetic values.

## Provider-native MNI Scientific Spatial Cortex

The exact siibra MNI provider reference is `minds/core/referencespace/v1.0.0/dafcffc5-4826-4bf1-8ff6-46b8a31ff8e2`, corresponding to **MNI ICBM 152 2009c Nonlinear Asymmetric**.[3] The siibra template configuration exposes a Neuroglancer precomputed surface with mesh label index `65535`, the two cortical fragments `left-hemisphere_cortex` and `right-hemisphere_cortex`, and a provider transform that is applied inside the separate MNI root only.[4] [5]

| Delivery attribute | Verified value and policy |
|---|---|
| Delivery mode | Direct provider stream only after explicit enablement |
| Default visibility | Off |
| Persistent cache / local bundle | Prohibited |
| Mesh format | Legacy Neuroglancer precomputed mesh |
| Fragment wire sizes | Left 1,366,303 bytes; right 1,386,028 bytes |
| Browser-decoded payload sizes | Left 2,638,432 bytes; right 2,673,676 bytes |
| Actual geometry validation | Left 73,291 vertices / 146,578 triangles; right 74,270 vertices / 148,536 triangles |
| Provider transform | `[[1,0,0,-96500000],[0,1,0,-132500000],[0,0,1,-78500000],[0,0,0,1]]`, nanometres → millimetres within the MNI root |
| Selection / hover | Disabled: no stable Julich-region label mapping is supplied by this template surface |
| HRA relation | No transform, visual alignment, picking, or target promotion |

The stream decoder verifies both the provider’s gzip-compressed `Content-Length` and the browser-decoded legacy-mesh byte count. It rejects drift in either representation, verifies vertex-index bounds, and tears down geometry/material resources when disabled. In MNI view, the HRA root is hidden—not moved, normalized, scaled, rotated, or co-rendered as though registration existed—and the camera is framed from the provider-native MNI geometry bounding box. Disabling MNI view restores the HRA visual root.

The MNI surface is **cortical template geometry**, not a Julich parcellation mesh. It does not establish subcortical coverage, cortical region identity, tissue probability, cellular location, molecular expression, connectivity values, or an HRA correspondence. The original MNI template documentation distinguishes the 2009c nonlinear asymmetric target from 2009a/2009b and symmetric alternatives; Luna accepts no substitution.[6]

## Julich-Brain v3.1 remains guarded

The exact Julich v3.1 parcellation identifier remains `minds/core/parcellationatlas/v1.0.0/94c1125b-b87e-45e4-901c-00daee7f2579-310`, in the exact MNI 2009c asymmetric reference. The inspectable provider catalog supports labelled/probabilistic MNI volumes and fsaverage projection labels, but no exact MNI 2009c asymmetric cortical surface with stable Julich region identity suitable for Luna’s requested overlay. The application therefore exposes the feature as `ASSET_DELIVERY_UNRESOLVED` and `LICENSE_REVIEW_REQUIRED`; its visibility, opacity, hover, and selection controls are disabled.[7]

This is not a fallback or reduced-fidelity Julich rendering. Luna uses no fsaverage, fs_LR, Colin27, MNI 2009b, MNI 2009c symmetric, CerebrA, HRA, or reconstructed substitute. MNI coordinates manually entered in the exact reference space may query Julich probabilistic context; a transient provider failure returns `unavailable` without inventing a region, probability, transform, or target.

## BigBrain and multiscale evidence

BigBrain is a high-resolution reconstruction of a single postmortem human brain from 7,404 cell-body-stained serial sections; it is a microscopic reference rather than a living whole-brain replacement or a Luna-local dataset.[8] The EBRAINS transformation collection documents a MNI 2009c asymmetric ↔ BigBrain relationship and the corresponding remote spatial service for explicit named-template coordinate transforms.[9] [10]

Luna’s BigBrain adapter accepts only an independently supplied MNI 2009c millimetre coordinate. It returns a provider coordinate in BigBrain space as `scientific-coordinate-target` context, with source/target reference spaces, method, provenance, license, time, and explicit limitation. For the local validation input `[0, 0, 0]` MNI mm, the live service returned `[-0.173216, 16.8219, -2.88898]` BigBrain mm. This result does not imply a BigBrain image/layer assignment, an HRA relation, a biological intervention point, or any nanobot capability.

Cellular, molecular, and connectivity layers deliberately remain sample-, donor-, feature-, cohort-, parcellation-, method-, and provider-scoped. siibra documents connectivity features in selected parcellation contexts rather than as generic visual-model links, and it recommends lazy cloud access to large, configuration-linked resources.[11] [12] Luna retains this scope in normalized context records and does not promote these records to a spatial operation.

## Crosswalk and promotion decision matrix

| Requested relationship or action | Status | Evidence basis | Luna behavior |
|---|---|---|---|
| HRA GLB → MNI 2009c asymmetric | `NOT_ESTABLISHED` | Official HRA source lacks an MNI transform artifact | Rejected; no coordinate emission |
| HRA structure → Julich v3.1 region | `UNMAPPED` | No authoritative reviewed crosswalk | No name/proximity mapping |
| HRA GLB → BigBrain | `NOT_ESTABLISHED` | MNI↔BigBrain provider relation does not include HRA | Rejected |
| User-entered MNI 2009c mm → Julich | Available when provider responds | siibra v3.1 provider query | Context only; probabilistic target |
| User-entered MNI 2009c mm → BigBrain | Available when provider responds | EBRAINS transformation service | Context only; no image/layer/target promotion |
| MNI template mesh → Julich region | Unavailable | No stable provider region labels | No hover/picking/selection |
| Any scientific coordinate/region → lower-scale nanobot mission | Disabled | Existing Macro-only safety gate | No operation enabled |
| Macro mesh structure → Macro nanobot point | Available | Existing local Three.js mesh resolver | Unchanged Macro simulation behavior |

## User-visible implementation

The **Science** workspace now reports the visual/scientific boundary, exact MNI reference, provider identifiers, direct MNI template delivery state, default-off visibility and opacity controls, source/attribution link, and explicit limits. It separately retains the disabled Julich v3.1 overlay block, with no misleading render action. The existing coordinate form accepts only independently entered MNI 2009c asymmetric millimetres; its result shows Julich provider status, BigBrain provider coordinate status, and normalized multi-scale limitations.

No MNI template object participates in HRA raycasting or HRA selection. HRA remains the only selectable Macro mesh, and the existing nanobot resolver and mission engine retain Macro-only semantics. BigBrain, cellular, molecular, connectivity, and Julich probabilistic records cannot create a lower-scale mission.

## Validation

| Validation | Result |
|---|---|
| Focused scientific tests | 25 passed: siibra provider, guarded Julich overlay, MNI decoder/eligibility, scientific architecture, BigBrain coordinate context, and non-registration safeguards |
| Actual provider mesh verification | Both bounded MNI cortical fragments fetched, decoded, validated for sizes/indexes, and transformed only with provider metadata |
| Local endpoint checks | Architecture manifest exposed exact MNI metadata/default-off state; HRA reference input rejected with HTTP 400 and `lunaToMni: NOT_ESTABLISHED`; MNI query returned BigBrain context and transparent Julich unavailability |
| Local UI inspection | Science panel rendered MNI `PARTIAL` default-off controls and disabled Julich `ASSET_DELIVERY_UNRESOLVED` controls; HRA boundary remained visible |
| `pnpm build` | Passed; existing analytics environment and bundle-size warnings only |
| `pnpm exec vite build` | Passed; same non-blocking warnings only |
| `git diff --check` | Passed |
| `pnpm test` | 234 passed, 14 failed, 2 skipped; failures remain external Supabase/NPC/GitHub/Vercel configuration baselines, not scientific-brain tests |
| `pnpm check` | Blocked by the pre-existing unresolved `server/storage` import in `server/_core/imageGeneration.ts`; no scientific-brain type error was emitted by builds or focused tests |

## Release decision

The implementation is eligible for source-control review and production release as a **scientifically bounded architecture**. It does not claim that a Julich region mesh is rendered, and it does not claim any HRA registration. Production acceptance must verify the deployed commit, read-only scientific architecture endpoint, UI default-off state, MNI stream behavior, HRA rejection path, and persistent Macro-only nanobot behavior.

## References

[1]: https://hubmapconsortium.github.io/ccf-releases/v1.1/docs/ref-organs/brain-female.html "HRA Brain-Female v1.1 reference-organ documentation"
[2]: https://purl.humanatlas.io/ref-organ/brain-female/v1.1 "HRA Brain-Female v1.1 source record"
[3]: https://siibra-api-stable.apps.hbp.eu/v3_0/spaces/minds/core/referencespace/v1.0.0/dafcffc5-4826-4bf1-8ff6-46b8a31ff8e2 "siibra MNI ICBM 152 2009c Nonlinear Asymmetric reference-space metadata"
[4]: https://raw.githubusercontent.com/FZJ-INM1-BDA/siibra-python/master/siibra/volumes/providers/neuroglancer.py "siibra Neuroglancer mesh-provider implementation"
[5]: https://jugit.fz-juelich.de/t.dickscheid/brainscapes-configurations/-/blob/siibra-0.4a86/spaces/icbm_152_2009c_nonl_asym.json "siibra MNI 2009c template configuration"
[6]: https://www.bic.mni.mcgill.ca/ServicesAtlases/ICBM152NLin2009 "ICBM 152 nonlinear 2009 template documentation"
[7]: https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777 "Julich-Brain Atlas v3.1 EBRAINS record"
[8]: https://search.kg.ebrains.eu/instances/Project/af8d3519-9561-4060-8da9-2de1bb966a81 "EBRAINS BigBrain project record"
[9]: https://search.kg.ebrains.eu/instances/Dataset/7a9aa738-a5b2-4601-818e-05db2627ba5c "EBRAINS transformation collection"
[10]: https://hbp-spatial-backend.apps.hbp.eu/openapi.json "EBRAINS hbp-spatial-backend OpenAPI"
[11]: https://siibra-python.readthedocs.io/en/latest/examples/03_data_features/006_connectivity_matrices.html "siibra connectivity feature documentation"
[12]: https://pmc.ncbi.nlm.nih.gov/articles/PMC13441889/ "siibra methods and cloud-linked data access"

## Anatomical identity

The existing **HRA → UBERON** evidence-reviewed identity layer remains authoritative for anatomical identity decisions, including the 102 approved identities. It is not treated as a spatial registration, a Julich crosswalk, or a coordinate transform. The Inspector continues to present HRA provenance and the `NOT_ESTABLISHED` scientific-registration boundary, and the Science workspace provides an explicit route to independently anchored scientific context rather than conflating the selected mesh with an MNI point.

## Scientific target hierarchy and nanobots

The application preserves distinct target classes: `visual-mesh-target` for local HRA Macro simulation, `structure-context-target` for anatomy evidence, `region-probabilistic-target` for Julich region context, and `scientific-coordinate-target` for independently entered provider coordinates. No target is automatically promoted. The MNI-to-BigBrain provider coordinate result is still a `scientific-coordinate-target` context, not a point-validated biological target. The existing nanobot resolver and mission engine remain Macro-only; no tissue, cellular, molecular, connectivity, Julich, MNI, or BigBrain record grants a lower-scale operation.

## Provenance and licensing

All scientific layers reuse the existing `ScientificProvenanceRecord` and `ScientificLicenseRecord` registries. The MNI cortical template links its provider metadata, source configuration, transform, direct source/attribution link, delivery policy, and fragment integrity values. The MNI source condition requires attribution; Luna streams it directly after user enablement and does not store a persistent copy. Julich retains **CC BY-NC-SA 4.0**, `LICENSE_REVIEW_REQUIRED`, and `ASSET_DELIVERY_UNRESOLVED`; it is not rendered or redistributed. BigBrain raw assets remain unavailable in Luna pending delivery/rights review, while the documented coordinate-transform dataset is retained as a source-qualified remote provider context.

## Performance and delivery

The initial HRA presentation load remains unchanged because the scientific MNI template is **default off**. Enabling the MNI template initiates exactly two provider requests: 1,366,303 and 1,386,028 compressed wire bytes, respectively. Browser-decoded mesh payloads are 2,638,432 and 2,673,676 bytes. The code constructs only two cortical meshes, disposes them on disable, performs no persistent cache write, and does not ship the asset in the application bundle. Initial-load timing, runtime memory, frame time, and interaction latency are not claimed as measured production metrics; they remain `REQUIRES_REVIEW` for production monitoring.

## Final decision matrix

| Capability | Status |
|---|---|
| Whole-brain visual model (HRA Brain-Female v1.1) | COMPLETE |
| Scientific 3D brain (provider-native MNI cortical template) | PARTIAL |
| Exact MNI ICBM 152 2009c Nonlinear Asymmetric reference | COMPLETE |
| Julich-Brain v3.1 maps and coordinate-query context | PARTIAL |
| Julich exact MNI cortical mesh overlay | REQUIRES_REVIEW |
| BigBrain MNI-coordinate microscopic context | PARTIAL |
| BigBrain raw imagery / layer rendering | REQUIRES_REVIEW |
| Tissue observations | PARTIAL |
| Cellular observations | PARTIAL |
| Molecular observations | PARTIAL |
| Connectivity observations | PARTIAL |
| HRA/UBERON anatomical identity | COMPLETE |
| HRA → MNI registration | NOT_ESTABLISHED |
| HRA → Julich spatial crosswalk | NOT_ESTABLISHED |
| Scientific coordinate targeting | PARTIAL |
| Point-validated biological targeting | UNAVAILABLE |
| Macro nanobots | COMPLETE |
| Scientific provenance | COMPLETE |
| Licensing / restricted asset handling | COMPLETE |
| Production deployment | COMPLETE |

## Production status

The scientific implementation commit **`0ac23509009cbc8ae3e54b4b548a21591330750a`** was pushed to `main` and deployed as Vercel production deployment **`dpl_CM47tQ2vWpvaraKvrTgZ9rrrWEQ7`**, state `READY`, at [https://senota-kstw5qhgc-senota-s-projects.vercel.app](https://senota-kstw5qhgc-senota-s-projects.vercel.app). Vercel deployment metadata verifies this exact Git commit and commit message.

Production acceptance confirmed that the HRA Macro model loads with 283 Navigator structures; Scientific Review remains 102/102 complete; Inspector and Macro nanobot panels remain present; the Science workspace preserves the `Luna → MNI: NOT ESTABLISHED` boundary; the MNI template is default off; and Julich remains visibly disabled as `ASSET_DELIVERY_UNRESOLVED`. The deployed scientific architecture endpoint returned HTTP 200 with the exact MNI reference, source-qualified observations, `hra-to-mni-2009c: NOT_ESTABLISHED`, `hra-to-julich-v3-1: UNMAPPED`, and the documented MNI-to-BigBrain transform. An explicit production MNI coordinate query produced BigBrain provider context and handled a transient Julich provider no-result transparently, without fabrication.

The intentional Julich rendering gap is not a reason to manufacture a surface; it remains visible and disabled in production.
