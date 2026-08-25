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
  needsConfirmation: boolean;
  action:
    | "none"
    | "selected"
    | "scale-changed"
    | "fleet-paused"
    | "fleet-resumed"
    | "fleet-returning"
    | "mission-executed";
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
    const result = lunaBrainActions.pauseFleet();
    return {
      message: result.message,
      plan: null,
      needsConfirmation: false,
      action: "fleet-paused",
    };
  }

  if (/\bresume\b/.test(normalized)) {
    const result = lunaBrainActions.resumeFleet();
    return {
      message: result.message,
      plan: null,
      needsConfirmation: false,
      action: "fleet-resumed",
    };
  }

  if (/\b(?:return|recall)\b/.test(normalized)) {
    const result = lunaBrainActions.returnFleet();
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

  const execution: LunaBrainActionResult<null> =
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
