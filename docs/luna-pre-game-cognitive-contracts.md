# Luna Pre-Game Cognitive Contracts and Additive Migration Design

This design is the implementation contract for the pre-game cognitive master build. It converts broad cognitive requirements into bounded, auditable application concepts and preserves the existing mission/Queue/validation architecture.

> **No consciousness claim:** “internal state,” “preference,” “relationship,” “self model,” and “reflection” below are persisted computational representations derived from labelled inputs and evidence. They do not assert subjective experience, autonomy beyond policy, or biological emotion.

## 1. Source, ownership, and idempotency model

Every new record belongs to the existing Luna `workspace_id`, is created only after owner-session authorization or from a verified server-side Luna runtime, and carries a bounded `provenance` object. A source event receives a caller-provided or deterministic `source_key`; a unique owner-scoped index makes normal conversation retry, game adapter retry, and Queue callback retry safe. A history/audit record describes every mutable lifecycle transition. Immutable history is never removed by cleanup.

| Concept | Source types | Idempotency boundary | Notes |
|---|---|---|---|
| `LunaCognitiveInput` | `CONVERSATION`, `USER_CORRECTION`, `OWNER_NOTE`, `WORKER_RESULT`, `PROJECT_OUTCOME`, `WORLD_EVENT`, `MAINTENANCE` | `(workspace_id, source_key)` | An input record preserves a compact source summary and relevance decision; raw chat transcript is not copied into Luna memory by default. |
| `LunaExperience` | `CONVERSATION`, `WORKER`, `PROJECT`, `WORLD`, `MAINTENANCE` | `(workspace_id, source_input_id, experience_kind)` | An experience is a bounded interpreted event, not a fabricated story. |
| `LunaCognitiveCycle` | `MANUAL`, `CONVERSATION`, `WORKER_COMPLETION`, `WORLD_EVENT`, `MAINTENANCE` | `(workspace_id, cycle_key)` | A cycle may derive records but never directly dispatches a worker. |
| Mutable cognitive subject | owner/runtime action | subject version | Version/audit records document every update. |

## 2. Proposed shared contracts

The `shared/lunaCognitive.ts` extension will expose these string-literal state families, ensuring API validation and pure-engine tests share exactly the same states.

| Domain | Required contract elements |
|---|---|
| Inputs and experience | input type, source key, summary, relevance, privacy classification, linked input, experience kind, confidence, importance, provenance. |
| Attention and focus | score factors, `ACTIVE`/`SUPPRESSED`/`RESOLVED`/`EXPIRED`, focus tier `PRIMARY`/`SECONDARY`/`BACKGROUND`, attention source, decay/escalation timestamp, inhibition reason. |
| Gap and curiosity | extended gap category and lifecycle, merge/reopen provenance; curiosity trigger, information value, novelty, cooldown, expiry, action status. |
| Uncertainty, novelty, contradiction | target type/id, score, evidence basis, status; contradiction uses two persisted anchors and explicitly permits `INCONCLUSIVE`. |
| Intent | goals, commitments, hypotheses, reasoning artifacts, plan revisions, decisions and next action recommendations. |
| Development | self-model facts/evidence, preference evidence, internal state observations, learning records, worker-performance snapshots. |
| Social/world | relationships, social interactions, world events, experiences, agent identity and neutral event adapter contracts. |
| Maintenance | cycle scope, resource limit, item counts, outcomes, stopped/deferred reason. |

## 3. State-machine rules

All transitions will be checked in pure code before persistence. Invalid state combinations will be recorded as a maintenance issue rather than silently coerced.

