import type {
  BrainCoordinate,
  BrainCoordinateTransform,
  BrainReferenceSpace,
  LunaReferenceRegistration,
} from "@shared/brainScience";
import {
  BRAIN_COORDINATE_TRANSFORMS,
  BRAIN_LUNA_REFERENCE_REGISTRATION,
  BRAIN_REFERENCE_SPACES,
} from "./registry";

export type CoordinateTransformFailure =
  | "unknown-source-space"
  | "unknown-target-space"
  | "reference-space-version-mismatch"
  | "invalid-coordinate"
  | "invalid-units"
  | "transform-unavailable"
  | "provider-transform-not-executable"
  | "missing-transform-id"
  | "missing-provenance"
  | "unsupported-transform"
  | "registration-not-established"
  | "registration-experimental"
  | "registration-provider-validated"
  | "registration-rejected"
  | "registration-unavailable"
  | "registration-invalid";

export interface CoordinateTransformSuccess {
  status: "resolved";
  coordinate: BrainCoordinate;
  sourceSpace: BrainReferenceSpace;
  targetSpace: BrainReferenceSpace;
  transform: BrainCoordinateTransform;
}

export interface CoordinateTransformUnavailable {
  status: "unavailable";
  reason: string;
  failure: CoordinateTransformFailure;
  sourceSpace: BrainReferenceSpace | null;
  targetSpace: BrainReferenceSpace | null;
  transform: BrainCoordinateTransform | null;
}

export type CoordinateTransformResult =
  | CoordinateTransformSuccess
  | CoordinateTransformUnavailable;

export interface CoordinateTransformVersionExpectation {
  sourceVersion?: string | null;
  targetVersion?: string | null;
}

/**
 * Strict request contract for every request that purports to transform an
 * external coordinate. A registration ID and provenance are required so that
 * callers cannot silently convert a point using a visual or undocumented path.
 */
export interface StrictCoordinateTransformRequest {
  coordinate: BrainCoordinate;
  sourceReferenceSpaceId: string;
  targetReferenceSpaceId: string;
  transformId: string | null;
  provenance: string | null;
  expectedVersions?: CoordinateTransformVersionExpectation;
}

function getReferenceSpace(
  id: string,
): BrainReferenceSpace | null {
  return (
    BRAIN_REFERENCE_SPACES.find(
      (space) => space.id === id,
    ) ?? null
  );
}

function getTransform(
  sourceReferenceSpaceId: string,
  targetReferenceSpaceId: string,
): BrainCoordinateTransform | null {
  return (
    BRAIN_COORDINATE_TRANSFORMS.find(
      (transform) =>
        transform.sourceReferenceSpaceId ===
          sourceReferenceSpaceId &&
        transform.targetReferenceSpaceId ===
          targetReferenceSpaceId,
    ) ?? null
  );
}

const LUNA_NATIVE_REFERENCE_SPACE_IDS = new Set([
  "luna-viewer-local",
  "luna-raw-hra-v11-allen-brain-glb",
]);

const MNI_ICBM_2009C_REFERENCE_SPACE_ID =
  "ebrains-mni-icbm-152-2009c";

function isLunaMniRegistrationRequest(
  sourceReferenceSpaceId: string,
  targetReferenceSpaceId: string,
): boolean {
  return (
    (LUNA_NATIVE_REFERENCE_SPACE_IDS.has(sourceReferenceSpaceId) &&
      targetReferenceSpaceId === MNI_ICBM_2009C_REFERENCE_SPACE_ID) ||
    (sourceReferenceSpaceId === MNI_ICBM_2009C_REFERENCE_SPACE_ID &&
      LUNA_NATIVE_REFERENCE_SPACE_IDS.has(targetReferenceSpaceId))
  );
}

function isValidCoordinate(
  coordinate: BrainCoordinate,
): boolean {
  return (
    Number.isFinite(coordinate.x) &&
    Number.isFinite(coordinate.y) &&
    Number.isFinite(coordinate.z)
  );
}

