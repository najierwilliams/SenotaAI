export const LUNA_MEMORY_KINDS = [
  "WORKING",
  "EPISODIC",
  "SEMANTIC",
  "PROCEDURAL",
  "PROJECT",
  "RESEARCH",
  "SELF",
] as const;

export type LunaMemoryKind = (typeof LUNA_MEMORY_KINDS)[number];

export const LUNA_TRUTH_STATES = [
  "FACT",
  "EVIDENCE",
  "INFERENCE",
  "HYPOTHESIS",
  "ASSUMPTION",
  "UNKNOWN",
  "PROPOSED",
  "VALIDATED",
  "PROVIDER_CONFIRMED",
  "CONTRADICTED",
  "UNMAPPED",
  "NOT_ESTABLISHED",
  "UNAVAILABLE",
  "PROVIDER_UNAVAILABLE",
] as const;

export type LunaTruthState = (typeof LUNA_TRUTH_STATES)[number];

export const LUNA_PROJECT_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "BLOCKED",
  "ARCHIVED",
] as const;
export type LunaProjectStatus = (typeof LUNA_PROJECT_STATUSES)[number];

export const LUNA_GOAL_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "BLOCKED",
  "CANCELLED",
] as const;
export type LunaGoalStatus = (typeof LUNA_GOAL_STATUSES)[number];

export const LUNA_TASK_STATUSES = [
  "PENDING",
  "ELIGIBLE",
  "IN_PROGRESS",
  "PAUSED",
  "BLOCKED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "RECOVERY_REQUIRED",
] as const;
export type LunaTaskStatus = (typeof LUNA_TASK_STATUSES)[number];

export const LUNA_MISSION_STATUSES = [
  "QUEUED",
  "PLANNING",
  "RUNNING",
  "PAUSED",
  "WAITING_FOR_PROVIDER",
  "WAITING_FOR_RUNTIME",
  "RECOVERY_REQUIRED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "LIMIT_REACHED",
] as const;
export type LunaMissionStatus = (typeof LUNA_MISSION_STATUSES)[number];

export const LUNA_WORKER_ROLES = [
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
  "MEMORY_AGENT",
  "PLANNER_AGENT",
  "REFLECTION_AGENT",
  "SYNTHESIS_AGENT",
] as const;
export type LunaWorkerRole = (typeof LUNA_WORKER_ROLES)[number];

