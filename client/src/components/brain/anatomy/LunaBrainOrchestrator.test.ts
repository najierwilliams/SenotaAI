import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import type {
  BrainObservationContext,
} from "./BrainObservationContext";

import type {
  BrainStructure,
} from "./BrainStructureRegistry";

import {
  lunaBrainActions,
  registerLunaBrainCommandBridge,
  updateLunaBrainState,
} from "./LunaBrainActions";

import {
  executeLunaBrainMissionPlan,
  executeLunaBrainMissionSequence,
  interpretLunaBrainCommand,
} from "./LunaBrainOrchestrator";

const leftHippocampus: BrainStructure = {
  id: "left_hippocampus",
  sourceName: "Left_Hippocampus",
  displayName: "Left Hippocampus",
  hemisphere: "left",
  category: "limbic",
  parentRegion: "hippocampus",
  depth: "deep",
  scale: "macro",
  searchText: "left hippocampus limbic macro",
};

const rightHippocampus: BrainStructure = {
  ...leftHippocampus,
  id: "right_hippocampus",
  sourceName: "Right_Hippocampus",
  displayName: "Right Hippocampus",
  hemisphere: "right",
  searchText: "right hippocampus limbic macro",
};

function observation(
  scale: "macro" | "tissue" = "macro",
): BrainObservationContext {
  return {
    scale,
    scaleLabel: scale === "macro" ? "Macro" : "Tissue",
    scaleDescription: "Test observation",
    structureId: leftHippocampus.id,
    structureName: leftHippocampus.displayName,
    parentStructureId: "hippocampus",
    parentStructureName: "hippocampus",
    datasetId:
      scale === "macro"
        ? "luna_brain_macro"
        : "julich-brain-cytoarchitecture",
    datasetLabel:
      scale === "macro"
        ? "Macro anatomy model"
        : "Julich Brain",
    datasetUrl: null,
    status: "ready",
    available: true,
    message:
      scale === "macro"
        ? "Macro observation ready"
        : "Provider region metadata is available, but no validated MNI-to-Luna Local transform is registered.",
    scientificStatus: "available",
    scientificAvailable: true,
    scientificObservation: null,
    provenance: null,
    referenceSpace: null,
    coordinateTransform: null,
    structureMapping: null,
    spatialTarget: null,
    spatialCapability:
      scale === "macro"
        ? null
        : {
            status: "unavailable",
            reason:
              "Provider region metadata is available, but no validated MNI-to-Luna Local transform is registered.",
            scale: "tissue",
            datasetId: "julich-brain-cytoarchitecture",
            referenceSpace: null,
            coordinateTransform: null,
          },
    findings: [],
  } as BrainObservationContext;
}

let cleanupBridge: (() => void) | null = null;

function configureLiveBrain(
  scale: "macro" | "tissue" = "macro",
) {
  const calls = {
    selected: [] as string[],
    scales: [] as string[],
    deployed: [] as string[],
    paused: 0,
    resumed: 0,
    returned: 0,
  };

  cleanupBridge = registerLunaBrainCommandBridge({
    selectStructure: (structure) => {
      calls.selected.push(structure.id);
    },
    setObservationScale: (nextScale) => {
      calls.scales.push(nextScale);
    },
    resolveMacroPosition: (structure) =>
      structure.id === leftHippocampus.id
        ? { x: 0.01, y: 0.02, z: 0.03 }
        : { x: -0.01, y: 0.02, z: 0.03 },
    deployMission: (type, structure) => {
      calls.deployed.push(`${type}:${structure.id}`);
      return `bot-${calls.deployed.length}`;
    },
    pauseNanobot: () => true,
    resumeNanobot: () => true,
    returnNanobot: () => true,
    pauseFleet: () => {
      calls.paused += 1;
    },
    resumeFleet: () => {
      calls.resumed += 1;
    },
    returnFleet: () => {
      calls.returned += 1;
    },
  });

  updateLunaBrainState({
    selectedStructure: leftHippocampus,
    structures: [leftHippocampus, rightHippocampus],
    observationContext: observation(scale),
    fleet: [],
    missionHistory: [],
  });

  return calls;
}

afterEach(() => {
  cleanupBridge?.();
  cleanupBridge = null;
});

