import * as THREE from "three";

import {
  disposeNanobotVisual,
  type NanobotVisual,
} from "./NanobotVisuals";

import {
  NanobotRegistry,
} from "./NanobotRegistry";

import type {
  NanobotMissionResult,
  NanobotPosition,
} from "./NanobotTypes";

export interface ArchiveCompletedNanobotOptions {
  registry: NanobotRegistry;
  nanobotId: string;
  completedResult: NanobotMissionResult;
  visualRoot: THREE.Group | null;
  visuals: Map<string, NanobotVisual>;
  positions: Map<string, NanobotPosition>;
}

/**
 * Archives a completed, physically returned Macro simulation. Mission history
 * is persisted before the active agent's marker and fleet entry are removed.
 */
export function archiveCompletedNanobot({
  registry,
  nanobotId,
  completedResult,
  visualRoot,
  visuals,
  positions,
}: ArchiveCompletedNanobotOptions): NanobotMissionResult[] {
  registry.recordMissionResult(
    nanobotId,
    completedResult,
  );

  const visual = visuals.get(nanobotId);

  if (visual) {
    visualRoot?.remove(visual.root);
    disposeNanobotVisual(visual);
    visuals.delete(nanobotId);
  }

  positions.delete(nanobotId);
  registry.remove(nanobotId);

  return registry.getMissionHistory();
}
