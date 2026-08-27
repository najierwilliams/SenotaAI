import { describe, expect, it } from "vitest";
import type { LunaAttentionItem, LunaMemory, LunaMission, LunaTask } from "@shared/lunaCognitive";
import {
  buildBoundedCognitiveContext,
  buildCognitivePlan,
  calculateCognitiveHealth,
  deriveAttentionFromState,
  deriveTaskStates,
  findExactDuplicateMemoryClusters,
  retrieveRelevantMemories,
} from "./cognition";

function memory(input: Partial<LunaMemory> & Pick<LunaMemory, "id" | "content">): LunaMemory {
  return {
    id: input.id, workspaceId: "workspace-1", memoryKind: "RESEARCH", content: input.content,
    importance: input.importance ?? 3, truthState: input.truthState ?? "INFERENCE", sourceType: input.sourceType ?? "LUNA",
    sourceObjectIds: [], projectId: null, missionId: null, tags: input.tags ?? [], provenance: {}, active: input.active ?? true,
    currentVersion: 1, createdAt: "2026-08-27T00:00:00Z", updatedAt: input.updatedAt ?? "2026-08-27T00:00:00Z",
  };
}

function task(input: Partial<LunaTask> & Pick<LunaTask, "id" | "title">): LunaTask {
  return {
    id: input.id, workspaceId: "workspace-1", projectId: null, goalId: null, missionId: null, title: input.title,
    details: "", status: input.status ?? "PENDING", priority: 3, workerRole: input.workerRole ?? "SCOUT",
    dependencyTaskIds: input.dependencyTaskIds ?? [], relatedObjectIds: [], retriesUsed: 0, maxRetries: 2,
    scheduledFor: null, startedAt: null, completedAt: null, errorMessage: null, currentVersion: 1,
    createdAt: "2026-08-27T00:00:00Z", updatedAt: "2026-08-27T00:00:00Z",
  };
}

describe("Luna cognitive core", () => {
  it("prioritizes declared provider evidence over an equally relevant Luna inference", () => {
    const result = retrieveRelevantMemories({
      query: "hippocampus provider evidence",
      memories: [
        memory({ id: "inference", content: "Hippocampus provider evidence working note", sourceType: "LUNA", truthState: "INFERENCE", importance: 3 }),
        memory({ id: "provider", content: "Hippocampus provider evidence record", sourceType: "PROVIDER", truthState: "PROVIDER_CONFIRMED", importance: 3 }),
      ],
    });
    expect(result.map(item => item.id)).toEqual(["provider", "inference"]);
    expect(result[0].matchedTerms).toContain("hippocampus");
  });

  it("identifies only exact normalized duplicates and retains the strongest canonical memory", () => {
    const result = findExactDuplicateMemoryClusters([
      memory({ id: "canonical", content: "Luna retained an inferred research note.", importance: 5 }),
      memory({ id: "duplicate", content: "  luna retained an inferred research note. ", importance: 2 }),
      memory({ id: "near", content: "Luna retained a similar inferred research note.", importance: 4 }),
      memory({ id: "inactive", content: "Luna retained an inferred research note.", active: false }),
    ]);
    expect(result).toEqual([{ canonicalMemoryId: "canonical", duplicateMemoryIds: ["duplicate"], normalizedContent: "luna retained an inferred research note." }]);
  });

  it("builds an actual dependency order with planning, bounded parallel scouting, research, validation, synthesis, and reflection", () => {
    const plan = buildCognitivePlan("Research the hippocampus knowledge gap", 5);
    expect(plan.tasks.map(item => item.role)).toEqual(["PLANNER_AGENT", "MEMORY_AGENT", "SCOUT", "SCOUT", "RESEARCHER", "VALIDATOR", "SYNTHESIS_AGENT", "REFLECTION_AGENT"]);
    expect(plan.tasks.find(item => item.key === "research")?.dependsOnKeys).toEqual(["scout_context", "scout_gaps"]);
    expect(plan.tasks.find(item => item.key === "validate")?.dependsOnKeys).toEqual(["research"]);
    expect(plan.unresolvedAssumptions.join(" ")).toContain("NOT_ESTABLISHED");
    expect(plan.unresolvedAssumptions.join(" ")).toContain("biological");
  });

  it("does not make dependent tasks eligible when a dependency fails", () => {
    const statuses = deriveTaskStates([
      task({ id: "failed", title: "Source discovery", status: "FAILED" }),
      task({ id: "dependent", title: "Validation", dependencyTaskIds: ["failed"] }),
      task({ id: "ready", title: "Independent task" }),
    ]);
    expect(statuses.get("dependent")).toBe("BLOCKED");
    expect(statuses.get("ready")).toBe("ELIGIBLE");
  });

  it("creates attention from persisted failure and contradiction states rather than an invented activity signal", () => {
    const attention = deriveAttentionFromState({
      tasks: [task({ id: "blocked", title: "Blocked task", status: "BLOCKED" })],
      missions: [{ id: "mission", status: "FAILED" } as LunaMission],
      memories: [memory({ id: "conflict", content: "Two source claims conflict", truthState: "CONTRADICTED" })],
    });
    expect(attention).toHaveLength(3);
    expect(attention.every(item => item.severity === "ACTION_REQUIRED")).toBe(true);
  });

  it("keeps prompt context bounded and explicitly labels source and truth states", () => {
    const context = buildBoundedCognitiveContext({
      objective: "Review durable state",
      maximumCharacters: 1_000,
      memories: [
        { ...memory({ id: "one", content: "A".repeat(900), sourceType: "LUNA", truthState: "INFERENCE" }), retrievalScore: 1, matchedTerms: [] },
        { ...memory({ id: "two", content: "B".repeat(900), sourceType: "PROVIDER", truthState: "PROVIDER_CONFIRMED" }), retrievalScore: 1, matchedTerms: [] },
      ],
    });
    expect(context.length).toBeLessThanOrEqual(1_000);
    expect(context).toContain("Retrieved durable context");
    expect(context).toContain("INFERENCE");
  });

  it("reports degraded or action-required health only from durable task, mission, memory, and attention state", () => {
    const health = calculateCognitiveHealth({
      tasks: [task({ id: "blocked", title: "Blocked", status: "BLOCKED" })],
      missions: [{ id: "m1", status: "RECOVERY_REQUIRED" } as LunaMission],
      memories: [memory({ id: "m", content: "Record" })],
      attention: [{ id: "a", state: "OPEN", severity: "ACTION_REQUIRED" } as LunaAttentionItem],
    });
    expect(health).toMatchObject({ health: "ACTION_REQUIRED", blockedTasks: 1, failedMissions: 1, criticalAttention: 1 });
  });
});