| Subject | Permitted lifecycle | Important prohibitions |
|---|---|---|
| Attention | `ACTIVE` → `SUPPRESSED`/`RESOLVED`/`EXPIRED`; `SUPPRESSED` → `ACTIVE`/`EXPIRED` | Suppression cannot delete history. An active critical blocker cannot be hidden by lower-priority competition. |
| Focus | exactly one `PRIMARY` slot; up to three `SECONDARY`; bounded background list | A focus assignment contains an explainable decision score and is replaced, not mutated without history. |
| Gap | `OPEN` ↔ `WATCHING`; either may become `RESOLVED`, `DISMISSED`, `MERGED`, or `EXPIRED`; resolved/dismissed can reopen only with new evidence | Merge retains the original rows and references a canonical gap; no loss of provenance. |
| Curiosity | `CANDIDATE` → `INTERESTING` → `QUEUED` → `INVESTIGATING` → `SATISFIED`; terminal `DEFERRED`/`DISMISSED`/`EXPIRED` | Curiosity does not invoke an external tool or worker itself. It can request M5 assessment only under existing policy. |
| Uncertainty | `OPEN` → `REDUCED`/`ACCEPTED`/`RESOLVED` | Higher confidence cannot be manufactured from an internal inference alone. |
| Contradiction | `UNRESOLVED` → `UNDER_INVESTIGATION` → `RESOLVED`/`ACCEPTED_A`/`ACCEPTED_B`/`INCONCLUSIVE` | The engine never automatically chooses A or B. It can only classify, link evidence, and raise attention. |
| Goal | `PROPOSED` → `ACTIVE` → `PAUSED`/`COMPLETED`/`ABANDONED`/`SUPERSEDED` | Goals with unresolved conflicts/dependencies are held, not silently completed. |
| Commitment | `PROPOSED` → `ACTIVE` → `FULFILLED`/`RELEASED`/`BREACHED`/`EXPIRED` | A world-facing or external commitment remains recommendation-only until a future game/action adapter approves it. |
| Hypothesis | `PROPOSED` → `TESTING` → `SUPPORTED`/`WEAKENED`/`REJECTED`/`INCONCLUSIVE` | Supporting evidence changes confidence; it never establishes scientific authority. |
| Relationship | `ACTIVE` → `DORMANT`/`ARCHIVED` | Relationship scores are evidence-derived and provenance-labelled, never hard-coded personality. |
| Maintenance cycle | `RUNNING` → `COMPLETED`/`STOPPED`/`FAILED` | Fixed item, write, and derived-action caps preclude loops. |

## 4. Additive database migration plan

The single migration will be named `20260827_luna_pre_game_cognitive_master.sql`. It is additive only. It enables RLS for each table, has no anon/authenticated direct policy, references the existing `luna_workspaces` record, uses `on delete restrict` for durable source/history where preservation matters, creates owner-scoped list/index paths, enables update timestamps on mutable current-state tables, and protects immutable record/event/history tables with the established rejection trigger.

