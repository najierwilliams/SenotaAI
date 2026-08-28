import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validOwnerSession: vi.fn(),
  ingest: vi.fn(),
  ingestWorld: vi.fn(),
  maintenance: vi.fn(),
  retireFixture: vi.fn(),
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

vi.mock("../luna/preGameCognitiveService", () => ({
  ingestLunaCognitiveInput: mocks.ingest,
  ingestLunaWorldEvent: mocks.ingestWorld,
  runLunaCognitiveMaintenance: mocks.maintenance,
}));

vi.mock("../luna/supabase", async importOriginal => ({
  ...await importOriginal<typeof import("../luna/supabase")>(),
  retireLunaPreGameAcceptanceFixture: mocks.retireFixture,
}));

import { knowledgeRouter } from "./knowledge";

function caller(cookie = "") {
  return knowledgeRouter.createCaller({
    req: { header: (name: string) => name === "cookie" ? cookie : undefined },
    res: {},
  } as never);
}

describe("pre-game Luna cognitive owner APIs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects cognitive input ingestion before service access without the owner session", async () => {
    mocks.validOwnerSession.mockResolvedValue(false);
    await expect(caller().cognitive.preGame.input.ingest({ inputType: "OWNER_NOTE", content: "Retain this bounded owner note." })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.ingest).not.toHaveBeenCalled();
  });

  it("uses the bounded cognitive service for an authorized source input rather than exposing persistence directly", async () => {
    mocks.validOwnerSession.mockResolvedValue(true);
    mocks.ingest.mockResolvedValue({ created: true, input: { id: "input-1" } });
    await expect(caller("senota_knowledge_owner=session").cognitive.preGame.input.ingest({ inputType: "USER_CORRECTION", content: "Correction: the previous owner note is incomplete.", correctionTarget: { type: "MEMORY", id: "11111111-1111-4111-8111-111111111111" } })).resolves.toMatchObject({ created: true });
    expect(mocks.ingest).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, inputType: "USER_CORRECTION", actor: "knowledge-owner", correctionTarget: { type: "MEMORY", id: "11111111-1111-4111-8111-111111111111" } }));
  });

  it("accepts a neutral world-event payload only through the bounded world adapter service", async () => {
    mocks.validOwnerSession.mockResolvedValue(true);
    mocks.ingestWorld.mockResolvedValue({ worldEventCreated: true, worldEvent: { id: "world-1" } });
    await expect(caller("senota_knowledge_owner=session").cognitive.preGame.world.ingest({ sourceKey: "adapter:event:0001", eventType: "OBSERVATION", summary: "A neutral world observation is available." })).resolves.toMatchObject({ worldEventCreated: true });
    expect(mocks.ingestWorld).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, actor: "knowledge-owner", event: expect.objectContaining({ eventType: "OBSERVATION" }) }));
  });

  it("keeps maintenance owner-gated and sends no user-controlled objective or external action instruction", async () => {
    mocks.validOwnerSession.mockResolvedValue(true);
    mocks.maintenance.mockResolvedValue({ evaluatedCount: 4, updatedCount: 1, issueCount: 0 });
    await expect(caller("senota_knowledge_owner=session").cognitive.maintenance.run()).resolves.toMatchObject({ evaluatedCount: 4 });
    expect(mocks.maintenance).toHaveBeenCalledWith({ userId: 1, actor: "knowledge-owner" });
  });

  it("allows only an owner session to send the explicit temporary-fixture identifier through the retirement guard", async () => {
    mocks.validOwnerSession.mockResolvedValue(false);
    await expect(caller().cognitive.preGame.input.retireTemporaryAcceptanceFixture({ inputId: "11111111-1111-4111-8111-111111111111", reason: "Retire the labelled temporary acceptance fixture." })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mocks.retireFixture).not.toHaveBeenCalled();
    mocks.validOwnerSession.mockResolvedValue(true);
    mocks.retireFixture.mockResolvedValue({ suppressedAttention: 1, dismissedGaps: 1, immutableHistoryRetained: true });
    await expect(caller("senota_knowledge_owner=session").cognitive.preGame.input.retireTemporaryAcceptanceFixture({ inputId: "11111111-1111-4111-8111-111111111111", reason: "Retire the labelled temporary acceptance fixture." })).resolves.toMatchObject({ dismissedGaps: 1 });
    expect(mocks.retireFixture).toHaveBeenCalledWith({ userId: 1, inputId: "11111111-1111-4111-8111-111111111111", reason: "Retire the labelled temporary acceptance fixture.", actor: "knowledge-owner" });
  });
});
