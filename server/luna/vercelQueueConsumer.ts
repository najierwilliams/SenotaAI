import { QueueClient, type MessageMetadata, type RetryDirective } from "@vercel/queue";
import type { LunaMission, LunaWorker } from "@shared/lunaCognitive";
import { queueMissionWorkers } from "./orchestrator";
import { calculateEligibleTasks, createLunaAttention, createLunaReflection, getLunaCognitiveSnapshot, recordLunaRuntimeEvent, updateLunaMission, updateLunaTask, updateLunaWorker } from "./supabase";
import { executeLunaWorkerStep, isLunaWorkerCancellationError } from "./workerExecutor";
import { createLunaQueueMessage, LUNA_VERCEL_QUEUE_TOPIC, type LunaQueueMessage, type LunaQueuePublisher } from "./vercelQueueRuntime";

export const LUNA_QUEUE_OWNER_ID = 1;
const MAX_QUEUE_DELIVERIES = 6;

export type LunaQueueConsumerDependencies = {
  publisher: LunaQueuePublisher;
  snapshot: typeof getLunaCognitiveSnapshot;
  queueWorkers: typeof queueMissionWorkers;
  executeWorker: typeof executeLunaWorkerStep;
};

const livePublisher = new QueueClient();
const liveDependencies: LunaQueueConsumerDependencies = {
  publisher: livePublisher,
  snapshot: getLunaCognitiveSnapshot,
  queueWorkers: queueMissionWorkers,
  executeWorker: executeLunaWorkerStep,
};

class LunaQueueTerminalError extends Error {}

function isLunaQueueMessage(value: unknown): value is LunaQueueMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return message.version === 1
    && (message.kind === "MISSION_START" || message.kind === "WORKER_STEP")
    && typeof message.missionId === "string"
    && typeof message.workspaceId === "string"
    && (message.kind === "MISSION_START" || typeof message.workerId === "string")
    && (message.kind === "MISSION_START" || typeof message.missionRunId === "string");
}

function runtimeActor() {
  return "luna:vercel-queue";
}

function retryDelaySeconds(deliveryCount: number) {
  return Math.min(300, 2 ** Math.max(0, deliveryCount - 1) * 5);
}

async function publishWorkers(input: { mission: LunaMission; workers: LunaWorker[]; publisher: LunaQueuePublisher }) {
  for (const worker of input.workers) {
    const result = await input.publisher.send(
      LUNA_VERCEL_QUEUE_TOPIC,
      createLunaQueueMessage({
        missionId: input.mission.id,
        workspaceId: input.mission.workspaceId,
        workerId: worker.id,
        missionRunId: input.mission.runtimeRunId ?? "",
      }),
      { idempotencyKey: `mission:${input.mission.id}:run:${input.mission.runtimeRunId ?? "initial"}:worker:${worker.id}`, retentionSeconds: 604_800 },
    );
    await recordLunaRuntimeEvent({
      userId: LUNA_QUEUE_OWNER_ID,
      action: "WORKER_QUEUE_ACCEPTED",
      subjectType: "WORKER",
      subjectId: worker.id,
      missionId: input.mission.id,
      workerId: worker.id,
      actor: runtimeActor(),
      detail: { provider: "vercel-queues", queueMessageId: result.messageId, taskId: worker.taskId, role: worker.role },
    });
    if (!result.messageId) throw new Error("Vercel Queues accepted a worker dispatch without a message ID; the worker was not represented as running.");
  }
}

