# Luna Brain — Authoritative HRA Spatial Registration Layer

**Project:** SenotaAI / Luna Brain
**Implementation date:** 2026-08-26
**Scope:** HRA coordinate integration for the exact local HRA v1.1 `Allen_F_Brain.glb` asset.
**Scientific determination:** **HRA reference-object placement is established for the checksum-pinned raw GLB. MNI registration remains unavailable.**

> The implemented layer records what the authoritative HRA graph proves: a versioned reference-object placement. It does not convert Luna presentation coordinates, GLB vertices, provider observations, or nanobot targets to MNI.

## IMPLEMENTED

A rendering-independent shared HRA spatial module now represents three scientific frames: the checksum-pinned raw GLB, HRA Brain-Female v1.1, and the HRA CCF body reference. It records the authoritative source/target placement fields, dimensions, provenance, checksum identity, validation state, and MNI boundary. The functions operate only on branded raw/HRA coordinate types and leave the Three.js presentation frame outside the scientific path.

The browser verifies the existing local GLB with SHA-256 before treating the HRA placement as established. A changed or unreadable future asset leaves the viewer usable but downgrades the HRA status to **requires revalidation**. The Inspector now gives a compact Macro-only HRA disclosure. Luna’s bounded action façade and deterministic assistant can report HRA status without authorizing coordinate conversion or any new mission.

| Layer | Implemented result | Boundary retained |
|---|---|---|
| Raw GLB → HRA Brain-Female | Deterministic, checksum-pinned affine placement | Not MNI; not Three.js presentation space |
| HRA Brain-Female → HRA CCF body | Deterministic, provenance-recorded affine placement | Not clinical stereotactic space; not a biological target |
| Viewer presentation | Existing centring, normalization, framing, picking unchanged | Cannot be supplied to HRA transform functions |
| Luna → MNI | No executable function or coordinates | `not-established` / existing Luna MNI record remains unavailable |
| Lower scales | No capability change | Tissue, Cellular, Molecular, and Subcellular operations remain blocked |

## HRA SPATIAL MODEL

The scientific chain is intentionally separate from rendering:

```text
checksum-pinned raw HRA v1.1 Allen_F_Brain.glb
        │
        │ local HRA ccf:SpatialPlacement
        ▼
HRA Brain-Female v1.1 spatial entity
        │
        │ global HRA ccf:SpatialPlacement
        ▼
HRA CCF body reference

raw GLB ────────────────► existing Three.js centring/scaling/camera presentation
                         (visual only; no scientific conversion)
```

The raw-to-HRA placement uses the published HRA v1.1 graph fields exactly: unit scale `(1, 1, 1)`, rotation `(-90, 0, 0)` degrees, and translation `(74.68038, -711.022258, 148.092479)` millimetres. The subsequent Brain-Female-to-body placement uses unit scale, zero rotation, and `(-74.68038, 711.022258, -148.092479)` millimetres. Both source-to-target transforms and their inverses are implemented through one affine application/inversion routine; no separately invented inverse constants were introduced. [1] [2]

## PROVENANCE

| Field | Value |
|---|---|
| HRA release | `v1.1` |
| Local asset | `client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb` |
| Authoritative asset | `Allen_F_Brain.glb` |
| Asset SHA-256 | `c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc` |
| Persistent identifier | `https://purl.humanatlas.io/ref-organ/brain-female/v1.1` |
| Machine-readable placement source | `https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json` |
| HRA license | CC BY 4.0 |
| Source record | HRA Brain-female v1.1 / HuBMAP CCF 3D Reference Object Library |
| HRA graph placement | Available and represented in the dedicated spatial registry |
| Landmark validation | `metadata-only`; deliberately unpopulated pending authoritative landmark pairs |
| MNI status | `not-established` |

The prior source investigation, retained in `docs/luna-hra-authoritative-reference-report.md`, documents the primary-source trace and the difference between HRA reference-object placement and the unavailable MNI chain.

## COORDINATE SPACES

| Coordinate space | Units | Purpose | Scientific status |
|---|---:|---|---|
| Raw Luna/HRA `Allen_F_Brain.glb` | mm | Checksum-pinned source of the HRA local placement | Scientific input only for the exact asset |
| HRA Brain-Female v1.1 | mm | Authoritative HRA reference-object target | Established HRA placement target |
| HRA CCF body reference | mm | HRA body-graph placement context | Established HRA placement target |
| Luna viewer presentation | None declared | Existing Three.js centring, normalization, camera/picking display frame | Visual only; not accepted by scientific transform functions |
| MNI ICBM 152 2009c Nonlinear Asymmetric | mm | External neuroimaging template | No Luna/HRA bridge established |

The existing `luna-viewer-local` registry space was clarified as a **presentation** frame. The raw GLB is a separate `raw-asset` reference space, preventing scientific functions from accepting visual scene coordinates by accident.

## VALIDATION

The source asset was rechecked locally during implementation. Its SHA-256 exactly matched the checksum pinned in the HRA registry. Unit tests verified the authoritative transform fields, a representative raw-to-HRA transformed point, both mathematical inverse paths, millimetre preservation, asset mismatch downgrade behavior, explicit exclusion of viewer-presentation coordinates, and the MNI unavailable status.

A future landmark validation framework is present but has no invented observations. Its typed records can capture landmark names, source/target coordinates and spaces, expected/observed relationships, residuals in millimetres, data source, date, and status. The framework correctly reports `metadata-only` until authoritative coordinate pairs and independent residual validation are available.

## MNI STATUS

**MNI registration remains unavailable.**

