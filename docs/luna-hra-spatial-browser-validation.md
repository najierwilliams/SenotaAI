# Luna HRA Spatial Layer — Browser Validation

**Route:** `http://127.0.0.1:3000/luna/brain`
**Validation date:** 2026-08-26
**Method:** Local Chromium DevTools session against the current development server. The interactive browser reset to a blank page, so this deterministic fallback was used against the same route.

The browser loaded the Luna Brain workspace, rendered the existing Macro GLB, and reported **283 anatomical meshes**. The Anatomical Navigator remained functional: the Left Hemisphere Hippocampus group was expanded and the existing **Head Of Hippocampus** control selected a real Macro structure. The existing Inspector workspace control opened normally, preserving its panel controls and the surrounding workspace menus.

| Acceptance item | Result | Evidence from rendered DOM |
|---|---|---|
| Macro anatomy rendered | Passed | `Luna's brain online · 283 anatomical meshes` |
| Real Macro structure selection | Passed | Inspector heading: `Head Of Hippocampus` |
| HRA status disclosure | Passed | `HRA SPATIAL REFERENCE` with `Established` |
| Exact HRA asset disclosure | Passed | `HRA v1.1 Allen_F_Brain.glb · HRA Brain-Female / HRA CCF body placement.` |
| Raw/presentation boundary | Passed | `Source asset checksum is pinned; landmark validation is metadata-only. Viewer presentation coordinates remain visual only.` |
| MNI boundary | Passed | `MNI status: not-established.` and existing `MNI REGISTRATION — Unavailable` card |
| Inspector workspace control | Passed | `Inspector Open`, `Minimize Inspector`, and `Close Inspector` controls were present |
| Existing lower-scale boundary | Preserved | Inspector retained the existing unavailable spatial-target disclosure; no lower-scale deployment action appeared |
| Macro nanobot controls | Preserved | Existing Scout, Diagnostic, Repair, Monitor, Pause, Resume, Return, and Clear controls remained present |

The HRA status appeared in the selected Macro Inspector only. No numeric HRA coordinate was displayed, no coordinate was labeled MNI, and no visual GLB placement was changed. The validation screenshot is retained at `/tmp/luna-hra-browser-acceptance.png` for the release record.

## Final visual confirmation

After invoking the normal **Inspector Open** command and the existing labeled **Minimize Nanobot System** control, the rendered Inspector was visible without panel obstruction. The screenshot showed the compact green **HRA SPATIAL REFERENCE — Established** card above the separate amber **MNI REGISTRATION — Unavailable** card. Its visible text identified `HRA v1.1 Allen_F_Brain.glb`, `HRA Brain-Female / HRA CCF body placement`, checksum pinning, `metadata-only` landmark validation, presentation-only viewer coordinates, and `MNI status: not-established.` The anatomical Navigator, selected Head Of Hippocampus state, GLB rendering, and existing pointer-control footer remained unchanged.
