import {
  navigateNanobot,
  returnNanobot,
} from "./NanobotNavigation";

import type {
  Nanobot,
  NanobotFinding,
  NanobotMissionResult,
  NanobotPosition,
  NanobotState,
  NanobotTarget,
} from "./NanobotTypes";

export interface NanobotMissionTick {
  deltaSeconds: number;
  now: number;
}

export interface NanobotMissionTickResult {
  changed: boolean;
  completedResult: NanobotMissionResult | null;
}

const DEPLOYMENT_SECONDS = 0.35;
const NAVIGATION_RADIUS = 0.003;
const OPERATION_SECONDS: Record<
  Nanobot["type"],
  number
> = {
  scout: 2.8,
  diagnostic: 3.4,
  repair: 4.2,
  delivery: 3.8,
  monitor: 4.8,
};

function clamp(
  value: number,
): number {
  return Math.min(1, Math.max(0, value));
}

function setState(
  nanobot: Nanobot,
  state: NanobotState,
  message: string,
): void {
  nanobot.state = state;
  nanobot.mission.message = message;
  nanobot.updatedAt = Date.now();
}

function phaseMessage(
  nanobot: Nanobot,
): string {
  const target = nanobot.target?.structureName ?? "target";

  switch (nanobot.type) {
    case "scout":
      return `Recording simulated spatial route and target-lock observation for ${target}`;
    case "diagnostic":
      return `Reviewing simulated dataset and target context for ${target}; no diagnosis is produced`;
    case "repair":
      return `Running simulated intervention state for ${target}; no tissue repair is performed`;
    case "delivery":
      return `Tracking simulated payload handoff state for ${target}; no physical payload is delivered`;
    case "monitor":
      return `Sampling simulation telemetry and mission state for ${target}; no biological time series is asserted`;
  }
}

function operationSummary(
  nanobot: Nanobot,
): string {
  const target = nanobot.target?.structureName ?? "target";

  switch (nanobot.type) {
    case "scout":
      return `Simulation result: route and mesh-derived target lock completed for ${target}`;
    case "diagnostic":
      return `Simulation result: target and dataset context review completed for ${target}; no diagnosis was generated`;
    case "repair":
      return `Simulation result: simulated intervention lifecycle completed for ${target}; no tissue was repaired`;
    case "delivery":
      return `Simulation result: simulated payload handoff lifecycle completed for ${target}; no physical payload was delivered`;
    case "monitor":
      return `Simulation result: telemetry and mission-state cycle completed for ${target}; no biological time series was measured`;
  }
}

function simulationFinding(
  nanobot: Nanobot,
): NanobotFinding {
  const target = nanobot.target?.structureName ?? "the target";
  const detailByMission: Record<Nanobot["type"], {
    title: string;
    detail: string;
  }> = {
    scout: {
      title: "Simulated spatial route observation",
      detail: `The agent reached the mesh-derived Luna Local work point for ${target} and verified simulated navigation. This is not an external scientific coordinate or biological measurement.`,
    },
    diagnostic: {
      title: "Simulated diagnostic assessment context",
      detail: `The mission reviewed the available target and dataset context for ${target}. No diagnosis, disease finding, or biological measurement was generated.`,
    },
    monitor: {
      title: "Simulated telemetry observation",
      detail: `The mission recorded ${nanobot.telemetry.sampleCount} simulation telemetry samples for ${target}. No physiological or biological time series was measured.`,
    },
    repair: {
      title: "Simulated intervention verification",
      detail: `The mission completed a simulated intervention and verification lifecycle for ${target}. No tissue repair or treatment effect was performed or claimed.`,
    },
    delivery: {
      title: "Simulated payload handoff verification",
      detail: `The mission tracked a simulated payload handoff and return lifecycle for ${target}. No physical payload was delivered.`,
    },
  };
  const detail = detailByMission[nanobot.type];

  return {
    id: `${nanobot.mission.id}-simulation-context`,
    timestamp: Date.now(),
    severity: "info",
    title: detail.title,
    detail: detail.detail,
    scale:
      nanobot.mission.originalScale ??
      nanobot.target?.observationScale ??
      "macro",
    source: "simulation",
  };
}

