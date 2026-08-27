# Luna Vercel Queue Production Acceptance Record

**Recorded:** 2026-08-27 EDT  
**Scope:** Production verification of the existing Luna Vercel Queue durable runtime only. No Knowledge Space schema, cognitive architecture, scientific/provider registry, coordinate mapping, physical nanobot behavior, or public API redesign was performed.

> All acceptance missions were explicitly non-scientific, used zero model requests and zero token budget, and prohibited external research, scientific authority, coordinate claims, physical action, biological action, and clinical action. Their outputs remain Luna-owned `INFERENCE` records.

## Production baseline

The final active production deployment at the close of this acceptance sequence was **`dpl_GDgkqrPxmHJsC8WPUA3seZrx5acM`**, source commit **`7b8db61`** (`fix(luna): reserve capacity for resumed worker`). It was `READY`, held the `senota-ai.vercel.app` production alias, and reported three Node functions. The private function remains `api/luna/queue-consumer.ts`, configured with the Vercel `queue/v2beta` trigger for topic `luna_worker_v1`; the generic public `/api` rewrite explicitly excludes that private path.

| Field | Factual result |
|---|---|
| Provider | Vercel Queues |
| Queue topic | `luna_worker_v1` |
| Consumer | Private Queue-triggered `api/luna/queue-consumer.ts` |
| Public worker endpoint | None added; the exact callback path remains excluded from the public Express rewrite |
| Durable producer identity | Actual provider message IDs only; no synthetic run identifiers were used |
| Worker execution | Persisted deterministic, bounded internal-context worker steps only |
| Knowledge / memory truth status | Luna-owned `INFERENCE`; no scientific elevation or provider authority claimed |

## Acceptance matrix

| Required field | Status | Production evidence |
|---|---|---|
| Provider / status / queue / consumer | **VERIFIED** | Vercel Queue private callbacks invoked the configured `queue/v2beta` consumer. The final deployment was `READY`; the callback path was not routed through the public Express relay. |
| Real provider ID | **VERIFIED** | Examples include browser-closure mission run ID `1R-1M1UwtqXdAN8CfRiaf57pM9INMTvUXT8`, recovery run ID `1V-1M1aDfcQBkzqw3TLgM3DoxAHtEe4Ccks`, and resumed-run ID `1S-1M1UwtzQFbV5riqY2AB4Pf6eQRCTD1Oc`. |
| Real active worker / multiworker DAG / closure | **VERIFIED** | Multiple missions persisted Planner, Memory, two distinct Scouts, Researcher, Validator, Synthesis, and Reflection workers. The browser-closure mission `af3c513e-4fb5-4b15-a756-e54e4bf74443` reached `COMPLETED`, with all eight task and worker records `COMPLETED`. |
| Controlled provider retry | **VERIFIED** | Retry mission `4df5d929-4c0c-4332-b0fb-efdd22475b19` recorded a controlled post-start Planner failure and `WORKER_RETRY_SCHEDULED` at delivery 1. The private callback emitted a real HTTP `500` in deployment `dpl_GPXjreywGF9DKemwspRTrdxhy135`. The same persisted Planner later started at `16:32:27.702` and completed at `16:32:29.840`, demonstrating provider redelivery rather than direct database completion. The controlled mission was then cancelled to prevent unnecessary later role retries. |
| Pause / no work while paused | **VERIFIED** | Mission `b506232f-9758-4ca6-8107-9b0e19f7bfec` was paused while all tasks remained pending. Its real private Queue callback recorded `WORKER_QUEUE_SKIPPED` with reason `Persisted owner lifecycle state prevents work.` and status `PAUSED`. |
| Resume / remaining persisted work | **VERIFIED** | The same mission received new run ID `1S-1M1UwtzQFbV5riqY2AB4Pf6eQRCTD1Oc`; `WORKER_REQUEUED` was recorded for its persisted Planner and all eight tasks and workers later completed. Two production-observed pause/resume race fixes (`ccc695c`, `7b8db61`) were required and validated. |
| Cancellation | **PARTIALLY VERIFIED** | Mission `66e43f34-41a9-46ca-b279-277ae146b726` was cancelled through the owner lifecycle route after its Planner had completed. The mission became `CANCELLED`; the other seven task records remained `PENDING` and did not start. This proves cancellation blocks remaining work, but does **not** prove interruption of an actively running worker. |
| Recovery / reconciliation | **VERIFIED** | The owner recovery sweep marked genuine interrupted missions `RECOVERY_REQUIRED` without fabricating completion. A preexisting non-scientific interrupted mission `f6c9d647-c80a-47e8-a603-0ba57fb9d8de` was then resumed through the normal owner route using a new real run ID and completed all eight task and worker records. |
| Browser/client interruption survival | **VERIFIED** | Browser-closure mission `af3c513e-4fb5-4b15-a756-e54e4bf74443` was dispatched with a provider-issued run ID; the browser was closed immediately afterwards. After reopening only to inspect persisted state, all eight task and worker records were `COMPLETED`, and mission completion time was `16:49:39.316`. |
| Idempotency / duplicate delivery | **UNVERIFIED IN PRODUCTION** | Deterministic worker IDs, producer idempotency keys, completed/cancelled worker duplicate guards, and focused tests exist. No real duplicate provider delivery was intentionally induced or observed in production during this sequence; therefore no production exactly-once-effect claim is made. |
| Memory versioning | **VERIFIED** | Memory `807cb9a9-ef9c-4d52-bddf-8e9cac180f73` was created as a Luna-owned `INFERENCE`, updated by the bounded Memory worker to version 2, and retained immutable activity. |
| Memory rollback / audit | **VERIFIED** | The existing owner-gated rollback route restored that memory from version 1. Its resulting current version was 3 and its `MEMORY_ROLLED_BACK` event recorded `priorVersion: 2` and `restoredFromVersion: 1`. |
| Knowledge / report output | **VERIFIED, bounded** | Completed workers persisted Luna-owned software-handoff/report objects linked from the Memory record (`sourceObjectIds`). The Knowledge Space displayed these as software-worker handoff records. No external evidence, scientific provider record, or authoritative conclusion was generated. |

