# Luna Queue final durable-runtime acceptance record

**Date:** 2026-08-27 (EDT)  
**Scope:** Final private Vercel Queue runtime hardening only. This record does not change or elevate the released Knowledge Space, additive Luna cognitive architecture, HRA/UBERON/Jülich/MNI boundaries, provider records, or software-only nanobot boundary.

> **Classification: DURABLE AUTONOMY — COMPLETE within documented provider testability.**
>
> The provider does not expose a documented administrative or SDK control for replaying an acknowledged push-delivered message to force a duplicate consumer delivery. Consequently, real duplicate provider delivery remains explicitly **UNVERIFIED**. The strongest safe evidence is an integration test that invokes the actual private consumer message handler twice with the same provider message identity and confirms that the second delivery is acknowledged as `WORKER_QUEUE_DUPLICATE` without a second executor call or follow-up publish. This is not presented as exactly-once delivery; the implemented model remains at-least-once delivery with durable single-effect protections.

## Final deployment and source state

| Item | Observed value |
|---|---|
| Final production deployment | `https://senota-ai.vercel.app` |
| Final deployment ID | `dpl_7QhcmqB1uh4m66ntRWHm6V1QC1uL` |
| Final runtime source commit | `2085b75de114860b290ce8ef47edf04acb827cd2` — `fix(luna): preserve concurrent cognitive versions` |
| Preceding cancellation commit | `dcf5588e6008a3c7451d46575f0f96eab55afddf` — `fix(luna): stop active workers at cancellation checkpoints` |
| Deployment condition | `READY`, production aliases attached, three Node functions, `iad1` |
| Queue contract | Vercel Queue topic `luna_worker_v1`; private `queue/v2beta` callback; no public worker endpoint |

The final deployment retained the existing public Express bridge and authenticated owner API behavior. The private callback remained excluded from the generic `/api` rewrite. Vercel Queue push consumers are at-least-once delivery systems and must protect effects through idempotent consumer behavior.[1][2]

## Final production end-to-end mission

The final browser-independent, bounded, non-scientific mission was planned and dispatched once on the final deployment. It received the real provider run ID `1I-1M1Z1OiRFlzURQqtC2s8nthO6AlK9wQs`.

| Evidence item | Observed result |
|---|---|
| Mission ID | `81f50715-b5aa-4f10-aa2c-8e1e291a39dc` |
| Owner-created project / goal | Project `f75ed57e-d1b8-45dd-bd97-882ec980bbe6`; goal `6df96b3b-2038-44c4-8dc4-7941bcf04651` |
| Provider run acceptance | Provider-issued run ID persisted at `2026-08-27T17:44:32.347Z` |
| Browser independence | Browser was closed immediately after dispatch; the inspection occurred only after reopening. |
| Parallel Scout evidence | Two Scout callbacks were independently delivered at `17:44:55.670913Z` and `17:44:55.727524Z`; their workers started at `17:44:57.139Z` and `17:44:57.132Z`. |
| Closure | Mission reached `COMPLETED` at `2026-08-27T17:46:23.185Z`; immutable `MISSION_COMPLETED` activity records `completedWorkers: 8`. |
| Completed graph | Planner, Memory, two Scouts, Researcher, Validator, Synthesis, and Reflection each have one `COMPLETED` task and worker; all retries used are zero. |
| Reflection | `2011f15f-9520-457e-a3b5-e7fcc816dd03`, `INFERENCE`, with `newInferenceCount: 8`. |
| Luna-owned output | Four `RESEARCH` Luna memory records at version 1, each `INFERENCE` and linked to a persisted worker-report object ID. |
| Model budget | Zero model requests and zero token usage. The run used deterministic bounded internal-context handoffs only. |
| Concurrent-version result | No persisted `23505` cognitive-version conflict appears for the final mission. |

### Concurrent-worker corrective evidence

The immediately preceding browserless final mission exposed a real parallel-Scout cognitive version conflict: two independent Scout callbacks attempted to write the same mission version, causing PostgreSQL `23505` unique-key conflict. This was not hidden or treated as completion. Commit `2085b75` replaces the conflicting read-then-insert version write with a bounded unique-conflict retry that obtains a new monotonic immutable version. It preserves both writes and does not serialize Scouts or weaken the version constraint. The corrected final mission subsequently completed both Scouts in parallel with zero version-conflict activity.

## Gate 1 — duplicate provider delivery and idempotency

