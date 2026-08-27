# Luna Cognitive Architecture

## Purpose and current status

Luna is being extended from a Knowledge Space interface into an **owner-scoped, evidence-preserving software intelligence environment**. The architecture persists cognitive state, working memory, projects, goals, dependency-aware tasks, mission records, worker activity, attention, recovery, and append-only audit events. It does not reclassify a working inference as scientific evidence, alter provider records, construct anatomical coordinate transforms, or operate any physical or biological system.

> **Verified persistence milestone:** the additive `20260827_luna_cognitive_architecture.sql` migration was applied in the existing SenotaAI Supabase project. The read-only verification returned `verification_passed = true`: 16/16 expected cognitive tables, RLS enabled on every table, no direct browser-role policy, the root-task foreign key, 13/13 expected indexes, 9/9 update triggers, and the immutable audit trigger/function were present.

| Capability | Status | Meaning |
|---|---|---|
| Owner-scoped cognitive persistence | **COMPLETE** | The 16 additive `luna_*` cognitive tables are live and verified. |
| Cognitive API and console implementation | **IN_PROGRESS** | The owner-gated API and additive console are implemented locally and await application release validation. |
| Bounded memory retrieval | **COMPLETE** | Memory retrieval is source/truth-labelled, bounded, and does not place a whole workspace into a model prompt. |
| Controlled tool boundary | **IN_PROGRESS** | Only named, read-only Knowledge Space and in-process registry access are implemented; they execute only from a durable worker step. |
| Durable unattended worker execution | **BLOCKED** | No configured runtime has returned a real durable run ID. |
| HRA visual GLB to MNI transform | **NOT_ESTABLISHED** | P33 remains locked; no Luna-native or raw-GLB transform is emitted. |
| HRA to Julich ontology mapping | **UNAVAILABLE** | The released result remains 0 authoritative / 0 probabilistic / 0 requires-domain-review / 102 unmapped. |
| Physical or biological nanobots | **UNAVAILABLE** | Luna workers are software agents only. |

## Authority, identity, and access model

The system has a single owner scope, `senota-user-1`, established through the existing administrator-password verification flow. A successful unlock produces a distinct, HTTP-only knowledge-owner session; it is not the NPC session and does not expose Supabase credentials to a browser. The browser receives only owner-gated API responses. Supabase is accessed by the existing server-only service role after that session check, while RLS is enabled and no `anon`, `authenticated`, or `public` direct-table policy exists for the cognitive tables.

| Layer | Responsibility | Prohibited behavior |
|---|---|---|
| Browser console | Displays persisted facts and invokes owner-approved UI controls. | It is never an execution engine, timer loop, secret store, or background worker. |
| Owner-gated API | Validates input, truth-state restrictions, and owner session. | It does not accept direct scientific elevation or arbitrary tool execution. |
| Cognitive repository | Applies owner workspace filters, writes memory/state/task versions, and records immutable audit events. | It does not use a browser credential, unscoped database write, or hidden mutation. |
| Supabase | Stores durable cognitive state and enforcement metadata. | It does not contain a client-side secret or a public direct-table policy. |
| Durable runtime adapter | Receives idempotent mission dispatches and reports a real provider run ID. | Until configured, it returns unavailable and causes a persisted waiting state. |

## Durable cognitive record model

The cognitive model extends rather than duplicates Knowledge Space. Knowledge objects remain the source-preserving document and relationship layer; Luna memory stores concise, classified working records linked to those objects. Projects, goals, missions, tasks, workers, and attention records describe work state. Cognitive versions preserve state, memory, project, goal, task, mission, and worker snapshots. Tool calls use immutable audit traces for each request and transition; the verified schema intentionally does not treat tool trace rows as versioned cognitive subjects.

