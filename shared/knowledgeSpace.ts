export const KNOWLEDGE_OBJECT_TYPES = [
  "DOCUMENT",
  "NOTE",
  "SCIENTIFIC_STRUCTURE",
  "SCIENTIFIC_REGION",
  "DATASET",
  "OBSERVATION",
  "CELLULAR_RECORD",
  "MOLECULAR_RECORD",
  "TISSUE_RECORD",
  "CONNECTIVITY_RECORD",
  "REFERENCE",
  "RESEARCH_QUESTION",
  "HYPOTHESIS",
  "TASK",
  "NANOBOT_MISSION",
  "NANOBOT_REPORT",
  "ENTITY",
  "FOLDER",
  "COLLECTION",
  "EVIDENCE_RECORD",
  "USER_DOCUMENT",
  "EXTRACTED_EVIDENCE",
  "APPROVAL",
] as const;

export type KnowledgeObjectType = (typeof KNOWLEDGE_OBJECT_TYPES)[number];

export const KNOWLEDGE_SOURCE_TYPES = [
  "USER_FACT",
  "USER_NOTE",
  "USER_HYPOTHESIS",
  "USER_QUESTION",
  "USER_DECISION",
  "PROVIDER_DATA",
  "PUBLISHED_EVIDENCE",
  "AI_INFERENCE",
  "VALIDATED_RELATIONSHIP",
] as const;

export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

export const KNOWLEDGE_TRUTH_STATES = [
  "VERIFIED",
  "PROVIDER_CONFIRMED",
  "USER_APPROVED",
  "PROBABILISTIC",
  "INFERRED",
  "PROPOSED",
  "REQUIRES_REVIEW",
  "CONTRADICTED",
  "UNMAPPED",
  "NOT_ESTABLISHED",
  "UNAVAILABLE",
] as const;

export type KnowledgeTruthState = (typeof KNOWLEDGE_TRUTH_STATES)[number];

export const KNOWLEDGE_RELATIONSHIP_TYPES = [
  "IS_A",
  "PART_OF",
  "LOCATED_IN",
  "RELATED_TO",
  "SUPPORTED_BY",
  "DERIVED_FROM",
  "OBSERVED_IN",
  "CONNECTED_TO",
  "REFERENCES",
  "CONTRADICTS",
  "SUPPORTS",
  "REQUIRES_REVIEW",
  "SAME_AS",
  "MAPPED_TO",
  "UNMAPPED_TO",
  "VISUALIZED_BY",
] as const;

export type KnowledgeRelationshipType = (typeof KNOWLEDGE_RELATIONSHIP_TYPES)[number];

export const KNOWLEDGE_AUTONOMY_LEVELS = [
  "MANUAL",
  "SUGGEST",
  "ON_DEMAND",
  "MAINTAIN_NON_DESTRUCTIVE",
] as const;

export type KnowledgeAutonomyLevel = (typeof KNOWLEDGE_AUTONOMY_LEVELS)[number];

export const KNOWLEDGE_WORKER_ROLES = [
  "SCOUT",
  "RESEARCHER",
  "VALIDATOR",
  "ORGANIZER",
  "LINKER",
  "DATA_ANALYST",
  "PROVENANCE_AGENT",
  "LICENSE_AGENT",
  "REVIEW_AGENT",
  "MAINTENANCE_AGENT",
] as const;

export type KnowledgeWorkerRole = (typeof KNOWLEDGE_WORKER_ROLES)[number];

export const KNOWLEDGE_MISSION_STATES = [
  "QUEUED",
  "SCOUTING",
  "RESEARCHING",
  "VALIDATING",
  "ORGANIZING",
  "REPORTING",
  "WAITING_FOR_USER",
  "WAITING_FOR_PROVIDER",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "MISSION_LIMIT_REACHED",
] as const;

export type KnowledgeMissionState = (typeof KNOWLEDGE_MISSION_STATES)[number];

export type KnowledgeObjectStatus =
  | "ACTIVE"
  | "ARCHIVED"
  | "TRASHED"
  | "NEEDS_ATTENTION";

export type KnowledgePlacementKind = "PRIMARY" | "REFERENCE";

export type KnowledgeScientificMetadata = {
  provider?: string;
  dataset?: string;
  datasetVersion?: string;
  referenceSpace?: string;
  coordinate?: { x: number; y: number; z: number; units: string } | null;
  region?: string;
  map?: string;
  uncertainty?: string;
  evidenceTier?: string;
  license?: string;
  sourceUrl?: string;
};

