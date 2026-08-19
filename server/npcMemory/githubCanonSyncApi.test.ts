import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";

const syncObsidianNpcCanon = vi.fn();
const recordNpcAdminAudit = vi.fn();
vi.mock("./obsidianSync", () => ({ syncObsidianNpcCanon }));
vi.mock("./adminAudit", () => ({ recordNpcAdminAudit }));

const { createApp } = await import("../app");

describe("GitHub canon synchronization webhook", () => {
  const priorSecret = process.env.GITHUB_WEBHOOK_SECRET;
  const priorToken = process.env.GITHUB_TOKEN;
  const priorCanonToken = process.env.NPC_CANON_GITHUB_TOKEN;
  const nativeFetch = globalThis.fetch;
  beforeEach(() => {
    process.env.GITHUB_WEBHOOK_SECRET = "test-webhook-secret-with-safe-length";
    process.env.GITHUB_TOKEN = "test-github-token";
    delete process.env.NPC_CANON_GITHUB_TOKEN;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith("https://api.github.com/")) return new Response(JSON.stringify({ encoding: "base64", content: Buffer.from("---\nnpc_id: mira-baker\ndisplay_name: Mira Vale\n---\n\n## Runtime excerpt\nWarm and practical.").toString("base64") }), { status: 200 });
      return nativeFetch(input, init);
    }));
    syncObsidianNpcCanon.mockResolvedValue({ npcId: "mira-baker", displayName: "Mira Vale" });
  });
  afterEach(() => {
    process.env.GITHUB_WEBHOOK_SECRET = priorSecret;
    process.env.GITHUB_TOKEN = priorToken;
    if (priorCanonToken) process.env.NPC_CANON_GITHUB_TOKEN = priorCanonToken;
    else delete process.env.NPC_CANON_GITHUB_TOKEN;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("rejects unsigned deliveries and imports only changed NPC Markdown from the configured private vault", async () => {
    process.env.NPC_CANON_GITHUB_TOKEN = "dedicated-vault-read-token";
    const payload = JSON.stringify({ ref: "refs/heads/main", after: "abc123", repository: { full_name: "najierwilliams/SenotaAI-NPC-Canon" }, commits: [{ modified: ["NPCs/mira.md", "README.md"], removed: ["NPCs/old.md"] }] });
    const signature = `sha256=${createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET!).update(payload).digest("hex")}`;
    const app = createApp();
    const server = app.listen(0);
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
    try {
      expect((await fetch(`${baseUrl}/api/npc/canon/github-webhook`, { method: "POST", headers: { "Content-Type": "application/json", "x-github-event": "push" }, body: payload })).status).toBe(401);
      const response = await fetch(`${baseUrl}/api/npc/canon/github-webhook`, { method: "POST", headers: { "Content-Type": "application/json", "x-github-event": "push", "x-hub-signature-256": signature }, body: payload });
      expect(response.status).toBe(202);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/contents/NPCs/mira.md?ref=abc123"), expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer dedicated-vault-read-token" }) }));
      expect(syncObsidianNpcCanon).toHaveBeenCalledWith(expect.stringContaining("npc_id: mira-baker"), "NPCs/mira.md");
      expect(recordNpcAdminAudit).toHaveBeenCalledWith("github-sync", "canon", "mira-baker", ["canonHash", "canonExcerpt", "obsidianPath"]);
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