async function startMission(message: LunaQueueMessage, metadata: MessageMetadata, dependencies: LunaQueueConsumerDependencies) {
  const snapshot = await dependencies.snapshot(LUNA_QUEUE_OWNER_ID);
  const mission = snapshot.missions.find(item => item.id === message.missionId);
  if (!mission || mission.workspaceId !== message.workspaceId) throw new LunaQueueTerminalError("Queue mission does not exist in the owner-scoped Luna workspace.");
  if (mission.cancelRequested || mission.status === "CANCELLED" || mission.pauseRequested || mission.status === "PAUSED") {
    await recordLunaRuntimeEvent({ userId: LUNA_QUEUE_OWNER_ID, action: "MISSION_QUEUE_SKIPPED", subjectType: "MISSION", subjectId: mission.id, missionId: mission.id, actor: runtimeActor(), detail: { providerMessageId: metadata.messageId, status: mission.status, reason: "Persisted owner lifecycle state prevents work." } });
    return;
  }
  if (mission.runtimeRunId && mission.runtimeRunId !== metadata.messageId) {
    await recordLunaRuntimeEvent({ userId: LUNA_QUEUE_OWNER_ID, action: "MISSION_QUEUE_STALE", subjectType: "MISSION", subjectId: mission.id, missionId: mission.id, actor: runtimeActor(), detail: { providerMessageId: metadata.messageId, acceptedRunId: mission.runtimeRunId } });
    return;
  }

  await recordLunaRuntimeEvent({ userId: LUNA_QUEUE_OWNER_ID, action: "MISSION_QUEUE_DELIVERED", subjectType: "MISSION", subjectId: mission.id, missionId: mission.id, actor: runtimeActor(), detail: { providerMessageId: metadata.messageId, deliveryCount: metadata.deliveryCount, topic: metadata.topicName } });
  const workers = await dependencies.queueWorkers({ userId: LUNA_QUEUE_OWNER_ID, mission });
  await publishWorkers({ mission, workers, publisher: dependencies.publisher });
  if (!workers.length) {
    const fresh = await dependencies.snapshot(LUNA_QUEUE_OWNER_ID);
    const active = fresh.workers.some(worker => worker.missionId === mission.id && ["QUEUED", "RUNNING", "WAITING"].includes(worker.state));
    if (!active && fresh.tasks.filter(task => task.missionId === mission.id).every(task => task.status === "COMPLETED")) {
      await completeMission(fresh.missions.find(item => item.id === mission.id) ?? mission, fresh.workers);
    }
  }
}

async function completeMission(mission: LunaMission, workers: LunaWorker[]) {
  if (["COMPLETED", "CANCELLED"].includes(mission.status)) return;
  const reports = workers.filter(worker => worker.missionId === mission.id && worker.state === "COMPLETED").length;
  await createLunaReflection({
    userId: LUNA_QUEUE_OWNER_ID,
    missionId: mission.id,
    projectId: mission.projectId,
    summary: `Durable Vercel Queue mission completed with ${reports} persisted software-worker handoff(s). Outputs remain Luna-owned inferences unless separately supported by immutable source evidence.`,
    newInferenceCount: reports,
    newMemoryCount: 0,
    unresolvedCount: 0,
    confidence: "UNKNOWN",
    nextAction: "Review persisted handoffs, attention, and evidence gaps before initiating another bounded objective.",
    truthState: "INFERENCE",
    actor: runtimeActor(),
  });
  await updateLunaMission({ userId: LUNA_QUEUE_OWNER_ID, missionId: mission.id, status: "COMPLETED", currentFocus: "All dependency-eligible durable worker tasks completed", errorMessage: null, finished: true, actor: runtimeActor(), reason: "All persisted Luna task records reached COMPLETED." });
  await recordLunaRuntimeEvent({ userId: LUNA_QUEUE_OWNER_ID, action: "MISSION_COMPLETED", subjectType: "MISSION", subjectId: mission.id, missionId: mission.id, actor: runtimeActor(), detail: { completedWorkers: reports, provider: "vercel-queues" } });
}

