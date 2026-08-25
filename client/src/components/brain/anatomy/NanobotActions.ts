import {
  nanobotMissionEngine,
} from "./NanobotMissionEngine";

import {
  nanobotRegistry,
} from "./NanobotRegistry";

import type {
  Nanobot,
  NanobotMissionResult,
  NanobotTarget,
} from "./NanobotTypes";

/**
 * Integration-facing mission actions. Renderers remain responsible for resolving
 * an actual viewer coordinate, creating/removing Three.js visuals, and invoking
 * `start` with that resolved target. This facade deliberately exposes no React
 * state setters and makes no scientific or physical-operation claims.
 */
export const nanobotActions = {
  getFleet(): Nanobot[] {
    return nanobotRegistry.getAll();
  },

  getMissionHistory(): NanobotMissionResult[] {
    return nanobotRegistry.getMissionHistory();
  },

  inspectTarget(structureId: string): Nanobot[] {
    return nanobotRegistry.inspectTarget(structureId);
  },

  evaluateTarget(target: NanobotTarget | null) {
    return nanobotMissionEngine.canDeploy(target);
  },

  pauseFleet(): number {
    let count = 0;
    nanobotRegistry.getAll().forEach((nanobot) => {
      if (nanobotMissionEngine.pause(nanobot)) count += 1;
    });
    return count;
  },

  resumeFleet(): number {
    let count = 0;
    nanobotRegistry.getAll().forEach((nanobot) => {
      if (nanobotMissionEngine.resume(nanobot)) count += 1;
    });
    return count;
  },

  returnFleet(): number {
    let count = 0;
    nanobotRegistry.getAll().forEach((nanobot) => {
      if (nanobotMissionEngine.requestReturn(nanobot)) count += 1;
    });
    return count;
  },
};

export type NanobotActionFacade = typeof nanobotActions;
