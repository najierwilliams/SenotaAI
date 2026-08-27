# Luna Milestone 5 User-Facing Autonomous Cognitive-Action Acceptance

**Status:** Completed on 2026-08-27. This record covers one owner-approved, non-scientific production acceptance run performed through the deployed user interface and the existing Milestone 5 runtime. It did not alter provider configuration, scientific records, coordinate mappings, autonomy flags, action budgets, queue configuration, worker selection, or safety policies.

## Purpose and scope

The goal was to demonstrate, with a user-facing condition rather than a direct database seed, that the existing owner-scoped Milestone 5 action loop can identify one eligible persisted condition, make a deterministic governed decision, dispatch one bounded mission only through Vercel Queue, validate worker outputs before learning, retain audit/reflection state, suppress duplicates, and then retire the temporary source condition.

The test condition was explicitly restricted to an internal software handoff. It carried no external-source request, scientific or provider assertion, HRA/MNI/Julich mapping, coordinate, clinical/biological/physical operation, financial/account action, destructive action, or custom worker instruction.

## Authorized supporting UI addition

The production test needed one small owner-only UI surface because the existing application had audited APIs to create a gap and priority assessment but did not expose a user-facing way to create or retire a temporary condition. Commit `eae770a1389ab623d95b1a341815918d0cb3d263` added only the following adapters over existing lifecycle behavior.

| Area | Change | Safety property |
|---|---|---|
| `LunaCognitiveConsole` | A fixed **Create temporary condition** control creates an owner-scoped internal-software gap and submits ordinary declared priority factors. | The UI does not accept a free-form objective, worker role, scientific metadata, provider selection, or external tool request. The existing policy alone determines eligibility. |
| Owner router | `knowledge.cognitive.attention.gap.dismissTemporaryAcceptance` exposes the existing `updateLunaKnowledgeGap(... DISMISSED)` lifecycle. | It is owner-session-gated and refuses every gap except one carrying the persisted `MILESTONE_5_USER_ACCEPTANCE_TEST` provenance marker. |
| Tests | Router tests cover unauthenticated rejection, arbitrary-command rejection, positive temporary-condition dismissal, and rejection of ordinary/scientific records. | No general deletion or direct database path was introduced. |

Focused owner-router and Milestone 5 tests passed: **16 tests across 3 test files**. Both the standalone Vite production build and full project production build passed. `pnpm check` continued to report only the pre-existing unresolved `server/storage` import in `server/_core/imageGeneration.ts`.

## Production environment and preconditions

| Item | Evidence |
|---|---|
| Production deployment | `dpl_22EbT2dscUn5V7NNhP91XQWosAUT` |
| Deployment URL | `https://senota-29eo4z9d8-senota-s-projects.vercel.app/` |
| Source revision | `eae770a1389ab623d95b1a341815918d0cb3d263` |
| Owner session | The single-owner Knowledge Space session was unlocked before any test record was created. |
| Action controls | Existing `autonomyEnabled` and `cognitiveActionsEnabled` were already enabled. They were read but not changed. |
| Runtime | The console reported `vercel-queues / CONFIGURED`; the private consumer required a provider-issued queue message ID. |
| Initial candidate state | `ENABLED / NO ACTION`; no eligible open gap existed before the temporary condition was created. |

## User-facing temporary condition

The owner UI persisted one temporary condition through `knowledge.cognitive.attention.gap.create`, then persisted its ordinary declared priority through `knowledge.cognitive.attention.priority.assess`.

| Field | Value |
|---|---|
| Temporary gap ID | `d7f6e50d-423c-43c5-9437-8f0a4e3a65c1` |
| Initial gap status | `OPEN` |
| Declared priority | `0.905` |
| Policy selection | `luna-m5-v1`, `KNOWLEDGE_GAP` |
| Objective | Resolve a bounded internal-context handoff for the labelled temporary non-scientific condition. |
| Guarded scope | Persisted internal context only; no external retrieval, provider/scientific claim, coordinate, clinical/biological/physical, financial/account, or destructive action. |

The live console showed the condition as the deterministic candidate. The owner-selected **Assess & dispatch one bounded action** operation then invoked the existing action service; it did not select workers or call the Queue consumer directly.

## Durable execution evidence

The Queue runtime accepted the mission and production logs recorded successful `gap.create`, `priority.assess`, and `action.assessAndDispatch` calls, followed by successful private `/api/luna/queue-consumer` callbacks.

| Field | Verified value |
|---|---|
| Decision ID | `633f26d8-ef33-4dcf-b72a-bce298fb7208` |
| Decision terminal state | `COMPLETED / NO_ACTION` |
| Mission ID | `36326476-6517-4300-bfef-be0e8750f9d0` |
| Mission terminal state | `COMPLETED` |
| Mission origin | `AUTONOMOUS` |
| Provider Queue run ID | `1D-1M1Z1OiGXbKZ4Rln1LOoukLdv1wpJlOE` |
| Fixed resource bounds | `4` workers, `24` steps, `2` retries, `900` seconds, `12` model requests, `24,000` tokens |
| Tasks | `COMPLETED: 8` |
| Workers | `COMPLETED: 8` |
| Result validations | `ACCEPTED: 2`, `NEEDS_REVIEW: 6` |
| Terminal focus | `All dependency-eligible durable worker tasks completed` |
| Mission error | None |

The audit stream recorded one `MISSION_QUEUE_DELIVERED`, eight `WORKER_QUEUE_ACCEPTED`, eight `WORKER_QUEUE_DELIVERED`, and one `MISSION_COMPLETED` event. The completed mission generated a reflection, preserved report/validation records, and admitted only the permitted Luna inference memory. The source gap moved conservatively to `WATCHING`; it was not marked resolved or treated as scientific evidence.

## Persistence and duplicate prevention

After refresh, the production console retained the completed decision and mission. A constrained owner reassessment returned **“No persisted eligible high-priority knowledge-gap candidate is available.”** It produced no new candidate, decision, or mission. The action policy therefore prevented a duplicate/infinite follow-up after the completed source condition.

## Cleanup outcome

After completion and reassessment, the user invoked the guarded **Dismiss temporary condition** control. The control applied only to the temporary gap and used the existing audited gap lifecycle.

| Cleanup check | Outcome |
|---|---|
| Temporary active condition visible | No; the UI reverted to **Create temporary condition**. |
| Temporary source condition lifecycle | `DISMISSED` through the existing gap update path. |
| Open-gap count | Returned from `3` during the test to `2` after dismissal. |
| Autonomy/action flags | Remained enabled; no configuration change was made. |
| Mission, reports, validations, reflection, audit | Intentionally retained as immutable/durable historical evidence. |
| Scientific/provider configuration | Not changed. HRA→MNI and HRA→Julich remain `NOT_ESTABLISHED`. |

> Cleanup retires the temporary **source condition**. It does not erase the completed mission or audit evidence, because Milestone 5 deliberately preserves durable decision, runtime, validation, learning, reflection, and audit records.

## Final result

The user-facing acceptance run passed. It demonstrated a real owner-scoped autonomous decision from a persisted temporary internal condition through the existing Vercel Queue/private-consumer path, bounded task execution, durable validation before learning, conservative gap handling, refresh persistence, duplicate prevention, and targeted cleanup. No scientific or provider record was used or changed.
