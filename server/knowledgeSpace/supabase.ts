import { randomUUID } from "node:crypto";
import type {
  KnowledgeApproval,
  KnowledgeAuditEvent,
  KnowledgeAutonomyLevel,
  KnowledgeGraph,
  KnowledgeHealth,
  KnowledgeMission,
  KnowledgeMissionActivity,
  KnowledgeMissionState,
  KnowledgeObject,
  KnowledgeObjectStatus,
  KnowledgeObjectType,
  KnowledgePlacement,
  KnowledgePlacementKind,
  KnowledgeProvenance,
  KnowledgeRelationship,
  KnowledgeRelationshipType,
  KnowledgeScientificMetadata,
  KnowledgeSourceType,
  KnowledgeTruthState,
  KnowledgeVersion,
  KnowledgeWorkspace,
  KnowledgeWorkspaceSnapshot,
  KnowledgeWorkerRole,
} from "@shared/knowledgeSpace";

const KNOWLEDGE_TABLE = "luna_knowledge_objects";
const MAX_OBJECTS = 500;
const MAX_RELATIONSHIPS = 1_000;
const MAX_ACTIVITY = 250;

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

export function isKnowledgeSpaceCloudReady(): boolean {
  return Boolean(config());
}

function requireConfig() {
  const current = config();
  if (!current) {
    throw new Error(
      "Knowledge Space persistence is unavailable because the server-only Supabase configuration is not present.",
    );
  }
  return current;
}

function ownerScope(userId: number): string {
  return `senota-user-${userId}`;
}

