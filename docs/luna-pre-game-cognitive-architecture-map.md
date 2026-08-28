# Luna Pre-Game Cognitive Architecture Map

**Audit date:** `2026-08-27`  
**Starting revision:** `eb09673d65d00fc6ba1df930f944ffc0ca693832`  
**Design rule:** The master build extends the established owner-scoped Luna cognitive architecture. It does not replace the Vercel Queue runtime, construct a second worker/mission system, bypass owner authorization, or convert scientific records into cognitive facts.

## Existing components and their retained responsibilities

| Existing component | Current responsibility | Master-build treatment |
|---|---|---|
| `server/luna/supabase.ts` | Owner-scoped persistence, immutable audit/version stream, memory/claim/gap/priority/project/goal/task/mission/worker/reflection/recovery storage. | Extend with additive tables, mappers, snapshots, ownership checks, versions, and audits for new cognitive domains. |
| `shared/lunaCognitive.ts` | Shared durable contracts, state enums, truth boundaries, worker contracts, and mission budgets. | Add explicit, bounded contracts for new cognitive artifacts while retaining existing mission and truth-state semantics. |
| `server/luna/cognition.ts` | Bounded memory retrieval, health calculation, factual attention derivation, duplicate discovery, task eligibility. | Reuse for bounded context and extend only with deterministic cognitive projections. |
| `server/luna/milestone1.ts` | Observed self model and explainable memory retrieval. | Reuse for grounded identity; add evidence-thresholded development rather than prose personality. |
| `server/luna/milestone2.ts` | Claim/evidence/revision inspection and review detection. | Reuse for contradiction anchors, but add a first-class non-winning contradiction lifecycle. |
| `server/luna/milestone3.ts` | Gaps, curiosity candidate view, declared-factor priority. | Extend candidate lifecycle and priority inputs; keep priority distinct from action authorization. |
| `server/luna/milestone4.ts` | Advisory worker-role selection. | Preserve passive `dispatchAuthorized: false`; never use it to choose or dispatch a worker. |
| `server/luna/milestone5ActionLoop.ts` | Deterministic owner-enabled candidate selection, budget, idempotency, one-mission suppression, security block, terminal decision state. | Remains the only autonomous-dispatch assessment. New cycles may surface eligible gaps but may not call workers directly. |
| `server/luna/orchestrator.ts` | Mission planning, task DAG persistence, capacity-aware worker queueing, runtime dispatch. | Remains the sole planner and sole materializer of Queue worker messages. |
| `server/luna/vercelQueueRuntime.ts` | Vercel Queue producer. | Remains the sole external durable dispatch path. |
| `server/luna/vercelQueueConsumer.ts` | Private Queue consumer, retry/cancel/recovery, completion, reflection, validation summary. | Remains the sole executor/terminal processor. |
| `server/luna/workerExecutor.ts` and `learningService.ts` | Controlled read-only worker execution, report retention, immutable validation, gated inference-memory admission. | Retain validation-before-learning and no scientific truth elevation. |
| `server/luna/controlledTools.ts` | Registered read-only Knowledge Space and reviewed-registry tools. | Preserve deny-by-default tool registry; no arbitrary shell, web, provider mutation, coordinate transform, or external side effect. |
| `server/routers/knowledge.ts` | Single-owner session gate and owner-facing Knowledge Space/Luna APIs. | Host all master cognitive APIs behind `knowledgeOwnerProcedure`; never expose cognition mutation as public chat input. |
| `client/src/components/knowledge/LunaCognitiveConsole.tsx` | Owner Cognitive Console with state, gaps, priority, decisions, missions, validations, reflections, and activity. | Become the real observability/control view for all new persisted cognitive records. |
| `server/npcMemory/*` and `agent.luna.chat` | Legacy NPC preview dialogue/cognitive records and normal/preview chat paths. | Treat as integration sources only. Do not copy its private tables into a competing Luna brain; bridge permitted, owner-authorized Luna dialogue/events into the single Luna cognitive store. |
| Knowledge Space objects/relationships | Existing owner-scoped generic source objects and typed relationships. | Reuse as anchors where meaningful; preserve original source/truth state and do not mislabel generic records as new cognitive facts. |

