import { createHash, randomUUID } from "node:crypto";
import { buildCognitivePlan } from "./cognition";
import { assessDevelopmentalEligibility } from "./developmentalContext";
import { getLunaDurableRuntime, type LunaRuntimeAvailability } from "./runtime";
import {
  createLunaGoal,
  createLunaMission,
  createLunaProject,
  createLunaRecovery,
  createLunaTask,
  createLunaWorker,
  calculateEligibleTasks,
  getLunaCognitiveSnapshot,
  recordLunaRuntimeEvent,
  getOrCreateLunaSelfState,
  markLunaMissionWaitingForRuntime,
  recoverIncompleteLunaMissions,
  updateLunaAutonomousDecision,
  updateLunaMission,
  updateLunaTask,
  updateLunaWorker,
} from "./supabase";
import type { LunaDurableRuntime, LunaMission, LunaTask, LunaWorkerRole } from "@shared/lunaCognitive";

export type PlannedLunaMission = {
  mission: LunaMission;
  projectId: string;
  goalId: string;
  tasks: LunaTask[];
};

export function assertAcyclicTaskGraph(tasks: Array<{ key: string; dependsOnKeys: string[] }>) {
  const pending = new Map(tasks.map(task => [task.key, task.dependsOnKeys]));
  const completed = new Set<string>();
  while (pending.size) {
    const ready = Array.from(pending.entries()).filter(([, dependencies]) => dependencies.every(dependency => completed.has(dependency)));
    if (!ready.length) throw new Error("Luna task graph contains a missing dependency or cycle.");
    for (const [key] of ready) { completed.add(key); pending.delete(key); }
  }
}

export function workerRolesForTaskGraph(tasks: Array<{ role: LunaWorkerRole }>, maximumWorkers: number): LunaWorkerRole[] {
  const roles = Array.from(new Set(tasks.map(task => task.role)));
  return roles.slice(0, Math.max(1, maximumWorkers));
}

export async function planLunaMission(input: { userId: number; objective: string; priority?: number; projectTitle?: string; focusObjectId?: string | null; decisionId?: string | null; missionOrigin?: LunaMission["missionOrigin"]; idempotencyKey?: string; maxWorkers?: number; maxSteps?: number; maxRetries?: number; maxDurationSeconds?: number; maxModelRequests?: number; maxTokenBudget?: number }): Promise<PlannedLunaMission> {
  const self = await getOrCreateLunaSelfState(input.userId);
  if (!self.autonomyEnabled) throw new Error("Luna autonomy is disabled by the owner. Re-enable it before creating a mission.");
  if (input.missionOrigin === "AUTONOMOUS") {
    const eligibility = assessDevelopmentalEligibility(self.self.foundation, input.objective);
    if (!eligibility.eligible) throw new Error(`Developmental eligibility blocked autonomous mission: ${eligibility.reason}`);
  }
  const plan = buildCognitivePlan(input.objective, input.priority ?? 3);
  assertAcyclicTaskGraph(plan.tasks);
  if (input.decisionId) {
    const snapshot = await getLunaCognitiveSnapshot(input.userId);
    const existing = snapshot.missions.find(mission => mission.decisionId === input.decisionId);
    if (existing) return { mission: existing, projectId: existing.projectId ?? "", goalId: existing.goalId ?? "", tasks: snapshot.tasks.filter(task => task.missionId === existing.id) };
  }
  const project = await createLunaProject({
    userId: input.userId,
    title: input.projectTitle?.trim() || plan.objective.slice(0, 240),
    summary: `Luna-created project for a bounded mission objective. The plan is durable and audit-traceable; no research result is claimed at project creation.`,
    priority: input.priority ?? 3,
    focusObjectId: input.focusObjectId ?? null,
    createdBy: "LUNA",
    actor: "luna:planner",
  });
  const goal = await createLunaGoal({
    userId: input.userId,
    title: `Investigate: ${plan.objective}`.slice(0, 240),
    rationale: "A durable goal created from the owner-dispatched objective. Its outcome remains evidence-bound and does not itself establish scientific authority.",
    projectId: project.id,
    priority: input.priority ?? 3,
    truthState: "PROPOSED",
    actor: "luna:planner",
  });
  const mission = await createLunaMission({
    userId: input.userId,
    objective: plan.objective,
    projectId: project.id,
    goalId: goal.id,
    decisionId: input.decisionId ?? null,
    missionOrigin: input.missionOrigin ?? "OWNER",
    priority: input.priority ?? 3,
    maxWorkers: input.maxWorkers ?? 4,
    maxSteps: input.maxSteps ?? 24,
    maxRetries: input.maxRetries ?? 2,
    maxDurationSeconds: input.maxDurationSeconds ?? 900,
    maxModelRequests: input.maxModelRequests ?? 12,
    maxTokenBudget: input.maxTokenBudget ?? 24_000,
    idempotencyKey: input.idempotencyKey ?? `luna-${randomUUID()}`,
    actor: input.missionOrigin === "AUTONOMOUS" ? "luna:autonomy" : "luna:planner",
  });
  const ids = new Map<string, string>();
  const tasks: LunaTask[] = [];
  for (const planned of plan.tasks) {
    const task = await createLunaTask({
      userId: input.userId,
      title: planned.title,
      details: planned.details,
      projectId: project.id,
      goalId: goal.id,
      missionId: mission.id,
      workerRole: planned.role,
      priority: planned.priority,
      dependencyTaskIds: planned.dependsOnKeys.map(key => {
        const dependency = ids.get(key);
        if (!dependency) throw new Error(`Luna plan dependency '${key}' is missing.`);
        return dependency;
      }),
      actor: "luna:planner",
    });
    ids.set(planned.key, task.id); tasks.push(task);
  }
  const root = tasks[0];
  const updatedMission = await updateLunaMission({ userId: input.userId, missionId: mission.id, rootTaskId: root?.id ?? null, currentFocus: root?.title ?? null, status: "QUEUED", actor: input.missionOrigin === "AUTONOMOUS" ? "luna:autonomy" : "luna:planner", reason: "Persisted cognitive plan and dependency graph were created." });
  return { mission: updatedMission, projectId: project.id, goalId: goal.id, tasks };
}

