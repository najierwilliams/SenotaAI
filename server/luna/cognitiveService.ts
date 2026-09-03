import {
  buildBoundedCognitiveContext,
  calculateCognitiveHealth,
  deriveAttentionFromState,
  findExactDuplicateMemoryClusters,
  retrieveRelevantMemories,
} from "./cognition";
import {
  archiveDuplicateLunaMemory,
  createLunaAttention,
  getLunaCognitiveSnapshot,
  getOrCreateLunaSelfState,
  listLunaAttention,
  listLunaMemories,
  listLunaMissions,
  listLunaTasks,
} from "./supabase";
import { buildObservedLunaSelfModel, explainMemoryRetrieval } from "./milestone1";
import { inspectLunaClaims } from "./milestone2";
import { inspectLunaAttentionSystem } from "./milestone3";
import { adviseLunaWorkerSelection } from "./milestone4";
import { summarizeLunaLearning } from "./milestone5";
import { buildRelevantFoundationContext } from "./developmentalContext";
import { assessNextLunaAutonomousDecision } from "./milestone5ActionLoop";
import { lunaMem0Adapter } from "./mem0Adapter";

export type LunaActivitySummary = {
  currentObjective: string | null;
  currentTask: string | null;
  activeWorkers: number;
  recentAction: string | null;
  nextAction: string | null;
  blockers: string[];
  health: "HEALTHY" | "DEGRADED" | "ACTION_REQUIRED";
};

export async function retrieveLunaContext(input: { userId: number; query: string; projectId?: string | null; limit?: number }) {
  const [memories, self] = await Promise.all([
    listLunaMemories(input.userId, 200),
    getOrCreateLunaSelfState(input.userId),
  ]);
  const mem0Candidates = await lunaMem0Adapter.searchRelevant({ workspaceId: self.self.workspaceId, query: input.query, limit: input.limit });
  const retrieved = retrieveRelevantMemories({ query: input.query, memories, projectId: input.projectId, limit: input.limit ?? 8 });
  const foundationRelevant = /\b(name|age|old|language|speak|personality|creator|appearance|identity|who are you|yourself|development|responsib|autonom|plan|goal|task|decision|work|role)\b/i.test(input.query);
  const foundationContext = foundationRelevant ? buildRelevantFoundationContext(self.self.foundation, input.query) : "";
  return {
    memories: retrieved,
    mem0Candidates,
    foundation: self.self.foundation,
    promptContext: `${buildBoundedCognitiveContext({ objective: input.query, memories: retrieved })}${foundationContext ? `\n\n${foundationContext}` : ""}`.slice(0, 20_000),
    explanation: explainMemoryRetrieval({
      query: input.query,
      limit: input.limit ?? 8,
      memories,
      retrieved,
      projectId: input.projectId,
    }),
  };
}

/**
 * Consolidates only byte-for-byte normalized duplicates. It never silently merges semantic
 * near-matches, source/provider evidence, or manually created user memories.
 */
export async function consolidateLunaOwnedExactDuplicateMemories(input: { userId: number; missionId?: string | null }) {
  const memories = await listLunaMemories(input.userId, 200);
  const clusters = findExactDuplicateMemoryClusters(memories)
    .filter(cluster => {
      const duplicateRows = cluster.duplicateMemoryIds.map(id => memories.find(memory => memory.id === id)).filter(Boolean);
      return duplicateRows.every(memory => memory?.sourceType === "LUNA" || memory?.sourceType === "SYSTEM");
    });
  const archived = [] as string[];
  for (const cluster of clusters) {
    for (const duplicateMemoryId of cluster.duplicateMemoryIds) {
      await archiveDuplicateLunaMemory({ userId: input.userId, canonicalMemoryId: cluster.canonicalMemoryId, duplicateMemoryId, missionId: input.missionId ?? null });
      archived.push(duplicateMemoryId);
    }
  }
  return { clusters, archivedMemoryIds: archived };
}

