# Luna Pre-Game Cognitive Architecture Master Checklist

**Status updated:** `2026-08-28`  
**Starting repository revision:** `eb09673d65d00fc6ba1df930f944ffc0ca693832`  
**Implementation status:** The additive production schema and one narrowly scoped focus-history correction are applied and verified. Owner API, Console, source-ingestion, bounded-maintenance, and fixture-retirement production acceptance are complete for the bounded foundation below. Individual untested capabilities remain marked partial or unimplemented rather than being represented as production-complete.

| Marker | Meaning |
|---|---|
| `[x]` | Implemented in source with durable schema/API pathway and relevant focused tests; production validation may still be pending. |
| `[~]` | Existing or new functional partial foundation; listed required behavior remains incomplete. |
| `[ ]` | Not implemented. |
| `[B]` | Genuinely blocked. The exact blocker record appears below. |

## Foundation and non-negotiable boundaries

- [x] **Reuse the existing Knowledge Space, durable Luna persistence, memory, versions, audit, projects, goals, tasks, missions, workers, Vercel Queue/private consumer, retries, cancellation, recovery, validation, reflection, M4 advice, and M5 action loop.** The master build extends `shared/lunaCognitive.ts`, `server/luna/supabase.ts`, `server/luna/preGameCognitive*.ts`, existing router surfaces, and the existing Console. It does not create a planner, worker database, browser loop, or second consumer.
- [x] **Preserve owner scope, server-only persistence, RLS, and audit controls.** Every new table is workspace-scoped, has RLS enabled, has no direct `anon`/`authenticated` policy, and is accessed through `knowledgeOwnerProcedure` then server-only persistence.
- [x] **Preserve scientific and biological safety.** The migration makes no provider/mapping change. HRA→MNI and HRA→Julich remain `NOT_ESTABLISHED`; no coordinates, clinical, biological, cellular, molecular, or physical/nanobot action is created.
- [x] **Preserve bounded durable autonomous execution.** Input ingestion never calls the Queue, planner, worker executor, or external tool. M5 remains the only action policy and uses its unchanged budgets and owner flags.
- [x] **No consciousness claim.** New internal dimensions are labeled computational observations. Self-model inference is an evidence-backed description of a repeated operating pattern, not personality, emotion, agency, or consciousness.

## Part 1 — Persistent attention system

- [~] **Attention sources.** `ingestLunaCognitiveInput()` now derives attention from source-backed owner conversation/note/correction/project-outcome and world-event input, including declared importance, confidence/uncertainty, novelty, explicit correction/question, and high-impact keywords. Existing mission/gap/provider signals remain. Automated deadline, dependency, repeated-failure, and relationship-score source coverage remains incomplete.
- [~] **Attention objects, explainable scores, priority, decay/escalation, suppression, competition, focus, and history.** `luna_attention_assessments`, immutable `luna_focus_assignments`, deterministic primary/secondary/background allocation, version records, audit, expiry reconciliation, and source factors now exist. Full time-decay, cross-goal escalation, and explicit user suppression controls are not yet implemented.
- [x] **Attention is durable, not UI-only.** New assessments and assignments persist through owner-scoped APIs and are visible in the Cognitive Console.

## Part 2 — Bounded curiosity

- [~] **Curiosity trigger coverage.** New persistent assessments cover question/correction-driven gap candidates, uncertainty, importance, and novelty. Worker outcome, relationship, repeated-failure, and external outcome triggers are not yet fully integrated.
- [~] **Curiosity candidate fields.** `luna_curiosity_assessments` stores trigger, parent candidate/gap, expected information value, novelty, importance, status, cooldown, expiry, cycle, rationale, timestamp, and workspace provenance. A first-class priority field is represented indirectly through attention rather than as a dedicated value.
- [~] **Curiosity lifecycle.** The full lifecycle vocabulary is persisted and pure transition guards are tested. Server lifecycle updates are not yet centrally transition-validated for every status change.
- [~] **Cooldown, recursion, and cycle budget enforcement.** Per-input derivation cap, global cycle cap, cooldown timestamps, duplicate source keys, and maintenance caps exist. Curiosity maintenance has not yet expired or reconciled every stale candidate and cooldown is not yet a complete automatic dispatch guard.

## Part 3 — Knowledge-gap intelligence

