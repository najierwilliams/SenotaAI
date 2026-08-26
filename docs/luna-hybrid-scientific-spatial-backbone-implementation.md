# Luna Hybrid Scientific Spatial Backbone — Implementation Report

**Date:** 2026-08-26  
**Scope:** Additive scientific-spatial implementation. The HRA Brain-Female v1.1 GLB remains Luna’s presentation model and was not replaced, edited, re-exported, transformed, or mapped to MNI.

> **Scientific boundary:** Luna/HRA visual coordinates remain presentation-only. **Luna → MNI is `NOT_ESTABLISHED`**. The implementation accepts only independently entered coordinates declared in the exact provider-scoped MNI reference space.

## Decision implemented

The implementation adopts the approved hybrid architecture: **retain the HRA visual brain, and add an independent EBRAINS/siibra scientific spatial backbone**. This avoids the unsupported inference that a Three.js mesh, GLB origin, model bounds, selected anatomy node, camera, or HRA body-placement coordinate could be used as an MNI coordinate. The preserved `NOT_ESTABLISHED` quality gate continues to reject both Luna/GLB → MNI and MNI → Luna transformations.

| Layer | Implemented role | Explicitly excluded behaviour |
|---|---|---|
| **Luna visual model** | Existing HRA Brain-Female v1.1 GLB continues to provide structure browsing, selection, Macro presentation, and local simulation context. | No MNI assignment, no scientific transform, no provider query input, no lower-scale physical target. |
| **Scientific spatial backbone** | EBRAINS/siibra MNI ICBM 152 2009c Nonlinear Asymmetric accepts explicitly user-entered millimetre coordinates for provider-backed context. | No silent MNI variant substitution, no use of unregistered visual coordinates, and no reverse mapping to Luna. |
| **Julich-Brain** | Read-only siibra v3.0 assignment request for Julich-Brain v3.1 provider context. | No downloaded map, mesh, atlas volume, or inferred Luna-structure-to-Julich correspondence. |
| **BigBrain** | Licensed provider context in its distinct microscopic reference space. | No BigBrain visual asset, volume, derived map, transform, cache, stream, or redistribution. |
| **Molecular, cellular, connectivity** | Bounded provider/sample-scoped context and limitations are visible to the user. | No interpolation onto the HRA mesh, no fabricated values at an entered MNI point, and no enabled lower-scale operation. |

## Reference-space contract

The canonical query reference is registered as **MNI 152 ICBM 2009c Nonlinear Asymmetric**, with siibra/openMINDS provider identifier `minds/core/referencespace/v1.0.0/dafcffc5-4826-4bf1-8ff6-46b8a31ff8e2`. The interface requires manually supplied `x`, `y`, and `z` values in **millimetres**. The reviewed siibra metadata reports the provider-native unit as micrometres; that source field is retained separately rather than converted implicitly. Axis orientation, handedness, and origin remain **unknown** because the reviewed provider metadata did not document them sufficiently for Luna to state a convention. [1]

| Metadata field | Stored value | Handling rule |
|---|---|---|
| Provider | EBRAINS / siibra | Remote, read-only, bounded server-side access. |
| Reference-space version | MNI 152 ICBM 2009c Nonlinear Asymmetric | Exact variant required; alternatives are rejected. |
| Query units | millimetres | Required request parameter. |
| Provider-native units | micrometres | Preserved as metadata; not silently converted. |
| Axis orientation / handedness / origin | unknown | Rendered as unknown; never inferred. |
| Julich dataset | Julich-Brain v3.1 | Returned as provider context only. |
| BigBrain reference | `ebrains-bigbrain` | Separate microscopic provider space, not an executable transform destination. |

## Source and interface changes

The shared scientific model now distinguishes **visual-mesh**, **structure-context**, **scientific-coordinate**, and **region-probabilistic** target kinds. A valid direct MNI request returns a `scientific-coordinate-target` with reference-space ID, point, dataset/version, evidence tier, provenance ID, license ID, and a limitation explicitly stating that it is not a Luna mesh target, biological target, or enabled lower-scale nanobot target.

The new server endpoint `GET /api/brain-science/scientific-coordinate-query` accepts only the exact canonical reference-space ID and `units=millimetres`; it rejects HRA and other visual-space declarations with HTTP 400 before provider access. `GET /api/brain-science/spatial-backbone` supplies the typed visual/scientific boundary, reference metadata, provider policy, BigBrain context, and limitations.

