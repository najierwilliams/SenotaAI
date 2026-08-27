# Luna Phase 2 — Milestone 3 Acceptance Record

**Status: VERIFIED**

> Milestone 3 adds persistent knowledge-gap, curiosity, and explainable-priority records. It does not autonomously authorize work, create scientific facts, select scientific truth, dispatch research, or perform any biological, medical, physical, or nanobot action.

## Scope and controls

This is a strictly additive continuation of the verified owner-scoped Luna cognitive store. It does not modify released Knowledge Space, scientific/provider, mapping, coordinate, Queue, or nanobot schemas. All persisted records are scoped to the existing knowledge workspace, accessed only through the established owner-gated server route, and represented in the browser only after a server readback.

| Capability | Persisted behavior | Control / boundary |
|---|---|---|
| Knowledge gaps | A question, requested evidence, rationale, severity, provenance, optional claim/project/object anchor, and current version | A gap is not a scientific conclusion and does not issue research work. |
| Gap revisions | Immutable created/updated/resolved/dismissed snapshot history | The immutable trigger prevents update or deletion. |
| Curiosity candidates | Explicit proposed bounded follow-up with estimate and status | A proposal does not dispatch, browse, call a provider, or authorize external action. |
| Priority assessments | Declared urgency, impact, evidence-readiness, unblock value, risk, computed score, assumptions, and concise explanation | The score is deterministic and risk-reducing; it does not grant permission for action. |
| Console | Read-only persisted review queue and factor display | No local fallback or synthetic activity is shown. |

The scientific and operational safeguards remain unchanged: **P33 GLB↔MNI is NOT_ESTABLISHED with no coordinates; HRA↔Jülich is NOT_ESTABLISHED; Jülich remains 0 authoritative / 0 probabilistic / 0 domain-review / 102 unmapped.** Luna cannot elevate a priority, gap, claim, or source anchor to provider-confirmed, validated, evidence, or factual scientific authority. Nanobots remain software-only workers and visualization assets.

## Additive migration and persistence verification

Applied migration: `supabase/migrations/20260827_luna_attention_gaps_and_priorities.sql`.

| New table | Purpose | RLS | Indexes | Trigger |
|---|---|---:|---:|---|
| `luna_knowledge_gaps` | Current gap state | enabled | 3 | timestamp update |
| `luna_knowledge_gap_revisions` | Append-only gap history | enabled | 2 | immutable update/delete |
| `luna_curiosity_candidates` | Explicit bounded follow-up proposals | enabled | 2 | none required; records are append-only in this milestone |
| `luna_priority_assessments` | Immutable declared-factor priority results | enabled | 3 | immutable update/delete |

Read-only catalog verification returned all four tables with RLS enabled. Existing-workspace foreign keys connect gaps only to the optional Luna project/claim and released Knowledge Space object anchors; gap revisions and curiosity candidates require an existing owner-scoped gap. Priority target ownership is checked by the server against the corresponding workspace table before persistence.

A rollback-free immutable-history check against an actual persisted gap revision returned `immutable_gap_revision_delete_rejected` and then `matching_revision_count: 1`. The record remains intact.

## Transparent priority policy

The priority score is computed in `server/luna/milestone3.ts`, not accepted as a client-supplied opaque rank:

```text
0.28 × urgency + 0.27 × impact + 0.20 × evidence readiness
+ 0.20 × unblock value + 0.05 × (1 − risk)
```

The concise stored explanation reports each declared factor and states that the ranking does not authorize external, destructive, financial, account, private-data, medical, biological, or physical action. This is an inspectable policy summary, not hidden reasoning or an action planner.

## Commit, deployment, and validation

Feature commit: **`cebd883`** — `feat(luna): add attention gaps and priorities`.

Production deployment: **`dpl_FMy7HgVRqVeZz9H14oyuEgbGPm26`**, source commit `cebd8838d0cc019693a328d29f2f9a0347d1f449`, `READY`, production alias `senota-ai.vercel.app`, region `iad1`.

| Check | Result |
|---|---|
| Focused cognitive tests | **13/13 passed**: cognition, Milestone 1, Milestone 2, and two Milestone 3 policy/inspection tests. |
| `pnpm build` | Passed. |
| Independent `pnpm exec vite build` | Passed. |
| `git diff --check` | Passed before the feature commit. |
| `pnpm check` | Only the pre-existing unrelated `TS2307` for `server/storage` imported by `server/_core/imageGeneration.ts`; no new Milestone 3 TypeScript error. |
| Full `pnpm test` | 276 passed, 2 skipped, 14 failed. The failures are unchanged environment/session-dependent NPC/nanite/OAuth/GitHub tests; Milestone 3 focused coverage passed. |

## Production acceptance evidence

All lifecycle writes used the existing owner session and normal private `/api/trpc` routes. No Queue mission, provider call, external research request, scientific mapping, coordinate, clinical action, or nanobot action was initiated.

1. A bounded non-scientific acceptance gap linked to the existing `INFERENCE` claim was created with `WARNING` severity and `OPEN` status (**HTTP 200**).
2. One `LOW`-cost `PROPOSED` curiosity candidate was attached to that gap (**HTTP 200**). Its action is an internal review proposal, not a dispatch or authorization.
3. A priority assessment was created for the gap using declared factors: urgency `0.40`, impact `0.30`, evidence readiness `0.50`, unblock value `0.20`, and risk `0.10`. The server computed and persisted priority **`0.378`** with the explicit factor explanation (**HTTP 200**).
4. The owner-gated home readback returned **HTTP 200**, `openGapCount: 1`, `proposedCuriosityCount: 1`, policy `declared-factor-priority-with-risk-reduction`, and the same persisted factor values and score.
5. The rendered console displayed the one open gap, one proposed bounded follow-up, `GAP 0.378`, all factors, and the statement that the ranking does not authorize action.
6. Exact deployment runtime logs recorded `POST /api/trpc/knowledge.cognitive.attention.gap.create 200`, `...curiosity.create 200`, `...priority.assess 200`, and `GET /api/trpc/knowledge.cognitive.home 200`, all attributed to `dpl_FMy7HgVRqVeZz9H14oyuEgbGPm26`.

## Known limits and next milestone

Milestone 3 deliberately does not self-dispatch curiosity candidates, automatically change goal or task priorities, resolve gaps, or make external changes. Those behavior extensions require the next bounded planner/worker/reflection/learning milestone and must retain Queue budgets, owner controls, idempotency, and stopping conditions.
