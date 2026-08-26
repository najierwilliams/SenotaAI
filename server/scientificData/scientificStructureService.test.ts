import { describe, expect, it } from "vitest";
import { getScientificStructureEvidence } from "./scientificStructureService";
import { SCIENTIFIC_LICENSE_REGISTRY, SCIENTIFIC_PROVENANCE_REGISTRY } from "./scientificProvenanceRegistry";

describe("hybrid scientific structure evidence", () => {
  it("returns an evidence-backed HRA identity as review-required structure context, not a coordinate", () => {
    const evidence = getScientificStructureEvidence("allen_hypothalamus_l");
    expect(evidence?.canonicalIdentity).toMatchObject({
      ontology: "UBERON",
      id: "UBERON:0001898",
      reviewStatus: "requires-user-review",
    });
    expect(evidence?.evidenceTier).toBe("structure-context");
    expect(evidence?.scientificTarget).toMatchObject({
      coordinate: null,
      status: "unavailable",
      evidenceTier: "structure-context",
    });
    expect(evidence?.registrationStatus.lunaToMni).toBe("not-established");
  });

  it("preserves unmapped structures instead of deriving identifiers from their names", () => {
    const evidence = getScientificStructureEvidence("allen_thalamus_l");
    expect(evidence?.canonicalIdentity).toBeNull();
    expect(evidence?.scientificTarget.structureUberonId).toBeNull();
    expect(evidence?.scientificTarget.coordinate).toBeNull();
  });

  it("records Julich as non-redistributed and BigBrain/Allen as review-required", () => {
    expect(SCIENTIFIC_LICENSE_REGISTRY.find((record) => record.id === "julich-brain-v3-1")).toMatchObject({ redistribution: "not-redistributed" });
    expect(SCIENTIFIC_LICENSE_REGISTRY.find((record) => record.id === "bigbrain-provider-context")).toMatchObject({ redistribution: "review-required" });
    expect(SCIENTIFIC_LICENSE_REGISTRY.find((record) => record.id === "allen-human-brain-atlas")).toMatchObject({ redistribution: "review-required" });
    expect(SCIENTIFIC_PROVENANCE_REGISTRY.find((record) => record.id === "julich-brain-v3-1-mni-2009c")).toMatchObject({ evidenceTier: "region-probabilistic", referenceSpaceId: "ebrains-mni-icbm-152-2009c" });
  });
});