function deterministicWorkerId(missionId: string, taskId: string, attempt = 1) {
  const hash = createHash("sha256").update(`luna-worker:${missionId}:${taskId}:${attempt}`).digest("hex");
  const bytes = hash.slice(0, 32).split("");
  bytes[12] = "5";
  bytes[16] = ["8", "9", "a", "b"][Number.parseInt(bytes[16] ?? "0", 16) & 0x03] ?? "8";
  return `${bytes.slice(0, 8).join("")}-${bytes.slice(8, 12).join("")}-${bytes.slice(12, 16).join("")}-${bytes.slice(16, 20).join("")}-${bytes.slice(20, 32).join("")}`;
}

/**
 * Materializes only dependency-eligible worker records. The mission may have more total roles
 * than its concurrent-worker budget; later workers are created from the durable task graph only
 * after their prerequisites complete. A stable worker ID makes queue redelivery idempotent.
 */
export async function queueMissionWorkers(input: { userId: number; mission: LunaMission }) {
  const snapshot = await getLunaCognitiveSnapshot(input.userId);
  const tasks = snapshot.tasks.filter(task => task.missionId === input.mission.id);
  const existing = snapshot.workers.filter(worker => worker.missionId === input.mission.id);
  const resumedQueuedWorkerIds = new Set(existing.filter(worker => worker.state === "QUEUED" && input.mission.resumeAfter && !snapshot.activity.some(event => event.action === "WORKER_REQUEUED" && event.workerId === worker.id && (event.detail as Record<string, unknown>).runtimeRunId === input.mission.runtimeRunId)).map(worker => worker.id));
  const active = existing.filter(worker => ["QUEUED", "RUNNING", "WAITING"].includes(worker.state) && !resumedQueuedWorkerIds.has(worker.id)).length;
  const capacity = Math.max(0, input.mission.maxWorkers - active);
  if (!capacity) return [];

  const workers = [];
  for (const task of calculateEligibleTasks(tasks).slice(0, capacity)) {
    if (!task.workerRole) continue;
    const workerId = deterministicWorkerId(input.mission.id, task.id);
    const existingWorker = existing.find(worker => worker.id === workerId) ?? null;
    const resumeRequeueRecorded = snapshot.activity.some(event => event.action === "WORKER_REQUEUED" && event.workerId === workerId && (event.detail as Record<string, unknown>).runtimeRunId === input.mission.runtimeRunId);
    if ((existingWorker?.state === "PAUSED" || (existingWorker?.state === "QUEUED" && input.mission.resumeAfter && !resumeRequeueRecorded))) {
      const requeued = existingWorker.state === "PAUSED"
        ? await updateLunaWorker({ userId: input.userId, workerId, missionId: input.mission.id, state: "QUEUED", resetForRetry: true, actor: "luna:queue" })
        : existingWorker;
      await recordLunaRuntimeEvent({ userId: input.userId, action: "WORKER_REQUEUED", subjectType: "WORKER", subjectId: requeued.id, missionId: input.mission.id, workerId: requeued.id, actor: "luna:queue", detail: { taskId: task.id, role: requeued.role, runtimeRunId: input.mission.runtimeRunId, reason: "Mission resumed." } });
      workers.push(requeued);
      continue;
    }
    if (existingWorker) continue;
    const worker = await createLunaWorker({
      userId: input.userId,
      workerId,
      missionId: input.mission.id,
      taskId: task.id,
      role: task.workerRole,
      inputSummary: task.details,
      actor: "luna:queue",
    });
    await recordLunaRuntimeEvent({
      userId: input.userId,
      action: "WORKER_MATERIALIZED",
      subjectType: "WORKER",
      subjectId: worker.id,
      missionId: input.mission.id,
      workerId: worker.id,
      actor: "luna:queue",
      detail: { taskId: task.id, role: worker.role, idempotentWorkerId: workerId },
    });
    workers.push(worker);
  }
  return workers;
}

