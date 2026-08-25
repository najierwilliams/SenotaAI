# Nanobot Interior Target and Return Cleanup

## Correction

Macro mission targets remain derived from the selected, loaded Luna GLB mesh. The visual target is now a deterministic **interior simulation work point**: the selected mesh world-space centre is offset 18% toward the loaded brain bounds centre. This makes the red mission marker travel into the selected anatomical volume rather than stopping at its outward-facing presentation point.

> The inward offset is a Luna-local **simulation visualization** coordinate. It is not an MNI transform, a provider dataset coordinate, a medical measurement, or a claim about a physical nanobot.

The target resolver now records the exact target derivation and marks it as `Mesh-derived Luna Local interior simulation work point`. No lower-scale capability changed; Tissue, Cellular, Subcellular, and Molecular operations remain unavailable unless their existing coordinate gate is satisfied.

## Completed-Agent Behavior

The mission engine already moves agents from the simulated work point back to their stored `deploymentPosition`. The defect was in the renderer coordinator: after result persistence, completed agents remained in the active Three.js root and registry.

The new archival sequence executes only after the mission engine reports verified physical return:

| Order | Behavior |
|---|---|
| 1 | Persist the completed simulation result in independent mission history. |
| 2 | Remove the red visual root from the active Three.js nanobot group. |
| 3 | Dispose the body, glow, and ring geometries/materials. |
| 4 | Remove position state and the completed agent from the active fleet registry. |
| 5 | Clear panel selection if that returned agent was selected. |
| 6 | Retain the immutable mission result in history for inspection. |

The `NanobotCompletion` helper centralizes that sequence, so scene cleanup remains separate from the mission lifecycle and cannot erase historical results.

## Preservation

No change was made to the Macro GLB, BrainStructureRegistry, selected structure IDs, mesh names, mesh transforms, scientific datasets, reference spaces, coordinate-transform architecture, lower-scale capability gate, mission engine phase order, navigation helper, deployment position, workspace UI, Anatomy Navigator, Inspector, panel geometry, or red nanobot visual identity.

## Validation

| Command or suite | Result |
|---|---|
| Focused mission and visual tests | Passed: 2 files, 8 tests. |
| `pnpm exec vite build` | Passed. |
| `pnpm build` | Passed. |
| `git diff --check` | Passed. |
| `pnpm test` | 164 passed, 2 skipped, 14 failed in 12 established environment-dependent NPC/Supabase/administrator-session tests. |

Focused coverage now validates the complete Macro lifecycle through return, the returned position equaling `deploymentPosition`, one persisted history result, interior-work-point provenance, removal of the visual root from a Three.js group, disposal-state map cleanup, and active-fleet removal without history loss.
