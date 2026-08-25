# Luna Brain Scientific Dataset Integration Layer

## Purpose and scientific boundary

This implementation extends the existing Luna Brain observation-scale architecture without replacing the local Macro model or fabricating scientific measurements. The application now distinguishes **provider metadata**, **validated reference spaces**, **structure mapping state**, and **coordinate transformation availability**. It does not convert a provider’s sampled, probabilistic, or annotation-only data into a false whole-brain measurement.

> **Scientific interpretation rule:** A provider result is shown only as the provider returned it. A missing coordinate transformation, unmatched structure, missing gene/probe query, or unsupported microscopy dataset is represented explicitly rather than inferred.

## Data-source assessment

| Provider | Dataset | Scale | Access and browser approach | Authentication / download | Size and license position | Reference-space position |
|---|---|---:|---|---|---|---|
| Luna | Local Macro anatomy GLB | Macro | Local WebGL asset; loaded by the existing viewer | No authentication; no new download | Existing repository asset; source licensing should remain with the asset | `luna-viewer-local`; no MNI transform is asserted |
| EBRAINS / siibra | Multilevel Human Brain Atlas and Julich-Brain | Tissue | Public `siibra-api` HTTP metadata query through a server-side adapter; only bounded atlas metadata is returned | No token required for the tested public endpoint; raw maps are not downloaded | Julich source imaging is tera- to petabyte scale; dataset/asset terms remain provider-specific | EBRAINS MNI ICBM 152 2009c and BigBrain are represented explicitly [1] [2] |
| BigBrain | Microscopic human reference | Tissue | Registered as a future remote-streaming or derived-map candidate, not a browser asset | No local download requested | Full source is stated to exceed 1 TB; it is not committed or cached by Luna | BigBrain histological reference space [3] |
| CELLxGENE | Human Brain Cell Atlas v1.0 | Cellular | Public curation collection metadata is lazily queried through the server; the browser receives at most five matching dataset summaries | No token required for the tested metadata endpoint; H5AD files are not downloaded | The collection includes over three million nuclei; each H5AD remains remote and license terms are dataset-specific | Anatomical annotation metadata only; no provider-supported Luna-GLB 3D coordinates are assumed [4] [5] |
| Allen Institute | Allen Human Brain Atlas Microarray | Molecular | Public RMA structure-metadata lookup through the server; gene/probe values are intentionally not inferred | No token required for the tested RMA endpoint; donor archives are not downloaded | Downloads and use remain subject to provider terms and citation policy | Donor MR coordinates are represented separately; the provider documents donor-specific MR-to-MNI registration [6] |
| Human cortical EM | Petavoxel human cortical fragment | Subcellular | Registered as a future sample-scoped candidate; no query or asset is activated | No automatic download requested | Source imaging was reported at approximately 1.4 PB and is not a whole-brain atlas | No validated mapping to Luna canonical structures; therefore unavailable [7] |
| MICrONS | Mouse visual cortex connectomics | Not used in human scales | Researched but not registered as human data | Some dynamic data access requires registration | Public cloud data exists, but the resource is mouse P87 visual cortex | Deliberately excluded to prevent cross-species misrepresentation [8] |

The EBRAINS human atlas links probabilistic cytoarchitectonic maps with multiple reference spaces and BigBrain; the live siibra endpoint was tested during implementation and returned the Multilevel Human Atlas record. Julich-Brain probability maps are not thresholded into apparent absolute boundaries. The CELLxGENE collection endpoint was also tested live and returned provider metadata, including bounded hippocampal dataset matches. The Allen RMA endpoint returned a real `Hippocampus` provider record with ID `9427`; this remains a broad name mapping, not a coordinate registration or an inferred molecular expression value.

## Implemented architecture

The server owns all remote provider calls. This prevents browser CORS and credential exposure problems, centralizes timeouts, and prevents full provider payloads from entering the React bundle. Provider response data is normalized to shared application types and cached in memory for five minutes by **scale + canonical structure + displayed structure name**. A selected scale triggers exactly one lazy request; all sources are not loaded on application start.