/** Dispatches only to an injected/configured durable runtime. It never performs worker work in the request handler. */
export async function dispatchLunaMission(input: { userId: number; missionId: string; runtime?: LunaDurableRuntime }) {
  const snapshot = await getLunaCognitiveSnapshot(input.userId);
  const mission = snapshot.missions.find(item => item.id === input.missionId);
  if (!mission) throw new Error("Luna mission was not found in this owner workspace.");
  if (mission.cancelRequested || mission.status === "CANCELLED") throw new Error("Cancelled Luna mission cannot be dispatched.");
  if (mission.pauseRequested || mission.status === "PAUSED") throw new Error("Paused Luna mission cannot be dispatched until resumed.");
  if (mission.status === "COMPLETED") throw new Error("Completed Luna mission cannot be dispatched again.");
  const runtime = input.runtime ?? getLunaDurableRuntime();
  const status = await runtime.getStatus();
  if (status.status !== "CONFIGURED") {
    return { mission: await markLunaMissionWaitingForRuntime({ userId: input.userId, missionId: mission.id, detail: status.detail }), runtime: { provider: runtime.provider, ...status } satisfies LunaRuntimeAvailability, accepted: false };
  }
  if (mission.runtimeRunId && mission.status === "RUNNING") {
    return { mission, runtime: { provider: runtime.provider, ...status } satisfies LunaRuntimeAvailability, accepted: true };
  }
  const result = await runtime.dispatch({ missionId: mission.id, workspaceId: mission.workspaceId, idempotencyKey: `mission:${mission.id}:${mission.resumeAfter ?? "initial"}` });
  if (!result.accepted || !result.runId) {
    return { mission: await markLunaMissionWaitingForRuntime({ userId: input.userId, missionId: mission.id, detail: result.message }), runtime: { provider: runtime.provider, status: result.runtimeStatus, detail: result.message } satisfies LunaRuntimeAvailability, accepted: false };
  }
  const updated = await updateLunaMission({ userId: input.userId, missionId: mission.id, status: "RUNNING", runtimeRunId: result.runId, currentFocus: "Vercel Queue accepted durable mission dispatch", errorMessage: null, started: !mission.startedAt, actor: "luna:runtime", reason: "Vercel Queue accepted a provider-issued durable mission run." });
  await recordLunaRuntimeEvent({ userId: input.userId, action: "MISSION_QUEUE_ACCEPTED", subjectType: "MISSION", subjectId: mission.id, missionId: mission.id, actor: "luna:runtime", detail: { provider: runtime.provider, runtimeRunId: result.runId, providerMessage: result.message } });
  return { mission: updated, runtime: { provider: runtime.provider, status: result.runtimeStatus, detail: result.message } satisfies LunaRuntimeAvailability, accepted: true };
}

