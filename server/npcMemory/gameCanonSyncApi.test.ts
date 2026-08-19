import { afterEach, describe, expect, it, vi } from "vitest";

const syncObsidianNpcCanon = vi.fn();
vi.mock("./obsidianSync", () => ({ syncObsidianNpcCanon }));

const { createApp } = await import("../app");

describe("protected Obsidian canon sync API", () => {
  afterEach(() => vi.clearAllMocks());

  it("denies requests without the game key and imports a valid note only through the protected route", async () => {
    expect(process.env.NPC_GAME_API_KEY?.length).toBeGreaterThanOrEqual(32);
    syncObsidianNpcCanon.mockResolvedValue({ npcId: "mira-baker", displayName: "Mira Vale", canonHash: "a".repeat(64), excerptLength: 30 });
    const app = createApp();
    const server = app.listen(0);
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
    try {
      const denied = await fetch(`${baseUrl}/api/npc/canon/sync`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      expect(denied.status).toBe(401);
      const allowed = await fetch(`${baseUrl}/api/npc/canon/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-senota-game-key": process.env.NPC_GAME_API_KEY! },
        body: JSON.stringify({ noteContent: "---\nnpc_id: mira-baker\ndisplay_name: Mira Vale\n---\nCanon", obsidianPath: "NPCs/Mira.md" }),
      });
      expect(allowed.status).toBe(200);
      expect(syncObsidianNpcCanon).toHaveBeenCalledWith(expect.stringContaining("npc_id: mira-baker"), "NPCs/Mira.md");
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