| Record family | Tables | Safety property |
|---|---|---|
| Self and memory | `luna_cognitive_state`, `luna_memories`, `luna_memory_links` | Memory has source/truth labels and Luna-owned memory rollback. Provider/published memory cannot be modified by automated Luna paths. |
| Goals and work graph | `luna_projects`, `luna_goals`, `luna_missions`, `luna_tasks`, `luna_task_dependencies` | Task eligibility is derived from persisted dependencies; failed or cancelled prerequisites block dependent tasks. |
| Worker and tool activity | `luna_workers`, `luna_tool_calls` | Every controlled tool call requires a persisted worker in the same mission and is checked against that worker role’s permitted tool classes. |
| Attention and recovery | `luna_attention_items`, `luna_reflections`, `luna_recovery_records`, `luna_maintenance_schedules` | Open blockers are real persisted conditions. Schedule rows remain disabled until a verified runtime exists. |
| History | `luna_cognitive_versions`, `luna_cognitive_audit_events` | Audit events are immutable by trigger. Routine cognitive state changes retain actor, reason, subject, and linked mission where applicable. |

## Evidence and scientific boundaries

Luna has explicit truth states including `INFERENCE`, `HYPOTHESIS`, `ASSUMPTION`, `UNKNOWN`, `PROPOSED`, `CONTRADICTED`, `UNMAPPED`, `NOT_ESTABLISHED`, and `UNAVAILABLE`. Automated Luna-owned output is confined to those states. It cannot create `FACT`, `EVIDENCE`, `VALIDATED`, or `PROVIDER_CONFIRMED` truth. Provider and published memories cannot be edited by Luna automation, and immutable Knowledge Space provider snapshots remain protected by their existing guard.

The P33 quality gate remains an operational safety boundary, not a display preference. The released exact HRA Brain-Female v1.1 visual asset does not establish a Luna/HRA GLB-to-MNI ICBM 152 2009c transform. The in-process scientific registry tool returns this constraint and the released Julich mapping result in context; it never calculates or emits a coordinate. It also never represents research workers as physical nanobots, clinical systems, biological targets, tissue/cellular/molecular operations, or medical advice.

## Controlled tools and bounded context

The currently implemented tool registry contains two named, read-only operations. `retrieve_knowledge_space` performs bounded search within the owner-scoped Knowledge Space. `read_scientific_registry` reads only the reviewed in-process registry already shipped with the application. Neither operation performs web browsing, external provider access, file ingestion, shell commands, publishing, purchases, messaging, account changes, source replacement, or coordinate transformation.

Every tool call is persisted before use and is permitted only when the assigned worker’s role contract includes the tool class. Unregistered tool names are rejected. Every generated report receives only bounded cognitive memory plus at most eight matching Knowledge Space objects. Model-use figures, if a provider is later configured, are explicitly labelled **estimated payload tokens** and are not billed-token telemetry.

## Durable runtime boundary

The chosen direction is a durable queue/workflow provider, but it is not configured in the linked Vercel project. The current Vite plus custom Express/esbuild application does not match the documented Workflow SDK’s Nitro-based Express or Vite integrations, and the linked project has no established queue/topic/consumer, runtime adapter, workflow source, or observed durable run ID. Workflows and Queues are designed to provide durable, resumable execution and queue semantics, but those capabilities must be configured and accepted in the actual project rather than inferred. [1] [2] [3] [4]

> Until a provider accepts a dispatch and returns a durable run ID, a planned mission is persisted as `WAITING_FOR_RUNTIME`. It is not displayed as running, completed, autonomous, or browser-independent.

The next runtime activation action is for the project owner to confirm available Vercel Workflows/Queues entitlement and authorize a documented integration compatible with the current build system, or to select an alternative durable service. Vercel’s Hobby Cron frequency and timing guarantees cannot substitute for a responsive multi-worker queue. [5]

## Verification evidence

The verified migration outcome is retained in `docs/.luna-cognitive-migration-execution-log.md`. The current read-only verifier is `supabase/verify_luna_cognitive_architecture.sql`. The local focused test suite covers deterministic cognitive planning, dependency blocking, source-aware retrieval, fail-closed runtime behavior, declared-tool authorization, arbitrary-tool rejection, and the preserved P33/Julich boundaries. The production client and server build completes; the repository’s unrelated TypeScript baseline still reports the known unresolved `server/_core/imageGeneration.ts` import of `server/storage`.

## References

[1] [Workflow SDK — Express integration](https://workflow-sdk.dev/docs/getting-started/express)
[2] [Workflow SDK — Vite integration](https://workflow-sdk.dev/docs/getting-started/vite)
[3] [Vercel Workflows](https://vercel.com/docs/workflows)
[4] [Vercel Queues](https://vercel.com/docs/queues)
[5] [Vercel Cron Jobs usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