function createSimulationResult(
  nanobot: Nanobot,
  now: number,
): NanobotMissionResult {
  const target = nanobot.target;

  if (!target || !nanobot.mission.startedAt) {
    throw new Error(
      "A mission result requires a started target mission.",
    );
  }

  return {
    missionId: nanobot.mission.id,
    missionNumber: 0,
    nanobotId: nanobot.id,
    mission: nanobot.mission.mission,
    target: { ...target },
    originalScale:
      nanobot.mission.originalScale ??
      target.observationScale,
    completedScale:
      nanobot.presentation.viewerScale,
    startedAt: nanobot.mission.startedAt,
    completedAt: now,
    durationSeconds:
      Math.max(
        0,
        (now - nanobot.mission.startedAt) / 1000,
      ),
    success: true,
    status: "completed",
    summary: operationSummary(nanobot),
    findings: [simulationFinding(nanobot)],
    warnings: [
      "Simulation only: no dataset-backed biological measurement or therapeutic outcome is asserted.",
    ],
    recommendations: [
      "Use the Brain Inspector and connected scientific datasets for provider-backed observations.",
    ],
    verificationStatus: "simulation-verified",
    operationMode: "simulation",
    classification: "simulation-result",
  };
}

function startMissionClock(
  nanobot: Nanobot,
  now: number,
): void {
  nanobot.mission.startedAt = now;
  nanobot.mission.phaseElapsedSeconds = 0;
  nanobot.mission.totalElapsedSeconds = 0;
  nanobot.mission.progress = 0;
  nanobot.progress = 0;
}

function advanceClock(
  nanobot: Nanobot,
  deltaSeconds: number,
): void {
  nanobot.mission.phaseElapsedSeconds += deltaSeconds;
  nanobot.mission.totalElapsedSeconds += deltaSeconds;
}

function transitionPhase(
  nanobot: Nanobot,
  phase: Nanobot["mission"]["phase"],
  message: string,
): void {
  nanobot.mission.phase = phase;
  nanobot.mission.phaseElapsedSeconds = 0;
  nanobot.mission.message = message;
}

export class NanobotMissionEngine {
  canDeploy(
    target: NanobotTarget | null,
  ): { allowed: boolean; reason: string } {
    if (!target) {
      return {
        allowed: false,
        reason: "Select an anatomical target before deploying a nanobot.",
      };
    }

    if (target.observationScale !== "macro") {
      return {
        allowed: false,
        reason:
          target.spatialCapability?.reason ??
          target.spatialMessage ??
          `${target.observationScale} missions require coordinate-resolved observation data. The current context is metadata or simulation only.`,
      };
    }

    if (
      target.spatialStatus !== "resolved" ||
      !target.targetPosition
    ) {
      return {
        allowed: false,
        reason:
          "Macro target position is unavailable in the active BrainViewer scene.",
      };
    }

    return {
      allowed: true,
      reason: "Macro simulation mission can be deployed.",
    };
  }

  start(
    nanobot: Nanobot,
    target: NanobotTarget,
    now: number,
  ): void {
    const permission = this.canDeploy(target);

    nanobot.target = target;
    nanobot.mission.originalScale =
      target.observationScale;
    nanobot.mission.operationMode =
      permission.allowed
        ? "simulation"
        : "unavailable";
    nanobot.mission.verificationStatus =
      permission.allowed
        ? "pending"
        : "unavailable";
    startMissionClock(nanobot, now);

    if (!permission.allowed) {
      transitionPhase(
        nanobot,
        "failed",
        permission.reason,
      );
      nanobot.mission.completedAt = now;
      nanobot.mission.result = null;
      setState(nanobot, "error", permission.reason);
      return;
    }

    transitionPhase(
      nanobot,
      "deployment",
      `Deploying simulation agent toward ${target.structureName}`,
    );
    setState(nanobot, "deploying", nanobot.mission.message);
  }

