import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  createLunaInternalStateObservation: vi.fn(),
  createLunaLearningRecord: vi.fn(),
  createLunaMaintenanceReport: vi.fn(),
  createLunaReasoningArtifact: vi.fn(),
  createLunaSocialInteraction: vi.fn(),
  createLunaKnowledgeGap: vi.fn(),
  addLunaSelfModelEvidence: vi.fn(),
  createOrGetLunaCognitiveInput: vi.fn(),
  createOrGetLunaCognitiveCycle: vi.fn(),
  createOrGetLunaExperience: vi.fn(),
  createOrGetLunaNovelty: vi.fn(),
  createOrGetLunaRelationship: vi.fn(),
  createOrGetLunaWorldEvent: vi.fn(),
  createOrUpdateLunaAttentionAssessment: vi.fn(),
  createOrUpdateLunaContradiction: vi.fn(),
  createOrUpdateLunaCuriosityAssessment: vi.fn(),
  createOrUpdateLunaGapProfile: vi.fn(),
  createOrUpdateLunaSelfModelFact: vi.fn(),
  createOrUpdateLunaUncertainty: vi.fn(),
  getLunaCognitiveSnapshot: vi.fn(),
  listLunaPreGameCognitiveSnapshot: vi.fn(),
  replaceLunaFocusAssignments: vi.fn(),
}));

vi.mock("./supabase", () => storage);

import { ingestLunaCognitiveInput, ingestLunaWorldEvent } from "./preGameCognitiveService";

const blankSnapshot = () => ({
  inputs: [], experiences: [], cycles: [], attentionAssessments: [], focusAssignments: [], uncertaintyRecords: [], noveltyRecords: [], contradictions: [], gapProfiles: [], curiosityAssessments: [], preferences: [], internalState: [], selfModelFacts: [], goalProfiles: [], goalDependencies: [], commitments: [], hypotheses: [], reasoningArtifacts: [], planRevisions: [], learningRecords: [], workerPerformance: [], relationships: [], socialInteractions: [], worldEvents: [], maintenanceReports: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  storage.listLunaPreGameCognitiveSnapshot.mockResolvedValue(blankSnapshot());
  storage.createOrGetLunaCognitiveInput.mockResolvedValue({ created: true, input: { id: "input-1", summary: "Correction: this is wrong.", workspaceId: "workspace", sourceKey: "input:key", inputType: "USER_CORRECTION", relevance: "RELEVANT", privacyClass: "OWNER_PRIVATE", projectId: null, goalId: null, missionId: null, workerId: null, provenance: {}, createdAt: "2026-08-27T00:00:00Z" } });
  storage.createOrGetLunaCognitiveCycle.mockResolvedValue({ created: true, cycle: { id: "cycle-1" } });
  storage.createOrGetLunaExperience.mockResolvedValue({ created: true, experience: { id: "experience-1" } });
  storage.createOrGetLunaNovelty.mockResolvedValue({ created: true, novelty: { id: "novelty-1" } });
  storage.createOrUpdateLunaUncertainty.mockResolvedValue({ id: "uncertainty-1" });
  storage.createOrUpdateLunaAttentionAssessment.mockResolvedValue({ id: "attention-1" });
  storage.createLunaKnowledgeGap.mockResolvedValue({ id: "gap-1" });
  storage.createOrUpdateLunaGapProfile.mockResolvedValue({ gapId: "gap-1" });
  storage.createOrUpdateLunaCuriosityAssessment.mockResolvedValue({ id: "curiosity-1" });
  storage.createLunaInternalStateObservation.mockResolvedValue({ id: "state-1" });
  storage.createLunaReasoningArtifact.mockResolvedValue({ id: "reasoning-1" });
  storage.createLunaLearningRecord.mockResolvedValue({ id: "learning-1" });
  storage.createOrGetLunaRelationship.mockResolvedValue({ created: true, relationship: { id: "relationship-1" } });
  storage.createLunaSocialInteraction.mockResolvedValue({ id: "interaction-1" });
  storage.createOrUpdateLunaSelfModelFact.mockResolvedValue({ id: "self-fact-1" });
  storage.addLunaSelfModelEvidence.mockResolvedValue({ created: true, evidence: { id: "self-evidence-1" } });
  storage.replaceLunaFocusAssignments.mockResolvedValue([]);
  storage.createOrGetLunaWorldEvent.mockResolvedValue({ created: true, event: { id: "world-1" } });
});

describe("pre-game cognitive source ingestion", () => {
  it("persists a correction as an input, experience, uncertainty, attention, gap, learning, reasoning, and bounded social record without Queue dispatch", async () => {
    const result = await ingestLunaCognitiveInput({ userId: 1, inputType: "USER_CORRECTION", content: "Correction: that earlier assumption is wrong. What evidence supports it?", participantIdentity: "player:test", correctionTarget: { type: "MEMORY", id: "11111111-1111-1111-1111-111111111111" } });
    expect(result.created).toBe(true);
    expect(result.assessment.detectedCorrection).toBe(true);
    expect(storage.createOrGetLunaCognitiveInput).toHaveBeenCalledOnce();
    expect(storage.createOrGetLunaExperience).toHaveBeenCalledOnce();
    expect(storage.createOrUpdateLunaUncertainty).toHaveBeenCalledOnce();
    expect(storage.createOrUpdateLunaAttentionAssessment).toHaveBeenCalledOnce();
    expect(storage.createLunaKnowledgeGap).toHaveBeenCalledOnce();
    expect(storage.createLunaLearningRecord).toHaveBeenCalledOnce();
    expect(storage.createOrUpdateLunaContradiction).toHaveBeenCalledWith(expect.objectContaining({ anchorAType: "MEMORY", anchorBType: "COGNITIVE_INPUT", summary: expect.stringContaining("unresolved") }));
    expect(storage.createLunaReasoningArtifact).toHaveBeenCalledOnce();
    expect(storage.createOrGetLunaRelationship).toHaveBeenCalledWith(expect.objectContaining({ participantIdentity: "player:test" }));
    expect(storage.createLunaSocialInteraction).toHaveBeenCalledOnce();
    expect(storage.createOrGetLunaWorldEvent).not.toHaveBeenCalled();
  });

  it("does not derive a duplicate source twice", async () => {
    storage.createOrGetLunaCognitiveInput.mockResolvedValueOnce({ created: false, input: { id: "input-1" } });
    const result = await ingestLunaCognitiveInput({ userId: 1, sourceKey: "input:fixed-key", inputType: "OWNER_NOTE", content: "We need to preserve duplicate suppression." });
    expect(result.created).toBe(false);
    expect(storage.createOrGetLunaExperience).not.toHaveBeenCalled();
    expect(storage.createLunaKnowledgeGap).not.toHaveBeenCalled();
    expect(storage.createLunaReasoningArtifact).not.toHaveBeenCalled();
  });

  it("uses the same bounded path for a neutral future-world event and records no game action", async () => {
    const result = await ingestLunaWorldEvent({ userId: 1, event: { sourceKey: "world-event:0001", eventType: "OBSERVATION", summary: "A neutral world event occurred with missing context.", constraints: { visibility: "partial" }, consequences: { known: false } } });
    expect(result.worldEventCreated).toBe(true);
    expect(storage.createOrGetLunaCognitiveInput).toHaveBeenCalledWith(expect.objectContaining({ inputType: "WORLD_EVENT" }));
    expect(storage.createOrGetLunaWorldEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "OBSERVATION", sourceKey: "world-event:0001" }));
    expect(storage.createOrGetLunaCognitiveCycle).toHaveBeenCalledOnce();
  });
});
