import type {
  BrainScale,
  BrainStructure,
} from "./BrainStructureRegistry";

import type {
  Nanobot,
  NanobotCapability,
  NanobotMission,
  NanobotMissionPhase,
} from "./NanobotTypes";

export interface NanobotBehaviorContext {
  structure: BrainStructure;
  scale: BrainScale;
  elapsedSeconds: number;
}

export interface NanobotBehaviorStep {
  phase: Extract<
    NanobotMissionPhase,
    "assessment" | "operation" | "verification"
  >;
  progress: number;
  message: string;
}

function missionVerb(
  mission: NanobotMission,
): string {
  switch (mission) {
    case "scout":
      return "mapping simulated anatomy";
    case "diagnostic":
      return "reviewing simulated diagnostic context";
    case "repair":
      return "running a simulated repair workflow";
    case "delivery":
      return "running a simulated delivery workflow";
    case "monitor":
      return "running a simulated monitoring cycle";
  }
}

export function getNanobotBehavior(
  mission: NanobotMission,
): (
  context: NanobotBehaviorContext,
  progress: number,
) => NanobotBehaviorStep {
  return (context, value) => {
    const progress = Math.min(1, Math.max(0, value));
    const target = context.structure.displayName;

    if (progress < 0.24) {
      return {
        phase: "assessment",
        progress,
        message: `Assessing simulation context for ${target}`,
      };
    }

    if (progress < 0.76) {
      return {
        phase: "operation",
        progress,
        message: `${missionVerb(mission)} for ${target}`,
      };
    }

    return {
      phase: "verification",
      progress,
      message:
        "Verifying the simulated mission lifecycle; no biological measurement is asserted.",
    };
  };
}

export function hasNanobotCapability(
  nanobot: Nanobot,
  capability: NanobotCapability,
): boolean {
  return nanobot.capabilities.includes(capability);
}

export function runNanobotBehavior(
  nanobot: Nanobot,
  structure: BrainStructure,
  progress: number,
): NanobotBehaviorStep {
  return getNanobotBehavior(nanobot.mission.mission)(
    {
      structure,
      scale:
        nanobot.mission.originalScale ??
        nanobot.target?.observationScale ??
        "macro",
      elapsedSeconds: nanobot.mission.totalElapsedSeconds,
    },
    progress,
  );
}