The HRA v1.1 placement does not establish GLB vertex-to-Allen-volume correspondence, HRA-to-ICBM 2009b correspondence, an ICBM 2009b-to-2009c transform, or Luna/HRA-to-MNI ICBM 152 2009c Nonlinear Asymmetric registration. The implementation therefore exposes only a `not-established` MNI status and intentionally provides no `lunaToMni`, `rawGlbToMni`, or `hraToMni` coordinate function. [3]

## NANOBOT STATUS

No lower-scale nanobot capability was enabled. Macro missions remain simulation-only and continue to use selected, viewer-resolved mesh targets under the existing lifecycle/confirmation system. Tissue, Cellular, Molecular, and Subcellular gates remain as before: HRA reference-object coordinates alone are not provider tissue, cell, molecular, or subcellular target coordinates.

The existing mission engine, history, target snapshots, return behavior, fleet independence, and red nanobot presentation were not changed.

## USER-FACING INTEGRATION

The Macro Inspector now displays a compact `HRA SPATIAL REFERENCE` card only when a structure is selected. It states the HRA asset, HRA Brain-Female / HRA CCF body placement, checksum pinning, `metadata-only` landmark status, presentation-only viewer coordinates, and `MNI status: not-established.` The existing separate MNI card remains visible and unavailable. No numeric HRA coordinate is shown because no raw selected mesh point is being promoted to an anatomical structure coordinate.

Luna’s data-only action façade now exposes `getHraSpatialRegistration()` and `getHraSpatialTransforms()`. Its deterministic command interpreter can answer an HRA reference-space question while explicitly refusing an MNI mapping. Neither path executes a transform for a visual point or expands mission authority.

## TEST RESULTS

| Check | Result |
|---|---|
| HRA transform/provenance suite | Passed: 9 tests |
| Focused HRA + registry + observation + transform-gate + mission + Luna suite | Passed: 41 tests across 6 files |
| `pnpm exec vite build` | Passed; pre-existing analytics environment and chunk-size warnings only |
| `pnpm build` | Passed; client and server bundles produced |
| `pnpm test` | 188 passed, 2 skipped, 14 known unrelated environment-dependent failures |
| `pnpm check` | Only known pre-existing `server/_core/imageGeneration.ts` unresolved `server/storage` diagnostic |
| `git diff --check` | Passed |
| Browser acceptance | Passed through local Chromium DevTools fallback; selected Macro structure, Inspector, HRA disclosure, MNI boundary, workspace controls, and unchanged Macro controls verified |

The 14 full-suite failures are confined to pre-existing Supabase, credential, Vercel-visibility, and NPC-administrator tests whose required external configuration is absent. No HRA spatial, coordinate-transform, viewer, Inspector, Luna-command, or nanobot test failed.

## FILES CHANGED

| File | Change |
|---|---|
| `shared/hraSpatial/HraSpatialReference.ts` | Branded coordinate spaces, pinned asset identity, viewer/MNI distinctions |
| `shared/hraSpatial/HraSpatialTransform.ts` | Published HRA placements, deterministic forward/inverse transforms, MNI unavailable status |
| `shared/hraSpatial/HraSpatialRegistry.ts` | Canonical checksum-aware HRA registration and revalidation resolution |
| `shared/hraSpatial/HraSpatialValidation.ts` | Typed unpopulated landmark-validation framework |
| `shared/hraSpatial/index.ts` | Shared HRA spatial entry point |
| `shared/brainScience.ts` | HRA registration on manifest and observation contracts; explicit HRA reference-space kinds |
| `server/scientificData/registry.ts` | Raw/HRA reference-space registry records and HRA manifest exposure |
| `server/scientificData/brainScienceService.ts` | Canonical HRA registration on every scientific observation |
| `client/src/components/brain/spatial/HraSpatialAssetVerification.ts` | Browser SHA-256 verification and revalidation-state helper |
| `client/src/components/brain/spatial/HraSpatialTransform.test.ts` | Transform, inverse, checksum, unit, viewer-boundary, and MNI tests |
| `client/src/components/brain/BrainViewer.tsx` | Rendering-independent checksum status integration into observation context |
| `client/src/components/brain/anatomy/BrainObservationContext.ts` | Canonical HRA registration context and checksum downgrade override |
| `client/src/components/brain/anatomy/LunaBrainActions.ts` | Read-only HRA registration/provenance/transform queries |
| `client/src/components/brain/anatomy/LunaBrainOrchestrator.ts` | Grounded HRA reference-space answer; no transform command |
| `client/src/components/brain/AnatomicalInspector.tsx` | Compact Macro HRA status disclosure |
| `server/scientificData/brainScienceService.test.ts` | Manifest/observation HRA and lower-scale boundary coverage |
| `server/scientificData/coordinateTransformService.test.ts` | Explicit raw/HRA reference-space coverage |
| `client/src/components/brain/anatomy/LunaBrainOrchestrator.test.ts` | HRA answer/provenance assertions with existing MNI refusal |
| `server.js` | Version-controlled generated deployment bundle updated by the validated production build |
| `docs/luna-hra-authoritative-reference-report.md` | Primary-source investigation record retained for this implementation |
| `docs/luna-hra-spatial-browser-validation.md` | Browser acceptance evidence |
| `docs/luna-hra-spatial-implementation-report.md` | This implementation and release report |

## REFERENCES

[1]: https://purl.humanatlas.io/ref-organ/brain-female/v1.1 "Human Reference Atlas — Brain-female v1.1 persistent record"
[2]: https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json "Human Reference Atlas v1.1 Brain-female machine-readable spatial graph"
[3]: https://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/ "MNI ICBM 152 nonlinear atlases (2009)"
