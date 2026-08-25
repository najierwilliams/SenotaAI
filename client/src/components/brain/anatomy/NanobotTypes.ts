import type {
  BrainHemisphere,
  BrainScale,
  BrainStructure,
  BrainStructureDepth,
} from "./BrainStructureRegistry";

import type {
  BrainDatasetStatus,
} from "@shared/brainScience";

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

export type NanobotMission = NanobotType;

export type NanobotMissionPhase =
  | "deployment"
  | "navigation"
  | "arrival"
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

export type NanobotOperationMode =
  | "simulation"
  | "dataset-backed"
  | "unavailable";

export type NanobotVerificationStatus =
  | "pending"
  | "simulation-verified"
  | "dataset-verified"
  | "unavailable"
  | "failed";

export type NanobotSpatialStatus =
  | "resolved"
  | "unavailable"
  | "transitioning";

export interface NanobotPosition {
  x: number;
  y: number;
  z: number;
}

export interface NanobotScaleProfile {
  scale: BrainScale;
  visualScale: number;
  contextLabel: string;
  simulationOnly: boolean;
}

export const NANOBOT_SCALE_PROFILES: Record<
  BrainScale,
  NanobotScaleProfile
> = {
  macro: {
    scale: "macro",
    visualScale: 1,
    contextLabel: "Macro anatomy navigation",
    simulationOnly: false,
  },
  tissue: {
    scale: "tissue",
    visualScale: 0.78,
    contextLabel: "Tissue observation context",
    simulationOnly: true,
  },
  cellular: {
    scale: "cellular",
    visualScale: 0.58,
    contextLabel: "Cellular observation context",
    simulationOnly: true,
  },
  subcellular: {
    scale: "subcellular",
    visualScale: 0.4,
    contextLabel: "Subcellular observation context",
    simulationOnly: true,
  },
  molecular: {
    scale: "molecular",
    visualScale: 0.28,
    contextLabel: "Molecular observation context",
    simulationOnly: true,
  },
};

export interface NanobotTarget {
  structureId: string;
  structureName: string;
  hemisphere: BrainHemisphere;
  depth: BrainStructureDepth;
  parentStructureId: string | null;
  parentStructureName: string | null;
  sourceStructureScale: BrainScale;
  observationScale: BrainScale;
  observationDatasetId: string | null;
  observationStatus: "ready" | "unavailable" | "loading" | "error";
  observationScientificStatus: BrainDatasetStatus | null;
  observationContextLabel: string;
  targetPosition: NanobotPosition | null;
  targetResolution: string | null;
  spatialStatus: NanobotSpatialStatus;
  spatialMessage: string;
}

export interface NanobotScaleTransition {
  fromScale: BrainScale;
  toScale: BrainScale;
  status: "view-only" | "adapted" | "unavailable";
  message: string;
  createdAt: number;
}

export interface NanobotPresentation {
  viewerScale: BrainScale;
  visualScale: number;
  contextLabel: string;
  simulationOnly: boolean;
  transition: NanobotScaleTransition | null;
}

export interface NanobotFinding {
  id: string;
  timestamp: number;
  severity: "info" | "low" | "moderate" | "high";
  title: string;
  detail: string;
  scale: BrainScale;
  source: "simulation" | "dataset";
}

export interface NanobotMissionResult {
  missionId: string;
  missionNumber: number;
  nanobotId: string;
  mission: NanobotMission;
  target: NanobotTarget;
  originalScale: BrainScale;
  completedScale: BrainScale;
  startedAt: number;
  completedAt: number | null;
  durationSeconds: number;
  success: boolean;
  status: "completed" | "failed" | "returned";
  summary: string;
  findings: NanobotFinding[];
  warnings: string[];
  recommendations: string[];
  verificationStatus: NanobotVerificationStatus;
  operationMode: NanobotOperationMode;
}

export interface NanobotTelemetry {
  distanceToTarget: number;
  distanceFromDeployment: number;
  lastUpdatedAt: number;
  sampleCount: number;
}

export interface NanobotMissionStatus {
  id: string;
  mission: NanobotMission;
  phase: NanobotMissionPhase;
  progress: number;
  startedAt: number | null;
  completedAt: number | null;
  phaseElapsedSeconds: number;
  totalElapsedSeconds: number;
  message: string;
  originalScale: BrainScale | null;
  operationMode: NanobotOperationMode;
  verificationStatus: NanobotVerificationStatus;
  pausedState: NanobotState | null;
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
  presentation: NanobotPresentation;
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
  scientificStatus?: BrainDatasetStatus | null;
  contextLabel?: string;
  targetPosition?: NanobotPosition | null;
  targetResolution?: string | null;
  spatialStatus?: NanobotSpatialStatus;
  spatialMessage?: string;
}

export function getNanobotScaleProfile(
  scale: BrainScale,
): NanobotScaleProfile {
  return NANOBOT_SCALE_PROFILES[scale];
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
    structureName: structure.displayName,
    hemisphere: structure.hemisphere,
    depth: structure.depth,
    parentStructureId: structure.parentRegion,
    parentStructureName: structure.parentRegion,
    sourceStructureScale: structure.scale,
    observationScale: observation.scale,
    observationDatasetId: observation.datasetId,
    observationStatus: observation.status,
    observationScientificStatus:
      observation.scientificStatus ?? null,
    observationContextLabel:
      observation.contextLabel ??
      `${structure.displayName} · ${observation.scale} observation`,
    targetPosition:
      observation.targetPosition ?? null,
    targetResolution:
      observation.targetResolution ?? null,
    spatialStatus:
      observation.spatialStatus ??
      (observation.targetPosition
        ? "resolved"
        : "unavailable"),
    spatialMessage:
      observation.spatialMessage ??
      (observation.targetPosition
        ? "Target position resolved from the active viewer context."
        : "No coordinate-resolved target is available for this observation context."),
  };
}

export function createNanobotMission(
  mission: NanobotMission,
  target: NanobotTarget | null = null,
): NanobotMissionStatus {
  const now = Date.now();

  return {
    id: `mission-${now}-${Math.random().toString(36).slice(2, 8)}`,
    mission,
    phase: "deployment",
    progress: 0,
    startedAt: null,
    completedAt: null,
    phaseElapsedSeconds: 0,
    totalElapsedSeconds: 0,
    message: "Mission initialized",
    originalScale: target?.observationScale ?? null,
    operationMode:
      target?.observationScale === "macro"
        ? "simulation"
        : "unavailable",
    verificationStatus: "pending",
    pausedState: null,
    result: null,
  };
}

export function createNanobot(
  id: string,
  type: NanobotType = "scout",
): Nanobot {
  const now = Date.now();
  const profile = getNanobotScaleProfile("macro");

  return {
    id,
    type,
    state: "idle",
    capabilities: [...NANOBOT_CAPABILITIES[type]],
    position: { x: 0, y: 0, z: 0 },
    deploymentPosition: { x: 0, y: 0, z: 0 },
    target: null,
    presentation: {
      viewerScale: profile.scale,
      visualScale: profile.visualScale,
      contextLabel: profile.contextLabel,
      simulationOnly: profile.simulationOnly,
      transition: null,
    },
    progress: 0,
    mission: createNanobotMission(type),
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
      version: "2.0.0",
    },
  };
}
