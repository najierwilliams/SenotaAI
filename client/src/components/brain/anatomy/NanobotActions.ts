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

export interface NanobotFleetInspection {
  total: number;
  active: number;
  paused: number;
  returning: number;
  failed: number;
  entries: Array<{
    id: string;
    type: Nanobot["type"];
    state: Nanobot["state"];
    targetStructureId: string | null;
    targetStructureName: string | null;
    missionId: string;
    progress: number;
  }>;
}

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

  inspectNanobot(id: string): Nanobot | null {
    return nanobotRegistry.get(id);
  },

  inspectFleet(): NanobotFleetInspection {
    const fleet = nanobotRegistry.getAll();
    return {
      total: fleet.length,
      active: fleet.filter((nanobot) =>
        ["deploying", "navigating", "arrived", "working"].includes(
          nanobot.state,
        ),
      ).length,
      paused: fleet.filter((nanobot) => nanobot.state === "paused").length,
      returning: fleet.filter((nanobot) => nanobot.state === "returning").length,
      failed: fleet.filter((nanobot) => nanobot.state === "error").length,
      entries: fleet.map((nanobot) => ({
        id: nanobot.id,
        type: nanobot.type,
        state: nanobot.state,
        targetStructureId: nanobot.target?.structureId ?? null,
        targetStructureName: nanobot.target?.structureName ?? null,
        missionId: nanobot.mission.id,
        progress: nanobot.mission.progress,
      })),
    };
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
      scientificObservation:
        input.observationContext.scientificObservation,
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

  pause(id: string): boolean {
    const nanobot = nanobotRegistry.get(id);
    return nanobot ? nanobotMissionEngine.pause(nanobot) : false;
  },

  resume(id: string): boolean {
    const nanobot = nanobotRegistry.get(id);
    return nanobot ? nanobotMissionEngine.resume(nanobot) : false;
  },

  requestReturn(id: string): boolean {
    const nanobot = nanobotRegistry.get(id);
    return nanobot ? nanobotMissionEngine.requestReturn(nanobot) : false;
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

  cancelFleet(): number {
    return this.returnFleet();
  },
};

export type NanobotActionFacade = typeof nanobotActions;
