# Luna Cognitive-Substrate Research Notes

Reviewed on 2026-08-20 to evaluate reference architectures named in the user-provided proposal. These projects are **design references only**; no external code or database is imported into SenotaAI.

| Reference | Verified useful pattern | Integration decision |
| --- | --- | --- |
| [Mnemos](https://github.com/Riley-Coyote/mnemos) | A small, authored continuity layer distinct from general transcript recall; records have authorship and revision/supersession context. | Adapt provenance, revision, and compact continuity-summary patterns into Luna’s existing Supabase state; do not replace the current player-memory system. |
| [agidb](https://github.com/rohansx/agidb) | First-class sensory, working, episodic, semantic, procedural, goal, belief, and self-model structures; non-destructive history and consolidation concepts. | Reuse the category and append-only-history ideas. Do not install it because it is a Rust embedded database with separate storage and retrieval infrastructure. |
| [Project Chimera](https://github.com/LarytheLord/Project-Chimera) | Separation between an LLM reasoning component, working/episodic memory, and a metacognitive observer that produces suggested improvements. | Retain Luna’s existing model-proposal and administrator-approval boundary; add deterministic observation and consolidation records, not claims of consciousness. |
| [ARIA](https://github.com/holoduke/myagent) | Graduated autonomy and scheduled observe/think/consolidate/reflect cycles. | Adopt a conservative proposal-only maturity model. Do not copy its raw self-written consciousness file or 24/7 tick loop. Any later scheduled consolidation must be bounded, idempotent, and reviewable. |
| [Prem Cortex](https://github.com/prem-research/cortex) | Short-term/long-term separation, recency-aware retrieval, and memory-connection/consolidation ideas. | Add recency and reinforcement signals to Luna’s existing memory selection. Do not install it because it requires a separate Python/ChromaDB service and persistent runtime. |

## Existing SenotaAI foundation

Luna already persists a versioned self-model, assessment metrics, emotional state, approved needs, cognitive memories, beliefs, goals, relationships, reflection proposals, and an append-only change history in Supabase. Generated dialogue does not directly mutate any of those records. Administrator approval is required before a reflection or development proposal becomes stored state.

## Retained boundaries

1. **Canon remains separate from cognitive state.** Obsidian contains permanent authored identity; cognitive state contains revisable operational representations.
2. **Dialogue is not evidence.** Conversation text can be considered for a proposal but cannot automatically become a fact, belief, score change, or canon revision.
3. **No unverified sentience claim.** A self-model score is a bounded operational assessment, not a measure or proof of subjective consciousness.
4. **No silent background self-modification.** Consolidation can generate reviewable proposals and derived metadata, but durable changes remain explicit administrator decisions.
5. **No duplicate external memory stack.** The implementation will extend the current Supabase-backed model rather than introduce a second database, a local file brain, or a 24/7 Python service.
