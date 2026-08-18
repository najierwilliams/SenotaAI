var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
    };
  }
});

// drizzle/schema.ts
import { bigint, boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users, ownerAccess, taskStatuses, executionModes, stepStatuses, approvalStatuses, scheduleStatuses, notificationStatuses, agentTasks, agentSteps, agentMemories, agentApprovals, agentSchedules, agentSettings, agentNotifications;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
      /**
       * Surrogate primary key. Auto-incremented numeric value managed by the database.
       * Use this for relations between tables.
       */
      id: int("id").autoincrement().primaryKey(),
      /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      loginMethod: varchar("loginMethod", { length: 64 }),
      role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    ownerAccess = mysqlTable("owner_access", {
      id: int("id").autoincrement().primaryKey(),
      instanceKey: varchar("instance_key", { length: 32 }).notNull().unique(),
      userId: int("user_id").notNull().unique(),
      passwordHash: varchar("password_hash", { length: 255 }).notNull(),
      sessionVersion: int("session_version").notNull().default(1),
      createdAt: bigint("created_at", { mode: "number" }).notNull(),
      updatedAt: bigint("updated_at", { mode: "number" }).notNull()
    });
    taskStatuses = [
      "queued",
      "planning",
      "running",
      "awaiting_approval",
      "paused",
      "cancelled",
      "completed",
      "failed"
    ];
    executionModes = ["confirm", "auto"];
    stepStatuses = ["pending", "running", "completed", "failed", "skipped"];
    approvalStatuses = ["requested", "approved", "rejected", "expired"];
    scheduleStatuses = ["active", "paused", "failed"];
    notificationStatuses = ["pending", "sent", "failed"];
    agentTasks = mysqlTable(
      "agent_tasks",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("user_id").notNull(),
        scheduleId: int("schedule_id"),
        goal: text("goal").notNull(),
        repository: varchar("repository", { length: 256 }).notNull().default("najierwilliams/SenotaAI"),
        model: varchar("model", { length: 128 }).notNull(),
        status: mysqlEnum("status", taskStatuses).notNull().default("queued"),
        executionMode: mysqlEnum("execution_mode", executionModes).notNull().default("confirm"),
        currentPhase: varchar("current_phase", { length: 128 }),
        finalSummary: text("final_summary"),
        errorMessage: text("error_message"),
        retryCount: int("retry_count").notNull().default(0),
        cancelRequested: boolean("cancel_requested").notNull().default(false),
        pauseRequested: boolean("pause_requested").notNull().default(false),
        createdAt: bigint("created_at", { mode: "number" }).notNull(),
        updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
        startedAt: bigint("started_at", { mode: "number" }),
        finishedAt: bigint("finished_at", { mode: "number" })
      },
      (table) => [
        index("agent_tasks_user_created_idx").on(table.userId, table.createdAt),
        index("agent_tasks_user_status_idx").on(table.userId, table.status),
        index("agent_tasks_schedule_created_idx").on(table.scheduleId, table.createdAt)
      ]
    );
    agentSteps = mysqlTable(
      "agent_steps",
      {
        id: int("id").autoincrement().primaryKey(),
        taskId: int("task_id").notNull(),
        sequence: int("sequence").notNull(),
        kind: varchar("kind", { length: 48 }).notNull(),
        status: mysqlEnum("status", stepStatuses).notNull().default("pending"),
        title: varchar("title", { length: 255 }).notNull(),
        detail: text("detail"),
        payload: json("payload"),
        startedAt: bigint("started_at", { mode: "number" }),
        finishedAt: bigint("finished_at", { mode: "number" }),
        createdAt: bigint("created_at", { mode: "number" }).notNull()
      },
      (table) => [
        index("agent_steps_task_sequence_idx").on(table.taskId, table.sequence)
      ]
    );
    agentMemories = mysqlTable(
      "agent_memories",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("user_id").notNull(),
        sourceTaskId: int("source_task_id"),
        category: varchar("category", { length: 48 }).notNull(),
        content: text("content").notNull(),
        importance: int("importance").notNull().default(3),
        isActive: boolean("is_active").notNull().default(true),
        createdAt: bigint("created_at", { mode: "number" }).notNull(),
        updatedAt: bigint("updated_at", { mode: "number" }).notNull()
      },
      (table) => [
        index("agent_memories_user_active_idx").on(table.userId, table.isActive)
      ]
    );
    agentApprovals = mysqlTable(
      "agent_approvals",
      {
        id: int("id").autoincrement().primaryKey(),
        taskId: int("task_id").notNull(),
        stepId: int("step_id"),
        actionType: varchar("action_type", { length: 64 }).notNull(),
        title: varchar("title", { length: 255 }).notNull(),
        description: text("description").notNull(),
        status: mysqlEnum("status", approvalStatuses).notNull().default("requested"),
        resolvedByUserId: int("resolved_by_user_id"),
        requestedAt: bigint("requested_at", { mode: "number" }).notNull(),
        resolvedAt: bigint("resolved_at", { mode: "number" })
      },
      (table) => [
        index("agent_approvals_task_status_idx").on(table.taskId, table.status)
      ]
    );
    agentSchedules = mysqlTable(
      "agent_schedules",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("user_id").notNull(),
        goal: text("goal").notNull(),
        cronExpression: varchar("cron_expression", { length: 64 }).notNull(),
        model: varchar("model", { length: 128 }).notNull(),
        executionMode: mysqlEnum("execution_mode", executionModes).notNull().default("confirm"),
        status: mysqlEnum("status", scheduleStatuses).notNull().default("active"),
        scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }).unique(),
        lastRunAt: bigint("last_run_at", { mode: "number" }),
        nextRunAt: bigint("next_run_at", { mode: "number" }),
        createdAt: bigint("created_at", { mode: "number" }).notNull(),
        updatedAt: bigint("updated_at", { mode: "number" }).notNull()
      },
      (table) => [
        index("agent_schedules_user_status_idx").on(table.userId, table.status)
      ]
    );
    agentSettings = mysqlTable("agent_settings", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("user_id").notNull().unique(),
      defaultModel: varchar("default_model", { length: 128 }).notNull().default("llama3"),
      defaultExecutionMode: mysqlEnum("default_execution_mode", executionModes).notNull().default("confirm"),
      defaultMaxRetries: int("default_max_retries").notNull().default(2),
      githubRepository: varchar("github_repository", { length: 256 }).notNull().default("najierwilliams/SenotaAI"),
      vercelProject: varchar("vercel_project", { length: 128 }),
      notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
      createdAt: bigint("created_at", { mode: "number" }).notNull(),
      updatedAt: bigint("updated_at", { mode: "number" }).notNull()
    });
    agentNotifications = mysqlTable(
      "agent_notifications",
      {
        id: int("id").autoincrement().primaryKey(),
        userId: int("user_id").notNull(),
        taskId: int("task_id"),
        kind: varchar("kind", { length: 48 }).notNull(),
        title: varchar("title", { length: 255 }).notNull(),
        content: text("content").notNull(),
        status: mysqlEnum("status", notificationStatuses).notNull().default("pending"),
        createdAt: bigint("created_at", { mode: "number" }).notNull(),
        deliveredAt: bigint("delivered_at", { mode: "number" })
      },
      (table) => [
        index("agent_notifications_user_created_idx").on(table.userId, table.createdAt)
      ]
    );
  }
});

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
var _db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    _db = null;
  }
});

