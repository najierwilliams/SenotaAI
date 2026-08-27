import type {
  LunaAttentionItem,
  LunaClaim,
  LunaClaimEvidence,
  LunaClaimEvidenceRole,
  LunaClaimLifecycleState,
  LunaClaimRevision,
  LunaCognitiveState,
  LunaGoal,
  LunaGoalStatus,
  LunaMemory,
  LunaMemoryKind,
  LunaMission,
  LunaMissionStatus,
  LunaProject,
  LunaProjectStatus,
  LunaSelfState,
  LunaTask,
  LunaTaskStatus,
  LunaToolCall,
  LunaTruthState,
  LunaWorker,
  LunaWorkerRole,
  LunaWorkerState,
} from "@shared/lunaCognitive";
import { isLunaRoutineOwnedTruth, isLunaScientificElevation, workerContract } from "@shared/lunaCognitive";
import { getOrCreateKnowledgeWorkspace } from "../knowledgeSpace/supabase";

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
  return { id: String(row.id), workspaceId: String(row.workspace_id), projectId: asString(row.project_id), goalId: asString(row.goal_id), objective: String(row.objective), status: row.status as LunaMissionStatus, autonomyMode: row.autonomy_mode as LunaMission["autonomyMode"], priority: asNumber(row.priority, 3), currentFocus: asString(row.current_focus), rootTaskId: asString(row.root_task_id), maxWorkers: asNumber(row.max_workers, 4), maxSteps: asNumber(row.max_steps, 24), maxRetries: asNumber(row.max_retries, 2), maxDurationSeconds: asNumber(row.max_duration_seconds, 900), maxModelRequests: asNumber(row.max_model_requests, 12), maxTokenBudget: asNumber(row.max_token_budget, 24_000), modelRequestsUsed: asNumber(row.model_requests_used), tokenUsage: asNumber(row.token_usage), pauseRequested: asBoolean(row.pause_requested), cancelRequested: asBoolean(row.cancel_requested), runtimeRunId: asString(row.runtime_run_id), resumeAfter: asString(row.resume_after), startedAt: asString(row.started_at), finishedAt: asString(row.finished_at), errorMessage: asString(row.error_message), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
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

export async function getOrCreateLunaSelfState(userId: number): Promise<{ self: LunaSelfState; autonomyEnabled: boolean; maintenanceEnabled: boolean }> {
  const workspace = await workspaceFor(userId);
  const params = scopedParams(workspace.id, "*", { limit: "1" });
  const existing = await rows("luna_cognitive_state", params);
  let row = existing[0];
  let initialized = false;
  if (!row) {
    try {
      row = await insert("luna_cognitive_state", {
        workspace_id: workspace.id, owner_scope: workspace.ownerScope,
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
  return { self: mapSelf(row), autonomyEnabled: asBoolean(row.autonomy_enabled), maintenanceEnabled: asBoolean(row.maintenance_enabled) };
}

export async function updateLunaSelfState(input: { userId: number; currentFocus?: string | null; autonomyEnabled?: boolean; maintenanceEnabled?: boolean; identitySummary?: string; capabilities?: string[]; limitations?: string[]; uncertaintySummary?: string; reason: string; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const current = await getOrCreateLunaSelfState(input.userId);
  const patchValues: Record<string, unknown> = { current_version: current.self.currentVersion + 1 };
  if (input.currentFocus !== undefined) patchValues.current_focus = input.currentFocus;
  if (input.autonomyEnabled !== undefined) patchValues.autonomy_enabled = input.autonomyEnabled;
  if (input.maintenanceEnabled !== undefined) patchValues.maintenance_enabled = input.maintenanceEnabled;
  if (input.identitySummary !== undefined) patchValues.identity_summary = requiredText(input.identitySummary, "Identity summary", 4, 4_000);
  if (input.capabilities !== undefined) patchValues.capabilities = input.capabilities.map(item => requiredText(item, "Capability", 1, 400)).slice(0, 30);
  if (input.limitations !== undefined) patchValues.limitations = input.limitations.map(item => requiredText(item, "Limitation", 1, 400)).slice(0, 30);
  if (input.uncertaintySummary !== undefined) patchValues.uncertainty_summary = requiredText(input.uncertaintySummary, "Uncertainty summary", 4, 4_000);
  const result = await patch("luna_cognitive_state", scopedParams(workspace.id, "*", { limit: "1" }), patchValues);
  const actor = input.actor ?? workspace.ownerScope;
  await cognitiveVersion({ workspaceId: workspace.id, subjectType: "STATE", subjectId: workspace.id, version: asNumber(result.current_version, 2), action: "UPDATED", actor, reason: requiredText(input.reason, "State change reason", 3, 1_000), snapshot: asRecord(result) });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "COGNITIVE_STATE_UPDATED", subjectType: "STATE", subjectId: workspace.id, detail: { before: current, after: mapSelf(result) } });
  return { self: mapSelf(result), autonomyEnabled: asBoolean(result.autonomy_enabled), maintenanceEnabled: asBoolean(result.maintenance_enabled) };
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

export async function createLunaMission(input: { userId: number; objective: string; projectId?: string | null; goalId?: string | null; autonomyMode?: LunaMission["autonomyMode"]; priority?: number; maxWorkers?: number; maxSteps?: number; maxRetries?: number; maxDurationSeconds?: number; maxModelRequests?: number; maxTokenBudget?: number; idempotencyKey: string; actor?: string }) {
  const workspace = await workspaceFor(input.userId);
  const row = await insert("luna_missions", { workspace_id: workspace.id, owner_scope: workspace.ownerScope, project_id: input.projectId ?? null, goal_id: input.goalId ?? null, objective: requiredText(input.objective, "Mission objective", 1, 12_000), autonomy_mode: input.autonomyMode ?? "ON_DEMAND", priority: boundedInt(input.priority ?? 3, 1, 5, "Mission priority"), max_workers: boundedInt(input.maxWorkers ?? 4, 1, 12, "Maximum worker count"), max_steps: boundedInt(input.maxSteps ?? 24, 1, 100, "Maximum step count"), max_retries: boundedInt(input.maxRetries ?? 2, 0, 5, "Maximum retry count"), max_duration_seconds: boundedInt(input.maxDurationSeconds ?? 900, 10, 3600, "Maximum duration"), max_model_requests: boundedInt(input.maxModelRequests ?? 12, 0, 100, "Maximum model request count"), max_token_budget: boundedInt(input.maxTokenBudget ?? 24_000, 0, 1_000_000, "Maximum token budget"), idempotency_key: requiredText(input.idempotencyKey, "Mission idempotency key", 8, 200) });
  const mission = mapMission(row); const actor = input.actor ?? "luna:orchestrator";
  await cognitiveVersion({ workspaceId: workspace.id, subjectType: "MISSION", subjectId: mission.id, version: 1, action: "CREATED", actor, reason: "Mission created.", snapshot: asRecord(row), missionId: mission.id });
  await cognitiveAudit({ workspaceId: workspace.id, actor, action: "MISSION_CREATED", subjectType: "MISSION", subjectId: mission.id, missionId: mission.id, detail: { autonomyMode: mission.autonomyMode, budgets: { maxWorkers: mission.maxWorkers, maxSteps: mission.maxSteps, maxModelRequests: mission.maxModelRequests, maxTokenBudget: mission.maxTokenBudget } } });
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

export function calculateLunaCognitiveState(input: { self: LunaSelfState; autonomyEnabled: boolean; maintenanceEnabled: boolean; missions: LunaMission[]; workers: LunaWorker[]; tasks: LunaTask[]; attention: LunaAttentionItem[] }): LunaCognitiveState {
  const activeMissionCount = input.missions.filter(item => ["QUEUED", "PLANNING", "RUNNING", "WAITING_FOR_PROVIDER", "WAITING_FOR_RUNTIME"].includes(item.status)).length;
  const activeWorkerCount = input.workers.filter(item => ["QUEUED", "RUNNING", "WAITING"].includes(item.state)).length;
  const queuedTaskCount = input.tasks.filter(item => ["PENDING", "ELIGIBLE", "IN_PROGRESS"].includes(item.status)).length;
  const attentionCount = input.attention.filter(item => item.state === "OPEN").length;
  const health = input.attention.some(item => item.state === "OPEN" && item.severity === "ACTION_REQUIRED") ? "ACTION_REQUIRED" : input.missions.some(item => item.status === "FAILED" || item.status === "RECOVERY_REQUIRED") ? "DEGRADED" : "HEALTHY";
  return { workspaceId: input.self.workspaceId, self: input.self, autonomyEnabled: input.autonomyEnabled, maintenanceEnabled: input.maintenanceEnabled, activeMissionCount, activeWorkerCount, queuedTaskCount, attentionCount, health, updatedAt: input.self.updatedAt };
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
  const [memories, claims, claimEvidence, claimRevisions, projects, goals, tasks, missions, workers, attention, reflections, recoveries, activity] = await Promise.all([
    listLunaMemories(userId), listLunaClaims(userId), listLunaClaimEvidence(userId), listLunaClaimRevisions(userId), listLunaProjects(userId), listLunaGoals(userId), listLunaTasks(userId), listLunaMissions(userId), listLunaWorkers(userId), listLunaAttention(userId), listLunaReflections(userId), listLunaRecoveries(userId), listLunaActivity(userId),
  ]);
  return { state: calculateLunaCognitiveState({ self: self.self, autonomyEnabled: self.autonomyEnabled, maintenanceEnabled: self.maintenanceEnabled, missions, workers, tasks, attention }), memories, claims, claimEvidence, claimRevisions, projects, goals, tasks, missions, workers, attention, reflections, recoveries, activity };
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
