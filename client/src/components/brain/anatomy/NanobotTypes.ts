import type {
  BrainHemisphere,
  BrainScale,
  BrainStructure,
  BrainStructureDepth,
} from "./BrainStructureRegistry";

export type NanobotState =
  | "idle"
  | "deploying"
  | "navigating"
  | "arrived"
  | "working"
  | "returning"
  | "completed"
  | "paused"
  | "error";

export type NanobotType =
  | "scout"
  | "diagnostic"
  | "repair"
  | "delivery"
  | "monitor";

export type NanobotMission =
  | "scout"
  | "diagnostic"
  | "repair"
  | "delivery"
  | "monitor";

export type NanobotMissionPhase =
  | "deployment"
  | "navigation"
  | "assessment"
  | "operation"
  | "verification"
  | "return"
  | "complete"
  | "failed";

export type NanobotCapability =
  | "map"
  | "inspect"
  | "repair"
  | "deliver"
  | "monitor";

export interface NanobotPosition {
  x: number;
  y: number;
  z: number;
}

export interface NanobotTarget {
  structureId: string;
  structureName: string;
  hemisphere: BrainHemisphere;
  depth: BrainStructureDepth;
  scale: BrainScale;
  observationScale: BrainScale;
  observationDatasetId: string | null;
  observationStatus: "ready" | "unavailable" | "loading" | "error";
}

export interface NanobotFinding {
  id: string;
  timestamp: number;
  severity: "info" | "low" | "moderate" | "high";
  title: string;
  detail: string;
  scale: BrainScale;
}

export interface NanobotMissionResult {
  success: boolean;
  summary: string;
  findings: NanobotFinding[];
  completedAt: number | null;
}

export interface NanobotTelemetry {
  distanceToTarget: number;
  distanceFromDeployment: number;
  lastUpdatedAt: number;
  sampleCount: number;
}

export interface NanobotMissionStatus {
  mission: NanobotMission;
  phase: NanobotMissionPhase;
  progress: number;
  startedAt: number | null;
  completedAt: number | null;
  message: string;
  result: NanobotMissionResult | null;
}

export interface Nanobot {
  id: string;
  type: NanobotType;
  state: NanobotState;

  capabilities: NanobotCapability[];

  position: NanobotPosition;

  deploymentPosition: NanobotPosition;

  target: NanobotTarget | null;

  progress: number;

  mission: NanobotMissionStatus;

  telemetry: NanobotTelemetry;

  createdAt: number;
  updatedAt: number;

  metadata: {
    label: string;
    version: string;
  };
}

export const NANOBOT_CAPABILITIES: Record<
  NanobotType,
  NanobotCapability[]
> = {
  scout: ["map", "inspect"],
  diagnostic: ["inspect", "monitor"],
  repair: ["inspect", "repair"],
  delivery: ["deliver", "monitor"],
  monitor: ["monitor", "inspect"],
};

export interface NanobotObservationTarget {
  scale: BrainScale;
  datasetId: string | null;
  status: NanobotTarget["observationStatus"];
}

export function createNanobotTarget(
  structure: BrainStructure,
  observation: NanobotObservationTarget = {
    scale: structure.scale,
    datasetId: null,
    status: "ready",
  },
): NanobotTarget {
  return {
    structureId: structure.id,
    structureName:
      structure.displayName,
    hemisphere:
      structure.hemisphere,
    depth:
      structure.depth,
    scale:
      structure.scale,
    observationScale:
      observation.scale,
    observationDatasetId:
      observation.datasetId,
    observationStatus:
      observation.status,
  };
}

export function createNanobotMission(
  mission: NanobotMission,
): NanobotMissionStatus {
  return {
    mission,
    phase: "deployment",
    progress: 0,
    startedAt: null,
    completedAt: null,
    message:
      "Mission initialized",
    result: null,
  };
}

export function createNanobot(
  id: string,
  type: NanobotType = "scout",
): Nanobot {
  const now = Date.now();

  return {
    id,
    type,
    state: "idle",

    capabilities:
      [
        ...NANOBOT_CAPABILITIES[
          type
        ],
      ],

    position: {
      x: 0,
      y: 0,
      z: 0,
    },

    deploymentPosition: {
      x: 0,
      y: 0,
      z: 0,
    },

    target: null,

    progress: 0,

    mission:
      createNanobotMission(
        type,
      ),

    telemetry: {
      distanceToTarget: 0,
      distanceFromDeployment: 0,
      lastUpdatedAt: now,
      sampleCount: 0,
    },

    createdAt: now,
    updatedAt: now,

    metadata: {
      label: `Nanobot ${id}`,
      version: "1.2.0",
    },
  };
}