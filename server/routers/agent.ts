import { parse as parseCookie } from "cookie";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { createHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createAgentSchedule,
  createAgentTask,
  deactivateAgentMemory,
  getAgentTaskForUser,
  getOrCreateAgentSettings,
  getTaskWithTrace,
  listAgentMemories,
  listAgentSchedules,
  listAgentTasks,
  resolveAgentApproval,
  updateAgentSchedule,
  updateAgentSettings,
  updateAgentTask,
} from "../agent/db";
import { isValidSixFieldCron } from "../agent/schedule";
import { statusAfterApprovalDecision } from "../agent/state";
import { decideApprovalAndQueue } from "../agent/approvalWorkflow";
import { chatWithOllama } from "../agent/ollama";

const executionModeSchema = z.enum(["confirm", "auto"]);
const cronSchema = z.string().trim().refine(isValidSixFieldCron, "Cron expressions must have six UTC fields: sec min hour day month weekday.");

function currentSessionToken(cookieHeader: string | undefined) {
  return parseCookie(cookieHeader ?? "")[COOKIE_NAME] ?? "";
}

export const agentRouter = router({
  chat: publicProcedure
    .input(z.object({
      model: z.string().trim().min(1).max(128).optional(),
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(16_000),
      })).min(1).max(30),
    }))
    .mutation(async ({ input }) => {
      const response = await chatWithOllama({
        model: input.model,
        messages: [
          {
            role: "system",
            content: "You are SenotaAI, an autonomous software-agent assistant. Help the user plan, build, debug, and deploy software. Be clear about which actions need confirmation before execution.",
          },
          ...input.messages,
        ],
      });
      return { content: response.content, thinking: response.thinking };
    }),

  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const [settings, tasks, memories, schedules] = await Promise.all([
      getOrCreateAgentSettings(ctx.user.id),
      listAgentTasks(ctx.user.id, 12),
      listAgentMemories(ctx.user.id),
      listAgentSchedules(ctx.user.id),
    ]);
    return { settings, tasks, memories, schedules };
  }),

  connections: publicProcedure.query(async () => ({
    ollamaConfigured: Boolean(process.env.OLLAMA_BASE_URL),
    githubConfigured: Boolean(process.env.GITHUB_TOKEN),
    vercelConfigured: Boolean(process.env.VERCEL_TOKEN),
    schedulerReady: process.env.NODE_ENV === "production",
  })),

  settings: router({
    get: protectedProcedure.query(({ ctx }) => getOrCreateAgentSettings(ctx.user.id)),
    update: protectedProcedure
      .input(z.object({
        defaultModel: z.string().trim().min(1).max(128).optional(),
        defaultExecutionMode: executionModeSchema.optional(),
        defaultMaxRetries: z.number().int().min(0).max(2).optional(),
        githubRepository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Use owner/repository format.").optional(),
        vercelProject: z.string().trim().min(1).max(128).nullable().optional(),
        notificationsEnabled: z.boolean().optional(),
      }))
      .mutation(({ ctx, input }) => updateAgentSettings(ctx.user.id, input)),
  }),

  tasks: router({
    list: protectedProcedure.query(({ ctx }) => listAgentTasks(ctx.user.id)),
    get: protectedProcedure.input(z.object({ taskId: z.number().int().positive() })).query(({ ctx, input }) => getTaskWithTrace(input.taskId, ctx.user.id)),
    create: protectedProcedure
      .input(z.object({
        goal: z.string().trim().min(12, "Describe a concrete outcome in at least 12 characters.").max(12_000),
        model: z.string().trim().min(1).max(128).optional(),
        executionMode: executionModeSchema.optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const settings = await getOrCreateAgentSettings(ctx.user.id);
        return createAgentTask({
          userId: ctx.user.id,
          goal: input.goal,
          model: input.model || settings.defaultModel,
          executionMode: input.executionMode || settings.defaultExecutionMode,
          repository: settings.githubRepository,
        });
      }),
    pause: protectedProcedure.input(z.object({ taskId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const task = await getAgentTaskForUser(input.taskId, ctx.user.id);
      if (!task) throw new Error("Task not found.");
      await updateAgentTask(task.id, { pauseRequested: true });
      return { ok: true };
    }),
    resume: protectedProcedure.input(z.object({ taskId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const task = await getAgentTaskForUser(input.taskId, ctx.user.id);
      if (!task) throw new Error("Task not found.");
      await updateAgentTask(task.id, { status: "queued", pauseRequested: false, cancelRequested: false, currentPhase: "Queued for continuation" });
      return { ok: true };
    }),
    cancel: protectedProcedure.input(z.object({ taskId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const task = await getAgentTaskForUser(input.taskId, ctx.user.id);
      if (!task) throw new Error("Task not found.");
      await updateAgentTask(task.id, { cancelRequested: true });
      return { ok: true };
    }),
  }),

  approvals: router({
    decide: protectedProcedure
      .input(z.object({ approvalId: z.number().int().positive(), approved: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const approval = await decideApprovalAndQueue({
          approvalId: input.approvalId,
          userId: ctx.user.id,
          approved: input.approved,
          resolveApproval: resolveAgentApproval,
          updateTask: updateAgentTask,
        });
        if (!approval) throw new Error("Approval was not found or was already resolved.");
        return approval;
      }),
  }),

  memories: router({
    list: protectedProcedure.query(({ ctx }) => listAgentMemories(ctx.user.id)),
    remove: protectedProcedure.input(z.object({ memoryId: z.number().int().positive() })).mutation(({ ctx, input }) => deactivateAgentMemory(input.memoryId, ctx.user.id)),
  }),

  schedules: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const schedules = await listAgentSchedules(ctx.user.id);
      const { listScheduleRuns } = await import("../agent/db");
      return Promise.all(schedules.map(async (schedule) => ({
        ...schedule,
        runs: await listScheduleRuns(schedule.id, ctx.user.id),
      })));
    }),
    create: protectedProcedure
      .input(z.object({
        goal: z.string().trim().min(12).max(12_000),
        cronExpression: cronSchema,
        model: z.string().trim().min(1).max(128).optional(),
        executionMode: executionModeSchema.optional(),
      }))
      .mutation(async ({ ctx, input }) => {
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
          description: "Recurring SenotaAI autonomous coding task",
        }, sessionToken);
        return createAgentSchedule({
          userId: ctx.user.id,
          goal: input.goal,
          cronExpression: input.cronExpression,
          model: input.model || settings.defaultModel,
          executionMode: input.executionMode || settings.defaultExecutionMode,
          scheduleCronTaskUid: heartbeat.taskUid,
          nextRunAt: heartbeat.nextExecutionAt ? Date.parse(heartbeat.nextExecutionAt) : null,
        });
      }),
    setPaused: protectedProcedure
      .input(z.object({ scheduleId: z.number().int().positive(), paused: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const schedules = await listAgentSchedules(ctx.user.id);
        const schedule = schedules.find((item) => item.id === input.scheduleId);
        if (!schedule?.scheduleCronTaskUid) throw new Error("Schedule was not found or has no managed cron job.");
        const heartbeat = await updateHeartbeatJob(schedule.scheduleCronTaskUid, { enable: !input.paused }, currentSessionToken(ctx.req.headers.cookie));
        return updateAgentSchedule(input.scheduleId, ctx.user.id, {
          status: input.paused ? "paused" : "active",
          nextRunAt: heartbeat.nextExecutionAt ? Date.parse(heartbeat.nextExecutionAt) : null,
        });
      }),
  }),
});