function createIdentityTransform(
  referenceSpaceId: string,
): BrainCoordinateTransform {
  return {
    id: `${referenceSpaceId}-identity`,
    sourceReferenceSpaceId: referenceSpaceId,
    targetReferenceSpaceId: referenceSpaceId,
    status: "identity",
    transformType: "identity",
    version: null,
    method: "Identity within the declared reference space",
    documentationUrl: null,
    confidence: "Exact within the same declared coordinate frame",
    reversible: true,
    note:
      "Identity is permitted only when source and target reference-space IDs are identical.",
  };
}

/**
 * Performs only transforms whose executable parameters are present in Luna.
 * Provider-documented registrations without executable provider parameters are
 * reported as unavailable; they are never approximated with a viewer scale,
 * mesh bounds, or invented affine.
 */
export function transformCoordinate(
  coordinate: BrainCoordinate,
  sourceReferenceSpaceId: string,
  targetReferenceSpaceId: string,
  expectedVersions: CoordinateTransformVersionExpectation = {},
): CoordinateTransformResult {
  const sourceSpace = getReferenceSpace(
    sourceReferenceSpaceId,
  );

  if (!sourceSpace) {
    return {
      status: "unavailable",
      reason:
        `Unknown source reference space: ${sourceReferenceSpaceId}.`,
      failure: "unknown-source-space",
      sourceSpace: null,
      targetSpace: getReferenceSpace(targetReferenceSpaceId),
      transform: null,
    };
  }

  const targetSpace = getReferenceSpace(
    targetReferenceSpaceId,
  );

  if (!targetSpace) {
    return {
      status: "unavailable",
      reason:
        `Unknown target reference space: ${targetReferenceSpaceId}.`,
      failure: "unknown-target-space",
      sourceSpace,
      targetSpace: null,
      transform: null,
    };
  }

  if (
    (expectedVersions.sourceVersion !== undefined &&
      expectedVersions.sourceVersion !== sourceSpace.version) ||
    (expectedVersions.targetVersion !== undefined &&
      expectedVersions.targetVersion !== targetSpace.version)
  ) {
    return {
      status: "unavailable",
      reason:
        "Declared reference-space version does not match the registered source or target reference space.",
      failure: "reference-space-version-mismatch",
      sourceSpace,
      targetSpace,
      transform: null,
    };
  }

  if (!isValidCoordinate(coordinate)) {
    return {
      status: "unavailable",
      reason:
        "Coordinate must contain finite x, y, and z values.",
      failure: "invalid-coordinate",
      sourceSpace,
      targetSpace,
      transform: null,
    };
  }

  if (
    sourceSpace.units &&
    coordinate.units !== sourceSpace.units
  ) {
    return {
      status: "unavailable",
      reason:
        `Coordinate units ${coordinate.units} do not match the declared ${sourceSpace.label} units ${sourceSpace.units}.`,
      failure: "invalid-units",
      sourceSpace,
      targetSpace,
      transform: null,
    };
  }

  if (
    sourceReferenceSpaceId !== targetReferenceSpaceId &&
    isLunaMniRegistrationRequest(
      sourceReferenceSpaceId,
      targetReferenceSpaceId,
    )
  ) {
    const registration = BRAIN_LUNA_REFERENCE_REGISTRATION;
    const gate = registration.qualityGate;
    const qualityFailures: Record<
      Exclude<typeof gate.status, "VALIDATED">,
      CoordinateTransformFailure
    > = {
      NOT_ESTABLISHED: "registration-not-established",
      EXPERIMENTAL: "registration-experimental",
      PROVIDER_VALIDATED: "registration-provider-validated",
      REJECTED: "registration-rejected",
    };

    if (gate.status !== "VALIDATED" || !gate.transformEnabled) {
      return {
        status: "unavailable",
        reason:
          `Luna/MNI registration quality gate is ${gate.status}: ${gate.decision}`,
        failure: qualityFailures[gate.status as Exclude<typeof gate.status, "VALIDATED">],
        sourceSpace,
        targetSpace,
        transform: getTransform(
          sourceReferenceSpaceId,
          targetReferenceSpaceId,
        ),
      };
    }

    if (
      registration.status !== "validated" ||
      !registration.transformArtifact?.executable ||
      registration.validation.status !== "passed"
    ) {
      return {
        status: "unavailable",
        reason:
          "Luna/MNI registration quality gate is VALIDATED but its executable artifact or independent validation record is incomplete.",
        failure: "registration-invalid",
        sourceSpace,
        targetSpace,
        transform: getTransform(
          sourceReferenceSpaceId,
          targetReferenceSpaceId,
        ),
      };
    }
  }

  if (sourceReferenceSpaceId === targetReferenceSpaceId) {
    return {
      status: "resolved",
      coordinate: { ...coordinate },
      sourceSpace,
      targetSpace,
      transform: createIdentityTransform(sourceReferenceSpaceId),
    };
  }

  const transform = getTransform(
    sourceReferenceSpaceId,
    targetReferenceSpaceId,
  );

  if (!transform || transform.status === "unavailable") {
    return {
      status: "unavailable",
      reason:
        `Reference-space registration unavailable from ${sourceSpace.label} to ${targetSpace.label}.`,
      failure: "transform-unavailable",
      sourceSpace,
      targetSpace,
      transform: transform ?? null,
    };
  }

  return {
    status: "unavailable",
    reason:
      `The registered ${transform.transformType} transform from ${sourceSpace.label} to ${targetSpace.label} is provider-documented but has no executable parameters in Luna.`,
    failure: "provider-transform-not-executable",
    sourceSpace,
    targetSpace,
    transform,
  };
}

