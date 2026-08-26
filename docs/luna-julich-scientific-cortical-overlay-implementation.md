# Julich/siibra Scientific Cortical Overlay — Guarded Implementation Report

**Author:** Manus AI  
**Date:** 2026-08-26  
**Implementation status:** **Guarded, non-rendering provider integration**  
**Production deployment status:** **Not deployed**

## Executive summary

SenotaAI now exposes a typed, provider-backed declaration for the requested **Julich/siibra Scientific Cortical Overlay**. The declaration preserves the exact Julich-Brain v3.1 and MNI ICBM 152 2009c Nonlinear Asymmetric scientific identifiers, provenance, map IDs, default-off visibility state, opacity state, and a separate future **region-probabilistic** selection contract. The application does **not** render a Julich surface, load any provider asset, or create a spatial relationship to the HRA GLB.

The provider’s public v3.1 bucket was inspected using its documented metadata-listing interface, without downloading a data object. That listing exposes FreeSurfer fsaverage **label** files and MNI-labelled **NIfTI volumes**, but no exact MNI ICBM 152 2009c Nonlinear Asymmetric cortical surface geometry, mesh ID, or streamable mesh URL. The fsaverage labels and NIfTI volumes are scientifically ineligible substitutes under the stated constraints. The application therefore surfaces **`ASSET_DELIVERY_UNRESOLVED`** and **`LICENSE_REVIEW_REQUIRED`**, disables rendering, visibility, opacity, hover, and region-picking controls, and does not proceed to deployment. [1] [2]

> **Scientific boundary:** HRA Brain-Female v1.1 remains the unchanged whole-brain presentation, anatomy-selection, and Macro-simulation model. **HRA/Luna → MNI remains `NOT_ESTABLISHED`.** No visual juxtaposition, viewer normalization, mesh name, anatomy label, proximity rule, coordinate conversion, or inferred crosswalk is treated as registration.

| Area | Result |
|---|---|
| HRA Brain-Female v1.1 GLB | Retained, presentation/Macro-simulation only |
| Luna/HRA → MNI | **`NOT_ESTABLISHED`** |
| Scientific reference | MNI ICBM 152 2009c Nonlinear Asymmetric |
| Julich parcellation | Exact v3.1 provider ID ending `-310` |
| Exact MNI cortical mesh | Not identified in public v3.1 provider bucket |
| Rendering path | Deliberately disabled; no substitute generated |
| Region selection | Typed for future provider geometry, currently unavailable |
| Direct MNI → Julich query | Retained for independently entered MNI-mm coordinates |
| BigBrain/cellular/molecular | Remain separate, provider/sample-scoped contexts |
| Production deployment | Withheld because the required exact renderable asset and deployment-use clearance are unresolved |

## Verified provider identity and asset evidence

The integration records Julich-Brain Atlas cytoarchitectonic maps **v3.1**, persistent DOI **`10.25493/KNSN-XB4`**, and Knowledge Graph record **`f1fe19e8-99bd-44bc-9616-a52850680777`**. The dataset record declares CC BY-NC-SA 4.0 and documents maps in MNI ICBM 152 (2009c Nonlinear Asymmetric), Colin 27, and FreeSurfer fsaverage space. It also describes a 148-area surface model based on cortical areas and gap maps; however, that statement does not identify a standalone MNI surface geometry file or mesh identifier. [1]

| Contract | Exact recorded value |
|---|---|
| Luna scientific reference ID | `ebrains-mni-icbm-152-2009c` |
| Provider reference-space ID | `minds/core/referencespace/v1.0.0/dafcffc5-4826-4bf1-8ff6-46b8a31ff8e2` |
| Provider parcellation ID | `minds/core/parcellationatlas/v1.0.0/94c1125b-b87e-45e4-901c-00daee7f2579-310` |
| Labelled MNI map ID | `siibra-map-v0.0.1_mni152-jba31-labelled` |
| 207-area statistical map ID | `siibra-map-v0.0.1_mni152-jba31_207-continuous` |
| 227-area statistical map ID | `siibra-map-v0.0.1_mni152-jba31_227-continuous` |
| Dataset license | CC BY-NC-SA 4.0 |
| Provenance registry ID | `julich-brain-v3-1-mni-2009c` |
| License registry ID | `julich-brain-v3-1` |

The documented Data Proxy API supports public, metadata-only bucket-object listings. The public v3.1 bucket is `d-f1fe19e8-99bd-44bc-9616-a52850680777`. Its top-level listing contains `fsaverage_surface/`, the MPM and PM directories, and metadata/terminology files. No object body was requested. [2]

| Inspected provider object | Format and size | Scientific eligibility | Decision |
|---|---:|---|---|
| `fsaverage_surface/lh.JulichBrainAtlas_3.1.label.gii` | GIFTI label, 69,913 bytes | fsaverage; label only, not an MNI 2009c mesh | Rejected |
| `fsaverage_surface/rh.JulichBrainAtlas_3.1.label.gii` | GIFTI label, 69,549 bytes | fsaverage; label only, not an MNI 2009c mesh | Rejected |
| `…207areas_MPM_lh_MNI152.nii.gz` | NIfTI volume, 151,961 bytes | MNI-labelled volume; not provider-published cortical geometry | Rejected |
| `…207areas_MPM_rh_MNI152.nii.gz` | NIfTI volume, 154,140 bytes | MNI-labelled volume; not provider-published cortical geometry | Rejected |

