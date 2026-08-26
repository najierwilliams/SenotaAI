import type {
  BrainScale,
  BrainStructure,
} from "./BrainStructureRegistry";

import type {
  NanobotMissionResult,
  NanobotType,
} from "./NanobotTypes";

import {
  lunaBrainActions,
  type LunaBrainActionResult,
  type LunaStructureResolution,
} from "./LunaBrainActions";

import type {
  NanobotMissionSequence,
} from "./NanobotMissionSequence";

export interface NanobotMissionPlan {
  id: string;
  targetStructureId: string;
  targetStructureName: string;
  missionType: NanobotType;
  observationScale: BrainScale;
  datasetId: string | null;
  spatialTarget: ReturnType<
    typeof lunaBrainActions.resolveSpatialTarget
  >["data"] | null;
  capabilityStatus: "available" | "unavailable";
  rationale: string;
  warnings: string[];
  simulationStatus: "simulation" | "dataset-backed" | "unavailable";
  executionAllowed: boolean;
  confirmationToken: string | null;
}

export interface LunaBrainCommandResponse {
  message: string;
  plan: NanobotMissionPlan | null;
  /** Present only for an inspectable, confirmation-gated linear sequence. */
  sequencePlan?: NanobotMissionSequence | null;
  needsConfirmation: boolean;
  action:
    | "none"
    | "selected"
    | "scale-changed"
    | "fleet-paused"
    | "fleet-resumed"
    | "fleet-returning"
    | "mission-executed"
    | "sequence-planned"
    | "sequence-executed";
}

const MISSION_TYPES: NanobotType[] = [
  "scout",
  "diagnostic",
  "repair",
  "delivery",
  "monitor",
];

const SCALE_VALUES: BrainScale[] = [
  "macro",
  "tissue",
  "cellular",
  "subcellular",
  "molecular",
];

