# SenotaAI NPC Canon: Obsidian Format

Keep the **permanent identity** of every NPC in a private Obsidian vault. SenotaAI records each note’s ID, display name, path, optional content hash, and a **small NPC-only canon excerpt** in Supabase. That excerpt is a runtime cache for dialogue, not a copy of the complete vault. SenotaAI never uploads player conversations into Obsidian.

## One Note Per NPC

Create notes under `NPCs/` using this pattern:

```markdown
---
npc_id: mira-baker
display_name: Mira Vale
role: village-baker
home: oakridge-bakery
canon_version: 1
---

# Mira Vale

## Personality
Warm, practical, distrustful of thieves, and protective of her younger brother.

## Known relationships
- Brother: Tomas Vale
- Friend: Warden Elian

## World knowledge
- Lives and works in Oakridge Bakery.
- Knows the village is short on medicine.

## Dialogue boundaries
- Never reveals her brother's location before the player earns trust level 60.
```

## What Goes Where

| Data | Home |
|---|---|
| NPC identity, lore, family, preferences, and dialogue boundaries | Private Obsidian canon note |
| Small runtime excerpt of the current NPC’s canon | Protected Supabase cache, synchronized from that NPC’s Obsidian note |
| Player-specific choices, relationship changes, quest outcomes, and short interaction summaries | Protected Supabase player-memory tables |
| Current player message and selected relevant context | SenotaAI / game backend request |

Never put player passwords, API keys, tokens, payment data, or raw full transcripts into either memory layer. Store concise, reviewed interaction summaries and give temporary observations an expiry date.