async function handleWorkerFailure(message: LunaQueueMessage, metadata: MessageMetadata, error: unknown, dependencies: LunaQueueConsumerDependencies) {
  const detail = error instanceof Error ? error.message : "Worker failed without an error message.";
  const snapshot = await dependencies.snapshot(LUNA_QUEUE_OWNER_ID);
  const mission = snapshot.missions.find(item => item.id === message.missionId);
  const worker = snapshot.workers.find(item => item.id === message.workerId && item.missionId === message.missionId);
  const task = worker?.taskId ? snapshot.tasks.find(item => item.id === worker.taskId) : null;
  if (!mission || !worker || !task) throw new LunaQueueTerminalError(detail);

  if (metadata.deliveryCount <= task.maxRetries && !mission.cancelRequested && !mission.pauseRequested) {
    await updateLunaTask({ userId: LUNA_QUEUE_OWNER_ID, taskId: task.id, status: "ELIGIBLE", retriesUsed: metadata.deliveryCount, errorMessage: null, actor: runtimeActor(), reason: `Vercel Queue retry ${metadata.deliveryCount} was scheduled after a worker failure.` });
    await updateLunaWorker({ userId: LUNA_QUEUE_OWNER_ID, workerId: worker.id, missionId: mission.id, state: "QUEUED", resetForRetry: true, actor: runtimeActor() });
    await updateLunaMission({ userId: LUNA_QUEUE_OWNER_ID, missionId: mission.id, status: "RUNNING", currentFocus: `Retrying ${worker.role} after queue delivery ${metadata.deliveryCount}`, errorMessage: null, actor: runtimeActor(), reason: "A bounded Vercel Queue retry is pending." });
    await recordLunaRuntimeEvent({ userId: LUNA_QUEUE_OWNER_ID, action: "WORKER_RETRY_SCHEDULED", subjectType: "WORKER", subjectId: worker.id, missionId: mission.id, workerId: worker.id, actor: runtimeActor(), detail: { providerMessageId: metadata.messageId, deliveryCount: metadata.deliveryCount, maxRetries: task.maxRetries, retryAfterSeconds: retryDelaySeconds(metadata.deliveryCount), error: detail } });
    throw error;
  }

  await updateLunaTask({ userId: LUNA_QUEUE_OWNER_ID, taskId: task.id, status: "FAILED", retriesUsed: task.maxRetries, errorMessage: detail, actor: runtimeActor(), reason: "Vercel Queue retry budget was exhausted." });
  await updateLunaMission({ userId: LUNA_QUEUE_OWNER_ID, missionId: mission.id, status: "FAILED", currentFocus: "Worker retry budget exhausted", errorMessage: detail, finished: true, actor: runtimeActor(), reason: "A worker exhausted its bounded durable retry budget." });
  await createLunaAttention({ userId: LUNA_QUEUE_OWNER_ID, missionId: mission.id, severity: "ACTION_REQUIRED", category: "MISSION", title: "Luna durable worker retry budget exhausted", detail, actor: runtimeActor() });
  await recordLunaRuntimeEvent({ userId: LUNA_QUEUE_OWNER_ID, action: "WORKER_RETRY_EXHAUSTED", subjectType: "WORKER", subjectId: worker.id, missionId: mission.id, workerId: worker.id, actor: runtimeActor(), detail: { providerMessageId: metadata.messageId, deliveryCount: metadata.deliveryCount, maxRetries: task.maxRetries, error: detail } });
  throw new LunaQueueTerminalError(detail);
}

