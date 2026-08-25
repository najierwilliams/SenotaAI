import type {
  BrainScale,
  BrainStructure,
} from "./BrainStructureRegistry";

import type {
  NanobotPosition,
  NanobotSpatialStatus,
} from "./NanobotTypes";

export interface NanobotTargetResolution {
  position: NanobotPosition | null;
  resolution: string | null;
  spatialStatus: NanobotSpatialStatus;
  message: string;
}

export interface ResolveNanobotTargetOptions {
  structure: BrainStructure;
  observationScale: BrainScale;
  macroPosition: NanobotPosition | null;
  hasDatasetBackedCoordinates: boolean;
}

export function resolveNanobotTarget(
  options: ResolveNanobotTargetOptions,
): NanobotTargetResolution {
  const {
    structure,
    observationScale,
    macroPosition,
    hasDatasetBackedCoordinates,
  } = options;

  if (
    observationScale === "macro" &&
    macroPosition
  ) {
    return {
      position: macroPosition,
      resolution: "Viewer-derived macro anatomy coordinate",
      spatialStatus: "resolved",
      message:
        `Macro target resolved from the active ${structure.displayName} mesh.`,
    };
  }

  if (hasDatasetBackedCoordinates) {
    return {
      position: null,
      resolution: null,
      spatialStatus: "transitioning",
      message:
        `${observationScale} coordinate support is registered but not yet resolved for ${structure.displayName}.`,
    };
  }

  return {
    position: null,
    resolution: null,
    spatialStatus: "unavailable",
    message:
      `${observationScale} spatial positioning is unavailable because the active observation dataset does not provide a mapped target coordinate.`,
  };
}
