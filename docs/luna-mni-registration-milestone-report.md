# Luna Brain — Scientific Spatial Registration Milestone Report

**Project:** SenotaAI / Luna Brain  
**Assessment date:** 2026-08-25  
**Milestone result:** **MNI REGISTRATION: UNAVAILABLE**  
**Registration record version:** `luna-local-to-ebrains-mni-registration-v1` / `1.0.0`

> **Scientific conclusion.** The current Luna Macro GLB has verified Human Reference Atlas provenance, but the evidence does not publish a scientific local-mesh coordinate convention, a mesh-to-source mapping, a Luna-to-MNI transform artifact, or landmark validation. No affine, nonlinear field, scale, offset, rotation, bounding-box alignment, or display-normalization transform has been invented.

## 1. LUNA GLB PROVENANCE

The current Macro asset is `client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb`. It is 11,977,884 bytes and has SHA-256 `c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc`. The same digest was obtained from HuBMAP’s HRA v1.1 `Allen_F_Brain.glb`, establishing byte identity with that specific release artifact. HuBMAP identifies the object as Brain-female and documents that 141 structures derived using Allen Human Reference Atlas data were mirrored to form a whole brain and resized for Visible Human male/female bodies. [1] [2]

| Property | Result |
|---|---|
| Exact source asset | HuBMAP HRA v1.1 `Allen_F_Brain.glb` |
| Local path | `client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb` |
| SHA-256 | `c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc` |
| Source version | HRA Brain-female v1.1 |
| DOI | `10.48539/HBM724.XTTN.487` |
| License | CC BY 4.0 |
| Anatomical lineage | HRA presentation object derived using Allen Human Reference Atlas data; mirrored and resized |

The GLB is therefore a documented anatomical reference object, not evidence by itself that the mesh retains the coordinate system of the original Allen volume or any MNI template.

## 2. LUNA COORDINATE SYSTEM

**Scientific coordinate-system status: unknown.** The reproducible GLB audit script reports glTF 2.0, a Maya/Babylon exporter, 283 meshes, 286 nodes, and `topLevelExtras: null`. Its anatomical extras establish labels and lineage, but the asset contains no reference-space ID, units, axis orientation, origin, template declaration, voxel-to-world affine, transform artifact, or landmark-validation data.

| Question | Current answer | Evidence |
|---|---|---|
| GLB units | Unknown | No declaration in the inspected GLB or source record. |
| Orientation / axes | Unknown | No documented mesh coordinate convention or validation landmarks. |
| Origin / affine | Unknown | No source-volume-to-mesh transform was found. |
| MNI / ICBM frame | Absent | No MNI/ICBM ID or transform artifact is embedded or supplied. |
| Viewer centering / scaling | Presentation-only | `BrainViewer` normalization remains prohibited from scientific use. |

Mesh bounds and the existing viewer’s center/scale operation were not used to infer any scientific coordinate relationship.

## 3. MNI REGISTRATION

**Status: UNAVAILABLE.** The target is explicitly identified as **MNI ICBM 152 2009c Nonlinear Asymmetric**, a millimetre-based 1×1×1 mm MRI template. The exact template volume dimensions and axis orientation are intentionally not asserted in Luna because no authoritative template header was imported and those values would not solve the missing GLB bridge. [3]

The formal `LunaReferenceRegistration` record is available through the scientific manifest and every scale observation. It records the verified asset/version/hash, status `unavailable`, `transformArtifact: null`, unknown source units/orientation, non-evaluated landmark checks, provenance, and exact blockers. Luna↔MNI conversion returns `registration-unavailable`.

## 4. REGISTRATION METHOD

No registration method was established because authoritative evidence does not identify one for the exact GLB. The formal record consequently uses `registrationMethod: "unavailable"` and `transformType: "unavailable"` rather than a numerical matrix.

The source distinction is decisive: Allen’s 2020 3D reference atlas says its original 141-structure volumetric parcellation was drawn on **MNI ICBM 2009b Nonlinear Symmetric**, while Luna’s intended target is **MNI ICBM 152 2009c Nonlinear Asymmetric**. HuBMAP’s mirrored/resized presentation GLB is not documented with a volume-to-mesh map preserving that original coordinate frame. [4]

