# Luna Brain EBRAINS Scientific Backend Integration

**Date:** August 25, 2026

**Scope:** Read-only EBRAINS/siibra scientific context; no visual-model migration or coordinate registration.

## Result

Luna now has a server-side, read-only EBRAINS/siibra provider adapter. The checksum-pinned HRA `Allen_F_Brain.glb` remains the default visual model and fallback. Existing Navigator, Inspector, workspace, Macro simulation, red nanobots, mission lifecycle, and lower-scale gates were not redesigned or replaced.

The integration deliberately separates two facts: **provider scientific context is available** through EBRAINS/siibra metadata, while **Luna GLB spatial registration to any EBRAINS reference space is not established**. No provider coordinate is projected into the Three.js viewer, and no provider map/region is converted into a nanobot target.

## Integrated provider surface

| Provider / dataset | Integration status | Luna use | Spatial relationship to Luna |
|---|---|---|---|
| EBRAINS / siibra Multilevel Human Atlas | Read-only public metadata adapter | Atlas identity, reference-space catalog, parcellation-reference count | Not established |
| Julich-Brain Cytoarchitectonic Atlas | Existing Tissue observation now remains the primary remote atlas context | Probabilistic cytoarchitecture metadata and provenance | Not established |
| BigBrain Microscopic Human Brain Reference | Display-only scientific context in the existing Tissue observation | 20 μm histological-reference metadata and availability limitation | Not established |

The adapter uses the documented public siibra v3.0 atlas and space endpoints. It performs no downloads of BigBrain volumes, MNI archives, maps, meshes, or deformation fields. [1] [2]

## API

The existing `/api/brain-science/manifest` and `/api/brain-science/observation` routes remain intact. The following normalized, read-only routes were added:

| Route | Response and safeguard |
|---|---|
| `/api/brain-science/providers` | EBRAINS provider identity, capabilities and explicit limitations |
| `/api/brain-science/datasets` | EBRAINS, Julich-Brain and BigBrain registry records |
| `/api/brain-science/reference-spaces` | Curated EBRAINS/BigBrain space records; no inferred conventions |
| `/api/brain-science/atlas` | Cached Multilevel Human Atlas metadata and parcellation-reference count |
| `/api/brain-science/regions` | Explicit unavailable state; no name-derived provider region mapping |
| `/api/brain-science/features` | Explicit unavailable state; no unsupported feature inference |
| `/api/brain-science/provenance` | Dataset/provider/version/source/licence/attribution context |
| `/api/brain-science/registration` | Existing Luna registration record with status `not-established` |

Provider metadata is fetched server-side with an 8-second timeout and a five-minute in-memory cache keyed by endpoint scope. A provider outage returns an explicit offline state and does not affect local Luna Macro rendering.

## UI and observations

The existing observation consumers already render dataset/provider, reference space, registration status, findings, provenance/citation, and unavailable spatial-target messaging. The Tissue observation now includes a bounded **BigBrain scientific context** finding that identifies its 20 μm histological role and explicitly says a browser-native full-brain asset is unavailable. This is metadata only; it does not load BigBrain data or alter the Luna mesh.

Mission targets already snapshot the normalized scientific observation, dataset provenance, reference space, transform record, mapping status, target state, capability state and limitations. Consequently Macro missions can retain the provider context available at mission creation without changing their mesh-derived simulation routing. Tissue, Cellular, Molecular and Subcellular operations remain unavailable/disabled when coordinate resolution is absent.

## Spatial and nanobot safety

The strict coordinate gate remains unchanged. It requires a registered transform ID and provenance, rejects unregistered Luna source/target transformations, rejects provider-documented but non-executable transforms, and permits only identities within the same declared space. In particular, MNI 2009b and 2009c remain distinct and no HRA, BigBrain, Julich-Brain or viewer-normalization operation is composed into a Luna scientific transform.

| Scale | Scientific context | Luna spatial registration | Nanobot operation |
|---|---|---|---|
| Macro | Current checksum-pinned HRA model; EBRAINS context can be reported | HRA reference-object placement established; external provider mapping not established | Enabled simulation only |
| Tissue | Julich/EBRAINS metadata and BigBrain context | Not established | Disabled |
| Cellular | Existing bounded CELLxGENE metadata | Not established | Disabled |
| Molecular | Existing bounded Allen metadata | Not established | Disabled |
| Subcellular | Existing unavailable state | Not established | Unavailable |

## Licence and provenance

The adapter does not redistribute provider data. BigBrain and Julich-Brain visual/data materials retain their provider-specific licence and attribution requirements; the prior evaluation recorded CC BY-NC-SA 4.0 restrictions for evaluated BigBrain and Julich assets. The provider adapter stores and exposes registry source URLs, citation/attribution and licence text rather than treating siibra software access as a data redistribution right. [3] [4]

## Files changed

| File | Purpose |
|---|---|
| `server/scientificData/ebrainsProvider.ts` | Read-only EBRAINS/siibra metadata adapter, five-minute cache and unavailable-region/feature guard |
| `server/scientificData/ebrainsProvider.test.ts` | Provider discovery, atlas normalization, cache, offline containment and no-inference regression tests |
| `server/app.ts` | Normalized `/api/brain-science/*` provider routes |
| `server/scientificData/brainScienceService.ts` | Bounded BigBrain scientific-context finding in Tissue observations |
| `server/scientificData/brainScienceService.test.ts` | Regression coverage for the bounded BigBrain finding and retained no-target state |
| `server.js` | Generated Vercel server bundle |

## Validation

Focused tests passed: **18 tests across 3 files** covering EBRAINS provider metadata/cache/offline behavior, existing scientific observation behavior, and Macro nanobot safety. `pnpm exec vite build` and `pnpm build` passed. `pnpm check` still reports the pre-existing unrelated `server/_core/imageGeneration.ts` import of unresolved `server/storage`.

The full suite reported **194 passed, 2 skipped and 14 known unrelated failures**, matching the existing Supabase configuration, administrative-session and external-environment failure class; no failure involved the EBRAINS adapter, scientific observation, coordinate gate or nanobot mission safeguards.

## Limitations

This release does not expose an authoritative Julich per-structure mapping, live probability/map-value/containedness/correlation/IoU query, cellular coordinate target, molecular value query, BigBrain volume-of-interest stream, or provider-to-Luna transform. Each remains unavailable until a provider-supported exact query and evidence-backed mapping/registration path are added.

## References

[1]: https://siibra-api-stable.apps.hbp.eu/v3_0/atlases/juelich/iav/atlas/v1.0.0/1 "siibra v3.0 Multilevel Human Atlas endpoint"
[2]: https://siibra-api-stable.apps.hbp.eu/v3_0/spaces "siibra v3.0 reference-space endpoint"
[3]: https://ftp.bigbrainproject.org/bigbrain-ftp/License.txt "BigBrain licence"
[4]: https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777 "EBRAINS Knowledge Graph — Julich-Brain v3.1"