## Additive master cognitive domain graph

```text
Owner-authorized conversation / user correction / project update / worker output / future world event
    ↓  (bounded normalization + source/provenance classification)
Experience or cognitive input record
    ↓
Novelty, uncertainty, contradiction, gap, curiosity, internal-state, relationship, goal, commitment projections
    ↓
Attention queue + focus layer + transparent priority and suppression/cooldown rules
    ↓
Structured decision / hypothesis / plan evaluation artifact
    ↓
Existing M5 deterministic assessment
    ↓
Existing planner → Vercel Queue producer → private consumer → existing worker DAG
    ↓
Report retention → immutable validation → gated memory/learning/self-model/relationship updates
    ↓
Reflection, maintenance, audit/version history, owner-console activity projection
```

## Ownership and trust boundaries

| Boundary | Required behavior |
|---|---|
| Owner scope | Every read and mutation resolves the established Knowledge Space owner workspace. New records include `workspace_id` and are verified before cross-record linking. |
| Browser | The browser uses only owner-gated tRPC APIs. Browser-local state can render a projection but cannot be the source of cognitive truth. |
| Server | The server uses the service-role Supabase adapter only after `knowledgeOwnerProcedure`; database RLS remains enabled and no broad anon/authenticated policy is introduced. |
| Queue | Only `dispatchLunaMission()` and `vercelQueueRuntime` may dispatch durable work. Cognitive cycles may produce M5 candidates but never call a worker/executor directly. |
| Learning | Worker reports are retained for audit. Only immutable `ACCEPTED` validation permits Luna-owned routine inference memory. User claims, provider records, and scientific truth stay separate. |
| Scientific/biological safety | All new cognitive extensions must retain `NOT_ESTABLISHED` HRA→MNI/HRA→Julich handling, no fabricated coordinate/mapping output, no scientific truth elevation, and no physical/clinical/cellular/molecular/biological operation. |
| High-impact actions | External, financial, account, destructive, clinical, physical, biological, and provider-mutating actions remain blocked or explicitly owner-gated outside routine internal cognition. |

## Master-build implementation layers

| Layer | Additive responsibilities | Required persistence/audit discipline |
|---|---|---|
| Input and experience | Normalize conversation, correction, project/workflow outcome, worker result, and future world event into bounded source records. | Source type, provenance, timestamps, privacy scope, raw-summary limits, idempotency/source key. |
| Cognitive assessment | Derive novelty, uncertainty, contradictions, gaps, curiosity, attention, focus, internal state, and recommendations deterministically. | Input references, explainable score/contribution, suppression/cooldown, version/audit event. |
| Intent and planning | Model goals, commitments, hypotheses, structured decision summaries, and plan revisions. | Origin, status, evidence/assumptions, dependencies, confidence, linked existing task/mission where applicable. |
| Learning and development | Create limited memory/relationship/preference/self-model changes only from evidence threshold and validated outcomes. | Explicit evidence links, confidence, version history, rollback/archive behavior, no one-event personality rewrite. |
| Maintenance | Reconcile stale, orphaned, contradictory, duplicate, and cooldown-expired cognitive records. | Bounded cycle report, no external side effects, owner control, no recursive mission generation. |
| Observability | Project all persisted domains into owner console and concise API summaries. | No simulated activity, no hidden reasoning, timestamps, source, outcome, and reason visible. |

## Explicitly excluded from this pre-game architecture build

The build excludes world rendering, maps, combat, economy, quests, live NPC scaling, scripted life outcomes, automatic real-world control, arbitrary web browsing, direct provider mutation, and physical or biological systems. The future world adapter is an input contract only; it does not implement a game.

## Baseline verification findings

The pre-implementation `pnpm test` baseline recorded **302 passing, 14 failing, 2 skipped** tests. The failures occur in existing external/configuration-dependent Supabase NPC memory, nanite, GitHub, Vercel, and administrator-session areas, including `Supabase nanite system is not configured`; no master-build source had been changed when the baseline was recorded. The existing local type-check baseline remains separately known to fail at the unresolved `server/storage` import in `server/_core/imageGeneration.ts`.
