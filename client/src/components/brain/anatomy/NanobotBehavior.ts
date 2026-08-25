import type {
  BrainScale,
  BrainStructure,
} from "./BrainStructureRegistry";

import type {
  Nanobot,
  NanobotCapability,
  NanobotFinding,
  NanobotMission,
  NanobotMissionResult,
} from "./NanobotTypes";

export interface NanobotBehaviorContext {
  structure: BrainStructure;
  elapsedSeconds: number;
}

export interface NanobotBehaviorStep {
  phase:
    | "assessment"
    | "operation"
    | "verification"
    | "complete";
  progress: number;
  message: string;
  result?: NanobotMissionResult;
}

const SCALE_LABELS: Record<
  BrainScale,
  string
> = {
  macro: "macro",
  tissue: "tissue",
  cellular: "cellular",
  subcellular: "subcellular",
  molecular: "molecular",
};

function finding(
  id: string,
  severity: NanobotFinding["severity"],
  title: string,
  detail: string,
  scale: BrainScale,
): NanobotFinding {
  return {
    id,
    timestamp: Date.now(),
    severity,
    title,
    detail,
    scale,
  };
}

function baseFinding(
  mission: NanobotMission,
  structure: BrainStructure,
): NanobotFinding {
  return finding(
    `${mission}-${structure.id}-baseline`,
    "info",
    "Target structure assessed",
    `${structure.displayName} is available at the ${SCALE_LABELS[structure.scale]} scale for ${mission} operations.`,
    structure.scale,
  );
}

function scoutStep(
  context: NanobotBehaviorContext,
  progress: number,
): NanobotBehaviorStep {
  const { structure } = context;

  if (progress < 0.35) {
    return {
      phase: "assessment",
      progress,
      message:
        `Mapping ${structure.displayName} and surrounding anatomy`,
    };
  }

  if (progress < 0.75) {
    return {
      phase: "operation",
      progress,
      message:
        `Scanning ${SCALE_LABELS[structure.scale]} features`,
    };
  }

  if (progress < 1) {
    return {
      phase: "verification",
      progress,
      message:
        "Verifying mapped structures",
    };
  }

  return {
    phase: "complete",
    progress: 1,
    message:
      "Scout mapping complete",
    result: {
      success: true,
      summary:
        `Scout completed mapping of ${structure.displayName}`,
      findings: [
        baseFinding(
          "scout",
          structure,
        ),
        finding(
          `scout-${structure.id}-depth`,
          "info",
          "Anatomical depth classified",
          `Target classified as ${structure.depth}.`,
          structure.scale,
        ),
      ],
      completedAt: Date.now(),
    },
  };
}

function diagnosticStep(
  context: NanobotBehaviorContext,
  progress: number,
): NanobotBehaviorStep {
  const { structure } = context;

  if (progress < 0.25) {
    return {
      phase: "assessment",
      progress,
      message:
        `Initializing diagnostic scan of ${structure.displayName}`,
    };
  }

  if (progress < 0.7) {
    return {
      phase: "operation",
      progress,
      message:
        `Inspecting ${SCALE_LABELS[structure.scale]} characteristics`,
    };
  }

  if (progress < 1) {
    return {
      phase: "verification",
      progress,
      message:
        "Validating diagnostic observations",
    };
  }

  return {
    phase: "complete",
    progress: 1,
    message:
      "Diagnostic assessment complete",
    result: {
      success: true,
      summary:
        `Diagnostic assessment completed for ${structure.displayName}`,
      findings: [
        baseFinding(
          "diagnostic",
          structure,
        ),
        finding(
          `diagnostic-${structure.id}-classification`,
          "info",
          "Structure classification confirmed",
          `${structure.category} / ${structure.depth} classification recorded.`,
          structure.scale,
        ),
      ],
      completedAt: Date.now(),
    },
  };
}

