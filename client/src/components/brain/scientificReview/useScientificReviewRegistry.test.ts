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

const pendingReviewRecord: CanonicalReviewRecord = {
  lunaStructureId: "test_pending_identity",
  lunaStructureName: "Test_pending_identity",
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
  reviewProvenance: null,
  evidence: "exact source evidence",
  unmappedTriage: null,
};

const approvedReviewRecord: CanonicalReviewRecord = {
  ...pendingReviewRecord,
  lunaStructureId: "test_approved_identity",
  reviewStatus: "approved",
  reviewedAt: "2026-08-26",
  reviewMethod: "user-attested-approved-review-population",
  reviewProvenance: "User-attested source approval.",
};

const unmappedRecord: CanonicalReviewRecord = {
  ...pendingReviewRecord,
  lunaStructureId: "test_unmapped_identity",
  lunaStructureName: "Test_unmapped_identity",
  uberonId: null,
  canonicalName: null,
  hraEntityId: null,
  reviewStatus: "unmapped",
  reviewMethod: null,
  unmappedTriage: "anatomical-structure-requires-ontology-lookup",
};

class MemoryReviewDecisionStorage implements ReviewDecisionStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("scientific review decision state", () => {
  it("keeps pending identities in human review and source-approved identities approved", () => {
    expect(resolveScientificReviewStatus(pendingReviewRecord, {})).toBe("REQUIRES_REVIEW");
    expect(resolveScientificReviewStatus(approvedReviewRecord, {})).toBe("APPROVED");
    expect(resolveScientificReviewStatus(unmappedRecord, {})).toBe("UNMAPPED");
  });

  it("changes only local review metadata for a pending record", () => {
    const approval = createPersistedReviewDecision("APPROVED", "Dr Reviewer", null, "2026-08-26T00:00:00.000Z");
    expect(resolveScientificReviewStatus(pendingReviewRecord, { [pendingReviewRecord.lunaStructureId]: approval })).toBe("APPROVED");
    expect(pendingReviewRecord.uberonId).toBe("UBERON:0001898");
    expect(pendingReviewRecord.evidence).toBe("exact source evidence");
  });

  it("requires a rejection reason and cannot let a stale local decision downgrade authoritative approval", () => {
    expect(() => createPersistedReviewDecision("REJECTED", "Reviewer", "")).toThrow("A rejection reason is required.");
    const rejection = createPersistedReviewDecision("REJECTED", "Reviewer", "Scope requires domain review", "2026-08-26T00:00:00.000Z");
    expect(resolveScientificReviewStatus(pendingReviewRecord, { [pendingReviewRecord.lunaStructureId]: rejection })).toBe("REJECTED");
    expect(resolveScientificReviewStatus(approvedReviewRecord, { [approvedReviewRecord.lunaStructureId]: rejection })).toBe("APPROVED");
  });

  it("derives the exact approved source inventory counts without hardcoding them in the UI", () => {
    expect(buildScientificReviewSummary(CANONICAL_ANATOMY_IDENTITIES, {})).toEqual({
      total: 102,
      highConfidence: 97,
      ambiguous: 5,
      approved: 102,
      rejected: 0,
      requiresReview: 0,
      unmapped: 181,
    });
  });

  it("persists only a pending-record decision overlay and restores that record to review", () => {
    const storage = new MemoryReviewDecisionStorage();
    const approval = createPersistedReviewDecision("APPROVED", "Test reviewer", null, "2026-08-26T01:00:00.000Z");
    const decisions = applyReviewDecision({}, pendingReviewRecord.lunaStructureId, approval);
    persistReviewDecisions(storage, decisions);
    expect(readPersistedReviewDecisions(storage)).toEqual(decisions);
    expect(resolveScientificReviewStatus(pendingReviewRecord, decisions)).toBe("APPROVED");
    expect(resolveScientificReviewStatus(pendingReviewRecord, keepStructureInReview(decisions, pendingReviewRecord.lunaStructureId))).toBe("REQUIRES_REVIEW");
  });

  it("updates pending-state dynamic counts while leaving unmapped records neutral", () => {
    const approval = createPersistedReviewDecision("APPROVED", "Test reviewer", null, "2026-08-26T01:00:00.000Z");
    const rejection = createPersistedReviewDecision("REJECTED", "Test reviewer", "Test-only review rejection", "2026-08-26T01:01:00.000Z");
    expect(buildScientificReviewSummary([pendingReviewRecord, { ...pendingReviewRecord, lunaStructureId: "second_pending" }, unmappedRecord], {
      [pendingReviewRecord.lunaStructureId]: approval,
      second_pending: rejection,
    })).toMatchObject({ total: 2, approved: 1, rejected: 1, requiresReview: 0, unmapped: 1 });
    expect(resolveScientificReviewStatus(unmappedRecord, {})).toBe("UNMAPPED");
  });

  it("rejects malformed persisted values and allows a development reset to delete only overlays", () => {
    const storage = new MemoryReviewDecisionStorage();
    storage.setItem(SCIENTIFIC_REVIEW_STORAGE_KEY, JSON.stringify({
      valid: createPersistedReviewDecision("APPROVED", "Test reviewer", null, "2026-08-26T01:00:00.000Z"),
      invalidStatus: { status: "REQUIRES_REVIEW", reviewer: "x", reviewedAt: "y", reviewReason: null },
      invalidShape: "not-a-decision",
    }));
    expect(Object.keys(readPersistedReviewDecisions(storage))).toEqual(["valid"]);
    expect(parsePersistedReviewDecisions("not-json")).toEqual({});
    clearPersistedReviewDecisions(storage);
    expect(storage.getItem(SCIENTIFIC_REVIEW_STORAGE_KEY)).toBeNull();
    expect(approvedReviewRecord.uberonId).toBe("UBERON:0001898");
  });
});