  pause(
    nanobot: Nanobot,
  ): boolean {
    if (
      ![
        "deploying",
        "navigating",
        "arrived",
        "working",
        "returning",
      ].includes(nanobot.state)
    ) {
      return false;
    }

    nanobot.mission.pausedState = nanobot.state;
    setState(
      nanobot,
      "paused",
      "Mission progression paused",
    );
    return true;
  }

  resume(
    nanobot: Nanobot,
  ): boolean {
    if (
      nanobot.state !== "paused" ||
      !nanobot.mission.pausedState
    ) {
      return false;
    }

    const previous = nanobot.mission.pausedState;
    nanobot.mission.pausedState = null;
    setState(
      nanobot,
      previous,
      "Mission progression resumed",
    );
    return true;
  }

  requestReturn(
    nanobot: Nanobot,
  ): boolean {
    if (
      ["idle", "completed", "error", "returning"].includes(
        nanobot.state,
      )
    ) {
      return false;
    }

    if (nanobot.state === "paused") {
      nanobot.mission.pausedState = "returning";
      nanobot.mission.message =
        "Return queued while mission remains paused";
      return true;
    }

    transitionPhase(
      nanobot,
      "return",
      "Returning to deployment position",
    );
    setState(nanobot, "returning", nanobot.mission.message);
    return true;
  }

  fail(
    nanobot: Nanobot,
    reason: string,
    now: number,
  ): void {
    transitionPhase(nanobot, "failed", reason);
    nanobot.mission.completedAt = now;
    nanobot.mission.verificationStatus = "failed";
    nanobot.mission.operationMode = "unavailable";
    nanobot.mission.result = nanobot.target
      ? {
          missionId: nanobot.mission.id,
          missionNumber: 0,
          nanobotId: nanobot.id,
          mission: nanobot.mission.mission,
          target: { ...nanobot.target },
          originalScale:
            nanobot.mission.originalScale ??
            nanobot.target.observationScale,
          completedScale:
            nanobot.target.observationScale,
          startedAt: nanobot.mission.startedAt ?? now,
          completedAt: now,
          durationSeconds:
            Math.max(
              0,
              (now - (nanobot.mission.startedAt ?? now)) / 1000,
            ),
          success: false,
          status: "failed",
          summary: reason,
          findings: [],
          warnings: [reason],
          recommendations: [
            "Select a coordinate-resolved Macro target or connect a supported lower-scale spatial dataset.",
          ],
          verificationStatus: "failed",
          operationMode: "unavailable",
          classification: "unavailable-measurement",
        }
      : null;
    setState(nanobot, "error", reason);
  }