function repairStep(
  context: NanobotBehaviorContext,
  progress: number,
): NanobotBehaviorStep {
  const { structure } = context;

  if (progress < 0.2) {
    return {
      phase: "assessment",
      progress,
      message:
        `Assessing ${structure.displayName} before repair`,
    };
  }

  if (progress < 0.8) {
    return {
      phase: "operation",
      progress,
      message:
        `Executing simulated repair at ${SCALE_LABELS[structure.scale]} scale`,
    };
  }

  if (progress < 1) {
    return {
      phase: "verification",
      progress,
      message:
        "Verifying simulated repair result",
    };
  }

  return {
    phase: "complete",
    progress: 1,
    message:
      "Repair operation complete",
    result: {
      success: true,
      summary:
        `Simulated repair completed for ${structure.displayName}`,
      findings: [
        baseFinding(
          "repair",
          structure,
        ),
        finding(
          `repair-${structure.id}-verification`,
          "info",
          "Repair verified",
          "The simulated repair operation passed verification.",
          structure.scale,
        ),
      ],
      completedAt: Date.now(),
    },
  };
}

function deliveryStep(
  context: NanobotBehaviorContext,
  progress: number,
): NanobotBehaviorStep {
  const { structure } = context;

  if (progress < 0.2) {
    return {
      phase: "assessment",
      progress,
      message:
        `Preparing payload for ${structure.displayName}`,
    };
  }

  if (progress < 0.8) {
    return {
      phase: "operation",
      progress,
      message:
        `Delivering simulated payload to ${SCALE_LABELS[structure.scale]} target`,
    };
  }

  if (progress < 1) {
    return {
      phase: "verification",
      progress,
      message:
        "Confirming payload delivery",
    };
  }

  return {
    phase: "complete",
    progress: 1,
    message:
      "Delivery operation complete",
    result: {
      success: true,
      summary:
        `Simulated payload delivered to ${structure.displayName}`,
      findings: [
        baseFinding(
          "delivery",
          structure,
        ),
        finding(
          `delivery-${structure.id}-confirmation`,
          "info",
          "Payload delivery confirmed",
          "The simulated payload reached the selected target.",
          structure.scale,
        ),
      ],
      completedAt: Date.now(),
    },
  };
}

function monitorStep(
  context: NanobotBehaviorContext,
  progress: number,
): NanobotBehaviorStep {
  const { structure } = context;

  if (progress < 0.25) {
    return {
      phase: "assessment",
      progress,
      message:
        `Establishing monitoring baseline for ${structure.displayName}`,
    };
  }

  if (progress < 0.8) {
    return {
      phase: "operation",
      progress,
      message:
        `Monitoring ${SCALE_LABELS[structure.scale]} target`,
    };
  }

  if (progress < 1) {
    return {
      phase: "verification",
      progress,
      message:
        "Validating monitoring sample",
    };
  }

  return {
    phase: "complete",
    progress: 1,
    message:
      "Monitoring cycle complete",
    result: {
      success: true,
      summary:
        `Monitoring cycle completed for ${structure.displayName}`,
      findings: [
        baseFinding(
          "monitor",
          structure,
        ),
        finding(
          `monitor-${structure.id}-baseline`,
          "info",
          "Monitoring baseline established",
          "The simulated monitoring cycle completed without a reported anomaly.",
          structure.scale,
        ),
      ],
      completedAt: Date.now(),
    },
  };
}

export function getNanobotBehavior(
  mission: NanobotMission,
): (
  context: NanobotBehaviorContext,
  progress: number,
) => NanobotBehaviorStep {
  switch (mission) {
    case "scout":
      return scoutStep;
    case "diagnostic":
      return diagnosticStep;
    case "repair":
      return repairStep;
    case "delivery":
      return deliveryStep;
    case "monitor":
      return monitorStep;
  }
}

export function hasNanobotCapability(
  nanobot: Nanobot,
  capability: NanobotCapability,
): boolean {
  return nanobot.capabilities.includes(
    capability,
  );
}

export function runNanobotBehavior(
  nanobot: Nanobot,
  structure: BrainStructure,
  progress: number,
): NanobotBehaviorStep {
  const behavior =
    getNanobotBehavior(
      nanobot.mission.mission,
    );

  return behavior(
    {
      structure,
      elapsedSeconds: 0,
    },
    Math.min(
      1,
      Math.max(0, progress),
    ),
  );
}