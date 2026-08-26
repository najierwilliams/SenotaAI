import type {
  HraBrainFemaleCoordinate,
  HraCoordinateSpaceId,
  HraSpatialValidationStatus,
  LunaRawGlbCoordinate,
} from "./HraSpatialReference";

export type HraLandmarkValidationStatus =
  | "planned"
  | "passed"
  | "failed"
  | "not-evaluated";

export interface HraLandmarkValidationRecord {
  id: string;
  label: string;
  sourceCoordinate: LunaRawGlbCoordinate | null;
  targetCoordinate: HraBrainFemaleCoordinate | null;
  sourceSpaceId: "luna-raw-hra-v11-allen-brain-glb";
  targetSpaceId: "hra-brain-female-v1-1";
  expectedRelationship: string;
  observedRelationship: string | null;
  residualMillimetres: number | null;
  validationSource: string | null;
  validationDate: string | null;
  status: HraLandmarkValidationStatus;
  note: string;
}

export interface HraLandmarkValidationFramework {
  id: string;
  validationStatus: HraSpatialValidationStatus;
  validationMethod: string;
  records: HraLandmarkValidationRecord[];
  absenceReason: string;
  requiredBeforeScientificPromotion: string[];
}

/**
 * The graph placement is published metadata, but independent landmark
 * coordinates/residuals have not been supplied for this exact mesh. Retaining
 * an empty record set is deliberate: anatomical labels and viewer mesh centres
 * are not substitutes for landmark observations.
 */
export const HRA_LANDMARK_VALIDATION_FRAMEWORK: HraLandmarkValidationFramework = {
  id: "hra-v1-1-allen-f-brain-landmark-validation-v1",
  validationStatus: "metadata-only",
  validationMethod:
    "Future checksum-bound raw-GLB to HRA Brain-female landmark/structure validation against an authoritative HRA source with recorded residuals.",
  records: [],
  absenceReason:
    "No authoritative landmark-pair coordinates, orientation residuals, or independently measured target points were retrieved for the exact HRA v1.1 Allen_F_Brain.glb asset.",
  requiredBeforeScientificPromotion: [
    "Named source and target landmarks with their coordinate-space identifiers.",
    "A reproducible procedure binding every source coordinate to the checksum-pinned raw GLB.",
    "Expected and observed relationships with millimetre residuals.",
    "Independent review of axes, orientation, and transform-direction semantics.",
    "An explicit decision on whether the result validates only HRA placement or a later external registration.",
  ],
};

export function hasCompletedHraLandmarkValidation(
  framework: HraLandmarkValidationFramework = HRA_LANDMARK_VALIDATION_FRAMEWORK,
): boolean {
  return (
    framework.records.length > 0 &&
    framework.records.every((record) => record.status === "passed")
  );
}

export function isHraCoordinateSpacePair(
  sourceSpaceId: HraCoordinateSpaceId,
  targetSpaceId: HraCoordinateSpaceId,
): boolean {
  return (
    (sourceSpaceId === "luna-raw-hra-v11-allen-brain-glb" &&
      targetSpaceId === "hra-brain-female-v1-1") ||
    (sourceSpaceId === "hra-brain-female-v1-1" &&
      targetSpaceId === "luna-raw-hra-v11-allen-brain-glb") ||
    (sourceSpaceId === "hra-brain-female-v1-1" &&
      targetSpaceId === "hra-ccf-body-v1-2") ||
    (sourceSpaceId === "hra-ccf-body-v1-2" &&
      targetSpaceId === "hra-brain-female-v1-1")
  );
}