No exact MNI cortical mesh was inferred from file names, reconstructed from NIfTI, transformed from fsaverage, aligned to HRA, or acquired from a different Julich release or coordinate space. In particular, v2.9/fsaverage material is not used.

## Implemented safeguards and user experience

The new `JulichCorticalOverlay` shared contract records exact provider metadata, inspected assets, the required exact geometry, licensing status, delivery status, controls, provenance, and hard scientific limitations. `JulichScientificRegion` is a separate type from Luna’s visual structure selection and requires a `region-probabilistic-target`; it has no inferred HRA relationship, viewer point, MNI-to-Luna conversion, or nanobot capability.

The implementation adds `JULICH_CORTICAL_OVERLAY` and a read-only `/api/brain-science/julich-cortical-overlay` response. The same manifest is included in `/api/brain-science/spatial-backbone`, ensuring that the existing Science workspace obtains the controlled state from the scientific backend rather than inventing client-side provenance.

The Scientific Spatial Explorer now shows a **Scientific Cortex · Julich v3.1** section. It displays the exact provider parcellation, named reference, asset-delivery reason, CC BY-NC-SA 4.0 status, provenance link, a disabled default-off visibility control, and disabled opacity slider. Disabled hover and selection are explicit: no stable provider geometry with stable region IDs is registered. The Science menu surfaces the same unavailable state, and the Anatomical Inspector makes clear that no Julich region is selected from an HRA structure.

| Safety mechanism | Enforced behavior |
|---|---|
| Renderability gate | Rendering requires a provider stream, URL, surface ID, format, size, enabled controls, and cleared license status |
| Current asset gate | `ASSET_DELIVERY_UNRESOLVED` prevents visibility from being set to true |
| Opacity gate | Value cannot be altered while the asset is non-renderable |
| Selection gate | Only future provider-region selections with `region-probabilistic-target` could be retained; unavailable geometry clears selection |
| HRA separation | No Three.js overlay root, transform, alignment, or HRA mesh mapping is created |
| Coordinate safety | Direct MNI-mm query remains independent of viewer, camera, GLB, HRA, and mesh positions |
| Nanobot safety | Existing Macro-only mission and target resolvers remain unchanged |
| Data handling | No Julich map, mesh, volume, label file, or BigBrain asset is downloaded, bundled, cached, streamed, or redistributed |

## Validation

Focused scientific-provider and overlay tests passed.

| Validation | Result |
|---|---|
| Focused `ebrainsProvider`, scientific-spatial, and overlay tests | **19 passed / 0 failed** |
| Production application build | **Passed** |
| Standalone Vite build | **Passed** |
| `git diff --check` | **Passed** |
| Full Vitest suite | **228 passed / 14 failed / 2 skipped** |
| Type check | Blocked by pre-existing `server/_core/imageGeneration.ts` import of unresolved `server/storage` |

The 14 full-suite failures are in pre-existing external-configuration domains, including Supabase/NPC administration, GitHub webhook/token, and Vercel/agent credential integration tests. No guarded-overlay test failed. The production build emitted existing analytics-environment and large-chunk warnings but completed successfully. The generated `server.js` file was restored after the build so it is not an unintended source change.

## Deployment decision and activation requirements

A commit, push to `main`, and production deployment are intentionally **withheld**. Publishing the current source would automatically make an optional production interface claim an incomplete rendering feature, while the exact required renderable provider asset and deployment-use clearance are absent. This follows the instruction to stop the rendering portion rather than fabricate a scientific overlay.

Before a future production deployment may render the overlay, all of the following evidence must be present and reviewed.

| Required evidence | Current state |
|---|---|
| Exact Julich-Brain v3.1 cortical mesh in MNI ICBM 152 2009c Nonlinear Asymmetric | Missing |
| Immutable provider asset URL and provider surface ID | Missing |
| Provider-declared format and byte size for that mesh | Missing |
| Stable provider region-ID-to-geometry association | Missing |
| Explicit public web streaming/caching/bundling permission compatible with the deployment | Not cleared |
| CC BY-NC-SA production-use review | `LICENSE_REVIEW_REQUIRED` |
| Browser loading/CORS and performance validation using the eligible asset | Not applicable until asset is identified |
| Separate visual-root lifecycle and region hover/selection validation | Not applicable until a stable provider mesh exists |

Once these prerequisites are met, the overlay can be promoted from a guard manifest to a lazy provider-streamed Three.js scene root. That future root must remain scientifically separate from `brainRoot`, use only provider-native geometry, preserve all provider region IDs, never normalize against HRA bounds, and still keep Luna/HRA → MNI as `NOT_ESTABLISHED`.

## References

[1] [EBRAINS Knowledge Graph: Julich-Brain Atlas, cytoarchitectonic maps v3.1](https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777)

[2] [EBRAINS Data Proxy API documentation](https://data-proxy.ebrains.eu/api/docs)

[3] [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode)

[4] [MNI ICBM 152 nonlinear atlases, 2009](https://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/)