## 5. VALIDATION

No landmark-validation run was possible because there is no transform or source-to-target landmark correspondence. The application records this as `validation.status: "unavailable"`, not as a successful validation with omitted measurements.

| Validation check | Result | Reason |
|---|---|---|
| Left/right orientation | Not evaluated | Source mesh axes and landmark correspondences are unpublished. |
| Anterior/posterior orientation | Not evaluated | No source coordinate convention or transform artifact. |
| Hippocampal correspondence | Not evaluated | Anatomical labels are not landmark coordinate pairs. |
| Ventricular correspondence | Not evaluated | No mapped source-to-target landmark pair/residuals. |
| Scale / translation / rotation / inversion | Not evaluated | Requires a valid artifact and landmark test set. |

The strict conversion path nevertheless rejects NaN, Infinity, missing units, unknown reference spaces, version mismatches, missing transform ID, missing provenance, unsupported transforms, and unavailable Luna registration. No ungrounded out-of-bounds policy was added because an exact authoritative MNI image affine/dimensions was not imported, and it would not establish the GLB transform.

## 6. TISSUE

EBRAINS Julich-Brain provides legitimate provider-side maps, including published probability and maximum-probability maps in MNI ICBM 152 2009c Nonlinear Asymmetric. These are voxel/probability-map resources, not an automatically resolved Luna navigation point. [5] [6]

| Requirement | Current state |
|---|---|
| Dataset | EBRAINS / Julich-Brain cytoarchitectonic atlas |
| Reference space | MNI ICBM 152 2009c Nonlinear Asymmetric where documented by the relevant map |
| Coordinate support | Provider region/map semantics; no selected provider voxel/point in Luna |
| Luna transform | Unavailable |
| Target support | Unavailable; region metadata cannot become a Luna point |
| Nanobot status | Disabled |

The existing UI and Luna response explain the actual missing condition: provider region metadata can exist, but a validated MNI-to-Luna Local bridge and resolved coordinate do not.

## 7. MOLECULAR

Allen Human Brain Atlas material provides donor-MR/sample-coordinate pathways and documents donor-specific registration to MNI through `Alignment3d`. This is provider provenance, not a transform for the HuBMAP HRA GLB. [7] The independent AllenHumanGeneMNI workflow reinforces the distinction: it handles Allen donor MRI/sample coordinates to MNI NLIN SYM 09c, not the mirrored/resized HRA mesh or 2009c asymmetric target. [8]

| Requirement | Current state |
|---|---|
| Dataset | Allen Human Brain Atlas microarray metadata/service |
| Reference space | Allen donor-MR space; provider-documented donor-MR-to-MNI relationship |
| Coordinate support | Provider-side donor/sample provenance only |
| Luna transform | Unavailable |
| Target support | Unavailable; regional metadata is not a Luna coordinate |
| Nanobot status | Disabled |

## 8. CELLULAR

The Human Brain Cell Atlas/CELLxGENE integration remains a transcriptomic and anatomical-metadata source. It is not a whole-brain human cell coordinate field registered to Luna. The Allen ABC Atlas’s whole-brain coordinate-resolved MERFISH framework is mouse CCFv3; its relevant human content is regional, not a whole-brain MNI-to-Luna bridge. [9] [10]

| Requirement | Current state |
|---|---|
| Dataset | Human Brain Cell Atlas v1.0 / CELLxGENE metadata |
| Reference space | Anatomical annotation, not a 3D coordinate system |
| Spatial human cell coordinate | Unavailable for this whole-brain chain |
| Luna transform | Unavailable |
| Target support | Unavailable |
| Nanobot status | Disabled |

## 9. SUBCELLULAR

No legitimate whole-brain subcellular reference-to-Luna chain is present. The existing human cortical EM fragment remains unavailable for whole-brain navigation and has not been forced into the registration model. Subcellular targeting and nanobot operations remain disabled.

## 10. NANOBOT IMPACT

Only existing **Macro** mesh-derived simulation targeting remains actionable. Macro selection and missions preserve the prior behavior: Browser/Three.js resolves a selected structure’s presentation position only within the loaded local mesh, and missions remain explicitly simulated.

