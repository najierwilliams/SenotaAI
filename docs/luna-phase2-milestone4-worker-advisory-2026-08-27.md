# Luna Phase 2 — Milestone 4 Acceptance Record

**Status: VERIFIED — bounded advisory increment**

> This increment adds inspectable worker-selection advice from persisted Luna state. It does **not** replace or alter the proven deterministic eight-worker DAG, enqueue a worker, invoke a provider, authorize research, or make an external, scientific, biological, medical, physical, or nanobot action.

## What changed

The new pure projection `server/luna/milestone4.ts` examines only persisted claims, knowledge gaps, and memories. It may recommend one of the already registered `REVIEW_AGENT`, `PROVENANCE_AGENT`, or `MAINTENANCE_AGENT` roles when the owner-visible state warrants review. Every advisory item has `dispatchAuthorized: false`.

| Persisted signal | Advice | Explicit limit |
|---|---|---|
| Open gap or review-required claim | `REVIEW_AGENT` | A recommendation only; no task or worker is created. |
| `PROVIDER_UNAVAILABLE` memory | `PROVENANCE_AGENT` | No retry or provider request is made. |
| Action-required gap | `MAINTENANCE_AGENT` | No autonomous maintenance run is started. |

The existing cognitive-home response exposes this advice. The owner console displays the role labels and explains that the advice is non-dispatching and that the verified deterministic Queue graph and owner controls remain unchanged.

## Validation and deployment

Feature commit: **`cdb157f`** — `feat(luna): advise bounded worker selection`.

Production deployment: **`dpl_48UJe9wrJZomH7HHjciYSGxuaz2J`**, source commit `cdb157ff61200e1a7cad4f71d5c58774b9ebd8ae`, `READY`, production alias `senota-ai.vercel.app`, region `iad1`.

| Check | Result |
|---|---|
| Focused tests | **15/15 passed**, including the two new bounded-advisory tests and all prior Luna milestone/cognition tests. |
| `pnpm build` | Passed. |
| Independent `pnpm exec vite build` | Passed. |
| `git diff --check` | Passed before commit. |
| `pnpm check` | Only the unchanged baseline `TS2307` for `server/storage` imported by `server/_core/imageGeneration.ts`; no Milestone 4 TypeScript error. |
| Full `pnpm test` | 278 passed, 2 skipped, 14 failed. The failures remain environment/session-dependent NPC/nanite/OAuth/GitHub tests; no Luna advisory test failed. |

## Production verification

The owner-gated `knowledge.cognitive.home` endpoint returned **HTTP 200** on the exact deployment and returned one persisted-state recommendation:

| Role | Persisted reason counts | Dispatch authorization |
|---|---:|---:|
| `REVIEW_AGENT` | 1 open gap; 0 review-required claims | `false` |

The response explained that the open persisted gap should be reviewed before any follow-up is considered. No worker record, task, mission, queue message, tool call, provider request, or external action was created for this verification. Exact Vercel runtime logs record `GET /api/trpc/knowledge.cognitive.home 200` at 18:54:50 UTC for `dpl_48UJe9wrJZomH7HHjciYSGxuaz2J`.

## Unchanged safeguards and remaining work

The scientific boundaries remain separate: P33 GLB↔MNI and HRA↔Jülich remain **NOT_ESTABLISHED**, no coordinates were emitted, and Jülich remains 0 authoritative / 0 probabilistic / 0 domain-review / 102 unmapped. Luna’s recommendations cannot elevate claims to factual, evidence, validated, or provider-confirmed scientific authority. Nanobots remain software-only.

A later worker-orchestration increment may consume these recommendations only through the current owner-gated mission planner, existing durable Queue, resource budgets, idempotency, cancellation checks, and a new production acceptance run. This completed increment does not make that future behavior claim.
