import type {
  BrainScale,
  BrainStructure,
} from "./BrainStructureRegistry";

import {
  createNanobot,
  createNanobotMission,
  createNanobotTarget,
  getNanobotScaleProfile,
  type Nanobot,
  type NanobotFinding,
  type NanobotMission,
  type NanobotMissionResult,
  type NanobotObservationTarget,
  type NanobotState,
  type NanobotTarget,
  type NanobotType,
} from "./NanobotTypes";

export class NanobotRegistry {
  private nanobots = new Map<string, Nanobot>();
  private missionHistory: NanobotMissionResult[] = [];
  private missionCounter = 0;

  create(
    type: NanobotType = "scout",
  ): Nanobot {
    const id = this.createUniqueId();
    const nanobot = createNanobot(id, type);
    this.nanobots.set(id, nanobot);
    return nanobot;
  }

  register(
    nanobot: Nanobot,
  ): Nanobot {
    this.nanobots.set(nanobot.id, nanobot);
    return nanobot;
  }

  get(
    id: string,
  ): Nanobot | null {
    return this.nanobots.get(id) ?? null;
  }

  getAll(): Nanobot[] {
    return Array.from(this.nanobots.values());
  }

  getByTarget(
    structureId: string,
  ): Nanobot[] {
    return this.getAll().filter(
      (nanobot) =>
        nanobot.target?.structureId === structureId,
    );
  }

  getByState(
    state: NanobotState,
  ): Nanobot[] {
    return this.getAll().filter(
      (nanobot) => nanobot.state === state,
    );
  }

  getMissionHistory(): NanobotMissionResult[] {
    return [...this.missionHistory];
  }

  getMission(
    nanobotId: string,
  ): Nanobot["mission"] | null {
    return this.get(nanobotId)?.mission ?? null;
  }

  inspectTarget(
    structureId: string,
  ): Nanobot[] {
    return this.getByTarget(structureId);
  }

  remove(
    id: string,
  ): boolean {
    return this.nanobots.delete(id);
  }

  clear(): void {
    this.nanobots.clear();
  }

  clearMissionHistory(): void {
    this.missionHistory = [];
    this.missionCounter = 0;
  }

  setState(
    id: string,
    state: NanobotState,
  ): Nanobot | null {
    const nanobot = this.get(id);

    if (!nanobot) return null;

    nanobot.state = state;
    nanobot.updatedAt = Date.now();
    return nanobot;
  }

  setMissionProgress(
    id: string,
    progress: number,
  ): Nanobot | null {
    const nanobot = this.get(id);

    if (!nanobot) return null;

    const next = Math.min(1, Math.max(0, progress));
    nanobot.progress = next;
    nanobot.mission.progress = next;
    nanobot.updatedAt = Date.now();
    return nanobot;
  }

  updateTelemetry(
    id: string,
    distanceToTarget: number,
    distanceFromDeployment: number,
  ): Nanobot | null {
    const nanobot = this.get(id);

    if (!nanobot) return null;

    nanobot.telemetry = {
      distanceToTarget,
      distanceFromDeployment,
      lastUpdatedAt: Date.now(),
      sampleCount: nanobot.telemetry.sampleCount + 1,
    };
    nanobot.updatedAt = Date.now();
    return nanobot;
  }

  addFinding(
    id: string,
    finding: NanobotFinding,
  ): Nanobot | null {
    const nanobot = this.get(id);

    if (!nanobot) return null;

    if (!nanobot.mission.result) {
      return nanobot;
    }

    nanobot.mission.result.findings.push(finding);
    nanobot.updatedAt = Date.now();
    return nanobot;
  }

  assignTarget(
    id: string,
    structure: BrainStructure,
    observation: NanobotObservationTarget,
  ): Nanobot | null {
    const nanobot = this.get(id);

    if (!nanobot) return null;

    const target = createNanobotTarget(
      structure,
      observation,
    );

    nanobot.target = target;
    nanobot.mission = createNanobotMission(
      nanobot.type,
      target,
    );
    nanobot.progress = 0;
    nanobot.updatedAt = Date.now();
    return nanobot;
  }

  targetStructure(
    id: string,
    structure: BrainStructure,
    observation?: NanobotObservationTarget,
  ): Nanobot | null {
    return this.assignTarget(
      id,
      structure,
      observation ?? {
        scale: structure.scale,
        datasetId: null,
        status: "ready",
      },
    );
  }

  startMission(
    id: string,
    mission: NanobotMission,
    target?: NanobotTarget,
  ): Nanobot | null {
    const nanobot = this.get(id);

    if (!nanobot) return null;

    if (target) nanobot.target = target;
    nanobot.mission = createNanobotMission(
      mission,
      nanobot.target,
    );
    nanobot.state = "deploying";
    nanobot.progress = 0;
    nanobot.updatedAt = Date.now();
    return nanobot;
  }

  recordMissionResult(
    id: string,
    result: NanobotMissionResult,
  ): NanobotMissionResult | null {
    const nanobot = this.get(id);

    if (!nanobot) return null;

    const alreadyStored = this.missionHistory.find(
      (entry) => entry.missionId === result.missionId,
    );

    if (alreadyStored) {
      nanobot.mission.result = alreadyStored;
      return alreadyStored;
    }

    this.missionCounter += 1;

    const stored: NanobotMissionResult = {
      ...result,
      missionNumber: this.missionCounter,
      target: { ...result.target },
      findings: [...result.findings],
      warnings: [...result.warnings],
      recommendations: [...result.recommendations],
    };

    this.missionHistory.unshift(stored);
    nanobot.mission.result = stored;
    nanobot.updatedAt = Date.now();
    return stored;
  }

  setMissionResult(
    id: string,
    result: NanobotMissionResult,
  ): Nanobot | null {
    const nanobot = this.get(id);

    if (!nanobot) return null;

    this.recordMissionResult(id, result);
    nanobot.mission.message = result.summary;
    return nanobot;
  }

  updateObservationContext(
    observation: NanobotObservationTarget,
  ): void {
    this.updateViewerScale(observation.scale);
  }

  updateViewerScale(
    scale: BrainScale,
  ): void {
    const profile = getNanobotScaleProfile(scale);

    this.nanobots.forEach((nanobot) => {
      const missionScale =
        nanobot.mission.originalScale ??
        nanobot.target?.observationScale ??
        "macro";

      nanobot.presentation = {
        viewerScale: scale,
        visualScale: profile.visualScale,
        contextLabel: profile.contextLabel,
        simulationOnly: profile.simulationOnly,
        transition: scale === missionScale
          ? null
          : {
              fromScale: missionScale,
              toScale: scale,
              status: "view-only",
              message:
                `Viewer moved to ${scale}; mission remains anchored to its original ${missionScale} target context.`,
              createdAt: Date.now(),
            },
      };
      nanobot.updatedAt = Date.now();
    });
  }

  clearTarget(
    id: string,
  ): Nanobot | null {
    const nanobot = this.get(id);

    if (!nanobot) return null;

    nanobot.target = null;
    nanobot.progress = 0;
    nanobot.mission = createNanobotMission(nanobot.type);
    nanobot.state = "idle";
    nanobot.updatedAt = Date.now();
    return nanobot;
  }

  private createUniqueId(): string {
    let id = "";

    do {
      id = `nano-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    } while (this.nanobots.has(id));

    return id;
  }
}

export const nanobotRegistry = new NanobotRegistry();