// server/agent/db.ts
var db_exports = {};
__export(db_exports, {
  createAgentApproval: () => createAgentApproval,
  createAgentMemory: () => createAgentMemory,
  createAgentSchedule: () => createAgentSchedule,
  createAgentStep: () => createAgentStep,
  createAgentTask: () => createAgentTask,
  deactivateAgentMemory: () => deactivateAgentMemory,
  getAgentScheduleByCronTaskUid: () => getAgentScheduleByCronTaskUid,
  getAgentTaskForUser: () => getAgentTaskForUser,
  getOrCreateAgentSettings: () => getOrCreateAgentSettings,
  getTaskWithTrace: () => getTaskWithTrace,
  listAgentMemories: () => listAgentMemories,
  listAgentSchedules: () => listAgentSchedules,
  listAgentSteps: () => listAgentSteps,
  listAgentTasks: () => listAgentTasks,
  listScheduleRuns: () => listScheduleRuns,
  listTaskApprovals: () => listTaskApprovals,
  recordAgentNotification: () => recordAgentNotification,
  resolveAgentApproval: () => resolveAgentApproval,
  updateAgentSchedule: () => updateAgentSchedule,
  updateAgentSettings: () => updateAgentSettings,
  updateAgentStep: () => updateAgentStep,
  updateAgentTask: () => updateAgentTask
});
import { and, desc, eq as eq2 } from "drizzle-orm";
async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db;
}
async function getOrCreateAgentSettings(userId) {
  const db = await requireDb();
  const existing = await db.select().from(agentSettings).where(eq2(agentSettings.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  const now = Date.now();
  await db.insert(agentSettings).values({ userId, createdAt: now, updatedAt: now });
  const created = await db.select().from(agentSettings).where(eq2(agentSettings.userId, userId)).limit(1);
  if (!created[0]) throw new Error("Unable to create agent settings");
  return created[0];
}
async function updateAgentSettings(userId, changes) {
  const db = await requireDb();
  await getOrCreateAgentSettings(userId);
  await db.update(agentSettings).set({ ...changes, updatedAt: Date.now() }).where(eq2(agentSettings.userId, userId));
  return getOrCreateAgentSettings(userId);
}
async function createAgentTask(input) {
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
    updatedAt: now
  }).$returningId();
  const task = await getAgentTaskForUser(Number(inserted[0]?.id), input.userId);
  if (!task) throw new Error("Unable to create agent task");
  return task;
}
async function getAgentTaskForUser(taskId, userId) {
  const db = await requireDb();
  const result = await db.select().from(agentTasks).where(and(eq2(agentTasks.id, taskId), eq2(agentTasks.userId, userId))).limit(1);
  return result[0];
}
async function listAgentTasks(userId, limit = 50) {
  const db = await requireDb();
  return db.select().from(agentTasks).where(eq2(agentTasks.userId, userId)).orderBy(desc(agentTasks.createdAt)).limit(limit);
}
async function updateAgentTask(taskId, changes) {
  const db = await requireDb();
  await db.update(agentTasks).set({ ...changes, updatedAt: Date.now() }).where(eq2(agentTasks.id, taskId));
}
async function createAgentStep(input) {
  const db = await requireDb();
  const createdAt = Date.now();
  const inserted = await db.insert(agentSteps).values({
    ...input,
    payload: input.payload ?? null,
    createdAt,
    startedAt: input.status === "running" ? createdAt : null,
    finishedAt: ["completed", "failed", "skipped"].includes(input.status) ? createdAt : null
  }).$returningId();
  const records = await db.select().from(agentSteps).where(eq2(agentSteps.id, Number(inserted[0]?.id))).limit(1);
  if (!records[0]) throw new Error("Unable to create agent step");
  return records[0];
}
async function updateAgentStep(stepId, changes) {
  const db = await requireDb();
  await db.update(agentSteps).set(changes).where(eq2(agentSteps.id, stepId));
}
async function listAgentSteps(taskId) {
  const db = await requireDb();
  return db.select().from(agentSteps).where(eq2(agentSteps.taskId, taskId)).orderBy(agentSteps.sequence);
}
async function createAgentApproval(input) {
  const db = await requireDb();
  const inserted = await db.insert(agentApprovals).values({
    ...input,
    stepId: input.stepId ?? null,
    status: "requested",
    requestedAt: Date.now()
  }).$returningId();
  const records = await db.select().from(agentApprovals).where(eq2(agentApprovals.id, Number(inserted[0]?.id))).limit(1);
  if (!records[0]) throw new Error("Unable to create agent approval");
  return records[0];
}
async function listTaskApprovals(taskId) {
  const db = await requireDb();
  return db.select().from(agentApprovals).where(eq2(agentApprovals.taskId, taskId)).orderBy(desc(agentApprovals.requestedAt));
}
async function resolveAgentApproval(input) {
  const db = await requireDb();
  const result = await db.select({ approval: agentApprovals, task: agentTasks }).from(agentApprovals).innerJoin(agentTasks, eq2(agentApprovals.taskId, agentTasks.id)).where(and(eq2(agentApprovals.id, input.approvalId), eq2(agentTasks.userId, input.userId))).limit(1);
  const current = result[0]?.approval;
  if (!current || current.status !== "requested") return void 0;
  await db.update(agentApprovals).set({
    status: input.approved ? "approved" : "rejected",
    resolvedByUserId: input.userId,
    resolvedAt: Date.now()
  }).where(eq2(agentApprovals.id, input.approvalId));
  const updated = await db.select().from(agentApprovals).where(eq2(agentApprovals.id, input.approvalId)).limit(1);
  return updated[0];
}
async function listAgentMemories(userId) {
  const db = await requireDb();
  return db.select().from(agentMemories).where(and(eq2(agentMemories.userId, userId), eq2(agentMemories.isActive, true))).orderBy(desc(agentMemories.importance), desc(agentMemories.updatedAt));
}
async function createAgentMemory(input) {
  const db = await requireDb();
  const now = Date.now();
  const inserted = await db.insert(agentMemories).values({
    ...input,
    sourceTaskId: input.sourceTaskId ?? null,
    importance: input.importance ?? 3,
    isActive: true,
    createdAt: now,
    updatedAt: now
  }).$returningId();
  const created = await db.select().from(agentMemories).where(eq2(agentMemories.id, Number(inserted[0]?.id))).limit(1);
  if (!created[0]) throw new Error("Unable to create agent memory");
  return created[0];
}
async function deactivateAgentMemory(memoryId, userId) {
  const db = await requireDb();
  const current = await db.select().from(agentMemories).where(and(eq2(agentMemories.id, memoryId), eq2(agentMemories.userId, userId))).limit(1);
  if (!current[0]) return false;
  await db.update(agentMemories).set({ isActive: false, updatedAt: Date.now() }).where(eq2(agentMemories.id, memoryId));
  return true;
}
async function listAgentSchedules(userId) {
  const db = await requireDb();
  return db.select().from(agentSchedules).where(eq2(agentSchedules.userId, userId)).orderBy(desc(agentSchedules.createdAt));
}
async function listScheduleRuns(scheduleId, userId) {
  const db = await requireDb();
  return db.select().from(agentTasks).where(and(eq2(agentTasks.scheduleId, scheduleId), eq2(agentTasks.userId, userId))).orderBy(desc(agentTasks.createdAt)).limit(20);
}
async function createAgentSchedule(input) {
  const db = await requireDb();
  const now = Date.now();
  const inserted = await db.insert(agentSchedules).values({
    ...input,
    scheduleCronTaskUid: input.scheduleCronTaskUid ?? null,
    nextRunAt: input.nextRunAt ?? null,
    status: "active",
    createdAt: now,
    updatedAt: now
  }).$returningId();
  const created = await db.select().from(agentSchedules).where(eq2(agentSchedules.id, Number(inserted[0]?.id))).limit(1);
  if (!created[0]) throw new Error("Unable to create agent schedule");
  return created[0];
}
async function getAgentScheduleByCronTaskUid(taskUid) {
  const db = await requireDb();
  const result = await db.select().from(agentSchedules).where(eq2(agentSchedules.scheduleCronTaskUid, taskUid)).limit(1);
  return result[0];
}
async function updateAgentSchedule(scheduleId, userId, changes) {
  const db = await requireDb();
  const current = await db.select().from(agentSchedules).where(and(eq2(agentSchedules.id, scheduleId), eq2(agentSchedules.userId, userId))).limit(1);
  if (!current[0]) return void 0;
  await db.update(agentSchedules).set({ ...changes, updatedAt: Date.now() }).where(eq2(agentSchedules.id, scheduleId));
  const updated = await db.select().from(agentSchedules).where(eq2(agentSchedules.id, scheduleId)).limit(1);
  return updated[0];
}
async function recordAgentNotification(input) {
  const db = await requireDb();
  const now = Date.now();
  await db.insert(agentNotifications).values({
    ...input,
    taskId: input.taskId ?? null,
    createdAt: now,
    deliveredAt: input.status === "sent" ? now : null
  });
}
async function getTaskWithTrace(taskId, userId) {
  const task = await getAgentTaskForUser(taskId, userId);
  if (!task) return void 0;
  const [steps, approvals] = await Promise.all([listAgentSteps(taskId), listTaskApprovals(taskId)]);
  return { task, steps, approvals };
}
var init_db2 = __esm({
  "server/agent/db.ts"() {
    "use strict";
    init_schema();
    init_db();
  }
});