## Implementation changes made during acceptance

The acceptance sequence discovered two real lifecycle defects through persisted production evidence and repaired them narrowly.

| Commit | Change | Reason |
|---|---|---|
| `04f01f4` | Added internal, objective-marker-gated acceptance controls and focused tests | Generated one bounded post-start failure and one reversible Luna-memory revision using the real private Queue worker path; no route, schema, credential, or public debug endpoint was added. |
| `f7cb849` | Changed ordinary callback failures to provider-managed Queue retry and configured `retryAfterSeconds: 5` on the existing private trigger | The prior SDK retry directive caused application-level visibility rescheduling. The updated callback returns a failed response for retryable errors, allowing the Vercel Queue provider to redeliver. |
| `ccc695c` | Requeued a worker that had materialized just after a pause under a fresh resumed run | Production pause evidence exposed a race in which a queued worker was not republished after resume. |
| `7b8db61` | Reserved resumed-run capacity for that queued worker | Production evidence exposed that the queued pre-pause worker initially consumed capacity before requeueing. |

The final code preserves the published Queue architecture, owner-gated lifecycle mutations, bounded internal worker tools, zero-budget deterministic path, additive cognitive persistence, released Knowledge Space, immutable audit behavior, and the stated scientific/nanobot boundaries.

## Validation

| Validation | Result |
|---|---|
| `pnpm build` after lifecycle corrections | Passed; private Queue bundle emitted successfully |
| Focused Queue and lifecycle tests after retry correction | Passed: 14 tests across six files |
| Focused Queue and orchestration tests after pause/resume corrections | Passed: 10 tests across four files |
| `git diff --check` | Passed before relevant commits |
| Production deployment | Each referenced revision reached `READY` before its associated production test |

The preexisting non-fatal analytics placeholder warnings and Vite large-chunk warning persisted. The known baseline TypeScript and environment-dependent full-suite failures were not represented as resolved by this work.

## Remaining acceptance boundary

The immediate Queue ingress and durable worker runtime are proven. The only acceptance category still not completely proven is **a real duplicate provider delivery with demonstrated no-duplicate irreversible effect**. Cancellation is proven for pending remaining work but not for forcibly interrupting a worker already inside a bounded execution step. These limits are stated to avoid fabricated completion claims.

## References

[1] [Vercel Queue JS SDK reference](https://vercel.com/docs/queues/sdk) — Documents `handleNodeCallback` acknowledgement, retry-on-throw behavior, retry callbacks, and delivery metadata.

[2] [Vercel Queue Concepts](https://vercel.com/docs/queues/concepts) — Documents private `queue/v2beta` consumers, at-least-once delivery, visibility timeouts, retry configuration, deployment partitioning, and idempotency.

## Final independent validation results

An independent `pnpm exec vite build` completed successfully on the final source state. It emitted only the preexisting analytics-placeholder and large-chunk warnings. `pnpm check` still fails on the known baseline `TS2307` import in `server/_core/imageGeneration.ts` for `server/storage`; no Luna Queue source is named in that diagnostic.

The final `pnpm test` run produced **265 passed**, **2 skipped**, and **14 failed** tests across **13 failing files**. The failures are the existing environment/session-dependent NPC, nanite/Supabase configuration, OAuth/GitHub session, and relationship-administration tests; they do not involve the Queue-focused files validated above. This record does not represent the full unrelated suite as passing.
