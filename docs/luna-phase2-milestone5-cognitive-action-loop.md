# Luna Phase 2 — Milestone 5: Governed Cognitive-Action Loop

**Status:** Implemented and locally validated on the current `main` working tree. The additive production schema migration has been executed and read-only verified. A deployment and real bounded production acceptance mission remain pending commit and push.

> **Scope boundary.** Milestone 5 adds a deterministic, owner-scoped decision layer over the established Luna mission system. It does not introduce a browser execution loop, a second worker runtime, a second database, fabricated scientific evidence, coordinate mappings, or biological/physical activity.

## Purpose and runtime architecture

Milestone 5 turns an already-persisted cognitive condition into at most one governed mission. The action assessment is a pure policy evaluation over owner-scoped persisted state. The request handler records the decision and invokes the existing planner and Queue-backed dispatcher, but does not execute a worker. The private Queue consumer is the only runtime path that may invoke `executeLunaWorkerStep`.

| Stage | Existing / Milestone 5 component | Governed behavior |
|---|---|---|
| Persisted condition | `luna_knowledge_gaps` plus `luna_priority_assessments` | Only an `OPEN` knowledge gap with a persisted current `GAP` assessment of at least `0.55` is eligible. |
| Deterministic assessment | `server/luna/milestone5ActionLoop.ts` | Applies owner toggles, security blockers, current-priority selection, deterministic SHA-256 decision key, fixed budgets, and duplicate suppression. |
| Decision persistence | `server/luna/cognitiveActionService.ts` and `luna_autonomous_decisions` | Stores an explainable, owner-scoped proposal before any mission planning. Database uniqueness protects `(workspace_id, decision_key)`. |
| Mission planning | Existing `planLunaMission()` | Produces a `missionOrigin: "AUTONOMOUS"` mission linked one-to-one to the decision through `decision_id`. |
| Dispatch | Existing `dispatchLunaMission()` and `server/luna/vercelQueueRuntime.ts` | Dispatches exclusively through Vercel Queue and requires a provider-issued queue message/run identifier before any worker can be represented as queued/running. |
| Worker execution | Existing private consumer and `executeLunaWorkerStep()` | Retrieves bounded persisted context, writes an auditable handoff report, validates it, then admits only accepted Luna-owned inference memory. |
| Completion and reflection | `server/luna/vercelQueueConsumer.ts` | Summarizes immutable validations, completes or fails the linked decision, creates reflection/audit state, and moves an accepted source gap only to `WATCHING`. |

## Decision policy, resource bounds, and stopping conditions

The policy is intentionally default-off. Both the established `autonomyEnabled` owner setting and the new `cognitiveActionsEnabled` owner setting must be true. An open `ACTION_REQUIRED` security attention item suppresses all action selection. The policy permits no parallel autonomous mission and suppresses an already decided source condition, including a terminal condition, until an owner explicitly creates a fresh persisted condition rather than the system silently looping.

| Control | Enforced value / behavior |
|---|---|
| Eligible source | Persisted owner-scoped `OPEN` knowledge gap with a persisted current `GAP` priority score `>= 0.55`. |
| Candidate count | At most one deterministic candidate per assessment. |
| Mission count | No parallel active autonomous mission; one mission is uniquely linked to a decision. |
| Worker limit | `4` workers. |
| Step limit | `24` steps. |
| Retry limit | `2` durable worker retries. |
| Duration limit | `900` seconds. |
| Model-request limit | `12` requests. |
| Token limit | `24,000` tokens. |
| Runtime-unavailable behavior | A mission can be durably planned and marked waiting for a runtime, while the decision is recorded as `BLOCKED` / `RUNTIME_UNAVAILABLE`; this is not claimed as execution. |
| Terminal behavior | Completion, cancellation, retry exhaustion, and recovery states persist explicit decision/audit outcomes. No automatic replacement mission is created. |

The deterministic rationale describes only observable policy inputs and the resulting bound. It intentionally contains no hidden chain-of-thought. Mission priority is a transparent bounded projection of the stored priority score.

## Persistence and schema changes

The production migration is additive and is stored at [`supabase/migrations/20260827_luna_milestone5_cognitive_action_loop.sql`](../supabase/migrations/20260827_luna_milestone5_cognitive_action_loop.sql). The companion read-only verifier is stored at [`supabase/verify_luna_milestone5_cognitive_action_loop.sql`](../supabase/verify_luna_milestone5_cognitive_action_loop.sql).

| Schema element | Purpose |
|---|---|
| `luna_cognitive_state.cognitive_actions_enabled` | Separate default-false owner control for autonomous cognitive action selection. |
| `luna_autonomous_decisions` | Owner-scoped deterministic decision, rationale/evidence/budget, outcome state, linked mission, and idempotency key. |
| `luna_missions.decision_id` and `mission_origin` | Explicit decision linkage plus `OWNER` versus `AUTONOMOUS` origin. The partial unique index permits at most one mission for a non-null decision. |
| `luna_result_validations` | Immutable worker-output validation records keyed by owner workspace, worker, and output hash. |
| Version subjects | Adds `DECISION` and `RESULT_VALIDATION` to the cognitive version constraint. |
| RLS / policy posture | RLS is enabled for the two new tables. No direct `anon` or `authenticated` policy is created; the existing verified owner session plus server-only service-role adapter remain the access boundary. |
| Triggers / indexes | A decision touch trigger updates timestamps; a validation trigger rejects updates/deletes; lookup, source, mission, worker, and unique-link indexes support bounded persistence. |

