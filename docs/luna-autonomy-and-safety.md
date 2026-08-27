# Luna Autonomy and Safety

## Governing rule

Luna may make **routine, reversible, Luna-owned cognitive changes** without a per-change approval: create inferred working notes, retain classified memory, organize Luna-owned records, establish non-authoritative links, plan a task graph, reconcile a factual attention item, and record a recovery state. These changes must remain owner-scoped, versioned where the cognitive subject supports versions, audit-traced, and reversible where applicable.

Autonomy does not grant scientific, provider, spatial, clinical, biological, external-account, financial, publication, messaging, purchase, deletion, or source-mutation authority.

| Action category | Autonomy policy | Enforcement |
|---|---|---|
| Luna-owned working memory, notes, plans, organization, and inferred relationships | **Allowed** when bounded and auditable. | Low-authority truth states, owner workspace filters, version/audit records. |
| Exact duplicate consolidation of Luna-owned memory | **Allowed** and reversible. | Exact normalized match only; archive/link rather than delete; provider/published memory excluded. |
| Project, goal, task, worker, attention, recovery, and maintenance records | **Allowed** as persisted cognitive state. | Role contract, mission budget, dependency graph, explicit status. |
| Provider/source records, published evidence, scientific identities, reference-space links, transforms, and coordinate claims | **Blocked** unless established by an independent authorized evidence process. | Immutable snapshots, truth guards, P33 quality gate, source/provider boundary. |
| HRA GLB-to-MNI or HRA-to-Julich claim | **NOT_ESTABLISHED / UNAVAILABLE**. | Released P33 and P32 results remain immutable contextual constraints. |
| External research browsing or provider API calls | **Unavailable** in the current tool registry. | Only named in-process/read-only tools are registered. |
| Publishing, purchasing, messaging, account changes, deletion, or arbitrary command execution | **Blocked pending explicit user authorization and a separate controlled integration.** | No corresponding tool is registered. |
| Physical, medical, clinical, tissue, cellular, molecular, or nanotechnology action | **Unavailable.** | Workers are software-only and cannot create biological targets. |

## Truth-state safety

Automated Luna output is constrained to low-authority states: `INFERENCE`, `HYPOTHESIS`, `ASSUMPTION`, `UNKNOWN`, `PROPOSED`, `CONTRADICTED`, `UNMAPPED`, `NOT_ESTABLISHED`, `UNAVAILABLE`, and `PROVIDER_UNAVAILABLE`. The repository and owner API prohibit an automated promotion to `FACT`, `EVIDENCE`, `VALIDATED`, or `PROVIDER_CONFIRMED`.

A user may retain an observation in working memory, but the owner interface does not provide a shortcut for declaring it provider-confirmed or scientifically validated. This ensures that a model-generated report, confidence score, duplicate match, or plan completion cannot become evidence merely by automation.

## Record and rollback guarantees

The verified cognitive schema contains 16 new tables only; released Knowledge Space and scientific/provider tables were not replaced or modified. Self-state, memory, project, goal, task, mission, and worker records retain cognitive versions. Cognitive audit events are immutable by database trigger. Memory rollback creates a new later state from an earlier snapshot and records the rollback reason; it never rewrites prior history.

Tool activity is retained as an immutable audit trace with worker identity, mission linkage, tool class, and state transition. A controlled tool cannot be recorded unless its worker belongs to the mission and owner workspace and has that tool class in its declared contract.

## Runtime safety

The browser is a control and display surface only. The API refuses to treat a request handler or a client timer as a durable worker. Until a real background provider accepts a dispatch and returns a durable run identifier, the system persists `WAITING_FOR_RUNTIME`, displays the actual blocker, and does not show false progress, internal monologue, or completion.

The user may pause, cancel, reconcile, or request recovery through the owner-gated console. Those actions change persisted mission state and are audited; they do not simulate that a runtime has acted. The currently selected Workflow/Queue direction remains blocked until the project owner confirms actual service availability and authorizes a documented integration compatible with the existing build. [1] [2] [3]

## Security posture

Supabase service credentials remain server-only. Direct cognitive-table browser access is denied by enabled RLS and the absence of `anon`, `authenticated`, and `public` policies. The server validates the dedicated knowledge-owner session before querying the owner’s workspace. No secret, provider credential, session token, or internal reasoning trace is deliberately exposed in Luna prompts, UI, audit details, or worker reports.

## References

[1] [Vercel Workflows](https://vercel.com/docs/workflows)
[2] [Vercel Queues](https://vercel.com/docs/queues)
[3] [Vercel Cron Jobs usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
