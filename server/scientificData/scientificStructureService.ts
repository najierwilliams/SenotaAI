import { HRA_V11_STRUCTURE_CROSSWALK, HRA_V11_STRUCTURE_CROSSWALK_SUMMARY } from "./hraStructureCrosswalk.generated";
import { BRAIN_LUNA_REFERENCE_REGISTRATION } from "./registry";

export function getScientificStructureEvidence(lunaStructureId: string) {
  const record = HRA_V11_STRUCTURE_CROSSWALK.find((item) => item.lunaStructureId === lunaStructureId) ?? null;
  if (!record) return null;
  return {
    lunaStructure: { id: record.lunaStructureId, sourceName: record.lunaSourceName, meshBacked: record.meshBacked },
    canonicalIdentity: record.canonicalStructureId ? {
      ontology: record.canonicalOntology,
      id: record.canonicalStructureId,
      hraEntityId: record.hraEntityId,
      hraEntityLabel: record.hraEntityLabel,
      status: record.mappingStatus,
      evidence: record.mappingEvidence,
      provenance: record.provenance,
      version: record.sourceVersion,
    } : null,
    providerMappings: [],
    referenceSpaces: [{ id: "ebrains-mni-icbm-152-2009c", status: "available", note: "Scientific provider reference only; no Luna coordinate is supplied." }],
    scientificFeatures: { julich: "unmapped", bigbrain: "provider-context-only", cellular: "unavailable", molecular: "unavailable" },
    registrationStatus: { lunaToMni: "not-established", id: BRAIN_LUNA_REFERENCE_REGISTRATION.id },
    spatialStatus: { coordinate: "unavailable", reason: "Structure identity is not a Luna-to-MNI coordinate transform or operational nanobot target." },
    limitations: ["No Luna visual, GLB, or viewer coordinate is included.", "No UBERON-to-Julich region mapping is inferred from names.", "Structure-context mapping does not enable lower-scale missions."],
  };
}

export function getScientificStructureCrosswalkSummary() {
  return HRA_V11_STRUCTURE_CROSSWALK_SUMMARY;
}
