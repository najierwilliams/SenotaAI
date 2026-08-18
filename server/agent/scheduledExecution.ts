import type { AgentSchedule, AgentTask } from "../../drizzle/schema";
import { buildScheduledTaskInput } from "./schedule";

export async function executeScheduledRun(input: {
  schedule: Pick<AgentSchedule, "id" | "userId" | "goal" | "model" | "executionMode">;
  repository: string;
  createTask: (values: ReturnType<typeof buildScheduledTaskInput>) => Promise<Pick<AgentTask, "id">>;
  runTask: (taskId: number, userId: number) => Promise<{ status: "completed" | "failed" | "paused" | "cancelled" | "awaiting_approval" }>;
  updateSchedule: (scheduleId: number, userId: number, values: { lastRunAt: number; status: "active" | "failed" }) => Promise<unknown>;
}) {
  const task = await input.createTask(buildScheduledTaskInput({
    userId: input.schedule.userId,
    scheduleId: input.schedule.id,
    goal: input.schedule.goal,
    model: input.schedule.model,
    executionMode: input.schedule.executionMode,
    repository: input.repository,
  }));
  const result = await input.runTask(task.id, input.schedule.userId);
  await input.updateSchedule(input.schedule.id, input.schedule.userId, {
    lastRunAt: Date.now(),
    status: result.status === "failed" ? "failed" : "active",
  });
  return { taskId: task.id, result };
}