| Layer | Files | Responsibility |
|---|---|---|
| Shared contract | `shared/brainScience.ts` | Defines dataset, status, provenance, reference-space, mapping, transform, and bounded finding types. It also contains clear labels for `available`, `partial`, `offline`, `requires-authentication`, and other states. |
| Dataset registry | `server/scientificData/registry.ts` | Central source-of-truth manifest for datasets, access methods, reference spaces, coordinate-transform availability, citations, licenses, limitations, and no-download policy. |
| Provider adapters | `server/scientificData/brainScienceService.ts` | Provides bounded EBRAINS/Julich, CELLxGENE, and Allen lookups; enforces request timeout, result limit, TTL cache, input sanitation, and offline containment. |
| Server API | `server/app.ts` | Adds `GET /api/brain-science/manifest` and `GET /api/brain-science/observation` behind the existing API boundary. |
| Browser query hook | `client/src/components/brain/anatomy/useBrainScientificObservation.ts` | Performs cancellable, lazy selected-context requests with explicit retry handling. |
| Observation bridge | `client/src/components/brain/anatomy/BrainObservationContext.ts` | Preserves the existing asset context while adding scientific status, provenance, reference space, mapping, and only provider-returned findings. |
| Existing Luna panels | `BrainViewer.tsx`, `BrainAnatomyNavigator.tsx`, `AnatomicalInspector.tsx`, `NanobotPanel.tsx` | Display dataset source/status/finding context without changing the existing workspace layout or presenting unsupported entities. |
| Nanobot compatibility | `NanobotTypes.ts`, `NanobotRegistry.ts`, `BrainViewer.tsx` | Adds a scientific-status snapshot alongside the existing mission status. Existing missions remain intact; lower-scale deployment stays disabled until coordinate-resolved provider support is available. |

## Reference-space and mapping safeguards

The registry declares these distinct spaces: Luna viewer local coordinates, EBRAINS MNI ICBM 152 2009c, BigBrain histological space, Allen donor MR space, and CELLxGENE anatomical annotation metadata. The configured Luna-local-to-MNI transform is **unavailable**; the browser never applies an arbitrary offset. The Allen donor-MR-to-MNI entry is documented as provider-supported but is not applied client-side. CELLxGENE is explicitly classified as annotation metadata rather than a 3D reference space.

The Luna `BrainStructureRegistry` remains canonical. Provider mappings are returned as `query-required`, `broad`, `exact`, or `unmapped`. For example, a unique Allen provider name lookup can be recorded as `broad`, while a child label such as **Head Of Hippocampus** remains unassigned rather than being silently mapped to a parent dataset label.

## Current observation-scale status

| Scale | Current result | What Luna displays | What Luna deliberately does not claim |
|---|---|---|---|
| Macro | **Available** | Existing local GLB, whole-brain navigation, selection, Inspector, camera behavior, and nanobot targeting | A transform from the GLB to MNI, BigBrain, or Allen donor space |
| Tissue | **Partially available** | Live EBRAINS/Julich atlas metadata, atlas provenance, reference space, and bounded provider findings | Raw BigBrain/Julich volume, binary boundaries from probabilistic maps, or viewer-local spatial projection |
| Cellular | **Partially available** | Live CELLxGENE Human Brain Cell Atlas metadata and up to five matching dataset summaries with provider cell/nuclei counts | Millions of rendered cells, H5AD download, expression matrix transfer, or 3D cell positions unsupported by the collection metadata |
| Subcellular | **Unavailable** | A clear scientific reason and source candidate: the available human EM resource is sample-scoped and unmapped | A general human-brain subcellular atlas, organelle/synapse values, or a simulated subcellular visualization |
| Molecular | **Partially available** | Live Allen structure metadata, source/provenance, provider reference space, and non-unique-match safeguards | Gene-expression values unless a future explicit gene/probe/donor query is made and returned by the provider |

## UI and nanobot behavior

The Viewer observation indicator now identifies the selected scientific source and status. The Navigator preserves the full Macro tree, while lower scales show only returned provider observations, mapping state, and reference space. The Inspector displays dataset status, provider, citation, mapping note, reference space, and exact returned findings. It displays no measurement when a provider has not returned one.