function clean(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function displayScale(scale: BrainScale): string {
  return scale.charAt(0).toUpperCase() + scale.slice(1);
}

function requestedScale(
  message: string,
): BrainScale | null {
  const normalized = clean(message);
  return SCALE_VALUES.find((scale) =>
    normalized.includes(scale),
  ) ?? null;
}

function requestedMission(
  message: string,
): NanobotType | null {
  const normalized = clean(message);
  return MISSION_TYPES.find((type) =>
    normalized.includes(type),
  ) ?? null;
}

function requestedMissionSequence(
  message: string,
): NanobotType[] {
  return clean(message)
    .split(" ")
    .filter((token): token is NanobotType =>
      MISSION_TYPES.includes(token as NanobotType),
    );
}

function structureQueryFromMessage(
  message: string,
): string {
  const commandWords = new Set([
    "plan",
    "a",
    "an",
    "the",
    "nanobot",
    "nanobots",
    "bot",
    "mission",
    "send",
    "deploy",
    "to",
    "at",
    "scale",
    "macro",
    "tissue",
    "cellular",
    "subcellular",
    "molecular",
    "scout",
    "diagnostic",
    "repair",
    "delivery",
    "monitor",
    "inspect",
    "show",
    "look",
    "view",
  ]);

  return clean(message)
    .split(" ")
    .filter((token) => !commandWords.has(token))
    .join(" ");
}

function structureFromMessage(
  message: string,
): LunaStructureResolution {
  const state = lunaBrainActions.getState();

  if (!state) {
    return lunaBrainActions.findStructure(message);
  }

  const normalized = clean(message);
  const directMatches = state.structures.filter((structure) => {
    const canonicalNames = [
      structure.id,
      structure.sourceName,
      structure.displayName,
    ].map(clean);

    return canonicalNames.some(
      (name) => name.length > 2 && normalized.includes(name),
    );
  });

  const uniqueMatches = Array.from(
    new Map(
      directMatches.map((structure) => [
        structure.id,
        structure,
      ]),
    ).values(),
  );

  if (uniqueMatches.length === 1) {
    return {
      query: message,
      structure: uniqueMatches[0],
      candidates: uniqueMatches,
      reason: null,
    };
  }

  if (uniqueMatches.length > 1) {
    return {
      query: message,
      structure: null,
      candidates: uniqueMatches.slice(0, 5),
      reason:
        "More than one canonical structure matches. Please specify the hemisphere or a more precise name.",
    };
  }

  return lunaBrainActions.findStructure(
    structureQueryFromMessage(message) || message,
  );
}

function formatCapabilityFailure(
  reason: string,
): string {
  return `I cannot prepare that operation: ${reason}`;
}

function buildPlan(
  message: string,
  structure: BrainStructure,
  missionType: NanobotType,
  scale: BrainScale,
): NanobotMissionPlan {
  const state = lunaBrainActions.getState();
  const context = state?.observationContext;
  const warnings = [
    "Simulation only: no biological measurement, diagnosis, treatment effect, or physical nanobot claim is generated.",
  ];

  if (!context || context.scale !== scale) {
    return {
      id: `luna-plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      targetStructureId: structure.id,
      targetStructureName: structure.displayName,
      missionType,
      observationScale: scale,
      datasetId: context?.datasetId ?? null,
      spatialTarget: null,
      capabilityStatus: "unavailable",
      rationale:
        `The requested plan targets ${structure.displayName} at ${displayScale(scale)} scale. The active viewer context is ${context ? displayScale(context.scale) : "unavailable"}; Luna will not silently substitute a scale.`,
      warnings: [
        ...warnings,
        "Switch to the requested observation scale and review its live dataset/spatial status before creating a new plan.",
      ],
      simulationStatus: "unavailable",
      executionAllowed: false,
      confirmationToken: null,
    };
  }

  if (
    context.status === "loading" ||
    context.scientificStatus === "loading"
  ) {
    return {
      id: `luna-plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      targetStructureId: structure.id,
      targetStructureName: structure.displayName,
      missionType,
      observationScale: scale,
      datasetId: context.datasetId,
      spatialTarget: null,
      capabilityStatus: "unavailable",
      rationale:
        `${displayScale(scale)} scientific observation is still loading. Luna will wait for the live provider/reference-space status instead of reusing a prior Macro target.`,
      warnings: [
        ...warnings,
        "Wait for the observation status to finish or retry the provider before planning a lower-scale operation.",
      ],
      simulationStatus: "unavailable",
      executionAllowed: false,
      confirmationToken: null,
    };
  }

  const spatial = lunaBrainActions.resolveSpatialTarget(
    structure.id,
  );
  const available =
    scale === "macro" &&
    spatial.ok;
  const capabilityReason =
    context.spatialCapability?.reason ??
    spatial.message;

  if (!available) {
    return {
      id: `luna-plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      targetStructureId: structure.id,
      targetStructureName: structure.displayName,
      missionType,
      observationScale: scale,
      datasetId: context.datasetId,
      spatialTarget: spatial.data,
      capabilityStatus: "unavailable",
      rationale: formatCapabilityFailure(capabilityReason),
      warnings,
      simulationStatus: "unavailable",
      executionAllowed: false,
      confirmationToken: null,
    };
  }

  return {
    id: `luna-plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    targetStructureId: structure.id,
    targetStructureName: structure.displayName,
    missionType,
    observationScale: scale,
    datasetId: context.datasetId,
    spatialTarget: spatial.data,
    capabilityStatus: "available",
    rationale:
      `${structure.displayName} has a resolved Luna Local Macro simulation target derived from the loaded mesh.`,
    warnings,
    simulationStatus: "simulation",
    executionAllowed: true,
    confirmationToken:
      `luna-confirm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  };
}

function formatPlan(
  plan: NanobotMissionPlan,
): string {
  const status = plan.executionAllowed
    ? "Ready for confirmation"
    : "Not executable";

  return [
    `**Mission plan — ${status}**`,
    `Target: **${plan.targetStructureName}**`,
    `Mission: **${plan.missionType}**`,
    `Scale: **${displayScale(plan.observationScale)}**`,
    `Dataset: **${plan.datasetId ?? "Unavailable"}**`,
    `Spatial status: **${plan.capabilityStatus}**`,
    `Rationale: ${plan.rationale}`,
    `Disclosure: ${plan.warnings[0]}`,
    plan.executionAllowed
      ? "Reply **confirm** to execute this Macro simulation mission."
      : "No mission will be executed.",
  ].join("\n\n");
}

function mentionedNanobot(
  message: string,
) {
  const normalized = clean(message);
  return lunaBrainActions.getNanobotFleet().find((nanobot) =>
    [nanobot.id, nanobot.metadata.label]
      .map(clean)
      .some((identifier) => identifier && normalized.includes(identifier)),
  ) ?? null;
}

function missionStatusMessage(): string {
  const fleet = lunaBrainActions.getNanobotFleet();

  if (!fleet.length) {
    return "There are no active nanobot missions. Completed simulation results remain available in Mission History.";
  }

  return fleet
    .map((nanobot) => {
      const target = nanobot.target?.structureName ?? "no target";
      return `${nanobot.metadata.label}: ${nanobot.state}, ${nanobot.mission.phase}, ${Math.round(nanobot.progress * 100)}% toward ${target}.`;
    })
    .join("\n");
}

function missionHistoryMessage(
  history: NanobotMissionResult[],
): string {
  if (!history.length) {
    return "No completed mission results are available yet.";
  }

  return history
    .slice(0, 5)
    .map((result) =>
      `#${result.missionNumber} ${result.mission} · ${result.target.structureName} · ${result.originalScale} · ${result.status} · ${result.verificationStatus}`,
    )
    .join("\n");
}

/**
 * Interprets a deliberately bounded set of natural-language brain commands.
 * Harmless navigation and inspection execute immediately. Every deployment is
 * returned as a reviewable plan; only `executeLunaBrainMissionPlan` can start
 * a plan after an explicit confirmation in the assistant component.
 */
export function interpretLunaBrainCommand(
  message: string,
): LunaBrainCommandResponse {
  const normalized = clean(message);
  const state = lunaBrainActions.getState();

  if (!state) {
    return {
      message:
        "Open Luna Brain to use live brain controls. I do not have a mounted brain context to inspect yet.",
      plan: null,
      needsConfirmation: false,
      action: "none",
    };
  }

  const isReferenceSpaceQuestion =
    normalized.includes("coordinate system") ||
    normalized.includes("reference space") ||
    normalized.includes("what coordinates");
  const isMniMappingQuestion =
    /\bmni\b/.test(normalized) ||
    normalized.includes("map this") ||
    normalized.includes("map to reference");
  const isTissueTargetQuestion =
    /\btissue\b/.test(normalized) &&
    /\b(?:spatial\w*|target\w*|map\w*|coordinate\w*)\b/.test(normalized);
  const isCellularNanobotQuestion =
    /\bcellular\b/.test(normalized) &&
    /\b(?:nanobot|bot|send|mission|why)\b/.test(normalized);

  if (isReferenceSpaceQuestion) {
    const referenceSpace = lunaBrainActions.getReferenceSpace();
    const registration = lunaBrainActions.getRegistrationStatus();
    return {
      message: referenceSpace.ok
        ? `You are looking at **${referenceSpace.data.label}**. ${referenceSpace.message} Registration status: **${registration.data?.status ?? "unavailable"}**.`
        : referenceSpace.message,
      plan: null,
      needsConfirmation: false,
      action: "none",
    };
  }

  if (isMniMappingQuestion) {
    const transform = lunaBrainActions.getTransformStatus();
    const registration = lunaBrainActions.getRegistrationStatus();
    const blockers = registration.data?.blockers ?? [];
    return {
      message: transform.ok
        ? `A documented transform is available: ${transform.message}`
        : [
            "I cannot map this Luna Local point to MNI.",
            transform.message,
            blockers.length ? `Missing evidence: ${blockers.join(" ")}` : null,
          ]
            .filter(Boolean)
            .join(" "),
      plan: null,
      needsConfirmation: false,
      action: "none",
    };
  }

  if (isTissueTargetQuestion) {
    const context = state.observationContext;
    if (context.scale !== "tissue") {
      return {
        message: `The active observation is ${displayScale(context.scale)}, not Tissue. Switch to Tissue to inspect its live provider target state. Its Luna mapping remains unavailable unless the verified registration becomes validated.`,
        plan: null,
        needsConfirmation: false,
        action: "none",
      };
    }

    const target = lunaBrainActions.getSpatialTarget();
    const capability = context.spatialCapability;
    return {
      message:
        target.ok && capability?.operationEnabled
          ? `The live Tissue target is resolved and spatially actionable: ${target.message}`
          : `The Tissue dataset cannot be spatially targeted: ${capability?.reason ?? target.message}`,
      plan: null,
      needsConfirmation: false,
      action: "none",
    };
  }

  if (isCellularNanobotQuestion) {
    const context = state.observationContext;
    if (context.scale !== "cellular") {
      return {
        message: `The active observation is ${displayScale(context.scale)}, not Cellular. Cellular nanobot missions remain unavailable until a genuine human spatial cell coordinate, compatible reference-space chain, validated Luna registration, and resolved target all exist.`,
        plan: null,
        needsConfirmation: false,
        action: "none",
      };
    }

    const capability = context.spatialCapability;
    const registration = lunaBrainActions.getRegistrationStatus();
    return {
      message: `I cannot send a nanobot to the Cellular layer: ${capability?.reason ?? "No provider spatial cell coordinate is available."} Luna registration is ${registration.data?.status ?? "unavailable"}.`,
      plan: null,
      needsConfirmation: false,
      action: "none",
    };
  }

  const sequenceMissions = requestedMissionSequence(message);
  const isSequenceRequest =
    /\b(?:sequence|workflow|then)\b/.test(normalized) &&
    sequenceMissions.length >= 2;

  if (isSequenceRequest) {
    const resolved = structureFromMessage(message);
    const targetStructure =
      resolved.structure ??
      (resolved.candidates.length
        ? null
        : state.selectedStructure);

    if (!targetStructure) {
      const clarification = resolved.candidates.length
        ? `I found multiple candidates: ${resolved.candidates.map((candidate) => candidate.displayName).join(", ")}.`
        : resolved.reason ?? "I could not resolve a canonical structure.";
      return {
        message: `${clarification} Please clarify the exact target before I make a sequence plan.`,
        plan: null,
        sequencePlan: null,
        needsConfirmation: false,
        action: "none",
      };
    }

    const scale = requestedScale(message) ?? state.observationContext.scale;
    if (scale !== "macro" || state.observationContext.scale !== "macro") {
      return {
        message: `I cannot plan that sequence at ${displayScale(scale)} scale: ${state.observationContext.spatialCapability?.reason ?? "the current sequence dispatcher requires a coordinate-resolved Macro simulation target."}`,
        plan: null,
        sequencePlan: null,
        needsConfirmation: false,
        action: "none",
      };
    }

    const sequence = lunaBrainActions.planSequence({
      label: `${sequenceMissions.map((mission) => mission.charAt(0).toUpperCase() + mission.slice(1)).join(" → ")} · ${targetStructure.displayName}`,
      steps: sequenceMissions.map((mission, index) => ({
        id: `step-${index + 1}-${mission}`,
        mission,
        structureId: targetStructure.id,
        structureName: targetStructure.displayName,
        dependsOnStepId: index
          ? `step-${index}-${sequenceMissions[index - 1]}`
          : null,
      })),
    });

    return {
      message: sequence.ok
        ? [
            `**Mission sequence — Ready for confirmation**`,
            `Target: **${targetStructure.displayName}**`,
            `Steps: ${sequence.data.steps.map((step) => `${step.id}: ${step.mission}${step.dependsOnStepId ? ` after ${step.dependsOnStepId}` : ""}`).join(" → ")}`,
            "Each step uses the existing mission engine, and the next step dispatches only after the prior archived result succeeds.",
            "Disclosure: Macro simulation only; no biological measurement, diagnosis, treatment effect, or physical nanobot claim is generated.",
            "Reply **confirm** to dispatch the first step, or cancel to discard the sequence.",
          ].join("\n\n")
        : `I could not prepare that sequence: ${sequence.message}`,
      plan: null,
      sequencePlan: sequence.ok ? sequence.data : null,
      needsConfirmation: sequence.ok,
      action: sequence.ok ? "sequence-planned" : "none",
    };
  }

  const missionType = requestedMission(message);
  const isMissionRequest = Boolean(
    missionType && /(?:send|deploy|plan|mission|nanobot|bot)/.test(normalized),
  );

  if (isMissionRequest && missionType) {
    const resolved = structureFromMessage(message);
    const targetStructure =
      resolved.structure ??
      (resolved.candidates.length
        ? null
        : state.selectedStructure);

    if (!targetStructure) {
      const clarification = resolved.candidates.length
        ? `I found multiple candidates: ${resolved.candidates.map((candidate) => candidate.displayName).join(", ")}.`
        : resolved.reason ?? "I could not resolve a canonical structure.";
      return {
        message: `${clarification} Please clarify the exact target before I make a mission plan.`,
        plan: null,
        needsConfirmation: false,
        action: "none",
      };
    }

    const scale = requestedScale(message) ??
      state.observationContext.scale;
    const plan = buildPlan(
      message,
      targetStructure,
      missionType,
      scale,
    );

    return {
      message: formatPlan(plan),
      plan,
      needsConfirmation: plan.executionAllowed,
      action: "none",
    };
  }

  if (/\b(?:pause|hold)\b/.test(normalized)) {
    const nanobot = mentionedNanobot(message);
    if (/\b(?:nanobot|bot)\b/.test(normalized) && !/\bfleet\b/.test(normalized) && !nanobot) {
      return {
        message: "Name an active nanobot ID or label for an individual pause; I will not guess which fleet mission to change.",
        plan: null,
        needsConfirmation: false,
        action: "none",
      };
    }
    const result = nanobot
      ? lunaBrainActions.pauseNanobot(nanobot.id)
      : lunaBrainActions.pauseFleet();
    return {
      message: result.message,
      plan: null,
      needsConfirmation: false,
      action: "fleet-paused",
    };
  }

  if (/\bresume\b/.test(normalized)) {
    const nanobot = mentionedNanobot(message);
    if (/\b(?:nanobot|bot)\b/.test(normalized) && !/\bfleet\b/.test(normalized) && !nanobot) {
      return {
        message: "Name an active nanobot ID or label for an individual resume; I will not guess which fleet mission to change.",
        plan: null,
        needsConfirmation: false,
        action: "none",
      };
    }
    const result = nanobot
      ? lunaBrainActions.resumeNanobot(nanobot.id)
      : lunaBrainActions.resumeFleet();
    return {
      message: result.message,
      plan: null,
      needsConfirmation: false,
      action: "fleet-resumed",
    };
  }

  if (/\b(?:return|recall|cancel)\b/.test(normalized)) {
    const nanobot = mentionedNanobot(message);
    if (/\b(?:nanobot|bot)\b/.test(normalized) && !/\bfleet\b/.test(normalized) && !nanobot) {
      return {
        message: "Name an active nanobot ID or label for an individual return; I will not guess which fleet mission to change.",
        plan: null,
        needsConfirmation: false,
        action: "none",
      };
    }
    const result = nanobot
      ? lunaBrainActions.returnNanobot(nanobot.id)
      : /\bcancel\b/.test(normalized)
        ? lunaBrainActions.cancelFleet()
        : lunaBrainActions.returnFleet();
    return {
      message: result.message,
      plan: null,
      needsConfirmation: false,
      action: "fleet-returning",
    };
  }

  if (/\b(?:status|doing|progress)\b/.test(normalized) && /\b(?:nanobot|bot|mission)\b/.test(normalized)) {
    return {
      message: missionStatusMessage(),
      plan: null,
      needsConfirmation: false,
      action: "none",
    };
  }

  if (/\b(?:history|result|results)\b/.test(normalized) && /\b(?:mission|nanobot|bot)\b/.test(normalized)) {
    return {
      message: missionHistoryMessage(
        lunaBrainActions.getMissionHistory(),
      ),
      plan: null,
      needsConfirmation: false,
      action: "none",
    };
  }

  if (/\b(?:dataset|data|provenance)\b/.test(normalized)) {
    const result = lunaBrainActions.getDatasetStatus();
    const context = result.data;
    return {
      message: context
        ? `Current dataset: **${context.datasetLabel ?? "Unavailable"}** (${context.scientificStatus ?? context.status}). ${context.message}${context.provenance ? ` Source: ${context.provenance.provider}.` : ""}`
        : result.message,
      plan: null,
      needsConfirmation: false,
      action: "none",
    };
  }

  const scale = requestedScale(message);
  if (scale && /\b(?:switch|change|show|view|observe|scale|cells|cellular|tissue|molecular|subcellular)\b/.test(normalized)) {
    const result = lunaBrainActions.setObservationScale(scale);
    return {
      message: result.message,
      plan: null,
      needsConfirmation: false,
      action: "scale-changed",
    };
  }

  if (/\b(?:what am i looking at|current structure|selected|inspect|show|look at)\b/.test(normalized) || structureFromMessage(message).structure) {
    const resolved = structureFromMessage(message);

    if (!resolved.structure && resolved.candidates.length) {
      return {
        message: `I found multiple candidates: ${resolved.candidates.map((candidate) => candidate.displayName).join(", ")}. Please specify the hemisphere or a more precise name.`,
        plan: null,
        needsConfirmation: false,
        action: "none",
      };
    }

    const structure = resolved.structure ?? state.selectedStructure;

    if (!structure) {
      return {
        message:
          "No anatomical structure is selected. Name a loaded canonical structure, such as the hippocampus, and I will inspect it.",
        plan: null,
        needsConfirmation: false,
        action: "none",
      };
    }

    const selection = lunaBrainActions.selectStructure(
      structure.id,
    );
    const context = lunaBrainActions.getObservationContext();
    return {
      message: selection.ok
        ? `You are viewing **${structure.displayName}** at **${context?.scaleLabel ?? "Macro"}** scale. Dataset: **${context?.datasetLabel ?? "Unavailable"}**. ${context?.spatialCapability?.reason ?? context?.message ?? ""}`
        : selection.message,
      plan: null,
      needsConfirmation: false,
      action: selection.ok ? "selected" : "none",
    };
  }

  return {
    message:
      "I can inspect a canonical brain structure, switch observation scale, report the live dataset/capability state, prepare a nanobot mission plan, or monitor the active fleet. I will request confirmation before any deployment.",
    plan: null,
    needsConfirmation: false,
    action: "none",
  };
}

export function executeLunaBrainMissionPlan(
  plan: NanobotMissionPlan,
  confirmationToken: string | null,
): LunaBrainCommandResponse {
  if (
    !plan.executionAllowed ||
    !plan.confirmationToken ||
    confirmationToken !== plan.confirmationToken
  ) {
    return {
      message:
        "This plan is not executable, or its confirmation is missing or stale. No mission was started.",
      plan,
      needsConfirmation: false,
      action: "none",
    };
  }

  const execution: LunaBrainActionResult<string | null> =
    lunaBrainActions.deployMission(
      plan.missionType,
      plan.targetStructureId,
    );

  return {
    message: execution.ok
      ? `${execution.message} This remains a Macro lifecycle simulation and not a biological measurement or physical nanobot claim.`
      : `I did not execute the plan: ${execution.message}`,
    plan: execution.ok ? null : plan,
    needsConfirmation: false,
    action: execution.ok ? "mission-executed" : "none",
  };
}


export function executeLunaBrainMissionSequence(
  sequence: NanobotMissionSequence,
  confirmationToken: string | null,
): LunaBrainCommandResponse {
  if (
    sequence.status !== "planned" ||
    !confirmationToken ||
    confirmationToken !== sequence.confirmationToken
  ) {
    return {
      message:
        "This sequence is not executable, or its confirmation is missing or stale. No sequence step was dispatched.",
      plan: null,
      sequencePlan: sequence,
      needsConfirmation: false,
      action: "none",
    };
  }

  const execution = lunaBrainActions.executeSequence(
    sequence.id,
    confirmationToken,
  );

  return {
    message: execution.ok
      ? `${execution.message} The first step is a Macro simulation; dependent steps remain blocked until their prerequisite result is archived successfully.`
      : `I did not execute the sequence: ${execution.message}`,
    plan: null,
    sequencePlan: execution.ok ? null : sequence,
    needsConfirmation: false,
    action: execution.ok ? "sequence-executed" : "none",
  };
}
