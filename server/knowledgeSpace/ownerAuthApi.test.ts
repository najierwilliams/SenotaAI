import { afterAll, beforeAll, describe, expect, it } from "vitest";

const { createApp } = await import("../app");

const originalNpcAdminPassword = process.env.NPC_ADMIN_PASSWORD;
const originalJwtSecret = process.env.JWT_SECRET;

beforeAll(() => {
  process.env.NPC_ADMIN_PASSWORD ||= "knowledge-space-test-administrator-password";
  process.env.JWT_SECRET ||= "knowledge-space-test-jwt-signing-secret";
});

afterAll(() => {
  if (originalNpcAdminPassword === undefined) delete process.env.NPC_ADMIN_PASSWORD;
  else process.env.NPC_ADMIN_PASSWORD = originalNpcAdminPassword;
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

describe("Knowledge Space owner session API", () => {
  it("verifies the existing administrator password but issues an isolated knowledge-only session", async () => {
    expect(process.env.NPC_ADMIN_PASSWORD?.trim().length).toBeGreaterThanOrEqual(16);
    expect(process.env.JWT_SECRET?.trim().length).toBeGreaterThanOrEqual(16);
    const app = createApp();
    const server = app.listen(0);
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
    try {
      const rejected = await fetch(`${baseUrl}/api/knowledge/owner/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "not-the-administrator-password" }),
      });
      expect(rejected.status).toBe(401);

      const accepted = await fetch(`${baseUrl}/api/knowledge/owner/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: process.env.NPC_ADMIN_PASSWORD }),
      });
      expect(accepted.status).toBe(200);
      const cookie = accepted.headers.get("set-cookie") ?? "";
      expect(cookie).toContain("senota_knowledge_owner=");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).not.toContain("senota_npc_admin=");

      const status = await fetch(`${baseUrl}/api/knowledge/owner/status`, { headers: { cookie } });
      expect(status.status).toBe(200);
      await expect(status.json()).resolves.toMatchObject({ configured: true, authenticated: true });
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