// server/vercel-entry.ts
import express2 from "express";
import path from "path";

// server/app.ts
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/agent/connectors.ts
import { Buffer as Buffer2 } from "node:buffer";
var AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_repository_files",
      description: "List the repository file tree before planning code changes.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "read_repository_file",
      description: "Read a UTF-8 text file from the working branch before editing it.",
      parameters: {
        type: "object",
        required: ["path"],
        properties: { path: { type: "string", description: "Repository-relative file path" } }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_work_branch",
      description: "Create or verify the isolated work branch for this task before writing code.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "write_repository_file",
      description: "Create or update one UTF-8 source file in the isolated work branch. Always read an existing file first.",
      parameters: {
        type: "object",
        required: ["path", "content", "message"],
        properties: {
          path: { type: "string", description: "Repository-relative file path" },
          content: { type: "string", description: "Complete UTF-8 replacement file content" },
          message: { type: "string", description: "Concise commit message" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_repository_file",
      description: "Delete one repository file from the isolated work branch only when explicitly necessary.",
      parameters: {
        type: "object",
        required: ["path", "message"],
        properties: {
          path: { type: "string", description: "Repository-relative file path" },
          message: { type: "string", description: "Concise commit message" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "open_pull_request",
      description: "Open a pull request from the isolated work branch for review after code changes are complete.",
      parameters: {
        type: "object",
        required: ["title", "body"],
        properties: {
          title: { type: "string" },
          body: { type: "string" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_deployment_status",
      description: "Read the current Vercel deployment status and live URL for the configured project.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "deploy_preview",
      description: "Trigger a preview deployment from the isolated GitHub branch after changes are committed.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "redeploy_production",
      description: "Redeploy the latest production build only after explicit approval.",
      parameters: { type: "object", properties: {} }
    }
  }
];
function getAgentToolDefinitions() {
  return AGENT_TOOLS;
}
function getGitHubConfig(env = process.env) {
  const token = env.GITHUB_TOKEN?.trim();
  if (!token) throw new Error("GitHub is not configured. Add GITHUB_TOKEN in Settings before executing repository actions.");
  return { token };
}
function getVercelConfig(env = process.env) {
  const token = env.VERCEL_TOKEN?.trim();
  if (!token) throw new Error("Vercel is not configured. Add VERCEL_TOKEN in Settings before deployment actions.");
  return { token, teamId: env.VERCEL_TEAM_ID?.trim() || void 0 };
}
function splitRepository(repository) {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo || repository.split("/").length !== 2) throw new Error("Repository must use the owner/name format.");
  return { owner, repo };
}
function validateRepositoryPath(path2) {
  if (!path2 || path2.startsWith("/") || path2.includes("..") || path2.includes("\\")) {
    throw new Error("Repository file paths must be relative and cannot include traversal segments.");
  }
}
async function githubRequest(path2, init = {}) {
  const { token } = getGitHubConfig();
  const response = await fetch(`https://api.github.com${path2}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers ?? {}
    },
    signal: AbortSignal.timeout(6e4)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `GitHub request failed (${response.status}).`);
  return data;
}
async function getDefaultBranch(repository) {
  const { owner, repo } = splitRepository(repository);
  const data = await githubRequest(`/repos/${owner}/${repo}`);
  return data.default_branch;
}
async function getFileMetadata(repository, path2, ref) {
  validateRepositoryPath(path2);
  const { owner, repo } = splitRepository(repository);
  return githubRequest(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path2)}?ref=${encodeURIComponent(ref)}`);
}
async function ensureWorkBranch(ctx) {
  const { owner, repo } = splitRepository(ctx.repository);
  try {
    await githubRequest(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(ctx.workBranch)}`);
    return { branch: ctx.workBranch, created: false };
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Not Found")) throw error;
  }
  const defaultBranch = await getDefaultBranch(ctx.repository);
  const ref = await githubRequest(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(defaultBranch)}`);
  await githubRequest(`/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${ctx.workBranch}`, sha: ref.object.sha })
  });
  return { branch: ctx.workBranch, created: true };
}
async function listRepositoryFiles(ctx) {
  const { owner, repo } = splitRepository(ctx.repository);
  const defaultBranch = await getDefaultBranch(ctx.repository);
  const tree = await githubRequest(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`);
  return tree.tree.filter((entry) => entry.type === "blob").slice(0, 500).map((entry) => ({ path: entry.path, size: entry.size ?? 0 }));
}
async function readRepositoryFile(ctx, args) {
  const path2 = String(args.path || "");
  const metadata = await getFileMetadata(ctx.repository, path2, ctx.workBranch);
  if (metadata.encoding !== "base64" || !metadata.content) throw new Error("Only base64-encoded text files can be read.");
  return { path: metadata.path, sha: metadata.sha, content: Buffer2.from(metadata.content.replace(/\n/g, ""), "base64").toString("utf8") };
}
async function writeRepositoryFile(ctx, args) {
  const path2 = String(args.path || "");
  const content = String(args.content || "");
  const message = String(args.message || "Update source file");
  validateRepositoryPath(path2);
  const { owner, repo } = splitRepository(ctx.repository);
  let existingSha;
  try {
    existingSha = (await getFileMetadata(ctx.repository, path2, ctx.workBranch)).sha;
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Not Found")) throw error;
  }
  const result = await githubRequest(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path2)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer2.from(content, "utf8").toString("base64"),
      branch: ctx.workBranch,
      ...existingSha ? { sha: existingSha } : {}
    })
  });
  return { path: result.content?.path || path2, commitSha: result.commit?.sha || null };
}
async function deleteRepositoryFile(ctx, args) {
  const path2 = String(args.path || "");
  const message = String(args.message || "Remove obsolete source file");
  const existing = await getFileMetadata(ctx.repository, path2, ctx.workBranch);
  const { owner, repo } = splitRepository(ctx.repository);
  const result = await githubRequest(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path2)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha: existing.sha, branch: ctx.workBranch })
  });
  return { path: path2, commitSha: result.commit?.sha || null };
}
async function openPullRequest(ctx, args) {
  const { owner, repo } = splitRepository(ctx.repository);
  const base = await getDefaultBranch(ctx.repository);
  const title = String(args.title || "SenotaAI agent changes");
  const body = String(args.body || "Changes prepared by SenotaAI.");
  const result = await githubRequest(`/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, head: ctx.workBranch, base })
  });
  return { number: result.number, url: result.html_url, state: result.state };
}
async function vercelRequest(path2, init = {}) {
  const config = getVercelConfig();
  const response = await fetch(`https://api.vercel.com${path2}${path2.includes("?") ? "&" : "?"}${config.teamId ? `teamId=${encodeURIComponent(config.teamId)}` : ""}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.token}`, ...init.headers ?? {} },
    signal: AbortSignal.timeout(6e4)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || data.message || `Vercel request failed (${response.status}).`);
  return data;
}
async function getDeploymentStatus(ctx) {
  if (!ctx.vercelProject) throw new Error("Select a Vercel project in Settings before requesting deployment status.");
  const data = await vercelRequest(`/v6/deployments?projectId=${encodeURIComponent(ctx.vercelProject)}&limit=1`);
  const deployment = data.deployments?.[0];
  return deployment ? { id: deployment.uid, url: `https://${deployment.url}`, status: deployment.readyState, target: deployment.target ?? "preview" } : { status: "NOT_FOUND" };
}
async function getVercelBuildEvents(deploymentId) {
  const events = await vercelRequest(`/v3/deployments/${encodeURIComponent(deploymentId)}/events?limit=50&direction=backward`);
  return Array.isArray(events) ? events : [];
}
async function createVercelDeployment(ctx, target) {
  if (!ctx.vercelProject) throw new Error("Select a Vercel project in Settings before triggering a deployment.");
  const { owner, repo } = splitRepository(ctx.repository);
  const repoDetails = await githubRequest(`/repos/${owner}/${repo}`);
  const deployment = await vercelRequest("/v13/deployments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project: ctx.vercelProject,
      target,
      gitSource: { type: "github", repoId: String(repoDetails.id), ref: target === "production" ? await getDefaultBranch(ctx.repository) : ctx.workBranch }
    })
  });
  let current = deployment;
  const emittedBuildEvents = /* @__PURE__ */ new Set();
  await ctx.onProgress?.(`Vercel accepted the ${target} deployment; current state: ${current.readyState ?? "QUEUED"}.`);
  for (let attempt = 0; attempt < 4 && !["READY", "ERROR", "CANCELED"].includes(current.readyState ?? ""); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2e3));
    current = await vercelRequest(`/v13/deployments/${encodeURIComponent(deployment.id)}`);
    await ctx.onProgress?.(`Vercel deployment state: ${current.readyState ?? "UNKNOWN"}.`);
    try {
      const events = await getVercelBuildEvents(deployment.id);
      for (const buildEvent of events.reverse()) {
        const text2 = buildEvent.payload?.text?.trim();
        if (!text2) continue;
        const key = buildEvent.payload?.id || buildEvent.payload?.serial || `${buildEvent.type}:${text2}`;
        if (emittedBuildEvents.has(key)) continue;
        emittedBuildEvents.add(key);
        await ctx.onProgress?.(`Vercel build \xB7 ${text2.slice(0, 1500)}`);
      }
    } catch (error) {
      console.warn("[SenotaAI] Vercel build event retrieval unavailable", error);
    }
  }
  return { id: current.id, url: current.url ? `https://${current.url}` : null, status: current.readyState ?? "QUEUED" };
}
async function executeConnectorTool(name, args, ctx) {
  switch (name) {
    case "list_repository_files":
      return listRepositoryFiles(ctx);
    case "read_repository_file":
      return readRepositoryFile(ctx, args);
    case "create_work_branch":
      return ensureWorkBranch(ctx);
    case "write_repository_file":
      return writeRepositoryFile(ctx, args);
    case "delete_repository_file":
      return deleteRepositoryFile(ctx, args);
    case "open_pull_request":
      return openPullRequest(ctx, args);
    case "get_deployment_status":
      return getDeploymentStatus(ctx);
    case "deploy_preview":
      return createVercelDeployment(ctx, "preview");
    case "redeploy_production":
      return createVercelDeployment(ctx, "production");
    default:
      throw new Error(`Unknown agent tool: ${name}`);
  }
}

