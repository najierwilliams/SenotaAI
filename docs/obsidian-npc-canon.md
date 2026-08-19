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

## Open the NPC Brain in Obsidian

The permanent NPC brain is the private GitHub repository [`najierwilliams/SenotaAI-NPC-Canon`](https://github.com/najierwilliams/SenotaAI-NPC-Canon), opened locally as an Obsidian vault. On a Mac, install [Obsidian](https://obsidian.md) and GitHub Desktop, clone the private repository to a folder you control, then choose **Open folder as vault** in Obsidian and select the cloned folder. Create and edit permanent NPC notes inside `NPCs/`, then use GitHub Desktop to commit and push the changes. The signed SenotaAI webhook imports changed NPC notes automatically.

You can also start from the SenotaAI website. Open **NPC management** and unlock it with the administrator password, then return to **AI chat** and select **Draft NPC canon**. SenotaAI produces a proposed Markdown note and a plain-language summary. You may edit the note, revise the request, or discard it. Only **Confirm and send to NPC canon** writes the reviewed note to the private vault; that commit then follows the same signed GitHub synchronization path.

## Trusted Import Path

Use `POST /api/npc/canon/sync` from a **trusted server or private sync worker**, never from a Unity client. The request requires the `x-senota-game-key` header and accepts an Obsidian note’s raw Markdown as `noteContent` plus its vault-relative `obsidianPath`. SenotaAI requires `npc_id` and `display_name` frontmatter, computes a content hash, and writes only the bounded `## Runtime excerpt` section (or a bounded canon body if that section is absent) to Supabase. This is the repeatable boundary between the private Obsidian brain and the cloud runtime cache; player memories cannot be submitted through this route.