async function runWorker(message: LunaQueueMessage, metadata: MessageMetadata, dependencies: LunaQueueConsumerDependencies) {
  const snapshot = await dependencies.snapshot(LUNA_QUEUE_OWNER_ID);
  const mission = snapshot.missions.find(item => item.id === message.missionId);
  const worker = snapshot.workers.find(item => item.id === message.workerId && item.missionId === message.missionId);
  if (!mission || !worker || mission.workspaceId !== message.workspaceId) throw new LunaQueueTerminalError("Queue worker does not exist in the owner-scoped Luna workspace.");
  if (mission.runtimeRunId !== message.missionRunId) {
    await recordLunaRuntimeEvent({ userId: LUNA_QUEUE_OWNER_ID, action: "WORKER_QUEUE_STALE", subjectType: "WORKER", subjectId: worker.id, missionId: mission.id, workerId: worker.id, actor: runtimeActor(), detail: { providerMessageId: metadata.messageId, messageRunId: message.missionRunId, acceptedRunId: mission.runtimeRunId } });
    return;
  }
  if (mission.cancelRequested || mission.status === "CANCELLED" || mission.pauseRequested || mission.status === "PAUSED") {
    await recordLunaRuntimeEvent({ userId: LUNA_QUEUE_OWNER_ID, action: "WORKER_QUEUE_SKIPPED", subjectType: "WORKER", subjectId: worker.id, missionId: mission.id, workerId: worker.id, actor: runtimeActor(), detail: { providerMessageId: metadata.messageId, status: mission.status, reason: "Persisted owner lifecycle state prevents work." } });
    return;
  }
  if (worker.state === "COMPLETED" || worker.state === "CANCELLED") {
    await recordLunaRuntimeEvent({ userId: LUNA_QUEUE_OWNER_ID, action: "WORKER_QUEUE_DUPLICATE", subjectType: "WORKER", subjectId: worker.id, missionId: mission.id, workerId: worker.id, actor: runtimeActor(), detail: { providerMessageId: metadata.messageId, deliveryCount: metadata.deliveryCount, state: worker.state } });
    return;
  }

  const task = worker.taskId ? snapshot.tasks.find(item => item.id === worker.taskId) : null;
  if (!task || !calculateEligibleTasks(snapshot.tasks.filter(item => item.missionId === mission.id)).some(item => item.id === task.id)) {
    throw new LunaQueueTerminalError("Queue worker task is not dependency-eligible.");
  }

  await recordLunaRuntimeEvent({ userId: LUNA_QUEUE_OWNER_ID, action: "WORKER_QUEUE_DELIVERED", subjectType: "WORKER", subjectId: worker.id, missionId: mission.id, workerId: worker.id, actor: runtimeActor(), detail: { providerMessageId: metadata.messageId, missionRunId: message.missionRunId, deliveryCount: metadata.deliveryCount, role: worker.role, taskId: task.id } });
  try {
    await dependencies.executeWorker({ userId: LUNA_QUEUE_OWNER_ID, missionId: mission.id, workerId: worker.id });
  } catch (error) {
    if (isLunaWorkerCancellationError(error)) {
      await recordLunaRuntimeEvent({
        userId: LUNA_QUEUE_OWNER_ID,
        action: "WORKER_QUEUE_CANCELLED",
        subjectType: "WORKER",
        subjectId: worker.id,
        missionId: mission.id,
        workerId: worker.id,
        actor: runtimeActor(),
        detail: { providerMessageId: metadata.messageId, deliveryCount: metadata.deliveryCount, stage: error.stage, guarantee: "Cancelled worker was acknowledged without retry or recovery transition." },
      });
      return;
    }
    return handleWorkerFailure(message, metadata, error, dependencies);
  }

  const fresh = await dependencies.snapshot(LUNA_QUEUE_OWNER_ID);
  const freshMission = fresh.missions.find(item => item.id === mission.id);
  if (!freshMission || freshMission.cancelRequested || freshMission.pauseRequested) return;
  const queuedWorkers = await dependencies.queueWorkers({ userId: LUNA_QUEUE_OWNER_ID, mission: freshMission });
  await publishWorkers({ mission: freshMission, workers: queuedWorkers, publisher: dependencies.publisher });
  const latest = await dependencies.snapshot(LUNA_QUEUE_OWNER_ID);
  const latestMission = latest.missions.find(item => item.id === mission.id);
  const missionTasks = latest.tasks.filter(taskItem => taskItem.missionId === mission.id);
  if (latestMission && missionTasks.length > 0 && missionTasks.every(taskItem => taskItem.status === "COMPLETED")) {
    await completeMission(latestMission, latest.workers);
  }
}

export async function handleLunaQueueMessage(message: unknown, metadata: MessageMetadata, dependencies: LunaQueueConsumerDependencies = liveDependencies) {
  if (!isLunaQueueMessage(message)) throw new LunaQueueTerminalError("Invalid Luna Queue message payload.");
  if (message.kind === "MISSION_START") return startMission(message, metadata, dependencies);
  return runWorker(message, metadata, dependencies);
}

export function lunaQueueRetry(error: unknown, metadata: MessageMetadata): RetryDirective | undefined {
  if (error instanceof LunaQueueTerminalError || metadata.deliveryCount >= MAX_QUEUE_DELIVERIES) return { acknowledge: true };
  // No directive intentionally leaves the private callback failed. Vercel Queue then redelivers
  // from the configured private trigger, preserving provider rather than application retry proof.
  return undefined;
}

export function createLunaQueueConsumer() {
  const queue = new QueueClient();
  return queue.handleNodeCallback<LunaQueueMessage>(
    (message, metadata) => handleLunaQueueMessage(message, metadata),
    { visibilityTimeoutSeconds: 900, retry: lunaQueueRetry },
  );
}
