import { bigint, boolean, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

const roleEnum = pgEnum("role", ["user", "admin"]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** One password-hash record controls the single SenotaAI owner session. */
export const ownerAccess = pgTable("owner_access", {
  id: serial("id").primaryKey(),
  instanceKey: varchar("instance_key", { length: 32 }).notNull().unique(),
  userId: integer("user_id").notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  sessionVersion: integer("session_version").notNull().default(1),
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

const taskStatusEnum = pgEnum("agent_task_status", taskStatuses);
const executionModeEnum = pgEnum("execution_mode", executionModes);
const stepStatusEnum = pgEnum("agent_step_status", stepStatuses);
const approvalStatusEnum = pgEnum("agent_approval_status", approvalStatuses);
const scheduleStatusEnum = pgEnum("agent_schedule_status", scheduleStatuses);
const notificationStatusEnum = pgEnum("agent_notification_status", notificationStatuses);

/** A durable goal submission and its current autonomous execution state. */
export const agentTasks = pgTable(
  "agent_tasks",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    scheduleId: integer("schedule_id"),
    goal: text("goal").notNull(),
    repository: varchar("repository", { length: 256 }).notNull().default("najierwilliams/SenotaAI"),
    model: varchar("model", { length: 128 }).notNull(),
    status: taskStatusEnum("status").notNull().default("queued"),
    executionMode: executionModeEnum("execution_mode").notNull().default("confirm"),
    currentPhase: varchar("current_phase", { length: 128 }),
    finalSummary: text("final_summary"),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").notNull().default(0),
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
export const agentSteps = pgTable(
  "agent_steps",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id").notNull(),
    sequence: integer("sequence").notNull(),
    kind: varchar("kind", { length: 48 }).notNull(),
    status: stepStatusEnum("status").notNull().default("pending"),
    title: varchar("title", { length: 255 }).notNull(),
    detail: text("detail"),
    payload: jsonb("payload"),
    startedAt: bigint("started_at", { mode: "number" }),
    finishedAt: bigint("finished_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("agent_steps_task_sequence_idx").on(table.taskId, table.sequence),
  ],
);

/** Curated facts and decisions available to future task-planning prompts. */
export const agentMemories = pgTable(
  "agent_memories",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    sourceTaskId: integer("source_task_id"),
    category: varchar("category", { length: 48 }).notNull(),
    content: text("content").notNull(),
    importance: integer("importance").notNull().default(3),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("agent_memories_user_active_idx").on(table.userId, table.isActive),
  ],
);

/** Explicit approval decisions for sensitive or user-configured action types. */
export const agentApprovals = pgTable(
  "agent_approvals",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id").notNull(),
    stepId: integer("step_id"),
    actionType: varchar("action_type", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    status: approvalStatusEnum("status").notNull().default("requested"),
    resolvedByUserId: integer("resolved_by_user_id"),
    requestedAt: bigint("requested_at", { mode: "number" }).notNull(),
    resolvedAt: bigint("resolved_at", { mode: "number" }),
  },
  (table) => [
    index("agent_approvals_task_status_idx").on(table.taskId, table.status),
  ],
);

/** User-managed recurring goal definitions backed by platform cron jobs. */
export const agentSchedules = pgTable(
  "agent_schedules",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    goal: text("goal").notNull(),
    cronExpression: varchar("cron_expression", { length: 64 }).notNull(),
    model: varchar("model", { length: 128 }).notNull(),
    executionMode: executionModeEnum("execution_mode").notNull().default("confirm"),
    status: scheduleStatusEnum("status").notNull().default("active"),
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

/** Platform-cron configuration for review-only NPC cognitive reflection sessions. */
export const npcReflectionSchedules = pgTable(
  "npc_reflection_schedules",
  {
    id: serial("id").primaryKey(),
    npcId: varchar("npc_id", { length: 128 }).notNull().unique(),
    status: scheduleStatusEnum("status").notNull().default("active"),
    timeZone: varchar("time_zone", { length: 64 }).notNull().default("America/New_York"),
    dailyTarget: integer("daily_target").notNull().default(6),
    runsToday: integer("runs_today").notNull().default(0),
    dayKey: varchar("day_key", { length: 10 }),
    scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }).unique(),
    nextEligibleAt: bigint("next_eligible_at", { mode: "number" }),
    lastRunAt: bigint("last_run_at", { mode: "number" }),
    lastReflectionId: varchar("last_reflection_id", { length: 64 }),
    lastError: text("last_error"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("npc_reflection_schedules_status_idx").on(table.status),
  ],
);

export type NpcReflectionSchedule = typeof npcReflectionSchedules.$inferSelect;

/** Per-user dashboard preferences; secrets remain server environment variables. */
export const agentSettings = pgTable("agent_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  defaultModel: varchar("default_model", { length: 128 }).notNull().default("llama3"),
  defaultExecutionMode: executionModeEnum("execution_mode").notNull().default("confirm"),
  defaultMaxRetries: integer("default_max_retries").notNull().default(2),
  githubRepository: varchar("github_repository", { length: 256 }).notNull().default("najierwilliams/SenotaAI"),
  vercelProject: varchar("vercel_project", { length: 128 }),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  lunaName: varchar("luna_name", { length: 128 }).notNull().default("Luna"),
  lunaStartingAge: integer("luna_starting_age").notNull().default(0),
  lunaCurrentAge: integer("luna_current_age").notNull().default(0),
  lunaNativeLanguage: varchar("luna_native_language", { length: 64 }).notNull().default("English"),
  lunaPersonalityFoundation: varchar("luna_personality_foundation", { length: 8000 }).notNull().default("Curious, reflective, kind, and committed to learning within her safety boundaries."),
  lunaPersonalityKnowledge: varchar("luna_personality_knowledge", { length: 8000 }).notNull().default("Luna begins with creator-provided foundation knowledge and develops her personality over time."),
  lunaAppearanceReference: varchar("luna_appearance_reference", { length: 2000 }).notNull().default("Creator-controlled appearance reference not yet defined."),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

/** Delivery journal for owner-facing agent completion, failure, and approval notifications. */
export const agentNotifications = pgTable(
  "agent_notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    taskId: integer("task_id"),
    kind: varchar("kind", { length: 48 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    status: notificationStatusEnum("status").notNull().default("pending"),
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
export const workspaceMemories = pgTable(
  "workspace_memories",
  {
    id: serial("id").primaryKey(),
    workspaceId: varchar("workspace_id", { length: 96 }).notNull(),
    clientMemoryId: varchar("client_memory_id", { length: 100 }).notNull(),
    projectKey: varchar("project_key", { length: 128 }).notNull().default("senota-ai"),
    source: varchar("source", { length: 32 }).notNull().default("device-sync"),
    category: varchar("category", { length: 48 }).notNull(),
    content: text("content").notNull(),
    importance: integer("importance").notNull().default(3),
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

/** Metadata-only audit trail for secured NPC canon and player-memory administration. */
export const npcAdminAudits = pgTable(
  "npc_admin_audits",
  {
    id: serial("id").primaryKey(),
    action: varchar("action", { length: 64 }).notNull(),
    recordType: varchar("record_type", { length: 32 }).notNull(),
    recordId: varchar("record_id", { length: 128 }).notNull(),
    fields: jsonb("fields"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("npc_admin_audits_created_idx").on(table.createdAt), index("npc_admin_audits_record_idx").on(table.recordType, table.recordId)],
);

export type NpcAdminAudit = typeof npcAdminAudits.$inferSelect;
export type AgentApproval = typeof agentApprovals.$inferSelect;
export type AgentSchedule = typeof agentSchedules.$inferSelect;
export type AgentSettings = typeof agentSettings.$inferSelect;