The new **Scientific Spatial Explorer** is discoverable from the Luna Brain **Science** menu and can also be opened from the Inspector. It visibly separates the HRA presentation model from the MNI scientific backbone, displays the provider ID, units, unknown metadata fields, and direct coordinate form, then shows Julich result status plus BigBrain, molecular, cellular, and connectivity context. The existing Navigator, Inspector, Nanobot controls, Lunar assistant, anatomical selection, and Macro visual workflows are preserved. The Inspector now explicitly explains that selected HRA structures have no MNI coordinate and routes users to the independent coordinate workflow.

## Provider, licence, and provenance safeguards

Every scientific-coordinate response includes provenance and licence identifiers for the siibra MNI reference, Julich-Brain, BigBrain provider context, Allen Human Brain Atlas context, CELLxGENE/Human Brain Cell Atlas context, and HCP connectivity context. The application keeps maps, volumes, meshes, H5AD files, connectivity matrices, and source assets out of the repository and browser bundle.

| Resource | Integration status | Licence / redistribution treatment |
|---|---|---|
| Julich-Brain v3.1 | Read-only provider assignment context | CC BY-NC-SA 4.0; not redistributed. [2] |
| BigBrain | Reference context only | CC BY-NC-SA 4.0; not downloaded, streamed, cached, transformed, or redistributed. [3] |
| Allen Human Brain Atlas | Sample/donor-scoped molecular context | Current provider terms require review; no raw data bundled. [4] |
| Human Brain Cell Atlas / CELLxGENE | Sample/dataset-scoped cellular context | Current provider terms require review; no H5AD or raw coordinates bundled. [5] |
| HCP | Provider-context connectivity statement | Current provider terms require review; no HCP surfaces, CIFTI, or matrices bundled. [6] |

## Safety controls retained

The existing `NOT_ESTABLISHED` Luna/MNI quality gate remains intact. `transformCoordinate`, `transformCoordinateStrict`, structure evidence, spatial capability evaluation, and the Nanobot target resolver retain their existing separation between a local presentation work point and a scientific coordinate. A valid MNI scientific-coordinate target is **not** a NanoBot target, and no tissue, cellular, molecular, or subcellular provider context is promoted to an operation merely because a provider lookup exists.

When a provider returns no assignment or fails, the interface returns explicit unavailable context. It does not invent a region, probability, transform, structure mapping, coordinate conversion, or Luna target.

## Validation record

| Check | Result | Notes |
|---|---|---|
| Focused scientific tests | **Passed: 19 tests across 3 files** | New scientific spatial service tests plus the existing coordinate-transform and structure-evidence suites passed. |
| `pnpm build` | **Passed** | Client and bundled production server completed. Existing warnings remain for unset analytics placeholders and a large client chunk. |
| Local API boundary | **Passed** | `spatial-backbone` exposed exact MNI metadata and `NOT_ESTABLISHED`; HRA-space query was rejected with HTTP 400. |
| Local provider query | **Safely unavailable** | An independently entered `[0, 0, 0]` mm MNI query returned an unavailable Julich assignment from the public siibra service; no substitute region or transform was generated. |
| Local interface | **Passed at DOM level** | Science menu and Explorer rendered with provider, exact MNI reference, and `Luna → MNI: NOT ESTABLISHED`; browser screenshot upload was unavailable during this validation. |
| `pnpm test` | **14 unrelated integration/configuration failures; 222 passed; 2 skipped** | The repaired scientific test is no longer among failures. Remaining failures concern unavailable Supabase/NPC configuration, administrator/game credentials, and configured GitHub/Vercel integration tokens. |
| `pnpm check` | **Blocked by existing unrelated alias error** | `server/_core/imageGeneration.ts` imports unresolved `server/storage`; no new spatial-backbone TypeScript error was reported. |

No Git commit, push, Vercel deployment, new visual asset, or speculative transform was created by this implementation.

## References

[1]: https://siibra-api-stable.apps.hbp.eu/v3_0/spaces?size=100 "siibra reference-space metadata"
[2]: https://siibra-api-stable.apps.hbp.eu/v3_0/redoc "siibra API v3.0 — coordinate assignment contract"
[3]: https://ftp.bigbrainproject.org/bigbrain-ftp/License.txt "BigBrain licence"
[4]: https://brain-map.org/support/documentation/human-brain-atlas-api "Allen Human Brain Atlas API documentation"
[5]: https://alleninstitute.github.io/abc_atlas_access/intro.html "Allen Brain Cell Atlas access documentation"
[6]: https://www.humanconnectome.org/study/hcp-young-adult/document/hcp-young-adult-2025-release "HCP Young Adult release documentation"
