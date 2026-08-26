import { describe, expect, it } from "vitest";
import { getApprovedCanonicalAnatomyIdentities } from "./canonicalAnatomyService";
import {
  JULICH_STRUCTURE_MAPPINGS,
  JULICH_STRUCTURE_MAPPING_POLICY,
  getJulichStructureMappingSummary,
} from "./julichStructureMappingRegistry";

describe("approved anatomy to Julich classification registry", () => {
  it("covers exactly the approved source population once", () => {
    const approved = getApprovedCanonicalAnatomyIdentities();
    expect(approved).toHaveLength(102);
    expect(JULICH_STRUCTURE_MAPPINGS).toHaveLength(102);
    expect(new Set(JULICH_STRUCTURE_MAPPINGS.map((record) => record.lunaStructureId)).size).toBe(102);
    expect(new Set(JULICH_STRUCTURE_MAPPINGS.map((record) => record.lunaStructureId))).toEqual(
      new Set(approved.map((record) => record.lunaStructureId)),
    );
  });

  it("uses explicit unmapping rather than invented names, regions, probabilities, or coordinates", () => {
    for (const record of JULICH_STRUCTURE_MAPPINGS) {
      expect(record).toMatchObject({
        mappingStatus: "UNMAPPED",
        mappingType: "UNMAPPED",
        julichRegionId: null,
        julichRegionName: null,
        evidenceTier: "structure-context",
        referenceSpace: "MNI ICBM 152 2009c Nonlinear Asymmetric",
        referenceSpaceId: "ebrains-mni-icbm-152-2009c",
        sourceVersion: "Julich-Brain v3.1, released 2024-06-23",
        confidence: "not-applicable",
      });
      expect(record.uberonId).toMatch(/^UBERON:/);
      expect(record.hraId).toContain("humanatlas.io");
      expect(record.evidence).toContain("no published HRA, UBERON, or FMA to Julich-Brain region crosswalk");
      expect(record.notes).toContain("No defensible Julich structure-level correspondence");
    }
  });

  it("summarizes zero crosswalk relations and preserves the MNI-only provider gate", () => {
    expect(getJulichStructureMappingSummary()).toEqual({
      totalApproved: 102,
      authoritative: 0,
      probabilistic: 0,
      requiresDomainReview: 0,
      unmapped: 102,
    });
    expect(JULICH_STRUCTURE_MAPPING_POLICY.mappingRequirement).toContain("Name similarity");
    expect(JULICH_STRUCTURE_MAPPING_POLICY.probabilityCapability).toContain("does not map a Luna mesh, viewer coordinate");
    expect(JULICH_STRUCTURE_MAPPING_POLICY.license).toContain("does not redistribute maps or meshes");
  });
});