// server/agent/engine.ts
init_db2();

// server/agent/ollama.ts
function getOllamaConfig(env = process.env) {
  const baseUrl = env.OLLAMA_BASE_URL?.trim().replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("Ollama is not configured. Add OLLAMA_BASE_URL in Settings before executing a task.");
  }
  if (!/^https:\/\//.test(baseUrl) && env.NODE_ENV === "production") {
    throw new Error("OLLAMA_BASE_URL must use HTTPS in production.");
  }
  return {
    baseUrl,
    apiKey: env.OLLAMA_API_KEY?.trim() || void 0,
    defaultModel: env.OLLAMA_DEFAULT_MODEL?.trim() || "gpt-oss:20b"
  };
}
async function chatWithOllama(input) {
  return streamChatWithOllama(input, () => void 0);
}
async function streamChatWithOllama(input, onChunk) {
  const config = getOllamaConfig();
  const response = await fetch(`${config.baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}
    },
    body: JSON.stringify({
      model: input.model || config.defaultModel,
      messages: input.messages,
      tools: input.tools,
      stream: true,
      think: true,
      keep_alive: "0"
    }),
    signal: AbortSignal.timeout(15e4)
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Ollama request failed (${response.status}).`);
  }
  if (!response.body) throw new Error("Ollama did not return a readable response stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let content = "";
  let thinking = "";
  const toolCalls = [];
  const consume = async (line) => {
    if (!line.trim()) return;
    const payload = JSON.parse(line);
    const nextThinking = payload.message?.thinking || "";
    const nextContent = payload.message?.content || "";
    if (nextThinking) {
      thinking += nextThinking;
      await onChunk({ thinking: nextThinking });
    }
    if (nextContent) {
      content += nextContent;
      await onChunk({ content: nextContent });
    }
    for (const call of payload.message?.tool_calls ?? []) {
      if (!call.function?.name || call.function.arguments === void 0) continue;
      toolCalls.push({ id: call.id, type: call.type, function: { name: call.function.name, arguments: call.function.arguments } });
    }
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) await consume(line);
  }
  if (pending.trim()) await consume(pending);
  return { content: content.trim(), thinking: thinking.trim(), toolCalls };
}