function scalar(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function arrayValue(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

async function request<T = Record<string, unknown>[]>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
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
    throw new Error(
      `Knowledge Space storage request failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`,
    );
  }
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

function mapWorkspace(row: Record<string, unknown>): KnowledgeWorkspace {
  return {
    id: String(row.id),
    title: String(row.title),
    ownerScope: String(row.owner_scope),
    autonomyLevel: row.autonomy_level as KnowledgeAutonomyLevel,
    autonomyPaused: Boolean(row.autonomy_paused),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapObject(row: Record<string, unknown>): KnowledgeObject {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    objectType: row.object_type as KnowledgeObjectType,
    title: String(row.title),
    description: String(row.description ?? ""),
    content: String(row.content ?? ""),
    sourceType: row.source_type as KnowledgeSourceType,
    truthState: row.truth_state as KnowledgeTruthState,
    status: row.status as KnowledgeObjectStatus,
    tags: arrayValue(row.tags),
    scientificMetadata: objectValue(row.scientific_metadata) as KnowledgeScientificMetadata,
    provenance: objectValue(row.provenance) as KnowledgeProvenance,
    immutableProviderSnapshot: Boolean(row.immutable_provider_snapshot),
    currentVersion: Number(row.current_version),
    isPinned: Boolean(row.is_pinned),
    isFavorite: Boolean(row.is_favorite),
    deletedAt: scalar(row.deleted_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapPlacement(row: Record<string, unknown>): KnowledgePlacement {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    objectId: String(row.object_id),
    parentObjectId: scalar(row.parent_object_id),
    placementKind: row.placement_kind as KnowledgePlacementKind,
    label: scalar(row.label),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapRelationship(row: Record<string, unknown>): KnowledgeRelationship {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    sourceObjectId: String(row.source_object_id),
    targetObjectId: String(row.target_object_id),
    relationshipType: row.relationship_type as KnowledgeRelationshipType,
    sourceType: row.source_type as KnowledgeSourceType,
    truthState: row.truth_state as KnowledgeTruthState,
    confidence: numeric(row.confidence),
    evidence: objectValue(row.evidence),
    provenance: objectValue(row.provenance) as KnowledgeProvenance,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapVersion(row: Record<string, unknown>): KnowledgeVersion {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    objectId: String(row.object_id),
    version: Number(row.version),
    action: row.action as KnowledgeVersion["action"],
    changedBy: String(row.changed_by),
    reason: String(row.reason ?? ""),
    snapshot: objectValue(row.snapshot),
    createdAt: String(row.created_at),
  };
}

function mapMission(row: Record<string, unknown>): KnowledgeMission {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    targetObjectId: scalar(row.target_object_id),
    workerRole: row.worker_role as KnowledgeWorkerRole,
    objective: String(row.objective),
    state: row.state as KnowledgeMissionState,
    autonomyLevel: row.autonomy_level as KnowledgeAutonomyLevel,
    maxSteps: Number(row.max_steps),
    maxRetries: Number(row.max_retries),
    maxDurationSeconds: Number(row.max_duration_seconds),
    maxSpawnedWorkers: Number(row.max_spawned_workers),
    currentStep: Number(row.current_step),
    retryCount: Number(row.retry_count),
    stopRequested: Boolean(row.stop_requested),
    reportObjectId: scalar(row.report_object_id),
    errorMessage: scalar(row.error_message),
    startedAt: scalar(row.started_at),
    finishedAt: scalar(row.finished_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapActivity(row: Record<string, unknown>): KnowledgeMissionActivity {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    missionId: String(row.mission_id),
    workerRole: row.worker_role as KnowledgeWorkerRole,
    eventType: String(row.event_type),
    message: String(row.message),
    detail: objectValue(row.detail),
    createdAt: String(row.created_at),
  };
}

function mapApproval(row: Record<string, unknown>): KnowledgeApproval {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    missionId: scalar(row.mission_id),
    targetObjectId: scalar(row.target_object_id),
    actionType: String(row.action_type),
    status: row.status as KnowledgeApproval["status"],
    title: String(row.title),
    rationale: String(row.rationale ?? ""),
    sourceSummary: String(row.source_summary ?? ""),
    confidence: numeric(row.confidence),
    requestedAt: String(row.requested_at),
    resolvedAt: scalar(row.resolved_at),
  };
}

function mapAudit(row: Record<string, unknown>): KnowledgeAuditEvent {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    actorScope: String(row.actor_scope),
    action: String(row.action),
    subjectType: String(row.subject_type),
    subjectId: scalar(row.subject_id),
    missionId: scalar(row.mission_id),
    detail: objectValue(row.detail),
    createdAt: String(row.created_at),
  };
}

async function insert<T>(table: string, values: Record<string, unknown>): Promise<T> {
  const rows = await request<Record<string, unknown>[]>(table, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(values),
  });
  if (!rows[0]) throw new Error(`Knowledge Space could not create ${table}.`);
  return rows[0] as T;
}

async function update<T>(
  table: string,
  query: URLSearchParams,
  values: Record<string, unknown>,
): Promise<T> {
  const rows = await request<Record<string, unknown>[]>(`${table}?${query.toString()}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(values),
  });
  if (!rows[0]) throw new Error("Knowledge Space record was not found or is outside this workspace.");
  return rows[0] as T;
}

function scopeParams(
  workspaceId: string,
  select: string,
  extra: Record<string, string> = {},
): URLSearchParams {
  const params = new URLSearchParams({ select, workspace_id: `eq.${workspaceId}`, ...extra });
  return params;
}

async function audit(
  workspaceId: string,
  actor: string,
  action: string,
  subjectType: string,
  subjectId: string | null,
  detail: Record<string, unknown> = {},
  missionId: string | null = null,
): Promise<void> {
  await insert("luna_knowledge_audit_events", {
    workspace_id: workspaceId,
    actor_scope: actor,
    action,
    subject_type: subjectType,
    subject_id: subjectId,
    mission_id: missionId,
    detail,
  });
}

async function writeVersion(
  object: KnowledgeObject,
  action: KnowledgeVersion["action"],
  actor: string,
  reason: string,
): Promise<void> {
  await insert("luna_knowledge_versions", {
    workspace_id: object.workspaceId,
    object_id: object.id,
    version: object.currentVersion,
    action,
    changed_by: actor,
    reason,
    snapshot: {
      objectType: object.objectType,
      title: object.title,
      description: object.description,
      content: object.content,
      sourceType: object.sourceType,
      truthState: object.truthState,
      status: object.status,
      tags: object.tags,
      scientificMetadata: object.scientificMetadata,
      provenance: object.provenance,
      immutableProviderSnapshot: object.immutableProviderSnapshot,
      isPinned: object.isPinned,
      isFavorite: object.isFavorite,
      deletedAt: object.deletedAt,
    },
  });
}

async function listRows(
  table: string,
  params: URLSearchParams,
): Promise<Record<string, unknown>[]> {
  return request<Record<string, unknown>[]>(`${table}?${params.toString()}`);
}

async function getObjectInWorkspace(
  workspaceId: string,
  objectId: string,
  includeTrashed = true,
): Promise<KnowledgeObject | null> {
  const params = scopeParams(workspaceId, "*");
  params.set("id", `eq.${objectId}`);
  if (!includeTrashed) params.set("deleted_at", "is.null");
  params.set("limit", "1");
  const rows = await listRows(KNOWLEDGE_TABLE, params);
  return rows[0] ? mapObject(rows[0]) : null;
}

async function createSeedObject(
  workspace: KnowledgeWorkspace,
  input: {
    objectType: KnowledgeObjectType;
    title: string;
    description?: string;
    content?: string;
    sourceType?: KnowledgeSourceType;
    truthState?: KnowledgeTruthState;
    immutableProviderSnapshot?: boolean;
    scientificMetadata?: KnowledgeScientificMetadata;
    provenance?: KnowledgeProvenance;
  },
): Promise<KnowledgeObject> {
  const row = await insert<Record<string, unknown>>(KNOWLEDGE_TABLE, {
    workspace_id: workspace.id,
    owner_scope: workspace.ownerScope,
    object_type: input.objectType,
    title: input.title,
    description: input.description ?? "",
    content: input.content ?? "",
    source_type: input.sourceType ?? "USER_NOTE",
    truth_state: input.truthState ?? "USER_APPROVED",
    status: "ACTIVE",
    tags: [],
    scientific_metadata: input.scientificMetadata ?? {},
    provenance: input.provenance ?? {},
    immutable_provider_snapshot: input.immutableProviderSnapshot ?? false,
    current_version: 1,
    is_pinned: false,
    is_favorite: false,
  });
  return mapObject(row);
}

async function seedWorkspace(workspace: KnowledgeWorkspace): Promise<void> {
  const actor = workspace.ownerScope;
  const folders = await Promise.all([
    "Brain",
    "Research",
    "Datasets",
    "Nanobot Work",
    "Needs Attention",
  ].map((title) => createSeedObject(workspace, {
    objectType: "FOLDER",
    title,
    description: `${title} organizational container. References appear here without duplicating their underlying knowledge object.`,
    sourceType: "USER_NOTE",
    truthState: "USER_APPROVED",
  })));
  const folderByTitle = new Map(folders.map((folder) => [folder.title, folder]));
  const hippocampus = await createSeedObject(workspace, {
    objectType: "SCIENTIFIC_STRUCTURE",
    title: "Hippocampus",
    description: "A Knowledge Space structure record linked to the existing HRA/UBERON review context. The Luna visual mesh remains a presentation model, not an MNI coordinate source.",
    content: "MNI registration for the checksum-pinned HRA visual GLB is NOT_ESTABLISHED. Julich ontology mapping remains independently UNMAPPED unless an authoritative crosswalk is published.",
    sourceType: "PROVIDER_DATA",
    truthState: "USER_APPROVED",
    immutableProviderSnapshot: true,
    scientificMetadata: {
      provider: "HuBMAP Human Reference Atlas",
      dataset: "Brain-Female v1.1",
      datasetVersion: "v1.1",
      referenceSpace: "HRA Brain-Female visual reference object; not MNI",
      evidenceTier: "source-preserving reviewed context",
      sourceUrl: "https://purl.humanatlas.io/ref-organ/brain-female/v1.1",
    },
    provenance: {
      provider: "HuBMAP HRA",
      sourceUrl: "https://purl.humanatlas.io/ref-organ/brain-female/v1.1",
      datasetVersion: "Brain-Female v1.1",
      note: "Seeded as a read-only local Knowledge Space reference to existing application evidence; it does not create an HRA-to-MNI relation.",
    },
  });
  const julich = await createSeedObject(workspace, {
    objectType: "DATASET",
    title: "Julich-Brain v3.1",
    description: "Provider dataset context. Structure identity mapping and coordinate registration remain distinct.",
    sourceType: "PROVIDER_DATA",
    truthState: "PROVIDER_CONFIRMED",
    immutableProviderSnapshot: true,
    scientificMetadata: {
      provider: "EBRAINS / siibra",
      dataset: "Julich-Brain",
      datasetVersion: "v3.1",
      referenceSpace: "MNI ICBM 152 2009c Nonlinear Asymmetric (provider context)",
      license: "CC BY-NC-SA 4.0",
      sourceUrl: "https://search.kg.ebrains.eu/instances/Parcellation/",
    },
    provenance: {
      provider: "EBRAINS / siibra",
      datasetVersion: "v3.1",
      note: "Seeded from the released provider context. A direct provider query requires an independently supplied MNI 2009c millimetre coordinate.",
    },
  });
  const mni = await createSeedObject(workspace, {
    objectType: "REFERENCE",
    title: "MNI ICBM 152 2009c Nonlinear Asymmetric",
    description: "Required target reference for independent provider context; no Luna-native registration is established.",
    sourceType: "PUBLISHED_EVIDENCE",
    truthState: "PROVIDER_CONFIRMED",
    immutableProviderSnapshot: true,
    scientificMetadata: {
      provider: "McConnell Brain Imaging Centre",
      dataset: "ICBM 152 Nonlinear Atlas",
      datasetVersion: "2009c nonlinear asymmetric",
      referenceSpace: "MNI ICBM 152 2009c Nonlinear Asymmetric",
      sourceUrl: "https://www.bic.mni.mcgill.ca/ServicesAtlases/ICBM152NLin2009",
    },
    provenance: {
      provider: "MNI/BIC",
      sourceUrl: "https://www.bic.mni.mcgill.ca/ServicesAtlases/ICBM152NLin2009",
      datasetVersion: "2009c nonlinear asymmetric",
    },
  });
  const question = await createSeedObject(workspace, {
    objectType: "RESEARCH_QUESTION",
    title: "What evidence would establish a Luna visual-GLB to MNI 2009c transformation?",
    description: "Open research question imported from the P33 feasibility review.",
    content: "Required: checksum-bound source coordinate declaration, mesh-to-volume correspondence, documented directional transform chain, and independent landmarks/residuals. Until then the result is NOT_ESTABLISHED.",
    sourceType: "USER_QUESTION",
    truthState: "NOT_ESTABLISHED",
    provenance: {
      note: "Derived from the P33 Luna spatial registration review. This is an evidence gap, not a transform proposal.",
    },
  });

  const placements = [
    [hippocampus, folderByTitle.get("Brain")],
    [julich, folderByTitle.get("Datasets")],
    [mni, folderByTitle.get("Datasets")],
    [question, folderByTitle.get("Research")],
  ] as const;
  for (const [object, parent] of placements) {
    if (!parent) continue;
    await insert("luna_knowledge_placements", {
      workspace_id: workspace.id,
      object_id: object.id,
      parent_object_id: parent.id,
      placement_kind: "PRIMARY",
      sort_order: 0,
    });
  }
  await insert("luna_knowledge_relationships", {
    workspace_id: workspace.id,
    source_object_id: hippocampus.id,
    target_object_id: julich.id,
    relationship_type: "UNMAPPED_TO",
    source_type: "PUBLISHED_EVIDENCE",
    truth_state: "UNMAPPED",
    confidence: null,
    evidence: { status: "0 authoritative / 0 probabilistic / 0 requires-domain-review / 102 unmapped" },
    provenance: { note: "Released P32 Julich structure-mapping conclusion." },
  });
  await insert("luna_knowledge_relationships", {
    workspace_id: workspace.id,
    source_object_id: hippocampus.id,
    target_object_id: mni.id,
    relationship_type: "REQUIRES_REVIEW",
    source_type: "PUBLISHED_EVIDENCE",
    truth_state: "NOT_ESTABLISHED",
    confidence: null,
    evidence: { status: "P33 registration quality gate: NOT_ESTABLISHED" },
    provenance: { note: "The visual GLB has no validated MNI 2009c registration chain." },
  });
  await audit(workspace.id, actor, "WORKSPACE_SEEDED", "workspace", workspace.id, {
    seededObjects: 9,
    preservation: "HRA/MNI registration, Julich mapping, and biological-target restrictions were not changed.",
  });
}

export async function getOrCreateKnowledgeWorkspace(userId: number): Promise<KnowledgeWorkspace> {
  const scope = ownerScope(userId);
  const params = new URLSearchParams({ select: "*", owner_scope: `eq.${scope}`, limit: "1" });
  const existing = await listRows("luna_knowledge_workspaces", params);
  if (existing[0]) return mapWorkspace(existing[0]);
  const workspace = mapWorkspace(await insert<Record<string, unknown>>(
    "luna_knowledge_workspaces",
    {
      owner_scope: scope,
      title: "Luna Knowledge Space",
      autonomy_level: "ON_DEMAND",
      autonomy_paused: false,
    },
  ));
  await seedWorkspace(workspace);
  return workspace;
}

export async function listKnowledgeObjects(
  workspace: KnowledgeWorkspace,
  options: { includeTrashed?: boolean; limit?: number } = {},
): Promise<KnowledgeObject[]> {
  const params = scopeParams(workspace.id, "*", {
    order: "is_pinned.desc,updated_at.desc",
    limit: String(Math.min(Math.max(options.limit ?? MAX_OBJECTS, 1), MAX_OBJECTS)),
  });
  if (!options.includeTrashed) params.set("deleted_at", "is.null");
  return (await listRows(KNOWLEDGE_TABLE, params)).map(mapObject);
}

export async function listKnowledgePlacements(
  workspace: KnowledgeWorkspace,
): Promise<KnowledgePlacement[]> {
  const params = scopeParams(workspace.id, "*", {
    is_deleted: "eq.false",
    order: "sort_order.asc,created_at.asc",
    limit: "1000",
  });
  return (await listRows("luna_knowledge_placements", params)).map(mapPlacement);
}

export async function listKnowledgeRelationships(
  workspace: KnowledgeWorkspace,
): Promise<KnowledgeRelationship[]> {
  const params = scopeParams(workspace.id, "*", {
    is_deleted: "eq.false",
    order: "created_at.asc",
    limit: String(MAX_RELATIONSHIPS),
  });
  return (await listRows("luna_knowledge_relationships", params)).map(mapRelationship);
}

export async function listKnowledgeMissions(
  workspace: KnowledgeWorkspace,
): Promise<KnowledgeMission[]> {
  const params = scopeParams(workspace.id, "*", { order: "created_at.desc", limit: "100" });
  return (await listRows("luna_knowledge_missions", params)).map(mapMission);
}

export async function listKnowledgeActivity(
  workspace: KnowledgeWorkspace,
): Promise<KnowledgeMissionActivity[]> {
  const params = scopeParams(workspace.id, "*", { order: "created_at.desc", limit: String(MAX_ACTIVITY) });
  return (await listRows("luna_knowledge_mission_activity", params)).map(mapActivity);
}

export async function listKnowledgeApprovals(
  workspace: KnowledgeWorkspace,
): Promise<KnowledgeApproval[]> {
  const params = scopeParams(workspace.id, "*", { order: "requested_at.desc", limit: "100" });
  return (await listRows("luna_knowledge_approvals", params)).map(mapApproval);
}

export function calculateKnowledgeHealth(input: {
  objects: KnowledgeObject[];
  relationships: KnowledgeRelationship[];
  missions: KnowledgeMission[];
  approvals: KnowledgeApproval[];
}): KnowledgeHealth {
  const activeObjects = input.objects.filter((object) => object.status !== "TRASHED");
  return {
    totalObjects: activeObjects.length,
    folders: activeObjects.filter((object) => object.objectType === "FOLDER").length,
    scientificRecords: activeObjects.filter((object) => [
      "SCIENTIFIC_STRUCTURE", "SCIENTIFIC_REGION", "DATASET", "OBSERVATION", "CELLULAR_RECORD",
      "MOLECULAR_RECORD", "TISSUE_RECORD", "CONNECTIVITY_RECORD", "EVIDENCE_RECORD",
    ].includes(object.objectType)).length,
    openQuestions: activeObjects.filter((object) => object.objectType === "RESEARCH_QUESTION" && object.status === "ACTIVE").length,
    unresolvedRelationships: input.relationships.filter((relationship) => ["REQUIRES_REVIEW", "UNMAPPED_TO"].includes(relationship.relationshipType) || ["REQUIRES_REVIEW", "UNMAPPED", "NOT_ESTABLISHED", "CONTRADICTED"].includes(relationship.truthState)).length,
    pendingApprovals: input.approvals.filter((approval) => approval.status === "REQUESTED" || approval.status === "KEPT_FOR_REVIEW").length,
    activeMissions: input.missions.filter((mission) => ["QUEUED", "SCOUTING", "RESEARCHING", "VALIDATING", "ORGANIZING", "REPORTING", "WAITING_FOR_PROVIDER"].includes(mission.state)).length,
    failedMissions: input.missions.filter((mission) => ["FAILED", "MISSION_LIMIT_REACHED"].includes(mission.state)).length,
    evidenceGaps: activeObjects.filter((object) => ["NOT_ESTABLISHED", "UNAVAILABLE", "UNMAPPED", "REQUIRES_REVIEW"].includes(object.truthState)).length,
    requiresAttention: activeObjects.filter((object) => object.status === "NEEDS_ATTENTION" || ["NOT_ESTABLISHED", "UNAVAILABLE", "UNMAPPED", "REQUIRES_REVIEW", "CONTRADICTED"].includes(object.truthState)).length,
  };
}

export async function getKnowledgeWorkspaceSnapshot(userId: number): Promise<KnowledgeWorkspaceSnapshot> {
  const workspace = await getOrCreateKnowledgeWorkspace(userId);
  const [objects, placements, relationships, missions, activity, approvals] = await Promise.all([
    listKnowledgeObjects(workspace),
    listKnowledgePlacements(workspace),
    listKnowledgeRelationships(workspace),
    listKnowledgeMissions(workspace),
    listKnowledgeActivity(workspace),
    listKnowledgeApprovals(workspace),
  ]);
  return {
    workspace,
    objects,
    placements,
    relationships,
    missions,
    activity,
    approvals,
    health: calculateKnowledgeHealth({ objects, relationships, missions, approvals }),
  };
}

export async function getKnowledgeObjectForUser(
  userId: number,
  objectId: string,
): Promise<KnowledgeObject | null> {
  const workspace = await getOrCreateKnowledgeWorkspace(userId);
  return getObjectInWorkspace(workspace.id, objectId);
}

export async function createKnowledgeObject(input: {
  userId: number;
  objectType: KnowledgeObjectType;
  title: string;
  description?: string;
  content?: string;
  sourceType: KnowledgeSourceType;
  truthState: KnowledgeTruthState;
  tags?: string[];
  scientificMetadata?: KnowledgeScientificMetadata;
  provenance?: KnowledgeProvenance;
  parentObjectId?: string | null;
  actor?: string;
  cognitiveMissionId?: string | null;
  reason?: string;
}): Promise<KnowledgeObject> {
  const workspace = await getOrCreateKnowledgeWorkspace(input.userId);
  const row = await insert<Record<string, unknown>>(KNOWLEDGE_TABLE, {
    workspace_id: workspace.id,
    owner_scope: workspace.ownerScope,
    object_type: input.objectType,
    title: input.title,
    description: input.description ?? "",
    content: input.content ?? "",
    source_type: input.sourceType,
    truth_state: input.truthState,
    status: "ACTIVE",
    tags: input.tags ?? [],
    scientific_metadata: input.scientificMetadata ?? {},
    provenance: input.provenance ?? {},
    immutable_provider_snapshot: false,
    current_version: 1,
    is_pinned: false,
    is_favorite: false,
  });
  const object = mapObject(row);
  if (input.parentObjectId) {
    await insert("luna_knowledge_placements", {
      workspace_id: workspace.id,
      object_id: object.id,
      parent_object_id: input.parentObjectId,
      placement_kind: "PRIMARY",
      sort_order: 0,
    });
  }
  const actor = input.actor ?? workspace.ownerScope;
  const reason = input.reason ?? "Knowledge object created.";
  await writeVersion(object, "CREATED", actor, reason);
  await audit(workspace.id, actor, "KNOWLEDGE_CREATED", object.objectType, object.id, {
    sourceType: object.sourceType,
    truthState: object.truthState,
    cognitiveMissionId: input.cognitiveMissionId ?? null,
  });
  return object;
}

export async function updateKnowledgeObject(input: {
  userId: number;
  objectId: string;
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  status?: Exclude<KnowledgeObjectStatus, "TRASHED">;
  isPinned?: boolean;
  isFavorite?: boolean;
  reason: string;
}): Promise<KnowledgeObject> {
  const workspace = await getOrCreateKnowledgeWorkspace(input.userId);
  const current = await getObjectInWorkspace(workspace.id, input.objectId);
  if (!current) throw new Error("Knowledge object was not found in this workspace.");
  if (current.immutableProviderSnapshot) {
    throw new Error("Provider-derived Knowledge Space snapshots are immutable. Create a user note or relationship instead.");
  }
  const patch: Record<string, unknown> = {
    current_version: current.currentVersion + 1,
  };
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.content !== undefined) patch.content = input.content;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.status !== undefined) patch.status = input.status;
  if (input.isPinned !== undefined) patch.is_pinned = input.isPinned;
  if (input.isFavorite !== undefined) patch.is_favorite = input.isFavorite;
  const query = scopeParams(workspace.id, "*");
  query.set("id", `eq.${current.id}`);
  const updated = mapObject(await update<Record<string, unknown>>(KNOWLEDGE_TABLE, query, patch));
  await writeVersion(updated, "UPDATED", workspace.ownerScope, input.reason);
  await audit(workspace.id, workspace.ownerScope, "KNOWLEDGE_UPDATED", updated.objectType, updated.id, { reason: input.reason });
  return updated;
}

export async function setKnowledgeObjectDeleted(input: {
  userId: number;
  objectId: string;
  deleted: boolean;
}): Promise<KnowledgeObject> {
  const workspace = await getOrCreateKnowledgeWorkspace(input.userId);
  const current = await getObjectInWorkspace(workspace.id, input.objectId);
  if (!current) throw new Error("Knowledge object was not found in this workspace.");
  if (current.immutableProviderSnapshot) {
    throw new Error("Provider-derived Knowledge Space snapshots cannot be deleted. They may be hidden by a user-created collection instead.");
  }
  const query = scopeParams(workspace.id, "*");
  query.set("id", `eq.${current.id}`);
  const updated = mapObject(await update<Record<string, unknown>>(KNOWLEDGE_TABLE, query, {
    status: input.deleted ? "TRASHED" : "ACTIVE",
    deleted_at: input.deleted ? new Date().toISOString() : null,
    current_version: current.currentVersion + 1,
  }));
  await writeVersion(updated, input.deleted ? "TRASHED" : "RESTORED", workspace.ownerScope, input.deleted ? "Moved to trash." : "Restored from trash.");
  await audit(workspace.id, workspace.ownerScope, input.deleted ? "KNOWLEDGE_TRASHED" : "KNOWLEDGE_RESTORED", updated.objectType, updated.id);
  return updated;
}

export async function createKnowledgeReference(input: {
  userId: number;
  objectId: string;
  parentObjectId: string;
  label?: string | null;
}): Promise<KnowledgePlacement> {
  const workspace = await getOrCreateKnowledgeWorkspace(input.userId);
  const [object, parent] = await Promise.all([
    getObjectInWorkspace(workspace.id, input.objectId, false),
    getObjectInWorkspace(workspace.id, input.parentObjectId, false),
  ]);
  if (!object || !parent || parent.objectType !== "FOLDER") {
    throw new Error("A Knowledge Space reference requires an active object and active destination folder in the same workspace.");
  }
  const placement = mapPlacement(await insert<Record<string, unknown>>("luna_knowledge_placements", {
    workspace_id: workspace.id,
    object_id: object.id,
    parent_object_id: parent.id,
    placement_kind: "REFERENCE",
    label: input.label ?? null,
    sort_order: 0,
  }));
  await audit(workspace.id, workspace.ownerScope, "KNOWLEDGE_REFERENCE_CREATED", "placement", placement.id, {
    objectId: object.id,
    parentObjectId: parent.id,
  });
  return placement;
}

export async function moveKnowledgeObject(input: {
  userId: number;
  objectId: string;
  parentObjectId: string | null;
}): Promise<KnowledgePlacement> {
  const workspace = await getOrCreateKnowledgeWorkspace(input.userId);
  const object = await getObjectInWorkspace(workspace.id, input.objectId, false);
  if (!object) throw new Error("Knowledge object was not found in this workspace.");
  if (input.parentObjectId) {
    const parent = await getObjectInWorkspace(workspace.id, input.parentObjectId, false);
    if (!parent || parent.objectType !== "FOLDER") throw new Error("Knowledge Space destinations must be active folders.");
  }
  const placements = await listKnowledgePlacements(workspace);
  const primary = placements.find((placement) => placement.objectId === object.id && placement.placementKind === "PRIMARY");
  if (primary) {
    const query = scopeParams(workspace.id, "*");
    query.set("id", `eq.${primary.id}`);
    const moved = mapPlacement(await update<Record<string, unknown>>("luna_knowledge_placements", query, {
      parent_object_id: input.parentObjectId,
      is_deleted: false,
    }));
    await audit(workspace.id, workspace.ownerScope, "KNOWLEDGE_MOVED", "placement", moved.id, {
      objectId: object.id,
      parentObjectId: input.parentObjectId,
    });
    return moved;
  }
  return mapPlacement(await insert<Record<string, unknown>>("luna_knowledge_placements", {
    workspace_id: workspace.id,
    object_id: object.id,
    parent_object_id: input.parentObjectId,
    placement_kind: "PRIMARY",
    sort_order: 0,
  }));
}

export async function createKnowledgeRelationship(input: {
  userId: number;
  sourceObjectId: string;
  targetObjectId: string;
  relationshipType: KnowledgeRelationshipType;
  sourceType: KnowledgeSourceType;
  truthState: KnowledgeTruthState;
  confidence?: number | null;
  evidence?: Record<string, unknown>;
  provenance?: KnowledgeProvenance;
}): Promise<KnowledgeRelationship> {
  const workspace = await getOrCreateKnowledgeWorkspace(input.userId);
  const [source, target] = await Promise.all([
    getObjectInWorkspace(workspace.id, input.sourceObjectId, false),
    getObjectInWorkspace(workspace.id, input.targetObjectId, false),
  ]);
  if (!source || !target) throw new Error("Knowledge Space relationships must connect active objects in the same workspace.");
  if (source.id === target.id) throw new Error("A Knowledge Space object cannot be related to itself.");
  const relationship = mapRelationship(await insert<Record<string, unknown>>("luna_knowledge_relationships", {
    workspace_id: workspace.id,
    source_object_id: source.id,
    target_object_id: target.id,
    relationship_type: input.relationshipType,
    source_type: input.sourceType,
    truth_state: input.truthState,
    confidence: input.confidence ?? null,
    evidence: input.evidence ?? {},
    provenance: input.provenance ?? {},
  }));
  await audit(workspace.id, workspace.ownerScope, "RELATIONSHIP_CREATED", "relationship", relationship.id, {
    sourceObjectId: source.id,
    targetObjectId: target.id,
    relationshipType: relationship.relationshipType,
    truthState: relationship.truthState,
  });
  return relationship;
}

export async function getKnowledgeGraph(userId: number, focusObjectId?: string): Promise<KnowledgeGraph> {
  const workspace = await getOrCreateKnowledgeWorkspace(userId);
  const [objects, relationships] = await Promise.all([
    listKnowledgeObjects(workspace),
    listKnowledgeRelationships(workspace),
  ]);
  if (!focusObjectId) return { nodes: objects.slice(0, 120), edges: relationships.slice(0, 200) };
  const included = new Set([focusObjectId]);
  relationships.forEach((relationship) => {
    if (relationship.sourceObjectId === focusObjectId) included.add(relationship.targetObjectId);
    if (relationship.targetObjectId === focusObjectId) included.add(relationship.sourceObjectId);
  });
  return {
    nodes: objects.filter((object) => included.has(object.id)),
    edges: relationships.filter((relationship) => included.has(relationship.sourceObjectId) && included.has(relationship.targetObjectId)),
  };
}

export async function searchKnowledge(userId: number, query: string): Promise<KnowledgeObject[]> {
  const workspace = await getOrCreateKnowledgeWorkspace(userId);
  const normalized = query.trim().replace(/[^a-zA-Z0-9 _.-]/g, "").slice(0, 80);
  if (!normalized) return listKnowledgeObjects(workspace, { limit: 80 });
  const params = scopeParams(workspace.id, "*", {
    deleted_at: "is.null",
    or: `(title.ilike.*${normalized}*,description.ilike.*${normalized}*,content.ilike.*${normalized}*)`,
    order: "updated_at.desc",
    limit: "80",
  });
  return (await listRows(KNOWLEDGE_TABLE, params)).map(mapObject);
}

export async function getKnowledgeVersions(userId: number, objectId: string): Promise<KnowledgeVersion[]> {
  const workspace = await getOrCreateKnowledgeWorkspace(userId);
  const params = scopeParams(workspace.id, "*", {
    object_id: `eq.${objectId}`,
    order: "version.desc",
    limit: "100",
  });
  return (await listRows("luna_knowledge_versions", params)).map(mapVersion);
}

export async function getKnowledgeAudit(userId: number, limit = 100): Promise<KnowledgeAuditEvent[]> {
  const workspace = await getOrCreateKnowledgeWorkspace(userId);
  const params = scopeParams(workspace.id, "*", { order: "created_at.desc", limit: String(Math.min(Math.max(limit, 1), 200)) });
  return (await listRows("luna_knowledge_audit_events", params)).map(mapAudit);
}

export async function updateKnowledgeAutonomy(input: {
  userId: number;
  autonomyLevel?: KnowledgeAutonomyLevel;
  autonomyPaused?: boolean;
}): Promise<KnowledgeWorkspace> {
  const workspace = await getOrCreateKnowledgeWorkspace(input.userId);
  const patch: Record<string, unknown> = {};
  if (input.autonomyLevel !== undefined) patch.autonomy_level = input.autonomyLevel;
  if (input.autonomyPaused !== undefined) patch.autonomy_paused = input.autonomyPaused;
  if (!Object.keys(patch).length) return workspace;
  const params = new URLSearchParams({ select: "*", id: `eq.${workspace.id}`, owner_scope: `eq.${workspace.ownerScope}` });
  const updated = mapWorkspace(await update<Record<string, unknown>>("luna_knowledge_workspaces", params, patch));
  await audit(updated.id, updated.ownerScope, "AUTONOMY_UPDATED", "workspace", updated.id, patch);
  return updated;
}

export async function createKnowledgeMission(input: {
  userId: number;
  targetObjectId?: string | null;
  workerRole: KnowledgeWorkerRole;
  objective: string;
  autonomyLevel: KnowledgeAutonomyLevel;
  maxSteps?: number;
  maxRetries?: number;
  maxDurationSeconds?: number;
  maxSpawnedWorkers?: number;
  inputContext?: Record<string, unknown>;
}): Promise<KnowledgeMission> {
  const workspace = await getOrCreateKnowledgeWorkspace(input.userId);
  if (workspace.autonomyPaused) throw new Error("Knowledge Space autonomy is paused. Resume it before creating a mission.");
  if (input.targetObjectId && !await getObjectInWorkspace(workspace.id, input.targetObjectId, false)) {
    throw new Error("Mission target was not found in this workspace.");
  }
  const mission = mapMission(await insert<Record<string, unknown>>("luna_knowledge_missions", {
    workspace_id: workspace.id,
    target_object_id: input.targetObjectId ?? null,
    worker_role: input.workerRole,
    objective: input.objective,
    state: "QUEUED",
    autonomy_level: input.autonomyLevel,
    max_steps: Math.min(Math.max(input.maxSteps ?? 12, 1), 50),
    max_retries: Math.min(Math.max(input.maxRetries ?? 2, 0), 5),
    max_duration_seconds: Math.min(Math.max(input.maxDurationSeconds ?? 120, 10), 900),
    max_spawned_workers: Math.min(Math.max(input.maxSpawnedWorkers ?? 1, 0), 4),
    current_step: 0,
    retry_count: 0,
    stop_requested: false,
    input_context: input.inputContext ?? {},
  }));
  await audit(workspace.id, workspace.ownerScope, "MISSION_CREATED", "mission", mission.id, {
    targetObjectId: mission.targetObjectId,
    workerRole: mission.workerRole,
    autonomyLevel: mission.autonomyLevel,
  }, mission.id);
  return mission;
}

export async function getKnowledgeMissionForUser(
  userId: number,
  missionId: string,
): Promise<KnowledgeMission | null> {
  const workspace = await getOrCreateKnowledgeWorkspace(userId);
  const params = scopeParams(workspace.id, "*");
  params.set("id", `eq.${missionId}`);
  params.set("limit", "1");
  const rows = await listRows("luna_knowledge_missions", params);
  return rows[0] ? mapMission(rows[0]) : null;
}

export async function appendKnowledgeMissionActivity(input: {
  userId: number;
  missionId: string;
  workerRole: KnowledgeWorkerRole;
  eventType: string;
  message: string;
  detail?: Record<string, unknown>;
}): Promise<KnowledgeMissionActivity> {
  const workspace = await getOrCreateKnowledgeWorkspace(input.userId);
  const missionParams = scopeParams(workspace.id, "*");
  missionParams.set("id", `eq.${input.missionId}`);
  missionParams.set("limit", "1");
  const missionRows = await listRows("luna_knowledge_missions", missionParams);
  if (!missionRows[0]) throw new Error("Knowledge mission was not found in this workspace.");
  return mapActivity(await insert<Record<string, unknown>>("luna_knowledge_mission_activity", {
    workspace_id: workspace.id,
    mission_id: input.missionId,
    worker_role: input.workerRole,
    event_type: input.eventType,
    message: input.message,
    detail: input.detail ?? {},
  }));
}

export async function updateKnowledgeMission(input: {
  userId: number;
  missionId: string;
  state?: KnowledgeMissionState;
  currentStep?: number;
  stopRequested?: boolean;
  errorMessage?: string | null;
  reportObjectId?: string | null;
}): Promise<KnowledgeMission> {
  const workspace = await getOrCreateKnowledgeWorkspace(input.userId);
  const query = scopeParams(workspace.id, "*");
  query.set("id", `eq.${input.missionId}`);
  const patch: Record<string, unknown> = {};
  if (input.state !== undefined) {
    patch.state = input.state;
    if (["SCOUTING", "RESEARCHING", "VALIDATING", "ORGANIZING", "REPORTING"].includes(input.state)) patch.started_at = new Date().toISOString();
    if (["COMPLETED", "FAILED", "CANCELLED", "MISSION_LIMIT_REACHED"].includes(input.state)) patch.finished_at = new Date().toISOString();
  }
  if (input.currentStep !== undefined) patch.current_step = input.currentStep;
  if (input.stopRequested !== undefined) patch.stop_requested = input.stopRequested;
  if (input.errorMessage !== undefined) patch.error_message = input.errorMessage;
  if (input.reportObjectId !== undefined) patch.report_object_id = input.reportObjectId;
  const mission = mapMission(await update<Record<string, unknown>>("luna_knowledge_missions", query, patch));
  await audit(workspace.id, workspace.ownerScope, "MISSION_UPDATED", "mission", mission.id, patch, mission.id);
  return mission;
}

export async function stopKnowledgeMissions(input: {
  userId: number;
  queuedOnly?: boolean;
}): Promise<{ stopped: number }> {
  const workspace = await getOrCreateKnowledgeWorkspace(input.userId);
  const missions = await listKnowledgeMissions(workspace);
  const eligible = missions.filter((mission) => {
    if (input.queuedOnly) return mission.state === "QUEUED";
    return ["QUEUED", "SCOUTING", "RESEARCHING", "VALIDATING", "ORGANIZING", "REPORTING", "WAITING_FOR_PROVIDER", "WAITING_FOR_USER"].includes(mission.state);
  });
  for (const mission of eligible) {
    await updateKnowledgeMission({
      userId: input.userId,
      missionId: mission.id,
      state: "CANCELLED",
      stopRequested: true,
      errorMessage: input.queuedOnly ? "Queue cleared by user." : "Stopped by user.",
    });
    await appendKnowledgeMissionActivity({
      userId: input.userId,
      missionId: mission.id,
      workerRole: mission.workerRole,
      eventType: input.queuedOnly ? "QUEUE_CLEARED" : "MISSION_STOPPED",
      message: input.queuedOnly ? "Mission removed from the on-demand queue by the user." : "Mission stopped by the user.",
    });
  }
  await audit(workspace.id, workspace.ownerScope, input.queuedOnly ? "MISSION_QUEUE_CLEARED" : "MISSIONS_STOPPED", "workspace", workspace.id, { stopped: eligible.length });
  return { stopped: eligible.length };
}

export async function createKnowledgeApproval(input: {
  userId: number;
  missionId?: string | null;
  targetObjectId?: string | null;
  actionType: string;
  title: string;
  rationale: string;
  sourceSummary: string;
  evidence?: Record<string, unknown>;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  confidence?: number | null;
}): Promise<KnowledgeApproval> {
  const workspace = await getOrCreateKnowledgeWorkspace(input.userId);
  return mapApproval(await insert<Record<string, unknown>>("luna_knowledge_approvals", {
    workspace_id: workspace.id,
    mission_id: input.missionId ?? null,
    target_object_id: input.targetObjectId ?? null,
    action_type: input.actionType,
    title: input.title,
    rationale: input.rationale,
    source_summary: input.sourceSummary,
    evidence: input.evidence ?? {},
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    confidence: input.confidence ?? null,
  }));
}

export function createKnowledgeWorkerId(role: KnowledgeWorkerRole): string {
  return `${role.toLowerCase().replace(/_/g, "-")}-${randomUUID().slice(0, 8)}`;
}
