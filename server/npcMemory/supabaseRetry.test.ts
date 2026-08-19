import { afterEach, describe, expect, it, vi } from "vitest";
import { listNpcCanonSourcesForAdmin, setNpcCanonActive } from "./supabase";

const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  process.env.SUPABASE_URL = originalUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
});

function configureGateway() {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
}

describe("Supabase NPC gateway retry policy", () => {
  it("retries one idempotent admin read after a transient 401", async () => {
    configureGateway();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ npc_id: "luna001", display_name: "Luna", obsidian_path: "NPCs/luna001.md", canon_hash: null, canon_excerpt: "Aware.", is_active: true, updated_at: "2026-08-19T00:00:00Z" }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listNpcCanonSourcesForAdmin()).resolves.toMatchObject([{ npcId: "luna001", displayName: "Luna" }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not replay an administrator write after a 401", async () => {
    configureGateway();
    const fetchMock = vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(setNpcCanonActive("luna001", true)).rejects.toThrow("(401)");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
