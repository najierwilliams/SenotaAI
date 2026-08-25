import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  BrainStructure,
} from "./BrainStructureRegistry";

import {
  NanobotMissionEngine,
} from "./NanobotMissionEngine";

import {
  NanobotRegistry,
} from "./NanobotRegistry";

import {
  resolveNanobotTarget,
} from "./NanobotTargetResolver";

const structure: BrainStructure = {
  id: "left-hippocampus",
  sourceName: "Left_Hippocampus",
  displayName: "Left Hippocampus",
  hemisphere: "left",
  category: "limbic",
  parentRegion: "medial_temporal_lobe",
  depth: "deep",
  scale: "macro",
  searchText: "left hippocampus limbic",
};

function assignMacroMission(
  registry: NanobotRegistry,
  type: "scout" | "diagnostic" = "scout",
) {
  const nanobot = registry.create(type);
  nanobot.position = { x: 0, y: 0, z: 0 };
  nanobot.deploymentPosition = { x: 0, y: 0, z: 0 };

  const resolved = resolveNanobotTarget({
    structure,
    observationScale: "macro",
    macroPosition: { x: 0.001, y: 0, z: 0 },
    hasDatasetBackedCoordinates: false,
  });

  const assigned = registry.assignTarget(nanobot.id, structure, {
    scale: "macro",
    datasetId: "luna-local-glb",
    status: "ready",
    scientificStatus: "available",
    contextLabel: "Macro anatomy navigation",
    targetPosition: resolved.position,
    targetResolution: resolved.resolution,
    spatialStatus: resolved.spatialStatus,
    spatialMessage: resolved.message,
  });

  if (!assigned || !assigned.target) {
    throw new Error("Expected a resolved Macro mission target.");
  }

  return assigned;
}

describe("NanobotMissionEngine", () => {
  it("runs a Macro simulation through arrival, verification, physical return, and one persisted result", () => {
    const registry = new NanobotRegistry();
    const engine = new NanobotMissionEngine();
    const nanobot = assignMacroMission(registry);
    const target = nanobot.target!;

    expect(engine.canDeploy(target)).toEqual({
      allowed: true,
      reason: "Macro simulation mission can be deployed.",
    });

    engine.start(nanobot, target, 1_000);
    expect(nanobot.state).toBe("deploying");
    expect(nanobot.mission.originalScale).toBe("macro");
    expect(nanobot.target?.targetPosition).toEqual({ x: 0.001, y: 0, z: 0 });

    engine.tick(nanobot, { deltaSeconds: 0.4, now: 1_400 });
    expect(nanobot.state).toBe("navigating");

    engine.tick(nanobot, { deltaSeconds: 0.1, now: 1_500 });
    expect(nanobot.state).toBe("arrived");

    engine.tick(nanobot, { deltaSeconds: 0.1, now: 1_600 });
    expect(nanobot.state).toBe("working");
    expect(nanobot.mission.phase).toBe("assessment");

    engine.tick(nanobot, { deltaSeconds: 10, now: 11_600 });
    expect(nanobot.state).toBe("returning");
    expect(nanobot.mission.phase).toBe("return");
    expect(nanobot.mission.result?.verificationStatus).toBe("simulation-verified");

    const completion = engine.tick(nanobot, { deltaSeconds: 10, now: 21_600 });
    expect(nanobot.state).toBe("completed");
    expect(nanobot.position).toEqual(nanobot.deploymentPosition);
    expect(completion.completedResult?.completedAt).toBe(21_600);
    expect(completion.completedResult?.operationMode).toBe("simulation");

    registry.recordMissionResult(nanobot.id, completion.completedResult!);
    registry.recordMissionResult(nanobot.id, completion.completedResult!);
    expect(registry.getMissionHistory()).toHaveLength(1);
    expect(registry.getMissionHistory()[0]?.missionNumber).toBe(1);
  });

  it("pauses and resumes the exact previous lifecycle state", () => {
    const registry = new NanobotRegistry();
    const engine = new NanobotMissionEngine();
    const nanobot = assignMacroMission(registry);

    engine.start(nanobot, nanobot.target!, 1_000);
    expect(engine.pause(nanobot)).toBe(true);
    expect(nanobot.state).toBe("paused");
    expect(nanobot.mission.pausedState).toBe("deploying");

    engine.tick(nanobot, { deltaSeconds: 5, now: 6_000 });
    expect(nanobot.mission.totalElapsedSeconds).toBe(0);

    expect(engine.resume(nanobot)).toBe(true);
    expect(nanobot.state).toBe("deploying");
  });

  it("rejects lower-scale metadata contexts without an operation result", () => {
    const registry = new NanobotRegistry();
    const engine = new NanobotMissionEngine();
    const nanobot = registry.create("diagnostic");
    const unresolved = resolveNanobotTarget({
      structure,
      observationScale: "tissue",
      macroPosition: null,
      hasDatasetBackedCoordinates: false,
    });
    const assigned = registry.assignTarget(nanobot.id, structure, {
      scale: "tissue",
      datasetId: "ebrains-julich",
      status: "ready",
      scientificStatus: "partial",
      targetPosition: unresolved.position,
      targetResolution: unresolved.resolution,
      spatialStatus: unresolved.spatialStatus,
      spatialMessage: unresolved.message,
    });

    expect(engine.canDeploy(assigned?.target ?? null).allowed).toBe(false);
    engine.start(assigned!, assigned!.target!, 1_000);
    expect(assigned?.state).toBe("error");
    expect(assigned?.mission.operationMode).toBe("unavailable");
    expect(assigned?.mission.result).toBeNull();
  });

  it("keeps independent fleet targets and preserves original mission context during a viewer scale transition", () => {
    const registry = new NanobotRegistry();
    const first = assignMacroMission(registry, "scout");
    const second = assignMacroMission(registry, "diagnostic");

    expect(first.id).not.toBe(second.id);
    registry.updateViewerScale("cellular");

    for (const nanobot of registry.getAll()) {
      expect(nanobot.target?.observationScale).toBe("macro");
      expect(nanobot.mission.originalScale).toBe("macro");
      expect(nanobot.presentation.viewerScale).toBe("cellular");
      expect(nanobot.presentation.transition?.status).toBe("view-only");
    }
  });
});


