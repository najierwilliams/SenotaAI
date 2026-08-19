import { describe, expect, it } from "vitest";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe("Supabase NPC memory connection", () => {
  it("can reach the protected NPC canon table using the server-only credential", async () => {
    expect(supabaseUrl).toMatch(/^https:\/\/[a-z0-9-]+\.supabase\.co$/i);
    expect(serviceRoleKey).toBeTruthy();

    const response = await fetch(`${supabaseUrl}/rest/v1/npc_canon_sources?select=npc_id&limit=1`, {
      headers: {
        apikey: serviceRoleKey!,
        Authorization: `Bearer ${serviceRoleKey!}`,
      },
    });

    expect(response.ok).toBe(true);
    await expect(response.json()).resolves.toEqual(expect.any(Array));
  }, 20_000);
});
