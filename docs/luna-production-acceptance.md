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
| Focused cognitive tests | **PASS** | 13 tests passed: cognition (7), orchestration (3), controlled tools (3). |
| Client production build | **PASS** | `pnpm exec vite build` completed. Analytics placeholders and chunk-size notices remain non-fatal warnings. |
| Full application build | **PASS** | `pnpm build` completed, including client and server bundles. |
| Type check | **BASELINE BLOCKER** | Only the pre-existing unrelated `server/_core/imageGeneration.ts` → `server/storage` import error remains. |
| Cognitive console production interaction | **PENDING** | Requires code deployment, owner unlock, and stable production browser validation. |
| Durable runtime dispatch | **BLOCKED** | No verified provider configuration or returned durable run ID. |
| Browser-closure/runtime-interruption survival | **BLOCKED** | Cannot test until a runtime is configured. |
| P33 spatial boundary | **PASS / NOT_ESTABLISHED** | No Luna-native/raw GLB ↔ MNI transform is created or emitted. |
| P32 Julich boundary | **PASS / UNAVAILABLE** | Retained result: 0 authoritative / 0 probabilistic / 0 requires-domain-review / 102 unmapped. |
| Physical/biological nanobot capability | **UNAVAILABLE** | Workers are software-only; Macro remains a visual simulation. |

## Schema verification detail

The verification query was executed as a read-only catalog diagnostic after the migration. It returned `verification_passed = true` and a compact diagnostic establishing the following: `tables=16/16`, `rls=16/16`, `missing_tables=0`, `direct_browser_policies=0`, root-task foreign key present, `indexes=13/13`, `update_triggers=9/9`, and audit immutability infrastructure present.

The applied schema is additive: it creates cognitive tables prefixed `luna_` and does not replace or change the released Knowledge Space tables or scientific/provider tables. The exact migration and current verifier are retained in `supabase/migrations/20260827_luna_cognitive_architecture.sql` and `supabase/verify_luna_cognitive_architecture.sql`; the execution ledger is retained in `docs/.luna-cognitive-migration-execution-log.md`.

## Release validation sequence

After deployment, production acceptance must perform the following under the existing single-owner Knowledge Space session:

1. Open Knowledge Space and confirm the released object/folder/graph UI remains intact.
2. Unlock with the existing administrator password; no browser secret or Supabase credential should be disclosed.
3. Open the additive Cognitive panel and confirm its snapshot comes from durable state.
4. Create one inferred working-memory entry and inspect its owner scope, source, truth state, audit event, and version.
5. Create one bounded objective; confirm project, goal, mission, task graph, worker records, budgets, and audit activity persist after refresh.
6. Confirm automatic dispatch shows `WAITING_FOR_RUNTIME`/actual runtime detail rather than fabricated worker execution, progress, run ID, or completion.
7. Confirm pause/cancel/recovery/reconcile actions produce persisted facts only.
8. Confirm a Luna-owned memory rollback creates later history rather than mutating earlier versions.
9. Confirm P33 and Julich facts remain unchanged and no Brain/Knowledge linkage emits an MNI coordinate.
10. Confirm no worker status or report claims a physical, clinical, cellular, molecular, or biological nanobot action.

## Pending runtime acceptance

A runtime can be marked configured only after an authorized project integration returns a real durable run identifier, a step survives browser/request closure, retry/cancellation/interruption paths are observable, and persisted outputs retain correct source/truth/actor/audit/version behavior. Until then the product should use **BLOCKED** for unattended worker execution, not **COMPLETE**.
