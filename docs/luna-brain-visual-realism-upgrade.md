# Luna Brain Visual Realism Upgrade

**Scope:** Macro presentation only. This release improves rendering around the existing Allen brain GLB; it does not replace anatomy, alter datasets, change reference spaces, or modify mission behavior.

## Visual Changes

The existing `3d-vh-f-allen-brain.glb` remains the sole Macro asset. The scene now uses a transparent WebGL canvas over a subdued radial clinical stage, ACES filmic tone mapping, sRGB output, and restrained exposure. The light rig was refined from broad uniform illumination to a warm diffuse key, soft fill, and low-intensity rim with hemispheric ambient support. A 1024px PCF soft shadow map enables mesh-to-mesh depth cues while keeping the rendering stack unchanged.

Existing GLB mesh materials are retained in place. The visual helper preserves each mesh geometry, name, world transform, base color, texture maps, and material identity; it only caps metallic response, normalizes roughness to a biological-tissue range, reduces environment contribution, enables dithering, and allows each Macro mesh to cast and receive soft shadows. These changes make pre-existing folds, creases, and anatomical boundaries more legible without inventing structures or changing topology.

| Rendering area | Change | Preservation guarantee |
|---|---|---|
| Macro asset | Retained original 12 MB Allen GLB | No replacement, download, or new asset. |
| Material response | Reduced artificial sheen; restrained roughness tuning | Color, maps, geometry, names, transforms, and mesh identity unchanged. |
| Lighting | Soft clinical three-point composition with hemisphere light | No camera, selection, registry, or coordinate behavior modified. |
| Shadows | PCF soft shadows; Macro meshes cast/receive | No additional rendering package or duplicate Three.js. |
| Color pipeline | ACES filmic tone mapping and sRGB output | Existing UI, panels, and scientific claims untouched. |
| Background | DOM radial stage below an alpha WebGL canvas | Existing workspace overlays stay above the scene. |

## Functional Preservation

The following systems were not functionally changed: BrainStructureRegistry; mesh-derived target resolution; BrainObservationContext; Macro/Tissue/Cellular/Subcellular/Molecular observation architecture; scientific datasets; reference-space and coordinate-transform services; NanobotRegistry; NanobotMissionEngine; NanobotTargetResolver; navigation; results/history; capability gates; AI-facing actions; Anatomy Navigator; Anatomical Inspector; workspace menus; panels; minimize/restore/close; and the red nanobot visual system.

The selection highlight remains the existing blue highlight. Red nanobots remain untouched and retain their existing red material and emissive cues, ensuring visibility against the more anatomically legible Macro scene.

## Focused Validation

| Check | Result |
|---|---|
| Visual-presentation unit tests | Passed: 2 tests. The helper preserves base color, texture references, mesh geometry, name, and transform while enabling visual depth. |
| Combined visual, mission, and scientific focused suite | Passed: 4 files, 20 tests. |
| `pnpm exec vite build` | Passed; 2,048 modules transformed. |
| `pnpm build` | Passed; client and server bundle generated. |
| `git diff --check` | Passed. |
| `pnpm test` | 164 passed, 2 skipped, 14 failed in 12 known environment-dependent NPC/Supabase/administrator-session tests. The visual test and relevant brain/science suites passed. |

The Vite output retains the pre-existing optional analytics-variable and chunk-size warnings. Neither blocks the build. The full-suite failures are the same class of isolated missing Supabase nanite configuration and NPC administrator-session context observed before this visual-only work; no failure originated in the BrainViewer rendering, scientific registry, reference-space layer, or nanobot mission engine.

## Browser Validation Note

The local Luna route returned HTTP 200 and a clean local renderer session reported the existing Luna workspace and one WebGL canvas before the browser screenshot transport repeatedly reset to `about:blank`. Because the screenshot transport was unstable, no browser-image claim is made beyond the verified scene setup and DOM mount. The rendering configuration is covered by unit tests and production builds; the deployed production route remains the appropriate final visual acceptance surface.

## Files Changed

| File | Purpose |
|---|---|
| `client/src/components/brain/BrainViewer.tsx` | Existing renderer configuration, stage background, clinical lights, shadow setup, and invocation of the visual helper. |
| `client/src/components/brain/anatomy/BrainVisualPresentation.ts` | New small, testable rendering-only helper. |
| `client/src/components/brain/anatomy/BrainVisualPresentation.test.ts` | Focused preservation and visual-tuning tests. |
| `server.js` | Regenerated production server bundle from the required build. |
| `docs/luna-brain-visual-realism-upgrade.md` | This implementation and validation record. |

No scientific provider contract, coordinate model, dataset registry, GLB, texture, large dependency, shader package, post-processing package, or UI layout asset was added or replaced.