## Production migration evidence

The user executed the migration in the authenticated SenotaAI Supabase production project (`qyyvyiwsqhuzraxuyqxu`). SQL Editor query `1c12fa68-6750-4569-b4e1-7726666f245d` returned the expected one-row result for the final `pg_notify('pgrst', 'reload schema')` statement with no displayed SQL error. The read-only verifier then ran in query `a093ea27-7731-4517-af14-e9133501d842` and returned 18 rows. The visible rows reported `passed = true` for the new tables, columns, RLS posture, no direct browser policies, indexes, triggers, and function; the user confirmed completion of the verifier and no `false` value was observed. The detailed provenance record is maintained in [`docs/.luna-cognitive-migration-execution-log.md`](.luna-cognitive-migration-execution-log.md).

## Learning and scientific safety semantics

Worker reports are persisted first as auditable handoffs with `AI_INFERENCE` / `INFERRED` classification. The report is not represented as provider evidence or scientific authority. The deterministic validator then records an immutable validation. Only `ACCEPTED` output may produce Luna-owned memory, and that memory remains `INFERENCE`; review-required output instead creates an attention item and is excluded from memory admission.

The validator requires the headings **Retained context**, **Inferences**, **Open questions**, and **Next non-authoritative step**, enforces an 18,000-character bound, hashes normalized output, and withholds learning for assertions of scientific/clinical/biological/physical authority, spatial targets or coordinates, and assertions that an HRA-to-MNI or HRA-to-Julich mapping is established. It permits explicit uncertainty such as `HRA -> MNI remains NOT_ESTABLISHED`.

> **Invariant retained.** HRA → MNI and HRA → Julich remain `NOT_ESTABLISHED`. No coordinate, transform, Julich correspondence, clinical conclusion, biological intervention, cellular/molecular operation, physical nanotechnology, provider fact, or validated scientific truth can be produced by this loop.

## API and console controls

The owner-gated Knowledge router exposes `knowledge.cognitive.action.assessAndDispatch` and a constrained `knowledge.cognitive.action.command` trigger. The command text cannot supply an objective, a tool, an external target, or any operational instruction; it only requests assessment of the next persisted bounded condition. Unauthenticated calls are rejected. Arbitrary high-impact wording is rejected before action assessment.

The Cognitive Console separately displays and controls cognitive-action enablement, the deterministic candidate/no-action state, a bounded dispatch control, a constrained command input, persisted decision cards, and immutable validation counts. The UI retains the existing owner session and does not provide a browser worker loop.

## Validation record

| Command / test group | Result |
|---|---|
| Targeted Milestone 5 policy, bridge, persistence, Queue completion, router, and migration tests | **21 passed** across 6 files. |
| Entire `server/luna` runtime suite | **55 passed** across 18 files. The only stderr messages were expected local Queue region fallbacks; deployed Vercel uses its region context. |
| `pnpm build` | **Passed**. Existing analytics placeholder and large-client-chunk warnings remained; generated `server.js` and Queue bundle artifacts were restored/removed after validation. |
| `pnpm exec vite build` | **Passed** with the same pre-existing analytics placeholder and large-chunk warnings. |
| `pnpm test` | **300 passed, 14 failed, 2 skipped**. The 14 failures are pre-existing external Supabase/NPC/GitHub/Vercel credentials and administrator/game/webhook configuration tests; no Luna/Milestone 5 test failed. |
| `pnpm check` | Fails only on the existing unresolved import `server/storage` in `server/_core/imageGeneration.ts`; no Milestone 5 type error remains. |
| `git diff --check` | **Passed**. |

## Acceptance checklist

| Acceptance condition | State |
|---|---|
| Existing Vercel Queue producer, private consumer, planner, worker DAG, retry/cancel/recovery paths reused | Complete. |
| Owner-scoped deterministic candidate, explainable decision, budgets, idempotency, and origin linkage | Complete and tested. |
| Default-off cognitive action control, security/high-impact containment, and constrained owner API | Complete and tested. |
| Immutable result validation before Luna-owned memory admission | Complete and tested. |
| Decision/validation/reflection/audit records and conservative `WATCHING` gap semantics | Complete and queue-completion tested. |
| Production additive schema migration | Executed and read-only verified. |
| Commit current implementation on the actual remote `main` lineage | Pending. |
| Vercel deployment of the exact committed revision | Pending. |
| Real production acceptance loop using a clearly labelled non-scientific persisted condition | Pending. It must show a decision, autonomous linked mission, Vercel Queue run identifier, private worker completion, report and immutable validation, accepted inference learning/reflection/audit, conservative gap state, and no duplicate replacement mission. |

## Remaining limitations

Milestone 5 intentionally does not make durable runtime availability appear when Vercel Queue is unconfigured. In that case, planning and decision records may exist while the mission remains `WAITING_FOR_RUNTIME`; this is an explicit blocked state rather than fake worker activity. The planned production acceptance must be completed only after the Vercel deployment is verified to use the exact commit and production Queue configuration is healthy. The legacy full-suite configuration failures and unrelated `server/storage` TypeScript import remain outside the Milestone 5 change surface and are documented rather than hidden.
