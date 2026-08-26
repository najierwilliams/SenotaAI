import { describe, expect, it } from "vitest";
import {
  createPersistedReviewDecision,
  resolveScientificReviewStatus,
  type CanonicalReviewRecord,
} from "./useScientificReviewRegistry";

const reviewRecord: CanonicalReviewRecord = {
  lunaStructureId: "allen_hypothalamus_l",
  lunaStructureName: "Allen_hypothalamus_L",
  meshBacked: true,
  uberonId: "UBERON:0001898",
  fmaId: null,
  canonicalName: "hypothalamus",
  parentId: null,
  hraEntityId: "https://example.test/hypothalamus",
  source: "HRA Brain-Female graph",
  sourceVersion: "HRA Brain-Female v1.1",
  sourceUrl: "https://example.test/graph",
  reviewStatus: "evidence-backed-requires-review",
  reviewedAt: null,
  reviewMethod: "exact-hra-graph-file-subpath-join",
  evidence: "exact source evidence",
  unmappedTriage: null,
};

const unmappedRecord: CanonicalReviewRecord = {
  ...reviewRecord,
  lunaStructureId: "allen_thalamus_l",
  lunaStructureName: "Allen_thalamus_L",
  uberonId: null,
  canonicalName: null,
  hraEntityId: null,
  reviewStatus: "unmapped",
  reviewMethod: null,
  unmappedTriage: "anatomical-structure-requires-ontology-lookup",
};

describe("scientific review decision state", () => {
  it("keeps evidence-backed identities in human review until a per-record decision exists", () => {
    expect(resolveScientificReviewStatus(reviewRecord, {})).toBe("REQUIRES_REVIEW");
    expect(resolveScientificReviewStatus(unmappedRecord, {})).toBe("UNMAPPED");
  });

  it("changes only review metadata when approval is persisted", () => {
    const approval = createPersistedReviewDecision("APPROVED", "Dr Reviewer", null, "2026-08-26T00:00:00.000Z");
    expect(approval).toEqual({ status: "APPROVED", reviewer: "Dr Reviewer", reviewedAt: "2026-08-26T00:00:00.000Z", reviewReason: null });
    expect(resolveScientificReviewStatus(reviewRecord, { [reviewRecord.lunaStructureId]: approval })).toBe("APPROVED");
    expect(reviewRecord.uberonId).toBe("UBERON:0001898");
  });

  it("requires and persists a rejection reason", () => {
    expect(() => createPersistedReviewDecision("REJECTED", "Reviewer", "")).toThrow("A rejection reason is required.");
    const rejection = createPersistedReviewDecision("REJECTED", "Reviewer", "Scope requires domain review", "2026-08-26T00:00:00.000Z");
    expect(rejection.reviewReason).toBe("Scope requires domain review");
    expect(resolveScientificReviewStatus(reviewRecord, { [reviewRecord.lunaStructureId]: rejection })).toBe("REJECTED");
  });
});
