import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  snapshot: vi.fn(),
  createDecision: vi.fn(),
  updateDecision: vi.fn(),
  runtimeEvent: vi.fn(),
  plan: vi.fn(),
  dispatch: vi.fn(),
}));

vi.mock("./supabase", () => ({
  getLunaCognitiveSnapshot: mocks.snapshot,
  createOrGetLunaAutonomousDecision: mocks.createDecision,
  updateLunaAutonomousDecision: mocks.updateDecision,
  recordLunaRuntimeEvent: mocks.runtimeEvent,
}));
vi.mock("./orchestrator", () => ({ planLunaMission: mocks.plan, dispatchLunaMission: mocks.dispatch }));

import { assessAndDispatchLunaCognitiveAction } from "./cognitiveActionService";

const baseSnapshot = {
  state: { autonomyEnabled: true, cognitiveActionsEnabled: true },
  knowledgeGaps: [{ id: "gap-1", workspaceId: "workspace-1", status: "OPEN", question: "Which source is missing?", title: "Gap", projectId: null, claimId: null, relatedObjectId: null, requestedEvidence: "source", rationale: "test", severity: "WARNING", sourceType: "SYSTEM", provenance: {}, currentVersion: 1, createdAt: "2026-08-27T00:00:00.000Z", updatedAt: "2026-08-27T00:00:00.000Z" }],
  priorityAssessments: [{ id: "assessment-1", workspaceId: "workspace-1", targetType: "GAP", targetId: "gap-1", urgencyScore: 0.8, impactScore: 0.8, evidenceScore: 0.8, unblockScore: 0.8, riskScore: 0, priorityScore: 0.8, explanation: "test", assumptions: [], actorScope: "luna", createdAt: "2026-08-27T00:00:00.000Z" }],
  attention: [], missions: [], decisions: [],
};
const decision = { id: "decision-1", workspaceId: "workspace-1", sourceType: "KNOWLEDGE_GAP", sourceId: "gap-1", decisionKey: "a".repeat(64), objective: "Resolve bounded persisted knowledge gap: Which source is missing?", status: "RECOMMENDED", outcome: "NO_ACTION", priorityScore: 0.8, policyVersion: "luna-m5-v1", rationale: "test", evidence: {}, budget: { maxWorkers: 4, maxSteps: 24, maxRetries: 2, maxDurationSeconds: 900, maxModelRequests: 12, maxTokenBudget: 24000 }, missionId: null, createdAt: "2026-08-27T00:00:00.000Z", updatedAt: "2026-08-27T00:00:00.000Z" };
const mission = { id: "mission-1", workspaceId: "workspace-1", decisionId: "decision-1", runtimeRunId: "queue-run-1", status: "RUNNING" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.snapshot.mockResolvedValue(baseSnapshot);
  mocks.createDecision.mockResolvedValue({ decision, created: true });
  mocks.plan.mockResolvedValue({ mission, projectId: "project-1", goalId: "goal-1", tasks: [] });
  mocks.updateDecision.mockImplementation(async (input: Record<string, unknown>) => ({ ...decision, ...input }));
  mocks.dispatch.mockResolvedValue({ accepted: true, mission, runtime: { provider: "vercel-queues", status: "CONFIGURED", detail: "Queue accepted run." } });
  mocks.runtimeEvent.mockResolvedValue(undefined);
});

describe("Milestone 5 cognitive action dispatch", () => {
  it("does nothing while either owner control is disabled", async () => {
    mocks.snapshot.mockResolvedValue({ ...baseSnapshot, state: { autonomyEnabled: true, cognitiveActionsEnabled: false } });
    await expect(assessAndDispatchLunaCognitiveAction({ userId: 1 })).resolves.toMatchObject({ accepted: false, decision: null, mission: null });
    expect(mocks.createDecision).not.toHaveBeenCalled();
    expect(mocks.plan).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it("persists one deterministic decision, one linked bounded mission, then uses the durable dispatcher", async () => {
    const result = await assessAndDispatchLunaCognitiveAction({ userId: 1 });
    expect(mocks.createDecision).toHaveBeenCalledOnce();
    expect(mocks.plan).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, decisionId: "decision-1", missionOrigin: "AUTONOMOUS", idempotencyKey: `m5-decision:${decision.decisionKey}`, maxWorkers: 4, maxSteps: 24, maxRetries: 2 }));
    expect(mocks.dispatch).toHaveBeenCalledWith(expect.objectContaining({ userId: 1, missionId: "mission-1" }));
    expect(mocks.updateDecision).toHaveBeenLastCalledWith(expect.objectContaining({ decisionId: "decision-1", missionId: "mission-1", status: "DISPATCHED", outcome: "DISPATCHED" }));
    expect(result).toMatchObject({ accepted: true, decision: { id: "decision-1", status: "DISPATCHED" }, mission: { id: "mission-1" } });
  });

  it("records unavailable durable runtime as blocked rather than representing mission work as active", async () => {
    mocks.dispatch.mockResolvedValue({ accepted: false, mission: { ...mission, status: "WAITING_FOR_RUNTIME", runtimeRunId: null }, runtime: { provider: "vercel-queues", status: "UNAVAILABLE", detail: "Queue configuration is absent." } });
    const result = await assessAndDispatchLunaCognitiveAction({ userId: 1 });
    expect(result).toMatchObject({ accepted: false, decision: { status: "BLOCKED", outcome: "RUNTIME_UNAVAILABLE" } });
    expect(mocks.updateDecision).toHaveBeenLastCalledWith(expect.objectContaining({ status: "BLOCKED", outcome: "RUNTIME_UNAVAILABLE" }));
  });
});
