import { bigint, boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** One password-hash record controls the single SenotaAI owner session. */
export const ownerAccess = mysqlTable("owner_access", {
  id: int("id").autoincrement().primaryKey(),
  instanceKey: varchar("instance_key", { length: 32 }).notNull().unique(),
  userId: int("user_id").notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  sessionVersion: int("session_version").notNull().default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type OwnerAccess = typeof ownerAccess.$inferSelect;

const taskStatuses = [
  "queued",
  "planning",
  "running",
  "awaiting_approval",
  "paused",
  "cancelled",
  "completed",
  "failed",
] as const;

const executionModes = ["confirm", "auto"] as const;
const stepStatuses = ["pending", "running", "completed", "failed", "skipped"] as const;
const approvalStatuses = ["requested", "approved", "rejected", "expired"] as const;
const scheduleStatuses = ["active", "paused", "failed"] as const;
const notificationStatuses = ["pending", "sent", "failed"] as const;

/** A durable goal submission and its current autonomous execution state. */
export const agentTasks = mysqlTable(
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
    finishedAt: bigint("finished_at", { mode: "number" }),
  },
  (table) => [
    index("agent_tasks_user_created_idx").on(table.userId, table.createdAt),
    index("agent_tasks_user_status_idx").on(table.userId, table.status),
    index("agent_tasks_schedule_created_idx").on(table.scheduleId, table.createdAt),
  ],
);

/** Ordered, auditable trace records emitted by the agent control loop. */
export const agentSteps = mysqlTable(
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
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("agent_steps_task_sequence_idx").on(table.taskId, table.sequence),
  ],
);

/** Curated facts and decisions available to future task-planning prompts. */
export const agentMemories = mysqlTable(
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
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("agent_memories_user_active_idx").on(table.userId, table.isActive),
  ],
);

/** Explicit approval decisions for sensitive or user-configured action types. */
export const agentApprovals = mysqlTable(
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
    resolvedAt: bigint("resolved_at", { mode: "number" }),
  },
  (table) => [
    index("agent_approvals_task_status_idx").on(table.taskId, table.status),
  ],
);

/** User-managed recurring goal definitions backed by platform cron jobs. */
export const agentSchedules = mysqlTable(
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
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("agent_schedules_user_status_idx").on(table.userId, table.status),
  ],
);

/** Per-user dashboard preferences; secrets remain server environment variables. */
export const agentSettings = mysqlTable("agent_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique(),
  defaultModel: varchar("default_model", { length: 128 }).notNull().default("llama3"),
  defaultExecutionMode: mysqlEnum("default_execution_mode", executionModes).notNull().default("confirm"),
  defaultMaxRetries: int("default_max_retries").notNull().default(2),
  githubRepository: varchar("github_repository", { length: 256 }).notNull().default("najierwilliams/SenotaAI"),
  vercelProject: varchar("vercel_project", { length: 128 }),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

/** Delivery journal for owner-facing agent completion, failure, and approval notifications. */
export const agentNotifications = mysqlTable(
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
    deliveredAt: bigint("delivered_at", { mode: "number" }),
  },
  (table) => [
    index("agent_notifications_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export type AgentTask = typeof agentTasks.$inferSelect;
export type AgentStep = typeof agentSteps.$inferSelect;
export type AgentMemory = typeof agentMemories.$inferSelect;

/**
 * Optional cloud synchronization for the public no-login workspace memory vault.
 * The browser keeps the workspace ID private in local storage; no account or secrets
 * are stored in these records.
 */
export const workspaceMemories = mysqlTable(
  "workspace_memories",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 96 }).notNull(),
    clientMemoryId: varchar("client_memory_id", { length: 100 }).notNull(),
    projectKey: varchar("project_key", { length: 128 }).notNull().default("senota-ai"),
    source: varchar("source", { length: 32 }).notNull().default("device-sync"),
    category: varchar("category", { length: 48 }).notNull(),
    content: text("content").notNull(),
    importance: int("importance").notNull().default(3),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("workspace_memories_scope_idx").on(table.workspaceId, table.projectKey, table.isActive),
    index("workspace_memories_client_idx").on(table.workspaceId, table.clientMemoryId),
  ],
);

export type WorkspaceMemoryRecord = typeof workspaceMemories.$inferSelect;
export type AgentApproval = typeof agentApprovals.$inferSelect;
export type AgentSchedule = typeof agentSchedules.$inferSelect;
export type AgentSettings = typeof agentSettings.$inferSelect;