- [~] **Gap discovery.** Source-backed conversation, correction, and world-event ingestion can create an audited Luna knowledge gap through the existing gap persistence path. Project/goal/task incompleteness, failed validation, worker reports, and dependency scans are not yet comprehensive sources.
- [x] **Gap categories.** `luna_gap_profiles` persists factual, relational, causal, procedural, contextual, temporal, provenance, contradiction, project, goal, social, self-model, and unknown categories.
- [x] **Gap lifecycle, merge, reopening, provenance, confidence, and relationships.** Profiles, immutable gap links, duplicate normalized keys, owner-gated merge and reopen APIs, audit, and version history are implemented. A merged source gap is dismissed through the established base lifecycle and linked to its canonical gap; a merged gap cannot become canonical or be independently reopened.

## Part 4 — Uncertainty

- [~] **Importance vs. confidence.** New experiences retain independent importance and confidence, while uncertainty stores its own score/evidence basis. This has not yet been attached to every legacy claim, memory, relationship, and project assumption.
- [x] **Persisted uncertainty.** `luna_uncertainty_records` provides owner-scoped score, importance, evidence basis, lifecycle, provenance, versioning, audit, and an open-record performance index.
- [x] **Uncertainty-aware attention.** Ingestion uses uncertainty as a recorded explainable attention factor and records its high-level uncertainty in a reasoning artifact. The existing planner/DAG policy is intentionally not redefined.

## Part 5 — Contradiction engine

- [~] **Contradiction detection.** An explicit owner correction with an identified persisted target produces a source-backed first-class `luna_contradictions` record plus a correction learning record and contradiction gap. Unstructured cross-claim/memory/evidence detection remains incomplete.
- [~] **Contradiction lifecycle.** All required statuses are schema-defined, pure lifecycle guards forbid automatic acceptance of side A or B, and correction-created contradictions default to `UNRESOLVED`. Owner review/update endpoints and evidence-driven resolution are not yet complete.
- [~] **Attention escalation for active goals/projects.** Corrections create direct attention; project/goal-specific escalation has not yet been implemented.

## Part 6 — Novelty

- [~] **Novelty detection.** `luna_novelty_records` retains a deterministic normalized source novelty key, score, rationale, target, input provenance, audit, and duplicate suppression. It does not yet compare rich entity, relationship, or semantic concepts.
- [x] **Novelty duplicate suppression.** Exact normalized source duplicates return their original input and produce no new downstream experience, gap, learning, or reasoning artifact.

## Parts 7–8 — Persistent self model and evidence-based self development

- [x] **Observed, inferred, and user-asserted self facts.** `luna_self_model_facts` has first-class `OBSERVED`, `INFERRED`, and `USER_ASSERTED` kinds, confidence, evidence count, lifecycle, versions, audit, and a bounded owner assertion endpoint.
- [x] **Evidence-thresholded inferred self development.** `canPromoteInferredSelfModel()` requires at least three actual experiences across at least two cognitive cycles with sufficient mean confidence. New self evidence anchors link each source experience idempotently.
- [ ] **Self-model influence on planning.** The current planner remains deliberately unchanged until source-backed performance/strategy evidence can safely alter a bounded planning score.

## Part 9 — Goals

- [~] **Richer durable goals.** `luna_goal_profiles` adds origin, importance, motivation, deadline, success/failure criteria, status, versions, and audit to existing goals. `luna_goal_dependencies` adds explicit `REQUIRES`, `BLOCKS`, and `SUPPORTS` edges.
- [~] **Goal competition, child handling, attention, and planning.** Existing goal parent/dependency/DAG foundations remain. The new focus engine does not yet evaluate deadlines, competing goals, or goal dependencies as independent attention sources.

## Part 10 — Values and preferences

- [x] **Persistent preference/value model.** `luna_preferences` distinguishes user, learned, task, temporary, stable, and contextual categories with context, confidence, evidence count, active status, provenance, versioning, audit, and owner-set API.
- [~] **Evidence-thresholded preference learning.** Explicit owner preferences are real source records. Automatic learned/stable preference promotion from repeated evidence is intentionally not yet enabled.

## Part 11 — Computational internal state

- [x] **Persistent bounded dimensions.** `luna_internal_state_observations` supports satisfaction, frustration, curiosity, uncertainty, confidence, urgency, social attachment, load, interest, concern, and anticipation, each in bounded numeric ranges with a reason/source/cycle.
- [x] **Event-derived transitions.** Relevant source inputs deterministically create at most four explainable state observations; they do not purport to represent biological emotion.
- [~] **Attention/prioritization influence.** Input-derived uncertainty and importance affect attention. Full cross-domain internal-state prioritization remains intentionally absent.

## Parts 12–13 — Memory architecture and consolidation

