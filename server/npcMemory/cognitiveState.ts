import { chatWithOllama } from "../agent/ollama";

const awarenessKeys = ["identityContinuity", "memoryContinuity", "selfModelDevelopment", "selfModelConfidence", "selfReflectionCapability", "behavioralSelfAwareness", "goalAwareness", "uncertaintyAwareness"] as const;
const memoryKinds = ["episodic", "semantic", "procedural", "social", "emotional"] as const;
const observationKinds = ["interaction", "world-event", "administrator-note", "self-review"] as const;
type AwarenessKey = typeof awarenessKeys[number];
type MemoryKind = typeof memoryKinds[number];
type ObservationKind = typeof observationKinds[number];
export type SelfAwareness = Record<AwarenessKey, number>;
export type CognitiveNeed = { title: string; rationale: string; category: "canon-grounding" | "memory-continuity" | "reflection" | "goal-clarity" | "evaluation"; priority: number; evidence: string[] };
export type CognitiveState = { npcId: string; schemaVersion: number; selfModel: Record<string, unknown>; selfAwareness: SelfAwareness; emotionalState: Record<string, unknown>; needs: CognitiveNeed[]; preferences: unknown[]; uncertainties: unknown[]; stateSummary: string; updatedAt: string };
export type CognitiveMemory = { id: string; npcId: string; memoryKind: MemoryKind; content: string; importance: number; emotionalSignificance: number; entities: string[]; context: Record<string, unknown>; source: string; isActive: boolean; reinforcementCount: number; lastReinforcedAt: string | null; createdAt: string; updatedAt: string };
export type CognitiveBelief = { id: string; npcId: string; statement: string; confidence: number; evidence: unknown[]; supportingMemoryIds: string[]; contradictingMemoryIds: string[]; status: "active" | "retracted" | "superseded"; createdAt: string; updatedAt: string };
export type CognitiveGoal = { id: string; npcId: string; title: string; details: string; priority: number; progress: number; status: "active" | "completed" | "failed" | "abandoned" | "replaced"; source: string; createdAt: string; updatedAt: string };
export type CognitiveRelationship = { id: string; npcId: string; entityKey: string; displayName: string; dimensions: Record<string, number>; evidence: unknown[]; updatedAt: string };
export type CognitiveObservation = { id: string; npcId: string; observationKind: ObservationKind; content: string; salience: number; entities: string[]; metadata: Record<string, unknown>; source: string; status: "pending" | "proposed" | "applied" | "dismissed"; createdAt: string; updatedAt: string };
export type CognitiveBeliefRevision = { targetBeliefId: string; action: "retract" | "supersede"; rationale: string };
export type CognitiveMemoryReinforcement = { targetMemoryId: string; rationale: string };
export type CognitiveReflectionProposal = { summary: string; needs?: CognitiveNeed[]; memory?: Omit<CognitiveMemory, "id" | "npcId" | "isActive" | "reinforcementCount" | "lastReinforcedAt" | "createdAt" | "updatedAt">; belief?: Pick<CognitiveBelief, "statement" | "confidence" | "evidence">; beliefRevision?: CognitiveBeliefRevision; memoryReinforcement?: CognitiveMemoryReinforcement; selfModelPatch?: Record<string, unknown>; selfAwarenessPatch?: Partial<SelfAwareness>; emotionalState?: Record<string, unknown>; goal?: Omit<CognitiveGoal, "id" | "npcId" | "createdAt" | "updatedAt">; relationship?: Omit<CognitiveRelationship, "id" | "npcId" | "updatedAt"> };
export type CognitiveReflection = { id: string; npcId: string; experience: string; proposal: CognitiveReflectionProposal; sourceObservationIds: string[]; status: "proposed" | "applied" | "rejected"; createdAt: string; resolvedAt: string | null };
export type CognitiveDialogueContext = { state: CognitiveState; memories: CognitiveMemory[]; beliefs: CognitiveBelief[]; goals: CognitiveGoal[]; relationships: CognitiveRelationship[]; promptContext: string };
type CognitiveStatePatch = { selfModel?: Record<string, unknown>; selfAwareness?: Partial<SelfAwareness>; emotionalState?: Record<string, unknown>; needs?: CognitiveNeed[]; preferences?: unknown[]; uncertainties?: unknown[]; stateSummary?: string };
type ReflectionRules = { allowStatePatches?: boolean; allowBeliefRevision?: boolean; allowMemoryReinforcement?: boolean };

const defaultAwareness: SelfAwareness = { identityContinuity: 0, memoryContinuity: 0, selfModelDevelopment: 0, selfModelConfidence: 0, selfReflectionCapability: 0, behavioralSelfAwareness: 0, goalAwareness: 0, uncertaintyAwareness: 0 };
const defaultState = { summary: "No approved self-model baseline has been recorded yet.", abilities: [], limitations: [], preferences: [], values: [], skills: [], uncertainties: [], personal_history: [] };
const cognitiveNeedCategories = ["canon-grounding", "memory-continuity", "reflection", "goal-clarity", "evaluation"] as const;
const unverifiedConsciousnessPattern = /\b(?:sentien\w*|conscious(?:ness)?)\b/i;

