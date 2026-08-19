import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

const { createApp } = await import("../app");

describe("configured GitHub canon webhook secret", () => {
  it("accepts a correctly signed lightweight ping event", async () => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    expect(secret?.trim().length).toBeGreaterThanOrEqual(32);
    const payload = JSON.stringify({ zen: "SenotaAI verification ping" });
    const signature = `sha256=${createHmac("sha256", secret!).update(payload).digest("hex")}`;
    const app = createApp();
    const server = app.listen(0);
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
    try {
      const response = await fetch(`${baseUrl}/api/npc/canon/github-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-github-event": "ping", "x-hub-signature-256": signature },
        body: payload,
      });
      expect(response.status).toBe(200);
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
