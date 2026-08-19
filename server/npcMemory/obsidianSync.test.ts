import { describe, expect, it, vi } from "vitest";

const upsertNpcCanonSource = vi.fn();
vi.mock("./supabase", () => ({ upsertNpcCanonSource }));

const { parseObsidianNpcNote, syncObsidianNpcCanon } = await import("./obsidianSync");

const note = `---
npc_id: mira-baker
display_name: Mira Vale
role: village-baker
---

# Mira Vale

## Personality
Warm and practical.

## Runtime excerpt
Mira values honest trade and protects Oakridge.`;

describe("Obsidian NPC canon sync", () => {
  it("parses documented frontmatter and uses only the bounded runtime excerpt", () => {
    const parsed = parseObsidianNpcNote(note, "NPCs/Mira.md");
    expect(parsed).toMatchObject({ npcId: "mira-baker", displayName: "Mira Vale", obsidianPath: "NPCs/Mira.md", canonExcerpt: "Mira values honest trade and protects Oakridge." });
    expect(parsed.canonHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects unsafe paths and missing required NPC identity", () => {
    expect(() => parseObsidianNpcNote(note, "../private/Mira.md")).toThrow("Obsidian path is invalid");
    expect(() => parseObsidianNpcNote("---\ndisplay_name: Mira\n---\nCanon", "NPCs/Mira.md")).toThrow("npc_id");
  });

  it("syncs canon-only data through the Supabase gateway", async () => {
    await syncObsidianNpcCanon(note, "NPCs/Mira.md");
    expect(upsertNpcCanonSource).toHaveBeenCalledWith(expect.objectContaining({ npcId: "mira-baker", displayName: "Mira Vale", obsidianPath: "NPCs/Mira.md" }));
  });
});
