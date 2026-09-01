import { and, desc, eq } from "drizzle-orm";
import {
  agentApprovals,
  agentMemories,
  agentNotifications,
  agentSchedules,
  agentSettings,
  agentSteps,
  agentTasks,
  type AgentApproval,
  type AgentMemory,
  type AgentSchedule,
  type AgentSettings,
  type AgentStep,
  type AgentTask,
} from "../../drizzle/schema";
import { getDb } from "../db";
import type { AgentStepStatus, AgentTaskStatus, ExecutionMode } from "./contracts";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db;
}

export async function getOrCreateAgentSettings(userId: number): Promise<AgentSettings> {
  const db = await requireDb();
  const existing = await db.select().from(agentSettings).where(eq(agentSettings.userId, userId)).limit(1);
  if (existing[0]) return existing[0];

  const now = Date.now();
  await db.insert(agentSettings).values({ userId, createdAt: now, updatedAt: now });
  const created = await db.select().from(agentSettings).where(eq(agentSettings.userId, userId)).limit(1);
  if (!created[0]) throw new Error("Unable to create agent settings");
  return created[0];
}

export async function updateAgentSettings(
  userId: number,
  changes: Partial<Pick<AgentSettings, "defaultModel" | "defaultExecutionMode" | "defaultMaxRetries" | "githubRepository" | "vercelProject" | "notificationsEnabled" | "lunaName" | "lunaStartingAge" | "lunaNativeLanguage" | "lunaPersonalityFoundation" | "lunaPersonalityKnowledge" | "lunaAppearanceReference">>,
): Promise<AgentSettings> {
  const db = await requireDb();
  await getOrCreateAgentSettings(userId);
  await db.update(agentSettings).set({ ...changes, updatedAt: Date.now() }).where(eq(agentSettings.userId, userId));
  return getOrCreateAgentSettings(userId);
}

export async function createAgentTask(input: {
  userId: number;
  scheduleId?: number;
  goal: string;
  model: string;
  executionMode: ExecutionMode;
  repository: string;
}): Promise<AgentTask> {
  const db = await requireDb();
  const now = Date.now();
  const inserted = await db.insert(agentTasks).values({
    ...input,
    scheduleId: input.scheduleId ?? null,
    status: "queued",
    retryCount: 0,
    cancelRequested: false,
    pauseRequested: false,
    createdAt: now,
    updatedAt: now,
  }).$returningId();
  const task = await getAgentTaskForUser(Number(inserted[0]?.id), input.userId);
  if (!task) throw new Error("Unable to create agent task");
  return task;
}

export async function getAgentTaskForUser(taskId: number, userId: number): Promise<AgentTask | undefined> {
  const db = await requireDb();
  const result = await db.select().from(agentTasks).where(and(eq(agentTasks.id, taskId), eq(agentTasks.userId, userId))).limit(1);
  return result[0];
}

export async function listAgentTasks(userId: number, limit = 50): Promise<AgentTask[]> {
  const db = await requireDb();
  return db.select().from(agentTasks).where(eq(agentTasks.userId, userId)).orderBy(desc(agentTasks.createdAt)).limit(limit);
}

export async function updateAgentTask(
  taskId: number,
  changes: Partial<Pick<AgentTask, "status" | "currentPhase" | "finalSummary" | "errorMessage" | "retryCount" | "cancelRequested" | "pauseRequested" | "startedAt" | "finishedAt">>,
): Promise<void> {
  const db = await requireDb();
  await db.update(agentTasks).set({ ...changes, updatedAt: Date.now() }).where(eq(agentTasks.id, taskId));
}

export async function createAgentStep(input: {
  taskId: number;
  sequence: number;
  kind: string;
  status: AgentStepStatus;
  title: string;
  detail?: string;
  payload?: unknown;
}): Promise<AgentStep> {
  const db = await requireDb();
  const createdAt = Date.now();
  const inserted = await db.insert(agentSteps).values({
    ...input,
    payload: input.payload ?? null,
    createdAt,
    startedAt: input.status === "running" ? createdAt : null,
    finishedAt: ["completed", "failed", "skipped"].includes(input.status) ? createdAt : null,
  }).$returningId();
  const records = await db.select().from(agentSteps).where(eq(agentSteps.id, Number(inserted[0]?.id))).limit(1);
  if (!records[0]) throw new Error("Unable to create agent step");
  return records[0];
}

export async function updateAgentStep(
  stepId: number,
  changes: Partial<Pick<AgentStep, "status" | "detail" | "payload" | "startedAt" | "finishedAt">>,
): Promise<void> {
  const db = await requireDb();
  await db.update(agentSteps).set(changes).where(eq(agentSteps.id, stepId));
}

export async function listAgentSteps(taskId: number): Promise<AgentStep[]> {
  const db = await requireDb();
  return db.select().from(agentSteps).where(eq(agentSteps.taskId, taskId)).orderBy(agentSteps.sequence);
}

export async function createAgentApproval(input: {
  taskId: number;
  stepId?: number;
  actionType: string;
  title: string;
  description: string;
}): Promise<AgentApproval> {
  const db = await requireDb();
  const inserted = await db.insert(agentApprovals).values({
    ...input,
    stepId: input.stepId ?? null,
    status: "requested",
    requestedAt: Date.now(),
  }).$returningId();
  const records = await db.select().from(agentApprovals).where(eq(agentApprovals.id, Number(inserted[0]?.id))).limit(1);
  if (!records[0]) throw new Error("Unable to create agent approval");
  return records[0];
}

export async function listTaskApprovals(taskId: number): Promise<AgentApproval[]> {
  const db = await requireDb();
  return db.select().from(agentApprovals).where(eq(agentApprovals.taskId, taskId)).orderBy(desc(agentApprovals.requestedAt));
}