No documented Vercel Queue facility for replaying an already acknowledged push delivery, injecting a second delivery of the same accepted message, or administratively duplicating a message was identified in the reviewed Queue documentation.[1][2] No unsupported injection, direct database manipulation, queue storm, public debug route, or synthetic production audit record was used.

The integration test `server/luna/vercelQueueConsumer.idempotency.test.ts` replays the same `WORKER_STEP` payload and the same provider message ID through the actual `handleLunaQueueMessage` private-consumer path. Delivery one runs the injected worker exactly once. Delivery two uses `deliveryCount: 2`, sees the completed persisted worker state, produces `WORKER_QUEUE_DUPLICATE`, does not invoke the executor a second time, and does not publish follow-up work. A stale post-cancellation delivery is separately acknowledged as `WORKER_QUEUE_SKIPPED`, with no executor call or recovery scheduling.

| Potential irreversible effect | Durable guard / verified behavior |
|---|---|
| Mission dispatch | Mission-scoped provider idempotency key and persisted `runtimeRunId`. |
| Worker materialization | Deterministic worker IDs; persisted existing-worker behavior. |
| Worker execution | Private consumer refuses a `COMPLETED` or `CANCELLED` worker before calling the executor. |
| Worker reports / Luna memory / Knowledge objects | The duplicate guard prevents a repeated delivery from reaching the executor, thereby preventing a second report, memory, or Knowledge object creation through that delivery path. |
| Completion / reflection | Completed mission guard and persisted task states prevent a second completion path. |
| Audit | Immutable activity records the duplicate or stale acknowledgement; no state-changing audit replay is created. |

## Gate 2 — active-worker cooperative cancellation

A fresh bounded non-scientific acceptance mission, `2ffe84e7-d658-4a3e-88d7-64bc20e51c80`, was dispatched on the final cancellation-checkpoint deployment. Its real provider run ID was `1K-1M1V5ilhKy661YlbvMniGWYL2vbpKMRG`.

The Memory worker `f94a5ddc-062a-507e-a7e9-27ea608f0587` was observed `RUNNING` at `2026-08-27T17:36:10.646Z`. At `17:36:11.651344Z`, immutable activity recorded `ACCEPTANCE_CANCELLATION_WINDOW` before its first side effect. While that worker was genuinely active, the existing owner-gated `mission.cancel` procedure was invoked and returned `CANCELLED` at `17:36:16.317Z`.

| Required result | Observed evidence |
|---|---|
| Cancellation request persisted | Mission `cancelRequested: true`, `status: CANCELLED`, and owner `MISSION_CANCELLED` activity. |
| Worker genuinely active | Persisted `RUNNING` state, start timestamp, and `WORKER_EXECUTION_ACTIVE` / acceptance-window activity preceded cancellation. |
| Cooperative stop | `WORKER_CANCELLED_CHECKPOINT` at `17:36:17.577676Z`, stage `before_report_persistence`. |
| No further irreversible effect | The cancelled Memory worker has `outputSummary: null`; no mission-scoped Luna memory was created by it. |
| Worker and task reconciliation | Worker is `CANCELLED`; its task is `CANCELLED`; later tasks remain pending and did not execute. |
| Cancellation versus retry/recovery | `WORKER_QUEUE_CANCELLED` at `17:36:17.747565Z` acknowledges the provider message without retry or recovery; no `WORKER_RETRY_*` or `RECOVERY_REQUIRED` event was present. |
| Stale delivery protection | Consumer-path integration test verifies a `CANCELLED` mission/worker is skipped before executor invocation or recovery scheduling. |

The new checkpoint code is used only at existing private-worker safe boundaries. Its temporary delay is restricted to the explicit non-scientific test marker `[[LUNA_ACCEPTANCE:CANCELLATION_CHECKPOINTS]]`; ordinary production objectives do not wait or receive test behavior. Every worker now checks persisted cancellation before context retrieval, before report persistence, and before completion; a cancellation-specific terminal error is acknowledged by the private Queue consumer rather than being misclassified as retryable failure or recovery-required interruption.

## Production acceptance matrix