export const LUNA_WORKER_STATES = [
  "IDLE",
  "QUEUED",
  "RUNNING",
  "WAITING",
  "PAUSED",
  "FAILED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type LunaWorkerState = (typeof LUNA_WORKER_STATES)[number];

export const LUNA_ATTENTION_SEVERITIES = ["INFO", "WARNING", "ACTION_REQUIRED"] as const;
export type LunaAttentionSeverity = (typeof LUNA_ATTENTION_SEVERITIES)[number];

export const LUNA_RUNTIME_STATUSES = ["CONFIGURED", "UNAVAILABLE", "DISABLED", "DEGRADED"] as const;
export type LunaRuntimeStatus = (typeof LUNA_RUNTIME_STATUSES)[number];

export type LunaProvenance = {
  provider?: string;
  sourceUrl?: string;
  sourceVersion?: string;
  retrievedAt?: string;
  license?: string;
  citation?: string;
  method?: string;
  missionId?: string;
  note?: string;
};

export const LUNA_CLAIM_LIFECYCLE_STATES = ["ACTIVE", "SUPERSEDED", "RETRACTED", "REQUIRES_REVIEW"] as const;
export type LunaClaimLifecycleState = (typeof LUNA_CLAIM_LIFECYCLE_STATES)[number];

export const LUNA_CLAIM_EVIDENCE_ROLES = ["SUPPORTS", "CONTRADICTS", "CONTEXT", "DERIVED_FROM"] as const;
export type LunaClaimEvidenceRole = (typeof LUNA_CLAIM_EVIDENCE_ROLES)[number];

export type LunaClaim = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  missionId: string | null;
  subject: string;
  predicate: string;
  objectText: string;
  statement: string;
  truthState: LunaTruthState;
  confidence: number;
  lifecycleState: LunaClaimLifecycleState;
  provenance: LunaProvenance;
  assumptions: string[];
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type LunaClaimEvidence = {
  id: string;
  workspaceId: string;
  claimId: string;
  sourceMemoryId: string | null;
  sourceObjectId: string | null;
  sourceRelationshipId: string | null;
  evidenceRole: LunaClaimEvidenceRole;
  sourceExcerpt: string;
  confidence: number | null;
  provenance: LunaProvenance;
  createdAt: string;
};

export type LunaClaimRevision = {
  id: string;
  workspaceId: string;
  claimId: string;
  priorClaimId: string | null;
  revisionKind: "CREATED" | "REVISED" | "SUPERSEDED" | "RETRACTED" | "CONTRADICTION_RECORDED";
  reason: string;
  actorScope: string;
  snapshot: Record<string, unknown>;
  createdAt: string;
};

export const LUNA_KNOWLEDGE_GAP_STATUSES = ["OPEN", "WATCHING", "RESOLVED", "DISMISSED"] as const;
export type LunaKnowledgeGapStatus = (typeof LUNA_KNOWLEDGE_GAP_STATUSES)[number];
export const LUNA_CURIOSITY_STATUSES = ["PROPOSED", "APPROVED", "DISMISSED", "COMPLETED"] as const;
export type LunaCuriosityStatus = (typeof LUNA_CURIOSITY_STATUSES)[number];
export const LUNA_PRIORITY_TARGET_TYPES = ["PROJECT", "GOAL", "TASK", "GAP", "CURIOSITY"] as const;
export type LunaPriorityTargetType = (typeof LUNA_PRIORITY_TARGET_TYPES)[number];

export type LunaKnowledgeGap = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  claimId: string | null;
  relatedObjectId: string | null;
  title: string;
  question: string;
  requestedEvidence: string;
  rationale: string;
  severity: LunaAttentionSeverity;
  status: LunaKnowledgeGapStatus;
  sourceType: "OWNER" | "LUNA" | "SYSTEM";
  provenance: LunaProvenance;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type LunaKnowledgeGapRevision = {
  id: string;
  workspaceId: string;
  gapId: string;
  revisionKind: "CREATED" | "UPDATED" | "RESOLVED" | "DISMISSED";
  reason: string;
  actorScope: string;
  snapshot: Record<string, unknown>;
  createdAt: string;
};

export type LunaCuriosityCandidate = {
  id: string;
  workspaceId: string;
  gapId: string;
  proposedAction: string;
  rationale: string;
  estimatedCost: "LOW" | "MODERATE" | "HIGH";
  status: LunaCuriosityStatus;
  createdBy: "OWNER" | "LUNA" | "SYSTEM";
  createdAt: string;
};

export type LunaPriorityAssessment = {
  id: string;
  workspaceId: string;
  targetType: LunaPriorityTargetType;
  targetId: string;
  urgencyScore: number;
  impactScore: number;
  evidenceScore: number;
  unblockScore: number;
  riskScore: number;
  priorityScore: number;
  explanation: string;
  assumptions: string[];
  actorScope: string;
  createdAt: string;
};

export type LunaMemory = {
  id: string;
  workspaceId: string;
  memoryKind: LunaMemoryKind;
  content: string;
  importance: number;
  truthState: LunaTruthState;
  sourceType: "USER" | "PROVIDER" | "PUBLISHED" | "LUNA" | "SYSTEM";
  sourceObjectIds: string[];
  projectId: string | null;
  missionId: string | null;
  tags: string[];
  provenance: LunaProvenance;
  active: boolean;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type LunaProject = {
  id: string;
  workspaceId: string;
  title: string;
  summary: string;
  status: LunaProjectStatus;
  priority: number;
  focusObjectId: string | null;
  createdBy: "USER" | "LUNA";
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type LunaGoal = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  parentGoalId: string | null;
  title: string;
  rationale: string;
  status: LunaGoalStatus;
  priority: number;
  progress: number;
  truthState: LunaTruthState;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type LunaTask = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  goalId: string | null;
  missionId: string | null;
  title: string;
  details: string;
  status: LunaTaskStatus;
  priority: number;
  workerRole: LunaWorkerRole | null;
  dependencyTaskIds: string[];
  relatedObjectIds: string[];
  retriesUsed: number;
  maxRetries: number;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type LunaMission = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  goalId: string | null;
  objective: string;
  status: LunaMissionStatus;
  autonomyMode: "ON_DEMAND" | "MAINTENANCE" | "SCHEDULED";
  priority: number;
  currentFocus: string | null;
  rootTaskId: string | null;
  maxWorkers: number;
  maxSteps: number;
  maxRetries: number;
  maxDurationSeconds: number;
  maxModelRequests: number;
  maxTokenBudget: number;
  modelRequestsUsed: number;
  tokenUsage: number;
  pauseRequested: boolean;
  cancelRequested: boolean;
  runtimeRunId: string | null;
  resumeAfter: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LunaWorker = {
  id: string;
  workspaceId: string;
  missionId: string;
  taskId: string | null;
  role: LunaWorkerRole;
  state: LunaWorkerState;
  attempt: number;
  inputSummary: string;
  outputSummary: string | null;
  handoffToRole: LunaWorkerRole | null;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LunaToolCall = {
  id: string;
  workspaceId: string;
  missionId: string;
  workerId: string | null;
  toolName: string;
  toolClass: "KNOWLEDGE" | "PROVIDER" | "DOCUMENT" | "RESEARCH" | "SYSTEM";
  status: "REQUESTED" | "RUNNING" | "COMPLETED" | "FAILED" | "BLOCKED";
  requestSummary: string;
  resultSummary: string | null;
  provider: string | null;
  rateLimitKey: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type LunaAttentionItem = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  missionId: string | null;
  severity: LunaAttentionSeverity;
  category: "CONTRADICTION" | "PROVIDER" | "LICENSE" | "MISSION" | "KNOWLEDGE_GAP" | "SECURITY" | "SYSTEM";
  title: string;
  detail: string;
  state: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  createdAt: string;
  resolvedAt: string | null;
};

export type LunaSelfState = {
  workspaceId: string;
  identitySummary: string;
  capabilities: string[];
  limitations: string[];
  currentFocus: string | null;
  activeGoalIds: string[];
  uncertaintySummary: string;
  currentVersion: number;
  updatedAt: string;
};

export type LunaCognitiveState = {
  workspaceId: string;
  self: LunaSelfState;
  autonomyEnabled: boolean;
  maintenanceEnabled: boolean;
  activeMissionCount: number;
  activeWorkerCount: number;
  queuedTaskCount: number;
  attentionCount: number;
  health: "HEALTHY" | "DEGRADED" | "ACTION_REQUIRED";
  updatedAt: string;
};

export type LunaWorkerContract = {
  role: LunaWorkerRole;
  purpose: string;
  allowedToolClasses: LunaToolCall["toolClass"][];
  allowedOutputs: Array<"MEMORY" | "CLAIM" | "KNOWLEDGE_OBJECT" | "RELATIONSHIP" | "TASK" | "PROJECT" | "REPORT" | "ATTENTION" | "REFLECTION">;
  mayElevateScientificTruth: false;
  mayModifyProviderSnapshot: false;
  mayCreateBiologicalTarget: false;
};

export type LunaRuntimeDispatch = {
  missionId: string;
  workspaceId: string;
  idempotencyKey: string;
  runAt?: string;
};

export type LunaRuntimeResult = {
  accepted: boolean;
  runtimeStatus: LunaRuntimeStatus;
  runId: string | null;
  message: string;
};

export interface LunaDurableRuntime {
  readonly provider: string;
  getStatus(): Promise<{ status: LunaRuntimeStatus; detail: string }>;
  dispatch(input: LunaRuntimeDispatch): Promise<LunaRuntimeResult>;
  cancel(runId: string): Promise<void>;
}

export const LUNA_WORKER_CONTRACTS: readonly LunaWorkerContract[] = [
  { role: "PLANNER_AGENT", purpose: "Turns a bounded objective into a persisted task graph.", allowedToolClasses: ["KNOWLEDGE"], allowedOutputs: ["TASK", "REPORT", "ATTENTION"], mayElevateScientificTruth: false, mayModifyProviderSnapshot: false, mayCreateBiologicalTarget: false },
  { role: "SCOUT", purpose: "Discovers permitted source candidates and records provenance.", allowedToolClasses: ["RESEARCH", "PROVIDER", "KNOWLEDGE"], allowedOutputs: ["KNOWLEDGE_OBJECT", "REPORT", "ATTENTION"], mayElevateScientificTruth: false, mayModifyProviderSnapshot: false, mayCreateBiologicalTarget: false },
  { role: "RESEARCHER", purpose: "Extracts bounded working findings from approved inputs.", allowedToolClasses: ["RESEARCH", "DOCUMENT", "KNOWLEDGE"], allowedOutputs: ["KNOWLEDGE_OBJECT", "MEMORY", "REPORT", "ATTENTION"], mayElevateScientificTruth: false, mayModifyProviderSnapshot: false, mayCreateBiologicalTarget: false },
  { role: "VALIDATOR", purpose: "Classifies evidence quality and conflicts without elevating unsupported claims.", allowedToolClasses: ["KNOWLEDGE", "PROVIDER", "DOCUMENT"], allowedOutputs: ["CLAIM", "RELATIONSHIP", "ATTENTION", "REPORT"], mayElevateScientificTruth: false, mayModifyProviderSnapshot: false, mayCreateBiologicalTarget: false },
  { role: "ORGANIZER", purpose: "Creates reversible placements, tags, and Luna-owned structure.", allowedToolClasses: ["KNOWLEDGE"], allowedOutputs: ["KNOWLEDGE_OBJECT", "RELATIONSHIP", "REPORT"], mayElevateScientificTruth: false, mayModifyProviderSnapshot: false, mayCreateBiologicalTarget: false },
  { role: "LINKER", purpose: "Creates typed, provenance-backed non-authoritative relationships.", allowedToolClasses: ["KNOWLEDGE"], allowedOutputs: ["CLAIM", "RELATIONSHIP", "REPORT", "ATTENTION"], mayElevateScientificTruth: false, mayModifyProviderSnapshot: false, mayCreateBiologicalTarget: false },
  { role: "DATA_ANALYST", purpose: "Performs bounded analysis on supplied data and records assumptions.", allowedToolClasses: ["DOCUMENT", "KNOWLEDGE"], allowedOutputs: ["KNOWLEDGE_OBJECT", "REPORT", "ATTENTION"], mayElevateScientificTruth: false, mayModifyProviderSnapshot: false, mayCreateBiologicalTarget: false },
  { role: "PROVENANCE_AGENT", purpose: "Records source, version, license, and retrieval provenance.", allowedToolClasses: ["PROVIDER", "DOCUMENT", "KNOWLEDGE"], allowedOutputs: ["KNOWLEDGE_OBJECT", "ATTENTION", "REPORT"], mayElevateScientificTruth: false, mayModifyProviderSnapshot: false, mayCreateBiologicalTarget: false },
  { role: "LICENSE_AGENT", purpose: "Detects absent or restrictive license information for attention.", allowedToolClasses: ["DOCUMENT", "KNOWLEDGE"], allowedOutputs: ["ATTENTION", "REPORT"], mayElevateScientificTruth: false, mayModifyProviderSnapshot: false, mayCreateBiologicalTarget: false },
  { role: "REVIEW_AGENT", purpose: "Finds open questions, contradictions, and bounded next steps.", allowedToolClasses: ["KNOWLEDGE"], allowedOutputs: ["ATTENTION", "TASK", "REPORT"], mayElevateScientificTruth: false, mayModifyProviderSnapshot: false, mayCreateBiologicalTarget: false },
  { role: "MAINTENANCE_AGENT", purpose: "Runs idempotent health, stale-record, and recovery reviews.", allowedToolClasses: ["KNOWLEDGE", "SYSTEM"], allowedOutputs: ["TASK", "ATTENTION", "REPORT"], mayElevateScientificTruth: false, mayModifyProviderSnapshot: false, mayCreateBiologicalTarget: false },
  { role: "MEMORY_AGENT", purpose: "Consolidates duplicate Luna-owned working memory reversibly.", allowedToolClasses: ["KNOWLEDGE"], allowedOutputs: ["MEMORY", "REPORT", "ATTENTION"], mayElevateScientificTruth: false, mayModifyProviderSnapshot: false, mayCreateBiologicalTarget: false },
  { role: "REFLECTION_AGENT", purpose: "Records an evidence-bounded reflection and follow-up tasks.", allowedToolClasses: ["KNOWLEDGE"], allowedOutputs: ["MEMORY", "TASK", "REPORT", "ATTENTION"], mayElevateScientificTruth: false, mayModifyProviderSnapshot: false, mayCreateBiologicalTarget: false },
  { role: "SYNTHESIS_AGENT", purpose: "Produces an explicitly classified synthesis from persisted outputs.", allowedToolClasses: ["KNOWLEDGE", "DOCUMENT"], allowedOutputs: ["KNOWLEDGE_OBJECT", "MEMORY", "REPORT", "ATTENTION"], mayElevateScientificTruth: false, mayModifyProviderSnapshot: false, mayCreateBiologicalTarget: false },
] as const;

export function isLunaScientificElevation(state: LunaTruthState): boolean {
  return state === "VALIDATED" || state === "PROVIDER_CONFIRMED" || state === "FACT" || state === "EVIDENCE";
}

export function isLunaRoutineOwnedTruth(state: LunaTruthState): boolean {
  return ["INFERENCE", "HYPOTHESIS", "ASSUMPTION", "UNKNOWN", "PROPOSED", "CONTRADICTED", "UNMAPPED", "NOT_ESTABLISHED", "UNAVAILABLE", "PROVIDER_UNAVAILABLE"].includes(state);
}

export function workerContract(role: LunaWorkerRole): LunaWorkerContract {
  const contract = LUNA_WORKER_CONTRACTS.find((item) => item.role === role);
  if (!contract) throw new Error(`No Luna worker contract is registered for ${role}.`);
  return contract;
}
