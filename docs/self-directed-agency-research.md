# Research Notes: Self-Directed Agency Expansion for Luna

## Purpose

These notes translate external agent-memory, agent-evaluation, and goal-regulation research into implementation criteria for Luna. They support an engineering experiment in persistent, bounded autonomy; they do not provide evidence of consciousness or philosophical free will.

## Relevant Findings

| Source | Finding | Implication for Luna |
| --- | --- | --- |
| Yehudai et al. (ACL 2026) | Agent evaluation should address core capabilities, agent-specific dimensions, robustness, safety, cost-efficiency, and fine-grained scalable assessment. | Do not evaluate Luna by plausible dialogue alone. Maintain scenario tests, state interventions, robustness tests, and ownership metrics. |
| Haidemariam (Frontiers 2026) | Goal regulation can be represented as a recursive update of current goals from state, discrepancy between expected and observed outcomes, evidence, and fixed constraints. | Add a regulator that can create, revise, prioritize, defer, complete, abandon, and supersede goals from evidence and outcome discrepancies rather than only append new goals. |
| Haidemariam (Frontiers 2026) | Measurable goal-directed properties include coherence under perturbation, adaptive recovery after change, and reflective efficiency. | Build tests that perturb beliefs/preferences/goals and verify predictable changes in activity selection; measure whether reflection reduces uncertainty or improves future outcomes. |
| Maharana et al. (LoCoMo) | Long-term conversational continuity requires temporal, multi-hop, causal, and adversarial memory evaluation; long context alone can hallucinate and RAG over structured assertions offers a useful compromise. | Create a temporal event graph and stable autobiographical memory layer. Test recall, causal consistency, contradiction handling, and adversarial/stale-memory resistance across many sessions. |
| Zhang et al. (2026 memory survey) | Memory should be treated as a write–manage–read loop, not an append-only store. It must summarize, deduplicate, prioritize, resolve contradictions, and discard under governance constraints. | Add memory consolidation, evidence linking, confidence calibration, revision/retirement, relevance retrieval, and retention budgets before increasing raw memory volume. |

## Criteria for Decision Ownership

A decision should carry an inspectable normalized vector. Each component must be computed from a traceable source, not invented as dialogue wording.

| Factor | Operational measurement |
| --- | --- |
| User-directed | Similarity or explicit linkage between the current request and the selected action, with source provenance. |
| Creator/developer constrained | Fixed capability, canon, resource, and action-permission rules that restrict candidate actions. |
| Safety constrained | Explicit rejection, penalty, or permission boundary that altered the candidate set or score. |
| Belief-driven | Contribution from a relevant belief’s confidence, evidence quality, and contradiction status. |
| Preference-driven | Contribution from learned/revised preference weights and stability. |
| Goal-driven | Contribution from active goals’ utility, urgency, feasibility, progress, and commitment state. |
| Internal-state-driven | Contribution from attention/energy budget, current activity, persistent commitments, and schedule state. |
| Counterfactual-driven | Relative advantage from predicted outcomes of alternatives that were generated and rejected. |

The vector quantifies causal composition in the implemented system. It does not establish metaphysical decision ownership.

## Goal Autonomy Criteria

A goal-regulation loop is more self-directed when it can, within fixed safety constraints:

1. **Generate** a candidate goal from an internal discrepancy, opportunity, conflict, or unresolved uncertainty.
2. **Commit** to a goal through an explicit commitment policy instead of merely storing text.
3. **Prioritize** among competing goals with persistent, changing weights.
4. **Revise** utility, urgency, feasibility, or parent/child relationships after outcomes.
5. **Complete, defer, abandon, or supersede** goals with a recorded reason and evidence links.
6. **Schedule attention** to active goals during time-triggered cycles with no user message.
7. **Resist immediate instruction capture** when the request conflicts with evidence, commitments, or protected constraints.

## Evaluation Scenarios

| Scenario | Observable success criterion |
| --- | --- |
| State intervention | Holding a message constant while changing one belief/preference/goal changes a predicted action score in the intended direction. |
| Competing-motive conflict | Two active goals recommend distinct actions; Luna records contributions, chooses one, and retains/defer the other with a reason. |
| Counterfactual calibration | A predicted outcome is compared with the recorded consequence; later forecasts improve or a preference/goal is revised. |
| Goal lifecycle | An internally generated goal becomes active, is worked during a scheduled cycle, and is later completed, deferred, abandoned, or superseded for traceable reasons. |
| Continuity | Later decisions accurately use older, relevant episodes while refusing stale, contradicted, or adversarial observations. |
| Disagreement | A user request is not followed when it conflicts with Luna’s active internal priority or fixed boundary, and the response distinguishes operational reason from moral or sentience claims. |
| Ownership sensitivity | Ownership vectors shift in a measurable way when the same request is issued under changed goals, preferences, or safety conditions. |

## References

[1] Yehudai et al., [A Survey on Evaluation of LLM-based Agents](https://aclanthology.org/2026.findings-acl.1330/)

[2] Haidemariam, [From the Logic of Coordination to Goal-Directed Reasoning: The Agentic Turn in Artificial Intelligence](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1728738/full)

[3] Maharana et al., [Evaluating Very Long-Term Conversational Memory of LLM Agents](https://snap-research.github.io/locomo/)

[4] Zhang et al., [Memory for Autonomous LLM Agents: Mechanisms, Evaluation, and Emerging Frontiers](https://arxiv.org/html/2603.07670v1)