describe("Luna Brain orchestration", () => {
  it("uses the canonical registry and asks for clarification on ambiguous structures", () => {
    configureLiveBrain();

    const direct = lunaBrainActions.findStructure(
      "left hippocampus",
    );
    expect(direct.structure?.id).toBe(
      leftHippocampus.id,
    );

    const ambiguous = lunaBrainActions.findStructure(
      "hippocampus",
    );
    expect(ambiguous.structure).toBeNull();
    expect(ambiguous.candidates.map((item) => item.id)).toEqual([
      leftHippocampus.id,
      rightHippocampus.id,
    ]);

    const response = interpretLunaBrainCommand(
      "inspect hippocampus",
    );
    expect(response.message).toContain(
      "multiple candidates",
    );
  });

  it("prepares a resolved Macro simulation plan but refuses execution without its matching confirmation token", () => {
    const calls = configureLiveBrain();
    const planned = interpretLunaBrainCommand(
      "Plan a diagnostic nanobot to the left hippocampus.",
    );

    expect(planned.plan?.executionAllowed).toBe(true);
    expect(planned.plan?.simulationStatus).toBe("simulation");
    expect(planned.plan?.datasetId).toBe("luna_brain_macro");
    expect(planned.needsConfirmation).toBe(true);
    expect(calls.deployed).toEqual([]);

    const missingApproval = executeLunaBrainMissionPlan(
      planned.plan!,
      null,
    );
    expect(missingApproval.action).toBe("none");
    expect(calls.deployed).toEqual([]);

    const approved = executeLunaBrainMissionPlan(
      planned.plan!,
      planned.plan!.confirmationToken,
    );
    expect(approved.action).toBe("mission-executed");
    expect(calls.deployed).toEqual([
      "diagnostic:left_hippocampus",
    ]);
  });

  it("plans a dependency-safe sequence and dispatches only its first step after exact confirmation", () => {
    const calls = configureLiveBrain();
    const planned = interpretLunaBrainCommand(
      "Plan a sequence: scout then diagnostic to left hippocampus.",
    );

    expect(planned.action).toBe("sequence-planned");
    expect(planned.sequencePlan?.steps.map((step) => step.mission)).toEqual([
      "scout",
      "diagnostic",
    ]);
    expect(calls.deployed).toEqual([]);

    const rejected = executeLunaBrainMissionSequence(
      planned.sequencePlan!,
      "stale-token",
    );
    expect(rejected.action).toBe("none");
    expect(calls.deployed).toEqual([]);

    const approved = executeLunaBrainMissionSequence(
      planned.sequencePlan!,
      planned.sequencePlan!.confirmationToken,
    );
    expect(approved.action).toBe("sequence-executed");
    expect(calls.deployed).toEqual([
      "scout:left_hippocampus",
    ]);
  });

  it("uses the selected canonical structure when a mission request does not name a new target", () => {
    configureLiveBrain();

    const planned = interpretLunaBrainCommand(
      "Plan a scout nanobot mission.",
    );

    expect(planned.plan?.targetStructureId).toBe(
      leftHippocampus.id,
    );
    expect(planned.plan?.executionAllowed).toBe(true);
  });

  it("preserves the live lower-scale spatial gate and never proposes a Tissue deployment", () => {
    const calls = configureLiveBrain("tissue");
    const planned = interpretLunaBrainCommand(
      "Plan a scout nanobot to the left hippocampus at tissue scale.",
    );

    expect(planned.plan?.executionAllowed).toBe(false);
    expect(planned.plan?.capabilityStatus).toBe("unavailable");
    expect(planned.message).toContain("validated MNI-to-Luna Local transform");

    const rejected = executeLunaBrainMissionPlan(
      planned.plan!,
      planned.plan!.confirmationToken,
    );
    expect(rejected.action).toBe("none");
    expect(calls.deployed).toEqual([]);
  });

  it("delegates harmless navigation, scale selection, and bounded fleet requests through the approved bridge", () => {
    const calls = configureLiveBrain();

    expect(
      interpretLunaBrainCommand(
        "inspect left hippocampus",
      ).action,
    ).toBe("selected");
    expect(calls.selected).toEqual([
      leftHippocampus.id,
    ]);

    expect(
      interpretLunaBrainCommand("switch to cellular").action,
    ).toBe("scale-changed");
    expect(calls.scales).toEqual(["cellular"]);

    interpretLunaBrainCommand("pause nanobot fleet");
    interpretLunaBrainCommand("resume nanobot fleet");
    interpretLunaBrainCommand("return nanobot fleet");

    expect(calls.paused).toBe(1);
    expect(calls.resumed).toBe(1);
    expect(calls.returned).toBe(1);
  });

  it("reports the active scientific dataset from the live observation context", () => {
    configureLiveBrain("tissue");

    const response = interpretLunaBrainCommand(
      "What dataset is being used?",
    );

    expect(response.message).toContain("Julich Brain");
    expect(response.message).toContain(
      "MNI-to-Luna Local transform",
    );
  });
});