export type KnowledgeProvenance = {
  provider?: string;
  sourceUrl?: string;
  datasetVersion?: string;
  retrievedAt?: string;
  citation?: string;
  note?: string;
};

export type KnowledgeObject = {
  id: string;
  workspaceId: string;
  objectType: KnowledgeObjectType;
  title: string;
  description: string;
  content: string;
  sourceType: KnowledgeSourceType;
  truthState: KnowledgeTruthState;
  status: KnowledgeObjectStatus;
  tags: string[];
  scientificMetadata: KnowledgeScientificMetadata;
  provenance: KnowledgeProvenance;
  immutableProviderSnapshot: boolean;
  currentVersion: number;
  isPinned: boolean;
  isFavorite: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgePlacement = {
  id: string;
  workspaceId: string;
  objectId: string;
  parentObjectId: string | null;
  placementKind: KnowledgePlacementKind;
  label: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeRelationship = {
  id: string;
  workspaceId: string;
  sourceObjectId: string;
  targetObjectId: string;
  relationshipType: KnowledgeRelationshipType;
  sourceType: KnowledgeSourceType;
  truthState: KnowledgeTruthState;
  confidence: number | null;
  evidence: Record<string, unknown>;
  provenance: KnowledgeProvenance;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeVersion = {
  id: string;
  workspaceId: string;
  objectId: string;
  version: number;
  action: "CREATED" | "UPDATED" | "TRASHED" | "RESTORED" | "IMPORTED" | "MISSION_OUTPUT";
  changedBy: string;
  reason: string;
  snapshot: Record<string, unknown>;
  createdAt: string;
};

export type KnowledgeMission = {
  id: string;
  workspaceId: string;
  targetObjectId: string | null;
  workerRole: KnowledgeWorkerRole;
  objective: string;
  state: KnowledgeMissionState;
  autonomyLevel: KnowledgeAutonomyLevel;
  maxSteps: number;
  maxRetries: number;
  maxDurationSeconds: number;
  maxSpawnedWorkers: number;
  currentStep: number;
  retryCount: number;
  stopRequested: boolean;
  reportObjectId: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeMissionActivity = {
  id: string;
  workspaceId: string;
  missionId: string;
  workerRole: KnowledgeWorkerRole;
  eventType: string;
  message: string;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type KnowledgeApproval = {
  id: string;
  workspaceId: string;
  missionId: string | null;
  targetObjectId: string | null;
  actionType: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "KEPT_FOR_REVIEW";
  title: string;
  rationale: string;
  sourceSummary: string;
  confidence: number | null;
  requestedAt: string;
  resolvedAt: string | null;
};

export type KnowledgeAuditEvent = {
  id: string;
  workspaceId: string;
  actorScope: string;
  action: string;
  subjectType: string;
  subjectId: string | null;
  missionId: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type KnowledgeWorkspace = {
  id: string;
  title: string;
  ownerScope: string;
  autonomyLevel: KnowledgeAutonomyLevel;
  autonomyPaused: boolean;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeGraph = {
  nodes: KnowledgeObject[];
  edges: KnowledgeRelationship[];
};

export type KnowledgeHealth = {
  totalObjects: number;
  folders: number;
  scientificRecords: number;
  openQuestions: number;
  unresolvedRelationships: number;
  pendingApprovals: number;
  activeMissions: number;
  failedMissions: number;
  evidenceGaps: number;
  requiresAttention: number;
};

export type KnowledgeWorkspaceSnapshot = {
  workspace: KnowledgeWorkspace;
  objects: KnowledgeObject[];
  placements: KnowledgePlacement[];
  relationships: KnowledgeRelationship[];
  missions: KnowledgeMission[];
  activity: KnowledgeMissionActivity[];
  approvals: KnowledgeApproval[];
  health: KnowledgeHealth;
};

export const SCIENTIFIC_ELEVATED_TRUTH_STATES: readonly KnowledgeTruthState[] = [
  "VERIFIED",
  "PROVIDER_CONFIRMED",
] as const;

export function isScientificTruthStateUserAssignable(
  truthState: KnowledgeTruthState,
): boolean {
  return !SCIENTIFIC_ELEVATED_TRUTH_STATES.includes(truthState);
}

export function formatKnowledgeTruthState(state: KnowledgeTruthState): string {
  return state.replace(/_/g, " ");
}

export function formatKnowledgeObjectType(type: KnowledgeObjectType): string {
  return type.replace(/_/g, " ");
}
