# Luna Brain Nanobot Mission System Integration

**Project:** SenotaAI / Luna Brain  
**Revision:** `1128a543dd3d5ba6dfc8e2557cbf04a48a5af204`  
**Commit:** `Integrate scale-aware nanobot mission system`  
**Deployment:** [Production deployment](https://senota-kvj3zhooz-senota-s-projects.vercel.app/luna/brain)  
**Deployment status:** READY, production

## Completed Integration

The existing Luna Brain nanobot feature has been converted from a viewer-local animation state machine into a centralized, **scale-aware mission system**. The implementation retains the existing BrainViewer, Anatomical Navigator, Inspector, workspace bar, red Nanobot Panel, panel minimize/restore/close behavior, Macro GLB rendering, and observation-context architecture.

A `NanobotMissionEngine` now controls valid mission progression. The only enabled operating mode is an explicitly labeled **Macro simulation** that navigates to an actual selected Three.js mesh-derived coordinate and physically returns to its stored deployment position. No lower-scale coordinate, measurement, biological inference, therapeutic result, or physical nanotechnology capability is asserted.

| Area | Delivered behavior |
|---|---|
| Mission lifecycle | Controlled state machine: `idle → deploying → navigating → arrived → assessment → operation → verification → returning → completed`; invalid starts become explicit errors, and pause/resume restores the previous valid state. |
| Macro navigation | `NanobotTargetResolver` accepts Macro targets only when BrainViewer supplies a real selected mesh center; missing meshes produce unavailable targets rather than arbitrary bounds-center fallback coordinates. |
| Multi-agent fleet | Each bot maintains independent position, target snapshot, lifecycle, telemetry, mission result, and visual. Fleet commands delegate to the central engine. |
| Mission results | Results persist independently of fleet cleanup, are stored once per mission, include mission number/ID, bot/type, target snapshot, original and completion presentation scale, duration, status, simulation finding, warning, recommendation, and verification mode. |
| Scale context | Missions retain their original target and original observation scale. Moving the viewer creates an explicit `view-only` presentation transition rather than rewriting mission history. |
| Lower-scale visualization | Tissue, Cellular, Subcellular, and Molecular views use a distinct lightweight abstract Three.js environment and scale-adjusted red agent marker. The viewer banner explicitly states: `Simulation visualization — no coordinate-resolved dataset.` |
| Capability gate | Tissue, Cellular, and Molecular metadata contexts reject new operations because they lack coordinate-resolved targets. Subcellular remains unavailable. Both Nanobot Panel and existing Nanobots/Missions workspace menu paths use this gate. |
| Inspector linkage | The Inspector derives target-linked active bots from the registry by canonical structure ID and invokes the shared selection callback; it owns no duplicate fleet state. |
| Integration facade | `NanobotActions` exposes data-oriented fleet/history/inspection/capability/pause/resume/return actions for future AI integration without exposing React setters or Three.js scene mutation. |

## Scientific Capability Boundary

| Observation scale | Current rendering/observation status | Mission operation status |
|---|---|---|
| Macro | Local Luna GLB with real selected mesh coordinates | **Enabled as simulation only**. Visible movement, lifecycle, verification, return, and result persistence are supported. |
| Tissue | EBRAINS/Julich metadata context with no Luna coordinate mapping | **Operation not supported.** Abstract simulation environment only. |
| Cellular | CELLxGENE metadata context with no Luna coordinate mapping | **Operation not supported.** Abstract simulation environment only. |
| Subcellular | Unmapped sample-scoped EM source | **Unavailable.** Abstract context is disclosure-only. |
| Molecular | Allen metadata context with no Luna coordinate mapping | **Operation not supported.** Abstract simulation environment only. |

> Macro missions are presentation and lifecycle simulations. Their findings state explicitly that they generate no biological measurement, diagnosis, treatment effect, or physical nanobot claim.

## Principal Implementation Files

| File | Role |
|---|---|
| `NanobotMissionEngine.ts` | Authoritative lifecycle, valid transition enforcement, navigation/return orchestration, pause/resume, capability gate, and honest simulated result creation. |
| `NanobotTargetResolver.ts` | Safe coordinate resolver: uses a real Macro mesh coordinate only and marks unavailable lower-scale spatial contexts explicitly. |
| `NanobotRegistry.ts` | Central fleet state, target snapshots, mission history persistence, target inspection, and viewer-scale presentation adaptation. |
| `NanobotObservationEnvironment.ts` | Dedicated lower-scale abstract Three.js environment, separate from the Macro brain model. |
| `NanobotActions.ts` | Narrow integration-safe action facade that does not mutate React state. |
| `BrainViewer.tsx` | Existing render loop now ticks the mission engine; mounts and updates the observation environment; resolves Macro mesh targets; retains panel geometry and workspace integration. |
| `NanobotPanel.tsx` | Displays operation capability, selected mission context, spatial status, transitions, telemetry, result/verification content, and collapsible history. |
| `AnatomicalInspector.tsx` | Displays active canonical-target-linked fleet entries and uses the shared selection path. |
| `BrainWorkspaceBar.tsx` | Preserves existing menus while applying the same deployment capability gate and explanatory reason. |

## Verification Results

| Check | Outcome |
|---|---|
| Focused mission tests | Passed: 4 tests covering Macro lifecycle/return/result recording, pause/resume, lower-scale rejection without fabricated result, fleet independence, and view-only transition preservation. |
| Existing client test suite | Passed: 13 files, 36 tests. |
| `pnpm exec vite build` | Passed. |
| `pnpm build` | Passed, including server bundles. |
| `git diff --check` | Passed before commit. |
| Browser acceptance | Passed using live local UI state: Macro hippocampus target resolution, Scout result/history, Diagnostic pause/resume, lower-scale disabled deployment, view-only transition disclosure, and Inspector live Monitor relationship selection. Detailed evidence is recorded in [`nanobot-browser-verification.md`](./nanobot-browser-verification.md). |
| GitHub | Pushed to `main`; local and remote HEAD both resolve to `1128a543dd3d5ba6dfc8e2557cbf04a48a5af204`. |
| Vercel | Production deployment `dpl_72NkshnWo58sJ8oKxMeYz4DUkhhi` is READY and references this exact commit. Authorized production route fetch returned HTTP 200. |

## Known Validation Limitation

`pnpm check` retains one unrelated existing server path-alias failure in `server/_core/imageGeneration.ts`, which cannot resolve `server/storage`. The client/nanobot type errors introduced during this work were resolved. The full `pnpm test` result was **152 passed, 2 skipped, 14 failed** across 12 pre-existing environment-dependent server test files; failures are attributable to absent Supabase configuration, administrator session requirements, and related external service/test credentials, not to the Luna Brain mission implementation.

## Remaining Product Limitations

Lower-scale provider integrations remain metadata-only because the Luna viewer has no coordinate-resolved mapping for those data sources. Future operation support requires an explicit, scientifically documented coordinate/reference-space mapping and a provider-backed spatial target source. Until that work is completed, the deliberate constraint is to keep lower scales as visible, labeled observation simulations and to reject operations.