export async function pauseLunaMission(userId: number, missionId: string) {
  const snapshot = await getLunaCognitiveSnapshot(userId);
  const mission = snapshot.missions.find(item => item.id === missionId);
  if (!mission) throw new Error("Luna mission was not found in this owner workspace.");
  const paused = await updateLunaMission({ userId, missionId, status: "PAUSED", pauseRequested: true, currentFocus: "Paused by owner", actor: "owner", reason: "Owner paused mission." });
  for (const worker of snapshot.workers.filter(item => item.missionId === missionId && ["QUEUED", "WAITING"].includes(item.state))) {
    await updateLunaWorker({ userId, workerId: worker.id, missionId, state: "PAUSED", actor: "owner" });
  }
  await recordLunaRuntimeEvent({ userId, action: "MISSION_PAUSED", subjectType: "MISSION", subjectId: missionId, missionId, actor: "owner", detail: { runtimeRunId: mission.runtimeRunId, activeWorkersAtRequest: snapshot.workers.filter(item => item.missionId === missionId && item.state === "RUNNING").length } });
  return paused;
}

export async function cancelLunaMission(userId: number, missionId: string) {
  const snapshot = await getLunaCognitiveSnapshot(userId);
  const mission = snapshot.missions.find(item => item.id === missionId);
  if (!mission) throw new Error("Luna mission was not found in this owner workspace.");
  const runtime = getLunaDurableRuntime();
  if (mission.runtimeRunId) await runtime.cancel(mission.runtimeRunId);
  const updated = await updateLunaMission({ userId, missionId, status: "CANCELLED", cancelRequested: true, currentFocus: "Cancelled by owner", finished: true, actor: "owner", reason: "Owner cancelled mission." });
  for (const worker of snapshot.workers.filter(item => item.missionId === missionId && ["QUEUED", "RUNNING", "WAITING", "PAUSED"].includes(item.state))) {
    await updateLunaWorker({ userId, workerId: worker.id, missionId, state: "CANCELLED", actor: "owner" });
    if (worker.taskId) await updateLunaTask({ userId, taskId: worker.taskId, status: "CANCELLED", actor: "owner", reason: "Owner cancelled the mission before this worker task completed." });
  }
  if (updated.decisionId) {
    await updateLunaAutonomousDecision({ userId, decisionId: updated.decisionId, missionId: updated.id, status: "CANCELLED", outcome: "CANCELLED", actor: "owner", reason: "Owner cancelled the linked autonomous mission." });
  }
  await recordLunaRuntimeEvent({ userId, action: "MISSION_CANCELLED", subjectType: "MISSION", subjectId: missionId, missionId, actor: "owner", detail: { runtimeRunId: mission.runtimeRunId, decisionId: updated.decisionId, cancellationMethod: "Persisted lifecycle flag checked by private queue consumer at safe execution boundaries." } });
  return updated;
}

export async function resumeLunaMission(userId: number, missionId: string, runtime?: LunaDurableRuntime) {
  const resumed = await updateLunaMission({ userId, missionId, status: "QUEUED", pauseRequested: false, cancelRequested: false, runtimeRunId: null, resumeAfter: new Date().toISOString(), currentFocus: "Queued for durable resumption", actor: "owner", reason: "Owner resumed mission; a new provider queue message is required." });
  return dispatchLunaMission({ userId, missionId: resumed.id, runtime });
}

export async function markLunaMissionInterrupted(input: { userId: number; missionId: string; workerId?: string | null; reason: string }) {
  await createLunaRecovery({ userId: input.userId, missionId: input.missionId, workerId: input.workerId ?? null, reason: input.reason, resumePayload: { missionId: input.missionId, recovery: "requires durable runtime" }, actor: "luna:recovery" });
  return updateLunaMission({ userId: input.userId, missionId: input.missionId, status: "RECOVERY_REQUIRED", currentFocus: "Recovery required", errorMessage: input.reason, actor: "luna:recovery", reason: "Worker interruption was persisted for recovery." });
}

export async function runLunaRecoverySweep(userId: number) {
  return recoverIncompleteLunaMissions(userId);
}
