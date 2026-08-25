import type {
  BrainScale,
  BrainStructure,
} from "./BrainStructureRegistry";

import type {
  BrainCoordinateTransform,
  BrainReferenceSpace,
  BrainSpatialCapability,
  BrainSpatialTarget,
} from "@shared/brainScience";

import type {
  NanobotPosition,
  NanobotSpatialStatus,
} from "./NanobotTypes";

export interface NanobotTargetResolution {
  position: NanobotPosition | null;
  resolution: string | null;
  spatialStatus: NanobotSpatialStatus;
  message: string;
  spatialTarget: BrainSpatialTarget | null;
  spatialCapability: BrainSpatialCapability | null;
  referenceSpace: BrainReferenceSpace | null;
  coordinateTransform: BrainCoordinateTransform | null;
}

export interface ResolveNanobotTargetOptions {
  structure: BrainStructure;
  observationScale: BrainScale;
  macroPosition: NanobotPosition | null;
  /** Existing compatibility hint; structured capability now takes precedence. */
  hasDatasetBackedCoordinates?: boolean;
  spatialTarget?: BrainSpatialTarget | null;
  spatialCapability?: BrainSpatialCapability | null;
  referenceSpace?: BrainReferenceSpace | null;
  coordinateTransform?: BrainCoordinateTransform | null;
}

/**
 * Resolves only actual navigation coordinates. Lower-scale provider regions,
 * maps, samples, and metadata remain structured evidence, not Luna positions,
 * until an explicit registration into Luna Local is available.
 */
export function resolveNanobotTarget(
  options: ResolveNanobotTargetOptions,
): NanobotTargetResolution {
  const {
    structure,
    observationScale,
    macroPosition,
    hasDatasetBackedCoordinates = false,
    spatialTarget = null,
    spatialCapability = null,
    referenceSpace = null,
    coordinateTransform = null,
  } = options;

  if (
    observationScale === "macro" &&
    macroPosition
  ) {
    const macroSpatialTarget: BrainSpatialTarget = {
      structureId: structure.id,
      datasetId: "luna-macro-anatomy-model",
      scale: "macro",
      referenceSpace,
      coordinate: {
        ...macroPosition,
        units: referenceSpace?.units ?? null,
      },
      coordinateType: "point",
      resolution: "Selected Luna GLB mesh world-space target",
      targetDerivation:
        "Selected Macro Three.js mesh world-space target centre.",
      sourceMap: null,
      probabilityThreshold: null,
      coordinateTransform: null,
      provenance: spatialTarget?.provenance ?? null,
      confidence:
        "Viewer-local rendering coordinate; not registered to an external scientific reference space.",
      spatialStatus: "resolved",
      reason: null,
    };

    return {
      position: macroPosition,
      resolution: macroSpatialTarget.resolution,
      spatialStatus: "resolved",
      message:
        `Macro target resolved from the active ${structure.displayName} mesh in Luna Local coordinates.`,
      spatialTarget: macroSpatialTarget,
      spatialCapability,
      referenceSpace,
      coordinateTransform: null,
    };
  }

  if (spatialTarget) {
    return {
      position: null,
      resolution: spatialTarget.resolution,
      spatialStatus:
        spatialTarget.spatialStatus === "resolved"
          ? "transitioning"
          : "unavailable",
      message:
        spatialTarget.reason ??
        `${observationScale} spatial target is unavailable.`,
      spatialTarget,
      spatialCapability,
      referenceSpace: spatialTarget.referenceSpace ?? referenceSpace,
      coordinateTransform:
        spatialTarget.coordinateTransform ??
        coordinateTransform,
    };
  }

  if (hasDatasetBackedCoordinates) {
    return {
      position: null,
      resolution: null,
      spatialStatus: "transitioning",
      message:
        `${observationScale} coordinate support is registered but not yet resolved for ${structure.displayName}.`,
      spatialTarget: null,
      spatialCapability,
      referenceSpace,
      coordinateTransform,
    };
  }

  return {
    position: null,
    resolution: null,
    spatialStatus: "unavailable",
    message:
      `${observationScale} spatial positioning is unavailable because the active observation dataset does not provide a mapped target coordinate.`,
    spatialTarget: null,
    spatialCapability,
    referenceSpace,
    coordinateTransform,
  };
}
