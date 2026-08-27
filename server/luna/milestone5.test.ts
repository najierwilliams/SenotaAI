import { describe, expect, it } from "vitest";
import type { LunaAttentionItem, LunaClaim, LunaKnowledgeGap } from "@shared/lunaCognitive";
import type { LunaReflection } from "./supabase";
import { summarizeLunaLearning } from "./milestone5";

const reflection = (overrides: Partial<LunaReflection> = {}): LunaReflection => ({ id: "reflection-1", workspaceId: "workspace-1", missionId: null, projectId: null, summary: "Persisted reflection", newEvidenceCount: 0, newInferenceCount: 1, newMemoryCount: 0, relationshipCount: 0, contradictionCount: 0, unresolvedCount: 1, confidence: "UNKNOWN", nextAction: "Review persisted gaps.", truthState: "INFERENCE", createdAt: "2026-08-27T00:00:00.000Z", ...overrides });
const attention = (overrides: Partial<LunaAttentionItem> = {}): LunaAttentionItem => ({ id: "attention-1", workspaceId: "workspace-1", projectId: null, missionId: null, severity: "WARNING", category: "KNOWLEDGE_GAP", title: "Persisted attention", detail: "test", state: "OPEN", createdAt: "2026-08-27T00:00:00.000Z", resolvedAt: null, ...overrides });
const gap = (overrides: Partial<LunaKnowledgeGap> = {}): LunaKnowledgeGap => ({ id: "gap-1", workspaceId: "workspace-1", projectId: null, claimId: null, relatedObjectId: null, title: "Gap", question: "What is missing?", requestedEvidence: "source", rationale: "test", severity: "WARNING", status: "OPEN", sourceType: "SYSTEM", provenance: {}, currentVersion: 1, createdAt: "2026-08-27T00:00:00.000Z", updatedAt: "2026-08-27T00:00:00.000Z", ...overrides });
const claim = (overrides: Partial<LunaClaim> = {}): LunaClaim => ({ id: "claim-1", workspaceId: "workspace-1", projectId: null, missionId: null, subject: "test", predicate: "is", objectText: "test", statement: "test", truthState: "CONTRADICTED", confidence: 0.2, lifecycleState: "REQUIRES_REVIEW", provenance: {}, assumptions: [], currentVersion: 1, createdAt: "2026-08-27T00:00:00.000Z", updatedAt: "2026-08-27T00:00:00.000Z", ...overrides });

describe("Milestone 5 bounded learning summary", () => {
  it("uses only persisted records and retains a non-authorizing boundary", () => {
    const result = summarizeLunaLearning({ reflections: [reflection()], attention: [attention()], gaps: [gap()], claims: [claim()] });
    expect(result).toMatchObject({ reflectionCount: 1, openAttentionCount: 1, openGapCount: 1, reviewRequiredClaimCount: 1, learningBoundary: "persisted-outcome-summary-only", followUpAuthorization: false });
    expect(result.latestReflection?.id).toBe("reflection-1");
  });

  it("does not fabricate a latest reflection when no reflection was persisted", () => {
    expect(summarizeLunaLearning({ reflections: [], attention: [], gaps: [], claims: [] })).toMatchObject({ reflectionCount: 0, latestReflection: null, followUpAuthorization: false });
  });
});
