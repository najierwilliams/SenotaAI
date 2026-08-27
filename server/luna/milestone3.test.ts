import { describe, expect, it } from "vitest";
import type { LunaKnowledgeGap, LunaCuriosityCandidate, LunaPriorityAssessment } from "@shared/lunaCognitive";
import { explainLunaPriority, inspectLunaAttentionSystem } from "./milestone3";

const gap = (overrides: Partial<LunaKnowledgeGap> = {}): LunaKnowledgeGap => ({
  id: "gap-1", workspaceId: "workspace-1", projectId: null, claimId: null, relatedObjectId: null, title: "Evidence gap", question: "What source would establish this?", requestedEvidence: "A provenance-linked source", rationale: "test", severity: "ACTION_REQUIRED", status: "OPEN", sourceType: "SYSTEM", provenance: {}, currentVersion: 1, createdAt: "2026-08-27T00:00:00.000Z", updatedAt: "2026-08-27T00:00:00.000Z", ...overrides,
});
const curiosity = (overrides: Partial<LunaCuriosityCandidate> = {}): LunaCuriosityCandidate => ({ id: "curiosity-1", workspaceId: "workspace-1", gapId: "gap-1", proposedAction: "Review a bounded persisted source", rationale: "test", estimatedCost: "LOW", status: "PROPOSED", createdBy: "SYSTEM", createdAt: "2026-08-27T00:00:00.000Z", ...overrides });
const assessment = (overrides: Partial<LunaPriorityAssessment> = {}): LunaPriorityAssessment => ({ id: "priority-1", workspaceId: "workspace-1", targetType: "GAP", targetId: "gap-1", urgencyScore: 0.8, impactScore: 0.7, evidenceScore: 0.6, unblockScore: 0.5, riskScore: 0.2, priorityScore: 0.65, explanation: "test", assumptions: [], actorScope: "test", createdAt: "2026-08-27T00:00:00.000Z", ...overrides });

describe("Milestone 3 attention and priority policy", () => {
  it("derives an inspectable score from declared factors and reduces rank for higher risk", () => {
    const lowRisk = explainLunaPriority({ urgencyScore: 1, impactScore: 1, evidenceScore: 1, unblockScore: 1, riskScore: 0 });
    const highRisk = explainLunaPriority({ urgencyScore: 1, impactScore: 1, evidenceScore: 1, unblockScore: 1, riskScore: 1 });
    expect(lowRisk.priorityScore).toBe(1);
    expect(highRisk.priorityScore).toBe(0.95);
    expect(lowRisk.explanation).toContain("does not authorize external");
    expect(() => explainLunaPriority({ urgencyScore: 2, impactScore: 0, evidenceScore: 0, unblockScore: 0, riskScore: 0 })).toThrow("Urgency score");
  });

  it("summarizes only persisted gaps, curiosity, and recent assessment records", () => {
    const result = inspectLunaAttentionSystem({ gaps: [gap(), gap({ id: "gap-resolved", severity: "INFO", status: "RESOLVED" })], curiosity: [curiosity(), curiosity({ id: "curiosity-complete", status: "COMPLETED" })], assessments: [assessment(), assessment({ id: "priority-new", createdAt: "2026-08-27T01:00:00.000Z" })] });
    expect(result).toMatchObject({ openGapCount: 1, actionRequiredGapCount: 1, proposedCuriosityCount: 1, policy: "declared-factor-priority-with-risk-reduction" });
    expect(result.latestAssessments.map(item => item.id)).toEqual(["priority-new", "priority-1"]);
  });
});