/** Creates attention records only for factual persisted-state conditions. */
export async function reconcileLunaAttention(input: { userId: number }) {
  const [tasks, missions, memories, existing] = await Promise.all([
    listLunaTasks(input.userId),
    listLunaMissions(input.userId),
    listLunaMemories(input.userId, 200),
    listLunaAttention(input.userId),
  ]);
  const generated = deriveAttentionFromState({ tasks, missions, memories });
  const openKeys = new Set(existing.filter(item => item.state === "OPEN").map(item => `${item.severity}|${item.category}|${item.title}|${item.detail}`));
  const created = [];
  for (const item of generated) {
    const key = `${item.severity}|${item.category}|${item.title}|${item.detail}`;
    if (openKeys.has(key)) continue;
    created.push(await createLunaAttention({ userId: input.userId, ...item, actor: "luna:maintenance" }));
    openKeys.add(key);
  }
  return created;
}

export async function getLunaActivitySummary(userId: number): Promise<LunaActivitySummary> {
  const snapshot = await getLunaCognitiveSnapshot(userId);
  const activeMission = snapshot.missions.find(mission => ["RUNNING", "PLANNING", "WAITING_FOR_PROVIDER", "WAITING_FOR_RUNTIME"].includes(mission.status)) ?? null;
  const activeTask = snapshot.tasks.find(task => task.status === "IN_PROGRESS") ?? snapshot.tasks.find(task => task.status === "ELIGIBLE") ?? null;
  const recent = snapshot.activity[0] ?? null;
  const health = calculateCognitiveHealth({ tasks: snapshot.tasks, missions: snapshot.missions, memories: snapshot.memories, attention: snapshot.attention });
  const blockers = snapshot.attention.filter(item => item.state === "OPEN" && item.severity === "ACTION_REQUIRED").map(item => item.title).slice(0, 8);
  return {
    currentObjective: activeMission?.objective ?? null,
    currentTask: activeTask?.title ?? null,
    activeWorkers: snapshot.workers.filter(worker => ["QUEUED", "RUNNING", "WAITING"].includes(worker.state)).length,
    recentAction: recent ? `${recent.action}: ${recent.subjectType}` : null,
    nextAction: activeTask ? `Run eligible task: ${activeTask.title}` : activeMission?.status === "WAITING_FOR_RUNTIME" ? "Await durable-runtime activation or dispatch through a configured runtime." : null,
    blockers,
    health: health.health,
  };
}

export async function getLunaCognitiveHome(userId: number) {
  const [snapshot, summary, self] = await Promise.all([
    getLunaCognitiveSnapshot(userId),
    getLunaActivitySummary(userId),
    getOrCreateLunaSelfState(userId),
  ]);
  const observedSelfModel = buildObservedLunaSelfModel({
    self: self.self,
    state: snapshot.state,
    memories: snapshot.memories,
    missionStatuses: snapshot.missions.map(mission => mission.status),
    workerStates: snapshot.workers.map(worker => worker.state),
    reflectionCount: snapshot.reflections.length,
    unresolvedAttentionCount: snapshot.attention.filter(item => item.state === "OPEN").length,
  });
  const claimInspections = inspectLunaClaims({ claims: snapshot.claims, evidence: snapshot.claimEvidence, revisions: snapshot.claimRevisions, limit: 12 });
  const attentionSystem = inspectLunaAttentionSystem({ gaps: snapshot.knowledgeGaps, curiosity: snapshot.curiosityCandidates, assessments: snapshot.priorityAssessments });
  const workerSelectionAdvice = adviseLunaWorkerSelection({ claims: snapshot.claims, gaps: snapshot.knowledgeGaps, memories: snapshot.memories });
  const learningSummary = summarizeLunaLearning({ reflections: snapshot.reflections, attention: snapshot.attention, gaps: snapshot.knowledgeGaps, claims: snapshot.claims });
  const actionCandidate = assessNextLunaAutonomousDecision({
    autonomyEnabled: snapshot.state.autonomyEnabled,
    cognitiveActionsEnabled: snapshot.state.cognitiveActionsEnabled,
    gaps: snapshot.knowledgeGaps,
    priorityAssessments: snapshot.priorityAssessments,
    attention: snapshot.attention,
    missions: snapshot.missions,
    decisions: snapshot.decisions,
    foundation: self.self.foundation,
  });
  return { snapshot, summary, self, observedSelfModel, claimInspections, attentionSystem, workerSelectionAdvice, learningSummary, actionCandidate };
}