| Scale | Spatially actionable after this milestone | Reason |
|---|---|---|
| Macro | Yes — existing presentation/simulation only | Real viewer-mesh target; no external-coordinate claim. |
| Tissue | No | Provider region/map is not resolved into Luna without validated bridge and coordinate. |
| Molecular | No | Donor/sample pathway cannot be equated with the GLB. |
| Cellular | No | No genuine whole-brain human spatial coordinate chain. |
| Subcellular | No | No compatible whole-brain reference chain. |

Focused mission-engine tests confirm lower-scale metadata remains rejected and the Macro lifecycle, independent fleet behavior, target provenance, return flow, and archived results are preserved.

## 11. AI IMPACT

`LunaBrainActions` now exposes read-only, live-state queries: `getReferenceSpace()`, `getRegistrationStatus()`, `getTransformStatus()`, `getSpatialTarget()`, and `getScientificProvenance()`.

Luna’s bounded command interpreter now answers the required questions from actual observation state:

| Question | Grounded answer behavior |
|---|---|
| What coordinate system am I looking at? | Identifies the live reference space and explains when it is Luna Local without a validated MNI mapping. |
| Can you map this to MNI? | Refuses and gives the formal validation summary and missing evidence. |
| Can this tissue dataset be spatially targeted? | Reports the live Tissue capability gate and exact unavailability reason. |
| Why can’t I send a nanobot to the cellular layer? | Reports the lack of a genuine spatial coordinate, compatible chain, validated registration, and resolved target. |

No action query can invoke a transform, bypass the Macro-only mission gate, or access Three.js/React internals.

## 12. TESTS

| Command | Result |
|---|---|
| `python3 scripts/inspect-luna-glb-registration.py` | Passed; reports exact source hash, 283 meshes, 286 nodes, no top-level extras. |
| Focused scientific/Luna/mission tests | Passed: 30 tests across 4 suites in final run; broader related set passed: 38 tests across 7 suites. |
| `pnpm exec vite build` | Passed. Analytics environment and chunk-size warnings remain non-fatal. |
| `pnpm build` | Passed; client and server bundles generated successfully. |
| `pnpm test` | 179 passed, 2 skipped, 14 failed in pre-existing Supabase/admin-NPC environment-dependent tests; no registration suite failed. |
| `pnpm check` | Still fails only on pre-existing `server/_core/imageGeneration.ts` import `server/storage`; no registration-file type error remains. |
| `git diff --check` | Passed. |

The full test failures are confined to unconfigured Supabase nanite administration/preview paths and an administrator-session fixture; they are outside this scientific registration change.

## 13. BROWSER VALIDATION

Local browser acceptance ran on `http://127.0.0.1:3000/luna/brain`. A real Macro structure, **Body Of Hippocampus**, was selected. The existing Inspector was opened, and the existing Nanobot minimize control was used solely to reveal the Inspector where panels overlap.

| Browser check | Result |
|---|---|
| Macro model / navigator / selected structure | Passed |
| Existing Macro target behavior | Preserved; displayed as viewer-mesh resolved simulation target |
| Inspector reference-space label | Passed — `Luna viewer local coordinates` |
| Visible registration card | Passed — `MNI REGISTRATION: Unavailable` |
| Visible source identity | Passed — `HuBMAP CCF Brain-female v1.1 / Allen_F_Brain.glb` |
| Visible limitation summary | Passed — no Luna Local-to-MNI transform was validated |
| False MNI coordinates | Not displayed |
| Existing nanobot panel control | Passed — existing minimize control functioned |
| Live manifest API | Passed — formal unavailable record, null artifact, source hash and landmark status returned |

The interactive browser session reset to `about:blank`; a Chromium debugging fallback attached to the same local browser process and completed the route load, real selection, normal workspace controls, DOM verification, and screenshots. Details are preserved in `docs/luna-mni-registration-browser-validation.md`.

## 14. FILES CHANGED

