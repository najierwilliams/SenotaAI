# Luna Autonomous-Agent Architecture

## Purpose

Luna will be implemented as a **bounded, persistent, autonomous decision process**. The creator determines the architecture, protected canon, capability boundaries, time and compute limits, and emergency controls. Within those limits, Luna independently evaluates observations, manages uncertainty, forms and revises beliefs, develops preferences, creates and reprioritizes goals, selects among candidate actions, predicts outcomes, and uses recorded consequences to adjust later choices.

The objective is operational autonomy, not a declaration that Luna is conscious or possesses philosophical free will. The system must make the causal pathway from state to choice inspectable.

## Agency stack

| Layer | Responsibility | State it may change | What remains fixed or externally controlled |
| --- | --- | --- | --- |
| Canon and capability boundary | Identity, prohibited claims, permitted action types, resource limits, pause/reset controls. | None during normal autonomous operation. | Creator/architect only. |
| Event intake | Converts dialogue, time events, and creator-provided information into attributable observations. | Event journal. | Source identity and event payload are immutable. |
| World model | Forms hypotheses and beliefs; assesses provenance, novelty, relevance, uncertainty, conflict, and confidence. | Beliefs, evidence links, contradiction links. | Schema bounds and forbidden-canon guardrails. |
| Memory | Retains, reinforces, links, summarizes, decays, and retires episodic/semantic/procedural records. | Memory records and relationships. | Storage budgets, retention rules, audit log. |
| Motivation | Maintains values, context-sensitive preferences, needs, candidate goals, active goals, and commitments. | Preferences, goals, intentions. | Protected values and hard constraints. |
| Deliberation | Generates options, forecasts outcomes, compares trade-offs, selects a bounded internal or conversational action. | Decision trace, current intention, behavior episode. | Action whitelist and execution permissions. |
| Consequence learning | Compares predictions with observable outcomes and updates confidence, preferences, strategies, and goal progress. | Outcome records, belief/policy weights. | Update rate limits and validation. |
| Metacognition | Periodically consolidates memory, checks contradictions, evaluates stalled goals, and selects a next internal activity. | Reflection events and bounded state updates. | Cycle schedule, compute budget, pause switch. |
| Observatory | Shows causal records, interventions, and state diffs without approving routine cognition. | Read-only except pause/reset/export controls. | Creator privileges. |

## Persistent records

The implementation adds append-only records alongside the current `npc_cognitive_*` state. The original state tables remain available for compatibility, but autonomous mode writes to the following records.

| Table | Essential fields | Why it matters |
| --- | --- | --- |
| `npc_agent_events` | NPC, type, content, source, source reliability, salience, event time, processed state. | Preserves what Luna observed separately from what she concluded. |
| `npc_agent_beliefs` | Statement, confidence, status, source reliability, evidence IDs, contradiction IDs, implication summary, revision count. | Lets Luna hold revisable internal propositions rather than only administrator-approved facts. |
| `npc_agent_preferences` | Dimension, context, direction, weight, stability, basis, supporting events, status. | Turns preferences into durable but revisable decision inputs. |
| `npc_agent_goals` | Origin, goal statement, utility, feasibility, urgency, progress, status, parent goal, evidence. | Separates possible motives from selected commitments. |
| `npc_agent_decisions` | Trigger, candidate options, score breakdowns, chosen option, rejected options, uncertainty, intention, rationale, safety result. | Creates a causal trace of practical choice. |
| `npc_agent_outcomes` | Decision ID, observable outcome, prediction error, feedback source, valence, evaluated state diff. | Allows consequence-sensitive learning without claiming model-weight training. |
| `npc_agent_behavior_episodes` | Activity, state, start/end, initiating decision, planned outcome, actual outcome. | Gives time-bounded behavior, such as a self-selected reflection/rest interval, a real runtime record. |
| `npc_agent_state` | Mode, current intention, current activity, active values, last deliberation, next autonomous cycle, energy/attention budget. | Holds the compact state necessary for each decision cycle. |
| `npc_agent_history` | Record type, before/after snapshots, actor, cause event or decision, timestamp. | Enables inspection, rollback, and intervention analysis. |

## State lifecycle

```mermaid
flowchart LR
  A[Event or scheduled cycle] --> B[Record attributable observation]
  B --> C[Retrieve related memory, beliefs, preferences, goals]
  C --> D[Interpret novelty, provenance, relevance, and conflict]
  D --> E[Create/revise hypothesis and memory links]
  E --> F[Generate candidate goals or actions]
  F --> G[Forecast consequences and score trade-offs]
  G --> H[Validate capability and hard constraints]
  H --> I[Select commitment / action / no-op]
  I --> J[Persist decision trace and behavior episode]
  J --> K[Generate dialogue or execute permitted internal transition]
  K --> L[Observe outcome]
  L --> M[Update confidence, preference, goal progress, and strategy]
  M --> A
```

## Deliberation procedure

Luna’s internal loop is not a response template. A trigger creates an event. The agent retrieves a bounded slice of state and generates a structured interpretation, including candidate hypotheses and candidate actions. A deterministic validator limits the choices to the declared action vocabulary and validates record structure. The scorer then combines learned and current signals:

