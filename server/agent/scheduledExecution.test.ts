import { describe, expect, it, vi } from "vitest";
import { executeScheduledRun } from "./scheduledExecution";

const schedule = { id: 9, userId: 3, goal: "Audit the codebase", model: "llama3", executionMode: "confirm" } as const;

describe("scheduled task execution", () => {
  it("creates a linked task, executes it as the schedule owner, and records completion", async () => {
    const createTask = vi.fn().mockResolvedValue({ id: 88 });
    const runTask = vi.fn().mockResolvedValue({ status: "completed" });
    const updateSchedule = vi.fn().mockResolvedValue(undefined);

    const result = await executeScheduledRun({ schedule, repository: "najierwilliams/SenotaAI", createTask, runTask, updateSchedule });

    expect(result).toEqual({ taskId: 88, result: { status: "completed" } });
    expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ scheduleId: 9, userId: 3 }));
    expect(runTask).toHaveBeenCalledWith(88, 3);
    expect(updateSchedule).toHaveBeenCalledWith(9, 3, expect.objectContaining({ status: "active" }));
  });

  it("records a schedule failure when its task fails", async () => {
    const updateSchedule = vi.fn().mockResolvedValue(undefined);
    await executeScheduledRun({ schedule, repository: "najierwilliams/SenotaAI", createTask: vi.fn().mockResolvedValue({ id: 89 }), runTask: vi.fn().mockResolvedValue({ status: "failed" }), updateSchedule });
    expect(updateSchedule).toHaveBeenCalledWith(9, 3, expect.objectContaining({ status: "failed" }));
  });
});