  tick(
    nanobot: Nanobot,
    tick: NanobotMissionTick,
  ): NanobotMissionTickResult {
    if (
      ["idle", "completed", "error", "paused"].includes(
        nanobot.state,
      )
    ) {
      return { changed: false, completedResult: null };
    }

    const deltaSeconds = Math.max(0, tick.deltaSeconds);
    advanceClock(nanobot, deltaSeconds);

    if (nanobot.state === "deploying") {
      nanobot.mission.progress = clamp(
        nanobot.mission.phaseElapsedSeconds / DEPLOYMENT_SECONDS,
      ) * 0.08;
      nanobot.progress = nanobot.mission.progress;

      if (
        nanobot.mission.phaseElapsedSeconds >=
        DEPLOYMENT_SECONDS
      ) {
        transitionPhase(
          nanobot,
          "navigation",
          "Navigating to resolved Macro target",
        );
        setState(nanobot, "navigating", nanobot.mission.message);
      }

      return { changed: true, completedResult: null };
    }

    if (
      nanobot.state === "navigating" &&
      nanobot.target?.targetPosition
    ) {
      const navigation = navigateNanobot(
        nanobot,
        {
          position: nanobot.target.targetPosition,
          radius: NAVIGATION_RADIUS,
        },
        deltaSeconds,
      );

      nanobot.position = navigation.position;
      nanobot.telemetry.distanceToTarget =
        navigation.distanceRemaining;
      nanobot.telemetry.lastUpdatedAt = tick.now;
      nanobot.telemetry.sampleCount += 1;
      nanobot.mission.progress =
        0.08 + navigation.progress * 0.32;
      nanobot.progress = nanobot.mission.progress;

      if (navigation.arrived) {
        transitionPhase(
          nanobot,
          "arrival",
          "Target arrival confirmed",
        );
        setState(nanobot, "arrived", nanobot.mission.message);
      }

      return { changed: true, completedResult: null };
    }

    if (nanobot.state === "arrived") {
      transitionPhase(
        nanobot,
        "assessment",
        "Assessing simulated target context",
      );
      setState(nanobot, "working", nanobot.mission.message);
      return { changed: true, completedResult: null };
    }

    if (nanobot.state === "working") {
      const duration = OPERATION_SECONDS[nanobot.type];
      const operationProgress = clamp(
        nanobot.mission.phaseElapsedSeconds / duration,
      );

      if (operationProgress < 0.24) {
        nanobot.mission.phase = "assessment";
        nanobot.mission.message =
          "Assessing simulated target context";
      } else if (operationProgress < 0.76) {
        nanobot.mission.phase = "operation";
        nanobot.mission.message = phaseMessage(nanobot);
      } else if (operationProgress < 1) {
        nanobot.mission.phase = "verification";
        nanobot.mission.message =
          "Verifying simulated mission lifecycle";
      }

      nanobot.mission.progress =
        0.4 + operationProgress * 0.35;
      nanobot.progress = nanobot.mission.progress;

      if (operationProgress >= 1) {
        const result = createSimulationResult(nanobot, tick.now);
        nanobot.mission.result = result;
        nanobot.mission.verificationStatus =
          "simulation-verified";
        transitionPhase(
          nanobot,
          "return",
          "Verification complete; returning to deployment position",
        );
        setState(nanobot, "returning", nanobot.mission.message);
        return { changed: true, completedResult: null };
      }

      return { changed: true, completedResult: null };
    }

    if (nanobot.state === "returning") {
      const navigation = returnNanobot(
        nanobot,
        deltaSeconds,
      );
      nanobot.position = navigation.position;
      nanobot.telemetry.distanceFromDeployment =
        navigation.distanceRemaining;
      nanobot.telemetry.lastUpdatedAt = tick.now;
      nanobot.telemetry.sampleCount += 1;
      nanobot.mission.progress =
        0.75 + (1 - navigation.progress) * 0.25;
      nanobot.progress = nanobot.mission.progress;

      if (navigation.arrived) {
        nanobot.mission.progress = 1;
        nanobot.progress = 1;
        nanobot.mission.phase = "complete";
        nanobot.mission.completedAt = tick.now;
        nanobot.mission.message = "Mission completed after return";
        setState(nanobot, "completed", nanobot.mission.message);

        if (nanobot.mission.result) {
          nanobot.mission.result.completedAt = tick.now;
          nanobot.mission.result.durationSeconds = Math.max(
            0,
            (tick.now - nanobot.mission.result.startedAt) / 1000,
          );
          nanobot.mission.result.status = "completed";
          return {
            changed: true,
            completedResult: nanobot.mission.result,
          };
        }
      }

      return { changed: true, completedResult: null };
    }

    this.fail(
      nanobot,
      "Invalid mission lifecycle state",
      tick.now,
    );
    return {
      changed: true,
      completedResult: nanobot.mission.result,
    };
  }
}

export const nanobotMissionEngine =
  new NanobotMissionEngine();
