import { afterEach, describe, expect, it, vi } from "vitest";

const listNpcCanonSourcesForAdmin = vi.fn();
const listPlayerNpcMemoriesForAdmin = vi.fn();
const updateNpcCanonForAdmin = vi.fn();
const updatePlayerNpcMemoryForAdmin = vi.fn();
vi.mock("./supabase", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./supabase")>()),
  listNpcCanonSourcesForAdmin,
  listPlayerNpcMemoriesForAdmin,
  updateNpcCanonForAdmin,
  updatePlayerNpcMemoryForAdmin,
}));

const listNpcAdminAudits = vi.fn();
const recordNpcAdminAudit = vi.fn();
vi.mock("./adminAudit", () => ({ listNpcAdminAudits, recordNpcAdminAudit }));

const { createApp } = await import("../app");

describe("NPC administration API", () => {
  afterEach(() => vi.clearAllMocks());

  it("keeps canon and player-memory records behind the administrator session", async () => {
    listNpcCanonSourcesForAdmin.mockResolvedValue([{ npcId: "mira-baker", displayName: "Mira Vale", isActive: true }]);
    const app = createApp();
    const server = app.listen(0);
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
    try {
      const publicResponse = await fetch(`${baseUrl}/api/npc/admin/canon`);
      expect(publicResponse.status).toBe(401);
      const login = await fetch(`${baseUrl}/api/npc/admin/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: process.env.NPC_ADMIN_PASSWORD }) });
      const cookie = login.headers.get("set-cookie")?.split(";")[0];
      const response = await fetch(`${baseUrl}/api/npc/admin/canon`, { headers: { Cookie: cookie ?? "" } });
      expect(response.status).toBe(200);
      await fetch(`${baseUrl}/api/npc/admin/canon/mira-baker`, { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: cookie ?? "" }, body: JSON.stringify({ canonExcerpt: "Updated canon excerpt", isActive: false }) });
      expect(updateNpcCanonForAdmin).toHaveBeenCalledWith("mira-baker", { canonExcerpt: "Updated canon excerpt", isActive: false });
      expect(recordNpcAdminAudit).toHaveBeenCalledWith("update", "canon", "mira-baker", ["canonExcerpt", "isActive"]);
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