describe("NanobotTargetResolver spatial provenance", () => {
  it("preserves a Macro mesh-derived Luna-local target without claiming an external transform", () => {
    const target = resolveNanobotTarget({
      structure,
      observationScale: "macro",
      macroPosition: { x: 0.01, y: 0.02, z: 0.03 },
      referenceSpace: {
        id: "luna-viewer-local",
        label: "Luna viewer local coordinates",
        kind: "viewer-local",
        provider: "luna",
        template: null,
        units: null,
        axisOrientation: null,
        coordinateConvention: "Luna application rendering coordinates",
        resolution: null,
        version: null,
        provenanceUrl: null,
        description: "Local viewer frame",
      },
    });

    expect(target.spatialStatus).toBe("resolved");
    expect(target.position).toEqual({ x: 0.01, y: 0.02, z: 0.03 });
    expect(target.spatialTarget?.referenceSpace?.id).toBe("luna-viewer-local");
    expect(target.spatialTarget?.coordinateTransform).toBeNull();
  });

  it("preserves an unavailable Tissue atlas region instead of converting it to a Luna point", () => {
    const target = resolveNanobotTarget({
      structure,
      observationScale: "tissue",
      macroPosition: null,
      spatialTarget: {
        structureId: structure.id,
        datasetId: "julich-brain-cytoarchitecture",
        scale: "tissue",
        referenceSpace: null,
        coordinate: null,
        coordinateType: "region",
        resolution: null,
        targetDerivation: "Provider probabilistic atlas region",
        sourceMap: "Julich-Brain probabilistic cytoarchitectonic map",
        probabilityThreshold: null,
        coordinateTransform: null,
        provenance: null,
        confidence: null,
        spatialStatus: "unavailable",
        reason: "Tissue atlas maps are available in provider reference spaces, but no validated reference-space registration into Luna Local exists.",
      },
      spatialCapability: {
        scale: "tissue",
        datasetAvailable: true,
        spatialDataAvailable: true,
        referenceSpaceKnown: true,
        structureMappingAvailable: false,
        transformToLunaAvailable: false,
        coordinateResolved: false,
        targetTypeSupported: false,
        operationEnabled: false,
        reason: "Tissue atlas maps are available in provider reference spaces, but no validated reference-space registration into Luna Local exists.",
      },
    });

    expect(target.position).toBeNull();
    expect(target.spatialStatus).toBe("unavailable");
    expect(target.message).toContain("no validated reference-space registration into Luna Local");
    expect(target.spatialTarget?.coordinateType).toBe("region");
  });
});