| Capability | Status | Evidence |
|---|---|---|
| Vercel Queue | VERIFIED | Vercel Queue topic `luna_worker_v1` accepted real producer messages and delivered private callbacks. |
| Provider message ID | VERIFIED | Final run `1I-1M1Z1OiRFlzURQqtC2s8nthO6AlK9wQs` is persisted and provider-issued. |
| Private consumer | VERIFIED | Private `queue/v2beta` callback remains separate from public Express routing. |
| Real worker | VERIFIED | Final mission persisted eight completed worker records and callback activity. |
| Multi-worker DAG | VERIFIED | All eight role/task records completed under one final provider run. |
| Parallel workers | VERIFIED | Independent Scout callbacks and near-simultaneous starts were persisted. |
| Worker handoff | VERIFIED | Each completed worker/task record and report-linked outputs were persisted. |
| Browser closure | VERIFIED | Browser was closed immediately after final dispatch; mission completed before inspection. |
| Provider retry | VERIFIED | Earlier controlled production retry returned a callback 500 then provider-redelivered the same persisted worker to completion. |
| Pause | VERIFIED | Prior controlled mission persisted paused state and withheld queued work. |
| Resume | VERIFIED | The paused graph was republished under a new provider run and completed. |
| Recovery | VERIFIED | Recovery sweep marked genuine interruption; an existing recovery-required mission resumed through Queue and completed. |
| Memory persistence | VERIFIED | Final mission persisted four linked Luna-owned inference memories. |
| Memory rollback | VERIFIED | Earlier controlled Luna-owned version 2 memory was rolled back through the owner route, preserving version/audit history. |
| Knowledge persistence | VERIFIED | Final mission created Luna-owned inferred handoff report objects; no provider/scientific record was created. |
| Audit | VERIFIED | Immutable delivery, handoff, cancellation, retry, recovery, and completion activity were persisted. |
| Duplicate provider delivery | UNVERIFIED | No safe documented replay/duplicate injection mechanism was exposed by Vercel Queue. |
| Idempotency against duplicate delivery | PARTIALLY VERIFIED | Actual consumer-path integration test repeated the same provider identity, recorded duplicate acknowledgement, and prevented a second execution/publish; no real provider duplicate was available. |
| Active-worker cancellation | VERIFIED | A persisted `RUNNING` Memory worker was cancelled while active and stopped at a safe checkpoint. |
| Cancellation checkpoints | VERIFIED | Production `WORKER_CANCELLED_CHECKPOINT` evidence plus safe-boundary code and focused tests. |
| Cancellation/retry interaction | VERIFIED | The active cancellation callback acknowledged terminally without retry; no retry/recovery events occurred. |
| Scientific safety | VERIFIED | Acceptance missions were non-scientific, internal-context only, zero-model-budget, and all resulting records remain Luna-owned `INFERENCE`. HRA→MNI and HRA→Jülich remain `NOT_ESTABLISHED`; no coordinates or physical/biological nanobot operation was created. |

## Exact changed files and tests

| Commit | Files changed | Purpose |
|---|---|---|
| `dcf5588` | `server/luna/acceptanceControls.ts`; `server/luna/workerExecutor.ts`; `server/luna/vercelQueueConsumer.ts`; `server/luna/vercelQueueConsumer.idempotency.test.ts` | Adds explicit acceptance-only cancellation window, persisted safe checkpoints, terminal cancellation acknowledgement, and duplicate/stale consumer-path tests. |
| `2085b75` | `server/luna/supabase.ts`; `server/luna/supabase.versioning.test.ts` | Preserves immutable concurrent mission version writes with bounded unique-conflict retry; tests the observed `23505` case and fail-closed unrelated errors. |

Focused final regression suite passed: **7 files, 18 tests**. It includes Queue topology, runtime, consumer retry, actual consumer-path duplicate/stale behavior, cancellation terminal handling, acceptance controls, orchestration, and immutable concurrent-version retry.

`pnpm build` passed and `pnpm exec vite build` passed. Both retain only the existing non-fatal analytics environment placeholder and chunk-size warnings. `git diff --check` passed. `pnpm check` retains the known unrelated `TS2307` import failure in `server/_core/imageGeneration.ts` for `server/storage`. Full `pnpm test` reported **270 passed, 2 skipped, 14 failures** across existing environment/session-dependent NPC/nanite/OAuth/GitHub tests; no Queue acceptance test failed.

## Remaining blocker and operational boundary

There is **no runtime blocker** for the bounded software-only Luna durable pipeline. The only limitation is that real duplicate provider delivery of an already acknowledged message remains unverified because Vercel Queue does not expose a documented safe replay/injection control in the reviewed documentation. No claim of exactly-once delivery is made. The production implementation and actual-consumer integration test provide the available effect-level evidence while preserving at-least-once Queue semantics.

## References

[1]: https://vercel.com/docs/queues "Vercel Queues documentation"
[2]: https://vercel.com/docs/queues/sdk "Vercel Queues SDK documentation"
