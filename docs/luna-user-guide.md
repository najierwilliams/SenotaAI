# Luna Cognitive System User Guide

## Access

Open **Knowledge Space** and unlock it with the existing administrator password. The application creates a separate eight-hour knowledge-owner session after verification; it does not use or expose the NPC-management browser session. The Cognitive panel appears as an additive Knowledge Space view and leaves the released object tree, editor, graph, activity, and scientific safety displays intact.

If the console reports that cognitive storage is unavailable, do not assume a local fallback exists. The console intentionally reads and writes only durable server-backed records. After this release is deployed, refresh the unlocked page so it can read the verified Supabase cognitive tables.

## Current controls

| Control | Actual effect | Current boundary |
|---|---|---|
| Create durable task graph | Persists an objective, project, goal, mission, task dependencies, worker records, budgets, and audit history. | It does not begin background work without a configured durable runtime. |
| Save inferred working memory | Creates a classified, owner-scoped memory record. | The record is an inference, not scientific evidence or a provider claim. |
| Consolidate exact duplicates | Archives eligible exact Luna-owned duplicate memory and writes a reversible link. | Near matches, user memory, provider memory, and published evidence are not automatically merged. |
| Pause, resume, cancel | Persists mission lifecycle requests and audit events. | Resume remains waiting until an actual durable runtime accepts it. |
| Reconcile attention and recovery | Writes only blockers derived from persisted state and marks interrupted runtime-relevant work for recovery when appropriate. | It does not generate fake progress or run a hidden worker. |
| Disable/enable cognitive autonomy | Changes the persisted autonomous-routine setting. | It does not enable protected scientific, provider, external, biological, or runtime actions. |

## Reading mission state

A mission state describes actual persisted status. `WAITING_FOR_RUNTIME` means planning completed but no durable worker provider has accepted the mission. `RECOVERY_REQUIRED` means a persisted incomplete state needs an approved runtime resume or operator decision. `PAUSED`, `CANCELLED`, `LIMIT_REACHED`, and `FAILED` are similarly factual records, not simulated status badges.

> A status becomes `RUNNING` only after an actual durable runtime provider accepts dispatch and returns a real run identifier. This condition is **not currently established**.

## Working with memory and evidence

Use working memory for your own observations, assumptions, questions, and useful project context. Use Knowledge Space objects and source citations for provider and published evidence. Luna preserves the distinction:

| If you have… | Store or use it as… |
|---|---|
| A working idea or interpretation | An `INFERENCE`, `HYPOTHESIS`, or `ASSUMPTION` memory or note. |
| A research gap | A question or `NOT_ESTABLISHED` / `UNAVAILABLE` state. |
| A verified provider or published record | An immutable source-preserving Knowledge Space object; do not overwrite it with a Luna note. |
| A desired MNI/HRA/Julich claim | An open research question unless independent authoritative evidence is retained. Luna will not estimate a transform or coordinate. |

The released spatial and ontology conclusions remain in force: P33 HRA visual-GLB to MNI registration is `NOT_ESTABLISHED`; the HRA-to-Julich mapping remains unavailable; and the retained Julich result is 0 authoritative / 0 probabilistic / 0 requires-domain-review / 102 unmapped.

## What Luna cannot do today

Luna currently cannot run work after you close the browser, browse the web, query an external provider, upload/process arbitrary documents, send messages, make purchases, publish material, change external accounts, run arbitrary shell commands, create clinical conclusions, or operate physical/biological nanobots. The worker vocabulary refers to software workers only and remains separate from the visual Macro nanobot simulation.

The next technical activation step is to configure and validate a real durable workflow/queue runtime in the linked deployment environment. This requires the project owner to confirm service availability and authorize a build-compatible integration; it cannot be activated truthfully from the cognitive console alone. [1] [2]

## Recovering or reporting an issue

If a record appears incorrect, use the existing object/version/audit views to inspect its source and history. Luna-owned memory can be rolled back to an earlier retained version through the owner-gated memory rollback API. Provider and published source records are intentionally immutable. For a failed mission, preserve the recovery item, examine its audit activity and durable state, and do not mark it complete without a real runtime result.

## References

[1] [Vercel Workflows](https://vercel.com/docs/workflows)
[2] [Vercel Queues](https://vercel.com/docs/queues)
