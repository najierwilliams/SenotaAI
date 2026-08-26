import { describe, expect, it } from "vitest";
import {
  applyReviewDecision,
  buildScientificReviewSummary,
  clearPersistedReviewDecisions,
  createPersistedReviewDecision,
  keepStructureInReview,
  parsePersistedReviewDecisions,
  persistReviewDecisions,
  readPersistedReviewDecisions,
  resolveScientificReviewStatus,
  SCIENTIFIC_REVIEW_STORAGE_KEY,
  type CanonicalReviewRecord,
  type ReviewDecisionStorage,
} from "./useScientificReviewRegistry";
import { CANONICAL_ANATOMY_IDENTITIES } from "../../../../../server/scientificData/canonicalAnatomyService";

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

class MemoryReviewDecisionStorage implements ReviewDecisionStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

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

  it("derives the exact immutable source inventory counts without hardcoding them in the UI", () => {
    const summary = buildScientificReviewSummary(CANONICAL_ANATOMY_IDENTITIES, {});
    expect(summary).toEqual({
      total: 102,
      highConfidence: 97,
      ambiguous: 5,
      approved: 0,
      rejected: 0,
      requiresReview: 102,
      unmapped: 181,
    });
  });

  it("persists only a decision overlay, then restores the record to the review queue", () => {
    const storage = new MemoryReviewDecisionStorage();
    const approval = createPersistedReviewDecision("APPROVED", "Test reviewer", null, "2026-08-26T01:00:00.000Z");
    const decisions = applyReviewDecision({}, reviewRecord.lunaStructureId, approval);
    persistReviewDecisions(storage, decisions);

    expect(readPersistedReviewDecisions(storage)).toEqual(decisions);
    expect(resolveScientificReviewStatus(reviewRecord, decisions)).toBe("APPROVED");
    expect(reviewRecord.uberonId).toBe("UBERON:0001898");
    expect(reviewRecord.hraEntityId).toBe("https://example.test/hypothalamus");
    expect(reviewRecord.sourceVersion).toBe("HRA Brain-Female v1.1");
    expect(reviewRecord.evidence).toBe("exact source evidence");

    const keptForReview = keepStructureInReview(decisions, reviewRecord.lunaStructureId);
    expect(resolveScientificReviewStatus(reviewRecord, keptForReview)).toBe("REQUIRES_REVIEW");
    expect(keptForReview).toEqual({});
  });

  it("updates dynamic review counts for approval and rejection while leaving unmapped records neutral", () => {
    const approval = createPersistedReviewDecision("APPROVED", "Test reviewer", null, "2026-08-26T01:00:00.000Z");
    const rejection = createPersistedReviewDecision("REJECTED", "Test reviewer", "Test-only review rejection", "2026-08-26T01:01:00.000Z");
    const secondReviewRecord = CANONICAL_ANATOMY_IDENTITIES.find((record) => record.lunaStructureId !== reviewRecord.lunaStructureId && record.reviewStatus === "evidence-backed-requires-review");
    expect(secondReviewRecord).toBeDefined();
    const decisions = {
      [reviewRecord.lunaStructureId]: approval,
      [secondReviewRecord!.lunaStructureId]: rejection,
    };

    expect(buildScientificReviewSummary(CANONICAL_ANATOMY_IDENTITIES, decisions)).toMatchObject({
      total: 102,
      approved: 1,
      rejected: 1,
      requiresReview: 100,
      unmapped: 181,
    });
    expect(resolveScientificReviewStatus(unmappedRecord, decisions)).toBe("UNMAPPED");
  });

  it("rejects malformed persisted values and allows a development reset to delete only the overlay", () => {
    const storage = new MemoryReviewDecisionStorage();
    storage.setItem(SCIENTIFIC_REVIEW_STORAGE_KEY, JSON.stringify({
      valid: createPersistedReviewDecision("APPROVED", "Test reviewer", null, "2026-08-26T01:00:00.000Z"),
      invalidStatus: { status: "REQUIRES_REVIEW", reviewer: "x", reviewedAt: "y", reviewReason: null },
      invalidShape: "not-a-decision",
    }));

    expect(readPersistedReviewDecisions(storage)).toEqual({
      valid: { status: "APPROVED", reviewer: "Test reviewer", reviewedAt: "2026-08-26T01:00:00.000Z", reviewReason: null },
    });
    expect(parsePersistedReviewDecisions("not-json")).toEqual({});

    clearPersistedReviewDecisions(storage);
    expect(storage.getItem(SCIENTIFIC_REVIEW_STORAGE_KEY)).toBeNull();
    expect(reviewRecord.uberonId).toBe("UBERON:0001898");
    expect(reviewRecord.evidence).toBe("exact source evidence");
  });
});
