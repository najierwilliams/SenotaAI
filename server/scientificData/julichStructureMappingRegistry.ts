export type JulichStructureMappingType =
  | "one-to-one"
  | "one-to-many"
  | "many-to-one"
  | "probabilistic"
  | "unmapped";

export interface JulichStructureMappingRecord {
  lunaStructureId: string;
  canonicalOntology: "UBERON" | null;
  canonicalId: string | null;
  julichRegionId: string | null;
  julichRegionName: string | null;
  mappingType: JulichStructureMappingType;
  evidence: string;
  source: string;
  sourceVersion: string;
  referenceSpaceId: "ebrains-mni-icbm-152-2009c";
  status: "evidence-backed" | "unmapped";
  provenance: string;
}

/**
 * No Luna structure-to-Julich record is created until an authoritative
 * canonical-ontology-to-provider-region relation is available. Provider
 * examples showing region-name searches are not accepted as crosswalk evidence.
 */
export const JULICH_STRUCTURE_MAPPINGS: JulichStructureMappingRecord[] = [];

export const JULICH_STRUCTURE_MAPPING_POLICY = {
  dataset: "Julich-Brain Atlas cytoarchitectonic maps v3.1",
  referenceSpace: "MNI ICBM 152 2009c Nonlinear Asymmetric",
  referenceSpaceId: "ebrains-mni-icbm-152-2009c",
  providerParcellationVersion: "v3.1",
  mappingRequirement: "A published provider/ontology relation or reviewed explicit canonical-to-Julich correspondence; name similarity is not evidence.",
  probabilityCapability: "Provider-space coordinates can return probabilistic Julich assignments; that capability does not map Luna meshes to MNI.",
  source: "https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777",
} as const;

export function getJulichStructureMappings(lunaStructureId: string) {
  return JULICH_STRUCTURE_MAPPINGS.filter((record) => record.lunaStructureId === lunaStructureId);
}
