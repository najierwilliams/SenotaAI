# Luna Phase 2 — Milestone 2 Acceptance Record

**Status: VERIFIED**

> Milestone 2 adds a first-class, owner-scoped Luna claim layer. It is a persisted cognitive organization feature, not a source of scientific authority, subjective consciousness, medical guidance, biological activity, or physical nanobot behavior.

## Scope and boundaries

This milestone added a provenance-aware claim layer without modifying released Knowledge Space, scientific/provider, mapping, coordinate, Vercel Queue, or nanobot tables and runtimes. The released Knowledge Space objects and relationships can be referenced as immutable source anchors; they are not copied, changed, or promoted by Luna claim records.

| Capability | Verified behavior | Boundary |
|---|---|---|
| Claims | Owner-scoped subject/predicate/object/statement records | Luna and user creation is limited to non-authoritative truth states. |
| Evidence anchors | Exactly one persisted memory, Knowledge Space object, or relationship per evidence record | Anchor ownership is checked in the same Luna workspace. |
| Revision | Claim changes increment `current_version` and write append-only revision snapshots | Revision history is immutable; a distinct `prior_claim_id` is reserved for future cross-claim supersession, never self-links a claim revision. |
| Inspection | Bounded persisted projection shows truth/lifecycle state, evidence role counts, anchors, and revisions | It does not select a winning source, infer scientific truth, or expose hidden reasoning. |
| Console | Owner-gated Luna Cognitive Console displays actual stored claim, evidence, and revision counts | No local/synthetic cognition fallback exists. |

The existing boundaries are unchanged: **P33 GLB↔MNI is NOT_ESTABLISHED with no coordinates; HRA↔Jülich is NOT_ESTABLISHED; Jülich remains 0 authoritative / 0 probabilistic / 0 domain-review / 102 unmapped.** Luna claims do not change these records. Nanobots remain software-only agents and visuals; this milestone performs no clinical, biological, cellular, molecular, subcellular, or physical activity.

## Additive persistence migration

Applied migration: `supabase/migrations/20260827_luna_claims_and_belief_revision.sql`.

The existing SenotaAI Supabase project records it as migration version **`20260827182157`**, named `luna_claims_and_belief_revision`.

| New table | Purpose | RLS | Foreign-key anchors | Indexes / triggers |
|---|---|---:|---|---|
| `luna_claims` | Current non-authoritative claim state | enabled | workspace, optional project and mission | 3 indexes; update timestamp trigger |
| `luna_claim_evidence` | One persisted source anchor and provenance per evidence record | enabled | workspace, claim, optional memory/object/relationship | 5 indexes |
| `luna_claim_revisions` | Append-only claim snapshots and revision reason | enabled | workspace, claim, optional prior distinct claim | 2 indexes; immutable update/delete trigger |

Read-only catalog verification returned all three tables with RLS enabled. It also confirmed the expected workspace, claim, memory, object, relationship, project, and mission foreign keys. A rollback-free trigger check against an actual persisted claim revision caught the expected delete rejection and then confirmed `matching_revision_count: 1`; no revision data was removed.

## Implementation and commits

| Commit | Purpose |
|---|---|
| `faf1cbc` | Added migration, canonical claim/evidence/revision contracts, owner-scoped persistence, owner-gated tRPC operations, pure claim inspection, focused tests, and console inspector. |
| `800c34a` | Corrected a production-discovered self-link attempt in revision persistence. Revisions now retain the same claim ID as their history subject while leaving `prior_claim_id` null unless a future cross-claim supersession is explicit. |

The production deployment of `faf1cbc` was `dpl_4ZPPexdXkKiXGAiH8CVB4pGSorTy`. The final corrective deployment was **`dpl_2nqhLE4XtTcrMse4VzDyM5X9ykvN`**, mapped to commit `800c34acb66ce6c01707f9501e3df3712ed3b988`, with `READY` status, production alias `senota-ai.vercel.app`, and region `iad1`.

## Validation

| Check | Result |
|---|---|
| Focused cognitive tests | **11/11 passed** across the existing cognition and Milestone 1 suites plus two Milestone 2 inspection tests. |
| `pnpm build` | Passed. |
| Independent `pnpm exec vite build` | Passed. |
| `git diff --check` | Passed before each source commit. |
| `pnpm check` | Only the pre-existing unrelated `TS2307` in `server/_core/imageGeneration.ts` for `server/storage`; no new Milestone 2 TypeScript errors. |
| `pnpm test` | 274 passed, 2 skipped, 14 failed. Failures remain environment/session-dependent pre-existing NPC/nanite/OAuth/GitHub tests; no Milestone 2 focused test failed. |

## Production acceptance evidence

All interactive verification used the existing owner session and the normal private `/api/trpc` routes. No public Queue endpoint, scientific/provider record, coordinate, research mission, or browser timer was created.

1. On the initial feature deployment, an explicitly non-scientific acceptance claim was created with truth state `INFERENCE`, confidence `0.5`, and lifecycle `ACTIVE` (**HTTP 200**). It was then linked to one existing owner-scoped Luna `RESEARCH` memory as a `CONTEXT` evidence anchor (**HTTP 200**).
2. The first revision attempt surfaced a database check violation because the implementation incorrectly tried to set `prior_claim_id` to the same claim ID. This was not concealed: the corrective commit `800c34a` was built, pushed, and deployed before acceptance continued.
3. On final deployment `dpl_2nqhLE4XtTcrMse4VzDyM5X9ykvN`, the revised non-scientific claim completed with **HTTP 200**, current version **3**, truth state **`INFERENCE`**, and lifecycle **`ACTIVE`**.
4. The owner-gated home readback completed with **HTTP 200** and showed exactly one persisted claim, one evidence anchor, and two append-only revision records. Its inspection reported `contextCount: 1`, `sourceAnchorCount: 1`, `contradictingCount: 0`, `latestRevisionKind: REVISED`, and remained `INFERENCE`.
5. The bounded activity readback returned `CLAIM_CREATED`, `CLAIM_EVIDENCE_LINKED`, and `CLAIM_REVISED` audit events. The rendered production console showed the same stored counts and explicit non-authority language.
6. Vercel runtime logs for the final deployment recorded `POST /api/trpc/knowledge.cognitive.claim.revise 200` at 18:34:49 UTC and `GET /api/trpc/knowledge.cognitive.home 200` at 18:34:57 UTC, both attributed to `dpl_2nqhLE4XtTcrMse4VzDyM5X9ykvN`.

## Known limitations and next milestone

Milestone 2 intentionally does not autonomously synthesize new scientific claims, choose among conflicting sources, alter claims in response to external research, or create temporal/relational Knowledge Space records. Those behaviors require later bounded attention, gap, priority, planner, controlled-research, and maintenance milestones. The current claim layer is inspectable, owner-gated, source-anchored, append-only in its revision history, and explicitly non-authoritative.

The next implementation milestone is **attention, knowledge-gap, curiosity, goal, and explainable priority**, built additively on this persisted claim layer and the existing Queue runtime.