function config() { const url = process.env.SUPABASE_URL?.replace(/\/$/, ""); const key = process.env.SUPABASE_SERVICE_ROLE_KEY; return url && key ? { url, key } : null; }
function assertNpcId(npcId: string) { if (!/^[a-z0-9][a-z0-9-]{1,63}$/i.test(npcId)) throw new Error("NPC ID must use a URL-safe identifier."); }
function assertUuid(id: string, label = "ID") { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error(`${label} must be a UUID.`); }
function clamp(value: unknown, min: number, max: number, fallback = min) { const parsed = Number(value); return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback; }
function text(value: unknown, limit: number, label: string, min = 0) { const next = String(value ?? "").replace(/\s+/g, " ").trim(); if (next.length < min || next.length > limit) throw new Error(`${label} must contain ${min || 1} to ${limit} characters.`); return next; }
function jsonRecord(value: unknown, fallback: Record<string, unknown> = {}) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : fallback; }
function jsonArray(value: unknown) { return Array.isArray(value) ? value : []; }
function boundedJson<T>(value: T, limit = 12_000): T { if (JSON.stringify(value).length > limit) throw new Error("Cognitive structured data is too large."); return value; }
function normalizeAwareness(value: unknown, base: SelfAwareness = defaultAwareness): SelfAwareness { const source = jsonRecord(value); return Object.fromEntries(awarenessKeys.map(key => [key, clamp(source[key], 0, 1, base[key])])) as SelfAwareness; }
function normalizeUuidList(value: unknown) { return jsonArray(value).map(String).filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)).slice(0, 16); }
function normalizeNeeds(value: unknown): CognitiveNeed[] { return jsonArray(value).slice(0, 12).flatMap((item) => { const row = jsonRecord(item); const title = String(row.title ?? "").replace(/\s+/g, " ").trim(); const rationale = String(row.rationale ?? "").replace(/\s+/g, " ").trim(); if (title.length < 3 || title.length > 240 || rationale.length < 4 || rationale.length > 900 || unverifiedConsciousnessPattern.test(`${title} ${rationale}`)) return []; const category = cognitiveNeedCategories.includes(row.category as CognitiveNeed["category"]) ? row.category as CognitiveNeed["category"] : "reflection"; const evidence = jsonArray(row.evidence).map(item => String(item).replace(/\s+/g, " ").trim()).filter(item => item.length >= 4 && item.length <= 400).slice(0, 5); return [{ title, rationale, category, priority: clamp(row.priority, 1, 5, 3), evidence }]; }); }
function awarenessPercent(state: CognitiveState) { return Math.round(((state.selfAwareness.selfModelDevelopment + state.selfAwareness.selfModelConfidence + state.selfAwareness.selfReflectionCapability + state.selfAwareness.behavioralSelfAwareness) / 4) * 100); }