// server/agent/policy.ts
var ACTION_RISKS = {
  list_repository_files: "read",
  read_repository_file: "read",
  get_deployment_status: "read",
  create_work_branch: "reversible",
  write_repository_file: "reversible",
  open_pull_request: "reversible",
  deploy_preview: "reversible",
  delete_repository_file: "destructive",
  redeploy_production: "sensitive"
};
function getActionRisk(actionName) {
  return ACTION_RISKS[actionName] ?? "sensitive";
}
function requiresApproval(actionName, executionMode) {
  const risk = getActionRisk(actionName);
  if (risk === "read") return false;
  if (risk === "destructive" || risk === "sensitive") return true;
  return executionMode === "confirm";
}
function approvalTitleFor(actionName) {
  const labels = {
    create_work_branch: "Create a working branch",
    write_repository_file: "Write repository files",
    delete_repository_file: "Delete a repository file",
    open_pull_request: "Open a pull request",
    deploy_preview: "Trigger a preview deployment",
    redeploy_production: "Redeploy production"
  };
  return labels[actionName] ?? "Execute a sensitive agent action";
}

// server/agent/state.ts
var MAX_AGENT_TOOL_TURNS = 12;
var MAX_AGENT_RETRIES = 2;
var TERMINAL_STATUSES = /* @__PURE__ */ new Set(["completed", "cancelled", "failed"]);
function isTerminalTaskStatus(status) {
  return TERMINAL_STATUSES.has(status);
}
function agentTurnAvailable(turn) {
  return turn >= 0 && turn < MAX_AGENT_TOOL_TURNS;
}
function boundedRetryCount(configuredRetries) {
  return Math.max(0, Math.min(configuredRetries, MAX_AGENT_RETRIES));
}
function statusAfterApprovalDecision(approved) {
  return approved ? "queued" : "paused";
}

