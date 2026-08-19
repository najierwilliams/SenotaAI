import { afterEach, describe, expect, it } from "vitest";

const { createApp } = await import("../app");

describe("NPC administrator session API", () => {
  afterEach(() => {
    // Routes are fully stateless; no shared cleanup is necessary.
  });

  it("accepts only the configured administrator password and issues an HTTP-only session", async () => {
    expect(process.env.NPC_ADMIN_PASSWORD?.trim().length).toBeGreaterThanOrEqual(16);
    const app = createApp();
    const server = app.listen(0);
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
    try {
      const rejected = await fetch(`${baseUrl}/api/npc/admin/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "incorrect-admin-password" }),
      });
      expect(rejected.status).toBe(401);

      const accepted = await fetch(`${baseUrl}/api/npc/admin/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: process.env.NPC_ADMIN_PASSWORD }),
      });
      expect(accepted.status).toBe(200);
      expect(accepted.headers.get("set-cookie")).toContain("senota_npc_admin=");
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
