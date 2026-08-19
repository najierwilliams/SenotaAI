import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chatWithOllama = vi.fn();
const recordNpcAdminAudit = vi.fn();
vi.mock("../agent/ollama", () => ({ chatWithOllama }));
vi.mock("./adminAudit", () => ({ recordNpcAdminAudit }));

const { analyzeNpcCanonConflicts, createNpcCanonDraft, publishNpcCanonDraft, validateNpcCanonDraft } = await import("./canonDrafts");

const draftNote = `<!-- SenotaAI draft summary: Adds a cautious bond with the town archivist. -->
---
npc_id: mira-vale
display_name: Mira Vale
role: village-baker
canon_version: 1
---

# Mira Vale

## Personality
Warm, practical, and careful with unfamiliar visitors.

## Runtime excerpt
Mira is a practical village baker who values trust and keeps the archivist's confidence.`;

function response(ok: boolean, payload: unknown, status = ok ? 200 : 404) {
  return { ok, status, json: async () => payload };
}

beforeEach(() => {
  process.env.NPC_CANON_WRITE_TOKEN = "test-token";
  process.env.GITHUB_CANON_REPOSITORY = "najierwilliams/SenotaAI-NPC-Canon";
  vi.stubGlobal("fetch", vi.fn());
  chatWithOllama.mockReset();
  recordNpcAdminAudit.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GITHUB_CANON_REPOSITORY;
});

describe("reviewable NPC canon drafts", () => {
  it("rejects an incomplete edited note before a publish can be attempted", () => {
    expect(() => validateNpcCanonDraft({
      npcId: "mira-vale",
      displayName: "Mira Vale",
      noteContent: "---\nnpc_id: mira-vale\ndisplay_name: Mira Vale\n---\n\n# Mira Vale\n\n## Runtime excerpt\n",
    })).toThrow("meaningful Runtime excerpt or canon body");
  });

  it("generates a valid reviewable Obsidian note without publishing it", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(response(false, { message: "Not Found" }) as never);
    chatWithOllama.mockResolvedValueOnce({ content: draftNote });

    const draft = await createNpcCanonDraft({ npcId: "mira-vale", displayName: "Mira Vale", request: "Add that she trusts the town archivist." });

    expect(draft).toMatchObject({ npcId: "mira-vale", displayName: "Mira Vale", path: "NPCs/mira-vale.md", sourceSha: null });
    expect(draft.noteContent).toContain("## Runtime excerpt");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(chatWithOllama).toHaveBeenCalledTimes(1);
  });

  it("returns structured direct lore conflicts", async () => {
    chatWithOllama.mockResolvedValueOnce({ content: JSON.stringify({ conflicts: [{ severity: "blocking", existingClaim: "Mira is a baker.", proposedClaim: "Mira has never baked.", rationale: "The occupation claims cannot both be true." }] }) });
    await expect(analyzeNpcCanonConflicts("# Mira\nMira is a baker.", "# Mira\nMira has never baked.")).resolves.toMatchObject([{ severity: "blocking", existingClaim: "Mira is a baker." }]);
  });

  it("refuses a blocking conflict until the administrator explicitly overrides it", async () => {
    const existing = Buffer.from(draftNote.replace(/^<!--[\s\S]*?-->\n/, "")).toString("base64");
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(response(true, { encoding: "base64", content: existing, sha: "current-sha" }) as never);
    chatWithOllama.mockResolvedValueOnce({ content: JSON.stringify({ conflicts: [{ severity: "blocking", existingClaim: "Mira is a baker.", proposedClaim: "Mira has never baked.", rationale: "Direct contradiction." }] }) });
    await expect(publishNpcCanonDraft({ npcId: "mira-vale", displayName: "Mira Vale", noteContent: draftNote.replace(/^<!--[\s\S]*?-->\n/, ""), sourceSha: "current-sha" })).rejects.toThrow("explicit override");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("publishes only the reviewed note after checking the source version", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(response(false, { message: "Not Found" }) as never)
      .mockResolvedValueOnce(response(true, { commit: { sha: "commit-sha" }, content: { path: "NPCs/mira-vale.md" } }) as never);

    const result = await publishNpcCanonDraft({ npcId: "mira-vale", displayName: "Mira Vale", noteContent: draftNote.replace(/^<!--[^\n]*-->\n/, ""), sourceSha: null });

    expect(result).toMatchObject({ ok: true, npcId: "mira-vale", commitSha: "commit-sha" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, writeRequest] = fetchMock.mock.calls[1] ?? [];
    expect(writeRequest).toMatchObject({ method: "PUT" });
    expect(recordNpcAdminAudit).toHaveBeenCalledWith("website-canon-publish", "canon", "mira-vale", expect.any(Array));
  });

  it("refuses to publish a stale reviewed draft", async () => {
    const existing = Buffer.from(draftNote.replace(/^<!--[^\n]*-->\n/, "")).toString("base64");
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(response(true, { encoding: "base64", content: existing, sha: "new-sha" }) as never);

    await expect(publishNpcCanonDraft({ npcId: "mira-vale", displayName: "Mira Vale", noteContent: draftNote.replace(/^<!--[^\n]*-->\n/, ""), sourceSha: "old-sha" }))
      .rejects.toThrow("changed in the vault");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