- [~] **Memory taxonomy.** Existing memory remains working, episodic, semantic, procedural, project, research, and self. New durable experiences, interactions, and learning records supply source-backed autobiographical/social/reflective context without silently relabeling them as memory.
- [x] **Memory provenance, truth classification, lifecycle, retrieval, owner scope, audit, and exact consolidation.** Existing M1–M5 implementation is retained unchanged.
- [~] **Broader consolidation.** Exact duplicate archival is functional; strength/decay/accessibility and non-exact consolidation require future evidence rules.

## Parts 14–15 — Learning and user correction

- [x] **Persistent learning records.** `luna_learning_records` retains correction/outcome/strategy/pattern type, input/experience/validation anchors, target, bounded confidence delta, provenance, immutable history, audit, and index.
- [x] **Explicit correction handling.** Corrections are filtered, retained as input/experience/learning evidence, lower confidence only on an explicit target, and create an unresolved contradiction when target metadata is supplied. Nothing silently overwrites a legacy claim or memory.
- [x] **Worker-performance evidence.** After an existing immutable result validation is newly persisted, `workerExecutor.ts` writes one `luna_worker_performance_snapshots` record including role, outcome, duration, and strategy. Retries do not duplicate the snapshot.
- [ ] **Strategy-performance feedback into planning.** Capturing metrics must precede a separately-reviewed, bounded planner policy change.

## Parts 16–17 — Conversation as cognitive input and continuity

- [x] **Normal Luna preview conversation can enter owner-scoped cognition.** `agent.luna.chat` bridges a message only when the separate Knowledge Space owner session is valid and `remember !== false`. The legacy NPC preview remains intact and separate.
- [x] **Relevance/privacy filtering.** Greeting/duplicate input is context-only; sensitive credential-shaped input is rejected; the bridge never claims a failed write was remembered. A message does not automatically become a Luna memory.
- [x] **Conversation-derived experiences, attention, gaps, learning, relationship interaction, audit, and privacy.** These derive only through the bounded service, with each source keyed idempotently.
- [ ] **Cross-conversation retrieval of pre-game records into worker/chat context.** Existing Luna memory retrieval remains bounded, but new experience/relationship/learning retrieval has not yet been added to the normal conversation prompt or worker context.

## Parts 18–22 — Reasoning, hypotheses, planning, and meta-cognition

- [x] **Structured, chain-of-thought-free reasoning.** `luna_reasoning_artifacts` retains only conclusion, confidence, uncertainty summary, up to five high-level options, recommendation, and evidence identifiers. No hidden reasoning trace is stored.
- [~] **Hypotheses.** `luna_hypotheses` and immutable `luna_hypothesis_evidence` provide lifecycle vocabulary and persistence; owner creation exists. Evidence-linking/review lifecycle APIs and automated gap/curiosity association remain incomplete.
- [~] **Planning reuse and richer plan evaluation.** Existing deterministic DAG remains sole planner; `luna_plan_revisions` stores audited high-level plan creation/revision/defer/supersession. It does not yet evaluate new uncertainty/deadline/value metrics.
- [x] **Plan revision history.** Owner-gated recording retains goal/mission links, summary, reason, alternatives, immutable version/audit history.
- [~] **Bounded meta-cognition.** Per-source reasoning highlights uncertainty and alternatives; maintenance reports bounded issue counts. Repeated-strategy-failure analysis and strategy recommendations are not yet complete.

## Parts 23–28 — Maintenance, research, worker learning, projects, commitments

- [~] **Cognitive maintenance.** Owner-triggered `runLunaCognitiveMaintenance()` bounds evaluation/derivation, expires attention, reallocates focus, counts unresolved issue records, writes a cycle and immutable maintenance report, and never dispatches work. Full stale curiosity, orphan, project-health, and consistency scanning remains incomplete.
- [~] **Autonomous research architecture.** Existing controlled tools and Queue graph remain the only runtime. No approved external source adapter was added, so no external research result is claimed.
- [x] **Controlled tool boundary.** Existing named controlled tools and worker contracts remain intact; arbitrary tool/shell/web execution is not exposed.
- [x] **Worker performance persistence.** See learning entry above; dashboard aggregation/selection influence remains future work.
- [~] **Long-term project continuity.** Existing project/goal/task/mission/memory history plus profiles, dependencies, commitments, experiences, and revisions are durable. A unified project health projection is not yet present.
- [~] **Persistent commitments.** `luna_commitments` is linked to projects/goals/relationships and includes lifecycle/due/confidence/external-action-required fields. It is not yet an attention or planner source.

