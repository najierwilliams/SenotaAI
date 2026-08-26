import { describe, expect, it } from "vitest";
import {
  getScientificStructureCrosswalkSummary,
  getScientificStructureEvidence,
} from "./scientificStructureService";
import {
  SCIENTIFIC_LICENSE_REGISTRY,
  SCIENTIFIC_PROVENANCE_REGISTRY,
} from "./scientificProvenanceRegistry";
import {
  getApprovedCanonicalAnatomyIdentities,
  getCanonicalAnatomyReviewStatuses,
} from "./canonicalAnatomyService";

describe("hybrid scientific structure evidence", () => {
  it("returns a user-approved HRA identity as immutable structure context, not a coordinate", () => {
    const evidence = getScientificStructureEvidence("allen_hypothalamus_l");
    expect(evidence?.canonicalIdentity).toMatchObject({
      ontology: "UBERON",
      id: "UBERON:0001898",
      status: "APPROVED",
      reviewStatus: "approved",
      reviewedAt: "2026-08-26",
      reviewMethod: "user-attested-approved-review-population",
    });
    expect(evidence?.evidenceTier).toBe("structure-context");
    expect(evidence?.scientificTarget).toMatchObject({
      coordinate: null,
      status: "unavailable",
      evidenceTier: "structure-context",
    });
    expect(evidence?.registrationStatus.lunaToMni).toBe("not-established");
  });

  it("classifies every approved identity as explicitly Julich-unmapped when no authoritative crosswalk exists", () => {
    const evidence = getScientificStructureEvidence("allen_hypothalamus_l");
    expect(evidence?.providerMappings).toHaveLength(1);
    expect(evidence?.providerMappings[0]).toMatchObject({
      mappingStatus: "UNMAPPED",
      mappingType: "UNMAPPED",
      julichRegionId: null,
      julichRegionName: null,
      referenceSpace: "MNI ICBM 152 2009c Nonlinear Asymmetric",
    });
    expect(evidence?.julichObservation).toMatchObject({
      status: "UNMAPPED",
      evidenceTier: "structure-context",
    });
    expect(evidence?.scientificTarget.coordinate).toBeNull();
  });

  it("preserves non-identities as unmapped instead of deriving identifiers from their names", () => {
    const evidence = getScientificStructureEvidence("allen_thalamus_l");
    expect(evidence?.canonicalIdentity).toBeNull();
    expect(evidence?.scientificTarget.structureUberonId).toBeNull();
    expect(evidence?.scientificTarget.coordinate).toBeNull();
    expect(evidence?.providerMappings).toEqual([]);
  });

  it("exposes the 102 approved and 181 unmapped statuses for Navigator and completed review presentation", () => {
    const statuses = getCanonicalAnatomyReviewStatuses();
    expect(statuses).toHaveLength(283);
    expect(statuses.filter((entry) => entry.reviewStatus === "approved")).toHaveLength(102);
    expect(statuses.filter((entry) => entry.reviewStatus === "evidence-backed-requires-review")).toHaveLength(0);
    expect(statuses.filter((entry) => entry.reviewStatus === "unmapped")).toHaveLength(181);
    expect(getApprovedCanonicalAnatomyIdentities()).toHaveLength(102);
    expect(statuses.find((entry) => entry.lunaStructureId === "allen_hypothalamus_l")?.reviewStatus).toBe("approved");
    expect(statuses.find((entry) => entry.lunaStructureId === "allen_thalamus_l")?.reviewStatus).toBe("unmapped");
  });

  it("reports zero fabricated Julich relations across the approved review population", () => {
    expect(getScientificStructureCrosswalkSummary()).toMatchObject({
      canonical: { total: 283, approved: 102, evidenceBackedRequiresReview: 0, unmapped: 181 },
      julich: { totalApproved: 102, authoritative: 0, probabilistic: 0, requiresDomainReview: 0, unmapped: 102 },
    });
  });

  it("records Julich and BigBrain as non-redistributed, with Allen remaining review-required", () => {
    expect(SCIENTIFIC_LICENSE_REGISTRY.find((record) => record.id === "julich-brain-v3-1")).toMatchObject({ redistribution: "not-redistributed" });
    expect(SCIENTIFIC_LICENSE_REGISTRY.find((record) => record.id === "bigbrain-provider-context")).toMatchObject({ redistribution: "not-redistributed", license: "CC BY-NC-SA 4.0" });
    expect(SCIENTIFIC_LICENSE_REGISTRY.find((record) => record.id === "allen-human-brain-atlas")).toMatchObject({ redistribution: "review-required" });
    expect(SCIENTIFIC_PROVENANCE_REGISTRY.find((record) => record.id === "julich-brain-v3-1-mni-2009c")).toMatchObject({ evidenceTier: "region-probabilistic", referenceSpaceId: "ebrains-mni-icbm-152-2009c" });
  });
});
