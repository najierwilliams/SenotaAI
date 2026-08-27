import { describe, expect, it } from "vitest";
import { buildObservedLunaSelfModel, explainMemoryRetrieval } from "./milestone1";
import { retrieveRelevantMemories } from "./cognition";
import type { LunaCognitiveState, LunaMemory, LunaSelfState } from "@shared/lunaCognitive";

const self: LunaSelfState = {
  workspaceId: "workspace-1",
  identitySummary: "Luna is a persistent software assistant.",
  capabilities: ["Unverified prose capability"],
  limitations: ["Software only."],
  currentFocus: "Bounded cognitive work",
  activeGoalIds: ["goal-1"],
  uncertaintySummary: "Unknowns remain explicit.",
  currentVersion: 4,
  updatedAt: "2026-08-27T00:00:00.000Z",
};

const state: LunaCognitiveState = {
  workspaceId: "workspace-1",
  self,
  autonomyEnabled: true,
  maintenanceEnabled: false,
  activeMissionCount: 1,
  activeWorkerCount: 2,
  queuedTaskCount: 3,
  attentionCount: 1,
  health: "DEGRADED",
  updatedAt: "2026-08-27T00:00:00.000Z",
};

function memory(overrides: Partial<LunaMemory> = {}): LunaMemory {
  return {
    id: "memory-1",
    workspaceId: "workspace-1",
    memoryKind: "SEMANTIC",
    content: "Luna stores bounded evidence-aware project context.",
    importance: 4,
    truthState: "INFERENCE",
    sourceType: "LUNA",
    sourceObjectIds: [],
    projectId: null,
    missionId: null,
    tags: ["context"],
    provenance: { method: "test" },
    active: true,
    currentVersion: 1,
    createdAt: "2026-08-27T00:00:00.000Z",
    updatedAt: "2026-08-27T00:00:00.000Z",
    ...overrides,
  };
}

describe("Milestone 1 grounded cognitive projections", () => {
  it("derives capabilities exclusively from registered runtime contracts", () => {
    const result = buildObservedLunaSelfModel({
      self,
      state,
      memories: [memory(), memory({ id: "memory-2", memoryKind: "SELF", truthState: "UNKNOWN" }), memory({ id: "memory-3", truthState: "CONTRADICTED" })],
      missionStatuses: ["COMPLETED", "RUNNING"],
      workerStates: ["COMPLETED", "COMPLETED", "RUNNING"],
      reflectionCount: 2,
      unresolvedAttentionCount: 1,
    });

    expect(result.registeredCapabilities).toContain("Persistent owner-scoped cognitive state");
    expect(result.registeredCapabilities).toContain("PLANNER_AGENT: Turns a bounded objective into a persisted task graph.");
    expect(result.registeredCapabilities).not.toContain("Unverified prose capability");
    expect(result.knowledgeState).toMatchObject({ memoryCount: 3, uncertainMemoryCount: 1, contradictedMemoryCount: 1, unresolvedAttentionCount: 1 });
    expect(result.history).toEqual({ completedMissionCount: 1, completedWorkerCount: 2, reflectionCount: 2 });
  });

  it("explains bounded source- and truth-aware retrieval without exposing hidden reasoning", () => {
    const memories = [
      memory({ id: "active-memory" }),
      memory({ id: "inactive-memory", active: false, content: "Luna stores stale context" }),
      memory({ id: "other-project", projectId: "project-2", content: "Luna stores project context" }),
    ];
    const retrieved = retrieveRelevantMemories({ query: "Luna context", memories, limit: 2, projectId: "project-1" });
    const result = explainMemoryRetrieval({ query: "Luna context", limit: 2, memories, retrieved, projectId: "project-1" });

    expect(result.policy).toBe("bounded-source-and-truth-aware");
    expect(result.returnedCount).toBe(1);
    expect(result.selection[0]).toMatchObject({ memoryId: "active-memory", matchedTerms: expect.arrayContaining(["luna", "context"]), truthState: "INFERENCE" });
    expect(result.omitted).toEqual({ inactiveMemoryCount: 1, projectFilteredMemoryCount: 1 });
    expect(result.taxonomy).toContain("SELF");
  });
});
