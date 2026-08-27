# Luna Durable Runtime Activation

## Status

> **BLOCKED — external runtime activation is not yet established.** The connected Vercel team, **SENOTA's projects**, is on the **Hobby** plan. The project Workflows page is available but shows the unconfigured **Get Started with Workflows** state. The repository has no installed Workflow SDK, Queue client, workflow source, queue topic, queue consumer, `vercel.json` trigger configuration, or durable-run identifier. Consequently, there is no evidence that a Luna mission can currently execute after the originating browser or request closes.

This record is intentionally narrow. It does not weaken the released P33 conclusion: the HRA GLB → MNI ICBM 152 2009c bridge remains `NOT_ESTABLISHED`, the Julich structure result remains 0 authoritative / 0 probabilistic / 0 requires-domain-review / 102 unmapped, and software workers do not imply physical or biological nanobots.

## Selected architecture

The selected target is a **provider-agnostic durable-runtime boundary**. Luna persists every mission, task, worker, activity event, tool trace, retry count, cancellation request, recovery requirement, and rollback-capable Luna-owned knowledge change in Supabase. A runtime adapter then receives only an idempotent mission-dispatch request. The cognitive model, retrieval, worker contracts, permissions, evidence states, and persistence do not depend on one vendor.

| Component | Implemented repository responsibility | Runtime responsibility |
|---|---|---|
| Cognitive core | Create owner-scoped goals, task graphs, attention, memory, plans, and bounded mission budgets. | None. |
| Orchestrator | Select eligible tasks, enforce dependencies and worker contracts, persist handoffs and audit events, and fail closed if no runtime exists. | Dispatch durable work steps and return the run identifier. |
| Supabase | Persist durable mission state, state transitions, activity, tool traces, versions, and recovery records. | None. |
| Workflow/queue runtime | Receive an idempotent dispatch, run discrete time-bounded worker steps, retry transient errors, resume after pauses/deployment changes, and report completion/failure. | **Required before unattended work can be claimed.** |
| Browser | Display persisted state and invoke owner controls only. | Never acts as the worker runtime. |

## Exact verified prerequisites

The project is a Vite 7 application with a custom Express server bundled by esbuild. The current build is not one of the documented Workflow SDK integrations. The official Express guide requires `workflow`, `nitro`, and `rollup`, a Nitro build configuration with the `workflow/nitro` module, a workflow function marked with `"use workflow"`, isolated functions marked with `"use step"`, and server-side `start()` invocation. The official Vite guide similarly requires `workflow`, `nitro`, the `workflow/vite` plugin, and a Nitro API server. Those requirements cannot be treated as a drop-in import to the current custom Vite/Express build. [1] [2]

Vercel states that Workflows provides durable, resumable, observable steps with platform-managed state and queue dispatch; its Queues documentation describes durable topics, consumer groups, automatic retries, idempotency, and queue triggers. The linked project currently has none configured. [3] [4]

| Required action | Why it is required | Who can perform it |
|---|---|---|
| Enable or confirm Vercel Workflows entitlement for `senota-ai` in the Vercel project. | The dashboard shows setup, not configured runtime runs. | Project owner in Vercel. |
| Confirm whether Vercel Queues is available for the Hobby team and, if so, create the approved queue/topic and consumer configuration. | Queue availability/configuration is not exposed by the connected project-management interface and cannot be inferred. | Project owner in Vercel. |
| Authorize the build-integration migration or provide a documented existing Vite/Express-compatible workflow adapter. | The official integrations use Nitro, while the current application uses a custom Express/esbuild server. | Project owner after reviewing the migration impact. |
| Set only documented runtime configuration created by the selected service. | No credentials, queue names, endpoint URLs, or secrets may be invented. | Project owner through the secure provider dashboard. |
| Keep `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` server-only. | Supabase remains the system of record for Luna state and must not expose privileged access to the browser. | Existing production configuration already provides these for the released Knowledge Space. |

The current Hobby plan also restricts Vercel Cron jobs to no more than once daily, with timing precision up to one hour. Cron therefore cannot substitute for the requested responsive durable multi-worker queue; at most it can later invoke a bounded daily recovery/maintenance dispatch. [5]

## Fail-closed behavior until activation

The repository will implement durable mission data, worker/task contracts, recovery state, idempotency, budgets, controlled tool interfaces, and a provider-neutral runtime adapter. The default adapter returns `UNAVAILABLE`, creates a factual `WAITING_FOR_RUNTIME` / attention record, and never runs long work inside a request handler. No timer, browser loop, fake progress bar, fabricated run identifier, or claimed unattended execution is permitted.

Once a real runtime is enabled, the adapter must be configured with the provider-specific client and must pass these acceptance checks before `CONFIGURED` is reported: dispatch returns a durable run ID; a worker step survives an HTTP disconnect; retries are observable; cancellation reaches the run; a deployment interruption leads to resume or `RECOVERY_REQUIRED`; rate and token budgets are enforced; and every resulting Luna-owned update has a persisted version and audit entry.

## References

[1] [Workflow SDK — Express integration](https://workflow-sdk.dev/docs/getting-started/express)
[2] [Workflow SDK — Vite integration](https://workflow-sdk.dev/docs/getting-started/vite)
[3] [Vercel Workflows](https://vercel.com/docs/workflows)
[4] [Vercel Queues](https://vercel.com/docs/queues)
[5] [Vercel Cron Jobs usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)
