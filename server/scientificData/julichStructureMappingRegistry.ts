import { getApprovedCanonicalAnatomyIdentities } from "./canonicalAnatomyService";

export type JulichStructureMappingType =
  | "ONE_TO_ONE"
  | "ONE_TO_MANY"
  | "MANY_TO_ONE"
  | "PROBABILISTIC"
  | "UNMAPPED";

export type JulichStructureMappingStatus =
  | "AUTHORITATIVE"
  | "PROBABILISTIC"
  | "REQUIRES_DOMAIN_REVIEW"
  | "UNMAPPED";

export interface JulichStructureMappingRecord {
  lunaStructureId: string;
  lunaStructureName: string;
  uberonId: string;
  hraId: string;
  julichRegionId: string | null;
  julichRegionName: string | null;
  mappingType: JulichStructureMappingType;
  mappingStatus: JulichStructureMappingStatus;
  evidenceTier: "structure-context" | "region-probabilistic" | "point-validated";
  evidence: string;
  source: string;
  sourceUrl: string;
  sourceVersion: string;
  referenceSpace: "MNI ICBM 152 2009c Nonlinear Asymmetric";
  referenceSpaceId: "ebrains-mni-icbm-152-2009c";
  confidence: "not-applicable" | "provider-declared" | "review-required";
  provenance: string;
  notes: string;
}

export const JULICH_STRUCTURE_MAPPING_POLICY = {
  dataset: "Julich-Brain Atlas cytoarchitectonic maps v3.1",
  datasetDoi: "10.25493/KNSN-XB4",
  providerParcellationId: "minds/core/parcellationatlas/v1.0.0/94c1125b-b87e-45e4-901c-00daee7f2579-310",
  referenceSpace: "MNI ICBM 152 2009c Nonlinear Asymmetric",
  referenceSpaceId: "ebrains-mni-icbm-152-2009c",
  mappingRequirement: "A published provider/ontology relation or a reviewed explicit canonical-to-Julich correspondence. Name similarity, mesh similarity, HRA placement, and coordinate assignment are not crosswalk evidence.",
  probabilityCapability: "Provider-space MNI coordinates can return probabilistic Julich assignments. That capability does not map a Luna mesh, viewer coordinate, HRA placement, or UBERON identity to a Julich region.",
  source: "https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777",
  sourceVersion: "Julich-Brain v3.1, released 2024-06-23",
  license: "CC BY-NC-SA 4.0; Luna does not redistribute maps or meshes.",
} as const;

const NO_CROSSWALK_EVIDENCE = "Live Julich-Brain v3.1 provider metadata exposes provider-native region identifiers and has null ontologyIdentifier metadata; the verified EBRAINS/siibra/AtOM investigation found no published HRA, UBERON, or FMA to Julich-Brain region crosswalk. No relation is inferred from names, visual similarity, mesh geometry, HRA placement, or coordinate assignment.";

/**
 * The user-attested approved population is the sole input. Each record is
 * intentionally UNMAPPED until an explicit authoritative relation is added.
 * This is a complete classification registry, not a name-derived crosswalk.
 */
export const JULICH_STRUCTURE_MAPPINGS: JulichStructureMappingRecord[] =
  getApprovedCanonicalAnatomyIdentities().map((identity) => ({
    lunaStructureId: identity.lunaStructureId,
    lunaStructureName: identity.lunaStructureName,
    uberonId: identity.uberonId!,
    hraId: identity.hraEntityId!,
    julichRegionId: null,
    julichRegionName: null,
    mappingType: "UNMAPPED",
    mappingStatus: "UNMAPPED",
    evidenceTier: "structure-context",
    evidence: NO_CROSSWALK_EVIDENCE,
    source: "EBRAINS Knowledge Graph / siibra v3.0 live metadata review",
    sourceUrl: JULICH_STRUCTURE_MAPPING_POLICY.source,
    sourceVersion: JULICH_STRUCTURE_MAPPING_POLICY.sourceVersion,
    referenceSpace: JULICH_STRUCTURE_MAPPING_POLICY.referenceSpace,
    referenceSpaceId: JULICH_STRUCTURE_MAPPING_POLICY.referenceSpaceId,
    confidence: "not-applicable",
    provenance: "Approved Luna identity derives from the exact HRA Brain-Female v1.1 graph file_subpath to UBERON join. Julich classification derives from the documented absence of a verified external ontology relation in the checked provider records and official documentation.",
    notes: "Approved anatomical identity remains valid. No defensible Julich structure-level correspondence is established; no Luna-to-MNI or Luna-to-Julich coordinate registration is created.",
  }));

export function getJulichStructureMappings(lunaStructureId: string) {
  return JULICH_STRUCTURE_MAPPINGS.filter((record) => record.lunaStructureId === lunaStructureId);
}

export function getJulichStructureMapping(lunaStructureId: string) {
  return JULICH_STRUCTURE_MAPPINGS.find((record) => record.lunaStructureId === lunaStructureId) ?? null;
}

export function getJulichStructureMappingSummary() {
  return {
    totalApproved: JULICH_STRUCTURE_MAPPINGS.length,
    authoritative: JULICH_STRUCTURE_MAPPINGS.filter((record) => record.mappingStatus === "AUTHORITATIVE").length,
    probabilistic: JULICH_STRUCTURE_MAPPINGS.filter((record) => record.mappingStatus === "PROBABILISTIC").length,
    requiresDomainReview: JULICH_STRUCTURE_MAPPINGS.filter((record) => record.mappingStatus === "REQUIRES_DOMAIN_REVIEW").length,
    unmapped: JULICH_STRUCTURE_MAPPINGS.filter((record) => record.mappingStatus === "UNMAPPED").length,
  };
}