| Table | Purpose | Mutable? | Essential links |
|---|---|---:|---|
| `luna_cognitive_inputs` | Canonical bounded input and relevance outcome. | No | workspace, project/goal/mission/worker optional. |
| `luna_experiences` | Derived, source-backed experience records. | No | input, project/goal/mission/worker. |
| `luna_cognitive_cycles` | Bounded derivation/maintenance-run report and cycle cooldown. | No | input/mission optional. |
| `luna_attention_assessments` | Attention score/history with source/target/focus tier and status. | No | experience/input/gap/goal/commitment/contradiction optional. |
| `luna_focus_assignments` | Current and historical ranked focus allocation. | No | target subject and cycle. |
| `luna_uncertainty_records` | Target uncertainty score, basis, importance, status. | Yes, versioned | target and source input/cycle. |
| `luna_novelty_records` | Deduplicated novelty assessment with similarity key. | No | target/input/experience. |
| `luna_contradictions` | Persistent pair of competing evidence/claim anchors and lifecycle. | Yes, versioned | claim/evidence/memory anchors, active goal/project. |
| `luna_gap_links` | Canonical merge, related goals/memories/experiences, and reopen source links. | No | gap and linked entity. |
| `luna_curiosity_assessments` | Extended candidate fields/status, cooldown, information value, cycle relation. | Yes, versioned | gap/contradiction/experience/input. |
| `luna_preferences` | User/learned/temporary/stable preference with confidence, evidence count, context. | Yes, versioned | input/experience/project/relationship. |
| `luna_internal_state_observations` | Bounded dimension/value/change/reason event history. | No | cycle/input/experience. |
| `luna_self_model_facts` | Observed/inferred/user-asserted computational self fact. | Yes, versioned | evidence/cycle/experience. |
| `luna_self_model_evidence` | Repeated experience/input/validation anchors and score. | No | self fact plus source entity. |
| `luna_goal_revisions` | Full goal lifecycle/revision/dependency/criteria history. | No | goal, predecessor/successor where relevant. |
| `luna_goal_dependencies` | Explicit dependency edges, kind, status. | Yes, versioned | prerequisite and dependent goal. |
| `luna_commitments` | Persistent commitments and lifecycle. | Yes, versioned | project/goal/relationship/world participant optional. |
| `luna_hypotheses` | High-level testable proposition, confidence, status, planned test. | Yes, versioned | goal/gap/project. |
| `luna_hypothesis_evidence` | Evidence for/against an hypothesis. | No | hypothesis plus source entity. |
| `luna_reasoning_artifacts` | Chain-of-thought-free structured reasoning/decision/plan summary. | No | cycle, goal/mission/decision/plan target. |
| `luna_plan_revisions` | Goal/mission linked recommendation/plan revision with alternatives. | No | goal/mission/task references. |
| `luna_learning_records` | Correction/outcome/strategy learning record and affected target. | No | input/experience/validation/cycle. |
| `luna_worker_performance_snapshots` | Bounded role/strategy aggregate. | No | worker/mission/cycle and role. |
| `luna_relationships` | Agent/participant relationship with evidence-derived dimensions. | Yes, versioned | agent identity/participant identifiers. |
| `luna_social_interactions` | Neutral interaction event, sentiment/impact labels, provenance. | No | relationship/input/experience. |
| `luna_world_events` | World-agnostic event adapter ingress, no game implementation. | No | input/experience, external source key. |
| `luna_maintenance_reports` | Explicit maintenance scope, counts, limits, result and stop reason. | No | cycle. |

## 5. Deterministic assessment pipeline

The engine will be deterministic and bounded. It accepts a normalized input plus current bounded snapshot. It must not call external tools, models, Queue, network, or the database directly. It emits a `LunaCognitiveAssessment` made of requested record creations/transitions and concise explanations.

1. **Normalize and filter.** Reject empty/sensitive/unowned inputs; classify explicit user memory, correction, goal, commitment, question, project outcome, or ordinary chat. Ordinary chat is retained as an audit input but does not automatically generate memory.
2. **Create source-backed experience.** The experience summary uses only actual source text or a limited declared outcome.
3. **Compute novelty and uncertainty.** Exact normalized duplicate keys suppress repetition. Low provenance/confidence or missing required context derives uncertainty. No semantic model inference is asserted as a fact.
4. **Detect explicit contradictions.** Only explicit correction markers or opposing claim/evidence labels create contradiction candidates. Any candidate remains unresolved by default.
5. **Discover/reopen/merge gaps.** Missing context, correction, validation rejection, contradiction, or explicit user question can produce a category-labelled gap. Merge uses canonical normalized keys and records links; reopen requires non-duplicate new source evidence.
6. **Score curiosity and attention.** Scores use bounded declared factors—importance, uncertainty, novelty, goal relevance, evidence quality, due date, and risk. Every score records its factor map. Cooldown prevents repeated candidate generation.
7. **Allocate focus.** Sort determinstically by attention score, source time, and id. Fill one primary, up to three secondary, and a bounded background awareness list. Suppress only lower-ranked safe items; do not suppress critical blockers.
8. **Apply learning thresholds.** Preferences and inferred self facts require at least three distinct source-backed events across at least two cycles and a supporting confidence threshold. A single user assertion can be stored only as `USER_ASSERTED`, never as an inferred stable trait.
9. **Produce high-level reasoning/plan artifacts.** Store conclusion, evidence IDs, uncertainty, options, and recommendation, not hidden reasoning traces. Goal/plan changes remain recommendations unless owner-controlled routine lifecycle policies permit a non-external update.
10. **Evaluate M5 only as a consumer.** An eligible persistent gap can be passed to the existing `assessAndDispatchLunaCognitiveAction()` entry point. The cycle cannot create an arbitrary worker or bypass M5 eligibility/budget/security/retry constraints.

