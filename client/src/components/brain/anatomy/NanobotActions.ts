import {
  nanobotMissionEngine,
} from "./NanobotMissionEngine";

import {
  nanobotRegistry,
} from "./NanobotRegistry";

import {
  resolveNanobotTarget,
  type NanobotTargetResolution,
} from "./NanobotTargetResolver";

import type {
  BrainObservationContext,
} from "./BrainObservationContext";

import type {
  BrainStructure,
} from "./BrainStructureRegistry";

import type {
  Nanobot,
  NanobotMissionResult,
  NanobotPosition,
  NanobotTarget,
} from "./NanobotTypes";

export interface NanobotSpatialResolutionInput {
  structure: BrainStructure;
  observationContext: BrainObservationContext;
  macroPosition?: NanobotPosition | null;
}

export interface NanobotSpatialCapabilityResponse {
  structureId: string;
  scale: BrainObservationContext["scale"];
  status: "available" | "unavailable";
  reason: string;
  capability: BrainObservationContext["spatialCapability"];
}

/**
 * Integration-facing mission actions. Renderers remain responsible for
 * supplying an actual Macro viewer coordinate, creating/removing Three.js
 * visuals, and invoking `start` with that resolved target. This facade exposes
 * no React setters and never turns metadata into a scientific coordinate.
 */
export const nanobotActions = {
  getFleet(): Nanobot[] {
    return nanobotRegistry.getAll();
  },

  getMissionHistory(): NanobotMissionResult[] {
    return nanobotRegistry.getMissionHistory();
  },

  inspectTarget(structureId: string): Nanobot[] {
    return nanobotRegistry.inspectTarget(structureId);
  },

  evaluateTarget(target: NanobotTarget | null) {
    return nanobotMissionEngine.canDeploy(target);
  },

  resolveTarget(
    input: NanobotSpatialResolutionInput,
  ): NanobotTargetResolution {
    return resolveNanobotTarget({
      structure: input.structure,
      observationScale: input.observationContext.scale,
      macroPosition: input.macroPosition ?? null,
      spatialTarget: input.observationContext.spatialTarget,
      spatialCapability:
        input.observationContext.spatialCapability,
      referenceSpace: input.observationContext.referenceSpace,
      coordinateTransform:
        input.observationContext.coordinateTransform,
    });
  },

  getTargetCapability(
    structureId: string,
    observationContext: BrainObservationContext,
  ): NanobotSpatialCapabilityResponse {
    const capability = observationContext.spatialCapability;
    const matchesContext =
      !observationContext.structureId ||
      observationContext.structureId === structureId;
    const available = Boolean(
      matchesContext &&
      capability?.operationEnabled,
    );

    return {
      structureId,
      scale: observationContext.scale,
      status: available ? "available" : "unavailable",
      reason: !matchesContext
        ? "The supplied structure does not match the active observation context."
        : capability?.reason ??
          "No spatial capability record is available for this observation context.",
      capability,
    };
  },

  getSpatialTarget(
    observationContext: BrainObservationContext,
  ) {
    return observationContext.spatialTarget;
  },

  getReferenceSpace(
    observationContext: BrainObservationContext,
  ) {
    return observationContext.referenceSpace;
  },

  getDatasetProvenance(
    observationContext: BrainObservationContext,
  ) {
    return observationContext.provenance;
  },

  pauseFleet(): number {
    let count = 0;
    nanobotRegistry.getAll().forEach((nanobot) => {
      if (nanobotMissionEngine.pause(nanobot)) count += 1;
    });
    return count;
  },

  resumeFleet(): number {
    let count = 0;
    nanobotRegistry.getAll().forEach((nanobot) => {
      if (nanobotMissionEngine.resume(nanobot)) count += 1;
    });
    return count;
  },

  returnFleet(): number {
    let count = 0;
    nanobotRegistry.getAll().forEach((nanobot) => {
      if (nanobotMissionEngine.requestReturn(nanobot)) count += 1;
    });
    return count;
  },
};

export type NanobotActionFacade = typeof nanobotActions;
