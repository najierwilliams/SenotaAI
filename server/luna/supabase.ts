import type {
  LunaAttentionItem,
  LunaAutonomousDecision,
  LunaClaim,
  LunaClaimEvidence,
  LunaClaimEvidenceRole,
  LunaClaimLifecycleState,
  LunaClaimRevision,
  LunaCognitiveState,
  LunaCuriosityCandidate,
  LunaCuriosityStatus,
  LunaDecisionOutcome,
  LunaDecisionStatus,
  LunaKnowledgeGap,
  LunaKnowledgeGapRevision,
  LunaKnowledgeGapStatus,
  LunaPriorityAssessment,
  LunaPriorityTargetType,
  LunaGoal,
  LunaGoalStatus,
  LunaMemory,
  LunaMemoryKind,
  LunaMission,
  LunaMissionStatus,
  LunaProject,
  LunaProjectStatus,
  LunaResultValidation,
  LunaResultValidationStatus,
  LunaRuntimeStatus,
  LunaSelfState,
  LunaTask,
  LunaTaskStatus,
  LunaToolCall,
  LunaTruthState,
  LunaWorker,
  LunaWorkerRole,
  LunaWorkerState,
  LunaAttentionAssessment,
  LunaCognitiveCycle,
  LunaCognitiveInput,
  LunaCommitment,
  LunaContradiction,
  LunaCuriosityAssessment,
  LunaExperience,
  LunaFocusAssignment,
  LunaGapProfile,
  LunaGoalDependency,
  LunaGoalProfile,
  LunaHypothesis,
  LunaInternalStateObservation,
  LunaLearningRecord,
  LunaMaintenanceReport,
  LunaNoveltyRecord,
  LunaPlanRevision,
  LunaPreference,
  LunaPreGameCognitiveSnapshot,
  LunaReasoningArtifact,
  LunaRelationship,
  LunaSelfModelFact,
  LunaSocialInteraction,
  LunaUncertaintyRecord,
  LunaWorkerPerformanceSnapshot,
  LunaWorldEvent,
} from "@shared/lunaCognitive";
import { isLunaRoutineOwnedTruth, isLunaScientificElevation, workerContract } from "@shared/lunaCognitive";
import { getOrCreateKnowledgeWorkspace } from "../knowledgeSpace/supabase";
import { explainLunaPriority } from "./milestone3";
import { allocateLunaFocus } from "./preGameCognitive";
import type { SelfModificationFile, SelfModificationRun, SelfModificationTest } from "./selfModification";

const OWNER_PREFIX = "senota-user-";
const MAX_LIST = 200;

export type LunaReflection = {
  id: string;
  workspaceId: string;
  missionId: string | null;
  projectId: string | null;
  summary: string;
  newEvidenceCount: number;
  newInferenceCount: number;
  newMemoryCount: number;
  relationshipCount: number;
  contradictionCount: number;
  unresolvedCount: number;
  confidence: "LOW" | "MODERATE" | "HIGH" | "UNKNOWN";
  nextAction: string | null;
  truthState: LunaTruthState;
  createdAt: string;
};

export type LunaRecoveryRecord = {
  id: string;
  workspaceId: string;
  missionId: string;
  workerId: string | null;
  reason: string;
  status: "REQUIRED" | "RESUMED" | "ABANDONED" | "RESOLVED";
  resumePayload: Record<string, unknown>;
  createdAt: string;
  resolvedAt: string | null;
};

export type LunaCognitiveAuditEvent = {
  id: string;
  workspaceId: string;
  missionId: string | null;
  workerId: string | null;
  actorScope: string;
  action: string;
  subjectType: string;
  subjectId: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type LunaCognitiveSnapshot = {
  state: LunaCognitiveState;
  memories: LunaMemory[];
  claims: LunaClaim[];
  claimEvidence: LunaClaimEvidence[];
  claimRevisions: LunaClaimRevision[];
  knowledgeGaps: LunaKnowledgeGap[];
  knowledgeGapRevisions: LunaKnowledgeGapRevision[];
  curiosityCandidates: LunaCuriosityCandidate[];
  priorityAssessments: LunaPriorityAssessment[];
  decisions: LunaAutonomousDecision[];
  resultValidations: LunaResultValidation[];
  projects: LunaProject[];
  goals: LunaGoal[];
  tasks: LunaTask[];
  missions: LunaMission[];
  workers: LunaWorker[];
  attention: LunaAttentionItem[];
  reflections: LunaReflection[];
  recoveries: LunaRecoveryRecord[];
  activity: LunaCognitiveAuditEvent[];
};

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

export function isLunaCognitiveCloudReady() {
  return Boolean(config());
}

function requireConfig() {
  const current = config();
  if (!current) throw new Error("Luna cognitive persistence is unavailable because the server-only Supabase configuration is not present.");
  return current;
}

function scopeFor(userId: number) {
  if (!Number.isInteger(userId) || userId < 1) throw new Error("A verified Knowledge Space owner scope is required.");
  return `${OWNER_PREFIX}${userId}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: unknown) {
  return value === true || value === "true" || value === 1;
}

function requiredText(value: unknown, label: string, minimum = 1, maximum = 16_000) {
  const next = String(value ?? "").replace(/\s+/g, " ").trim();
  if (next.length < minimum || next.length > maximum) throw new Error(`${label} must contain ${minimum} to ${maximum} characters.`);
  return next;
}

function boundedInt(value: unknown, minimum: number, maximum: number, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new Error(`${label} must be an integer from ${minimum} to ${maximum}.`);
  return parsed;
}

function boundedTruth(value: LunaTruthState) {
  if (!isLunaRoutineOwnedTruth(value)) {
    throw new Error("Luna-owned cognitive updates cannot create or promote validated, provider-confirmed, factual, or evidentiary scientific truth.");
  }
  return value;
}

function definedValues(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

async function request<T = Record<string, unknown>[]>(path: string, init: RequestInit = {}): Promise<T> {
  const current = requireConfig();
  const response = await fetch(`${current.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: current.key,
      Authorization: `Bearer ${current.key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Luna cognitive storage request failed (${response.status})${detail ? `: ${detail.slice(0, 400)}` : ""}`);
  }
  if (response.status === 204) return null as T;
  const body = await response.text();
  return (body ? JSON.parse(body) : null) as T;
}

async function insert(table: string, values: Record<string, unknown>) {
  const cleanValues = definedValues(values);
  const rows = await request<Record<string, unknown>[]>(table, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(cleanValues),
  });
  if (!rows?.[0]) throw new Error(`Luna cognitive storage could not create ${table}.`);
  return rows[0];
}

