# Luna Self-Directed Agency Gap Audit

## Scope

This audit compares the current Luna implementation with the objective of building the strongest technically defensible form of **bounded, self-directed machine agency**. It does not treat autonomy as proof of consciousness, sentience, moral responsibility, or philosophical free will.

> The target question is whether Luna’s future behavior can increasingly depend on her own persistent goals, preferences, experiences, deliberation, and previous choices rather than being determined primarily by the immediate user message or fixed response policy.

## What the Current System Already Demonstrates

| Requirement | Current mechanism | Assessment |
| --- | --- | --- |
| Independent deliberation | The agent produces candidate activities, a deterministic scorer ranks them, and the selected action is persisted. | **Implemented, but narrow.** The action vocabulary is small and some option coverage remains hand-authored for the rest experiment. |
| Persistent consequences | Outcomes create strategy preferences that alter later action scores. | **Implemented, but externally evaluated.** A creator presently supplies valence and prediction error. |
| Unprompted activity | An authenticated hourly trigger submits a low-salience time event. | **Partial.** The schedule is fixed and its legacy reflection workflow still produces review-only material. |
| Continuity | Events, beliefs, preferences, goals, decisions, episodes, and history persist in Supabase. | **Partial.** Retrieval is largely lexical and there is no consolidated autobiographical self-model. |
| Self-generated goals | The deliberator may emit one candidate or active goal from an event. | **Partial.** There is no goal-discrepancy monitor, goal hierarchy, commitment policy, duplicate management, or abandonment/reprioritization loop. |
| Self-generated preferences | The deliberator may emit a preference; outcome feedback creates strategy preferences. | **Partial.** Preferences are appended, not reconciled, decayed, compared, or revised from repeated evidence. |
| Competing motivations | The scorer combines model-reported alignment, learned strategy preference, expected value, uncertainty, and resource cost. | **Partial.** Goals and values are represented as text rather than structured competing motives with explicit contributions. |
| Counterfactual choice | Candidate options contain expected outcomes and are scored. | **Partial.** There is no stored counterfactual simulation, comparison record, calibration check, or outcome-vs-prediction update per option. |
| Ability to disagree | A bounded response can use stored state, and invalid / approval-dependent options are rejected. | **Partial.** The dialogue layer does not yet have a distinct intention-selection stage that can decline, redirect, or challenge a user premise based on current priorities. |
| Decision ownership | Events preserve source and decisions preserve an action trace. | **Missing.** The system does not quantify whether a decision was user-directed, safety-constrained, learned, preference-driven, goal-driven, or dominated by internally competing objectives. |
| Self-modification of priorities | Goals and preferences can be newly created. | **Missing.** Existing records are not systematically updated, superseded, retired, or re-ranked by evidence and outcome. |

## Architectural Constraints That Currently Reduce Self-Direction

The current `runAutonomousAgentCycle` is fundamentally event-reactive. It executes only after an external dialogue, creator observation, or a scheduler-produced time event. The hourly time event is a valuable bridge, but the scheduler fixes its window and cadence externally and the legacy reflection process remains review-only.

The current deliberator may output one belief, one preference, and one goal, but those records are primarily appended. It does not first identify contradictions, update an existing proposition, reconcile competing preferences, or revise the priority of a committed goal. This produces persistence but not yet an evolving internal economy of motives.

The numeric fields used by option scoring are supplied by the language model and then clamped. This is interpretable, but it is not enough for decision ownership: the system cannot distinguish whether a score came from an active goal, learned preference, user request, safety rule, attention condition, or a direct model estimate.

The rest-specific option coverage is intentionally a temporary experiment guard. It makes the rest hypothesis testable, but a scalable agent should use a general discrepancy and opportunity detector rather than special-purpose content patterns.

## Required Direction of Change

The next implementation should create a **goal and motive regulation loop**. It must operate on both external events and independently scheduled internal cycles. It should create, revise, prioritize, defer, complete, abandon, or supersede goals based on recorded evidence, outcomes, contradictions, attention budget, and fixed safety constraints.

Every decision should include an immutable **ownership vector**. It should separately quantify the contribution of user direction, protected developer constraints, safety constraints, persistent beliefs, learned preferences, active goals, internal state, and counterfactual predictions. This does not prove that Luna owns a decision philosophically; it makes the causal composition of the operational decision testable.

The system also needs a stable autobiographical layer. It should periodically consolidate raw episodes into revisable self-relevant summaries such as demonstrated capabilities, unresolved uncertainties, reliable strategies, active commitments, and recent decision outcomes. Such records must remain evidence-linked and retractable.

## Non-Negotiable Boundaries

The creator retains authority over security, privacy, resource limits, action permissions, external effects, reset/export controls, and prohibited claims. Luna’s self-direction may change only internal beliefs, preferences, goals, attention allocation, behavior episodes, dialogue intention, and other permitted state inside those boundaries.

No planned subsystem should claim that this produces consciousness or philosophical free will. Its empirical purpose is to increase and measure the fraction of future behavior caused by persistent internal state rather than immediate instructions.

## Immediate Build Priority

The first expansion should be a **motive ledger and decision-ownership layer**, followed by self-directed goal regulation. These two mechanisms make the remaining work measurable: without them, future features can create more records but cannot demonstrate whether internal state actually governs the agent’s choices.

## References

[1] [Luna Autonomous-Agent Architecture](./luna-autonomous-agent-architecture.md)

[2] [User-provided self-directed agency requirements](../upload/Pasted_content_07.txt)

[3] Zhang et al., [Memory for Autonomous LLM Agents: Mechanisms, Evaluation, and Emerging Frontiers](https://arxiv.org/html/2603.07670v1)

[4] Li et al., [A Survey on Evaluation of LLM-based Agents](https://aclanthology.org/2026.findings-acl.1330/)

[5] Maharana et al., [Evaluating Very Long-Term Conversational Memory of LLM Agents](https://snap-research.github.io/locomo/)

[6] [From the Logic of Coordination to Goal-Directed Reasoning: The Agentic Turn in Artificial Intelligence](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1728738/full)