The red Nanobot System remains visually unchanged. It preserves existing mission targets and now captures the scientific dataset status in its target snapshot. Lower-scale deployments remain disabled even when a metadata dataset is partially available, because the currently connected providers do not supply coordinate-resolved operation data for the Luna viewer. This prevents any nanobot workflow from implying that it performed a scientific operation without an underlying supported dataset.

## Security, caching, and failure handling

No scientific-provider key is hard-coded. The current tested endpoints are public, so **no scientific environment variable is required** for this implementation. Future provider credentials, if needed, must be server-only and never prefixed with `VITE_`.

Remote requests use an eight-second server-side timeout and a five-minute in-memory TTL cache. The Cellular adapter returns at most five matching collection records. The server returns `offline` when a provider request fails, while Macro remains available. The application does not persist raw provider datasets, load all scales at startup, commit large data to GitHub, or request a user download.

## User actions required

**No manual action is required for the deployed metadata integrations.** The tested public EBRAINS/siibra, CELLxGENE curation, and Allen RMA metadata endpoints work without credentials.

No download is requested. If future work requires a local derived visual asset, it should be a specifically licensed, small derivative stored in object storage or a CDN—not a BigBrain volume, an H5AD collection, or raw EM imagery. If a future protected provider requires access, add a server-only environment variable after reviewing that provider’s current terms; do not expose it to the browser.

## Scientific limitations and next supported increment

The current Tissue and Cellular layers are **real metadata integrations**, not browser-resident scientific volumes. Molecular data currently reaches validated provider structure metadata only; a future controlled gene/probe query UI would need to require an explicit gene selection and display returned donor/sample/probe provenance. No molecular value should be precomputed from name mapping alone.

Subcellular remains intentionally unavailable. The identified human EM fragment does not establish a whole-brain canonical structure mapping, and its approximately petascale source data is unsuitable for a browser or Git repository. A future integration would require a provider dataset with explicit sample provenance, access terms, a supported retrieval service, and a validated mapping path to the canonical structure registry.

## Validation

| Check | Result |
|---|---|
| `pnpm exec vite build` | Passed with **2,044 transformed modules**; the existing analytics environment warnings and Vite large-chunk warning remain non-fatal. |
| `pnpm build` | Passed; server scientific adapters and Vercel entry compiled successfully. |
| Scientific data tests | Passed: **7 tests** covering registration, scale lookup, status semantics, reference-space boundary, Macro isolation, cache behavior, provider failure containment, and unavailable subcellular data. |
| Existing client suite | Passed previously and remained green when run as the focused client suite. |
| Full existing suite | The scientific test passed. The suite retains **14 failures across 12 test files** caused by missing pre-existing Supabase, NPC game key, GitHub canon token, and GitHub webhook secret configuration; they are unrelated to this integration. |
| Browser checks | Macro remained functional. Tissue showed live EBRAINS/Julich metadata and provenance. Lower-scale panels rendered exact status without client errors; unmatched canonical labels were not falsely mapped. The workspace returned to Macro successfully. |

## References

[1]: https://ebrains.eu/data-tools-services/brain-atlases/human-brain "EBRAINS Human Brain Atlas"
[2]: https://ebrains.eu/data-tools-services/tools/siibra-api "siibra API"
[3]: https://bigbrainproject.org/ "BigBrain Project"
[4]: https://chanzuckerberg.github.io/cellxgene-census/ "CZ CELLxGENE Discover Census"
[5]: https://cellxgene.cziscience.com/collections/283d65eb-dd53-496d-adb7-7570c7caa443 "Human Brain Cell Atlas v1.0"
[6]: https://brain-map.org/support/documentation/human-brain-atlas-api "Allen Human Brain Atlas API"
[7]: https://www.nih.gov/news-events/nih-research-matters/study-reveals-unseen-details-human-brain-structure "NIH: Unseen details of human brain structure revealed"
[8]: https://www.microns-explorer.org/cortical-mm3 "MICrONS cortical cubic millimetre resource"