## 6. Conversation integration design

The existing `agent.luna.chat` endpoint is an NPC preview route and is not a source of owner-scoped Luna cognition. The integration will add a narrowly scoped bridge only after the existing chat response succeeds, and only for the owner-admin Luna preview session. It passes a source key derived from player id, normalized message, and bounded time bucket; normal retry is idempotent. The bridge records the user message as `CONVERSATION` input and runs the deterministic assessment. It does not insert the assistant’s content as fact, does not expose raw user text through the Cognitive Console, and does not cause Queue dispatch automatically.

A separate owner-gated `knowledge.cognitive.input` API serves direct owner-console ingestion, correction, world event, and project-outcome testing. It validates all fields, rejects sensitive values, and does not provide arbitrary direct row access. World event input is reserved for neutral future adapter use; no game runtime is introduced.

## 7. Maintenance and scheduling design

The master build provides a bounded `runLunaCognitiveMaintenance()` service that can be invoked manually through owner-gated `knowledge.cognitive.maintenance.run`. It inspects at most 100 recent active records across immutable tables, performs no network/external action, expires eligible cooldowns, reconciles focus, identifies stale/orphaned data, and emits an immutable maintenance report. It never schedules itself.

A future production periodic trigger remains deliberately deferred until an already-deployed durable scheduler/Queue callback configuration is explicitly reviewed. That trigger will call the same service and preserve the existing rule that no browser timer/polling loop is used. Until then, manual, event-driven, worker-completion, and Queue completion paths are functional; an automated recurring job is not claimed as complete.

## 8. API and console design

The owner-facing `knowledge.cognitive` router will add safe schemas and procedures for snapshot/list, input ingestion, correction, attention/focus inspection, gap/curiosity lifecycle, uncertainty/contradiction inspection, preference/self/goal/commitment/hypothesis inspection, world event acceptance, social relationship interaction ingestion, reasoning/learning/worker metric history, and maintenance run. High-level flow endpoints perform domain transitions; no generic SQL-like entity mutation endpoint exists.

The Cognitive Console will consume the aggregate snapshot and show persisted sources, status, score/explanation, provenance, and audit timestamps. It will label M5’s `maxWorkers` as **maximum concurrent workers** and retain the distinct `COMPLETED / NO_ACTION` decision and `COMPLETED` mission semantics. The console will not animate synthetic thought, fabricate social outcomes, or display private raw chat transcript.

## 9. Required test matrix

| Test class | Required coverage |
|---|---|
| Pure engine | relevance filtering, exact-idempotency, novelty suppression, uncertainty, contradiction non-winner rule, gap merge/reopen, curiosity cooldown, focus competition/decay/escalation, internal-state bounds, evidence thresholds, stop limits. |
| Persistence | mappers, owner cross-link rejection, immutable tables, version/audit emission, no direct unauthenticated procedure. |
| Conversation | only owner preview bridge ingests, ordinary chat does not create memory, correction creates traceable learning/contradiction, retry is idempotent. |
| M5 regression | new cognitive records may surface an eligible gap but cannot bypass default-off action state, candidate policy, Queue runtime, worker contract, or validation gate. |
| Maintenance | stale/orphan detection, caps, no requeue loop, report lifecycle, no external tool call. |
| UI/API | loading/error/empty state and owner gating for all new console data. |

## 10. Production acceptance scope

Production migration execution requires a separate explicit owner confirmation. After migration and deployment, acceptance uses one labelled, non-scientific, owner-authenticated temporary conversation/correction or world-event fixture. The proof must show durable input → experience/assessment → attention/gap/learning/reflection or maintenance report, owner API/console observability, no prohibited scientific claims, and supported lifecycle cleanup only for the temporary source fixture. It will not create a new M5 mission merely to demonstrate this build unless an independently eligible, permitted action is actually requested and approved by the existing M5 policy.