// server/agent/engine.ts
function event(taskId, type, details = {}) {
  return { taskId, type, timestamp: Date.now(), ...details };
}
function normalizeArguments(value) {
  if (typeof value === "string") {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Tool arguments must be a JSON object.");
    return parsed;
  }
  return value;
}
function callFingerprint(name, args) {
  return `${name}:${JSON.stringify(args)}`;
}
async function notifyTaskOwner(input) {
  let delivered = false;
  try {
    delivered = await notifyOwner({ title: input.title, content: input.content });
  } catch (error) {
    console.error("[SenotaAI] owner notification failed", error);
  }
  await recordAgentNotification({ ...input, status: delivered ? "sent" : "failed" });
}
function buildSystemPrompt(memory) {
  const memoryContext = memory.length ? memory.map((item) => `- [${item.category}] ${item.content}`).join("\n") : "- No persistent project memories yet.";
  return `You are SenotaAI, a governed autonomous coding agent. You work only through the supplied tools and never invent results. Work on an isolated task branch, inspect files before changing them, and prefer a pull request and preview deployment over direct production work. Explain short progress checkpoints through tool-driven actions, not internal hidden reasoning. If the goal is complete, respond with a concise summary and do not call another tool. Never ask for or output secrets.

Relevant persistent context:
${memoryContext}`;
}
async function resolveTaskState(taskId, userId) {
  const task = await getAgentTaskForUser(taskId, userId);
  if (!task) throw new Error("Task not found or access was revoked.");
  return task;
}
async function runAutonomousTask(input) {
  const emit = async (payload) => input.emit?.(payload);
  const initialTask = await resolveTaskState(input.taskId, input.userId);
  if (isTerminalTaskStatus(initialTask.status)) {
    throw new Error("This task is already finished. Create a new task to run it again.");
  }
  const settings = await getOrCreateAgentSettings(input.userId);
  const memories = await listAgentMemories(input.userId);
  const workBranch = `senota/task-${input.taskId}`;
  let sequence = 0;
  const messages = [
    { role: "system", content: buildSystemPrompt(memories.slice(0, 12)) },
    { role: "user", content: `Goal: ${initialTask.goal}
Repository: ${initialTask.repository}
Working branch: ${workBranch}
Start by inspecting the repository and then work sequentially until the goal is complete.` }
  ];
  await updateAgentTask(input.taskId, { status: "planning", currentPhase: "Preparing an execution plan", startedAt: initialTask.startedAt ?? Date.now(), pauseRequested: false });
  await emit(event(input.taskId, "status", { status: "planning", message: "SenotaAI is preparing a bounded execution plan." }));
  try {
    for (let turn = 0; agentTurnAvailable(turn); turn += 1) {
      const current = await resolveTaskState(input.taskId, input.userId);
      if (current.cancelRequested) {
        await updateAgentTask(input.taskId, { status: "cancelled", currentPhase: "Cancelled by user", finishedAt: Date.now() });
        await emit(event(input.taskId, "status", { status: "cancelled", message: "Task cancelled. No further tools will be called." }));
        return { status: "cancelled" };
      }
      if (current.pauseRequested) {
        await updateAgentTask(input.taskId, { status: "paused", currentPhase: "Paused by user" });
        await emit(event(input.taskId, "status", { status: "paused", message: "Task paused safely between steps." }));
        return { status: "paused" };
      }
      await updateAgentTask(input.taskId, { status: "running", currentPhase: turn === 0 ? "Planning and inspecting" : "Executing agent tools" });
      let streamedThinking = "";
      let streamedContent = "";
      const response = await streamChatWithOllama(
        { model: current.model, messages, tools: getAgentToolDefinitions() },
        async (chunk) => {
          if (chunk.thinking) {
            streamedThinking += chunk.thinking;
            await emit(event(input.taskId, "text", { message: `Reasoning \xB7 ${chunk.thinking}` }));
          }
          if (chunk.content) {
            streamedContent += chunk.content;
            await emit(event(input.taskId, "text", { message: chunk.content }));
          }
        }
      );
      if (streamedThinking || streamedContent) {
        const inferenceStep = await createAgentStep({
          taskId: input.taskId,
          sequence: sequence += 1,
          kind: "inference",
          status: "completed",
          title: "Model response streamed",
          detail: [streamedThinking ? `Reasoning: ${streamedThinking}` : "", streamedContent ? `Response: ${streamedContent}` : ""].filter(Boolean).join("\n\n").slice(0, 12e3)
        });
        await emit(event(input.taskId, "step", { step: { id: inferenceStep.id, sequence: inferenceStep.sequence, kind: inferenceStep.kind, title: inferenceStep.title, status: "completed", detail: inferenceStep.detail } }));
      }
      const assistantMessage = { role: "assistant", content: response.content, tool_calls: response.toolCalls };
      messages.push(assistantMessage);
      if (!response.toolCalls.length) {
        const summary = response.content || "The agent completed its bounded tool loop without a final narrative.";
        const completeStep = await createAgentStep({
          taskId: input.taskId,
          sequence: sequence += 1,
          kind: "reflection",
          status: "completed",
          title: "Agent reflection completed",
          detail: summary
        });
        await emit(event(input.taskId, "step", { step: { id: completeStep.id, sequence: completeStep.sequence, kind: completeStep.kind, title: completeStep.title, status: "completed", detail: summary } }));
        await createAgentMemory({ userId: input.userId, sourceTaskId: input.taskId, category: "task-outcome", content: summary.slice(0, 1500), importance: 2 });
        await updateAgentTask(input.taskId, { status: "completed", currentPhase: "Completed", finalSummary: summary, finishedAt: Date.now() });
        await notifyTaskOwner({ userId: input.userId, taskId: input.taskId, kind: "completed", title: "SenotaAI task completed", content: summary.slice(0, 1500) });
        await emit(event(input.taskId, "complete", { status: "completed", message: summary }));
        return { status: "completed", summary };
      }
      for (const toolCall of response.toolCalls) {
        const toolName = toolCall.function.name;
        const args = normalizeArguments(toolCall.function.arguments);
        const toolStep = await createAgentStep({
          taskId: input.taskId,
          sequence: sequence += 1,
          kind: toolName,
          status: "running",
          title: `Agent requested ${toolName.replace(/_/g, " ")}`,
          detail: "Validating safety policy and executing through the configured connector.",
          payload: args
        });
        await emit(event(input.taskId, "step", { step: { id: toolStep.id, sequence: toolStep.sequence, kind: toolStep.kind, title: toolStep.title, status: "running", detail: toolStep.detail } }));
        const approvals = await listTaskApprovals(input.taskId);
        const fingerprint = callFingerprint(toolName, args);
        const approval = approvals.find((item) => item.actionType === fingerprint && item.status === "approved");
        if (requiresApproval(toolName, current.executionMode) && !approval) {
          const description = `Action: ${toolName}
Request fingerprint: ${fingerprint}
The agent will execute this exact tool request only after approval.`;
          await createAgentApproval({ taskId: input.taskId, stepId: toolStep.id, actionType: fingerprint, title: approvalTitleFor(toolName), description });
          await updateAgentStep(toolStep.id, { status: "pending", detail: "Waiting for an explicit approval." });
          await updateAgentTask(input.taskId, { status: "awaiting_approval", currentPhase: "Awaiting approval" });
          await notifyTaskOwner({ userId: input.userId, taskId: input.taskId, kind: "approval_required", title: "SenotaAI approval required", content: description });
          await emit(event(input.taskId, "status", { status: "awaiting_approval", message: `${approvalTitleFor(toolName)} requires approval before the task can continue.` }));
          return { status: "awaiting_approval" };
        }
        let output;
        let lastError;
        for (let attempt = 0; attempt <= boundedRetryCount(settings.defaultMaxRetries); attempt += 1) {
          try {
            output = await executeConnectorTool(toolName, args, {
              taskId: input.taskId,
              userId: input.userId,
              repository: current.repository,
              workBranch,
              vercelProject: settings.vercelProject,
              onProgress: async (message) => {
                await emit(event(input.taskId, "text", { message }));
              }
            });
            lastError = void 0;
            break;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < boundedRetryCount(settings.defaultMaxRetries)) {
              await updateAgentTask(input.taskId, { retryCount: current.retryCount + attempt + 1, currentPhase: `Retrying ${toolName}` });
              await emit(event(input.taskId, "text", { message: `${toolName} failed; retrying once more within the task budget.` }));
            }
          }
        }
        if (lastError) throw lastError;
        const outputText = JSON.stringify(output).slice(0, 12e3);
        await updateAgentStep(toolStep.id, { status: "completed", detail: outputText, payload: { arguments: args, result: output } });
        await emit(event(input.taskId, "step", { step: { id: toolStep.id, sequence: toolStep.sequence, kind: toolStep.kind, title: toolStep.title, status: "completed", detail: outputText } }));
        messages.push({ role: "tool", tool_name: toolName, content: outputText });
      }
    }
    throw new Error("Task stopped after the configured tool-turn budget to preserve the autonomy limit.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedStep = await createAgentStep({
      taskId: input.taskId,
      sequence: sequence += 1,
      kind: "failure",
      status: "failed",
      title: "Agent execution failed",
      detail: message
    });
    await updateAgentTask(input.taskId, { status: "failed", currentPhase: "Failed", errorMessage: message, finishedAt: Date.now() });
    await notifyTaskOwner({ userId: input.userId, taskId: input.taskId, kind: "failed", title: "SenotaAI task failed", content: message });
    await emit(event(input.taskId, "error", { status: "failed", step: { id: failedStep.id, sequence: failedStep.sequence, kind: failedStep.kind, title: failedStep.title, status: "failed", detail: message }, message }));
    return { status: "failed", error: message };
  }
}

// server/app.ts
init_db2();

// server/agent/schedule.ts
function isValidSixFieldCron(value) {
  const fields = value.trim().split(/\s+/).filter(Boolean);
  return fields.length === 6 && fields.every((field) => /^[\d*/?,\-]+$/.test(field));
}
function buildScheduledTaskInput(input) {
  return { ...input };
}

