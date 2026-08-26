import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION,
} from "@shared/hraSpatial";

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

const unavailableRegistration = {
  id: "luna-local-to-ebrains-mni-registration-v1",
  status: "unavailable",
  sourceAsset: {
    label: "HuBMAP CCF Brain-female v1.1 / Allen_F_Brain.glb",
    sha256: "c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc",
  },
  qualityGate: {
    status: "NOT_ESTABLISHED",
    transformEnabled: false,
    decision:
      "A reproducible, independently validated Luna/HRA GLB to MNI ICBM 152 2009c Nonlinear Asymmetric transform is not established.",
  },
  validation: {
    summary:
      "No Luna Local-to-MNI transform was validated because the verified GLB has no published coordinate convention, transform artifact, or landmark correspondence to MNI ICBM 152 2009c Nonlinear Asymmetric.",
  },
  blockers: [
    "The verified HRA GLB has no declared source units, axis orientation, origin, or MNI coordinate convention.",
  ],
};

const referenceSpaces = {
  "luna-viewer-local": {
    id: "luna-viewer-local",
    label: "Luna viewer local coordinates",
  },
  "ebrains-mni-icbm-152-2009c": {
    id: "ebrains-mni-icbm-152-2009c",
    label: "MNI ICBM 152 2009c",
  },
  "cellxgene-human-brain-anatomical-annotation": {
    id: "cellxgene-human-brain-anatomical-annotation",
    label: "CELLxGENE human-brain anatomical annotation",
  },
};

function referenceSpace(id: keyof typeof referenceSpaces) {
  return referenceSpaces[id];
}

function observation(
  scale: "macro" | "tissue" | "cellular" = "macro",
): BrainObservationContext {
  return {
    scale,
    scaleLabel:
      scale === "macro"
        ? "Macro"
        : scale === "tissue"
          ? "Tissue"
          : "Cellular",
    scaleDescription: "Test observation",
    structureId: leftHippocampus.id,
    structureName: leftHippocampus.displayName,
    parentStructureId: "hippocampus",
    parentStructureName: "hippocampus",
    datasetId:
      scale === "macro"
        ? "luna_brain_macro"
        : scale === "tissue"
          ? "julich-brain-cytoarchitecture"
          : "cellxgene-human-brain-cell-atlas-v1",
    datasetLabel:
      scale === "macro"
        ? "Macro anatomy model"
        : scale === "tissue"
          ? "Julich Brain"
          : "Human Brain Cell Atlas",
    datasetUrl: null,
    status: "ready",
    available: true,
    message:
      scale === "macro"
        ? "Macro observation ready"
        : scale === "tissue"
          ? "Provider region metadata is available, but no validated MNI-to-Luna Local transform is registered."
          : "Cell metadata is available, but no coordinate-resolved human cell positions or validated Luna registration exists.",
    scientificStatus: "available",
    scientificAvailable: true,
    scientificObservation: null,
    registration: unavailableRegistration,
    hraSpatialRegistration:
      HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION,
    provenance: null,
    referenceSpace:
      scale === "macro"
        ? referenceSpace("luna-viewer-local")
        : scale === "tissue"
          ? referenceSpace("ebrains-mni-icbm-152-2009c")
          : referenceSpace("cellxgene-human-brain-anatomical-annotation"),
    coordinateTransform: null,
    structureMapping: null,
    spatialTarget: null,
    spatialCapability:
      scale === "macro"
        ? null
        : {
            status: "unavailable",
            reason:
              scale === "tissue"
                ? "Provider region metadata is available, but no validated MNI-to-Luna Local transform is registered."
                : "No coordinate-resolved human cell positions, compatible reference-space chain, or validated Luna registration is available.",
            scale,
            datasetId:
              scale === "tissue"
                ? "julich-brain-cytoarchitecture"
                : "cellxgene-human-brain-cell-atlas-v1",
            referenceSpace: null,
            coordinateTransform: null,
          },
    findings: [],
  } as BrainObservationContext;
}

let cleanupBridge: (() => void) | null = null;

function configureLiveBrain(
  scale: "macro" | "tissue" | "cellular" = "macro",
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

  it("answers reference-space and MNI mapping questions from the live unavailable registration record", () => {
    configureLiveBrain();

    const reference = interpretLunaBrainCommand(
      "What coordinate system am I looking at?",
    );
    expect(reference.message).toContain("Luna viewer local coordinates");
    expect(reference.message).toContain("HRA placement: **established**");
    expect(reference.message).toContain("MNI registration: **unavailable**");

    const hra = interpretLunaBrainCommand(
      "What HRA reference space is this placement registered to?",
    );
    expect(hra.message).toContain("HRA Brain-Female");
    expect(hra.message).toContain("MNI registration remains not established");
    expect(lunaBrainActions.getHraSpatialRegistration().ok).toBe(true);

    const mapping = interpretLunaBrainCommand(
      "Can you map this to MNI?",
    );
    expect(mapping.message).toContain("cannot map this Luna Local point to MNI");
    expect(mapping.message).toContain("transform is not established");

    const registration = lunaBrainActions.getRegistrationStatus();
    expect(registration.ok).toBe(false);
    expect(registration.data.status).toBe("unavailable");
    expect(registration.data.qualityGate.status).toBe("NOT_ESTABLISHED");
    expect(registration.message).toContain("NOT_ESTABLISHED");
    expect(lunaBrainActions.getTransformStatus().ok).toBe(false);
    expect(lunaBrainActions.getScientificProvenance().data.registration?.sourceAsset.sha256).toBe(
      unavailableRegistration.sourceAsset.sha256,
    );
    expect(lunaBrainActions.getScientificProvenance().data.hraSpatialRegistration?.mni.status).toBe(
      "not-established",
    );
  });

  it("answers Tissue targetability and Cellular nanobot refusal from their live capability gates", () => {
    configureLiveBrain("tissue");
    const tissue = interpretLunaBrainCommand(
      "Can this tissue dataset be spatially targeted?",
    );
    expect(tissue.message).toContain("cannot be spatially targeted");
    expect(tissue.message).toContain("validated MNI-to-Luna Local transform");

    configureLiveBrain("cellular");
    const cellular = interpretLunaBrainCommand(
      "Why can't I send a nanobot to the cellular layer?",
    );
    expect(cellular.message).toContain("cannot send a nanobot to the Cellular layer");
    expect(cellular.message).toContain("No coordinate-resolved human cell positions");
    expect(cellular.message).toContain("Luna registration is unavailable");
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
