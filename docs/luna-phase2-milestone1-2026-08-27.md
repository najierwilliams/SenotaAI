# Luna Phase 2 — Milestone 1: grounded self-model and bounded memory retrieval

## Status

**Milestone 1 is production-verified.** It extends the existing owner-scoped cognitive architecture without replacing the Vercel Queue runtime, Knowledge Space, Supabase project, cognitive tables, scientific registry, or software-only nanobot boundary.

| Component | Status | Evidence |
|---|---|---|
| Grounded self-model projection | VERIFIED | `buildObservedLunaSelfModel` derives visible capability and workload state from persisted cognitive state and registered worker contracts. |
| Capability grounding | VERIFIED | UI no longer presents arbitrary stored capability prose as a runtime capability; it lists registered worker roles and bounded persisted-state totals. |
| Memory retrieval explanation | VERIFIED | `explainMemoryRetrieval` returns source type, truth state, matched terms, retrieval score, bounded result count, and explicit omission categories. |
| Global context retrieval | VERIFIED | Active globally scoped memories can now join project-scoped retrieval; unrelated project memory remains excluded. |
| Owner-gated API compatibility | VERIFIED | The existing `knowledge.cognitive.home` and `knowledge.cognitive.context` procedures were extended in place; no endpoint, secret, or public worker surface was introduced. |
| Cognitive Console | VERIFIED | The owner console shows registered worker roles, persisted memory count, completed mission count, open attention count, and the grounding statement. |
| Production release | VERIFIED | Commit `1193deb2e1153e91ba604624c3e69241d1414098`, deployment `dpl_DAveNGrWhDDwTgj5hmdxsQxzEYja`, `READY`, production aliases attached, three Node functions. |

## Exact source changes

| File | Change |
|---|---|
| `server/luna/milestone1.ts` | New pure, deterministic observed self-model and retrieval-explanation projections. |
| `server/luna/milestone1.test.ts` | Regression coverage for contract-grounded capabilities and project/global bounded retrieval explanation. |
| `server/luna/cognitiveService.ts` | Extends existing home/context response with projections. |
| `server/luna/cognition.ts` | Admits global active memories to project-relevant context while retaining unrelated project exclusion. |
| `client/src/components/knowledge/LunaCognitiveConsole.tsx` | Displays grounded self-model facts from the existing owner-gated response. |

## Validation

Focused cognitive tests passed: **2 files, 9 tests**. `pnpm build` and independent `pnpm exec vite build` passed. `git diff --check` passed. `pnpm check` continues to report only the known unrelated `server/_core/imageGeneration.ts` `server/storage` import error. Non-fatal analytics placeholder and chunk-size warnings are unchanged.

## Protected boundaries

No scientific truth elevation, HRA/MNI or HRA/Jülich mapping, coordinate creation, provider record change, external research request, biological/physical action, or physical nanobot behavior was added. The 3D brain remains a visualization layer; persistent cognitive state remains the source of truth.

## Next milestones

The following work remains planned and is **not yet represented as implemented**: claim/belief objects and revision history; provenance-aware graph expansion; contradiction, knowledge-gap, attention, curiosity, and explainable priority engines; capability-aware planner/worker selection; conversation memory candidates; bounded research and maintenance policy; command routing; richer console/3D activity views; and a Phase 2 end-to-end acceptance mission.
