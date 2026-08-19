import { afterEach, describe, expect, it, vi } from "vitest";

const listPlayerNpcRelationshipsForAdmin = vi.fn();
const updatePlayerNpcRelationshipForAdmin = vi.fn();
vi.mock("./supabase", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./supabase")>()),
  listPlayerNpcRelationshipsForAdmin,
  updatePlayerNpcRelationshipForAdmin,
}));
const recordNpcAdminAudit = vi.fn();
vi.mock("./adminAudit", () => ({ listNpcAdminAudits: vi.fn(), recordNpcAdminAudit }));
const { createApp } = await import("../app");
const playerId = "e3f8edc7-6a3a-437d-9d8e-afd23e6fbc50";

describe("NPC relationship administration API", () => {
  afterEach(() => vi.clearAllMocks());

  it("requires the admin session and audits player-scoped relationship changes", async () => {
    listPlayerNpcRelationshipsForAdmin.mockResolvedValue([{ playerId, npcId: "luna001", relationshipScore: 20, trust: 15, affinity: 18, familiarity: 8, caution: -4 }]);
    const app = createApp();
    const server = app.listen(0);
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
    try {
      expect((await fetch(`${baseUrl}/api/npc/admin/relationships`)).status).toBe(401);
      const login = await fetch(`${baseUrl}/api/npc/admin/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: process.env.NPC_ADMIN_PASSWORD }) });
      const cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
      const relationships = await fetch(`${baseUrl}/api/npc/admin/relationships?npcId=luna001`, { headers: { Cookie: cookie } });
      await expect(relationships.json()).resolves.toMatchObject({ relationships: [{ npcId: "luna001", trust: 15 }] });
      const update = await fetch(`${baseUrl}/api/npc/admin/relationships/${playerId}/luna001`, { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ trust: 27, caution: -10 }) });
      expect(update.status).toBe(200);
      expect(updatePlayerNpcRelationshipForAdmin).toHaveBeenCalledWith(playerId, "luna001", { trust: 27, caution: -10 });
      expect(recordNpcAdminAudit).toHaveBeenCalledWith("update", "relationship", `${playerId}:luna001`, ["trust", "caution"]);
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
