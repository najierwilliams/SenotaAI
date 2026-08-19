import { afterEach, describe, expect, it, vi } from "vitest";
import { getNpcAdminStatus } from "./NpcAdmin";

afterEach(() => vi.unstubAllGlobals());

describe("NPC administrator status", () => {
  it("preserves the configured flag from the expected unauthenticated response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ configured: true, authenticated: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getNpcAdminStatus()).resolves.toEqual({ configured: true, authenticated: false });
    expect(fetchMock).toHaveBeenCalledWith("/api/npc/admin/status", { credentials: "include" });
  });

  it("rejects unexpected status responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: "unavailable" }) }));
    await expect(getNpcAdminStatus()).rejects.toThrow("unavailable");
  });
});