export async function resolveAgentApproval(input: {
  approvalId: number;
  userId: number;
  approved: boolean;
}): Promise<AgentApproval | undefined> {
  const db = await requireDb();
  const result = await db
    .select({ approval: agentApprovals, task: agentTasks })
    .from(agentApprovals)
    .innerJoin(agentTasks, eq(agentApprovals.taskId, agentTasks.id))
    .where(and(eq(agentApprovals.id, input.approvalId), eq(agentTasks.userId, input.userId)))
    .limit(1);
  const current = result[0]?.approval;
  if (!current || current.status !== "requested") return undefined;

  await db.update(agentApprovals).set({
    status: input.approved ? "approved" : "rejected",
    resolvedByUserId: input.userId,
    resolvedAt: Date.now(),
  }).where(eq(agentApprovals.id, input.approvalId));
  const updated = await db.select().from(agentApprovals).where(eq(agentApprovals.id, input.approvalId)).limit(1);
  return updated[0];
}

export async function listAgentMemories(userId: number): Promise<AgentMemory[]> {
  const db = await requireDb();
  return db.select().from(agentMemories).where(and(eq(agentMemories.userId, userId), eq(agentMemories.isActive, true))).orderBy(desc(agentMemories.importance), desc(agentMemories.updatedAt));
}

export async function createAgentMemory(input: {
  userId: number;
  sourceTaskId?: number;
  category: string;
  content: string;
  importance?: number;
}): Promise<AgentMemory> {
  const db = await requireDb();
  const now = Date.now();
  const inserted = await db.insert(agentMemories).values({
    ...input,
    sourceTaskId: input.sourceTaskId ?? null,
    importance: input.importance ?? 3,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }).$returningId();
  const created = await db.select().from(agentMemories).where(eq(agentMemories.id, Number(inserted[0]?.id))).limit(1);
  if (!created[0]) throw new Error("Unable to create agent memory");
  return created[0];
}

export async function deactivateAgentMemory(memoryId: number, userId: number): Promise<boolean> {
  const db = await requireDb();
  const current = await db.select().from(agentMemories).where(and(eq(agentMemories.id, memoryId), eq(agentMemories.userId, userId))).limit(1);
  if (!current[0]) return false;
  await db.update(agentMemories).set({ isActive: false, updatedAt: Date.now() }).where(eq(agentMemories.id, memoryId));
  return true;
}

export async function listAgentSchedules(userId: number): Promise<AgentSchedule[]> {
  const db = await requireDb();
  return db.select().from(agentSchedules).where(eq(agentSchedules.userId, userId)).orderBy(desc(agentSchedules.createdAt));
}

export async function listScheduleRuns(scheduleId: number, userId: number): Promise<AgentTask[]> {
  const db = await requireDb();
  return db.select().from(agentTasks)
    .where(and(eq(agentTasks.scheduleId, scheduleId), eq(agentTasks.userId, userId)))
    .orderBy(desc(agentTasks.createdAt))
    .limit(20);
}

export async function createAgentSchedule(input: {
  userId: number;
  goal: string;
  cronExpression: string;
  model: string;
  executionMode: ExecutionMode;
  scheduleCronTaskUid?: string;
  nextRunAt?: number | null;
}): Promise<AgentSchedule> {
  const db = await requireDb();
  const now = Date.now();
  const inserted = await db.insert(agentSchedules).values({
    ...input,
    scheduleCronTaskUid: input.scheduleCronTaskUid ?? null,
    nextRunAt: input.nextRunAt ?? null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  }).$returningId();
  const created = await db.select().from(agentSchedules).where(eq(agentSchedules.id, Number(inserted[0]?.id))).limit(1);
  if (!created[0]) throw new Error("Unable to create agent schedule");
  return created[0];
}

export async function getAgentScheduleByCronTaskUid(taskUid: string): Promise<AgentSchedule | undefined> {
  const db = await requireDb();
  const result = await db.select().from(agentSchedules).where(eq(agentSchedules.scheduleCronTaskUid, taskUid)).limit(1);
  return result[0];
}

export async function updateAgentSchedule(
  scheduleId: number,
  userId: number,
  changes: Partial<Pick<AgentSchedule, "status" | "scheduleCronTaskUid" | "lastRunAt" | "nextRunAt">>,
): Promise<AgentSchedule | undefined> {
  const db = await requireDb();
  const current = await db.select().from(agentSchedules).where(and(eq(agentSchedules.id, scheduleId), eq(agentSchedules.userId, userId))).limit(1);
  if (!current[0]) return undefined;
  await db.update(agentSchedules).set({ ...changes, updatedAt: Date.now() }).where(eq(agentSchedules.id, scheduleId));
  const updated = await db.select().from(agentSchedules).where(eq(agentSchedules.id, scheduleId)).limit(1);
  return updated[0];
}

export async function recordAgentNotification(input: {
  userId: number;
  taskId?: number;
  kind: string;
  title: string;
  content: string;
  status: "pending" | "sent" | "failed";
}): Promise<void> {
  const db = await requireDb();
  const now = Date.now();
  await db.insert(agentNotifications).values({
    ...input,
    taskId: input.taskId ?? null,
    createdAt: now,
    deliveredAt: input.status === "sent" ? now : null,
  });
}

export async function getTaskWithTrace(taskId: number, userId: number) {
  const task = await getAgentTaskForUser(taskId, userId);
  if (!task) return undefined;
  const [steps, approvals] = await Promise.all([listAgentSteps(taskId), listTaskApprovals(taskId)]);
  return { task, steps, approvals };
}
