import { afterEach, describe, expect, it, vi } from "vitest";
import { buildNpcDialogueContext, isNpcMemoryCloudReady, listPlayerNpcMemories, rememberPlayerNpcInteraction, upsertNpcCanonSource } from "./supabase";

const playerId = "e3f8edc7-6a3a-437d-9d8e-afd23e6fbc50";

describe("Supabase NPC memory gateway", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("stays unavailable until both server-only Supabase settings exist", () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(isNpcMemoryCloudReady()).toBe(false);
  });

  it("registers canon by Obsidian reference without uploading markdown contents", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-secret");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ npc_id: "mira-baker" }]), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await upsertNpcCanonSource({ npcId: "mira-baker", displayName: "Mira", obsidianPath: "NPCs/Mira Baker.md" });

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("npc_canon_sources?on_conflict=npc_id"), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer service-secret" }),
    }));
    expect(String(fetchMock.mock.calls[0][1]?.body)).not.toContain("likes");
  });

  it("retrieves only current-player active memories and writes summaries instead of transcripts", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-secret");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "memory-1" }]), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await listPlayerNpcMemories(playerId, "mira-baker");
    await rememberPlayerNpcInteraction({ playerId, npcId: "mira-baker", memoryKind: "summary", summary: "Player delivered medicine to Mira.", importance: 4 });

    expect(fetchMock.mock.calls[0][0]).toContain(`player_id=eq.${playerId}`);
    expect(String(fetchMock.mock.calls[1][1]?.body)).toContain("Player delivered medicine to Mira.");
  });

  it("combines one Obsidian-derived NPC snapshot with only the current player’s summaries", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-secret");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ npc_id: "mira-baker", display_name: "Mira", obsidian_path: "NPCs/Mira.md", canon_excerpt: "Mira runs the Oakridge bakery." }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "memory-1", player_id: playerId, npc_id: "mira-baker", memory_kind: "quest", summary: "Player delivered medicine.", importance: 4, source: "game-dialogue", occurred_at: "2026-08-19T00:00:00Z", expires_at: null }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const context = await buildNpcDialogueContext(playerId, "mira-baker");

    expect(context.promptContext).toContain("Mira runs the Oakridge bakery.");
    expect(context.promptContext).toContain("Player delivered medicine.");
    expect(fetchMock.mock.calls[1][0]).toContain(`player_id=eq.${playerId}`);
    expect(fetchMock.mock.calls[1][0]).toContain("npc_id=eq.mira-baker");
  });
});