export function transformCoordinateStrict(
  request: StrictCoordinateTransformRequest,
): CoordinateTransformResult {
  const sourceSpace = getReferenceSpace(request.sourceReferenceSpaceId);
  const targetSpace = getReferenceSpace(request.targetReferenceSpaceId);

  if (!request.transformId?.trim()) {
    return {
      status: "unavailable",
      reason: "A transform ID is required for every coordinate transformation request.",
      failure: "missing-transform-id",
      sourceSpace,
      targetSpace,
      transform: null,
    };
  }

  if (!request.provenance?.trim()) {
    return {
      status: "unavailable",
      reason: "Coordinate provenance is required for every coordinate transformation request.",
      failure: "missing-provenance",
      sourceSpace,
      targetSpace,
      transform: null,
    };
  }

  const declaredTransform = getCoordinateTransform(
    request.sourceReferenceSpaceId,
    request.targetReferenceSpaceId,
  );
  if (!declaredTransform || declaredTransform.id !== request.transformId) {
    return {
      status: "unavailable",
      reason: "The supplied transform ID is not registered for the declared source and target spaces.",
      failure: "unsupported-transform",
      sourceSpace,
      targetSpace,
      transform: declaredTransform,
    };
  }

  return transformCoordinate(
    request.coordinate,
    request.sourceReferenceSpaceId,
    request.targetReferenceSpaceId,
    request.expectedVersions,
  );
}

export function getLunaReferenceRegistration(): LunaReferenceRegistration {
  return BRAIN_LUNA_REFERENCE_REGISTRATION;
}

/**
 * A concise operational predicate for future callers. It intentionally requires
 * both a validated quality gate and a checksum-bound executable artifact with
 * passed independent validation; provider context alone never enables Luna.
 */
export function isLunaMniTransformEnabled(): boolean {
  const registration = BRAIN_LUNA_REFERENCE_REGISTRATION;
  return (
    registration.qualityGate.status === "VALIDATED" &&
    registration.qualityGate.transformEnabled &&
    registration.status === "validated" &&
    registration.transformArtifact?.executable === true &&
    registration.validation.status === "passed"
  );
}

export function getCoordinateTransform(
  sourceReferenceSpaceId: string,
  targetReferenceSpaceId: string,
): BrainCoordinateTransform | null {
  if (sourceReferenceSpaceId === targetReferenceSpaceId) {
    return createIdentityTransform(sourceReferenceSpaceId);
  }

  return getTransform(
    sourceReferenceSpaceId,
    targetReferenceSpaceId,
  );
}