// server/agent/scheduledExecution.ts
async function executeScheduledRun(input) {
  const task = await input.createTask(buildScheduledTaskInput({
    userId: input.schedule.userId,
    scheduleId: input.schedule.id,
    goal: input.schedule.goal,
    model: input.schedule.model,
    executionMode: input.schedule.executionMode,
    repository: input.repository
  }));
  const result = await input.runTask(task.id, input.schedule.userId);
  await input.updateSchedule(input.schedule.id, input.schedule.userId, {
    lastRunAt: Date.now(),
    status: result.status === "failed" ? "failed" : "active"
  });
  return { taskId: task.id, result };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/agent.ts
import { parse as parseCookie } from "cookie";
import { z as z2 } from "zod";

// server/_core/heartbeat.ts
init_env();
import { TRPCError as TRPCError3 } from "@trpc/server";
var SERVICE = "webdevtoken.v1.WebDevService";
var buildEndpoint = (rpc) => {
  if (!ENV.forgeApiUrl) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: "Heartbeat service URL is not configured (BUILT_IN_FORGE_API_URL)."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: "Heartbeat service API key is not configured (BUILT_IN_FORGE_API_KEY)."
    });
  }
  const baseUrl = ENV.forgeApiUrl;
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(`${SERVICE}/${rpc}`, normalizedBase).toString();
};
var callForge = async (rpc, body, userSession) => {
  const endpoint = buildEndpoint(rpc);
  const headers = {
    accept: "application/json",
    authorization: `Bearer ${ENV.forgeApiKey}`,
    "content-type": "application/json",
    "connect-protocol-version": "1"
  };
  if (userSession) {
    headers["x-manus-user-session"] = userSession;
  }
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: `Heartbeat ${rpc} network error: ${String(error)}`
    });
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw mapForgeError(response, detail, rpc);
  }
  return await response.json();
};
var mapForgeError = (response, detail, rpc) => {
  const status = response.status;
  let code = "INTERNAL_SERVER_ERROR";
  if (status === 401) code = "UNAUTHORIZED";
  else if (status === 403) code = "FORBIDDEN";
  else if (status === 404) code = "NOT_FOUND";
  else if (status === 400 || status === 422) code = "BAD_REQUEST";
  else if (status === 409) code = "CONFLICT";
  else if (status === 429) code = "TOO_MANY_REQUESTS";
  return new TRPCError3({
    code,
    message: `Heartbeat ${rpc} failed (${status})${detail ? `: ${detail}` : ""}`
  });
};
var stringifyPayload = (payload) => {
  if (payload === void 0 || payload === null) return "{}";
  if (typeof payload === "string") return payload;
  return JSON.stringify(payload);
};
var validateCallbackPath = (path2) => {
  if (!path2 || !path2.startsWith("/api/scheduled/")) {
    throw new TRPCError3({
      code: "BAD_REQUEST",
      message: "callback path must start with /api/scheduled/"
    });
  }
};
async function createHeartbeatJob(job, userSession) {
  validateCallbackPath(job.path);
  return callForge(
    "CreateHeartbeatJob",
    {
      name: job.name,
      cronExpression: job.cron,
      callbackPath: job.path,
      callbackMethod: job.method ?? "POST",
      callbackPayload: stringifyPayload(job.payload),
      description: job.description ?? ""
    },
    userSession
  );
}
async function updateHeartbeatJob(taskUid, patch, userSession) {
  if (patch.path !== void 0) validateCallbackPath(patch.path);
  const body = { taskUid };
  if (patch.cron !== void 0) body.cronExpression = patch.cron;
  if (patch.path !== void 0) body.callbackPath = patch.path;
  if (patch.method !== void 0) body.callbackMethod = patch.method;
  if (patch.payload !== void 0) {
    body.callbackPayload = stringifyPayload(patch.payload);
  }
  if (patch.description !== void 0) body.description = patch.description;
  if (patch.enable !== void 0) body.enable = patch.enable;
  return callForge(
    "UpdateHeartbeatJob",
    body,
    userSession
  );
}

// server/routers/agent.ts
init_db2();

// server/agent/approvalWorkflow.ts
async function decideApprovalAndQueue(input) {
  const approval = await input.resolveApproval({ approvalId: input.approvalId, userId: input.userId, approved: input.approved });
  if (!approval) return void 0;
  const nextStatus = statusAfterApprovalDecision(input.approved);
  await input.updateTask(approval.taskId, {
    status: nextStatus,
    currentPhase: input.approved ? "Approved action is ready to continue" : "Approval declined; task paused"
  });
  return approval;
}

