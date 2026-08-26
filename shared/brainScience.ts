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
  | "donor-native"
  | "annotation"
  | "hra-reference-object"
  | "hra-body-reference"
  | "raw-asset";

/**
 * A declared scientific or application coordinate frame. Null fields are
 * intentional when a provider does not document the property for the source
 * currently integrated by Luna; consumers must not infer missing metadata.
 */
export interface BrainReferenceSpace {
  id: string;
  label: string;
  kind: BrainReferenceSpaceKind;
  provider: BrainDatasetProvider;
  template: string | null;
  units: string | null;
  axisOrientation: string | null;
  coordinateConvention: string | null;
  resolution: string | null;
  version: string | null;
  provenanceUrl: string | null;
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

export type BrainCoordinateTransformType =
  | "identity"
  | "affine"
  | "nonlinear"
  | "lookup"
  | "atlas-derived"
  | "provider-service"
  | "unavailable";

/**
 * A documented transform registration. `available` records that a provider
 * exposes a transform, while `unavailable` is an explicit scientific gate and
 * must never be replaced by a guessed affine or viewer normalization.
 */
export interface BrainCoordinateTransform {
  id: string;
  sourceReferenceSpaceId: string;
  targetReferenceSpaceId: string;
  status: BrainCoordinateTransformStatus;
  transformType: BrainCoordinateTransformType;
  version: string | null;
  method: string | null;
  documentationUrl: string | null;
  confidence: string | null;
  reversible: boolean | null;
  note: string;
}

export interface LunaReferenceRegistrationAsset {
  path: string;
  sha256: string;
  label: string;
  provider: string;
  sourceUrl: string | null;
  sourceVersion: string | null;
  license: string | null;
}

export type LunaRegistrationMethod =
  | "direct-documented-transform"
  | "affine-registration"
  | "nonlinear-registration"
  | "template-registration"
  | "surface-registration"
  | "atlas-registration"
  | "unavailable";

export type LunaRegistrationStatus =
  | "validated"
  | "unavailable"
  | "invalid";

export type LunaRegistrationValidationStatus =
  | "passed"
  | "not-run"
  | "failed"
  | "unavailable";

/**
 * Scientific quality status for a Luna-native registration. This is separate
 * from a legacy availability field so a consumer cannot mistake an HRA object
 * placement, a visual alignment, or a provider-context registration for a
 * validated Luna-native transform.
 *
 * Only `VALIDATED` may enable a future Luna-native coordinate transform, and
 * only when its checksum-bound executable artifact and independent validation
 * evidence are also present. `PROVIDER_VALIDATED` is retained for an upstream
 * provider relation that Luna cannot execute or independently validate.
 */
export type LunaRegistrationQualityStatus =
  | "NOT_ESTABLISHED"
  | "EXPERIMENTAL"
  | "VALIDATED"
  | "PROVIDER_VALIDATED"
  | "REJECTED";

export interface LunaRegistrationQualityGate {
  status: LunaRegistrationQualityStatus;
  assessedAt: string;
  assessmentVersion: string;
  decision: string;
  transformEnabled: boolean;
  requiredEvidence: string[];
  missingEvidence: string[];
}

/**
 * A versioned record of the scientific relationship between Luna's source
 * asset and an external reference space. It is deliberately present even when
 * unavailable so consumers can expose the precise missing evidence rather than
 * guessing from viewer normalization, mesh bounds, or anatomy labels.
 */
export interface LunaReferenceRegistration {
  id: string;
  status: LunaRegistrationStatus;
  sourceSpaceId: string;
  targetSpaceId: string;
  sourceAsset: LunaReferenceRegistrationAsset;
  registrationMethod: LunaRegistrationMethod;
  transformType: BrainCoordinateTransformType;
  transformArtifact: {
    id: string;
    format: string;
    path: string | null;
    sha256: string | null;
    executable: boolean;
  } | null;
  sourceUnits: string | null;
  targetUnits: string | null;
  sourceOrientation: string | null;
  targetOrientation: string | null;
  /** P33 evidence gate; only a VALIDATED gate with a valid artifact may transform Luna-native coordinates. */
  qualityGate: LunaRegistrationQualityGate;
  provenance: {
    sourceUrls: string[];
    citations: string[];
    notes: string[];
  };
  validation: {
    status: LunaRegistrationValidationStatus;
    method: string | null;
    landmarks: Array<{
      id: string;
      label: string;
      sourceCoordinate: BrainCoordinate | null;
      targetCoordinate: BrainCoordinate | null;
      residualMillimetres: number | null;
      status: "passed" | "failed" | "not-evaluated";
      note: string;
    }>;
    summary: string;
  };
  confidence: string | null;
  createdAt: string;
  version: string;
  blockers: string[];
}

export interface BrainCoordinate {
  x: number;
  y: number;
  z: number;
  units: string | null;
}

export type BrainSpatialCoordinateType =
  | "point"
  | "centroid"
  | "region"
  | "volume"
  | "surface"
  | "voxel"
  | "cell"
  | "unavailable";

export type BrainSpatialTargetStatus =
  | "resolved"
  | "unavailable";

/**
 * A target is only resolved if every coordinate field is backed by provider
 * data and its transform into Luna's active reference frame is documented.
 * Region targets intentionally do not require or imply a navigational point.
 */
export interface BrainSpatialTarget {
  structureId: string | null;
  datasetId: string | null;
  scale: BrainScientificScale;
  referenceSpace: BrainReferenceSpace | null;
  coordinate: BrainCoordinate | null;
  coordinateType: BrainSpatialCoordinateType;
  resolution: string | null;
  targetDerivation: string | null;
  sourceMap: string | null;
  probabilityThreshold: number | null;
  coordinateTransform: BrainCoordinateTransform | null;
  provenance: BrainDatasetProvenance | null;
  confidence: string | null;
  spatialStatus: BrainSpatialTargetStatus;
  reason: string | null;
}

export interface BrainSpatialCapability {
  scale: BrainScientificScale;
  datasetAvailable: boolean;
  spatialDataAvailable: boolean;
  referenceSpaceKnown: boolean;
  structureMappingAvailable: boolean;
  transformToLunaAvailable: boolean;
  coordinateResolved: boolean;
  targetTypeSupported: boolean;
  operationEnabled: boolean;
  reason: string;
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
  /** Luna Local-to-MNI record. This remains unavailable unless an independent MNI chain is validated. */
  registration: LunaReferenceRegistration;
  /** Exact HRA v1.1 raw-asset placement record; it is not an MNI registration. */
  hraSpatialRegistration: import("./hraSpatial").HraSpatialRegistration;
  structureMapping: BrainStructureMapping | null;
  referenceSpace: BrainReferenceSpace | null;
  coordinateTransform: BrainCoordinateTransform | null;
  spatialTarget: BrainSpatialTarget | null;
  spatialCapability: BrainSpatialCapability;
  findings: BrainScientificFinding[];
  message: string;
  cached: boolean;
  fetchedAt: string | null;
}

export type ScientificEvidenceTier =
  | "structure-context"
  | "region-probabilistic"
  | "point-validated";

export type ScientificReviewStatus =
  | "requires-user-review"
  | "reviewed"
  | "not-applicable";

export interface ScientificLicenseRecord {
  id: string;
  provider: string;
  dataset: string;
  license: string | null;
  redistribution: "not-redistributed" | "review-required" | "permitted-with-attribution";
  sourceUrl: string;
  note: string;
}

export interface ScientificProvenanceRecord {
  id: string;
  provider: string;
  dataset: string;
  version: string | null;
  sourceUrl: string;
  citation: string | null;
  referenceSpaceId: string | null;
  registrationMethod: string | null;
  retrievedAt: string | null;
  evidenceTier: ScientificEvidenceTier;
  licenseId: string;
}

export interface ScientificTarget {
  id: string;
  structureUberonId: string | null;
  structureFmaId: string | null;
  provider: BrainDatasetProvider | null;
  datasetId: string | null;
  datasetVersion: string | null;
  referenceSpaceId: string | null;
  coordinate: BrainCoordinate | null;
  coordinateUnits: string | null;
  registrationMethod: string | null;
  registrationErrorMillimetres: number | null;
  uncertaintySigmaMillimetres: number | null;
  evidenceTier: ScientificEvidenceTier;
  provenanceId: string;
  licenseId: string;
  status: "available" | "unavailable";
  limitation: string | null;
}

export type BrainScientificReferenceStatus =
  | "available"
  | "validated"
  | "deprecated"
  | "unavailable";

/**
 * An independent scientific coordinate asset. Its status applies solely inside
 * its declared provider reference space; it never establishes a registration
 * from Luna's presentation model.
 */
export interface BrainScientificReferenceAsset {
  id: string;
  name: string;
  provider: BrainDatasetProvider;
  version: string;
  status: BrainScientificReferenceStatus;
  role: "scientific-coordinate-reference";
  referenceSpaceId: string;
  providerReferenceSpaceId: string;
  coordinateSystem: string;
  units: string;
  axisOrientation: string;
  handedness: string | null;
  origin: string;
  assetAvailability: "provider-hosted" | "local" | "unavailable";
  assetFormats: string[];
  assetUrl: string | null;
  metadataUrl: string;
  license: string;
  provenance: string[];
  structureSource: {
    providerParcellationId: string;
    kind: string;
    identifiers: string;
    mappingPolicy: string;
  };
  transformSources: string[];
  availableScales: BrainScientificScale[];
  visualModelRelationship: string;
  limitations: string[];
}

export interface BrainScientificDatasetManifest {
  datasets: BrainDataset[];
  referenceSpaces: BrainReferenceSpace[];
  coordinateTransforms: BrainCoordinateTransform[];
  scientificReferences: BrainScientificReferenceAsset[];
  lunaReferenceRegistration: LunaReferenceRegistration;
  hraSpatialRegistration: import("./hraSpatial").HraSpatialRegistration;
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
