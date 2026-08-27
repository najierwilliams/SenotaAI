# Luna Autonomous Software-Worker Architecture

## Definition

Within Luna, the term **nanobot** refers only to a bounded software worker that performs a discrete, persisted cognitive task. It does not describe physical nanotechnology, a medical device, tissue targeting, cellular work, molecular work, subcellular operation, or a biological intervention. The existing Macro nanobot system remains a visual simulation and does not become an execution control for Luna workers.

| System | What it is | What it is not |
|---|---|---|
| Luna worker | Persisted software agent assigned to a mission task with explicit role, scope, budget, and audit trail. | A physical device, biomedical system, external autonomous account, or source of scientific authority. |
| Macro nanobot feature | Existing visual/navigation simulation in the brain interface. | Evidence of worker completion, physical operation, medical guidance, or a biological target. |
| Knowledge Space note | Source-preserving object or explicitly inferred working report. | A provider record, validated transform, or clinical conclusion. |
| Durable runtime | Future background execution provider for discrete worker steps. | A browser tab, HTTP request, front-end timer, or currently configured capability. |

## Worker roles and least privilege

Every worker role has a declared purpose, permitted tool classes, and permitted outputs. The repository requires a persisted worker to be attached to the same owner workspace and mission before a tool-call trace can be created. The declared tool class is checked against the worker contract before the operation begins.

| Role examples | Permitted work | Explicit limits |
|---|---|---|
| Planner and review workers | Persist dependency graphs, identify gaps, create non-authoritative tasks and reports. | Cannot elevate scientific truth or run an external tool. |
| Scout, researcher, validator, provenance workers | Read permitted Knowledge Space context or reviewed registry metadata; record inferred reports and attention. | Cannot call an unregistered provider, alter source snapshots, or convert inference to evidence. |
| Organizer, linker, memory workers | Create reversible Luna-owned organization or exact-duplicate consolidation records. | Cannot delete source evidence or create a biological target. |
| Maintenance and reflection workers | Reconcile factual attention and record recovery/reflection data. | Cannot pretend a scheduler or runtime is active. |

All roles are constrained by the same global conditions: `mayElevateScientificTruth = false`, `mayModifyProviderSnapshot = false`, and `mayCreateBiologicalTarget = false`.

## Controlled-tool model

The current controlled-tool registry implements only named read-only operations. A bounded Knowledge Space retrieval tool searches owner-scoped objects. A scientific-registry tool reads reviewed in-process metadata already present in the application. Unknown tool names, shell execution, web browsing, external provider access, document ingestion, publishing, purchases, messages, account changes, and destructive actions are unavailable.

Each tool request and status transition writes an immutable cognitive audit event with mission, worker, actor, tool class, tool name, provider label where applicable, and trace status. Tool calls are not presented as autonomous research or background activity until a configured durable runtime invokes the worker step.

## Task graph and operational limits

A mission is planned as a persisted dependency graph. A task becomes eligible only when all prerequisite tasks complete. A failed, cancelled, blocked, or recovery-required prerequisite blocks dependent work. Each mission carries limits for worker count, steps, retries, duration, model requests, and estimated token budget. The worker executor checks the model-request and estimated-token budgets before execution and records a real limit condition instead of continuing.

> **No completion without execution evidence:** a planned worker or task is not a successful worker. Until an actual runtime accepts a dispatch, returns a run identifier, and persists a result, the mission is `WAITING_FOR_RUNTIME`.

## Recovery and cancellation

Pause and cancellation requests are persisted rather than inferred from the browser. A durable runtime, once configured, must honor those state changes and report its outcome. A recovery sweep records incomplete runtime-relevant missions as `RECOVERY_REQUIRED`; it does not run them in an API request or browser. This preserves truthful lifecycle records across browser closure, deployment interruption, and later operator review.

## Current runtime status

The Vercel Workflow/Queue direction remains **BLOCKED**, not unavailable in principle but unconfigured in the linked project. The current application uses a custom Vite and Express/esbuild build path, while the documented Workflow SDK guides require deliberate Nitro-oriented integration. No workflow source, queue/topic, consumer, approved adapter, or durable run identifier has been established. [1] [2] [3] [4]

The next permissible activation step is a project-owner decision on actual durable runtime entitlement and a documented build-compatible integration. Only after that setup is complete can a worker execute outside an interactive request, and only after the specified acceptance tests return a real run identifier can the interface say `CONFIGURED`.

## References

[1] [Workflow SDK — Express integration](https://workflow-sdk.dev/docs/getting-started/express)
[2] [Workflow SDK — Vite integration](https://workflow-sdk.dev/docs/getting-started/vite)
[3] [Vercel Workflows](https://vercel.com/docs/workflows)
[4] [Vercel Queues](https://vercel.com/docs/queues)
