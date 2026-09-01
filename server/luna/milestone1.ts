import {
  LUNA_MEMORY_KINDS,
  LUNA_WORKER_CONTRACTS,
  type LunaCognitiveState,
  type LunaMemory,
  type LunaSelfState,
} from "@shared/lunaCognitive";
import type { RetrievedMemory } from "./cognition";
import { deriveDevelopmentalContext } from "./developmentalContext";

export type LunaObservedSelfModel = {
  identity: string;
  storedVersion: number;
  registeredCapabilities: string[];
  registeredWorkerRoles: string[];
  limitations: string[];
  currentState: {
    currentFocus: string | null;
    activeGoalCount: number;
    activeMissionCount: number;
    activeWorkerCount: number;
    queuedTaskCount: number;
    attentionCount: number;
    health: LunaCognitiveState["health"];
  };
  knowledgeState: {
    memoryCount: number;
    memoryKindsPresent: LunaMemory["memoryKind"][];
    uncertainMemoryCount: number;
    contradictedMemoryCount: number;
    unresolvedAttentionCount: number;
  };
  history: {
    completedMissionCount: number;
    completedWorkerCount: number;
    reflectionCount: number;
  };
};

export type LunaMemoryRetrievalExplanation = {
  query: string;
  returnedCount: number;
  limit: number;
  policy: "bounded-source-and-truth-aware";
  selection: Array<{
    memoryId: string;
    memoryKind: LunaMemory["memoryKind"];
    sourceType: LunaMemory["sourceType"];
    truthState: LunaMemory["truthState"];
    importance: number;
    matchedTerms: string[];
    retrievalScore: number;
  }>;
  omitted: {
    inactiveMemoryCount: number;
    projectFilteredMemoryCount: number;
  };
  taxonomy: typeof LUNA_MEMORY_KINDS;
};

/**
 * Produces an inspectable view of Luna's persisted state. It deliberately derives capabilities
 * from the registered contracts rather than accepting prose that could imply an unimplemented
 * tool, provider, scientific authority, or physical operation.
 */
export function buildObservedLunaSelfModel(input: {
  self: LunaSelfState;
  state: LunaCognitiveState;
  memories: LunaMemory[];
  missionStatuses: string[];
  workerStates: string[];
  reflectionCount: number;
  unresolvedAttentionCount: number;
}): LunaObservedSelfModel {
  const registeredCapabilities = Array.from(new Set([
    "Persistent owner-scoped cognitive state",
    "Bounded, provenance-labeled memory retrieval",
    "Versioned and auditable software-worker coordination",
    ...LUNA_WORKER_CONTRACTS.map(contract => `${contract.role}: ${contract.purpose}`),
  ]));
  const memoryKindsPresent = LUNA_MEMORY_KINDS.filter(kind => input.memories.some(memory => memory.memoryKind === kind));
  const foundation = input.self.foundation;
  const developmental = foundation ? deriveDevelopmentalContext(foundation) : null;
  return {
    identity: foundation
      ? `${input.self.identitySummary} Foundation identity: ${foundation.name}; starting age ${foundation.startingAge}; current age ${foundation.currentAge}; native language ${foundation.nativeLanguage}; developmental stage ${developmental?.stage}; personality foundation ${foundation.personalityFoundation}; personality foundation knowledge ${foundation.personalityKnowledge}. Appearance remains creator-controlled and is available only when semantically relevant.`
      : input.self.identitySummary,
    storedVersion: input.self.currentVersion,
    registeredCapabilities,
    registeredWorkerRoles: LUNA_WORKER_CONTRACTS.map(contract => contract.role),
    limitations: input.self.limitations,
    currentState: {
      currentFocus: input.self.currentFocus,
      activeGoalCount: input.self.activeGoalIds.length,
      activeMissionCount: input.state.activeMissionCount,
      activeWorkerCount: input.state.activeWorkerCount,
      queuedTaskCount: input.state.queuedTaskCount,
      attentionCount: input.state.attentionCount,
      health: input.state.health,
    },
    knowledgeState: {
      memoryCount: input.memories.length,
      memoryKindsPresent,
      uncertainMemoryCount: input.memories.filter(memory => ["UNKNOWN", "HYPOTHESIS", "ASSUMPTION", "PROPOSED"].includes(memory.truthState)).length,
      contradictedMemoryCount: input.memories.filter(memory => memory.truthState === "CONTRADICTED").length,
      unresolvedAttentionCount: input.unresolvedAttentionCount,
    },
    history: {
      completedMissionCount: input.missionStatuses.filter(status => status === "COMPLETED").length,
      completedWorkerCount: input.workerStates.filter(state => state === "COMPLETED").length,
      reflectionCount: input.reflectionCount,
    },
  };
}

/** Explains bounded retrieval without exposing hidden reasoning or treating inference as source fact. */
export function explainMemoryRetrieval(input: {
  query: string;
  limit: number;
  memories: LunaMemory[];
  retrieved: RetrievedMemory[];
  projectId?: string | null;
}): LunaMemoryRetrievalExplanation {
  const inactiveMemoryCount = input.memories.filter(memory => !memory.active).length;
  const projectFilteredMemoryCount = input.projectId
    ? input.memories.filter(memory => memory.active && memory.projectId !== null && memory.projectId !== input.projectId && memory.memoryKind !== "SELF").length
    : 0;
  return {
    query: input.query,
    returnedCount: input.retrieved.length,
    limit: input.limit,
    policy: "bounded-source-and-truth-aware",
    selection: input.retrieved.map(memory => ({
      memoryId: memory.id,
      memoryKind: memory.memoryKind,
      sourceType: memory.sourceType,
      truthState: memory.truthState,
      importance: memory.importance,
      matchedTerms: memory.matchedTerms,
      retrievalScore: memory.retrievalScore,
    })),
    omitted: { inactiveMemoryCount, projectFilteredMemoryCount },
    taxonomy: LUNA_MEMORY_KINDS,
  };
}
