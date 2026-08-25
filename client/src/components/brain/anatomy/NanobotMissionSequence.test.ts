import { describe, expect, it } from "vitest";

import {
  NanobotMissionSequenceRegistry,
} from "./NanobotMissionSequence";

import type {
  NanobotMissionResult,
} from "./NanobotTypes";

function result(
  missionId: string,
  success: boolean,
): NanobotMissionResult {
  return {
    missionId,
    missionNumber: 1,
    nanobotId: `bot-${missionId}`,
    mission: "scout",
    target: {
      structureId: "left_hippocampus",
      structureName: "Left hippocampus",
      hemisphere: "left",
      depth: "deep",
      parentStructureId: "hippocampus",
      parentStructureName: "hippocampus",
      sourceStructureScale: "macro",
      observationScale: "macro",
      observationDatasetId: "luna-macro-anatomy-model",
      observationStatus: "ready",
      observationScientificStatus: "available",
      observationContextLabel: "Left hippocampus · Macro Observation",
      targetPosition: { x: 0, y: 0, z: 0 },
      targetResolution: "Test mesh target",
      spatialStatus: "resolved",
      spatialMessage: "Test target resolved",
      spatialTarget: null,
      spatialCapability: null,
      referenceSpace: null,
      coordinateTransform: null,
      scientificSnapshot: {
        capturedAt: 1,
        observationScale: "macro",
        observationStatus: "ready",
        scientificStatus: "available",
        dataset: null,
        provenance: null,
        referenceSpace: null,
        coordinateTransform: null,
        structureMapping: null,
        spatialTarget: null,
        spatialCapability: null,
        observationMessage: "Test observation",
        limitations: null,
      },
    },
    originalScale: "macro",
    completedScale: "macro",
    startedAt: 1,
    completedAt: 2,
    durationSeconds: 1,
    success,
    status: success ? "completed" : "failed",
    summary: success ? "Completed" : "Failed prerequisite",
    findings: [],
    warnings: [],
    recommendations: [],
    verificationStatus: success ? "simulation-verified" : "failed",
    operationMode: success ? "simulation" : "unavailable",
    classification: success ? "simulation-result" : "unavailable-measurement",
  };
}

describe("NanobotMissionSequenceRegistry", () => {
  it("dispatches a dependent mission only after the prior archived result succeeds", () => {
    const registry = new NanobotMissionSequenceRegistry();
    const created = registry.create({
      id: "scout-then-diagnostic",
      label: "Scout then diagnostic",
      steps: [
        {
          id: "scout",
          mission: "scout",
          structureId: "left_hippocampus",
          structureName: "Left hippocampus",
        },
        {
          id: "diagnostic",
          mission: "diagnostic",
          structureId: "left_hippocampus",
          structureName: "Left hippocampus",
          dependsOnStepId: "scout",
        },
      ],
    });
    expect(created.error).toBeNull();

    const started: string[] = [];
    const executor = {
      startStep: (step: { id: string }) => {
        started.push(step.id);
        return {
          ok: true,
          missionId: `mission-${step.id}`,
          message: `Started ${step.id}`,
        };
      },
    };

    expect(registry.execute("scout-then-diagnostic", "wrong-token", executor)).toBeNull();
    expect(started).toEqual([]);

    const token = created.sequence?.confirmationToken;
    const active = registry.execute("scout-then-diagnostic", token, executor);
    expect(active?.status).toBe("active");
    expect(started).toEqual(["scout"]);
    expect(active?.steps[1]?.status).toBe("pending");

    const afterScout = registry.acceptMissionResult(
      result("mission-scout", true),
      executor,
    );
    expect(started).toEqual(["scout", "diagnostic"]);
    expect(afterScout?.steps[0]?.status).toBe("completed");
    expect(afterScout?.steps[1]?.status).toBe("running");

    const completed = registry.acceptMissionResult(
      result("mission-diagnostic", true),
      executor,
    );
    expect(completed?.status).toBe("completed");
    expect(completed?.steps.map((step) => step.status)).toEqual([
      "completed",
      "completed",
    ]);
  });

  it("blocks all pending dependents after a prerequisite failure", () => {
    const registry = new NanobotMissionSequenceRegistry();
    registry.create({
      id: "failure-blocks-downstream",
      label: "Failure blocks downstream",
      steps: [
        {
          id: "scout",
          mission: "scout",
          structureId: "left_hippocampus",
          structureName: "Left hippocampus",
        },
        {
          id: "diagnostic",
          mission: "diagnostic",
          structureId: "left_hippocampus",
          structureName: "Left hippocampus",
          dependsOnStepId: "scout",
        },
      ],
    });
    const executor = {
      startStep: (step: { id: string }) => ({
        ok: true,
        missionId: `mission-${step.id}`,
        message: `Started ${step.id}`,
      }),
    };

    const planned = registry.get("failure-blocks-downstream");
    registry.execute(
      "failure-blocks-downstream",
      planned?.confirmationToken,
      executor,
    );
    const failed = registry.acceptMissionResult(
      result("mission-scout", false),
      executor,
    );

    expect(failed?.status).toBe("failed");
    expect(failed?.steps[0]?.status).toBe("failed");
    expect(failed?.steps[1]?.status).toBe("blocked");
  });

  it("validates predecessor order and cancellation prevents future dispatch without deleting history", () => {
    const registry = new NanobotMissionSequenceRegistry();
    const invalid = registry.create({
      label: "Invalid order",
      steps: [
        {
          id: "diagnostic",
          mission: "diagnostic",
          structureId: "left_hippocampus",
          structureName: "Left hippocampus",
          dependsOnStepId: "scout",
        },
      ],
    });
    expect(invalid.error).toContain("earlier declared step");

    registry.create({
      id: "cancelled-sequence",
      label: "Cancelled sequence",
      steps: [
        {
          id: "scout",
          mission: "scout",
          structureId: "left_hippocampus",
          structureName: "Left hippocampus",
        },
      ],
    });
    const cancelled = registry.cancel("cancelled-sequence");
    expect(cancelled?.status).toBe("cancelled");
    expect(cancelled?.steps[0]?.status).toBe("cancelled");
    expect(registry.execute("cancelled-sequence", cancelled?.confirmationToken, {
      startStep: () => ({ ok: true, missionId: "never", message: "never" }),
    })).toBeNull();
  });
});
