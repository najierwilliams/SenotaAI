import { describe, expect, it } from "vitest";
import type { LunaClaim, LunaClaimEvidence, LunaClaimRevision } from "@shared/lunaCognitive";
import { inspectLunaClaim, inspectLunaClaims } from "./milestone2";

const claim = (overrides: Partial<LunaClaim> = {}): LunaClaim => ({
  id: "claim-1", workspaceId: "workspace-1", projectId: null, missionId: null,
  subject: "Luna", predicate: "has", objectText: "a bounded durable worker runtime",
  statement: "Luna has a bounded durable worker runtime.", truthState: "INFERENCE", confidence: 0.5,
  lifecycleState: "ACTIVE", provenance: { method: "test" }, assumptions: ["Runtime configuration remains available"], currentVersion: 1,
  createdAt: "2026-08-27T00:00:00.000Z", updatedAt: "2026-08-27T00:00:00.000Z", ...overrides,
});

const evidence = (overrides: Partial<LunaClaimEvidence> = {}): LunaClaimEvidence => ({
  id: "evidence-1", workspaceId: "workspace-1", claimId: "claim-1", sourceMemoryId: "memory-1", sourceObjectId: null, sourceRelationshipId: null,
  evidenceRole: "SUPPORTS", sourceExcerpt: "A bounded worker was persisted.", confidence: 0.6, provenance: { method: "test" }, createdAt: "2026-08-27T00:00:00.000Z", ...overrides,
});

const revision = (overrides: Partial<LunaClaimRevision> = {}): LunaClaimRevision => ({
  id: "revision-1", workspaceId: "workspace-1", claimId: "claim-1", priorClaimId: null, revisionKind: "CREATED",
  reason: "Claim created.", actorScope: "test", snapshot: {}, createdAt: "2026-08-27T00:00:00.000Z", ...overrides,
});

describe("Milestone 2 claim inspection", () => {
  it("reports support, contradiction, provenance anchors, and revision history without promoting the claim", () => {
    const result = inspectLunaClaim({
      claim: claim(),
      evidence: [evidence(), evidence({ id: "evidence-2", evidenceRole: "CONTRADICTS", sourceMemoryId: null, sourceObjectId: "object-1" })],
      revisions: [revision(), revision({ id: "revision-2", revisionKind: "CONTRADICTION_RECORDED", createdAt: "2026-08-27T01:00:00.000Z" })],
    });
    expect(result).toMatchObject({
      truthState: "INFERENCE", lifecycleState: "ACTIVE", revisionCount: 2, latestRevisionKind: "CONTRADICTION_RECORDED", requiresReview: true,
      evidence: { supportingCount: 1, contradictingCount: 1, sourceAnchorCount: 2 },
    });
  });

  it("flags an unanchored claim for review and orders only a bounded persisted selection", () => {
    const older = claim({ id: "claim-older", updatedAt: "2026-08-26T00:00:00.000Z" });
    const newest = claim({ id: "claim-newest", updatedAt: "2026-08-27T02:00:00.000Z", lifecycleState: "REQUIRES_REVIEW" });
    expect(inspectLunaClaim({ claim: older, evidence: [], revisions: [] }).requiresReview).toBe(true);
    expect(inspectLunaClaims({ claims: [older, newest], evidence: [], revisions: [], limit: 1 }).map(item => item.claimId)).toEqual(["claim-newest"]);
  });
});
