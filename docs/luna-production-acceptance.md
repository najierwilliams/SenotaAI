# Luna Cognitive Production Acceptance

## Evidence ledger

This document records only checks that have been executed or explicit blockers. It must not be read as evidence that a durable workflow/queue runtime, external research system, scientific transform, or biological capability exists.

| Check | Result | Evidence |
|---|---|---|
| Additive migration execution | **PASS** | Existing SenotaAI Supabase project returned the final migration `pg_notify` result with no SQL error. |
| Table presence | **PASS** | Read-only verifier returned 16/16 expected cognitive tables and no missing table. |
| RLS enabled | **PASS** | Read-only verifier returned RLS enabled for all 16 cognitive tables. |
| Direct browser-role policies | **PASS** | Verifier found no direct `anon`, `authenticated`, or `public` policies; access remains server-mediated after owner-session verification. |
| Foreign keys | **PASS** | Verifier confirmed the required root-task foreign key. |
| Indexes | **PASS** | Verifier returned 13/13 expected cognitive indexes. |
| Update triggers | **PASS** | Verifier returned 9/9 expected touch/update triggers. |
| Audit immutability trigger/function | **PASS** | Verifier confirmed the immutable audit trigger and `luna_prevent_cognitive_audit_mutation` function. |
| Focused cognitive tests | **PASS** | 14 tests passed: cognition (7), orchestration (3), controlled tools (3), concurrent self-state initialization (1). |
| Full test suite | **PARTIAL** | 257 tests passed and 2 skipped. The unchanged 14 failures are unrelated Supabase-nanite, OAuth/connector, or NPC-administrator session tests that lack their required test configuration; no Luna test failed. |
| Client production build | **PASS** | `pnpm exec vite build` completed. Analytics placeholders and chunk-size notices remain non-fatal warnings. |
| Full application build | **PASS** | `pnpm build` completed, including client and server bundles. |
| Type check | **BASELINE BLOCKER** | Only the pre-existing unrelated `server/_core/imageGeneration.ts` → `server/storage` import error remains. |
| Cognitive console production interaction | **PASS** | The owner-unlocked console rendered from production durable state after the first-load race repair in commit `a12c6fe`. |
| Durable working-memory persistence | **PASS** | One bounded non-scientific working note persisted, refreshed from the server, and rendered with explicit `INFERENCE` truth state. |
| Durable planning and runtime block | **PASS / BLOCKED** | A bounded plan persisted project/goal/mission/task/worker-budget records as `WAITING FOR RUNTIME`; it created no active worker or run ID. |
| Pause/cancel lifecycle | **PASS** | The acceptance-only mission changed to `PAUSED`, then `CANCELLED`, with audit-retention confirmation and no worker execution. |
| Durable runtime dispatch | **BLOCKED** | No verified provider configuration or returned durable run ID. |
| Browser-closure/runtime-interruption survival | **BLOCKED** | Cannot test until a runtime is configured. |
| Recovery/reconcile and memory rollback production controls | **IN_PROGRESS** | Source paths exist, but production acceptance did not create a recovery record or perform a memory rollback. |
| P33 spatial boundary | **PASS / NOT_ESTABLISHED** | No Luna-native/raw GLB ↔ MNI transform is created or emitted. |
| P32 Julich boundary | **PASS / UNAVAILABLE** | Retained result: 0 authoritative / 0 probabilistic / 0 requires-domain-review / 102 unmapped. |
| Physical/biological nanobot capability | **UNAVAILABLE** | Workers are software-only; Macro remains a visual simulation. |

## Schema verification detail

The verification query was executed as a read-only catalog diagnostic after the migration. It returned `verification_passed = true` and a compact diagnostic establishing the following: `tables=16/16`, `rls=16/16`, `missing_tables=0`, `direct_browser_policies=0`, root-task foreign key present, `indexes=13/13`, `update_triggers=9/9`, and audit immutability infrastructure present.

The applied schema is additive: it creates cognitive tables prefixed `luna_` and does not replace or change the released Knowledge Space tables or scientific/provider tables. The exact migration and current verifier are retained in `supabase/migrations/20260827_luna_cognitive_architecture.sql` and `supabase/verify_luna_cognitive_architecture.sql`; the execution ledger is retained in `docs/.luna-cognitive-migration-execution-log.md`.

## Completed production validation

The corrected production deployment `dpl_EctpaC61cm8aAgo8JtZFXgC7BHGr` for commit `a12c6fe` was opened under the existing single-owner Knowledge Space session. The released Knowledge Space hierarchy and scientific structure context remained visible. Its HRA visual-GLB/MNI statement stayed `NOT_ESTABLISHED`, and the Julich boundary remained 0/0/0/102.

The additive Cognitive Console first rendered a durable self-state with an unconfigured `UNAVAILABLE` runtime. A bounded working-memory record was saved and then returned in a fresh server-backed snapshot as `WORKING` / `INFERENCE`. A separate bounded acceptance objective persisted a project, goal, mission, 4 planned workers, a 24-step budget, and a 12 model-request budget, but returned `WAITING FOR RUNTIME` with 0 active workers and no run ID. The mission was then paused and cancelled through owner-only controls; the visible terminal record stated that audit history was retained.

These checks did not create a scientific/provider/spatial record, emit an MNI coordinate, run a worker, invoke external research, activate a Macro nanobot simulation, or claim a physical, clinical, cellular, molecular, subcellular, or biological operation. Recovery/reconcile and memory rollback remain production-acceptance follow-up checks rather than completed claims.

## Pending runtime acceptance

A runtime can be marked configured only after an authorized project integration returns a real durable run identifier, a step survives browser/request closure, retry/cancellation/interruption paths are observable, and persisted outputs retain correct source/truth/actor/audit/version behavior. Until then the product should use **BLOCKED** for unattended worker execution, not **COMPLETE**.
