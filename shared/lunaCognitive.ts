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

export const LUNA_DECISION_STATUSES = ["RECOMMENDED", "DISPATCHED", "BLOCKED", "SUPPRESSED", "COMPLETED", "FAILED", "CANCELLED"] as const;
export type LunaDecisionStatus = (typeof LUNA_DECISION_STATUSES)[number];
export const LUNA_DECISION_OUTCOMES = ["DISPATCHED", "REQUIRES_OWNER_REVIEW", "NO_ACTION", "DUPLICATE_SUPPRESSED", "RUNTIME_UNAVAILABLE", "CANCELLED", "FAILED"] as const;
export type LunaDecisionOutcome = (typeof LUNA_DECISION_OUTCOMES)[number];
export const LUNA_RESULT_VALIDATION_STATUSES = ["ACCEPTED", "REJECTED", "NEEDS_REVIEW"] as const;
export type LunaResultValidationStatus = (typeof LUNA_RESULT_VALIDATION_STATUSES)[number];

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

/** A deterministic, persisted assessment that may create at most one bounded mission. */
export type LunaAutonomousDecision = {
  id: string;
  workspaceId: string;
  sourceType: "KNOWLEDGE_GAP" | "ATTENTION" | "MAINTENANCE";
  sourceId: string;
  decisionKey: string;
  objective: string;
  status: LunaDecisionStatus;
  outcome: LunaDecisionOutcome;
  priorityScore: number;
  policyVersion: string;
  rationale: string;
  evidence: Record<string, unknown>;
  budget: {
    maxWorkers: number;
    maxSteps: number;
    maxRetries: number;
    maxDurationSeconds: number;
    maxModelRequests: number;
    maxTokenBudget: number;
  };
  missionId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** A persisted check on a completed worker report before it is retained as learning context. */
export type LunaResultValidation = {
  id: string;
  workspaceId: string;
  missionId: string;
  workerId: string;
  reportObjectId: string | null;
  status: LunaResultValidationStatus;
  outputHash: string;
  resultSummary: string;
  checks: Record<string, boolean>;
  detail: string;
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
  decisionId: string | null;
  missionOrigin: "OWNER" | "AUTONOMOUS";
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

/** Creator-controlled Foundation fields persisted in the owner-scoped luna_cognitive_state row. */
export type LunaFoundation = {
  name: string;
  startingAge: number;
  currentAge: number;
  nativeLanguage: string;
  personalityFoundation: string;
  personalityKnowledge: string;
  appearanceReference: string;
};

/**
 * Authoritative objective self-state projection. Foundation fields are read from the persisted
 * cognitive state; capabilities, goals, memories, and actions remain authoritative in their
 * existing persisted cognitive systems and are aggregated by LunaCognitiveSnapshot.
 */
export type LunaSelfState = {
  workspaceId: string;
  foundation: LunaFoundation;
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
  cognitiveActionsEnabled: boolean;
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


// Additive pre-game cognitive architecture contracts. These types describe bounded
// computational records; they never assert consciousness or biological state.
export const LUNA_COGNITIVE_INPUT_TYPES = ["CONVERSATION", "USER_CORRECTION", "OWNER_NOTE", "WORKER_RESULT", "PROJECT_OUTCOME", "WORLD_EVENT", "MAINTENANCE"] as const;
export type LunaCognitiveInputType = (typeof LUNA_COGNITIVE_INPUT_TYPES)[number];
export const LUNA_COGNITIVE_INPUT_RELEVANCE = ["RELEVANT", "CONTEXT_ONLY", "IGNORED", "SENSITIVE_REJECTED"] as const;
export type LunaCognitiveInputRelevance = (typeof LUNA_COGNITIVE_INPUT_RELEVANCE)[number];
export const LUNA_EXPERIENCE_KINDS = ["CONVERSATION", "CORRECTION", "OBSERVATION", "WORKER_OUTCOME", "PROJECT_OUTCOME", "WORLD_EVENT", "MAINTENANCE"] as const;
export type LunaExperienceKind = (typeof LUNA_EXPERIENCE_KINDS)[number];
export const LUNA_COGNITIVE_CYCLE_TYPES = ["MANUAL", "CONVERSATION", "WORKER_COMPLETION", "WORLD_EVENT", "MAINTENANCE"] as const;
export type LunaCognitiveCycleType = (typeof LUNA_COGNITIVE_CYCLE_TYPES)[number];

export type LunaCognitiveInput = {
  id: string; workspaceId: string; sourceKey: string; inputType: LunaCognitiveInputType;
  summary: string; relevance: LunaCognitiveInputRelevance; privacyClass: "OWNER_PRIVATE" | "SYSTEM_DERIVED";
  projectId: string | null; goalId: string | null; missionId: string | null; workerId: string | null;
  provenance: LunaProvenance; createdAt: string;
};
export type LunaExperience = {
  id: string; workspaceId: string; inputId: string | null; experienceKind: LunaExperienceKind;
  summary: string; importance: number; confidence: number; projectId: string | null; goalId: string | null;
  missionId: string | null; workerId: string | null; provenance: LunaProvenance; createdAt: string;
};
export type LunaCognitiveCycle = {
  id: string; workspaceId: string; cycleKey: string; cycleType: LunaCognitiveCycleType;
  inputId: string | null; status: "COMPLETED" | "STOPPED" | "FAILED"; evaluatedCount: number;
  derivedCount: number; stopReason: string | null; createdAt: string;
};

export const LUNA_ATTENTION_ASSESSMENT_STATES = ["ACTIVE", "SUPPRESSED", "RESOLVED", "EXPIRED"] as const;
export type LunaAttentionAssessmentState = (typeof LUNA_ATTENTION_ASSESSMENT_STATES)[number];
export const LUNA_FOCUS_TIERS = ["PRIMARY", "SECONDARY", "BACKGROUND"] as const;
export type LunaFocusTier = (typeof LUNA_FOCUS_TIERS)[number];
export type LunaAttentionAssessment = {
  id: string; workspaceId: string; sourceType: string; sourceId: string; targetType: string; targetId: string;
  severity: LunaAttentionSeverity; score: number; factors: Record<string, number>; state: LunaAttentionAssessmentState;
  focusTier: LunaFocusTier | null; suppressionReason: string | null; expiresAt: string | null; createdAt: string; updatedAt: string;
};
export type LunaFocusAssignment = {
  id: string; workspaceId: string; attentionId: string; targetType: string; targetId: string;
  tier: LunaFocusTier; rank: number; score: number; cycleId: string | null; replacedAt: string | null; createdAt: string;
};

export const LUNA_UNCERTAINTY_STATUSES = ["OPEN", "REDUCED", "ACCEPTED", "RESOLVED"] as const;
export type LunaUncertaintyStatus = (typeof LUNA_UNCERTAINTY_STATUSES)[number];
export type LunaUncertaintyRecord = {
  id: string; workspaceId: string; targetType: string; targetId: string; score: number; importance: number;
  evidenceBasis: string; status: LunaUncertaintyStatus; provenance: LunaProvenance; currentVersion: number; createdAt: string; updatedAt: string;
};
export type LunaNoveltyRecord = {
  id: string; workspaceId: string; targetType: string; targetId: string; noveltyKey: string; score: number;
  rationale: string; sourceInputId: string | null; createdAt: string;
};

export const LUNA_CONTRADICTION_STATUSES = ["UNRESOLVED", "UNDER_INVESTIGATION", "RESOLVED", "ACCEPTED_A", "ACCEPTED_B", "INCONCLUSIVE"] as const;
export type LunaContradictionStatus = (typeof LUNA_CONTRADICTION_STATUSES)[number];
export type LunaContradiction = {
  id: string; workspaceId: string; anchorAType: string; anchorAId: string; anchorBType: string; anchorBId: string;
  summary: string; impact: number; status: LunaContradictionStatus; projectId: string | null; goalId: string | null;
  provenance: LunaProvenance; currentVersion: number; createdAt: string; updatedAt: string;
};

export const LUNA_GAP_CATEGORIES = ["FACTUAL", "RELATIONAL", "CAUSAL", "PROCEDURAL", "CONTEXTUAL", "TEMPORAL", "PROVENANCE", "CONTRADICTION", "PROJECT", "GOAL", "SOCIAL", "SELF_MODEL", "UNKNOWN"] as const;
export type LunaGapCategory = (typeof LUNA_GAP_CATEGORIES)[number];
export const LUNA_EXTENDED_GAP_STATUSES = ["OPEN", "WATCHING", "RESOLVED", "DISMISSED", "MERGED", "EXPIRED"] as const;
export type LunaExtendedGapStatus = (typeof LUNA_EXTENDED_GAP_STATUSES)[number];
export type LunaGapProfile = {
  gapId: string; workspaceId: string; category: LunaGapCategory; status: LunaExtendedGapStatus; confidence: number;
  canonicalGapId: string | null; normalizedKey: string; reopenedFromId: string | null; cooldownUntil: string | null;
  currentVersion: number; createdAt: string; updatedAt: string;
};
export const LUNA_CURIOSITY_EXTENDED_STATUSES = ["CANDIDATE", "INTERESTING", "QUEUED", "INVESTIGATING", "SATISFIED", "DEFERRED", "DISMISSED", "EXPIRED"] as const;
export type LunaCuriosityExtendedStatus = (typeof LUNA_CURIOSITY_EXTENDED_STATUSES)[number];
export type LunaCuriosityAssessment = {
  id: string; workspaceId: string; candidateId: string | null; gapId: string | null; triggerType: string; triggerId: string;
  expectedInformationValue: number; noveltyScore: number; importance: number; status: LunaCuriosityExtendedStatus;
  cooldownUntil: string | null; expiresAt: string | null; cycleId: string | null; rationale: string; createdAt: string; updatedAt: string;
};

export const LUNA_PREFERENCE_KINDS = ["USER", "LEARNED", "TASK", "TEMPORARY", "STABLE", "CONTEXTUAL"] as const;
export type LunaPreferenceKind = (typeof LUNA_PREFERENCE_KINDS)[number];
export type LunaPreference = {
  id: string; workspaceId: string; preferenceKind: LunaPreferenceKind; subject: string; value: string;
  context: Record<string, unknown>; confidence: number; evidenceCount: number; active: boolean;
  provenance: LunaProvenance; currentVersion: number; createdAt: string; updatedAt: string;
};
export const LUNA_INTERNAL_STATE_DIMENSIONS = ["SATISFACTION", "FRUSTRATION", "CURIOSITY", "UNCERTAINTY", "CONFIDENCE", "URGENCY", "SOCIAL_ATTACHMENT", "LOAD", "INTEREST", "CONCERN", "ANTICIPATION"] as const;
export type LunaInternalStateDimension = (typeof LUNA_INTERNAL_STATE_DIMENSIONS)[number];
export type LunaInternalStateObservation = {
  id: string; workspaceId: string; dimension: LunaInternalStateDimension; value: number; delta: number;
  reason: string; inputId: string | null; experienceId: string | null; cycleId: string | null; createdAt: string;
};
export const LUNA_SELF_MODEL_FACT_KINDS = ["OBSERVED", "INFERRED", "USER_ASSERTED"] as const;
export type LunaSelfModelFactKind = (typeof LUNA_SELF_MODEL_FACT_KINDS)[number];
export type LunaSelfModelFact = {
  id: string; workspaceId: string; factKind: LunaSelfModelFactKind; facet: string; statement: string;
  confidence: number; evidenceCount: number; status: "ACTIVE" | "WEAKENED" | "ARCHIVED";
  currentVersion: number; createdAt: string; updatedAt: string;
};

export const LUNA_GOAL_EXTENDED_STATUSES = ["PROPOSED", "ACTIVE", "PAUSED", "COMPLETED", "ABANDONED", "SUPERSEDED", "BLOCKED"] as const;
export type LunaGoalExtendedStatus = (typeof LUNA_GOAL_EXTENDED_STATUSES)[number];
export type LunaGoalProfile = {
  goalId: string; workspaceId: string; origin: "OWNER" | "LUNA" | "SYSTEM"; importance: number; motivation: string;
  deadlineAt: string | null; successCriteria: string; failureCriteria: string; status: LunaGoalExtendedStatus;
  currentVersion: number; createdAt: string; updatedAt: string;
};
export type LunaGoalDependency = { id: string; workspaceId: string; goalId: string; dependsOnGoalId: string; dependencyKind: "REQUIRES" | "BLOCKS" | "SUPPORTS"; status: "ACTIVE" | "SATISFIED" | "WAIVED"; createdAt: string; };
export type LunaCommitment = {
  id: string; workspaceId: string; projectId: string | null; goalId: string | null; relationshipId: string | null;
  title: string; detail: string; status: "PROPOSED" | "ACTIVE" | "FULFILLED" | "RELEASED" | "BREACHED" | "EXPIRED";
  dueAt: string | null; confidence: number; externalActionRequired: boolean; currentVersion: number; createdAt: string; updatedAt: string;
};
export type LunaHypothesis = {
  id: string; workspaceId: string; projectId: string | null; goalId: string | null; gapId: string | null;
  statement: string; plannedTest: string; confidence: number; status: "PROPOSED" | "TESTING" | "SUPPORTED" | "WEAKENED" | "REJECTED" | "INCONCLUSIVE";
  currentVersion: number; createdAt: string; updatedAt: string;
};
export type LunaReasoningArtifact = {
  id: string; workspaceId: string; cycleId: string | null; subjectType: string; subjectId: string;
  conclusion: string; confidence: number; uncertaintySummary: string; options: Array<{ label: string; summary: string; }>;
  recommendation: string; evidenceIds: string[]; createdAt: string;
};
export type LunaPlanRevision = {
  id: string; workspaceId: string; goalId: string | null; missionId: string | null; revisionKind: "CREATED" | "REVISED" | "DEFERRED" | "SUPERSEDED";
  summary: string; reason: string; alternatives: string[]; createdAt: string;
};
export type LunaLearningRecord = {
  id: string; workspaceId: string; learningKind: "CORRECTION" | "OUTCOME" | "STRATEGY" | "PATTERN";
  sourceInputId: string | null; experienceId: string | null; validationId: string | null; targetType: string; targetId: string;
  summary: string; confidenceDelta: number; provenance: LunaProvenance; createdAt: string;
};
export type LunaWorkerPerformanceSnapshot = {
  id: string; workspaceId: string; workerRole: LunaWorkerRole; workerId: string | null; missionId: string | null;
  outcome: "ACCEPTED" | "NEEDS_REVIEW" | "REJECTED" | "FAILED"; durationMs: number | null; strategy: string; createdAt: string;
};

export type LunaRelationship = {
  id: string; workspaceId: string; agentIdentity: string; participantIdentity: string; familiarity: number; trust: number;
  affinity: number; conflict: number; cooperation: number; expectations: string; uncertainty: number;
  status: "ACTIVE" | "DORMANT" | "ARCHIVED"; currentVersion: number; createdAt: string; updatedAt: string;
};
export type LunaSocialInteraction = {
  id: string; workspaceId: string; relationshipId: string; inputId: string | null; experienceId: string | null;
  interactionKind: "CONVERSATION" | "COOPERATION" | "CONFLICT" | "COMMITMENT" | "OBSERVATION";
  summary: string; impact: number; provenance: LunaProvenance; createdAt: string;
};
export type LunaWorldEvent = {
  id: string; workspaceId: string; sourceKey: string; eventType: string; subjectIdentity: string | null;
  objectIdentity: string | null; locationRef: string | null; occurredAt: string | null; summary: string;
  constraints: Record<string, unknown>; consequences: Record<string, unknown>; inputId: string | null; createdAt: string;
};
export type LunaMaintenanceReport = {
  id: string; workspaceId: string; cycleId: string | null; scope: string; evaluatedCount: number; updatedCount: number;
  issueCount: number; status: "COMPLETED" | "STOPPED" | "FAILED"; stopReason: string | null; summary: string; createdAt: string;
};

export type LunaPreGameCognitiveSnapshot = {
  inputs: LunaCognitiveInput[]; experiences: LunaExperience[]; cycles: LunaCognitiveCycle[];
  attentionAssessments: LunaAttentionAssessment[]; focusAssignments: LunaFocusAssignment[];
  uncertaintyRecords: LunaUncertaintyRecord[]; noveltyRecords: LunaNoveltyRecord[]; contradictions: LunaContradiction[];
  gapProfiles: LunaGapProfile[]; curiosityAssessments: LunaCuriosityAssessment[]; preferences: LunaPreference[];
  internalState: LunaInternalStateObservation[]; selfModelFacts: LunaSelfModelFact[]; goalProfiles: LunaGoalProfile[];
  goalDependencies: LunaGoalDependency[]; commitments: LunaCommitment[]; hypotheses: LunaHypothesis[];
  reasoningArtifacts: LunaReasoningArtifact[]; planRevisions: LunaPlanRevision[]; learningRecords: LunaLearningRecord[];
  workerPerformance: LunaWorkerPerformanceSnapshot[]; relationships: LunaRelationship[]; socialInteractions: LunaSocialInteraction[];
  worldEvents: LunaWorldEvent[]; maintenanceReports: LunaMaintenanceReport[];
};

export type LunaWorldEventInput = {
  sourceKey: string; eventType: string; summary: string; subjectIdentity?: string | null; objectIdentity?: string | null;
  locationRef?: string | null; occurredAt?: string | null; constraints?: Record<string, unknown>; consequences?: Record<string, unknown>;
};

export type LunaCognitiveAssessment = {
  relevance: LunaCognitiveInputRelevance; summary: string; importance: number; confidence: number;
  detectedCorrection: boolean; detectedGoal: boolean; detectedCommitment: boolean; detectedQuestion: boolean;
  noveltyScore: number; uncertaintyScore: number; attentionScore: number; recommendedGapCategory: LunaGapCategory | null;
  reasoning: { conclusion: string; uncertaintySummary: string; recommendation: string; options: Array<{ label: string; summary: string; }> };
};
