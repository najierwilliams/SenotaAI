import { randomUUID } from "node:crypto";
import { buildCognitivePlan } from "./cognition";
import { getLunaDurableRuntime, type LunaRuntimeAvailability } from "./runtime";
import {
  createLunaGoal,
  createLunaMission,
  createLunaProject,
  createLunaRecovery,
  createLunaTask,
  createLunaWorker,
  getLunaCognitiveSnapshot,
  getOrCreateLunaSelfState,
  markLunaMissionWaitingForRuntime,
  recoverIncompleteLunaMissions,
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

export async function planLunaMission(input: { userId: number; objective: string; priority?: number; projectTitle?: string; focusObjectId?: string | null; maxWorkers?: number; maxModelRequests?: number; maxTokenBudget?: number }): Promise<PlannedLunaMission> {
  const self = await getOrCreateLunaSelfState(input.userId);
  if (!self.autonomyEnabled) throw new Error("Luna autonomy is disabled by the owner. Re-enable it before creating a mission.");
  const plan = buildCognitivePlan(input.objective, input.priority ?? 3);
  assertAcyclicTaskGraph(plan.tasks);
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
    priority: input.priority ?? 3,
    maxWorkers: input.maxWorkers ?? 4,
    maxModelRequests: input.maxModelRequests ?? 12,
    maxTokenBudget: input.maxTokenBudget ?? 24_000,
    idempotencyKey: `luna-${randomUUID()}`,
    actor: "luna:planner",
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
  const updatedMission = await updateLunaMission({ userId: input.userId, missionId: mission.id, rootTaskId: root?.id ?? null, currentFocus: root?.title ?? null, status: "QUEUED", actor: "luna:planner", reason: "Persisted cognitive plan and dependency graph were created." });
  return { mission: updatedMission, projectId: project.id, goalId: goal.id, tasks };
}

export async function queueMissionWorkers(input: { userId: number; mission: LunaMission; tasks: LunaTask[] }) {
  const roles = workerRolesForTaskGraph(input.tasks.map(task => ({ role: task.workerRole ?? "REVIEW_AGENT" })), input.mission.maxWorkers);
  const workers = [];
  for (const role of roles) {
    const task = input.tasks.find(item => item.workerRole === role) ?? null;
    workers.push(await createLunaWorker({ userId: input.userId, missionId: input.mission.id, taskId: task?.id ?? null, role, inputSummary: task?.details ?? `Durable role ${role} is awaiting its eligible handoff.` }));
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
  const result = await runtime.dispatch({ missionId: mission.id, workspaceId: mission.workspaceId, idempotencyKey: `mission:${mission.id}` });
  if (!result.accepted || !result.runId) {
    return { mission: await markLunaMissionWaitingForRuntime({ userId: input.userId, missionId: mission.id, detail: result.message }), runtime: { provider: runtime.provider, status: result.runtimeStatus, detail: result.message } satisfies LunaRuntimeAvailability, accepted: false };
  }
  const updated = await updateLunaMission({ userId: input.userId, missionId: mission.id, status: "RUNNING", runtimeRunId: result.runId, currentFocus: "Durable worker runtime accepted mission dispatch", actor: "luna:runtime", reason: "Configured runtime accepted a durable mission dispatch." });
  return { mission: updated, runtime: { provider: runtime.provider, status: result.runtimeStatus, detail: result.message } satisfies LunaRuntimeAvailability, accepted: true };
}

export async function pauseLunaMission(userId: number, missionId: string) {
  return updateLunaMission({ userId, missionId, status: "PAUSED", pauseRequested: true, currentFocus: "Paused by owner", actor: "owner", reason: "Owner paused mission." });
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
  }
  return updated;
}

export async function resumeLunaMission(userId: number, missionId: string, runtime?: LunaDurableRuntime) {
  const resumed = await updateLunaMission({ userId, missionId, status: "QUEUED", pauseRequested: false, cancelRequested: false, currentFocus: "Queued for durable resumption", actor: "owner", reason: "Owner resumed mission." });
  return dispatchLunaMission({ userId, missionId: resumed.id, runtime });
}

export async function markLunaMissionInterrupted(input: { userId: number; missionId: string; workerId?: string | null; reason: string }) {
  await createLunaRecovery({ userId: input.userId, missionId: input.missionId, workerId: input.workerId ?? null, reason: input.reason, resumePayload: { missionId: input.missionId, recovery: "requires durable runtime" }, actor: "luna:recovery" });
  return updateLunaMission({ userId: input.userId, missionId: input.missionId, status: "RECOVERY_REQUIRED", currentFocus: "Recovery required", errorMessage: input.reason, actor: "luna:recovery", reason: "Worker interruption was persisted for recovery." });
}

export async function runLunaRecoverySweep(userId: number) {
  return recoverIncompleteLunaMissions(userId);
}