// server/routers/agent.ts
var executionModeSchema = z2.enum(["confirm", "auto"]);
var cronSchema = z2.string().trim().refine(isValidSixFieldCron, "Cron expressions must have six UTC fields: sec min hour day month weekday.");
function currentSessionToken(cookieHeader) {
  return parseCookie(cookieHeader ?? "")[COOKIE_NAME] ?? "";
}
var agentRouter = router({
  chat: publicProcedure.input(z2.object({
    model: z2.string().trim().min(1).max(128).optional(),
    messages: z2.array(z2.object({
      role: z2.enum(["user", "assistant"]),
      content: z2.string().trim().min(1).max(16e3)
    })).min(1).max(30)
  })).mutation(async ({ input }) => {
    const response = await chatWithOllama({
      model: input.model,
      messages: [
        {
          role: "system",
          content: "You are SenotaAI, an autonomous software-agent assistant. Help the user plan, build, debug, and deploy software. Be clear about which actions need confirmation before execution."
        },
        ...input.messages
      ]
    });
    return { content: response.content, thinking: response.thinking };
  }),
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const [settings, tasks, memories, schedules] = await Promise.all([
      getOrCreateAgentSettings(ctx.user.id),
      listAgentTasks(ctx.user.id, 12),
      listAgentMemories(ctx.user.id),
      listAgentSchedules(ctx.user.id)
    ]);
    return { settings, tasks, memories, schedules };
  }),
  connections: publicProcedure.query(async () => ({
    ollamaConfigured: Boolean(process.env.OLLAMA_BASE_URL),
    githubConfigured: Boolean(process.env.GITHUB_TOKEN),
    vercelConfigured: Boolean(process.env.VERCEL_TOKEN),
    schedulerReady: process.env.NODE_ENV === "production"
  })),
  settings: router({
    get: protectedProcedure.query(({ ctx }) => getOrCreateAgentSettings(ctx.user.id)),
    update: protectedProcedure.input(z2.object({
      defaultModel: z2.string().trim().min(1).max(128).optional(),
      defaultExecutionMode: executionModeSchema.optional(),
      defaultMaxRetries: z2.number().int().min(0).max(2).optional(),
      githubRepository: z2.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Use owner/repository format.").optional(),
      vercelProject: z2.string().trim().min(1).max(128).nullable().optional(),
      notificationsEnabled: z2.boolean().optional()
    })).mutation(({ ctx, input }) => updateAgentSettings(ctx.user.id, input))
  }),
  tasks: router({
    list: protectedProcedure.query(({ ctx }) => listAgentTasks(ctx.user.id)),
    get: protectedProcedure.input(z2.object({ taskId: z2.number().int().positive() })).query(({ ctx, input }) => getTaskWithTrace(input.taskId, ctx.user.id)),
    create: protectedProcedure.input(z2.object({
      goal: z2.string().trim().min(12, "Describe a concrete outcome in at least 12 characters.").max(12e3),
      model: z2.string().trim().min(1).max(128).optional(),
      executionMode: executionModeSchema.optional()
    })).mutation(async ({ ctx, input }) => {
      const settings = await getOrCreateAgentSettings(ctx.user.id);
      return createAgentTask({
        userId: ctx.user.id,
        goal: input.goal,
        model: input.model || settings.defaultModel,
        executionMode: input.executionMode || settings.defaultExecutionMode,
        repository: settings.githubRepository
      });
    }),
    pause: protectedProcedure.input(z2.object({ taskId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const task = await getAgentTaskForUser(input.taskId, ctx.user.id);
      if (!task) throw new Error("Task not found.");
      await updateAgentTask(task.id, { pauseRequested: true });
      return { ok: true };
    }),
    resume: protectedProcedure.input(z2.object({ taskId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const task = await getAgentTaskForUser(input.taskId, ctx.user.id);
      if (!task) throw new Error("Task not found.");
      await updateAgentTask(task.id, { status: "queued", pauseRequested: false, cancelRequested: false, currentPhase: "Queued for continuation" });
      return { ok: true };
    }),
    cancel: protectedProcedure.input(z2.object({ taskId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const task = await getAgentTaskForUser(input.taskId, ctx.user.id);
      if (!task) throw new Error("Task not found.");
      await updateAgentTask(task.id, { cancelRequested: true });
      return { ok: true };
    })
  }),
  approvals: router({
    decide: protectedProcedure.input(z2.object({ approvalId: z2.number().int().positive(), approved: z2.boolean() })).mutation(async ({ ctx, input }) => {
      const approval = await decideApprovalAndQueue({
        approvalId: input.approvalId,
        userId: ctx.user.id,
        approved: input.approved,
        resolveApproval: resolveAgentApproval,
        updateTask: updateAgentTask
      });
      if (!approval) throw new Error("Approval was not found or was already resolved.");
      return approval;
    })
  }),
  memories: router({
    list: protectedProcedure.query(({ ctx }) => listAgentMemories(ctx.user.id)),
    remove: protectedProcedure.input(z2.object({ memoryId: z2.number().int().positive() })).mutation(({ ctx, input }) => deactivateAgentMemory(input.memoryId, ctx.user.id))
  }),
  schedules: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const schedules = await listAgentSchedules(ctx.user.id);
      const { listScheduleRuns: listScheduleRuns2 } = await Promise.resolve().then(() => (init_db2(), db_exports));
      return Promise.all(schedules.map(async (schedule) => ({
        ...schedule,
        runs: await listScheduleRuns2(schedule.id, ctx.user.id)
      })));
    }),
    create: protectedProcedure.input(z2.object({
      goal: z2.string().trim().min(12).max(12e3),
      cronExpression: cronSchema,
      model: z2.string().trim().min(1).max(128).optional(),
      executionMode: executionModeSchema.optional()
    })).mutation(async ({ ctx, input }) => {
      if (process.env.NODE_ENV !== "production") {
        throw new Error("Publish SenotaAI before creating scheduled tasks so the callback has a reachable production URL.");
      }
      const settings = await getOrCreateAgentSettings(ctx.user.id);
      const temporaryName = `senota-${ctx.user.id}-${Date.now()}`;
      const sessionToken = currentSessionToken(ctx.req.headers.cookie);
      const heartbeat = await createHeartbeatJob({
        name: temporaryName,
        cron: input.cronExpression,
        path: "/api/scheduled/agent-run",
        payload: {},
        description: "Recurring SenotaAI autonomous coding task"
      }, sessionToken);
      return createAgentSchedule({
        userId: ctx.user.id,
        goal: input.goal,
        cronExpression: input.cronExpression,
        model: input.model || settings.defaultModel,
        executionMode: input.executionMode || settings.defaultExecutionMode,
        scheduleCronTaskUid: heartbeat.taskUid,
        nextRunAt: heartbeat.nextExecutionAt ? Date.parse(heartbeat.nextExecutionAt) : null
      });
    }),
    setPaused: protectedProcedure.input(z2.object({ scheduleId: z2.number().int().positive(), paused: z2.boolean() })).mutation(async ({ ctx, input }) => {
      const schedules = await listAgentSchedules(ctx.user.id);
      const schedule = schedules.find((item) => item.id === input.scheduleId);
      if (!schedule?.scheduleCronTaskUid) throw new Error("Schedule was not found or has no managed cron job.");
      const heartbeat = await updateHeartbeatJob(schedule.scheduleCronTaskUid, { enable: !input.paused }, currentSessionToken(ctx.req.headers.cookie));
      return updateAgentSchedule(input.scheduleId, ctx.user.id, {
        status: input.paused ? "paused" : "active",
        nextRunAt: heartbeat.nextExecutionAt ? Date.parse(heartbeat.nextExecutionAt) : null
      });
    })
  })
});

// server/routers.ts
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  agent: agentRouter
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString2 = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString2(openId) || !isNonEmptyString2(appId) || !isNonEmptyString2(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  if (opts.req.headers.authorization) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/oauth.ts
init_db();
import { parse as parseCookieHeader2 } from "cookie";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
init_env();
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/app.ts
function createApp() {
  const app2 = express();
  app2.use(express.json({ limit: "50mb" }));
  app2.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app2);
  registerOAuthRoutes(app2);
  app2.post("/api/agent/tasks/:taskId/run", async (req, res) => {
    let streamClosed = false;
    try {
      const taskId = Number(req.params.taskId);
      if (!Number.isInteger(taskId) || taskId <= 0) return res.status(400).json({ error: "invalid-task-id" });
      res.status(200);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      res.write(`event: connected
data: ${JSON.stringify({ taskId, timestamp: Date.now() })}

`);
      res.on("close", () => {
        streamClosed = true;
      });
      await runAutonomousTask({
        taskId,
        userId: Number(process.env.SENOTA_DIRECT_USER_ID || 0),
        emit: (payload) => {
          if (!streamClosed) res.write(`event: agent
data: ${JSON.stringify(payload)}

`);
        }
      });
      if (!streamClosed) res.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (res.headersSent) {
        if (!streamClosed) res.write(`event: error
data: ${JSON.stringify({ message, timestamp: Date.now() })}

`);
        if (!streamClosed) res.end();
      } else {
        res.status(500).json({ error: message });
      }
    }
  });
  app2.post("/api/scheduled/agent-run", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const schedule = await getAgentScheduleByCronTaskUid(user.taskUid);
      if (!schedule || schedule.status !== "active") return res.json({ ok: true, skipped: "orphan-or-paused" });
      const settings = await getOrCreateAgentSettings(schedule.userId);
      const execution = await executeScheduledRun({
        schedule,
        repository: settings.githubRepository,
        createTask: createAgentTask,
        runTask: (taskId, userId) => runAutonomousTask({ taskId, userId }),
        updateSchedule: updateAgentSchedule
      });
      res.json({ ok: true, ...execution });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message, timestamp: Date.now(), context: { url: req.originalUrl } });
    }
  });
  app2.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app2;
}

// server/vercel-entry.ts
var app = createApp();
var publicDirectory = path.resolve(process.cwd(), "public");
app.use(express2.static(publicDirectory));
app.use("*", (_req, res) => res.sendFile(path.resolve(publicDirectory, "index.html")));
var vercel_entry_default = app;
export {
  vercel_entry_default as default
};
