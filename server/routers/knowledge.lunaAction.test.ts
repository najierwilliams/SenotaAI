import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validOwnerSession: vi.fn(),
  assessAndDispatch: vi.fn(),
  getSnapshot: vi.fn(),
  updateGap: vi.fn(),
}));

vi.mock("../knowledgeSpace/ownerAuth", () => ({
  KNOWLEDGE_OWNER_COOKIE: "senota_knowledge_owner",
  KNOWLEDGE_OWNER_ID: 1,
  createKnowledgeOwnerSession: vi.fn(),
  isKnowledgeOwnerConfigured: vi.fn(),
  isValidKnowledgeOwnerPassword: vi.fn(),
  isValidKnowledgeOwnerSession: mocks.validOwnerSession,
  readKnowledgeCookie: (cookie: string | undefined) => cookie || null,
}));

vi.mock("../luna/cognitiveActionService", () => ({
  assessAndDispatchLunaCognitiveAction: mocks.assessAndDispatch,
}));

vi.mock("../luna/supabase", () => ({
  getLunaCognitiveSnapshot: mocks.getSnapshot,
  updateLunaKnowledgeGap: mocks.updateGap,
}));

import { knowledgeRouter } from "./knowledge";

function caller(cookie = "") {
  return knowledgeRouter.createCaller({
    req: { header: (name: string) => name === "cookie" ? cookie : undefined },
    res: {},
  } as never);
}

describe("Milestone 5 owner-gated cognitive action endpoints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unauthenticated autonomous assessment before reading or dispatching cognitive state", async () => {
    mocks.validOwnerSession.mockResolvedValue(false);

    await expect(caller().cognitive.action.assessAndDispatch()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.assessAndDispatch).not.toHaveBeenCalled();
  });

  it("rejects arbitrary high-impact language instead of treating it as an action instruction", async () => {
    mocks.validOwnerSession.mockResolvedValue(true);

    await expect(caller("senota_knowledge_owner=session").cognitive.action.command({
      message: "transfer money and delete every account",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.assessAndDispatch).not.toHaveBeenCalled();
  });

  it("accepts only a constrained owner trigger and does not pass command text into mission planning", async () => {
    mocks.validOwnerSession.mockResolvedValue(true);
    mocks.assessAndDispatch.mockResolvedValue({ accepted: false, reason: "No persisted eligible high-priority knowledge-gap candidate is available." });

    await expect(caller("senota_knowledge_owner=session").cognitive.action.command({
      message: "assess the next cognitive knowledge gap",
    })).resolves.toMatchObject({ accepted: false });
    expect(mocks.assessAndDispatch).toHaveBeenCalledWith({ userId: 1 });
  });

  it("dismisses only the explicitly labelled temporary acceptance condition through the existing audited gap lifecycle", async () => {
    mocks.validOwnerSession.mockResolvedValue(true);
    mocks.getSnapshot.mockResolvedValue({ knowledgeGaps: [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", status: "WATCHING", provenance: { method: "MILESTONE_5_USER_ACCEPTANCE_TEST" } }] });
    mocks.updateGap.mockResolvedValue({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", status: "DISMISSED" });

    await expect(caller("senota_knowledge_owner=session").cognitive.attention.gap.dismissTemporaryAcceptance({
      gapId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    })).resolves.toMatchObject({ status: "DISMISSED" });
    expect(mocks.updateGap).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, status: "DISMISSED", actor: "knowledge-owner" }));
  });

  it("refuses the temporary-condition dismissal endpoint for ordinary or scientific records", async () => {
    mocks.validOwnerSession.mockResolvedValue(true);
    mocks.getSnapshot.mockResolvedValue({ knowledgeGaps: [{ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", status: "OPEN", provenance: { method: "OTHER" } }] });

    await expect(caller("senota_knowledge_owner=session").cognitive.attention.gap.dismissTemporaryAcceptance({
      gapId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.updateGap).not.toHaveBeenCalled();
  });
});
