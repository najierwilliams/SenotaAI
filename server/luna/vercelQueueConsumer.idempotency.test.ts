import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordLunaRuntimeEvent } = vi.hoisted(() => ({ recordLunaRuntimeEvent: vi.fn() }));

vi.mock("./supabase", () => ({
  calculateEligibleTasks: (tasks: Array<{ status: string; dependencyTaskIds: string[] }>) => tasks.filter((task) => ["PENDING", "ELIGIBLE"].includes(task.status) && task.dependencyTaskIds.length === 0),
  createLunaAttention: vi.fn(),
  createLunaReflection: vi.fn(),
  getLunaCognitiveSnapshot: vi.fn(),
  recordLunaRuntimeEvent,
  updateLunaMission: vi.fn(),
  updateLunaTask: vi.fn(),
  updateLunaWorker: vi.fn(),
}));

import { handleLunaQueueMessage } from "./vercelQueueConsumer";
import { LunaWorkerCancellationError } from "./workerExecutor";

const mission = {
  id: "mission-duplicate", workspaceId: "workspace-1", projectId: "project-1", status: "RUNNING", runtimeRunId: "run-1",
  cancelRequested: false, pauseRequested: false, maxWorkers: 1,
};
const worker = { id: "worker-1", missionId: mission.id, workspaceId: mission.workspaceId, taskId: "task-1", role: "PLANNER_AGENT", state: "QUEUED" };
const task = { id: "task-1", missionId: mission.id, workerRole: "PLANNER_AGENT", status: "ELIGIBLE", dependencyTaskIds: [], maxRetries: 2 };
const metadata = (deliveryCount: number) => ({
  messageId: "provider-message-1", deliveryCount, createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000),
  topicName: "luna_worker_v1", consumerGroup: "luna", region: "iad1",
});
const payload = { version: 1 as const, kind: "WORKER_STEP" as const, missionId: mission.id, workspaceId: mission.workspaceId, workerId: worker.id, missionRunId: "run-1" };

describe("Luna private Queue consumer idempotency", () => {
  beforeEach(() => recordLunaRuntimeEvent.mockReset());

  it("recognizes a real repeated provider message after completion and prevents a second worker execution", async () => {
    const state = {
      missions: [mission],
      workers: [worker],
      tasks: [task, { id: "remaining-task", missionId: mission.id, workerRole: "MEMORY_AGENT", status: "PENDING", dependencyTaskIds: [task.id], maxRetries: 2 }],
      activity: [],
    } as any;
    const executeWorker = vi.fn(async () => { worker.state = "COMPLETED"; task.status = "COMPLETED"; });
    const publisher = { send: vi.fn() } as any;
    const dependencies = { snapshot: vi.fn(async () => state), queueWorkers: vi.fn(async () => []), executeWorker, publisher };

    await handleLunaQueueMessage(payload, metadata(1) as any, dependencies);
    await handleLunaQueueMessage(payload, metadata(2) as any, dependencies);

    expect(executeWorker).toHaveBeenCalledTimes(1);
    expect(publisher.send).not.toHaveBeenCalled();
    expect(worker.state).toBe("COMPLETED");
    expect(task.status).toBe("COMPLETED");
    expect(recordLunaRuntimeEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "WORKER_QUEUE_DUPLICATE", workerId: worker.id,
      detail: expect.objectContaining({ providerMessageId: "provider-message-1", deliveryCount: 2, state: "COMPLETED" }),
    }));
  });

  it("acknowledges cooperative active-worker cancellation without retry, recovery, or follow-up scheduling", async () => {
    const activeTask = { ...task, id: "task-active", status: "ELIGIBLE" };
    const activeWorker = { ...worker, id: "worker-active", taskId: activeTask.id, state: "RUNNING" };
    const executeWorker = vi.fn(async () => { throw new LunaWorkerCancellationError("before_report_persistence"); });
    const dependencies = {
      snapshot: vi.fn(async () => ({ missions: [mission], workers: [activeWorker], tasks: [activeTask], activity: [] })),
      queueWorkers: vi.fn(), executeWorker, publisher: { send: vi.fn() },
    };

    await expect(handleLunaQueueMessage({ ...payload, workerId: activeWorker.id }, metadata(1) as any, dependencies as any)).resolves.toBeUndefined();

    expect(executeWorker).toHaveBeenCalledTimes(1);
    expect(dependencies.queueWorkers).not.toHaveBeenCalled();
    expect(recordLunaRuntimeEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "WORKER_QUEUE_CANCELLED", workerId: activeWorker.id,
      detail: expect.objectContaining({ stage: "before_report_persistence", deliveryCount: 1 }),
    }));
  });

  it("acknowledges a stale worker delivery after owner cancellation without executing it or scheduling recovery", async () => {
    const cancelled = { ...mission, id: "mission-cancelled", cancelRequested: true, status: "CANCELLED" };
    const cancelledWorker = { ...worker, id: "worker-cancelled", missionId: cancelled.id, state: "CANCELLED" };
    const executeWorker = vi.fn();
    const dependencies = {
      snapshot: vi.fn(async () => ({ missions: [cancelled], workers: [cancelledWorker], tasks: [], activity: [] })),
      queueWorkers: vi.fn(), executeWorker, publisher: { send: vi.fn() },
    };

    await handleLunaQueueMessage({ ...payload, missionId: cancelled.id, workerId: cancelledWorker.id }, metadata(2) as any, dependencies as any);

    expect(executeWorker).not.toHaveBeenCalled();
    expect(recordLunaRuntimeEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "WORKER_QUEUE_SKIPPED", workerId: cancelledWorker.id,
      detail: expect.objectContaining({ status: "CANCELLED" }),
    }));
  });
});
