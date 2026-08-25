import type {
  BrainCoordinate,
  BrainCoordinateTransform,
  BrainReferenceSpace,
} from "@shared/brainScience";
import {
  BRAIN_COORDINATE_TRANSFORMS,
  BRAIN_REFERENCE_SPACES,
} from "./registry";

export type CoordinateTransformFailure =
  | "unknown-source-space"
  | "unknown-target-space"
  | "reference-space-version-mismatch"
  | "invalid-coordinate"
  | "invalid-units"
  | "transform-unavailable"
  | "provider-transform-not-executable";

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
