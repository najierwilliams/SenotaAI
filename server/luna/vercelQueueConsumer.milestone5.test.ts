import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  record: vi.fn(),
  updateDecision: vi.fn(async (input) => input),
  updateGap: vi.fn(async (input) => input),
  reflection: vi.fn(async (input) => input),
  updateMission: vi.fn(async (input) => input),
}));

vi.mock("./supabase", () => ({
  calculateEligibleTasks: (tasks: Array<{ status: string; dependencyTaskIds: string[] }>) => tasks.filter(task => ["PENDING", "ELIGIBLE"].includes(task.status) && task.dependencyTaskIds.length === 0),
  createLunaAttention: vi.fn(),
  createLunaReflection: mocks.reflection,
  getLunaCognitiveSnapshot: vi.fn(),
  recordLunaRuntimeEvent: mocks.record,
  updateLunaAutonomousDecision: mocks.updateDecision,
  updateLunaKnowledgeGap: mocks.updateGap,
  updateLunaMission: mocks.updateMission,
  updateLunaTask: vi.fn(),
  updateLunaWorker: vi.fn(),
}));

import { handleLunaQueueMessage } from "./vercelQueueConsumer";

const mission = {
  id: "mission-m5", workspaceId: "workspace-m5", projectId: "project-m5", decisionId: "decision-m5", missionOrigin: "AUTONOMOUS",
  status: "RUNNING", runtimeRunId: "run-m5", cancelRequested: false, pauseRequested: false, maxWorkers: 1,
};
const worker = { id: "worker-m5", missionId: mission.id, workspaceId: mission.workspaceId, taskId: "task-m5", role: "PLANNER_AGENT", state: "QUEUED" };
const task = { id: "task-m5", missionId: mission.id, workerRole: "PLANNER_AGENT", status: "ELIGIBLE", dependencyTaskIds: [], maxRetries: 2 };
const metadata = {
  messageId: "provider-message-m5", deliveryCount: 1, createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000),
  topicName: "luna_worker_v1", consumerGroup: "luna", region: "iad1",
};
const payload = { version: 1 as const, kind: "WORKER_STEP" as const, missionId: mission.id, workspaceId: mission.workspaceId, workerId: worker.id, missionRunId: "run-m5" };

describe("Milestone 5 Queue completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mission.status = "RUNNING";
    worker.state = "QUEUED";
    task.status = "ELIGIBLE";
  });

  it("records an auditable, conservative terminal learning summary without creating a replacement mission", async () => {
    const decision = { id: "decision-m5", missionId: mission.id, sourceType: "KNOWLEDGE_GAP", sourceId: "gap-m5" };
    const state = {
      missions: [mission], workers: [worker], tasks: [task], activity: [], decisions: [decision],
      resultValidations: [
        { id: "validation-accepted", missionId: mission.id, workerId: worker.id, status: "ACCEPTED" },
        { id: "validation-review", missionId: mission.id, workerId: "worker-review", status: "NEEDS_REVIEW" },
      ],
    } as any;
    const executeWorker = vi.fn(async () => { worker.state = "COMPLETED"; task.status = "COMPLETED"; });
    const dependencies = {
      snapshot: vi.fn(async () => state),
      queueWorkers: vi.fn(async () => []),
      executeWorker,
      publisher: { send: vi.fn() },
    };

    await handleLunaQueueMessage(payload, metadata as any, dependencies as any);

    expect(executeWorker).toHaveBeenCalledOnce();
    expect(dependencies.queueWorkers).toHaveBeenCalledOnce();
    expect(dependencies.publisher.send).not.toHaveBeenCalled();
    expect(mocks.updateDecision).toHaveBeenCalledWith(expect.objectContaining({
      decisionId: "decision-m5", missionId: mission.id, status: "COMPLETED", outcome: "NO_ACTION",
    }));
    expect(mocks.updateGap).toHaveBeenCalledWith(expect.objectContaining({
      gapId: "gap-m5", status: "WATCHING", severity: "WARNING",
    }));
    expect(mocks.reflection).toHaveBeenCalledWith(expect.objectContaining({
      missionId: mission.id, newInferenceCount: 1, unresolvedCount: 1, truthState: "INFERENCE",
    }));
    expect(mocks.updateMission).toHaveBeenCalledWith(expect.objectContaining({
      missionId: mission.id, status: "COMPLETED", finished: true,
    }));
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "MISSION_COMPLETED",
      detail: expect.objectContaining({ acceptedValidations: 1, reviewValidations: 1, decisionId: "decision-m5" }),
    }));
  });
});
