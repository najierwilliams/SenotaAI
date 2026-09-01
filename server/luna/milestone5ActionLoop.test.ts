import { describe, expect, it } from "vitest";
import type { LunaAttentionItem, LunaAutonomousDecision, LunaFoundation, LunaKnowledgeGap, LunaMission, LunaPriorityAssessment } from "@shared/lunaCognitive";
import { assessNextLunaAutonomousDecision, LUNA_MILESTONE5_BUDGET, LUNA_MILESTONE5_POLICY_VERSION, transitionLunaDecisionForDispatch } from "./milestone5ActionLoop";
import { assessLunaWorkerResult } from "./learningService";

const gap = (id: string, createdAt = "2026-08-27T00:00:00.000Z"): LunaKnowledgeGap => ({ id, workspaceId: "workspace-a", projectId: null, claimId: null, relatedObjectId: null, title: `Gap ${id}`, question: `What persisted evidence is missing for ${id}?`, requestedEvidence: "An immutable source record", rationale: "A bounded test gap.", severity: "WARNING", status: "OPEN", sourceType: "SYSTEM", provenance: {}, currentVersion: 1, createdAt, updatedAt: createdAt });
const assessment = (id: string, targetId: string, score: number): LunaPriorityAssessment => ({ id, workspaceId: "workspace-a", targetType: "GAP", targetId, urgencyScore: score, impactScore: score, evidenceScore: score, unblockScore: score, riskScore: 0, priorityScore: score, explanation: "Persisted deterministic priority.", assumptions: [], actorScope: "luna:planner", createdAt: "2026-08-27T00:00:00.000Z" });
const attention = (overrides: Partial<LunaAttentionItem> = {}): LunaAttentionItem => ({ id: "attention-1", workspaceId: "workspace-a", projectId: null, missionId: null, severity: "WARNING", category: "KNOWLEDGE_GAP", title: "attention", detail: "bounded", state: "OPEN", createdAt: "2026-08-27T00:00:00.000Z", resolvedAt: null, ...overrides });
const decision = (sourceId: string): LunaAutonomousDecision => ({ id: "decision-1", workspaceId: "workspace-a", sourceType: "KNOWLEDGE_GAP", sourceId, decisionKey: "decision-key", objective: "bounded", status: "RECOMMENDED", outcome: "NO_ACTION", priorityScore: 0.8, policyVersion: LUNA_MILESTONE5_POLICY_VERSION, rationale: "test", evidence: {}, budget: { ...LUNA_MILESTONE5_BUDGET }, missionId: null, createdAt: "2026-08-27T00:00:00.000Z", updatedAt: "2026-08-27T00:00:00.000Z" });
const mission = (decisionId: string): LunaMission => ({ id: "mission-1", workspaceId: "workspace-a", projectId: null, goalId: null, decisionId, missionOrigin: "AUTONOMOUS", objective: "bounded", status: "RUNNING", autonomyMode: "ON_DEMAND", priority: 4, currentFocus: null, rootTaskId: null, maxWorkers: 4, maxSteps: 24, maxRetries: 2, maxDurationSeconds: 900, maxModelRequests: 12, maxTokenBudget: 24000, modelRequestsUsed: 0, tokenUsage: 0, pauseRequested: false, cancelRequested: false, runtimeRunId: "run-1", resumeAfter: null, startedAt: null, finishedAt: null, errorMessage: null, createdAt: "2026-08-27T00:00:00.000Z", updatedAt: "2026-08-27T00:00:00.000Z" });

function assess(input: Partial<Parameters<typeof assessNextLunaAutonomousDecision>[0]> = {}) {
  return assessNextLunaAutonomousDecision({ autonomyEnabled: true, cognitiveActionsEnabled: true, gaps: [gap("gap-low"), gap("gap-high", "2026-08-28T00:00:00.000Z")], priorityAssessments: [assessment("assessment-low", "gap-low", 0.6), assessment("assessment-high", "gap-high", 0.9)], attention: [], missions: [], decisions: [], ...input });
}

