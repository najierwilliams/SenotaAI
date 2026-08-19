import { describe, expect, it, vi } from "vitest";

const { isValidNpcAdminSession, createNpcCanonDraft, publishNpcCanonDraft, validateNpcCanonDraft, isNpcCanonPublishingConfigured } = vi.hoisted(() => ({
  isValidNpcAdminSession: vi.fn(),
  createNpcCanonDraft: vi.fn(),
  publishNpcCanonDraft: vi.fn(),
  validateNpcCanonDraft: vi.fn(),
  isNpcCanonPublishingConfigured: vi.fn(),
}));

vi.mock("../npcMemory/adminAuth", () => ({ NPC_ADMIN_COOKIE: "senota_npc_admin", isValidNpcAdminSession }));
vi.mock("../npcMemory/canonDrafts", () => ({ createNpcCanonDraft, publishNpcCanonDraft, validateNpcCanonDraft, isNpcCanonPublishingConfigured }));

const { agentRouter } = await import("./agent");

function caller(cookie = "") {
  return agentRouter.createCaller({ user: null, req: { headers: { cookie } } } as never);
}

describe("direct-chat canon drafting authorization", () => {
  it("rejects public visitors before draft generation or publishing", async () => {
    isValidNpcAdminSession.mockResolvedValue(false);
    await expect(caller().canon.draft({ npcId: "mira-vale", displayName: "Mira Vale", request: "Add a relationship with the archivist." }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(createNpcCanonDraft).not.toHaveBeenCalled();
  });

  it("allows an unlocked administrator to generate a reviewable draft but does not publish it", async () => {
    isValidNpcAdminSession.mockResolvedValue(true);
    isNpcCanonPublishingConfigured.mockReturnValue(true);
    createNpcCanonDraft.mockResolvedValue({ npcId: "mira-vale", displayName: "Mira Vale", path: "NPCs/mira-vale.md", noteContent: "---\nnpc_id: mira-vale\ndisplay_name: Mira Vale\n---\n\n## Runtime excerpt\nMira knows the archivist.", summary: "Adds a relationship.", sourceSha: null, excerptLength: 30 });

    await expect(caller("senota_npc_admin=session").canon.draft({ npcId: "mira-vale", displayName: "Mira Vale", request: "Add a relationship with the archivist." }))
      .resolves.toMatchObject({ path: "NPCs/mira-vale.md", summary: "Adds a relationship." });
    expect(publishNpcCanonDraft).not.toHaveBeenCalled();
  });

  it("allows only an unlocked administrator to validate an edited note before publishing", async () => {
    isValidNpcAdminSession.mockResolvedValue(true);
    validateNpcCanonDraft.mockReturnValue({ npcId: "mira-vale", displayName: "Mira Vale", canonExcerpt: "Mira knows the archivist." });

    await expect(caller("senota_npc_admin=session").canon.validate({ npcId: "mira-vale", displayName: "Mira Vale", noteContent: "---\nnpc_id: mira-vale\ndisplay_name: Mira Vale\n---\n\n## Runtime excerpt\nMira knows the archivist." }))
      .resolves.toMatchObject({ valid: true, excerptLength: 25 });
    expect(publishNpcCanonDraft).not.toHaveBeenCalled();
  });
});
