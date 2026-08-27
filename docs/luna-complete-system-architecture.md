# Luna Complete System Architecture

## System intent

SenotaAI/Luna combines a Brain visualization workspace, evidence-preserving scientific context, Knowledge Space, and a durable cognitive-state extension. The intended result is not a chatbot skin or visual animation. It is an owner-scoped software environment that can preserve work, plan bounded tasks, coordinate future specialized software workers, retain evidence distinctions, and truthfully disclose what it cannot yet execute.

## Architectural layers

| Layer | Current implementation | Status |
|---|---|---|
| Brain Workspace | Existing 3D HRA Brain-Female v1.1 viewer, Navigator, Inspector, panels, scale tools, and Macro simulation. | **COMPLETE** for released functionality. |
| Scientific safety | Checksum-pinned HRA asset, preserved providers/provenance/licensing, P32 Julich conclusion, P33 transform quality gate. | **COMPLETE** with `NOT_ESTABLISHED`/unmapped boundaries retained. |
| Knowledge Space | Owner-scoped objects, folders, placements, references, relationships, search, graph, object versions, immutable audit, initial missions/activity/approvals. | **COMPLETE** for released foundation. |
| Cognitive persistence | 16 additive Supabase tables for self, memory, plans, workers, tools, attention, recovery, history, and disabled schedules. | **COMPLETE** and read-only verified. |
| Cognitive API | Owner-gated snapshot, context, self, memory, project, goal, plan, mission, maintenance, archive, and rollback procedures. | **IN_PROGRESS** pending release validation. |
| Cognitive Console | Additive Knowledge Space tab for real persisted status, planning, memory, lifecycle controls, attention, and runtime disclosure. | **IN_PROGRESS** pending release validation. |
| Controlled tools | Named, read-only Knowledge Space search and in-process scientific registry access, with role permission checks and audit traces. | **IN_PROGRESS**; callable only from a future durable worker execution. |
| Durable worker runtime | Provider-neutral fail-closed adapter, persisted waiting/recovery state, real-run-ID requirement. | **BLOCKED** pending actual Vercel runtime configuration and build-compatible integration. |
| External research/provider operations | No external browser, provider API, document-ingestion, publishing, messaging, purchase, or account-operation tool is registered. | **UNAVAILABLE** by design. |

## Data and request path

1. The owner unlocks Knowledge Space using the existing administrator password. The server verifies it and issues a distinct HTTP-only knowledge-owner session.
2. The browser calls an owner-gated cognitive API. It does not receive Supabase credentials or direct database permissions.
3. The server resolves the fixed owner scope and applies workspace filtering to every cognitive query or write.
4. Supabase stores durable records with RLS enabled. Cognitive versions and audit events preserve history; the audit table has a database immutability trigger.
5. A planning request produces a project, goal, mission, dependency graph, workers, and limits. A dispatch request reaches a provider-neutral runtime adapter.
6. Until a real provider accepts the request and returns a durable run identifier, the adapter persists `WAITING_FOR_RUNTIME`; no server request or browser loop executes a worker.
7. When an approved runtime is configured in the future, it may invoke a discrete worker step. The step uses only declared role permissions, named controlled tools, bounded context, and explicit output classification.

## Evidence, spatial, and biological safety model

The cognitive layer never supersedes the scientific layer. Scientific registry records are read-only context for the current tool adapter. The P33 quality gate blocks unestablished transforms between Luna-native/raw HRA GLB space and MNI ICBM 152 2009c. The Julich outcome remains 0 authoritative / 0 probabilistic / 0 requires-domain-review / 102 unmapped. No code path treats model output, confidence, task completion, object linkage, or a visual brain selection as a coordinate transformation or clinical conclusion.

Luna’s worker terminology is technical software terminology. Existing Macro visual nanobots remain simulations. Neither software workers nor simulation visuals represent physical nanotechnology, treatment, cell/tissue/molecular action, clinical targeting, or biological operation.

## Runtime activation prerequisite

The durable runtime deliberately remains `UNAVAILABLE`. The linked Vercel project was observed on Hobby with an unconfigured Workflows screen; the repository has no Workflow SDK/Queue client/workflow source/topic/consumer/trigger/runtime run identifier. The current custom Vite + Express/esbuild packaging is not a drop-in match for the Nitro-oriented official integration guides. [1] [2] Workflows and Queues can supply durable steps, queue semantics, retries, and idempotent delivery after an authorized, compatible configuration, but that configuration must be verified rather than assumed. [3] [4]

The exact activation decision needed is: confirm actual Vercel Workflows/Queues availability for the linked project and authorize a documented build-compatible integration, or select an alternative durable runtime. Vercel Hobby Cron cannot replace a responsive queue because its schedule frequency and precision are limited. [5]

## Acceptance condition

The cognitive system is not considered a durable autonomous background service until all of the following occur: a real runtime is configured; a dispatch returns a durable run ID; a worker completes after an HTTP/browser disconnect; retries and cancellation are observed; interruption creates a resume or recovery record; tool/model limits are enforced; and each resulting Luna-owned change is retained with correct actor, evidence class, audit, and applicable version history.

## References

[1] [Workflow SDK — Express integration](https://workflow-sdk.dev/docs/getting-started/express)
[2] [Workflow SDK — Vite integration](https://workflow-sdk.dev/docs/getting-started/vite)
[3] [Vercel Workflows](https://vercel.com/docs/workflows)
[4] [Vercel Queues](https://vercel.com/docs/queues)
[5] [Vercel Cron Jobs usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
