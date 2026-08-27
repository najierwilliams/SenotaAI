import { describe, expect, it } from "vitest";
import type { LunaClaim, LunaKnowledgeGap, LunaMemory } from "@shared/lunaCognitive";
import { adviseLunaWorkerSelection } from "./milestone4";

const gap = (overrides: Partial<LunaKnowledgeGap> = {}): LunaKnowledgeGap => ({ id: "gap-1", workspaceId: "workspace-1", projectId: null, claimId: null, relatedObjectId: null, title: "Gap", question: "What is missing?", requestedEvidence: "source", rationale: "test", severity: "ACTION_REQUIRED", status: "OPEN", sourceType: "SYSTEM", provenance: {}, currentVersion: 1, createdAt: "2026-08-27T00:00:00.000Z", updatedAt: "2026-08-27T00:00:00.000Z", ...overrides });
const claim = (overrides: Partial<LunaClaim> = {}): LunaClaim => ({ id: "claim-1", workspaceId: "workspace-1", projectId: null, missionId: null, subject: "test", predicate: "is", objectText: "test", statement: "test", truthState: "INFERENCE", confidence: 0.5, lifecycleState: "REQUIRES_REVIEW", provenance: {}, assumptions: [], currentVersion: 1, createdAt: "2026-08-27T00:00:00.000Z", updatedAt: "2026-08-27T00:00:00.000Z", ...overrides });
const memory = (overrides: Partial<LunaMemory> = {}): LunaMemory => ({ id: "memory-1", workspaceId: "workspace-1", memoryKind: "RESEARCH", content: "Provider unavailable", importance: 1, truthState: "PROVIDER_UNAVAILABLE", sourceType: "SYSTEM", sourceObjectIds: [], projectId: null, missionId: null, tags: [], provenance: {}, active: true, currentVersion: 1, createdAt: "2026-08-27T00:00:00.000Z", updatedAt: "2026-08-27T00:00:00.000Z", ...overrides });

describe("Milestone 4 worker selection advisory", () => {
  it("suggests bounded review, provenance, and maintenance roles from persisted signals without authorizing dispatch", () => {
    const result = adviseLunaWorkerSelection({ claims: [claim()], gaps: [gap()], memories: [memory()] });
    expect(result.map(item => item.role)).toEqual(["REVIEW_AGENT", "PROVENANCE_AGENT", "MAINTENANCE_AGENT"]);
    expect(result.every(item => item.dispatchAuthorized === false)).toBe(true);
    expect(result[0]?.sourceCounts).toEqual({ openGaps: 1, reviewRequiredClaims: 1 });
  });

  it("returns no synthetic recommendation when persisted signals are absent", () => {
    expect(adviseLunaWorkerSelection({ claims: [], gaps: [], memories: [] })).toEqual([]);
  });
});
