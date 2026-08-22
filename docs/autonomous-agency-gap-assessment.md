# Luna Autonomous Agency — Gap Assessment

## Conclusion

Luna has the beginnings of a cognitive substrate, but it is currently a **governed dialogue system with reviewable state**, not an autonomous agent. It has persistent memories, beliefs, goals, relationships, self-model fields, observations, reflections, and a periodic reflection schedule. However, its durable cognitive state is administratively gated; its reflections are proposal-only; dialogue does not change state; beliefs are retrieved primarily by lexical overlap; and no component selects goals, evaluates trade-offs, executes internal choices, observes consequences, or modifies future decision tendencies without an administrator’s application step.

This is a useful foundation, but the control locus must move from administrator approval of internal conclusions to a bounded internal cognitive loop with independent, inspectable state transitions.

## Capability comparison

| Capability | Present foundation | Autonomous-agent gap | Required change |
| --- | --- | --- | --- |
| Observation | Raw interactions and administrator notes can be recorded. | Observations do not automatically enter a deliberation queue with epistemic weight. | Create an event journal and an autonomous intake cycle that records source, reliability, novelty, and relevance. |
| Memory | Episodic, semantic, procedural, social, and emotional memory classes already exist. | Memories are added only after approval and are not consolidated through endogenous decisions. | Allow the cognitive loop to retain, reinforce, decay, connect, and retire memories under budgets and audit history. |
| Beliefs | Belief records include statement, confidence, evidence, support, contradictions, and lifecycle status. | Beliefs are mostly static, lexical-retrieval context. | Add hypotheses, evidence links, confidence updating, conflict graph, contradiction resolution, and source reliability. |
| Preferences | A general preferences field exists. | It has no structure, origin, stability, or influence on choices. | Add preference dimensions, learned weights, evidence, context scope, and revision history. |
| Goals | Goals include priority, progress, status, and source. | There is no goal proposal, selection, planning, or consequence feedback loop. | Add endogenous goals, candidate goals, utility scoring, commitments, and abandonment/reprioritization logic. |
| Motivation | Needs and emotional state can be persisted. | These values do not affect behavior via a transparent decision rule. | Formalize bounded drives and value weights that influence deliberation but cannot override hard safety constraints. |
| Decision | The model generates one reply per user prompt. | It does not compare options or record why a choice was made. | Add explicit candidate generation, scoring, uncertainty handling, chosen action, and decision trace. |
| Consequence learning | Conversation summaries may be stored. | Outcomes are not linked to prior decisions or used to update future choices. | Add prediction/outcome records and a bounded feedback updater for reliability, preference, and strategy weights. |
| Time and initiative | Reflection schedule proposes daytime development cards. | The schedule cannot select internal actions or create a behavior state. | Replace proposal-only reflection with bounded autonomous cycles that decide among reflection, consolidation, planning, rest, or no-op. |
| Oversight | Administrator can inspect and approve all durable changes. | Creator cannot see causal pathways without controlling them. | Preserve observability, pause, reset, export, and hard boundaries; remove routine approval from internal cognitive updates. |

## Architectural change

The new system should be an **autonomous, bounded, stateful decision process**. It receives events; forms or revises hypotheses; updates memories and preferences; proposes candidate goals/actions; selects an option according to state, values, uncertainty, and expected consequences; records a decision trace; observes outcomes; and uses them to update future choices.

The developer defines the architecture, action boundaries, time/compute budgets, and safety constraints. Luna’s individual internal outcomes are produced by stateful reasoning and probabilistic generation within those constraints, rather than selected one-for-one by the developer or administrator.

## What is deliberately retained

Canon remains separate from learned operational state. Every state mutation remains append-only and inspectable. The system must support pause, rollback, reset, and export. It must not perform irreversible or external actions without an explicit capability policy. Neither internal complexity nor probabilistic behavior is treated as evidence of sentience, consciousness, subjective experience, or philosophical free will.

## Implementation impact

The existing `npc_cognitive_*` tables and `cognitiveState.ts` are the correct base. The proposal-first reflection routes, strict administrator application gate, lexical-only context retrieval, and self-awareness percentage presentation need to be replaced or sidelined for the autonomous mode. The existing review dashboard should become an **observatory**: it displays events, beliefs, motivations, candidate choices, selected decisions, outcomes, and revisions without approving normal internal cognition.