## Parts 29–35 — Social readiness, relationships, world readiness, experiences, decisions

- [x] **Generic Luna social primitives.** `luna_relationships` and immutable `luna_social_interactions` are additive owner-scoped Luna records; the NPC subsystem was not merged or reused as a competing brain.
- [~] **Relationship model.** Participants, interactions, neutral initial scores, expectations, commitments, uncertainty, lifecycle, versioning, and audit are persisted. Evidence-driven trust/affinity/conflict updates and relationship-aware decisions are not yet enabled.
- [~] **Social learning.** Actual owner-authorized conversation creates an interaction with neutral impact rather than a fabricated outcome. Aggregated social learning is not complete.
- [x] **World-agnostic contract and event pipeline.** `LunaWorldEventInput` and `cognitive.preGame.world.ingest` accept source key/type/agent/object/location/time/constraints/consequences, record a neutral event, and use the same event→input→experience→cognition pipeline. No game implementation exists.
- [~] **Life-ready decision inputs.** Goals, preference, relationships, commitments, uncertainty, internal state, opportunity/constraint-shaped world events, and consequences now have durable representations. A comprehensive decision evaluator is intentionally not enabled; M5 is unchanged.

## Parts 36–42 — Autonomy, consistency, recovery, maintenance

- [x] **Internal versus external action and bounded M5 governance.** Retained unchanged from validated Milestone 5.
- [~] **Continuous-learning stability and personal development chain.** Input→experience→evidence/learning→inferred self fact→version/audit is functional. Cross-domain drift prevention remains incomplete.
- [ ] **Full consistency checks.** Impossible states, orphaned records, duplicate goals, invalid relationships, stale tasks, and project inconsistency need an explicit bounded maintenance validator before any automatic repair.
- [x] **Durable mission recovery.** Existing Queue-aware recovery is retained unchanged.
- [B] **Periodic scheduled cognitive maintenance.** The repository has a maintenance schedule table but no configured durable Vercel cron/Queue maintenance trigger for this new owner-scoped cycle. The master build may not add browser timers, polling, or a second background executor. **Dependency:** an explicit production scheduling configuration and a reviewed private trigger that invokes only the existing durable path. **Unblock:** configure a Vercel Cron (or existing approved durable scheduler) to call a private, idempotent maintenance enqueue/consumer integration with fixed cadence and budget. **Later feasibility:** yes. **Impact:** manual owner-triggered bounded maintenance is functional; automatic periodic execution is intentionally unavailable.

## Parts 43–54 — Console, API, safety, adapters, future readiness

- [x] **Cognitive Console observability.** The owner Console now renders durable counts, active scored attention, focus, uncertainty, contradictions, gaps/curiosity, learning, self facts, preference/internal-state counts, commitments/hypotheses/relationships, manual source ingestion, and bounded maintenance. It clarifies that `maxWorkers` means **max concurrent workers**.
- [x] **Luna Chat cognitive input.** Owner-authorized remembered Luna preview chat is bridged through the new safe input path; it is not an unbounded autonomous loop.
- [~] **Human-readable explanation.** Existing and new high-level rationales are visible; a full unified activity narrative is not yet assembled.
- [x] **Audit/reconstructability.** New mutable records write generic cognitive versions; append-only records have immutable triggers; all new writes produce cognitive audit events.
- [x] **Additive database migration and verifier.** `20260827_luna_pre_game_cognitive_master.sql` and its single-grid verifier passed all 28 table-security rows, owner-scope, cognitive-version, and scientific-invariant checks in production. `20260828_luna_pre_game_focus_replacement_fix.sql` then corrected only the intended one-way focus `replaced_at` lifecycle and its verifier returned `PASS`. Neither migration modifies provider records, mappings, Queue behavior, or RLS browser policies.
- [~] **Owner APIs across domains.** Owner snapshot, bounded input/world/maintenance, preference, self assertion, goal profile/dependency, gap merge/reopen, commitment, hypothesis, and plan record APIs exist. Arbitrary raw writes are intentionally omitted; several review/update lifecycle operations remain to be added.
- [x] **World adapter interface.** See world-event entry above.
- [~] **NPC-ready identity boundary.** Workspace isolation and `agent_identity`/`participant_identity` exist. Current Luna runtime identity is fixed as `luna`; generic multi-agent creation/cloning is a future scope and is not simulated.
- [x] **No game was built.** No rendering, gameplay, world simulation, economy, quest, combat, or life simulation was introduced.

## Parts 55–60 — Tests and production acceptance

