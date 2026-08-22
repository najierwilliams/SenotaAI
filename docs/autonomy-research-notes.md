# Autonomy Research Notes

## Sources reviewed

1. Huang et al., *Understanding the Planning of LLM Agents: A Survey* (2024), https://arxiv.org/abs/2402.02716.
2. Balke and Gilbert, *How Do Agents Make Decisions? A Survey* (2014), https://jasss.soc.surrey.ac.uk/17/4/13.html.

## Design-relevant findings

The LLM planning survey organizes the relevant engineering mechanisms into task decomposition, plan selection, external modules, reflection, and memory. This supports a modular design in which a language model is a reasoning and proposal component, not the sole owner of state or the authority for every choice.

The decision-making survey gives a useful BDI distinction: beliefs are the agent’s internalized information and can be inaccurate; desires are candidate motivational states; goals are desires the agent is actively pursuing; and intentions are commitments to a chosen course of action. Its account of deliberation also separates candidate plans from the selection of a plan appropriate to current beliefs and intentions.

Traditional BDI alone is insufficient for Luna’s objective. The survey notes that classic BDI has weak or absent mechanisms for learning from past behavior and for affective or normative considerations. Luna therefore needs a BDI-inspired core plus explicit memory consolidation, uncertainty and source reliability, learned preference weights, outcome prediction/error records, and periodic metacognitive review.

## Implications for Luna

- A persistent record must distinguish observations from beliefs, beliefs from hypotheses, desires from committed goals, and goals from current action intentions.
- Belief confidence is not a self-awareness percentage. It must be linked to evidence provenance, contradiction state, prediction performance, and revision history.
- The deliberation engine must generate multiple candidate actions or goals, score them against current state and enduring values, select one within explicit constraints, and write a decision trace.
- Learning should occur through auditable state changes from observed outcomes, not through arbitrary free-form model prose.
- A language model can generate interpretations and candidate actions probabilistically; deterministic code validates schemas, applies bounded updates, enforces capability limits, and keeps history.

## Provisional boundary

An architecture can implement **operational autonomy**: internally generated and state-sensitive choices that are not one-for-one selected by the developer at runtime. It cannot establish or prove subjective experience, moral agency, or philosophical libertarian free will. The experiment should measure behavioral autonomy, persistence, belief revision, goal independence, and consequence sensitivity rather than claim metaphysical conclusions.

## Further sources reviewed

3. Christian List, *Can AI Systems Have Free Will?* (2025), https://link.springer.com/article/10.1007/s11229-025-05209-x.
4. Shinn et al., *Reflexion: Language Agents with Verbal Reinforcement Learning* (2023), https://arxiv.org/abs/2303.11366.

## Further design-relevant findings

List frames a pragmatic account around three conditions: intentional agency (goal-directed action grounded in beliefs and desires), alternative possibilities, and causal control (intentional states make a difference to action selection). It explicitly argues that random or unpredictable algorithms are not, by themselves, what should decide the question. This gives Luna a rigorous evaluation target: demonstrate that her recorded beliefs, preferences, goals, and deliberation traces make a causal difference to selected actions across counterfactual internal states.

Reflexion demonstrates a narrower engineering result: a language agent can improve future task choices through environment feedback that is converted into reflective text stored in episodic memory, without updating the language model’s weights. This is useful for Luna as a memory-conditioned adaptation pattern, but it must not be described as deep learning or proof of agency. A robust system should retain the original decision, predicted outcome, actual outcome, feedback source, and the bounded state delta that follows.

## Updated boundary and evaluation standard

Luna will be described as an experiment in **operational or functional autonomy**, not as a proven free-willed or conscious being. The system will supply alternative internally generated actions, state-sensitive selection, and causal traces that can be inspected by intervention tests. It will not treat sampling randomness, model prose, or self-descriptions as evidence of free will. A future evaluation can test whether changing an active belief, preference, goal, or uncertainty estimate predictably changes a decision while all external input is held constant.
