import { getCanonicalAnatomyIdentity, getCanonicalAnatomySummary } from "./canonicalAnatomyService";
import { BRAIN_LUNA_REFERENCE_REGISTRATION } from "./registry";
import { getScientificLicense, getScientificProvenance } from "./scientificProvenanceRegistry";
import {
  getJulichStructureMapping,
  getJulichStructureMappingSummary,
  JULICH_STRUCTURE_MAPPING_POLICY,
} from "./julichStructureMappingRegistry";

export function getScientificStructureEvidence(lunaStructureId: string) {
  const record = getCanonicalAnatomyIdentity(lunaStructureId);
  if (!record) return null;
  const provenance = getScientificProvenance("hra-brain-female-v1-1-graph");
  const license = getScientificLicense("hra-brain-female-v1-1");
  const julichMapping = getJulichStructureMapping(lunaStructureId);
  const hasJulichStructureRelation = julichMapping?.mappingStatus === "AUTHORITATIVE" || julichMapping?.mappingStatus === "PROBABILISTIC";
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
      status: record.reviewStatus === "approved" ? "APPROVED" : "EVIDENCE_BACKED",
      evidence: record.evidence,
      provenance: record.sourceUrl,
      version: record.sourceVersion,
      reviewStatus: record.reviewStatus,
      reviewedAt: record.reviewedAt,
      reviewMethod: record.reviewMethod,
      reviewProvenance: record.reviewProvenance,
    } : null,
    scientificTarget,
    evidenceTier: "structure-context",
    provenance,
    license,
    providerMappings: julichMapping ? [julichMapping] : [],
    julichObservation: hasJulichStructureRelation
      ? { status: "available", evidenceTier: julichMapping!.evidenceTier, mapping: julichMapping }
      : {
        status: julichMapping?.mappingStatus ?? "unmapped",
        evidenceTier: "structure-context",
        mapping: julichMapping,
        policy: JULICH_STRUCTURE_MAPPING_POLICY,
        message: "No defensible anatomy-to-Julich region relationship is available for this approved identity. Provider MNI maps remain independently available but are not attached to this Luna structure.",
      },
    referenceSpaces: [{ id: "ebrains-mni-icbm-152-2009c", status: "available", note: "Scientific provider reference only; no Luna coordinate is supplied." }],
    scientificFeatures: { julich: hasJulichStructureRelation ? julichMapping!.evidenceTier : "unmapped", bigbrain: "provider-context-only", cellular: "unavailable", molecular: "unavailable" },
    registrationStatus: { lunaToMni: "not-established", id: BRAIN_LUNA_REFERENCE_REGISTRATION.id },
    spatialStatus: { coordinate: "unavailable", reason: "Structure identity is not a Luna-to-MNI coordinate transform or operational nanobot target." },
    limitations: ["No Luna visual, GLB, or viewer coordinate is included.", "No UBERON-to-Julich region mapping is inferred from names, HRA placement, visual similarity, mesh geometry, or a provider coordinate assignment.", "Structure-context mapping does not enable lower-scale missions."],
  };
}

export function getScientificStructureCrosswalkSummary() {
  return {
    canonical: getCanonicalAnatomySummary(),
    julich: getJulichStructureMappingSummary(),
  };
}