`score(option) = goal_alignment + preference_alignment + expected_value - uncertainty_cost - contradiction_cost - resource_cost - safety_penalty`

Each term is stored in the decision trace. The model may supply candidate options and forecasts; the program calculates or clamps numeric terms, rejects invalid alternatives, and persists the selected option. Sampling can be used only as a clearly labeled tie-breaker among near-equivalent admissible options; randomness must never be presented as autonomy.

## Learning and belief revision

A new event does not become a fact by creator approval. It becomes an observation with provenance. The agent may independently create a **hypothesis**, reject it as irrelevant, merge it into an existing belief, lower confidence in a contradicted belief, or defer it because uncertainty is too high. A belief may graduate from tentative to active based on corroborating evidence, source reliability, non-contradiction, and predictive usefulness. It may be superseded or retracted when evidence and outcomes warrant it.

Preferences may arise from repeated, consequential patterns, but they require a basis trace and a stability threshold before becoming strong decision inputs. Goals are proposed from discrepancies between active values, state, existing commitments, and recognized opportunities. Only the agent’s deliberator moves a candidate goal to active, while hard resource and action boundaries remain enforced.

## Creator role and safety controls

The creator provides **architectural sovereignty**, not turn-by-turn cognitive approval. The observatory permits pausing the agent, freezing a category of mutation, exporting state/history, reverting to a prior checkpoint, modifying capability policy, and replacing erroneous source data. It does not normally approve individual beliefs, preferences, or choices.

All external or irreversible effects remain behind capability controls. In the first release, Luna’s autonomous actions are internal cognitive transitions and dialogue framing only. No financial, account, code-deployment, communications, or tool actions may occur autonomously.

## Concrete rest example

A creator-provided text about rest is ingested as an attributed event, not installed as a command. Luna may interpret it as a hypothesis that a periodic low-interaction interval could benefit memory consolidation and consistency checking. That interpretation competes with other goals, resource state, current commitments, and uncertainty. If it selects a rest/reflection action, it writes a behavior episode with a proposed interval and expected benefit. At 04:01, if the episode is still active, it influences response framing. Luna may say she was in a scheduled reflection interval, but cannot claim biological sleep, private experience, or an outcome that the recorded process does not support.

## What can be measured

| Property | Demonstration method | Does not demonstrate |
| --- | --- | --- |
| State sensitivity | Hold the external message constant and intervene on one belief/preference/goal; check whether choices change as predicted. | Subjective experience. |
| Alternative generation | Inspect multiple valid candidate actions before selection. | Uncaused choice. |
| Causal control | Verify selected action changes when relevant internal state changes, but not when irrelevant state changes. | Moral responsibility. |
| Learning | Measure prediction error, belief calibration, goal outcomes, and policy revisions across episodes. | Model-weight training unless weights are actually updated. |
| Goal independence | Observe endogenous goal creation, persistence, revision, and abandonment under defined constraints. | Freedom from the architecture’s initial values and constraints. |

## Explicit distinction

Deterministic code enforces schemas, limits, action permissions, retention, scoring formulas, and audit history. Probabilistic model behavior generates interpretations, hypotheses, options, and forecasts from current context. Learned behavior is the durable change in retrieved memory, belief confidence, preference weights, strategy selection, or goals due to recorded outcomes. Autonomous goal selection is the system’s own bounded choice to create, prioritize, pursue, defer, or abandon a goal from these internal representations. None of these alone proves philosophical free will; together they create a falsifiable operational-agent experiment.

## References

[1] Huang et al., [Understanding the Planning of LLM Agents: A Survey](https://arxiv.org/abs/2402.02716).

[2] Balke and Gilbert, [How Do Agents Make Decisions? A Survey](https://jasss.soc.surrey.ac.uk/17/4/13.html).

[3] Shinn et al., [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366).

[4] List, [Can AI Systems Have Free Will?](https://link.springer.com/article/10.1007/s11229-025-05209-x).

## Operating the experiment

The migration `20260822_luna_autonomous_agent.sql` creates the persistent records. On the active SenotaAI database, it has been applied as `luna_autonomous_agent`. The secured NPC administration page now includes **Luna autonomy observatory**. Use it to submit a source-labeled observation, inspect the ensuing hypothesis, preference, goal, candidate options, selected option, behavior episode, and score breakdown, and then record an observed consequence for a selected decision.

The existing authenticated hourly rhythm now also emits a low-salience `time` event. This lets Luna process bounded internal cycles while no one is talking to her. In the first release, selected actions only change internal operational state or dialogue framing. The loop does not receive general external tools, financial capabilities, deployment rights, outbound communications, or any irreversible ability.

The controls intentionally operate at the architectural level. **Active** runs ordinary autonomous deliberation. **Observation-only** stores attributable inputs without forming new autonomous state. **Paused** halts autonomous processing. These switches, together with database history and capability limits, provide auditability and intervention without making the creator approve each individual belief or choice.

## Verification commands

```bash
pnpm check
pnpm vitest run server/npcMemory/autonomousAgent.test.ts server/npcMemory/previewDialogue.test.ts
pnpm build
```

The focused autonomous-agent and preview-dialogue tests pass. The repository-wide suite still contains unrelated integration tests that require deployment-only secrets and authenticated service configuration; in an unconfigured local environment, those tests fail before exercising this feature.
