import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const buildNpcDialogueContext = vi.fn();
const rememberPlayerNpcInteraction = vi.fn();
const chatWithOllama = vi.fn();

vi.mock("./supabase", () => ({
  buildNpcDialogueContext,
  rememberPlayerNpcInteraction,
  isNpcMemoryCloudReady: () => true,
}));
vi.mock("../agent/ollama", () => ({ chatWithOllama }));

const { createApp } = await import("../app");
const validPlayerId = "e3f8edc7-6a3a-437d-9d8e-afd23e6fbc50";

describe("protected NPC dialogue API", () => {
  beforeEach(() => {
    buildNpcDialogueContext.mockResolvedValue({
      npcId: "mira-baker",
      displayName: "Mira",
      playerMemories: [{ summary: "This player delivered medicine." }],
      promptContext: "NPC canon for Mira.\nCurrent player interaction memory only:\n- Player delivered medicine.",
    });
    chatWithOllama.mockResolvedValue({ content: "Thank you for the medicine.", thinking: "" });
  });

  afterEach(() => vi.clearAllMocks());

  it("requires the supplied game key and uses it for a lightweight protected endpoint request", async () => {
    expect(process.env.NPC_GAME_API_KEY?.length).toBeGreaterThanOrEqual(32);
    const app = createApp();
    const server = app.listen(0);
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
    try {
      const denied = await fetch(`${baseUrl}/api/npc/dialogue`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      expect(denied.status).toBe(401);

      const allowed = await fetch(`${baseUrl}/api/npc/dialogue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-senota-game-key": process.env.NPC_GAME_API_KEY! },
        body: JSON.stringify({ playerId: validPlayerId, npcId: "mira-baker", message: "Hello Mira." }),
      });
      expect(allowed.status).toBe(200);
      await expect(allowed.json()).resolves.toMatchObject({ npcId: "mira-baker", content: "Thank you for the medicine.", memoriesUsed: 1 });
      expect(buildNpcDialogueContext).toHaveBeenCalledWith(validPlayerId, "mira-baker");
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
