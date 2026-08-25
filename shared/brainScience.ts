export type BrainScientificScale =
  | "macro"
  | "tissue"
  | "cellular"
  | "subcellular"
  | "molecular";

export type BrainDatasetProvider =
  | "luna"
  | "ebrains"
  | "julich-brain"
  | "bigbrain"
  | "cellxgene"
  | "allen-institute"
  | "human-em";

export type BrainDatasetStatus =
  | "available"
  | "loading"
  | "unavailable"
  | "requires-authentication"
  | "error"
  | "offline"
  | "unsupported"
  | "partial";

export type BrainDatasetAccessType =
  | "local-asset"
  | "remote-api"
  | "remote-stream"
  | "server-query"
  | "download"
  | "metadata-only";

export type BrainReferenceSpaceKind =
  | "viewer-local"
  | "template"
  | "histological"
  | "donor-native";

export interface BrainReferenceSpace {
  id: string;
  label: string;
  kind: BrainReferenceSpaceKind;
  provider: BrainDatasetProvider;
  units: string | null;
  description: string;
}

export interface BrainDatasetProvenance {
  provider: string;
  datasetName: string;
  version: string | null;
  sourceUrl: string;
  citation: string | null;
  license: string | null;
  accessedAt: string | null;
  referenceSpaceIds: string[];
}

export interface BrainDataset {
  id: string;
  name: string;
  provider: BrainDatasetProvider;
  scale: BrainScientificScale;
  modality: string;
  species: "Homo sapiens" | "mixed";
  version: string | null;
  status: BrainDatasetStatus;
  accessType: BrainDatasetAccessType;
  endpoint: string | null;
  assetUrl: string | null;
  requiresAuthentication: boolean;
  downloadable: boolean;
  approximateSize: string | null;
  license: string | null;
  citation: string | null;
  referenceSpaceIds: string[];
  description: string;
  limitations: string | null;
}

export type BrainStructureMappingStatus =
  | "exact"
  | "broad"
  | "query-required"
  | "unmapped";

export interface BrainStructureMapping {
  canonicalStructureId: string;
  provider: BrainDatasetProvider;
  externalId: string | null;
  externalName: string | null;
  status: BrainStructureMappingStatus;
  note: string;
}

export type BrainCoordinateTransformStatus =
  | "identity"
  | "available"
  | "unavailable";

export interface BrainCoordinateTransform {
  id: string;
  sourceReferenceSpaceId: string;
  targetReferenceSpaceId: string;
  status: BrainCoordinateTransformStatus;
  method: string | null;
  documentationUrl: string | null;
  note: string;
}

export interface BrainScientificFinding {
  id: string;
  label: string;
  value: string;
  unit: string | null;
  kind:
    | "atlas"
    | "cellular-metadata"
    | "molecular-metadata"
    | "structure-mapping";
  provenance: BrainDatasetProvenance;
}

export interface BrainScientificObservation {
  scale: BrainScientificScale;
  status: BrainDatasetStatus;
  dataset: BrainDataset | null;
  structureMapping: BrainStructureMapping | null;
  referenceSpace: BrainReferenceSpace | null;
  coordinateTransform: BrainCoordinateTransform | null;
  findings: BrainScientificFinding[];
  message: string;
  cached: boolean;
  fetchedAt: string | null;
}

export interface BrainScientificDatasetManifest {
  datasets: BrainDataset[];
  referenceSpaces: BrainReferenceSpace[];
  coordinateTransforms: BrainCoordinateTransform[];
}

export function isDatasetUsable(
  status: BrainDatasetStatus,
): boolean {
  return (
    status === "available" ||
    status === "partial"
  );
}

export function getDatasetStatusLabel(
  status: BrainDatasetStatus,
): string {
  const labels: Record<BrainDatasetStatus, string> = {
    available: "Available",
    loading: "Loading",
    unavailable: "Unavailable",
    "requires-authentication": "Authentication required",
    error: "Provider error",
    offline: "Offline",
    unsupported: "Unsupported",
    partial: "Partially available",
  };

  return labels[status];
}
