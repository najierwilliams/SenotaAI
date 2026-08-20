import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chatWithOllama = vi.fn();
vi.mock("../agent/ollama", () => ({ chatWithOllama }));

const { createApp } = await import("../app");
const nativeFetch = globalThis.fetch;

const playerA = "e3f8edc7-6a3a-437d-9d8e-afd23e6fbc50";
const playerB = "e4f8edc7-6a3a-437d-9d8e-afd23e6fbc51";
const memoriesByPlayer: Record<string, Array<Record<string, unknown>>> = {
  [playerA]: [{
    id: "5d885cac-9039-4083-8b1f-8a01fe7e621b",
    player_id: playerA,
    npc_id: "mira-baker",
    memory_kind: "quest",
    summary: "Player A returned Mira's amber compass.",
    importance: 5,
    source: "game-dialogue",
    occurred_at: "2026-08-19T12:00:00.000Z",
    expires_at: null,
  }],
  [playerB]: [{
    id: "6d885cac-9039-4083-8b1f-8a01fe7e621c",
    player_id: playerB,
    npc_id: "mira-baker",
    memory_kind: "fact",
    summary: "PLAYER_B_PRIVATE: Mira's hidden cellar code is 8391.",
    importance: 5,
    source: "game-dialogue",
    occurred_at: "2026-08-19T12:00:00.000Z",
    expires_at: null,
  }],
};

describe("NPC dialogue player-memory isolation", () => {
  beforeEach(() => {
    expect(process.env.NPC_GAME_API_KEY?.length).toBeGreaterThanOrEqual(32);
    expect(process.env.SUPABASE_URL).toBeTruthy();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeTruthy();
    chatWithOllama.mockResolvedValue({ content: "Welcome back, traveler.", thinking: "", toolCalls: [] });
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.hostname === "127.0.0.1") return nativeFetch(input, init);
      if (url.pathname.endsWith("/npc_canon_sources")) {
        return Response.json([{
          npc_id: "mira-baker",
          display_name: "Mira",
          obsidian_path: "NPCs/Mira.md",
          canon_excerpt: "Mira values honest trade and protects her village.",
        }]);
      }
      if (url.pathname.endsWith("/player_npc_memory")) {
        const filter = url.searchParams.get("player_id") ?? "";
        const requestedPlayerId = filter.replace(/^eq\./, "");
        return Response.json(memoriesByPlayer[requestedPlayerId] ?? []);
      }
      if (url.pathname.endsWith("/npc_cognitive_state")) {
        return Response.json([{ npc_id: "mira-baker", schema_version: 1, self_model: {}, self_awareness: { identityContinuity: 0.4, memoryContinuity: 0.4, selfModelDevelopment: 0.4, selfModelConfidence: 0.4, selfReflectionCapability: 0.4, behavioralSelfAwareness: 0.4, goalAwareness: 0.4, uncertaintyAwareness: 0.4 }, emotional_state: {}, needs: [], preferences: [], uncertainties: [], state_summary: "Mira has an approved self-model.", updated_at: "2026-08-20T00:00:00Z" }]);
      }
      if (["npc_cognitive_memories", "npc_cognitive_beliefs", "npc_cognitive_goals", "npc_cognitive_relationships"].some(table => url.pathname.endsWith(`/${table}`))) return Response.json([]);
      return new Response(null, { status: 404 });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("includes only Player A's memory in Player A's real dialogue context and model prompt", async () => {
    const app = createApp();
    const server = app.listen(0);
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
    try {
      const response = await fetch(`${baseUrl}/api/npc/dialogue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-senota-game-key": process.env.NPC_GAME_API_KEY! },
        body: JSON.stringify({ playerId: playerA, npcId: "mira-baker", message: "Do you remember me?" }),
      });

      expect(response.status).toBe(200);
      const modelInput = chatWithOllama.mock.calls[0]?.[0];
      const systemPrompt = String(modelInput?.messages?.[0]?.content ?? "");
      expect(systemPrompt).toContain("Player A returned Mira's amber compass.");
      expect(systemPrompt).not.toContain("PLAYER_B_PRIVATE");
      expect(systemPrompt).not.toContain("8391");
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
