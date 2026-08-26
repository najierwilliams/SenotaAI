import { HRA_V11_STRUCTURE_CROSSWALK } from "./hraStructureCrosswalk.generated";

export type CanonicalMappingReviewStatus =
  | "evidence-backed-requires-review"
  | "unmapped";

export type UnmappedStructureTriage =
  | "anatomical-structure-requires-ontology-lookup"
  | "vessel-tract-ventricle-requires-specific-ontology"
  | "composite-or-reference-object"
  | "unknown";

export interface CanonicalAnatomyIdentity {
  lunaStructureId: string;
  lunaStructureName: string;
  meshBacked: boolean;
  uberonId: string | null;
  fmaId: null;
  canonicalName: string | null;
  parentId: null;
  hraEntityId: string | null;
  source: string;
  sourceVersion: string;
  sourceUrl: string;
  reviewStatus: CanonicalMappingReviewStatus;
  reviewedAt: null;
  reviewMethod: "exact-hra-graph-file-subpath-join" | null;
  evidence: string;
  unmappedTriage: UnmappedStructureTriage | null;
}

function triageUnmappedSource(sourceName: string): UnmappedStructureTriage {
  const name = sourceName.toLowerCase();
  if (/(ventricle|tract|fiber|peduncle|commissure|radiation|chiasm)/.test(name)) {
    return "vessel-tract-ventricle-requires-specific-ontology";
  }
  if (/(complex|region|area|matter|part_of|body)/.test(name)) {
    return "composite-or-reference-object";
  }
  if (name.startsWith("allen_")) {
    return "anatomical-structure-requires-ontology-lookup";
  }
  return "unknown";
}

export const CANONICAL_ANATOMY_IDENTITIES: CanonicalAnatomyIdentity[] =
  HRA_V11_STRUCTURE_CROSSWALK.map((record) => ({
    lunaStructureId: record.lunaStructureId,
    lunaStructureName: record.lunaSourceName,
    meshBacked: record.meshBacked,
    uberonId: record.canonicalStructureId,
    fmaId: null,
    canonicalName: record.hraEntityLabel,
    parentId: null,
    hraEntityId: record.hraEntityId,
    source: "HRA Brain-Female graph",
    sourceVersion: record.sourceVersion,
    sourceUrl: record.provenance,
    reviewStatus: record.mappingStatus === "EVIDENCE_BACKED"
      ? "evidence-backed-requires-review"
      : "unmapped",
    reviewedAt: null,
    reviewMethod: record.mappingStatus === "EVIDENCE_BACKED"
      ? "exact-hra-graph-file-subpath-join"
      : null,
    evidence: record.mappingEvidence,
    unmappedTriage: record.mappingStatus === "UNMAPPED"
      ? triageUnmappedSource(record.lunaSourceName)
      : null,
  }));

export function getCanonicalAnatomyIdentity(lunaStructureId: string) {
  return CANONICAL_ANATOMY_IDENTITIES.find((record) => record.lunaStructureId === lunaStructureId) ?? null;
}

export function getCanonicalAnatomyIdentities() {
  return CANONICAL_ANATOMY_IDENTITIES;
}

export function getCanonicalAnatomyReviewStatuses() {
  return CANONICAL_ANATOMY_IDENTITIES.map((record) => ({
    lunaStructureId: record.lunaStructureId,
    reviewStatus: record.reviewStatus,
  }));
}

export function getCanonicalAnatomySummary() {
  return {
    total: CANONICAL_ANATOMY_IDENTITIES.length,
    evidenceBackedRequiresReview: CANONICAL_ANATOMY_IDENTITIES.filter((record) => record.reviewStatus === "evidence-backed-requires-review").length,
    unmapped: CANONICAL_ANATOMY_IDENTITIES.filter((record) => record.reviewStatus === "unmapped").length,
  };
}
