# Luna MNI Registration Browser Validation

**Local route:** `http://127.0.0.1:3000/luna/brain`  
**Validation date:** 2026-08-25  
**Method:** Local development server, Chromium debugging fallback after the interactive browser reset to `about:blank`.

## Macro selection and scientific disclosure

A live Macro anatomical structure, **Body Of Hippocampus**, was selected from the existing navigator. Rendered page text confirmed all of the following application-state facts:

| Check | Result |
|---|---|
| Macro structure selection | Passed — `Body Of Hippocampus` became the current target. |
| Existing 3D viewer / navigator / nanobot panel | Present and unchanged in the captured page. |
| Reference-space display | Passed — `Luna viewer local coordinates`. |
| Registration state | Passed — `MNI REGISTRATION` is `Unavailable`. |
| Exact asset provenance | Passed — `HuBMAP CCF Brain-female v1.1 / Allen_F_Brain.glb`. |
| Scientific limitation | Passed — rendered text says the asset is **not a documented MNI frame** and no Luna Local-to-MNI transform was validated. |
| False MNI-coordinate display | Not found in the selected Macro inspection state. |
| Macro nanobot behavior | Preserved — current target identifies the selected structure as a Macro simulation target. |

The selected-structure textual rendering contained the evidence-based validation summary and citation. The initial viewport screenshot showed the viewer, navigator, selected structure, and nanobot panel, while the Inspector was not visibly expanded in that capture; the next acceptance step will exercise the existing Inspector workspace control to confirm the compact disclosure is visible in its intended panel.

## API cross-check

`GET /api/brain-science/manifest` returned the formal registration record with status `unavailable`, exact source SHA-256, source version `HRA Brain-female v1.1`, `transformArtifact: null`, and non-evaluated landmark validation entries. This matches the text rendered in the local application.

## Visible Inspector acceptance

The existing **Inspector** workspace control was opened for the selected Macro structure. Because the current workspace permits overlapping side panels, the existing **Minimize Nanobot System** control was used to reveal the Inspector; no layout behavior or styling was changed. The final rendered screenshot visibly showed the compact amber registration card inside the existing Inspector panel.

| Visual check | Result |
|---|---|
| Existing Inspector panel | Passed — visible for the selected `Body Of Hippocampus` structure. |
| Existing Nanobot minimize control | Passed — minimized the panel and revealed Inspector; no nanobot behavior was altered. |
| Reference-space label | Passed — `Luna viewer local coordinates`. |
| Registration badge | Passed — `MNI REGISTRATION` with `Unavailable`. |
| Asset identity | Passed — `HuBMAP CCF Brain-female v1.1 / Allen_F_Brain.glb`. |
| Truthful limitation | Passed — it states that the asset is not a documented MNI frame and gives the exact no-transform validation summary. |
| False MNI coordinate | Not displayed. |
| Macro target wording | Preserved — target remains resolved only by the active viewer mesh and is explicitly not supplied by the scientific server observation. |

The screenshot is a local temporary validation artifact at `/tmp/luna-registration-inspector-final-acceptance.png`; it is not committed because it is generated evidence rather than a source asset.

## Browser limitation

The interactive browser tool reset from the local Luna route to `about:blank`. Validation therefore used the local Chromium debugging endpoint with the same browser process. The fallback successfully loaded the route, selected a real structure, operated existing workspace controls, captured DOM text, and saved screenshots. The local route and manifest API both responded successfully.
