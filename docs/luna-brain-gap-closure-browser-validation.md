# Luna Brain Gap-Closure Browser Validation

**Date:** 2026-08-25
**Route:** `http://localhost:3000/luna/brain`
**Method:** Local Chromium rendered-DOM acceptance, with the existing workspace controls and assistant chat UI.

## Acceptance Outcome

| Workflow | Rendered evidence | Outcome |
| --- | --- | --- |
| Existing workspace preservation | The rendered page retained the Anatomy, Inspector, Nanobots, Luna, Scales, Missions, and View workspace menus; Navigator, Inspector, and Nanobot Panel remained mounted. | **Passed** |
| Assistant entry point | The workspace **Luna** dropdown exposed **Open Luna Assistant — Assisted, state-grounded brain control**. Opening it mounted the compact assistant with its live scale/dataset/selection context. | **Passed** |
| Canonical target selection | The existing Navigator expanded Left Hemisphere → Hippocampus and selected **Head Of Hippocampus**. The Inspector identified its model identifier as `Allen_head_of_hippocampus_L`. | **Passed** |
| Sequence plan and confirmation | The assistant accepted `Plan a sequence: scout then diagnostic.` with the selected canonical target. It rendered `step-1-scout` followed by dependent `step-2-diagnostic`, showed the simulation disclosure, and rendered **Confirm sequence** before dispatch. | **Passed** |
| Consequential execution gate | Clicking **Confirm sequence** rendered `Sequence Scout → Diagnostic · Head Of Hippocampus is active.` A single red Scout was active/navigating; the Diagnostic step remained dependency-blocked until the Scout can return and archive a successful result. | **Passed** |
| Original mission context | After switching viewer presentation to Tissue, the active Scout retained `Original observation: Macro`, its mesh-derived Luna Local work point, the Macro reference-space limitation, and a `View-only transition` message. | **Passed** |
| Tissue scientific gate | Tissue loaded the **Julich-Brain Cytoarchitectonic Atlas** and rendered the precise reason: `Tissue atlas maps are available in provider reference spaces, but no validated reference-space registration into Luna Local exists.` A new diagnostic plan was **Not executable**, ended with **No mission will be executed**, and did **not** show Confirm. | **Passed** |

## Boundary Evidence

The active Macro mission displayed the captured source asset and the frozen limitation that its native glTF mesh frame has undocumented units, orientation, origin, and template, and is not an MNI, ICBM, donor-MR, or BigBrain registration. The lower-scale viewer change did not alter the mission target or create a lower-scale operation.

The interactive browser transport continued to render a blank WebGL screenshot despite a valid local page title. The headless Chromium fallback rendered the full DOM and completed the actual control flow above. This is documented as a transport limitation rather than an application failure.

## Build Context

The browser flow was executed against the local development server after successful `pnpm exec vite build` and `pnpm build` runs. The known analytics environment warnings and Vite chunk-size advisory remained nonfatal.
