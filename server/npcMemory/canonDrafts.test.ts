import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chatWithOllama = vi.fn();
const recordNpcAdminAudit = vi.fn();
vi.mock("../agent/ollama", () => ({ chatWithOllama }));
vi.mock("./adminAudit", () => ({ recordNpcAdminAudit }));

const { analyzeNpcCanonConflicts, applyApprovedCanonAddition, applyApprovedCanonConflictReplacement, createNpcCanonDraft, listNpcCanonTargets, publishNpcCanonDraft, validateNpcCanonDraft } = await import("./canonDrafts");

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

  it("falls back to a valid review note when the model omits required Obsidian frontmatter", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(response(false, { message: "Not Found" }) as never);
    chatWithOllama.mockResolvedValueOnce({ content: "Senota Replacement Test has a blue lantern." });

    const draft = await createNpcCanonDraft({ npcId: "senota-replacement-test", displayName: "Senota Replacement Test", request: "The test NPC has a blue lantern." });

    expect(draft.summary).toContain("Creates a structured review draft");
    expect(draft.noteContent).toContain("npc_id: senota-replacement-test");
    expect(draft.noteContent).toContain("## Runtime excerpt");
  });

  it("returns structured direct lore conflicts", async () => {
    chatWithOllama.mockResolvedValueOnce({ content: JSON.stringify({ conflicts: [{ severity: "blocking", existingClaim: "Mira is a baker.", proposedClaim: "Mira has never baked.", rationale: "The occupation claims cannot both be true." }] }) });
    await expect(analyzeNpcCanonConflicts("# Mira\nMira is a baker.", "# Mira\nMira has never baked.")).resolves.toMatchObject([{ severity: "blocking", existingClaim: "Mira is a baker." }]);
  });

  it("lists validated private-vault NPC targets while omitting the vault template", async () => {
    const lunaNote = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n# Luna\n\n## Runtime excerpt\nLuna exists in the world and can remember meaningful events.";
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(response(true, [{ type: "file", path: "NPCs/luna001.md" }, { type: "file", path: "NPCs/_template.md" }]) as never)
      .mockResolvedValueOnce(response(true, { encoding: "base64", content: Buffer.from(lunaNote).toString("base64"), sha: "luna-sha" }) as never);

    await expect(listNpcCanonTargets()).resolves.toEqual([{ npcId: "luna001", displayName: "Luna", path: "NPCs/luna001.md" }]);
  });

  it("replaces only the approved conflicting claim while retaining unrelated canon", () => {
    const existing = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n# Luna\n\n## Personality\n- She is observant.\n- I have a body.\n- She keeps the archivist's confidence.\n\n## Runtime excerpt\nLuna exists and speaks with care.";
    const proposed = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n# Luna\n\n## Runtime excerpt\nLuna does not have a body and communicates through light.";
    const result = applyApprovedCanonConflictReplacement(existing, proposed, [{ severity: "blocking", existingClaim: "I have a body.", replacementAnchor: "- I have a body.", proposedClaim: "I do not have a body.", rationale: "Direct body-state contradiction." }]);

    expect(result.removedClaims).toEqual(["I have a body."]);
    expect(result.noteContent).not.toContain("I have a body.");
    expect(result.noteContent).toContain("She keeps the archivist's confidence.");
    expect(result.noteContent).toContain("I do not have a body.");
    expect(() => validateNpcCanonDraft({ npcId: "luna001", displayName: "Luna", noteContent: result.noteContent })).not.toThrow();
  });

  it("adds a later personality note without replacing earlier approved Luna canon", () => {
    const existing = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n# Luna\n\n## Runtime excerpt\nLuna speaks with quiet warmth.\n\n## Voice Tone\n- Grounded and emotionally aware.";
    const proposed = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n# Luna\n\n## Runtime excerpt\nLuna gives direct answers.\n\n## Conversational Style\n- Use short natural sentences for simple questions.";
    const result = applyApprovedCanonAddition(existing, proposed);

    expect(result.noteContent).toContain("Luna speaks with quiet warmth.");
    expect(result.noteContent).toContain("Grounded and emotionally aware.");
    expect(result.noteContent).toContain("Luna gives direct answers.");
    expect(result.noteContent).toContain("Use short natural sentences for simple questions.");
    expect(result.noteContent.match(/## SenotaAI approved updates/g)).toHaveLength(1);
  });

  it("refuses an approved automatic replacement when the conflict lacks a verified exact anchor", () => {
    const existing = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n## Runtime excerpt\nLuna has a body and safeguards the archive.";
    const proposed = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n## Runtime excerpt\nLuna does not have a body.";
    expect(() => applyApprovedCanonConflictReplacement(existing, proposed, [{ severity: "blocking", existingClaim: "Luna has a body.", replacementAnchor: null, proposedClaim: "Luna does not have a body.", rationale: "Direct contradiction." }])).toThrow("could not verify an exact existing canon line");
  });

  it("writes the claim-level replacement instead of overwriting unrelated existing canon", async () => {
    const existingNote = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n# Luna\n\n## Personality\n- Luna is observant.\n- Luna has a body.\n- Luna protects the town archive.\n\n## Runtime excerpt\nLuna is observant and protects the town archive.";
    const proposedNote = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n# Luna\n\n## Runtime excerpt\nLuna does not have a body and communicates through light.";
    const fetchMock = vi.mocked(fetch);
    const expectedReplacement = applyApprovedCanonConflictReplacement(existingNote, proposedNote, [{ severity: "blocking", existingClaim: "Luna has a body.", replacementAnchor: "- Luna has a body.", proposedClaim: "Luna does not have a body.", rationale: "Direct body-state contradiction." }]);
    fetchMock
      .mockResolvedValueOnce(response(true, { encoding: "base64", content: Buffer.from(existingNote).toString("base64"), sha: "current-sha" }) as never)
      .mockResolvedValueOnce(response(true, { commit: { sha: "replacement-sha" }, content: { path: "NPCs/luna001.md" } }) as never)
      .mockResolvedValueOnce(response(true, { encoding: "base64", content: Buffer.from(expectedReplacement.noteContent).toString("base64"), sha: "replacement-content-sha" }) as never);
    chatWithOllama.mockResolvedValueOnce({ content: JSON.stringify({ conflicts: [{ severity: "blocking", existingClaim: "Luna has a body.", proposedClaim: "Luna does not have a body.", rationale: "Direct body-state contradiction." }] }) });

    await publishNpcCanonDraft({ npcId: "luna001", displayName: "Luna", noteContent: proposedNote, sourceSha: "current-sha", conflictOverride: true });

    const [, writeRequest] = fetchMock.mock.calls[1] ?? [];
    const payload = JSON.parse(String(writeRequest?.body));
    const writtenNote = Buffer.from(payload.content, "base64").toString("utf8");
    expect(writtenNote).not.toContain("Luna has a body.");
    expect(writtenNote).toContain("Luna protects the town archive.");
    expect(writtenNote).toContain("Luna does not have a body.");
  });

  it("uses the exact reviewed blocking conflict when the later detector does not reproduce it", async () => {
    const existingNote = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n## Runtime excerpt\n- Luna has a blue lantern.\n- Luna protects a quiet archive.";
    const proposedNote = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n## Runtime excerpt\n- Luna protects a quiet archive.";
    const expectedReplacement = applyApprovedCanonConflictReplacement(existingNote, proposedNote, [{ severity: "blocking", existingClaim: "Luna has a blue lantern.", replacementAnchor: "- Luna has a blue lantern.", proposedClaim: "Luna has a green lantern.", rationale: "Lantern color conflict." }]);
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(response(true, { encoding: "base64", content: Buffer.from(existingNote).toString("base64"), sha: "current-sha" }) as never)
      .mockResolvedValueOnce(response(true, { commit: { sha: "reviewed-conflict-sha" }, content: { path: "NPCs/luna001.md" } }) as never)
      .mockResolvedValueOnce(response(true, { encoding: "base64", content: Buffer.from(expectedReplacement.noteContent).toString("base64"), sha: "verified-sha" }) as never);
    chatWithOllama.mockResolvedValueOnce({ content: JSON.stringify({ conflicts: [] }) });

    const result = await publishNpcCanonDraft({ npcId: "luna001", displayName: "Luna", noteContent: proposedNote, sourceSha: "current-sha", conflictOverride: true, reviewedConflicts: [{ severity: "blocking", existingClaim: "Luna has a blue lantern.", replacementAnchor: "- Luna has a blue lantern.", proposedClaim: "Luna has a green lantern.", rationale: "Lantern color conflict." }] });

    expect(result.replacedClaims).toEqual(["Luna has a blue lantern."]);
    const [, writeRequest] = fetchMock.mock.calls[1] ?? [];
    expect(Buffer.from(JSON.parse(String(writeRequest?.body)).content, "base64").toString("utf8")).toContain("Luna has a green lantern.");
  });

  it("deduplicates repeated existing and proposed bullet claims without double-prefixing the replacement", () => {
    const existing = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n## Runtime excerpt\n- Luna has a blue lantern.\n- Luna protects a quiet archive.\n- Luna protects a quiet archive.";
    const proposed = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n## Runtime excerpt\n- Luna has a green lantern.\n- Luna protects a quiet archive.\n- Luna protects a quiet archive.";
    const result = applyApprovedCanonConflictReplacement(existing, proposed, [{ severity: "blocking", existingClaim: "Luna has a blue lantern.", replacementAnchor: "- Luna has a blue lantern.", proposedClaim: "- Luna has a green lantern.", rationale: "Lantern color conflict." }]);

    expect(result.noteContent).not.toContain("blue lantern");
    expect(result.noteContent.match(/Luna protects a quiet archive\./g)).toHaveLength(1);
    expect(result.noteContent.match(/Luna has a green lantern\./g)).toHaveLength(1);
    expect(result.noteContent).not.toContain("- - Luna has a green lantern.");
  });

  it("consolidates repeated approved-update sections while replacing a nested-bullet claim", () => {
    const existing = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n## Runtime excerpt\n- Luna protects a quiet archive.\n- Luna protects a quiet archive.\n\n## SenotaAI approved updates\n- - Luna has a green lantern.\n\n## SenotaAI approved updates\n- Luna has a green lantern.";
    const proposed = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n## Runtime excerpt\n- Luna has a red lantern.\n- Luna protects a quiet archive.";
    const result = applyApprovedCanonConflictReplacement(existing, proposed, [{ severity: "blocking", existingClaim: "Luna has a green lantern.", replacementAnchor: "- - Luna has a green lantern.", proposedClaim: "Luna has a red lantern.", rationale: "Lantern color conflict." }]);

    expect(result.noteContent.match(/## SenotaAI approved updates/g)).toHaveLength(1);
    expect(result.noteContent.match(/Luna protects a quiet archive\./g)).toHaveLength(1);
    expect(result.noteContent.match(/Luna has a red lantern\./g)).toHaveLength(1);
    expect(result.noteContent).not.toContain("green lantern");
    expect(result.noteContent).not.toContain("- - ");
  });

  it("fails safely rather than writing an incomplete replacement when the proposed claim cannot be retained", () => {
    const existing = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n## Runtime excerpt\n- Luna has a blue lantern.";
    const proposed = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n## Runtime excerpt\nLuna protects the archive.";
    expect(() => applyApprovedCanonConflictReplacement(existing, proposed, [{ severity: "blocking", existingClaim: "Luna has a blue lantern.", replacementAnchor: "- Luna has a blue lantern.", proposedClaim: "", rationale: "Lantern color conflict." }])).toThrow("could not safely canonicalize");
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
    const reviewedNote = draftNote.replace(/^<!--[\s\S]*?-->\n/, "");
    fetchMock
      .mockResolvedValueOnce(response(false, { message: "Not Found" }) as never)
      .mockResolvedValueOnce(response(true, { commit: { sha: "commit-sha" }, content: { path: "NPCs/mira-vale.md" } }) as never)
      .mockResolvedValueOnce(response(true, { encoding: "base64", content: Buffer.from(reviewedNote).toString("base64"), sha: "committed-content-sha" }) as never);

    const result = await publishNpcCanonDraft({ npcId: "mira-vale", displayName: "Mira Vale", noteContent: reviewedNote, sourceSha: null });

    expect(result).toMatchObject({ ok: true, npcId: "mira-vale", commitSha: "commit-sha" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [, writeRequest] = fetchMock.mock.calls[1] ?? [];
    expect(writeRequest).toMatchObject({ method: "PUT" });
    expect(recordNpcAdminAudit).toHaveBeenCalledWith("website-canon-publish", "canon", "mira-vale", expect.any(Array));
  });

  it("merges a later non-conflicting personality addition into the current vault note", async () => {
    const existingNote = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n## Runtime excerpt\nLuna speaks with quiet warmth.";
    const proposedNote = "---\nnpc_id: luna001\ndisplay_name: Luna\n---\n\n## Runtime excerpt\nLuna answers simple questions directly.";
    const expected = applyApprovedCanonAddition(existingNote, proposedNote);
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(response(true, { encoding: "base64", content: Buffer.from(existingNote).toString("base64"), sha: "current-sha" }) as never)
      .mockResolvedValueOnce(response(true, { commit: { sha: "merged-sha" }, content: { path: "NPCs/luna001.md" } }) as never)
      .mockResolvedValueOnce(response(true, { encoding: "base64", content: Buffer.from(expected.noteContent).toString("base64"), sha: "merged-content-sha" }) as never);
    chatWithOllama.mockResolvedValueOnce({ content: JSON.stringify({ conflicts: [] }) });

    await publishNpcCanonDraft({ npcId: "luna001", displayName: "Luna", noteContent: proposedNote, sourceSha: "current-sha" });

    const [, writeRequest] = fetchMock.mock.calls[1] ?? [];
    const writtenNote = Buffer.from(JSON.parse(String(writeRequest?.body)).content, "base64").toString("utf8");
    expect(writtenNote).toContain("Luna speaks with quiet warmth.");
    expect(writtenNote).toContain("Luna answers simple questions directly.");
  });

  it("does not report publish success when GitHub returns content that differs from the reviewed note", async () => {
    const fetchMock = vi.mocked(fetch);
    const reviewedNote = draftNote.replace(/^<!--[\s\S]*?-->\n/, "");
    fetchMock
      .mockResolvedValueOnce(response(false, { message: "Not Found" }) as never)
      .mockResolvedValueOnce(response(true, { commit: { sha: "commit-sha" }, content: { path: "NPCs/mira-vale.md" } }) as never)
      .mockResolvedValueOnce(response(true, { encoding: "base64", content: Buffer.from("---\nnpc_id: mira-vale\ndisplay_name: Mira Vale\n---\n\n## Runtime excerpt\nStale content.").toString("base64"), sha: "mismatch-sha" }) as never);

    await expect(publishNpcCanonDraft({ npcId: "mira-vale", displayName: "Mira Vale", noteContent: reviewedNote, sourceSha: null })).rejects.toThrow("did not preserve the reviewed canon content exactly");
    expect(recordNpcAdminAudit).not.toHaveBeenCalled();
  });

  it("refuses to publish a stale reviewed draft", async () => {
    const existing = Buffer.from(draftNote.replace(/^<!--[\s\S]*?-->\n/, "")).toString("base64");
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(response(true, { encoding: "base64", content: existing, sha: "new-sha" }) as never);

    await expect(publishNpcCanonDraft({ npcId: "mira-vale", displayName: "Mira Vale", noteContent: draftNote.replace(/^<!--[\s\S]*?-->\n/, ""), sourceSha: "old-sha" }))
      .rejects.toThrow("changed in the vault");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