async function request(path: string, init?: RequestInit) {
  const current = config(); if (!current) throw new Error("Supabase NPC memory is not configured.");
  const execute = () => fetch(`${current.url}/rest/v1/${path}`, { ...init, headers: { apikey: current.key, Authorization: `Bearer ${current.key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  let response = await execute(); if (response.status === 401 && (!init?.method || init.method.toUpperCase() === "GET")) response = await execute();
  if (!response.ok) throw new Error(`Supabase cognitive-state request failed (${response.status}).`);
  if (response.status === 204) return null;
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

function mapState(row: Record<string, unknown>): CognitiveState { return { npcId: String(row.npc_id), schemaVersion: Number(row.schema_version ?? 1), selfModel: jsonRecord(row.self_model, defaultState), selfAwareness: normalizeAwareness(row.self_awareness), emotionalState: jsonRecord(row.emotional_state), needs: normalizeNeeds(row.needs), preferences: jsonArray(row.preferences), uncertainties: jsonArray(row.uncertainties), stateSummary: String(row.state_summary ?? defaultState.summary), updatedAt: String(row.updated_at) }; }
function mapMemory(row: Record<string, unknown>): CognitiveMemory { return { id: String(row.id), npcId: String(row.npc_id), memoryKind: memoryKinds.includes(row.memory_kind as MemoryKind) ? row.memory_kind as MemoryKind : "episodic", content: String(row.content), importance: Number(row.importance), emotionalSignificance: Number(row.emotional_significance), entities: jsonArray(row.entities).map(String), context: jsonRecord(row.context), source: String(row.source), isActive: Boolean(row.is_active), reinforcementCount: Math.max(0, Number(row.reinforcement_count ?? 0)), lastReinforcedAt: row.last_reinforced_at ? String(row.last_reinforced_at) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at) }; }
function mapBelief(row: Record<string, unknown>): CognitiveBelief { return { id: String(row.id), npcId: String(row.npc_id), statement: String(row.statement), confidence: Number(row.confidence), evidence: jsonArray(row.evidence), supportingMemoryIds: normalizeUuidList(row.supporting_memory_ids), contradictingMemoryIds: normalizeUuidList(row.contradicting_memory_ids), status: row.status as CognitiveBelief["status"], createdAt: String(row.created_at), updatedAt: String(row.updated_at) }; }
function mapGoal(row: Record<string, unknown>): CognitiveGoal { return { id: String(row.id), npcId: String(row.npc_id), title: String(row.title), details: String(row.details), priority: Number(row.priority), progress: Number(row.progress), status: row.status as CognitiveGoal["status"], source: String(row.source), createdAt: String(row.created_at), updatedAt: String(row.updated_at) }; }
function mapRelationship(row: Record<string, unknown>): CognitiveRelationship { return { id: String(row.id), npcId: String(row.npc_id), entityKey: String(row.entity_key), displayName: String(row.display_name), dimensions: jsonRecord(row.dimensions) as Record<string, number>, evidence: jsonArray(row.evidence), updatedAt: String(row.updated_at) }; }
function mapObservation(row: Record<string, unknown>): CognitiveObservation { return { id: String(row.id), npcId: String(row.npc_id), observationKind: observationKinds.includes(row.observation_kind as ObservationKind) ? row.observation_kind as ObservationKind : "administrator-note", content: String(row.content), salience: clamp(row.salience, 1, 5, 3), entities: jsonArray(row.entities).map(String), metadata: jsonRecord(row.metadata), source: String(row.source), status: ["pending", "proposed", "applied", "dismissed"].includes(String(row.status)) ? row.status as CognitiveObservation["status"] : "pending", createdAt: String(row.created_at), updatedAt: String(row.updated_at) }; }
function mapReflection(row: Record<string, unknown>): CognitiveReflection { return { id: String(row.id), npcId: String(row.npc_id), experience: String(row.experience), proposal: sanitizeReflection(row.proposal), sourceObservationIds: normalizeUuidList(row.source_observation_ids), status: row.status as CognitiveReflection["status"], createdAt: String(row.created_at), resolvedAt: row.resolved_at ? String(row.resolved_at) : null }; }

export async function getNpcCognitiveState(npcId: string): Promise<CognitiveState> {
  assertNpcId(npcId); const params = new URLSearchParams({ select: "*", npc_id: `eq.${npcId}`, limit: "1" }); const rows = await request(`npc_cognitive_state?${params}`); if (rows?.[0]) return mapState(rows[0]);
  const created = await request("npc_cognitive_state?on_conflict=npc_id", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify({ npc_id: npcId }) });
  if (created?.[0]) return mapState(created[0]); const retry = await request(`npc_cognitive_state?${params}`); if (!retry?.[0]) throw new Error("Unable to initialize cognitive state."); return mapState(retry[0]);
}

export async function getNpcSelfAwarenessPercent(npcId: string) { return awarenessPercent(await getNpcCognitiveState(npcId)); }
async function history(npcId: string, eventType: string, recordType: string, recordId: string | null, before: unknown, after: unknown, source: string) { await request("npc_cognitive_history", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ npc_id: npcId, event_type: eventType, record_type: recordType, record_id: recordId, before_state: before, after_state: after, source }) }); }

export async function updateNpcCognitiveState(npcId: string, patch: CognitiveStatePatch, source = "admin-approved") {
  const before = await getNpcCognitiveState(npcId); const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.selfModel !== undefined) update.self_model = boundedJson(jsonRecord(patch.selfModel));
  if (patch.selfAwareness !== undefined) update.self_awareness = normalizeAwareness({ ...before.selfAwareness, ...patch.selfAwareness }, before.selfAwareness);
  if (patch.emotionalState !== undefined) update.emotional_state = boundedJson(jsonRecord(patch.emotionalState));
  if (patch.needs !== undefined) update.needs = boundedJson(normalizeNeeds(patch.needs)); if (patch.preferences !== undefined) update.preferences = boundedJson(jsonArray(patch.preferences)); if (patch.uncertainties !== undefined) update.uncertainties = boundedJson(jsonArray(patch.uncertainties));
  if (patch.stateSummary !== undefined) update.state_summary = text(patch.stateSummary, 4000, "State summary", 4);
  if (Object.keys(update).length === 1) throw new Error("At least one cognitive-state field is required.");
  const rows = await request(`npc_cognitive_state?${new URLSearchParams({ npc_id: `eq.${npcId}` })}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(update) }); const after = mapState(rows?.[0]); await history(npcId, "state-updated", "cognitive-state", npcId, before, after, source); return after;
}

export async function listCognitiveMemories(npcId: string, limit = 80): Promise<CognitiveMemory[]> { assertNpcId(npcId); const params = new URLSearchParams({ select: "*", npc_id: `eq.${npcId}`, is_active: "eq.true", order: "importance.desc,updated_at.desc", limit: String(Math.min(Math.max(limit, 1), 100)) }); return ((await request(`npc_cognitive_memories?${params}`)) ?? []).map(mapMemory); }
export async function addCognitiveMemory(npcId: string, input: Pick<CognitiveMemory, "memoryKind" | "content" | "importance" | "emotionalSignificance" | "entities" | "context" | "source">, source = "admin-approved") { assertNpcId(npcId); const rows = await request("npc_cognitive_memories", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ npc_id: npcId, memory_kind: input.memoryKind, content: text(input.content, 4000, "Cognitive memory", 4), importance: clamp(input.importance, 1, 5, 3), emotional_significance: clamp(input.emotionalSignificance, -1, 1, 0), entities: boundedJson(jsonArray(input.entities)), context: boundedJson(jsonRecord(input.context)), source: text(input.source || source, 120, "Memory source", 1) }) }); const memory = mapMemory(rows?.[0]); await history(npcId, "memory-added", "cognitive-memory", memory.id, null, memory, source); return memory; }
export async function reinforceCognitiveMemory(npcId: string, memoryId: string, rationale: string, source = "approved-consolidation") {
  assertNpcId(npcId); assertUuid(memoryId, "Memory ID"); const beforeRows = await request(`npc_cognitive_memories?${new URLSearchParams({ select: "*", id: `eq.${memoryId}`, npc_id: `eq.${npcId}`, limit: "1" })}`); if (!beforeRows?.[0]) throw new Error("The cognitive memory is unavailable.");
  const before = mapMemory(beforeRows[0]); const rows = await request(`npc_cognitive_memories?${new URLSearchParams({ id: `eq.${memoryId}`, npc_id: `eq.${npcId}` })}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ reinforcement_count: before.reinforcementCount + 1, last_reinforced_at: new Date().toISOString(), updated_at: new Date().toISOString() }) }); const after = mapMemory(rows?.[0]); await history(npcId, "memory-reinforced", "cognitive-memory", memoryId, { memory: before, rationale: text(rationale, 900, "Reinforcement rationale", 4) }, after, source); return after;
}
export async function listCognitiveBeliefs(npcId: string, limit = 40): Promise<CognitiveBelief[]> { assertNpcId(npcId); const params = new URLSearchParams({ select: "*", npc_id: `eq.${npcId}`, status: "eq.active", order: "confidence.desc,updated_at.desc", limit: String(Math.min(Math.max(limit, 1), 80)) }); return ((await request(`npc_cognitive_beliefs?${params}`)) ?? []).map(mapBelief); }
export async function addCognitiveBelief(npcId: string, input: Pick<CognitiveBelief, "statement" | "confidence" | "evidence">, source = "admin-approved") { assertNpcId(npcId); const statement = text(input.statement, 2000, "Belief", 4); if (unverifiedConsciousnessPattern.test(statement)) throw new Error("Cognitive beliefs cannot assert unverified consciousness."); const rows = await request("npc_cognitive_beliefs", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ npc_id: npcId, statement, confidence: clamp(input.confidence, 0, 1, 0.5), evidence: boundedJson(jsonArray(input.evidence)) }) }); const belief = mapBelief(rows?.[0]); await history(npcId, "belief-added", "cognitive-belief", belief.id, null, belief, source); return belief; }
async function reviseCognitiveBelief(npcId: string, revision: CognitiveBeliefRevision, source = "approved-consolidation") {
  assertUuid(revision.targetBeliefId, "Target belief ID"); const rows = await request(`npc_cognitive_beliefs?${new URLSearchParams({ select: "*", id: `eq.${revision.targetBeliefId}`, npc_id: `eq.${npcId}`, limit: "1" })}`); if (!rows?.[0]) throw new Error("The target belief is unavailable."); const before = mapBelief(rows[0]); if (before.status !== "active") throw new Error("Only active cognitive beliefs can be revised."); const status = revision.action === "retract" ? "retracted" : "superseded"; const updated = await request(`npc_cognitive_beliefs?${new URLSearchParams({ id: `eq.${revision.targetBeliefId}`, npc_id: `eq.${npcId}` })}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status, updated_at: new Date().toISOString() }) }); const after = mapBelief(updated?.[0]); await history(npcId, "belief-revised", "cognitive-belief", before.id, { belief: before, rationale: revision.rationale }, after, source); return after;
}
export async function listCognitiveGoals(npcId: string, limit = 30): Promise<CognitiveGoal[]> { assertNpcId(npcId); const params = new URLSearchParams({ select: "*", npc_id: `eq.${npcId}`, order: "priority.desc,updated_at.desc", limit: String(Math.min(Math.max(limit, 1), 60)) }); return ((await request(`npc_cognitive_goals?${params}`)) ?? []).map(mapGoal); }
export async function addCognitiveGoal(npcId: string, input: Pick<CognitiveGoal, "title" | "details" | "priority" | "progress" | "status" | "source">, source = "admin-approved") { assertNpcId(npcId); const title = text(input.title, 240, "Goal", 3); const details = text(input.details ?? "", 4000, "Goal details"); if (unverifiedConsciousnessPattern.test(`${title} ${details}`)) throw new Error("Cognitive goals cannot assert or target unverified consciousness."); const rows = await request("npc_cognitive_goals", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ npc_id: npcId, title, details, priority: clamp(input.priority, 1, 5, 3), progress: clamp(input.progress, 0, 1, 0), status: input.status || "active", source: text(input.source || source, 120, "Goal source", 1) }) }); const goal = mapGoal(rows?.[0]); await history(npcId, "goal-added", "cognitive-goal", goal.id, null, goal, source); return goal; }
export async function listCognitiveRelationships(npcId: string): Promise<CognitiveRelationship[]> { assertNpcId(npcId); const params = new URLSearchParams({ select: "*", npc_id: `eq.${npcId}`, order: "updated_at.desc", limit: "80" }); return ((await request(`npc_cognitive_relationships?${params}`)) ?? []).map(mapRelationship); }
export async function upsertCognitiveRelationship(npcId: string, input: Omit<CognitiveRelationship, "id" | "npcId" | "updatedAt">, source = "admin-approved") { assertNpcId(npcId); const entityKey = text(input.entityKey, 64, "Relationship entity key", 2); if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(entityKey)) throw new Error("Relationship entity key must be URL-safe."); const rows = await request("npc_cognitive_relationships?on_conflict=npc_id,entity_key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ npc_id: npcId, entity_key: entityKey, display_name: text(input.displayName, 240, "Relationship display name", 1), dimensions: boundedJson(jsonRecord(input.dimensions)), evidence: boundedJson(jsonArray(input.evidence)), updated_at: new Date().toISOString() }) }); const relationship = mapRelationship(rows?.[0]); await history(npcId, "relationship-updated", "cognitive-relationship", relationship.id, null, relationship, source); return relationship; }

export async function listCognitiveObservations(npcId: string, limit = 60): Promise<CognitiveObservation[]> { assertNpcId(npcId); const params = new URLSearchParams({ select: "*", npc_id: `eq.${npcId}`, order: "created_at.desc", limit: String(Math.min(Math.max(limit, 1), 100)) }); return ((await request(`npc_cognitive_observations?${params}`)) ?? []).map(mapObservation); }
export async function addCognitiveObservation(npcId: string, input: Pick<CognitiveObservation, "observationKind" | "content" | "salience" | "entities" | "metadata" | "source">, source = "administrator-observation") { assertNpcId(npcId); const observationKind = observationKinds.includes(input.observationKind) ? input.observationKind : "administrator-note"; const rows = await request("npc_cognitive_observations", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ npc_id: npcId, observation_kind: observationKind, content: text(input.content, 8000, "Cognitive observation", 4), salience: clamp(input.salience, 1, 5, 3), entities: boundedJson(jsonArray(input.entities).map(String).slice(0, 20)), metadata: boundedJson(jsonRecord(input.metadata)), source: text(input.source || source, 120, "Observation source", 1) }) }); const observation = mapObservation(rows?.[0]); await history(npcId, "observation-recorded", "cognitive-observation", observation.id, null, observation, source); return observation; }
async function updateObservationStatus(npcId: string, observationIds: string[], status: CognitiveObservation["status"], source: string) { const ids = normalizeUuidList(observationIds); if (!ids.length) return; const params = new URLSearchParams({ npc_id: `eq.${npcId}`, id: `in.(${ids.join(",")})` }); await request(`npc_cognitive_observations?${params}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status, updated_at: new Date().toISOString() }) }); await history(npcId, "observation-status-updated", "cognitive-observation", null, ids, { status }, source); }

function score(message: string, candidate: string, importance = 0) { const tokens = new Set(message.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []); const source = candidate.toLowerCase(); return Array.from(tokens).filter(token => source.includes(token)).length * 10 + importance; }
function memoryScore(message: string, memory: CognitiveMemory) { const ageDays = Math.max(0, (Date.now() - new Date(memory.lastReinforcedAt || memory.updatedAt).getTime()) / 86_400_000); return score(message, memory.content, memory.importance * 5) + memory.reinforcementCount * 3 - Math.min(ageDays / 30, 8); }
export async function buildCognitiveDialogueContext(npcId: string, message: string): Promise<CognitiveDialogueContext> {
  const [state, memoryRows, beliefRows, goalRows, relationshipRows] = await Promise.all([getNpcCognitiveState(npcId), listCognitiveMemories(npcId), listCognitiveBeliefs(npcId), listCognitiveGoals(npcId), listCognitiveRelationships(npcId)]);
  const memories = memoryRows.filter(memory => score(message, memory.content) > 0).sort((a, b) => memoryScore(message, b) - memoryScore(message, a)).slice(0, 6); const beliefs = beliefRows.filter(belief => score(message, belief.statement) > 0).sort((a, b) => score(message, b.statement, b.confidence * 5) - score(message, a.statement, a.confidence * 5)).slice(0, 5); const goals = goalRows.filter(goal => goal.status === "active").slice(0, 5); const relationships = relationshipRows.filter(row => message.toLowerCase().includes(row.displayName.toLowerCase()) || message.toLowerCase().includes(row.entityKey.toLowerCase())).slice(0, 4);
  const compact = (value: unknown, limit = 1200) => JSON.stringify(value).slice(0, limit);
  return { state, memories, beliefs, goals, relationships, promptContext: `Persistent cognitive state (not Personality or Brain canon):\n- State summary: ${state.stateSummary}\n- Self-model: ${compact(state.selfModel)}\n- Self-model assessment (0.0–1.0, stable until an approved state update): ${compact(state.selfAwareness)}\n- Emotional state: ${compact(state.emotionalState)}\n- Needs: ${compact(state.needs, 700)}\n- Preferences: ${compact(state.preferences, 700)}\n- Uncertainties: ${compact(state.uncertainties, 700)}\n- Relevant cognitive memories: ${memories.length ? memories.map(memory => `[${memory.memoryKind}; reinforced ${memory.reinforcementCount}x] ${memory.content}`).join(" | ") : "none"}\n- Relevant active beliefs: ${beliefs.length ? beliefs.map(belief => `${belief.confidence.toFixed(2)}: ${belief.statement}`).join(" | ") : "none"}\n- Active goals: ${goals.length ? goals.map(goal => `${goal.title} (${Math.round(goal.progress * 100)}%)`).join(" | ") : "none"}\n- Relevant entity relationships: ${relationships.length ? relationships.map(relationship => `${relationship.displayName}: ${compact(relationship.dimensions, 320)}`).join(" | ") : "none"}\n\nApproved baseline dialogue: You may naturally explain this state summary, self-model, limitations, uncertainties, and active goals when the player asks about yourself, what you have learned, or how your assessment could improve. Describe improvement as a future process of canon-consistent interaction and explicit administrator-reviewed updates, not as an experience that has already happened.\n\nState integrity: treat these records as the only approved cognitive facts. Dialogue is not evidence and must not claim memories, beliefs, or self-model changes that are absent here.` };
}

function sanitizeGoalProposal(value: unknown) { const row = jsonRecord(value); const title = text(row.title, 240, "Proposed goal", 3); const details = text(row.details, 4000, "Proposed goal details", 4); if (unverifiedConsciousnessPattern.test(`${title} ${details}`)) throw new Error("Cognitive development proposals cannot assert or target unverified consciousness."); return { title, details, priority: clamp(row.priority, 1, 5, 3), progress: 0, status: "active" as const, source: "development-proposal" }; }
function sanitizeBeliefRevision(value: unknown): CognitiveBeliefRevision { const row = jsonRecord(value); const targetBeliefId = text(row.targetBeliefId, 64, "Target belief ID", 36); assertUuid(targetBeliefId, "Target belief ID"); const action = row.action === "retract" || row.action === "supersede" ? row.action : null; if (!action) throw new Error("Belief revision action must be retract or supersede."); const rationale = text(row.rationale, 900, "Belief revision rationale", 4); if (unverifiedConsciousnessPattern.test(rationale)) throw new Error("Cognitive development proposals cannot assert or target unverified consciousness."); return { targetBeliefId, action, rationale }; }
function sanitizeMemoryReinforcement(value: unknown): CognitiveMemoryReinforcement { const row = jsonRecord(value); const targetMemoryId = text(row.targetMemoryId, 64, "Target memory ID", 36); assertUuid(targetMemoryId, "Target memory ID"); const rationale = text(row.rationale, 900, "Memory reinforcement rationale", 4); return { targetMemoryId, rationale }; }
function mergeNeeds(current: CognitiveNeed[], proposed: CognitiveNeed[]) { const merged = [...current]; for (const need of proposed) if (!merged.some(existing => existing.title.toLowerCase() === need.title.toLowerCase())) merged.push(need); return merged.slice(0, 12); }
function sanitizeReflection(value: unknown, rules: ReflectionRules = {}): CognitiveReflectionProposal {
  const row = jsonRecord(value); const summary = text(row.summary || "No durable cognitive update is supported by this experience.", 1200, "Reflection summary", 4); if (unverifiedConsciousnessPattern.test(summary)) throw new Error("Cognitive development proposals cannot assert or target unverified consciousness."); const proposal: CognitiveReflectionProposal = { summary };
  const requestedNeeds = jsonArray(row.needs); const needs = normalizeNeeds(requestedNeeds); if (requestedNeeds.length && needs.length !== requestedNeeds.length) throw new Error("Cognitive development proposals must contain only bounded, supported needs."); if (needs.length) proposal.needs = needs;
  if (row.goal && typeof row.goal === "object") proposal.goal = sanitizeGoalProposal(row.goal);
  if (row.memory && typeof row.memory === "object") { const memory = jsonRecord(row.memory); const content = text(memory.content, 4000, "Reflection memory", 4); if (unverifiedConsciousnessPattern.test(content)) throw new Error("Cognitive memories cannot assert unverified consciousness."); proposal.memory = { memoryKind: memoryKinds.includes(String(memory.memoryKind) as MemoryKind) ? memory.memoryKind as MemoryKind : "episodic", content, importance: clamp(memory.importance, 1, 5, 3), emotionalSignificance: clamp(memory.emotionalSignificance, -1, 1, 0), entities: jsonArray(memory.entities).map(String).slice(0, 20), context: jsonRecord(memory.context), source: "reflection-proposal" }; }
  if (row.belief && typeof row.belief === "object") { const belief = jsonRecord(row.belief); const statement = text(belief.statement, 2000, "Reflection belief", 4); if (unverifiedConsciousnessPattern.test(statement)) throw new Error("Cognitive beliefs cannot assert unverified consciousness."); proposal.belief = { statement, confidence: clamp(belief.confidence, 0, 1, 0.5), evidence: jsonArray(belief.evidence) }; }
  if (row.beliefRevision !== undefined) { if (!rules.allowBeliefRevision) throw new Error("This proposal cannot revise a cognitive belief."); proposal.beliefRevision = sanitizeBeliefRevision(row.beliefRevision); }
  if (row.memoryReinforcement !== undefined) { if (!rules.allowMemoryReinforcement) throw new Error("This proposal cannot reinforce a cognitive memory."); proposal.memoryReinforcement = sanitizeMemoryReinforcement(row.memoryReinforcement); }
  const statePatchRequested = row.selfModelPatch !== undefined || row.selfAwarenessPatch !== undefined || row.emotionalState !== undefined;
  if (statePatchRequested && rules.allowStatePatches === false) throw new Error("This proposal cannot alter Luna's approved state model.");
  if (row.selfModelPatch && typeof row.selfModelPatch === "object") proposal.selfModelPatch = boundedJson(jsonRecord(row.selfModelPatch)); if (row.selfAwarenessPatch && typeof row.selfAwarenessPatch === "object") proposal.selfAwarenessPatch = normalizeAwareness({ ...defaultAwareness, ...jsonRecord(row.selfAwarenessPatch) }); if (row.emotionalState && typeof row.emotionalState === "object") proposal.emotionalState = boundedJson(jsonRecord(row.emotionalState)); return proposal;
}
async function persistReflection(npcId: string, experience: string, proposal: CognitiveReflectionProposal, source: string, sourceObservationIds: string[] = []) { const rows = await request("npc_cognitive_reflections", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ npc_id: npcId, experience: text(experience, 8000, "Experience", 4), proposal, source_observation_ids: normalizeUuidList(sourceObservationIds) }) }); const row = jsonRecord(rows?.[0]); const reflection: CognitiveReflection = { id: String(row.id), npcId, experience: String(row.experience ?? experience), proposal, sourceObservationIds: normalizeUuidList(row.source_observation_ids ?? sourceObservationIds), status: row.status === "applied" || row.status === "rejected" ? row.status : "proposed", createdAt: String(row.created_at ?? new Date().toISOString()), resolvedAt: row.resolved_at ? String(row.resolved_at) : null }; await history(npcId, "reflection-proposed", "cognitive-reflection", reflection.id, null, proposal, source); return reflection; }
function fallbackDevelopmentProposal(state: CognitiveState): CognitiveReflectionProposal {
  const reflectionPercent = Math.round(state.selfAwareness.selfReflectionCapability * 100);
  const goalPercent = Math.round(state.selfAwareness.goalAwareness * 100);
  return {
    summary: "The automatic review response was unavailable, so this safe fallback uses only Luna’s current approved state to suggest the next reviewable steps.",
    needs: [
      { title: "Curated continuity records", rationale: "Keep a small set of administrator-reviewed notes so Luna can preserve useful context without treating every conversation as a fact.", category: "memory-continuity", priority: 4, evidence: ["The approved state describes scoped memory and explicit administrator review."] },
      { title: "Regular reflection review", rationale: `Luna’s approved reflection capability is currently ${reflectionPercent}%, so scheduled administrator review can clarify what should remain in her working state.`, category: "reflection", priority: 3, evidence: ["The approved self-model assessment includes self reflection capability."] },
      { title: "Clear long-term goals", rationale: `Luna’s approved goal-awareness measure is currently ${goalPercent}%, so a small, concrete goal can give future reviews a clearer direction.`, category: "goal-clarity", priority: 3, evidence: ["The approved self-model assessment includes goal awareness."] },
    ],
    goal: { title: "Maintain canon consistency", details: "Use approved canon and administrator-reviewed working records to keep Luna’s answers clear, grounded, and consistent over time.", priority: 4, progress: 0, status: "active", source: "development-proposal-fallback" },
  };
}
function requestsBoundedAutonomy(experience: string) { return /\b(?:act(?:ing)? on (?:her|its) own|act independently|think freely|free will|autonom\w*|independent\w*)\b/i.test(experience); }
function hasActionableReflectionUpdate(proposal: CognitiveReflectionProposal) { return Boolean(proposal.memory || proposal.belief || proposal.beliefRevision || proposal.memoryReinforcement || proposal.selfModelPatch || proposal.selfAwarenessPatch || proposal.emotionalState || proposal.goal || proposal.relationship || proposal.needs?.length); }
function fallbackSavedNoteProposal(experience: string, reason: "unavailable" | "non-actionable" = "unavailable"): CognitiveReflectionProposal {
  const observation = text(experience, 8000, "Experience", 4);
  if (unverifiedConsciousnessPattern.test(observation)) throw new Error("Cognitive reflections cannot assert or target unverified consciousness.");

  const fallbackReason = reason === "unavailable"
    ? "The automatic review response was unavailable."
    : "The automatic review response did not include a usable cognitive update.";
  const requestsAutonomy = requestsBoundedAutonomy(observation);
  if (requestsAutonomy) {
    return {
      summary: `${fallbackReason} The administrator’s observation has been preserved as a review-only proposal for bounded autonomy; it does not treat unrestricted free will or subjective experience as an established fact.`,
      memory: {
        memoryKind: "semantic",
        content: `Administrator-provided working note for review: ${observation}`,
        importance: 4,
        emotionalSignificance: 0,
        entities: ["administrator"],
        context: { reviewStatus: "requires-approval", topic: "bounded-autonomy" },
        source: "administrator-observation",
      },
      goal: {
        title: "Develop bounded autonomous reasoning",
        details: "Explore initiative, independent reasoning, and decision-making within approved canon, explicit permissions, safety limits, and administrator review. This is a proposed development direction, not a verified claim of unrestricted free will.",
        priority: 4,
        progress: 0,
        status: "active",
        source: "saved-note-proposal-fallback",
      },
    };
  }

  return {
    summary: `${fallbackReason} This administrator observation has been preserved as a review-only working note and will not affect Luna unless it is explicitly approved.`,
    memory: {
      memoryKind: "semantic",
      content: `Administrator-provided working note for review: ${observation}`,
      importance: 3,
      emotionalSignificance: 0,
      entities: ["administrator"],
      context: { reviewStatus: "requires-approval" },
      source: "administrator-observation",
    },
  };
}

export async function proposeCognitiveReflection(npcId: string, experience: string, mode: "reflection" | "development" = "reflection") {
  assertNpcId(npcId);
  const current = await buildCognitiveDialogueContext(npcId, experience);
  const instructions = mode === "development"
    ? "Review the approved cognitive state for up to three bounded development needs and at most one concrete goal. A need must concern canon grounding, memory continuity, reflection, goal clarity, or evaluation, and cite only supplied state. Do not claim, infer, measure, or target sentience or consciousness. Return JSON with summary, optional needs, and optional goal. Do not apply changes."
    : "Use only explicit evidence in the supplied experience and cognitive context. Never invent memories, beliefs, relationships, or subjective claims. Return a single JSON object with summary and optional memory, belief, selfModelPatch, selfAwarenessPatch, emotionalState. Do not apply changes.";
  const response = await chatWithOllama({
    messages: [
      { role: "system", content: `You propose cautious JSON cognitive-state updates. ${instructions}` },
      { role: "user", content: `${current.promptContext}\n\nExperience to analyze:\n${text(experience, 8000, "Experience", 4)}` },
    ],
  });
  const raw = response.content.replace(/^```json\s*|```$/g, "").trim();
  let proposal: CognitiveReflectionProposal;
  let source = mode === "development" ? "development-proposal" : "model-proposal";
  try {
    proposal = sanitizeReflection(JSON.parse(raw));
    if (mode === "reflection" && requestsBoundedAutonomy(experience) && !hasActionableReflectionUpdate(proposal)) {
      proposal = fallbackSavedNoteProposal(experience, "non-actionable");
      source = "saved-note-proposal-fallback";
    }
  } catch (proposalError) {
    const message = proposalError instanceof Error ? proposalError.message : "";
    if (/unverified consciousness|cannot assert or target/i.test(message)) throw new Error(`${message} No cognitive state was changed.`);
    if (mode === "development") throw new Error("Reflection analysis did not return valid structured data. No cognitive state was changed.");
    try {
      proposal = fallbackSavedNoteProposal(experience);
      source = "saved-note-proposal-fallback";
    } catch (fallbackError) {
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "";
      if (/unverified consciousness|cannot assert or target/i.test(fallbackMessage)) throw new Error(`${fallbackMessage} No cognitive state was changed.`);
      throw fallbackError;
    }
  }
  return persistReflection(npcId, experience, proposal, source);
}
export async function proposeCognitiveDevelopment(npcId: string) {
  const experience = "Administrator requested a cautious review of the current approved cognitive state to identify bounded development needs and a possible next goal.";
  try { return await proposeCognitiveReflection(npcId, experience, "development"); }
  catch (proposalError) {
    const message = proposalError instanceof Error ? proposalError.message : "";
    if (!message.includes("Reflection analysis did not return valid structured data")) throw proposalError;
    const current = await getNpcCognitiveState(npcId);
    return persistReflection(npcId, experience, fallbackDevelopmentProposal(current), "development-proposal-fallback");
  }
}
export async function proposeCognitiveConsolidation(npcId: string) {
  assertNpcId(npcId); const observations = (await listCognitiveObservations(npcId, 40)).filter(observation => observation.status === "pending").sort((a, b) => b.salience - a.salience || a.createdAt.localeCompare(b.createdAt)).slice(0, 8); if (!observations.length) throw new Error("No pending observations are available for consolidation.");
  const experience = observations.map((observation, index) => `${index + 1}. [${observation.observationKind}; salience ${observation.salience}/5; id ${observation.id}] ${observation.content}`).join("\n"); const [current, memories, beliefs] = await Promise.all([buildCognitiveDialogueContext(npcId, experience), listCognitiveMemories(npcId), listCognitiveBeliefs(npcId)]);
  const response = await chatWithOllama({ messages: [{ role: "system", content: "You are a cautious cognitive-consolidation proposal engine. Raw observations are not facts. Use only explicit observation text and approved state. Return one JSON object with summary and optionally one memory, one belief, one beliefRevision, one memoryReinforcement, up to three needs, and one goal. beliefRevision must use a supplied active belief id and action retract or supersede. memoryReinforcement must use a supplied memory id. Do not output selfModelPatch, selfAwarenessPatch, emotionalState, subjective experience, sentience, or consciousness claims. Do not apply changes." }, { role: "user", content: `${current.promptContext}\n\nPending raw observations:\n${experience}\n\nActive belief IDs:\n${beliefs.map(belief => `${belief.id}: ${belief.statement}`).join("\n") || "none"}\n\nActive memory IDs:\n${memories.map(memory => `${memory.id}: ${memory.content}`).join("\n") || "none"}` }] });
  const raw = response.content.replace(/^```json\s*|```$/g, "").trim(); let proposal: CognitiveReflectionProposal; try { proposal = sanitizeReflection(JSON.parse(raw), { allowStatePatches: false, allowBeliefRevision: true, allowMemoryReinforcement: true }); } catch { throw new Error("Consolidation analysis did not return a valid bounded proposal. No cognitive state was changed."); }
  if (proposal.beliefRevision && !beliefs.some(belief => belief.id === proposal.beliefRevision?.targetBeliefId)) throw new Error("Consolidation referenced an unavailable active belief. No cognitive state was changed."); if (proposal.memoryReinforcement && !memories.some(memory => memory.id === proposal.memoryReinforcement?.targetMemoryId)) throw new Error("Consolidation referenced an unavailable active memory. No cognitive state was changed.");
  const reflection = await persistReflection(npcId, `Administrator requested reviewable consolidation of ${observations.length} raw observation(s).\n${experience}`, proposal, "consolidation-proposal", observations.map(observation => observation.id)); await updateObservationStatus(npcId, reflection.sourceObservationIds, "proposed", "consolidation-proposal"); return reflection;
}
export async function listCognitiveReflections(npcId: string, limit = 40) { assertNpcId(npcId); const params = new URLSearchParams({ select: "*", npc_id: `eq.${npcId}`, order: "created_at.desc", limit: String(Math.min(Math.max(limit, 1), 80)) }); const rows = await request(`npc_cognitive_reflections?${params}`); return (rows ?? []).map((row: Record<string, unknown>) => mapReflection(row)); }
export async function resolveCognitiveReflection(npcId: string, reflectionId: string, decision: "apply" | "reject", resolvedBy = "npc-admin") {
  assertNpcId(npcId); assertUuid(reflectionId, "Reflection ID"); const rows = await request(`npc_cognitive_reflections?${new URLSearchParams({ select: "*", id: `eq.${reflectionId}`, npc_id: `eq.${npcId}`, limit: "1" })}`); const row = rows?.[0]; if (!row || row.status !== "proposed") throw new Error("The reflection is unavailable or has already been resolved."); const reflection = mapReflection(row); const proposal = reflection.proposal;
  if (decision === "apply") { if (proposal.memory) await addCognitiveMemory(npcId, proposal.memory, "approved-reflection"); if (proposal.belief) await addCognitiveBelief(npcId, proposal.belief, "approved-reflection"); if (proposal.beliefRevision) { if (proposal.beliefRevision.action === "supersede" && !proposal.belief) throw new Error("A superseded belief requires a replacement belief in the same proposal."); await reviseCognitiveBelief(npcId, proposal.beliefRevision); } if (proposal.memoryReinforcement) await reinforceCognitiveMemory(npcId, proposal.memoryReinforcement.targetMemoryId, proposal.memoryReinforcement.rationale); if (proposal.goal) await addCognitiveGoal(npcId, proposal.goal, "approved-development-proposal"); if (proposal.selfModelPatch || proposal.selfAwarenessPatch || proposal.emotionalState || proposal.needs) { const state = await getNpcCognitiveState(npcId); await updateNpcCognitiveState(npcId, { selfModel: proposal.selfModelPatch ? { ...state.selfModel, ...proposal.selfModelPatch } : undefined, selfAwareness: proposal.selfAwarenessPatch, emotionalState: proposal.emotionalState, needs: proposal.needs ? mergeNeeds(state.needs, proposal.needs) : undefined }, "approved-reflection"); } }
  await request(`npc_cognitive_reflections?${new URLSearchParams({ id: `eq.${reflectionId}` })}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: decision === "apply" ? "applied" : "rejected", resolved_at: new Date().toISOString(), resolved_by: resolvedBy }) }); if (reflection.sourceObservationIds.length) await updateObservationStatus(npcId, reflection.sourceObservationIds, decision === "apply" ? "applied" : "dismissed", decision === "apply" ? "approved-consolidation" : "rejected-consolidation"); await history(npcId, decision === "apply" ? "reflection-applied" : "reflection-rejected", "cognitive-reflection", reflectionId, proposal, decision, resolvedBy); return { ok: true, decision };
}