- [x] **Focused local tests for implemented domains.** `preGameCognitive.test.ts` (10), `preGameCognitiveService.test.ts` (4), `preGameCognitiveMigration.test.ts` (3), `preGameFocusReplacementMigration.test.ts` (2), and `knowledge.preGameCognitive.test.ts` (5) cover relevance/sensitive rejection, lifecycle/focus/budget guards, source pipeline idempotency, world events, maintenance, migration posture, focus-history safety, and owner gating. The dedicated final focus/API suite passed 11/11; the full repository suite reported 325 passed, 14 pre-existing external-integration failures, and 2 skipped.
- [x] **Production end-to-end source, maintenance, and cleanup acceptance.** Through the owner Console, a temporary explicitly non-scientific source was retained and boundedly assessed as one durable input, experience, focus assignment, uncertainty record, profiled gap, curiosity record, and computational observations; it created no mission or Queue work. Maintenance initially revealed and then, after the reviewed trigger-only correction, passed a three-record bounded reconciliation with a durable report. The owner then confirmed the supported retirement workflow, which retained immutable source/experience/audit/version/history but cleared active focus, active attention, open uncertainty, active curiosity, and the temporary gap from the open summary. No M5 mission was rerun.
- [~] **Production conversation, correction, and repeated-evidence self-development acceptance.** The code paths are owner-gated and focused-tested, but these additional production scenarios were intentionally not run because they would create unnecessary durable private cognitive history and are not prerequisites for the delivered bounded foundation.

## Parts 61–82 — Performance, termination, future API, final checks

- [x] **Performance indexes and bounded reads.** Migration provides workspace/status/time indexes for each new table; snapshot reads use existing `MAX_LIST` bounds; input cycle cap is 100 evaluated / 16 derived records; focus is capped at 12 assignments.
- [~] **No infinite cognition.** Existing M5 budgets are unchanged; input ids, source/cycle keys, duplicate suppression, derivation caps, focus replacement, cooldown timestamps, and maintenance caps are implemented. Full curiosity cooldown enforcement and scheduled maintenance remain incomplete.
- [x] **No per-change approval gate for routine safe cognition.** Owner-gated source input can be deterministically assessed without per-record approval. External/high-impact action remains governed by existing policy.
- [~] **Unified cognitive activity stream.** New write events use the established cognitive audit stream and version records; a single cross-domain activity read model remains future work.
- [~] **Future-facing API surface.** Current surface covers source/world event, state snapshot, focus projection, attention, gap, curiosity, goal profile/dependency, plan record, hypothesis, relationship data, learning, maintenance, and existing M5 decisions/actions. Generic agent creation, replan and reflect/learn commands remain out of scope until safe policy design is reviewed.
- [ ] **Future NPC cloning architecture.** Requires a reviewed multi-agent identity/workspace model; current implementation intentionally does not mass-clone Luna.
- [x] **Final production capability check and report.** The production migrations were user-applied and verified; the owner Console acceptance and supported fixture retirement completed; the final production deployment is `dpl_BG54k9LmcgbFEbQfG1eHydputi5T` for commit `fe62959550900ebf8f1f6db15ebaa65be22420a2`. See `docs/luna-pre-game-cognitive-production-notes.md` and the final report.

## Production migration evidence

The owner applied both reviewed migrations to Supabase project `qyyvyiwsqhuzraxuyqxu`. The consolidated read-only verifier returned `PASS` for all 28 table-security rows, the owner-scope contract, the extended cognitive-version constraint, and the scientific invariant. The follow-up focus-history verifier returned `FOCUS_REPLACEMENT_TRIGGER ... PASS`. Production acceptance evidence and the exact temporary-fixture retirement scope are recorded in `docs/luna-pre-game-cognitive-production-notes.md`.

## Architecture dependency chain

```text
Owner-authorized source or neutral world event
  → relevance/privacy validation and idempotent source key
  → immutable input and bounded cognitive cycle
  → experience + novelty + uncertainty + scored attention
  → optional gap/curiosity/correction learning/contradiction
  → bounded computational state + high-level reasoning artifact
  → evidence-thresholded self model and neutral interaction record
  → deterministic focus allocation and audit/version history
  → existing M5 policy only, if a separately eligible persisted source exists
  → existing Queue/private consumer/worker/validation/reflection path
```

The existing Queue-backed mission system remains the sole durable worker-dispatch path. New cognitive records may be inspected by the existing action policy only after a future reviewed integration; they do not execute workers or create an alternative planner/runtime.