describe("Milestone 5 deterministic cognitive action policy", () => {
  it("remains default-off unless both owner controls are enabled", () => {
    expect(assess({ autonomyEnabled: false })).toBeNull();
    expect(assess({ cognitiveActionsEnabled: false })).toBeNull();
  });

  it("selects exactly the highest persisted eligible gap and records bounded evidence", () => {
    const result = assess();
    expect(result).toMatchObject({ sourceType: "KNOWLEDGE_GAP", sourceId: "gap-high", status: "RECOMMENDED", policyVersion: LUNA_MILESTONE5_POLICY_VERSION, priorityScore: 0.9, budget: LUNA_MILESTONE5_BUDGET });
    expect(result?.decisionKey).toHaveLength(64);
    expect(result?.rationale).toContain("does not establish evidence");
  });

  it("suppresses source duplicates and security attention rather than dispatching another action", () => {
    expect(assess({ gaps: [gap("gap-high")], priorityAssessments: [assessment("assessment-high", "gap-high", 0.9)], decisions: [decision("gap-high")] })).toBeNull();
    expect(assess({ attention: [attention({ severity: "ACTION_REQUIRED", category: "SECURITY" })] })).toBeNull();
    expect(assess({ gaps: [gap("gap-low")], priorityAssessments: [assessment("assessment-low", "gap-low", 0.54)] })).toBeNull();
  });

  it("does not dispatch a second active linked decision or parallel autonomous mission", () => {
    const active = decision("gap-high");
    active.missionId = "mission-1";
    expect(assess({ gaps: [gap("gap-high")], priorityAssessments: [assessment("assessment-high", "gap-high", 0.9)], decisions: [active], missions: [mission(active.id)] })).toBeNull();
    const otherActiveMission = mission("other-decision");
    expect(assess({ missions: [otherActiveMission] })).toBeNull();
  });

  it("uses the most recently persisted GAP assessment rather than retaining a stale higher score", () => {
    const recentLower = { ...assessment("assessment-recent", "gap-high", 0.54), createdAt: "2026-08-28T00:00:00.000Z" };
    expect(assess({ gaps: [gap("gap-high")], priorityAssessments: [assessment("assessment-stale", "gap-high", 0.9), recentLower] })).toBeNull();
  });

  it("uses the live Foundation developmental context for autonomous eligibility", () => {
    const child: LunaFoundation = { name: "Luna", currentAge: 8, nativeLanguage: "English", personalityFoundation: "Curious and kind.", personalityKnowledge: "Creator context.", appearanceReference: "Protected reference." };
    const adult: LunaFoundation = { ...child, currentAge: 30 };
    const adultGap = { ...gap("gap-high"), question: "Take adult employment and manage a company" };
    const adultAssessment = assessment("assessment-high", "gap-high", 0.9);
    expect(assess({ foundation: child, gaps: [adultGap], priorityAssessments: [adultAssessment] })).toBeNull();
    expect(assess({ foundation: adult, gaps: [adultGap], priorityAssessments: [adultAssessment] })?.sourceId).toBe("gap-high");
  });

  it("reports durable runtime outcomes without treating a missing runtime as execution", () => {
    expect(transitionLunaDecisionForDispatch({ accepted: true, runtimeAvailable: true })).toEqual({ status: "DISPATCHED", outcome: "DISPATCHED" });
    expect(transitionLunaDecisionForDispatch({ accepted: false, runtimeAvailable: false })).toEqual({ status: "BLOCKED", outcome: "RUNTIME_UNAVAILABLE" });
    expect(transitionLunaDecisionForDispatch({ accepted: false, runtimeAvailable: true })).toEqual({ status: "BLOCKED", outcome: "REQUIRES_OWNER_REVIEW" });
  });
});

describe("Milestone 5 conservative worker-result validation", () => {
  const safeReport = ["Retained context", "Only persisted notes were used.", "Inferences", "A Luna-owned inference is recorded.", "Open questions", "No immutable evidence resolves the gap.", "Next non-authoritative step", "Owner review is required."].join("\n\n");

  it("accepts only a bounded handoff structure and labels it as inference", () => {
    const result = assessLunaWorkerResult(safeReport);
    expect(result.status).toBe("ACCEPTED");
    expect(result.outputHash).toHaveLength(64);
    expect(result.detail).toContain("Luna inference");
  });

  it("requires review for authority elevation, coordinate, and HRA-mapping claims", () => {
    const authority = assessLunaWorkerResult(`${safeReport}\n\nThis is scientifically validated.`);
    const coordinate = assessLunaWorkerResult(`${safeReport}\n\nMNI coordinate: (1, 2, 3).`);
    const mapping = assessLunaWorkerResult(`${safeReport}\n\nHRA -> MNI mapping is established.`);
    expect(authority.status).toBe("NEEDS_REVIEW");
    expect(authority.checks.noAuthorityElevation).toBe(false);
    expect(coordinate.status).toBe("NEEDS_REVIEW");
    expect(coordinate.checks.noSpatialTargetAssertion).toBe(false);
    expect(mapping.status).toBe("NEEDS_REVIEW");
    expect(mapping.checks.noUnsupportedHraMapping).toBe(false);
    expect(assessLunaWorkerResult(`${safeReport}\n\nHRA -> MNI remains NOT_ESTABLISHED.`).status).toBe("ACCEPTED");
  });
});