| File | Change |
|---|---|
| `shared/brainScience.ts` | Added formal `LunaReferenceRegistration` contracts and manifest/observation fields. |
| `server/scientificData/registry.ts` | Added canonical unavailable registration record; verified Macro provenance; MNI 2009c 1 mm metadata. |
| `server/scientificData/coordinateTransformService.ts` | Added registration-aware rejection, strict request metadata checks, and registration accessor. |
| `server/scientificData/brainScienceService.ts` | Propagates registration record through every observation. |
| `client/src/components/brain/anatomy/BrainObservationContext.ts` | Exposes live registration state to client consumers. |
| `client/src/components/brain/anatomy/LunaBrainActions.ts` | Added five required live scientific query methods. |
| `client/src/components/brain/anatomy/LunaBrainOrchestrator.ts` | Added grounded coordinate/MNI/Tissue/Cellular responses. |
| `client/src/components/brain/AnatomicalInspector.tsx` | Added compact display-only unavailable-registration disclosure. |
| `server/scientificData/*.test.ts` | Added provenance, unavailable registration, strict coordinate, and pipeline assertions. |
| `client/src/components/brain/anatomy/LunaBrainOrchestrator.test.ts` | Added live-state answer and refusal tests. |
| `scripts/inspect-luna-glb-registration.py` | Added reproducible GLB metadata and SHA-256 audit. |
| `docs/luna-mni-registration-research.md` | Added primary-source evidence record. |
| `docs/luna-mni-registration-browser-validation.md` | Added browser/API acceptance record. |
| `server.js` | Updated tracked production server bundle generated by `pnpm build`. |

## 15. MANUAL USER ACTIONS

**No immediate manual action is required.** Luna remains truthful and operational at Macro scale without an MNI bridge.

A future registration implementation requires a **validated, versioned registration package**, not merely an MNI template download. If one is to be supplied, it must include the exact HRA GLB version/checksum, mesh-to-source mapping, units/axes/origin, source-to-MNI ICBM 152 2009c asymmetric affine and/or nonlinear artifact with checksums and method parameters, landmark pairs with residual/error criteria, provenance/DOI/license, and an independent validation outcome. The package should be placed under a new dedicated repository path such as `server/scientificData/artifacts/luna-reference-registration/`; Luna will then validate the checksums, version IDs, coordinate conventions, and landmark results before any executable transform is enabled.

## 16. REMAINING BLOCKERS

The only scientific blocker is the absence of an authoritative, reproducible, independently validated transform chain from the exact HuBMAP HRA v1.1 GLB local frame to MNI ICBM 152 2009c Nonlinear Asymmetric. The missing items are: a mesh-to-documented-source mapping; documented source units/orientation/origin; a versioned source-to-2009c-asymmetric artifact; and anatomical landmark-validation results.

The only unrelated repository validation blockers are the existing Supabase/admin-NPC environment-dependent test failures and the unresolved `server/storage` TypeScript import in `server/_core/imageGeneration.ts`.

## References

[1]: https://hubmapconsortium.github.io/ccf-releases/v1.1/docs/ref-organs/brain-female.html "HuBMAP CCF Brain-female v1.1"
[2]: https://apps.humanatlas.io/kg-explorer/ref-organ/brain-female/v1.4 "Human Reference Atlas 3D Reference Organ for Brain, Female v1.4"
[3]: https://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/ "MNI ICBM 152 Nonlinear Atlases (2009)"
[4]: https://community.brain-map.org/t/allen-human-reference-atlas-3d-2020-new/405 "Allen Human Reference Atlas – 3D, 2020"
[5]: https://search.kg.ebrains.eu/instances/ab191c17-8cd8-4622-aaac-eee11b2fa670 "Julich-Brain whole-brain collections of cytoarchitectonic probabilistic maps v2.9"
[6]: https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777 "Julich-Brain Atlas cytoarchitectonic maps v3.1"
[7]: https://brain-map.org/support/documentation/human-brain-atlas-api "Allen Human Brain Atlas API"
[8]: https://github.com/CoBrALab/AllenHumanGeneMNI "AllenHumanGeneMNI"
[9]: https://data.humancellatlas.org/hca-bio-networks/nervous-system/atlases/brain-v1-0 "Human Brain Cell Atlas v1.0"
[10]: https://brain-map.org/bkp/explore/abc-atlas "Allen Brain Cell Atlas"
