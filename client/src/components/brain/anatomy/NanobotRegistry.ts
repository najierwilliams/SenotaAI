import type {
  BrainStructure,
} from "./BrainStructureRegistry";

import {
  createNanobot,
  createNanobotTarget,
  createNanobotMission,
  type Nanobot,
  type NanobotFinding,
  type NanobotMission,
  type NanobotMissionPhase,
  type NanobotMissionResult,
  type NanobotState,
  type NanobotType,
} from "./NanobotTypes";

export class NanobotRegistry {
  private nanobots =
    new Map<string, Nanobot>();

  create(
    type: NanobotType = "scout",
  ): Nanobot {
    const id =
      this.createUniqueId();

    const nanobot =
      createNanobot(
        id,
        type,
      );

    this.nanobots.set(
      id,
      nanobot,
    );

    return nanobot;
  }

  register(
    nanobot: Nanobot,
  ): Nanobot {
    this.nanobots.set(
      nanobot.id,
      nanobot,
    );

    return nanobot;
  }

  get(
    id: string,
  ): Nanobot | null {
    return (
      this.nanobots.get(id) ??
      null
    );
  }

  getAll(): Nanobot[] {
    return Array.from(
      this.nanobots.values(),
    );
  }

  remove(
    id: string,
  ): boolean {
    return this.nanobots.delete(
      id,
    );
  }

  clear(): void {
    this.nanobots.clear();
  }

  setState(
    id: string,
    state: NanobotState,
  ): Nanobot | null {
    const nanobot =
      this.nanobots.get(id);

    if (!nanobot) {
      return null;
    }

    nanobot.state = state;
    nanobot.updatedAt =
      Date.now();

    return nanobot;
  }

  setMissionPhase(
    id: string,
    phase: NanobotMissionPhase,
    message: string,
  ): Nanobot | null {
    const nanobot =
      this.nanobots.get(id);

    if (!nanobot) {
      return null;
    }

    nanobot.mission.phase =
      phase;

    nanobot.mission.message =
      message;

    nanobot.updatedAt =
      Date.now();

    return nanobot;
  }

  setMissionProgress(
    id: string,
    progress: number,
  ): Nanobot | null {
    const nanobot =
      this.nanobots.get(id);

    if (!nanobot) {
      return null;
    }

    const nextProgress =
      Math.min(
        1,
        Math.max(
          0,
          progress,
        ),
      );

    nanobot.progress =
      nextProgress;

    nanobot.mission.progress =
      nextProgress;

    nanobot.updatedAt =
      Date.now();

    return nanobot;
  }

  updateTelemetry(
    id: string,
    distanceToTarget: number,
    distanceFromDeployment: number,
  ): Nanobot | null {
    const nanobot =
      this.nanobots.get(id);

    if (!nanobot) {
      return null;
    }

    nanobot.telemetry = {
      distanceToTarget,
      distanceFromDeployment,
      lastUpdatedAt:
        Date.now(),
      sampleCount:
        nanobot.telemetry
          .sampleCount + 1,
    };

    nanobot.updatedAt =
      Date.now();

    return nanobot;
  }

  setMissionResult(
    id: string,
    result: NanobotMissionResult,
  ): Nanobot | null {
    const nanobot =
      this.nanobots.get(id);

    if (!nanobot) {
      return null;
    }

    nanobot.mission.result =
      result;

    nanobot.mission.message =
      result.summary;

    nanobot.updatedAt =
      Date.now();

    return nanobot;
  }

  addFinding(
    id: string,
    finding: NanobotFinding,
  ): Nanobot | null {
    const nanobot =
      this.nanobots.get(id);

    if (!nanobot) {
      return null;
    }

    if (
      !nanobot.mission.result
    ) {
      nanobot.mission.result = {
        success: true,
        summary:
          "Mission findings recorded",
        findings: [],
        completedAt: null,
      };
    }

    nanobot.mission.result.findings.push(
      finding,
    );

    nanobot.updatedAt =
      Date.now();

    return nanobot;
  }

  startMission(
    id: string,
    mission: NanobotMission,
  ): Nanobot | null {
    const nanobot =
      this.nanobots.get(id);

    if (!nanobot) {
      return null;
    }

    const now = Date.now();

    nanobot.mission =
      createNanobotMission(
        mission,
      );

    nanobot.mission.startedAt =
      now;

    nanobot.state =
      "deploying";

    nanobot.progress = 0;
    nanobot.updatedAt = now;

    return nanobot;
  }

  completeMission(
    id: string,
    summary =
      "Mission completed",
  ): Nanobot | null {
    const nanobot =
      this.nanobots.get(id);

    if (!nanobot) {
      return null;
    }

    const now = Date.now();

    nanobot.state =
      "completed";

    nanobot.progress = 1;

    nanobot.mission.progress =
      1;

    nanobot.mission.phase =
      "complete";

    nanobot.mission.completedAt =
      now;

    nanobot.mission.message =
      summary;

    if (
      !nanobot.mission.result
    ) {
      nanobot.mission.result = {
        success: true,
        summary,
        findings: [],
        completedAt: now,
      };
    } else {
      nanobot.mission.result.completedAt =
        now;
    }

    nanobot.updatedAt = now;

    return nanobot;
  }

  targetStructure(
    id: string,
    structure: BrainStructure,
  ): Nanobot | null {
    const nanobot =
      this.nanobots.get(id);

    if (!nanobot) {
      return null;
    }

    nanobot.target =
      createNanobotTarget(
        structure,
      );

    nanobot.mission =
      createNanobotMission(
        nanobot.type,
      );

    nanobot.mission.startedAt =
      Date.now();

    nanobot.mission.phase =
      "navigation";

    nanobot.mission.message =
      "Navigating to target";

    nanobot.state =
      "navigating";

    nanobot.progress = 0;
    nanobot.mission.progress =
      0;

    nanobot.updatedAt =
      Date.now();

    return nanobot;
  }

  clearTarget(
    id: string,
  ): Nanobot | null {
    const nanobot =
      this.nanobots.get(id);

    if (!nanobot) {
      return null;
    }

    nanobot.target = null;
    nanobot.progress = 0;
    nanobot.mission =
      createNanobotMission(
        nanobot.type,
      );
    nanobot.state = "idle";
    nanobot.updatedAt =
      Date.now();

    return nanobot;
  }

  getByTarget(
    structureId: string,
  ): Nanobot[] {
    return this.getAll().filter(
      (nanobot) =>
        nanobot.target
          ?.structureId ===
        structureId,
    );
  }

  getByState(
    state: NanobotState,
  ): Nanobot[] {
    return this.getAll().filter(
      (nanobot) =>
        nanobot.state === state,
    );
  }

  private createUniqueId(): string {
    let id = "";

    do {
      id =
        `nano-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
    } while (
      this.nanobots.has(id)
    );

    return id;
  }
}

export const nanobotRegistry =
  new NanobotRegistry();