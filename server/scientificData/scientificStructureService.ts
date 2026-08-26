import { getCanonicalAnatomyIdentity, getCanonicalAnatomySummary } from "./canonicalAnatomyService";
import { BRAIN_LUNA_REFERENCE_REGISTRATION } from "./registry";
import { getScientificLicense, getScientificProvenance } from "./scientificProvenanceRegistry";
import { getJulichStructureMappings, JULICH_STRUCTURE_MAPPING_POLICY } from "./julichStructureMappingRegistry";

export function getScientificStructureEvidence(lunaStructureId: string) {
  const record = getCanonicalAnatomyIdentity(lunaStructureId);
  if (!record) return null;
  const provenance = getScientificProvenance("hra-brain-female-v1-1-graph");
  const license = getScientificLicense("hra-brain-female-v1-1");
  const julichMappings = getJulichStructureMappings(lunaStructureId);
  const scientificTarget = {
    id: `structure-context:${record.lunaStructureId}`,
    structureUberonId: record.uberonId,
    structureFmaId: null,
    provider: null,
    datasetId: null,
    datasetVersion: null,
    referenceSpaceId: null,
    coordinate: null,
    coordinateUnits: null,
    registrationMethod: null,
    registrationErrorMillimetres: null,
    uncertaintySigmaMillimetres: null,
    evidenceTier: "structure-context" as const,
    provenanceId: "hra-brain-female-v1-1-graph",
    licenseId: "hra-brain-female-v1-1",
    status: "unavailable" as const,
    limitation: "Structure-context evidence is non-operational and has no Luna-to-reference-space coordinate.",
  };
  return {
    lunaStructure: { id: record.lunaStructureId, sourceName: record.lunaStructureName, meshBacked: record.meshBacked },
    canonicalIdentity: record.uberonId ? {
      ontology: "UBERON",
      id: record.uberonId,
      hraEntityId: record.hraEntityId,
      hraEntityLabel: record.canonicalName,
      status: "EVIDENCE_BACKED",
      evidence: record.evidence,
      provenance: record.sourceUrl,
      version: record.sourceVersion,
      reviewStatus: record.reviewStatus,
    } : null,
    scientificTarget,
    evidenceTier: "structure-context",
    provenance,
    license,
    providerMappings: julichMappings,
    julichObservation: julichMappings.length > 0
      ? { status: "available", evidenceTier: "region-probabilistic", mappings: julichMappings }
      : { status: "unmapped", evidenceTier: "structure-context", policy: JULICH_STRUCTURE_MAPPING_POLICY },
    referenceSpaces: [{ id: "ebrains-mni-icbm-152-2009c", status: "available", note: "Scientific provider reference only; no Luna coordinate is supplied." }],
    scientificFeatures: { julich: julichMappings.length > 0 ? "region-probabilistic" : "unmapped", bigbrain: "provider-context-only", cellular: "unavailable", molecular: "unavailable" },
    registrationStatus: { lunaToMni: "not-established", id: BRAIN_LUNA_REFERENCE_REGISTRATION.id },
    spatialStatus: { coordinate: "unavailable", reason: "Structure identity is not a Luna-to-MNI coordinate transform or operational nanobot target." },
    limitations: ["No Luna visual, GLB, or viewer coordinate is included.", "No UBERON-to-Julich region mapping is inferred from names.", "Structure-context mapping does not enable lower-scale missions."],
  };
}

export function getScientificStructureCrosswalkSummary() {
  return getCanonicalAnatomySummary();
}