async function patch(table: string, params: URLSearchParams, values: Record<string, unknown>) {
  const cleanValues = definedValues(values);
  if (!Object.keys(cleanValues).length) throw new Error("Luna cognitive updates require at least one persisted change.");
  const rows = await request<Record<string, unknown>[]>(`${table}?${params.toString()}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(cleanValues),
  });
  if (!rows?.[0]) throw new Error(`Luna cognitive record was not found in this owner workspace.`);
  return rows[0];
}

async function rows(table: string, params: URLSearchParams) {
  return request<Record<string, unknown>[]>(`${table}?${params.toString()}`);
}

function scopedParams(workspaceId: string, select = "*", extra: Record<string, string> = {}) {
  return new URLSearchParams({ select, workspace_id: `eq.${workspaceId}`, ...extra });
}

function mapSelf(row: Record<string, unknown>): LunaSelfState {
  return {
    workspaceId: String(row.workspace_id),
    foundation: {
      name: String(row.luna_name ?? "Luna"),
      currentAge: asNumber(row.luna_current_age, 0),
      nativeLanguage: String(row.luna_native_language ?? "English"),
      personalityFoundation: String(row.luna_personality_foundation ?? ""),
      personalityKnowledge: String(row.luna_personality_knowledge ?? ""),
      appearanceReference: String(row.luna_appearance_reference ?? ""),
    },
    identitySummary: String(row.identity_summary),
    capabilities: asStringArray(row.capabilities),
    limitations: asStringArray(row.limitations),
    currentFocus: asString(row.current_focus),
    activeGoalIds: asStringArray(row.active_goal_ids),
    uncertaintySummary: String(row.uncertainty_summary),
    currentVersion: asNumber(row.current_version, 1),
    updatedAt: String(row.updated_at),
  };
}

function mapMemory(row: Record<string, unknown>): LunaMemory {
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), memoryKind: row.memory_kind as LunaMemoryKind,
    content: String(row.content), importance: asNumber(row.importance, 3), truthState: row.truth_state as LunaTruthState,
    sourceType: row.source_type as LunaMemory["sourceType"], sourceObjectIds: asStringArray(row.source_object_ids),
    projectId: asString(row.project_id), missionId: asString(row.mission_id), tags: asStringArray(row.tags),
    provenance: asRecord(row.provenance), active: asBoolean(row.is_active), currentVersion: asNumber(row.current_version, 1),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function mapClaim(row: Record<string, unknown>): LunaClaim {
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), projectId: asString(row.project_id), missionId: asString(row.mission_id),
    subject: String(row.subject), predicate: String(row.predicate), objectText: String(row.object_text), statement: String(row.statement),
    truthState: row.truth_state as LunaTruthState, confidence: asNumber(row.confidence, 0.5), lifecycleState: row.lifecycle_state as LunaClaimLifecycleState,
    provenance: asRecord(row.provenance), assumptions: asStringArray(row.assumptions), currentVersion: asNumber(row.current_version, 1),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function mapClaimEvidence(row: Record<string, unknown>): LunaClaimEvidence {
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), claimId: String(row.claim_id), sourceMemoryId: asString(row.source_memory_id),
    sourceObjectId: asString(row.source_object_id), sourceRelationshipId: asString(row.source_relationship_id), evidenceRole: row.evidence_role as LunaClaimEvidenceRole,
    sourceExcerpt: String(row.source_excerpt ?? ""), confidence: row.confidence === null ? null : asNumber(row.confidence), provenance: asRecord(row.provenance), createdAt: String(row.created_at),
  };
}

function mapClaimRevision(row: Record<string, unknown>): LunaClaimRevision {
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), claimId: String(row.claim_id), priorClaimId: asString(row.prior_claim_id),
    revisionKind: row.revision_kind as LunaClaimRevision["revisionKind"], reason: String(row.reason), actorScope: String(row.actor_scope), snapshot: asRecord(row.snapshot), createdAt: String(row.created_at),
  };
}

function mapKnowledgeGap(row: Record<string, unknown>): LunaKnowledgeGap {
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), projectId: asString(row.project_id), claimId: asString(row.claim_id), relatedObjectId: asString(row.related_object_id),
    title: String(row.title), question: String(row.question), requestedEvidence: String(row.requested_evidence ?? ""), rationale: String(row.rationale ?? ""),
    severity: row.severity as LunaKnowledgeGap["severity"], status: row.status as LunaKnowledgeGapStatus, sourceType: row.source_type as LunaKnowledgeGap["sourceType"],
    provenance: asRecord(row.provenance), currentVersion: asNumber(row.current_version, 1), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function mapKnowledgeGapRevision(row: Record<string, unknown>): LunaKnowledgeGapRevision {
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), gapId: String(row.gap_id), revisionKind: row.revision_kind as LunaKnowledgeGapRevision["revisionKind"],
    reason: String(row.reason), actorScope: String(row.actor_scope), snapshot: asRecord(row.snapshot), createdAt: String(row.created_at),
  };
}

function mapCuriosityCandidate(row: Record<string, unknown>): LunaCuriosityCandidate {
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), gapId: String(row.gap_id), proposedAction: String(row.proposed_action), rationale: String(row.rationale ?? ""),
    estimatedCost: row.estimated_cost as LunaCuriosityCandidate["estimatedCost"], status: row.status as LunaCuriosityStatus, createdBy: row.created_by as LunaCuriosityCandidate["createdBy"], createdAt: String(row.created_at),
  };
}

function mapPriorityAssessment(row: Record<string, unknown>): LunaPriorityAssessment {
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), targetType: row.target_type as LunaPriorityTargetType,
    targetId: String(row.target_id), urgencyScore: asNumber(row.urgency_score), impactScore: asNumber(row.impact_score),
    evidenceScore: asNumber(row.evidence_score), unblockScore: asNumber(row.unblock_score), riskScore: asNumber(row.risk_score),
    priorityScore: asNumber(row.priority_score), explanation: String(row.explanation), assumptions: asStringArray(row.assumptions),
    actorScope: String(row.actor_scope), createdAt: String(row.created_at),
  };
}

function mapDecision(row: Record<string, unknown>): LunaAutonomousDecision {
  const budget = asRecord(row.budget);
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), sourceType: row.source_type as LunaAutonomousDecision["sourceType"],
    sourceId: String(row.source_id), decisionKey: String(row.decision_key), objective: String(row.objective),
    status: row.status as LunaDecisionStatus, outcome: row.outcome as LunaDecisionOutcome, priorityScore: asNumber(row.priority_score),
    policyVersion: String(row.policy_version), rationale: String(row.rationale), evidence: asRecord(row.evidence),
    budget: {
      maxWorkers: asNumber(budget.maxWorkers, 4), maxSteps: asNumber(budget.maxSteps, 24), maxRetries: asNumber(budget.maxRetries, 2),
      maxDurationSeconds: asNumber(budget.maxDurationSeconds, 900), maxModelRequests: asNumber(budget.maxModelRequests, 12), maxTokenBudget: asNumber(budget.maxTokenBudget, 24_000),
    },
    missionId: asString(row.mission_id), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function mapResultValidation(row: Record<string, unknown>): LunaResultValidation {
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), missionId: String(row.mission_id), workerId: String(row.worker_id),
    reportObjectId: asString(row.report_object_id), status: row.status as LunaResultValidationStatus, outputHash: String(row.output_hash),
    resultSummary: String(row.result_summary), checks: Object.fromEntries(Object.entries(asRecord(row.checks)).filter(([, value]) => typeof value === "boolean")) as Record<string, boolean>,
    detail: String(row.detail), createdAt: String(row.created_at),
  };
}

function mapProject(row: Record<string, unknown>): LunaProject {
  return { id: String(row.id), workspaceId: String(row.workspace_id), title: String(row.title), summary: String(row.summary ?? ""), status: row.status as LunaProjectStatus, priority: asNumber(row.priority, 3), focusObjectId: asString(row.focus_object_id), createdBy: row.created_by as LunaProject["createdBy"], currentVersion: asNumber(row.current_version, 1), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}

function mapGoal(row: Record<string, unknown>): LunaGoal {
  return { id: String(row.id), workspaceId: String(row.workspace_id), projectId: asString(row.project_id), parentGoalId: asString(row.parent_goal_id), title: String(row.title), rationale: String(row.rationale ?? ""), status: row.status as LunaGoalStatus, priority: asNumber(row.priority, 3), progress: asNumber(row.progress), truthState: row.truth_state as LunaTruthState, currentVersion: asNumber(row.current_version, 1), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}

function mapTask(row: Record<string, unknown>, dependencyTaskIds: string[] = []): LunaTask {
  return { id: String(row.id), workspaceId: String(row.workspace_id), projectId: asString(row.project_id), goalId: asString(row.goal_id), missionId: asString(row.mission_id), title: String(row.title), details: String(row.details ?? ""), status: row.status as LunaTaskStatus, priority: asNumber(row.priority, 3), workerRole: row.worker_role ? row.worker_role as LunaWorkerRole : null, dependencyTaskIds, relatedObjectIds: asStringArray(row.related_object_ids), retriesUsed: asNumber(row.retries_used), maxRetries: asNumber(row.max_retries, 2), scheduledFor: asString(row.scheduled_for), startedAt: asString(row.started_at), completedAt: asString(row.completed_at), errorMessage: asString(row.error_message), currentVersion: asNumber(row.current_version, 1), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}

function mapMission(row: Record<string, unknown>): LunaMission {
  return { id: String(row.id), workspaceId: String(row.workspace_id), projectId: asString(row.project_id), goalId: asString(row.goal_id), decisionId: asString(row.decision_id), missionOrigin: (row.mission_origin === "AUTONOMOUS" ? "AUTONOMOUS" : "OWNER"), objective: String(row.objective), status: row.status as LunaMissionStatus, autonomyMode: row.autonomy_mode as LunaMission["autonomyMode"], priority: asNumber(row.priority, 3), currentFocus: asString(row.current_focus), rootTaskId: asString(row.root_task_id), maxWorkers: asNumber(row.max_workers, 4), maxSteps: asNumber(row.max_steps, 24), maxRetries: asNumber(row.max_retries, 2), maxDurationSeconds: asNumber(row.max_duration_seconds, 900), maxModelRequests: asNumber(row.max_model_requests, 12), maxTokenBudget: asNumber(row.max_token_budget, 24_000), modelRequestsUsed: asNumber(row.model_requests_used), tokenUsage: asNumber(row.token_usage), pauseRequested: asBoolean(row.pause_requested), cancelRequested: asBoolean(row.cancel_requested), runtimeRunId: asString(row.runtime_run_id), resumeAfter: asString(row.resume_after), startedAt: asString(row.started_at), finishedAt: asString(row.finished_at), errorMessage: asString(row.error_message), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}

function mapWorker(row: Record<string, unknown>): LunaWorker {
  return { id: String(row.id), workspaceId: String(row.workspace_id), missionId: String(row.mission_id), taskId: asString(row.task_id), role: row.role as LunaWorkerRole, state: row.state as LunaWorkerState, attempt: asNumber(row.attempt, 1), inputSummary: String(row.input_summary ?? ""), outputSummary: asString(row.output_summary), handoffToRole: row.handoff_to_role ? row.handoff_to_role as LunaWorkerRole : null, startedAt: asString(row.started_at), finishedAt: asString(row.finished_at), errorMessage: asString(row.error_message), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}

function mapAttention(row: Record<string, unknown>): LunaAttentionItem {
  return { id: String(row.id), workspaceId: String(row.workspace_id), projectId: asString(row.project_id), missionId: asString(row.mission_id), severity: row.severity as LunaAttentionItem["severity"], category: row.category as LunaAttentionItem["category"], title: String(row.title), detail: String(row.detail ?? ""), state: row.state as LunaAttentionItem["state"], createdAt: String(row.created_at), resolvedAt: asString(row.resolved_at) };
}

function mapReflection(row: Record<string, unknown>): LunaReflection {
  return { id: String(row.id), workspaceId: String(row.workspace_id), missionId: asString(row.mission_id), projectId: asString(row.project_id), summary: String(row.summary), newEvidenceCount: asNumber(row.new_evidence_count), newInferenceCount: asNumber(row.new_inference_count), newMemoryCount: asNumber(row.new_memory_count), relationshipCount: asNumber(row.relationship_count), contradictionCount: asNumber(row.contradiction_count), unresolvedCount: asNumber(row.unresolved_count), confidence: row.confidence as LunaReflection["confidence"], nextAction: asString(row.next_action), truthState: row.truth_state as LunaTruthState, createdAt: String(row.created_at) };
}

function mapRecovery(row: Record<string, unknown>): LunaRecoveryRecord {
  return { id: String(row.id), workspaceId: String(row.workspace_id), missionId: String(row.mission_id), workerId: asString(row.worker_id), reason: String(row.reason), status: row.status as LunaRecoveryRecord["status"], resumePayload: asRecord(row.resume_payload), createdAt: String(row.created_at), resolvedAt: asString(row.resolved_at) };
}

function mapAudit(row: Record<string, unknown>): LunaCognitiveAuditEvent {
  return { id: String(row.id), workspaceId: String(row.workspace_id), missionId: asString(row.mission_id), workerId: asString(row.worker_id), actorScope: String(row.actor_scope), action: String(row.action), subjectType: String(row.subject_type), subjectId: asString(row.subject_id), detail: asRecord(row.detail), createdAt: String(row.created_at) };
}

async function cognitiveAudit(input: { workspaceId: string; actor: string; action: string; subjectType: string; subjectId?: string | null; missionId?: string | null; workerId?: string | null; detail?: Record<string, unknown> }) {
  await insert("luna_cognitive_audit_events", {
    workspace_id: input.workspaceId, mission_id: input.missionId ?? null, worker_id: input.workerId ?? null,
    actor_scope: input.actor, action: input.action, subject_type: input.subjectType, subject_id: input.subjectId ?? null, detail: input.detail ?? {},
  });
}

type LunaCognitiveVersionInput = { workspaceId: string; subjectType: string; subjectId: string | null; version: number; action: string; actor: string; reason: string; snapshot: Record<string, unknown>; missionId?: string | null };

function isUniqueCognitiveVersionConflict(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  return detail.includes("23505") && detail.includes("luna_cognitive_versions");
}

/**
 * Preserves immutable audit/version entries when independent Queue callbacks update the
 * same mission concurrently. A unique-conflict retry allocates a new monotonic version;
 * it never overwrites the already persisted concurrent version.
 */
export async function persistLunaCognitiveVersion(input: LunaCognitiveVersionInput, dependencies: {
  insertVersion?: (values: Record<string, unknown>) => Promise<unknown>;
  nextVersion?: (workspaceId: string, subjectType: string, subjectId: string) => Promise<number>;
} = {}) {
  const insertVersion = dependencies.insertVersion ?? ((values: Record<string, unknown>) => insert("luna_cognitive_versions", values));
  const nextVersion = dependencies.nextVersion ?? nextCognitiveVersion;
  let version = input.version;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await insertVersion({
        workspace_id: input.workspaceId, subject_type: input.subjectType, subject_id: input.subjectId, version,
        action: input.action, changed_by: input.actor, reason: input.reason, snapshot: input.snapshot, mission_id: input.missionId ?? null,
      });
      return version;
    } catch (error) {
      if (!input.subjectId || !isUniqueCognitiveVersionConflict(error) || attempt === 5) throw error;
      version = await nextVersion(input.workspaceId, input.subjectType, input.subjectId);
    }
  }
  throw new Error("Luna cognitive version allocation exhausted unexpectedly.");
}

async function cognitiveVersion(input: LunaCognitiveVersionInput) {
  await persistLunaCognitiveVersion(input);
}

async function workspaceFor(userId: number) {
  const workspace = await getOrCreateKnowledgeWorkspace(userId);
  const expectedScope = scopeFor(userId);
  if (workspace.ownerScope !== expectedScope) throw new Error("Knowledge workspace ownership scope is inconsistent.");
  return workspace;
}

async function nextCognitiveVersion(workspaceId: string, subjectType: string, subjectId: string): Promise<number> {
  const versionRows = await rows("luna_cognitive_versions", scopedParams(workspaceId, "version", {
    subject_type: `eq.${subjectType}`,
    subject_id: `eq.${subjectId}`,
    order: "version.desc",
    limit: "1",
  }));
  const latest = versionRows[0] ? asNumber(versionRows[0].version, 0) : 0;
  return latest + 1;
}

async function assertWorkerToolPermission(input: { workspaceId: string; missionId: string; workerId: string; toolClass: LunaToolCall["toolClass"] }): Promise<LunaWorker> {
  const workerRows = await rows("luna_workers", scopedParams(input.workspaceId, "*", {
    id: `eq.${input.workerId}`,
    mission_id: `eq.${input.missionId}`,
    limit: "1",
  }));
  if (!workerRows[0]) throw new Error("A controlled Luna tool call requires a persisted worker in the same mission and owner workspace.");
  const worker = mapWorker(workerRows[0]);
  if (!workerContract(worker.role).allowedToolClasses.includes(input.toolClass)) {
    throw new Error(`${worker.role} is not permitted to invoke ${input.toolClass} tools.`);
  }
  return worker;
}

export async function getOrCreateLunaSelfState(userId: number): Promise<{ self: LunaSelfState; autonomyEnabled: boolean; maintenanceEnabled: boolean; cognitiveActionsEnabled: boolean }> {
  const workspace = await workspaceFor(userId);
  const params = scopedParams(workspace.id, "*", { limit: "1" });
  const existing = await rows("luna_cognitive_state", params);
  let row = existing[0];
  let initialized = false;
  if (!row) {
    try {
      row = await insert("luna_cognitive_state", {
        workspace_id: workspace.id, owner_scope: workspace.ownerScope,
        luna_name: "Luna",
        luna_current_age: 0,
        luna_native_language: "English",
        luna_personality_foundation: "Curious, reflective, kind, and committed to learning within her safety boundaries.",
        luna_personality_knowledge: "Luna begins with creator-provided foundation knowledge and develops her personality over time.",
        luna_appearance_reference: "Creator-controlled appearance reference not yet defined.",
        capabilities: ["Persistent Knowledge Space", "Evidence-bounded planning", "Audited software-worker coordination"],
        limitations: ["Does not fabricate scientific evidence, provider records, coordinates, MNI registration, or Julich correspondence.", "Does not perform physical, clinical, cellular, molecular, or biological operations.", "Long-running background execution requires a configured durable runtime."],
      });
      initialized = true;
    } catch (error) {
      const raced = await rows("luna_cognitive_state", params);
      if (!raced[0]) throw error;
      row = raced[0];
    }
  }
  if (initialized && row) {
    await cognitiveVersion({ workspaceId: workspace.id, subjectType: "STATE", subjectId: workspace.id, version: 1, action: "CREATED", actor: "luna:system", reason: "Cognitive state initialized.", snapshot: asRecord(row) });
    await cognitiveAudit({ workspaceId: workspace.id, actor: "luna:system", action: "COGNITIVE_STATE_CREATED", subjectType: "STATE", subjectId: workspace.id, detail: { ownerScope: workspace.ownerScope } });
  }
  if (!row) throw new Error("Luna cognitive state could not be loaded after initialization.");
  return { self: mapSelf(row), autonomyEnabled: asBoolean(row.autonomy_enabled), maintenanceEnabled: asBoolean(row.maintenance_enabled), cognitiveActionsEnabled: asBoolean(row.cognitive_actions_enabled) };
}

export async function updateLunaSelfState(input: { userId: number; currentFocus?: string | null; autonomyEnabled?: boolean; maintenanceEnabled?: boolean; cognitiveActionsEnabled?: boolean; identitySummary?: string; capabilities?: string[]; limitations?: string[]; uncertaintySummary?: string; foundation?: Partial<LunaSelfState["foundation"]>; reason: string; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const current = await getOrCreateLunaSelfState(input.userId);
  const patchValues: Record<string, unknown> = { current_version: current.self.currentVersion + 1 };
  if (input.currentFocus !== undefined) patchValues.current_focus = input.currentFocus;
  if (input.autonomyEnabled !== undefined) patchValues.autonomy_enabled = input.autonomyEnabled;
  if (input.maintenanceEnabled !== undefined) patchValues.maintenance_enabled = input.maintenanceEnabled;
  if (input.cognitiveActionsEnabled !== undefined) patchValues.cognitive_actions_enabled = input.cognitiveActionsEnabled;
  if (input.identitySummary !== undefined) patchValues.identity_summary = requiredText(input.identitySummary, "Identity summary", 4, 4_000);
  if (input.capabilities !== undefined) patchValues.capabilities = input.capabilities.map(item => requiredText(item, "Capability", 1, 400)).slice(0, 30);
  if (input.limitations !== undefined) patchValues.limitations = input.limitations.map(item => requiredText(item, "Limitation", 1, 400)).slice(0, 30);
  if (input.uncertaintySummary !== undefined) patchValues.uncertainty_summary = requiredText(input.uncertaintySummary, "Uncertainty summary", 4, 4_000);
  if (input.foundation?.name !== undefined) patchValues.luna_name = requiredText(input.foundation.name, "Luna name", 1, 128);
  if (input.foundation?.currentAge !== undefined) patchValues.luna_current_age = boundedInt(input.foundation.currentAge, 0, 150, "Luna current age");
  if (input.foundation?.nativeLanguage !== undefined) patchValues.luna_native_language = requiredText(input.foundation.nativeLanguage, "Native language", 1, 64);
  if (input.foundation?.personalityFoundation !== undefined) patchValues.luna_personality_foundation = requiredText(input.foundation.personalityFoundation, "Personality foundation", 12, 8_000);
  if (input.foundation?.personalityKnowledge !== undefined) patchValues.luna_personality_knowledge = requiredText(input.foundation.personalityKnowledge, "Personality foundation knowledge", 12, 8_000);
  if (input.foundation?.appearanceReference !== undefined) patchValues.luna_appearance_reference = requiredText(input.foundation.appearanceReference, "Appearance reference", 1, 2_000);
  const result = await patch("luna_cognitive_state", scopedParams(workspace.id, "*", { limit: "1" }), patchValues);
  const actor = input.actor ?? workspace.ownerScope;
  await cognitiveVersion({ workspaceId: workspace.id, subjectType: "STATE", subjectId: workspace.id, version: asNumber(result.current_version, 2), action: "UPDATED", actor, reason: requiredText(input.reason, "State change reason", 3, 1_000), snapshot: asRecord(result) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "COGNITIVE_STATE_UPDATED", subjectType: "STATE", subjectId: workspace.id, detail: { before: current, after: mapSelf(result) } });
  return { self: mapSelf(result), autonomyEnabled: asBoolean(result.autonomy_enabled), maintenanceEnabled: asBoolean(result.maintenance_enabled), cognitiveActionsEnabled: asBoolean(result.cognitive_actions_enabled) };
}

export async function createLunaMemory(input: { userId: number; memoryKind: LunaMemoryKind; content: string; importance?: number; truthState?: LunaTruthState; sourceType: LunaMemory["sourceType"]; sourceObjectIds?: string[]; projectId?: string | null; missionId?: string | null; tags?: string[]; provenance?: Record<string, unknown>; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const truthState = boundedTruth(input.truthState ?? "INFERENCE");
  const row = await insert("luna_memories", {
    workspace_id: workspace.id, owner_scope: workspace.ownerScope, memory_kind: input.memoryKind,
    content: requiredText(input.content, "Memory content", 1, 16_000), importance: boundedInt(input.importance ?? 3, 1, 5, "Memory importance"),
    truth_state: truthState, source_type: input.sourceType, source_object_ids: input.sourceObjectIds ?? [], project_id: input.projectId ?? null,
    mission_id: input.missionId ?? null, tags: input.tags ?? [], provenance: input.provenance ?? {}, current_version: 1,
  });
  const memory = mapMemory(row); const actor = input.actor ?? workspace.ownerScope;
  await cognitiveVersion({ workspaceId: workspace.id, subjectType: "MEMORY", subjectId: memory.id, version: 1, action: "CREATED", actor, reason: "Memory created.", snapshot: asRecord(row), missionId: input.missionId });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "MEMORY_CREATED", subjectType: "MEMORY", subjectId: memory.id, missionId: input.missionId, detail: { memoryKind: memory.memoryKind, truthState: memory.truthState } });
  return memory;
}

export async function listLunaMemories(userId: number, limit = 100) {
  const workspace = await workspaceFor(userId);
  const params = scopedParams(workspace.id, "*", { is_active: "eq.true", order: "importance.desc,updated_at.desc", limit: String(Math.min(Math.max(1, limit), MAX_LIST)) });
  return (await rows("luna_memories", params)).map(mapMemory);
}

export async function listLunaClaims(userId: number, limit = MAX_LIST) {
  const workspace = await workspaceFor(userId);
  return (await rows("luna_claims", scopedParams(workspace.id, "*", { order: "lifecycle_state.asc,confidence.desc,updated_at.desc", limit: String(Math.min(Math.max(1, limit), MAX_LIST)) }))).map(mapClaim);
}

export async function listLunaClaimEvidence(userId: number, limit = 1_000) {
  const workspace = await workspaceFor(userId);
  return (await rows("luna_claim_evidence", scopedParams(workspace.id, "*", { order: "created_at.desc", limit: String(Math.min(Math.max(1, limit), 1_000)) }))).map(mapClaimEvidence);
}

export async function listLunaClaimRevisions(userId: number, limit = 1_000) {
  const workspace = await workspaceFor(userId);
  return (await rows("luna_claim_revisions", scopedParams(workspace.id, "*", { order: "created_at.desc", limit: String(Math.min(Math.max(1, limit), 1_000)) }))).map(mapClaimRevision);
}

async function assertClaimAnchorOwnership(input: { workspaceId: string; sourceMemoryId?: string | null; sourceObjectId?: string | null; sourceRelationshipId?: string | null }) {
  const sources = [
    { table: "luna_memories", id: input.sourceMemoryId },
    { table: "luna_knowledge_objects", id: input.sourceObjectId },
    { table: "luna_knowledge_relationships", id: input.sourceRelationshipId },
  ].filter((source): source is { table: string; id: string } => Boolean(source.id));
  if (sources.length !== 1) throw new Error("Claim evidence must reference exactly one persisted memory, Knowledge Space object, or relationship.");
  const source = sources[0];
  const owned = await rows(source.table, scopedParams(input.workspaceId, "id", { id: `eq.${source.id}`, limit: "1" }));
  if (!owned[0]) throw new Error("Claim evidence source is unavailable in this owner workspace.");
}

async function createLunaClaimRevisionRecord(input: { workspaceId: string; claimId: string; priorClaimId?: string | null; revisionKind: LunaClaimRevision["revisionKind"]; reason: string; actor: string; snapshot: Record<string, unknown> }) {
  return mapClaimRevision(await insert("luna_claim_revisions", {
    workspace_id: input.workspaceId, claim_id: input.claimId, prior_claim_id: input.priorClaimId ?? null, revision_kind: input.revisionKind,
    reason: requiredText(input.reason, "Claim revision reason", 1, 4_000), actor_scope: requiredText(input.actor, "Claim revision actor", 1, 128), snapshot: input.snapshot,
  }));
}

export async function createLunaClaim(input: { userId: number; subject: string; predicate: string; objectText: string; statement: string; truthState?: LunaTruthState; confidence?: number; assumptions?: string[]; provenance?: Record<string, unknown>; projectId?: string | null; missionId?: string | null; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const truthState = boundedTruth(input.truthState ?? "INFERENCE");
  const confidence = Number(input.confidence ?? 0.5);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error("Claim confidence must be a number from 0 to 1.");
  const row = await insert("luna_claims", {
    workspace_id: workspace.id, owner_scope: workspace.ownerScope, project_id: input.projectId ?? null, mission_id: input.missionId ?? null,
    subject: requiredText(input.subject, "Claim subject", 1, 1_000), predicate: requiredText(input.predicate, "Claim predicate", 1, 1_000),
    object_text: requiredText(input.objectText, "Claim object", 1, 12_000), statement: requiredText(input.statement, "Claim statement", 1, 16_000),
    truth_state: truthState, confidence, assumptions: (input.assumptions ?? []).map(item => requiredText(item, "Claim assumption", 1, 1_000)).slice(0, 30), provenance: input.provenance ?? {}, current_version: 1,
  });
  const claim = mapClaim(row); const actor = input.actor ?? workspace.ownerScope;
  await createLunaClaimRevisionRecord({ workspaceId: workspace.id, claimId: claim.id, revisionKind: "CREATED", reason: "Claim created.", actor, snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "CLAIM_CREATED", subjectType: "CLAIM", subjectId: claim.id, missionId: claim.missionId, detail: { truthState: claim.truthState, confidence: claim.confidence, lifecycleState: claim.lifecycleState } });
  return claim;
}

export async function createLunaClaimEvidence(input: { userId: number; claimId: string; sourceMemoryId?: string | null; sourceObjectId?: string | null; sourceRelationshipId?: string | null; evidenceRole: LunaClaimEvidenceRole; sourceExcerpt?: string; confidence?: number | null; provenance?: Record<string, unknown>; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const claimRows = await rows("luna_claims", scopedParams(workspace.id, "*", { id: `eq.${input.claimId}`, limit: "1" }));
  if (!claimRows[0]) throw new Error("Claim is unavailable in this owner workspace.");
  await assertClaimAnchorOwnership({ workspaceId: workspace.id, sourceMemoryId: input.sourceMemoryId, sourceObjectId: input.sourceObjectId, sourceRelationshipId: input.sourceRelationshipId });
  const confidence = input.confidence === null || input.confidence === undefined ? null : Number(input.confidence);
  if (confidence !== null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) throw new Error("Evidence confidence must be a number from 0 to 1.");
  const row = await insert("luna_claim_evidence", {
    workspace_id: workspace.id, claim_id: input.claimId, source_memory_id: input.sourceMemoryId ?? null, source_object_id: input.sourceObjectId ?? null, source_relationship_id: input.sourceRelationshipId ?? null,
    evidence_role: input.evidenceRole, source_excerpt: requiredText(input.sourceExcerpt ?? "", "Claim evidence excerpt", 0, 4_000), confidence, provenance: input.provenance ?? {},
  });
  const evidence = mapClaimEvidence(row); const actor = input.actor ?? workspace.ownerScope;
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "CLAIM_EVIDENCE_LINKED", subjectType: "CLAIM_EVIDENCE", subjectId: evidence.id, missionId: mapClaim(claimRows[0]).missionId, detail: { claimId: evidence.claimId, evidenceRole: evidence.evidenceRole, sourceMemoryId: evidence.sourceMemoryId, sourceObjectId: evidence.sourceObjectId, sourceRelationshipId: evidence.sourceRelationshipId } });
  return evidence;
}

export async function reviseLunaClaim(input: { userId: number; claimId: string; statement?: string; truthState?: LunaTruthState; confidence?: number; lifecycleState?: LunaClaimLifecycleState; assumptions?: string[]; reason: string; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const currentRows = await rows("luna_claims", scopedParams(workspace.id, "*", { id: `eq.${input.claimId}`, limit: "1" }));
  if (!currentRows[0]) throw new Error("Claim is unavailable in this owner workspace.");
  const current = mapClaim(currentRows[0]); const patchValues: Record<string, unknown> = { current_version: current.currentVersion + 1 };
  if (input.statement !== undefined) patchValues.statement = requiredText(input.statement, "Claim statement", 1, 16_000);
  if (input.truthState !== undefined) patchValues.truth_state = boundedTruth(input.truthState);
  if (input.confidence !== undefined) { const confidence = Number(input.confidence); if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error("Claim confidence must be a number from 0 to 1."); patchValues.confidence = confidence; }
  if (input.lifecycleState !== undefined) patchValues.lifecycle_state = input.lifecycleState;
  if (input.assumptions !== undefined) patchValues.assumptions = input.assumptions.map(item => requiredText(item, "Claim assumption", 1, 1_000)).slice(0, 30);
  const row = await patch("luna_claims", scopedParams(workspace.id, "*", { id: `eq.${input.claimId}`, limit: "1" }), patchValues);
  const revised = mapClaim(row); const actor = input.actor ?? workspace.ownerScope;
  const revisionKind: LunaClaimRevision["revisionKind"] = revised.lifecycleState === "SUPERSEDED" ? "SUPERSEDED" : revised.lifecycleState === "RETRACTED" ? "RETRACTED" : "REVISED";
  await createLunaClaimRevisionRecord({ workspaceId: workspace.id, claimId: revised.id, revisionKind, reason: requiredText(input.reason, "Claim revision reason", 3, 4_000), actor, snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "CLAIM_REVISED", subjectType: "CLAIM", subjectId: revised.id, missionId: revised.missionId, detail: { priorVersion: current.currentVersion, version: revised.currentVersion, revisionKind, lifecycleState: revised.lifecycleState } });
  return revised;
}

export async function listLunaKnowledgeGaps(userId: number, limit = MAX_LIST) {
  const workspace = await workspaceFor(userId);
  return (await rows("luna_knowledge_gaps", scopedParams(workspace.id, "*", { order: "status.asc,severity.desc,updated_at.desc", limit: String(Math.min(Math.max(1, limit), MAX_LIST)) }))).map(mapKnowledgeGap);
}

export async function listLunaKnowledgeGapRevisions(userId: number, limit = 1_000) {
  const workspace = await workspaceFor(userId);
  return (await rows("luna_knowledge_gap_revisions", scopedParams(workspace.id, "*", { order: "created_at.desc", limit: String(Math.min(Math.max(1, limit), 1_000)) }))).map(mapKnowledgeGapRevision);
}

export async function listLunaCuriosityCandidates(userId: number, limit = MAX_LIST) {
  const workspace = await workspaceFor(userId);
  return (await rows("luna_curiosity_candidates", scopedParams(workspace.id, "*", { order: "status.asc,created_at.desc", limit: String(Math.min(Math.max(1, limit), MAX_LIST)) }))).map(mapCuriosityCandidate);
}

export async function listLunaPriorityAssessments(userId: number, limit = MAX_LIST) {
  const workspace = await workspaceFor(userId);
  return (await rows("luna_priority_assessments", scopedParams(workspace.id, "*", { order: "priority_score.desc,created_at.desc", limit: String(Math.min(Math.max(1, limit), MAX_LIST)) }))).map(mapPriorityAssessment);
}

export async function listLunaAutonomousDecisions(userId: number, limit = MAX_LIST) {
  const workspace = await workspaceFor(userId);
  return (await rows("luna_autonomous_decisions", scopedParams(workspace.id, "*", { order: "created_at.desc", limit: String(Math.min(Math.max(1, limit), MAX_LIST)) }))).map(mapDecision);
}

export async function listLunaResultValidations(userId: number, limit = 1_000) {
  const workspace = await workspaceFor(userId);
  return (await rows("luna_result_validations", scopedParams(workspace.id, "*", { order: "created_at.desc", limit: String(Math.min(Math.max(1, limit), 1_000)) }))).map(mapResultValidation);
}

const AUTONOMOUS_DECISION_SOURCE_TABLES: Record<LunaAutonomousDecision["sourceType"], string> = {
  KNOWLEDGE_GAP: "luna_knowledge_gaps",
  ATTENTION: "luna_attention_items",
  MAINTENANCE: "luna_maintenance_schedules",
};

export async function createOrGetLunaAutonomousDecision(input: {
  userId: number;
  sourceType: LunaAutonomousDecision["sourceType"];
  sourceId: string;
  decisionKey: string;
  objective: string;
  status: LunaDecisionStatus;
  outcome: LunaDecisionOutcome;
  priorityScore: number;
  policyVersion: string;
  rationale: string;
  evidence: Record<string, unknown>;
  budget: LunaAutonomousDecision["budget"];
  actor?: string;
}) {
  const workspace = await workspaceFor(input.userId);
  await assertOwnedLunaTarget(workspace.id, AUTONOMOUS_DECISION_SOURCE_TABLES[input.sourceType], input.sourceId, "Autonomous decision source");
  const existing = await rows("luna_autonomous_decisions", scopedParams(workspace.id, "*", { decision_key: `eq.${input.decisionKey}`, limit: "1" }));
  if (existing[0]) return { decision: mapDecision(existing[0]), created: false };
  const priorityScore = Number(input.priorityScore);
  if (!Number.isFinite(priorityScore) || priorityScore < 0 || priorityScore > 1) throw new Error("Luna decision priority score must be from 0 to 1.");
  try {
    const row = await insert("luna_autonomous_decisions", {
      workspace_id: workspace.id, source_type: input.sourceType, source_id: input.sourceId,
      decision_key: requiredText(input.decisionKey, "Decision key", 12, 240), objective: requiredText(input.objective, "Decision objective", 3, 12_000),
      status: input.status, outcome: input.outcome, priority_score: priorityScore,
      policy_version: requiredText(input.policyVersion, "Decision policy version", 1, 80), rationale: requiredText(input.rationale, "Decision rationale", 1, 8_000),
      evidence: input.evidence, budget: input.budget,
    });
    const decision = mapDecision(row);
    await cognitiveVersion({ workspaceId: workspace.id, subjectType: "DECISION", subjectId: decision.id, version: 1, action: "CREATED", actor: input.actor ?? "luna:autonomy", reason: "Deterministic autonomous decision recorded.", snapshot: asRecord(row), missionId: decision.missionId });
    await cognitiveAudit({ workspaceId: workspace.id, actor: input.actor ?? "luna:autonomy", action: "AUTONOMOUS_DECISION_CREATED", subjectType: "DECISION", subjectId: decision.id, detail: { sourceType: decision.sourceType, sourceId: decision.sourceId, decisionKey: decision.decisionKey, priorityScore: decision.priorityScore, status: decision.status, outcome: decision.outcome, policyVersion: decision.policyVersion } });
    return { decision, created: true };
  } catch (error) {
    const raced = await rows("luna_autonomous_decisions", scopedParams(workspace.id, "*", { decision_key: `eq.${input.decisionKey}`, limit: "1" }));
    if (!raced[0]) throw error;
    return { decision: mapDecision(raced[0]), created: false };
  }
}

export async function updateLunaAutonomousDecision(input: { userId: number; decisionId: string; status: LunaDecisionStatus; outcome: LunaDecisionOutcome; missionId?: string | null; actor?: string; reason: string }) {
  const workspace = await workspaceFor(input.userId);
  const row = await patch("luna_autonomous_decisions", scopedParams(workspace.id, "*", { id: `eq.${input.decisionId}`, limit: "1" }), {
    status: input.status, outcome: input.outcome, mission_id: input.missionId,
  });
  const decision = mapDecision(row);
  const actor = input.actor ?? "luna:autonomy";
  const reason = requiredText(input.reason, "Decision update reason", 3, 1_000);
  await cognitiveVersion({ workspaceId: workspace.id, subjectType: "DECISION", subjectId: decision.id, version: await nextCognitiveVersion(workspace.id, "DECISION", decision.id), action: "UPDATED", actor, reason, snapshot: asRecord(row), missionId: decision.missionId });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "AUTONOMOUS_DECISION_UPDATED", subjectType: "DECISION", subjectId: decision.id, missionId: decision.missionId, detail: { status: decision.status, outcome: decision.outcome, reason } });
  return decision;
}

export async function createOrGetLunaResultValidation(input: { userId: number; missionId: string; workerId: string; reportObjectId?: string | null; status: LunaResultValidationStatus; outputHash: string; resultSummary: string; checks: Record<string, boolean>; detail: string; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const [missionRows, workerRows] = await Promise.all([
    rows("luna_missions", scopedParams(workspace.id, "id", { id: `eq.${input.missionId}`, limit: "1" })),
    rows("luna_workers", scopedParams(workspace.id, "mission_id", { id: `eq.${input.workerId}`, limit: "1" })),
  ]);
  if (!missionRows[0]) throw new Error("Validation mission is unavailable in this owner workspace.");
  if (!workerRows[0] || String(workerRows[0].mission_id) !== input.missionId) throw new Error("Validation worker is unavailable in the specified owner-scoped mission.");
  if (input.reportObjectId) await assertOwnedLunaTarget(workspace.id, "luna_knowledge_objects", input.reportObjectId, "Validation report object");
  const existing = await rows("luna_result_validations", scopedParams(workspace.id, "*", { worker_id: `eq.${input.workerId}`, output_hash: `eq.${input.outputHash}`, limit: "1" }));
  if (existing[0]) return { validation: mapResultValidation(existing[0]), created: false };
  if (!/^[a-f0-9]{64}$/i.test(input.outputHash)) throw new Error("Luna result validation requires a SHA-256 output hash.");
  try {
    const row = await insert("luna_result_validations", {
      workspace_id: workspace.id, mission_id: input.missionId, worker_id: input.workerId, report_object_id: input.reportObjectId ?? null,
      status: input.status, output_hash: input.outputHash.toLowerCase(), result_summary: requiredText(input.resultSummary, "Validation result summary", 1, 1_200), checks: input.checks, detail: requiredText(input.detail, "Validation detail", 1, 4_000),
    });
    const validation = mapResultValidation(row);
    await cognitiveAudit({ workspaceId: workspace.id, actor: input.actor ?? "luna:validator", action: "WORKER_RESULT_VALIDATED", subjectType: "RESULT_VALIDATION", subjectId: validation.id, missionId: validation.missionId, workerId: validation.workerId, detail: { status: validation.status, reportObjectId: validation.reportObjectId, outputHash: validation.outputHash, checks: validation.checks } });
    return { validation, created: true };
  } catch (error) {
    const raced = await rows("luna_result_validations", scopedParams(workspace.id, "*", { worker_id: `eq.${input.workerId}`, output_hash: `eq.${input.outputHash}`, limit: "1" }));
    if (!raced[0]) throw error;
    return { validation: mapResultValidation(raced[0]), created: false };
  }
}

async function assertOwnedLunaTarget(workspaceId: string, table: string, id: string, label: string) {
  const target = await rows(table, scopedParams(workspaceId, "id", { id: `eq.${id}`, limit: "1" }));
  if (!target[0]) throw new Error(`${label} is unavailable in this owner workspace.`);
}

async function createLunaKnowledgeGapRevisionRecord(input: { workspaceId: string; gapId: string; revisionKind: LunaKnowledgeGapRevision["revisionKind"]; reason: string; actor: string; snapshot: Record<string, unknown> }) {
  return mapKnowledgeGapRevision(await insert("luna_knowledge_gap_revisions", {
    workspace_id: input.workspaceId, gap_id: input.gapId, revision_kind: input.revisionKind, reason: requiredText(input.reason, "Knowledge-gap revision reason", 1, 4_000),
    actor_scope: requiredText(input.actor, "Knowledge-gap revision actor", 1, 128), snapshot: input.snapshot,
  }));
}

export async function createLunaKnowledgeGap(input: { userId: number; title: string; question: string; requestedEvidence?: string; rationale?: string; severity?: LunaKnowledgeGap["severity"]; projectId?: string | null; claimId?: string | null; relatedObjectId?: string | null; provenance?: Record<string, unknown>; sourceType?: LunaKnowledgeGap["sourceType"]; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  if (input.projectId) await assertOwnedLunaTarget(workspace.id, "luna_projects", input.projectId, "Knowledge-gap project");
  if (input.claimId) await assertOwnedLunaTarget(workspace.id, "luna_claims", input.claimId, "Knowledge-gap claim");
  if (input.relatedObjectId) await assertOwnedLunaTarget(workspace.id, "luna_knowledge_objects", input.relatedObjectId, "Knowledge-gap Knowledge Space object");
  const sourceType = input.sourceType ?? "OWNER";
  const row = await insert("luna_knowledge_gaps", {
    workspace_id: workspace.id, project_id: input.projectId ?? null, claim_id: input.claimId ?? null, related_object_id: input.relatedObjectId ?? null,
    title: requiredText(input.title, "Knowledge-gap title", 1, 240), question: requiredText(input.question, "Knowledge-gap question", 1, 4_000),
    requested_evidence: requiredText(input.requestedEvidence ?? "", "Requested evidence", 0, 4_000), rationale: requiredText(input.rationale ?? "", "Knowledge-gap rationale", 0, 8_000),
    severity: input.severity ?? "WARNING", source_type: sourceType, provenance: input.provenance ?? {}, current_version: 1,
  });
  const gap = mapKnowledgeGap(row); const actor = input.actor ?? workspace.ownerScope;
  await createLunaKnowledgeGapRevisionRecord({ workspaceId: workspace.id, gapId: gap.id, revisionKind: "CREATED", reason: "Knowledge gap recorded.", actor, snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "KNOWLEDGE_GAP_CREATED", subjectType: "KNOWLEDGE_GAP", subjectId: gap.id, detail: { severity: gap.severity, sourceType: gap.sourceType, claimId: gap.claimId, relatedObjectId: gap.relatedObjectId } });
  return gap;
}

export async function updateLunaKnowledgeGap(input: { userId: number; gapId: string; status: LunaKnowledgeGapStatus; severity?: LunaKnowledgeGap["severity"]; rationale?: string; actor?: string; reason: string }) {
  const workspace = await workspaceFor(input.userId);
  const currentRows = await rows("luna_knowledge_gaps", scopedParams(workspace.id, "*", { id: `eq.${input.gapId}`, limit: "1" }));
  if (!currentRows[0]) throw new Error("Knowledge gap is unavailable in this owner workspace.");
  const current = mapKnowledgeGap(currentRows[0]);
  const patchValues: Record<string, unknown> = { status: input.status, current_version: current.currentVersion + 1 };
  if (input.severity !== undefined) patchValues.severity = input.severity;
  if (input.rationale !== undefined) patchValues.rationale = requiredText(input.rationale, "Knowledge-gap rationale", 0, 8_000);
  const row = await patch("luna_knowledge_gaps", scopedParams(workspace.id, "*", { id: `eq.${input.gapId}`, limit: "1" }), patchValues);
  const gap = mapKnowledgeGap(row);
  const actor = input.actor ?? "luna:reflection";
  const revisionKind: LunaKnowledgeGapRevision["revisionKind"] = gap.status === "RESOLVED" ? "RESOLVED" : gap.status === "DISMISSED" ? "DISMISSED" : "UPDATED";
  const reason = requiredText(input.reason, "Knowledge-gap update reason", 3, 4_000);
  await createLunaKnowledgeGapRevisionRecord({ workspaceId: workspace.id, gapId: gap.id, revisionKind, reason, actor, snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "KNOWLEDGE_GAP_UPDATED", subjectType: "KNOWLEDGE_GAP", subjectId: gap.id, detail: { previousStatus: current.status, status: gap.status, severity: gap.severity, reason } });
  return gap;
}

export async function createLunaCuriosityCandidate(input: { userId: number; gapId: string; proposedAction: string; rationale?: string; estimatedCost: LunaCuriosityCandidate["estimatedCost"]; createdBy?: LunaCuriosityCandidate["createdBy"]; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  await assertOwnedLunaTarget(workspace.id, "luna_knowledge_gaps", input.gapId, "Curiosity candidate knowledge gap");
  const createdBy = input.createdBy ?? "OWNER";
  const row = await insert("luna_curiosity_candidates", {
    workspace_id: workspace.id, gap_id: input.gapId, proposed_action: requiredText(input.proposedAction, "Curiosity candidate action", 1, 4_000),
    rationale: requiredText(input.rationale ?? "", "Curiosity candidate rationale", 0, 4_000), estimated_cost: input.estimatedCost, created_by: createdBy,
  });
  const candidate = mapCuriosityCandidate(row); const actor = input.actor ?? workspace.ownerScope;
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "CURIOSITY_CANDIDATE_CREATED", subjectType: "CURIOSITY", subjectId: candidate.id, detail: { gapId: candidate.gapId, estimatedCost: candidate.estimatedCost, status: candidate.status } });
  return candidate;
}

const PRIORITY_TARGET_TABLES: Record<LunaPriorityTargetType, string> = { PROJECT: "luna_projects", GOAL: "luna_goals", TASK: "luna_tasks", GAP: "luna_knowledge_gaps", CURIOSITY: "luna_curiosity_candidates" };

export async function createLunaPriorityAssessment(input: { userId: number; targetType: LunaPriorityTargetType; targetId: string; urgencyScore: number; impactScore: number; evidenceScore: number; unblockScore: number; riskScore: number; assumptions?: string[]; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  await assertOwnedLunaTarget(workspace.id, PRIORITY_TARGET_TABLES[input.targetType], input.targetId, "Priority target");
  const priority = explainLunaPriority({ urgencyScore: Number(input.urgencyScore), impactScore: Number(input.impactScore), evidenceScore: Number(input.evidenceScore), unblockScore: Number(input.unblockScore), riskScore: Number(input.riskScore) });
  const actor = input.actor ?? workspace.ownerScope;
  const row = await insert("luna_priority_assessments", {
    workspace_id: workspace.id, target_type: input.targetType, target_id: input.targetId, urgency_score: Number(input.urgencyScore), impact_score: Number(input.impactScore), evidence_score: Number(input.evidenceScore), unblock_score: Number(input.unblockScore), risk_score: Number(input.riskScore), priority_score: priority.priorityScore,
    explanation: priority.explanation, assumptions: (input.assumptions ?? []).map(item => requiredText(item, "Priority assumption", 1, 1_000)).slice(0, 30), actor_scope: actor,
  });
  const assessment = mapPriorityAssessment(row);
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "PRIORITY_ASSESSED", subjectType: "PRIORITY", subjectId: assessment.id, detail: { targetType: assessment.targetType, targetId: assessment.targetId, priorityScore: assessment.priorityScore } });
  return assessment;
}

export async function createLunaProject(input: { userId: number; title: string; summary?: string; priority?: number; focusObjectId?: string | null; createdBy: LunaProject["createdBy"]; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const row = await insert("luna_projects", { workspace_id: workspace.id, owner_scope: workspace.ownerScope, title: requiredText(input.title, "Project title", 1, 240), summary: requiredText(input.summary ?? "", "Project summary", 0, 16_000), priority: boundedInt(input.priority ?? 3, 1, 5, "Project priority"), focus_object_id: input.focusObjectId ?? null, created_by: input.createdBy, current_version: 1 });
  const project = mapProject(row); const actor = input.actor ?? (input.createdBy === "LUNA" ? "luna:planner" : workspace.ownerScope);
  await cognitiveVersion({ workspaceId: workspace.id, subjectType: "PROJECT", subjectId: project.id, version: 1, action: "CREATED", actor, reason: "Project created.", snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "PROJECT_CREATED", subjectType: "PROJECT", subjectId: project.id, detail: { createdBy: project.createdBy } });
  return project;
}

export async function createLunaGoal(input: { userId: number; title: string; rationale: string; projectId?: string | null; parentGoalId?: string | null; priority?: number; truthState?: LunaTruthState; actor?: string }) {
  const workspace = await workspaceFor(input.userId); const truthState = boundedTruth(input.truthState ?? "PROPOSED");
  const row = await insert("luna_goals", { workspace_id: workspace.id, project_id: input.projectId ?? null, parent_goal_id: input.parentGoalId ?? null, title: requiredText(input.title, "Goal title", 1, 240), rationale: requiredText(input.rationale, "Goal rationale", 1, 16_000), priority: boundedInt(input.priority ?? 3, 1, 5, "Goal priority"), truth_state: truthState, current_version: 1 });
  const goal = mapGoal(row); const actor = input.actor ?? "luna:planner";
  await cognitiveVersion({ workspaceId: workspace.id, subjectType: "GOAL", subjectId: goal.id, version: 1, action: "CREATED", actor, reason: "Goal created.", snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "GOAL_CREATED", subjectType: "GOAL", subjectId: goal.id, detail: { truthState } });
  return goal;
}

export async function createLunaMission(input: { userId: number; objective: string; projectId?: string | null; goalId?: string | null; decisionId?: string | null; missionOrigin?: LunaMission["missionOrigin"]; autonomyMode?: LunaMission["autonomyMode"]; priority?: number; maxWorkers?: number; maxSteps?: number; maxRetries?: number; maxDurationSeconds?: number; maxModelRequests?: number; maxTokenBudget?: number; idempotencyKey: string; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const row = await insert("luna_missions", { workspace_id: workspace.id, owner_scope: workspace.ownerScope, project_id: input.projectId ?? null, goal_id: input.goalId ?? null, decision_id: input.decisionId ?? null, mission_origin: input.missionOrigin ?? "OWNER", objective: requiredText(input.objective, "Mission objective", 1, 12_000), autonomy_mode: input.autonomyMode ?? "ON_DEMAND", priority: boundedInt(input.priority ?? 3, 1, 5, "Mission priority"), max_workers: boundedInt(input.maxWorkers ?? 4, 1, 12, "Maximum worker count"), max_steps: boundedInt(input.maxSteps ?? 24, 1, 100, "Maximum step count"), max_retries: boundedInt(input.maxRetries ?? 2, 0, 5, "Maximum retry count"), max_duration_seconds: boundedInt(input.maxDurationSeconds ?? 900, 10, 3600, "Maximum duration"), max_model_requests: boundedInt(input.maxModelRequests ?? 12, 0, 100, "Maximum model request count"), max_token_budget: boundedInt(input.maxTokenBudget ?? 24_000, 0, 1_000_000, "Maximum token budget"), idempotency_key: requiredText(input.idempotencyKey, "Mission idempotency key", 8, 200) });
  const mission = mapMission(row); const actor = input.actor ?? "luna:orchestrator";
  await cognitiveVersion({ workspaceId: workspace.id, subjectType: "MISSION", subjectId: mission.id, version: 1, action: "CREATED", actor, reason: "Mission created.", snapshot: asRecord(row), missionId: mission.id });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "MISSION_CREATED", subjectType: "MISSION", subjectId: mission.id, missionId: mission.id, detail: { missionOrigin: mission.missionOrigin, decisionId: mission.decisionId, autonomyMode: mission.autonomyMode, budgets: { maxWorkers: mission.maxWorkers, maxSteps: mission.maxSteps, maxModelRequests: mission.maxModelRequests, maxTokenBudget: mission.maxTokenBudget } } });
  return mission;
}

export async function createLunaTask(input: { userId: number; title: string; details?: string; projectId?: string | null; goalId?: string | null; missionId?: string | null; workerRole?: LunaWorkerRole | null; priority?: number; dependencyTaskIds?: string[]; relatedObjectIds?: string[]; maxRetries?: number; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const row = await insert("luna_tasks", { workspace_id: workspace.id, project_id: input.projectId ?? null, goal_id: input.goalId ?? null, mission_id: input.missionId ?? null, title: requiredText(input.title, "Task title", 1, 240), details: requiredText(input.details ?? "", "Task details", 0, 16_000), priority: boundedInt(input.priority ?? 3, 1, 5, "Task priority"), worker_role: input.workerRole ?? null, related_object_ids: input.relatedObjectIds ?? [], max_retries: boundedInt(input.maxRetries ?? 2, 0, 5, "Task retry count"), current_version: 1 });
  const dependencyTaskIds = Array.from(new Set(input.dependencyTaskIds ?? []));
  for (const dependencyId of dependencyTaskIds) await insert("luna_task_dependencies", { task_id: row.id, depends_on_task_id: dependencyId, workspace_id: workspace.id });
  const task = mapTask(row, dependencyTaskIds); const actor = input.actor ?? "luna:planner";
  await cognitiveVersion({ workspaceId: workspace.id, subjectType: "TASK", subjectId: task.id, version: 1, action: "CREATED", actor, reason: "Task created.", snapshot: asRecord(row), missionId: task.missionId });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "TASK_CREATED", subjectType: "TASK", subjectId: task.id, missionId: task.missionId, detail: { dependencies: dependencyTaskIds, workerRole: task.workerRole } });
  return task;
}

export async function createLunaWorker(input: { userId: number; missionId: string; taskId?: string | null; role: LunaWorkerRole; inputSummary: string; attempt?: number; workerId?: string; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  let row: Record<string, unknown>;
  try {
    row = await insert("luna_workers", { id: input.workerId, workspace_id: workspace.id, mission_id: input.missionId, task_id: input.taskId ?? null, role: input.role, input_summary: requiredText(input.inputSummary, "Worker input summary", 0, 12_000), attempt: boundedInt(input.attempt ?? 1, 1, 6, "Worker attempt") });
  } catch (error) {
    if (!input.workerId) throw error;
    const existing = await rows("luna_workers", scopedParams(workspace.id, "*", { id: `eq.${input.workerId}`, mission_id: `eq.${input.missionId}`, limit: "1" }));
    if (!existing[0]) throw error;
    return mapWorker(existing[0]);
  }
  const worker = mapWorker(row); const actor = input.actor ?? "luna:orchestrator";
  await cognitiveVersion({ workspaceId: workspace.id, subjectType: "WORKER", subjectId: worker.id, version: 1, action: "CREATED", actor, reason: "Worker dispatched.", snapshot: asRecord(row), missionId: worker.missionId });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "WORKER_QUEUED", subjectType: "WORKER", subjectId: worker.id, missionId: worker.missionId, workerId: worker.id, detail: { role: worker.role, taskId: worker.taskId } });
  return worker;
}

export async function listLunaProjects(userId: number) { const workspace = await workspaceFor(userId); return (await rows("luna_projects", scopedParams(workspace.id, "*", { order: "priority.desc,updated_at.desc", limit: String(MAX_LIST) }))).map(mapProject); }
export async function listLunaGoals(userId: number) { const workspace = await workspaceFor(userId); return (await rows("luna_goals", scopedParams(workspace.id, "*", { order: "priority.desc,updated_at.desc", limit: String(MAX_LIST) }))).map(mapGoal); }

export async function listLunaTasks(userId: number): Promise<LunaTask[]> {
  const workspace = await workspaceFor(userId);
  const [taskRows, dependencies] = await Promise.all([
    rows("luna_tasks", scopedParams(workspace.id, "*", { order: "priority.desc,created_at.asc", limit: String(MAX_LIST) })),
    rows("luna_task_dependencies", scopedParams(workspace.id, "*", { limit: "1000" })),
  ]);
  const map = new Map<string, string[]>();
  for (const dependency of dependencies) { const list = map.get(String(dependency.task_id)) ?? []; list.push(String(dependency.depends_on_task_id)); map.set(String(dependency.task_id), list); }
  return taskRows.map(row => mapTask(row, map.get(String(row.id)) ?? []));
}

export async function listLunaMissions(userId: number) { const workspace = await workspaceFor(userId); return (await rows("luna_missions", scopedParams(workspace.id, "*", { order: "created_at.desc", limit: String(MAX_LIST) }))).map(mapMission); }
export async function listLunaWorkers(userId: number) { const workspace = await workspaceFor(userId); return (await rows("luna_workers", scopedParams(workspace.id, "*", { order: "created_at.desc", limit: String(MAX_LIST) }))).map(mapWorker); }
export async function listLunaAttention(userId: number) { const workspace = await workspaceFor(userId); return (await rows("luna_attention_items", scopedParams(workspace.id, "*", { order: "state.asc,severity.desc,created_at.desc", limit: String(MAX_LIST) }))).map(mapAttention); }
export async function listLunaReflections(userId: number) { const workspace = await workspaceFor(userId); return (await rows("luna_reflections", scopedParams(workspace.id, "*", { order: "created_at.desc", limit: String(MAX_LIST) }))).map(mapReflection); }
export async function listLunaRecoveries(userId: number) { const workspace = await workspaceFor(userId); return (await rows("luna_recovery_records", scopedParams(workspace.id, "*", { status: "eq.REQUIRED", order: "created_at.desc", limit: String(MAX_LIST) }))).map(mapRecovery); }
export async function listLunaActivity(userId: number) { const workspace = await workspaceFor(userId); return (await rows("luna_cognitive_audit_events", scopedParams(workspace.id, "*", { order: "created_at.desc", limit: String(MAX_LIST) }))).map(mapAudit); }

export async function updateLunaMission(input: { userId: number; missionId: string; status?: LunaMissionStatus; currentFocus?: string | null; rootTaskId?: string | null; pauseRequested?: boolean; cancelRequested?: boolean; runtimeRunId?: string | null; modelRequestsUsed?: number; tokenUsage?: number; errorMessage?: string | null; resumeAfter?: string | null; started?: boolean; finished?: boolean; actor?: string; reason: string }) {
  const workspace = await workspaceFor(input.userId); const params = scopedParams(workspace.id, "*", { id: `eq.${input.missionId}`, limit: "1" });
  const patchValues: Record<string, unknown> = {};
  if (input.status !== undefined) patchValues.status = input.status;
  if (input.currentFocus !== undefined) patchValues.current_focus = input.currentFocus;
  if (input.rootTaskId !== undefined) patchValues.root_task_id = input.rootTaskId;
  if (input.pauseRequested !== undefined) patchValues.pause_requested = input.pauseRequested;
  if (input.cancelRequested !== undefined) patchValues.cancel_requested = input.cancelRequested;
  if (input.runtimeRunId !== undefined) patchValues.runtime_run_id = input.runtimeRunId;
  if (input.modelRequestsUsed !== undefined) patchValues.model_requests_used = input.modelRequestsUsed;
  if (input.tokenUsage !== undefined) patchValues.token_usage = input.tokenUsage;
  if (input.errorMessage !== undefined) patchValues.error_message = input.errorMessage;
  if (input.resumeAfter !== undefined) patchValues.resume_after = input.resumeAfter;
  if (input.started) patchValues.started_at = new Date().toISOString();
  if (input.finished) patchValues.finished_at = new Date().toISOString();
  const row = await patch("luna_missions", params, patchValues); const mission = mapMission(row); const actor = input.actor ?? "luna:orchestrator";
  await cognitiveVersion({ workspaceId: workspace.id, subjectType: "MISSION", subjectId: mission.id, version: await nextCognitiveVersion(workspace.id, "MISSION", mission.id), action: "UPDATED", actor, reason: requiredText(input.reason, "Mission update reason", 3, 1_000), snapshot: asRecord(row), missionId: mission.id });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "MISSION_UPDATED", subjectType: "MISSION", subjectId: mission.id, missionId: mission.id, detail: { status: mission.status, currentFocus: mission.currentFocus } });
  return mission;
}

export async function updateLunaWorker(input: { userId: number; workerId: string; missionId: string; state: LunaWorkerState; outputSummary?: string | null; handoffToRole?: LunaWorkerRole | null; errorMessage?: string | null; resetForRetry?: boolean; actor?: string }) {
  const workspace = await workspaceFor(input.userId); const params = scopedParams(workspace.id, "*", { id: `eq.${input.workerId}`, mission_id: `eq.${input.missionId}`, limit: "1" });
  const terminal = ["COMPLETED", "FAILED", "CANCELLED"].includes(input.state);
  const row = await patch("luna_workers", params, {
    state: input.state,
    output_summary: input.outputSummary,
    handoff_to_role: input.handoffToRole,
    error_message: input.resetForRetry ? null : input.errorMessage,
    started_at: input.state === "RUNNING" ? new Date().toISOString() : undefined,
    finished_at: input.resetForRetry ? null : terminal ? new Date().toISOString() : undefined,
  });
  const worker = mapWorker(row); const actor = input.actor ?? "luna:orchestrator";
  await cognitiveVersion({ workspaceId: workspace.id, subjectType: "WORKER", subjectId: worker.id, version: await nextCognitiveVersion(workspace.id, "WORKER", worker.id), action: "UPDATED", actor, reason: `Worker state changed to ${worker.state}.`, snapshot: asRecord(row), missionId: worker.missionId });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "WORKER_UPDATED", subjectType: "WORKER", subjectId: worker.id, missionId: worker.missionId, workerId: worker.id, detail: { state: worker.state, handoffToRole: worker.handoffToRole } });
  return worker;
}

export async function createLunaAttention(input: { userId: number; severity: LunaAttentionItem["severity"]; category: LunaAttentionItem["category"]; title: string; detail: string; projectId?: string | null; missionId?: string | null; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const row = await insert("luna_attention_items", { workspace_id: workspace.id, project_id: input.projectId ?? null, mission_id: input.missionId ?? null, severity: input.severity, category: input.category, title: requiredText(input.title, "Attention title", 1, 240), detail: requiredText(input.detail, "Attention detail", 1, 12_000) });
  const item = mapAttention(row); const actor = input.actor ?? "luna:system";
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "ATTENTION_CREATED", subjectType: "ATTENTION", subjectId: item.id, missionId: item.missionId, detail: { severity: item.severity, category: item.category } });
  return item;
}

/** Records actual provider/runtime activity in the immutable cognitive audit stream. */
export async function recordLunaRuntimeEvent(input: { userId: number; action: string; subjectType: string; subjectId?: string | null; missionId?: string | null; workerId?: string | null; detail: Record<string, unknown>; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  await cognitiveAudit({
    workspaceId: workspace.id,
    actor: input.actor ?? "luna:runtime",
    action: requiredText(input.action, "Runtime activity action", 1, 120),
    subjectType: requiredText(input.subjectType, "Runtime activity subject type", 1, 120),
    subjectId: input.subjectId ?? null,
    missionId: input.missionId ?? null,
    workerId: input.workerId ?? null,
    detail: input.detail,
  });
}

export async function createLunaRecovery(input: { userId: number; missionId: string; workerId?: string | null; reason: string; resumePayload?: Record<string, unknown>; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const row = await insert("luna_recovery_records", { workspace_id: workspace.id, mission_id: input.missionId, worker_id: input.workerId ?? null, reason: requiredText(input.reason, "Recovery reason", 1, 4_000), resume_payload: input.resumePayload ?? {} });
  const recovery = mapRecovery(row); const actor = input.actor ?? "luna:orchestrator";
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "RECOVERY_REQUIRED", subjectType: "RECOVERY", subjectId: recovery.id, missionId: recovery.missionId, workerId: recovery.workerId, detail: { reason: recovery.reason } });
  return recovery;
}

export async function createLunaToolCall(input: { userId: number; missionId: string; workerId: string; toolName: string; toolClass: LunaToolCall["toolClass"]; requestSummary: string; provider?: string | null; rateLimitKey?: string | null; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const worker = await assertWorkerToolPermission({ workspaceId: workspace.id, missionId: input.missionId, workerId: input.workerId, toolClass: input.toolClass });
  const row = await insert("luna_tool_calls", { workspace_id: workspace.id, mission_id: input.missionId, worker_id: worker.id, tool_name: requiredText(input.toolName, "Tool name", 1, 120), tool_class: input.toolClass, request_summary: requiredText(input.requestSummary, "Tool request summary", 1, 12_000), provider: input.provider ?? null, rate_limit_key: input.rateLimitKey ?? null });
  const toolCall: LunaToolCall = { id: String(row.id), workspaceId: String(row.workspace_id), missionId: String(row.mission_id), workerId: asString(row.worker_id), toolName: String(row.tool_name), toolClass: row.tool_class as LunaToolCall["toolClass"], status: row.status as LunaToolCall["status"], requestSummary: String(row.request_summary), resultSummary: asString(row.result_summary), provider: asString(row.provider), rateLimitKey: asString(row.rate_limit_key), startedAt: asString(row.started_at), finishedAt: asString(row.finished_at), errorMessage: asString(row.error_message), createdAt: String(row.created_at) };
  const actor = input.actor ?? `luna:${worker.role.toLowerCase()}`;
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "TOOL_REQUESTED", subjectType: "TOOL_CALL", subjectId: toolCall.id, missionId: toolCall.missionId, workerId: worker.id, detail: { toolName: toolCall.toolName, toolClass: toolCall.toolClass, provider: toolCall.provider, traceStatus: toolCall.status } });
  return toolCall;
}

export async function updateLunaToolCall(input: { userId: number; toolCallId: string; missionId: string; status: LunaToolCall["status"]; resultSummary?: string | null; errorMessage?: string | null; actor?: string }) {
  const workspace = await workspaceFor(input.userId); const params = scopedParams(workspace.id, "*", { id: `eq.${input.toolCallId}`, mission_id: `eq.${input.missionId}`, limit: "1" });
  const terminal = ["COMPLETED", "FAILED", "BLOCKED"].includes(input.status);
  const row = await patch("luna_tool_calls", params, { status: input.status, result_summary: input.resultSummary, error_message: input.errorMessage, started_at: input.status === "RUNNING" ? new Date().toISOString() : undefined, finished_at: terminal ? new Date().toISOString() : undefined });
  const actor = input.actor ?? "luna:orchestrator";
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: `TOOL_${input.status}`, subjectType: "TOOL_CALL", subjectId: String(row.id), missionId: input.missionId, workerId: asString(row.worker_id), detail: { toolName: String(row.tool_name), traceStatus: input.status } });
  return row;
}

export async function createLunaReflection(input: { userId: number; missionId?: string | null; projectId?: string | null; summary: string; newEvidenceCount?: number; newInferenceCount?: number; newMemoryCount?: number; relationshipCount?: number; contradictionCount?: number; unresolvedCount?: number; confidence?: LunaReflection["confidence"]; nextAction?: string | null; truthState?: LunaTruthState; actor?: string }) {
  const workspace = await workspaceFor(input.userId); const truthState = boundedTruth(input.truthState ?? "INFERENCE");
  const count = (value: number | undefined, label: string) => boundedInt(value ?? 0, 0, 100_000, label);
  const row = await insert("luna_reflections", { workspace_id: workspace.id, mission_id: input.missionId ?? null, project_id: input.projectId ?? null, summary: requiredText(input.summary, "Reflection summary", 1, 16_000), new_evidence_count: count(input.newEvidenceCount, "Evidence count"), new_inference_count: count(input.newInferenceCount, "Inference count"), new_memory_count: count(input.newMemoryCount, "Memory count"), relationship_count: count(input.relationshipCount, "Relationship count"), contradiction_count: count(input.contradictionCount, "Contradiction count"), unresolved_count: count(input.unresolvedCount, "Unresolved count"), confidence: input.confidence ?? "UNKNOWN", next_action: input.nextAction ?? null, truth_state: truthState });
  const reflection = mapReflection(row); await cognitiveAudit({ workspaceId: workspace.id, actor: input.actor ?? "luna:reflection", action: "REFLECTION_CREATED", subjectType: "REFLECTION", subjectId: reflection.id, missionId: reflection.missionId, detail: { truthState, confidence: reflection.confidence } });
  return reflection;
}

export function calculateLunaCognitiveState(input: { self: LunaSelfState; autonomyEnabled: boolean; maintenanceEnabled: boolean; cognitiveActionsEnabled: boolean; missions: LunaMission[]; workers: LunaWorker[]; tasks: LunaTask[]; attention: LunaAttentionItem[] }): LunaCognitiveState {
  const activeMissionCount = input.missions.filter(item => ["QUEUED", "PLANNING", "RUNNING", "WAITING_FOR_PROVIDER", "WAITING_FOR_RUNTIME"].includes(item.status)).length;
  const activeWorkerCount = input.workers.filter(item => ["QUEUED", "RUNNING", "WAITING"].includes(item.state)).length;
  const queuedTaskCount = input.tasks.filter(item => ["PENDING", "ELIGIBLE", "IN_PROGRESS"].includes(item.status)).length;
  const attentionCount = input.attention.filter(item => item.state === "OPEN").length;
  const health = input.attention.some(item => item.state === "OPEN" && item.severity === "ACTION_REQUIRED") ? "ACTION_REQUIRED" : input.missions.some(item => item.status === "FAILED" || item.status === "RECOVERY_REQUIRED") ? "DEGRADED" : "HEALTHY";
  return { workspaceId: input.self.workspaceId, self: input.self, autonomyEnabled: input.autonomyEnabled, maintenanceEnabled: input.maintenanceEnabled, cognitiveActionsEnabled: input.cognitiveActionsEnabled, activeMissionCount, activeWorkerCount, queuedTaskCount, attentionCount, health, updatedAt: input.self.updatedAt };
}

export function calculateEligibleTasks(tasks: LunaTask[]): LunaTask[] {
  const byId = new Map(tasks.map(task => [task.id, task]));
  return tasks.filter(task => task.status === "PENDING" || task.status === "ELIGIBLE").filter(task => task.dependencyTaskIds.every(id => byId.get(id)?.status === "COMPLETED"));
}

export function calculateBlockedTasks(tasks: LunaTask[]): LunaTask[] {
  const byId = new Map(tasks.map(task => [task.id, task]));
  return tasks.filter(task => task.status === "PENDING" || task.status === "ELIGIBLE").filter(task => task.dependencyTaskIds.some(id => ["FAILED", "CANCELLED", "BLOCKED", "RECOVERY_REQUIRED"].includes(byId.get(id)?.status ?? "BLOCKED")));
}

export async function getLunaCognitiveSnapshot(userId: number): Promise<LunaCognitiveSnapshot> {
  const self = await getOrCreateLunaSelfState(userId);
  const [memories, claims, claimEvidence, claimRevisions, knowledgeGaps, knowledgeGapRevisions, curiosityCandidates, priorityAssessments, decisions, resultValidations, projects, goals, tasks, missions, workers, attention, reflections, recoveries, activity] = await Promise.all([
    listLunaMemories(userId), listLunaClaims(userId), listLunaClaimEvidence(userId), listLunaClaimRevisions(userId), listLunaKnowledgeGaps(userId), listLunaKnowledgeGapRevisions(userId), listLunaCuriosityCandidates(userId), listLunaPriorityAssessments(userId), listLunaAutonomousDecisions(userId), listLunaResultValidations(userId), listLunaProjects(userId), listLunaGoals(userId), listLunaTasks(userId), listLunaMissions(userId), listLunaWorkers(userId), listLunaAttention(userId), listLunaReflections(userId), listLunaRecoveries(userId), listLunaActivity(userId),
  ]);
  return { state: calculateLunaCognitiveState({ self: self.self, autonomyEnabled: self.autonomyEnabled, maintenanceEnabled: self.maintenanceEnabled, cognitiveActionsEnabled: self.cognitiveActionsEnabled, missions, workers, tasks, attention }), memories, claims, claimEvidence, claimRevisions, knowledgeGaps, knowledgeGapRevisions, curiosityCandidates, priorityAssessments, decisions, resultValidations, projects, goals, tasks, missions, workers, attention, reflections, recoveries, activity };
}

export function assertNoScientificElevation(input: { truthState: LunaTruthState; actor: string }) {
  if (input.actor.startsWith("luna:") && isLunaScientificElevation(input.truthState)) throw new Error("Luna automation cannot promote its own output to scientific authority.");
}

export async function updateLunaTask(input: { userId: number; taskId: string; status?: LunaTaskStatus; details?: string; errorMessage?: string | null; retriesUsed?: number; actor?: string; reason: string }) {
  const workspace = await workspaceFor(input.userId);
  const currentRows = await rows("luna_tasks", scopedParams(workspace.id, "*", { id: `eq.${input.taskId}`, limit: "1" }));
  if (!currentRows[0]) throw new Error("Luna task was not found in this owner workspace.");
  const current = mapTask(currentRows[0]);
  const nextStatus = input.status ?? current.status;
  const patchValues: Record<string, unknown> = { current_version: current.currentVersion + 1 };
  if (input.status !== undefined) patchValues.status = input.status;
  if (input.details !== undefined) patchValues.details = requiredText(input.details, "Task details", 0, 16_000);
  if (input.errorMessage !== undefined) patchValues.error_message = input.errorMessage;
  if (input.retriesUsed !== undefined) patchValues.retries_used = boundedInt(input.retriesUsed, 0, current.maxRetries, "Retries used");
  if (nextStatus === "IN_PROGRESS" && !current.startedAt) patchValues.started_at = new Date().toISOString();
  if (["COMPLETED", "FAILED", "CANCELLED"].includes(nextStatus)) patchValues.completed_at = new Date().toISOString();
  const row = await patch("luna_tasks", scopedParams(workspace.id, "*", { id: `eq.${input.taskId}`, limit: "1" }), patchValues);
  const task = mapTask(row, current.dependencyTaskIds); const actor = input.actor ?? "luna:orchestrator";
  await cognitiveVersion({ workspaceId: workspace.id, subjectType: "TASK", subjectId: task.id, version: task.currentVersion, action: "UPDATED", actor, reason: requiredText(input.reason, "Task update reason", 3, 1_000), snapshot: asRecord(row), missionId: task.missionId });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "TASK_UPDATED", subjectType: "TASK", subjectId: task.id, missionId: task.missionId, detail: { beforeStatus: current.status, status: task.status, retriesUsed: task.retriesUsed } });
  return task;
}

export async function updateLunaMemory(input: { userId: number; memoryId: string; content?: string; importance?: number; active?: boolean; archived?: boolean; actor?: string; reason: string }) {
  const workspace = await workspaceFor(input.userId);
  const currentRows = await rows("luna_memories", scopedParams(workspace.id, "*", { id: `eq.${input.memoryId}`, limit: "1" }));
  if (!currentRows[0]) throw new Error("Luna memory was not found in this owner workspace.");
  const current = mapMemory(currentRows[0]);
  if (current.sourceType === "PROVIDER" || current.sourceType === "PUBLISHED") throw new Error("Provider or published-evidence memory is retained as source evidence and cannot be modified by Luna automation.");
  const patchValues: Record<string, unknown> = { current_version: current.currentVersion + 1 };
  if (input.content !== undefined) patchValues.content = requiredText(input.content, "Memory content", 1, 16_000);
  if (input.importance !== undefined) patchValues.importance = boundedInt(input.importance, 1, 5, "Memory importance");
  if (input.active !== undefined) patchValues.is_active = input.active;
  if (input.archived !== undefined) patchValues.is_archived = input.archived;
  const row = await patch("luna_memories", scopedParams(workspace.id, "*", { id: `eq.${input.memoryId}`, limit: "1" }), patchValues);
  const memory = mapMemory(row); const actor = input.actor ?? "luna:memory";
  await cognitiveVersion({ workspaceId: workspace.id, subjectType: "MEMORY", subjectId: memory.id, version: memory.currentVersion, action: input.archived ? "ARCHIVED" : "UPDATED", actor, reason: requiredText(input.reason, "Memory update reason", 3, 1_000), snapshot: asRecord(row), missionId: memory.missionId });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: input.archived ? "MEMORY_ARCHIVED" : "MEMORY_UPDATED", subjectType: "MEMORY", subjectId: memory.id, missionId: memory.missionId, detail: { before: { active: current.active, importance: current.importance }, after: { active: memory.active, importance: memory.importance } } });
  return memory;
}

export async function createLunaMemoryLink(input: { userId: number; sourceMemoryId: string; targetMemoryId: string; linkType: "SUPPORTS" | "CONTRADICTS" | "DERIVED_FROM" | "RELATED_TO" | "SUPERSEDES" | "CONSOLIDATES"; confidence?: number | null; truthState?: LunaTruthState; evidence?: Record<string, unknown>; missionId?: string | null; actor?: string }) {
  if (input.sourceMemoryId === input.targetMemoryId) throw new Error("A memory cannot link to itself.");
  const workspace = await workspaceFor(input.userId); const truthState = boundedTruth(input.truthState ?? "INFERENCE");
  const confidence = input.confidence === null || input.confidence === undefined ? null : Math.max(0, Math.min(1, Number(input.confidence)));
  const row = await insert("luna_memory_links", { workspace_id: workspace.id, source_memory_id: input.sourceMemoryId, target_memory_id: input.targetMemoryId, link_type: input.linkType, confidence, truth_state: truthState, evidence: input.evidence ?? {}, mission_id: input.missionId ?? null });
  await cognitiveAudit({ workspaceId: workspace.id, actor: input.actor ?? "luna:linker", action: "MEMORY_LINKED", subjectType: "MEMORY_LINK", subjectId: String(row.id), missionId: input.missionId, detail: { sourceMemoryId: input.sourceMemoryId, targetMemoryId: input.targetMemoryId, linkType: input.linkType, truthState } });
  return row;
}

export async function archiveDuplicateLunaMemory(input: { userId: number; canonicalMemoryId: string; duplicateMemoryId: string; missionId?: string | null }) {
  const duplicate = await updateLunaMemory({ userId: input.userId, memoryId: input.duplicateMemoryId, active: false, archived: true, actor: "luna:memory", reason: `Exact duplicate consolidated into memory ${input.canonicalMemoryId}.` });
  await createLunaMemoryLink({ userId: input.userId, sourceMemoryId: duplicate.id, targetMemoryId: input.canonicalMemoryId, linkType: "CONSOLIDATES", truthState: "INFERENCE", missionId: input.missionId ?? null, actor: "luna:memory", evidence: { method: "exact normalized content match", reversible: true } });
  return duplicate;
}

export async function rollbackLunaOwnedMemory(input: { userId: number; memoryId: string; version: number; reason: string }) {
  const workspace = await workspaceFor(input.userId);
  const versionRows = await rows("luna_cognitive_versions", scopedParams(workspace.id, "*", { subject_type: "eq.MEMORY", subject_id: `eq.${input.memoryId}`, version: `eq.${input.version}`, limit: "1" }));
  const source = versionRows[0];
  if (!source) throw new Error("Requested Luna memory version is unavailable for rollback.");
  const snapshot = asRecord(source.snapshot);
  const currentRows = await rows("luna_memories", scopedParams(workspace.id, "*", { id: `eq.${input.memoryId}`, limit: "1" }));
  if (!currentRows[0]) throw new Error("Luna memory is unavailable for rollback.");
  const current = mapMemory(currentRows[0]);
  if (current.sourceType !== "LUNA" && current.sourceType !== "SYSTEM") throw new Error("Only Luna-owned or system-owned memories can be rolled back through this control.");
  const row = await patch("luna_memories", scopedParams(workspace.id, "*", { id: `eq.${input.memoryId}`, limit: "1" }), { content: String(snapshot.content ?? current.content), importance: Number(snapshot.importance ?? current.importance), is_active: Boolean(snapshot.is_active ?? true), is_archived: Boolean(snapshot.is_archived ?? false), current_version: current.currentVersion + 1 });
  const restored = mapMemory(row);
  await cognitiveVersion({ workspaceId: workspace.id, subjectType: "MEMORY", subjectId: restored.id, version: restored.currentVersion, action: "ROLLED_BACK", actor: workspace.ownerScope, reason: requiredText(input.reason, "Rollback reason", 3, 1_000), snapshot: asRecord(row), missionId: restored.missionId });
  await cognitiveAudit({ workspaceId: workspace.id, actor: workspace.ownerScope, action: "MEMORY_ROLLED_BACK", subjectType: "MEMORY", subjectId: restored.id, missionId: restored.missionId, detail: { restoredFromVersion: input.version, priorVersion: current.currentVersion } });
  return restored;
}

export async function markLunaMissionWaitingForRuntime(input: { userId: number; missionId: string; detail: string }) {
  const mission = await updateLunaMission({ userId: input.userId, missionId: input.missionId, status: "WAITING_FOR_RUNTIME", currentFocus: "Waiting for configured durable runtime", errorMessage: input.detail, actor: "luna:runtime", reason: "Durable runtime dispatch is unavailable." });
  await createLunaAttention({ userId: input.userId, missionId: mission.id, severity: "ACTION_REQUIRED", category: "SYSTEM", title: "Durable worker runtime is unavailable", detail: input.detail, actor: "luna:runtime" });
  return mission;
}

export async function recoverIncompleteLunaMissions(userId: number) {
  const missions = await listLunaMissions(userId);
  const incomplete = missions.filter(mission => ["PLANNING", "RUNNING", "WAITING_FOR_PROVIDER"].includes(mission.status));
  const results: LunaMission[] = [];
  for (const mission of incomplete) {
    await createLunaRecovery({ userId, missionId: mission.id, reason: "A durable runtime sweep found an incomplete mission. It must be resumed only by a configured runtime or explicitly marked abandoned.", resumePayload: { missionId: mission.id, idempotencyKey: mission.id, previousStatus: mission.status } });
    results.push(await updateLunaMission({ userId, missionId: mission.id, status: "RECOVERY_REQUIRED", currentFocus: "Recovery required", errorMessage: "Interrupted mission requires a configured durable-runtime resume.", actor: "luna:recovery", reason: "Incomplete mission detected during recovery sweep." }));
  }
  return results;
}


// --- Additive pre-game cognitive persistence ---------------------------------
// All functions below intentionally reuse the same workspace lookup, server-only REST
// client, immutable cognitive audit stream, and version stream as the existing Luna domains.

function mapCognitiveInput(row: Record<string, unknown>): LunaCognitiveInput {
  return { id: String(row.id), workspaceId: String(row.workspace_id), sourceKey: String(row.source_key), inputType: row.input_type as LunaCognitiveInput["inputType"], summary: String(row.summary), relevance: row.relevance as LunaCognitiveInput["relevance"], privacyClass: row.privacy_class as LunaCognitiveInput["privacyClass"], projectId: asString(row.project_id), goalId: asString(row.goal_id), missionId: asString(row.mission_id), workerId: asString(row.worker_id), provenance: asRecord(row.provenance), createdAt: String(row.created_at) };
}
function mapExperience(row: Record<string, unknown>): LunaExperience {
  return { id: String(row.id), workspaceId: String(row.workspace_id), inputId: asString(row.input_id), experienceKind: row.experience_kind as LunaExperience["experienceKind"], summary: String(row.summary), importance: asNumber(row.importance), confidence: asNumber(row.confidence), projectId: asString(row.project_id), goalId: asString(row.goal_id), missionId: asString(row.mission_id), workerId: asString(row.worker_id), provenance: asRecord(row.provenance), createdAt: String(row.created_at) };
}
function mapCycle(row: Record<string, unknown>): LunaCognitiveCycle {
  return { id: String(row.id), workspaceId: String(row.workspace_id), cycleKey: String(row.cycle_key), cycleType: row.cycle_type as LunaCognitiveCycle["cycleType"], inputId: asString(row.input_id), status: row.status as LunaCognitiveCycle["status"], evaluatedCount: asNumber(row.evaluated_count), derivedCount: asNumber(row.derived_count), stopReason: asString(row.stop_reason), createdAt: String(row.created_at) };
}
function mapAttentionAssessment(row: Record<string, unknown>): LunaAttentionAssessment {
  return { id: String(row.id), workspaceId: String(row.workspace_id), sourceType: String(row.source_type), sourceId: String(row.source_id), targetType: String(row.target_type), targetId: String(row.target_id), severity: row.severity as LunaAttentionAssessment["severity"], score: asNumber(row.score), factors: Object.fromEntries(Object.entries(asRecord(row.factors)).filter(([, value]) => typeof value === "number")) as Record<string, number>, state: row.state as LunaAttentionAssessment["state"], focusTier: row.focus_tier as LunaAttentionAssessment["focusTier"], suppressionReason: asString(row.suppression_reason), expiresAt: asString(row.expires_at), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function mapFocusAssignment(row: Record<string, unknown>): LunaFocusAssignment {
  return { id: String(row.id), workspaceId: String(row.workspace_id), attentionId: String(row.attention_id), targetType: String(row.target_type), targetId: String(row.target_id), tier: row.tier as LunaFocusAssignment["tier"], rank: asNumber(row.rank), score: asNumber(row.score), cycleId: asString(row.cycle_id), replacedAt: asString(row.replaced_at), createdAt: String(row.created_at) };
}
function mapUncertainty(row: Record<string, unknown>): LunaUncertaintyRecord {
  return { id: String(row.id), workspaceId: String(row.workspace_id), targetType: String(row.target_type), targetId: String(row.target_id), score: asNumber(row.score), importance: asNumber(row.importance), evidenceBasis: String(row.evidence_basis), status: row.status as LunaUncertaintyRecord["status"], provenance: asRecord(row.provenance), currentVersion: asNumber(row.current_version, 1), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function mapNovelty(row: Record<string, unknown>): LunaNoveltyRecord {
  return { id: String(row.id), workspaceId: String(row.workspace_id), targetType: String(row.target_type), targetId: String(row.target_id), noveltyKey: String(row.novelty_key), score: asNumber(row.score), rationale: String(row.rationale), sourceInputId: asString(row.source_input_id), createdAt: String(row.created_at) };
}
function mapContradiction(row: Record<string, unknown>): LunaContradiction {
  return { id: String(row.id), workspaceId: String(row.workspace_id), anchorAType: String(row.anchor_a_type), anchorAId: String(row.anchor_a_id), anchorBType: String(row.anchor_b_type), anchorBId: String(row.anchor_b_id), summary: String(row.summary), impact: asNumber(row.impact), status: row.status as LunaContradiction["status"], projectId: asString(row.project_id), goalId: asString(row.goal_id), provenance: asRecord(row.provenance), currentVersion: asNumber(row.current_version, 1), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function mapGapProfile(row: Record<string, unknown>): LunaGapProfile {
  return { gapId: String(row.gap_id), workspaceId: String(row.workspace_id), category: row.category as LunaGapProfile["category"], status: row.status as LunaGapProfile["status"], confidence: asNumber(row.confidence), canonicalGapId: asString(row.canonical_gap_id), normalizedKey: String(row.normalized_key), reopenedFromId: asString(row.reopened_from_id), cooldownUntil: asString(row.cooldown_until), currentVersion: asNumber(row.current_version, 1), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function mapCuriosityAssessment(row: Record<string, unknown>): LunaCuriosityAssessment {
  return { id: String(row.id), workspaceId: String(row.workspace_id), candidateId: asString(row.candidate_id), gapId: asString(row.gap_id), triggerType: String(row.trigger_type), triggerId: String(row.trigger_id), expectedInformationValue: asNumber(row.expected_information_value), noveltyScore: asNumber(row.novelty_score), importance: asNumber(row.importance), status: row.status as LunaCuriosityAssessment["status"], cooldownUntil: asString(row.cooldown_until), expiresAt: asString(row.expires_at), cycleId: asString(row.cycle_id), rationale: String(row.rationale), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function mapPreference(row: Record<string, unknown>): LunaPreference {
  return { id: String(row.id), workspaceId: String(row.workspace_id), preferenceKind: row.preference_kind as LunaPreference["preferenceKind"], subject: String(row.subject), value: String(row.value), context: asRecord(row.context), confidence: asNumber(row.confidence), evidenceCount: asNumber(row.evidence_count), active: asBoolean(row.is_active), provenance: asRecord(row.provenance), currentVersion: asNumber(row.current_version, 1), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function mapInternalState(row: Record<string, unknown>): LunaInternalStateObservation {
  return { id: String(row.id), workspaceId: String(row.workspace_id), dimension: row.dimension as LunaInternalStateObservation["dimension"], value: asNumber(row.value), delta: asNumber(row.delta), reason: String(row.reason), inputId: asString(row.input_id), experienceId: asString(row.experience_id), cycleId: asString(row.cycle_id), createdAt: String(row.created_at) };
}
function mapSelfFact(row: Record<string, unknown>): LunaSelfModelFact {
  return { id: String(row.id), workspaceId: String(row.workspace_id), factKind: row.fact_kind as LunaSelfModelFact["factKind"], facet: String(row.facet), statement: String(row.statement), confidence: asNumber(row.confidence), evidenceCount: asNumber(row.evidence_count), status: row.status as LunaSelfModelFact["status"], currentVersion: asNumber(row.current_version, 1), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function mapGoalProfile(row: Record<string, unknown>): LunaGoalProfile {
  return { goalId: String(row.goal_id), workspaceId: String(row.workspace_id), origin: row.origin as LunaGoalProfile["origin"], importance: asNumber(row.importance), motivation: String(row.motivation), deadlineAt: asString(row.deadline_at), successCriteria: String(row.success_criteria), failureCriteria: String(row.failure_criteria), status: row.status as LunaGoalProfile["status"], currentVersion: asNumber(row.current_version, 1), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function mapGoalDependency(row: Record<string, unknown>): LunaGoalDependency {
  return { id: String(row.id), workspaceId: String(row.workspace_id), goalId: String(row.goal_id), dependsOnGoalId: String(row.depends_on_goal_id), dependencyKind: row.dependency_kind as LunaGoalDependency["dependencyKind"], status: row.status as LunaGoalDependency["status"], createdAt: String(row.created_at) };
}
function mapCommitment(row: Record<string, unknown>): LunaCommitment {
  return { id: String(row.id), workspaceId: String(row.workspace_id), projectId: asString(row.project_id), goalId: asString(row.goal_id), relationshipId: asString(row.relationship_id), title: String(row.title), detail: String(row.detail), status: row.status as LunaCommitment["status"], dueAt: asString(row.due_at), confidence: asNumber(row.confidence), externalActionRequired: asBoolean(row.external_action_required), currentVersion: asNumber(row.current_version, 1), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function mapHypothesis(row: Record<string, unknown>): LunaHypothesis {
  return { id: String(row.id), workspaceId: String(row.workspace_id), projectId: asString(row.project_id), goalId: asString(row.goal_id), gapId: asString(row.gap_id), statement: String(row.statement), plannedTest: String(row.planned_test), confidence: asNumber(row.confidence), status: row.status as LunaHypothesis["status"], currentVersion: asNumber(row.current_version, 1), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function mapReasoning(row: Record<string, unknown>): LunaReasoningArtifact {
  const options = Array.isArray(row.options) ? row.options.filter((item): item is { label: string; summary: string } => Boolean(item) && typeof item === "object" && typeof (item as Record<string, unknown>).label === "string" && typeof (item as Record<string, unknown>).summary === "string") : [];
  return { id: String(row.id), workspaceId: String(row.workspace_id), cycleId: asString(row.cycle_id), subjectType: String(row.subject_type), subjectId: String(row.subject_id), conclusion: String(row.conclusion), confidence: asNumber(row.confidence), uncertaintySummary: String(row.uncertainty_summary), options, recommendation: String(row.recommendation), evidenceIds: asStringArray(row.evidence_ids), createdAt: String(row.created_at) };
}
function mapPlanRevision(row: Record<string, unknown>): LunaPlanRevision {
  return { id: String(row.id), workspaceId: String(row.workspace_id), goalId: asString(row.goal_id), missionId: asString(row.mission_id), revisionKind: row.revision_kind as LunaPlanRevision["revisionKind"], summary: String(row.summary), reason: String(row.reason), alternatives: asStringArray(row.alternatives), createdAt: String(row.created_at) };
}
function mapLearning(row: Record<string, unknown>): LunaLearningRecord {
  return { id: String(row.id), workspaceId: String(row.workspace_id), learningKind: row.learning_kind as LunaLearningRecord["learningKind"], sourceInputId: asString(row.source_input_id), experienceId: asString(row.experience_id), validationId: asString(row.validation_id), targetType: String(row.target_type), targetId: String(row.target_id), summary: String(row.summary), confidenceDelta: asNumber(row.confidence_delta), provenance: asRecord(row.provenance), createdAt: String(row.created_at) };
}
function mapWorkerPerformance(row: Record<string, unknown>): LunaWorkerPerformanceSnapshot {
  return { id: String(row.id), workspaceId: String(row.workspace_id), workerRole: row.worker_role as LunaWorkerRole, workerId: asString(row.worker_id), missionId: asString(row.mission_id), outcome: row.outcome as LunaWorkerPerformanceSnapshot["outcome"], durationMs: row.duration_ms === null ? null : asNumber(row.duration_ms), strategy: String(row.strategy), createdAt: String(row.created_at) };
}
function mapRelationship(row: Record<string, unknown>): LunaRelationship {
  return { id: String(row.id), workspaceId: String(row.workspace_id), agentIdentity: String(row.agent_identity), participantIdentity: String(row.participant_identity), familiarity: asNumber(row.familiarity), trust: asNumber(row.trust), affinity: asNumber(row.affinity), conflict: asNumber(row.conflict), cooperation: asNumber(row.cooperation), expectations: String(row.expectations), uncertainty: asNumber(row.uncertainty), status: row.status as LunaRelationship["status"], currentVersion: asNumber(row.current_version, 1), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function mapSocialInteraction(row: Record<string, unknown>): LunaSocialInteraction {
  return { id: String(row.id), workspaceId: String(row.workspace_id), relationshipId: String(row.relationship_id), inputId: asString(row.input_id), experienceId: asString(row.experience_id), interactionKind: row.interaction_kind as LunaSocialInteraction["interactionKind"], summary: String(row.summary), impact: asNumber(row.impact), provenance: asRecord(row.provenance), createdAt: String(row.created_at) };
}
function mapWorldEvent(row: Record<string, unknown>): LunaWorldEvent {
  return { id: String(row.id), workspaceId: String(row.workspace_id), sourceKey: String(row.source_key), eventType: String(row.event_type), subjectIdentity: asString(row.subject_identity), objectIdentity: asString(row.object_identity), locationRef: asString(row.location_ref), occurredAt: asString(row.occurred_at), summary: String(row.summary), constraints: asRecord(row.constraints), consequences: asRecord(row.consequences), inputId: asString(row.input_id), createdAt: String(row.created_at) };
}
function mapMaintenanceReport(row: Record<string, unknown>): LunaMaintenanceReport {
  return { id: String(row.id), workspaceId: String(row.workspace_id), cycleId: asString(row.cycle_id), scope: String(row.scope), evaluatedCount: asNumber(row.evaluated_count), updatedCount: asNumber(row.updated_count), issueCount: asNumber(row.issue_count), status: row.status as LunaMaintenanceReport["status"], stopReason: asString(row.stop_reason), summary: String(row.summary), createdAt: String(row.created_at) };
}

function boundedScore(value: number, label: string) {
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 1) throw new Error(`${label} must be a number from 0 to 1.`);
  return score;
}

async function versionPreGame(input: { workspaceId: string; subjectType: string; subjectId: string; currentVersion: number; action: string; actor: string; reason: string; snapshot: Record<string, unknown> }) {
  await cognitiveVersion({ workspaceId: input.workspaceId, subjectType: input.subjectType, subjectId: input.subjectId, version: input.currentVersion, action: input.action, actor: input.actor, reason: requiredText(input.reason, "Pre-game cognitive change reason", 3, 1_000), snapshot: input.snapshot });
}

export async function createOrGetLunaCognitiveInput(input: { userId: number; sourceKey: string; inputType: LunaCognitiveInput["inputType"]; summary: string; relevance: LunaCognitiveInput["relevance"]; privacyClass?: LunaCognitiveInput["privacyClass"]; projectId?: string | null; goalId?: string | null; missionId?: string | null; workerId?: string | null; provenance?: Record<string, unknown>; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const existing = await rows("luna_cognitive_inputs", scopedParams(workspace.id, "*", { source_key: `eq.${requiredText(input.sourceKey, "Cognitive input source key", 8, 240)}`, limit: "1" }));
  if (existing[0]) return { input: mapCognitiveInput(existing[0]), created: false };
  try {
    const row = await insert("luna_cognitive_inputs", { workspace_id: workspace.id, source_key: input.sourceKey, input_type: input.inputType, summary: requiredText(input.summary, "Cognitive input summary", 1, 1_200), relevance: input.relevance, privacy_class: input.privacyClass ?? "OWNER_PRIVATE", project_id: input.projectId ?? null, goal_id: input.goalId ?? null, mission_id: input.missionId ?? null, worker_id: input.workerId ?? null, provenance: input.provenance ?? {} });
    const result = mapCognitiveInput(row); const actor = input.actor ?? "luna:input";
    await versionPreGame({ workspaceId: workspace.id, subjectType: "COGNITIVE_INPUT", subjectId: result.id, currentVersion: 1, action: "CREATED", actor, reason: "Bounded cognitive input retained with relevance classification.", snapshot: asRecord(row) });
    await cognitiveAudit({ workspaceId: workspace.id, actor, action: "COGNITIVE_INPUT_RECORDED", subjectType: "COGNITIVE_INPUT", subjectId: result.id, missionId: result.missionId, workerId: result.workerId, detail: { inputType: result.inputType, relevance: result.relevance, sourceKey: result.sourceKey, privacyClass: result.privacyClass } });
    return { input: result, created: true };
  } catch (error) {
    const raced = await rows("luna_cognitive_inputs", scopedParams(workspace.id, "*", { source_key: `eq.${input.sourceKey}`, limit: "1" }));
    if (!raced[0]) throw error;
    return { input: mapCognitiveInput(raced[0]), created: false };
  }
}

export async function createOrGetLunaExperience(input: { userId: number; inputId?: string | null; experienceKind: LunaExperience["experienceKind"]; summary: string; importance: number; confidence: number; projectId?: string | null; goalId?: string | null; missionId?: string | null; workerId?: string | null; provenance?: Record<string, unknown>; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  if (input.inputId) await assertOwnedLunaTarget(workspace.id, "luna_cognitive_inputs", input.inputId, "Cognitive experience input");
  const existing = input.inputId ? await rows("luna_experiences", scopedParams(workspace.id, "*", { input_id: `eq.${input.inputId}`, experience_kind: `eq.${input.experienceKind}`, limit: "1" })) : [];
  if (existing[0]) return { experience: mapExperience(existing[0]), created: false };
  const row = await insert("luna_experiences", { workspace_id: workspace.id, input_id: input.inputId ?? null, experience_kind: input.experienceKind, summary: requiredText(input.summary, "Experience summary", 1, 1_600), importance: boundedScore(input.importance, "Experience importance"), confidence: boundedScore(input.confidence, "Experience confidence"), project_id: input.projectId ?? null, goal_id: input.goalId ?? null, mission_id: input.missionId ?? null, worker_id: input.workerId ?? null, provenance: input.provenance ?? {} });
  const result = mapExperience(row); const actor = input.actor ?? "luna:experience";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "EXPERIENCE", subjectId: result.id, currentVersion: 1, action: "CREATED", actor, reason: "Source-backed cognitive experience recorded.", snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "EXPERIENCE_RECORDED", subjectType: "EXPERIENCE", subjectId: result.id, missionId: result.missionId, workerId: result.workerId, detail: { experienceKind: result.experienceKind, inputId: result.inputId, importance: result.importance, confidence: result.confidence } });
  return { experience: result, created: true };
}

export async function createOrGetLunaCognitiveCycle(input: { userId: number; cycleKey: string; cycleType: LunaCognitiveCycle["cycleType"]; inputId?: string | null; status: LunaCognitiveCycle["status"]; evaluatedCount: number; derivedCount: number; stopReason?: string | null; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const key = requiredText(input.cycleKey, "Cognitive cycle key", 8, 240);
  const existing = await rows("luna_cognitive_cycles", scopedParams(workspace.id, "*", { cycle_key: `eq.${key}`, limit: "1" }));
  if (existing[0]) return { cycle: mapCycle(existing[0]), created: false };
  const row = await insert("luna_cognitive_cycles", { workspace_id: workspace.id, cycle_key: key, cycle_type: input.cycleType, input_id: input.inputId ?? null, status: input.status, evaluated_count: boundedInt(input.evaluatedCount, 0, 100, "Cognitive cycle evaluated count"), derived_count: boundedInt(input.derivedCount, 0, 16, "Cognitive cycle derived count"), stop_reason: input.stopReason ? requiredText(input.stopReason, "Cognitive cycle stop reason", 1, 1_000) : null });
  const result = mapCycle(row); const actor = input.actor ?? "luna:cycle";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "COGNITIVE_CYCLE", subjectId: result.id, currentVersion: 1, action: "COMPLETED", actor, reason: "Bounded deterministic cognitive cycle recorded.", snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "COGNITIVE_CYCLE_RECORDED", subjectType: "COGNITIVE_CYCLE", subjectId: result.id, detail: { cycleType: result.cycleType, status: result.status, evaluatedCount: result.evaluatedCount, derivedCount: result.derivedCount } });
  return { cycle: result, created: true };
}

export async function createOrUpdateLunaAttentionAssessment(input: { userId: number; sourceType: string; sourceId: string; targetType: string; targetId: string; severity: LunaAttentionAssessment["severity"]; score: number; factors: Record<string, number>; state?: LunaAttentionAssessment["state"]; focusTier?: LunaAttentionAssessment["focusTier"]; suppressionReason?: string | null; expiresAt?: string | null; actor?: string; reason: string }) {
  const workspace = await workspaceFor(input.userId);
  const existing = await rows("luna_attention_assessments", scopedParams(workspace.id, "*", { source_type: `eq.${input.sourceType}`, source_id: `eq.${input.sourceId}`, target_type: `eq.${input.targetType}`, target_id: `eq.${input.targetId}`, limit: "1" }));
  const values = { source_type: requiredText(input.sourceType, "Attention source type", 1, 80), source_id: input.sourceId, target_type: requiredText(input.targetType, "Attention target type", 1, 80), target_id: input.targetId, severity: input.severity, score: boundedScore(input.score, "Attention score"), factors: Object.fromEntries(Object.entries(input.factors).map(([key, value]) => [requiredText(key, "Attention factor", 1, 60), boundedScore(value, "Attention factor score")])), state: input.state ?? "ACTIVE", focus_tier: input.focusTier ?? null, suppression_reason: input.suppressionReason ?? null, expires_at: input.expiresAt ?? null };
  const row = existing[0] ? await patch("luna_attention_assessments", scopedParams(workspace.id, "*", { id: `eq.${existing[0].id}`, limit: "1" }), values) : await insert("luna_attention_assessments", { workspace_id: workspace.id, ...values });
  const result = mapAttentionAssessment(row); const actor = input.actor ?? "luna:attention"; const action = existing[0] ? "UPDATED" : "CREATED";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "ATTENTION_ASSESSMENT", subjectId: result.id, currentVersion: existing[0] ? await nextCognitiveVersion(workspace.id, "ATTENTION_ASSESSMENT", result.id) : 1, action, actor, reason: input.reason, snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: `ATTENTION_ASSESSMENT_${action}`, subjectType: "ATTENTION_ASSESSMENT", subjectId: result.id, detail: { score: result.score, severity: result.severity, state: result.state, sourceType: result.sourceType, targetType: result.targetType } });
  return result;
}

export async function replaceLunaFocusAssignments(input: { userId: number; assignments: Array<{ attentionId: string; targetType: string; targetId: string; tier: LunaFocusAssignment["tier"]; rank: number; score: number }>; cycleId?: string | null; actor?: string }) {
  const workspace = await workspaceFor(input.userId); const limited = input.assignments.slice(0, 12); const actor = input.actor ?? "luna:attention";
  const active = await rows("luna_focus_assignments", scopedParams(workspace.id, "id", { replaced_at: "is.null", limit: "100" }));
  for (const prior of active) await patch("luna_focus_assignments", scopedParams(workspace.id, "*", { id: `eq.${prior.id}`, limit: "1" }), { replaced_at: new Date().toISOString() });
  const results: LunaFocusAssignment[] = [];
  for (const assignment of limited) {
    await assertOwnedLunaTarget(workspace.id, "luna_attention_assessments", assignment.attentionId, "Focus attention assessment");
    const row = await insert("luna_focus_assignments", { workspace_id: workspace.id, attention_id: assignment.attentionId, target_type: requiredText(assignment.targetType, "Focus target type", 1, 80), target_id: assignment.targetId, tier: assignment.tier, rank: boundedInt(assignment.rank, 1, 12, "Focus rank"), score: boundedScore(assignment.score, "Focus score"), cycle_id: input.cycleId ?? null });
    const result = mapFocusAssignment(row); results.push(result);
    await versionPreGame({ workspaceId: workspace.id, subjectType: "FOCUS", subjectId: result.id, currentVersion: 1, action: "ASSIGNED", actor, reason: "Deterministic focus allocation replaced the prior bounded focus set.", snapshot: asRecord(row) });
  }
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "FOCUS_REPLACED", subjectType: "FOCUS", detail: { activeAssignmentsReplaced: active.length, newAssignments: results.length, cycleId: input.cycleId ?? null } });
  return results;
}

export async function createOrUpdateLunaUncertainty(input: { userId: number; targetType: string; targetId: string; score: number; importance: number; evidenceBasis: string; status?: LunaUncertaintyRecord["status"]; provenance?: Record<string, unknown>; actor?: string; reason: string }) {
  const workspace = await workspaceFor(input.userId);
  const existing = await rows("luna_uncertainty_records", scopedParams(workspace.id, "*", { target_type: `eq.${input.targetType}`, target_id: `eq.${input.targetId}`, limit: "1" }));
  const values = { target_type: requiredText(input.targetType, "Uncertainty target type", 1, 80), target_id: input.targetId, score: boundedScore(input.score, "Uncertainty score"), importance: boundedScore(input.importance, "Uncertainty importance"), evidence_basis: requiredText(input.evidenceBasis, "Uncertainty evidence basis", 1, 1_600), status: input.status ?? "OPEN", provenance: input.provenance ?? {}, current_version: existing[0] ? asNumber(existing[0].current_version, 1) + 1 : 1 };
  const row = existing[0] ? await patch("luna_uncertainty_records", scopedParams(workspace.id, "*", { id: `eq.${existing[0].id}`, limit: "1" }), values) : await insert("luna_uncertainty_records", { workspace_id: workspace.id, ...values });
  const result = mapUncertainty(row); const actor = input.actor ?? "luna:uncertainty"; const action = existing[0] ? "UPDATED" : "CREATED";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "UNCERTAINTY", subjectId: result.id, currentVersion: result.currentVersion, action, actor, reason: input.reason, snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: `UNCERTAINTY_${action}`, subjectType: "UNCERTAINTY", subjectId: result.id, detail: { targetType: result.targetType, score: result.score, importance: result.importance, status: result.status } });
  return result;
}

export async function createOrGetLunaNovelty(input: { userId: number; targetType: string; targetId: string; noveltyKey: string; score: number; rationale: string; sourceInputId?: string | null; actor?: string }) {
  const workspace = await workspaceFor(input.userId); const key = requiredText(input.noveltyKey, "Novelty key", 8, 240);
  const existing = await rows("luna_novelty_records", scopedParams(workspace.id, "*", { novelty_key: `eq.${key}`, limit: "1" }));
  if (existing[0]) return { novelty: mapNovelty(existing[0]), created: false };
  const row = await insert("luna_novelty_records", { workspace_id: workspace.id, target_type: requiredText(input.targetType, "Novelty target type", 1, 80), target_id: input.targetId, novelty_key: key, score: boundedScore(input.score, "Novelty score"), rationale: requiredText(input.rationale, "Novelty rationale", 1, 1_600), source_input_id: input.sourceInputId ?? null });
  const result = mapNovelty(row); const actor = input.actor ?? "luna:novelty";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "NOVELTY", subjectId: result.id, currentVersion: 1, action: "CREATED", actor, reason: "Exact novelty key retained to suppress duplicate cognitive assessment.", snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "NOVELTY_RECORDED", subjectType: "NOVELTY", subjectId: result.id, detail: { score: result.score, targetType: result.targetType, noveltyKey: result.noveltyKey } });
  return { novelty: result, created: true };
}

export async function createOrUpdateLunaGapProfile(input: { userId: number; gapId: string; category: LunaGapProfile["category"]; status?: LunaGapProfile["status"]; confidence: number; normalizedKey: string; canonicalGapId?: string | null; reopenedFromId?: string | null; cooldownUntil?: string | null; actor?: string; reason: string }) {
  const workspace = await workspaceFor(input.userId); await assertOwnedLunaTarget(workspace.id, "luna_knowledge_gaps", input.gapId, "Gap profile gap");
  const existing = await rows("luna_gap_profiles", scopedParams(workspace.id, "*", { gap_id: `eq.${input.gapId}`, limit: "1" }));
  const values = { workspace_id: workspace.id, category: input.category, status: input.status ?? "OPEN", confidence: boundedScore(input.confidence, "Gap profile confidence"), normalized_key: requiredText(input.normalizedKey, "Gap normalized key", 8, 240), canonical_gap_id: input.canonicalGapId ?? null, reopened_from_id: input.reopenedFromId ?? null, cooldown_until: input.cooldownUntil ?? null, current_version: existing[0] ? asNumber(existing[0].current_version, 1) + 1 : 1 };
  const row = existing[0] ? await patch("luna_gap_profiles", scopedParams(workspace.id, "*", { gap_id: `eq.${input.gapId}`, limit: "1" }), values) : await insert("luna_gap_profiles", { gap_id: input.gapId, ...values });
  const result = mapGapProfile(row); const actor = input.actor ?? "luna:gap"; const action = existing[0] ? "UPDATED" : "CREATED";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "GAP_PROFILE", subjectId: result.gapId, currentVersion: result.currentVersion, action, actor, reason: input.reason, snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: `GAP_PROFILE_${action}`, subjectType: "GAP_PROFILE", subjectId: result.gapId, detail: { category: result.category, status: result.status, canonicalGapId: result.canonicalGapId } });
  return result;
}

export async function createOrUpdateLunaCuriosityAssessment(input: { userId: number; candidateId?: string | null; gapId?: string | null; triggerType: string; triggerId: string; expectedInformationValue: number; noveltyScore: number; importance: number; status?: LunaCuriosityAssessment["status"]; cooldownUntil?: string | null; expiresAt?: string | null; cycleId?: string | null; rationale: string; actor?: string; reason: string }) {
  const workspace = await workspaceFor(input.userId);
  const existing = await rows("luna_curiosity_assessments", scopedParams(workspace.id, "*", { trigger_type: `eq.${input.triggerType}`, trigger_id: `eq.${input.triggerId}`, limit: "1" }));
  const values = { candidate_id: input.candidateId ?? null, gap_id: input.gapId ?? null, trigger_type: requiredText(input.triggerType, "Curiosity trigger type", 1, 80), trigger_id: input.triggerId, expected_information_value: boundedScore(input.expectedInformationValue, "Curiosity information value"), novelty_score: boundedScore(input.noveltyScore, "Curiosity novelty score"), importance: boundedScore(input.importance, "Curiosity importance"), status: input.status ?? "CANDIDATE", cooldown_until: input.cooldownUntil ?? null, expires_at: input.expiresAt ?? null, cycle_id: input.cycleId ?? null, rationale: requiredText(input.rationale, "Curiosity rationale", 1, 1_600) };
  const row = existing[0] ? await patch("luna_curiosity_assessments", scopedParams(workspace.id, "*", { id: `eq.${existing[0].id}`, limit: "1" }), values) : await insert("luna_curiosity_assessments", { workspace_id: workspace.id, ...values });
  const result = mapCuriosityAssessment(row); const actor = input.actor ?? "luna:curiosity"; const action = existing[0] ? "UPDATED" : "CREATED";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "CURIOSITY_ASSESSMENT", subjectId: result.id, currentVersion: existing[0] ? await nextCognitiveVersion(workspace.id, "CURIOSITY_ASSESSMENT", result.id) : 1, action, actor, reason: input.reason, snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: `CURIOSITY_ASSESSMENT_${action}`, subjectType: "CURIOSITY_ASSESSMENT", subjectId: result.id, detail: { status: result.status, importance: result.importance, triggerType: result.triggerType } });
  return result;
}

export async function createLunaInternalStateObservation(input: { userId: number; dimension: LunaInternalStateObservation["dimension"]; value: number; delta: number; reason: string; inputId?: string | null; experienceId?: string | null; cycleId?: string | null; actor?: string }) {
  const workspace = await workspaceFor(input.userId); const delta = Number(input.delta);
  if (!Number.isFinite(delta) || delta < -1 || delta > 1) throw new Error("Internal state delta must be a number from -1 to 1.");
  const row = await insert("luna_internal_state_observations", { workspace_id: workspace.id, dimension: input.dimension, value: boundedScore(input.value, "Internal state value"), delta, reason: requiredText(input.reason, "Internal state reason", 1, 1_000), input_id: input.inputId ?? null, experience_id: input.experienceId ?? null, cycle_id: input.cycleId ?? null });
  const result = mapInternalState(row); const actor = input.actor ?? "luna:state";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "INTERNAL_STATE", subjectId: result.id, currentVersion: 1, action: "OBSERVED", actor, reason: result.reason, snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "INTERNAL_STATE_OBSERVED", subjectType: "INTERNAL_STATE", subjectId: result.id, detail: { dimension: result.dimension, value: result.value, delta: result.delta } });
  return result;
}

export async function createLunaReasoningArtifact(input: { userId: number; cycleId?: string | null; subjectType: string; subjectId: string; conclusion: string; confidence: number; uncertaintySummary: string; options: Array<{ label: string; summary: string }>; recommendation: string; evidenceIds?: string[]; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const options = input.options.slice(0, 5).map(option => ({ label: requiredText(option.label, "Reasoning option label", 1, 120), summary: requiredText(option.summary, "Reasoning option summary", 1, 600) }));
  const row = await insert("luna_reasoning_artifacts", { workspace_id: workspace.id, cycle_id: input.cycleId ?? null, subject_type: requiredText(input.subjectType, "Reasoning subject type", 1, 80), subject_id: input.subjectId, conclusion: requiredText(input.conclusion, "Reasoning conclusion", 1, 1_600), confidence: boundedScore(input.confidence, "Reasoning confidence"), uncertainty_summary: requiredText(input.uncertaintySummary, "Reasoning uncertainty summary", 1, 1_600), options, recommendation: requiredText(input.recommendation, "Reasoning recommendation", 1, 1_600), evidence_ids: (input.evidenceIds ?? []).slice(0, 20) });
  const result = mapReasoning(row); const actor = input.actor ?? "luna:reasoning";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "REASONING", subjectId: result.id, currentVersion: 1, action: "CREATED", actor, reason: "High-level evidence-bound reasoning artifact recorded without hidden reasoning trace.", snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "REASONING_ARTIFACT_CREATED", subjectType: "REASONING", subjectId: result.id, detail: { subjectType: result.subjectType, subjectId: result.subjectId, confidence: result.confidence } });
  return result;
}

export async function createLunaLearningRecord(input: { userId: number; learningKind: LunaLearningRecord["learningKind"]; sourceInputId?: string | null; experienceId?: string | null; validationId?: string | null; targetType: string; targetId: string; summary: string; confidenceDelta: number; provenance?: Record<string, unknown>; actor?: string }) {
  const workspace = await workspaceFor(input.userId); const delta = Number(input.confidenceDelta);
  if (!Number.isFinite(delta) || delta < -1 || delta > 1) throw new Error("Learning confidence delta must be a number from -1 to 1.");
  const row = await insert("luna_learning_records", { workspace_id: workspace.id, learning_kind: input.learningKind, source_input_id: input.sourceInputId ?? null, experience_id: input.experienceId ?? null, validation_id: input.validationId ?? null, target_type: requiredText(input.targetType, "Learning target type", 1, 80), target_id: input.targetId, summary: requiredText(input.summary, "Learning summary", 1, 1_600), confidence_delta: delta, provenance: input.provenance ?? {} });
  const result = mapLearning(row); const actor = input.actor ?? "luna:learning";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "LEARNING", subjectId: result.id, currentVersion: 1, action: "CREATED", actor, reason: "Evidence-bound learning record retained without overwriting source history.", snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "LEARNING_RECORDED", subjectType: "LEARNING", subjectId: result.id, detail: { learningKind: result.learningKind, targetType: result.targetType, targetId: result.targetId, confidenceDelta: result.confidenceDelta } });
  return result;
}

export async function createOrGetLunaRelationship(input: { userId: number; agentIdentity: string; participantIdentity: string; actor?: string }) {
  const workspace = await workspaceFor(input.userId); const agent = requiredText(input.agentIdentity, "Relationship agent identity", 1, 120); const participant = requiredText(input.participantIdentity, "Relationship participant identity", 1, 120);
  const existing = await rows("luna_relationships", scopedParams(workspace.id, "*", { agent_identity: `eq.${agent}`, participant_identity: `eq.${participant}`, limit: "1" }));
  if (existing[0]) return { relationship: mapRelationship(existing[0]), created: false };
  const row = await insert("luna_relationships", { workspace_id: workspace.id, agent_identity: agent, participant_identity: participant });
  const result = mapRelationship(row); const actor = input.actor ?? "luna:relationship";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "RELATIONSHIP", subjectId: result.id, currentVersion: 1, action: "CREATED", actor, reason: "Neutral owner-scoped relationship record created from an actual interaction source.", snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "RELATIONSHIP_CREATED", subjectType: "RELATIONSHIP", subjectId: result.id, detail: { agentIdentity: result.agentIdentity, participantIdentity: result.participantIdentity } });
  return { relationship: result, created: true };
}

export async function createLunaSocialInteraction(input: { userId: number; relationshipId: string; inputId?: string | null; experienceId?: string | null; interactionKind: LunaSocialInteraction["interactionKind"]; summary: string; impact: number; provenance?: Record<string, unknown>; actor?: string }) {
  const workspace = await workspaceFor(input.userId); await assertOwnedLunaTarget(workspace.id, "luna_relationships", input.relationshipId, "Social interaction relationship"); const impact = Number(input.impact);
  if (!Number.isFinite(impact) || impact < -1 || impact > 1) throw new Error("Social interaction impact must be a number from -1 to 1.");
  const row = await insert("luna_social_interactions", { workspace_id: workspace.id, relationship_id: input.relationshipId, input_id: input.inputId ?? null, experience_id: input.experienceId ?? null, interaction_kind: input.interactionKind, summary: requiredText(input.summary, "Social interaction summary", 1, 1_600), impact, provenance: input.provenance ?? {} });
  const result = mapSocialInteraction(row); const actor = input.actor ?? "luna:relationship";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "SOCIAL_INTERACTION", subjectId: result.id, currentVersion: 1, action: "RECORDED", actor, reason: "Source-backed neutral social interaction recorded.", snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "SOCIAL_INTERACTION_RECORDED", subjectType: "SOCIAL_INTERACTION", subjectId: result.id, detail: { relationshipId: result.relationshipId, interactionKind: result.interactionKind, impact: result.impact } });
  return result;
}

export async function createOrGetLunaWorldEvent(input: { userId: number; sourceKey: string; eventType: string; summary: string; subjectIdentity?: string | null; objectIdentity?: string | null; locationRef?: string | null; occurredAt?: string | null; constraints?: Record<string, unknown>; consequences?: Record<string, unknown>; inputId?: string | null; actor?: string }) {
  const workspace = await workspaceFor(input.userId); const key = requiredText(input.sourceKey, "World event source key", 8, 240);
  const existing = await rows("luna_world_events", scopedParams(workspace.id, "*", { source_key: `eq.${key}`, limit: "1" }));
  if (existing[0]) return { event: mapWorldEvent(existing[0]), created: false };
  const row = await insert("luna_world_events", { workspace_id: workspace.id, source_key: key, event_type: requiredText(input.eventType, "World event type", 1, 120), summary: requiredText(input.summary, "World event summary", 1, 1_600), subject_identity: input.subjectIdentity ?? null, object_identity: input.objectIdentity ?? null, location_ref: input.locationRef ?? null, occurred_at: input.occurredAt ?? null, constraints: input.constraints ?? {}, consequences: input.consequences ?? {}, input_id: input.inputId ?? null });
  const result = mapWorldEvent(row); const actor = input.actor ?? "luna:world";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "WORLD_EVENT", subjectId: result.id, currentVersion: 1, action: "RECORDED", actor, reason: "World-agnostic source event retained without any game-world action.", snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "WORLD_EVENT_RECORDED", subjectType: "WORLD_EVENT", subjectId: result.id, detail: { eventType: result.eventType, sourceKey: result.sourceKey } });
  return { event: result, created: true };
}

export async function createLunaMaintenanceReport(input: { userId: number; cycleId?: string | null; scope: string; evaluatedCount: number; updatedCount: number; issueCount: number; status: LunaMaintenanceReport["status"]; stopReason?: string | null; summary: string; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const row = await insert("luna_maintenance_reports", { workspace_id: workspace.id, cycle_id: input.cycleId ?? null, scope: requiredText(input.scope, "Maintenance scope", 1, 240), evaluated_count: boundedInt(input.evaluatedCount, 0, 100, "Maintenance evaluated count"), updated_count: boundedInt(input.updatedCount, 0, 16, "Maintenance updated count"), issue_count: boundedInt(input.issueCount, 0, 100, "Maintenance issue count"), status: input.status, stop_reason: input.stopReason ? requiredText(input.stopReason, "Maintenance stop reason", 1, 1_000) : null, summary: requiredText(input.summary, "Maintenance summary", 1, 1_600) });
  const result = mapMaintenanceReport(row); const actor = input.actor ?? "luna:maintenance";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "MAINTENANCE_REPORT", subjectId: result.id, currentVersion: 1, action: "CREATED", actor, reason: "Bounded maintenance report recorded.", snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "MAINTENANCE_REPORTED", subjectType: "MAINTENANCE_REPORT", subjectId: result.id, detail: { scope: result.scope, status: result.status, evaluatedCount: result.evaluatedCount, updatedCount: result.updatedCount, issueCount: result.issueCount } });
  return result;
}

export async function listLunaPreGameCognitiveSnapshot(userId: number): Promise<LunaPreGameCognitiveSnapshot> {
  const workspace = await workspaceFor(userId); const list = (table: string, order = "created_at.desc") => rows(table, scopedParams(workspace.id, "*", { order, limit: String(MAX_LIST) }));
  const [inputs, experiences, cycles, attentionAssessments, focusAssignments, uncertaintyRecords, noveltyRecords, contradictions, gapProfiles, curiosityAssessments, preferences, internalState, selfModelFacts, goalProfiles, goalDependencies, commitments, hypotheses, reasoningArtifacts, planRevisions, learningRecords, workerPerformance, relationships, socialInteractions, worldEvents, maintenanceReports] = await Promise.all([
    list("luna_cognitive_inputs"), list("luna_experiences"), list("luna_cognitive_cycles"), list("luna_attention_assessments", "score.desc,updated_at.desc"), list("luna_focus_assignments", "replaced_at.asc,tier.asc,rank.asc"), list("luna_uncertainty_records", "importance.desc,score.desc,updated_at.desc"), list("luna_novelty_records", "score.desc,created_at.desc"), list("luna_contradictions", "impact.desc,updated_at.desc"), list("luna_gap_profiles", "updated_at.desc"), list("luna_curiosity_assessments", "importance.desc,updated_at.desc"), list("luna_preferences", "updated_at.desc"), list("luna_internal_state_observations"), list("luna_self_model_facts", "updated_at.desc"), list("luna_goal_profiles", "importance.desc,updated_at.desc"), list("luna_goal_dependencies"), list("luna_commitments", "updated_at.desc"), list("luna_hypotheses", "updated_at.desc"), list("luna_reasoning_artifacts"), list("luna_plan_revisions"), list("luna_learning_records"), list("luna_worker_performance_snapshots"), list("luna_relationships", "updated_at.desc"), list("luna_social_interactions"), list("luna_world_events", "occurred_at.desc.nullslast,created_at.desc"), list("luna_maintenance_reports"),
  ]);
  return { inputs: inputs.map(mapCognitiveInput), experiences: experiences.map(mapExperience), cycles: cycles.map(mapCycle), attentionAssessments: attentionAssessments.map(mapAttentionAssessment), focusAssignments: focusAssignments.map(mapFocusAssignment), uncertaintyRecords: uncertaintyRecords.map(mapUncertainty), noveltyRecords: noveltyRecords.map(mapNovelty), contradictions: contradictions.map(mapContradiction), gapProfiles: gapProfiles.map(mapGapProfile), curiosityAssessments: curiosityAssessments.map(mapCuriosityAssessment), preferences: preferences.map(mapPreference), internalState: internalState.map(mapInternalState), selfModelFacts: selfModelFacts.map(mapSelfFact), goalProfiles: goalProfiles.map(mapGoalProfile), goalDependencies: goalDependencies.map(mapGoalDependency), commitments: commitments.map(mapCommitment), hypotheses: hypotheses.map(mapHypothesis), reasoningArtifacts: reasoningArtifacts.map(mapReasoning), planRevisions: planRevisions.map(mapPlanRevision), learningRecords: learningRecords.map(mapLearning), workerPerformance: workerPerformance.map(mapWorkerPerformance), relationships: relationships.map(mapRelationship), socialInteractions: socialInteractions.map(mapSocialInteraction), worldEvents: worldEvents.map(mapWorldEvent), maintenanceReports: maintenanceReports.map(mapMaintenanceReport) };
}


export async function createOrUpdateLunaContradiction(input: { userId: number; anchorAType: string; anchorAId: string; anchorBType: string; anchorBId: string; summary: string; impact: number; status?: LunaContradiction["status"]; projectId?: string | null; goalId?: string | null; provenance?: Record<string, unknown>; actor?: string; reason: string }) {
  if (input.anchorAId === input.anchorBId) throw new Error("A contradiction requires two distinct persisted anchors.");
  const workspace = await workspaceFor(input.userId);
  const existing = await rows("luna_contradictions", scopedParams(workspace.id, "*", { anchor_a_type: `eq.${input.anchorAType}`, anchor_a_id: `eq.${input.anchorAId}`, anchor_b_type: `eq.${input.anchorBType}`, anchor_b_id: `eq.${input.anchorBId}`, limit: "1" }));
  const values = { anchor_a_type: requiredText(input.anchorAType, "Contradiction anchor A type", 1, 80), anchor_a_id: input.anchorAId, anchor_b_type: requiredText(input.anchorBType, "Contradiction anchor B type", 1, 80), anchor_b_id: input.anchorBId, summary: requiredText(input.summary, "Contradiction summary", 1, 1_600), impact: boundedScore(input.impact, "Contradiction impact"), status: input.status ?? "UNRESOLVED", project_id: input.projectId ?? null, goal_id: input.goalId ?? null, provenance: input.provenance ?? {}, current_version: existing[0] ? asNumber(existing[0].current_version, 1) + 1 : 1 };
  const row = existing[0] ? await patch("luna_contradictions", scopedParams(workspace.id, "*", { id: `eq.${existing[0].id}`, limit: "1" }), values) : await insert("luna_contradictions", { workspace_id: workspace.id, ...values });
  const result = mapContradiction(row); const actor = input.actor ?? "luna:contradiction"; const action = existing[0] ? "UPDATED" : "CREATED";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "CONTRADICTION", subjectId: result.id, currentVersion: result.currentVersion, action, actor, reason: input.reason, snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: `CONTRADICTION_${action}`, subjectType: "CONTRADICTION", subjectId: result.id, detail: { status: result.status, impact: result.impact, anchorAType: result.anchorAType, anchorBType: result.anchorBType } });
  return result;
}

export async function createOrUpdateLunaPreference(input: { userId: number; preferenceKind: LunaPreference["preferenceKind"]; subject: string; value: string; context?: Record<string, unknown>; confidence: number; evidenceCount?: number; active?: boolean; provenance?: Record<string, unknown>; actor?: string; reason: string }) {
  const workspace = await workspaceFor(input.userId); const subject = requiredText(input.subject, "Preference subject", 1, 240); const value = requiredText(input.value, "Preference value", 1, 1_600);
  const existing = await rows("luna_preferences", scopedParams(workspace.id, "*", { preference_kind: `eq.${input.preferenceKind}`, subject: `eq.${subject}`, value: `eq.${value}`, limit: "1" }));
  const values = { preference_kind: input.preferenceKind, subject, value, context: input.context ?? {}, confidence: boundedScore(input.confidence, "Preference confidence"), evidence_count: boundedInt(input.evidenceCount ?? 1, 0, 100_000, "Preference evidence count"), is_active: input.active ?? true, provenance: input.provenance ?? {}, current_version: existing[0] ? asNumber(existing[0].current_version, 1) + 1 : 1 };
  const row = existing[0] ? await patch("luna_preferences", scopedParams(workspace.id, "*", { id: `eq.${existing[0].id}`, limit: "1" }), values) : await insert("luna_preferences", { workspace_id: workspace.id, ...values });
  const result = mapPreference(row); const actor = input.actor ?? "knowledge-owner"; const action = existing[0] ? "UPDATED" : "CREATED";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "PREFERENCE", subjectId: result.id, currentVersion: result.currentVersion, action, actor, reason: input.reason, snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: `PREFERENCE_${action}`, subjectType: "PREFERENCE", subjectId: result.id, detail: { preferenceKind: result.preferenceKind, confidence: result.confidence, evidenceCount: result.evidenceCount } });
  return result;
}

export async function createOrUpdateLunaSelfModelFact(input: { userId: number; factKind: LunaSelfModelFact["factKind"]; facet: string; statement: string; confidence: number; evidenceCount?: number; status?: LunaSelfModelFact["status"]; actor?: string; reason: string }) {
  const workspace = await workspaceFor(input.userId); const facet = requiredText(input.facet, "Self-model facet", 1, 120); const statement = requiredText(input.statement, "Self-model statement", 1, 1_600);
  const existing = await rows("luna_self_model_facts", scopedParams(workspace.id, "*", { fact_kind: `eq.${input.factKind}`, facet: `eq.${facet}`, statement: `eq.${statement}`, limit: "1" }));
  const values = { fact_kind: input.factKind, facet, statement, confidence: boundedScore(input.confidence, "Self-model fact confidence"), evidence_count: boundedInt(input.evidenceCount ?? 0, 0, 100_000, "Self-model fact evidence count"), status: input.status ?? "ACTIVE", current_version: existing[0] ? asNumber(existing[0].current_version, 1) + 1 : 1 };
  const row = existing[0] ? await patch("luna_self_model_facts", scopedParams(workspace.id, "*", { id: `eq.${existing[0].id}`, limit: "1" }), values) : await insert("luna_self_model_facts", { workspace_id: workspace.id, ...values });
  const result = mapSelfFact(row); const actor = input.actor ?? "luna:self-model"; const action = existing[0] ? "UPDATED" : "CREATED";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "SELF_MODEL_FACT", subjectId: result.id, currentVersion: result.currentVersion, action, actor, reason: input.reason, snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: `SELF_MODEL_FACT_${action}`, subjectType: "SELF_MODEL_FACT", subjectId: result.id, detail: { factKind: result.factKind, facet: result.facet, confidence: result.confidence, evidenceCount: result.evidenceCount } });
  return result;
}

export async function addLunaSelfModelEvidence(input: { userId: number; selfFactId: string; sourceType: string; sourceId: string; cycleId?: string | null; confidence: number; actor?: string }) {
  const workspace = await workspaceFor(input.userId); await assertOwnedLunaTarget(workspace.id, "luna_self_model_facts", input.selfFactId, "Self-model fact");
  const sourceType = requiredText(input.sourceType, "Self-model evidence source type", 1, 80);
  const existing = await rows("luna_self_model_evidence", scopedParams(workspace.id, "*", { self_fact_id: `eq.${input.selfFactId}`, source_type: `eq.${sourceType}`, source_id: `eq.${input.sourceId}`, limit: "1" }));
  if (existing[0]) return { evidence: existing[0], created: false };
  const row = await insert("luna_self_model_evidence", { workspace_id: workspace.id, self_fact_id: input.selfFactId, source_type: sourceType, source_id: input.sourceId, cycle_id: input.cycleId ?? null, confidence: boundedScore(input.confidence, "Self-model evidence confidence") });
  const actor = input.actor ?? "luna:self-model";
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "SELF_MODEL_EVIDENCE_LINKED", subjectType: "SELF_MODEL_FACT", subjectId: input.selfFactId, detail: { sourceType: input.sourceType, sourceId: input.sourceId, confidence: input.confidence } });
  return { evidence: row, created: true };
}

export async function createOrUpdateLunaGoalProfile(input: { userId: number; goalId: string; origin: LunaGoalProfile["origin"]; importance: number; motivation?: string; deadlineAt?: string | null; successCriteria?: string; failureCriteria?: string; status?: LunaGoalProfile["status"]; actor?: string; reason: string }) {
  const workspace = await workspaceFor(input.userId); await assertOwnedLunaTarget(workspace.id, "luna_goals", input.goalId, "Goal profile goal");
  const existing = await rows("luna_goal_profiles", scopedParams(workspace.id, "*", { goal_id: `eq.${input.goalId}`, limit: "1" }));
  const values = { workspace_id: workspace.id, origin: input.origin, importance: boundedScore(input.importance, "Goal importance"), motivation: requiredText(input.motivation ?? "", "Goal motivation", 0, 1_600), deadline_at: input.deadlineAt ?? null, success_criteria: requiredText(input.successCriteria ?? "", "Goal success criteria", 0, 1_600), failure_criteria: requiredText(input.failureCriteria ?? "", "Goal failure criteria", 0, 1_600), status: input.status ?? "PROPOSED", current_version: existing[0] ? asNumber(existing[0].current_version, 1) + 1 : 1 };
  const row = existing[0] ? await patch("luna_goal_profiles", scopedParams(workspace.id, "*", { goal_id: `eq.${input.goalId}`, limit: "1" }), values) : await insert("luna_goal_profiles", { goal_id: input.goalId, ...values });
  const result = mapGoalProfile(row); const actor = input.actor ?? "knowledge-owner"; const action = existing[0] ? "UPDATED" : "CREATED";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "GOAL_PROFILE", subjectId: result.goalId, currentVersion: result.currentVersion, action, actor, reason: input.reason, snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: `GOAL_PROFILE_${action}`, subjectType: "GOAL_PROFILE", subjectId: result.goalId, detail: { origin: result.origin, importance: result.importance, status: result.status } });
  return result;
}

export async function createLunaCommitment(input: { userId: number; title: string; detail?: string; projectId?: string | null; goalId?: string | null; relationshipId?: string | null; dueAt?: string | null; confidence?: number; externalActionRequired?: boolean; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  if (input.projectId) await assertOwnedLunaTarget(workspace.id, "luna_projects", input.projectId, "Commitment project");
  if (input.goalId) await assertOwnedLunaTarget(workspace.id, "luna_goals", input.goalId, "Commitment goal");
  if (input.relationshipId) await assertOwnedLunaTarget(workspace.id, "luna_relationships", input.relationshipId, "Commitment relationship");
  const row = await insert("luna_commitments", { workspace_id: workspace.id, title: requiredText(input.title, "Commitment title", 1, 240), detail: requiredText(input.detail ?? "", "Commitment detail", 0, 1_600), project_id: input.projectId ?? null, goal_id: input.goalId ?? null, relationship_id: input.relationshipId ?? null, due_at: input.dueAt ?? null, confidence: boundedScore(input.confidence ?? 0.5, "Commitment confidence"), external_action_required: Boolean(input.externalActionRequired) });
  const result = mapCommitment(row); const actor = input.actor ?? "knowledge-owner";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "COMMITMENT", subjectId: result.id, currentVersion: result.currentVersion, action: "CREATED", actor, reason: "Commitment retained as a bounded, owner-scoped cognitive record.", snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "COMMITMENT_CREATED", subjectType: "COMMITMENT", subjectId: result.id, detail: { status: result.status, externalActionRequired: result.externalActionRequired } });
  return result;
}

export async function createLunaHypothesis(input: { userId: number; statement: string; plannedTest?: string; confidence?: number; projectId?: string | null; goalId?: string | null; gapId?: string | null; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const row = await insert("luna_hypotheses", { workspace_id: workspace.id, statement: requiredText(input.statement, "Hypothesis statement", 1, 1_600), planned_test: requiredText(input.plannedTest ?? "", "Hypothesis planned test", 0, 1_600), confidence: boundedScore(input.confidence ?? 0.5, "Hypothesis confidence"), project_id: input.projectId ?? null, goal_id: input.goalId ?? null, gap_id: input.gapId ?? null });
  const result = mapHypothesis(row); const actor = input.actor ?? "knowledge-owner";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "HYPOTHESIS", subjectId: result.id, currentVersion: result.currentVersion, action: "CREATED", actor, reason: "Hypothesis retained as a non-authoritative, testable proposition.", snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "HYPOTHESIS_CREATED", subjectType: "HYPOTHESIS", subjectId: result.id, detail: { confidence: result.confidence, status: result.status } });
  return result;
}

export async function createLunaPlanRevision(input: { userId: number; goalId?: string | null; missionId?: string | null; revisionKind: LunaPlanRevision["revisionKind"]; summary: string; reason: string; alternatives?: string[]; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const row = await insert("luna_plan_revisions", { workspace_id: workspace.id, goal_id: input.goalId ?? null, mission_id: input.missionId ?? null, revision_kind: input.revisionKind, summary: requiredText(input.summary, "Plan revision summary", 1, 1_600), reason: requiredText(input.reason, "Plan revision reason", 1, 1_600), alternatives: (input.alternatives ?? []).slice(0, 5).map(value => requiredText(value, "Plan alternative", 1, 600)) });
  const result = mapPlanRevision(row); const actor = input.actor ?? "luna:planner";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "PLAN_REVISION", subjectId: result.id, currentVersion: 1, action: result.revisionKind, actor, reason: result.reason, snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "PLAN_REVISION_CREATED", subjectType: "PLAN_REVISION", subjectId: result.id, missionId: result.missionId, detail: { goalId: result.goalId, revisionKind: result.revisionKind } });
  return result;
}

export async function createLunaWorkerPerformanceSnapshot(input: { userId: number; workerRole: LunaWorkerRole; workerId?: string | null; missionId?: string | null; outcome: LunaWorkerPerformanceSnapshot["outcome"]; durationMs?: number | null; strategy?: string; actor?: string }) {
  const workspace = await workspaceFor(input.userId); const duration = input.durationMs ?? null;
  if (duration !== null && (!Number.isFinite(duration) || duration < 0)) throw new Error("Worker performance duration must be non-negative.");
  const row = await insert("luna_worker_performance_snapshots", { workspace_id: workspace.id, worker_role: input.workerRole, worker_id: input.workerId ?? null, mission_id: input.missionId ?? null, outcome: input.outcome, duration_ms: duration, strategy: requiredText(input.strategy ?? "", "Worker strategy", 0, 1_000) });
  const result = mapWorkerPerformance(row); const actor = input.actor ?? "luna:learning";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "WORKER_PERFORMANCE", subjectId: result.id, currentVersion: 1, action: "RECORDED", actor, reason: "Worker outcome performance snapshot retained for bounded role-level learning.", snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "WORKER_PERFORMANCE_RECORDED", subjectType: "WORKER_PERFORMANCE", subjectId: result.id, missionId: result.missionId, workerId: result.workerId, detail: { workerRole: result.workerRole, outcome: result.outcome, durationMs: result.durationMs } });
  return result;
}


export async function createLunaGoalDependency(input: { userId: number; goalId: string; dependsOnGoalId: string; dependencyKind: LunaGoalDependency["dependencyKind"]; actor?: string }) {
  if (input.goalId === input.dependsOnGoalId) throw new Error("A goal cannot depend on itself.");
  const workspace = await workspaceFor(input.userId);
  await assertOwnedLunaTarget(workspace.id, "luna_goals", input.goalId, "Goal dependency goal");
  await assertOwnedLunaTarget(workspace.id, "luna_goals", input.dependsOnGoalId, "Goal dependency prerequisite");
  const existing = await rows("luna_goal_dependencies", scopedParams(workspace.id, "*", { goal_id: `eq.${input.goalId}`, depends_on_goal_id: `eq.${input.dependsOnGoalId}`, dependency_kind: `eq.${input.dependencyKind}`, limit: "1" }));
  if (existing[0]) return { dependency: mapGoalDependency(existing[0]), created: false };
  const row = await insert("luna_goal_dependencies", { workspace_id: workspace.id, goal_id: input.goalId, depends_on_goal_id: input.dependsOnGoalId, dependency_kind: input.dependencyKind });
  const result = mapGoalDependency(row); const actor = input.actor ?? "knowledge-owner";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "GOAL_DEPENDENCY", subjectId: result.id, currentVersion: 1, action: "CREATED", actor, reason: "A persisted goal dependency was added within the owner workspace.", snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "GOAL_DEPENDENCY_CREATED", subjectType: "GOAL_DEPENDENCY", subjectId: result.id, detail: { goalId: result.goalId, dependsOnGoalId: result.dependsOnGoalId, dependencyKind: result.dependencyKind } });
  return { dependency: result, created: true };
}

export async function createLunaGapLink(input: { userId: number; gapId: string; linkedType: string; linkedId: string; linkKind: "SOURCE" | "RELATED" | "MERGED_FROM" | "REOPENED_BY" | "BLOCKS" | "RESOLVES"; actor?: string }) {
  const workspace = await workspaceFor(input.userId); await assertOwnedLunaTarget(workspace.id, "luna_knowledge_gaps", input.gapId, "Gap link source");
  const linkedType = requiredText(input.linkedType, "Gap link target type", 1, 80);
  const existing = await rows("luna_gap_links", scopedParams(workspace.id, "*", { gap_id: `eq.${input.gapId}`, linked_type: `eq.${linkedType}`, linked_id: `eq.${input.linkedId}`, link_kind: `eq.${input.linkKind}`, limit: "1" }));
  if (existing[0]) return { link: existing[0], created: false };
  const row = await insert("luna_gap_links", { workspace_id: workspace.id, gap_id: input.gapId, linked_type: linkedType, linked_id: input.linkedId, link_kind: input.linkKind });
  const actor = input.actor ?? "luna:gap";
  await versionPreGame({ workspaceId: workspace.id, subjectType: "GAP_PROFILE", subjectId: input.gapId, currentVersion: await nextCognitiveVersion(workspace.id, "GAP_PROFILE", input.gapId), action: "LINKED", actor, reason: "An immutable evidence relationship was linked to the durable knowledge gap.", snapshot: asRecord(row) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "GAP_LINKED", subjectType: "GAP", subjectId: input.gapId, detail: { linkedType, linkedId: input.linkedId, linkKind: input.linkKind } });
  return { link: row, created: true };
}

async function ensureLunaGapProfile(workspaceId: string, userId: number, gapId: string, actor: string) {
  const profile = await rows("luna_gap_profiles", scopedParams(workspaceId, "*", { gap_id: `eq.${gapId}`, limit: "1" }));
  if (profile[0]) return mapGapProfile(profile[0]);
  return createOrUpdateLunaGapProfile({ userId, gapId, category: "UNKNOWN", confidence: 0.5, normalizedKey: `gap:${gapId}`, actor, reason: "Existing Luna gap received its first additive pre-game profile." });
}

export async function mergeLunaKnowledgeGaps(input: { userId: number; sourceGapId: string; canonicalGapId: string; reason: string; actor?: string }) {
  if (input.sourceGapId === input.canonicalGapId) throw new Error("A knowledge gap cannot be merged into itself.");
  const workspace = await workspaceFor(input.userId); const actor = input.actor ?? "knowledge-owner";
  await assertOwnedLunaTarget(workspace.id, "luna_knowledge_gaps", input.sourceGapId, "Source knowledge gap");
  await assertOwnedLunaTarget(workspace.id, "luna_knowledge_gaps", input.canonicalGapId, "Canonical knowledge gap");
  const source = await ensureLunaGapProfile(workspace.id, input.userId, input.sourceGapId, actor);
  const canonical = await ensureLunaGapProfile(workspace.id, input.userId, input.canonicalGapId, actor);
  if (source.status === "MERGED") throw new Error("The source knowledge gap is already merged and cannot be merged again.");
  if (canonical.status === "MERGED") throw new Error("A merged knowledge gap cannot become a canonical target.");
  await updateLunaKnowledgeGap({ userId: input.userId, gapId: input.sourceGapId, status: "DISMISSED", actor, reason: requiredText(input.reason, "Knowledge-gap merge reason", 3, 1_000), rationale: `Merged into canonical gap ${input.canonicalGapId}; source history remains retained.` });
  const updated = await createOrUpdateLunaGapProfile({ userId: input.userId, gapId: source.gapId, category: source.category, status: "MERGED", confidence: source.confidence, normalizedKey: source.normalizedKey, canonicalGapId: canonical.gapId, cooldownUntil: source.cooldownUntil, actor, reason: input.reason });
  await createLunaGapLink({ userId: input.userId, gapId: source.gapId, linkedType: "GAP", linkedId: canonical.gapId, linkKind: "MERGED_FROM", actor });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "GAP_MERGED", subjectType: "GAP", subjectId: source.gapId, detail: { canonicalGapId: canonical.gapId, sourceProfileVersion: updated.currentVersion } });
  return updated;
}

export async function reopenLunaKnowledgeGap(input: { userId: number; gapId: string; reason: string; actor?: string }) {
  const workspace = await workspaceFor(input.userId); const actor = input.actor ?? "knowledge-owner";
  await assertOwnedLunaTarget(workspace.id, "luna_knowledge_gaps", input.gapId, "Knowledge gap to reopen");
  const profile = await ensureLunaGapProfile(workspace.id, input.userId, input.gapId, actor);
  if (profile.status === "MERGED") throw new Error("A merged gap must be represented by its canonical gap rather than reopened independently.");
  if (!["RESOLVED", "DISMISSED", "EXPIRED"].includes(profile.status)) throw new Error("Only resolved, dismissed, or expired knowledge gaps may be reopened.");
  await updateLunaKnowledgeGap({ userId: input.userId, gapId: input.gapId, status: "OPEN", actor, reason: requiredText(input.reason, "Knowledge-gap reopen reason", 3, 1_000), rationale: "Reopened after a new source-backed condition; prior resolution history remains retained." });
  const updated = await createOrUpdateLunaGapProfile({ userId: input.userId, gapId: profile.gapId, category: profile.category, status: "OPEN", confidence: profile.confidence, normalizedKey: profile.normalizedKey, reopenedFromId: profile.reopenedFromId, cooldownUntil: null, actor, reason: input.reason });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "GAP_REOPENED", subjectType: "GAP", subjectId: profile.gapId, detail: { profileVersion: updated.currentVersion } });
  return updated;
}


/**
 * Retires only an explicitly labelled pre-game production acceptance fixture.
 * Immutable inputs, experiences, focus history, versions, audit events, and reports remain retained.
 */
export async function retireLunaPreGameAcceptanceFixture(input: { userId: number; inputId: string; reason: string; actor?: string }) {
  const workspace = await workspaceFor(input.userId); const actor = input.actor ?? "knowledge-owner";
  const sourceRows = await rows("luna_cognitive_inputs", scopedParams(workspace.id, "*", { id: `eq.${input.inputId}`, limit: "1" }));
  if (!sourceRows[0]) throw new Error("The requested acceptance fixture input is unavailable in this owner workspace.");
  const source = mapCognitiveInput(sourceRows[0]);
  if (!source.summary.includes("PRE_GAME_ACCEPTANCE_20260828")) throw new Error("Only the explicitly labelled pre-game acceptance fixture may be retired through this control.");
  const reason = requiredText(input.reason, "Acceptance fixture retirement reason", 3, 1_000);
  const state = await listLunaPreGameCognitiveSnapshot(input.userId);
  const experience = state.experiences.find(item => item.inputId === source.id) ?? null;
  let suppressedAttention = 0; let dismissedGaps = 0; let dismissedCuriosity = 0; let resolvedUncertainty = 0;
  if (experience) {
    for (const attention of state.attentionAssessments.filter(item => item.sourceId === experience.id && item.state === "ACTIVE")) {
      await createOrUpdateLunaAttentionAssessment({ userId: input.userId, sourceType: attention.sourceType, sourceId: attention.sourceId, targetType: attention.targetType, targetId: attention.targetId, severity: attention.severity, score: attention.score, factors: attention.factors, state: "SUPPRESSED", focusTier: null, suppressionReason: "Temporary pre-game production acceptance fixture retired; immutable evidence remains retained.", expiresAt: attention.expiresAt, actor, reason });
      suppressedAttention += 1;
    }
    for (const uncertainty of state.uncertaintyRecords.filter(item => item.targetType === "EXPERIENCE" && item.targetId === experience.id && item.status === "OPEN")) {
      await createOrUpdateLunaUncertainty({ userId: input.userId, targetType: uncertainty.targetType, targetId: uncertainty.targetId, score: uncertainty.score, importance: uncertainty.importance, evidenceBasis: uncertainty.evidenceBasis, status: "RESOLVED", provenance: { ...uncertainty.provenance, retiredFixtureInputId: source.id }, actor, reason });
      resolvedUncertainty += 1;
    }
  }
  const gapRows = await rows("luna_knowledge_gaps", scopedParams(workspace.id, "*", { limit: String(MAX_LIST) }));
  const matchingGapIds = gapRows.filter(row => String(asRecord(row.provenance).sourceInputId ?? "") === source.id && String(row.status) !== "DISMISSED").map(row => String(row.id));
  for (const gapId of matchingGapIds) {
    await updateLunaKnowledgeGap({ userId: input.userId, gapId, status: "DISMISSED", actor, reason, rationale: "Temporary pre-game production acceptance fixture retired; immutable source and audit history remain retained." });
    const profile = state.gapProfiles.find(item => item.gapId === gapId);
    if (profile) await createOrUpdateLunaGapProfile({ userId: input.userId, gapId, category: profile.category, status: "DISMISSED", confidence: profile.confidence, normalizedKey: profile.normalizedKey, canonicalGapId: profile.canonicalGapId, reopenedFromId: profile.reopenedFromId, cooldownUntil: profile.cooldownUntil, actor, reason });
    dismissedGaps += 1;
  }
  for (const curiosity of state.curiosityAssessments.filter(item => matchingGapIds.includes(item.gapId ?? "") && ["CANDIDATE", "INTERESTING", "QUEUED", "INVESTIGATING"].includes(item.status))) {
    await createOrUpdateLunaCuriosityAssessment({ userId: input.userId, candidateId: curiosity.candidateId, gapId: curiosity.gapId, triggerType: curiosity.triggerType, triggerId: curiosity.triggerId, expectedInformationValue: curiosity.expectedInformationValue, noveltyScore: curiosity.noveltyScore, importance: curiosity.importance, status: "DISMISSED", cooldownUntil: curiosity.cooldownUntil, expiresAt: curiosity.expiresAt, cycleId: curiosity.cycleId, rationale: curiosity.rationale, actor, reason });
    dismissedCuriosity += 1;
  }
  const fresh = await listLunaPreGameCognitiveSnapshot(input.userId);
  const allocations = allocateLunaFocus(fresh.attentionAssessments.filter(item => item.state === "ACTIVE"));
  const focusAssignments = await replaceLunaFocusAssignments({ userId: input.userId, assignments: allocations.map(allocation => {
    const attention = fresh.attentionAssessments.find(item => item.id === allocation.attentionId);
    if (!attention) throw new Error("Active attention source disappeared while retiring the acceptance fixture.");
    return { attentionId: attention.id, targetType: attention.targetType, targetId: attention.targetId, tier: allocation.tier, rank: allocation.rank, score: allocation.score };
  }), actor });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "PRE_GAME_ACCEPTANCE_FIXTURE_RETIRED", subjectType: "COGNITIVE_INPUT", subjectId: source.id, detail: { suppressedAttention, resolvedUncertainty, dismissedGaps, dismissedCuriosity, replacementFocusAssignments: focusAssignments.length, immutableHistoryRetained: true } });
  return { input: source, suppressedAttention, resolvedUncertainty, dismissedGaps, dismissedCuriosity, focusAssignments: focusAssignments.length };
}


function mapSelfModificationRun(row: Record<string, unknown>): SelfModificationRun {
  return {
    id: String(row.id), workspaceId: String(row.workspace_id), objective: String(row.objective), reason: String(row.reason),
    status: row.status as SelfModificationRun["status"], previousVersion: asString(row.previous_version), candidateVersion: asString(row.candidate_version),
    rollbackAvailable: asBoolean(row.rollback_available), limits: asRecord(row.limits), safetyResult: asRecord(row.safety_result), deploymentResult: asRecord(row.deployment_result), rollbackResult: asRecord(row.rollback_result), outcome: asString(row.outcome), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}
function mapSelfModificationFile(row: Record<string, unknown>): SelfModificationFile {
  return { id: String(row.id), workspaceId: String(row.workspace_id), runId: String(row.run_id), path: String(row.path), beforeSha256: asString(row.before_sha256), afterSha256: asString(row.after_sha256), beforeContent: asString(row.before_content), afterContent: asString(row.after_content), diff: asString(row.diff), protected: asBoolean(row.protected), createdAt: String(row.created_at) };
}
function mapSelfModificationTest(row: Record<string, unknown>): SelfModificationTest {
  return { id: String(row.id), workspaceId: String(row.workspace_id), runId: String(row.run_id), testName: String(row.test_name), status: row.status as SelfModificationTest["status"], output: String(row.output ?? ""), durationMs: asNumber(row.duration_ms), createdAt: String(row.created_at) };
}

export async function listLunaSelfModificationRuns(userId: number, limit = 20) {
  const workspace = await workspaceFor(userId);
  const runs = (await rows("luna_self_modification_runs", scopedParams(workspace.id, "*", { order: "created_at.desc", limit: String(Math.min(Math.max(limit, 1), 50)) }))).map(mapSelfModificationRun);
  const details = await Promise.all(runs.map(async run => {
    const [files, tests] = await Promise.all([
      rows("luna_self_modification_files", scopedParams(workspace.id, "*", { run_id: `eq.${run.id}`, order: "path.asc", limit: "50" })),
      rows("luna_self_modification_tests", scopedParams(workspace.id, "*", { run_id: `eq.${run.id}`, order: "created_at.desc", limit: "50" })),
    ]);
    return { ...run, files: files.map(mapSelfModificationFile), tests: tests.map(mapSelfModificationTest) };
  }));
  return details;
}

export async function createLunaSelfModificationRun(input: { userId: number; objective: string; reason: string; previousVersion?: string | null; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const row = await insert("luna_self_modification_runs", { workspace_id: workspace.id, objective: requiredText(input.objective, "Self-modification objective", 12, 4_000), reason: requiredText(input.reason, "Self-modification reason", 1, 4_000), status: "PROPOSED", previous_version: input.previousVersion ?? null, limits: { maxGenerationAttempts: 3, maxTestAttempts: 2, maxExecutionMs: 120000, maxModelCalls: 3, maxTokenBudget: 24000, maxConcurrentJobs: 1 }, safety_result: { passed: false, deploymentAuthorized: false, status: "PENDING_EXTERNAL_GATE" }, deployment_result: { status: "BLOCKED_EXTERNAL_GATE_UNAVAILABLE" }, rollback_result: { status: "AVAILABLE", automatic: false }, outcome: "Candidate generation is not yet executed." });
  const result = mapSelfModificationRun(row); const actor = input.actor ?? "luna:self-modification";
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "SELF_MODIFICATION_PROPOSED", subjectType: "SELF_MODIFICATION", subjectId: result.id, detail: { objective: result.objective, status: result.status, deploymentAuthorized: false } });
  return result;
}

export async function appendLunaSelfModificationFiles(input: { userId: number; runId: string; files: Array<{ path: string; beforeSha256?: string | null; afterSha256?: string | null; beforeContent?: string | null; afterContent?: string | null; diff?: string | null; protected?: boolean }>; actor?: string }) {
  const workspace = await workspaceFor(input.userId); await assertOwnedLunaTarget(workspace.id, "luna_self_modification_runs", input.runId, "Self-modification run");
  if (input.files.length > 12) throw new Error("Self-modification candidate exceeds the bounded file limit.");
  const results: SelfModificationFile[] = [];
  for (const file of input.files) { const row = await insert("luna_self_modification_files", { workspace_id: workspace.id, run_id: input.runId, path: requiredText(file.path, "Candidate file path", 1, 400), before_sha256: file.beforeSha256 ?? null, after_sha256: file.afterSha256 ?? null, before_content: file.beforeContent ?? null, after_content: file.afterContent ?? null, diff: file.diff ?? null, protected: Boolean(file.protected) }); results.push(mapSelfModificationFile(row)); }
  await cognitiveAudit({ workspaceId: workspace.id, actor: input.actor ?? "luna:self-modification", action: "SELF_MODIFICATION_FILES_RECORDED", subjectType: "SELF_MODIFICATION", subjectId: input.runId, detail: { fileCount: results.length } });
  return results;
}

export async function appendLunaSelfModificationTest(input: { userId: number; runId: string; testName: string; status: SelfModificationTest["status"]; output?: string; durationMs?: number; actor?: string }) {
  const workspace = await workspaceFor(input.userId); await assertOwnedLunaTarget(workspace.id, "luna_self_modification_runs", input.runId, "Self-modification run");
  const row = await insert("luna_self_modification_tests", { workspace_id: workspace.id, run_id: input.runId, test_name: requiredText(input.testName, "Self-modification test name", 1, 240), status: input.status, output: (input.output ?? "").slice(0, 20_000), duration_ms: boundedInt(input.durationMs ?? 0, 0, 900_000, "Self-modification test duration") });
  return mapSelfModificationTest(row);
}
